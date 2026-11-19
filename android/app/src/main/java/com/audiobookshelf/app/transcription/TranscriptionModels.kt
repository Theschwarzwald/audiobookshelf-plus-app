package com.audiobookshelf.app.transcription

import android.content.Context
import android.util.Log
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineMoonshineModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig
import com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig
import okhttp3.Dns
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.dnsoverhttps.DnsOverHttps
import okhttp3.Request
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream
import java.io.BufferedInputStream
import java.io.File
import java.io.FilterInputStream
import java.io.InputStream
import java.net.InetAddress
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

/**
 * On-device speech-to-text models. Everything runs locally through sherpa-onnx
 * (https://github.com/k2-fsa/sherpa-onnx, Apache-2.0). Models are downloaded once
 * from the sherpa-onnx GitHub releases and then used fully offline.
 */
enum class ModelKind { MOONSHINE_V2, NEMO_TRANSDUCER, WHISPER }

data class AsrModelInfo(
  val id: String,
  val name: String,
  val description: String,
  val languages: String,
  val sizeLabel: String,
  val archiveName: String,
  val kind: ModelKind,
  /** true when the model returns per-token timestamps (gives more accurate line times) */
  val hasTokenTimestamps: Boolean
) {
  val url get() = "$RELEASE_BASE/$archiveName.tar.bz2"
}

const val RELEASE_BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
const val VAD_URL = "$RELEASE_BASE/silero_vad.onnx"

object ModelCatalog {
  val models = listOf(
    AsrModelInfo(
      id = "moonshine-base-en",
      name = "Moonshine Base (English)",
      description = "Fastest. Built for phones, good accuracy, light on battery.",
      languages = "English",
      sizeLabel = "Small download",
      archiveName = "sherpa-onnx-moonshine-base-en-quantized-2026-02-27",
      kind = ModelKind.MOONSHINE_V2,
      hasTokenTimestamps = false
    ),
    AsrModelInfo(
      id = "parakeet-tdt-v2-en",
      name = "Parakeet TDT 0.6B v2 (English)",
      description = "Best English accuracy with punctuation and word timestamps. Slower, needs a recent phone.",
      languages = "English",
      sizeLabel = "Large download (~600 MB)",
      archiveName = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8",
      kind = ModelKind.NEMO_TRANSDUCER,
      hasTokenTimestamps = true
    ),
    AsrModelInfo(
      id = "parakeet-tdt-v3",
      name = "Parakeet TDT 0.6B v3 (25 languages)",
      description = "Like v2 but supports 25 European languages, auto-detected.",
      languages = "25 European languages",
      sizeLabel = "Large download (~650 MB)",
      archiveName = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
      kind = ModelKind.NEMO_TRANSDUCER,
      hasTokenTimestamps = true
    ),
    AsrModelInfo(
      id = "whisper-base",
      name = "Whisper Base (multilingual)",
      description = "OpenAI Whisper, 99 languages, language auto-detected.",
      languages = "99 languages",
      sizeLabel = "Medium download",
      archiveName = "sherpa-onnx-whisper-base",
      kind = ModelKind.WHISPER,
      hasTokenTimestamps = false
    ),
    AsrModelInfo(
      id = "whisper-small",
      name = "Whisper Small (multilingual)",
      description = "More accurate Whisper, 99 languages. Slow on most phones.",
      languages = "99 languages",
      sizeLabel = "Large download",
      archiveName = "sherpa-onnx-whisper-small",
      kind = ModelKind.WHISPER,
      hasTokenTimestamps = false
    )
  )

  const val DEFAULT_MODEL_ID = "moonshine-base-en"

  fun get(id: String): AsrModelInfo? = models.find { it.id == id }
}

class ModelManager(private val ctx: Context) {
  private val tag = "ModelManager"

  private val rootDir: File get() = File(ctx.filesDir, "transcription/models").apply { mkdirs() }
  val vadFile: File get() = File(rootDir, "silero_vad.onnx")
  private fun modelDir(model: AsrModelInfo) = File(rootDir, model.id)
  private fun readyMarker(model: AsrModelInfo) = File(modelDir(model), ".ready")

  fun isInstalled(model: AsrModelInfo): Boolean = readyMarker(model).exists()

  fun installedSizeBytes(model: AsrModelInfo): Long =
    modelDir(model).walkTopDown().filter { it.isFile }.sumOf { it.length() }

  fun delete(model: AsrModelInfo) {
    modelDir(model).deleteRecursively()
  }

  /** Model downloads use [FallbackDns], so a phone whose DNS can't resolve github.com still works. */
  private val client = OkHttpClient.Builder()
    .dns(FallbackDns)
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(60, TimeUnit.SECONDS)
    .followRedirects(true)
    .followSslRedirects(true)
    .build()

  /**
   * The Silero VAD model is bundled in the APK (assets/transcription/silero_vad.onnx, added at
   * build time). Copy it out on first use; only download it if an older build lacks the asset.
   */
  fun ensureVad() {
    if (vadFile.exists() && vadFile.length() > 0) return
    val tmp = File(rootDir, "silero_vad.onnx.part")
    try {
      ctx.assets.open("transcription/silero_vad.onnx").use { input -> tmp.outputStream().use { input.copyTo(it) } }
    } catch (e: java.io.IOException) {
      Log.w(tag, "VAD not bundled, downloading")
      friendlyNetworkErrors { httpGet(VAD_URL) { input, _ -> tmp.outputStream().use { input.copyTo(it) } } }
    }
    tmp.renameTo(vadFile)
  }

  /**
   * Downloads and unpacks a model. The .tar.bz2 is streamed straight into the extractor,
   * so no temporary archive is written. Only the files the model needs are kept.
   * [onProgress] receives (bytesDownloaded, totalBytes or -1).
   */
  fun download(model: AsrModelInfo, isCancelled: () -> Boolean, onProgress: (Long, Long) -> Unit) {
    ensureVad()
    friendlyNetworkErrors {
      httpGet(model.url) { body, total -> install(model, body, total, isCancelled, onProgress) }
    }
  }

  /**
   * Installs a model from a .tar.bz2 the user downloaded themselves (e.g. on a computer) and
   * picked with the file picker. Works with no internet at all.
   */
  fun importArchive(model: AsrModelInfo, input: InputStream, total: Long, isCancelled: () -> Boolean, onProgress: (Long, Long) -> Unit) {
    ensureVad()
    try {
      install(model, input, total, isCancelled, onProgress)
    } catch (e: InterruptedException) {
      throw e
    } catch (e: Exception) {
      delete(model)
      throw IllegalStateException(
        "That file isn't the ${model.name} model archive. Pick \"${model.archiveName}.tar.bz2\" (${e.message})"
      )
    }
  }

  private fun install(model: AsrModelInfo, body: InputStream, total: Long, isCancelled: () -> Boolean, onProgress: (Long, Long) -> Unit) {
    val dir = modelDir(model)
    dir.deleteRecursively()
    dir.mkdirs()

    var bytesRead = 0L
    var lastReport = 0L
    val counting = object : FilterInputStream(body) {
      override fun read(): Int {
        val b = super.read()
        if (b >= 0) count(1L)
        return b
      }

      override fun read(b: ByteArray, off: Int, len: Int): Int {
        val n = super.read(b, off, len)
        if (n > 0) count(n.toLong())
        return n
      }

      private fun count(n: Long) {
        bytesRead += n
        if (bytesRead - lastReport > 512 * 1024) {
          lastReport = bytesRead
          onProgress(bytesRead, total)
        }
        if (isCancelled()) throw InterruptedException("Model download cancelled")
      }
    }

    val bz = BZip2CompressorInputStream(BufferedInputStream(counting, 1 shl 16), true)
    bz.use {
      TarReader(it).forEach { name, input ->
        val fileName = File(name).name
        if (keepFile(model, fileName)) {
          val out = File(dir, fileName)
          out.outputStream().use { os -> input.copyTo(os, 1 shl 16) }
          Log.d(tag, "Extracted $fileName (${out.length()} bytes)")
        }
      }
    }
    onProgress(bytesRead, total)

    // Validate that we can build a config from what was extracted
    buildRecognizerConfig(model, 1)
    readyMarker(model).writeText(System.currentTimeMillis().toString())
  }

  private fun <T> friendlyNetworkErrors(block: () -> T): T {
    try {
      return block()
    } catch (e: java.net.UnknownHostException) {
      throw IllegalStateException(
        "Can't reach github.com to download the model (the phone couldn't look up the address). " +
          "Check that the phone is online and that Private DNS, a VPN or an ad-blocker isn't blocking github.com. " +
          "Or download the model on a computer and use \"Import model file\"."
      )
    } catch (e: java.net.SocketTimeoutException) {
      throw IllegalStateException("The model download timed out. Check your connection and try again, or use \"Import model file\".")
    } catch (e: java.net.ConnectException) {
      throw IllegalStateException("Couldn't connect to github.com to download the model. Try again, or use \"Import model file\".")
    }
  }

  private fun keepFile(model: AsrModelInfo, name: String): Boolean {
    if (name.endsWith("tokens.txt")) return true
    return when (model.kind) {
      ModelKind.MOONSHINE_V2 -> name.endsWith(".ort")
      ModelKind.NEMO_TRANSDUCER -> name.endsWith(".int8.onnx")
      ModelKind.WHISPER -> name.endsWith("-encoder.int8.onnx") || name.endsWith("-decoder.int8.onnx")
    }
  }

  private fun httpGet(url: String, consume: (InputStream, Long) -> Unit) {
    val request = Request.Builder().url(url).build()
    client.newCall(request).execute().use { resp ->
      if (!resp.isSuccessful) throw IllegalStateException("Download failed (${resp.code}) for $url")
      val body = resp.body ?: throw IllegalStateException("Empty response for $url")
      consume(body.byteStream(), body.contentLength())
    }
  }

  private fun find(model: AsrModelInfo, predicate: (String) -> Boolean): String {
    val f = modelDir(model).listFiles()?.firstOrNull { it.isFile && predicate(it.name) }
      ?: throw IllegalStateException("Model ${model.id} is missing a required file. Delete and download it again.")
    return f.absolutePath
  }

  fun buildRecognizerConfig(model: AsrModelInfo, numThreads: Int): OfflineRecognizerConfig {
    val tokens = find(model) { it.endsWith("tokens.txt") }
    val modelConfig = when (model.kind) {
      ModelKind.MOONSHINE_V2 -> OfflineModelConfig(
        moonshine = OfflineMoonshineModelConfig(
          encoder = find(model) { it.startsWith("encoder_model") && it.endsWith(".ort") },
          mergedDecoder = find(model) { it.startsWith("decoder_model_merged") && it.endsWith(".ort") }
        ),
        tokens = tokens
      )

      ModelKind.NEMO_TRANSDUCER -> OfflineModelConfig(
        transducer = OfflineTransducerModelConfig(
          encoder = find(model) { it == "encoder.int8.onnx" },
          decoder = find(model) { it == "decoder.int8.onnx" },
          joiner = find(model) { it == "joiner.int8.onnx" }
        ),
        tokens = tokens,
        modelType = "nemo_transducer"
      )

      ModelKind.WHISPER -> OfflineModelConfig(
        whisper = OfflineWhisperModelConfig(
          encoder = find(model) { it.endsWith("-encoder.int8.onnx") },
          decoder = find(model) { it.endsWith("-decoder.int8.onnx") },
          language = "", // empty = auto-detect (multilingual models)
          task = "transcribe"
        ),
        tokens = tokens,
        modelType = "whisper"
      )
    }
    modelConfig.numThreads = numThreads
    return OfflineRecognizerConfig(
      featConfig = FeatureConfig(sampleRate = 16000, featureDim = 80),
      modelConfig = modelConfig
    )
  }
}

/**
 * Uses the phone's normal DNS first. If that can't resolve a host (broken router DNS, Private DNS
 * misconfigured, Pi-hole/AdGuard blocking, captive network...), asks Cloudflare or Google over
 * HTTPS instead. Their resolvers are contacted by IP address, so no local DNS is needed.
 * Only used for model downloads.
 */
object FallbackDns : Dns {
  private val bootstrap = OkHttpClient.Builder().connectTimeout(10, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS).build()

  private val resolvers: List<Dns> by lazy {
    listOf(
      DnsOverHttps.Builder().client(bootstrap)
        .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
        .bootstrapDnsHosts(InetAddress.getByName("1.1.1.1"), InetAddress.getByName("1.0.0.1"))
        .build(),
      DnsOverHttps.Builder().client(bootstrap)
        .url("https://dns.google/dns-query".toHttpUrl())
        .bootstrapDnsHosts(InetAddress.getByName("8.8.8.8"), InetAddress.getByName("8.8.4.4"))
        .build()
    )
  }

  override fun lookup(hostname: String): List<InetAddress> {
    try {
      val result = Dns.SYSTEM.lookup(hostname)
      if (result.isNotEmpty()) return result
    } catch (e: UnknownHostException) {
      Log.w("FallbackDns", "System DNS failed for $hostname, trying DNS-over-HTTPS")
    }
    var last: Exception? = null
    for (r in resolvers) {
      try {
        val result = r.lookup(hostname)
        if (result.isNotEmpty()) return result
      } catch (e: Exception) {
        last = e
      }
    }
    throw UnknownHostException("Unable to resolve host \"$hostname\"" + (last?.message?.let { ": $it" } ?: ""))
  }
}

/**
 * Minimal streaming tar reader (ustar/GNU). Calls [onFile] for each regular file with a stream
 * limited to that file's bytes. Kept tiny on purpose so we only need bzip2 from commons-compress.
 */
class TarReader(private val input: InputStream) {
  private val header = ByteArray(512)

  private fun readFully(buf: ByteArray, len: Int): Boolean {
    var off = 0
    while (off < len) {
      val n = input.read(buf, off, len - off)
      if (n < 0) {
        if (off == 0) return false
        throw java.io.EOFException("Truncated tar")
      }
      off += n
    }
    return true
  }

  private fun skip(n: Long) {
    var left = n
    val buf = ByteArray(8192)
    while (left > 0) {
      val r = input.read(buf, 0, minOf(buf.size.toLong(), left).toInt())
      if (r < 0) throw java.io.EOFException("Truncated tar")
      left -= r
    }
  }

  private fun field(off: Int, len: Int): String {
    var end = off
    while (end < off + len && header[end] != 0.toByte()) end++
    return String(header, off, end - off, Charsets.UTF_8)
  }

  private fun octal(off: Int, len: Int): Long =
    field(off, len).trim().ifEmpty { "0" }.toLong(8)

  fun forEach(onFile: (String, InputStream) -> Unit) {
    var longName: String? = null
    while (true) {
      if (!readFully(header, 512)) return
      if (header.all { it == 0.toByte() }) return // end of archive
      val size = octal(124, 12)
      val type = header[156].toInt().toChar()
      val padded = (size + 511) / 512 * 512
      when (type) {
        'L' -> { // GNU long file name
          val buf = ByteArray(size.toInt())
          readFully(buf, buf.size)
          longName = String(buf, Charsets.UTF_8).trimEnd('\u0000')
          skip(padded - size)
        }
        '0', '\u0000', '7' -> {
          val prefix = field(345, 155)
          val name = longName ?: if (prefix.isNotEmpty()) "$prefix/${field(0, 100)}" else field(0, 100)
          longName = null
          val limited = object : FilterInputStream(input) {
            var left = size
            override fun read(): Int {
              if (left <= 0) return -1
              val b = super.read()
              if (b >= 0) left--
              return b
            }
            override fun read(b: ByteArray, off: Int, len: Int): Int {
              if (left <= 0) return -1
              val n = super.read(b, off, minOf(len.toLong(), left).toInt())
              if (n > 0) left -= n
              return n
            }
            override fun close() {}
          }
          onFile(name, limited)
          skip(limited.left + (padded - size))
        }
        else -> { // directories, pax headers, links: skip
          longName = if (type == 'x' || type == 'g') longName else null
          skip(padded)
        }
      }
    }
  }
}

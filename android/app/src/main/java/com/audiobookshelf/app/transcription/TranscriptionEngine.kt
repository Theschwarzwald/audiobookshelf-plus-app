package com.audiobookshelf.app.transcription

import android.content.Context
import android.os.StatFs
import android.util.Log
import com.audiobookshelf.app.device.DeviceManager
import com.audiobookshelf.app.server.ApiHandler
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerResult
import com.k2fsa.sherpa.onnx.SileroVadModelConfig
import com.k2fsa.sherpa.onnx.Vad
import com.k2fsa.sherpa.onnx.VadModelConfig
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class CancelledException : Exception("Transcription paused")

/**
 * Splits recognizer output into short, lyric-style lines with start/end times.
 */
object LineSplitter {
  private data class Word(val text: String, val start: Double)

  private val sentenceEnd = Regex("[.!?…][\"'”’)\\]]*$")
  private val softBreak = Regex("[,;:—–][\"'”’)\\]]*$")

  fun split(result: OfflineRecognizerResult, segStart: Double, segDuration: Double, useTokenTimes: Boolean): List<TranscriptLine> {
    val text = result.text.trim()
    if (text.isEmpty()) return emptyList()

    val words: List<Word> =
      if (useTokenTimes && result.tokens.isNotEmpty() && result.tokens.size == result.timestamps.size) {
        wordsFromTokens(result.tokens, result.timestamps)
      } else {
        wordsByCharacters(text, segDuration)
      }
    if (words.isEmpty()) return emptyList()

    // Group words into lines
    val groups = mutableListOf<MutableList<Word>>()
    var current = mutableListOf<Word>()
    for (w in words) {
      current.add(w)
      val n = current.size
      val t = w.text
      val brk = (sentenceEnd.containsMatchIn(t) && n >= 3) ||
        (softBreak.containsMatchIn(t) && n >= 10) ||
        n >= 16
      if (brk) {
        groups.add(current)
        current = mutableListOf()
      }
    }
    if (current.isNotEmpty()) {
      // Avoid a dangling 1-2 word line: merge into the previous one
      if (current.size <= 2 && groups.isNotEmpty() && groups.last().size < 16) groups.last().addAll(current)
      else groups.add(current)
    }

    val segEnd = segStart + segDuration
    return groups.mapIndexed { i, g ->
      val start = segStart + g.first().start
      val end = if (i + 1 < groups.size) segStart + groups[i + 1].first().start else segEnd
      TranscriptLine(start, maxOf(end, start), g.joinToString(" ") { it.text })
    }
  }

  /** BPE/sentencepiece tokens: a token beginning with ▁ (or a space) starts a new word. */
  private fun wordsFromTokens(tokens: Array<String>, times: FloatArray): List<Word> {
    val words = mutableListOf<Word>()
    var sb = StringBuilder()
    var start = 0.0
    for (i in tokens.indices) {
      val tok = tokens[i]
      val newWord = tok.startsWith("▁") || tok.startsWith(" ")
      val clean = tok.replace("▁", " ").trim()
      if (clean.isEmpty() && !newWord) continue
      if (newWord && sb.isNotEmpty()) {
        words.add(Word(sb.toString(), start))
        sb = StringBuilder()
      }
      if (sb.isEmpty()) start = times[i].toDouble()
      sb.append(clean)
    }
    if (sb.isNotEmpty()) words.add(Word(sb.toString(), start))
    return words
  }

  /** No token times: estimate each word's start from its character position in the segment. */
  private fun wordsByCharacters(text: String, duration: Double): List<Word> {
    val parts = text.split(Regex("\\s+")).filter { it.isNotEmpty() }
    val totalChars = parts.sumOf { it.length + 1 }.toDouble()
    var chars = 0
    return parts.map { p ->
      val w = Word(p, duration * chars / totalChars)
      chars += p.length + 1
      w
    }
  }
}

/**
 * Runs one transcription job: decode -> 16 kHz mono -> Silero VAD -> offline ASR -> lines.
 * Everything is local; the only network use is fetching audio from the user's own server
 * when the book is streamed rather than downloaded.
 */
class TranscriptionEngine(
  private val ctx: Context,
  private val store: TranscriptStore,
  private val models: ModelManager
) {
  private val tag = "TranscriptionEngine"
  private val sampleRate = 16000
  private val vadWindow = 512

  private val http = OkHttpClient.Builder()
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(120, TimeUnit.SECONDS)
    .build()

  fun run(meta: TranscriptMeta, isCancelled: () -> Boolean, onUpdate: (TranscriptMeta) -> Unit) {
    val model = ModelCatalog.get(meta.modelId) ?: throw IllegalStateException("Unknown model ${meta.modelId}")

    if (!models.isInstalled(model)) {
      meta.phase = "model"
      meta.phaseProgress = 0.0
      onUpdate(meta)
      models.download(model, isCancelled) { read, total ->
        meta.phaseProgress = if (total > 0) read.toDouble() / total else 0.0
        onUpdate(meta)
      }
    }

    models.ensureVad()
    // Performance cores plus some efficiency cores (2+4 cores -> 4 threads); fewer on battery saver or when hot
    val threads = com.audiobookshelf.app.device.DeviceProfile.recognizerThreads(ctx)
    val recognizer = OfflineRecognizer(null, models.buildRecognizerConfig(model, threads))
    val vadConfig = VadModelConfig(
      sileroVadModelConfig = SileroVadModelConfig(
        model = models.vadFile.absolutePath,
        threshold = 0.5f,
        minSilenceDuration = 0.3f,
        minSpeechDuration = 0.25f,
        windowSize = vadWindow,
        maxSpeechDuration = if (model.kind == ModelKind.NEMO_TRANSDUCER) 25f else 15f
      ),
      sampleRate = sampleRate,
      numThreads = 1
    )

    val startedAt = System.currentTimeMillis()
    val startedDoneSec = doneSec(meta)
    var lastUpdate = 0L

    // Two passes so the part you're listening to is ready first:
    //   pass 0: from where playback was when transcription started -> end of book
    //   pass 1: start of book -> that point
    try {
      while (meta.pass <= 1) {
        val rangeStart = if (meta.pass == 0) meta.firstStartSec else 0.0
        val rangeEnd = if (meta.pass == 0) Double.MAX_VALUE else meta.firstStartSec
        if (rangeEnd - rangeStart > 0.5) {
          if (meta.resumeSec < rangeStart) meta.resumeSec = rangeStart
          // When resuming, drop partial lines past the checkpoint in this pass's range
          meta.linesCount = store.truncateLinesInRange(meta.key, meta.resumeSec, rangeEnd)

          for (track in meta.tracks.sortedBy { it.startOffset }) {
            val trackEnd = track.startOffset + track.duration
            if (meta.resumeSec >= trackEnd - 0.5) continue
            if (track.startOffset >= rangeEnd) break
            if (isCancelled()) throw CancelledException()

            val localStart = (meta.resumeSec - track.startOffset).coerceAtLeast(0.0)
            var tempFile: File? = null
            val source = if (track.remote) {
              tempFile = fetchRemoteTrack(meta, track, isCancelled, onUpdate)
              tempFile.absolutePath
            } else track.source

            meta.phase = "transcribing"
            meta.phaseProgress = 0.0
            onUpdate(meta)

            val vad = Vad(null, vadConfig)
            try {
              var baseSec = -1.0 // file time of VAD sample 0
              val window = FloatArray(vadWindow)
              var windowFill = 0

              fun drain() {
                while (!vad.empty()) {
                  val seg = vad.front()
                  vad.pop()
                  val segStart = track.startOffset + baseSec + seg.start.toDouble() / sampleRate
                  val segDur = seg.samples.size.toDouble() / sampleRate
                  if (segStart >= rangeEnd) continue // already covered by the other pass
                  if (segDur >= 0.3) {
                    val stream = recognizer.createStream()
                    stream.acceptWaveform(seg.samples, sampleRate)
                    recognizer.decode(stream)
                    val result = recognizer.getResult(stream)
                    stream.release()
                    val lines = LineSplitter.split(result, segStart, segDur, model.hasTokenTimestamps)
                      .filter { it.start < rangeEnd }
                    store.appendLines(meta.key, lines)
                    meta.linesCount += lines.size
                  }
                  meta.resumeSec = minOf(segStart + segDur, rangeEnd)
                  meta.doneSec = doneSec(meta)
                  if (isCancelled()) throw CancelledException()
                }
              }

              AudioDecoder(ctx, source).decode(localStart) { samples, chunkStart ->
                if (baseSec < 0) baseSec = chunkStart
                var i = 0
                while (i < samples.size) {
                  val n = minOf(vadWindow - windowFill, samples.size - i)
                  System.arraycopy(samples, i, window, windowFill, n)
                  windowFill += n
                  i += n
                  if (windowFill == vadWindow) {
                    vad.acceptWaveform(window.copyOf())
                    windowFill = 0
                    drain()
                  }
                }
                meta.processedSec = track.startOffset + chunkStart + samples.size.toDouble() / sampleRate
                val now = System.currentTimeMillis()
                if (now - lastUpdate > 1500) {
                  lastUpdate = now
                  val wall = (now - startedAt) / 1000.0
                  meta.speed = if (wall > 0) (doneSec(meta) - startedDoneSec) / wall else 0.0
                  store.saveMeta(meta)
                  onUpdate(meta)
                }
                // Stop at the end of this pass's range (the other pass covers the rest)
                !isCancelled() && meta.processedSec < rangeEnd + 2.0
              }
              if (isCancelled()) throw CancelledException()

              vad.flush()
              drain()
            } finally {
              vad.release()
              tempFile?.delete()
            }

            meta.resumeSec = minOf(trackEnd, rangeEnd)
            meta.doneSec = doneSec(meta)
            store.saveMeta(meta)
            onUpdate(meta)
          }
        }
        meta.pass += 1
        meta.resumeSec = 0.0
        meta.doneSec = doneSec(meta)
        store.saveMeta(meta)
      }
    } finally {
      recognizer.release()
    }
  }

  /** Seconds of the book transcribed so far, across both passes. */
  private fun doneSec(meta: TranscriptMeta): Double {
    val firstPassLen = (meta.durationSec - meta.firstStartSec).coerceAtLeast(0.0)
    val v = if (meta.pass == 0) meta.resumeSec - meta.firstStartSec
    else if (meta.pass == 1) firstPassLen + meta.resumeSec
    else meta.durationSec
    return v.coerceIn(0.0, meta.durationSec)
  }

  // ---- Streaming (not downloaded) books: fetch each track from the user's server to cache ----

  private fun fetchRemoteTrack(meta: TranscriptMeta, track: TrackSource, isCancelled: () -> Boolean, onUpdate: (TranscriptMeta) -> Unit): File {
    val configId = meta.serverConnectionConfigId
    val config = DeviceManager.getServerConnectionConfig(configId)
    val address = (config?.address ?: meta.serverAddress ?: "").trimEnd('/')
    if (address.isEmpty()) throw IllegalStateException("Server not available. Download the book to transcribe it offline.")
    val url = if (track.source.startsWith("http")) track.source else "$address${track.source}"

    meta.phase = "audio"
    meta.phaseProgress = 0.0
    onUpdate(meta)

    val out = File(ctx.cacheDir, "transcription-track.tmp")
    out.delete()

    fun attempt(token: String): Int {
      val builder = Request.Builder().url(url).addHeader("Authorization", "Bearer $token")
      config?.customHeaders?.forEach { (k, v) -> builder.addHeader(k, v) }
      http.newCall(builder.build()).execute().use { resp ->
        if (resp.code == 401) return 401
        if (!resp.isSuccessful) throw IllegalStateException("Server returned ${resp.code} while fetching audio")
        val body = resp.body ?: throw IllegalStateException("Empty audio response")
        val total = body.contentLength()
        if (total > 0) {
          val free = StatFs(ctx.cacheDir.absolutePath).availableBytes
          if (free < total + 200L * 1024 * 1024) {
            throw IllegalStateException("Not enough free space to stream this book for transcription. Download it instead or free up space.")
          }
        }
        body.byteStream().use { input ->
          out.outputStream().use { os ->
            val buf = ByteArray(1 shl 16)
            var read = 0L
            var last = 0L
            while (true) {
              val n = input.read(buf)
              if (n < 0) break
              os.write(buf, 0, n)
              read += n
              if (isCancelled()) throw CancelledException()
              val now = System.currentTimeMillis()
              if (total > 0 && now - last > 1000) {
                last = now
                meta.phaseProgress = read.toDouble() / total
                onUpdate(meta)
              }
            }
          }
        }
        return 200
      }
    }

    var code = attempt(config?.token ?: DeviceManager.token)
    if (code == 401 && configId != null) {
      val newToken = refreshToken(configId)
      if (newToken != null) code = attempt(newToken)
    }
    if (code == 401) throw IllegalStateException("Server login expired. Open the app, sign in, and resume.")
    return out
  }

  private fun refreshToken(configId: String): String? {
    val latch = CountDownLatch(1)
    var token: String? = null
    try {
      ApiHandler(ctx).refreshAuthTokens(configId) { result ->
        if (result is ApiHandler.RefreshResult.Success) token = result.accessToken
        latch.countDown()
      }
      latch.await(60, TimeUnit.SECONDS)
    } catch (e: Exception) {
      Log.e(tag, "Token refresh failed", e)
    }
    return token
  }
}

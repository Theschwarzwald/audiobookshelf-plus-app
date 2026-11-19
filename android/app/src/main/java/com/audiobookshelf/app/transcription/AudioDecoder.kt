package com.audiobookshelf.app.transcription

import android.content.Context
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import android.util.Log
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.sin

/**
 * Streaming band-limited resampler (windowed-sinc, Blackman window) from any input
 * rate down/up to [outRate]. Input must be mono float samples in [-1, 1].
 */
class Resampler(private val inRate: Int, private val outRate: Int = 16000) {
  private val passthrough = inRate == outRate
  private val step = inRate.toDouble() / outRate
  private val cutoff = min(1.0, outRate.toDouble() / inRate) * 0.92
  private val halfWidth = ceil(10.0 / cutoff).toInt()
  private val phases = 256
  private val table: FloatArray = FloatArray(2 * halfWidth * phases + 2).also { t ->
    for (i in t.indices) {
      val x = i.toDouble() / phases - halfWidth
      val sinc = if (x == 0.0) 1.0 else sin(PI * cutoff * x) / (PI * cutoff * x)
      val w = x / halfWidth // -1..1
      val blackman = if (w <= -1.0 || w >= 1.0) 0.0 else 0.42 + 0.5 * cos(PI * w) + 0.08 * cos(2 * PI * w)
      t[i] = (cutoff * sinc * blackman).toFloat()
    }
  }

  private var buf = FloatArray(16384)
  private var bufLen = 0
  private var bufStart = 0L // absolute input index of buf[0]
  private var nextOut = 0L

  fun process(input: FloatArray, count: Int = input.size): FloatArray {
    if (passthrough) return if (count == input.size) input else input.copyOf(count)
    if (bufLen + count > buf.size) buf = buf.copyOf(maxOf(buf.size * 2, bufLen + count))
    System.arraycopy(input, 0, buf, bufLen, count)
    bufLen += count

    val bufEnd = bufStart + bufLen
    val maxOut = ((bufEnd - halfWidth - 1).toDouble() / step).toLong() - nextOut + 1
    if (maxOut <= 0) return FloatArray(0)
    val out = FloatArray(maxOut.toInt())
    var produced = 0
    while (produced < out.size) {
      val pos = nextOut * step
      val center = floor(pos).toLong()
      if (center + halfWidth >= bufEnd) break
      var acc = 0f
      var k = center - halfWidth + 1
      val kEnd = center + halfWidth
      while (k <= kEnd) {
        if (k >= bufStart) {
          val x = pos - k // in (-halfWidth, halfWidth]
          val ti = ((x + halfWidth) * phases).toInt()
          acc += buf[(k - bufStart).toInt()] * table[ti]
        }
        k++
      }
      out[produced++] = acc
      nextOut++
    }
    // Drop input samples no longer needed
    val keepFrom = floor(nextOut * step).toLong() - halfWidth
    val drop = (keepFrom - bufStart).coerceIn(0L, bufLen.toLong()).toInt()
    if (drop > 0) {
      System.arraycopy(buf, drop, buf, 0, bufLen - drop)
      bufLen -= drop
      bufStart += drop
    }
    return if (produced == out.size) out else out.copyOf(produced)
  }
}

/**
 * Decodes an audio file (m4b, m4a, mp3, ogg, flac, opus ... anything Android's MediaCodec
 * supports) to 16 kHz mono float PCM, in chunks.
 */
class AudioDecoder(private val ctx: Context, private val source: String) {
  private val tag = "AudioDecoder"

  /**
   * Decodes from [startSec] (seconds into this file) to the end.
   * [onChunk] receives (samples16kMono, chunkStartSecInFile) and returns false to stop.
   */
  fun decode(startSec: Double, onChunk: (FloatArray, Double) -> Boolean) {
    val extractor = MediaExtractor()
    var codec: MediaCodec? = null
    try {
      val uri = Uri.parse(source)
      if (uri.scheme == null || uri.scheme == "file") {
        extractor.setDataSource(uri.path ?: source)
      } else {
        extractor.setDataSource(ctx, uri, null)
      }

      var trackIndex = -1
      var format: MediaFormat? = null
      for (i in 0 until extractor.trackCount) {
        val f = extractor.getTrackFormat(i)
        if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) {
          trackIndex = i
          format = f
          break
        }
      }
      if (trackIndex < 0 || format == null) throw IllegalStateException("No audio track found")
      extractor.selectTrack(trackIndex)
      if (startSec > 0) extractor.seekTo((startSec * 1_000_000).toLong(), MediaExtractor.SEEK_TO_PREVIOUS_SYNC)

      val mime = format.getString(MediaFormat.KEY_MIME)!!
      codec = MediaCodec.createDecoderByType(mime)
      codec.configure(format, null, null, 0)
      codec.start()

      var sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      var pcmFloat = false
      var resampler = Resampler(sampleRate)
      var firstPtsSec = -1.0
      var emittedSamples = 0L // 16k samples already passed on (for chunk times)

      val info = MediaCodec.BufferInfo()
      var inputDone = false
      var outputDone = false
      val timeoutUs = 10_000L

      while (!outputDone) {
        if (!inputDone) {
          val inIndex = codec.dequeueInputBuffer(timeoutUs)
          if (inIndex >= 0) {
            val inBuf = codec.getInputBuffer(inIndex)!!
            val size = extractor.readSampleData(inBuf, 0)
            if (size < 0) {
              codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              codec.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
              extractor.advance()
            }
          }
        }

        val outIndex = codec.dequeueOutputBuffer(info, timeoutUs)
        when {
          outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            val of = codec.outputFormat
            sampleRate = of.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            channels = of.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            pcmFloat = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
              of.containsKey(MediaFormat.KEY_PCM_ENCODING) &&
              of.getInteger(MediaFormat.KEY_PCM_ENCODING) == AudioFormat.ENCODING_PCM_FLOAT
            resampler = Resampler(sampleRate)
            Log.d(tag, "Output format: $sampleRate Hz, $channels ch, float=$pcmFloat")
          }

          outIndex >= 0 -> {
            if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
            if (info.size > 0) {
              if (firstPtsSec < 0) firstPtsSec = info.presentationTimeUs / 1_000_000.0
              val outBuf = codec.getOutputBuffer(outIndex)!!
              outBuf.position(info.offset)
              outBuf.limit(info.offset + info.size)
              outBuf.order(ByteOrder.nativeOrder())
              val mono: FloatArray
              if (pcmFloat) {
                val fb = outBuf.asFloatBuffer()
                val frames = fb.remaining() / channels
                mono = FloatArray(frames)
                for (i in 0 until frames) {
                  var s = 0f
                  for (c in 0 until channels) s += fb.get(i * channels + c)
                  mono[i] = s / channels
                }
              } else {
                val sb = outBuf.asShortBuffer()
                val frames = sb.remaining() / channels
                mono = FloatArray(frames)
                for (i in 0 until frames) {
                  var s = 0
                  for (c in 0 until channels) s += sb.get(i * channels + c)
                  mono[i] = s / (32768f * channels)
                }
              }
              codec.releaseOutputBuffer(outIndex, false)
              val samples = resampler.process(mono)
              if (samples.isNotEmpty()) {
                val chunkStart = firstPtsSec + emittedSamples / 16000.0
                emittedSamples += samples.size
                if (!onChunk(samples, chunkStart)) return
              }
            } else {
              codec.releaseOutputBuffer(outIndex, false)
            }
          }
        }
      }
    } finally {
      try { codec?.stop() } catch (_: Exception) {}
      try { codec?.release() } catch (_: Exception) {}
      extractor.release()
    }
  }
}

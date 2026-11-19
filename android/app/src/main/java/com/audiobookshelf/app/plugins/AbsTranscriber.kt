package com.audiobookshelf.app.plugins

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import androidx.activity.result.ActivityResult
import android.os.Looper
import com.audiobookshelf.app.MainActivity
import com.audiobookshelf.app.transcription.ChapterSource
import com.audiobookshelf.app.transcription.ModelCatalog
import com.audiobookshelf.app.transcription.ModelManager
import com.audiobookshelf.app.transcription.TrackSource
import com.audiobookshelf.app.transcription.TranscriptMeta
import com.audiobookshelf.app.transcription.TranscriptStatus
import com.audiobookshelf.app.transcription.TranscriptStore
import com.audiobookshelf.app.transcription.TranscriptSync
import com.audiobookshelf.app.transcription.TranscriptionHub
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Capacitor bridge for on-device transcription ("Transcription" view in the player).
 */
@CapacitorPlugin(name = "AbsTranscriber")
class AbsTranscriber : Plugin() {
  private lateinit var store: TranscriptStore
  private lateinit var models: ModelManager
  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())

  private val listener: (String, JSONObject) -> Unit = { event, data ->
    main.post { notifyListeners(event, JSObject.fromJSONObject(data)) }
  }

  override fun load() {
    store = TranscriptStore(context)
    models = ModelManager(context)
    TranscriptionHub.addListener(listener)
  }

  override fun handleOnDestroy() {
    TranscriptionHub.removeListener(listener)
    super.handleOnDestroy()
  }

  private fun background(call: PluginCall, block: () -> Unit) {
    io.execute {
      try { block() } catch (e: Exception) { call.reject(e.message ?: e.toString()) }
    }
  }

  @PluginMethod
  fun getModels(call: PluginCall) = background(call) {
    val arr = JSArray()
    val current = TranscriptionHub.currentJob
    val tier = com.audiobookshelf.app.device.DeviceProfile.tier(context)
    val heavy = setOf("parakeet-tdt-v2-en", "parakeet-tdt-v3", "whisper-small")
    ModelCatalog.models.forEach { m ->
      arr.put(JSObject().apply {
        put("id", m.id)
        put("name", m.name)
        put("description", m.description)
        put("languages", m.languages)
        put("sizeLabel", m.sizeLabel)
        put("url", m.url)
        put("fileName", m.archiveName + ".tar.bz2")
        put("installed", models.isInstalled(m))
        put("installedBytes", if (models.isInstalled(m)) models.installedSizeBytes(m) else 0L)
        put("downloading", current is TranscriptionHub.Job.DownloadModel && current.modelId == m.id)
        // How well it suits this phone (big models on a 2+4-core, 6 GB phone take many hours)
        if (tier == "low" && m.id in heavy) put("fit", "slow").put("fitNote", "Slow on this phone: expect a 10-hour book to take most of a day. Moonshine or Whisper Base are faster here.")
        else if (tier == "high" && m.id in heavy) put("fit", "good")
      })
    }
    call.resolve(
      JSObject().put("models", arr).put("defaultModelId", ModelCatalog.DEFAULT_MODEL_ID)
        .put("deviceTier", tier).put("threads", com.audiobookshelf.app.device.DeviceProfile.recognizerThreads(context))
    )
  }

  @PluginMethod
  fun downloadModel(call: PluginCall) {
    val id = call.getString("modelId") ?: return call.reject("modelId required")
    if (ModelCatalog.get(id) == null) return call.reject("Unknown model")
    TranscriptionHub.enqueue(context, TranscriptionHub.Job.DownloadModel(id))
    call.resolve()
  }

  @PluginMethod
  fun cancelModelDownload(call: PluginCall) {
    val id = call.getString("modelId") ?: return call.reject("modelId required")
    TranscriptionHub.cancel("model:$id")
    call.resolve()
  }

  /**
   * Offline install: opens the file picker so the user can choose a model .tar.bz2 they
   * downloaded on a computer (or with the phone's browser). Progress arrives as onModelDownload.
   */
  @PluginMethod
  fun importModel(call: PluginCall) {
    val id = call.getString("modelId") ?: return call.reject("modelId required")
    if (ModelCatalog.get(id) == null) return call.reject("Unknown model")
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "*/*"
    }
    startActivityForResult(call, intent, "importModelResult")
  }

  @ActivityCallback
  private fun importModelResult(call: PluginCall?, result: ActivityResult) {
    if (call == null) return
    val uri: Uri? = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || uri == null) {
      call.resolve(JSObject().put("cancelled", true))
      return
    }
    val model = ModelCatalog.get(call.getString("modelId") ?: "") ?: return call.reject("Unknown model")
    call.resolve(JSObject().put("cancelled", false))

    val flag = "model:${model.id}"
    TranscriptionHub.cancelFlags.remove(flag)
    io.execute {
      val evt = { status: String -> JSONObject().put("modelId", model.id).put("status", status).put("import", true) }
      try {
        val resolver = context.contentResolver
        val total = resolver.openAssetFileDescriptor(uri, "r")?.use { it.length } ?: -1L
        val input = resolver.openInputStream(uri) ?: throw IllegalStateException("Couldn't open that file")
        input.use {
          models.importArchive(model, it, total, { TranscriptionHub.cancelFlags[flag] == true }) { read, size ->
            val p = if (size > 0) read.toDouble() / size else 0.0
            TranscriptionHub.emit("onModelDownload", evt("downloading").put("progress", p).put("bytes", read).put("total", size))
          }
        }
        TranscriptionHub.emit("onModelDownload", evt("done").put("progress", 1.0))
      } catch (e: Throwable) {
        TranscriptionHub.emit("onModelDownload", evt("error").put("error", e.message ?: e.toString()))
      }
    }
  }

  @PluginMethod
  fun deleteModel(call: PluginCall) = background(call) {
    val m = ModelCatalog.get(call.getString("modelId") ?: "") ?: throw IllegalArgumentException("Unknown model")
    models.delete(m)
    call.resolve()
  }

  /** Status of a transcript, { status: 'none' } when the item has never been transcribed. */
  @PluginMethod
  fun getTranscriptStatus(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val meta = store.getMeta(key)
    call.resolve(if (meta == null) JSObject().put("key", key).put("status", TranscriptStatus.NONE) else JSObject.fromJSONObject(withLiveStatus(meta).toJs()))
  }

  /** Lines from [fromIndex]: { lines: [{s, e, t}], status: {...} } */
  @PluginMethod
  fun getTranscript(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val from = call.getInt("fromIndex") ?: 0
    val raw = store.readLines(key, from)
    val lines = JSArray(raw.joinToString(",", "[", "]"))
    val meta = store.getMeta(key)
    val status = if (meta == null) JSObject().put("status", TranscriptStatus.NONE) else JSObject.fromJSONObject(withLiveStatus(meta).toJs())
    call.resolve(JSObject().put("lines", lines).put("fromIndex", from).put("status", status))
  }

  /** A job marked running but not actually running (app was killed) is reported as paused. */
  private fun withLiveStatus(meta: TranscriptMeta): TranscriptMeta {
    if (meta.status == TranscriptStatus.RUNNING || meta.status == TranscriptStatus.QUEUED) {
      val cur = TranscriptionHub.currentJob
      val active = (cur is TranscriptionHub.Job.Transcribe && cur.key == meta.key) ||
        TranscriptionHub.queue.contains(TranscriptionHub.Job.Transcribe(meta.key))
      if (!active) meta.status = TranscriptStatus.PAUSED
    }
    return meta
  }

  /**
   * Starts (or resumes) transcribing the item that is loaded in the player.
   * { key, modelId, restart? }
   */
  @PluginMethod
  fun startTranscription(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val restart = call.getBoolean("restart") ?: false
    val existing = store.getMeta(key)
    val modelId = call.getString("modelId") ?: existing?.modelId ?: ModelCatalog.DEFAULT_MODEL_ID
    if (ModelCatalog.get(modelId) == null) throw IllegalArgumentException("Unknown model")

    val meta: TranscriptMeta
    if (existing != null && !restart && existing.modelId == modelId && existing.tracks.isNotEmpty() && existing.status != TranscriptStatus.DONE) {
      meta = existing // resume where it left off
    } else {
      val mainActivity = activity as MainActivity
      if (!mainActivity.isPlayerNotificationServiceInitialized()) throw IllegalStateException("Player not ready")
      val session = mainActivity.foregroundService.currentPlaybackSession
        ?: throw IllegalStateException("Start playing the book first, then open Transcription.")

      val tracks = session.audioTracks.map { t ->
        when {
          session.isLocal -> TrackSource(t.contentUrl, t.startOffset, t.duration, remote = false)
          session.isHLS -> throw IllegalStateException(
            "This book is being transcoded by the server, which can't be transcribed. Download the book to the device and try again."
          )
          else -> TrackSource(t.contentUrl, t.startOffset, t.duration, remote = true)
        }
      }
      if (tracks.isEmpty()) throw IllegalStateException("This item has no audio tracks")

      store.delete(key)
      val duration = session.getTotalDuration()
      // Start where the listener is, so the part they're hearing is transcribed first
      // (the beginning of the book is done afterwards). Back up a little for context.
      val position = (call.getDouble("startSec") ?: session.currentTime) - 30.0
      val firstStart = if (position > 60.0 && position < duration - 60.0) position else 0.0
      meta = TranscriptMeta(
        key = key,
        title = session.displayTitle ?: "",
        modelId = modelId,
        durationSec = duration,
        firstStartSec = firstStart,
        resumeSec = firstStart,
        libraryItemId = session.libraryItemId,
        ebookLocalUri = localEpubUri(session),
        chapters = session.chapters.map { ChapterSource(it.start, it.end, it.title ?: "") },
        serverConnectionConfigId = session.serverConnectionConfigId,
        serverAddress = session.serverAddress,
        tracks = tracks
      )
    }
    meta.status = TranscriptStatus.QUEUED
    meta.error = null
    store.saveMeta(meta)
    TranscriptionHub.enqueue(context, TranscriptionHub.Job.Transcribe(key))
    call.resolve(JSObject.fromJSONObject(meta.toJs()))
  }

  private fun localEpubUri(session: com.audiobookshelf.app.data.PlaybackSession): String? {
    val book = session.localLibraryItem?.media as? com.audiobookshelf.app.data.Book ?: return null
    val eb = book.ebookFile ?: return null
    // Any format the spelling check can read (EPUB, MOBI/AZW/AZW3, KFX, DjVu, iBooks); PDF/comics are skipped
    val ext = (eb.metadata?.filename ?: "").substringAfterLast('.', "").lowercase()
    val format = eb.ebookFormat.lowercase()
    return if (format in com.audiobookshelf.app.transcription.EbookReader.supportedExtensions ||
      ext in com.audiobookshelf.app.transcription.EbookReader.supportedExtensions) eb.contentUrl else null
  }

  /** Compare a finished transcript with the book's ebook (runs in the background service). */
  @PluginMethod
  fun checkWithEbook(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val meta = store.getMeta(key) ?: throw IllegalStateException("Transcribe the book first")
    if (meta.status != TranscriptStatus.DONE) throw IllegalStateException("Wait until the transcription is finished")
    // Older transcripts didn't record chapters / item id: take them from the player if it's this book
    val mainActivity = activity as? MainActivity
    val session = if (mainActivity?.isPlayerNotificationServiceInitialized() == true) mainActivity.foregroundService.currentPlaybackSession else null
    if (session != null) {
      if (meta.chapters.isEmpty()) meta.chapters = session.chapters.map { ChapterSource(it.start, it.end, it.title ?: "") }
      if (meta.libraryItemId == null) meta.libraryItemId = session.libraryItemId
      if (meta.ebookLocalUri == null) meta.ebookLocalUri = localEpubUri(session)
    }
    meta.ebookCheck = "queued"
    meta.ebookCheckMessage = "Waiting to compare with the ebook…"
    store.saveMeta(meta)
    TranscriptionHub.enqueue(context, TranscriptionHub.Job.EbookCheck(key))
    call.resolve(JSObject.fromJSONObject(meta.toJs()))
  }

  /** { check: { chapters, suggestions, ... } | null } */
  @PluginMethod
  fun getEbookCheck(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val check = store.getEbookCheck(key)
    call.resolve(JSObject().put("check", if (check == null) JSONObject.NULL else JSObject.fromJSONObject(check)))
  }

  /** { key, ids: [...], status: 'applied' | 'ignored' } -> applies ebook spellings to the transcript */
  @PluginMethod
  fun updateSuggestions(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val status = call.getString("status") ?: "applied"
    if (status != "applied" && status != "ignored") throw IllegalArgumentException("Bad status")
    val idsArr = call.getArray("ids") ?: throw IllegalArgumentException("ids required")
    val ids = (0 until idsArr.length()).map { idsArr.getString(it) }.toSet()
    val pending = store.updateSuggestions(key, ids, status)
    store.getMeta(key)?.let {
      it.ebookSuggestions = pending
      store.saveMeta(it)
      TranscriptionHub.emit("onTranscriptionUpdate", it.toJs())
    }
    TranscriptSync.async(context, key)
    call.resolve(JSObject().put("pending", pending))
  }

  @PluginMethod
  fun pauseTranscription(call: PluginCall) {
    val key = call.getString("key") ?: return call.reject("key required")
    TranscriptionHub.cancel(key)
    io.execute {
      store.getMeta(key)?.let {
        if (it.status == TranscriptStatus.QUEUED) {
          it.status = TranscriptStatus.PAUSED
          store.saveMeta(it)
        }
      }
    }
    call.resolve()
  }

  @PluginMethod
  fun cancelTranscription(call: PluginCall) = deleteTranscript(call)

  /** Stops any running job for this item and deletes its transcript (Cancel / Delete). */
  @PluginMethod
  fun deleteTranscript(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val cur = TranscriptionHub.currentJob
    if (cur is TranscriptionHub.Job.Transcribe && cur.key == key) TranscriptionHub.cancelAndDiscard(key)
    else TranscriptionHub.cancel(key)
    // Give a running job a moment to notice the cancel before removing its files
    var waited = 0
    while (waited < 5000) {
      val cur = TranscriptionHub.currentJob
      if (!(cur is TranscriptionHub.Job.Transcribe && cur.key == key)) break
      Thread.sleep(100)
      waited += 100
    }
    store.delete(key)
    TranscriptSync.async(context, key) // deletes the server's copy too (two-way sync)
    call.resolve()
  }

  /** The ebook's paragraphs saved by the ebook check (karaoke view): { text: { ebookTitle, paragraphs } | null } */
  @PluginMethod
  fun getEbookText(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val text = store.getEbookText(key)
    call.resolve(JSObject().put("text", text ?: JSONObject.NULL))
  }

  /**
   * Syncs one transcript with the server now (push local changes, pull newer server copies).
   * { key, pull?: true, configId? } -> { result }
   */
  @PluginMethod
  fun syncTranscript(call: PluginCall) = background(call) {
    val key = call.getString("key") ?: throw IllegalArgumentException("key required")
    val result = TranscriptSync.syncNow(context, key, call.getBoolean("pull") ?: true, call.getString("configId"))
    call.resolve(JSObject().put("result", result))
  }

  /** Background sync of every transcript on the phone. */
  @PluginMethod
  fun syncAll(call: PluginCall) {
    TranscriptSync.asyncAll(context)
    call.resolve()
  }

  @PluginMethod
  fun listTranscripts(call: PluginCall) = background(call) {
    val arr = JSArray()
    store.listAll().forEach { arr.put(JSObject.fromJSONObject(withLiveStatus(it).toJs())) }
    call.resolve(JSObject().put("transcripts", arr))
  }
}

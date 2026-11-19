package com.audiobookshelf.app.transcription

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.audiobookshelf.app.R
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.LinkedBlockingDeque

/**
 * Process-wide hub between the Capacitor plugin (UI) and the background service.
 */
object TranscriptionHub {
  sealed class Job {
    data class Transcribe(val key: String) : Job()
    data class DownloadModel(val modelId: String) : Job()
    data class EbookCheck(val key: String) : Job()
  }

  val queue = LinkedBlockingDeque<Job>()
  /** key/modelId -> cancel flag */
  val cancelFlags = ConcurrentHashMap<String, Boolean>()
  @Volatile var currentJob: Job? = null

  private val listeners = mutableSetOf<(String, JSONObject) -> Unit>()

  @Synchronized fun addListener(l: (String, JSONObject) -> Unit) { listeners.add(l) }
  @Synchronized fun removeListener(l: (String, JSONObject) -> Unit) { listeners.remove(l) }
  @Synchronized fun emit(event: String, data: JSONObject) {
    listeners.forEach { try { it(event, data) } catch (e: Exception) { Log.e("TranscriptionHub", "listener", e) } }
  }

  fun enqueue(ctx: Context, job: Job) {
    if (currentJob != job && !queue.contains(job)) queue.add(job)
    when (job) {
      is Job.Transcribe -> cancelFlags.remove(job.key)
      is Job.DownloadModel -> cancelFlags.remove("model:" + job.modelId)
      is Job.EbookCheck -> cancelFlags.remove("ebook:" + job.key)
    }
    ContextCompat.startForegroundService(ctx, Intent(ctx, TranscriptionService::class.java))
  }

  /** Transcripts whose job should delete everything once it stops (Cancel, not Pause). */
  val discardOnStop: MutableSet<String> = ConcurrentHashMap.newKeySet()

  /** Cancel = stop and delete the partial transcript. Pause keeps it for Resume. */
  fun cancelAndDiscard(key: String) {
    discardOnStop.add(key)
    cancel(key)
  }

  fun cancel(id: String) {
    cancelFlags[id] = true
    queue.removeIf {
      (it is Job.Transcribe && it.key == id) || (it is Job.DownloadModel && "model:" + it.modelId == id) ||
        (it is Job.EbookCheck && ("ebook:" + it.key == id || it.key == id))
    }
  }
}

class TranscriptionService : Service() {
  private val tag = "TranscriptionService"
  private val lock = Any()
  private var worker: Thread? = null
  private var lastStartId = 0
  private var wakeLock: PowerManager.WakeLock? = null
  private lateinit var store: TranscriptStore
  private lateinit var models: ModelManager

  override fun onCreate() {
    super.onCreate()
    store = TranscriptStore(this)
    models = ModelManager(this)
    createChannel()
    startForegroundWithType(notification("Preparing transcription…", 0, false))
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_CANCEL) {
      when (val job = TranscriptionHub.currentJob) {
        is TranscriptionHub.Job.Transcribe -> TranscriptionHub.cancelAndDiscard(job.key)
        is TranscriptionHub.Job.DownloadModel -> TranscriptionHub.cancel("model:" + job.modelId)
        is TranscriptionHub.Job.EbookCheck -> TranscriptionHub.cancel("ebook:" + job.key)
        null -> {}
      }
      TranscriptionHub.queue.clear()
      return START_NOT_STICKY
    }
    if (intent?.action == ACTION_PAUSE) {
      when (val job = TranscriptionHub.currentJob) {
        is TranscriptionHub.Job.Transcribe -> TranscriptionHub.cancel(job.key)
        is TranscriptionHub.Job.DownloadModel -> TranscriptionHub.cancel("model:" + job.modelId)
        is TranscriptionHub.Job.EbookCheck -> TranscriptionHub.cancel("ebook:" + job.key)
        null -> {}
      }
      TranscriptionHub.queue.clear()
      return START_NOT_STICKY
    }
    startForegroundWithType(notification("Preparing transcription…", 0, false))
    synchronized(lock) {
      lastStartId = startId
      if (worker == null) {
        worker = Thread({ workLoop() }, "abs-transcriber").apply {
          priority = Thread.NORM_PRIORITY - 1
          start()
        }
      }
    }
    return START_NOT_STICKY
  }

  // Android 15+: dataSync foreground services get ~6h/day. Pause cleanly; the user can resume later.
  override fun onTimeout(startId: Int, fgsType: Int) {
    Log.w(tag, "Foreground service timeout, pausing")
    TranscriptionHub.currentJob?.let {
      if (it is TranscriptionHub.Job.Transcribe) TranscriptionHub.cancel(it.key)
    }
    TranscriptionHub.queue.clear()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun workLoop() {
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "abs:transcription").apply { acquire(12 * 60 * 60 * 1000L) }
    var exitStartId = 0
    try {
      while (true) {
        val job = synchronized(lock) {
          val j = TranscriptionHub.queue.poll()
          if (j == null) {
            worker = null
            exitStartId = lastStartId
          }
          j
        } ?: break
        TranscriptionHub.currentJob = job
        when (job) {
          is TranscriptionHub.Job.Transcribe -> runTranscribe(job.key)
          is TranscriptionHub.Job.DownloadModel -> runModelDownload(job.modelId)
          is TranscriptionHub.Job.EbookCheck -> runEbookCheck(job.key)
        }
        TranscriptionHub.currentJob = null
      }
    } catch (e: Throwable) {
      Log.e(tag, "Worker crashed", e)
      synchronized(lock) {
        worker = null
        exitStartId = lastStartId
      }
    } finally {
      TranscriptionHub.currentJob = null
      try { wakeLock?.release() } catch (_: Exception) {}
    }
    // Only stops if no newer start request arrived (that one has its own worker)
    if (stopSelfResult(exitStartId)) stopForeground(STOP_FOREGROUND_REMOVE)
  }

  private fun runModelDownload(modelId: String) {
    val model = ModelCatalog.get(modelId) ?: return
    val flag = "model:$modelId"
    val evt = JSONObject().put("modelId", modelId)
    try {
      models.download(model, { TranscriptionHub.cancelFlags[flag] == true }) { read, total ->
        val p = if (total > 0) read.toDouble() / total else 0.0
        TranscriptionHub.emit("onModelDownload", JSONObject().put("modelId", modelId).put("status", "downloading").put("progress", p).put("bytes", read).put("total", total))
        updateNotification("Downloading ${model.name}", (p * 100).toInt(), total > 0)
      }
      TranscriptionHub.emit("onModelDownload", evt.put("status", "done").put("progress", 1.0))
    } catch (e: Throwable) {
      Log.e(tag, "Model download failed", e)
      models.delete(model)
      val cancelled = TranscriptionHub.cancelFlags[flag] == true
      TranscriptionHub.emit("onModelDownload", evt.put("status", if (cancelled) "cancelled" else "error").put("error", e.message ?: e.toString()))
    }
  }

  private fun runTranscribe(key: String) {
    val meta = store.getMeta(key) ?: return
    meta.status = TranscriptStatus.RUNNING
    meta.error = null
    store.saveMeta(meta)
    // Tell the server (if it has the transcription add-on) that this phone is transcribing the book
    TranscriptSync.async(this, key, allowPull = false)
    var lastCheckIn = System.currentTimeMillis()
    val engine = TranscriptionEngine(this, store, models)
    var hotPause = false
    var powerPauseReason: String? = null
    var lastThermalCheck = 0L
    com.audiobookshelf.app.device.PowerPolicy.clearAutoPaused(this, key)
    // Not a good moment (unplugged when set to "only while charging", low battery, hot): wait instead
    com.audiobookshelf.app.device.PowerPolicy.blockReason(this)?.let { reason ->
      meta.status = TranscriptStatus.PAUSED
      meta.error = reason
      store.saveMeta(meta)
      com.audiobookshelf.app.device.PowerPolicy.markAutoPaused(this, key)
      TranscriptionHub.emit("onTranscriptionUpdate", meta.toJs())
      return
    }
    val update: (TranscriptMeta) -> Unit = { m ->
      val now = System.currentTimeMillis()
      // Every 15 s: too hot (SEVERE or worse), battery low off the charger, unplugged in "only while
      // charging" mode: pause and pick it up again automatically when that passes
      if (now - lastThermalCheck > 15_000) {
        lastThermalCheck = now
        val reason = com.audiobookshelf.app.device.PowerPolicy.blockReason(this)
        if (reason != null) {
          if (com.audiobookshelf.app.device.DeviceProfile.thermal(this) >= 3) hotPause = true
          powerPauseReason = reason
          TranscriptionHub.cancelFlags[key] = true
        }
      }
      // Warm (MODERATE): give the CPU short breaks so the phone doesn't throttle hard or get hot
      if (com.audiobookshelf.app.device.DeviceProfile.thermal(this) == 2 && com.audiobookshelf.app.device.AdaptPrefs.power(this) != "max") {
        try { Thread.sleep(400) } catch (_: InterruptedException) {}
      }
      if (now - lastCheckIn > TranscriptSync.PARTIAL_PUSH_INTERVAL_MS) {
        lastCheckIn = now
        store.saveMeta(m)
        TranscriptSync.async(this, key, allowPull = false)
      }
      TranscriptionHub.emit("onTranscriptionUpdate", m.toJs())
      val pct = if (m.durationSec > 0) (m.doneSec / m.durationSec * 100).toInt() else 0
      val text = when (m.phase) {
        "model" -> "Downloading speech model… ${(m.phaseProgress * 100).toInt()}%"
        "audio" -> "Fetching audio from server… ${(m.phaseProgress * 100).toInt()}%"
        else -> "Transcribing ${m.title} — $pct%"
      }
      updateNotification(text, if (m.phase == "transcribing") pct else (m.phaseProgress * 100).toInt(), true)
    }
    try {
      engine.run(meta, { TranscriptionHub.cancelFlags[key] == true }, update)
      meta.status = TranscriptStatus.DONE
      meta.phase = ""
      meta.processedSec = meta.durationSec
      meta.doneSec = meta.durationSec
    } catch (e: CancelledException) {
      meta.status = TranscriptStatus.PAUSED
      if (powerPauseReason != null) {
        meta.error = powerPauseReason
        if (hotPause || com.audiobookshelf.app.device.PowerPolicy.autoResumes(this)) com.audiobookshelf.app.device.PowerPolicy.markAutoPaused(this, key)
      } else if (hotPause) meta.error = "Paused because the phone got too hot. Resume when it has cooled down."
    } catch (e: InterruptedException) {
      meta.status = TranscriptStatus.PAUSED
    } catch (e: Throwable) {
      Log.e(tag, "Transcription failed", e)
      meta.status = if (TranscriptionHub.cancelFlags[key] == true) TranscriptStatus.PAUSED else TranscriptStatus.ERROR
      meta.error = e.message ?: e.toString()
    }
    TranscriptionHub.cancelFlags.remove(key)
    if (TranscriptionHub.discardOnStop.remove(key)) {
      store.delete(key)
      TranscriptionHub.emit("onTranscriptionUpdate", JSONObject().put("key", key).put("status", TranscriptStatus.NONE).put("cancelled", true))
      TranscriptSync.async(this, key) // removes the partial copy from the server too
      return
    }
    store.saveMeta(meta)
    store.markDirty(key)
    TranscriptionHub.emit("onTranscriptionUpdate", meta.toJs())
    // Finished, paused or stopped: send the result to the server
    TranscriptSync.async(this, key)

    // Spelling against the ebook is checked on the server (not here): the transcript was just sent there,
    // and the server checks finished transcripts in the background; the result comes back with the next sync
  }

  private fun runEbookCheck(key: String) {
    val meta = store.getMeta(key) ?: return
    if (meta.status != TranscriptStatus.DONE) return
    val flag = "ebook:$key"
    meta.ebookCheck = "running"
    meta.ebookCheckMessage = "Comparing with the ebook…"
    store.saveMeta(meta)
    TranscriptionHub.emit("onTranscriptionUpdate", meta.toJs())
    updateNotification("Checking spelling against the ebook…", 0, false)
    try {
      val count = EbookCheckRunner(this, store).run(meta) { TranscriptionHub.cancelFlags[flag] == true }
      meta.ebookCheck = "done"
      meta.ebookSuggestions = count
    } catch (e: NoEbookException) {
      meta.ebookCheck = "unavailable"
      meta.ebookCheckMessage = e.message
    } catch (e: CancelledException) {
      meta.ebookCheck = "none"
      meta.ebookCheckMessage = null
    } catch (e: Throwable) {
      Log.e(tag, "Ebook check failed", e)
      meta.ebookCheck = "error"
      meta.ebookCheckMessage = "Ebook check failed: ${e.message ?: e}"
    }
    TranscriptionHub.cancelFlags.remove(flag)
    // The transcript may have been deleted meanwhile
    if (store.getMeta(key) == null) return
    store.saveMeta(meta)
    store.markDirty(key)
    TranscriptionHub.emit("onTranscriptionUpdate", meta.toJs())
    TranscriptSync.async(this, key)
  }

  private fun updateNotification(text: String, progress: Int, determinate: Boolean) {
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
      .notify(NOTIFICATION_ID, notification(text, progress, determinate))
  }

  private fun startForegroundWithType(n: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(NOTIFICATION_ID, n)
    }
  }

  private fun notification(text: String, progress: Int, determinate: Boolean): Notification {
    val pauseIntent = PendingIntent.getService(
      this, 2, Intent(this, TranscriptionService::class.java).setAction(ACTION_PAUSE),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 3, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.icon)
      .setContentTitle("Transcription")
      .setContentText(text)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .setContentIntent(openIntent)
      .setProgress(100, progress.coerceIn(0, 100), !determinate)
      .addAction(0, "Pause", pauseIntent)
      .addAction(0, "Cancel", PendingIntent.getService(
        this, 4, Intent(this, TranscriptionService::class.java).setAction(ACTION_CANCEL),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      ))
      .build()
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Transcription", NotificationManager.IMPORTANCE_LOW)
    )
  }

  companion object {
    private const val CHANNEL_ID = "transcription"
    private const val NOTIFICATION_ID = 21
    private const val ACTION_PAUSE = "com.audiobookshelf.app.transcription.PAUSE"
    private const val ACTION_CANCEL = "com.audiobookshelf.app.transcription.CANCEL"
  }
}

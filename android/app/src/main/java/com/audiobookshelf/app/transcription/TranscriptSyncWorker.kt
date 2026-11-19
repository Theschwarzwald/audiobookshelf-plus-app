package com.audiobookshelf.app.transcription

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Background check for changes, even with the app closed: every few hours (when there's a network
 * and the battery isn't low) syncs every transcript on this phone with the server, both ways:
 * finished server transcripts and spelling fixes come down, phone changes and deletes go up.
 * Android picks the exact moment to save battery. Also picks up transcriptions paused for power.
 */
class TranscriptSyncWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
  override fun doWork(): Result {
    val app = applicationContext
    return try {
      val store = TranscriptStore(app)
      val keys = store.listAll().map { it.key }.toMutableSet()
      store.readPendingDeletes().keys().forEach { keys.add(it) }
      var failed = 0
      for (k in keys) {
        if (isStopped) break
        val r = TranscriptSync.syncNow(app, k, allowPull = true, configId = null, timeoutSec = 120)
        if (r.startsWith("error")) failed++
      }
      runCatching { com.audiobookshelf.app.device.PowerPolicy.onConditionsChanged(app) }
      Log.i(TAG, "Synced ${keys.size} transcripts ($failed failed)")
      Result.success()
    } catch (e: Exception) {
      Log.w(TAG, "Background sync failed", e)
      Result.retry()
    }
  }

  companion object {
    private const val TAG = "TranscriptSyncWorker"
    private const val NAME = "abs-plus-transcript-sync"

    fun schedule(ctx: Context) {
      val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build()
      val req = PeriodicWorkRequestBuilder<TranscriptSyncWorker>(6, TimeUnit.HOURS, 1, TimeUnit.HOURS)
        .setConstraints(constraints)
        .build()
      WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.KEEP, req)
    }
  }
}

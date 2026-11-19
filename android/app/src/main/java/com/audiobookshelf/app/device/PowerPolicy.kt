package com.audiobookshelf.app.device

import android.content.Context
import android.util.Log
import com.audiobookshelf.app.transcription.TranscriptStatus
import com.audiobookshelf.app.transcription.TranscriptStore
import com.audiobookshelf.app.transcription.TranscriptionHub

/**
 * When heavy work (on-device transcription) may run by itself, and picking it back up afterwards.
 *
 *   auto      runs any time, but pauses when the battery drops to the low mark (20 %) off the charger,
 *             on battery saver, or when the phone gets hot; carries on when charging / cool again
 *   charging  only while charging (pauses when unplugged, carries on when plugged in)
 *   always    runs regardless (still pauses if the phone gets too hot)
 *   manual    never pauses or resumes on its own (still pauses if the phone gets too hot)
 *
 * Paused-for-power transcripts are remembered and resumed when the reason clears, while the app is
 * running (or the next time it starts).
 */
object PowerPolicy {
  private const val TAG = "PowerPolicy"
  private const val AUTO_PAUSED = "autoPausedKeys"

  /** null = may run; otherwise the reason it should wait (shown to the user) */
  fun blockReason(ctx: Context): String? {
    val thermal = DeviceProfile.thermal(ctx)
    if (thermal >= 3) return "Paused because the phone got too hot. It carries on by itself once it cools down."
    val b = DeviceProfile.battery(ctx)
    return when (AdaptPrefs.background(ctx)) {
      "charging" -> if (!b.charging) "Waiting for the charger: on-device transcription is set to run only while charging." else null
      "always", "manual" -> null
      else -> when {
        b.charging -> null
        DeviceProfile.powerSave(ctx) -> "Paused for battery saver. It carries on when you plug in or turn battery saver off."
        b.level in 0..AdaptPrefs.lowBatteryAt(ctx) -> "Paused at ${b.level} % battery. It carries on when you plug in."
        else -> null
      }
    }
  }

  /** Should a transcription paused for [reason] resume by itself when it clears? */
  fun autoResumes(ctx: Context) = AdaptPrefs.background(ctx) != "manual"

  fun markAutoPaused(ctx: Context, key: String) {
    val sp = AdaptPrefs.sp(ctx)
    val set = (sp.getStringSet(AUTO_PAUSED, emptySet()) ?: emptySet()).toMutableSet()
    set.add(key)
    sp.edit().putStringSet(AUTO_PAUSED, set).apply()
  }

  fun clearAutoPaused(ctx: Context, key: String) {
    val sp = AdaptPrefs.sp(ctx)
    val set = (sp.getStringSet(AUTO_PAUSED, emptySet()) ?: emptySet()).toMutableSet()
    if (set.remove(key)) sp.edit().putStringSet(AUTO_PAUSED, set).apply()
  }

  /** Battery, charger or temperature changed: resume what was paused for power, if allowed now */
  fun onConditionsChanged(ctx: Context) {
    if (blockReason(ctx) != null || !autoResumes(ctx)) return
    val sp = AdaptPrefs.sp(ctx)
    val keys = sp.getStringSet(AUTO_PAUSED, emptySet())?.toList() ?: return
    if (keys.isEmpty()) return
    val store = TranscriptStore(ctx)
    for (key in keys) {
      val meta = store.getMeta(key)
      clearAutoPaused(ctx, key)
      if (meta == null || meta.status != TranscriptStatus.PAUSED) continue
      try {
        meta.status = TranscriptStatus.QUEUED
        meta.error = null
        store.saveMeta(meta)
        TranscriptionHub.enqueue(ctx, TranscriptionHub.Job.Transcribe(key))
        TranscriptionHub.emit("onTranscriptionUpdate", meta.toJs())
        Log.i(TAG, "Resuming $key")
      } catch (e: Exception) {
        // Android may refuse to start the service from the background; try again next time
        meta.status = TranscriptStatus.PAUSED
        store.saveMeta(meta)
        markAutoPaused(ctx, key)
        Log.w(TAG, "Couldn't resume $key yet: ${e.message}")
      }
    }
  }
}

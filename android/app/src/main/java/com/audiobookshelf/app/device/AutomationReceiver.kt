package com.audiobookshelf.app.device

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Lets automation apps (Tasker, MacroDroid, Automate) or adb change the device settings, e.g. battery
 * saver when you leave home or the e-ink theme when docked. Send a broadcast to this receiver:
 *
 *   action  com.audiobookshelf.app.plus.SET
 *   extras  power=auto|max|balanced|saver   refresh=auto|max|120|90|60   screen=auto|lcd|oled|eink|eink-color
 *           formFactor=auto|phone|tablet|desktop   background=auto|charging|always|manual   lowBatteryAt=5..50
 *           theme=auto|dark|black|light|eink|eink-dark|eink-color|eink-color-dark   colorVision=none|protan|deutan|tritan|mono
 *           reset=true  (everything back to Automatic)
 *
 *   adb shell am broadcast -a com.audiobookshelf.app.plus.SET -p <package> --es power saver --es refresh 60
 *
 * Unknown keys or values are ignored. Only display and power choices can be changed this way.
 */
class AutomationReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != ACTION) return
    if (intent.getBooleanExtra("reset", false) || intent.getStringExtra("reset") == "true") AdaptPrefs.reset(ctx)
    val values = AdaptPrefs.KEYS.mapNotNull { k -> intent.extras?.get(k)?.toString()?.let { k to it } }.toMap()
    val changed = AdaptPrefs.set(ctx, values)
    Log.i("AutomationReceiver", "Changed: $changed")
    // The app (if running) hears about it through the SharedPreferences listener in AbsDevice
    if ("background" in changed || "lowBatteryAt" in changed) PowerPolicy.onConditionsChanged(ctx)
  }

  companion object {
    const val ACTION = "com.audiobookshelf.app.plus.SET"
  }
}

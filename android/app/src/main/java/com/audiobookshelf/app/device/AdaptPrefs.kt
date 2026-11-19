package com.audiobookshelf.app.device

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * The device-adaptation choices (Settings → Device & performance), kept natively so the background
 * transcription service and automation apps (Tasker, MacroDroid, adb) see the same values as the app.
 * Every value defaults to "auto": the app works it out and keeps adjusting.
 *
 *   formFactor  auto | phone | tablet | desktop
 *   screen      auto | lcd | oled | eink | eink-color
 *   refresh     auto | max | 120 | 90 | 60          (auto: highest; 60 Hz in low power; Android's choice on e-ink)
 *   power       auto | max | balanced | saver        (auto: start at full, step down from what the device reports)
 *   background  auto | charging | always | manual    (when on-device transcription may run on its own)
 *   lowBatteryAt  battery % that counts as low power when not charging (auto mode), default 20
 *   theme, colorVision  optional, set by automation; the app applies them when they change
 */
object AdaptPrefs {
  const val FILE = "abs_plus_adapt"
  val KEYS = listOf("formFactor", "screen", "refresh", "power", "background", "lowBatteryAt", "theme", "colorVision")
  private val ALLOWED = mapOf(
    "formFactor" to setOf("auto", "phone", "tablet", "desktop"),
    "screen" to setOf("auto", "lcd", "oled", "eink", "eink-color"),
    "refresh" to setOf("auto", "max", "120", "90", "60"),
    "power" to setOf("auto", "max", "balanced", "saver"),
    "background" to setOf("auto", "charging", "always", "manual"),
    "theme" to setOf("auto", "system", "dark", "black", "light", "eink", "eink-dark", "eink-color", "eink-color-dark"),
    "colorVision" to setOf("none", "protan", "deutan", "tritan", "mono")
  )

  fun sp(ctx: Context): SharedPreferences = ctx.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun get(ctx: Context, key: String): String {
    val def = if (key == "lowBatteryAt") "20" else if (key == "theme" || key == "colorVision") "" else "auto"
    return sp(ctx).getString(key, def) ?: def
  }

  fun power(ctx: Context) = get(ctx, "power")
  fun background(ctx: Context) = get(ctx, "background")
  fun lowBatteryAt(ctx: Context) = get(ctx, "lowBatteryAt").toIntOrNull()?.coerceIn(5, 50) ?: 20

  /** Validates and stores; returns the keys that changed */
  fun set(ctx: Context, values: Map<String, String>): List<String> {
    val e = sp(ctx).edit()
    val changed = mutableListOf<String>()
    for ((k, raw) in values) {
      val v = raw.trim().lowercase()
      val ok = when (k) {
        "lowBatteryAt" -> v.toIntOrNull()?.let { it in 5..50 } == true
        else -> ALLOWED[k]?.contains(v) == true
      }
      if (!ok) continue
      if (get(ctx, k) != v) changed.add(k)
      e.putString(k, v)
    }
    e.apply()
    return changed
  }

  fun reset(ctx: Context) = sp(ctx).edit().clear().apply()

  fun toJson(ctx: Context): JSONObject {
    val o = JSONObject()
    KEYS.forEach { o.put(it, get(ctx, it)) }
    return o
  }
}

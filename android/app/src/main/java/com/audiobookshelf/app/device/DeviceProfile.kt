package com.audiobookshelf.app.device

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.view.Display
import android.view.WindowManager
import java.io.File

/**
 * What this device is and what it can do, so the app can adapt:
 *  - CPU: total cores and how many are "performance" cores (big.LITTLE), from each core's max clock
 *  - memory, Android's low-RAM flag
 *  - battery saver, charging, battery level, thermal state
 *  - screen: refresh rates (60/90/120 Hz…), HDR / wide colour (a hint for OLED), e-ink (by maker),
 *    foldable (hinge sensor), desktop mode (DeX, ChromeOS, desk dock, Android desktop windowing)
 *  - a performance tier: low (e.g. 2 performance + 4 efficiency cores, 6 GB) · mid · high
 */
object DeviceProfile {
  data class Cpu(val cores: Int, val bigCores: Int, val littleCores: Int, val maxMhz: Int)

  @Volatile private var cpuCache: Cpu? = null

  fun cpu(): Cpu {
    cpuCache?.let { return it }
    val n = Runtime.getRuntime().availableProcessors()
    val freqs = (0 until n).mapNotNull { i ->
      runCatching { File("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq").readText().trim().toInt() }.getOrNull()
    }
    val result = if (freqs.size == n && freqs.distinct().size > 1) {
      // Efficiency cores are the ones in the slowest cluster; everything faster counts as performance
      val slowest = freqs.minOrNull() ?: 0
      val little = freqs.count { it == slowest }
      Cpu(n, n - little, little, (freqs.maxOrNull() ?: 0) / 1000)
    } else {
      // Can't tell the clusters apart: assume half are performance cores
      Cpu(n, (n + 1) / 2, n / 2, (freqs.maxOrNull() ?: 0) / 1000)
    }
    cpuCache = result
    return result
  }

  fun totalRamMb(ctx: Context): Long {
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val mi = ActivityManager.MemoryInfo()
    am.getMemoryInfo(mi)
    return mi.totalMem / (1024 * 1024)
  }

  fun availRamMb(ctx: Context): Long {
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val mi = ActivityManager.MemoryInfo()
    am.getMemoryInfo(mi)
    return mi.availMem / (1024 * 1024)
  }

  fun isLowRamDevice(ctx: Context) = (ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager).isLowRamDevice

  fun powerSave(ctx: Context) = (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).isPowerSaveMode

  /** 0 = none … 6 = shutdown (PowerManager.THERMAL_STATUS_*), 0 before Android 10 */
  fun thermal(ctx: Context): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).currentThermalStatus else 0

  data class Battery(val level: Int, val charging: Boolean)

  fun battery(ctx: Context): Battery {
    val i = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    val level = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale = i?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
    val status = i?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
    val charging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
    return Battery(if (level >= 0 && scale > 0) level * 100 / scale else -1, charging)
  }

  /** low | mid | high, from the hardware alone (battery saver and heat are applied on top by the app) */
  fun tier(ctx: Context): String {
    val c = cpu()
    val ram = totalRamMb(ctx)
    return when {
      isLowRamDevice(ctx) || ram < 6600 || c.cores <= 4 || c.bigCores <= 2 -> "low"
      ram >= 7800 && c.bigCores >= 4 && c.cores >= 8 -> "high"
      else -> "mid"
    }
  }

  /**
   * Threads for on-device speech recognition: the performance cores plus some efficiency cores,
   * fewer on battery saver or when hot. 2 performance + 4 efficiency cores -> 4 threads.
   */
  fun recognizerThreads(ctx: Context): Int {
    val c = cpu()
    val pref = AdaptPrefs.power(ctx)
    val b = battery(ctx)
    val lowBattery = !b.charging && b.level in 0..AdaptPrefs.lowBatteryAt(ctx)
    if (pref == "saver" || thermal(ctx) >= 3 /* SEVERE */) return 2.coerceAtMost(c.cores)
    if (pref == "auto" && (powerSave(ctx) || lowBattery)) return 2.coerceAtMost(c.cores)
    // Balanced: performance cores only. Max / Automatic: performance cores plus half the efficiency cores
    val n = if (pref == "balanced") c.bigCores else c.bigCores + (c.littleCores + 1) / 2
    // Warm (MODERATE): one thread fewer so it doesn't tip over into throttling
    val warm = if (thermal(ctx) == 2 && pref != "max") 1 else 0
    return (n - warm).coerceIn(1, 8).coerceAtMost(c.cores)
  }

  // ---------------------------------------------------------------- screen & form factor

  private val einkMakers = listOf("onyx", "boox", "pocketbook", "kobo", "meebook", "bigme", "hisense a", "likebook", "boyue", "remarkable", "inkbook", "mobiscribe", "supernote")
  private val colorEinkHints = listOf("color", "colour", "c ", "c2", "c3", "kaleido", "gallery", "nova air c", "tab mini c", "tab ultra c", "note air3 c", "note air4 c", "go color", "go 7 color", "go 10.3 color", "palma c")

  /** E-ink readers by maker (same list as Grimmory, a few more) */
  fun isEink(): Boolean {
    val maker = "${Build.MANUFACTURER} ${Build.BRAND} ${Build.MODEL}".lowercase()
    return einkMakers.any { it in maker }
  }

  /** Colour e-ink (Kaleido / Gallery screens), best effort by model name */
  fun isColorEink(): Boolean = isEink() && colorEinkHints.any { it in "${Build.MODEL.lowercase()} " }

  @Suppress("DEPRECATION")
  fun display(ctx: Context): Display? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) ctx.display else (ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay

  /** Refresh rates this screen supports at its current resolution, e.g. [60, 90, 120] */
  fun refreshRates(ctx: Context): List<Float> {
    val d = runCatching { display(ctx) }.getOrNull() ?: return emptyList()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return listOf(d.refreshRate)
    val cur = d.mode
    return d.supportedModes.filter { it.physicalWidth == cur.physicalWidth && it.physicalHeight == cur.physicalHeight }.map { it.refreshRate }.distinct().sorted()
  }

  /**
   * OLED, best guess: Android doesn't say what the panel is. HDR-capable and wide-colour phone and
   * tablet screens are nearly all OLED; e-ink obviously isn't.
   */
  fun oledLikely(ctx: Context): Boolean {
    if (isEink()) return false
    val d = runCatching { display(ctx) }.getOrNull() ?: return false
    val hdr = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && (d.hdrCapabilities?.supportedHdrTypes?.isNotEmpty() == true)
    val wide = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && ctx.resources.configuration.isScreenWideColorGamut
    return hdr || (wide && refreshRates(ctx).any { it > 61f })
  }

  fun systemDark(ctx: Context) = (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

  fun isFoldable(ctx: Context): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_SENSOR_HINGE_ANGLE)

  fun isChromeOs(ctx: Context) = ctx.packageManager.hasSystemFeature("org.chromium.arc") || ctx.packageManager.hasSystemFeature("org.chromium.arc.device_management")

  /** Samsung DeX, ChromeOS, a desk dock, or Android's desktop windowing */
  fun isDesktop(ctx: Context): Boolean {
    val cfg = ctx.resources.configuration
    if ((cfg.uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_DESK) return true
    if (isChromeOs(ctx)) return true
    // Samsung DeX: Configuration.semDesktopModeEnabled == SEM_DESKTOP_MODE_ENABLED
    val dex = runCatching {
      val c = cfg.javaClass
      c.getField("semDesktopModeEnabled").getInt(cfg) == c.getField("SEM_DESKTOP_MODE_ENABLED").getInt(c)
    }.getOrDefault(false)
    if (dex) return true
    return ctx.packageManager.hasSystemFeature("android.software.freeform_window_management") && cfg.smallestScreenWidthDp >= 600 &&
      (cfg.keyboard == Configuration.KEYBOARD_QWERTY && cfg.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_NO)
  }
}

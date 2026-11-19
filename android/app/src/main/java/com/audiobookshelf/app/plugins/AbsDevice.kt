package com.audiobookshelf.app.plugins

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.ComponentCallbacks2
import android.content.SharedPreferences
import android.content.res.Configuration
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.PowerManager
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.audiobookshelf.app.device.AdaptPrefs
import com.audiobookshelf.app.device.DeviceProfile
import com.audiobookshelf.app.device.PowerPolicy
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.ActivityCallback
import androidx.activity.result.ActivityResult
import java.util.concurrent.Executor

/**
 * Tells the app what device it's on and keeps it posted, so screens, readers and transcription adapt:
 *   getProfile()                -> cores, performance cores, RAM, tier, battery saver, thermal, battery,
 *                                  refresh rates, OLED guess, e-ink, foldable, desktop, system dark mode
 *   setRefreshRate({ mode, hz }) max (e.g. 120 Hz) | default (let Android decide) | hz: the closest rate at or below hz (60 in low power)
 *   getPrefs() / setPrefs({...}) the Device & performance choices (AdaptPrefs), shared with the service and automation apps
 *   events: onPrefsChange { prefs }   (also when Tasker / adb changed them)
 *           onMemoryPressure { level } (Android asked the app to free memory: the app steps down a level)
 *   events: onPowerChange { powerSave, thermal, battery, charging }
 *           onFoldChange  { posture: none | flat | book | tabletop, hinge: { left, top, width, height } (CSS px), separating }
 */
@CapacitorPlugin(name = "AbsDevice")
class AbsDevice : Plugin() {
  private var powerReceiver: BroadcastReceiver? = null
  private var foldAdapter: WindowInfoTrackerCallbackAdapter? = null
  private var foldListener: Consumer<WindowLayoutInfo>? = null
  private var lastFold: JSObject = JSObject().put("posture", "none")
  private var prefsListener: SharedPreferences.OnSharedPreferenceChangeListener? = null
  private var memoryCallbacks: ComponentCallbacks2? = null
  private var lastSystemDark: Boolean? = null

  override fun load() {
    super.load()
    val ctx = context
    // headphones connected or disconnected: the delay changes
    if (Build.VERSION.SDK_INT >= 23) {
      runCatching {
        val am = ctx.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
        am.registerAudioDeviceCallback(object : android.media.AudioDeviceCallback() {
          override fun onAudioDevicesAdded(added: Array<out android.media.AudioDeviceInfo>?) = notifyListeners("onAudioOutput", audioOutputJson())
          override fun onAudioDevicesRemoved(removed: Array<out android.media.AudioDeviceInfo>?) = notifyListeners("onAudioOutput", audioOutputJson())
        }, android.os.Handler(android.os.Looper.getMainLooper()))
      }
    }
    powerReceiver = object : BroadcastReceiver() {
      override fun onReceive(c: Context, i: Intent) {
        notifyListeners("onPowerChange", powerJson())
        PowerPolicy.onConditionsChanged(c)
      }
    }
    val filter = IntentFilter().apply {
      addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
      addAction(Intent.ACTION_POWER_CONNECTED)
      addAction(Intent.ACTION_POWER_DISCONNECTED)
      addAction(Intent.ACTION_BATTERY_LOW)
      addAction(Intent.ACTION_BATTERY_OKAY)
    }
    if (Build.VERSION.SDK_INT >= 33) ctx.registerReceiver(powerReceiver, filter, Context.RECEIVER_NOT_EXPORTED) else ctx.registerReceiver(powerReceiver, filter)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      (ctx.getSystemService(Context.POWER_SERVICE) as PowerManager).addThermalStatusListener {
        notifyListeners("onPowerChange", powerJson())
        PowerPolicy.onConditionsChanged(ctx)
      }
    }
    // Choices changed (here, or by Tasker / adb through AutomationReceiver)
    prefsListener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
      if (key == null || key in AdaptPrefs.KEYS) notifyListeners("onPrefsChange", JSObject().put("prefs", JSObject.fromJSONObject(AdaptPrefs.toJson(ctx))))
    }
    AdaptPrefs.sp(ctx).registerOnSharedPreferenceChangeListener(prefsListener)
    // Android says memory is getting tight: tell the app so it steps down (smaller caches, fewer pages ahead)
    memoryCallbacks = object : ComponentCallbacks2 {
      override fun onTrimMemory(level: Int) {
        if (level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW || level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL || level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE) {
          notifyListeners("onMemoryPressure", JSObject().put("level", level).put("availRamMb", DeviceProfile.availRamMb(ctx)))
        }
      }
      // The phone switched light / dark mode (the activity handles uiMode itself, so nothing reloads):
      // tell the app so the System theme follows at once
      override fun onConfigurationChanged(newConfig: Configuration) {
        val dark = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        if (dark != lastSystemDark) {
          lastSystemDark = dark
          notifyListeners("onSystemTheme", JSObject().put("dark", dark))
        }
      }
      @Deprecated("Deprecated in Java")
      override fun onLowMemory() {
        notifyListeners("onMemoryPressure", JSObject().put("level", 80))
      }
    }
    ctx.registerComponentCallbacks(memoryCallbacks)
    // Something paused for power while the app was closed? Pick it up if conditions allow now
    runCatching { PowerPolicy.onConditionsChanged(ctx) }
    // Background check for transcript changes every few hours, even with the app closed
    runCatching { com.audiobookshelf.app.transcription.TranscriptSyncWorker.schedule(ctx) }
    activity?.let { startFoldTracking(it) }
  }

  private fun powerJson(): JSObject {
    val b = DeviceProfile.battery(context)
    return JSObject().put("powerSave", DeviceProfile.powerSave(context)).put("thermal", DeviceProfile.thermal(context))
      .put("battery", b.level).put("charging", b.charging)
  }

  // ---------------------------------------------------------------- foldables (androidx.window)

  private fun startFoldTracking(activity: Activity) {
    runCatching {
      val adapter = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
      val density = activity.resources.displayMetrics.density
      val listener = Consumer<WindowLayoutInfo> { info ->
        val fold = info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
        val o = JSObject()
        if (fold == null) o.put("posture", "none")
        else {
          // Window-relative hinge position, in CSS pixels for the WebView
          val loc = IntArray(2)
          activity.window.decorView.getLocationOnScreen(loc)
          val b = fold.bounds
          val posture = when {
            fold.state == FoldingFeature.State.FLAT -> "flat"
            fold.orientation == FoldingFeature.Orientation.VERTICAL -> "book"
            else -> "tabletop"
          }
          o.put("posture", posture)
            .put("separating", fold.isSeparating)
            .put("vertical", fold.orientation == FoldingFeature.Orientation.VERTICAL)
            .put("hinge", JSObject().put("left", (b.left - loc[0]) / density).put("top", (b.top - loc[1]) / density).put("width", b.width() / density).put("height", b.height() / density))
        }
        lastFold = o
        notifyListeners("onFoldChange", o)
      }
      adapter.addWindowLayoutInfoListener(activity, Executor { it.run() }, listener)
      foldAdapter = adapter
      foldListener = listener
    }
  }

  // ---------------------------------------------------------------- methods

  /** What the sound comes out of and how far behind the player's position it is heard: { latencyMs, bluetooth, device } */
  @PluginMethod
  fun getAudioOutput(call: PluginCall) {
    call.resolve(audioOutputJson())
  }

  private fun audioOutputJson(): JSObject {
    val o = JSObject()
    runCatching {
      val am = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
      val bt = Build.VERSION.SDK_INT >= 23 && am.getDevices(android.media.AudioManager.GET_DEVICES_OUTPUTS).any {
        it.type == android.media.AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || (Build.VERSION.SDK_INT >= 31 && (it.type == android.media.AudioDeviceInfo.TYPE_BLE_HEADSET || it.type == android.media.AudioDeviceInfo.TYPE_BLE_SPEAKER))
      } && (am.isBluetoothA2dpOn || Build.VERSION.SDK_INT >= 31)
      // AudioManager.getOutputLatency(stream) (hidden, but on every phone): the mixer + device delay in ms,
      // Bluetooth's included
      val ms = runCatching { (android.media.AudioManager::class.java.getMethod("getOutputLatency", Int::class.javaPrimitiveType).invoke(am, android.media.AudioManager.STREAM_MUSIC) as Int) }.getOrNull()
      o.put("bluetooth", bt)
      o.put("latencyMs", ms ?: if (bt) 250 else 40)
      o.put("measured", ms != null)
    }
    return o
  }

  /** Lock-screen transcription: { mode: auto | on | off, enabled, allowed, oled } */
  // ---- ABS+ screen lock (the lock button in the player and the transcription views) ----
  private var lockKeptOnBefore: Boolean? = null

  /** Locked: the screen dims and stays on (no sleep). Unlocked: brightness and the screen timeout as before. */
  @PluginMethod
  fun setScreenDim(call: PluginCall) {
    val dim = call.getBoolean("dim", false) == true
    val keepOn = call.getBoolean("keepOn", dim) == true
    val act = activity ?: return call.reject("no activity")
    act.runOnUiThread {
      val w = act.window
      if (keepOn && lockKeptOnBefore == null) {
        lockKeptOnBefore = (w.attributes.flags and android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) != 0
        w.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      } else if (!keepOn && lockKeptOnBefore != null) {
        if (lockKeptOnBefore == false) w.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        lockKeptOnBefore = null
      }
      w.attributes = w.attributes.apply {
        screenBrightness = if (dim) (call.getFloat("level") ?: 0.3f) else android.view.WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
      }
      call.resolve()
    }
  }

  @Volatile private var lockModeOn = false

  /** Screen lock on: the app is pinned (Android's App pinning) and the system bars are hidden. Off: back to normal. */
  @PluginMethod
  fun setLockMode(call: PluginCall) {
    val on = call.getBoolean("on", false) == true
    val act = activity ?: return call.reject("no activity")
    act.runOnUiThread {
      val ctl = androidx.core.view.WindowInsetsControllerCompat(act.window, act.window.decorView)
      var pinned = false
      // the status bar's height (dp) while it still shows, so the page can keep its place once the bars hide
      val density = act.resources.displayMetrics.density
      val statusTopDp = runCatching {
        val ins = androidx.core.view.ViewCompat.getRootWindowInsets(act.window.decorView)
        val top = ins?.getInsets(androidx.core.view.WindowInsetsCompat.Type.statusBars() or androidx.core.view.WindowInsetsCompat.Type.displayCutout())?.top ?: 0
        top / density
      }.getOrDefault(0f)
      if (on) {
        pinned = runCatching { act.startLockTask(); true }.getOrDefault(false)
        // the bars are hidden only once the pin is in place: Android's "App is pinned" message needs the
        // whole screen (it was cut off at the bottom when they were hidden straight away)
        val am = act.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val main = android.os.Handler(android.os.Looper.getMainLooper())
        lockModeOn = true
        var tries = 0
        val check = object : Runnable {
          override fun run() {
            if (!lockModeOn) return
            if (am.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE && act.hasWindowFocus()) {
              ctl.systemBarsBehavior = androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
              ctl.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
            } else if (++tries < 120) main.postDelayed(this, 500)
          }
        }
        main.postDelayed(check, 400)
      } else {
        lockModeOn = false
        runCatching {
          val am = act.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
          if (am.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE) act.stopLockTask()
        }
        ctl.show(androidx.core.view.WindowInsetsCompat.Type.systemBars())
      }
      call.resolve(JSObject().put("pinned", pinned).put("statusBarTop", statusTopDp.toDouble()))
    }
  }

  /** Whether a face or fingerprint is set up (not just a PIN / pattern) */
  @PluginMethod
  fun biometricAvailable(call: PluginCall) {
    // available: face or fingerprint set up and ready · hardware: the device has a face or fingerprint sensor at all
    val res = runCatching {
      androidx.biometric.BiometricManager.from(context).canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK)
    }.getOrDefault(androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE)
    val ok = res == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS
    val hardware = res != androidx.biometric.BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE && res != androidx.biometric.BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE
    call.resolve(JSObject().put("available", ok).put("hardware", hardware))
  }

  /** Whether the phone has a screen lock (face, fingerprint, PIN, pattern or password) to unlock with */
  @PluginMethod
  fun deviceUnlockAvailable(call: PluginCall) {
    val km = context.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
    call.resolve(JSObject().put("available", km.isDeviceSecure))
  }

  /** The phone's own unlock (face, fingerprint or its PIN, whatever the phone uses) */
  @PluginMethod
  fun confirmDeviceUnlock(call: PluginCall) {
    val km = context.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
    if (!km.isDeviceSecure) return call.resolve(JSObject().put("ok", false).put("reason", "no-lock"))
    val fa = activity as? androidx.fragment.app.FragmentActivity
    val auth = androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK or androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
    if (fa != null && androidx.biometric.BiometricManager.from(context).canAuthenticate(auth) == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS) {
      fa.runOnUiThread {
        try {
          val prompt = androidx.biometric.BiometricPrompt(fa, androidx.core.content.ContextCompat.getMainExecutor(context), object : androidx.biometric.BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: androidx.biometric.BiometricPrompt.AuthenticationResult) {
              call.resolve(JSObject().put("ok", true))
            }
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
              call.resolve(JSObject().put("ok", false).put("reason", errString.toString()))
            }
          })
          val info = androidx.biometric.BiometricPrompt.PromptInfo.Builder()
            .setTitle(call.getString("title") ?: "Unlock ABS+")
            .setSubtitle(call.getString("subtitle") ?: "")
            .setAllowedAuthenticators(auth)
            .build()
          prompt.authenticate(info)
        } catch (e: Exception) {
          call.resolve(JSObject().put("ok", false).put("reason", e.message ?: "error"))
        }
      }
      return
    }
    @Suppress("DEPRECATION")
    val intent = km.createConfirmDeviceCredentialIntent(call.getString("title") ?: "Unlock ABS+", call.getString("subtitle") ?: "")
      ?: return call.resolve(JSObject().put("ok", false).put("reason", "no-lock"))
    startActivityForResult(call, intent, "confirmDeviceUnlockResult")
  }

  @ActivityCallback
  private fun confirmDeviceUnlockResult(call: PluginCall?, result: ActivityResult) {
    call?.resolve(JSObject().put("ok", result.resultCode == Activity.RESULT_OK))
  }

  @PluginMethod
  fun getLockscreen(call: PluginCall) {
    val ctx = context
    call.resolve(JSObject().put("mode", com.audiobookshelf.app.player.LockscreenPlayer.mode(ctx)).put("enabled", com.audiobookshelf.app.player.LockscreenPlayer.enabled(ctx)).put("allowed", com.audiobookshelf.app.player.LockscreenPlayer.allowed(ctx)).put("oled", DeviceProfile.oledLikely(ctx)).put("overlay", com.audiobookshelf.app.player.LockscreenPlayer.canOverlay(ctx)))
  }

  /** "Display over other apps" for ABS+: the lock-screen card then opens by itself on every phone */
  @PluginMethod
  fun openOverlayPermission(call: PluginCall) {
    try {
      context.startActivity(Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      call.resolve()
    } catch (e: Exception) {
      call.reject(e.message ?: "Couldn't open settings")
    }
  }

  @PluginMethod
  fun setLockscreen(call: PluginCall) {
    call.getString("mode")?.let { if (it in listOf("auto", "on", "off")) com.audiobookshelf.app.player.LockscreenPlayer.prefs(context).edit().putString("mode", it).apply() }
    getLockscreen(call)
  }

  /** The narrated lines for what's playing, for the lock-screen card (books transcribed on the server) */
  @PluginMethod
  fun setLockscreenTranscript(call: PluginCall) {
    val key = call.getString("key") ?: return call.reject("key required")
    val arr = call.getArray("lines") ?: JSArray()
    val out = ArrayList<Triple<Double, Double, String>>(arr.length())
    for (i in 0 until arr.length()) {
      val o = arr.optJSONObject(i) ?: continue
      val s = o.optDouble("s", Double.NaN)
      if (s.isNaN()) continue
      out.add(Triple(s, o.optDouble("e", s), o.optString("t")))
    }
    com.audiobookshelf.app.player.LockscreenPlayer.setLines(key, out)
    call.resolve(JSObject().put("lines", out.size))
  }

  /** Android 14+: the switch that lets ABS+ show over the lock screen */
  @PluginMethod
  fun openLockscreenPermission(call: PluginCall) {
    try {
      val i = if (Build.VERSION.SDK_INT >= 34) Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, android.net.Uri.parse("package:${context.packageName}")) else Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:${context.packageName}"))
      context.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      call.resolve()
    } catch (e: Exception) {
      call.reject(e.message ?: "Couldn't open settings")
    }
  }

  @PluginMethod
  fun getProfile(call: PluginCall) {
    val ctx = context
    val cpu = DeviceProfile.cpu()
    val b = DeviceProfile.battery(ctx)
    val rates = JSArray()
    DeviceProfile.refreshRates(ctx).forEach { rates.put(it.toDouble()) }
    val cfg = ctx.resources.configuration
    call.resolve(
      JSObject()
        .put("cores", cpu.cores).put("bigCores", cpu.bigCores).put("littleCores", cpu.littleCores).put("maxMhz", cpu.maxMhz)
        .put("ramMb", DeviceProfile.totalRamMb(ctx)).put("availRamMb", DeviceProfile.availRamMb(ctx)).put("lowRam", DeviceProfile.isLowRamDevice(ctx))
        .put("tier", DeviceProfile.tier(ctx))
        .put("powerSave", DeviceProfile.powerSave(ctx)).put("thermal", DeviceProfile.thermal(ctx)).put("battery", b.level).put("charging", b.charging)
        .put("refreshRates", rates)
        .put("oledLikely", DeviceProfile.oledLikely(ctx))
        .put("eink", DeviceProfile.isEink()).put("einkColor", DeviceProfile.isColorEink())
        .put("foldable", DeviceProfile.isFoldable(ctx))
        .put("desktop", DeviceProfile.isDesktop(ctx)).put("chromeOs", DeviceProfile.isChromeOs(ctx))
        .put("systemDark", DeviceProfile.systemDark(ctx))
        .put("smallestWidthDp", cfg.smallestScreenWidthDp)
        .put("manufacturer", Build.MANUFACTURER).put("model", Build.MODEL).put("sdk", Build.VERSION.SDK_INT)
        .put("fold", lastFold)
        .put("colorCorrection", colorCorrection())
        .put("highContrastText", secureInt("high_text_contrast_enabled") == 1)
        .put("fontScale", cfg.fontScale.toDouble())
    )
  }

  private fun secureInt(name: String): Int = runCatching { android.provider.Settings.Secure.getInt(context.contentResolver, name) }.getOrDefault(-1)

  /**
   * Android's own colour correction (Accessibility → Colour correction), so first-time setup can
   * suggest the matching colour vision mode: none | protan | deutan | tritan | mono
   */
  private fun colorCorrection(): String {
    if (secureInt("accessibility_display_daltonizer_enabled") != 1) return "none"
    return when (secureInt("accessibility_display_daltonizer")) {
      11 -> "deutan"
      12 -> "protan"
      13 -> "tritan"
      0 -> "mono"
      else -> "none"
    }
  }

  @PluginMethod
  fun getPrefs(call: PluginCall) {
    call.resolve(JSObject.fromJSONObject(AdaptPrefs.toJson(context)))
  }

  @PluginMethod
  fun setPrefs(call: PluginCall) {
    val data = call.data
    if (data.optBoolean("reset", false)) AdaptPrefs.reset(context)
    val values = AdaptPrefs.KEYS.filter { data.has(it) }.associateWith { data.get(it).toString() }
    val changed = AdaptPrefs.set(context, values)
    if ("background" in changed || "lowBatteryAt" in changed) PowerPolicy.onConditionsChanged(context)
    call.resolve(JSObject.fromJSONObject(AdaptPrefs.toJson(context)))
  }

  /**
   * max: the highest refresh rate at the current resolution (120 Hz…); default: let Android choose;
   * with hz (e.g. 60 or 90): the fastest supported rate at or below it.
   */
  @PluginMethod
  fun setRefreshRate(call: PluginCall) {
    val mode = call.getString("mode") ?: "max"
    val hz = call.getDouble("hz")
    val act = activity ?: return call.reject("No activity")
    act.runOnUiThread {
      try {
        val attrs = act.window.attributes
        if ((mode == "max" || hz != null) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          val d = DeviceProfile.display(act)
          val cur = d?.mode
          val same = d?.supportedModes?.filter { cur != null && it.physicalWidth == cur.physicalWidth && it.physicalHeight == cur.physicalHeight } ?: emptyList()
          val best = if (hz != null) (same.filter { it.refreshRate <= hz + 1.0 }.maxByOrNull { it.refreshRate } ?: same.minByOrNull { it.refreshRate }) else same.maxByOrNull { it.refreshRate }
          attrs.preferredDisplayModeId = best?.modeId ?: 0
          attrs.preferredRefreshRate = best?.refreshRate ?: 0f
        } else {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) attrs.preferredDisplayModeId = 0
          attrs.preferredRefreshRate = 0f
        }
        act.window.attributes = attrs
        call.resolve(JSObject().put("refreshRate", (DeviceProfile.display(act)?.refreshRate ?: 60f).toDouble()))
      } catch (e: Exception) {
        call.reject(e.message ?: "Couldn't change the refresh rate")
      }
    }
  }

  override fun handleOnDestroy() {
    runCatching { powerReceiver?.let { context.unregisterReceiver(it) } }
    runCatching { prefsListener?.let { AdaptPrefs.sp(context).unregisterOnSharedPreferenceChangeListener(it) } }
    runCatching { memoryCallbacks?.let { context.unregisterComponentCallbacks(it) } }
    runCatching { foldListener?.let { foldAdapter?.removeWindowLayoutInfoListener(it) } }
    super.handleOnDestroy()
  }
}

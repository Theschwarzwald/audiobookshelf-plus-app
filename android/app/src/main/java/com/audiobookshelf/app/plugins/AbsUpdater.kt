package com.audiobookshelf.app.plugins

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.media.AudioManager
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.audiobookshelf.app.BuildConfig
import com.audiobookshelf.app.MainActivity
import com.audiobookshelf.app.R
import com.audiobookshelf.app.device.DeviceManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

/**
 * ABS+ updates itself the way an app store does.
 *
 *   Settings → App updates:  auto (download and install in the background) · ask (download, then ask)
 *                            · off (only the "Update available" banner when the app opens); Wi-Fi only
 *   Background:  a WorkManager job every few hours asks the server (/abs-plus/app/latest.json), downloads
 *                a newer build (resuming), checks its SHA-256 and installs it with Android's PackageInstaller.
 *                Android 12+ installs without a dialog once ABS+ installed itself (it is then its own
 *                installer, like Play for Play apps); otherwise a notification asks. Never while audio is
 *                playing or a transcription runs on the phone (installing restarts the app): next check.
 *   In the app:  the banner shows progress, "Install", and Android's one-time "Allow from this source".
 */
object SelfUpdate {
  private const val TAG = "SelfUpdate"
  private const val PREFS = "absplus_updates"
  const val CHANNEL = "absplus_updates"
  /** this app's ABS+ build (versionCode is 1000 + build) */
  val currentBuild: Int get() = (BuildConfig.VERSION_CODE - 1000).coerceAtLeast(0)

  @Volatile var downloading: Int? = null

  fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  fun mode(ctx: Context): String = prefs(ctx).getString("mode", "auto") ?: "auto"
  fun wifiOnly(ctx: Context): Boolean = prefs(ctx).getBoolean("wifiOnly", true)

  fun dir(ctx: Context) = File(ctx.cacheDir, "updates").apply { mkdirs() }
  fun apkFor(ctx: Context, build: Int) = File(dir(ctx), "ABS+-$build.apk")

  fun serverAddress(): String? {
    val d = DeviceManager.deviceData
    val cfg = DeviceManager.serverConnectionConfig ?: d.getLastServerConnectionConfig() ?: d.serverConnectionConfigs.firstOrNull()
    return cfg?.address?.trimEnd('/')
  }

  fun unmetered(ctx: Context): Boolean {
    val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    return cm.activeNetwork != null && !cm.isActiveNetworkMetered
  }

  /** GitHub repository whose releases carry new builds (same as ABS_PLUS_RELEASES_REPO in plugins/absPlusBuild.js) */
  private const val RELEASES_REPO = "Theschwarzwald/audiobookshelf-plus-server"

  /**
   * The newest build: { build, sha256, notes, url } or null. Asks the ABS+ server (fast, on your own network) and
   * GitHub (so phones on a plain Audiobookshelf server, or a server that hasn't fetched the newest build yet, still
   * get updates); the newer one wins, the server on a tie.
   */
  fun latest(): JSONObject? {
    val fromServer = try { latestFromServer() } catch (e: Exception) { null }
    val fromGitHub = try { latestFromGitHub() } catch (e: Exception) { null }
    if (fromGitHub != null && (fromServer == null || fromGitHub.optInt("build") > fromServer.optInt("build"))) return fromGitHub
    return fromServer
  }

  private fun latestFromServer(): JSONObject? {
    val base = serverAddress() ?: return null
    val conn = URL("$base/abs-plus/app/latest.json").openConnection() as HttpURLConnection
    conn.connectTimeout = 10000
    conn.readTimeout = 15000
    return try {
      if (conn.responseCode != 200) null
      else JSONObject(conn.inputStream.bufferedReader().readText()).also { it.put("url", "$base/abs-plus/app/ABS+.apk") }
    } finally {
      conn.disconnect()
    }
  }

  /** The latest GitHub release: its tag is v<build>; the APK is the asset named ABS-Plus.apk (or any .apk) */
  private fun latestFromGitHub(): JSONObject? {
    val conn = URL("https://api.github.com/repos/$RELEASES_REPO/releases/latest").openConnection() as HttpURLConnection
    conn.connectTimeout = 10000
    conn.readTimeout = 15000
    conn.setRequestProperty("Accept", "application/vnd.github+json")
    conn.setRequestProperty("User-Agent", "ABS+ (Android app)")
    try {
      if (conn.responseCode != 200) return null
      val rel = JSONObject(conn.inputStream.bufferedReader().readText())
      val build = rel.optString("tag_name").removePrefix("v").removePrefix("V").toIntOrNull() ?: return null
      val assets = rel.optJSONArray("assets") ?: return null
      var asset: JSONObject? = null
      for (i in 0 until assets.length()) {
        val a = assets.getJSONObject(i)
        if (!a.optString("name").endsWith(".apk", ignoreCase = true)) continue
        if (asset == null || a.optString("name") == "ABS-Plus.apk") asset = a
      }
      if (asset == null) return null
      val digest = asset.optString("digest")
      return JSONObject()
        .put("build", build)
        .put("versionName", "ABS+ $build")
        .put("versionCode", 1000 + build)
        .put("sha256", if (digest.startsWith("sha256:")) digest.removePrefix("sha256:") else "")
        .put("notes", rel.optString("name"))
        .put("url", asset.optString("browser_download_url"))
        .put("source", "github")
    } finally {
      conn.disconnect()
    }
  }

  fun isReady(ctx: Context, build: Int, sha: String): Boolean {
    val f = apkFor(ctx, build)
    return f.exists() && (sha.isEmpty() || sha256(f) == sha)
  }

  /** Downloads (resuming a cut-off download) and checks the file; returns it ready to install */
  fun download(ctx: Context, url: String, build: Int, sha: String, progress: (Long, Long) -> Unit): File {
    if (downloading == build) throw IllegalStateException("Already downloading")
    downloading = build
    try {
      val dir = dir(ctx)
      dir.listFiles()?.forEach { if (!it.name.startsWith("ABS+-$build.")) it.delete() } // older builds
      val done = apkFor(ctx, build)
      if (done.exists() && (sha.isEmpty() || sha256(done) == sha)) return done
      val part = File(dir, "ABS+-$build.apk.part")
      var have = if (part.exists()) part.length() else 0L
      val conn = URL(url).openConnection() as HttpURLConnection
      conn.connectTimeout = 15000
      conn.readTimeout = 30000
      if (have > 0) conn.setRequestProperty("Range", "bytes=$have-")
      val code = conn.responseCode
      if (code != 200 && code != 206) throw Exception("The server answered $code")
      if (code == 200) have = 0
      val total = have + conn.contentLengthLong.coerceAtLeast(0)
      conn.inputStream.use { input ->
        java.io.FileOutputStream(part, have > 0).use { out ->
          val buf = ByteArray(64 * 1024)
          var last = 0L
          while (true) {
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
            have += n
            val now = System.currentTimeMillis()
            if (now - last > 300) {
              last = now
              progress(have, total)
            }
          }
        }
      }
      if (sha.isNotEmpty() && sha256(part) != sha) {
        part.delete()
        throw Exception("The download was damaged; it starts again next time")
      }
      part.renameTo(done)
      progress(total, total)
      return done
    } finally {
      downloading = null
    }
  }

  /** Hands the downloaded build to Android's PackageInstaller; background = from the background job */
  fun install(ctx: Context, build: Int, background: Boolean) {
    val f = apkFor(ctx, build)
    if (!f.exists()) throw IllegalStateException("The update isn't downloaded yet")
    val installer = ctx.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
    params.setAppPackageName(ctx.packageName)
    params.setSize(f.length())
    // Android 12+: no dialog once ABS+ is its own installer (like Play for Play apps)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
    val id = installer.createSession(params)
    installer.openSession(id).use { session ->
      session.openWrite("base.apk", 0, f.length()).use { out ->
        FileInputStream(f).use { it.copyTo(out, 256 * 1024) }
        session.fsync(out)
      }
      val intent = Intent(ctx, UpdateInstallReceiver::class.java).putExtra("build", build).putExtra("background", background)
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
      session.commit(PendingIntent.getBroadcast(ctx, id, intent, flags).intentSender)
    }
  }

  /** Installing restarts the app: not while something is playing or the phone is transcribing */
  fun busy(ctx: Context): Boolean {
    val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (am.isMusicActive) return true
    return runCatching { com.audiobookshelf.app.transcription.TranscriptionHub.currentJob != null }.getOrDefault(false)
  }

  fun canInstall(ctx: Context): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.O || ctx.packageManager.canRequestPackageInstalls()

  fun notify(ctx: Context, id: Int, title: String, text: String, intent: PendingIntent) {
    try {
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) nm.createNotificationChannel(NotificationChannel(CHANNEL, "App updates", NotificationManager.IMPORTANCE_DEFAULT))
      nm.notify(id, NotificationCompat.Builder(ctx, CHANNEL).setSmallIcon(R.drawable.icon_monochrome).setContentTitle(title).setContentText(text).setContentIntent(intent).setAutoCancel(true).build())
    } catch (e: Exception) {
      Log.w(TAG, "Notification: ${e.message}")
    }
  }

  fun openAppIntent(ctx: Context): PendingIntent =
    PendingIntent.getActivity(ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

  fun sha256(f: File): String {
    val md = MessageDigest.getInstance("SHA-256")
    FileInputStream(f).use { input ->
      val buf = ByteArray(256 * 1024)
      while (true) {
        val n = input.read(buf)
        if (n < 0) break
        md.update(buf, 0, n)
      }
    }
    return md.digest().joinToString("") { "%02x".format(it) }
  }
}

/** Every few hours, with the app closed too: the background part of Settings → App updates */
class AppUpdateWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
  override fun doWork(): Result {
    val ctx = applicationContext
    val mode = SelfUpdate.mode(ctx)
    if (mode == "off") return Result.success()
    return try {
      val latest = SelfUpdate.latest() ?: return Result.success()
      val build = latest.optInt("build")
      if (build <= SelfUpdate.currentBuild) return Result.success()
      if (SelfUpdate.wifiOnly(ctx) && !SelfUpdate.unmetered(ctx)) return Result.success()
      val sha = latest.optString("sha256")
      SelfUpdate.download(ctx, latest.getString("url"), build, sha) { _, _ -> }
      if (mode == "auto" && SelfUpdate.canInstall(ctx) && !SelfUpdate.busy(ctx)) {
        SelfUpdate.install(ctx, build, background = true)
      } else {
        SelfUpdate.notify(ctx, 4712, "An ABS+ update is ready", if (mode == "auto" && SelfUpdate.busy(ctx)) "It installs when nothing is playing, or tap to update now" else "Tap to update", SelfUpdate.openAppIntent(ctx))
      }
      Result.success()
    } catch (e: Exception) {
      Log.w(TAG, "Background update failed: ${e.message}")
      Result.retry()
    }
  }

  companion object {
    private const val TAG = "AppUpdateWorker"
    private const val NAME = "abs-plus-app-update"

    fun schedule(ctx: Context) {
      if (SelfUpdate.mode(ctx) == "off") {
        WorkManager.getInstance(ctx).cancelUniqueWork(NAME)
        return
      }
      val constraints = Constraints.Builder()
        .setRequiredNetworkType(if (SelfUpdate.wifiOnly(ctx)) NetworkType.UNMETERED else NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build()
      val req = PeriodicWorkRequestBuilder<AppUpdateWorker>(4, TimeUnit.HOURS, 1, TimeUnit.HOURS).setConstraints(constraints).build()
      WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, req)
    }
  }
}

@CapacitorPlugin(name = "AbsUpdater")
class AbsUpdater : Plugin() {
  companion object {
    var instance: AbsUpdater? = null
  }

  override fun load() {
    instance = this
    runCatching { AppUpdateWorker.schedule(context) }
  }

  /** { build, mode, wifiOnly } */
  @PluginMethod
  fun getPrefs(call: PluginCall) {
    call.resolve(JSObject().put("build", SelfUpdate.currentBuild).put("mode", SelfUpdate.mode(context)).put("wifiOnly", SelfUpdate.wifiOnly(context)))
  }

  /** { mode?: auto | ask | off, wifiOnly?: boolean } */
  @PluginMethod
  fun setPrefs(call: PluginCall) {
    val e = SelfUpdate.prefs(context).edit()
    call.getString("mode")?.let { if (it in listOf("auto", "ask", "off")) e.putString("mode", it) }
    call.getBoolean("wifiOnly")?.let { e.putBoolean("wifiOnly", it) }
    e.apply()
    runCatching { AppUpdateWorker.schedule(context) }
    getPrefs(call)
  }

  /** { online, unmetered } */
  @PluginMethod
  fun network(call: PluginCall) {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    call.resolve(JSObject().put("online", cm.activeNetwork != null).put("unmetered", SelfUpdate.unmetered(context)))
  }

  /** { build, sha256 } -> { ready, downloading } */
  @PluginMethod
  fun status(call: PluginCall) {
    val build = call.getInt("build") ?: 0
    Thread {
      call.resolve(JSObject().put("ready", SelfUpdate.isReady(context, build, call.getString("sha256") ?: "")).put("downloading", SelfUpdate.downloading == build))
    }.start()
  }

  /** { url, build, sha256 }: progress as onUpdateProgress { build, done, total }; resolves { ready } */
  @PluginMethod
  fun download(call: PluginCall) {
    val url = call.getString("url") ?: return call.reject("url required")
    val build = call.getInt("build") ?: return call.reject("build required")
    val sha = call.getString("sha256") ?: ""
    Thread {
      try {
        SelfUpdate.download(context, url, build, sha) { done, total -> notifyListeners("onUpdateProgress", JSObject().put("build", build).put("done", done).put("total", total)) }
        call.resolve(JSObject().put("ready", true))
      } catch (e: Exception) {
        call.reject(e.message ?: "Download failed")
      }
    }.start()
  }

  @PluginMethod
  fun canInstall(call: PluginCall) {
    call.resolve(JSObject().put("allowed", SelfUpdate.canInstall(context)))
  }

  /** Android's "Install unknown apps" switch for ABS+ */
  @PluginMethod
  fun openInstallSettings(call: PluginCall) {
    try {
      context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      call.resolve()
    } catch (e: Exception) {
      call.reject(e.message ?: "Couldn't open settings")
    }
  }

  /** { build } */
  @PluginMethod
  fun install(call: PluginCall) {
    val build = call.getInt("build") ?: return call.reject("build required")
    Thread {
      try {
        SelfUpdate.install(context, build, background = false)
        call.resolve(JSObject().put("started", true))
      } catch (e: Exception) {
        call.reject(e.message ?: "Couldn't start the installer")
      }
    }.start()
  }

  fun emitResult(ok: Boolean, message: String?) {
    notifyListeners("onUpdateResult", JSObject().put("ok", ok).put("message", message ?: ""))
  }
}

/** Android's answer to an install: its confirmation dialog (or a notification from the background), or how it went */
class UpdateInstallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val build = intent.getIntExtra("build", 0)
    val background = intent.getBooleanExtra("background", false)
    when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
      PackageInstaller.STATUS_PENDING_USER_ACTION -> {
        @Suppress("DEPRECATION")
        val confirm = (if (Build.VERSION.SDK_INT >= 33) intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java) else intent.getParcelableExtra(Intent.EXTRA_INTENT)) ?: return
        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (background) {
          // Android doesn't allow opening screens from the background: ask with a notification
          val pi = PendingIntent.getActivity(context, 1, confirm, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
          SelfUpdate.notify(context, 4712, "An ABS+ update is ready", "Tap to update", pi)
        } else {
          try {
            context.startActivity(confirm)
          } catch (e: Exception) {
            AbsUpdater.instance?.emitResult(false, "Android didn't show the install screen: ${e.message}")
          }
        }
      }
      PackageInstaller.STATUS_SUCCESS -> AbsUpdater.instance?.emitResult(true, null)
      else -> {
        val text = when (status) {
          PackageInstaller.STATUS_FAILURE_ABORTED -> "Update cancelled"
          PackageInstaller.STATUS_FAILURE_CONFLICT -> "This update is signed differently from the installed app"
          PackageInstaller.STATUS_FAILURE_STORAGE -> "Not enough storage for the update"
          PackageInstaller.STATUS_FAILURE_INCOMPATIBLE -> "This update doesn't fit this phone"
          else -> intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "The update didn't install"
        }
        Log.w("UpdateInstallReceiver", "Install of $build: $text")
        AbsUpdater.instance?.emitResult(false, text)
      }
    }
  }
}

/** After an update: tidy up, and (if it happened in the background) a notification to open the new version */
class UpdatedReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    SelfUpdate.dir(context).listFiles()?.forEach { it.delete() }
    runCatching { AppUpdateWorker.schedule(context) }
    SelfUpdate.notify(context, 4711, "ABS+ was updated", "Tap to open the new version", SelfUpdate.openAppIntent(context))
  }
}

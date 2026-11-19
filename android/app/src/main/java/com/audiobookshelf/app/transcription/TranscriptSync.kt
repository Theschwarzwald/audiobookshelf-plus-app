package com.audiobookshelf.app.transcription

import android.content.Context
import android.os.Build
import android.util.Log
import com.audiobookshelf.app.device.DeviceManager
import com.audiobookshelf.app.server.ApiHandler
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.zip.GZIPOutputStream

/**
 * Two-way sync of transcripts between this phone and an Audiobookshelf server running the
 * abs-transcription add-on (/api/transcription).
 *
 * Each side keeps a revision number. The server bumps its revision on every change; the phone
 * remembers the revision it last pushed or pulled (sync.json) and whether it changed anything since.
 *
 *   changed here only     -> push
 *   changed there only    -> pull (only finished transcripts; a running job is shown live from the server)
 *   changed on both sides -> the more complete copy wins (finished > unfinished > more transcribed > newer);
 *                            if the server wins, the phone's lines are kept as lines.conflict.jsonl
 *   deleted here          -> deleted there too, unless the server copy changed since
 *   deleted there         -> deleted here, unless the phone changed it since
 *
 * While the phone is transcribing, its partial transcript is pushed now and then. That also tells
 * the server the book is being transcribed on this phone, so nobody starts it there at the same time.
 *
 * Servers without the add-on answer 404 and are left alone.
 */
object TranscriptSync {
  private const val tag = "TranscriptSync"
  private val executor = Executors.newSingleThreadExecutor()
  private val jsonType = "application/json; charset=utf-8".toMediaType()
  private val http = OkHttpClient.Builder()
    .connectTimeout(20, TimeUnit.SECONDS)
    .readTimeout(180, TimeUnit.SECONDS)
    .writeTimeout(180, TimeUnit.SECONDS)
    .build()

  /** How often a running transcription checks in with the server */
  const val PARTIAL_PUSH_INTERVAL_MS = 10 * 60 * 1000L

  fun async(ctx: Context, key: String, allowPull: Boolean = true) {
    val app = ctx.applicationContext
    executor.execute {
      try { sync(app, key, allowPull, null) } catch (e: Exception) { Log.w(tag, "Sync of $key failed", e) }
    }
  }

  /** Syncs every transcript on the phone (and sends pending deletes). */
  fun asyncAll(ctx: Context) {
    val app = ctx.applicationContext
    executor.execute {
      val store = TranscriptStore(app)
      val keys = store.listAll().map { it.key }.toMutableSet()
      val pending = store.readPendingDeletes()
      pending.keys().forEach { keys.add(it) }
      for (k in keys) {
        try { sync(app, k, true, null) } catch (e: Exception) { Log.w(tag, "Sync of $k failed", e) }
      }
    }
  }

  /** Runs on the sync thread and waits for the result (for the UI). */
  fun syncNow(ctx: Context, key: String, allowPull: Boolean, configId: String?, timeoutSec: Long = 60): String {
    val app = ctx.applicationContext
    val f = executor.submit<String> { sync(app, key, allowPull, configId) }
    return try { f.get(timeoutSec, TimeUnit.SECONDS) } catch (e: Exception) { "error: ${e.cause?.message ?: e.message}" }
  }

  fun deviceId(ctx: Context): String {
    val f = File(ctx.filesDir, "transcription/device-id")
    if (f.exists()) f.readText().trim().takeIf { it.isNotEmpty() }?.let { return it }
    f.parentFile?.mkdirs()
    val id = UUID.randomUUID().toString()
    f.writeText(id)
    return id
  }

  fun deviceName(): String {
    val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
    return if (Build.MODEL.startsWith(Build.MANUFACTURER, ignoreCase = true)) Build.MODEL else "$manufacturer ${Build.MODEL}"
  }

  private fun isRunningLocally(key: String): Boolean {
    val cur = TranscriptionHub.currentJob
    return (cur is TranscriptionHub.Job.Transcribe && cur.key == key) || TranscriptionHub.queue.contains(TranscriptionHub.Job.Transcribe(key))
  }

  private class Server(val address: String, val configId: String?, val ctx: Context) {
    fun base(key: String) = "${address.trimEnd('/')}/api/transcription/items/${java.net.URLEncoder.encode(key, "UTF-8").replace("+", "%20")}"
  }

  private data class Resp(val code: Int, val body: String?)

  private fun call(server: Server, method: String, url: String, body: ByteArray? = null, gzip: Boolean = false): Resp {
    val config = DeviceManager.getServerConnectionConfig(server.configId)
    fun attempt(token: String): Resp {
      val b = Request.Builder().url(url).addHeader("Authorization", "Bearer $token").addHeader("Accept", "application/json")
      config?.customHeaders?.forEach { (k, v) -> b.addHeader(k, v) }
      if (gzip) b.addHeader("Content-Encoding", "gzip")
      val rb = body?.toRequestBody(jsonType)
      when (method) {
        "GET" -> b.get()
        "DELETE" -> b.delete()
        else -> b.method(method, rb ?: ByteArray(0).toRequestBody(jsonType))
      }
      http.newCall(b.build()).execute().use { r -> return Resp(r.code, r.body?.string()) }
    }
    var res = attempt(config?.token ?: DeviceManager.token)
    if (res.code == 401 && server.configId != null) {
      refreshToken(server.ctx, server.configId)?.let { res = attempt(it) }
    }
    return res
  }

  private fun refreshToken(ctx: Context, configId: String): String? {
    val latch = CountDownLatch(1)
    var token: String? = null
    try {
      ApiHandler(ctx).refreshAuthTokens(configId) { r ->
        if (r is ApiHandler.RefreshResult.Success) token = r.accessToken
        latch.countDown()
      }
      latch.await(60, TimeUnit.SECONDS)
    } catch (e: Exception) {
      Log.e(tag, "Token refresh failed", e)
    }
    return token
  }

  private fun serverFor(ctx: Context, meta: TranscriptMeta?, configIdHint: String?): Server? {
    val configId = meta?.serverConnectionConfigId ?: configIdHint ?: DeviceManager.serverConnectionConfig?.id
    val config = DeviceManager.getServerConnectionConfig(configId)
    val address = config?.address ?: meta?.serverAddress ?: return null
    return Server(address, config?.id ?: configId, ctx)
  }

  private fun emit(json: JSONObject) {
    TranscriptionHub.emit("onTranscriptionUpdate", json)
  }

  /** One sync step for [key]. Returns what happened (for logs and the UI). */
  @Synchronized
  fun sync(ctx: Context, key: String, allowPull: Boolean, configIdHint: String?): String {
    if (key.startsWith("local_")) return "local-only" // not linked to a server item
    val store = TranscriptStore(ctx)
    val meta = store.getMeta(key)
    val pending = store.readPendingDeletes().optJSONObject(key)

    // ---- deleted on the phone: delete on the server too
    if (meta == null && pending != null) {
      val server = serverFor(ctx, null, pending.optString("configId").takeIf { it.isNotEmpty() && it != "null" } ?: configIdHint) ?: return "offline"
      val rev = pending.optLong("revision")
      val r = call(server, "DELETE", "${server.base(key)}/sync?baseRevision=$rev")
      return when (r.code) {
        200, 404, 403 -> { store.clearPendingDelete(key); if (r.code == 200) "deleted-on-server" else "delete-skipped" }
        409 -> { store.clearPendingDelete(key); "server-changed" } // newer edits on the server win over the delete
        else -> "error ${r.code}"
      }
    }
    if (meta != null && pending != null) store.clearPendingDelete(key) // transcribed again since the delete

    val server = serverFor(ctx, meta, configIdHint) ?: return "offline"
    val st = call(server, "GET", "${server.base(key)}/status")
    if (st.code == 401) return "signed-out"
    if (st.code != 200 || st.body == null) return "unsupported" // no add-on on this server, or no access
    val srv = try { JSONObject(st.body) } catch (e: Exception) { return "unsupported" }
    if (!srv.has("revision")) return "unsupported"

    val serverStatus = srv.optString("status", "none")
    val serverRev = srv.optLong("revision", 0)
    val serverHas = serverStatus != "none"
    val serverEngine = srv.optString("engine", "server")
    val serverActive = serverStatus == "running" || serverStatus == "queued"
    val serverJob = serverHas && serverActive && serverEngine == "server"

    // ---- nothing here
    if (meta == null) {
      if (!serverHas) return "none"
      if (!allowPull) return "remote-only"
      if (serverActive) return "remote-running"
      if (serverEngine == "server" && serverStatus != "done") return "remote-partial"
      return pull(store, server, key, null)
    }

    val state = store.getSyncState(key)
    val serverChanged = serverRev != state.syncRevision

    // ---- this phone is transcribing it: check in with the partial transcript
    if (isRunningLocally(key)) {
      if (serverJob) return "busy"
      return push(ctx, store, server, key, meta, if (serverChanged) serverRev else state.syncRevision, force = serverChanged)
    }

    if (!serverHas) {
      if (srv.optBoolean("deleted") && state.syncRevision > 0 && state.dirtySeq == state.syncedSeq) {
        store.deleteLocalOnly(key)
        emit(JSONObject().put("key", key).put("status", TranscriptStatus.NONE).put("deleted", true))
        return "deleted-here"
      }
      return push(ctx, store, server, key, meta, serverRev, force = false)
    }
    if (!serverChanged && !state.dirty) return "up-to-date"
    if (!serverChanged) return push(ctx, store, server, key, meta, serverRev, force = false)
    if (serverActive) return "remote-running" // keep ours until the other job is finished
    if (!state.dirty) return if (allowPull) pull(store, server, key, meta) else "remote-newer"

    // ---- changed on both sides: the more complete copy wins
    val localDone = meta.status == TranscriptStatus.DONE
    val serverDone = serverStatus == "done"
    val localWins = when {
      localDone != serverDone -> localDone
      Math.abs(meta.doneSec - srv.optDouble("doneSec", 0.0)) > 1.0 -> meta.doneSec > srv.optDouble("doneSec", 0.0)
      else -> meta.updatedAt >= srv.optLong("updatedAt", 0)
    }
    return if (localWins) push(ctx, store, server, key, meta, serverRev, force = true)
    else {
      store.backupForConflict(key)
      pull(store, server, key, meta)
    }
  }

  /** Books whose upload the server refused because this user isn't an admin: their transcript stays on the phone */
  private val localOnly = java.util.Collections.synchronizedSet(HashSet<String>())

  private fun push(ctx: Context, store: TranscriptStore, server: Server, key: String, meta: TranscriptMeta, base: Long, force: Boolean): String {
    if (localOnly.contains("${server.base(key)}")) return "local-only"
    val seq = store.getSyncState(key).dirtySeq
    val m = store.metaJson(meta)
    for (f in listOf("tracks", "ebookLocalUri", "serverConnectionConfigId", "serverAddress", "origin", "deviceName")) m.remove(f)
    // A job the app was killed in the middle of isn't running any more
    if (!isRunningLocally(key) && (meta.status == TranscriptStatus.RUNNING || meta.status == TranscriptStatus.QUEUED)) m.put("status", TranscriptStatus.PAUSED)
    if (isRunningLocally(key)) m.put("status", TranscriptStatus.RUNNING)

    val head = JSONObject()
      .put("baseRevision", base)
      .put("force", force)
      .put("deviceId", deviceId(ctx))
      .put("deviceName", deviceName())
      .put("meta", m)
      .put("ebookCheck", store.getEbookCheck(key) ?: JSONObject.NULL)
    // Lines are already JSON: splice them in instead of re-parsing a few MB
    val lines = store.readLines(key, 0)
    val original = File(ctx.filesDir, "transcription/transcripts/${key.replace(Regex("[^A-Za-z0-9._-]"), "_")}/lines.original.jsonl")
      .takeIf { it.exists() }?.readLines()?.filter { it.isNotBlank() }
    val sb = StringBuilder(head.toString().dropLast(1))
    sb.append(",\"lines\":[").append(lines.joinToString(",")).append(']')
    if (original != null) sb.append(",\"originalLines\":[").append(original.joinToString(",")).append(']')
    store.ebookTextRaw(key)?.let { sb.append(",\"ebookText\":").append(it) }
    sb.append('}')

    val bytes = ByteArrayOutputStream().also { bo -> GZIPOutputStream(bo).use { it.write(sb.toString().toByteArray(Charsets.UTF_8)) } }.toByteArray()
    val r = call(server, "PUT", "${server.base(key)}/sync", bytes, gzip = true)
    if (r.code == 200) {
      val rev = try { JSONObject(r.body ?: "{}").optLong("revision") } catch (e: Exception) { 0L }
      if (rev > 0) store.markSynced(key, rev, seq)
      Log.i(tag, "Pushed $key (${lines.size} lines) as revision $rev")
      return "pushed"
    }
    if (r.code == 409) {
      val o = try { JSONObject(r.body ?: "{}") } catch (e: Exception) { JSONObject() }
      return if (o.optBoolean("busy")) "busy" else "conflict"
    }
    // Only admins share phone transcripts with the server: keep this one here and stop offering it
    if (r.code == 403) {
      localOnly.add("${server.base(key)}")
      Log.i(tag, "$key stays on this phone (only admins share transcripts with the server)")
      return "local-only"
    }
    return "error ${r.code}"
  }

  private fun pull(store: TranscriptStore, server: Server, key: String, local: TranscriptMeta?): String {
    val r = call(server, "GET", "${server.base(key)}/sync")
    if (r.code != 200 || r.body == null) return "error ${r.code}"
    val o = JSONObject(r.body)
    if (o.optBoolean("deleted") || !o.has("meta")) {
      if (local != null) {
        store.deleteLocalOnly(key)
        emit(JSONObject().put("key", key).put("status", TranscriptStatus.NONE).put("deleted", true))
        return "deleted-here"
      }
      return "none"
    }
    val config = DeviceManager.getServerConnectionConfig(server.configId)
    val meta = store.replaceFromServer(
      key, o.getJSONObject("meta"), o.optJSONArray("lines") ?: JSONArray(), o.optJSONObject("ebookCheck"), o.optJSONArray("originalLines"),
      o.optLong("revision"), local, server.configId, config?.address ?: server.address, o.optJSONObject("ebookText")
    )
    Log.i(tag, "Pulled $key (${meta.linesCount} lines, revision ${o.optLong("revision")})")
    emit(meta.toJs().put("reload", true))
    return "pulled"
  }
}

package com.audiobookshelf.app.plugins

import android.util.Log
import com.audiobookshelf.app.device.DeviceManager
import com.audiobookshelf.app.dictionary.BuiltInDictionary
import com.audiobookshelf.app.dictionary.DictLanguage
import com.audiobookshelf.app.dictionary.StarDict
import com.audiobookshelf.app.server.ApiHandler
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.zip.ZipInputStream

/**
 * Offline dictionaries for the e-reader (like a Kindle's). Dictionaries are downloaded from the
 * Audiobookshelf server's transcription add-on (StarDict format) into files/dictionaries/<id>/ and
 * looked up on the phone, no connection needed.
 *
 *   list()                                   -> { dictionaries: [{ id, name, lang, words, size }] }
 *   install({ id, name, lang, path })        downloads <server><path> (a zip) ; progress: onDictionaryDownload
 *   remove({ id })
 *   lookup({ words: [candidates], lang })    -> { matched, results: [{ dictionary, dictionaryId, headword, format, definition }] }
 *
 * Built-in dictionaries (from Grimmory Reader; downloaded straight from WordNet / WikDict / FreeDict):
 *   builtinList()                            -> { dictionaries: [{ code, label, direction, sizeLabel, credit, status, progress, message }], online }
 *   builtinInstall({ code }) / builtinRemove({ code }) ; progress: onBuiltinDictionary
 *   setOnline({ allowed })                   look words up online when nothing downloaded has them
 *   builtinLookup({ word, lang })            -> { entry: { word, phonetic, languageLabel, source, meanings } | null, suggested }
 */
@CapacitorPlugin(name = "AbsDictionary")
class AbsDictionary : Plugin() {
  private val tag = "AbsDictionary"
  private val io = Executors.newFixedThreadPool(2)
  private val http = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(5, TimeUnit.MINUTES).build()

  private fun root() = File(context.filesDir, "dictionaries").apply { mkdirs() }

  private data class Installed(val id: String, val name: String, val lang: String, val words: Int, val dicts: List<StarDict>, val size: Long)

  private fun installed(): List<Installed> = root().listFiles()?.filter { it.isDirectory }?.mapNotNull { dir ->
    try {
      val meta = File(dir, "meta.json").takeIf { it.exists() }?.let { JSONObject(it.readText()) } ?: JSONObject()
      val ifos = dir.walkTopDown().filter { it.isFile && it.name.endsWith(".ifo", true) }.toList()
      if (ifos.isEmpty()) return@mapNotNull null
      val dicts = ifos.map { f -> cache.getOrPut(f.path) { StarDict(f) } }
      Installed(
        dir.name, meta.optString("name").ifEmpty { dicts.first().name }, meta.optString("lang", "any").ifEmpty { "any" },
        dicts.sumOf { (it.info["wordcount"] ?: "0").toIntOrNull() ?: 0 }, dicts, dir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
      )
    } catch (e: Exception) {
      Log.w(tag, "Bad dictionary in ${dir.name}", e); null
    }
  } ?: emptyList()

  private fun background(call: PluginCall, block: () -> Unit) {
    io.execute {
      try { block() } catch (e: Exception) {
        Log.e(tag, "${call.methodName} failed", e)
        call.reject(e.message ?: "Dictionary error")
      }
    }
  }

  @PluginMethod
  fun list(call: PluginCall) = background(call) {
    val arr = JSArray()
    installed().forEach { d -> arr.put(JSObject().put("id", d.id).put("name", d.name).put("lang", d.lang).put("words", d.words).put("size", d.size)) }
    call.resolve(JSObject().put("dictionaries", arr))
  }

  @PluginMethod
  fun lookup(call: PluginCall) = background(call) {
    val words = call.getArray("words")?.toList<String>() ?: listOfNotNull(call.getString("word"))
    val lang = (call.getString("lang") ?: "").lowercase().take(2)
    val all = installed()
    val exact = all.filter { lang.isNotEmpty() && it.lang.take(2) == lang }
    val any = all.filter { it.lang == "any" }
    val dicts = if (exact.isNotEmpty() || lang.isEmpty()) exact + any else any
    for (w in words) {
      val results = JSArray()
      for (d in dicts) for (sd in d.dicts) {
        try {
          sd.lookup(w).forEach { e ->
            results.put(JSObject().put("dictionary", d.name).put("dictionaryId", d.id).put("headword", e.headword).put("format", "html").put("definition", e.definition))
          }
        } catch (e: Exception) { Log.w(tag, "Lookup in ${d.name} failed", e) }
      }
      if (results.length() > 0) {
        call.resolve(JSObject().put("matched", w).put("results", results).put("source", "device"))
        return@background
      }
    }
    call.resolve(JSObject().put("matched", JSONObject.NULL).put("results", JSArray()).put("source", "device").put("installed", dicts.size))
  }

  @PluginMethod
  fun remove(call: PluginCall) = background(call) {
    val id = safeId(call.getString("id") ?: throw IllegalArgumentException("id required"))
    val dir = File(root(), id)
    cache.keys.filter { it.startsWith(dir.path) }.forEach { cache.remove(it) }
    dir.deleteRecursively()
    call.resolve()
  }

  @PluginMethod
  fun install(call: PluginCall) = background(call) {
    val id = safeId(call.getString("id") ?: throw IllegalArgumentException("id required"))
    val path = call.getString("path") ?: throw IllegalArgumentException("path required")
    val config = DeviceManager.serverConnectionConfig ?: throw IllegalStateException("Not connected to a server")
    val url = config.address.trimEnd('/') + path
    val tmp = File(context.cacheDir, "dict-$id.zip")
    fun get(token: String) = http.newCall(Request.Builder().url(url).addHeader("Authorization", "Bearer $token").also { b -> config.customHeaders?.forEach { (k, v) -> b.addHeader(k, v) } }.build()).execute()
    var resp = get(config.token)
    if (resp.code == 401) {
      resp.close()
      val latch = CountDownLatch(1)
      var fresh: String? = null
      ApiHandler(context).refreshAuthTokens(config.id) { r -> if (r is ApiHandler.RefreshResult.Success) fresh = r.accessToken; latch.countDown() }
      latch.await(60, TimeUnit.SECONDS)
      resp = get(fresh ?: throw IllegalStateException("Signed out"))
    }
    resp.use { r ->
      if (!r.isSuccessful) throw IllegalStateException("Download failed (HTTP ${r.code})")
      val body = r.body ?: throw IllegalStateException("Empty download")
      val total = body.contentLength()
      var done = 0L
      var lastEmit = 0L
      body.byteStream().use { input ->
        tmp.outputStream().use { out ->
          val buf = ByteArray(64 * 1024)
          while (true) {
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
            done += n
            val now = System.currentTimeMillis()
            if (now - lastEmit > 300) {
              lastEmit = now
              notifyListeners("onDictionaryDownload", JSObject().put("id", id).put("progress", if (total > 0) done.toDouble() / total else 0.0).put("bytes", done))
            }
          }
        }
      }
    }
    val dir = File(root(), id)
    val staging = File(root(), ".$id.tmp")
    staging.deleteRecursively(); staging.mkdirs()
    ZipInputStream(tmp.inputStream()).use { zin ->
      var e = zin.nextEntry
      while (e != null) {
        val name = File(e.name).name // flatten, no paths from the archive
        if (!e.isDirectory && name.isNotEmpty() && !name.startsWith(".")) File(staging, name).outputStream().use { zin.copyTo(it) }
        e = zin.nextEntry
      }
    }
    tmp.delete()
    if (staging.listFiles()?.none { it.name.endsWith(".ifo", true) } != false) {
      staging.deleteRecursively()
      throw IllegalStateException("The download has no StarDict .ifo file")
    }
    File(staging, "meta.json").writeText(JSONObject().put("id", id).put("name", call.getString("name") ?: id).put("lang", call.getString("lang") ?: "any").toString())
    cache.keys.filter { it.startsWith(dir.path) }.forEach { cache.remove(it) }
    dir.deleteRecursively()
    staging.renameTo(dir)
    notifyListeners("onDictionaryDownload", JSObject().put("id", id).put("progress", 1.0).put("done", true))
    call.resolve(JSObject().put("id", id))
  }

  override fun load() {
    super.load()
    BuiltInDictionary.load(context)
    BuiltInDictionary.listener = { lang, st -> notifyListeners("onBuiltinDictionary", statusJson(lang, st)) }
  }

  private fun statusJson(lang: DictLanguage, st: BuiltInDictionary.Status): JSObject {
    val o = JSObject().put("code", lang.code).put("label", lang.label).put("direction", lang.direction).put("sizeLabel", lang.sizeLabel).put("credit", lang.credit)
    when (st) {
      is BuiltInDictionary.Status.Ready -> o.put("status", "ready")
      is BuiltInDictionary.Status.Installing -> o.put("status", "installing").put("progress", st.progress.toDouble())
      is BuiltInDictionary.Status.Failed -> o.put("status", "failed").put("message", st.message)
      else -> o.put("status", "none")
    }
    return o
  }

  private fun lang(call: PluginCall): DictLanguage =
    DictLanguage.values().firstOrNull { it.code == call.getString("code") } ?: throw IllegalArgumentException("Unknown dictionary")

  @PluginMethod
  fun builtinList(call: PluginCall) = background(call) {
    BuiltInDictionary.load(context)
    val arr = JSArray()
    DictLanguage.values().forEach { arr.put(statusJson(it, BuiltInDictionary.status(it))) }
    call.resolve(JSObject().put("dictionaries", arr).put("online", BuiltInDictionary.onlineAllowed))
  }

  @PluginMethod
  fun builtinInstall(call: PluginCall) = background(call) {
    BuiltInDictionary.install(context, lang(call))
    call.resolve()
  }

  @PluginMethod
  fun builtinRemove(call: PluginCall) = background(call) {
    BuiltInDictionary.remove(context, lang(call))
    call.resolve()
  }

  @PluginMethod
  fun setOnline(call: PluginCall) = background(call) {
    BuiltInDictionary.setOnlineAllowed(context, call.getBoolean("allowed") ?: false)
    call.resolve()
  }

  @PluginMethod
  fun builtinLookup(call: PluginCall) = background(call) {
    val word = call.getString("word") ?: throw IllegalArgumentException("word required")
    val book = DictLanguage.fromBookLanguage(call.getString("lang"))
    val entry = BuiltInDictionary.lookUp(context, word, book, call.getBoolean("online") ?: BuiltInDictionary.onlineAllowed)
    val suggested = BuiltInDictionary.suggested(word, book)
    val anyInstalled = BuiltInDictionary.candidates(word, book).any { BuiltInDictionary.isInstalled(it) }
    call.resolve(
      JSObject().put("entry", entry?.let { BuiltInDictionary.toJson(it) } ?: JSONObject.NULL)
        .put("suggested", statusJson(suggested, BuiltInDictionary.status(suggested)))
        .put("anyInstalled", anyInstalled)
        .put("online", BuiltInDictionary.onlineAllowed)
    )
  }

  private fun safeId(id: String) = id.replace(Regex("[^A-Za-z0-9._-]"), "_").take(100)

  companion object {
    private val cache = ConcurrentHashMap<String, StarDict>()
  }
}

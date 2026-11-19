package com.audiobookshelf.app.transcription

import android.content.Context
import android.net.Uri
import android.util.Log
import com.audiobookshelf.app.device.DeviceManager
import com.audiobookshelf.app.server.ApiHandler
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class NoEbookException(message: String) : Exception(message)

/**
 * After a book is transcribed: finds its ebook (downloaded copy first, otherwise the copy on the
 * Audiobookshelf server), lines up chapters, and stores spelling suggestions.
 */
class EbookCheckRunner(private val ctx: Context, private val store: TranscriptStore) {
  private val tag = "EbookCheck"
  private val http = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(120, TimeUnit.SECONDS).build()

  /** An ebook we could compare against: on the phone, or on the server. */
  private data class Candidate(val name: String, val ext: String, val fetch: (File) -> Boolean)

  // Preferred first: EPUB-style formats keep the best chapter structure; DjVu text is OCR.
  private val priority = listOf("epub", "ibooks", "azw3", "kfx", "kfx-zip", "kfb", "mobi", "azw", "prc", "djvu", "djv", "jvu")

  fun run(meta: TranscriptMeta, isCancelled: () -> Boolean): Int {
    val file = File(ctx.cacheDir, "transcription-ebook.bin")
    try {
      val candidates = findCandidates(meta).sortedBy { priority.indexOf(it.ext).let { i -> if (i < 0) 99 else i } }
      if (candidates.isEmpty()) throw NoEbookException("No ebook in Audiobookshelf for this book")

      // Try each ebook until one has readable text (e.g. skip a DRM-protected AZW if an EPUB exists)
      val problems = ArrayList<String>()
      var sections: List<EbookSection>? = null
      var title: String? = null
      for (c in candidates) {
        if (isCancelled()) throw CancelledException()
        file.delete()
        try {
          if (!c.fetch(file) || file.length() == 0L) { problems.add("${c.name}: couldn't download"); continue }
          sections = EbookReader.read(file)
          title = c.name
          break
        } catch (e: UnsupportedEbookException) {
          problems.add("${c.name}: ${e.message}")
        } catch (e: CancelledException) {
          throw e
        } catch (e: Exception) {
          Log.w(tag, "Couldn't read ${c.name}", e)
          problems.add("${c.name}: couldn't read the file (${e.message})")
        }
      }
      if (sections == null) throw NoEbookException(problems.joinToString("; ").ifEmpty { "No readable ebook found" })

      val lines = store.readAllLines(meta.key)
      if (lines.isEmpty()) throw IllegalStateException("The transcript is empty")
      val chapters = meta.chapters.map { AudioChapter(it.start, it.end, it.title) }
      val result = EbookComparer.compare(lines, chapters, sections, isCancelled)
      store.saveEbookCheck(meta.key, EbookComparer.resultToJson(result, title))
      store.saveEbookText(meta.key, ebookParagraphs(sections, title))
      val pct = if (result.transcriptWords > 0) result.matchedWords * 100 / result.transcriptWords else 0
      meta.ebookCheckMessage = "Compared with ${title ?: "the ebook"} · $pct% of words match"
      return result.suggestions.size
    } finally {
      file.delete()
    }
  }

  /**
   * The ebook's text as paragraphs for the karaoke view: { ebookTitle, paragraphs: [{ t, h }] }
   * (h = heading). Same shape as the server's (jobs.js).
   */
  private fun ebookParagraphs(sections: List<EbookSection>, title: String?): org.json.JSONObject {
    val arr = org.json.JSONArray()
    val noEnd = Regex("[.!?…:;,\"”’)]$")
    for (sec in sections) {
      val parts = sec.text.split('\n').map { it.replace(Regex("\\s+"), " ").trim() }.filter { it.isNotEmpty() }
      parts.forEachIndexed { i, t ->
        val heading = (i == 0 && t == sec.title.trim()) || (t.length <= 60 && !noEnd.containsMatchIn(t) && t.split(' ').size <= 8)
        val o = org.json.JSONObject().put("t", t)
        if (heading) o.put("h", true)
        arr.put(o)
      }
    }
    return org.json.JSONObject().put("ebookTitle", title ?: org.json.JSONObject.NULL).put("paragraphs", arr)
  }

  private fun extOf(name: String): String {
    val n = name.lowercase()
    return if (n.endsWith(".kfx-zip")) "kfx-zip" else n.substringAfterLast('.', "")
  }

  private fun findCandidates(meta: TranscriptMeta): List<Candidate> {
    val out = ArrayList<Candidate>()
    meta.ebookLocalUri?.let { uriStr ->
      val uri = Uri.parse(uriStr)
      val name = File(uri.path ?: uriStr).name
      out.add(Candidate(name, extOf(name).ifEmpty { "epub" }) { dest ->
        try {
          val input = if (uri.scheme == null || uri.scheme == "file") File(uri.path ?: uriStr).inputStream() else ctx.contentResolver.openInputStream(uri)
          input?.use { i -> dest.outputStream().use { i.copyTo(it) } }
          dest.length() > 0
        } catch (e: Exception) {
          Log.w(tag, "Couldn't read local ebook", e)
          false
        }
      })
    }

    val itemId = meta.libraryItemId ?: return out
    val json = try { serverGet(meta, "/api/items/$itemId", null) } catch (e: Exception) { null } ?: return out
    val itemJson = JSONObject(json)
    val primary = itemJson.optJSONObject("media")?.optJSONObject("ebookFile")
    val primaryIno = primary?.optString("ino")
    if (primary != null) {
      val name = primary.optJSONObject("metadata")?.optString("filename") ?: "ebook"
      val ext = extOf(name).ifEmpty { primary.optString("ebookFormat").lowercase() }
      if (ext in EbookReader.supportedExtensions) {
        out.add(Candidate(name, ext) { dest -> serverGet(meta, "/api/items/$itemId/ebook", dest) != null })
      }
    }
    // Other ebook files in the item's folder (Audiobookshelf doesn't treat every format as an ebook,
    // so match by extension and fetch them as plain library files)
    val files = itemJson.optJSONArray("libraryFiles")
    if (files != null) {
      for (k in 0 until files.length()) {
        val f = files.getJSONObject(k)
        val ino = f.optString("ino")
        if (ino == primaryIno) continue
        val name = f.optJSONObject("metadata")?.optString("filename") ?: continue
        val ext = extOf(name)
        if (ext !in EbookReader.supportedExtensions) continue
        out.add(Candidate(name, ext) { dest -> serverGet(meta, "/api/items/$itemId/file/$ino", dest) != null })
      }
    }
    return out
  }

  /** GET from the user's server with their login; saves to [toFile] or returns the body as text. */
  private fun serverGet(meta: TranscriptMeta, path: String, toFile: File?): String? {
    val config = DeviceManager.getServerConnectionConfig(meta.serverConnectionConfigId)
    val address = (config?.address ?: meta.serverAddress ?: return null).trimEnd('/')

    fun attempt(token: String): Pair<Int, String?> {
      val b = Request.Builder().url("$address$path").addHeader("Authorization", "Bearer $token")
      config?.customHeaders?.forEach { (k, v) -> b.addHeader(k, v) }
      http.newCall(b.build()).execute().use { resp ->
        if (!resp.isSuccessful) return resp.code to null
        val body = resp.body ?: return resp.code to null
        return if (toFile != null) {
          body.byteStream().use { i -> toFile.outputStream().use { i.copyTo(it) } }
          200 to ""
        } else 200 to body.string()
      }
    }

    var (code, text) = attempt(config?.token ?: DeviceManager.token)
    if (code == 401 && meta.serverConnectionConfigId != null) {
      refreshToken(meta.serverConnectionConfigId!!)?.let { t -> attempt(t).let { code = it.first; text = it.second } }
    }
    if (code == 404) return null
    if (code != 200) throw IllegalStateException("Server returned $code while looking up the ebook")
    return text
  }

  private fun refreshToken(configId: String): String? {
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
}

package com.audiobookshelf.app.transcription

import android.content.Context
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.json.JSONObject
import java.io.File

@JsonIgnoreProperties(ignoreUnknown = true)
data class TrackSource(
  /** Local content:// or file uri, or a server path like /api/items/{id}/file/{ino} */
  val source: String = "",
  val startOffset: Double = 0.0,
  val duration: Double = 0.0,
  val remote: Boolean = false
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class ChapterSource(val start: Double = 0.0, val end: Double = 0.0, val title: String = "")

object TranscriptStatus {
  const val NONE = "none"
  const val QUEUED = "queued"
  const val RUNNING = "running"
  const val PAUSED = "paused"
  const val DONE = "done"
  const val ERROR = "error"
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class TranscriptMeta(
  var key: String = "",
  var title: String = "",
  var modelId: String = "",
  var status: String = TranscriptStatus.NONE,
  /** what the job is doing right now: model, audio, transcribing */
  var phase: String = "",
  var phaseProgress: Double = 0.0,
  var durationSec: Double = 0.0,
  var processedSec: Double = 0.0,
  /** Within the current pass, everything before this absolute time is final; a resumed job continues from here. */
  var resumeSec: Double = 0.0,
  /** Playback position when transcription started; pass 0 covers [firstStartSec, end], pass 1 covers [0, firstStartSec]. */
  var firstStartSec: Double = 0.0,
  var pass: Int = 0,
  /** Seconds of the book transcribed so far (for progress) */
  var doneSec: Double = 0.0,
  var linesCount: Int = 0,
  /** audio seconds transcribed per wall-clock second */
  var speed: Double = 0.0,
  var error: String? = null,
  var createdAt: Long = System.currentTimeMillis(),
  var updatedAt: Long = System.currentTimeMillis(),
  var serverConnectionConfigId: String? = null,
  var serverAddress: String? = null,
  var tracks: List<TrackSource> = emptyList(),
  // ---- ebook spelling check ----
  /** Server library item id (to look up the ebook on the server) */
  var libraryItemId: String? = null,
  /** Downloaded ebook on the phone, if any (content:// or file path) */
  var ebookLocalUri: String? = null,
  var chapters: List<ChapterSource> = emptyList(),
  /** none | queued | running | done | error | unavailable */
  var ebookCheck: String = "none",
  var ebookCheckMessage: String? = null,
  var ebookSuggestions: Int = 0,
  // ---- sync with the server ----
  /** device | server: where this transcript was made (a pulled server transcript says "server") */
  var origin: String = "device",
  /** name of the phone that made it, when it came from another device via the server */
  var deviceName: String? = null,
  var language: String? = null
) {
  fun toJs(): JSONObject = JSONObject().apply {
    put("key", key)
    put("title", title)
    put("modelId", modelId)
    put("status", status)
    put("phase", phase)
    put("phaseProgress", phaseProgress)
    put("durationSec", durationSec)
    put("processedSec", processedSec)
    put("progress", if (durationSec > 0) (doneSec / durationSec).coerceIn(0.0, 1.0) else 0.0)
    put("doneSec", doneSec)
    put("firstStartSec", firstStartSec)
    // Absolute time ranges that are finished, so the UI can tell "not transcribed yet" from silence
    val ranges = org.json.JSONArray()
    if (pass == 0) {
      ranges.put(org.json.JSONArray().put(firstStartSec).put(maxOf(firstStartSec, resumeSec)))
    } else {
      ranges.put(org.json.JSONArray().put(firstStartSec).put(durationSec))
      ranges.put(org.json.JSONArray().put(0.0).put(if (pass >= 2) firstStartSec else minOf(resumeSec, firstStartSec)))
    }
    put("doneRanges", ranges)
    put("linesCount", linesCount)
    put("speed", speed)
    put("error", error ?: JSONObject.NULL)
    put("updatedAt", updatedAt)
    put("ebookCheck", ebookCheck)
    put("ebookCheckMessage", ebookCheckMessage ?: JSONObject.NULL)
    put("ebookSuggestions", ebookSuggestions)
    put("origin", origin)
    put("deviceName", deviceName ?: JSONObject.NULL)
    put("engine", "device")
  }
}

data class TranscriptLine(val start: Double, val end: Double, val text: String) {
  fun toJson(): String = JSONObject().apply {
    put("s", Math.round(start * 100) / 100.0)
    put("e", Math.round(end * 100) / 100.0)
    put("t", text)
  }.toString()
}

/**
 * Transcripts live in app-private storage:
 *   files/transcription/transcripts/{key}/meta.json
 *   files/transcription/transcripts/{key}/lines.jsonl   (one {"s","e","t"} object per line)
 */
class TranscriptStore(ctx: Context) {
  private val mapper = jacksonObjectMapper()
  private val root = File(ctx.filesDir, "transcription/transcripts").apply { mkdirs() }

  private fun safe(key: String) = key.replace(Regex("[^A-Za-z0-9._-]"), "_")
  private fun dir(key: String) = File(root, safe(key))
  private fun metaFile(key: String) = File(dir(key), "meta.json")
  private fun linesFile(key: String) = File(dir(key), "lines.jsonl")

  @Synchronized
  fun getMeta(key: String): TranscriptMeta? {
    val f = metaFile(key)
    if (!f.exists()) return null
    return try { mapper.readValue<TranscriptMeta>(f) } catch (e: Exception) { null }
  }

  @Synchronized
  fun saveMeta(meta: TranscriptMeta) {
    meta.updatedAt = System.currentTimeMillis()
    dir(meta.key).mkdirs()
    val tmp = File(dir(meta.key), "meta.json.tmp")
    mapper.writeValue(tmp, meta)
    tmp.renameTo(metaFile(meta.key))
  }

  @Synchronized
  fun appendLines(key: String, lines: List<TranscriptLine>) {
    if (lines.isEmpty()) return
    dir(key).mkdirs()
    linesFile(key).appendText(lines.joinToString("\n", postfix = "\n") { it.toJson() })
    markDirty(key)
  }

  /** Drops lines starting in [fromSec, toSec) (used when resuming a pass so nothing is duplicated). Returns lines kept. */
  @Synchronized
  fun truncateLinesInRange(key: String, fromSec: Double, toSec: Double): Int {
    val f = linesFile(key)
    if (!f.exists()) return 0
    val all = f.readLines().filter { it.isNotBlank() }
    val kept = all.filter {
      try {
        val s = JSONObject(it).getDouble("s")
        s < fromSec || s >= toSec
      } catch (e: Exception) { false }
    }
    f.writeText(if (kept.isEmpty()) "" else kept.joinToString("\n", postfix = "\n"))
    if (kept.size != all.size) markDirty(key)
    return kept.size
  }

  /** Drops lines that start at/after [fromSec] (used when resuming so nothing is duplicated). */
  @Synchronized
  fun truncateLinesFrom(key: String, fromSec: Double): Int {
    val f = linesFile(key)
    if (!f.exists()) return 0
    val all = f.readLines().filter { it.isNotBlank() }
    val kept = all.filter {
      try { JSONObject(it).getDouble("s") < fromSec } catch (e: Exception) { false }
    }
    f.writeText(if (kept.isEmpty()) "" else kept.joinToString("\n", postfix = "\n"))
    if (kept.size != all.size) markDirty(key)
    return kept.size
  }

  /** Returns raw JSON lines starting at [fromIndex]. */
  @Synchronized
  fun readLines(key: String, fromIndex: Int): List<String> {
    val f = linesFile(key)
    if (!f.exists()) return emptyList()
    return f.readLines().filter { it.isNotBlank() }.drop(fromIndex.coerceAtLeast(0))
  }

  private fun checkFile(key: String) = File(dir(key), "ebook-check.json")
  private fun textFile(key: String) = File(dir(key), "ebook-text.json")

  /** The ebook's paragraphs (karaoke view). Not a "change" for sync on its own: it comes with the ebook check. */
  @Synchronized
  fun saveEbookText(key: String, json: JSONObject) {
    dir(key).mkdirs()
    val tmp = File(dir(key), "ebook-text.json.tmp")
    tmp.writeText(json.toString())
    tmp.renameTo(textFile(key))
  }

  @Synchronized
  fun getEbookText(key: String): JSONObject? {
    val f = textFile(key)
    if (!f.exists()) return null
    return try { JSONObject(f.readText()) } catch (e: Exception) { null }
  }

  /** Raw file content, spliced into sync uploads as-is */
  @Synchronized
  fun ebookTextRaw(key: String): String? = textFile(key).takeIf { it.exists() }?.readText()

  @Synchronized
  fun saveEbookCheck(key: String, json: JSONObject) {
    writeEbookCheck(key, json)
    markDirty(key)
  }

  private fun writeEbookCheck(key: String, json: JSONObject) {
    dir(key).mkdirs()
    val tmp = File(dir(key), "ebook-check.json.tmp")
    tmp.writeText(json.toString())
    tmp.renameTo(checkFile(key))
  }

  @Synchronized
  fun getEbookCheck(key: String): JSONObject? {
    val f = checkFile(key)
    if (!f.exists()) return null
    return try { JSONObject(f.readText()) } catch (e: Exception) { null }
  }

  @Synchronized
  fun readAllLines(key: String): List<TranscriptLine> = readLines(key, 0).mapNotNull {
    try {
      val o = JSONObject(it)
      TranscriptLine(o.getDouble("s"), o.getDouble("e"), o.getString("t"))
    } catch (e: Exception) { null }
  }

  /**
   * Sets the status of ebook suggestions; "applied" ones are written into the transcript text.
   * The transcript from before the first correction is kept as lines.original.jsonl.
   * Returns the number of suggestions still pending.
   */
  @Synchronized
  fun updateSuggestions(key: String, ids: Set<String>, status: String): Int {
    val check = getEbookCheck(key) ?: return 0
    val arr = check.optJSONArray("suggestions") ?: return 0
    val all = (0 until arr.length()).map { SpellingSuggestion.fromJson(arr.getJSONObject(it)) }
    val toApply = ArrayList<SpellingSuggestion>()
    all.forEach {
      if (it.id in ids && it.status == "pending") {
        it.status = status
        if (status == "applied") toApply.add(it)
      }
    }
    if (toApply.isNotEmpty()) {
      val lf = linesFile(key)
      val backup = File(dir(key), "lines.original.jsonl")
      if (!backup.exists() && lf.exists()) lf.copyTo(backup)
      val byLine = toApply.groupBy { Math.round(it.lineStart * 100) }
      val out = lf.readLines().filter { it.isNotBlank() }.map { raw ->
        try {
          val o = JSONObject(raw)
          val fixes = byLine[Math.round(o.getDouble("s") * 100)]
          if (fixes == null) raw else o.put("t", EbookComparer.applyToLine(o.getString("t"), fixes)).toString()
        } catch (e: Exception) { raw }
      }
      lf.writeText(if (out.isEmpty()) "" else out.joinToString("\n", postfix = "\n"))
    }
    val newArr = org.json.JSONArray()
    all.forEach { newArr.put(it.toJson()) }
    check.put("suggestions", newArr)
    saveEbookCheck(key, check) // marks the transcript as changed, so it syncs
    return all.count { it.status == "pending" }
  }

  /** Deleted by the user: also remembered so the copy on the server is deleted at the next sync. */
  @Synchronized
  fun delete(key: String) {
    val state = getSyncState(key)
    val meta = getMeta(key)
    if (state.syncRevision > 0 && meta != null) {
      val pending = readPendingDeletes()
      pending.put(key, JSONObject().put("revision", state.syncRevision).put("configId", meta.serverConnectionConfigId ?: JSONObject.NULL))
      writePendingDeletes(pending)
    }
    dir(key).deleteRecursively()
  }

  /** Removed because the server deleted it (no delete is sent back). */
  @Synchronized
  fun deleteLocalOnly(key: String) {
    dir(key).deleteRecursively()
  }

  // ---------------------------------------------------------------- sync state
  //
  //   sync.json: { syncRevision, dirtySeq, syncedSeq }
  //   syncRevision = server revision this copy was last pushed as / pulled from
  //   dirtySeq goes up with every local change; syncedSeq = the dirtySeq that was last pushed

  data class SyncState(var syncRevision: Long = 0, var dirtySeq: Long = 0, var syncedSeq: Long = 0) {
    /** Changed here since the last sync (or never synced) */
    val dirty get() = dirtySeq != syncedSeq || syncRevision == 0L
  }

  private fun syncFile(key: String) = File(dir(key), "sync.json")

  @Synchronized
  fun getSyncState(key: String): SyncState {
    val f = syncFile(key)
    if (!f.exists()) return SyncState()
    return try {
      val o = JSONObject(f.readText())
      SyncState(o.optLong("syncRevision"), o.optLong("dirtySeq"), o.optLong("syncedSeq"))
    } catch (e: Exception) { SyncState() }
  }

  @Synchronized
  fun saveSyncState(key: String, s: SyncState) {
    if (!dir(key).exists()) return
    val tmp = File(dir(key), "sync.json.tmp")
    tmp.writeText(JSONObject().put("syncRevision", s.syncRevision).put("dirtySeq", s.dirtySeq).put("syncedSeq", s.syncedSeq).toString())
    tmp.renameTo(syncFile(key))
  }

  @Synchronized
  fun markDirty(key: String) {
    if (!dir(key).exists()) return
    val s = getSyncState(key)
    s.dirtySeq += 1
    saveSyncState(key, s)
  }

  /** After a successful push of the state at [seq]: anything changed during the upload stays dirty. */
  @Synchronized
  fun markSynced(key: String, revision: Long, seq: Long) {
    val s = getSyncState(key)
    s.syncRevision = revision
    if (s.dirtySeq == seq) s.syncedSeq = seq
    saveSyncState(key, s)
  }

  private fun pendingFile() = File(root.parentFile, "pending-deletes.json")

  @Synchronized
  fun readPendingDeletes(): JSONObject = try { JSONObject(pendingFile().readText()) } catch (e: Exception) { JSONObject() }

  @Synchronized
  fun writePendingDeletes(o: JSONObject) {
    pendingFile().writeText(o.toString())
  }

  @Synchronized
  fun clearPendingDelete(key: String) {
    val o = readPendingDeletes()
    if (o.has(key)) {
      o.remove(key)
      writePendingDeletes(o)
    }
  }

  fun metaJson(meta: TranscriptMeta): JSONObject = JSONObject(mapper.writeValueAsString(meta))

  /** Keeps the local copy around when the server's version wins a conflict. */
  @Synchronized
  fun backupForConflict(key: String) {
    val lf = linesFile(key)
    if (lf.exists()) lf.copyTo(File(dir(key), "lines.conflict.jsonl"), overwrite = true)
  }

  /** Replaces the local copy with the server's (meta, lines, ebook check, original lines). */
  @Synchronized
  fun replaceFromServer(key: String, serverMeta: JSONObject, lines: org.json.JSONArray, ebookCheck: JSONObject?, original: org.json.JSONArray?, revision: Long, local: TranscriptMeta?, configId: String?, serverAddress: String?, ebookText: JSONObject? = null): TranscriptMeta {
    dir(key).mkdirs()
    serverMeta.remove("tracks")
    serverMeta.put("key", key)
    val meta = mapper.readValue<TranscriptMeta>(serverMeta.toString())
    meta.tracks = emptyList()
    meta.serverConnectionConfigId = configId ?: local?.serverConnectionConfigId
    meta.serverAddress = serverAddress ?: local?.serverAddress
    meta.ebookLocalUri = local?.ebookLocalUri
    if (meta.libraryItemId == null) meta.libraryItemId = key
    meta.linesCount = lines.length()

    val sb = StringBuilder()
    for (i in 0 until lines.length()) sb.append(lines.getJSONObject(i).toString()).append('\n')
    linesFile(key).writeText(sb.toString())
    if (ebookCheck != null) writeEbookCheck(key, ebookCheck) else checkFile(key).delete()
    if (ebookText != null && ebookText.has("paragraphs")) saveEbookText(key, ebookText)
    val orig = File(dir(key), "lines.original.jsonl")
    if (original != null && original.length() > 0) {
      val ob = StringBuilder()
      for (i in 0 until original.length()) ob.append(original.getJSONObject(i).toString()).append('\n')
      orig.writeText(ob.toString())
    } else orig.delete()
    val tmp = File(dir(key), "meta.json.tmp")
    mapper.writeValue(tmp, meta)
    tmp.renameTo(metaFile(key))

    val s = getSyncState(key)
    s.syncRevision = revision
    s.syncedSeq = s.dirtySeq
    saveSyncState(key, s)
    clearPendingDelete(key)
    return meta
  }

  @Synchronized
  fun listAll(): List<TranscriptMeta> =
    root.listFiles()?.mapNotNull { d ->
      val f = File(d, "meta.json")
      if (f.exists()) try { mapper.readValue<TranscriptMeta>(f) } catch (e: Exception) { null } else null
    } ?: emptyList()
}

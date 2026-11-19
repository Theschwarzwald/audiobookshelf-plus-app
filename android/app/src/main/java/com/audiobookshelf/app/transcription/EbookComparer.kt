package com.audiobookshelf.app.transcription

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

data class AudioChapter(val start: Double, val end: Double, val title: String)

/** A word in the transcript, pointing back to its line (by start time) and position in that line. */
data class TWord(val norm: String, val text: String, val lineStart: Double, val wordIndex: Int)

/** A word in the ebook. */
data class EWord(val norm: String, val text: String, val section: Int, val pos: Int)

data class SpellingSuggestion(
  val id: String,
  val lineStart: Double,
  val wordIndex: Int,
  /** how many transcript words are replaced (2 when the ebook joins two words, e.g. "night time" -> "nighttime") */
  val wordCount: Int,
  val heard: String,
  val ebook: String,
  val context: String,
  val chapter: String,
  var status: String = "pending" // pending | applied | ignored
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id).put("s", lineStart).put("wi", wordIndex).put("wn", wordCount)
    .put("heard", heard).put("ebook", ebook).put("context", context).put("chapter", chapter).put("status", status)

  companion object {
    fun fromJson(o: JSONObject) = SpellingSuggestion(
      o.getString("id"), o.getDouble("s"), o.getInt("wi"), o.optInt("wn", 1),
      o.getString("heard"), o.getString("ebook"), o.optString("context"), o.optString("chapter"), o.optString("status", "pending")
    )
  }
}

data class ChapterMatch(val audioTitle: String, val ebookTitle: String?, val score: Double)

data class EbookCheckResult(val suggestions: List<SpellingSuggestion>, val chapters: List<ChapterMatch>, val matchedWords: Int, val transcriptWords: Int)

/**
 * Compares a transcript with the ebook to find words the speech model probably misspelled
 * (names, homophones, split/joined words). Audiobooks and ebooks often differ (intros, credits,
 * narrator changes, abridgement), so it only flags a word when the text around it lines up:
 *
 * 1. Across the whole book, find 4-word phrases that occur exactly once in both texts (anchors)
 *    and keep the longest chain of them that is in the same order in both.
 * 2. Between anchors, align the few words left over word by word. A word that differs from the
 *    ebook but looks or sounds similar, with matching words on both sides, becomes a suggestion.
 */
object EbookComparer {
  private val wordRe = Regex("[\\p{L}\\p{N}]+(?:['’][\\p{L}]+)*")

  fun normalize(w: String): String = w.lowercase().replace("’", "'").replace("'", "")

  fun words(text: String): List<Pair<String, IntRange>> =
    wordRe.findAll(text).map { it.value to it.range }.toList()

  /**
   * Compares the whole transcript with the whole ebook in one pass (no chapter alignment):
   * unique 4-word phrases found in both are anchors, the longest in-order chain of anchors lines
   * the two texts up, and only the short gaps between anchors are compared word by word.
   * Runs in roughly O(n log n) for n words. [chapters] is only used to label suggestions.
   */
  fun compare(
    lines: List<TranscriptLine>,
    chapters: List<AudioChapter>,
    sections: List<EbookSection>,
    isCancelled: () -> Boolean = { false }
  ): EbookCheckResult {
    val sorted = lines.sortedBy { it.start }
    val tWords = ArrayList<TWord>()
    for (line in sorted) {
      words(line.text).forEachIndexed { wi, (w, _) -> tWords.add(TWord(normalize(w), w, line.start, wi)) }
    }
    val eWords = ArrayList<EWord>()
    for (sec in sections) {
      words(sec.text).forEachIndexed { i, (w, _) -> eWords.add(EWord(normalize(w), w, sec.index, i)) }
    }
    if (isCancelled()) throw CancelledException()

    val (raw, matched) = alignChapter(tWords, eWords, "")

    // Label each suggestion with its audio chapter (by time), if the book has chapters
    val chs = chapters.sortedBy { it.start }
    fun chapterAt(t: Double): String {
      var lo = 0
      var hi = chs.size - 1
      var ans = -1
      while (lo <= hi) {
        val mid = (lo + hi) / 2
        if (chs[mid].start <= t + 0.01) { ans = mid; lo = mid + 1 } else hi = mid - 1
      }
      return if (ans >= 0) chs[ans].title else ""
    }
    val suggestions = raw.distinctBy { "${it.lineStart}:${it.wordIndex}" }.map { it.copy(chapter = chapterAt(it.lineStart)) }
    return EbookCheckResult(suggestions, emptyList(), matched, tWords.size)
  }

  private const val ANCHOR = 4
  private const val MAX_GAP = 40

  /** 64-bit hash of the 4-word phrase starting at [i] (faster and smaller than building strings). */
  private fun key(w: List<String>, i: Int): Long {
    var h = 1125899906842597L
    for (k in i until i + ANCHOR) h = h * 1_000_003L + w[k].hashCode()
    return h
  }

  /** Returns suggestions and the number of transcript words that matched the ebook. */
  private fun alignChapter(a: List<TWord>, e: List<EWord>, chapterTitle: String): Pair<List<SpellingSuggestion>, Int> {
    val an = a.map { it.norm }
    val en = e.map { it.norm }
    if (an.size < ANCHOR || en.size < ANCHOR) return emptyList<SpellingSuggestion>() to 0

    // 4-word phrases that occur exactly once in a text (-1 marks repeats)
    fun uniques(w: List<String>): HashMap<Long, Int> {
      val pos = HashMap<Long, Int>(w.size * 2)
      for (i in 0..w.size - ANCHOR) {
        val k = key(w, i)
        val prev = pos[k]
        pos[k] = if (prev == null) i else -1
      }
      return pos
    }
    val ua = uniques(an)
    val ue = uniques(en)
    val pairs = ua.mapNotNull { (k, ia) -> if (ia < 0) null else ue[k]?.takeIf { it >= 0 }?.let { ia to it } }.sortedBy { it.first }

    // Longest chain increasing in both texts (patience LIS on ebook position)
    val chain = lis(pairs)
    if (chain.isEmpty()) return emptyList<SpellingSuggestion>() to 0

    // Merge overlapping anchors into matched blocks
    data class Block(val a0: Int, val e0: Int, var len: Int)
    val blocks = ArrayList<Block>()
    for ((ia, ie) in chain) {
      val last = blocks.lastOrNull()
      if (last != null && ia - last.a0 == ie - last.e0 && ia <= last.a0 + last.len) {
        last.len = max(last.len, ia - last.a0 + ANCHOR)
      } else if (last == null || (ia >= last.a0 + last.len && ie >= last.e0 + last.len)) {
        blocks.add(Block(ia, ie, ANCHOR))
      }
    }
    var matched = blocks.sumOf { it.len }

    val out = ArrayList<SpellingSuggestion>()
    for (b in 0 until blocks.size - 1) {
      val x = blocks[b]
      val y = blocks[b + 1]
      val aStart = x.a0 + x.len
      val eStart = x.e0 + x.len
      val aGap = a.subList(aStart, y.a0)
      val eGap = e.subList(eStart, y.e0)
      if (aGap.isEmpty() || eGap.isEmpty()) continue
      if (aGap.size > MAX_GAP || eGap.size > MAX_GAP) continue // too different: narration change, skip
      val ops = align(aGap.map { it.norm }, eGap.map { it.norm })
      matched += ops.count { it.type == Op.MATCH }
      out.addAll(suggestionsFromOps(ops, aGap, eGap, e, eStart, chapterTitle))
    }
    return out to matched
  }

  private fun lis(pairs: List<Pair<Int, Int>>): List<Pair<Int, Int>> {
    if (pairs.isEmpty()) return emptyList()
    val tails = ArrayList<Int>() // index into pairs
    val prev = IntArray(pairs.size) { -1 }
    for (k in pairs.indices) {
      val v = pairs[k].second
      var lo = 0
      var hi = tails.size
      while (lo < hi) {
        val mid = (lo + hi) / 2
        if (pairs[tails[mid]].second < v) lo = mid + 1 else hi = mid
      }
      if (lo > 0) prev[k] = tails[lo - 1]
      if (lo == tails.size) tails.add(k) else tails[lo] = k
    }
    val res = ArrayList<Pair<Int, Int>>()
    var k = tails.last()
    while (k >= 0) { res.add(pairs[k]); k = prev[k] }
    return res.reversed()
  }

  enum class Op { MATCH, SUB, INS, DEL } // INS = extra transcript word, DEL = ebook word missing
  data class Step(val type: Op, val ai: Int, val ei: Int)

  /** Word-level edit alignment (small gaps only). */
  private fun align(a: List<String>, e: List<String>): List<Step> {
    val n = a.size
    val m = e.size
    val d = Array(n + 1) { IntArray(m + 1) }
    for (i in 0..n) d[i][0] = i * 10
    for (j in 0..m) d[0][j] = j * 10
    for (i in 1..n) for (j in 1..m) {
      val sub = d[i - 1][j - 1] + if (a[i - 1] == e[j - 1]) 0 else if (similar(a[i - 1], e[j - 1])) 6 else 14
      d[i][j] = minOf(sub, d[i - 1][j] + 10, d[i][j - 1] + 10)
    }
    val steps = ArrayList<Step>()
    var i = n
    var j = m
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0) {
        val same = a[i - 1] == e[j - 1]
        val c = if (same) 0 else if (similar(a[i - 1], e[j - 1])) 6 else 14
        if (d[i][j] == d[i - 1][j - 1] + c) {
          steps.add(Step(if (same) Op.MATCH else Op.SUB, i - 1, j - 1)); i--; j--; continue
        }
      }
      if (i > 0 && d[i][j] == d[i - 1][j] + 10) { steps.add(Step(Op.INS, i - 1, -1)); i-- }
      else { steps.add(Step(Op.DEL, -1, j - 1)); j-- }
    }
    return steps.reversed()
  }

  private fun suggestionsFromOps(ops: List<Step>, a: List<TWord>, e: List<EWord>, allE: List<EWord>, eOffset: Int, chapterTitle: String): List<SpellingSuggestion> {
    val out = ArrayList<SpellingSuggestion>()
    // Neighbours outside the gap are anchors (matches) by construction
    fun isMatchAt(k: Int) = k < 0 || k >= ops.size || ops[k].type == Op.MATCH
    var k = 0
    while (k < ops.size) {
      val op = ops[k]
      // Two transcript words that the ebook writes as one ("night time" -> "nighttime")
      if (op.type == Op.SUB && k + 1 < ops.size && ops[k + 1].type == Op.INS && isMatchAt(k - 1) && isMatchAt(k + 2)) {
        val t1 = a[op.ai]
        val t2 = a[ops[k + 1].ai]
        val ew = e[op.ei]
        if (t1.norm + t2.norm == ew.norm.replace("-", "")) {
          out.add(make(t1, 2, "${t1.text} ${t2.text}", ew, allE, eOffset + op.ei, chapterTitle))
          k += 2
          continue
        }
      }
      if (op.type == Op.INS && k + 1 < ops.size && ops[k + 1].type == Op.SUB && isMatchAt(k - 1) && isMatchAt(k + 2)) {
        val t1 = a[op.ai]
        val t2 = a[ops[k + 1].ai]
        val ew = e[ops[k + 1].ei]
        if (t1.norm + t2.norm == ew.norm) {
          out.add(make(t1, 2, "${t1.text} ${t2.text}", ew, allE, eOffset + ops[k + 1].ei, chapterTitle))
          k += 2
          continue
        }
      }
      // One transcript word the ebook writes as two ("anymore" -> "any more")
      if (op.type == Op.SUB && k + 1 < ops.size && ops[k + 1].type == Op.DEL && isMatchAt(k - 1) && isMatchAt(k + 2)) {
        val t = a[op.ai]
        val e1 = e[op.ei]
        val e2 = e[ops[k + 1].ei]
        if (t.norm == e1.norm + e2.norm) {
          out.add(make(t, 1, t.text, EWord(e1.norm + e2.norm, "${e1.text} ${e2.text}", e1.section, e1.pos), allE, eOffset + op.ei, chapterTitle))
          k += 2
          continue
        }
      }
      // Isolated, similar-looking substitution with matching words on both sides
      if (op.type == Op.SUB && isMatchAt(k - 1) && isMatchAt(k + 1)) {
        val t = a[op.ai]
        val ew = e[op.ei]
        if (similar(t.norm, ew.norm) && !isNumberish(t.norm) && !isNumberish(ew.norm)) {
          out.add(make(t, 1, t.text, ew, allE, eOffset + op.ei, chapterTitle))
        }
      }
      k++
    }
    return out
  }

  private fun make(t: TWord, count: Int, heard: String, ew: EWord, allE: List<EWord>, ePos: Int, chapterTitle: String): SpellingSuggestion {
    val from = max(0, ePos - 6)
    val to = min(allE.size, ePos + 7)
    val context = allE.subList(from, to).joinToString(" ") { it.text }
    return SpellingSuggestion(
      id = "${t.lineStart}-${t.wordIndex}",
      lineStart = t.lineStart,
      wordIndex = t.wordIndex,
      wordCount = count,
      heard = heard,
      ebook = matchCase(t.text, ew.text),
      context = context,
      chapter = chapterTitle
    )
  }

  /** Keep a capital the transcript had at the start of a sentence even if the ebook word is lowercase. */
  private fun matchCase(heard: String, ebook: String): String {
    if (ebook.isEmpty() || heard.isEmpty()) return ebook
    return if (heard[0].isUpperCase() && ebook[0].isLowerCase()) ebook.replaceFirstChar { it.uppercaseChar() } else ebook
  }

  private fun isNumberish(w: String) = w.any { it.isDigit() }

  /** Looks or sounds alike: small edit distance, or same simplified pronunciation key. */
  fun similar(a: String, b: String): Boolean {
    if (a == b) return true
    if (a.length < 3 || b.length < 3) return false
    val dist = levenshtein(a, b)
    val maxLen = max(a.length, b.length)
    if (dist.toDouble() / maxLen <= 0.34) return true
    return a[0] == b[0] && sound(a) == sound(b)
  }

  private fun levenshtein(a: String, b: String): Int {
    var prev = IntArray(b.length + 1) { it }
    var cur = IntArray(b.length + 1)
    for (i in 1..a.length) {
      cur[0] = i
      for (j in 1..b.length) {
        val c = if (a[i - 1] == b[j - 1]) 0 else 1
        cur[j] = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c)
      }
      val t = prev; prev = cur; cur = t
    }
    return prev[b.length]
  }

  /** Very small phonetic key (Soundex-like, good enough for names and homophones). */
  private fun sound(w: String): String {
    val s = w.lowercase().replace("ph", "f").replace("ck", "k").replace("gh", "").replace("wh", "w")
    val code = StringBuilder()
    var last = ' '
    for (ch in s) {
      val c = when (ch) {
        'b', 'f', 'p', 'v' -> '1'
        'c', 'g', 'j', 'k', 'q', 's', 'x', 'z' -> '2'
        'd', 't' -> '3'
        'l' -> '4'
        'm', 'n' -> '5'
        'r' -> '6'
        else -> '0'
      }
      if (c != last && c != '0') code.append(c)
      last = c
    }
    return code.toString()
  }

  // ---- storage helpers ----

  fun resultToJson(r: EbookCheckResult, ebookTitle: String?): JSONObject = JSONObject()
    .put("ebookTitle", ebookTitle ?: JSONObject.NULL)
    .put("matchedWords", r.matchedWords)
    .put("transcriptWords", r.transcriptWords)
    .put("chapters", JSONArray().apply {
      r.chapters.forEach { put(JSONObject().put("audio", it.audioTitle).put("ebook", it.ebookTitle ?: JSONObject.NULL).put("score", Math.round(it.score * 100) / 100.0)) }
    })
    .put("suggestions", JSONArray().apply { r.suggestions.forEach { put(it.toJson()) } })

  /** Replaces the suggested words inside a line's text, keeping punctuation around them. */
  fun applyToLine(text: String, fixes: List<SpellingSuggestion>): String {
    val ws = words(text)
    val sb = StringBuilder(text)
    // Apply from the end so earlier ranges stay valid
    for (f in fixes.sortedByDescending { it.wordIndex }) {
      if (f.wordIndex >= ws.size) continue
      val lastIdx = f.wordIndex + f.wordCount - 1
      if (lastIdx >= ws.size) continue
      val heardNow = (f.wordIndex..lastIdx).joinToString(" ") { ws[it].first }
      if (normalize(heardNow).replace(" ", "") != normalize(f.heard).replace(" ", "")) continue // line changed since
      sb.replace(ws[f.wordIndex].second.first, ws[lastIdx].second.last + 1, f.ebook)
    }
    return sb.toString()
  }
}

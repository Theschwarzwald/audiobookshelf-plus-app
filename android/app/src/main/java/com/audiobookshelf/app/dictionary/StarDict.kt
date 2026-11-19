package com.audiobookshelf.app.dictionary

import java.io.ByteArrayOutputStream
import java.io.File
import java.io.RandomAccessFile
import java.util.zip.GZIPInputStream
import java.util.zip.Inflater

/**
 * Reads a StarDict dictionary (.ifo + .idx[.gz] + .dict[.dz] + optional .syn) for offline lookups.
 * Same logic as the server's dictionary.js: binary search in StarDict's index order
 * (ASCII-case-insensitive), dictzip random access, entry fields turned into HTML.
 */
class StarDict(val ifo: File) {
  val info: Map<String, String> = ifo.readLines().mapNotNull {
    val i = it.indexOf('=')
    if (i > 0) it.substring(0, i).trim() to it.substring(i + 1).trim() else null
  }.toMap()
  val name: String = info["bookname"] ?: ifo.nameWithoutExtension
  private val base = ifo.path.removeSuffix(".ifo")

  private lateinit var idx: ByteArray
  private lateinit var starts: IntArray
  private var syn: ByteArray? = null
  private var synStarts: IntArray? = null
  private var offBits = 32
  private lateinit var reader: DictReader
  private var loaded = false

  private fun find(vararg exts: String): File? = exts.map { File(base + it) }.firstOrNull { it.exists() }

  @Synchronized
  fun load() {
    if (loaded) return
    val idxFile = find(".idx", ".idx.gz") ?: throw IllegalStateException("$name: missing .idx")
    val dictFile = find(".dict.dz", ".dict") ?: throw IllegalStateException("$name: missing .dict")
    idx = if (idxFile.name.endsWith(".gz")) GZIPInputStream(idxFile.inputStream()).use { it.readBytes() } else idxFile.readBytes()
    offBits = if (info["idxoffsetbits"] == "64") 64 else 32
    val tail = if (offBits == 64) 12 else 8
    val list = ArrayList<Int>()
    var p = 0
    while (p < idx.size) {
      list.add(p)
      val z = indexOfZero(idx, p)
      if (z < 0) break
      p = z + 1 + tail
    }
    starts = list.toIntArray()
    reader = if (dictFile.name.endsWith(".dz")) DictZip(dictFile) else PlainDict(dictFile)
    find(".syn")?.let { f ->
      val s = f.readBytes()
      val l = ArrayList<Int>()
      var q = 0
      while (q < s.size) {
        l.add(q)
        val z = indexOfZero(s, q)
        if (z < 0) break
        q = z + 5
      }
      syn = s
      synStarts = l.toIntArray()
    }
    loaded = true
  }

  data class Entry(val headword: String, val definition: String)

  fun lookup(word: String): List<Entry> {
    load()
    val key = word.toByteArray(Charsets.UTF_8)
    val found = sortedSetOf<Int>()
    search(idx, starts, key).forEach { found.add(it) }
    val s = syn
    val ss = synStarts
    if (s != null && ss != null) {
      for (i in search(s, ss, key)) {
        val z = indexOfZero(s, ss[i])
        found.add(u32(s, z + 1).toInt())
      }
    }
    val out = ArrayList<Entry>()
    for (i in found) {
      if (i < 0 || i >= starts.size) continue
      val st = starts[i]
      val z = indexOfZero(idx, st)
      val head = String(idx, st, z - st, Charsets.UTF_8)
      val offset: Long
      val size: Int
      if (offBits == 64) {
        offset = (u32(idx, z + 1) shl 32) or u32(idx, z + 5)
        size = u32(idx, z + 9).toInt()
      } else {
        offset = u32(idx, z + 1)
        size = u32(idx, z + 5).toInt()
      }
      out.add(Entry(head, toHtml(reader.read(offset, size), info["sametypesequence"] ?: "")))
    }
    return out.sortedByDescending { it.headword == word }
  }

  private fun search(buf: ByteArray, st: IntArray, key: ByteArray): List<Int> {
    var lo = 0
    var hi = st.size - 1
    var found = -1
    while (lo <= hi) {
      val mid = (lo + hi) ushr 1
      val c = cmp(buf, st[mid], key)
      if (c < 0) lo = mid + 1 else {
        if (c == 0) found = mid
        hi = mid - 1
      }
    }
    if (found < 0) return emptyList()
    val out = ArrayList<Int>()
    var i = found
    while (i < st.size && cmp(buf, st[i], key) == 0) out.add(i++)
    return out
  }

  /** StarDict order: ASCII-case-insensitive */
  private fun cmp(buf: ByteArray, start: Int, key: ByteArray): Int {
    val z = indexOfZero(buf, start)
    val len = z - start
    val n = minOf(len, key.size)
    for (i in 0 until n) {
      var x = buf[start + i].toInt() and 0xff
      var y = key[i].toInt() and 0xff
      if (x in 65..90) x += 32
      if (y in 65..90) y += 32
      if (x != y) return x - y
    }
    return len - key.size
  }

  private fun toHtml(data: ByteArray, sts: String): String {
    val parts = ArrayList<Pair<Char, ByteArray>>()
    var p = 0
    fun field(type: Char, last: Boolean) {
      if (type.isUpperCase()) {
        if (last && sts.isNotEmpty()) {
          parts.add(type to data.copyOfRange(p, data.size)); p = data.size
        } else {
          val len = u32(data, p).toInt()
          parts.add(type to data.copyOfRange(p + 4, minOf(data.size, p + 4 + len))); p += 4 + len
        }
      } else {
        var z = if (last && sts.isNotEmpty()) data.size else indexOfZero(data, p)
        if (z < 0) z = data.size
        parts.add(type to data.copyOfRange(p, z)); p = z + 1
      }
    }
    if (sts.isNotEmpty()) {
      for (i in sts.indices) { if (p > data.size) break; field(sts[i], i == sts.length - 1) }
    } else {
      while (p < data.size) { val t = (data[p++].toInt() and 0xff).toChar(); field(t, false) }
    }
    val sb = StringBuilder()
    for ((type, bytes) in parts) {
      val text = String(bytes, Charsets.UTF_8)
      when (type) {
        'h', 'g' -> sb.append(text)
        'x' -> sb.append(xdxf(text))
        't' -> sb.append("<p class=\"phonetic\">[").append(esc(text)).append("]</p>")
        'm', 'l', 'y', 'k' -> sb.append("<div>").append(esc(text).replace("\n", "<br>")).append("</div>")
      }
      sb.append('\n')
    }
    return sb.toString()
  }

  private fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
  private fun xdxf(x: String) = x.replace(Regex("<k>[\\s\\S]*?</k>"), "").replace(Regex("</?(ar|def)[^>]*>"), "")
    .replace("<tr>", "<span class=\"phonetic\">[").replace("</tr>", "]</span>").replace("<abr>", "<i>").replace("</abr>", "</i>")
    .replace("<ex>", "<em>").replace("</ex>", "</em>").replace("<kref>", "<b>").replace("</kref>", "</b>")
    .replace(Regex("<c[^>]*>"), "<span>").replace("</c>", "</span>").replace("\n", "<br>")

  companion object {
    fun indexOfZero(b: ByteArray, from: Int): Int {
      var i = from
      while (i < b.size) { if (b[i].toInt() == 0) return i; i++ }
      return -1
    }
    fun u32(b: ByteArray, o: Int): Long =
      ((b[o].toLong() and 0xff) shl 24) or ((b[o + 1].toLong() and 0xff) shl 16) or ((b[o + 2].toLong() and 0xff) shl 8) or (b[o + 3].toLong() and 0xff)
  }
}

private interface DictReader { fun read(offset: Long, size: Int): ByteArray }

private class PlainDict(f: File) : DictReader {
  private val raf = RandomAccessFile(f, "r")
  @Synchronized
  override fun read(offset: Long, size: Int): ByteArray {
    val b = ByteArray(size)
    raf.seek(offset)
    raf.readFully(b)
    return b
  }
}

/** dictzip: gzip with an "RA" table of independently inflatable chunks */
private class DictZip(f: File) : DictReader {
  private val raf = RandomAccessFile(f, "r")
  private var chlen = 0
  private var offsets = LongArray(0)
  private var sizes = IntArray(0)
  private var whole: ByteArray? = null
  private val cache = object : LinkedHashMap<Int, ByteArray>(64, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Int, ByteArray>?) = size > 48
  }

  init {
    val head = ByteArray(minOf(65536L, raf.length()).toInt())
    raf.seek(0); raf.readFully(head)
    val flg = head[3].toInt() and 0xff
    var p = 10
    if (flg and 4 != 0) {
      val xlen = (head[p].toInt() and 0xff) or ((head[p + 1].toInt() and 0xff) shl 8)
      var q = p + 2
      val end = q + xlen
      while (q + 4 <= end) {
        val len = (head[q + 2].toInt() and 0xff) or ((head[q + 3].toInt() and 0xff) shl 8)
        if (head[q] == 'R'.code.toByte() && head[q + 1] == 'A'.code.toByte()) {
          chlen = le16(head, q + 6)
          val cnt = le16(head, q + 8)
          sizes = IntArray(cnt) { le16(head, q + 10 + it * 2) }
        }
        q += 4 + len
      }
      p = end
    }
    if (flg and 8 != 0) { while (head[p++].toInt() != 0) {} }
    if (flg and 16 != 0) { while (head[p++].toInt() != 0) {} }
    if (flg and 2 != 0) p += 2
    if (sizes.isNotEmpty()) {
      offsets = LongArray(sizes.size)
      var off = p.toLong()
      for (i in sizes.indices) { offsets[i] = off; off += sizes[i] }
    } else {
      whole = GZIPInputStream(f.inputStream()).use { it.readBytes() } // plain gzip
    }
  }

  private fun le16(b: ByteArray, o: Int) = (b[o].toInt() and 0xff) or ((b[o + 1].toInt() and 0xff) shl 8)

  @Synchronized
  private fun chunk(i: Int): ByteArray {
    cache[i]?.let { return it }
    val comp = ByteArray(sizes[i])
    raf.seek(offsets[i]); raf.readFully(comp)
    val inf = Inflater(true)
    inf.setInput(comp)
    val out = ByteArrayOutputStream(chlen)
    val buf = ByteArray(8192)
    while (!inf.finished() && !inf.needsInput()) {
      val n = inf.inflate(buf)
      if (n == 0 && (inf.needsInput() || inf.needsDictionary())) break
      out.write(buf, 0, n)
    }
    inf.end()
    return out.toByteArray().also { cache[i] = it }
  }

  override fun read(offset: Long, size: Int): ByteArray {
    whole?.let { return it.copyOfRange(offset.toInt(), minOf(it.size, (offset + size).toInt())) }
    val first = (offset / chlen).toInt()
    val last = ((offset + size - 1) / chlen).toInt()
    val bo = ByteArrayOutputStream(size + chlen)
    for (i in first..minOf(last, sizes.size - 1)) bo.write(chunk(i))
    val all = bo.toByteArray()
    val start = (offset - first.toLong() * chlen).toInt()
    return all.copyOfRange(start, minOf(all.size, start + size))
  }
}

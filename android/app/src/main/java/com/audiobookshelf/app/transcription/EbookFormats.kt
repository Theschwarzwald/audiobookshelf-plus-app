package com.audiobookshelf.app.transcription

import java.io.ByteArrayOutputStream
import java.io.File
import java.io.RandomAccessFile
import java.nio.charset.Charset
import java.util.zip.ZipFile

/**
 * Text extraction for the ebook formats the spelling check can compare against:
 * EPUB, iBooks (.ibooks, EPUB-based), MOBI / AZW / AZW3 / PRC (PalmDB, KF8), KFX / KFX-ZIP / KFB,
 * and DjVu (.djvu / .djv / .jvu, only when the file has an OCR text layer).
 *
 * Kindle books bought from Amazon are usually DRM-protected; those can't be read and are reported
 * as such (nothing here removes DRM).
 *
 * MOBI HUFF/CDIC and DjVu BZZ decoding are ported from calibre (GPLv3, Kovid Goyal, Anthon van der
 * Neut; BZZ originally from DjVuLibre, GPLv2+). The KFX container layout follows the KFX Input
 * plugin by John Howell (GPLv3). Pure JVM code, no Android APIs.
 */
object EbookReader {
  val supportedExtensions = setOf("epub", "ibooks", "mobi", "azw", "azw3", "prc", "kfx", "kfb", "kfx-zip", "kpf", "djvu", "djv", "jvu")

  enum class Kind { EPUB, MOBI, KFX, KFX_ZIP, DJVU, UNKNOWN }

  fun detect(file: File): Kind {
    val head = ByteArray(80)
    val n = file.inputStream().use { it.read(head) }
    if (n >= 4 && head[0] == 'P'.code.toByte() && head[1] == 'K'.code.toByte()) {
      return try {
        ZipFile(file).use { z ->
          when {
            z.getEntry("META-INF/container.xml") != null -> Kind.EPUB
            z.entries().asSequence().any { it.name.lowercase().endsWith(".kfx") || it.name.lowercase().endsWith(".kdf") } -> Kind.KFX_ZIP
            else -> Kind.UNKNOWN
          }
        }
      } catch (e: Exception) { Kind.UNKNOWN }
    }
    if (n >= 4 && String(head, 0, 4, Charsets.ISO_8859_1) == "CONT") return Kind.KFX
    if (n >= 8 && String(head, 0, 8, Charsets.ISO_8859_1) == "AT&TFORM") return Kind.DJVU
    if (n >= 68) {
      val typeCreator = String(head, 60, 8, Charsets.ISO_8859_1)
      if (typeCreator == "BOOKMOBI" || typeCreator == "TEXtREAd") return Kind.MOBI
    }
    return Kind.UNKNOWN
  }

  /** Reads any supported format into reading-order sections. */
  fun read(file: File): List<EbookSection> = when (detect(file)) {
    Kind.EPUB -> EpubText.read(file)
    Kind.MOBI -> MobiText.read(file)
    Kind.KFX -> KfxText.read(listOf(file.readBytes()))
    Kind.KFX_ZIP -> ZipFile(file).use { z ->
      if (z.entries().asSequence().any { it.name.lowercase().endsWith(".kdf") } &&
        z.entries().asSequence().none { it.name.lowercase().endsWith(".kfx") }
      ) throw UnsupportedEbookException("Kindle Create (KPF) projects can't be compared. Export the book as EPUB instead.")
      KfxText.read(z.entries().asSequence().filter { it.name.lowercase().endsWith(".kfx") }.map { e -> z.getInputStream(e).use { it.readBytes() } }.toList())
    }
    Kind.DJVU -> DjvuText.read(file)
    Kind.UNKNOWN -> throw UnsupportedEbookException("This ebook format isn't supported for the spelling check")
  }

  /** Splits plain text (with blank lines between paragraphs) into chapter-sized sections. */
  fun sectionsFromParts(parts: List<Pair<String?, String>>): List<EbookSection> {
    // Merge very small parts (title pages, short scene breaks) into the next one
    val out = ArrayList<EbookSection>()
    var pendingTitle: String? = null
    val pending = StringBuilder()
    fun flush(force: Boolean) {
      val text = pending.toString().trim()
      if (text.isEmpty()) return
      val words = text.split(Regex("\\s+")).size
      if (!force && words < 150) return
      out.add(EbookSection(out.size, pendingTitle ?: "Section ${out.size + 1}", "part-${out.size}", text))
      pending.setLength(0)
      pendingTitle = null
    }
    for ((title, text) in parts) {
      if (pendingTitle == null) pendingTitle = title
      pending.append(text).append("\n")
      flush(false)
    }
    flush(true)
    if (out.isEmpty()) throw UnsupportedEbookException("No readable text found in the ebook")
    return out
  }
}

class UnsupportedEbookException(message: String) : Exception(message)

/** Groups word lists into ~[target]-word chunks (used when a format has no chapter structure). */
internal fun chunkByWords(pages: List<String>, target: Int = 2500): List<Pair<String?, String>> {
  val chapterHead = Regex("^\\s*(chapter|part|book|prologue|epilogue|kapitel|chapitre|cap[ií]tulo)\\b.*", RegexOption.IGNORE_CASE)
  val out = ArrayList<Pair<String?, String>>()
  val sb = StringBuilder()
  var title: String? = null
  var words = 0
  for (p in pages) {
    val firstLine = p.trim().lineSequence().firstOrNull()?.trim() ?: ""
    val isHeading = firstLine.length in 1..60 && chapterHead.matches(firstLine)
    if ((isHeading && words > 300) || words >= target) {
      out.add(title to sb.toString())
      sb.setLength(0)
      words = 0
      title = null
    }
    if (title == null && isHeading) title = firstLine
    sb.append(p).append("\n")
    words += p.split(Regex("\\s+")).size
  }
  if (sb.isNotBlank()) out.add(title to sb.toString())
  return out
}

// ============================================================================================
// MOBI / AZW / AZW3 / PRC
// ============================================================================================
object MobiText {
  private fun u16(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)
  private fun u32(b: ByteArray, o: Int) = ((b[o].toLong() and 0xFF) shl 24) or ((b[o + 1].toLong() and 0xFF) shl 16) or
    ((b[o + 2].toLong() and 0xFF) shl 8) or (b[o + 3].toLong() and 0xFF)

  fun read(file: File): List<EbookSection> {
    val data = file.readBytes()
    val html = extractHtml(data)
    return splitChapters(html)
  }

  fun extractHtml(data: ByteArray): String {
    if (data.size < 86) throw UnsupportedEbookException("The MOBI file is too short")
    val ident = String(data, 60, 8, Charsets.ISO_8859_1)
    val numRecords = u16(data, 76)
    val offsets = IntArray(numRecords + 1)
    for (i in 0 until numRecords) offsets[i] = u32(data, 78 + i * 8).toInt()
    offsets[numRecords] = data.size
    fun record(i: Int): ByteArray = data.copyOfRange(offsets[i], offsets[i + 1])

    val r0 = record(0)
    val compression = u16(r0, 0)
    val textRecords = u16(r0, 8)
    val encryption = u16(r0, 12)
    if (encryption != 0) throw UnsupportedEbookException("This Kindle book is DRM-protected, so its text can't be read")

    var codec: Charset = Charset.forName("windows-1252")
    var extraFlags = 0
    var huffOffset = 0
    var huffCount = 0
    if (r0.size > 16 && String(r0, 16, 4, Charsets.ISO_8859_1) == "MOBI") {
      val headerLen = u32(r0, 20).toInt()
      val codepage = u32(r0, 28).toInt()
      if (codepage == 65001) codec = Charsets.UTF_8
      if (ident != "TEXtREAd" && headerLen >= 0xE4 && headerLen <= 500 && r0.size >= 0xF4) extraFlags = u16(r0, 0xF2)
      if (compression == 17480 && r0.size >= 0x78) {
        huffOffset = u32(r0, 0x70).toInt()
        huffCount = u32(r0, 0x74).toInt()
      }
    }

    val huff = if (compression == 17480) HuffCdic(listOf(record(huffOffset)) + (1 until huffCount).map { record(huffOffset + it) }) else null
    val out = ByteArrayOutputStream()
    for (i in 1..minOf(textRecords, numRecords - 1)) {
      var rec = record(i)
      rec = rec.copyOf(rec.size - trailingSize(rec, extraFlags))
      val text = when (compression) {
        1 -> rec
        2 -> palmDocDecompress(rec)
        17480 -> huff!!.unpack(rec)
        else -> throw UnsupportedEbookException("Unknown MOBI compression ($compression)")
      }
      out.write(text)
    }
    var s = String(out.toByteArray(), codec)
    s = s.replace("\u0000", "")
    return s
  }

  private fun trailingSize(data: ByteArray, extraFlags: Int): Int {
    fun entry(psizeIn: Int): Int {
      var psize = psizeIn
      var bitpos = 0
      var result = 0
      while (psize > 0) {
        val v = data[psize - 1].toInt() and 0xFF
        result = result or ((v and 0x7F) shl bitpos)
        bitpos += 7
        psize -= 1
        if ((v and 0x80) != 0 || bitpos >= 28 || psize == 0) return result
      }
      return result
    }
    var num = 0
    val size = data.size
    var flags = extraFlags shr 1
    while (flags != 0) {
      if (flags and 1 != 0) num += entry(size - num)
      flags = flags shr 1
    }
    if (extraFlags and 1 != 0) {
      val off = size - num - 1
      if (off >= 0) num += (data[off].toInt() and 0x3) + 1
    }
    return num.coerceIn(0, size)
  }

  fun palmDocDecompress(input: ByteArray): ByteArray {
    val out = ByteArrayOutputStream(input.size * 2)
    var buf = ByteArray(input.size * 8 + 16)
    var o = 0
    fun put(b: Int) {
      if (o >= buf.size) buf = buf.copyOf(buf.size * 2)
      buf[o++] = b.toByte()
    }
    var i = 0
    while (i < input.size) {
      var c = input[i++].toInt() and 0xFF
      when {
        c in 1..8 -> { while (c-- > 0 && i < input.size) put(input[i++].toInt()) }
        c <= 0x7F -> put(c)
        c >= 0xC0 -> { put(' '.code); put(c xor 0x80) }
        i < input.size -> {
          c = (c shl 8) + (input[i++].toInt() and 0xFF)
          val di = (c and 0x3FFF) shr 3
          if (di in 1..o) {
            var n = (c and 7) + 3
            while (n-- > 0) { put(buf[o - di].toInt()) }
          }
        }
      }
    }
    out.write(buf, 0, o)
    return out.toByteArray()
  }

  /** Splits MOBI HTML at page breaks / chapter headings. */
  fun splitChapters(html: String): List<EbookSection> {
    val breakRe = Regex("(?i)<mbp:pagebreak[^>]*>|(?=<h[12][\\s>])")
    val parts = html.split(breakRe).map { chunk ->
      val title = HtmlText.firstHeading(chunk)
      title to HtmlText.toText(chunk)
    }.filter { it.second.isNotBlank() }
    return EbookReader.sectionsFromParts(parts)
  }

  /** HUFF/CDIC decompression (calibre's huffcdic.py, by darkninja and igorsk). */
  class HuffCdic(records: List<ByteArray>) {
    private val dict1Len = IntArray(256)
    private val dict1Term = BooleanArray(256)
    private val dict1Max = LongArray(256)
    private val mincode = LongArray(33)
    private val maxcode = LongArray(33)
    private val dictionary = ArrayList<ByteArray?>()
    private val dictFlag = ArrayList<Boolean>()

    init {
      val huff = records[0]
      if (String(huff, 0, 4, Charsets.ISO_8859_1) != "HUFF") throw UnsupportedEbookException("Invalid HUFF header")
      val off1 = u32(huff, 8).toInt()
      val off2 = u32(huff, 12).toInt()
      for (i in 0 until 256) {
        val v = u32(huff, off1 + i * 4)
        val codelen = (v and 0x1F).toInt()
        dict1Len[i] = codelen
        dict1Term[i] = (v and 0x80) != 0L
        dict1Max[i] = (((v shr 8) + 1) shl (32 - codelen)) - 1
      }
      mincode[0] = 0
      maxcode[0] = (1L shl 32) - 1
      for (codelen in 1..32) {
        mincode[codelen] = u32(huff, off2 + (codelen - 1) * 8) shl (32 - codelen)
        maxcode[codelen] = ((u32(huff, off2 + (codelen - 1) * 8 + 4) + 1) shl (32 - codelen)) - 1
      }
      for (cdic in records.drop(1)) {
        if (String(cdic, 0, 4, Charsets.ISO_8859_1) != "CDIC") throw UnsupportedEbookException("Invalid CDIC header")
        val phrases = u32(cdic, 8).toInt()
        val bits = u32(cdic, 12).toInt()
        val n = minOf(1 shl bits, phrases - dictionary.size)
        for (k in 0 until n) {
          val off = u16(cdic, 16 + k * 2)
          val blen = u16(cdic, 16 + off)
          dictionary.add(cdic.copyOfRange(18 + off, minOf(cdic.size, 18 + off + (blen and 0x7FFF))))
          dictFlag.add(blen and 0x8000 != 0)
        }
      }
    }

    fun unpack(input: ByteArray): ByteArray {
      val data = input.copyOf(input.size + 8)
      var bitsleft = input.size.toLong() * 8
      var pos = 0
      fun q(p: Int): Long {
        var x = 0L
        for (k in 0 until 8) x = (x shl 8) or (data[p + k].toLong() and 0xFF)
        return x
      }
      var x = q(pos)
      var n = 32
      val out = ByteArrayOutputStream()
      while (true) {
        if (n <= 0) {
          pos += 4
          x = q(pos)
          n += 32
        }
        val code = (x ushr n) and 0xFFFFFFFFL
        var codelen = dict1Len[(code ushr 24).toInt()]
        var mc = dict1Max[(code ushr 24).toInt()]
        if (!dict1Term[(code ushr 24).toInt()]) {
          while (codelen < 32 && code < mincode[codelen]) codelen++
          mc = maxcode[codelen]
        }
        n -= codelen
        bitsleft -= codelen
        if (bitsleft < 0) break
        val r = ((mc - code) ushr (32 - codelen)).toInt()
        if (r < 0 || r >= dictionary.size) break
        var slice = dictionary[r] ?: break
        if (!dictFlag[r]) {
          dictionary[r] = null
          slice = unpack(slice)
          dictionary[r] = slice
          dictFlag[r] = true
        }
        out.write(slice)
      }
      return out.toByteArray()
    }
  }
}

// ============================================================================================
// DjVu (OCR text layer: TXTz / TXTa chunks)
// ============================================================================================
object DjvuText {
  fun read(file: File): List<EbookSection> {
    val data = file.readBytes()
    val pages = ArrayList<String>()
    // Skip "AT&T", then walk IFF chunks
    walk(data, 4, data.size, pages)
    if (pages.isEmpty() || pages.all { it.isBlank() }) {
      throw UnsupportedEbookException("This DjVu file has no text layer (it's only scanned images), so it can't be compared")
    }
    return EbookReader.sectionsFromParts(chunkByWords(pages))
  }

  private fun be32(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 24) or ((b[o + 1].toInt() and 0xFF) shl 16) or
    ((b[o + 2].toInt() and 0xFF) shl 8) or (b[o + 3].toInt() and 0xFF)

  private fun walk(b: ByteArray, startIn: Int, end: Int, pages: MutableList<String>) {
    var pos = startIn
    while (pos + 8 <= end) {
      val type = String(b, pos, 4, Charsets.ISO_8859_1)
      val size = be32(b, pos + 4)
      val dataStart = pos + 8
      val dataEnd = minOf(end, dataStart + size)
      if (size < 0) return
      when (type) {
        "FORM" -> walk(b, dataStart + 4, dataEnd, pages)
        "TXTz" -> pages.add(textChunk(BzzDecoder(b.copyOfRange(dataStart, dataEnd)).decodeAll()))
        "TXTa" -> pages.add(textChunk(b.copyOfRange(dataStart, dataEnd)))
      }
      pos = dataStart + size + (size and 1)
    }
  }

  private fun textChunk(res: ByteArray): String {
    if (res.size < 3) return ""
    val len = ((res[0].toInt() and 0xFF) shl 16) or ((res[1].toInt() and 0xFF) shl 8) or (res[2].toInt() and 0xFF)
    return String(res, 3, minOf(len, res.size - 3), Charsets.UTF_8)
  }
}

/** DjVu BZZ decompressor (ZP-coder + Burrows-Wheeler), ported from calibre's djvubzzdec.py. */
class BzzDecoder(private val input: ByteArray) {
  companion object {
    private const val FREQMAX = 4
    private const val CTXIDS = 3
    private const val MAXBLOCK = 4096
  private val ZP_P = intArrayOf(32768, 32768, 32768, 27581, 27581, 23877, 23877, 20921, 20921, 18451, 18451, 16341, 16341, 14513, 14513, 12917, 12917, 11517, 11517, 10277, 10277, 9131, 9131, 8071, 8071, 7099, 7099, 6213, 6213, 5411, 5411, 4691, 4691, 4047, 4047, 3477, 3477, 2973, 2973, 2531, 2531, 2145, 2145, 1809, 1809, 1521, 1521, 1273, 1273, 1061, 1061, 881, 881, 729, 729, 601, 601, 493, 493, 403, 403, 329, 329, 267, 267, 213, 213, 165, 165, 123, 123, 87, 87, 59, 59, 35, 35, 19, 19, 7, 7, 1, 1, 22165, 9454, 32768, 3376, 18458, 1153, 13689, 378, 9455, 123, 6520, 40, 4298, 13, 2909, 52, 1930, 160, 1295, 279, 856, 490, 564, 324, 371, 564, 245, 851, 161, 1477, 282, 975, 426, 645, 646, 427, 979, 282, 1477, 186, 2221, 122, 3276, 491, 4866, 742, 7041, 1118, 9455, 1680, 10341, 2526, 14727, 3528, 11417, 4298, 15199, 2909, 22165, 1930, 32768, 1295, 9454, 856, 3376, 564, 1153, 371, 378, 245, 123, 161, 40, 282, 13, 426, 52, 646, 160, 979, 279, 1477, 490, 2221, 324, 3276, 564, 4866, 851, 7041, 1477, 9455, 975, 11124, 645, 8221, 427, 5909, 282, 4023, 186, 2663, 491, 1767, 742, 1174, 1118, 781, 1680, 518, 2526, 341, 3528, 225, 11124, 148, 8221, 392, 5909, 594, 4023, 899, 2663, 1351, 1767, 2018, 1174, 3008, 781, 4472, 518, 6618, 341, 9455, 225, 12814, 148, 17194, 392, 17533, 594, 24270, 899, 32768, 1351, 18458, 2018, 13689, 3008, 9455, 4472, 6520, 6618, 10341, 9455, 14727, 12814, 11417, 17194, 15199, 17533, 22165, 24270, 32768, 32768, 22165, 18458, 18458, 0, 0, 0, 0, 0)
  private val ZP_M = intArrayOf(0, 0, 0, 4261, 4261, 7976, 7976, 11219, 11219, 14051, 14051, 16524, 16524, 18685, 18685, 20573, 20573, 22224, 22224, 23665, 23665, 24923, 24923, 26021, 26021, 26978, 26978, 27810, 27810, 28532, 28532, 29158, 29158, 29700, 29700, 30166, 30166, 30568, 30568, 30914, 30914, 31210, 31210, 31463, 31463, 31678, 31678, 31861, 31861, 32015, 32015, 32145, 32145, 32254, 32254, 32346, 32346, 32422, 32422, 32486, 32486, 32538, 32538, 32581, 32581, 32619, 32619, 32653, 32653, 32682, 32682, 32707, 32707, 32727, 32727, 32743, 32743, 32754, 32754, 32762, 32762, 32767, 32767, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
  private val ZP_UP = intArrayOf(84, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 81, 82, 9, 86, 5, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 82, 99, 76, 101, 70, 103, 66, 105, 106, 107, 66, 109, 60, 111, 56, 69, 114, 65, 116, 61, 118, 57, 120, 53, 122, 49, 124, 43, 72, 39, 60, 33, 56, 29, 52, 23, 48, 23, 42, 137, 38, 21, 140, 15, 142, 9, 144, 141, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 70, 157, 66, 81, 62, 75, 58, 69, 54, 65, 50, 167, 44, 65, 40, 59, 34, 55, 30, 175, 24, 177, 178, 179, 180, 181, 182, 183, 184, 69, 186, 59, 188, 55, 190, 51, 192, 47, 194, 41, 196, 37, 198, 199, 72, 201, 62, 203, 58, 205, 54, 207, 50, 209, 46, 211, 40, 213, 36, 215, 30, 217, 26, 219, 20, 71, 14, 61, 14, 57, 8, 53, 228, 49, 230, 45, 232, 39, 234, 35, 138, 29, 24, 25, 240, 19, 22, 13, 16, 13, 10, 7, 244, 249, 10, 89, 230, 0, 0, 0, 0, 0)
  private val ZP_DN = intArrayOf(145, 4, 3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 85, 226, 6, 176, 143, 138, 141, 112, 135, 104, 133, 100, 129, 98, 127, 72, 125, 102, 123, 60, 121, 110, 119, 108, 117, 54, 115, 48, 113, 134, 59, 132, 55, 130, 51, 128, 47, 126, 41, 62, 37, 66, 31, 54, 25, 50, 131, 46, 17, 40, 15, 136, 7, 32, 139, 172, 9, 170, 85, 168, 248, 166, 247, 164, 197, 162, 95, 160, 173, 158, 165, 156, 161, 60, 159, 56, 71, 52, 163, 48, 59, 42, 171, 38, 169, 32, 53, 26, 47, 174, 193, 18, 191, 222, 189, 218, 187, 216, 185, 214, 61, 212, 53, 210, 49, 208, 45, 206, 39, 204, 195, 202, 31, 200, 243, 64, 239, 56, 237, 52, 235, 48, 233, 44, 231, 38, 229, 34, 227, 28, 225, 22, 223, 16, 221, 220, 63, 8, 55, 224, 51, 2, 47, 87, 43, 246, 37, 244, 33, 238, 27, 236, 21, 16, 15, 8, 241, 242, 7, 10, 245, 2, 1, 83, 250, 2, 143, 246, 0, 0, 0, 0, 0)
  private val XMTF = intArrayOf(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255)
  }

  private var inptr = 0
  private var byte = 0
  private var scount = 0
  private var delay = 25
  private var a = 0
  private var code = 0
  private var fence = 0
  private var bufint = 0L
  private val ctx = IntArray(300)
  private val ffzt = IntArray(256)

  init {
    for (i in 0 until 256) {
      var j = i
      while (j and 0x80 != 0) {
        ffzt[i]++
        j = (j shl 1) and 0xFF
      }
    }
    if (!readByte()) byte = 0xFF
    code = byte shl 8
    if (!readByte()) byte = 0xFF
    code = code or byte
    preload()
    fence = if (code >= 0x8000) 0x7FFF else code
  }

  fun decodeAll(maxBytes: Int = 64 * 1024 * 1024): ByteArray {
    val out = ByteArrayOutputStream()
    while (out.size() < maxBytes) {
      val block = decodeBlock() ?: break
      out.write(block)
    }
    return out.toByteArray()
  }

  private fun readByte(): Boolean {
    if (inptr >= input.size) return false
    byte = input[inptr++].toInt() and 0xFF
    return true
  }

  private fun preload() {
    while (scount <= 24) {
      if (!readByte()) {
        byte = 0xFF
        delay--
        if (delay < 1) throw IllegalStateException("BZZ: unexpected end of data")
      }
      bufint = ((bufint shl 8) or byte.toLong()) and 0xFFFFFFFFFFFFL
      scount += 8
    }
  }

  private fun ffz(): Int = if (a >= 0xFF00) ffzt[a and 0xFF] + 8 else ffzt[(a shr 8) and 0xFF]

  private fun adjustFence() { fence = if (code >= 0x8000) 0x7FFF else code }

  private fun decodeSubSimple(mps: Int, zIn: Int): Int {
    var z = zIn
    return if (z > code) {
      z = 0x10000 - z
      a += z
      code += z
      val shift = ffz()
      scount -= shift
      a = (a shl shift) and 0xFFFF
      code = ((code shl shift) or ((bufint shr scount) and ((1L shl shift) - 1)).toInt()) and 0xFFFF
      if (scount < 16) preload()
      adjustFence()
      mps xor 1
    } else {
      scount -= 1
      a = (z shl 1) and 0xFFFF
      code = ((code shl 1) or ((bufint shr scount) and 1L).toInt()) and 0xFFFF
      if (scount < 16) preload()
      adjustFence()
      mps
    }
  }

  private fun decoder(): Int = decodeSubSimple(0, 0x8000 + (a shr 1))

  private fun decodeSub(index: Int, zIn: Int): Int {
    var z = zIn
    val bit = ctx[index] and 1
    val d = 0x6000 + ((z + a) shr 2)
    if (z > d) z = d
    return if (z > code) {
      z = 0x10000 - z
      a += z
      code += z
      ctx[index] = ZP_DN[ctx[index]]
      val shift = ffz()
      scount -= shift
      a = (a shl shift) and 0xFFFF
      code = ((code shl shift) or ((bufint shr scount) and ((1L shl shift) - 1)).toInt()) and 0xFFFF
      if (scount < 16) preload()
      adjustFence()
      bit xor 1
    } else {
      if (a >= ZP_M[ctx[index]]) ctx[index] = ZP_UP[ctx[index]]
      scount -= 1
      a = (z shl 1) and 0xFFFF
      code = ((code shl 1) or ((bufint shr scount) and 1L).toInt()) and 0xFFFF
      if (scount < 16) preload()
      adjustFence()
      bit
    }
  }

  private fun zc(index: Int): Int {
    val z = a + ZP_P[ctx[index]]
    return if (z <= fence) {
      a = z
      ctx[index] and 1
    } else decodeSub(index, z)
  }

  private fun decodeRaw(bits: Int): Int {
    var n = 1
    val m = 1 shl bits
    while (n < m) n = (n shl 1) or decoder()
    return n - m
  }

  private fun decodeBinary(index: Int, bits: Int): Int {
    var n = 1
    val m = 1 shl bits
    while (n < m) n = (n shl 1) or zc(index + n - 1)
    return n - m
  }

  /** Decodes one block; returns its bytes, or null at the end of the stream. */
  private fun decodeBlock(): ByteArray? {
    val xsize = decodeRaw(24)
    if (xsize == 0) return null
    if (xsize > MAXBLOCK * 1024) throw IllegalStateException("BZZ: corrupt block")
    val buf = IntArray(xsize)
    var fshift = 0
    if (decoder() != 0) {
      fshift++
      if (decoder() != 0) fshift++
    }
    val mtf = XMTF.copyOf()
    val freq = IntArray(FREQMAX)
    var fadd = 4
    var mtfno = 3
    var markerpos = -1
    for (i in 0 until xsize) {
      val ctxid = minOf(CTXIDS - 1, mtfno)
      when {
        zc(ctxid) != 0 -> { mtfno = 0; buf[i] = mtf[mtfno] }
        zc(ctxid + CTXIDS) != 0 -> { mtfno = 1; buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS) != 0 -> { mtfno = 2 + decodeBinary(2 * CTXIDS + 1, 1); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 2) != 0 -> { mtfno = 4 + decodeBinary(2 * CTXIDS + 2 + 1, 2); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 6) != 0 -> { mtfno = 8 + decodeBinary(2 * CTXIDS + 6 + 1, 3); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 14) != 0 -> { mtfno = 16 + decodeBinary(2 * CTXIDS + 14 + 1, 4); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 30) != 0 -> { mtfno = 32 + decodeBinary(2 * CTXIDS + 30 + 1, 5); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 62) != 0 -> { mtfno = 64 + decodeBinary(2 * CTXIDS + 62 + 1, 6); buf[i] = mtf[mtfno] }
        zc(2 * CTXIDS + 126) != 0 -> { mtfno = 128 + decodeBinary(2 * CTXIDS + 126 + 1, 7); buf[i] = mtf[mtfno] }
        else -> { mtfno = 256; buf[i] = 0; markerpos = i; continue }
      }
      fadd += (fadd shr fshift)
      if (fadd > 0x10000000) {
        fadd = fadd shr 24
        for (k in 0 until FREQMAX) freq[k] = freq[k] shr 24
      }
      var fc = fadd
      if (mtfno < FREQMAX) fc += freq[mtfno]
      var k = mtfno
      while (k >= FREQMAX) { mtf[k] = mtf[k - 1]; k-- }
      while (k > 0 && fc >= freq[k - 1]) { mtf[k] = mtf[k - 1]; freq[k] = freq[k - 1]; k-- }
      mtf[k] = buf[i]
      freq[k] = fc
    }
    if (markerpos < 1 || markerpos >= xsize) throw IllegalStateException("BZZ: corrupt block")
    val posn = IntArray(xsize)
    val count = IntArray(256)
    for (i in 0 until markerpos) { val c = buf[i]; posn[i] = (c shl 24) or (count[c] and 0xFFFFFF); count[c]++ }
    for (i in markerpos + 1 until xsize) { val c = buf[i]; posn[i] = (c shl 24) or (count[c] and 0xFFFFFF); count[c]++ }
    var last = 1
    for (i in 0 until 256) { val tmp = count[i]; count[i] = last; last += tmp }
    var i = 0
    last = xsize - 1
    val out = ByteArray(xsize - 1)
    while (last > 0) {
      val n = posn[i]
      val c = n ushr 24
      last--
      out[last] = c.toByte()
      i = count[c] + (n and 0xFFFFFF)
    }
    if (i != markerpos) throw IllegalStateException("BZZ: corrupt block")
    return out
  }
}

// ============================================================================================
// KFX (Amazon Ion based)
// ============================================================================================
object KfxText {
  private class Annot(val ids: List<Int>, val value: Any?)
  private class Sym(val id: Int)

  private val DRMION = byteArrayOf(0xEA.toByte(), 'D'.code.toByte(), 'R'.code.toByte(), 'M'.code.toByte(), 'I'.code.toByte(), 'O'.code.toByte(), 'N'.code.toByte(), 0xEE.toByte())

  private fun le16(b: ByteArray, o: Int) = (b[o].toInt() and 0xFF) or ((b[o + 1].toInt() and 0xFF) shl 8)
  private fun le32(b: ByteArray, o: Int) = (b[o].toLong() and 0xFF) or ((b[o + 1].toLong() and 0xFF) shl 8) or
    ((b[o + 2].toLong() and 0xFF) shl 16) or ((b[o + 3].toLong() and 0xFF) shl 24)
  private fun le64(b: ByteArray, o: Int) = le32(b, o) or (le32(b, o + 4) shl 32)

  // ---- minimal Ion binary reader ----
  private class Ion(val b: ByteArray, var pos: Int, val end: Int) {
    fun varUInt(): Long {
      var r = 0L
      while (pos < end) {
        val x = b[pos++].toInt() and 0xFF
        r = (r shl 7) or (x and 0x7F).toLong()
        if (x and 0x80 != 0) break
      }
      return r
    }

    fun uint(len: Int): Long {
      var r = 0L
      for (k in 0 until len) r = (r shl 8) or (b[pos + k].toLong() and 0xFF)
      return r
    }

    /** Reads the next value, or returns Unit for padding / version markers. */
    fun value(): Any? {
      val td = b[pos++].toInt() and 0xFF
      if (td == 0xE0 && pos + 3 <= end && b[pos] == 0x01.toByte() && b[pos + 1] == 0x00.toByte() && b[pos + 2] == 0xEA.toByte()) {
        pos += 3
        return Unit // binary version marker
      }
      val t = td shr 4
      val l = td and 0x0F
      if (t == 1) return if (l == 15) null else l == 1
      if (l == 15) return null
      var len = when {
        t == 0xD && l == 1 -> varUInt().toInt()
        l == 14 -> varUInt().toInt()
        else -> l
      }
      val start = pos
      if (start + len > end) throw IllegalStateException("Ion value runs past the end")
      val v: Any? = when (t) {
        0 -> Unit // padding
        2 -> uint(len)
        3 -> -uint(len)
        4 -> if (len == 4) java.lang.Float.intBitsToFloat(uint(4).toInt()).toDouble() else if (len == 8) java.lang.Double.longBitsToDouble(uint(8)) else 0.0
        7 -> Sym(uint(len).toInt())
        8 -> String(b, start, len, Charsets.UTF_8)
        0xB, 0xC -> {
          val inner = Ion(b, start, start + len)
          val list = ArrayList<Any?>()
          while (inner.pos < inner.end) { val x = inner.value(); if (x != Unit) list.add(x) }
          list
        }
        0xD -> {
          val inner = Ion(b, start, start + len)
          val map = LinkedHashMap<Int, Any?>()
          while (inner.pos < inner.end) {
            val field = inner.varUInt().toInt()
            val x = inner.value()
            if (x != Unit) map[field] = x
          }
          map
        }
        0xE -> {
          val inner = Ion(b, start, start + len)
          val annLen = inner.varUInt().toInt()
          val annEnd = inner.pos + annLen
          val ids = ArrayList<Int>()
          while (inner.pos < annEnd) ids.add(inner.varUInt().toInt())
          Annot(ids, inner.value())
        }
        else -> Unit // decimal, timestamp, clob, blob: not needed for text
      }
      pos = start + len
      return v
    }
  }

  private fun parseSingle(b: ByteArray, from: Int, to: Int): Any? {
    val ion = Ion(b, from, to)
    while (ion.pos < ion.end) {
      val v = ion.value()
      if (v != Unit) return unwrap(v)
    }
    return null
  }

  private fun unwrap(v: Any?): Any? = if (v is Annot) unwrap(v.value) else v

  @Suppress("UNCHECKED_CAST")
  private fun struct(v: Any?): Map<Int, Any?>? = unwrap(v) as? Map<Int, Any?>
  private fun symId(v: Any?): Int? = when (val u = unwrap(v)) { is Sym -> u.id; is String -> u.hashCode(); else -> null }

  private data class Fragment(val id: Int, val type: Int, val value: Any?)

  private fun parseContainer(data: ByteArray): List<Fragment> {
    if (String(data, 0, 4, Charsets.ISO_8859_1) != "CONT") throw UnsupportedEbookException("Not a KFX container")
    val headerLen = le32(data, 6).toInt()
    val infoOffset = le32(data, 10).toInt()
    val infoLength = le32(data, 14).toInt()
    val info = struct(parseSingle(data, infoOffset, infoOffset + infoLength)) ?: emptyMap()
    val drm = (info[411] as? Long) ?: 0L
    if (drm != 0L) throw UnsupportedEbookException("This KFX book is DRM-protected, so its text can't be read")
    val indexOffset = (info[413] as? Long)?.toInt() ?: return emptyList()
    val indexLength = (info[414] as? Long)?.toInt() ?: 0
    val out = ArrayList<Fragment>()
    var p = indexOffset
    while (p + 24 <= indexOffset + indexLength) {
      val id = le32(data, p).toInt()
      val type = le32(data, p + 4).toInt()
      val off = le64(data, p + 8).toInt()
      val len = le64(data, p + 16).toInt()
      p += 24
      val es = headerLen + off
      if (es + len > data.size || len < 10) continue
      if (String(data, es, 4, Charsets.ISO_8859_1) != "ENTY") continue
      val entHeader = le32(data, es + 6).toInt()
      val ds = es + entHeader
      if (ds + DRMION.size <= es + len && (0 until DRMION.size).all { data[ds + it] == DRMION[it] }) {
        throw UnsupportedEbookException("This KFX book is DRM-protected, so its text can't be read")
      }
      // Only text-relevant fragment types are decoded
      if (type in setOf(145, 259, 260, 538)) {
        try { out.add(Fragment(id, type, parseSingle(data, ds, es + len))) } catch (e: Exception) { /* skip bad entity */ }
      }
    }
    return out
  }

  fun read(containers: List<ByteArray>): List<EbookSection> {
    val frags = containers.flatMap { c -> if (c.size >= 18 && String(c, 0, 4, Charsets.ISO_8859_1) == "CONT") parseContainer(c) else emptyList() }
    if (frags.isEmpty()) throw UnsupportedEbookException("No readable text found in the KFX book")

    // $145 content fragments: name -> list of strings
    val content = HashMap<Int, List<String>>()
    frags.filter { it.type == 145 }.forEach { f ->
      val s = struct(f.value) ?: return@forEach
      val name = symId(s[4]) ?: f.id
      content[name] = ((s[146] as? List<*>) ?: emptyList<Any?>()).map { (unwrap(it) as? String) ?: "" }
    }
    val stories = HashMap<Int, Map<Int, Any?>>()
    frags.filter { it.type == 259 }.forEach { f -> struct(f.value)?.let { s -> stories[symId(s[176]) ?: f.id] = s } }
    val sections = LinkedHashMap<Int, Map<Int, Any?>>()
    frags.filter { it.type == 260 }.forEach { f -> struct(f.value)?.let { s -> sections[symId(s[174]) ?: f.id] = s } }

    fun textOf(ref: Any?): String? = when (val u = unwrap(ref)) {
      is String -> u
      is Map<*, *> -> {
        val name = symId(u[4]); val idx = (u[403] as? Long)?.toInt()
        if (name != null && idx != null) content[name]?.getOrNull(idx) else null
      }
      else -> null
    }

    val seenStories = HashSet<Int>()
    fun walkStory(node: Any?, sb: StringBuilder, depth: Int = 0) {
      if (depth > 60) return
      when (val u = unwrap(node)) {
        is List<*> -> u.forEach { walkStory(it, sb, depth + 1) }
        is Map<*, *> -> {
          textOf(u[145])?.let { if (it.isNotBlank()) sb.append(it).append("\n") }
          for ((k, v) in u) if (k != 145) walkStory(v, sb, depth + 1)
          // A story referenced by name inside another (e.g. sidebars)
          symId(u[176])?.let { st -> if (u[146] == null && seenStories.add(st)) stories[st]?.let { walkStory(it[146], sb, depth + 1) } }
        }
      }
    }
    fun storyNames(node: Any?, out: MutableList<Int>, depth: Int = 0) {
      if (depth > 30) return
      when (val u = unwrap(node)) {
        is List<*> -> u.forEach { storyNames(it, out, depth + 1) }
        is Map<*, *> -> {
          symId(u[176])?.let { out.add(it) }
          for ((k, v) in u) if (k != 176) storyNames(v, out, depth + 1)
        }
      }
    }

    // Reading order: document_data ($538) -> reading_orders ($169) -> sections ($170)
    val order = ArrayList<Int>()
    frags.firstOrNull { it.type == 538 }?.let { f ->
      val ro = (struct(f.value)?.get(169) as? List<*>)?.firstOrNull()
      ((struct(ro)?.get(170)) as? List<*>)?.forEach { s -> symId(s)?.let { order.add(it) } }
    }
    if (order.isEmpty()) order.addAll(sections.keys)

    val parts = ArrayList<Pair<String?, String>>()
    for (secName in order) {
      val sec = sections[secName] ?: continue
      val names = ArrayList<Int>()
      storyNames(sec[141], names)
      val sb = StringBuilder()
      for (n in names.distinct()) {
        if (!seenStories.add(n)) continue
        stories[n]?.let { walkStory(it[146], sb) }
      }
      if (sb.isNotBlank()) parts.add(null to sb.toString())
    }
    // Fallback: storylines in container order, then raw content
    if (parts.isEmpty()) {
      stories.values.forEach { s -> val sb = StringBuilder(); walkStory(s[146], sb); if (sb.isNotBlank()) parts.add(null to sb.toString()) }
    }
    if (parts.isEmpty()) {
      content.values.forEach { parts.add(null to it.joinToString("\n")) }
    }
    // Titles: use a short first line that looks like a heading
    val titled = parts.map { (_, text) ->
      val first = text.lineSequence().firstOrNull { it.isNotBlank() }?.trim()
      (if (first != null && first.length <= 60 && first.split(' ').size <= 8) first else null) to text
    }
    return EbookReader.sectionsFromParts(titled)
  }
}

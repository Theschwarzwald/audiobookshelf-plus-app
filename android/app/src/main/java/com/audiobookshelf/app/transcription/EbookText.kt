package com.audiobookshelf.app.transcription

import java.io.File
import java.net.URLDecoder
import java.util.zip.ZipFile

/** One reading-order part of an ebook (usually a chapter). */
data class EbookSection(val index: Int, val title: String, val href: String, val text: String)

/**
 * Pulls plain text out of an EPUB, section by section in reading (spine) order, with chapter
 * titles from the table of contents. Pure JVM code, no Android APIs.
 */
object EpubText {
  private val attrRe = Regex("""([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')""")

  private fun attrs(tag: String): Map<String, String> =
    attrRe.findAll(tag).associate { m -> m.groupValues[1].lowercase() to (m.groups[3]?.value ?: m.groups[4]?.value ?: "") }

  private fun tags(xml: String, name: String): List<Map<String, String>> =
    Regex("""<(?:\w+:)?$name\b[^>]*>""", RegexOption.IGNORE_CASE).findAll(xml).map { attrs(it.value) }.toList()

  private fun resolve(baseDir: String, href: String): String {
    val decoded = try { URLDecoder.decode(href.substringBefore('#'), "UTF-8") } catch (e: Exception) { href.substringBefore('#') }
    val parts = (if (baseDir.isEmpty()) decoded else "$baseDir/$decoded").split('/')
    val out = ArrayList<String>()
    for (p in parts) {
      when (p) {
        "", "." -> {}
        ".." -> if (out.isNotEmpty()) out.removeAt(out.size - 1)
        else -> out.add(p)
      }
    }
    return out.joinToString("/")
  }

  fun read(file: File): List<EbookSection> {
    ZipFile(file).use { zip ->
      fun text(path: String): String? {
        val entry = zip.getEntry(path) ?: zip.entries().asSequence().firstOrNull { it.name.equals(path, ignoreCase = true) } ?: return null
        return zip.getInputStream(entry).use { it.readBytes().toString(Charsets.UTF_8) }
      }

      val container = text("META-INF/container.xml") ?: throw IllegalStateException("Not an EPUB (no container.xml)")
      val opfPath = tags(container, "rootfile").firstOrNull()?.get("full-path")
        ?: throw IllegalStateException("EPUB has no package file")
      val opf = text(opfPath) ?: throw IllegalStateException("EPUB package file missing")
      val opfDir = opfPath.substringBeforeLast('/', "")

      val manifest = tags(opf, "item").associateBy { it["id"] ?: "" }
      val spine = tags(opf, "itemref").filter { it["linear"] != "no" }.mapNotNull { it["idref"] }

      // Titles from the EPUB3 nav document or the EPUB2 NCX
      val titles = HashMap<String, String>()
      manifest.values.firstOrNull { (it["properties"] ?: "").split(' ').contains("nav") }?.let { nav ->
        val navPath = resolve(opfDir, nav["href"] ?: "")
        val navDir = navPath.substringBeforeLast('/', "")
        text(navPath)?.let { html ->
          Regex("""<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)</a>""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
            .findAll(html).forEach { m ->
              val key = resolve(navDir, m.groupValues[1])
              val title = HtmlText.toText(m.groupValues[2]).trim()
              if (title.isNotEmpty()) titles.putIfAbsent(key, title)
            }
        }
      }
      manifest.values.firstOrNull { it["media-type"] == "application/x-dtbncx+xml" }?.let { ncx ->
        val ncxPath = resolve(opfDir, ncx["href"] ?: "")
        val ncxDir = ncxPath.substringBeforeLast('/', "")
        text(ncxPath)?.let { xml ->
          Regex("""<navPoint\b.*?<text>(.*?)</text>.*?<content\b[^>]*src\s*=\s*["']([^"']+)["']""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
            .findAll(xml).forEach { m ->
              val key = resolve(ncxDir, m.groupValues[2])
              val title = HtmlText.toText(m.groupValues[1]).trim()
              if (title.isNotEmpty()) titles.putIfAbsent(key, title)
            }
        }
      }

      val sections = ArrayList<EbookSection>()
      for (idref in spine) {
        val item = manifest[idref] ?: continue
        val type = item["media-type"] ?: ""
        if (!type.contains("html")) continue
        val path = resolve(opfDir, item["href"] ?: continue)
        val html = text(path) ?: continue
        val body = HtmlText.toText(html)
        if (body.isBlank()) continue
        val title = titles[path] ?: HtmlText.firstHeading(html) ?: "Section ${sections.size + 1}"
        sections.add(EbookSection(sections.size, title, path, body))
      }
      if (sections.isEmpty()) throw IllegalStateException("No readable text found in the ebook")
      return sections
    }
  }
}

object HtmlText {
  private val named = mapOf(
    "amp" to "&", "lt" to "<", "gt" to ">", "quot" to "\"", "apos" to "'", "nbsp" to " ",
    "rsquo" to "’", "lsquo" to "‘", "rdquo" to "”", "ldquo" to "“", "mdash" to "—", "ndash" to "–",
    "hellip" to "…", "eacute" to "é", "egrave" to "è", "aacute" to "á", "agrave" to "à", "iacute" to "í",
    "oacute" to "ó", "uacute" to "ú", "ntilde" to "ñ", "ccedil" to "ç", "uuml" to "ü", "ouml" to "ö",
    "auml" to "ä", "szlig" to "ß", "shy" to "", "copy" to "©", "reg" to "®", "trade" to "™", "zwnj" to "", "zwj" to ""
  )
  private val entityRe = Regex("&(#[xX][0-9a-fA-F]+|#\\d+|[a-zA-Z]+);")

  fun decode(s: String): String = entityRe.replace(s) { m ->
    val e = m.groupValues[1]
    try {
      when {
        e.startsWith("#x") || e.startsWith("#X") -> String(Character.toChars(e.substring(2).toInt(16)))
        e.startsWith("#") -> String(Character.toChars(e.substring(1).toInt()))
        else -> named[e] ?: m.value
      }
    } catch (ex: Exception) { m.value }
  }

  fun toText(html: String): String {
    var s = html
    s = s.replace(Regex("(?is)<head\\b.*?</head>"), " ")
    s = s.replace(Regex("(?is)<(script|style)\\b.*?</\\1>"), " ")
    s = s.replace(Regex("(?i)<br\\s*/?>|</(p|div|h[1-6]|li|tr|blockquote|section)>"), "\n")
    s = s.replace(Regex("(?s)<[^>]*>"), "")
    s = decode(s)
    return s.replace(Regex("[ \\t\\x0B\\f\\r]+"), " ").replace(Regex("\\n\\s*\\n+"), "\n").trim()
  }

  fun firstHeading(html: String): String? =
    Regex("(?is)<h[1-3]\\b[^>]*>(.*?)</h[1-3]>").find(html)?.let { toText(it.groupValues[1]).trim() }?.takeIf { it.isNotEmpty() }
}

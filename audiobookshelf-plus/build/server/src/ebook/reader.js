'use strict'
/**
 * Text extraction for the ebook formats the spelling check can compare against (same set as the app):
 * EPUB, iBooks, MOBI / AZW / AZW3 / PRC, KFX / KFX-ZIP / KFB, and DjVu with an OCR text layer.
 * DRM-protected books are reported as such; nothing here removes DRM.
 */
const fs = require('fs')
const { ZipReader } = require('./zip')

class UnsupportedEbookError extends Error {}

const supportedExtensions = new Set(['epub', 'ibooks', 'mobi', 'azw', 'azw3', 'prc', 'kfx', 'kfb', 'kfx-zip', 'kpf', 'djvu', 'djv', 'jvu'])
// Preferred first: EPUB-style formats keep the best chapter structure; DjVu text is OCR.
const priority = ['epub', 'ibooks', 'azw3', 'kfx', 'kfx-zip', 'kfb', 'mobi', 'azw', 'prc', 'djvu', 'djv', 'jvu']

function extOf(name) {
  const n = String(name || '').toLowerCase()
  if (n.endsWith('.kfx-zip')) return 'kfx-zip'
  const i = n.lastIndexOf('.')
  return i >= 0 ? n.slice(i + 1) : ''
}

function detect(buf) {
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
    try {
      const z = new ZipReader(buf)
      if (z.find('META-INF/container.xml')) return { kind: 'EPUB', zip: z }
      const names = z.names().map((n) => n.toLowerCase())
      if (names.some((n) => n.endsWith('.kfx') || n.endsWith('.kdf'))) return { kind: 'KFX_ZIP', zip: z }
    } catch (e) {}
    return { kind: 'UNKNOWN' }
  }
  if (buf.length >= 4 && buf.toString('latin1', 0, 4) === 'CONT') return { kind: 'KFX' }
  if (buf.length >= 8 && buf.toString('latin1', 0, 8) === 'AT&TFORM') return { kind: 'DJVU' }
  if (buf.length >= 68) {
    const tc = buf.toString('latin1', 60, 68)
    if (tc === 'BOOKMOBI' || tc === 'TEXtREAd') return { kind: 'MOBI' }
  }
  return { kind: 'UNKNOWN' }
}

/** Reads any supported format into reading-order sections [{ index, title, href, text }]. */
async function read(file) {
  const buf = Buffer.isBuffer(file) ? file : fs.readFileSync(file)
  const d = detect(buf)
  switch (d.kind) {
    case 'EPUB':
      return require('./epub').read(d.zip)
    case 'MOBI':
      return require('./mobi').read(buf)
    case 'KFX':
      return require('./kfx').read([buf])
    case 'KFX_ZIP': {
      const names = d.zip.names()
      const kfx = names.filter((n) => n.toLowerCase().endsWith('.kfx'))
      if (!kfx.length && names.some((n) => n.toLowerCase().endsWith('.kdf'))) {
        throw new UnsupportedEbookError("Kindle Create (KPF) projects can't be compared. Export the book as EPUB instead.")
      }
      return require('./kfx').read(kfx.map((n) => d.zip.read(n)))
    }
    case 'DJVU':
      return require('./djvu').read(buf)
    default:
      throw new UnsupportedEbookError("This ebook format isn't supported for the spelling check")
  }
}

/** Merges very small parts (title pages, short scene breaks) into the next one. */
function sectionsFromParts(parts) {
  const out = []
  let pendingTitle = null
  let pending = ''
  const flush = (force) => {
    const text = pending.trim()
    if (!text) return
    const words = text.split(/\s+/).length
    if (!force && words < 150) return
    out.push({ index: out.length, title: pendingTitle || `Section ${out.length + 1}`, href: `part-${out.length}`, text })
    pending = ''
    pendingTitle = null
  }
  for (const [title, text] of parts) {
    if (pendingTitle == null) pendingTitle = title
    pending += text + '\n'
    flush(false)
  }
  flush(true)
  if (!out.length) throw new UnsupportedEbookError('No readable text found in the ebook')
  return out
}

/** Groups pages into ~target-word chunks (formats with no chapter structure). */
function chunkByWords(pages, target = 2500) {
  const chapterHead = /^\s*(chapter|part|book|prologue|epilogue|kapitel|chapitre|cap[ií]tulo)\b.*/i
  const out = []
  let sb = ''
  let title = null
  let words = 0
  for (const p of pages) {
    const firstLine = (p.trim().split('\n')[0] || '').trim()
    const isHeading = firstLine.length >= 1 && firstLine.length <= 60 && chapterHead.test(firstLine)
    if ((isHeading && words > 300) || words >= target) {
      out.push([title, sb])
      sb = ''
      words = 0
      title = null
    }
    if (title == null && isHeading) title = firstLine
    sb += p + '\n'
    words += p.split(/\s+/).length
  }
  if (sb.trim()) out.push([title, sb])
  return out
}

module.exports = { read, detect, extOf, supportedExtensions, priority, sectionsFromParts, chunkByWords, UnsupportedEbookError }

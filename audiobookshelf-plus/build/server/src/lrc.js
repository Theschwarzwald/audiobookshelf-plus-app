'use strict'
/**
 * Transcripts as LRC files next to the audio, so any lyrics-capable player can use them too:
 *
 *   <audio name>.lrc           Lyrics: one timed line per transcript line   [mm:ss.xx]Text
 *   <audio name>_karaoke.lrc   Karaoke: every word timed, enhanced LRC with microsecond stamps
 *                              [mm:ss.ffffff]<mm:ss.ffffff>Word <mm:ss.ffffff>word … <mm:ss.ffffff>
 *
 * A book in several audio files gets a pair per file, timed from the start of that file.
 * Written when a transcription finishes and after edits (spelling fixes, a phone's upload).
 * Read back when they change on disk (someone edited them) or when a book already has LRC files and no
 * transcript; the Lyrics and Karaoke views then show what's in the files.
 *
 * Word times come from the speech engine (Whisper word timestamps, Parakeet token times) and are stored
 * to the microsecond, though the engines themselves are accurate to roughly 0.02–0.1 s. Transcripts made
 * before word times were kept get estimated word times (by position in the line), marked in the file.
 *
 * Paths: Audiobookshelf reports each audio file's path inside its container. This container must see
 * the library at the same path (mount it read-write), or set LIBRARY_PATH_MAP="/abs/path=/our/path;...".
 */
const fs = require('fs')
const path = require('path')
const log = require('./log')
const absApi = require('./absApi')

const MARK = '[re:ABS+ transcription]'

// ---------------------------------------------------------------- time formats

function stamp(sec, decimals) {
  const t = Math.max(0, sec || 0)
  const scale = Math.pow(10, decimals)
  const total = Math.round(t * scale)
  const m = Math.floor(total / (60 * scale))
  const rest = total - m * 60 * scale
  const s = Math.floor(rest / scale)
  const frac = String(rest - s * scale).padStart(decimals, '0')
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${frac}`
}

/** "mm:ss.f…" (any number of minute digits and decimals) -> seconds */
function parseStamp(s) {
  const m = String(s).match(/^(\d+):(\d{1,2})(?:[.:](\d+))?$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0)
}

// ---------------------------------------------------------------- word times

const wordRe = /[^\s]+/g

/** Words of a line with times: the engine's own, or estimated from the line's start/end */
function lineWords(l) {
  const text = l.text || ''
  const tokens = text.match(wordRe) || []
  if (Array.isArray(l.words) && l.words.length) {
    // The stored words carry the engine's text; the line text may have been corrected since (same count in
    // nearly every case). Pair them in order; any extra tokens share the last word's time.
    return tokens.map((tok, i) => {
      const w = l.words[Math.min(i, l.words.length - 1)]
      return { w: tok, s: w[1], e: w[2], measured: i < l.words.length }
    })
  }
  const end = typeof l.end === 'number' && l.end > l.start ? l.end : l.start + Math.max(1, tokens.length * 0.35)
  let pos = 0
  const total = Math.max(1, text.length)
  return tokens.map((tok) => {
    const at = text.indexOf(tok, pos)
    pos = at + tok.length
    return { w: tok, s: l.start + (at / total) * (end - l.start), e: l.start + (pos / total) * (end - l.start), measured: false }
  })
}

// ---------------------------------------------------------------- writing

function header(meta, file, durationSec) {
  const h = []
  if (meta.title) h.push(`[ti:${meta.title.replace(/[\]\n]/g, ' ')}]`)
  if (meta.author) h.push(`[ar:${meta.author.replace(/[\]\n]/g, ' ')}]`)
  h.push(`[al:${(meta.title || '').replace(/[\]\n]/g, ' ')}]`)
  if (durationSec) h.push(`[length:${stamp(durationSec, 2)}]`)
  h.push('[by:ABS+]')
  h.push(MARK)
  return h
}

/** Lyrics file for one audio file (lines already relative to that file) */
function lyricsText(meta, lines, durationSec) {
  return [...header(meta, null, durationSec), ...lines.map((l) => `[${stamp(l.start, 2)}]${l.text}`)].join('\n') + '\n'
}

/** Karaoke file: every word with a microsecond time, plus where the last word ends */
function karaokeText(meta, lines, durationSec) {
  let estimated = false
  const body = lines.map((l) => {
    const words = lineWords(l)
    if (!words.length) return `[${stamp(l.start, 6)}]${l.text}`
    if (words.some((w) => !w.measured)) estimated = true
    const last = words[words.length - 1]
    return `[${stamp(words[0].s, 6)}]` + words.map((w) => `<${stamp(w.s, 6)}>${w.w}`).join(' ') + ` <${stamp(Math.max(last.e, last.s), 6)}>`
  })
  const h = header(meta, null, durationSec)
  h.push(`[x-word-times:${estimated ? 'estimated from line times for part of the book' : 'from the speech engine'}]`)
  return [...h, ...body].join('\n') + '\n'
}

/** LIBRARY_PATH_MAP="/audiobooks=/library;/podcasts=/pods": Audiobookshelf's path -> this container's */
function mapPath(p) {
  const rules = String(process.env.LIBRARY_PATH_MAP || '')
    .split(';')
    .map((r) => r.split('='))
    .filter((r) => r.length === 2 && r[0])
  for (const [from, to] of rules) if (p === from || p.startsWith(from.replace(/\/+$/, '') + '/')) return to.replace(/\/+$/, '') + p.slice(from.replace(/\/+$/, '').length)
  return p
}

/** Audio files of a book in playback order, with their place in the book and where they are on disk */
async function audioFilesOf(itemId) {
  const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(itemId)}?expanded=1`)
  if (!item || !item.media) return { item, files: [] }
  const files = (item.media.audioFiles || []).filter((f) => !f.exclude && !f.invalid).sort((a, b) => (a.index || 0) - (b.index || 0))
  let offset = 0
  return {
    item,
    files: files.map((f) => {
      const p = mapPath((f.metadata && f.metadata.path) || '')
      const o = { path: p, start: offset, duration: f.duration || 0, name: (f.metadata && f.metadata.filename) || path.basename(p) }
      offset += f.duration || 0
      return o
    })
  }
}

const lrcPaths = (audioPath) => {
  const base = audioPath.replace(/\.[^./\\]+$/, '')
  return { lyrics: `${base}.lrc`, karaoke: `${base}_karaoke.lrc` }
}

function writeAtomic(file, text) {
  const tmp = `${file}.abs-tmp`
  fs.writeFileSync(tmp, text)
  fs.renameSync(tmp, file)
}

/** A file is ours (safe to replace or delete) when it carries the ABS+ mark */
function isOurs(file) {
  try {
    return fs.readFileSync(file, 'utf8').slice(0, 2000).includes(MARK)
  } catch (e) {
    return false
  }
}

class Lrc {
  constructor(store) {
    this.store = store
    this.timers = new Map()
    this.lastCheck = new Map()
  }

  /** Writes soon (several edits in a row write once) */
  exportSoon(key, ms = 3000) {
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        this.export(key).catch((e) => log.warn(`LRC files for ${key}: ${e.message}`))
      }, ms)
    )
  }

  /** Writes <audio>.lrc and <audio>_karaoke.lrc for every audio file of a finished transcript */
  async export(key) {
    const meta = this.store.getMeta(key)
    if (!meta || meta.status !== 'done') return { written: 0 }
    const { item, files } = await audioFilesOf(meta.libraryItemId || key)
    if (!files.length) return { written: 0 }
    const md = (item.media && item.media.metadata) || {}
    const info = { title: md.title || meta.title, author: md.authorName || (md.authors || []).map((a) => a.name).join(', ') }
    const lines = this.store.readAllLines(key)
    let written = 0
    const errors = []
    for (const f of files) {
      const p = lrcPaths(f.path)
      const end = f.start + f.duration
      const mine = lines
        .filter((l) => l.start >= f.start - 0.01 && l.start < end - 0.01)
        .map((l) => ({ start: l.start - f.start, end: Math.min(l.end, end) - f.start, text: l.text, words: l.words ? l.words.map(([w, s, e]) => [w, s - f.start, e - f.start]) : null }))
      try {
        if (!fs.existsSync(path.dirname(p.lyrics))) throw new Error(`can't see ${path.dirname(p.lyrics)} (mount the library into this container at the same path, or set LIBRARY_PATH_MAP)`)
        for (const [file, text] of [
          [p.lyrics, lyricsText(info, mine, f.duration)],
          [p.karaoke, karaokeText(info, mine, f.duration)]
        ]) {
          if (fs.existsSync(file) && !isOurs(file) && !this.importedFrom(meta, file)) throw new Error(`${path.basename(file)} already exists and wasn't made by ABS+; left as it is`)
          writeAtomic(file, text)
          written++
        }
      } catch (e) {
        errors.push(`${f.name}: ${e.code === 'EROFS' || e.code === 'EACCES' ? 'the library is read-only for this container' : e.message}`)
      }
    }
    const m2 = this.store.getMeta(key)
    if (m2) {
      m2.lrc = { at: Date.now(), files: written, error: errors[0] || null }
      this.store.saveMeta(m2)
    }
    if (written) log.info(`Wrote ${written} LRC file${written === 1 ? '' : 's'} for "${meta.title}"`)
    if (errors.length) log.warn(`LRC files for "${meta.title}": ${errors[0]}`)
    return { written, errors }
  }

  importedFrom(meta, file) {
    return !!(meta.lrc && meta.lrc.importedFiles && meta.lrc.importedFiles.includes(file))
  }

  /** Removes the LRC files ABS+ wrote (when its transcript is deleted). Files made by someone else stay. */
  async remove(key) {
    try {
      const { files } = await audioFilesOf(key)
      for (const f of files) {
        const p = lrcPaths(f.path)
        for (const file of [p.lyrics, p.karaoke]) if (isOurs(file)) fs.rmSync(file, { force: true })
      }
    } catch (e) {}
  }

  /**
   * When a book is opened: LRC files changed on disk since ABS+ wrote them (edited by hand), or a book
   * that has LRC files and no transcript, are read in, so Lyrics and Karaoke show what the files say.
   * Checked at most every 30 s per book. Returns true when the transcript changed.
   */
  async syncFromDisk(key) {
    if (Date.now() - (this.lastCheck.get(key) || 0) < 30000) return false
    this.lastCheck.set(key, Date.now())
    let meta = this.store.getMeta(key)
    if (meta && meta.status !== 'done' && meta.status !== 'none') return false // still being transcribed
    let files
    try {
      files = (await audioFilesOf(key)).files
    } catch (e) {
      return false
    }
    const found = files.map((f) => ({ f, p: lrcPaths(f.path) })).filter((x) => fs.existsSync(x.p.lyrics) || fs.existsSync(x.p.karaoke))
    if (!found.length) return false
    const writtenAt = (meta && meta.lrc && meta.lrc.at) || 0
    const newest = Math.max(...found.flatMap((x) => [x.p.lyrics, x.p.karaoke].filter((f) => fs.existsSync(f)).map((f) => fs.statSync(f).mtimeMs)))
    if (meta && meta.status === 'done' && newest <= writtenAt + 2000) return false
    if (meta && meta.status === 'done' && !found.some((x) => [x.p.lyrics, x.p.karaoke].some((f) => fs.existsSync(f) && fs.statSync(f).mtimeMs > writtenAt + 2000))) return false

    const lines = []
    for (const { f, p } of found) {
      const lyr = fs.existsSync(p.lyrics) ? parseLyrics(fs.readFileSync(p.lyrics, 'utf8')) : []
      const kar = fs.existsSync(p.karaoke) ? parseKaraoke(fs.readFileSync(p.karaoke, 'utf8')) : []
      // Karaoke lines carry the word times; the lyrics file decides the text when both exist
      const base = lyr.length ? lyr : kar.map((k) => ({ start: k.start, text: k.text }))
      base.forEach((l, i) => {
        const k = kar.find((x) => Math.abs(x.start - l.start) < 0.05) || (kar.length === base.length ? kar[i] : null)
        const next = base[i + 1]
        const end = k && k.words.length ? k.words[k.words.length - 1][2] : next ? next.start : Math.min(l.start + 5, f.duration || l.start + 5)
        lines.push({ start: f.start + l.start, end: f.start + Math.max(end, l.start), text: l.text, words: k && k.words.length ? k.words.map(([w, s, e]) => [w, f.start + s, f.start + e]) : null })
      })
    }
    if (!lines.length) return false
    lines.sort((a, b) => a.start - b.start)
    const { defaultMeta, STATUS } = require('./store')
    if (!meta) {
      meta = Object.assign(defaultMeta(key), { title: '', libraryItemId: key, origin: 'lrc', modelId: 'lrc', durationSec: files.reduce((n, f) => n + f.duration, 0) })
    }
    this.store._writeRawLines(key, lines.map((l) => this.store.constructor.lineJson(l)))
    meta.status = STATUS.DONE
    meta.linesCount = lines.length
    meta.doneSec = meta.durationSec
    meta.processedSec = meta.durationSec
    meta.lrc = { at: Date.now(), files: found.length, error: null, importedFiles: found.flatMap((x) => [x.p.lyrics, x.p.karaoke]) }
    this.store.bump(meta) // new revision: phones pick up the change
    log.info(`Read ${lines.length} lines from LRC files for ${key}`)
    return true
  }
}

/** [mm:ss.xx]Text lines (several time tags per line allowed); metadata tags and comments skipped */
function parseLyrics(text) {
  const out = []
  for (const raw of text.split(/\r?\n/)) {
    const tags = []
    let rest = raw
    let m
    while ((m = rest.match(/^\[(\d+:\d{1,2}(?:[.:]\d+)?)\]/))) {
      tags.push(parseStamp(m[1]))
      rest = rest.slice(m[0].length)
    }
    if (!tags.length) continue
    const t = rest.replace(/<\d+:\d{1,2}(?:[.:]\d+)?>/g, '').replace(/\s+/g, ' ').trim()
    if (!t) continue
    tags.forEach((s) => s != null && out.push({ start: s, text: t }))
  }
  return out.sort((a, b) => a.start - b.start)
}

/** Enhanced LRC: [line]<t>word <t>word … <end> -> { start, text, words: [[word, start, end]] } */
function parseKaraoke(text) {
  const out = []
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\[(\d+:\d{1,2}(?:[.:]\d+)?)\](.*)$/)
    if (!m) continue
    const start = parseStamp(m[1])
    const body = m[2]
    const parts = [...body.matchAll(/<(\d+:\d{1,2}(?:[.:]\d+)?)>([^<]*)/g)].map((x) => ({ t: parseStamp(x[1]), w: x[2].trim() }))
    const words = []
    parts.forEach((p, i) => {
      if (!p.w) return
      const next = parts.slice(i + 1).find((q) => q.t != null)
      words.push([p.w, p.t, next ? next.t : p.t])
    })
    const plain = body.replace(/<\d+:\d{1,2}(?:[.:]\d+)?>/g, '').replace(/\s+/g, ' ').trim()
    if (!plain) continue
    out.push({ start: words.length ? words[0][1] : start, text: plain, words })
  }
  return out.sort((a, b) => a.start - b.start)
}

module.exports = { Lrc, stamp, parseStamp, lyricsText, karaokeText, parseLyrics, parseKaraoke, lineWords, mapPath, lrcPaths }

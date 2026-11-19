'use strict'
/**
 * Transcripts on the server, in the same files the Android app uses so they can be synced as-is:
 *
 *   <DATA_DIR>/transcripts/<key>/meta.json            job state + sync fields (revision, origin, lock)
 *   <DATA_DIR>/transcripts/<key>/lines.jsonl          one {"s","e","t"} object per line
 *   <DATA_DIR>/transcripts/<key>/ebook-check.json     spelling suggestions from the ebook
 *   <DATA_DIR>/transcripts/<key>/lines.original.jsonl transcript before the first ebook correction
 *   <DATA_DIR>/transcripts/<key>/ebook-text.json      the ebook's paragraphs (for karaoke view)
 *   <DATA_DIR>/tombstones.json                        deleted keys -> last revision (so phones delete their copy)
 *
 * <key> is the Audiobookshelf library item id (the same key the app uses for a book linked to the server).
 *
 * `revision` goes up by one whenever the transcript content or its outcome changes. Phones remember the
 * revision they last synced, which is how both sides tell who changed what.
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')

const STATUS = { NONE: 'none', QUEUED: 'queued', RUNNING: 'running', PAUSED: 'paused', DONE: 'done', ERROR: 'error' }

const round2 = (x) => Math.round(x * 100) / 100
const round6 = (x) => Math.round(x * 1e6) / 1e6

function defaultMeta(key) {
  const now = Date.now()
  return {
    key,
    title: '',
    modelId: '',
    status: STATUS.NONE,
    phase: '',
    phaseProgress: 0,
    durationSec: 0,
    processedSec: 0,
    resumeSec: 0,
    firstStartSec: 0,
    pass: 0,
    doneSec: 0,
    linesCount: 0,
    speed: 0,
    error: null,
    createdAt: now,
    updatedAt: now,
    tracks: [],
    libraryItemId: key,
    chapters: [],
    ebookCheck: 'none',
    ebookCheckMessage: null,
    ebookSuggestions: 0,
    language: null,
    /** why "Automatic" picked this model */
    modelReason: null,
    // ---- sync ----
    revision: 0,
    /** server | device: where the transcription was made */
    origin: 'server',
    deviceId: null,
    deviceName: null,
    /** { deviceId, deviceName, at } while a phone is transcribing this book */
    lock: null,
    createdBy: null
  }
}

/** Same shape as TranscriptMeta.toJs() in the app, plus the sync fields. */
function toJs(meta, { lockMs = config.deviceLockMs, now = Date.now() } = {}) {
  const ranges = []
  if (meta.pass === 0) {
    ranges.push([meta.firstStartSec, Math.max(meta.firstStartSec, meta.resumeSec)])
  } else {
    ranges.push([meta.firstStartSec, meta.durationSec])
    ranges.push([0, meta.pass >= 2 ? meta.firstStartSec : Math.min(meta.resumeSec, meta.firstStartSec)])
  }
  const lock = meta.lock && now - meta.lock.at < lockMs ? meta.lock : null
  return {
    key: meta.key,
    title: meta.title,
    modelId: meta.modelId,
    status: meta.status,
    phase: meta.phase,
    phaseProgress: meta.phaseProgress,
    durationSec: meta.durationSec,
    processedSec: meta.processedSec,
    progress: meta.durationSec > 0 ? Math.min(1, Math.max(0, meta.doneSec / meta.durationSec)) : 0,
    doneSec: meta.doneSec,
    firstStartSec: meta.firstStartSec,
    doneRanges: ranges,
    linesCount: meta.linesCount,
    speed: meta.speed,
    error: meta.error || null,
    updatedAt: meta.updatedAt,
    ebookCheck: meta.ebookCheck,
    ebookCheckMessage: meta.ebookCheckMessage || null,
    ebookSuggestions: meta.ebookSuggestions || 0,
    analysis: meta.analysis || null, // book analysis: queued | running | done
    analysisAt: meta.analysisAt || null,
    language: meta.language || null,
    modelReason: meta.modelReason || null,
    revision: meta.revision || 0,
    origin: meta.origin || 'server',
    deviceName: meta.deviceName || null,
    lockedBy: lock ? lock.deviceName || 'another device' : null,
    engine: meta.origin === 'device' ? 'device' : 'server'
  }
}

class TranscriptStore {
  constructor(dataDir = config.dataDir) {
    this.root = path.join(dataDir, 'transcripts')
    this.tombstoneFile = path.join(dataDir, 'tombstones.json')
    fs.mkdirSync(this.root, { recursive: true })
    this.linesCache = new Map() // key -> { mtimeMs, size, lines: string[] }
    this.tombstones = this._readJson(this.tombstoneFile) || {}
  }

  safe(key) {
    return String(key).replace(/[^A-Za-z0-9._-]/g, '_')
  }
  dir(key) {
    return path.join(this.root, this.safe(key))
  }
  file(key, name) {
    return path.join(this.dir(key), name)
  }

  _readJson(f) {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      return null
    }
  }
  _writeAtomic(f, data) {
    fs.mkdirSync(path.dirname(f), { recursive: true })
    const tmp = `${f}.${process.pid}.tmp`
    fs.writeFileSync(tmp, data)
    fs.renameSync(tmp, f)
  }

  // ---------------------------------------------------------------- meta

  getMeta(key) {
    const m = this._readJson(this.file(key, 'meta.json'))
    return m ? Object.assign(defaultMeta(key), m, { key }) : null
  }

  saveMeta(meta) {
    meta.updatedAt = Date.now()
    this._writeAtomic(this.file(meta.key, 'meta.json'), JSON.stringify(meta))
  }

  /** Content or outcome changed: bump the revision so phones pick it up. */
  bump(meta) {
    meta.revision = (meta.revision || 0) + 1
    this.saveMeta(meta)
    return meta.revision
  }

  /** A new transcript continues the key's revision history (after a delete). */
  nextRevisionBase(key) {
    const t = this.tombstones[key]
    return t ? t.revision : 0
  }

  // ---------------------------------------------------------------- lines

  _linesPath(key) {
    return this.file(key, 'lines.jsonl')
  }

  readRawLines(key) {
    const f = this._linesPath(key)
    let st
    try {
      st = fs.statSync(f)
    } catch (e) {
      this.linesCache.delete(key)
      return []
    }
    const c = this.linesCache.get(key)
    if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return c.lines
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim())
    this.linesCache.set(key, { mtimeMs: st.mtimeMs, size: st.size, lines })
    return lines
  }

  readLines(key, fromIndex = 0) {
    return this.readRawLines(key).slice(Math.max(0, fromIndex | 0))
  }

  readAllLines(key) {
    const out = []
    for (const raw of this.readRawLines(key)) {
      try {
        const o = JSON.parse(raw)
        if (typeof o.s === 'number' && typeof o.t === 'string') out.push({ start: o.s, end: o.e, text: o.t, words: Array.isArray(o.w) ? o.w : null })
      } catch (e) {}
    }
    return out
  }

  static lineJson(l) {
    // w: [[word, start, end]] to the microsecond, when the speech engine gave word times
    const o = { s: round2(l.start), e: round2(l.end), t: l.text }
    if (Array.isArray(l.words) && l.words.length) o.w = l.words.map((w) => (Array.isArray(w) ? [w[0], round6(w[1]), round6(w[2])] : [w.w, round6(w.s), round6(w.e)]))
    return JSON.stringify(o)
  }

  appendLines(key, lines) {
    if (!lines.length) return
    fs.mkdirSync(this.dir(key), { recursive: true })
    fs.appendFileSync(this._linesPath(key), lines.map(TranscriptStore.lineJson).join('\n') + '\n')
  }

  _writeRawLines(key, raws) {
    this._writeAtomic(this._linesPath(key), raws.length ? raws.join('\n') + '\n' : '')
    this.linesCache.delete(key)
  }

  /** Drops lines starting in [fromSec, toSec) (when resuming a pass). Returns the number of lines kept. */
  truncateLinesInRange(key, fromSec, toSec) {
    if (!fs.existsSync(this._linesPath(key))) return 0
    const kept = this.readRawLines(key).filter((raw) => {
      try {
        const s = JSON.parse(raw).s
        return s < fromSec || s >= toSec
      } catch (e) {
        return false
      }
    })
    this._writeRawLines(key, kept)
    return kept.length
  }

  // ---------------------------------------------------------------- ebook check

  getEbookCheck(key) {
    return this._readJson(this.file(key, 'ebook-check.json'))
  }
  saveEbookCheck(key, json) {
    this._writeAtomic(this.file(key, 'ebook-check.json'), JSON.stringify(json))
  }
  getEbookText(key) {
    return this._readJson(this.file(key, 'ebook-text.json'))
  }
  saveEbookText(key, json) {
    this._writeAtomic(this.file(key, 'ebook-text.json'), JSON.stringify(json))
  }
  readOriginalLines(key) {
    const f = this.file(key, 'lines.original.jsonl')
    if (!fs.existsSync(f)) return null
    return fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim())
  }

  /**
   * Sets the status of ebook suggestions; "applied" ones are written into the transcript text.
   * The transcript from before the first correction is kept as lines.original.jsonl.
   * Returns the number of suggestions still pending.
   */
  updateSuggestions(key, ids, status, applyToLine) {
    const check = this.getEbookCheck(key)
    if (!check || !Array.isArray(check.suggestions)) return 0
    const idSet = new Set(ids)
    const toApply = []
    for (const s of check.suggestions) {
      if (status === 'pending') {
        // back for review: only ignored ones (applied fixes are already in the transcript)
        if (idSet.has(s.id) && s.status === 'ignored') s.status = 'pending'
        continue
      }
      if (idSet.has(s.id) && (s.status || 'pending') === 'pending') {
        s.status = status
        if (status === 'applied') toApply.push(s)
      }
    }
    if (toApply.length) {
      const backup = this.file(key, 'lines.original.jsonl')
      if (!fs.existsSync(backup) && fs.existsSync(this._linesPath(key))) fs.copyFileSync(this._linesPath(key), backup)
      const byLine = new Map()
      toApply.forEach((s) => {
        const k = Math.round(s.s * 100)
        if (!byLine.has(k)) byLine.set(k, [])
        byLine.get(k).push(s)
      })
      const out = this.readRawLines(key).map((raw) => {
        try {
          const o = JSON.parse(raw)
          const fixes = byLine.get(Math.round(o.s * 100))
          if (!fixes) return raw
          o.t = applyToLine(o.t, fixes)
          return JSON.stringify(o)
        } catch (e) {
          return raw
        }
      })
      this._writeRawLines(key, out)
    }
    this.saveEbookCheck(key, check)
    return check.suggestions.filter((s) => (s.status || 'pending') === 'pending').length
  }

  // ---------------------------------------------------------------- whole transcript (sync)

  /** Replaces everything for [key] with an uploaded copy (from a phone). */
  replaceAll(key, { meta, lines, ebookCheck, originalLines, ebookText }) {
    fs.mkdirSync(this.dir(key), { recursive: true })
    this._writeRawLines(key, lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))))
    const checkFile = this.file(key, 'ebook-check.json')
    if (ebookCheck) this.saveEbookCheck(key, ebookCheck)
    else if (fs.existsSync(checkFile)) fs.unlinkSync(checkFile)
    const textFile = this.file(key, 'ebook-text.json')
    if (ebookText && Array.isArray(ebookText.paragraphs)) this.saveEbookText(key, ebookText)
    else if (ebookText === null && fs.existsSync(textFile)) fs.unlinkSync(textFile)
    const origFile = this.file(key, 'lines.original.jsonl')
    if (originalLines && originalLines.length) this._writeAtomic(origFile, originalLines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n') + '\n')
    else if (fs.existsSync(origFile)) fs.unlinkSync(origFile)
    this.saveMeta(meta)
    delete this.tombstones[key]
    this._saveTombstones()
  }

  delete(key) {
    const meta = this.getMeta(key)
    const revision = (meta ? meta.revision || 0 : this.nextRevisionBase(key)) + 1
    fs.rmSync(this.dir(key), { recursive: true, force: true })
    this.linesCache.delete(key)
    this.tombstones[key] = { revision, deletedAt: Date.now() }
    this._saveTombstones()
    return revision
  }

  tombstone(key) {
    return this.tombstones[key] || null
  }

  _saveTombstones() {
    this._writeAtomic(this.tombstoneFile, JSON.stringify(this.tombstones))
  }

  listAll() {
    let names = []
    try {
      names = fs.readdirSync(this.root)
    } catch (e) {}
    return names.map((n) => this._readJson(path.join(this.root, n, 'meta.json'))).filter(Boolean).map((m) => Object.assign(defaultMeta(m.key), m))
  }
}

module.exports = { TranscriptStore, STATUS, toJs, defaultMeta }

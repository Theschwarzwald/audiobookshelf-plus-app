'use strict'
/**
 * Library-wide transcription, for admins (ABS+ Settings → Transcription for the library):
 *  - watches Audiobookshelf for new books in the background and queues them (on by default)
 *  - "Transcribe everything" / chosen books, behind anything a listener started themselves
 *  - lists every book with its transcription state, and cancels queued or running attempts
 *
 * Settings: <DATA_DIR>/library.json  { autoTranscribeNew, since }  — "since" is the newest addedAt seen,
 * so turning the add-on on for the first time doesn't queue the whole library (that's "Transcribe everything").
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')
const { STATUS } = require('./store')
const models = require('./models')

const WATCH_MS = Math.max(1, parseInt(process.env.LIBRARY_WATCH_MINUTES || '10', 10)) * 60 * 1000
// Library-wide work is handed to the transcriber a few books at a time (the rest wait in library.json,
// so a restart carries on): one bad book or a crash never strands hundreds of queued ones
const BATCH = Math.max(1, parseInt(process.env.LIBRARY_BATCH_SIZE || '3', 10))
const FEED_MS = 60 * 1000
// Books that failed for a passing reason (GPU memory, network) are tried again after this long
const SWEEP_MS = 30 * 60 * 1000
const RETRY_AFTER_MS = Math.max(5, parseInt(process.env.RETRY_FAILED_MINUTES || '30', 10)) * 60 * 1000
const PAGE = 500

class Library {
  constructor(manager, store) {
    this.manager = manager
    this.store = store
    this.file = path.join(config.dataDir, 'library.json')
    this.settings = { autoTranscribeNew: process.env.AUTO_TRANSCRIBE_NEW === undefined ? true : /^(1|true|yes|on)$/i.test(process.env.AUTO_TRANSCRIBE_NEW), since: 0, modelId: 'auto', backlog: [], backlogTotal: 0, backlogBy: null }
    try {
      Object.assign(this.settings, JSON.parse(fs.readFileSync(this.file, 'utf8')))
    } catch (e) {}
    this.bulk = null // { total, done, failed } while "Transcribe everything" is queueing
    this.lastScan = 0
    this.lastError = null
    this.timer = null
  }

  save() {
    try {
      fs.mkdirSync(config.dataDir, { recursive: true })
      fs.writeFileSync(this.file, JSON.stringify(this.settings, null, 2))
    } catch (e) {
      log.warn(`Couldn't save library settings: ${e.message}`)
    }
  }

  start() {
    const tick = () => this.watch().catch((e) => log.warn(`Library watch: ${e.message}`))
    setTimeout(tick, 30 * 1000).unref()
    this.timer = setInterval(tick, WATCH_MS)
    this.timer.unref()
    // feed the next batch whenever a book finishes, and once a minute anyway
    this.manager.on('update', (m) => {
      if (m && (m.status === STATUS.DONE || m.status === STATUS.ERROR || m.cancelled)) setTimeout(() => this.feed(), 2000)
    })
    const feeder = setInterval(() => this.feed().catch((e) => log.warn(`Library batches: ${e.message}`)), FEED_MS)
    feeder.unref()
    setTimeout(() => this.feed().catch(() => {}), 20 * 1000).unref()
    const sweeper = setInterval(() => this.sweep().catch((e) => log.warn(`Retrying failed books: ${e.message}`)), SWEEP_MS)
    sweeper.unref()
    setTimeout(() => this.sweep().catch(() => {}), 2 * 60 * 1000).unref()
  }

  /** Next few books from the backlog, when fewer than a batch are waiting */
  async feed() {
    if (this.feeding || !(this.settings.backlog || []).length) return
    if (this.manager.backgroundLoad() >= BATCH) return
    this.feeding = true
    try {
      while (this.settings.backlog.length && this.manager.backgroundLoad() < BATCH) {
        const id = this.settings.backlog.shift()
        // "Transcribe everything" marks its books to start again from the beginning
        const redo = !!(this.settings.redoBacklog && this.settings.redoBacklog.includes(id))
        if (redo) this.settings.redoBacklog = this.settings.redoBacklog.filter((x) => x !== id)
        this.save()
        const n = await this.queue([id], 'bulk', this.settings.backlogBy || 'bulk', { redo }).catch((e) => {
          log.warn(`Couldn't queue ${id}: ${e.message}`)
          return 0
        })
        if (!n) continue
      }
      if (!this.settings.backlog.length) {
        log.info('Transcribe everything: the last batch is queued')
        this.settings.backlogTotal = 0
        this.save()
      }
    } finally {
      this.feeding = false
    }
  }

  /**
   * Books that stopped with an error that goes away by itself (out of GPU memory, a network hiccup,
   * the worker crashing) go back in line after a while: nobody has to restart them by hand.
   */
  async sweep() {
    const now = Date.now()
    const again = this.store.listAll().filter((m) => {
      if (m.origin === 'device' || m.status !== STATUS.ERROR) return false
      const transient = m.transient || /out of memory|CUDA|Speech worker exited|ECONNRESET|ETIMEDOUT|fetch failed|socket hang up|ffmpeg failed/i.test(m.error || '')
      return transient && now - (m.failedAt || 0) >= RETRY_AFTER_MS * Math.min(8, 2 ** Math.max(0, (m.sweeps || 0) - 1))
    })
    if (!again.length) return 0
    log.info(`Trying ${again.length} book${again.length === 1 ? '' : 's'} again that stopped for a passing reason (like the GPU running out of memory)`)
    const ids = []
    for (const m of again) {
      m.sweeps = (m.sweeps || 0) + 1
      m.retries = 0
      m.failedAt = now
      this.store.saveMeta(m)
      ids.push(m.key)
    }
    // back in line through the batches, not all at once
    const have = new Set(this.settings.backlog || [])
    this.settings.backlog = (this.settings.backlog || []).concat(ids.filter((id) => !have.has(id)))
    this.settings.backlogTotal = Math.max(this.settings.backlogTotal || 0, this.settings.backlog.length)
    this.save()
    this.feed().catch(() => {})
    return ids.length
  }

  // ---------------------------------------------------------------- Audiobookshelf

  async libraries() {
    const j = await absApi.serviceJson('/api/libraries')
    const list = Array.isArray(j) ? j : (j && j.libraries) || []
    return list.filter((l) => !l.mediaType || l.mediaType === 'book')
  }

  /** Every book (minified), newest first */
  async allBooks() {
    const out = []
    for (const lib of await this.libraries()) {
      for (let page = 0; page < 200; page++) {
        const j = await absApi.serviceJson(`/api/libraries/${encodeURIComponent(lib.id)}/items?limit=${PAGE}&page=${page}&sort=addedAt&desc=1&minified=1`)
        const results = (j && j.results) || []
        results.forEach((it) => out.push({ ...it, libraryName: lib.name }))
        if (results.length < PAGE) break
      }
    }
    return out.filter((it) => !it.mediaType || it.mediaType === 'book')
  }

  // ---------------------------------------------------------------- background watch

  /** New books since the last look: queue them (behind anything a listener started) */
  async watch() {
    if (!absApi.hasServiceKey()) return
    const books = await this.allBooks()
    this.lastScan = Date.now()
    const newest = books.reduce((n, b) => Math.max(n, b.addedAt || 0), 0)
    if (!this.settings.since) {
      // First look: remember where the library is now; existing books are left to "Transcribe everything"
      this.settings.since = newest || Date.now()
      this.save()
      return
    }
    const fresh = books.filter((b) => (b.addedAt || 0) > this.settings.since)
    if (fresh.length && this.settings.autoTranscribeNew) {
      log.info(`Found ${fresh.length} new book${fresh.length === 1 ? '' : 's'}: queueing transcription in the background`)
      await this.queue(fresh.map((b) => b.id), 'auto')
    }
    // Scanned PDFs among the new books: made readable (OCR), if that's turned on
    if (fresh.length && this.ocr) this.ocr.onNewBooks(fresh.filter((b) => String((b.media && b.media.ebookFormat) || '').toLowerCase() === 'pdf').map((b) => b.id))
    // Dewey numbers for new books, and for books whose title, author or ISBN was edited
    if (this.dewey) this.dewey.catchUp(this, books)
    // Age ratings for new books, when anyone has an age limit
    if (fresh.length && this.parental) await this.parental.onNewBooks(this, fresh.map((b) => b.id)).catch((e) => log.warn(`Rating new books: ${e.message}`))
    if (newest > this.settings.since) {
      this.settings.since = newest
      this.save()
    }
  }

  // ---------------------------------------------------------------- admin actions

  statusFor(id) {
    const meta = this.store.getMeta(id)
    if (!meta) return { status: STATUS.NONE }
    const progress = meta.durationSec > 0 ? Math.min(1, (meta.doneSec || 0) / meta.durationSec) : 0
    return { status: meta.status, progress, modelId: meta.modelId, error: meta.error || null, origin: meta.origin || 'server', background: this.manager.isBackground(id) }
  }

  async overview() {
    const books = absApi.hasServiceKey() ? await this.allBooks() : []
    const list = books.map((b) => {
      const md = (b.media && b.media.metadata) || {}
      return { id: b.id, title: md.title || b.id, author: md.authorName || '', duration: (b.media && b.media.duration) || 0, addedAt: b.addedAt || 0, library: b.libraryName || '', ...this.statusFor(b.id) }
    })
    const count = (s) => list.filter((b) => b.status === s).length
    return {
      autoTranscribeNew: this.settings.autoTranscribeNew,
      modelId: this.modelId(),
      ready: absApi.hasServiceKey(),
      lastScan: this.lastScan,
      bulk: this.bulk || ((this.settings.backlog || []).length ? { total: this.settings.backlogTotal || this.settings.backlog.length, done: (this.settings.backlogTotal || this.settings.backlog.length) - this.settings.backlog.length, failed: 0, waiting: this.settings.backlog.length, batch: BATCH } : null),
      counts: { total: list.length, done: count(STATUS.DONE), running: count(STATUS.RUNNING), queued: count(STATUS.QUEUED), paused: count(STATUS.PAUSED), error: count(STATUS.ERROR), none: count(STATUS.NONE) },
      books: list
    }
  }

  setSettings(body) {
    if (typeof body.autoTranscribeNew === 'boolean') this.settings.autoTranscribeNew = body.autoTranscribeNew
    let changed = 0
    if (typeof body.modelId === 'string' && (body.modelId === models.AUTO || models.get(body.modelId)) && body.modelId !== this.settings.modelId) {
      this.settings.modelId = body.modelId
      changed = this.waitingNotStarted().length
      this.applyModelToWaiting().catch((e) => log.warn(`Switching waiting books to the new model: ${e.message}`))
    }
    this.save()
    return { autoTranscribeNew: this.settings.autoTranscribeNew, modelId: this.settings.modelId, changed }
  }

  /** The model admins chose for the library ('auto' = best for the hardware and each book's language) */
  modelId() {
    return this.settings.modelId || models.AUTO
  }

  /** Books waiting in the queue that haven't started yet switch to the newly chosen model */
  waitingNotStarted() {
    return this.store.listAll().filter((m) => m.status === STATUS.QUEUED && m.origin !== 'device' && !(m.linesCount > 0) && !(m.pass > 0) && !(this.manager.current && this.manager.current.key === m.key))
  }

  async applyModelToWaiting() {
    let n = 0
    const want = this.modelId()
    for (const listed of this.waitingNotStarted()) {
      // Automatic needs the book's language
      let language = listed.language
      if (want === models.AUTO && language === undefined) {
        const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(listed.key)}`).catch(() => null)
        language = (item && item.media && item.media.metadata && item.media.metadata.language) || null
      }
      if (this.modelId() !== want) return n // changed again meanwhile
      const meta = this.store.getMeta(listed.key)
      if (!meta || meta.status !== STATUS.QUEUED || meta.linesCount > 0 || meta.pass > 0) continue
      if (this.manager.current && this.manager.current.key === meta.key) continue
      const { model, reason } = this.manager.resolveModel(want, { media: { metadata: { language } } })
      if (!model || model.id === meta.modelId) continue
      meta.modelId = model.id
      meta.modelReason = reason
      this.store.saveMeta(meta)
      n++
    }
    if (n) log.info(`Library model is now ${this.modelId()}: ${n} waiting books switched`)
    return n
  }

  /**
   * Queue books (by id) that aren't transcribed or already queued. Runs in the background; resolves
   * with how many were queued. why: auto | bulk | pick (pick goes ahead of auto/bulk ones).
   */
  async queue(ids, why, username, { redo = false } = {}) {
    let queued = 0
    for (const id of ids) {
      const st = this.statusFor(id).status
      // redo: transcribe a finished (or failed) book again from the start, with the library's model
      if (st === STATUS.RUNNING || st === STATUS.QUEUED) continue
      if (st === STATUS.DONE && !redo) continue
      try {
        const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(id)}?expanded=1`)
        if (!item || item.mediaType !== 'book') continue
        // a book that stopped part-way carries on with the model it was using (it may have stepped down)
        const prev = this.store.getMeta(id)
        const keep = !redo && prev && prev.status !== STATUS.DONE && (prev.linesCount > 0 || prev.pass > 0) ? prev.modelId : null
        await this.manager.start({ key: id, item, modelId: keep || this.modelId(), startSec: 0, restart: redo, username: username || why, background: why !== 'pick' })
        queued++
      } catch (e) {
        if (this.bulk) this.bulk.failed++
        log.warn(`Couldn't queue ${id}: ${e.message}`)
      }
      if (this.bulk) this.bulk.done++
    }
    return queued
  }

  /**
   * "Transcribe missing": every book not done yet goes on the backlog (saved, so a restart carries on).
   * "Transcribe everything" (redo): every book, finished ones too, transcribed again from the start.
   * Handed to the transcriber a few at a time (returns at once)
   */
  queueAll(username, { redo = false } = {}) {
    if (this.bulk) return this.bulk
    const run = async () => {
      const books = await this.allBooks()
      const busy = (s) => s === STATUS.RUNNING || s === STATUS.QUEUED
      const todo = redo
        ? books.filter((b) => !busy(this.statusFor(b.id).status))
        : books.filter((b) => this.statusFor(b.id).status === STATUS.NONE || this.statusFor(b.id).status === STATUS.ERROR || this.statusFor(b.id).status === STATUS.PAUSED)
      const have = new Set(this.settings.backlog || [])
      this.settings.backlog = (this.settings.backlog || []).concat(todo.map((b) => b.id).filter((id) => !have.has(id)))
      if (redo) this.settings.redoBacklog = [...new Set([...(this.settings.redoBacklog || []), ...todo.map((b) => b.id)])]
      this.settings.backlogTotal = this.settings.backlog.length
      this.settings.backlogBy = username || 'bulk'
      this.save()
      log.info(`${redo ? 'Transcribe everything (again, from the start)' : 'Transcribe missing'}: ${todo.length} book${todo.length === 1 ? '' : 's'} to do, ${BATCH} at a time`)
      this.bulk = null
      await this.feed()
    }
    this.bulk = { total: 0, done: 0, failed: 0 }
    run()
      .catch((e) => log.warn(`Transcribe everything: ${e.message}`))
      .finally(() => (this.bulk = null))
    return this.bulk
  }

  /** Cancel = stop and delete partial transcripts (finished ones are kept) */
  async cancel(ids) {
    let n = 0
    for (const id of ids) {
      const st = this.statusFor(id).status
      if (st !== STATUS.RUNNING && st !== STATUS.QUEUED && st !== STATUS.PAUSED && st !== STATUS.ERROR) continue
      if (this.statusFor(id).origin === 'device' && st === STATUS.RUNNING) continue // a phone is doing that one
      await this.manager.stop(id, 'cancel')
      if (this.store.getMeta(id) && this.store.getMeta(id).status !== STATUS.DONE) this.store.delete(id)
      n++
    }
    return n
  }

  async cancelAll() {
    this.settings.backlog = []
    this.settings.redoBacklog = []
    this.settings.backlogTotal = 0
    this.save()
    const ids = this.store
      .listAll()
      .filter((m) => m.origin !== 'device' && (m.status === STATUS.QUEUED || m.status === STATUS.RUNNING))
      .map((m) => m.key)
    return this.cancel(ids)
  }
}

module.exports = { Library }

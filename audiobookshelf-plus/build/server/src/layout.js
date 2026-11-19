'use strict'
/**
 * PDF layout for reflow (Docling).
 *
 * Phones reflow a PDF's text to fit the screen. On their own they guess paragraphs from the gaps between
 * lines; with this they know the page's real blocks in reading order (paragraphs, headings, list items,
 * columns, captions, footnotes) and leave out running headers and page numbers. Worked out once per PDF in
 * the background, on the CPU (transcription keeps the GPU), and kept in DATA_DIR/layout/<item id>.json.
 * Phones fetch it with the book and keep a copy, so reflow uses it offline too.
 *
 *   GET /api/transcription/items/:id/layout   { layout | null, status }
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile } = require('child_process')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')

const DIR = path.join(config.dataDir, 'layout')
const STATE = path.join(DIR, 'layout.json')
const WORKER = path.join(__dirname, '..', '..', 'worker', 'layout_worker.py')
const EVERY_MS = 60 * 60 * 1000
const TIMEOUT_MS = 2 * 60 * 60 * 1000

const isPdf = (b) => String((b.media && b.media.ebookFormat) || '').toLowerCase() === 'pdf'

function pdfOf(item) {
  const f = item && item.media && item.media.ebookFile
  if (!f) return null
  const fmt = String(f.ebookFormat || (f.metadata && f.metadata.ext) || '').replace('.', '').toLowerCase()
  if (fmt !== 'pdf') return null
  return { ino: f.ino, size: (f.metadata && f.metadata.size) || 0 }
}

class Layout {
  constructor(library, ocr) {
    this.library = library
    this.ocr = ocr
    this.state = { items: {} }
    this.queue = []
    this.job = null
    this.available = null
    try {
      fs.mkdirSync(DIR, { recursive: true })
      Object.assign(this.state, JSON.parse(fs.readFileSync(STATE, 'utf8')))
    } catch (e) {}
    // anything cut off by a restart goes back in the queue
    for (const [id, r] of Object.entries(this.state.items)) if (r.status === 'running' || r.status === 'queued') r.status = 'none'
    execFile('python3', ['-c', 'import docling'], { timeout: 120000 }, (err) => {
      this.available = !err
      if (err) log.info('PDF layout (Docling) is not installed in this image: reflow uses its own paragraph finder')
    })
  }

  file(id) {
    return path.join(DIR, `${String(id).replace(/[^\w-]/g, '')}.json`)
  }

  save() {
    try {
      fs.writeFileSync(STATE, JSON.stringify(this.state))
    } catch (e) {}
  }

  setRec(id, patch) {
    this.state.items[id] = { ...(this.state.items[id] || {}), ...patch, at: Date.now() }
    this.save()
  }

  /** The saved layout for this book, if its PDF (or the OCR copy) hasn't changed since */
  get(id, item) {
    const r = this.state.items[id]
    const f = this.file(id)
    if (!r || r.status !== 'done' || !fs.existsSync(f)) return null
    const pdf = pdfOf(item)
    // OCR'd as a separate copy (older ABS+): the layout is worked out from that copy. Done in place, the book's
    // own PDF already has the text.
    const ocrRec = this.ocr && this.ocr.rec(id)
    const ocrDone = !!ocrRec && ocrRec.status === 'done' && !ocrRec.inPlace && fs.existsSync(this.ocr.copyPath(id))
    if (!pdf || (r.src && (r.src.ino !== pdf.ino || (r.src.size && pdf.size && r.src.size !== pdf.size))) || (ocrDone && !r.fromOcr)) {
      // the book changed (or it was made readable since): work it out again
      fs.rmSync(f, { force: true })
      this.setRec(id, { status: 'none' })
      this.request(id)
      return null
    }
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'))
    } catch (e) {
      return null
    }
  }

  status(id) {
    const r = this.state.items[id]
    return r ? r.status : 'none'
  }

  request(id) {
    if (this.available === false) return
    const r = this.state.items[id]
    if (r && ['queued', 'running', 'done'].includes(r.status) && (r.status !== 'done' || fs.existsSync(this.file(id)))) return
    if (!this.queue.includes(id)) this.queue.push(id)
    this.setRec(id, { status: 'queued' })
    this.kick()
  }

  async kick() {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.length) {
        const id = this.queue.shift()
        try {
          await this.run(id)
        } catch (e) {
          log.warn(`PDF layout of ${id} failed: ${e.message}`)
          this.setRec(id, { status: 'error', error: e.message })
        }
        this.job = null
      }
    } finally {
      this.running = false
    }
  }

  async run(id) {
    const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(id)}?expanded=1`)
    const pdf = pdfOf(item)
    if (!pdf) return this.setRec(id, { status: 'not-pdf' })
    // a scan still waiting for OCR: later, once it has text
    const ocr = this.ocr && this.ocr.rec(id)
    if (ocr && ['queued', 'running'].includes(ocr.status)) return this.setRec(id, { status: 'none' })
    const title = (item.media && item.media.metadata && item.media.metadata.title) || id
    this.job = { id, title, startedAt: Date.now() }
    this.setRec(id, { status: 'running', title })
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'absplus-layout-'))
    try {
      let src = this.ocr && this.ocr.validCopy(id, item)
      const fromOcr = !!src
      if (!src) {
        src = path.join(tmp, 'in.pdf')
        const ok = await absApi.download(`/api/items/${encodeURIComponent(id)}/ebook`, src)
        if (!ok) throw new Error('Audiobookshelf has no PDF for this book')
      }
      const out = path.join(tmp, 'layout.json')
      const threads = Math.max(1, Math.min(4, os.cpus().length - 2))
      await new Promise((resolve, reject) => {
        const p = spawn('python3', [WORKER, src, out, String(threads)], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, OMP_NUM_THREADS: String(threads) } })
        let err = ''
        const timer = setTimeout(() => p.kill('SIGKILL'), TIMEOUT_MS)
        p.stderr.on('data', (d) => (err = (err + d).slice(-4000)))
        p.on('error', reject)
        p.on('exit', (code) => {
          clearTimeout(timer)
          if (code === 0) resolve()
          else reject(new Error(((err.match(/ERROR .*/g) || []).pop() || err.trim().split('\n').pop() || `exit ${code}`).slice(0, 300)))
        })
      })
      const json = JSON.parse(fs.readFileSync(out, 'utf8'))
      const pages = Object.keys(json.pages || {}).length
      fs.writeFileSync(this.file(id), JSON.stringify(json))
      const seconds = Math.round((Date.now() - this.job.startedAt) / 1000)
      this.setRec(id, { status: 'done', src: pdf, fromOcr, pages, engine: json.engine, seconds, error: null })
      log.info(`PDF layout: "${title}" (${pages} pages, ${seconds} s, ${json.engine})`)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }

  /** Every PDF book without a layout yet: a few minutes after start, then hourly (new books, changed files) */
  startBackground() {
    if (this.timer) return
    const pass = async () => {
      if (!this.available || this.running || !absApi.hasServiceKey()) return
      try {
        const books = (await this.library.allBooks()).filter(isPdf)
        let n = 0
        for (const b of books) {
          const r = this.state.items[b.id]
          const retry = r && r.status === 'error' && Date.now() - (r.at || 0) > 24 * 60 * 60 * 1000
          if (r && r.status !== 'none' && !retry) continue
          this.request(b.id)
          n++
        }
        if (n) log.info(`PDF layout: ${n} PDF${n === 1 ? '' : 's'} queued for reflow`)
      } catch (e) {
        log.debug(`PDF layout pass: ${e.message}`)
      }
    }
    setTimeout(pass, 4 * 60 * 1000).unref()
    this.timer = setInterval(pass, EVERY_MS)
    this.timer.unref()
  }
}

module.exports = { Layout }

'use strict'
/**
 * Make scanned PDFs readable (OCR).
 *
 * A scanned PDF is only pictures of pages: nothing to search, highlight, look up or follow in Read along.
 * OCRmyPDF (Tesseract) adds an invisible text layer under each page picture; the pages look exactly the
 * same. The copy is kept in DATA_DIR/ocr/<item id>.pdf — the book in your library is never changed — and
 * whenever Audiobookshelf's reader (web or app) asks for that book's PDF, the add-on hands out the copy with
 * the text instead. If the book's PDF file changes, the copy is dropped and made again.
 *
 * Settings → PDF text (OCR): which PDFs are scanned, make one or all readable, and do new ones automatically.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile } = require('child_process')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')

const DIR = path.join(config.dataDir, 'ocr')
const STATE = path.join(DIR, 'ocr.json')
// Tesseract languages in the image (ISO 639-1 of the book -> Tesseract's name)
const TESS = { en: 'eng', es: 'spa', fr: 'fra', de: 'deu', it: 'ita', pt: 'por', nl: 'nld', ja: 'jpn', zh: 'chi_sim', ru: 'rus', pl: 'pol', sv: 'swe' }
const NAMES = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ja: 'Japanese', zh: 'Chinese', ru: 'Russian', pl: 'Polish', sv: 'Swedish' }

function langOf(item) {
  const l = String((item && item.media && item.media.metadata && item.media.metadata.language) || '').toLowerCase()
  if (!l) return 'en'
  if (TESS[l.slice(0, 2)]) return l.slice(0, 2)
  const byName = Object.entries(NAMES).find(([, n]) => l.startsWith(n.toLowerCase()))
  return byName ? byName[0] : 'en'
}

/** The book's PDF (its main ebook file), or null */
function pdfOf(item) {
  const f = item && item.media && item.media.ebookFile
  if (!f) return null
  const fmt = String(f.ebookFormat || (f.metadata && f.metadata.ext) || '').replace('.', '').toLowerCase()
  if (fmt !== 'pdf') return null
  return { ino: f.ino, size: (f.metadata && f.metadata.size) || 0, mtime: (f.metadata && f.metadata.mtimeMs) || 0 }
}

/** Fonts per page in the raw PDF: a scan has none (pictures only) */
function textInfo(buf) {
  const s = buf.toString('latin1')
  const count = (re) => (s.match(re) || []).length
  const pages = count(/\/Type\s*\/Page[^s]/g)
  const fonts = count(/\/Type\s*\/Font\b/g) + count(/\/FontDescriptor\b/g)
  const images = count(/\/Subtype\s*\/Image\b/g)
  return { pages, fonts, images, scanned: fonts === 0 && images > 0 }
}

class Ocr {
  constructor(library) {
    this.library = library
    this.state = { auto: false, items: {} }
    try {
      fs.mkdirSync(DIR, { recursive: true })
      Object.assign(this.state, JSON.parse(fs.readFileSync(STATE, 'utf8')))
    } catch (e) {}
    this.queue = []
    this.job = null
    this.version = null
    execFile('ocrmypdf', ['--version'], (err, out) => (this.version = err ? null : String(out).trim()))
  }

  save() {
    try {
      fs.writeFileSync(STATE, JSON.stringify(this.state, null, 2))
    } catch (e) {
      log.warn(`OCR: couldn't save its state: ${e.message}`)
    }
  }

  copyPath(id) {
    return path.join(DIR, `${String(id).replace(/[^\w-]/g, '')}.pdf`)
  }

  rec(id) {
    return this.state.items[id] || null
  }

  setRec(id, patch) {
    this.state.items[id] = { ...(this.state.items[id] || {}), ...patch, at: Date.now() }
    this.save()
  }

  /** The readable copy for this item, if there is one and the book's PDF hasn't changed since */
  validCopy(id, item) {
    const r = this.rec(id)
    const file = this.copyPath(id)
    if (!r || r.status !== 'done' || !fs.existsSync(file)) return null
    const pdf = pdfOf(item)
    if (!pdf || (r.src && (r.src.ino !== pdf.ino || (r.src.size && pdf.size && r.src.size !== pdf.size)))) {
      // the book's PDF changed: this copy is out of date
      fs.rmSync(file, { force: true })
      this.setRec(id, { status: 'none', error: null })
      if (this.state.auto) this.request(id)
      return null
    }
    return file
  }

  /** Make this book's PDF readable (in the background, one at a time) */
  request(id, { force } = {}) {
    const r = this.rec(id)
    if (!force && r && ['queued', 'running'].includes(r.status)) return r
    if (!force && r && r.status === 'done' && fs.existsSync(this.copyPath(id))) return r
    if (!this.queue.includes(id) && !(this.job && this.job.id === id)) this.queue.push(id)
    this.setRec(id, { status: 'queued', error: null })
    this.kick()
    return this.rec(id)
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
          log.warn(`OCR of ${id} failed: ${e.message}`)
          this.setRec(id, { status: 'error', error: e.message })
        }
        this.job = null
      }
    } finally {
      this.running = false
    }
  }

  async run(id) {
    if (!this.version) throw new Error('OCRmyPDF is not installed in this container (update the ABS+ image)')
    const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(id)}?expanded=1`)
    const pdf = pdfOf(item)
    if (!pdf) throw new Error("This book's ebook isn't a PDF")
    const title = (item.media && item.media.metadata && item.media.metadata.title) || id
    const lang = langOf(item)
    this.job = { id, title, step: 'Downloading', pages: 0, done: 0, startedAt: Date.now() }
    this.setRec(id, { status: 'running', title, lang })
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'absplus-ocr-'))
    try {
      const src = path.join(tmp, 'in.pdf')
      const out = path.join(tmp, 'out.pdf')
      const ok = await absApi.download(`/api/items/${encodeURIComponent(id)}/ebook`, src)
      if (!ok) throw new Error('Audiobookshelf has no PDF for this book')
      const info = textInfo(fs.readFileSync(src))
      this.job.pages = info.pages
      if (!info.scanned && info.fonts > 0) {
        // It has text already: nothing to do
        this.setRec(id, { status: 'has-text', pages: info.pages, src: pdf, error: null })
        log.info(`OCR: "${title}" already has text`)
        return
      }
      this.job.step = 'Reading the pages'
      const langs = lang === 'en' ? 'eng' : `${TESS[lang]}+eng`
      const jobs = Math.max(1, Math.min(os.cpus().length - 1, 8))
      log.info(`OCR: "${title}" (${info.pages} pages, ${NAMES[lang] || lang}) with ${jobs} workers`)
      await new Promise((resolve, reject) => {
        const p = spawn('ocrmypdf', ['--skip-text', '-l', langs, '--jobs', String(jobs), '--output-type', 'pdf', '--optimize', '0', '--tesseract-timeout', '300', src, out], { stdio: ['ignore', 'ignore', 'pipe'] })
        this.job.proc = p
        let err = ''
        p.stderr.on('data', (d) => {
          const t = String(d)
          err = (err + t).slice(-4000)
          // "  12/33 ..." or "page 12" progress lines
          const m = t.match(/(\d+)\s*\/\s*(\d+)/g)
          if (m) {
            const last = m[m.length - 1].match(/(\d+)\s*\/\s*(\d+)/)
            if (last && Number(last[2]) === info.pages) this.job.done = Number(last[1])
          }
        })
        p.on('error', reject)
        p.on('exit', (code) => {
          this.job.proc = null
          if (code === 0) resolve()
          else reject(new Error((err.trim().split('\n').filter((l) => /error/i.test(l)).pop() || err.trim().split('\n').pop() || `ocrmypdf exited with ${code}`).slice(0, 300)))
        })
      })
      const after = textInfo(fs.readFileSync(out))
      if (after.pages && info.pages && after.pages !== info.pages) throw new Error(`OCR output has ${after.pages} pages, the book has ${info.pages}: left unchanged`)
      // The readable version replaces the book's own PDF (no second copy). Only after OCR succeeded and the
      // page count checked out; written next to it under a temporary name, then swapped in, so a failure
      // never leaves a half-written book. If the library can't be written to, it falls back to a copy here.
      const inPlace = await this.replaceOriginal(item, out)
      if (!inPlace) fs.copyFileSync(out, this.copyPath(id))
      else fs.rmSync(this.copyPath(id), { force: true })
      this.setRec(id, { status: 'done', inPlace, pages: info.pages, src: pdf, error: null, size: fs.statSync(out).size, fonts: after.fonts, seconds: Math.round((Date.now() - this.job.startedAt) / 1000) })
      log.info(`OCR: "${title}" is readable now (${Math.round((Date.now() - this.job.startedAt) / 1000)} s, ${inPlace ? 'original PDF updated' : 'kept as a copy: the library is read-only here'})`)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }

  /**
   * Put the readable PDF in place of the book's own file (same name and folder, same permissions and owner),
   * then have Audiobookshelf look at the book again. False when the library can't be written to from here.
   */
  async replaceOriginal(item, out) {
    const f = item && item.media && item.media.ebookFile
    const p = f && f.metadata && f.metadata.path
    if (!p || !fs.existsSync(p)) return false
    const tmp = path.join(path.dirname(p), `.${path.basename(p)}.absplus-ocr.tmp`)
    try {
      fs.accessSync(path.dirname(p), fs.constants.W_OK)
      const st = fs.statSync(p)
      fs.copyFileSync(out, tmp)
      try {
        fs.chmodSync(tmp, st.mode & 0o7777)
      } catch (e) {}
      try {
        fs.chownSync(tmp, st.uid, st.gid)
      } catch (e) {}
      fs.renameSync(tmp, p) // one step: the book is either the old file or the new one, never half of each
    } catch (e) {
      fs.rmSync(tmp, { force: true })
      log.warn(`OCR: couldn't replace ${p} (${e.message}); keeping a copy instead`)
      return false
    }
    absApi.serviceRequest('POST', `/api/items/${encodeURIComponent(item.id)}/scan`).catch((e) => log.debug(`OCR: rescan of ${item.id}: ${e.message}`))
    return true
  }

  remove(id) {
    this.queue = this.queue.filter((x) => x !== id)
    if (this.job && this.job.id === id && this.job.proc) this.job.proc.kill('SIGKILL')
    fs.rmSync(this.copyPath(id), { force: true })
    delete this.state.items[id]
    this.save()
    return { ok: true }
  }

  setAuto(on) {
    this.state.auto = !!on
    this.save()
    if (on) this.scanLibrary().catch(() => {})
    return { auto: this.state.auto }
  }

  /** Every PDF book that isn't done yet goes in the queue (the ones that have text are recognised and skipped) */
  async scanLibrary() {
    const books = await this.library.allBooks()
    let n = 0
    for (const b of books) {
      if (String((b.media && b.media.ebookFormat) || '').toLowerCase() !== 'pdf') continue
      const r = this.rec(b.id)
      if (r && ['done', 'has-text', 'queued', 'running'].includes(r.status)) continue
      this.request(b.id)
      n++
    }
    return n
  }

  /** New books (library watch): OCR scanned PDFs if that's turned on */
  onNewBooks(ids) {
    if (!this.state.auto) return
    for (const id of ids) this.request(id)
  }

  async overview() {
    let books = []
    try {
      books = (await this.library.allBooks()).filter((b) => String((b.media && b.media.ebookFormat) || '').toLowerCase() === 'pdf')
    } catch (e) {}
    const list = books.map((b) => {
      const r = this.rec(b.id) || {}
      return { id: b.id, title: (b.media && b.media.metadata && b.media.metadata.title) || b.id, author: (b.media && b.media.metadata && b.media.metadata.authorName) || '', status: r.status || 'none', pages: r.pages || 0, error: r.error || null, seconds: r.seconds || 0 }
    })
    const job = this.job ? { id: this.job.id, title: this.job.title, step: this.job.step, pages: this.job.pages, done: this.job.done, seconds: Math.round((Date.now() - this.job.startedAt) / 1000) } : null
    return { available: !!this.version, version: this.version, auto: !!this.state.auto, languages: Object.values(NAMES), job, queued: this.queue.length, books: list }
  }

  /**
   * GET <prefix>/api/items/<id>/ebook[/<ino>]: the readable copy when there is one (and the person may
   * open the book). Returns false to let the request through to Audiobookshelf.
   */
  async serve(req, res, prefix, id, ino) {
    const r = this.rec(id)
    if (!r || r.status !== 'done' || !fs.existsSync(this.copyPath(id))) return false
    let item
    try {
      item = await absApi.getItemForUser(req, prefix, id)
    } catch (e) {
      return false
    }
    if (!item) return false // not theirs: Audiobookshelf answers
    const pdf = pdfOf(item)
    if (ino && pdf && String(ino) !== String(pdf.ino)) return false // another file of the book
    const file = this.validCopy(id, item)
    if (!file) return false
    const size = fs.statSync(file).size
    const name = `${String((item.media && item.media.metadata && item.media.metadata.title) || 'book').replace(/[^\w .-]/g, '')}.pdf`
    const headers = { 'content-type': 'application/pdf', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=0', 'content-disposition': `inline; filename="${name}"`, 'x-abs-plus-ocr': '1' }
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (range) {
      let start = range[1] === '' ? Math.max(0, size - Number(range[2])) : Number(range[1])
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1
      end = Math.min(end, size - 1)
      if (start > end || start >= size) {
        res.writeHead(416, { 'content-range': `bytes */${size}` })
        res.end()
        return true
      }
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 })
      if (req.method === 'HEAD') return res.end(), true
      fs.createReadStream(file, { start, end }).pipe(res)
      return true
    }
    res.writeHead(200, { ...headers, 'content-length': size })
    if (req.method === 'HEAD') return res.end(), true
    fs.createReadStream(file).pipe(res)
    return true
  }
}

module.exports = { Ocr, textInfo }

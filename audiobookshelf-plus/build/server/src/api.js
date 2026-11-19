'use strict'
/**
 * /api/transcription/... (under whatever base path the client uses for the Audiobookshelf API)
 *
 *   GET    /info                          what this server can do (models, GPU/CPU)
 *   DELETE /models/:id                    remove a downloaded model (admin)
 *   GET    /items/:key/status             status (same shape as the app's AbsTranscriber status)
 *   GET    /items/:key/lines?fromIndex=N  { lines: [{s,e,t}], fromIndex, status }
 *   GET    /items/:key/ebook-check        { check }
 *   GET    /items/:key/ebook-text         { text: { ebookTitle, paragraphs: [{ t, h }] } } (karaoke view)
 *   POST   /items/:key/start              { modelId, restart, startSec }
 *   POST   /items/:key/pause
 *   POST   /items/:key/cancel             stop and delete the partial transcript
 *   DELETE /items/:key                    delete the transcript
 *   POST   /items/:key/ebook-check        compare with the ebook
 *   POST   /items/:key/analyze            book analysis: ebook compare + book text + .lrc again, no new transcription
 *   POST   /items/:key/suggestions        { ids, status: applied | ignored | pending (ignored back for review) }
 *
 * E-reader:
 *   GET    /dictionary                    dictionaries on the server
 *   GET    /dictionary/lookup?word=&lang= definitions (server dictionaries, then Wiktionary if enabled)
 *   GET    /dictionary/:id/download       zip of a dictionary, for offline lookups on a phone
 *   GET    /reader/:itemId/annotations?since=N        bookmarks/highlights/notes changed since N
 *   POST   /reader/:itemId/annotations  { since, changes }   send changes, get everything changed since N
 *
 * Two-way sync with phones that transcribe on the device:
 *   GET    /items/:key/sync               full copy { revision, meta, lines, ebookCheck, originalLines } or { deleted }
 *   PUT    /items/:key/sync               upload { baseRevision, deviceId, deviceName, meta, lines, ebookCheck, originalLines }
 *                                         409 when the server copy changed since baseRevision (unless force)
 *   DELETE /items/:key/sync?baseRevision= delete (only if unchanged since baseRevision)
 *
 * <key> is the Audiobookshelf library item id. Every request is checked against Audiobookshelf as the
 * calling user: they must be signed in and able to open the book.
 */
const zlib = require('zlib')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')
const models = require('./models')
const comparer = require('./comparer')
const { STATUS, toJs, defaultMeta } = require('./store')
const pkg = require('../package.json')
const { writeZip } = require('./dictionary')

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

function readJson(req, limit = 128 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let stream = req
    const enc = (req.headers['content-encoding'] || '').toLowerCase()
    if (enc === 'gzip') stream = req.pipe(zlib.createGunzip())
    stream.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new HttpError(413, 'Request too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    stream.on('end', () => {
      if (!size) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (e) {
        reject(new HttpError(400, 'Invalid JSON'))
      }
    })
    stream.on('error', reject)
  })
}

function send(req, res, status, obj) {
  let body = Buffer.from(JSON.stringify(obj))
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  if (body.length > 32 * 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    body = zlib.gzipSync(body)
    headers['content-encoding'] = 'gzip'
  }
  headers['content-length'] = body.length
  res.writeHead(status, headers)
  res.end(body)
}

function lineObjects(raws) {
  const out = []
  for (const r of raws) {
    try {
      out.push(JSON.parse(r))
    } catch (e) {}
  }
  return out
}

/** Fields a phone may set when uploading its transcript. */
/**
 * Translate a word or short phrase with MyMemory (free, no account; only when online lookups are allowed:
 * DICTIONARY_ONLINE). Recent results are kept in memory.
 * -> { text, alternatives: [..], from, to, source }
 */
const translateCache = new Map()
async function translateText(q, from, to) {
  if (!config.dictionaryOnline) throw new HttpError(503, 'Online lookups are turned off on this server (DICTIONARY_ONLINE)')
  const key = `${from}|${to}|${q.toLowerCase()}`
  if (translateCache.has(key)) return translateCache.get(key)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  let j
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?${new URLSearchParams({ q, langpair: `${from}|${to}` })}`, { signal: ctrl.signal, headers: { 'user-agent': 'ABS+ dictionary' } })
    if (!r.ok) throw new HttpError(502, `The translation service answered ${r.status}`)
    j = await r.json()
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(502, e.name === 'AbortError' ? 'The translation service took too long' : `Couldn't reach the translation service: ${e.message}`)
  } finally {
    clearTimeout(timer)
  }
  const text = String((j && j.responseData && j.responseData.translatedText) || '').trim()
  if (!text || /^(INVALID|PLEASE SELECT|QUERY LENGTH LIMIT)/i.test(text)) throw new HttpError(502, (j && j.responseDetails) || 'No translation found')
  // other good matches, different from the main one
  const seen = new Set([text.toLowerCase()])
  const alternatives = []
  for (const m of (j && j.matches) || []) {
    const t = String(m.translation || '').trim()
    if (!t || seen.has(t.toLowerCase()) || (m.match || 0) < 0.6) continue
    seen.add(t.toLowerCase())
    alternatives.push(t)
    if (alternatives.length >= 3) break
  }
  const out = { text, alternatives, from, to, source: 'MyMemory' }
  translateCache.set(key, out)
  if (translateCache.size > 500) translateCache.delete(translateCache.keys().next().value)
  return out
}

const DEVICE_META_FIELDS = ['title', 'modelId', 'status', 'phase', 'phaseProgress', 'durationSec', 'processedSec', 'resumeSec', 'firstStartSec', 'pass', 'doneSec', 'linesCount', 'speed', 'error', 'createdAt', 'chapters', 'ebookCheck', 'ebookCheckMessage', 'ebookSuggestions', 'language']

class Api {
  constructor(store, manager, dictionaries, annotations) {
    this.store = store
    this.manager = manager
    this.dictionaries = dictionaries
    this.annotations = annotations
  }

  statusOf(key) {
    const meta = this.manager.liveMeta(this.store.getMeta(key))
    if (meta) return toJs(meta)
    const tomb = this.store.tombstone(key)
    return { key, status: STATUS.NONE, revision: tomb ? tomb.revision : 0, deleted: !!tomb }
  }

  /** Audiobookshelf's custom metadata provider: /abs-plus/metadata[/<lang>]/search (secret header) */
  async metadataSearch(req, res, lang) {
    try {
      if (!this.metadata || !this.metadata.authorized(req)) return send(req, res, 401, { error: 'Unauthorized' })
      const u = new URL(req.url, 'http://x')
      const matches = await this.metadata.search({ query: u.searchParams.get('query'), author: u.searchParams.get('author'), isbn: u.searchParams.get('isbn') }, lang)
      return send(req, res, 200, { matches: matches.map((m) => this.metadata.toAbs(m)) })
    } catch (e) {
      log.warn(`Metadata search failed: ${e.message}`)
      return send(req, res, 200, { matches: [] })
    }
  }

  canControl(user) {
    return !config.adminOnly || absApi.isAdmin(user)
  }

  // Deleting or changing a transcript (Delete, Cancel, Re-transcribe, spelling fixes, book analysis, a phone's
  // delete or its changes to a transcript made elsewhere) is for admins only:
  // a transcript is shared by everyone who can open the book
  canEdit(user) {
    return absApi.isAdmin(user)
  }

  async handle(req, res, prefix, sub) {
    try {
      const url = new URL(req.url, 'http://x')
      const user = await absApi.getUser(req, prefix)
      if (!user) throw new HttpError(401, 'Unauthorized')
      const method = req.method.toUpperCase()

      if (sub === '/info' && method === 'GET') return send(req, res, 200, this.info(user))

      let m = sub.match(/^\/models\/([^/]+)$/)
      if (m && method === 'DELETE') {
        if (!absApi.isAdmin(user)) throw new HttpError(403, 'Only admins can remove models')
        const model = models.get(decodeURIComponent(m[1]))
        if (!model) throw new HttpError(404, 'Unknown model')
        models.remove(model)
        return send(req, res, 200, { ok: true })
      }

      // ---- library-wide transcription (admins): list, transcribe everything / chosen books, cancel
      if (sub.startsWith('/admin/')) {
        if (!absApi.isAdmin(user)) throw new HttpError(403, 'Only admins can manage library transcription')
        if (!this.library) throw new HttpError(503, 'Not ready')
        if (sub === '/admin/library' && method === 'GET') return send(req, res, 200, await this.library.overview())
        if (sub === '/admin/settings' && method === 'PUT') return send(req, res, 200, this.library.setSettings(await readJson(req, 64 * 1024)))
        if (sub === '/admin/transcribe' && method === 'POST') {
          const body = await readJson(req, 1024 * 1024)
          if (!absApi.hasServiceKey()) throw new HttpError(503, 'Server transcription isn\'t set up yet')
          // all + redo: "Transcribe everything" (every book again from the start); all alone: "Transcribe missing"
          if (body.all) return send(req, res, 200, { bulk: this.library.queueAll(user.username, { redo: !!body.redo }) })
          const ids = Array.isArray(body.itemIds) ? body.itemIds.map(String).slice(0, 5000) : []
          if (!ids.length) throw new HttpError(400, 'itemIds or all required')
          return send(req, res, 200, { queued: await this.library.queue(ids, 'pick', user.username, { redo: !!body.redo }) })
        }
        // A book whose transcription failed: Audiobookshelf rescans its files (moved, renamed or replaced audio),
        // then it's transcribed again
        if (sub === '/admin/rescan' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          if (!absApi.hasServiceKey()) throw new HttpError(503, 'Server transcription isn\'t set up yet')
          const ids = Array.isArray(body.itemIds) ? body.itemIds.map(String).slice(0, 200) : []
          if (!ids.length) throw new HttpError(400, 'itemIds required')
          const results = []
          for (const id of ids) {
            try {
              const r = await absApi.serviceRequest('POST', `/api/items/${encodeURIComponent(id)}/scan`)
              results.push({ id, scanned: true, result: (r && r.result) || null })
            } catch (e) {
              results.push({ id, scanned: false, error: e.message })
            }
          }
          const ok = results.filter((r) => r.scanned).map((r) => r.id)
          const queued = ok.length ? await this.library.queue(ok, 'pick', user.username) : 0
          return send(req, res, 200, { results, queued })
        }
        // ---- parental controls
        if (sub === '/admin/parental' && method === 'GET') return send(req, res, 200, await this.parental.overview(this.library))
        let pm = sub.match(/^\/admin\/parental\/users\/([^/]+)$/)
        if (pm && method === 'PUT') return send(req, res, 200, await this.parental.setUser(this.library, decodeURIComponent(pm[1]), await readJson(req, 64 * 1024)))
        if (sub === '/admin/parental/rate' && method === 'POST') {
          const body = await readJson(req, 1024 * 1024)
          if (body.unrated) return send(req, res, 200, { rated: await this.parental.tagUnrated(this.library) })
          const ids = Array.isArray(body.itemIds) ? body.itemIds.map(String) : []
          if (!ids.length || !body.rating) throw new HttpError(400, 'itemIds and rating required')
          return send(req, res, 200, { rated: await this.parental.rate(this.library, ids, String(body.rating)) })
        }
        if (sub === '/admin/parental/block' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          if (!body.userId || !body.itemId) throw new HttpError(400, 'userId and itemId required')
          return send(req, res, 200, await this.parental.block(this.library, String(body.userId), String(body.itemId), !!body.blocked))
        }
        // ---- metadata provider
        if (sub === '/admin/metadata' && method === 'GET') {
          let registered = []
          try {
            registered = await this.metadata.registered()
          } catch (e) {}
          return send(req, res, 200, { ...this.metadata.info(), registered })
        }
        if (sub === '/admin/metadata' && method === 'PUT') {
          const body = await readJson(req, 64 * 1024)
          this.metadata.setLanguages(body.languages)
          return send(req, res, 200, this.metadata.info())
        }
        if (sub === '/admin/metadata/register' && method === 'POST') {
          const registered = await this.metadata.register()
          let reachable = null
          try {
            if (registered[0]) reachable = (await this.metadata.verify(registered[0].id, 'Project Hail Mary')) > 0
          } catch (e) {
            reachable = false
          }
          return send(req, res, 200, { registered, reachable })
        }
        if (sub === '/admin/metadata/test' && method === 'GET') {
          const lang = url.searchParams.get('lang') || null
          const matches = await this.metadata.search({ query: url.searchParams.get('q') || '', author: url.searchParams.get('author') || '' }, lang)
          return send(req, res, 200, { matches: matches.map((m) => ({ ...this.metadata.toAbs(m), sources: [...new Set(m.sources)], covers: m.covers.slice(0, 6), adult: !!m.adult, score: Math.round(m.score * 100) / 100 })) })
        }
        if (sub === '/admin/library/provider' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          if (!body.libraryId || !body.provider) throw new HttpError(400, 'libraryId and provider required')
          await absApi.serviceRequest('PATCH', `/api/libraries/${encodeURIComponent(body.libraryId)}`, { provider: String(body.provider) })
          return send(req, res, 200, { ok: true })
        }
        if (sub === '/admin/libraries' && method === 'GET') return send(req, res, 200, { libraries: (await this.library.libraries()).map((l) => ({ id: l.id, name: l.name, provider: l.provider })) })
        // ---- local catalogue and Dewey numbers
        if (sub === '/admin/catalog' && method === 'GET') {
          const books = await this.library.allBooks().catch(() => [])
          const entries = books.map((b) => this.dewey.get(b.id))
          return send(req, res, 200, {
            catalog: { ...this.catalog.status(), stats: this.catalog.ready() && !this.catalog.builder ? await this.catalog.stats() : null },
            dewey: { total: books.length, classified: entries.filter((e) => e && e.ddc).length, notFound: entries.filter((e) => e && !e.ddc).length, job: this.dewey.job },
            unclassified: books.filter((b) => !(this.dewey.get(b.id) || {}).ddc).slice(0, 500).map((b) => ({ id: b.id, title: (b.media.metadata || {}).title, author: (b.media.metadata || {}).authorName || '', looked: !!this.dewey.get(b.id) }))
          })
        }
        if (sub === '/admin/catalog/build' && method === 'POST') return send(req, res, 200, this.catalog.startBuild())
        if (sub === '/admin/catalog/cancel' && method === 'POST') return send(req, res, 200, this.catalog.cancelBuild())
        if (sub === '/admin/catalog' && method === 'DELETE') return send(req, res, 200, this.catalog.remove())
        // ---- speech models and hardware
        if (sub === '/admin/models' && method === 'GET') return send(req, res, 200, { ...this.modelAdmin.overview(), selected: this.library.modelId() })
        if (sub === '/admin/models/use' && method === 'POST') {
          const body = await readJson(req, 16 * 1024)
          const id = String(body.modelId || '')
          if (id !== models.AUTO && !models.get(id)) throw new HttpError(400, 'Unknown model')
          const r = this.library.setSettings({ modelId: id })
          if (id !== models.AUTO) this.modelAdmin.download([id]) // fetched now, ahead of the first book that needs it
          return send(req, res, 200, { ...this.modelAdmin.overview(), selected: r.modelId, changed: r.changed })
        }
        if (sub === '/admin/models/download' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          const queued = body.all ? this.modelAdmin.downloadAll() : this.modelAdmin.download(Array.isArray(body.ids) ? body.ids.map(String) : [])
          return send(req, res, 200, { queued, ...this.modelAdmin.overview() })
        }
        if (sub === '/admin/hardware/rescan' && method === 'POST') return send(req, res, 200, await this.modelAdmin.rescan())
        // ---- scanned PDFs made readable (OCR)
        if (sub === '/admin/ocr' && method === 'GET') return send(req, res, 200, await this.ocr.overview())
        if (sub === '/admin/ocr/start' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          if (body.all) return send(req, res, 200, { queued: await this.ocr.scanLibrary() })
          const ids = Array.isArray(body.ids) ? body.ids.map(String) : []
          ids.forEach((id) => this.ocr.request(id, { force: !!body.again }))
          return send(req, res, 200, { queued: ids.length })
        }
        if (sub === '/admin/ocr/auto' && method === 'POST') return send(req, res, 200, this.ocr.setAuto(!!(await readJson(req, 16 * 1024)).auto))
        if (sub === '/admin/ocr/remove' && method === 'POST') return send(req, res, 200, this.ocr.remove(String((await readJson(req, 16 * 1024)).id || '')))
        // ---- dictionaries to download onto the server
        if (sub === '/admin/dictionaries' && method === 'GET') return send(req, res, 200, await this.dictDownloads.overview())
        if (sub === '/admin/dictionaries/download' && method === 'POST') return send(req, res, 200, { job: this.dictDownloads.download(String((await readJson(req, 16 * 1024)).name || '')) })
        if (sub === '/admin/dictionaries/remove' && method === 'POST') return send(req, res, 200, this.dictDownloads.remove(String((await readJson(req, 16 * 1024)).name || '')))
        // ---- updates of the regular Audiobookshelf
        if (sub === '/admin/abs-update' && method === 'GET') return send(req, res, 200, await this.absUpdate.status())
        if (sub === '/admin/abs-update' && method === 'PUT') return send(req, res, 200, await this.absUpdate.set(await readJson(req, 16 * 1024)))
        if (sub === '/admin/abs-update/check' && method === 'POST') return send(req, res, 200, await this.absUpdate.status(true))
        if (sub === '/admin/abs-update/install' && method === 'POST') {
          const body = await readJson(req, 16 * 1024)
          return send(req, res, 200, { job: this.absUpdate.install(user.username, { force: !!body.force }) })
        }
        if (sub === '/admin/abs-update/compat' && method === 'POST') return send(req, res, 200, await this.absUpdate.checkCompat())
        if (sub === '/admin/abs-update/rollback' && method === 'POST') return send(req, res, 200, { job: this.absUpdate.rollback() })
        // ---- author photos and bios
        if (sub === '/admin/authors' && method === 'GET') return send(req, res, 200, await this.authors.overview())
        if (sub === '/admin/authors/preview' && method === 'GET') {
          const name = (url.searchParams.get('name') || '').trim()
          if (!name) throw new HttpError(400, 'name required')
          return send(req, res, 200, await this.authors.preview(name))
        }
        if (sub === '/admin/authors/fill' && method === 'POST') {
          const body = await readJson(req, 1024 * 1024)
          return send(req, res, 200, { job: this.authors.fillAll({ replace: !!body.replace, ids: Array.isArray(body.ids) ? body.ids.map(String) : null }) })
        }
        if (sub === '/admin/dewey/classify' && method === 'POST') {
          const body = await readJson(req, 64 * 1024)
          return send(req, res, 200, { job: this.dewey.classify(this.library, { redo: !!body.redo }) })
        }
        let dm = sub.match(/^\/admin\/dewey\/([^/]+)$/)
        if (dm && method === 'PUT') {
          const body = await readJson(req, 16 * 1024)
          return send(req, res, 200, this.dewey.set(decodeURIComponent(dm[1]), body.ddc, 'admin'))
        }
        if (sub === '/admin/cancel' && method === 'POST') {
          const body = await readJson(req, 1024 * 1024)
          if (body.all) return send(req, res, 200, { cancelled: await this.library.cancelAll() })
          const ids = Array.isArray(body.itemIds) ? body.itemIds.map(String) : []
          return send(req, res, 200, { cancelled: await this.library.cancel(ids) })
        }
        throw new HttpError(404, 'Not found')
      }

      // ---- browse by Dewey Decimal (any signed-in user; only books they're allowed to open)
      if (sub === '/dewey' && method === 'GET') {
        const libs = await absApi.userJson(req, prefix, '/api/libraries')
        const list = (Array.isArray(libs) ? libs : (libs && libs.libraries) || []).filter((l) => !l.mediaType || l.mediaType === 'book')
        const books = []
        for (const lib of list) {
          for (let page = 0; page < 200; page++) {
            const j = await absApi.userJson(req, prefix, `/api/libraries/${encodeURIComponent(lib.id)}/items?limit=500&page=${page}&minified=1&sort=media.metadata.title`)
            const results = (j && j.results) || []
            results.forEach((b) => books.push(b))
            if (results.length < 500) break
          }
        }
        const { describe } = require('./catalog')
        return send(req, res, 200, {
          tree: this.dewey.tree(books),
          books: books
            .map((b) => {
              const e = this.dewey.get(b.id)
              const d = e && describe(e.ddc)
              const md = (b.media && b.media.metadata) || {}
              return d ? { id: b.id, title: md.title || '', author: md.authorName || '', ...d } : null
            })
            .filter(Boolean)
            .sort((a, b) => a.ddc.localeCompare(b.ddc, undefined, { numeric: true }) || a.title.localeCompare(b.title))
        })
      }

      // ---- dictionaries
      if (sub === '/dictionary' && method === 'GET') {
        // WordNet's own files aren't StarDict; the app has its own offline WordNet
        return send(req, res, 200, { dictionaries: this.dictionaries.list().filter((d) => d.format !== 'wordnet'), online: config.dictionaryOnline })
      }
      // A word (or a short phrase) in another language, for the reader's dictionary sheet (Translate)
      if (sub === '/translate' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim().slice(0, 300)
        const lang = (s) => (/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(s || '') ? s : '')
        const from = lang(url.searchParams.get('from')) || 'en'
        const to = lang(url.searchParams.get('to'))
        if (!q) throw new HttpError(400, 'q required')
        if (!to) throw new HttpError(400, 'to required')
        if (from === to) return send(req, res, 200, { text: q, alternatives: [], from, to, source: null })
        return send(req, res, 200, await translateText(q, from, to))
      }
      if (sub === '/dictionary/lookup' && method === 'GET') {
        const word = (url.searchParams.get('word') || '').slice(0, 100)
        if (!word.trim()) throw new HttpError(400, 'word required')
        return send(req, res, 200, await this.dictionaries.lookup(word, url.searchParams.get('lang') || ''))
      }
      m = sub.match(/^\/dictionary\/([^/]+)\/download$/)
      if (m && method === 'GET') {
        const d = this.dictionaries.get(decodeURIComponent(m[1]))
        if (!d) throw new HttpError(404, 'Unknown dictionary')
        if (d.format === 'wordnet') throw new HttpError(400, 'The ABS+ app has its own WordNet download')
        d.load()
        res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${d.id}.zip"`, 'x-dictionary-lang': d.lang, 'x-dictionary-name': encodeURIComponent(d.name) })
        return writeZip(res, d.files.map((f) => ({ name: require('path').basename(f), path: f })))
      }

      // ---- e-reader annotations (per user)
      m = sub.match(/^\/reader\/([^/]+)\/annotations$/)
      if (m) {
        const itemId = decodeURIComponent(m[1])
        if (!(await absApi.getItemForUser(req, prefix, itemId))) throw new HttpError(404, 'Item not found')
        if (method === 'GET') return send(req, res, 200, this.annotations.sync(user.id, itemId, url.searchParams.get('since'), []))
        if (method === 'POST') {
          const body = await readJson(req, 16 * 1024 * 1024)
          if (body.changes && !Array.isArray(body.changes)) throw new HttpError(400, 'changes must be a list')
          return send(req, res, 200, this.annotations.sync(user.id, itemId, body.since, body.changes || []))
        }
        throw new HttpError(405, 'Method not allowed')
      }

      m = sub.match(/^\/items\/([^/]+)(\/[a-z-]+)?$/)
      if (!m) throw new HttpError(404, 'Not found')
      const key = decodeURIComponent(m[1])
      const action = m[2] || ''
      const item = await absApi.getItemForUser(req, prefix, key)
      if (!item) throw new HttpError(404, 'Item not found')

      if (this.lrc && method === 'GET' && (action === '/status' || (action === '/lines' && !(parseInt(url.searchParams.get('fromIndex') || '0', 10) > 0)))) {
        try {
          if (await this.lrc.syncFromDisk(key)) this.manager.emitUpdate(this.store.getMeta(key))
        } catch (e) {
          log.warn(`Reading LRC files for ${key}: ${e.message}`)
        }
      }

      switch (`${method} ${action}`) {
        case 'GET /status':
          return send(req, res, 200, this.statusOf(key))
        case 'GET /lines': {
          const from = Math.max(0, parseInt(url.searchParams.get('fromIndex') || '0', 10) || 0)
          return send(req, res, 200, { lines: lineObjects(this.store.readLines(key, from)), fromIndex: from, status: this.statusOf(key) })
        }
        case 'GET /layout': {
          // PDF layout for reflow (Docling); null until it's been worked out
          const layout = this.layout ? this.layout.get(key, item) : null
          if (!layout && this.layout) this.layout.request(key)
          return send(req, res, 200, { layout, status: this.layout ? this.layout.status(key) : 'unavailable' })
        }
        case 'GET /ebook-check':
          return send(req, res, 200, { check: this.store.getEbookCheck(key) })
        case 'GET /ebook-text':
          return send(req, res, 200, { text: this.store.getEbookText(key) })
        case 'POST /start':
          return send(req, res, 200, await this.start(req, user, item, key))
        case 'POST /pause':
          await this.manager.stop(key, 'pause')
          return send(req, res, 200, this.statusOf(key))
        case 'POST /cancel':
        case 'DELETE ':
          return send(req, res, 200, await this.remove(user, key))
        case 'POST /ebook-check':
          if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can change a transcript')
          return send(req, res, 200, toJs(this.manager.requestEbookCheck(key, { urgent: true })))
        case 'POST /analyze':
          // Book analysis: the after-transcription checks again, without transcribing the audio again
          if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can change a transcript')
          return send(req, res, 200, toJs(this.manager.requestAnalysis(key)))
        case 'POST /suggestions':
          if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can change a transcript')
          return send(req, res, 200, await this.suggestions(req, key))
        case 'GET /sync':
          return send(req, res, 200, this.download(key))
        case 'PUT /sync':
          return send(req, res, 200, await this.upload(req, user, key))
        case 'DELETE /sync':
          return send(req, res, 200, this.syncDelete(url, user, key))
        default:
          throw new HttpError(404, 'Not found')
      }
    } catch (e) {
      const status = e.status || 500
      if (status >= 500) log.error(`${req.method} ${req.url}: ${e.stack || e.message}`)
      send(req, res, status, { error: e.message, ...(e.extra || {}) })
    }
  }

  info(user) {
    const hasGpu = this.manager.hasGpu
    const cur = this.manager.current
    let downloadingModel = null
    if (cur && cur.type === 'transcribe') {
      const meta = this.store.getMeta(cur.key)
      if (meta && meta.phase === 'model') downloadingModel = meta.modelId
    }
    return {
      available: true,
      version: pkg.version,
      apiKeyConfigured: absApi.hasServiceKey(),
      canTranscribe: this.canControl(user),
      canEdit: this.canEdit(user),
      isAdmin: absApi.isAdmin(user),
      device: { type: hasGpu ? 'cuda' : 'cpu', gpu: this.manager.hardware.gpu || null, workerOk: this.manager.hardware.ok !== false },
      reader: { annotations: true, dictionaries: this.dictionaries.scan().length, onlineDictionary: config.dictionaryOnline },
      hardware: models.hardwareLabel(this.manager.hardware),
      defaultModelId: this.library ? this.library.modelId() : models.AUTO,
      models: [
        {
          id: models.AUTO,
          name: 'Automatic (best for this server)',
          description: `Picks the model for each book from its language and this server's hardware. ${models.autoSummary(this.manager.hardware)}.`,
          languages: 'Any language',
          sizeLabel: 'Downloads what it needs',
          installed: false,
          installedBytes: 0,
          downloading: false,
          auto: true
        }
      ].concat(models.available(this.manager.hardware).map((mm) => {
        const installed = models.isInstalled(mm)
        return {
          id: mm.id,
          name: mm.name,
          description: mm.description,
          languages: mm.languages,
          sizeLabel: mm.sizeLabel,
          installed,
          installedBytes: installed ? models.installedBytes(mm) : 0,
          downloading: downloadingModel === mm.id || !!(this.modelAdmin && this.modelAdmin.state.get(mm.id) && ['queued', 'downloading'].includes(this.modelAdmin.state.get(mm.id).state)),
          engine: mm.engine
        }
      }))
    }
  }

  async start(req, user, item, key) {
    if (!this.canControl(user)) throw new HttpError(403, 'Only admins can start transcriptions on this server')
    const body = await readJson(req)
    const meta = this.store.getMeta(key)
    if (body.restart && meta && !this.canEdit(user)) throw new HttpError(403, 'Only admins can re-transcribe a book from the start')
    if (meta && meta.origin === 'device' && meta.status === STATUS.RUNNING && meta.lock && Date.now() - meta.lock.at < config.deviceLockMs && !body.force) {
      throw new HttpError(409, `This book is being transcribed on ${meta.lock.deviceName || 'a phone'}. Pause it there first.`, { lockedBy: meta.lock.deviceName })
    }
    const out = await this.manager.start({ key, item, modelId: body.modelId, restart: !!body.restart, startSec: body.startSec, username: user.username })
    return toJs(out)
  }

  async remove(user, key) {
    if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can delete transcriptions')
    await this.manager.stop(key, 'cancel')
    if (this.store.getMeta(key)) this.store.delete(key)
    if (this.lrc) await this.lrc.remove(key)
    return { key, status: STATUS.NONE }
  }

  async suggestions(req, key) {
    const body = await readJson(req)
    const status = body.status || 'applied'
    // pending: ignored suggestions back for review (after Ignore all)
    if (status !== 'applied' && status !== 'ignored' && status !== 'pending') throw new HttpError(400, 'Bad status')
    if (!Array.isArray(body.ids)) throw new HttpError(400, 'ids required')
    if (this.manager.isBusy(key)) throw new HttpError(409, 'Wait until the transcription is finished')
    const pending = this.store.updateSuggestions(key, body.ids, status, comparer.applyToLine)
    const meta = this.store.getMeta(key)
    if (meta) {
      meta.ebookSuggestions = pending
      this.store.bump(meta)
      this.manager.emitUpdate(meta)
      if (this.lrc) this.lrc.exportSoon(key) // spelling fixes go into the LRC files too
    }
    return { pending }
  }

  // ---------------------------------------------------------------- sync

  download(key) {
    const meta = this.store.getMeta(key)
    if (!meta) {
      const tomb = this.store.tombstone(key)
      return { key, revision: tomb ? tomb.revision : 0, deleted: !!tomb, status: STATUS.NONE }
    }
    const { lock, tracks, ...rest } = this.manager.liveMeta(meta)
    const orig = this.store.readOriginalLines(key)
    return {
      key,
      revision: meta.revision,
      deleted: false,
      status: rest.status,
      meta: { ...rest, tracks: [] },
      lines: lineObjects(this.store.readRawLines(key)),
      ebookCheck: this.store.getEbookCheck(key),
      ebookText: this.store.getEbookText(key),
      originalLines: orig ? lineObjects(orig) : null
    }
  }

  async upload(req, user, key) {
    const body = await readJson(req)
    if (!body || typeof body.meta !== 'object' || !Array.isArray(body.lines)) throw new HttpError(400, 'meta and lines required')
    if (this.manager.isBusy(key)) throw new HttpError(409, 'The server is transcribing this book', { busy: true, status: this.statusOf(key) })
    const current = this.store.getMeta(key)
    // Only admins' phones share their transcripts. Anyone can transcribe on their own phone, but for other users
    // it stays on that phone (the app says so before it starts)
    if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can share a phone transcript with the server', { adminOnly: true })
    const currentRev = current ? current.revision || 0 : this.store.nextRevisionBase(key)
    const base = Number(body.baseRevision) || 0
    if (base !== currentRev && !body.force) {
      throw new HttpError(409, 'The transcript changed on the server', { conflict: true, revision: currentRev, status: this.statusOf(key) })
    }
    const lines = body.lines.filter((l) => l && typeof l.s === 'number' && typeof l.t === 'string').map((l) => ({ s: l.s, e: typeof l.e === 'number' ? l.e : l.s, t: l.t, ...(Array.isArray(l.w) ? { w: l.w } : {}) }))
    const meta = defaultMeta(key)
    for (const f of DEVICE_META_FIELDS) if (body.meta[f] !== undefined) meta[f] = body.meta[f]
    if (!Object.values(STATUS).includes(meta.status) || meta.status === STATUS.NONE) meta.status = STATUS.DONE
    if (meta.status === STATUS.QUEUED) meta.status = STATUS.RUNNING
    // A copy of a phone's ebook check that is still running there isn't running here
    if (meta.ebookCheck === 'running' || meta.ebookCheck === 'queued') meta.ebookCheck = 'none'
    meta.linesCount = lines.length
    meta.libraryItemId = key
    meta.origin = 'device'
    meta.deviceId = String(body.deviceId || '').slice(0, 100) || null
    meta.deviceName = String(body.deviceName || '').slice(0, 100) || 'Phone'
    meta.createdBy = current && current.createdBy ? current.createdBy : user.username
    meta.lock = meta.status === STATUS.RUNNING ? { deviceId: meta.deviceId, deviceName: meta.deviceName, at: Date.now() } : null
    meta.revision = currentRev + 1
    this.store.replaceAll(key, {
      meta,
      lines,
      ebookCheck: body.ebookCheck && typeof body.ebookCheck === 'object' ? body.ebookCheck : null,
      originalLines: Array.isArray(body.originalLines) ? body.originalLines : null,
      // undefined = phone didn't send it (older app): keep ours
      ebookText: body.ebookText === undefined ? undefined : body.ebookText && Array.isArray(body.ebookText.paragraphs) ? body.ebookText : null
    })
    this.manager.emitUpdate(meta)
    log.info(`Received transcript of "${meta.title}" from ${meta.deviceName} (${lines.length} lines, ${meta.status}, revision ${meta.revision})`)
    if (this.lrc && meta.status === STATUS.DONE) this.lrc.exportSoon(key)
    return { key, revision: meta.revision }
  }

  syncDelete(url, user, key) {
    if (!this.canEdit(user)) throw new HttpError(403, 'Only admins can delete transcriptions')
    if (this.manager.isBusy(key)) throw new HttpError(409, 'The server is transcribing this book', { busy: true })
    const current = this.store.getMeta(key)
    if (!current) {
      const tomb = this.store.tombstone(key)
      return { key, revision: tomb ? tomb.revision : 0, deleted: true }
    }
    const base = Number(url.searchParams.get('baseRevision')) || 0
    if (base !== (current.revision || 0)) throw new HttpError(409, 'The transcript changed on the server', { conflict: true, revision: current.revision })
    const revision = this.store.delete(key)
    if (this.lrc) this.lrc.remove(key)
    return { key, revision, deleted: true }
  }
}

module.exports = { Api, HttpError }

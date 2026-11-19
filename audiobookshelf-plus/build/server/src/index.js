'use strict'
/**
 * Audiobookshelf transcription add-on.
 *
 * Sits in front of Audiobookshelf on the port your apps and browser already use:
 *   /api/transcription/...          handled here (server transcription + sync with the Android app)
 *   /_abs_transcription/*.js|.css   the web player's Transcription view
 *   everything else                 passed through to Audiobookshelf untouched (HTTP + websocket)
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const config = require('./config')
const log = require('./log')
const { TranscriptStore } = require('./store')
const { TranscriptionManager } = require('./jobs')
const { Api } = require('./api')
const { Dictionaries } = require('./dictionary')
const { AnnotationStore } = require('./annotations')
const { probe } = require('./asrWorker')
const { proxyHttp, proxyUpgrade } = require('./proxy')
const absApi = require('./absApi')
const { Library } = require('./library')
const { Parental } = require('./parental')
const { Metadata } = require('./metadata')
const { Catalog, Dewey } = require('./catalog')
const { Lrc } = require('./lrc')
const { ModelAdmin } = require('./modelAdmin')
const { Authors } = require('./authors')
const { AbsUpdate } = require('./absUpdate')
const appRelease = require('./appRelease')
const { DictDownloads } = require('./dictDownloads')
const { Ocr } = require('./ocr')
const { TextFix } = require('./textfix')
const { Layout } = require('./layout')
const models = require('./models')
const pkg = require('../package.json')

const PUBLIC = path.join(__dirname, '..', 'public')
const assets = {
  'transcription.js': 'application/javascript; charset=utf-8',
  'transcription.css': 'text/css; charset=utf-8',
  // Read along (the same Readium reader as the ABS+ app)
  'readium.html': 'text/html; charset=utf-8',
  'readium.js': 'application/javascript; charset=utf-8',
  // Lyrics and Karaoke, the same code as the Android app
  'absplus-views.js': 'application/javascript; charset=utf-8'
}

function serveAsset(res, name) {
  const type = assets[name]
  if (!type) return false
  fs.readFile(path.join(PUBLIC, name), (err, data) => {
    if (err) {
      res.writeHead(404)
      return res.end()
    }
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache', 'content-length': data.length })
    res.end(data)
  })
  return true
}

async function main() {
  const store = new TranscriptStore()
  const hardware = { cuda: 0, gpu: null, ok: true }
  const manager = new TranscriptionManager(store, hardware)
  const api = new Api(store, manager, new Dictionaries(), new AnnotationStore())
  // Watches Audiobookshelf for new books and queues them in the background (admins can turn it off)
  api.library = new Library(manager, store)
  // Scanned PDFs made readable (OCR): a copy with text, handed out in place of the scan
  api.ocr = new Ocr(api.library)
  api.library.ocr = api.ocr
  // PDF layout (Docling) for reflow on phones: worked out once per PDF in the background
  api.layout = new Layout(api.library, api.ocr)
  // Parental controls (age ratings, per-user limits and blocks) and the multi-source metadata provider
  api.parental = new Parental()
  api.library.parental = api.parental
  api.metadata = new Metadata()
  // Local Open Library copy and Dewey Decimal numbers for every book
  api.catalog = new Catalog()
  api.dewey = new Dewey(api.catalog)
  api.library.dewey = api.dewey
  api.metadata.catalog = api.catalog
  // Transcripts as <audio>.lrc and <audio>_karaoke.lrc next to the audio files
  api.lrc = new Lrc(store)
  // Settings → Transcription: every speech model, downloads at any time, hardware re-check
  api.modelAdmin = new ModelAdmin(manager)
  // Author photos and bios from Wikipedia, Audible and Open Library
  api.authors = new Authors(api.library)
  // Keeps the regular Audiobookshelf container up to date (Settings → Server updates)
  api.absUpdate = new AbsUpdate()
  // Dictionaries to download onto the server (Settings → Dictionaries)
  api.dictDownloads = new DictDownloads(api.dictionaries, api.library)
  // The local catalogue (for Dewey numbers) starts building as soon as the server is up, and a build that a
  // restart interrupted or that failed carries on (the download resumes); one cancelled by an admin stays cancelled
  {
    const st = api.catalog.status()
    if (!st.ready && st.phase !== 'cancelled') setTimeout(() => api.catalog.startBuild(), 5000)
  }
  manager.lrc = api.lrc

  const server = http.createServer((req, res) => {
    const pathname = req.url.split('?')[0]
    const m = pathname.match(/^(.*?)\/api\/transcription(\/.*)?$/)
    if (m) return api.handle(req, res, m[1], m[2] || '/')
    // The newest ABS+ Android app for phones to update from: /abs-plus/app/latest.json, /abs-plus/app/ABS+.apk
    if (pathname.includes('/abs-plus/app/') && appRelease.handle(req, res, pathname, pathname.split('/abs-plus/app/')[0])) return
    // Audiobookshelf's custom metadata provider calls: /abs-plus/metadata[/<lang>]/search
    const md = pathname.match(/\/abs-plus\/metadata(?:\/([a-z]{2}))?\/search$/)
    if (md && req.method === 'GET') return api.metadataSearch(req, res, md[1] || null)
    const a = pathname.match(/\/_abs_transcription\/([a-z.-]+)$/)
    if (a && req.method === 'GET' && serveAsset(res, a[1])) return
    // A book's PDF: the readable (OCR) copy when there is one, otherwise Audiobookshelf's own
    // (the app downloads a book's files from /file/<ino>/download: a downloaded scan is the readable copy too)
    const getLike = req.method === 'GET' || req.method === 'HEAD'
    const eb = getLike && (pathname.match(/^(.*?)\/api\/items\/([^/]+)\/ebook(?:\/([^/]+))?$/) || pathname.match(/^(.*?)\/api\/items\/([^/]+)\/file\/([^/]+)\/download$/))
    if (eb) {
      return api.ocr
        .serve(req, res, eb[1], decodeURIComponent(eb[2]), eb[3] ? decodeURIComponent(eb[3]) : null)
        .then((done) => done || proxyHttp(req, res))
        .catch(() => proxyHttp(req, res))
    }
    proxyHttp(req, res)
  })
  server.on('upgrade', proxyUpgrade)
  server.requestTimeout = 0
  server.headersTimeout = 120000
  server.keepAliveTimeout = 65000

  server.listen(config.port, () => {
    log.info(`abs-transcription ${pkg.version} on :${config.port}, proxying ${config.absUrl}`)
    if (!absApi.hasServiceKey()) log.info('No Audiobookshelf API key yet: one is created automatically the first time an admin signs in')
  })

  // Find out what hardware we have (doesn't block the proxy)
  const hw = await probe()
  Object.assign(hardware, hw)
  if (config.device === 'cpu') hardware.cuda = 0
  log.info(hardware.cuda > 0 ? `GPU found: ${hardware.gpu || 'CUDA device'} — transcription runs on the GPU` : `No GPU found — transcription runs on the CPU (${hardware.cpus || '?'} cores)`)
  // Checked at every start, so an upgrade (new GPU, more memory or cores) changes the Automatic choice at once
  api.modelAdmin.lastScan = Date.now()
  log.info(`Hardware: ${models.hardwareLabel(hardware)}`)
  for (const r of api.modelAdmin.recommendations()) log.info(`  Best for ${r.label}: ${(models.get(r.id) || {}).name || r.id}`)
  for (const p of (hardware.engines && hardware.engines.problems) || []) log.warn(`Speech engine problem: ${p}`)
  manager.recover()
  // Finished transcripts from before LRC files existed: write theirs once, gently
  store
    .listAll()
    .filter((m) => m.status === 'done' && !m.lrc)
    .forEach((m, i) => api.lrc.exportSoon(m.key, 20000 + i * 3000))
  // The add-on's data folder sits inside the audiobook library: Audiobookshelf skips folders with a .ignore file,
  // so it doesn't list them as books (like an 'ocr' book by 'Transcriptions')
  try {
    const ig = path.join(config.dataDir, '.ignore')
    if (!fs.existsSync(ig)) fs.writeFileSync(ig, '')
  } catch (e) {}
  api.library.start()
  // Dewey numbers: kept up to date in the background (new books, edited ones, not-found retried)
  api.dewey.startBackground(api.library)
  api.catalog.onReady = () => api.dewey.onCatalogReady && api.dewey.onCatalogReady()
  // Accented / non-English letters lost to old-encoding .nfo/.opf files: repaired from the tags and file names
  new TextFix().startBackground(api.library)
  api.layout.startBackground()

  const shutdown = () => {
    log.info('Shutting down')
    manager.shuttingDown = true
    if (manager.current && manager.current.worker) manager.current.worker.kill()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((e) => {
  log.error(e)
  process.exit(1)
})

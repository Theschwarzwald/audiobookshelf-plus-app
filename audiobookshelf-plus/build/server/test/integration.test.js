'use strict'
/** End to end: proxy + API + jobs against a fake Audiobookshelf and a fake speech worker. */
const test = require('node:test')
const assert = require('node:assert')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const net = require('net')
const mockAbs = require('./fixtures/mockAbs')

const ABS_PORT = 18080 + Math.floor(Math.random() * 500)
const PORT = ABS_PORT + 1000
const base = `http://127.0.0.1:${PORT}`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-tx-'))
let absServer
let gw

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const api = async (method, p, { token = 'user-token', body, headers = {} } = {}) => {
  const res = await fetch(`${base}${p}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  })
  let json = null
  try {
    json = await res.json()
  } catch (e) {}
  return { status: res.status, json }
}
async function waitFor(fn, ms = 20000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error('timeout')
    await sleep(100)
  }
}

test.before(async () => {
  require('./fixtures/makeStarDict').make(path.join(tmp, 'dicts', 'en'), 'mini', { run: 'to move fast', walk: 'to move slowly' })
  absServer = await mockAbs.start(ABS_PORT, '/audiobookshelf')
  gw = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ABS_URL: `http://127.0.0.1:${ABS_PORT}`,
      ABS_API_KEY: 'api-key',
      DATA_DIR: path.join(tmp, 'data'),
      MODELS_DIR: path.join(tmp, 'models'),
      WORKER_CMD: 'python3',
      WORKER_ARGS: path.join(__dirname, 'fixtures', 'mock_worker.py'),
      MOCK_DELAY: '0.12',
      DICTIONARY_DIR: path.join(tmp, 'dicts'),
      DICTIONARY_ONLINE: 'false',
      LOG_LEVEL: process.env.TEST_LOG || 'warn'
    },
    stdio: ['ignore', 'inherit', 'inherit']
  })
  await waitFor(async () => {
    try {
      return (await fetch(`${base}/api/transcription/info`)).status === 401
    } catch (e) {
      return false
    }
  })
})

test.after(() => {
  gw.kill()
  absServer.close()
  fs.rmSync(tmp, { recursive: true, force: true })
})

test('proxy passes Audiobookshelf through and injects the web UI', async () => {
  const page = await fetch(`${base}/audiobookshelf/item/abc`, { headers: { accept: 'text/html' } })
  const html = await page.text()
  assert.ok(html.includes('<script src="/audiobookshelf/_abs_transcription/transcription.js" defer></script>'), html)
  const js = await fetch(`${base}/audiobookshelf/_abs_transcription/transcription.js`)
  assert.strictEqual(js.status, 200)
  const echo = await fetch(`${base}/audiobookshelf/echo`, { method: 'POST', body: 'x'.repeat(100000) })
  assert.strictEqual((await echo.text()).length, 100000)
  const notFound = await fetch(`${base}/audiobookshelf/nothing`)
  assert.strictEqual(notFound.status, 404)
  // websocket passthrough
  const reply = await new Promise((resolve, reject) => {
    const s = net.connect(PORT, '127.0.0.1', () => {
      s.write('GET /audiobookshelf/socket.io/?EIO=4&transport=websocket HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
    })
    let buf = ''
    s.on('data', (d) => {
      buf += d.toString()
      if (buf.includes('101 Switching') && !buf.includes('echo:')) s.write('ping')
      if (buf.includes('echo:ping')) {
        s.destroy()
        resolve(buf)
      }
    })
    s.on('error', reject)
    setTimeout(() => reject(new Error('ws timeout')), 3000)
  })
  assert.ok(reply.includes('echo:ping'))
})

test('auth and item access come from Audiobookshelf', async () => {
  assert.strictEqual((await api('GET', '/audiobookshelf/api/transcription/info', { token: null })).status, 401)
  assert.strictEqual((await api('GET', '/api/transcription/info', { token: 'wrong' })).status, 401)
  const info = await api('GET', '/audiobookshelf/api/transcription/info')
  assert.strictEqual(info.status, 200)
  assert.strictEqual(info.json.device.type, 'cpu')
  assert.strictEqual(info.json.defaultModelId, 'auto')
  assert.strictEqual(info.json.models[0].id, 'auto')
  assert.match(info.json.models[0].description, /English: Parakeet TDT 0.6B v2/)
  assert.ok(info.json.models.some((m) => m.id === 'parakeet-tdt-v3' && m.engine === 'sherpa'))
  assert.match(info.json.hardware, /CPU, 4 cores/)
  assert.strictEqual((await api('GET', '/audiobookshelf/api/transcription/items/secret/status')).status, 404)
  const st = await api('GET', '/audiobookshelf/api/transcription/items/book1/status')
  assert.deepStrictEqual(st.json, { key: 'book1', status: 'none', revision: 0, deleted: false })
})

test('server transcription: listening position first, ebook check, apply fixes', async () => {
  const P = '/audiobookshelf/api/transcription/items/book1'
  const started = await api('POST', `${P}/start`, { body: { modelId: 'whisper-small', startSec: 150 } })
  assert.strictEqual(started.status, 200, JSON.stringify(started.json))
  assert.strictEqual(started.json.firstStartSec, 120)

  // Pause partway, then resume: nothing duplicated, nothing missing
  await waitFor(async () => (await api('GET', `${P}/status`)).json.linesCount > 5)
  const paused = await api('POST', `${P}/pause`)
  assert.strictEqual(paused.json.status, 'paused')
  const mid = await api('GET', `${P}/lines`)
  assert.ok(mid.json.lines.every((l) => l.s >= 120), 'pass 0 starts at the listening position')
  const resumed = await api('POST', `${P}/start`, { body: { modelId: 'whisper-small' } })
  assert.strictEqual(resumed.json.firstStartSec, 120)

  const done = await waitFor(async () => {
    const s = (await api('GET', `${P}/status`)).json
    return s.status === 'done' && s.ebookCheck === 'done' ? s : null
  }, 30000)
  assert.strictEqual(done.progress, 1)
  const all = (await api('GET', `${P}/lines`)).json.lines
  const starts = all.map((l) => l.s)
  assert.strictEqual(new Set(starts).size, starts.length, 'no duplicate lines after resume')
  const sorted = [...starts].sort((a, b) => a - b)
  assert.ok(sorted[0] < 1 && sorted[sorted.length - 1] > 190, 'covers the whole book')
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] - sorted[i - 1] < 4.5, `gap at ${sorted[i - 1]}`)

  const check = (await api('GET', `${P}/ebook-check`)).json.check
  const text = (await api('GET', `${P}/ebook-text`)).json.text
  assert.strictEqual(text.ebookTitle, 'book.epub')
  assert.deepStrictEqual(text.paragraphs.filter((p) => p.h).map((p) => p.t), ['Chapter One', 'Chapter Two'])
  assert.ok(text.paragraphs.some((p) => !p.h && p.t.includes('Zelenka')))
  assert.strictEqual(check.ebookTitle, 'book.epub')
  const z = check.suggestions.find((s) => s.heard === 'Zalenka')
  assert.ok(z, JSON.stringify(check.suggestions.slice(0, 5)))
  assert.strictEqual(z.ebook, 'Zelenka')
  assert.strictEqual(z.chapter, 'Chapter One')
  assert.ok(done.ebookCheckMessage.includes('% of words match'))

  const before = done.revision
  const upd = await api('POST', `${P}/suggestions`, { token: 'admin-token', body: { ids: [z.id], status: 'applied' } })
  assert.strictEqual(upd.status, 200)
  const lines2 = (await api('GET', `${P}/lines`)).json.lines
  assert.ok(lines2.some((l) => l.t.includes('Zelenka')) && !lines2.some((l) => l.t.includes('Zalenka')))
  const after = (await api('GET', `${P}/status`)).json
  assert.ok(after.revision > before)
  assert.strictEqual(after.ebookSuggestions, check.suggestions.length - 1)
})

test('two-way sync with a phone', async () => {
  const P = '/audiobookshelf/api/transcription/items/book2'
  // Phone starts transcribing locally and checks in with a partial copy (holds the book)
  const partial = { s: 1, e: 3, t: 'Hello from the phone.' }
  let r = await api('PUT', `${P}/sync`, { token: 'admin-token', body: { baseRevision: 0, deviceId: 'dev1', deviceName: 'Pixel 8', meta: { title: 'Test Book', modelId: 'moonshine-base-en', status: 'running', durationSec: 200, doneSec: 20, firstStartSec: 0, pass: 0, resumeSec: 20, tracks: [{ source: 'content://x' }] }, lines: [partial] } })
  assert.strictEqual(r.status, 200, JSON.stringify(r.json))
  assert.strictEqual(r.json.revision, 1)
  let st = (await api('GET', `${P}/status`)).json
  assert.strictEqual(st.engine, 'device')
  assert.strictEqual(st.lockedBy, 'Pixel 8')
  assert.strictEqual(st.status, 'running')

  // The web can't start a server job while the phone holds the book
  r = await api('POST', `${P}/start`, { body: { modelId: 'whisper-small' } })
  assert.strictEqual(r.status, 409)
  assert.match(r.json.error, /Pixel 8/)

  // Phone finishes and uploads the full transcript
  const lines = [partial, { s: 4, e: 6, t: 'Second line.' }]
  r = await api('PUT', `${P}/sync`, { token: 'admin-token', body: { baseRevision: 1, deviceId: 'dev1', deviceName: 'Pixel 8', meta: { title: 'Test Book', modelId: 'moonshine-base-en', status: 'done', durationSec: 200, doneSec: 200, pass: 2, ebookCheck: 'done', ebookSuggestions: 1 }, lines, ebookCheck: { ebookTitle: 'book.epub', suggestions: [{ id: '4.0-0', s: 4, wi: 0, wn: 1, heard: 'Second', ebook: 'Secund', context: '', chapter: '', status: 'pending' }] } } })
  assert.strictEqual(r.json.revision, 2)
  st = (await api('GET', `${P}/status`)).json
  assert.strictEqual(st.lockedBy, null)
  assert.strictEqual(st.linesCount, 2)

  // Someone applies the suggestion in the web player: revision moves on
  await api('POST', `${P}/suggestions`, { token: 'admin-token', body: { ids: ['4.0-0'], status: 'applied' } })
  const full = (await api('GET', `${P}/sync`)).json
  assert.strictEqual(full.revision, 3)
  assert.strictEqual(full.lines[1].t, 'Secund line.')
  assert.strictEqual(full.originalLines[1].t, 'Second line.')
  assert.strictEqual(full.meta.tracks.length, 0)
  assert.strictEqual(full.meta.lock, undefined)
  assert.strictEqual(full.ebookText, null)

  // A phone that hasn't pulled revision 3 can't overwrite it...
  r = await api('PUT', `${P}/sync`, { token: 'admin-token', body: { baseRevision: 2, deviceId: 'dev1', deviceName: 'Pixel 8', meta: { status: 'done' }, lines } })
  assert.strictEqual(r.status, 409)
  assert.strictEqual(r.json.conflict, true)
  assert.strictEqual(r.json.revision, 3)
  // ...unless it decided its copy wins
  r = await api('PUT', `${P}/sync`, { token: 'admin-token', body: { baseRevision: 2, force: true, deviceId: 'dev1', deviceName: 'Pixel 8', meta: { status: 'done' }, lines } })
  assert.strictEqual(r.json.revision, 4)

  // Delete from the phone: only if nothing changed meanwhile, and it leaves a tombstone
  r = await api('DELETE', `${P}/sync?baseRevision=3`, { token: 'admin-token' })
  assert.strictEqual(r.status, 409)
  r = await api('DELETE', `${P}/sync?baseRevision=4`, { token: 'admin-token' })
  assert.deepStrictEqual(r.json, { key: 'book2', revision: 5, deleted: true })
  st = (await api('GET', `${P}/status`)).json
  assert.deepStrictEqual(st, { key: 'book2', status: 'none', revision: 5, deleted: true })
  const gone = (await api('GET', `${P}/sync`)).json
  assert.strictEqual(gone.deleted, true)

  // A new upload continues the revision history
  r = await api('PUT', `${P}/sync`, { token: 'admin-token', body: { baseRevision: 5, deviceId: 'dev2', deviceName: 'Tablet', meta: { status: 'done' }, lines } })
  assert.strictEqual(r.json.revision, 6)
})

test('gzip responses for big transcripts', async () => {
  const res = await fetch(`${base}/api/transcription/items/book1/sync`, { headers: { authorization: 'Bearer user-token', 'accept-encoding': 'gzip' } })
  const json = await res.json()
  assert.ok(json.lines.length > 40)
})

test('cancel deletes the partial transcript', async () => {
  const P = '/api/transcription/items/book3'
  await api('POST', `${P}/start`, { body: { modelId: 'whisper-small' } })
  await waitFor(async () => (await api('GET', `${P}/status`)).json.linesCount > 2)
  const r = await api('POST', `${P}/cancel`, { token: 'admin-token' })
  assert.strictEqual(r.json.status, 'none')
  const st = (await api('GET', `${P}/status`)).json
  assert.strictEqual(st.status, 'none')
  assert.strictEqual(st.deleted, true)
  assert.strictEqual((await api('GET', `${P}/lines`)).json.lines.length, 0)
})

test('e-reader: dictionary lookup, download, and synced annotations', async () => {
  let r = await api('GET', '/audiobookshelf/api/transcription/dictionary')
  assert.deepStrictEqual(r.json.dictionaries.map((d) => [d.name, d.lang]), [['mini', 'en']])
  r = await api('GET', '/audiobookshelf/api/transcription/dictionary/lookup?word=Walking&lang=en')
  assert.strictEqual(r.json.matched, 'walk')
  assert.match(r.json.results[0].definition, /slowly/)
  const dl = await fetch(`${base}/api/transcription/dictionary/${r.json.results[0].dictionaryId}/download`, { headers: { authorization: 'Bearer user-token' } })
  assert.strictEqual(dl.status, 200)
  assert.strictEqual(dl.headers.get('x-dictionary-lang'), 'en')
  // annotations are per user and need access to the book
  r = await api('POST', '/api/transcription/reader/book1/annotations', { body: { since: 0, changes: [{ id: 'b1', type: 'bookmark', cfi: 'epubcfi(/6/2!/4/1:0)', fraction: 0.1, updatedAt: 5 }] } })
  assert.strictEqual(r.json.seq, 1)
  r = await api('GET', '/api/transcription/reader/book1/annotations?since=0', { token: 'admin-token' })
  assert.strictEqual(r.json.annotations.length, 0, 'another user has their own')
  r = await api('GET', '/api/transcription/reader/secret/annotations?since=0')
  assert.strictEqual(r.status, 404)
  const info = await api('GET', '/api/transcription/info')
  assert.deepStrictEqual(info.json.reader, { annotations: true, dictionaries: 1, onlineDictionary: false })
})

test('Automatic picks a model from the hardware and the book language', async () => {
  const P = '/api/transcription/items/book4'
  const r = await api('POST', `${P}/start`, { body: { modelId: 'auto' } })
  assert.strictEqual(r.status, 200, JSON.stringify(r.json))
  // test book has no language; CPU-only server with Parakeet installed
  assert.strictEqual(r.json.modelId, 'parakeet-tdt-v3')
  assert.match(r.json.modelReason, /No GPU/)
  await api('POST', `${P}/cancel`)
})

test('only admins can delete or change a transcript; other users keep phone transcripts on the phone', async () => {
  const P = '/audiobookshelf/api/transcription/items/book2'
  const info = (await api('GET', '/api/transcription/info')).json
  assert.strictEqual(info.canEdit, false)
  assert.strictEqual((await api('GET', '/api/transcription/info', { token: 'admin-token' })).json.canEdit, true)
  const body = { baseRevision: 0, force: true, deviceId: 'dev9', deviceName: 'Kid phone', meta: { title: 'Test Book', status: 'done', durationSec: 200, doneSec: 200 }, lines: [{ s: 1, e: 2, t: 'Mine.' }] }
  let r = await api('PUT', `${P}/sync`, { body })
  assert.strictEqual(r.status, 403)
  assert.strictEqual(r.json.adminOnly, true)
  for (const [method, path, b] of [['DELETE', `${P}/sync?baseRevision=0`], ['DELETE', P], ['POST', `${P}/cancel`], ['POST', `${P}/suggestions`, { ids: [], status: 'applied' }], ['POST', `${P}/analyze`], ['POST', `${P}/ebook-check`]]) {
    r = await api(method, path, b ? { body: b } : {})
    assert.strictEqual(r.status, 403, `${method} ${path}`)
  }
})

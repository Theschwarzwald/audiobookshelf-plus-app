'use strict'
// Library-wide transcription for admins: list, settings, queue chosen books / everything, cancel,
// and the background watcher (new books only, not the whole library on first look).
const test = require('node:test')
const assert = require('node:assert')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const mockAbs = require('./fixtures/mockAbs')

const ABS_PORT = 18441
const PORT = 18442
const base = `http://127.0.0.1:${PORT}`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-admin-'))
let absServer
let gw
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const call = async (method, p, token, body) => {
  const r = await fetch(`${base}/api/transcription${p}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  let json = null
  try {
    json = await r.json()
  } catch (e) {}
  return { status: r.status, json }
}

test.before(async () => {
  absServer = await mockAbs.start(ABS_PORT, '')
  // A worker that never answers: jobs stay running/queued, which is what these tests need
  const hang = path.join(tmp, 'hang.js')
  fs.writeFileSync(hang, "if (process.argv.includes('--probe')) { console.log(JSON.stringify({ cuda: 0, cpus: 4, ramMb: 8000, engines: { whisper: true, sherpa: true } })); process.exit(0) } setInterval(() => {}, 1000)")
  gw = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), ABS_URL: `http://127.0.0.1:${ABS_PORT}`, ABS_API_KEY: 'api-key', ROUTER_BASE_PATH: '', DATA_DIR: path.join(tmp, 'data'), MODELS_DIR: path.join(tmp, 'models'), DICTIONARY_DIR: path.join(tmp, 'dicts'), DICTIONARY_ONLINE: 'false', WORKER_CMD: process.execPath, WORKER_ARGS: hang, LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'inherit', 'inherit']
  })
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${base}/api/transcription/info`)).status === 401) return
    } catch (e) {}
    await sleep(50)
  }
  throw new Error('gateway did not start')
})
test.after(() => {
  gw.kill()
  absServer.close()
  fs.rmSync(tmp, { recursive: true, force: true })
})

test('only admins can use library transcription', async () => {
  assert.strictEqual((await call('GET', '/admin/library', 'user-token')).status, 403)
  assert.strictEqual((await call('POST', '/admin/transcribe', 'user-token', { all: true })).status, 403)
})

test('lists the books (not podcasts) with their state, auto-transcribe on by default', async () => {
  const { status, json } = await call('GET', '/admin/library', 'admin-token')
  assert.strictEqual(status, 200)
  assert.strictEqual(json.autoTranscribeNew, true)
  assert.deepStrictEqual(json.books.map((b) => b.id).sort(), ['b1', 'b2', 'b3'])
  assert.strictEqual(json.books[0].author, 'Ann Author')
  assert.ok(json.books.every((b) => b.status === 'none'))
})

test('the setting is saved', async () => {
  assert.strictEqual((await call('PUT', '/admin/settings', 'admin-token', { autoTranscribeNew: false })).json.autoTranscribeNew, false)
  assert.strictEqual((await call('GET', '/admin/library', 'admin-token')).json.autoTranscribeNew, false)
  const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'library.json'), 'utf8'))
  assert.strictEqual(saved.autoTranscribeNew, false)
  await call('PUT', '/admin/settings', 'admin-token', { autoTranscribeNew: true })
})

test('queue a chosen book, then everything else, then cancel them all', async () => {
  const one = await call('POST', '/admin/transcribe', 'admin-token', { itemIds: ['b2'] })
  assert.strictEqual(one.json.queued, 1)
  const again = await call('POST', '/admin/transcribe', 'admin-token', { itemIds: ['b2'] })
  assert.strictEqual(again.json.queued, 0) // already queued or running
  await call('POST', '/admin/transcribe', 'admin-token', { all: true })
  let lib
  for (let i = 0; i < 50; i++) {
    lib = (await call('GET', '/admin/library', 'admin-token')).json
    if (!lib.bulk && lib.books.every((b) => b.status !== 'none')) break
    await sleep(100)
  }
  assert.ok(lib.books.every((b) => b.status === 'running' || b.status === 'queued'), JSON.stringify(lib.books.map((b) => b.status)))
  assert.ok(lib.books.filter((b) => b.id !== 'b2').every((b) => b.background), 'everything-else jobs are background jobs')
  const c = await call('POST', '/admin/cancel', 'admin-token', { all: true })
  assert.strictEqual(c.json.cancelled, 3)
  lib = (await call('GET', '/admin/library', 'admin-token')).json
  assert.ok(lib.books.every((b) => b.status === 'none'), JSON.stringify(lib.books.map((b) => b.status)))
})

test('the watcher remembers the library on first look and queues only books added later', () => {
  const { Library } = require('../src/library')
  const absApi = require('../src/absApi')
  const queued = []
  const store = { getMeta: () => null, listAll: () => [] }
  const lib = new Library({ start: async (o) => queued.push(o.key), isBackground: () => true }, store)
  lib.save = () => {}
  let books = [{ id: 'old1', addedAt: 100 }, { id: 'old2', addedAt: 200 }]
  lib.allBooks = async () => books
  lib.queue = async (ids) => queued.push(...ids)
  const orig = absApi.hasServiceKey
  absApi.hasServiceKey = () => true
  return (async () => {
    await lib.watch()
    assert.deepStrictEqual(queued, [])
    assert.strictEqual(lib.settings.since, 200)
    books = [{ id: 'new1', addedAt: 300 }, ...books]
    await lib.watch()
    assert.deepStrictEqual(queued, ['new1'])
    lib.settings.autoTranscribeNew = false
    books = [{ id: 'new2', addedAt: 400 }, ...books]
    await lib.watch()
    assert.deepStrictEqual(queued, ['new1'])
    absApi.hasServiceKey = orig
  })()
})

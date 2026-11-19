'use strict'
// No ABS_API_KEY: the add-on creates its own key when an admin signs in, and keeps it.
const test = require('node:test')
const assert = require('node:assert')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const mockAbs = require('./fixtures/mockAbs')

const ABS_PORT = 18431
const PORT = 18432
const base = `http://127.0.0.1:${PORT}`
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-autokey-'))
const keyFile = path.join(tmp, 'data', 'abs-api-key.json')
let absServer
let gw
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function startGateway() {
  gw = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), ABS_URL: `http://127.0.0.1:${ABS_PORT}`, ABS_API_KEY: 'paste-your-audiobookshelf-api-key-here', ROUTER_BASE_PATH: '', DATA_DIR: path.join(tmp, 'data'), MODELS_DIR: path.join(tmp, 'models'), DICTIONARY_DIR: path.join(tmp, 'dicts'), DICTIONARY_ONLINE: 'false', WORKER_CMD: process.execPath, WORKER_ARGS: '-e 0', LOG_LEVEL: 'warn' },
    stdio: ['ignore', 'inherit', 'inherit']
  })
  return (async () => {
    for (let i = 0; i < 200; i++) {
      try { if ((await fetch(`${base}/api/transcription/info`)).status === 401) return } catch (e) {}
      await sleep(50)
    }
    throw new Error('gateway did not start')
  })()
}
const info = (token) => fetch(`${base}/api/transcription/info`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json())

test.before(async () => {
  absServer = await mockAbs.start(ABS_PORT, '')
  await startGateway()
})
test.after(() => {
  gw.kill()
  absServer.close()
  fs.rmSync(tmp, { recursive: true, force: true })
})

test('a placeholder ABS_API_KEY counts as no key, and a regular user does not create one', async () => {
  const i = await info('user-token')
  assert.strictEqual(i.apiKeyConfigured, false)
  assert.ok(!fs.existsSync(keyFile))
  assert.ok(!mockAbs.createdKeys)
})

test('the first admin sign-in creates and stores the key', async () => {
  const i = await info('admin-token')
  assert.strictEqual(i.apiKeyConfigured, true)
  assert.strictEqual(mockAbs.createdKeys, 1)
  const saved = JSON.parse(fs.readFileSync(keyFile, 'utf8'))
  assert.strictEqual(saved.apiKey, 'api-key')
  assert.strictEqual(saved.userId, 'u0')
  assert.strictEqual((await info('user-token')).apiKeyConfigured, true)
})

test('the stored key survives a restart without creating another', async () => {
  gw.kill()
  await sleep(300)
  await startGateway()
  assert.strictEqual((await info('user-token')).apiKeyConfigured, true)
  assert.strictEqual(mockAbs.createdKeys, 1)
})

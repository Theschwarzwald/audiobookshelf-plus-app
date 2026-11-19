// Publishes an ABS+ Android build to the running server, so phones see "Update available".
//   node publish-app.js <path/to/ABS+_N.apk> <build number N> ["what's new"]
// Puts ABS+.apk and latest.json into the container's /data/android (through Portainer; API key from
// %USERPROFILE%\.portainer_token, never printed). No image rebuild needed.
'use strict'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // Portainer uses a self-signed certificate
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')

const PORTAINER = process.env.PORTAINER_URL || (() => { try { return require('fs').readFileSync(require('path').join(require('os').homedir(), '.portainer_url'), 'utf8').trim() } catch (e) { return 'https://<your-portainer-host>:9443' } })() // your Portainer address: PORTAINER_URL or a ~/.portainer_url file
const CONTAINER = process.env.CONTAINER || 'audiobookshelf-plus'
const [apk, buildArg, notes] = process.argv.slice(2)
const build = parseInt(buildArg, 10)
if (!apk || !fs.existsSync(apk) || !(build > 0)) {
  console.error('usage: node publish-app.js <path/to/apk> <build number> ["what\'s new"]')
  process.exit(1)
}
const token = fs.readFileSync(path.join(os.homedir(), '.portainer_token'), 'utf8').trim()

;(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'absplus-app-'))
  const dir = path.join(tmp, 'android')
  fs.mkdirSync(dir)
  fs.copyFileSync(apk, path.join(dir, 'ABS+.apk'))
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex')
  const info = { build, versionName: `ABS+ ${build}`, versionCode: 1000 + build, sha256, publishedAt: new Date().toISOString(), notes: notes || '' }
  fs.writeFileSync(path.join(dir, 'latest.json'), JSON.stringify(info, null, 2))
  const tar = path.join(tmp, 'android.tar')
  const r = spawnSync('tar', ['-cf', 'android.tar', 'android'], { cwd: tmp, stdio: 'inherit' }) // relative: GNU tar on Windows reads "C:" as a host
  if (r.status !== 0) throw new Error('tar failed')
  const ep = process.env.PORTAINER_ENDPOINT || '3'
  const res = await fetch(`${PORTAINER}/api/endpoints/${ep}/docker/containers/${CONTAINER}/archive?path=/data`, {
    method: 'PUT',
    headers: { 'X-API-Key': token, 'Content-Type': 'application/x-tar' },
    body: fs.readFileSync(tar)
  })
  fs.rmSync(tmp, { recursive: true, force: true })
  if (!res.ok) throw new Error(`Portainer returned ${res.status}: ${(await res.text()).slice(0, 300)}`)
  console.log(`Published ABS+ ${build} (${(fs.statSync(apk).size / 1e6).toFixed(1)} MB). Phones show "Update available" next time the app opens.`)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

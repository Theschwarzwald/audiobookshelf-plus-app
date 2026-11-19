// Runs a command inside the audiobookshelf-plus container through Portainer and prints the output.
//   node exec.js <command...>      (Portainer API key from %USERPROFILE%\.portainer_token)
'use strict'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const os = require('os')
const B = process.env.PORTAINER_URL || (() => { try { return require('fs').readFileSync(require('path').join(require('os').homedir(), '.portainer_url'), 'utf8').trim() } catch (e) { return 'https://<your-portainer-host>:9443' } })() // your Portainer address: PORTAINER_URL or a ~/.portainer_url file
const token = fs.readFileSync(require('path').join(os.homedir(), '.portainer_token'), 'utf8').trim()
const H = { 'X-API-Key': token, 'Content-Type': 'application/json' }
const container = process.env.CONTAINER || 'audiobookshelf-plus'
;(async () => {
  const cmd = process.argv.slice(2)
  const ex = await (await fetch(`${B}/api/endpoints/3/docker/containers/${container}/exec`, { method: 'POST', headers: H, body: JSON.stringify({ AttachStdout: true, AttachStderr: true, Tty: true, Cmd: cmd }) })).json()
  if (!ex.Id) throw new Error(JSON.stringify(ex))
  const out = await (await fetch(`${B}/api/endpoints/3/docker/exec/${ex.Id}/start`, { method: 'POST', headers: H, body: JSON.stringify({ Detach: false, Tty: true }) })).text()
  process.stdout.write(out)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

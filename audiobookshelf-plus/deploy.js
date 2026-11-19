// Deploy Audiobookshelf Plus to Portainer.
//   node deploy.js check    list environments and anything already using the names/port (read-only)
//   node deploy.js deploy   build the image on the host and create (or update) the stack
// The Portainer API key is read from %USERPROFILE%\.portainer_token (never printed).
'use strict'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // Portainer uses a self-signed certificate
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORTAINER = process.env.PORTAINER_URL || (() => { try { return require('fs').readFileSync(require('path').join(require('os').homedir(), '.portainer_url'), 'utf8').trim() } catch (e) { return 'https://<your-portainer-host>:9443' } })() // your Portainer address: PORTAINER_URL or a ~/.portainer_url file
const STACK = 'audiobookshelf-plus'
const IMAGE = 'audiobookshelf-plus:latest'
const here = __dirname
const token = fs.readFileSync(path.join(os.homedir(), '.portainer_token'), 'utf8').trim()
const H = { 'X-API-Key': token }

async function api(method, p, body, headers = {}) {
  const r = await fetch(PORTAINER + p, { method, headers: { ...H, ...headers }, body })
  const text = await r.text()
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${text.slice(0, 500)}`)
  try { return JSON.parse(text) } catch { return text }
}

async function endpoint() {
  const eps = await api('GET', '/api/endpoints')
  const want = process.env.PORTAINER_ENDPOINT
  const ep = want ? eps.find((e) => String(e.Id) === want || e.Name === want) : eps.find((e) => e.Type === 1) || eps[0]
  return { ep, eps }
}

async function check() {
  const { ep, eps } = await endpoint()
  console.log('Environments:', eps.map((e) => `${e.Id}:${e.Name}(type ${e.Type})`).join(', '))
  console.log('Using:', ep.Id, ep.Name)
  const cs = await api('GET', `/api/endpoints/${ep.Id}/docker/containers/json?all=1`)
  for (const c of cs) {
    const ports = (c.Ports || []).filter((p) => p.PublicPort).map((p) => p.PublicPort)
    const hit = /audiobookshelf|transcri/i.test(c.Image + c.Names.join()) || ports.includes(13378)
    if (hit) {
      console.log(`- ${c.Names.join(',')} image=${c.Image} state=${c.State} ports=${ports.join(',')}`)
      for (const m of c.Mounts || []) console.log(`    ${m.Source || m.Name} -> ${m.Destination}`)
    }
  }
  const stacks = await api('GET', '/api/stacks')
  console.log('Stacks:', stacks.map((s) => `${s.Id}:${s.Name}`).join(', ') || '(none)')
  const info = await api('GET', `/api/endpoints/${ep.Id}/docker/info`)
  console.log('Host:', info.Name, `${info.NCPU} CPUs`, `${Math.round(info.MemTotal / 2 ** 30)} GB RAM`, 'runtimes:', Object.keys(info.Runtimes || {}).join(','))
}

async function deploy() {
  const { ep } = await endpoint()
  console.log('Building', IMAGE, 'on', ep.Name, '(first build downloads several GB, can take 10-20 min)...')
  const tar = fs.readFileSync(path.join(here, 'audiobookshelf-plus-build.tar'))
  const out = await api('POST', `/api/endpoints/${ep.Id}/docker/build?t=${encodeURIComponent(IMAGE)}&rm=1&forcerm=1&buildargs=${encodeURIComponent(JSON.stringify({ CUDA: process.env.CUDA || 'true' }))}`, tar, { 'Content-Type': 'application/x-tar' })
  const lines = String(out).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { stream: l } } })
  const err = lines.find((l) => l.error)
  console.log(lines.map((l) => l.stream || '').join('').split('\n').slice(-8).join('\n'))
  if (err) throw new Error('Build failed: ' + err.error)

  const content = fs.readFileSync(path.join(here, 'stack.yml'), 'utf8')
  const existing = (await api('GET', '/api/stacks')).find((s) => s.Name === STACK)
  if (existing) {
    await api('PUT', `/api/stacks/${existing.Id}?endpointId=${ep.Id}`, JSON.stringify({ stackFileContent: content, prune: false, pullImage: false }), { 'Content-Type': 'application/json' })
    console.log('Updated stack', STACK)
  } else {
    await api('POST', `/api/stacks/create/standalone/string?endpointId=${ep.Id}`, JSON.stringify({ name: STACK, stackFileContent: content }), { 'Content-Type': 'application/json' })
    console.log('Created stack', STACK)
  }
}

;({ check, deploy })[process.argv[2] || 'check']().catch((e) => { console.error(e.message); process.exit(1) })

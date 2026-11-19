'use strict'
/**
 * Keeps the regular Audiobookshelf (the official image ABS+ sits in front of) up to date.
 *
 *   check     the running version (Audiobookshelf's /status) against the newest release on GitHub
 *   install   pull the new official image, then recreate the Audiobookshelf container with exactly the
 *             same settings (volumes, network names, environment, restart policy, compose labels), wait
 *             until it answers again, and put the old one back by itself if it doesn't
 *   rollback  go back to the version that ran before the last update
 *
 * Automatic: a daily check at a set time; with "install" it updates then, but never while someone is
 * listening (it waits for the next day) and never across a major version (3.x) unless allowed.
 *
 * Needs the Docker socket mounted into this container (/var/run/docker.sock) and the Audiobookshelf
 * container's name (ABS_CONTAINER, default audiobookshelf-plus-abs). Without the socket it only checks.
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')

const SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
const CONTAINER = process.env.ABS_CONTAINER || 'audiobookshelf-plus-abs'
const REPO = 'advplyr/audiobookshelf'
const FILE = path.join(config.dataDir, 'abs-update.json')
const PREVIOUS_TAG = 'absplus-previous'
const DEFAULTS = { auto: 'install', time: '04:00', allowMajor: false, lastCheck: null, lastResult: null, previous: null, lastCompat: null }

// ---------------------------------------------------------------- Docker over its socket

function docker(method, p, body, { raw = false, timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? Buffer.from(JSON.stringify(body)) : null
    const req = http.request({ socketPath: SOCKET, method, path: p, headers: data ? { 'content-type': 'application/json', 'content-length': data.length } : {}, timeout }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode >= 400) {
          let msg = text
          try {
            msg = JSON.parse(text).message || text
          } catch (e) {}
          return reject(Object.assign(new Error(`Docker: ${msg.trim().slice(0, 300)}`), { status: res.statusCode }))
        }
        if (raw) return resolve(text)
        try {
          resolve(text ? JSON.parse(text) : null)
        } catch (e) {
          resolve(text)
        }
      })
    })
    req.on('timeout', () => req.destroy(new Error('Docker did not answer in time')))
    req.on('error', reject)
    req.end(data || undefined)
  })
}

const dockerReady = () => fs.existsSync(SOCKET)

/** "ghcr.io/advplyr/audiobookshelf:latest" -> { repo, tag } */
function splitRef(ref) {
  const at = ref.lastIndexOf(':')
  if (at > ref.lastIndexOf('/')) return { repo: ref.slice(0, at), tag: ref.slice(at + 1) }
  return { repo: ref, tag: 'latest' }
}

async function pull(ref) {
  const { repo, tag } = splitRef(ref)
  // The reply streams one JSON line per step; an "error" line means it failed
  const out = await docker('POST', `/images/create?fromImage=${encodeURIComponent(repo)}&tag=${encodeURIComponent(tag)}`, undefined, { raw: true, timeout: 30 * 60 * 1000 })
  const bad = out
    .split('\n')
    .map((l) => {
      try {
        return JSON.parse(l)
      } catch (e) {
        return null
      }
    })
    .find((j) => j && (j.error || j.errorDetail))
  if (bad) throw new Error(`Couldn't download the new Audiobookshelf: ${bad.error || bad.errorDetail.message}`)
}

// ---------------------------------------------------------------- versions

const parse = (v) => String(v || '').replace(/^v/, '').split(/[.-]/).map((n) => parseInt(n, 10) || 0)
function newer(a, b) {
  const x = parse(a)
  const y = parse(b)
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0)
  return false
}

async function runningVersion() {
  try {
    const r = await fetch(`${config.absUrl}/status`, { signal: AbortSignal.timeout(5000) })
    const j = await r.json()
    return j.serverVersion || null
  } catch (e) {
    return null
  }
}

let releaseCache = null
async function latestRelease(fresh) {
  if (!fresh && releaseCache && Date.now() - releaseCache.at < 60 * 60 * 1000) return releaseCache.value
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { 'user-agent': 'ABS+ (Audiobookshelf add-on)', accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) })
  if (!r.ok) throw new Error(`GitHub returned ${r.status}`)
  const j = await r.json()
  const value = { version: String(j.tag_name || '').replace(/^v/, ''), url: j.html_url, publishedAt: j.published_at, notes: String(j.body || '').slice(0, 4000) }
  releaseCache = { at: Date.now(), value }
  return value
}

async function waitHealthy(version, ms = 240000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 4000))
    try {
      const r = await fetch(`${config.absUrl}/healthcheck`, { signal: AbortSignal.timeout(4000) })
      if (r.ok) {
        const v = await runningVersion()
        if (v && (!version || v === version || newer(v, version) || !newer(version, v))) return v
      }
    } catch (e) {}
  }
  return null
}

// ---------------------------------------------------------------- does ABS+ still fit this Audiobookshelf?
//
// ABS+ is its own container, so an update never touches its code or data. What an update can break is what
// ABS+ relies on in Audiobookshelf: its API, getting the ABS+ script into its web pages, and the parts of its
// web app the web features hook into. All of it is checked before and after an update; anything that
// worked before and doesn't after puts the previous version back.

const API_CHECKS = [
  ['/api/me', 'ABS+ sign-in and its API key'],
  ['/api/libraries', 'Library transcription, LRC files, Dewey browsing'],
  ['@items', 'Server transcription (reading books and their audio)'],
  ['@authors', 'Author photos & bios'],
  ['/api/custom-metadata-providers', 'Metadata sources'],
  ['/api/users', 'Parental controls'],
  ['/api/api-keys', 'Automatic API key'],
  ['/api/users/online', 'Server updates (who is listening)']
]
// Parts of Audiobookshelf's web app the ABS+ web features hook into
const WEB_HOOKS = [
  ['configContent', 'Settings pages (Transcription, Parental controls, …)'],
  ['/config/stats', 'Settings pages (Transcription, Parental controls, …)'],
  ['user/getIsAdminOrUp', 'Admin-only settings pages'],
  ['playerHandler', 'Transcription view in the player'],
  ['streamLibraryItem', 'Transcription view in the player'],
  ['mediaPlayerContainer', 'Read-along card and Read along layout'],
  ['showEReader', 'Read along (opening the book)'],
  ['setShowEReader', 'Read along (switching back to Lyrics / Karaoke)'],
  ['ebook-viewer', 'Read along in MOBI / AZW3 books'],
  ['readers-epub-reader', 'Read along in EPUB books'],
  ['readers-mobi-reader', 'Read along in MOBI / AZW3 books'],
  ['readers-pdf-reader', 'Read along in PDF books'],
  ['reader-player-open', 'Read along layout']
]

/** Run a command in the Audiobookshelf container and return what it printed */
async function execIn(containerId, cmd) {
  const ex = await docker('POST', `/containers/${containerId}/exec`, { AttachStdout: true, AttachStderr: true, Tty: true, Cmd: cmd })
  return docker('POST', `/exec/${ex.Id}/start`, { Detach: false, Tty: true }, { raw: true, timeout: 120000 })
}

async function compatibility() {
  const checks = []
  const add = (id, feature, ok, detail) => checks.push({ id, feature, ok: !!ok, detail: detail || '' })
  // 1. Audiobookshelf's API, as ABS+ uses it
  let lib = null
  for (const [p, feature] of API_CHECKS) {
    try {
      if (p === '@items') {
        if (!lib) {
          add(p, feature, true, 'no library to try')
          continue
        }
        const page = await absApi.serviceJson(`/api/libraries/${encodeURIComponent(lib.id)}/items?limit=1`)
        const first = page && page.results && page.results[0]
        if (!first) {
          add(p, feature, true, 'library is empty')
          continue
        }
        const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(first.id)}?expanded=1`)
        add(p, feature, item && item.media, item && item.media ? '' : 'item details changed')
      } else if (p === '@authors') {
        if (!lib) {
          add(p, feature, true, 'no library to try')
          continue
        }
        const j = await absApi.serviceJson(`/api/libraries/${encodeURIComponent(lib.id)}/authors`)
        add(p, feature, j && Array.isArray(j.authors), j && Array.isArray(j.authors) ? '' : 'authors list changed')
      } else {
        const j = await absApi.serviceJson(p)
        add(p, feature, j !== null, j === null ? 'not found' : '')
        if (p === '/api/libraries' && j) {
          const libs = Array.isArray(j) ? j : j.libraries || []
          lib = libs.find((l) => l.mediaType === 'book') || libs[0] || null
        }
      }
    } catch (e) {
      add(p, feature, false, e.message)
    }
  }
  // 2. The ABS+ script still gets into Audiobookshelf's web pages (through this proxy)
  try {
    const base = config.routerBasePath || ''
    const html = await (await fetch(`http://127.0.0.1:${config.port}${base}/`, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(10000) })).text() // as a browser asks for it
    add('inject', 'All ABS+ features in the web player', html.includes('/_abs_transcription/transcription.js'), 'ABS+ script not in the web page')
  } catch (e) {
    add('inject', 'All ABS+ features in the web player', false, e.message)
  }
  // 3. The web app still has what the ABS+ web features hook into
  if (dockerReady()) {
    try {
      const c = await docker('GET', `/containers/${encodeURIComponent(CONTAINER)}/json`)
      const pattern = WEB_HOOKS.map(([m]) => m.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')
      const out = await execIn(c.Id, ['sh', '-c', `for d in /app/client/dist/_nuxt /client/dist/_nuxt; do [ -d "$d" ] && cat "$d"/*.js && break; done | grep -o -E '${pattern}' | sort -u`])
      const found = new Set(out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))
      for (const [m, feature] of WEB_HOOKS) add(`hook:${m}`, feature, found.has(m), `"${m}" is gone from the web app`)
    } catch (e) {
      add('hooks', 'Web features', false, `couldn't look inside the web app: ${e.message}`)
    }
  }
  return { at: Date.now(), ok: checks.every((c) => c.ok), checks }
}

// ---------------------------------------------------------------- the module

class AbsUpdate {
  constructor() {
    this.settings = { ...DEFAULTS }
    try {
      Object.assign(this.settings, JSON.parse(fs.readFileSync(FILE, 'utf8')))
    } catch (e) {}
    this.job = null
    this.timer = setInterval(() => this.tick().catch((e) => log.warn(`Audiobookshelf update check: ${e.message}`)), 60 * 1000)
    this.timer.unref()
  }

  save() {
    try {
      fs.writeFileSync(FILE, JSON.stringify(this.settings, null, 2))
    } catch (e) {
      log.warn(`Couldn't save update settings: ${e.message}`)
    }
  }

  set(body) {
    const s = this.settings
    if (['off', 'notify', 'install'].includes(body.auto)) s.auto = body.auto
    if (/^\d{1,2}:\d{2}$/.test(body.time || '')) s.time = body.time.padStart(5, '0')
    if (body.allowMajor !== undefined) s.allowMajor = !!body.allowMajor
    this.save()
    return this.status()
  }

  async status(fresh) {
    const running = await runningVersion()
    let latest = null
    let error = null
    try {
      latest = await latestRelease(fresh)
    } catch (e) {
      error = `Couldn't ask GitHub for the newest version: ${e.message}`
    }
    let container = null
    if (dockerReady()) {
      try {
        const c = await docker('GET', `/containers/${encodeURIComponent(CONTAINER)}/json`)
        container = { name: c.Name.replace(/^\//, ''), image: c.Config.Image, state: c.State.Status }
      } catch (e) {
        error = error || `Docker is reachable but the Audiobookshelf container "${CONTAINER}" wasn't found (set ABS_CONTAINER)`
      }
    }
    const available = !!(running && latest && newer(latest.version, running))
    const major = available && parse(latest.version)[0] !== parse(running)[0]
    return {
      running,
      latest,
      available,
      major,
      canInstall: dockerReady() && !!container,
      dockerReady: dockerReady(),
      container,
      settings: this.settings,
      job: this.job,
      error
    }
  }

  /** Is anyone listening right now? (an update restarts Audiobookshelf for about a minute) */
  async listeners() {
    try {
      const j = await absApi.serviceJson('/api/users/online')
      // Sessions left open by a closed tab or phone linger for hours: only ones that moved in the last 10 minutes count
      const recent = Date.now() - 10 * 60 * 1000
      return ((j && j.openSessions) || []).filter((s) => (s.updatedAt || s.startedAt || 0) > recent).length
    } catch (e) {
      return 0
    }
  }

  async tick() {
    const s = this.settings
    if (s.auto === 'off' || this.job) return
    const [h, m] = s.time.split(':').map(Number)
    const now = new Date()
    if (now.getHours() !== h || now.getMinutes() !== m) return
    if (s.lastCheck && Date.now() - s.lastCheck < 50 * 60 * 1000) return
    s.lastCheck = Date.now()
    this.save()
    const st = await this.status(true)
    if (!st.available) return
    log.info(`Audiobookshelf ${st.latest.version} is out (running ${st.running})`)
    if (s.auto !== 'install' || !st.canInstall) return
    if (st.major && !s.allowMajor) {
      s.lastResult = { ok: false, reason: 'held', at: Date.now(), error: `Version ${st.latest.version} is a major update: not installed automatically. Install it from Settings → Server updates when you're ready.` }
      return this.save()
    }
    const busy = await this.listeners()
    if (busy) {
      s.lastResult = { ok: false, reason: 'held', at: Date.now(), error: `Waited: ${busy} ${busy === 1 ? 'person was' : 'people were'} listening at ${s.time}. Tries again tomorrow.` }
      return this.save()
    }
    this.install('schedule')
  }

  /** Update now (in the background); by = who asked */
  /** Check now that ABS+ still fits the running Audiobookshelf */
  async checkCompat() {
    this.settings.lastCompat = await compatibility()
    this.save()
    return this.settings.lastCompat
  }

  install(by = 'admin', { image, force } = {}) {
    if (this.job) throw Object.assign(new Error('An update is already running'), { status: 409 })
    if (!dockerReady()) throw Object.assign(new Error('ABS+ needs the Docker socket to update Audiobookshelf (see Settings → Server updates)'), { status: 400 })
    this.job = { kind: image ? 'rollback' : 'update', step: 'Starting', by, startedAt: Date.now() }
    this.recreate(image, !!force)
      .then((r) => {
        this.settings.lastResult = { ok: true, at: Date.now(), ...r }
        log.info(r.message)
      })
      .catch((e) => {
        // reason: 'features' (the new version would break ABS+ features), 'start' (it didn't come up) or other
        this.settings.lastResult = { ok: false, at: Date.now(), error: e.message, reason: e.reason || 'other', target: e.target || null, broken: e.broken || null, keptVersion: e.keptVersion || null }
        log.warn(`Audiobookshelf update failed${e.reason === 'features' ? ' due to features breaking' : ''}: ${e.message}`)
      })
      .finally(() => {
        this.save()
        this.job = null
      })
    return this.job
  }

  rollback() {
    const p = this.settings.previous
    if (!p) throw Object.assign(new Error('There is no earlier version to go back to'), { status: 400 })
    return this.install('admin', { image: p.imageId })
  }

  async recreate(rollbackImage, force) {
    const job = this.job
    const step = (t) => {
      job.step = t
      log.info(`Audiobookshelf update: ${t}`)
    }
    const old = await docker('GET', `/containers/${encodeURIComponent(CONTAINER)}/json`)
    const name = old.Name.replace(/^\//, '')
    const ref = old.Config.Image
    const oldVersion = await runningVersion()
    let image = rollbackImage
    if (!image) {
      step(`Downloading the newest ${ref}`)
      await pull(ref)
      const fresh = await docker('GET', `/images/${encodeURIComponent(ref)}/json`)
      if (fresh.Id === old.Image) return { message: `Audiobookshelf ${oldVersion || ''} is already the newest image`.replace('  ', ' '), version: oldVersion }
      image = ref
    }
    const oldImage = await docker('GET', `/images/${encodeURIComponent(old.Image)}/json`).catch(() => null)
    const newImage = await docker('GET', `/images/${encodeURIComponent(image)}/json`)

    // Keep the old version around (tagged) so it can come back
    const { repo } = splitRef(ref)
    await docker('POST', `/images/${encodeURIComponent(old.Image)}/tag?repo=${encodeURIComponent(repo)}&tag=${PREVIOUS_TAG}`).catch(() => {})

    // What the person set (compose / Portainer), without what the old image itself brought along
    const imgEnv = new Set((oldImage && oldImage.Config.Env) || [])
    const imgLabels = (oldImage && oldImage.Config.Labels) || {}
    const same = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null)
    const cfg = { ...old.Config }
    delete cfg.Hostname
    cfg.Image = image
    cfg.Env = (old.Config.Env || []).filter((e) => !imgEnv.has(e))
    cfg.Labels = Object.fromEntries(Object.entries(old.Config.Labels || {}).filter(([k, v]) => imgLabels[k] !== v))
    if (oldImage && same(old.Config.Cmd, oldImage.Config.Cmd)) delete cfg.Cmd
    if (oldImage && same(old.Config.Entrypoint, oldImage.Config.Entrypoint)) delete cfg.Entrypoint
    if (oldImage && same(old.Config.WorkingDir, oldImage.Config.WorkingDir)) delete cfg.WorkingDir
    if (oldImage && same(old.Config.Healthcheck, oldImage.Config.Healthcheck)) delete cfg.Healthcheck
    const shortId = old.Id.slice(0, 12)
    const endpoints = {}
    for (const [net, v] of Object.entries(old.NetworkSettings.Networks || {})) {
      endpoints[net] = { Aliases: (v.Aliases || []).filter((a) => a !== shortId), ...(v.IPAMConfig ? { IPAMConfig: v.IPAMConfig } : {}), ...(v.Links ? { Links: v.Links } : {}) }
    }

    // What works with ABS+ now, so the new version can be held to it
    step('Checking ABS+ features with the current version')
    const before = await compatibility()

    step('Stopping Audiobookshelf')
    await docker('POST', `/containers/${old.Id}/stop?t=20`, undefined, { timeout: 60000 }).catch(() => {})
    const asideName = `${name}-old-${Date.now().toString(36)}`
    await docker('POST', `/containers/${old.Id}/rename?name=${encodeURIComponent(asideName)}`)
    // Don't let the old one restart on its own while it waits
    await docker('POST', `/containers/${old.Id}/update`, { RestartPolicy: { Name: 'no' } }).catch(() => {})

    let created = null
    try {
      step('Starting the new Audiobookshelf')
      created = await docker('POST', `/containers/create?name=${encodeURIComponent(name)}`, { ...cfg, HostConfig: old.HostConfig, NetworkingConfig: { EndpointsConfig: endpoints } })
      await docker('POST', `/containers/${created.Id}/start`)
      step('Waiting for it to answer')
      const target = rollbackImage ? null : (newImage.Config.Labels || {})['org.opencontainers.image.version'] || null
      const v = await waitHealthy(target)
      if (!v) throw new Error('the new Audiobookshelf did not start properly')
      // ABS+ features: anything that worked before and doesn't now means this version doesn't fit ABS+ yet
      step('Checking ABS+ features with the new version')
      await new Promise((r) => setTimeout(r, 5000))
      const after = await compatibility()
      this.settings.lastCompat = after
      const broken = after.checks.filter((c) => !c.ok && before.checks.some((b) => b.id === c.id && b.ok))
      if (broken.length && !force) {
        const list = [...new Set(broken.map((c) => c.feature))].join('; ')
        throw Object.assign(new Error(`Audiobookshelf ${v} would break ABS+ features (${list})`), {
          reason: 'features',
          target: v,
          broken: broken.map((c) => ({ feature: c.feature, detail: c.detail }))
        })
      }
      await docker('DELETE', `/containers/${old.Id}?force=1`).catch(() => {})
      if (!rollbackImage) this.settings.previous = { imageId: old.Image, version: oldVersion, at: Date.now() }
      else this.settings.previous = null
      return { message: rollbackImage ? `Went back to Audiobookshelf ${v}` : `Audiobookshelf updated from ${oldVersion || '?'} to ${v}`, from: oldVersion, version: v }
    } catch (err) {
      // Put the old one back exactly as it was
      step('Putting the previous version back')
      if (created) await docker('DELETE', `/containers/${created.Id}?force=1`).catch(() => {})
      await docker('POST', `/containers/${old.Id}/rename?name=${encodeURIComponent(name)}`).catch(() => {})
      await docker('POST', `/containers/${old.Id}/update`, { RestartPolicy: old.HostConfig.RestartPolicy }).catch(() => {})
      await docker('POST', `/containers/${old.Id}/start`).catch(() => {})
      await waitHealthy(null, 120000)
      throw Object.assign(new Error(`${err.message}. The previous version (${oldVersion || 'unknown'}) is running again.`), {
        reason: err.reason || 'start',
        target: err.target || null,
        broken: err.broken || null,
        keptVersion: oldVersion || null
      })
    }
  }
}

module.exports = { AbsUpdate, newer, splitRef }

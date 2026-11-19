'use strict'
/**
 * Talks to the real Audiobookshelf server:
 *  - as the signed-in user (their own Authorization header / cookies) to check who they are and what they can open
 *  - as the add-on's service account for background work: item details, audio and ebook files.
 *    The service key is ABS_API_KEY when set; otherwise the add-on creates its own API key the first time an
 *    admin signs in (using that admin's session) and keeps it in <DATA_DIR>/abs-api-key.json.
 */
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const config = require('./config')
const log = require('./log')

const USER_CACHE_MS = 60 * 1000
const userCache = new Map() // credential -> { at, user }
const accessCache = new Map() // credential|itemId -> { at, item }

let apiPrefix = null // '' or the router base path, found on first use

function credentialOf(req) {
  return `${req.headers.authorization || ''}|${req.headers.cookie || ''}`
}

function userHeaders(req) {
  const h = { accept: 'application/json' }
  if (req.headers.authorization) h.authorization = req.headers.authorization
  if (req.headers.cookie) h.cookie = req.headers.cookie
  return h
}

/** Who is calling? Resolves the user JSON from ABS (cached briefly) or null when not signed in. */
async function getUser(req, prefix) {
  const cred = credentialOf(req)
  if (cred === '|') return null
  const c = userCache.get(cred)
  if (c && Date.now() - c.at < USER_CACHE_MS) return c.user
  const res = await fetch(`${config.absUrl}${prefix}/api/me`, { headers: userHeaders(req) })
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw Object.assign(new Error(`Audiobookshelf returned ${res.status} for /api/me`), { status: 502 })
  const user = await res.json()
  await ensureServiceKey(req, prefix, user)
  userCache.set(cred, { at: Date.now(), user })
  if (userCache.size > 500) userCache.delete(userCache.keys().next().value)
  return user
}

/** The library item as this user sees it, or null when they can't open it. */
async function getItemForUser(req, prefix, itemId) {
  const k = `${credentialOf(req)}|${itemId}`
  const c = accessCache.get(k)
  if (c && Date.now() - c.at < USER_CACHE_MS) return c.item
  const res = await fetch(`${config.absUrl}${prefix}/api/items/${encodeURIComponent(itemId)}?expanded=1`, { headers: userHeaders(req) })
  if (res.status === 404 || res.status === 403) return null
  if (!res.ok) throw Object.assign(new Error(`Audiobookshelf returned ${res.status} for the item`), { status: 502 })
  const item = await res.json()
  accessCache.set(k, { at: Date.now(), item })
  if (accessCache.size > 2000) accessCache.delete(accessCache.keys().next().value)
  return item
}

/** GET as the signed-in user (so Audiobookshelf applies their access rules, parental controls included) */
async function userJson(req, prefix, p) {
  const res = await fetch(`${config.absUrl}${prefix}${p}`, { headers: userHeaders(req) })
  if (res.status === 404) return null
  if (!res.ok) throw Object.assign(new Error(`Audiobookshelf returned ${res.status} for ${p}`), { status: res.status === 401 ? 401 : 502 })
  return res.json()
}

const isAdmin = (user) => !!user && (user.type === 'root' || user.type === 'admin')

// ---------------------------------------------------------------- service account

const KEY_NAME = 'abs-plus-transcription'
const keyFile = () => path.join(config.dataDir, 'abs-api-key.json')
const envKey = /^(|paste-.*|changeme|your-.*)$/i.test(config.absApiKey) ? '' : config.absApiKey
let storedKey = null // { apiKey, id, userId, createdAt } from keyFile
let lastProvisionAttempt = 0
let provisioning = null

function loadStoredKey() {
  if (storedKey) return storedKey
  try {
    const j = JSON.parse(fs.readFileSync(keyFile(), 'utf8'))
    if (j && typeof j.apiKey === 'string' && j.apiKey) storedKey = j
  } catch (e) {}
  return storedKey
}

/** The key background work uses: ABS_API_KEY if set, else the one the add-on created itself. */
function serviceKey() {
  if (envKey) return envKey
  const s = loadStoredKey()
  return s ? s.apiKey : ''
}

function hasServiceKey() {
  return !!serviceKey()
}

/** Audiobookshelf rejected the key: forget a self-created one so the next admin sign-in makes a new one. */
function keyRejected() {
  if (envKey) {
    log.warn('ABS_API_KEY was rejected by Audiobookshelf (401). Check the key and that its user is enabled, or remove ABS_API_KEY to let the add-on create its own.')
    return
  }
  if (!storedKey) return
  log.warn("The add-on's own API key was rejected by Audiobookshelf (401); a new one is made the next time an admin signs in")
  storedKey = null
  apiPrefix = null
  try { fs.rmSync(keyFile(), { force: true }) } catch (e) {}
}

/** First admin to sign in (with no key yet): create an API key for that admin and keep it. */
async function ensureServiceKey(req, prefix, user) {
  if (hasServiceKey() || !isAdmin(user) || !user.id) return
  if (provisioning) return provisioning
  if (Date.now() - lastProvisionAttempt < 60 * 1000) return
  lastProvisionAttempt = Date.now()
  provisioning = (async () => {
    try {
      const res = await fetch(`${config.absUrl}${prefix}/api/api-keys`, {
        method: 'POST',
        headers: { ...userHeaders(req), 'content-type': 'application/json' },
        body: JSON.stringify({ name: KEY_NAME, userId: user.id, isActive: true })
      })
      if (!res.ok) {
        log.warn(`Couldn't create an Audiobookshelf API key as ${user.username || user.id}: ${res.status}. Set ABS_API_KEY instead.`)
        return
      }
      const j = await res.json()
      const token = j && j.apiKey && (typeof j.apiKey === 'string' ? j.apiKey : j.apiKey.apiKey)
      if (!token) {
        log.warn("Audiobookshelf created an API key but didn't return it; set ABS_API_KEY instead")
        return
      }
      const rec = { apiKey: token, id: (j.apiKey && j.apiKey.id) || null, name: KEY_NAME, userId: user.id, username: user.username || null, createdAt: new Date().toISOString() }
      fs.mkdirSync(config.dataDir, { recursive: true })
      const tmp = keyFile() + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(rec, null, 2), { mode: 0o600 })
      fs.renameSync(tmp, keyFile())
      storedKey = rec
      apiPrefix = null
      log.info(`Created Audiobookshelf API key "${KEY_NAME}" for ${user.username || user.id}: server transcription is ready`)
    } catch (e) {
      log.warn(`Couldn't create an Audiobookshelf API key: ${e.message}`)
    } finally {
      provisioning = null
    }
  })()
  return provisioning
}

function serviceHeaders() {
  const key = serviceKey()
  if (!key) {
    throw Object.assign(new Error("Server transcription isn't set up yet: an Audiobookshelf admin needs to sign in to this server once (web or app) so it can create its API key."), { status: 503 })
  }
  return { authorization: `Bearer ${key}` }
}

async function detectPrefix() {
  if (apiPrefix !== null) return apiPrefix
  const candidates = [...new Set(['', config.routerBasePath])]
  for (const p of candidates) {
    try {
      const res = await fetch(`${config.absUrl}${p}/api/me`, { headers: serviceHeaders() })
      if (res.status !== 404) {
        if (res.status === 401) keyRejected()
        apiPrefix = p
        return p
      }
    } catch (e) {
      if (e.status) throw e
      log.warn(`Audiobookshelf not reachable at ${config.absUrl}${p}: ${e.message}`)
    }
  }
  apiPrefix = ''
  return ''
}

async function serviceJson(path) {
  const prefix = await detectPrefix()
  const res = await fetch(`${config.absUrl}${prefix}${path}`, { headers: { ...serviceHeaders(), accept: 'application/json' } })
  if (res.status === 404) return null
  if (res.status === 401) keyRejected()
  if (!res.ok) throw new Error(`Audiobookshelf returned ${res.status} for ${path}`)
  return res.json()
}

/** POST / PATCH / DELETE as the service account; returns the JSON reply (or null when empty) */
async function serviceRequest(method, path, body) {
  const prefix = await detectPrefix()
  const res = await fetch(`${config.absUrl}${prefix}${path}`, {
    method,
    headers: { ...serviceHeaders(), accept: 'application/json', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  if (res.status === 401) keyRejected()
  const text = await res.text()
  if (!res.ok) throw Object.assign(new Error(`Audiobookshelf returned ${res.status} for ${method} ${path}${text ? ': ' + text.slice(0, 200) : ''}`), { status: res.status })
  try {
    return text ? JSON.parse(text) : null
  } catch (e) {
    return text
  }
}

async function serviceUrl(path) {
  return `${config.absUrl}${await detectPrefix()}${path}`
}

/** Header block for ffmpeg's -headers option */
function ffmpegHeaders() {
  return `Authorization: Bearer ${serviceKey()}\r\n`
}

async function download(path, dest) {
  const res = await fetch(await serviceUrl(path), { headers: serviceHeaders() })
  if (res.status === 404) return false
  if (res.status === 401) keyRejected()
  if (!res.ok) throw new Error(`Audiobookshelf returned ${res.status} while downloading`)
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest))
  return true
}

/** Audio tracks of a book in playback order: [{ source, startOffset, duration, remote }] */
function tracksOf(item) {
  const media = (item && item.media) || {}
  if (Array.isArray(media.tracks) && media.tracks.length && media.tracks.every((t) => t.contentUrl)) {
    // path: where the file is on disk (the library is mounted at the same place in this container), so the speech
    // worker can read it directly: faster, and damaged files that ffmpeg can't identify over HTTP still decode
    return media.tracks.map((t) => ({ source: t.contentUrl.replace(/^.*?(\/api\/items\/)/, '/api/items/'), path: (t.metadata && t.metadata.path) || null, startOffset: t.startOffset || 0, duration: t.duration || 0, remote: true }))
  }
  const files = (media.audioFiles || []).filter((f) => !f.exclude && !f.invalid).sort((a, b) => (a.index || 0) - (b.index || 0))
  let offset = 0
  return files.map((f) => {
    const t = { source: `/api/items/${item.id}/file/${f.ino}`, path: (f.metadata && f.metadata.path) || null, startOffset: offset, duration: f.duration || 0, remote: true }
    offset += f.duration || 0
    return t
  })
}

module.exports = { serviceHeaders, userJson, serviceRequest, hasServiceKey, getUser, getItemForUser, isAdmin, serviceJson, serviceUrl, ffmpegHeaders, download, tracksOf, detectPrefix }

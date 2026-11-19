import { Capacitor } from '@capacitor/core'
import { AbsTranscriber } from '@/plugins/capacitor'

/**
 * One API for the Transcription view, whichever side does the work:
 *
 *  - "device": the phone's own engine (AbsTranscriber native plugin, sherpa-onnx)
 *  - "server": the Audiobookshelf server, when it runs the abs-transcription add-on (/api/transcription)
 *
 * Same method names and status shape as AbsTranscriber, so the views don't care which one is used.
 * A transcript lives on the phone once it's finished (the native side syncs both ways with the server);
 * while the server is still working on a book, the view reads it straight from the server.
 */

const INFO_TTL = 60 * 1000
const source = new Map() // key -> 'device' | 'server'
const lastServerStatus = new Map() // key -> status
const updateListeners = new Set()
let info = { at: 0, value: undefined }
let pollTimer = null

// Apps with the native AbsTranscriber plugin (Android, and iOS since ABS+ 141)
const isNativeApp = () => ['android', 'ios'].includes(Capacitor.getPlatform())
const nuxt = () => window.$nuxt

async function api(method, path, data) {
  const http = nuxt() && nuxt().$nativeHttp
  if (!http) throw new Error('Not connected to a server')
  return http.request(method, `/api/transcription${path}`, data)
}
const itemPath = (key) => `/items/${encodeURIComponent(key)}`
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])
const connected = () => {
  const s = nuxt() && nuxt().$store
  return !!(s && s.state.user && s.state.user.serverConnectionConfig && s.state.networkConnected !== false)
}

function emit(data) {
  updateListeners.forEach((cb) => {
    try {
      cb(data)
    } catch (e) {
      console.error('[Transcriber] listener', e)
    }
  })
}

/** Slower on battery saver, a hot phone or a flat battery */
function pollMs() {
  const s = nuxt() && nuxt().$store
  try {
    return s.getters['device/perf'].statusPollMs
  } catch (e) {
    return 2500
  }
}

// ---- live updates for books the server is working on

function schedulePoll() {
  if (pollTimer) return
  pollTimer = setTimeout(pollServer, pollMs())
}

async function pollServer() {
  pollTimer = null
  const keys = [...source.entries()].filter(([, s]) => s === 'server').map(([k]) => k)
  if (!keys.length || !updateListeners.size) return
  let anyActive = false
  for (const key of keys) {
    try {
      const prev = lastServerStatus.get(key)
      const st = await api('GET', `${itemPath(key)}/status`)
      lastServerStatus.set(key, st)
      const active = st.status === 'running' || st.status === 'queued' || st.ebookCheck === 'running' || st.ebookCheck === 'queued'
      if (active) anyActive = true
      const changed = !prev || prev.status !== st.status || prev.linesCount !== st.linesCount || prev.revision !== st.revision || prev.ebookCheck !== st.ebookCheck || prev.phase !== st.phase
      if (changed) emit({ ...st, source: 'server' })
      // Finished on the server: take a copy onto the phone, then read it from there
      if (st.status === 'done' && !active && prev && prev.status !== 'done' && isNativeApp()) {
        const res = await withTimeout(AbsTranscriber.syncTranscript({ key, pull: true }), 120000).catch(() => null)
        if (res && res.result === 'pulled') source.set(key, 'device')
      }
    } catch (e) {}
  }
  if (anyActive) schedulePoll()
  else pollTimer = setTimeout(pollServer, pollMs() * 6)
}

export const Transcriber = {
  /** Library-wide transcription on the server (admins): GET /library, PUT /settings, POST /transcribe, POST /cancel */
  admin(method, path, data) {
    return api(method, `/admin${path}`, data)
  },

  /** /api/transcription/info, or null when the server doesn't have the add-on */
  async serverInfo(force) {
    if (!connected()) return null
    if (!force && info.value !== undefined && Date.now() - info.at < INFO_TTL) return info.value
    try {
      info = { at: Date.now(), value: await withTimeout(api('GET', '/info'), 8000) }
    } catch (e) {
      info = { at: Date.now(), value: null }
    }
    return info.value
  },

  sourceOf(key) {
    return source.get(key) || 'device'
  },

  /**
   * Call when opening a book's transcription: syncs it with the server (so a transcript finished on
   * the server or on another phone is available here, offline too) and works out where to read it from.
   */
  async prepare(key) {
    if (!key) return { status: 'none' }
    const online = connected() && !key.startsWith('local_')
    if (online && isNativeApp()) {
      await withTimeout(AbsTranscriber.syncTranscript({ key, pull: true }), 20000).catch(() => null)
    }
    const local = await AbsTranscriber.getTranscriptStatus({ key }).catch(() => ({ key, status: 'none' }))
    if (local.status !== 'none') {
      source.set(key, 'device')
      return { ...local, source: 'device' }
    }
    if (online && (await this.serverInfo())) {
      try {
        const st = await api('GET', `${itemPath(key)}/status`)
        if (st.status !== 'none') {
          source.set(key, 'server')
          lastServerStatus.set(key, st)
          schedulePoll()
          return { ...st, source: 'server' }
        }
      } catch (e) {}
    }
    source.set(key, 'device')
    return { ...local, source: 'device' }
  },

  async getModels({ engine } = {}) {
    if (engine === 'server') {
      const i = await this.serverInfo()
      if (!i) return { models: [], defaultModelId: null }
      return { models: i.models, defaultModelId: i.defaultModelId, device: i.device }
    }
    return AbsTranscriber.getModels()
  },

  async getTranscriptStatus({ key }) {
    if (this.sourceOf(key) === 'server') {
      try {
        return { ...(await api('GET', `${itemPath(key)}/status`)), source: 'server' }
      } catch (e) {
        return lastServerStatus.get(key) || { key, status: 'none' }
      }
    }
    return { ...(await AbsTranscriber.getTranscriptStatus({ key })), source: 'device' }
  },

  async getTranscript({ key, fromIndex }) {
    if (this.sourceOf(key) === 'server') {
      const res = await api('GET', `${itemPath(key)}/lines?fromIndex=${fromIndex || 0}`)
      return { ...res, status: { ...res.status, source: 'server' } }
    }
    return AbsTranscriber.getTranscript({ key, fromIndex })
  },

  /** { key, modelId, restart, startSec, engine: 'server' | 'device' } */
  async startTranscription({ key, modelId, restart, startSec, engine }) {
    const where = engine || this.sourceOf(key)
    if (where === 'server') {
      const st = await api('POST', `${itemPath(key)}/start`, { modelId, restart: !!restart, startSec })
      source.set(key, 'server')
      lastServerStatus.set(key, st)
      schedulePoll()
      return { ...st, source: 'server' }
    }
    // Don't race a job the server is already running for this book
    if (connected() && (await this.serverInfo())) {
      const st = await api('GET', `${itemPath(key)}/status`).catch(() => null)
      if (st && st.engine === 'server' && (st.status === 'running' || st.status === 'queued')) {
        throw new Error('The server is already transcribing this book. Pause it there first, or follow it here.')
      }
    }
    source.set(key, 'device')
    return { ...(await AbsTranscriber.startTranscription({ key, modelId, restart, startSec })), source: 'device' }
  },

  async pauseTranscription({ key }) {
    if (this.sourceOf(key) === 'server') return api('POST', `${itemPath(key)}/pause`)
    return AbsTranscriber.pauseTranscription({ key })
  },

  async cancelTranscription({ key }) {
    if (this.sourceOf(key) === 'server') return api('POST', `${itemPath(key)}/cancel`)
    return AbsTranscriber.cancelTranscription({ key })
  },

  async deleteTranscript({ key }) {
    if (this.sourceOf(key) === 'server') {
      await api('DELETE', itemPath(key))
      source.delete(key)
      return
    }
    // The native side also deletes the server's copy (two-way sync)
    return AbsTranscriber.deleteTranscript({ key })
  },

  /** The server's status for this book (the ebook check's progress included), or null */
  async serverStatus(key) {
    if (!connected()) return null
    return api('GET', `${itemPath(key)}/status`)
  },

  /** Is this book's transcript on the server (where spelling is checked against the ebook)? */
  async onServer(key) {
    if (!key || key.startsWith('local_') || !connected() || !(await this.serverInfo())) return false
    try {
      const st = await api('GET', `${itemPath(key)}/status`)
      return !!st && st.status !== 'none'
    } catch (e) {
      return false
    }
  },

  /**
   * Spelling against the ebook is always checked on the server (it has the book and the processing power);
   * a transcript made on this phone is sent there first. The result reaches the phone with the next sync.
   */
  async checkWithEbook({ key }) {
    if (!(await this.onServer(key)) && connected() && isNativeApp()) {
      await withTimeout(AbsTranscriber.syncTranscript({ key, pull: false }), 60000).catch(() => null)
    }
    if (!(await this.onServer(key))) throw new Error('Checking spelling against the book needs your server: connect and try again.')
    return { ...(await api('POST', `${itemPath(key)}/ebook-check`)), source: 'server' }
  },

  /**
   * Book analysis on the server: the checks a finished transcription gets, again, without transcribing again
   * (ebook read afresh and compared, book text for Karaoke / read along rebuilt, .lrc files rewritten).
   * A transcript made on this phone is copied to the server first.
   */
  async analyzeBook({ key }) {
    if (!(await this.onServer(key)) && connected() && isNativeApp()) {
      await withTimeout(AbsTranscriber.syncTranscript({ key, pull: false }), 60000).catch(() => null)
    }
    if (!(await this.onServer(key))) throw new Error('Book analysis runs on your server: connect and try again.')
    return { ...(await api('POST', `${itemPath(key)}/analyze`)), source: 'server' }
  },

  /** The server's result when it can be reached, else the copy on this phone (offline) */
  async getEbookCheck({ key }) {
    if (await this.onServer(key)) return api('GET', `${itemPath(key)}/ebook-check`)
    return AbsTranscriber.getEbookCheck({ key })
  },

  /** The ebook's paragraphs (saved by the ebook check), for the karaoke view: { text } */
  async getEbookText({ key }) {
    if (await this.onServer(key)) {
      const res = await api('GET', `${itemPath(key)}/ebook-text`).catch(() => null)
      if (res && res.text) return res
    }
    return AbsTranscriber.getEbookText({ key })
  },

  async updateSuggestions({ key, ids, status }) {
    if (await this.onServer(key)) {
      const res = await api('POST', `${itemPath(key)}/suggestions`, { ids, status })
      // the phone's offline copy follows
      if (isNativeApp()) withTimeout(AbsTranscriber.syncTranscript({ key, pull: true }), 60000).catch(() => null)
      return res
    }
    return AbsTranscriber.updateSuggestions({ key, ids, status })
  },

  /** Background sync of everything on the phone (after connecting to the server). */
  async syncAll() {
    if (!isNativeApp() || !connected()) return
    if (!(await this.serverInfo(true))) return
    AbsTranscriber.syncAll().catch(() => {})
  },

  /** Same events as AbsTranscriber; onTranscriptionUpdate also covers books the server is working on. */
  async addListener(event, cb) {
    // a missing native plugin mustn't stop following a transcription the server is doing
    const native = await Promise.resolve(AbsTranscriber.addListener(event, cb)).catch(() => null)
    if (event !== 'onTranscriptionUpdate') return native
    updateListeners.add(cb)
    schedulePoll()
    return {
      remove() {
        updateListeners.delete(cb)
        native && native.remove && native.remove()
      }
    }
  },

  // Phone-only model management
  downloadModel: (o) => AbsTranscriber.downloadModel(o),
  cancelModelDownload: (o) => AbsTranscriber.cancelModelDownload(o),
  importModel: (o) => AbsTranscriber.importModel(o),
  deleteModel: (o) => AbsTranscriber.deleteModel(o)
}

export default Transcriber

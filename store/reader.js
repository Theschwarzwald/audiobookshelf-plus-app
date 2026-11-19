import { Preferences } from '@capacitor/preferences'

/**
 * E-reader data that has to work offline and reach other devices later:
 *
 *  - annotations: bookmarks, highlights and notes per book. Synced with the server's transcription
 *    add-on (/api/transcription/reader/:id/annotations), per user, latest edit wins.
 *  - progress: Audiobookshelf's own ebook progress (ebookLocation / ebookProgress), so the web reader
 *    and other devices pick it up. Saves that fail (offline) wait here and are sent on reconnect.
 *
 * Books that exist only on the phone (ids starting with "local") keep everything on the phone.
 */

const ANN_KEY = 'reader.annotations.v1'
const PROG_KEY = 'reader.progress.v1'
const isLocalItem = (id) => !id || String(id).startsWith('local')

export const state = () => ({
  books: {}, // key -> { seq, records: { id: record } }
  progress: {}, // serverLibraryItemId -> { ebookLocation, ebookProgress, lastUpdate }
  loaded: false,
  syncing: {},
  // Opening a book at a Notebook entry: { key, location, fraction }, used once by the reader
  jump: null
})

export const getters = {
  annotationsFor: (state) => (key) => {
    const b = state.books[key]
    if (!b) return []
    return Object.values(b.records)
      .filter((r) => !r.deleted)
      .sort((a, b) => a.fraction - b.fraction || a.createdAt - b.createdAt)
  },
  bookmarksFor: (state, getters) => (key) => getters.annotationsFor(key).filter((r) => r.type === 'bookmark'),
  highlightsFor: (state, getters) => (key) => getters.annotationsFor(key).filter((r) => r.type === 'highlight'),
  pendingFor: (state) => (key) => {
    const b = state.books[key]
    return b ? Object.values(b.records).filter((r) => r.dirty).length : 0
  }
}

export const mutations = {
  setAll(state, { books, progress }) {
    state.books = books || {}
    state.progress = progress || {}
    state.loaded = true
  },
  putRecord(state, { key, record }) {
    if (!state.books[key]) state.books = { ...state.books, [key]: { seq: 0, records: {} } }
    const b = state.books[key]
    b.records = { ...b.records, [record.id]: record }
  },
  setSeq(state, { key, seq }) {
    if (state.books[key]) state.books[key].seq = seq
  },
  setProgress(state, { id, payload }) {
    state.progress = { ...state.progress, [id]: payload }
  },
  clearProgress(state, { id, lastUpdate }) {
    if (state.progress[id] && state.progress[id].lastUpdate === lastUpdate) {
      const p = { ...state.progress }
      delete p[id]
      state.progress = p
    }
  },
  setJump(state, jump) {
    state.jump = jump
  },
  setSyncing(state, { key, v }) {
    state.syncing = { ...state.syncing, [key]: v }
  }
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
const canSync = (rootState) => !!(rootState.user && rootState.user.user && rootState.user.serverConnectionConfig && rootState.networkConnected !== false)

export const actions = {
  async init({ state, commit, dispatch }) {
    if (state.loaded) return
    try {
      const [a, p] = await Promise.all([Preferences.get({ key: ANN_KEY }), Preferences.get({ key: PROG_KEY })])
      commit('setAll', { books: a && a.value ? JSON.parse(a.value) : {}, progress: p && p.value ? JSON.parse(p.value) : {} })
    } catch (e) {
      commit('setAll', { books: {}, progress: {} })
    }
    this.watch(
      (s) => s.networkConnected,
      (c) => c && dispatch('flushAll')
    )
  },

  async persist({ state }) {
    try {
      await Preferences.set({ key: ANN_KEY, value: JSON.stringify(state.books) })
      await Preferences.set({ key: PROG_KEY, value: JSON.stringify(state.progress) })
    } catch (e) {
      console.error('[reader] save failed', e)
    }
  },

  /** Add or edit a bookmark/highlight. Returns the record. */
  async saveAnnotation({ state, commit, dispatch }, { key, record }) {
    await dispatch('init')
    const now = Date.now()
    const prev = record.id && state.books[key] && state.books[key].records[record.id]
    const r = { ...(prev || {}), ...record, id: record.id || uid(), createdAt: (prev && prev.createdAt) || record.createdAt || now, updatedAt: now, deleted: false, dirty: !isLocalItem(key) }
    commit('putRecord', { key, record: r })
    await dispatch('persist')
    dispatch('syncAnnotations', key)
    return r
  },

  async removeAnnotation({ state, commit, dispatch }, { key, id }) {
    const prev = state.books[key] && state.books[key].records[id]
    if (!prev) return
    commit('putRecord', { key, record: { ...prev, deleted: true, updatedAt: Date.now(), dirty: !isLocalItem(key) } })
    await dispatch('persist')
    dispatch('syncAnnotations', key)
  },

  /** Two-way sync of one book's annotations with the server add-on (no-op offline / without it). */
  async syncAnnotations({ state, commit, dispatch, rootState }, key) {
    await dispatch('init')
    if (isLocalItem(key) || !canSync(rootState) || state.syncing[key]) return
    commit('setSyncing', { key, v: true })
    try {
      const b = state.books[key] || { seq: 0, records: {} }
      const changes = Object.values(b.records)
        .filter((r) => r.dirty)
        .map(({ dirty, ...r }) => r)
      const res = await this.$nativeHttp.post(`/api/transcription/reader/${encodeURIComponent(key)}/annotations`, { since: b.seq || 0, changes })
      if (!res || typeof res.seq !== 'number') return
      const sent = new Map(changes.map((c) => [c.id, c.updatedAt]))
      for (const r of res.annotations || []) {
        const local = state.books[key] && state.books[key].records[r.id]
        // Edited again while syncing: keep the newer local edit queued
        if (local && local.dirty && local.updatedAt > r.updatedAt) continue
        commit('putRecord', { key, record: { ...r, dirty: false } })
      }
      for (const [id, updatedAt] of sent) {
        const local = state.books[key].records[id]
        if (local && local.dirty && local.updatedAt === updatedAt) commit('putRecord', { key, record: { ...local, dirty: false } })
      }
      commit('setSeq', { key, seq: res.seq })
      await dispatch('persist')
    } catch (e) {
      // offline, signed out, or a server without the add-on: try again later
      console.warn('[reader] annotation sync skipped:', e && e.message)
    } finally {
      commit('setSyncing', { key, v: false })
    }
  },

  /** Ebook progress for a server item: sent now if possible, otherwise kept until reconnect. */
  async saveProgress({ commit, dispatch }, { serverLibraryItemId, ebookLocation, ebookProgress }) {
    if (!serverLibraryItemId) return
    commit('setProgress', { id: serverLibraryItemId, payload: { ebookLocation, ebookProgress, lastUpdate: Date.now() } })
    await dispatch('persist')
    await dispatch('flushProgress')
  },

  async flushProgress({ state, commit, dispatch, rootState }) {
    if (!canSync(rootState)) return
    let changed = false
    for (const [id, p] of Object.entries(state.progress)) {
      try {
        await this.$nativeHttp.patch(`/api/me/progress/${id}`, p)
        commit('clearProgress', { id, lastUpdate: p.lastUpdate })
        changed = true
      } catch (e) {
        break // offline: keep the rest
      }
    }
    if (changed) await dispatch('persist')
  },

  async flushAll({ state, dispatch }) {
    await dispatch('flushProgress')
    for (const key of Object.keys(state.books)) {
      if (Object.values(state.books[key].records).some((r) => r.dirty)) await dispatch('syncAnnotations', key)
    }
  }
}

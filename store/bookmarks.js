import { Preferences } from '@capacitor/preferences'

/**
 * Bookmarks that work offline and sync to Audiobookshelf later.
 *
 * `list` holds every bookmark the phone knows about (server copies plus local changes) and is saved
 * on the device, so the list shows up without a connection. Local changes are flagged:
 *   dirty: true            created or edited here, not on the server yet
 *   deleted: true          removed here, delete still to be sent
 *   local: true            never been on the server (a delete can just drop it)
 *
 * When connected, flush() sends the changes (POST new / PATCH edited / DELETE removed) in order.
 * Whenever the server's list arrives (sign-in, socket `user_updated`), mergeServer() takes it as the
 * truth for everything without a pending local change. Bookmarks on items that only exist on the
 * phone (ids starting with "local") stay on the phone.
 */

const KEY = 'bookmarks.v1'
const same = (a, b) => a.libraryItemId === b.libraryItemId && a.time === b.time
const isLocalItem = (id) => !id || String(id).startsWith('local')

export const state = () => ({
  list: [],
  loaded: false,
  flushing: false
})

export const getters = {
  forItem: (state) => (libraryItemId) => {
    if (!libraryItemId) return []
    return state.list.filter((b) => b.libraryItemId === libraryItemId && !b.deleted).sort((a, b) => a.time - b.time)
  },
  pendingCount: (state) => state.list.filter((b) => b.dirty || b.deleted).length
}

export const mutations = {
  setList(state, list) {
    state.list = list
  },
  setLoaded(state, v) {
    state.loaded = v
  },
  setFlushing(state, v) {
    state.flushing = v
  },
  upsert(state, bm) {
    const i = state.list.findIndex((b) => same(b, bm))
    if (i >= 0) state.list.splice(i, 1, { ...state.list[i], ...bm })
    else state.list.push(bm)
  },
  drop(state, bm) {
    state.list = state.list.filter((b) => !same(b, bm))
  }
}

function canSync(rootState) {
  return !!(rootState.user && rootState.user.user && rootState.user.serverConnectionConfig && rootState.networkConnected !== false)
}

export const actions = {
  async init({ state, commit, dispatch, rootState }) {
    if (!state.loaded) {
      try {
        const res = await Preferences.get({ key: KEY })
        const saved = res && res.value ? JSON.parse(res.value) : []
        // Keep anything added before the saved list finished loading
        const merged = saved.filter((s) => !state.list.some((b) => same(b, s))).concat(state.list)
        commit('setList', merged)
      } catch (e) {
        console.error('[bookmarks] load failed', e)
      }
      commit('setLoaded', true)
      // The server's copy arrives with the user (sign-in) and with every user_updated socket event
      this.watch(
        (s) => s.user.user && s.user.user.bookmarks,
        (list) => list && dispatch('mergeServer', list)
      )
      this.watch(
        (s) => s.networkConnected,
        (connected) => connected && dispatch('flush')
      )
    }
    const serverList = rootState.user.user && rootState.user.user.bookmarks
    if (serverList) await dispatch('mergeServer', serverList)
    else dispatch('flush')
  },

  async persist({ state }) {
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(state.list) })
    } catch (e) {
      console.error('[bookmarks] save failed', e)
    }
  },

  async mergeServer({ state, commit, dispatch }, serverList) {
    const pending = state.list.filter((b) => b.dirty || b.deleted || isLocalItem(b.libraryItemId))
    const fromServer = serverList.filter((s) => !pending.some((p) => same(p, s))).map((s) => ({ libraryItemId: s.libraryItemId, time: s.time, title: s.title, createdAt: s.createdAt }))
    commit('setList', pending.concat(fromServer))
    await dispatch('persist')
    if (pending.some((b) => (b.dirty || b.deleted) && !isLocalItem(b.libraryItemId))) dispatch('flush')
  },

  /** Create or update (same item + second = same bookmark). Works offline. */
  async save({ state, commit, dispatch }, { libraryItemId, time, title }) {
    const existing = state.list.find((b) => b.libraryItemId === libraryItemId && b.time === time)
    const bm = {
      libraryItemId,
      time,
      title,
      createdAt: existing ? existing.createdAt : Date.now(),
      // Bookmarks on phone-only books have nothing to sync to
      dirty: !isLocalItem(libraryItemId),
      deleted: false,
      local: existing ? !!existing.local && !!existing.dirty : true
    }
    if (existing && !existing.deleted && !existing.local) bm.local = false
    commit('upsert', bm)
    await dispatch('persist')
    dispatch('flush')
    return bm
  },

  async remove({ state, commit, dispatch }, { libraryItemId, time }) {
    const existing = state.list.find((b) => b.libraryItemId === libraryItemId && b.time === time)
    if (!existing) return
    if (existing.local || isLocalItem(libraryItemId)) commit('drop', existing)
    else commit('upsert', { ...existing, deleted: true, dirty: false })
    await dispatch('persist')
    dispatch('flush')
  },

  /** Sends local changes to the server. Safe to call any time; does nothing offline. */
  async flush({ state, commit, dispatch, rootState, rootGetters }) {
    if (state.flushing || !canSync(rootState)) return
    commit('setFlushing', true)
    let changed = false
    try {
      const queue = state.list.filter((b) => (b.dirty || b.deleted) && !isLocalItem(b.libraryItemId))
      for (const bm of queue) {
        const path = `/api/me/item/${bm.libraryItemId}/bookmark`
        try {
          if (bm.deleted) {
            try {
              await this.$nativeHttp.delete(`${path}/${bm.time}`)
            } catch (e) {
              if (!/404|not found/i.test(e.message || '')) throw e
            }
            commit('drop', bm)
            commit('user/deleteBookmark', { libraryItemId: bm.libraryItemId, time: bm.time }, { root: true })
          } else {
            const onServer = (rootGetters['user/getUserBookmarksForItem'](bm.libraryItemId) || []).some((b) => b.time === bm.time)
            let saved
            try {
              saved = onServer ? await this.$nativeHttp.patch(path, { libraryItemId: bm.libraryItemId, time: bm.time, title: bm.title }) : await this.$nativeHttp.post(path, { time: bm.time, title: bm.title })
            } catch (e) {
              // Created elsewhere meanwhile (POST refused) or gone (PATCH refused): try the other way once
              saved = onServer ? await this.$nativeHttp.post(path, { time: bm.time, title: bm.title }) : await this.$nativeHttp.patch(path, { libraryItemId: bm.libraryItemId, time: bm.time, title: bm.title })
            }
            const current = state.list.find((b) => same(b, bm))
            // Edited again while uploading: leave it dirty for the next round
            if (current && current.title === bm.title) commit('upsert', { ...current, dirty: false, local: false })
            commit('user/addBookmark', saved && saved.time !== undefined ? saved : { libraryItemId: bm.libraryItemId, time: bm.time, title: bm.title, createdAt: bm.createdAt }, { root: true })
          }
          changed = true
        } catch (e) {
          console.warn('[bookmarks] sync stopped, will retry later', e && e.message)
          break // probably offline; keep the rest queued
        }
      }
    } finally {
      commit('setFlushing', false)
      if (changed) await dispatch('persist')
    }
  }
}

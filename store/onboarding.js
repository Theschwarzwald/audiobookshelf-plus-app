import { Preferences } from '@capacitor/preferences'
import { applyColorVision } from '@/components/onboarding/colorVision'

/**
 * First-time setup, the tutorial, the guided tour, and the "it's been a while" refresher.
 *
 *  1. First start: choose how the app looks (Automatic from the device, or dark / black (OLED) /
 *     light / e-ink …) and a colour vision mode. Both stay changeable in Settings.
 *  2. Then the written tutorial; its last page offers "Show me around": a guided tour that highlights
 *     the real buttons on each screen the first time you get there (home, book page, player,
 *     Transcription, readers).
 *  3. Opened after 30+ days away: "It's been a while, need a refresher on how to use me?"
 */
const KEY = 'onboarding.v1'
// bump when the tours change: screens seen with an older version are shown around again once
const TOUR_REV = 3
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000

export const state = () => ({
  loaded: false,
  setupDone: false,
  tutorialDone: false,
  toursEnabled: false,
  toursSeen: {},
  lastUsedAt: 0,
  colorVision: 'none',
  // on screen now
  showSetup: false,
  showTutorial: false,
  showWelcomeBack: false,
  activeTour: null
})

const persisted = (s) => ({ setupDone: s.setupDone, tutorialDone: s.tutorialDone, toursEnabled: s.toursEnabled, toursSeen: s.toursSeen, lastUsedAt: s.lastUsedAt, colorVision: s.colorVision })

export const mutations = {
  load(state, saved) {
    Object.assign(state, saved || {}, { loaded: true })
  },
  set(state, changes) {
    Object.assign(state, changes)
  },
  seen(state, screen) {
    state.toursSeen = { ...state.toursSeen, [screen]: TOUR_REV }
  }
}

export const actions = {
  async init({ state, commit, dispatch }) {
    if (state.loaded) return
    let saved = null
    try {
      const r = await Preferences.get({ key: KEY })
      saved = r && r.value ? JSON.parse(r.value) : null
    } catch (e) {}
    commit('load', saved)
    applyColorVision(state.colorVision)
    if (!state.setupDone) {
      commit('set', { showSetup: true })
    } else if (state.lastUsedAt && Date.now() - state.lastUsedAt > REFRESH_AFTER_MS) {
      commit('set', { showWelcomeBack: true })
    }
    await dispatch('touch')
    // Coming back to the app after a long time without closing it counts too
    try {
      const { App } = await import('@capacitor/app')
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return dispatch('touch')
        if (state.setupDone && !state.showTutorial && state.lastUsedAt && Date.now() - state.lastUsedAt > REFRESH_AFTER_MS) commit('set', { showWelcomeBack: true })
        dispatch('touch')
      })
    } catch (e) {}
  },

  async persist({ state }) {
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(persisted(state)) })
    } catch (e) {}
  },

  touch({ commit, dispatch }) {
    commit('set', { lastUsedAt: Date.now() })
    return dispatch('persist')
  },

  setColorVision({ commit, dispatch }, mode) {
    commit('set', { colorVision: mode || 'none' })
    applyColorVision(mode)
    return dispatch('persist')
  },

  /** End of first-time setup: on to the tutorial */
  finishSetup({ commit, dispatch }) {
    commit('set', { setupDone: true, showSetup: false, showTutorial: true })
    return dispatch('persist')
  },

  openSetup({ commit }) {
    commit('set', { showSetup: true })
  },

  openTutorial({ commit }) {
    commit('set', { showTutorial: true, showWelcomeBack: false })
  },

  /** End of the tutorial. showAround: guide through the real screens, starting with this one */
  finishTutorial({ commit, dispatch }, showAround) {
    commit('set', { tutorialDone: true, showTutorial: false, toursEnabled: !!showAround, toursSeen: {} })
    dispatch('persist')
    if (showAround) setTimeout(() => window.$nuxt && window.$nuxt.$eventBus.$emit('tour:here'), 400)
  },

  answerWelcomeBack({ commit, dispatch }, yes) {
    commit('set', { showWelcomeBack: false })
    if (yes) dispatch('openTutorial')
  },

  /** A screen asks to be shown around the first time it's opened (when the tour is on) */
  maybeTour({ state, commit }, screen) {
    const seen = state.toursSeen[screen]
    if (!state.toursEnabled || (seen === true ? 1 : seen || 0) >= TOUR_REV || state.activeTour || state.showSetup || state.showTutorial) return
    commit('set', { activeTour: screen })
  },

  runTour({ commit }, screen) {
    commit('set', { activeTour: screen })
  },

  tourDone({ state, commit, dispatch }, { screen, skipAll }) {
    commit('seen', screen)
    commit('set', { activeTour: null })
    if (skipAll) commit('set', { toursEnabled: false })
    return dispatch('persist')
  },

  /** Settings → "Show me around again" */
  resetTours({ commit, dispatch }) {
    commit('set', { toursEnabled: true, toursSeen: {} })
    dispatch('persist')
  }
}

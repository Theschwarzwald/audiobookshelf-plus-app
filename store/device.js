import { AbsDevice } from '@/plugins/capacitor'

/**
 * The device the app is running on, and how to adapt to it.
 *
 *   formFactor  phone | tablet | desktop      (desktop: DeX, ChromeOS, docked, or a mouse on a big screen)
 *   posture     none | flat | book | tabletop (foldables, from the hinge)
 *   tier        low | mid | high              what screens may spend right now (see "learned" below)
 *   lowPower    battery saver on, the phone is hot, the battery is low off the charger, or Battery saver chosen
 *   perf        what screens may spend: render sharpness, pages prepared ahead, animation, polling…
 *
 * Everything defaults to Automatic (Settings → Device & performance changes it; so can Tasker / adb,
 * see AutomationReceiver.kt). Automatic starts at the highest level the hardware could plausibly
 * manage and works down from what the device reports: dropped frames while scrolling, Android
 * asking the app to free memory, heat. After a quiet spell it tries one level up again. The level it
 * settles on is remembered for the next start.
 *
 * It also tags <html> with classes (ff-tablet, eink, oled, low-power, reduce-motion, posture-book…)
 * and CSS variables for the hinge (--hinge-left/top/width/height), and sets the refresh rate:
 * the screen's best (120 Hz…) normally, 60 Hz in low power, Android's own choice on e-ink.
 */

const LEVELS = ['low', 'mid', 'high']
const LEARN_KEY = 'absPlusLearnedLevel'
/**
 * Old single theme values (before System / Light / Dark) and automation values -> appearance
 * (+ the screen type for e-ink ones)
 */
export function fromLegacyTheme(v) {
  switch (v) {
    case 'auto':
    case 'system':
    case '':
    case undefined:
    case null:
      return { mode: 'system' }
    case 'light':
      return { mode: 'light' }
    case 'default':
      return { mode: 'default' }
    case 'dark':
      return { mode: 'dark' }
    case 'black':
      return { mode: 'dark', trueBlack: 'on' }
    case 'eink':
      return { mode: 'light', screen: 'eink' }
    case 'eink-dark':
      return { mode: 'dark', screen: 'eink' }
    case 'eink-color':
      return { mode: 'light', screen: 'eink-color' }
    case 'eink-color-dark':
      return { mode: 'dark', screen: 'eink-color' }
    default:
      return { mode: 'system' }
  }
}

const DEFAULT_PREFS = { formFactor: 'auto', screen: 'auto', refresh: 'auto', power: 'auto', background: 'auto', lowBatteryAt: '20', theme: '', colorVision: '' }

function readLearned() {
  try {
    const j = JSON.parse(localStorage.getItem(LEARN_KEY) || 'null')
    if (j && LEVELS.includes(j.level)) return j
  } catch (e) {}
  return null
}

export const state = () => ({
  profile: null,
  prefs: { ...DEFAULT_PREFS },
  power: { powerSave: false, thermal: 0, battery: -1, charging: true },
  fold: { posture: 'none' },
  width: typeof window !== 'undefined' ? window.innerWidth : 400,
  height: typeof window !== 'undefined' ? window.innerHeight : 800,
  pointerFine: false,
  reducedMotionPref: false,
  systemDark: true,
  // where Automatic has settled: { level, at, reason }; null = at the hardware's ceiling
  learned: null,
  refreshHz: 60,
  // highlight timing (s): + lights words earlier, − later. Bluetooth headphones and speech engines differ a little.
  // how long after the player's position the sound is heard (s): Bluetooth headphones add a few hundred ms
  outputDelay: 0,
  outputBluetooth: false,
  syncOffset: (() => {
    try {
      const v = parseFloat(localStorage.getItem('absPlusSyncOffset'))
      return isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0
    } catch (e) {
      return 0
    }
  })(),
  // System / Light / Dark, and true black under Dark: auto (on for OLED screens) | on | off
  appearance: { mode: 'system', trueBlack: 'auto' }
})

export const getters = {
  ready: (state) => !!state.profile,
  /** The most this hardware could plausibly do (Android's low-RAM flag or little memory caps it) */
  ceiling: (state) => {
    const p = state.profile
    if (!p) return 'high'
    if (p.lowRam || (p.ramMb && p.ramMb < 3800)) return 'low'
    if (p.ramMb && p.ramMb < 5200) return 'mid'
    return 'high'
  },
  /** Android-side hardware guess (low for e.g. 2 performance + 4 efficiency cores and 6 GB); hints only */
  hardwareTier: (state) => (state.profile ? state.profile.tier : 'mid'),
  tier: (state, getters) => {
    const pref = state.prefs.power
    const ceil = LEVELS.indexOf(getters.ceiling)
    if (pref === 'max') return getters.ceiling
    if (pref === 'balanced') return LEVELS[Math.min(1, ceil)]
    if (pref === 'saver') return 'low'
    const l = state.learned && state.learned.level
    return l ? LEVELS[Math.min(ceil, LEVELS.indexOf(l))] : getters.ceiling
  },
  isEink: (state) => {
    const s = state.prefs.screen
    if (s === 'eink' || s === 'eink-color') return true
    if (s === 'lcd' || s === 'oled') return false
    return !!(state.profile && state.profile.eink)
  },
  isColorEink: (state, getters) => {
    const s = state.prefs.screen
    if (s === 'eink-color') return true
    if (s === 'eink') return false
    return getters.isEink && !!(state.profile && state.profile.einkColor)
  },
  isOled: (state, getters) => {
    const s = state.prefs.screen
    if (s === 'oled') return true
    if (s !== 'auto') return false
    return !getters.isEink && !!(state.profile && state.profile.oledLikely)
  },
  lowBatteryAt: (state) => Number(state.prefs.lowBatteryAt) || 20,
  lowPower: (state, getters) => {
    const pref = state.prefs.power
    const p = state.power
    if (pref === 'saver') return true
    if (p.thermal >= 3) return true // too hot always counts, even on "Always full quality"
    if (pref === 'max') return false
    return !!p.powerSave || (p.battery >= 0 && p.battery <= getters.lowBatteryAt && !p.charging)
  },
  formFactor: (state) => {
    const f = state.prefs.formFactor
    if (f === 'phone' || f === 'tablet' || f === 'desktop') return f
    const p = state.profile
    if (p && p.desktop) return 'desktop'
    if (state.pointerFine && state.width >= 1024) return 'desktop'
    const shortSide = Math.min(state.width, state.height)
    return shortSide >= 600 ? 'tablet' : 'phone'
  },
  refreshRates: (state) => [...new Set(((state.profile && state.profile.refreshRates) || []).map((r) => Math.round(r)))].sort((a, b) => a - b),
  /** high refresh rate available (90/120 Hz…) */
  highRefresh: (state, getters) => getters.refreshRates.some((r) => r > 61),
  /** What to ask the screen for: { mode: 'max' | 'default' } or { hz } */
  refreshRequest: (state, getters) => {
    const pref = state.prefs.refresh
    if (getters.isEink) return { mode: 'default' }
    if (/^\d+$/.test(pref)) return getters.lowPower && Number(pref) > 60 ? { hz: 60 } : { hz: Number(pref) }
    if (!getters.highRefresh) return { mode: 'default' }
    // Automatic = 60 Hz: animations at half the rate of a 120 Hz screen use about half the power, and reading /
    // listening looks the same. 120 Hz (or the fastest) is a choice in Settings → Animation speed.
    if (pref === 'max') return { mode: 'max' }
    return { hz: 60 }
  },
  reduceMotion: (state, getters) => state.reducedMotionPref || getters.isEink || getters.lowPower,
  /** The tier screens should plan for right now (low power counts as low) */
  effectiveTier: (state, getters) => (getters.lowPower ? 'low' : getters.tier),
  perf: (state, getters) => {
    const t = getters.effectiveTier
    const eink = getters.isEink
    return {
      tier: t,
      animate: !getters.reduceMotion,
      // page reader: pixel density cap, spreads prepared ahead, screens of pages kept drawn in Doc Viewer
      maxDensity: t === 'low' ? 2 : t === 'mid' ? 3 : 4,
      prefetch: t === 'low' ? 1 : t === 'mid' ? 2 : 3,
      keepScreens: t === 'low' ? 2 : t === 'mid' ? 3 : 5,
      imageCache: t === 'low' ? 6 : t === 'mid' ? 10 : 18,
      thumbWidth: t === 'low' ? 120 : 180,
      // how often things follow the player (ms): e-ink redraws are slow and ghost, so less often
      clockMs: eink ? 500 : t === 'low' ? 500 : 250, // e-ink: often enough that Karaoke doesn't jump words
      statusPollMs: getters.lowPower ? 8000 : 2500
    }
  },
  trueBlack: (state, getters) => {
    const t = state.appearance.trueBlack
    return t === 'on' || (t === 'auto' && getters.isOled)
  },
  /** The theme for an appearance mode on this screen: light/dark, true black, e-ink and colour e-ink versions */
  themeFor: (state, getters) => (mode) => {
    // Default: Audiobookshelf's own colours always — no light / dark switching, true black or e-ink versions
    if (mode === 'default') return 'dark'
    const dark = mode === 'dark' || (mode !== 'light' && state.systemDark)
    if (getters.isEink) return (getters.isColorEink ? 'eink-color' : 'eink') + (dark ? '-dark' : '')
    if (!dark) return 'light'
    return getters.trueBlack ? 'black' : 'dark'
  },
  theme: (state, getters) => getters.themeFor(state.appearance.mode),
  /** Books (readers, Read along, the dictionary card): always the phone's light / dark setting */
  readerTheme: (state, getters) => getters.themeFor('system'),
  /** Where highlights follow the voice: the player's position, minus the output delay, plus the reader's own nudge */
  timeShift: (state) => (state.syncOffset || 0) - (state.outputDelay || 0),
  /** kept for older callers: what System would show */
  autoTheme: (state, getters) => getters.themeFor('system'),
  /** One line for Settings: what was detected and where Automatic has settled */
  summary: (state, getters) => {
    const p = state.profile
    if (!p) return ''
    const bits = [{ phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop mode' }[getters.formFactor]]
    if (p.foldable) bits.push('foldable')
    if (getters.isEink) bits.push(getters.isColorEink ? 'colour e-ink' : 'e-ink')
    else if (getters.isOled) bits.push('OLED')
    const rates = getters.refreshRates
    if (rates.length) bits.push(`up to ${Math.max(...rates)} Hz`)
    if (p.cores) bits.push(p.bigCores && p.littleCores ? `${p.cores} cores (${p.bigCores} fast + ${p.littleCores} efficient)` : `${p.cores} cores`)
    if (p.ramMb) bits.push(`${Math.round(p.ramMb / 1024)} GB`)
    const level = { low: 'light', mid: 'balanced', high: 'full' }[getters.effectiveTier]
    let why = ''
    if (getters.lowPower) why = ' to save power'
    else if (state.prefs.power === 'auto' && state.learned && state.learned.reason && getters.tier !== getters.ceiling) why = ` (eased off because ${state.learned.reason})`
    return `${bits.filter(Boolean).join(' · ')}. Running at ${level} quality${why}, ${state.refreshHz} Hz.`
  }
}

export const mutations = {
  setProfile(state, p) {
    state.profile = p
    state.power = { powerSave: !!p.powerSave, thermal: p.thermal || 0, battery: p.battery, charging: p.charging }
    if (p.fold) state.fold = p.fold
    if (typeof p.systemDark === 'boolean') state.systemDark = p.systemDark
  },
  setPrefs(state, prefs) {
    state.prefs = { ...DEFAULT_PREFS, ...(prefs || {}) }
  },
  setLearned(state, l) {
    state.learned = l
    try {
      if (l) localStorage.setItem(LEARN_KEY, JSON.stringify(l))
      else localStorage.removeItem(LEARN_KEY)
    } catch (e) {}
  },
  setAppearance(state, a) {
    state.appearance = { ...state.appearance, ...a }
  },
  setOutput(state, o) {
    const ms = Number(o && o.latencyMs) || 0
    // the phone's own speaker is near enough to the player's position; headphones over Bluetooth are not
    state.outputBluetooth = !!(o && o.bluetooth)
    // Android's figure covers the phone's own audio path, not Bluetooth's radio and the headphones' buffer:
    // 0.7 s more keeps the words with the voice on typical A2DP headphones (fine-tune: ⋮ → Highlight timing)
    // Not applied: the timing matches the earlier builds (the real drift was MP3 seeking, fixed in the player).
    // Kept for the Highlight timing label; fine-tune there if a headset is slow.
    state.outputDelay = 0
    state.outputMeasuredMs = ms
  },
  setSyncOffset(state, v) {
    state.syncOffset = Math.round(Math.max(-2, Math.min(2, Number(v) || 0)) * 10) / 10
    try {
      localStorage.setItem('absPlusSyncOffset', String(state.syncOffset))
    } catch (e) {}
  },
  setRefreshHz(state, hz) {
    state.refreshHz = Math.round(hz || 60)
  },
  setPower(state, p) {
    state.power = { ...state.power, ...p }
  },
  setFold(state, f) {
    state.fold = f || { posture: 'none' }
  },
  setSize(state, { width, height }) {
    state.width = width
    state.height = height
  },
  setMedia(state, { pointerFine, reducedMotionPref, systemDark }) {
    if (pointerFine !== undefined) state.pointerFine = pointerFine
    if (reducedMotionPref !== undefined) state.reducedMotionPref = reducedMotionPref
    if (systemDark !== undefined) state.systemDark = systemDark
  }
}

let started = false
const jank = { bad: 0, last: 0 }

export const actions = {
  async init({ commit, dispatch, state }) {
    if (started) return
    started = true
    try {
      commit('setProfile', await AbsDevice.getProfile())
    } catch (e) {
      console.warn('[device] profile unavailable', e)
      commit('setProfile', { tier: 'mid', refreshRates: [] })
    }
    try {
      commit('setPrefs', await AbsDevice.getPrefs())
    } catch (e) {}
    commit('setLearned', readLearned())
    const mq = (q) => (window.matchMedia ? window.matchMedia(q) : null)
    const fine = mq('(pointer: fine)')
    const reduce = mq('(prefers-reduced-motion: reduce)')
    const dark = mq('(prefers-color-scheme: dark)')
    commit('setMedia', { pointerFine: !!(fine && fine.matches), reducedMotionPref: !!(reduce && reduce.matches) })
    const watch = (m, key) => m && m.addEventListener && m.addEventListener('change', (e) => (commit('setMedia', { [key]: e.matches }), dispatch('apply')))
    watch(fine, 'pointerFine')
    watch(reduce, 'reducedMotionPref')
    // Android reports light / dark itself (onSystemTheme); the web view's own signal can lag or disagree
    if (!(state.profile && typeof state.profile.systemDark === 'boolean')) watch(dark, 'systemDark')
    let resizeTimer = null
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => (commit('setSize', { width: window.innerWidth, height: window.innerHeight }), dispatch('apply')), 150)
    })
    try {
      AbsDevice.addListener('onPowerChange', (p) => {
        commit('setPower', p)
        if (p.thermal >= 2) dispatch('stepDown', 'the device got warm')
        dispatch('apply')
      })
      AbsDevice.addListener('onFoldChange', (f) => {
        commit('setFold', f)
        dispatch('apply')
      })
      AbsDevice.addListener('onPrefsChange', ({ prefs }) => {
        commit('setPrefs', prefs)
        dispatch('applyAutomation', prefs)
        dispatch('apply')
      })
      AbsDevice.addListener('onMemoryPressure', () => dispatch('stepDown', 'memory was running low'))
      // Headphones in or out: how far behind the voice is heard changes
      const output = () => AbsDevice.getAudioOutput().then((o) => commit('setOutput', o)).catch(() => {})
      output()
      AbsDevice.addListener('onAudioOutput', (o) => commit('setOutput', o))
      setInterval(output, 30000)
      // The phone switched between light and dark mode: the System theme follows straight away
      AbsDevice.addListener('onSystemTheme', ({ dark }) => {
        commit('setMedia', { systemDark: !!dark })
        dispatch('apply')
      })
    } catch (e) {}
    dispatch('startFeedback')
    dispatch('apply')
  },

  /** Change one or more Device & performance choices (saved natively, shared with the service) */
  async setPrefs({ commit, dispatch, state }, values) {
    commit('setPrefs', { ...state.prefs, ...values })
    if (values.power === 'auto') commit('setLearned', null) // start again from the top
    try {
      commit('setPrefs', await AbsDevice.setPrefs(values))
    } catch (e) {}
    dispatch('apply')
  },

  /** Automation (Tasker / adb) can also set the theme and colour vision */
  applyAutomation({ dispatch, state }, prefs) {
    if (prefs.theme && prefs.theme !== applyAutomation.lastTheme) {
      applyAutomation.lastTheme = prefs.theme
      const a = fromLegacyTheme(prefs.theme)
      dispatch('setAppearance', { mode: a.mode, ...(a.trueBlack ? { trueBlack: a.trueBlack } : {}) })
      if (a.screen && state.prefs.screen !== a.screen) dispatch('setPrefs', { screen: a.screen })
    }
    if (prefs.colorVision) dispatch('onboarding/setColorVision', prefs.colorVision, { root: true })
  },

  /** System / Light / Dark and true black; saved, and applied at once */
  setAppearance({ commit, dispatch, state }, a) {
    commit('setAppearance', a)
    if (this.$localStore) this.$localStore.setTheme(state.appearance.mode)
    try {
      localStorage.setItem('absPlusTrueBlack', state.appearance.trueBlack)
    } catch (e) {}
    dispatch('apply')
  },

  /** On start: the saved choice (old single-theme values are converted once) */
  restoreAppearance({ commit, dispatch, state }, saved) {
    const a = fromLegacyTheme(saved)
    let trueBlack = 'auto'
    try {
      trueBlack = localStorage.getItem('absPlusTrueBlack') || 'auto'
    } catch (e) {}
    commit('setAppearance', { mode: a.mode, trueBlack: a.trueBlack || trueBlack })
    const legacy = saved && !['system', 'light', 'dark', 'auto'].includes(saved)
    if (legacy) {
      if (this.$localStore) this.$localStore.setTheme(a.mode)
      try {
        localStorage.setItem('absPlusTrueBlack', state.appearance.trueBlack)
      } catch (e) {}
      if (a.screen) dispatch('setPrefs', { screen: a.screen })
    }
    dispatch('apply')
  },

  /** Automatic: one level down, remembered. Nothing happens on a manual choice. */
  stepDown({ state, getters, commit, dispatch }, reason) {
    if (state.prefs.power !== 'auto') return
    const cur = LEVELS.indexOf(getters.tier)
    if (cur <= 0) return
    const last = state.learned && state.learned.at
    if (last && Date.now() - last < 20000) return // one step at a time
    commit('setLearned', { level: LEVELS[cur - 1], at: Date.now(), reason })
    dispatch('apply')
  },

  /** Automatic: after 15 quiet minutes, try one level up again (never above the hardware's ceiling) */
  stepUp({ state, getters, commit, dispatch }) {
    if (state.prefs.power !== 'auto' || !state.learned) return
    const cur = LEVELS.indexOf(getters.tier)
    if (cur >= LEVELS.indexOf(getters.ceiling)) return
    if (Date.now() - state.learned.at < 15 * 60 * 1000) return
    commit('setLearned', { level: LEVELS[cur + 1], at: Date.now(), reason: '' })
    dispatch('apply')
  },

  /**
   * Feedback from the device, in the background and cheaply: while the user scrolls or swipes, time
   * 1.5 s of frames. Mostly-late frames twice in a row = one level down. Skipped on e-ink, in low
   * power, on manual choices and when the app isn't visible.
   */
  startFeedback({ getters, dispatch, state }) {
    let sampling = false
    const sample = () => {
      if (sampling || document.hidden || getters.isEink || getters.lowPower || state.prefs.power !== 'auto') return
      if (Date.now() - jank.last < 5000) return
      sampling = true
      jank.last = Date.now()
      const budget = 1000 / Math.max(60, state.refreshHz || 60)
      let prev = 0
      let frames = 0
      let late = 0
      const end = performance.now() + 1500
      const step = (t) => {
        if (prev) {
          frames++
          if (t - prev > budget * 2.5) late++
        }
        prev = t
        if (t < end) return requestAnimationFrame(step)
        sampling = false
        if (frames < 15) return
        if (late / frames > 0.25) {
          if (++jank.bad >= 2) {
            jank.bad = 0
            dispatch('stepDown', 'scrolling was dropping frames')
          }
        } else jank.bad = Math.max(0, jank.bad - 1)
      }
      requestAnimationFrame(step)
    }
    window.addEventListener('touchmove', sample, { passive: true })
    window.addEventListener('wheel', sample, { passive: true })
    setInterval(() => dispatch('stepUp'), 5 * 60 * 1000)
  },

  /** Puts the device state on <html> and picks the refresh rate */
  apply({ state, getters, commit }) {
    const html = document.documentElement
    const cls = html.classList
    const set = (name, on) => cls.toggle(name, !!on)
    ;['ff-phone', 'ff-tablet', 'ff-desktop'].forEach((c) => cls.remove(c))
    cls.add(`ff-${getters.formFactor}`)
    ;['tier-low', 'tier-mid', 'tier-high'].forEach((c) => cls.remove(c))
    cls.add(`tier-${getters.effectiveTier}`)
    set('eink-device', getters.isEink)
    set('low-power', getters.lowPower)
    set('reduce-motion', getters.reduceMotion)
    set('pointer-fine', state.pointerFine)
    set('foldable', state.profile && state.profile.foldable)
    ;['posture-book', 'posture-tabletop'].forEach((c) => cls.remove(c))
    const f = state.fold || {}
    if ((f.posture === 'book' || f.posture === 'tabletop') && f.hinge) {
      cls.add(`posture-${f.posture}`)
      html.style.setProperty('--hinge-left', `${f.hinge.left}px`)
      html.style.setProperty('--hinge-top', `${f.hinge.top}px`)
      html.style.setProperty('--hinge-width', `${f.hinge.width}px`)
      html.style.setProperty('--hinge-height', `${f.hinge.height}px`)
    }
    // 120 Hz (or the screen's best) normally, 60 Hz in low power, Android's choice on e-ink, or what Settings says
    const req = getters.refreshRequest
    const want = JSON.stringify(req)
    if (want !== apply.lastRate) {
      apply.lastRate = want
      AbsDevice.setRefreshRate(req)
        .then((r) => r && r.refreshRate && commit('setRefreshHz', r.refreshRate))
        .catch(() => {})
    }
    // Theme: System / Light / Dark on this screen type (true black, e-ink and colour e-ink versions)
    html.dataset.themeChoice = state.appearance.mode
    html.dataset.theme = getters.theme
  }
}
const apply = { lastRate: null }
const applyAutomation = { lastTheme: null }

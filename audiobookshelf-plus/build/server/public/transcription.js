/*
 * Transcription view for the Audiobookshelf web player.
 *
 * Same screen as the Android app (Spotify-lyrics style): timestamped lines, the current line
 * highlighted and followed, a search bar, click a line to jump there, progress with Pause/Resume/Cancel,
 * and the ebook spelling check with Review / Apply all / Ignore all.
 *
 * Injected by the abs-transcription container; talks to /api/transcription on the same server.
 * Hooks into the web client only through window.$nuxt (player position, seek, play/pause), and
 * checks for everything it uses so an Audiobookshelf update can't break the page itself.
 */
;(function () {
  'use strict'
  if (window.__absTranscription) return
  window.__absTranscription = true

  const DISCREPANCY = 'Discrepancy may be caused by narrator ad-libs or edits between book and audiobook.'

  // ------------------------------------------------------------------ device adaptation
  //
  // Same rules as the ABS+ app (DEVICES.md), for the browser: works out the screen (e-ink, colour e-ink,
  // OLED-style dark), the form factor (phone / tablet / desktop), power (low battery, data saver,
  // dropped frames) and colour vision, and tags <html> with absx-* classes the stylesheet uses.
  // Everything defaults to Automatic and starts at full quality; if the page drops frames while the
  // view is open it steps down (no animations, slower follow clock) and remembers that per browser.
  // Choices live in localStorage "absPlusDisplay" and can be changed under ⋮ → Display & colours.
  const ADAPT = (() => {
    const KEY = 'absPlusDisplay'
    const LEARN = 'absPlusLearned'
    const DEFAULTS = { screen: 'auto', colorVision: 'auto', power: 'auto', motion: 'auto' }
    const read = (k, d) => {
      try {
        return { ...d, ...(JSON.parse(localStorage.getItem(k) || '{}') || {}) }
      } catch (e) {
        return { ...d }
      }
    }
    const prefs = read(KEY, DEFAULTS)
    const learned = read(LEARN, { level: 2, at: 0 }) // 2 = full, 1 = reduced, 0 = minimal
    const mq = (q) => {
      try {
        return window.matchMedia ? window.matchMedia(q) : null
      } catch (e) {
        return null
      }
    }
    const matches = (q) => !!(mq(q) || {}).matches
    const ua = (navigator.userAgent || '').toLowerCase()
    const EINK = ['onyx', 'boox', 'pocketbook', 'kobo', 'meebook', 'bigme', 'hisense a', 'likebook', 'boyue', 'remarkable', 'inkbook', 'kindle', 'supernote', 'eink', 'e-ink']
    const COLOR_EINK = ['color', 'colour', 'kaleido', 'gallery', 'nova air c', 'tab mini c', 'tab ultra c', 'note air3 c', 'note air4 c', 'go color', 'go 7 color', 'go 10.3 color', 'palma c']
    const battery = { level: 1, charging: true }
    const listeners = []

    function detected() {
      const eink = matches('(update: slow)') || EINK.some((m) => ua.includes(m))
      const mono = matches('(monochrome)')
      const colorEink = eink && !mono && COLOR_EINK.some((m) => ua.includes(m))
      const dark = !matches('(prefers-color-scheme: light)')
      const hdr = matches('(dynamic-range: high)')
      const fine = matches('(pointer: fine)')
      const w = window.innerWidth
      const h = window.innerHeight
      const formFactor = fine && w >= 1024 ? 'desktop' : Math.min(w, h) >= 600 ? 'tablet' : 'phone'
      return {
        eink,
        colorEink,
        mono,
        oledLikely: dark && hdr,
        dark,
        formFactor,
        cores: navigator.hardwareConcurrency || 4,
        mem: navigator.deviceMemory || 0,
        reduceMotion: matches('(prefers-reduced-motion: reduce)'),
        saveData: !!(navigator.connection && navigator.connection.saveData),
        lowBattery: !battery.charging && battery.level <= 0.2
      }
    }

    /** What the view should do right now */
    function profile() {
      const d = detected()
      let screen = prefs.screen
      if (screen === 'auto') screen = d.eink ? (d.colorEink ? 'eink-color' : 'eink') : d.oledLikely ? 'oled' : d.dark ? 'standard' : 'light'
      const eink = screen === 'eink' || screen === 'eink-dark' || screen === 'eink-color'
      // Automatic starts at full quality and steps down for low battery, data saver or dropped frames
      const lowPower = prefs.power === 'saver' || (prefs.power === 'auto' && (d.lowBattery || d.saveData))
      let level = prefs.power === 'max' ? 2 : Math.min(2, Math.max(0, learned.level))
      if (lowPower) level = 0
      const motion = prefs.motion === 'auto' ? !(d.reduceMotion || eink || level === 0) : prefs.motion === 'on'
      const cvd = prefs.colorVision === 'auto' ? 'none' : prefs.colorVision
      return {
        screen,
        eink,
        lowPower,
        level,
        motion,
        cvd,
        formFactor: d.formFactor,
        // follow clock: e-ink checks the word every 0.5 s (one word lit at a time, no in-between frames); low power wakes the CPU less often
        clockMs: eink ? 500 : level === 0 ? 600 : level === 1 ? 400 : 250,
        pollFactor: lowPower ? 3 : 1,
        detected: d
      }
    }

    const CLASSES = ['absx-eink', 'absx-eink-dark', 'absx-eink-color', 'absx-oled', 'absx-light', 'absx-low-power', 'absx-reduce-motion', 'absx-ff-phone', 'absx-ff-tablet', 'absx-ff-desktop', 'absx-cvd-protan', 'absx-cvd-deutan', 'absx-cvd-tritan', 'absx-cvd-mono', 'absx-level-0', 'absx-level-1', 'absx-level-2']
    function apply() {
      const p = profile()
      const c = document.documentElement.classList
      CLASSES.forEach((x) => c.remove(x))
      if (p.eink) c.add('absx-eink')
      if (p.screen === 'eink-dark') c.add('absx-eink-dark')
      if (p.screen === 'eink-color') c.add('absx-eink-color')
      if (p.screen === 'oled') c.add('absx-oled')
      if (p.screen === 'light') c.add('absx-light')
      if (p.lowPower) c.add('absx-low-power')
      if (!p.motion) c.add('absx-reduce-motion')
      if (p.cvd !== 'none') c.add(`absx-cvd-${p.cvd}`)
      c.add(`absx-ff-${p.formFactor}`, `absx-level-${p.level}`)
      listeners.forEach((fn) => {
        try {
          fn(p)
        } catch (e) {}
      })
      return p
    }

    function saveLearned() {
      try {
        localStorage.setItem(LEARN, JSON.stringify(learned))
      } catch (e) {}
    }
    function resetLearned() {
      learned.level = 2
      learned.at = Date.now()
      saveLearned()
    }
    function set(key, value) {
      prefs[key] = value
      try {
        localStorage.setItem(KEY, JSON.stringify(prefs))
      } catch (e) {}
      if (key === 'power' && value === 'auto') resetLearned()
      apply()
    }

    // Frame-drop feedback: sample 3 s of frames every 30 s while the view is open and the page is visible.
    // Mostly-late frames twice in a row: one level down. 15 minutes without trouble: try one level up.
    let badWindows = 0
    function sample(isOpen) {
      if (!isOpen() || document.hidden || prefs.power !== 'auto' || profile().eink) return
      let last = 0
      let frames = 0
      let late = 0
      const end = performance.now() + 3000
      const finish = () => {
        if (frames < 20) return
        if (late / frames > 0.2) {
          if (++badWindows >= 2 && learned.level > 0) {
            learned.level--
            learned.at = Date.now()
            badWindows = 0
            saveLearned()
            apply()
          }
        } else {
          badWindows = 0
          if (learned.level < 2 && Date.now() - learned.at > 15 * 60 * 1000) {
            learned.level++
            learned.at = Date.now()
            saveLearned()
            apply()
          }
        }
      }
      const step = (t) => {
        if (last) {
          frames++
          if (t - last > 50) late++ // missed at least two frames at 60 Hz
        }
        last = t
        if (t < end && !document.hidden) requestAnimationFrame(step)
        else finish()
      }
      requestAnimationFrame(step)
    }

    function start(isOpen) {
      ;['(prefers-color-scheme: light)', '(prefers-reduced-motion: reduce)', '(pointer: fine)', '(update: slow)', '(dynamic-range: high)'].forEach((q) => {
        const m = mq(q)
        if (m && m.addEventListener) m.addEventListener('change', apply)
      })
      let rt = null
      window.addEventListener('resize', () => {
        clearTimeout(rt)
        rt = setTimeout(apply, 200)
      })
      if (navigator.getBattery) {
        navigator
          .getBattery()
          .then((b) => {
            const upd = () => {
              battery.level = b.level
              battery.charging = b.charging
              apply()
            }
            b.addEventListener('levelchange', upd)
            b.addEventListener('chargingchange', upd)
            upd()
          })
          .catch(() => {})
      }
      setInterval(() => sample(isOpen), 30000)
      return apply()
    }

    const OPTIONS = {
      screen: [
        ['auto', 'Automatic (match this device)'],
        ['standard', 'Dark'],
        ['oled', 'Black (OLED)'],
        ['light', 'Light'],
        ['eink', 'E-ink'],
        ['eink-dark', 'E-ink dark'],
        ['eink-color', 'Colour e-ink']
      ],
      colorVision: [
        ['auto', 'Standard colours'],
        ['protan', 'Red-weak (protanopia)'],
        ['deutan', 'Green-weak (deuteranopia)'],
        ['tritan', 'Blue-weak (tritanopia)'],
        ['mono', 'No colour (monochrome)']
      ],
      power: [
        ['auto', 'Automatic (full quality, eases off when needed)'],
        ['max', 'Always full quality'],
        ['saver', 'Battery saver']
      ],
      motion: [
        ['auto', 'Automatic'],
        ['on', 'Smooth scrolling and animations'],
        ['off', 'No animations']
      ]
    }

    function describe() {
      const p = profile()
      const d = p.detected
      const bits = [d.formFactor === 'desktop' ? 'Desktop' : d.formFactor === 'tablet' ? 'Tablet' : 'Phone']
      if (d.eink) bits.push(d.colorEink ? 'colour e-ink' : 'e-ink')
      else if (d.oledLikely) bits.push('HDR / OLED-style screen')
      bits.push(`${d.cores} cores`)
      if (d.mem) bits.push(`${d.mem}+ GB`)
      if (d.lowBattery) bits.push('battery low')
      const level = ['minimal', 'reduced', 'full'][p.level]
      return `Detected: ${bits.join(' · ')}. Running at ${level} quality${p.lowPower ? ' to save power' : ''}.`
    }

    return { prefs, profile, apply, set, start, onChange: (fn) => listeners.push(fn), OPTIONS, describe, resetLearned }
  })()
  window.__absPlusAdapt = ADAPT

  // ------------------------------------------------------------------ cover shading
  //
  // Like the full-screen player: the book cover's average colour at the top, fading into the page colour.
  // The top colour is darkened (dark themes) or lightened (light theme) only as much as needed for the
  // text to keep a 4.5:1 contrast. Off on e-ink (greys ghost there).
  const SHADE = (() => {
    const parse = (c) => {
      const h = String(c || '').trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
      if (h) {
        const x = h[1].length === 3 ? h[1].split('').map((d) => d + d).join('') : h[1]
        return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16))
      }
      const m = String(c || '').match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/)
      return m ? [+m[1], +m[2], +m[3]] : null
    }
    const lum = (c) => {
      const f = (v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const contrast = (a, b) => {
      const x = lum(a)
      const y = lum(b)
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
    const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
    function build(cover, bg, fg) {
      if (!cover || !bg || !fg) return null
      let top = cover
      for (let t = 0.1; t <= 1.001 && contrast(top, fg) < 4.5; t += 0.1) top = mix(cover, bg, t)
      return {
        top: css(top),
        upper: css(mix(top, bg, 0.3)),
        background: `linear-gradient(180deg, ${css(top)} 0%, ${css(mix(top, bg, 0.55))} 45%, ${css(bg)} 85%)`
      }
    }
    const cache = new Map()
    /** Average colour of a book cover (small sample, same-origin API, signed in) */
    async function coverColor(itemId) {
      if (cache.has(itemId)) return cache.get(itemId)
      let rgb = null
      try {
        const nuxt = window.$nuxt
        let blob
        if (nuxt && nuxt.$axios) blob = (await nuxt.$axios.get(`/api/items/${encodeURIComponent(itemId)}/cover?width=64&format=jpeg`, { responseType: 'blob' })).data
        else {
          const token = localStorage.getItem('token')
          const r = await fetch(`/api/items/${encodeURIComponent(itemId)}/cover?width=64&format=jpeg`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
          if (r.ok) blob = await r.blob()
        }
        if (blob && blob.size) {
          const bmp = await createImageBitmap(blob)
          const c = document.createElement('canvas')
          c.width = 16
          c.height = 16
          const ctx = c.getContext('2d')
          ctx.drawImage(bmp, 0, 0, 16, 16)
          const d = ctx.getImageData(0, 0, 16, 16).data
          let r = 0
          let g = 0
          let b = 0
          let n = 0
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) continue
            r += d[i]
            g += d[i + 1]
            b += d[i + 2]
            n++
          }
          if (n) rgb = [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
        }
      } catch (e) {}
      cache.set(itemId, rgb)
      return rgb
    }
    return { parse, build, coverColor, contrast }
  })()

  // ------------------------------------------------------------------ small helpers

  const ICONS = {
    down: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z',
    more: 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    search: 'M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 9.5 16a6.5 6.5 0 0 0 4.2-1.6l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
    close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6zm8-14v14h4V5z',
    back: 'M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z',
    fwd: 'M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z',
    spell: 'M12.45 16h2.09L9.43 3H7.57L2.46 16h2.09l1.12-3h5.64zm-6.02-5L8.5 5.48 10.57 11zm15.16.59-8.09 8.09L9.83 16l-1.41 1.41 5.09 5.09L23 13z',
    warn: 'M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z',
    book: 'M21 5c-1.1-.35-2.3-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5z',
    error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z',
    wave: 'M7 18h2V6H7zm4 4h2V2h-2zm-8-8h2v-4H3zm12 4h2V6h-2zm4-8v4h2v-4z',
    hourglass: 'M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2z',
    target: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
    radioOn: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
    radioOff: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2z',
    trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
    check: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12zM.41 13.41 6 19l1.41-1.41L1.83 12z',
    block: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4 12a8 8 0 0 1 12.9-6.32L5.68 16.9A7.9 7.9 0 0 1 4 12zm8 8a7.9 7.9 0 0 1-4.9-1.68L18.32 7.1A8 8 0 0 1 12 20z',
    refresh: 'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
    fact: 'M20 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM10 17H5v-2h5zm0-4H5v-2h5zm0-4H5V7h5zm4.82 6L12 12.16l1.41-1.41 1.41 1.42L17.99 9l1.42 1.42z',
    arrowBack: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z',
    arrowFwd: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
    expandMore: 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
    expandLess: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
    bookmarkAdd: 'M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2zm-1 8h-3v3h-2v-3H8V9h3V6h2v3h3z',
    bookmark: 'M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z',
    bookmarks: 'M19 18l2 1V3a2 2 0 0 0-2-2H8.99A2 2 0 0 0 7 3h10a2 2 0 0 1 2 2zM15 5H5a2 2 0 0 0-2 2v16l7-3 7 3V7a2 2 0 0 0-2-2z',
    cut: 'M9.64 7.64A3.98 3.98 0 0 0 10 6a4 4 0 1 0-4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36A3.98 3.98 0 0 0 6 14a4 4 0 1 0 4 4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1zM6 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6-7.5a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zM19 3l-6 6 2 2 7-7V3z',
    subtitles: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM4 12h4v2H4zm10 6H4v-2h10zm6 0h-4v-2h4zm0-4H10v-2h10z'
  }
  const icon = (name, cls = '') => `<svg class="tx-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ts = (sec) => {
    sec = Math.max(0, Math.floor(sec || 0))
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = String(sec % 60).padStart(2, '0')
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
  }
  const fmtDuration = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.round((sec % 3600) / 60)
    return h ? `${h}h ${m}m` : `${m}m`
  }
  const fmtBytes = (b) => (!b ? '0 MB' : b > 1e9 ? (b / 1e9).toFixed(1) + ' GB' : Math.round(b / 1e6) + ' MB')
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu

  function toast(kind, msg) {
    const t = window.$nuxt && window.$nuxt.$toast
    if (t && typeof t[kind] === 'function') t[kind](msg)
    else if (kind === 'error') alert(msg)
  }

  // ------------------------------------------------------------------ karaoke model (same code as the app's plugins/karaoke.js)
  const { buildKaraoke, wordAt, alignWords } = (() => {
/**
 * Karaoke view model: the book as ordinary paragraphs, with a time for every word so the word being
 * narrated can be highlighted.
 *
 *  - With the ebook's text (saved by the ebook check): the book's own paragraphs and spelling. Each
 *    ebook word is matched to the transcript (unique 4-word phrases in the same order anchor the
 *    match, words in between are interpolated) and takes the time of its transcript word. Parts the
 *    narration doesn't cover (front matter, not yet transcribed) have no times and aren't highlighted.
 *  - Without it: the transcript itself, grouped into paragraphs at pauses and every few sentences.
 *
 * Model: { source: 'ebook' | 'transcript', paragraphs: [{ t, h, start, end, words: [{ s, e, time }] }],
 *          times: Float64Array (all timed words, in order), refs: [[paragraph, word]] }
 */

const ANCHOR = 4
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
const norm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')

function wordsOf(text) {
  const out = []
  const re = wordRe()
  let m
  while ((m = re.exec(text)) !== null) out.push({ s: m.index, e: m.index + m[0].length, n: norm(m[0]) })
  return out
}

/** Transcript words with times interpolated by character position inside each line */
/**
 * Times for the words of a line: from the speech engine's word times when the line has them
 * (l.w = [[word, start, end]], to the microsecond), else estimated from the position in the line.
 */
function lineWordTimes(l, words) {
  const text = l.t || ''
  const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
  const estimate = (w) => l.s + (w.s / Math.max(1, text.length)) * (end - l.s)
  if (!Array.isArray(l.w) || !l.w.length) return words.map(estimate)
  // Engine words split the same way the text is ("don't", "well-known" -> pieces), each piece timed
  const pieces = []
  for (const [word, ws, we] of l.w) {
    const parts = wordsOf(String(word))
    parts.forEach((p, i) => pieces.push({ n: p.n, time: parts.length > 1 ? ws + ((we - ws) * i) / parts.length : ws }))
  }
  if (pieces.length === words.length) return pieces.map((p) => p.time)
  // Text corrected since (spelling fixes): match in order, estimate what doesn't match
  let j = 0
  return words.map((w) => {
    for (let k = j; k < Math.min(pieces.length, j + 4); k++) {
      if (pieces[k].n === w.n) {
        j = k + 1
        return pieces[k].time
      }
    }
    return estimate(w)
  })
}

function transcriptWords(lines) {
  const out = []
  lines.forEach((l, li) => {
    const ws = wordsOf(l.t || '')
    const times = lineWordTimes(l, ws)
    ws.forEach((w, i) => out.push({ ...w, time: times[i], line: li }))
  })
  return out
}

/** Matching positions [[tIdx, eIdx]] ascending in both */
function alignWords(t, e) {
  if (t.length < ANCHOR || e.length < ANCHOR) return []
  const key = (w, i) => w[i] + '\u0001' + w[i + 1] + '\u0001' + w[i + 2] + '\u0001' + w[i + 3]
  const uniques = (w) => {
    const pos = new Map()
    for (let i = 0; i <= w.length - ANCHOR; i++) {
      const k = key(w, i)
      pos.set(k, pos.has(k) ? -1 : i)
    }
    return pos
  }
  const ut = uniques(t)
  const ue = uniques(e)
  const pairs = []
  for (const [k, it] of ut) {
    if (it < 0) continue
    const ie = ue.get(k)
    if (ie !== undefined && ie >= 0) pairs.push([it, ie])
  }
  pairs.sort((a, b) => a[0] - b[0])
  const tails = []
  const prev = new Int32Array(pairs.length).fill(-1)
  for (let k = 0; k < pairs.length; k++) {
    const v = pairs[k][1]
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (pairs[tails[mid]][1] < v) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[k] = tails[lo - 1]
    if (lo === tails.length) tails.push(k)
    else tails[lo] = k
  }
  const chain = []
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) chain.push(pairs[k])
  chain.reverse()
  const out = []
  let lastT = -1
  let lastE = -1
  for (const [it, ie] of chain) {
    let a = it
    let b = ie
    while (a - 1 > lastT && b - 1 > lastE && t[a - 1] === e[b - 1]) {
      a--
      b--
    }
    for (; a < t.length && b < e.length && t[a] === e[b]; a++, b++) {
      if (a <= lastT || b <= lastE) continue
      out.push([a, b])
      lastT = a
      lastE = b
    }
  }
  return out
}

function finish(paragraphs, source) {
  const times = []
  const refs = []
  paragraphs.forEach((p, pi) => {
    p.start = null
    p.end = null
    p.words.forEach((w, wi) => {
      if (w.time == null) return
      if (times.length && w.time < times[times.length - 1]) w.time = times[times.length - 1] // keep it monotonic
      times.push(w.time)
      refs.push([pi, wi])
      if (p.start == null) p.start = w.time
      p.end = w.time
    })
  })
  return { source, paragraphs, times: Float64Array.from(times), refs }
}

/** Transcript only: paragraphs at pauses of 1.6 s+, or after ~5 sentences / 110 words */
function fromTranscript(lines) {
  const paragraphs = []
  let cur = null
  let sentences = 0
  lines.forEach((l, i) => {
    const prev = lines[i - 1]
    const pause = prev ? l.s - (prev.e || prev.s) : 0
    const tooLong = cur && (sentences >= 5 || cur.count >= 110)
    if (!cur || pause > 1.6 || (tooLong && /[.!?…]["'”’)]*$/.test(prev.t || ''))) {
      cur = { parts: [], count: 0 }
      paragraphs.push(cur)
      sentences = 0
    }
    cur.parts.push(l)
    cur.count += (l.t || '').split(/\s+/).length
    if (/[.!?…]["'”’)]*$/.test(l.t || '')) sentences++
  })
  const out = paragraphs.map((p) => {
    let text = ''
    const words = []
    for (const l of p.parts) {
      if (text) text += ' '
      const base = text.length
      const lt = l.t || ''
      const ws = wordsOf(lt)
      const times = lineWordTimes(l, ws)
      ws.forEach((w, i) => words.push({ s: base + w.s, e: base + w.e, time: times[i] }))
      text += lt
    }
    return { t: text, words }
  })
  return finish(out, 'transcript')
}

/** Ebook paragraphs timed by the transcript */
function fromEbook(lines, ebookParagraphs) {
  const tw = transcriptWords(lines)
  const paragraphs = ebookParagraphs.map((p) => ({ t: p.t, h: !!p.h, words: wordsOf(p.t).map((w) => ({ s: w.s, e: w.e, n: w.n, time: null })) }))
  const flat = []
  paragraphs.forEach((p) => p.words.forEach((w) => flat.push(w)))
  const pairs = alignWords(
    tw.map((w) => w.n),
    flat.map((w) => w.n)
  )
  if (pairs.length < Math.min(50, tw.length * 0.2)) return null // doesn't match this audiobook
  // matched words take their transcript time; words between two matches are spread evenly
  for (const [it, ie] of pairs) flat[ie].time = tw[it].time
  for (let k = 0; k + 1 < pairs.length; k++) {
    const [t0, e0] = pairs[k]
    const [t1, e1] = pairs[k + 1]
    if (e1 - e0 <= 1) continue
    // only bridge small gaps: a big jump means text the narrator skipped (or the transcript lacks)
    if (e1 - e0 > 80 || t1 - t0 > 80) continue
    const a = tw[t0].time
    const b = tw[t1].time
    for (let e = e0 + 1; e < e1; e++) flat[e].time = a + ((e - e0) / (e1 - e0)) * (b - a)
  }
  // A little past the last match (and before the first), follow the transcript word for word
  const EDGE = 40
  const [lt, le] = pairs[pairs.length - 1]
  for (let d = 1; d <= EDGE && le + d < flat.length && lt + d < tw.length; d++) flat[le + d].time = tw[lt + d].time
  const [ft, fe] = pairs[0]
  for (let d = 1; d <= EDGE && fe - d >= 0 && ft - d >= 0; d++) flat[fe - d].time = tw[ft - d].time
  paragraphs.forEach((p) => p.words.forEach((w) => delete w.n))
  const model = finish(paragraphs, 'ebook')
  model.matched = tw.length ? pairs.length / tw.length : 0
  return model
}

function buildKaraoke(lines, ebookText) {
  const sorted = (lines || []).filter((l) => typeof l.s === 'number').sort((a, b) => a.s - b.s)
  if (ebookText && Array.isArray(ebookText.paragraphs) && ebookText.paragraphs.length && sorted.length) {
    const m = fromEbook(sorted, ebookText.paragraphs)
    if (m) {
      m.ebookTitle = ebookText.ebookTitle || null
      return m
    }
  }
  return fromTranscript(sorted)
}

/** Index into model.times/refs of the word being said at [t], or -1 */
function wordAt(model, t) {
  const a = model.times
  let lo = 0
  let hi = a.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] <= t + 0.05) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (ans < 0) return -1
  // Past the end of what's timed (long silence or not transcribed yet): nothing to highlight
  if (ans === a.length - 1 && t - a[ans] > 8) return -1
  return ans
}


    return { buildKaraoke, wordAt, alignWords }
  })()

  // ------------------------------------------------------------------ bookmarks (same format as the Android app)
  //   tap  -> Audiobookshelf bookmark at that second, title “line being spoken”
  //   hold -> bookmark at the section start, title “lines in the section” [clip 1:02:03–1:02:41]
  //   note -> “quote” ✎ note [clip …]

  const CLIP_RE = /\s*\[clip (\d+(?::\d{2}){0,2})[–-](\d+(?::\d{2}){0,2})\]\s*$/
  const HOLD_MS = 450
  const DEFAULT_CLIP_SEC = 30
  const SNAP_SEC = 5
  const MAX_QUOTE = 600
  const parseTs = (str) => str.split(':').reduce((a, p) => a * 60 + parseInt(p, 10), 0)

  const NOTE_MARK = '” ✎ '
  function parseBookmark(bm) {
    const title = (bm && bm.title) || ''
    const m = title.match(CLIP_RE)
    const body = m ? title.slice(0, m.index).trim() : title.trim()
    let quote = ''
    let note = ''
    if (body.startsWith('“')) {
      const i = body.lastIndexOf(NOTE_MARK)
      if (i >= 0) {
        quote = body.slice(1, i)
        note = body.slice(i + NOTE_MARK.length).trim()
      } else if (body.endsWith('”')) quote = body.slice(1, -1)
      else note = body
    } else note = body
    if (m) return { kind: 'clip', start: bm.time, end: Math.max(bm.time, parseTs(m[2])), quote, note }
    return { kind: quote ? 'mark' : 'note', start: bm.time, end: bm.time, quote, note }
  }
  function buildTitle({ quote, note, start, end }) {
    const n = (note || '').trim()
    let t = quote ? `“${quote}”${n ? ` ✎ ${n}` : ''}` : n || 'Bookmark'
    if (end != null && end > start) t += ` [clip ${ts(start)}–${ts(end)}]`
    return t
  }
  const withNote = (bm, note) => {
    const p = parseBookmark(bm)
    return buildTitle({ quote: p.quote, note, start: p.start, end: p.kind === 'clip' ? p.end : null })
  }
  function trimQuote(q) {
    q = q.replace(/\s+/g, ' ').trim()
    return q.length > MAX_QUOTE ? q.slice(0, MAX_QUOTE - 1).replace(/\s+\S*$/, '') + '…' : q
  }
  function lineIndexAt(t) {
    let lo = 0
    let hi = S.lines.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (S.lines[mid].s <= t + 0.3) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans
  }
  function quoteAt(t) {
    const i = lineIndexAt(t)
    if (i < 0) return ''
    const l = S.lines[i]
    return t - (l.e || l.s) > 10 ? '' : trimQuote(l.t)
  }
  function sectionQuote(start, end) {
    const lines = S.lines.filter((l) => (l.e || l.s) > start && l.s < end)
    if (!lines.length) return { quote: '', start, end }
    const first = lines[0]
    const last = lines[lines.length - 1]
    return {
      quote: trimQuote(lines.map((l) => l.t).join(' ')),
      start: first.s < start && start - first.s <= SNAP_SEC ? first.s : start,
      end: (last.e || end) > end && (last.e || end) - end <= SNAP_SEC ? last.e : end
    }
  }

  // ------------------------------------------------------------------ server API

  async function request(method, path, body) {
    const nuxt = window.$nuxt
    const url = `/api/transcription${path}`
    if (nuxt && nuxt.$axios) {
      try {
        const res = await nuxt.$axios.request({ method, url, data: body })
        return res.data
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || e.message
        throw Object.assign(new Error(msg), { status: e.response && e.response.status, data: e.response && e.response.data })
      }
    }
    const token = localStorage.getItem('token')
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
    return data
  }
  const itemPath = (key) => `/items/${encodeURIComponent(key)}`

  // ------------------------------------------------------------------ Dictionary (hold a word while paused)
  //
  // In Lyrics, Karaoke and Read along: hold a word for half a second (mouse or finger) while the audio is
  // paused and its meaning shows in a card, from the server's dictionaries (then Wiktionary, if allowed).
  // The hold doesn't also count as a tap (no jump in the audio).
  const DICT = (() => {
    const D = { el: null, firedAt: 0, hinted: false, seq: 0, onClose: null }
    const isWordChar = (ch) => /[\p{L}\p{N}'’-]/u.test(ch || '')

    /** The word under a point in a document (null over blank space) */
    function wordAtPoint(doc, x, y) {
      const r = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(x, y) : null
      const node = r && r.startContainer
      if (!node || node.nodeType !== 3) return null
      const text = node.data
      let a = r.startOffset
      let b = r.startOffset
      while (a > 0 && isWordChar(text[a - 1])) a--
      while (b < text.length && isWordChar(text[b])) b++
      const word = text.slice(a, b).replace(/^['’-]+|['’-]+$/g, '')
      if (!word || !/[\p{L}]/u.test(word)) return null
      const range = doc.createRange()
      range.setStart(node, a)
      range.setEnd(node, b)
      const hit = [...range.getClientRects()].some((q) => x >= q.left - 3 && x <= q.right + 3 && y >= q.top - 3 && y <= q.bottom + 3)
      if (hit) D.range = range // marked while its definition is open
      return hit ? word : null
    }

    /** The word being looked up stays highlighted while its definition is open */
    function mark(range) {
      const prev = D.markedWin
      try {
        if (prev && prev.CSS && prev.CSS.highlights) prev.CSS.highlights.delete('abs-lookup')
      } catch (e) {}
      D.markedWin = null
      if (!range) return
      const doc = range.startContainer && range.startContainer.ownerDocument
      const win = doc && doc.defaultView
      if (!win || !win.CSS || !win.CSS.highlights || !win.Highlight) return
      if (!doc.getElementById('abs-lookup-style')) {
        const st = doc.createElement('style')
        st.id = 'abs-lookup-style'
        st.textContent = '::highlight(abs-lookup) { background-color: rgba(66, 153, 225, 0.45); text-decoration: underline; }'
        ;(doc.head || doc.documentElement).appendChild(st)
      }
      try {
        win.CSS.highlights.set('abs-lookup', new win.Highlight(range))
        D.markedWin = win
      } catch (e) {}
    }

    // ---- Translate (next to the word): through the server, into a language that's remembered
    const TR_LANGS = [
      ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['nl', 'Dutch'],
      ['sv', 'Swedish'], ['da', 'Danish'], ['no', 'Norwegian'], ['fi', 'Finnish'], ['pl', 'Polish'], ['cs', 'Czech'], ['ro', 'Romanian'],
      ['el', 'Greek'], ['tr', 'Turkish'], ['ru', 'Russian'], ['uk', 'Ukrainian'], ['ar', 'Arabic'], ['he', 'Hebrew'], ['hi', 'Hindi'],
      ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['vi', 'Vietnamese'], ['th', 'Thai'], ['id', 'Indonesian'], ['la', 'Latin']
    ]
    const trCode = (v) => {
      const s = String(v || '').trim().toLowerCase()
      const byName = TR_LANGS.find((l) => l[1].toLowerCase() === s)
      if (byName) return byName[0]
      const m = s.match(/^([a-z]{2})(\b|-|_)/)
      return m ? m[1] : ''
    }
    function trTo(from) {
      let to = ''
      try {
        to = localStorage.getItem('absTranslateTo') || ''
      } catch (e) {}
      if (to) return to
      const mine = trCode(navigator.language) || 'en'
      return mine !== from ? mine : from === 'es' ? 'en' : 'es'
    }
    async function translate(word, from) {
      const el = D.el
      const box = el && el.querySelector('.tx-dict-tr')
      if (!box) return
      const to = trTo(from)
      const name = (c) => (TR_LANGS.find((l) => l[0] === c) || [c, c])[1]
      box.innerHTML = `<p class="tx-dict-src">${esc(name(from))} → <select class="tx-dict-trto">${TR_LANGS.map((l) => `<option value="${l[0]}"${l[0] === to ? ' selected' : ''}>${l[1]}</option>`).join('')}</select></p><p class="tx-dict-none">Translating…</p>`
      box.querySelector('.tx-dict-trto').addEventListener('change', (e) => {
        try {
          localStorage.setItem('absTranslateTo', e.target.value)
        } catch (err) {}
        translate(word, from)
      })
      const n = D.seq
      let html
      try {
        const r = await request('GET', `/translate?${new URLSearchParams({ q: word, from, to })}`)
        html = `<p class="tx-dict-word" style="font-size:1.1rem">${esc(r.text)}</p>${r.alternatives && r.alternatives.length ? `<p class="tx-dict-src">Also: ${esc(r.alternatives.join(', '))}</p>` : ''}<p class="tx-dict-src">Translated online by ${esc(r.source || 'MyMemory')} (via your server)</p>`
      } catch (e) {
        html = `<p class="tx-dict-none">${esc(e.message || "Couldn't translate this")}</p>`
      }
      if (n !== D.seq) return
      const p = box.querySelector('.tx-dict-none')
      if (p) p.outerHTML = html
    }

    function close() {
      if (D.el) D.el.style.display = 'none'
      mark(null)
      const f = D.onClose
      D.onClose = null
      if (f) f()
    }

    function card() {
      if (D.el) return D.el
      D.el = document.createElement('div')
      D.el.className = 'tx-dict'
      D.el.addEventListener('click', (e) => {
        if (e.target.closest('[data-dict-close]')) close()
        e.stopPropagation()
      })
      document.body.appendChild(D.el)
      document.addEventListener('keydown', (e) => e.key === 'Escape' && close())
      document.addEventListener('pointerdown', (e) => D.el.style.display !== 'none' && !D.el.contains(e.target) && Date.now() - D.firedAt > 300 && close(), true)
      return D.el
    }

    function body(res) {
      const all = (res && res.results) || []
      // definitions first, then translations (the server sends them in that order)
      const defs = all.filter((r) => r.kind !== 'translation').slice(0, 4)
      const trans = all.filter((r) => r.kind === 'translation').slice(0, 3)
      const list = defs.concat(trans)
      if (!list.length) return `<p class="tx-dict-none">${esc((res && res.hint) || 'No definition found. Add dictionaries on the server (StarDict), or allow online lookups (DICTIONARY_ONLINE).')}</p>`
      return list
        .map((r, i) => {
          const def = r.format === 'html' || /<[a-z][\s\S]*>/i.test(r.definition || '') ? String(r.definition || '').replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '').replace(/ on\w+="[^"]*"/gi, '') : esc(r.definition || '').replace(/\n/g, '<br>')
          const label = r.kind === 'translation' && (i === defs.length) ? `<p class="tx-dict-label">Translation</p>` : ''
          return `${label}<div class="tx-dict-entry">${r.headword && r.headword.toLowerCase() !== String(res.word || '').toLowerCase() ? `<p class="tx-dict-head">${esc(r.headword)}</p>` : ''}<div class="tx-dict-def">${def}</div><p class="tx-dict-src">${esc(r.dictionary || '')}</p></div>`
        })
        .join('')
    }

    async function show(word, lang) {
      const el = card()
      const n = ++D.seq
      el.innerHTML = `<div class="tx-dict-top"><p class="tx-dict-word">${esc(word)}</p><button type="button" class="tx-dict-trbtn" aria-label="Translate">Translate</button><button type="button" class="tx-dict-x" data-dict-close aria-label="Close">✕</button></div><div class="tx-dict-tr"></div><div class="tx-dict-body"><p class="tx-dict-none">Looking up…</p></div>`
      el.style.display = ''
      const from = trCode(lang) || 'en'
      el.querySelector('.tx-dict-trbtn').addEventListener('click', (e) => {
        e.currentTarget.classList.add('tx-on')
        translate(word, from)
      })
      // the word stays marked while this is open
      mark(D.range)
      D.range = null
      let res = null
      try {
        res = await request('GET', `/dictionary/lookup?word=${encodeURIComponent(word)}&lang=${encodeURIComponent(lang || '')}`)
      } catch (e) {
        res = { results: [], hint: `Couldn't look it up: ${e.message}` }
      }
      if (n !== D.seq) return
      const bodyEl = el.querySelector('.tx-dict-body')
      if (bodyEl) bodyEl.innerHTML = body({ word, ...res })
    }

    /**
     * Hold-to-look-up on a document (the page itself, or a reader's iframe). getWord(x, y) -> word | null,
     * in that document's coordinates.
     */
    function attach(target, getWord, lang) {
      if (!target || target.__absDict) return
      target.__absDict = true
      let timer = 0
      let start = null
      const cancel = () => {
        clearTimeout(timer)
        timer = 0
      }
      target.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return
        cancel()
        start = { x: e.clientX, y: e.clientY }
        timer = setTimeout(() => {
          timer = 0
          const word = getWord(start.x, start.y)
          if (!word) return
          D.firedAt = Date.now()
          if (player.isPlaying()) {
            if (!D.hinted) toast('info', 'Pause the audio to look up words')
            D.hinted = true
            return
          }
          const sel = (target.getSelection ? target : target.ownerDocument || document).getSelection()
          if (sel) sel.removeAllRanges()
          show(word, typeof lang === 'function' ? lang() : lang)
        }, 550)
      })
      target.addEventListener('pointermove', (e) => start && timer && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8 && cancel(), { passive: true })
      target.addEventListener('pointerup', cancel)
      target.addEventListener('pointercancel', cancel)
      // A mouse: select a word (double-click or drag across it) to see what it means
      target.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return
        const d = target.getSelection ? target : target.ownerDocument || document
        const sel = d.getSelection && d.getSelection()
        const text = sel && !sel.isCollapsed ? String(sel).trim() : ''
        if (!text || text.length > 60 || text.split(/\s+/).length > 3) return
        // same rules as holding: the word must be where the hold would work (reading mode in Read along)
        if (!getWord(e.clientX, e.clientY) && !getWord(e.clientX - 4, e.clientY)) return
        D.firedAt = Date.now()
        if (player.isPlaying()) {
          if (!D.hinted) toast('info', 'Pause the audio to look up words')
          D.hinted = true
          return
        }
        show(text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), typeof lang === 'function' ? lang() : lang)
      })
      target.addEventListener('scroll', cancel, { passive: true, capture: true })
      // the long touch shouldn't also open the browser's own menu, or count as a tap afterwards
      target.addEventListener('contextmenu', (e) => Date.now() - D.firedAt < 800 && e.preventDefault())
      target.addEventListener('click', (e) => {
        if (Date.now() - D.firedAt < 700) {
          e.stopPropagation()
          e.preventDefault()
        }
      }, true)
    }

    return { attach, show, close, wordAtPoint, onClose: (fn) => (D.onClose = fn), justFired: () => Date.now() - D.firedAt < 700 }
  })()
  const bookLanguage = () => {
    const it = S.item || player.libraryItem()
    // the book's language, else the one the speech model heard
    return (it && it.media && it.media.metadata && it.media.metadata.language) || (S.status && S.status.language) || ''
  }

  async function absRequest(method, url, body) {
    const nuxt = window.$nuxt
    if (nuxt && nuxt.$axios) {
      try {
        return (await nuxt.$axios.request({ method, url, data: body })).data
      } catch (e) {
        throw new Error((e.response && typeof e.response.data === 'string' && e.response.data) || e.message)
      }
    }
    const token = localStorage.getItem('token')
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json().catch(() => ({}))
  }

  // ------------------------------------------------------------------ web player bridge

  const player = {
    vm: null,
    find() {
      const root = window.$nuxt && window.$nuxt.$root
      if (!root) return null
      if (this.vm && !this.vm._isDestroyed) return this.vm
      const stack = [root]
      while (stack.length) {
        const vm = stack.pop()
        if (vm.playerHandler) return (this.vm = vm)
        if (vm.$children) stack.push(...vm.$children)
      }
      return null
    },
    get handler() {
      const vm = this.find()
      return vm && vm.playerHandler
    },
    libraryItem() {
      const ph = this.handler
      const store = window.$nuxt && window.$nuxt.$store
      return (ph && ph.libraryItem) || (store && store.state.streamLibraryItem) || null
    },
    episodeId() {
      const ph = this.handler
      const store = window.$nuxt && window.$nuxt.$store
      return (ph && ph.episodeId) || (store && store.state.streamEpisodeId) || null
    },
    currentTime() {
      const ph = this.handler
      try {
        if (ph && typeof ph.getCurrentTime === 'function') return ph.getCurrentTime() || 0
      } catch (e) {}
      const vm = this.find()
      return (vm && (vm.currentTime || (vm.$refs.audioPlayer && vm.$refs.audioPlayer.currentTime))) || 0
    },
    isPlaying() {
      const ph = this.handler
      const vm = this.find()
      if (ph && typeof ph.isPlaying === 'boolean') return ph.isPlaying
      if (ph && ph.playerState) return ph.playerState === 'PLAYING'
      return !!(vm && vm.isPlaying)
    },
    call(name, ...args) {
      const vm = this.find()
      if (vm && typeof vm[name] === 'function') return vm[name](...args), true
      const ph = this.handler
      if (ph && typeof ph[name] === 'function') return ph[name](...args), true
      return false
    },
    seek(t) {
      this.call('seek', t)
    },
    playPause() {
      this.call('playPause')
    },
    jump(dir) {
      if (!this.call(dir > 0 ? 'jumpForward' : 'jumpBackward')) this.seek(Math.max(0, this.currentTime() + (dir > 0 ? 30 : -10)))
    }
  }

  // ------------------------------------------------------------------ state

  const S = {
    open: false,
    key: null,
    title: '',
    info: null,
    status: null,
    lines: [],
    rawCount: 0,
    lastRevision: null,
    query: '',
    followPlayback: true,
    lastUserScroll: 0,
    liveTime: 0,
    activeIndex: -1,
    selectedModelId: null,
    starting: false,
    loading: false,
    showMenu: false,
    showSheet: false,
    showChapters: false,
    ebookCheck: null,
    ebookBusy: false,
    fetching: false,
    refetch: null,
    bookmarks: [],
    showBookmarks: false,
    editingBookmark: null,
    viewMode: localStorage.getItem('absTxView') === 'karaoke' ? 'karaoke' : 'lyrics',
    karaokeSize: Number(localStorage.getItem('absTxKaraokeSize')) || 19,
    ebookText: null,
    karaoke: null,
    kActive: { pi: -1, wi: -1 },
    showSize: false,
    showDisplay: false
  }

  const isActive = () => !!S.status && (S.status.status === 'running' || S.status.status === 'queued')
  const isDeviceJob = () => !!S.status && S.status.engine === 'device' && S.status.status === 'running'
  const hasTranscript = () => S.lines.length > 0
  const ebookBusy = () => !!S.status && (S.status.ebookCheck === 'running' || S.status.ebookCheck === 'queued')
  const pending = () => ((S.ebookCheck && S.ebookCheck.suggestions) || []).filter((x) => (x.status || 'pending') === 'pending')
  const ignored = () => ((S.ebookCheck && S.ebookCheck.suggestions) || []).filter((x) => x.status === 'ignored')
  const modelName = (id) => {
    const m = S.info && S.info.models.find((x) => x.id === id)
    return m ? m.name : id || ''
  }

  function currentTimeTranscribed() {
    const s = S.status
    if (!s || s.status === 'done') return true
    if (!Array.isArray(s.doneRanges)) return true
    return s.doneRanges.some((r) => S.liveTime >= r[0] && S.liveTime <= r[1])
  }

  function computeActive() {
    const t = S.liveTime + 0.15
    const lines = S.lines
    let lo = 0
    let hi = lines.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (lines[mid].s <= t) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans
  }

  // ------------------------------------------------------------------ DOM

  let root
  let els = {}
  /** Lyrics and Karaoke views (shared with the Android app) */
  let VIEWS = null

  function build() {
    root = document.createElement('div')
    root.className = 'tx-root'
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', 'Transcription')
    root.innerHTML = `
      <div class="tx-wrap tx-header">
        <button class="tx-iconbtn" data-act="close" title="Close (Esc)" style="font-size:2.2rem">${icon('down')}</button>
        <div class="tx-title"><p class="tx-h">Transcription</p><p class="tx-sub" data-el="title"></p></div>
        <button class="tx-aa" data-act="textsize" data-el="aaBtn" title="Text size">Aa</button>
        <button class="tx-iconbtn" data-act="menu" data-el="menuBtn" title="More" style="font-size:1.8rem">${icon('more')}</button>
      </div>
      <div class="tx-wrap tx-viewswitch" data-el="viewSwitch">
        <div class="tx-seg"><button data-act="view" data-mode="lyrics" data-el="segLyrics">Lyrics</button><button data-act="view" data-mode="karaoke" data-el="segKaraoke">Karaoke</button><button data-act="view" data-mode="readalong" data-el="segRead" style="display:none">Read along</button></div>
      </div>
      <div class="tx-wrap" data-el="sizeBar" style="display:none"><div class="tx-card tx-row" style="padding:6px 12px"><button class="tx-aa" data-act="size-down" style="font-size:.9rem">A</button><input type="range" min="14" max="30" data-el="sizeRange" style="flex:1;margin:0 8px"><button class="tx-aa" data-act="size-up" style="font-size:1.5rem">A</button></div></div>
      <div class="tx-wrap tx-search" data-el="search">
        <div class="tx-searchbar">${icon('search')}<input data-el="input" type="search" placeholder="Search transcription" enterkeyhint="search" /><button class="tx-iconbtn" data-act="clear" data-el="clear" title="Clear">${icon('close')}</button></div>
        <p class="tx-hint" data-el="hint"></p>
      </div>
      <div class="tx-wrap" data-el="cards"></div>
      <div class="tx-wrap tx-setup" data-el="setup"></div>
      <div class="tx-empty" data-el="empty">${icon('wave')}<p>Lines will appear here as soon as the first part is transcribed. You can close this screen; transcription keeps running on the server.</p></div>
      <div class="tx-lines" data-el="scroller"><div class="tx-wrap"><div data-el="notice"></div><div data-el="list"></div><div data-el="klist" style="display:none"></div><p class="tx-more" data-el="moreNote">Transcribing… more lines will appear here.</p></div></div>
      <div class="tx-ra2" data-el="ra2"></div>
      <button class="tx-follow" data-act="follow" data-el="follow">${icon('target')}Back to current line</button>
      <div class="tx-transport">
        <span class="tx-time" data-el="time">0:00</span>
        <button class="tx-playfrom" data-act="play-from" data-el="playFrom" style="display:none">${icon('play')}Play from here</button>
        <div class="tx-mid" data-el="mid">
          <button class="tx-iconbtn" data-act="back" title="Jump back">${icon('back')}</button>
          <button class="tx-play" data-act="playpause" data-el="play" title="Play/pause">${icon('play')}</button>
          <button class="tx-iconbtn" data-act="fwd" title="Jump forward">${icon('fwd')}</button>
        </div>
        <div style="width:80px;display:flex;justify-content:flex-end" data-el="clipBox"><button class="tx-clip" data-el="clip" title="Click: bookmark this moment · Hold: save a section"><span class="tx-clip-icon" data-el="clipIcon">${icon('bookmarkAdd')}</span><span class="tx-clip-label" data-el="clipLabel">Bookmark</span></button></div>
      </div>
      <div data-el="menu"></div>
      <div data-el="sheet"></div>
      <div data-el="bmSheet"></div>
      <div data-el="displaySheet"></div>`
    document.body.appendChild(root)
    root.querySelectorAll('[data-el]').forEach((el) => (els[el.getAttribute('data-el')] = el))
    // Lyrics and Karaoke: the same code as the Android app (absplus-views.js)
    VIEWS = window.AbsPlusViews
      ? window.AbsPlusViews.createTranscriptViews(els.scroller, {
          lyricsEl: els.list,
          karaokeEl: els.klist,
          injectCss: false,
          lead: KARAOKE_LEAD,
          timestamp: ts,
          motion: () => ADAPT.profile().motion,
          eink: ADAPT.profile().eink,
          icons: { book: icon('book'), fact: icon('fact') },
          ignoreTap: () => true, // the panel's own tap handling (search, bookmarks, reading mode) runs
          onFollowChange: (on) => {
            S.followPlayback = on
            if (els.follow) els.follow.style.display = !on && hasTranscript() && !S.query && S.viewMode !== 'readalong' ? '' : 'none'
          }
        })
      : null

    root.addEventListener('click', onClick)
    root.addEventListener('change', (e) => {
      const sel = e.target.closest('[data-pref]')
      if (!sel) return
      ADAPT.set(sel.getAttribute('data-pref'), sel.value)
      renderDisplay()
    })
    els.input.addEventListener('focus', () => root.classList.contains('tx-ra') && leaveReadAlong())
    els.input.addEventListener('input', onSearchInput)
    els.input.addEventListener('keyup', (e) => e.key === 'Enter' && els.input.blur())
    setupClipButton(els.clip)
    els.sizeRange.addEventListener('input', () => {
      S.karaokeSize = Number(els.sizeRange.value)
      localStorage.setItem('absTxKaraokeSize', String(S.karaokeSize))
      const box = els.klist.querySelector('.tx-ktext')
      if (box) box.style.fontSize = `${S.karaokeSize}px`
    })
    // Hold a word (audio paused): what it means
    // Lyrics / Karaoke: words are looked up in read mode only (the book button, audio paused)
    DICT.attach(
      els.scroller,
      (x, y) => {
        const w = DICT.wordAtPoint(document, x, y)
        if (w && !S.txReading && !RA2.book) {
          if (!S.lookupHinted) toast('info', player.isPlaying() ? 'Pause the audio, then tap the book button to look up words' : 'Tap the book button (read mode) to look up words')
          S.lookupHinted = true
          return null
        }
        return w
      },
      bookLanguage
    )
    els.scroller.addEventListener('wheel', userScrolled, { passive: true })
    els.scroller.addEventListener('touchstart', userScrolled, { passive: true })
    els.scroller.addEventListener('mousedown', (e) => {
      if (e.target === els.scroller) userScrolled() // dragging the scrollbar
    })
    document.addEventListener('keydown', (e) => {
      if (!S.open) return
      if (e.key === 'Escape') {
        if (S.editingBookmark !== null && S.showBookmarks) S.editingBookmark = null
        else if (S.showBookmarks) S.showBookmarks = false
        else if (S.showSheet) S.showSheet = false
        else if (S.showMenu) S.showMenu = false
        else return close()
        renderAll()
      }
    })
  }

  // ------------------------------------------------------------------ render

  function renderAll() {
    if (!root) return
    els.title.textContent = S.title
    els.menuBtn.style.visibility = hasTranscript() || (S.status && S.status.status !== 'none') ? 'visible' : 'hidden'
    els.search.style.display = hasTranscript() && S.viewMode !== 'readalong' ? '' : 'none'
    els.viewSwitch.style.display = hasTranscript() ? '' : 'none'
    els.segRead.style.display = hasTranscript() && ['epub', 'mobi', 'azw3', 'pdf'].includes(S.ebookFormat) ? '' : 'none'
    els.playFrom.style.display = S.reading && hasTranscript() ? '' : 'none'
    els.mid.style.display = S.reading ? 'none' : ''
    els.clipBox.style.visibility = S.reading ? 'hidden' : ''
    els.segLyrics.className = S.viewMode === 'lyrics' ? 'tx-on' : ''
    els.segKaraoke.className = S.viewMode === 'karaoke' ? 'tx-on' : ''
    if (root.classList.contains('tx-ra')) {
      els.segLyrics.className = els.segKaraoke.className = ''
      els.segRead.className = 'tx-on'
    } else els.segRead.className = S.viewMode === 'readalong' ? 'tx-on' : ''
    if (S.viewMode === 'readalong') els.follow.style.display = 'none'
    RA2.render()
    els.aaBtn.style.display = hasTranscript() && S.viewMode === 'karaoke' ? '' : 'none'
    els.sizeBar.style.display = S.showSize && S.viewMode === 'karaoke' ? '' : 'none'
    els.sizeRange.value = S.karaokeSize
    els.clear.style.display = els.input.value ? '' : 'none'
    const nMatch = S.viewMode === 'karaoke' ? karaokeFiltered().length : filtered().length
    const unit = S.viewMode === 'karaoke' ? ['paragraph matches', 'paragraphs match'] : ['line matches', 'lines match']
    els.hint.textContent = S.query ? `${nMatch} ${nMatch === 1 ? unit[0] : unit[1]} "${S.query}"` : ''
    renderCards()
    renderSetup()
    els.empty.style.display = !S.loading && !hasTranscript() && isActive() ? '' : 'none'
    els.scroller.style.display = hasTranscript() && !(S.viewMode === 'readalong' && RA2.isEpub()) ? '' : 'none'
    els.moreNote.style.display = isActive() ? '' : 'none'
    els.follow.style.display = hasTranscript() && !S.followPlayback && !S.query ? '' : 'none'
    els.follow.lastChild.textContent = S.viewMode === 'karaoke' ? 'Back to current word' : 'Back to current line'
    renderNotice()
    renderMenu()
    renderSheet()
    renderBookmarks()
    renderDisplay()
    renderTransport()
  }

  function renderTransport() {
    els.time.textContent = ts(S.liveTime)
    els.play.innerHTML = icon(player.isPlaying() ? 'pause' : 'play')
  }

  function progressPercent() {
    const s = S.status
    if (!s) return 0
    if (s.phase === 'model' || s.phase === 'audio') return Math.round((s.phaseProgress || 0) * 100)
    return Math.round((s.progress || 0) * 100)
  }

  function renderCards() {
    const s = S.status
    let html = ''
    const showProgress = s && s.status !== 'done' && s.status !== 'none' && !(s.status === 'error' && !hasTranscript())
    if (showProgress) {
      const pct = progressPercent()
      let title
      let sub
      if (isDeviceJob()) {
        title = `Transcribing on ${esc(s.deviceName || 'a phone')}… ${pct}%`
        sub = `${s.linesCount || 0} lines · new lines appear each time the phone checks in`
      } else {
        if (s.status === 'error') title = 'Transcription stopped'
        else if (s.status === 'paused') title = `Paused at ${Math.round((s.progress || 0) * 100)}%`
        else if (s.status === 'queued') title = 'Waiting to start…'
        else if (s.phase === 'model') title = 'Downloading speech model to the server…'
        else title = `Transcribing… ${pct}%`
        if (s.status === 'error') sub = s.error || 'Unknown error'
        else {
          const parts = [`${s.linesCount || 0} lines`]
          if (s.status === 'running' && s.speed > 0 && s.phase === 'transcribing') {
            parts.push(`${s.speed.toFixed(1)}× real time`)
            const left = (s.durationSec - (s.doneSec || 0)) / s.speed
            if (left > 0) parts.push(`~${fmtDuration(left)} left`)
          }
          if (s.engine === 'device' && s.deviceName) parts.push(`started on ${s.deviceName}`)
          parts.push(modelName(s.modelId))
          sub = parts.join(' · ')
        }
      }
      const canControl = S.info && S.info.canTranscribe && !isDeviceJob()
      const buttons = !canControl
        ? ''
        : (isActive() ? `<button class="tx-pill" data-act="pause">Pause</button>` : `<button class="tx-pill" data-act="resume" ${S.starting ? 'disabled' : ''}>Resume</button>`) + (S.info && S.info.canEdit ? `<button class="tx-pill" data-act="cancel">Cancel</button>` : "")
      html += `<div class="tx-card"><div class="tx-row"><div class="tx-grow"><p class="tx-strong">${esc(title)}</p><p class="tx-small" title="${esc(sub)}">${esc(sub)}</p></div>${buttons}</div>
        <div class="tx-bar"><div style="width:${s.phase === 'model' && !s.phaseProgress ? 100 : progressPercent()}%" class="${s.phase === 'model' ? 'tx-pulse' : ''}"></div></div></div>`
    }
    const nEbook = S.ebookCheck ? pending().length : (s && s.ebookSuggestions) || 0
    const showEbook = s && s.status === 'done' && (['queued', 'running', 'error'].includes(s.ebookCheck) || (s.ebookCheck === 'done' && nEbook > 0))
    if (showEbook) {
      const n = nEbook
      const busy = ebookBusy()
      let title
      if (busy) title = 'Comparing with the ebook for spelling…'
      else if (s.ebookCheck === 'error') title = "Couldn't compare with the ebook"
      else if (n) title = `${n} possible spelling error${n === 1 ? '' : 's'} found using the ebook`
      else title = 'Checked against the ebook: nothing to fix'
      html += `<div class="tx-card"><div class="tx-row" style="flex-wrap:wrap">
        <span style="font-size:1.25rem;margin-right:8px;display:flex">${icon(busy ? 'book' : s.ebookCheck === 'error' ? 'error' : 'spell', busy ? 'tx-pulse' : '')}</span>
        <div class="tx-grow"><p class="tx-strong">${esc(title)}</p>
          ${s.ebookCheck === 'done' && n ? `<p class="tx-warn">${icon('warn')}<span>${DISCREPANCY}</span></p>` : ''}
          ${s.ebookCheckMessage && !busy ? `<p class="tx-small">${esc(s.ebookCheckMessage)}</p>` : ''}
        </div>
        ${s.ebookCheck === 'error' && S.info && S.info.canEdit ? `<button class="tx-pill" data-act="ebook-check">Retry</button>` : ''}
        ${s.ebookCheck === 'done' && n && S.info && S.info.canEdit ? `<div class="tx-actions"><button class="tx-pill" data-act="apply-all" ${S.ebookBusy ? 'disabled' : ''}>Apply all</button><button class="tx-pill" data-act="ignore-all" ${S.ebookBusy ? 'disabled' : ''}>Ignore all</button><button class="tx-pill" data-act="review">Review</button></div>` : ''}
      </div></div>`
    }
    els.cards.innerHTML = html
  }

  function renderSetup() {
    const s = S.status
    // Also while the book only waits in the queue, so its model can still be changed
    const waiting = !!(s && s.status === 'queued')
    const show = !S.loading && !hasTranscript() && (!s || s.status === 'none' || s.status === 'error' || waiting)
    els.setup.style.display = show ? '' : 'none'
    if (!show) return
    const info = S.info
    let html = ''
    if (!info) {
      els.setup.innerHTML = `<p>Couldn't reach the transcription service on this server.</p>`
      return
    }
    const where = info.device.type === 'cuda' ? `on the server's GPU${info.device.gpu ? ` (${esc(info.device.gpu)})` : ''}` : 'on the server (CPU)'
    if (info.hardware) html += `<p class="tx-small" style="margin:-4px 0 10px">Server: ${esc(info.hardware)}</p>`
    html += `<p>Transcribe this book ${where} to follow along with the words, search them, and click any line to jump there. It keeps running when you close this page, and the Android app gets a copy too.</p>`
    if (s && s.error) html += `<p class="tx-errorbox">${esc(s.error)}</p>`
    if (waiting) {
      const cur = info.models.find((m) => m.id === s.modelId)
      html += `<p class="tx-small" style="margin:0 0 10px"><b>Waiting in the queue</b> with ${esc(cur ? cur.name : s.modelId || 'Automatic')}. Press <b>Use</b> on another model to switch.</p>`
    }
    if (!info.apiKeyConfigured) html += `<p class="tx-errorbox">Server transcription isn't set up yet: an Audiobookshelf admin needs to sign in here once, and it sets itself up.</p>`
    if (!info.canTranscribe) html += `<p class="tx-errorbox">Only admins can start transcriptions on this server. Transcriptions made on a phone with the Android app show up here automatically.</p>`
    for (const m of info.models) {
      const sel = S.selectedModelId === m.id
      html += `<div class="tx-model ${sel ? 'tx-selected' : ''}" data-act="model" data-id="${esc(m.id)}">
        <div class="tx-row" style="gap:8px">${icon(sel ? 'radioOn' : 'radioOff')}<p class="tx-name">${esc(m.name)}</p>
          ${m.installed ? `<span class="tx-chip">Downloaded</span>` : m.auto ? `<span class="tx-chip">Recommended</span>` : ''}
          ${info.canTranscribe && info.apiKeyConfigured ? (waiting && s.modelId === m.id ? `<span class="tx-chip">In use</span>` : `<button class="tx-usebtn" data-act="use-model" data-id="${esc(m.id)}" title="Transcribe this book with ${esc(m.name)}" ${S.starting ? 'disabled' : ''}>Use</button>`) : ''}
          ${!m.auto && !m.installed && info.isAdmin ? (m.downloading ? `<span class="tx-chip">Downloading…</span>` : `<button class="tx-iconbtn" data-act="download-model" data-id="${esc(m.id)}" title="Download to the server (${esc(m.sizeLabel || '')})" style="font-size:1.2rem;opacity:.8">${icon('download')}</button>`) : ''}
          ${m.installed && info.isAdmin ? `<button class="tx-iconbtn" data-act="delete-model" data-id="${esc(m.id)}" title="Remove from server" style="font-size:1.2rem;opacity:.7">${icon('trash')}</button>` : ''}</div>
        <p class="tx-desc">${esc(m.description)}</p>
        <p class="tx-meta">${esc(m.languages)} · ${m.installed ? fmtBytes(m.installedBytes) + ' on server' : esc(m.sizeLabel)}</p></div>`
    }
    const sel = info.models.find((m) => m.id === S.selectedModelId)
    if (info.canTranscribe && info.apiKeyConfigured) {
      if (!waiting) html += `<button class="tx-primary" data-act="start" ${S.starting ? 'disabled' : ''}>${S.starting ? 'Starting…' : sel && !sel.installed && !sel.auto ? 'Download model & transcribe' : 'Start transcription'}</button>`
    }
    html += `<p class="tx-tip">Tip: languages are detected automatically. ${info.device.type === 'cuda' ? 'With a GPU a 10 hour book usually takes well under an hour.' : 'Without a GPU a 10 hour book can take several hours; pick a smaller model to go faster.'} Lines appear as soon as they're ready, starting where you are listening.</p>`
    els.setup.innerHTML = html
  }

  function renderNotice() {
    if (!hasTranscript() || S.query || currentTimeTranscribed()) {
      els.notice.innerHTML = ''
      return
    }
    els.notice.innerHTML = `<div class="tx-notice">${icon('hourglass')}<span>You're at ${ts(S.liveTime)}. This part isn't transcribed yet${isActive() ? ' — it will be soon' : ''}. Lines below are from the parts that are done.</span></div>`
  }

  function renderMenu() {
    if (!S.showMenu) {
      els.menu.innerHTML = ''
      return
    }
    const s = S.status || {}
    const n = pending().length
    const can = S.info && S.info.canTranscribe
    const canEdit = !!(S.info && S.info.canEdit) // only admins change or delete a transcript
    let h = `<div class="tx-menu-backdrop" data-act="menu-close"><div class="tx-menu" data-stop="1">`
    if (s.modelId) h += `<p class="tx-menu-label">Model: ${esc(modelName(s.modelId))}${s.engine === 'device' && s.deviceName ? ` · made on ${esc(s.deviceName)}` : ''}${s.language ? ` · ${esc(s.language)}` : ''}</p>`
    h += `<button data-act="bookmarks">${icon('bookmarks')}Bookmarks (${S.bookmarks.length})</button>`
    h += `<button data-act="display">${icon('fact')}Display & colours…</button>`
    // Book analysis: the checks a finished transcription gets, again, without transcribing the audio again
    if (s.status === 'done' && canEdit) h += `<button data-act="analyze"${s.analysis === 'queued' || s.analysis === 'running' ? ' disabled' : ''}>${icon('fact')}${s.analysis === 'queued' || s.analysis === 'running' ? 'Book analysis running…' : 'Book analysis (sync the book with the audio, no re-transcribing)'}</button>`
    if (s.status === 'done' && canEdit) h += `<button data-act="ebook-check">${icon('spell')}Check spelling against ebook</button>`
    if (canEdit && S.ebookCheck && S.ebookCheck.suggestions && S.ebookCheck.suggestions.length) h += `<button data-act="review">${icon('fact')}Review ebook spelling fixes</button>`
    if (s.status === 'done' && S.info && S.info.reader !== false) h += `<button data-act="realign">${icon('refresh')}Re-align read along</button>`
    if (n && canEdit) h += `<button data-act="apply-all">${icon('check')}Apply all ebook spellings (${n})</button><button data-act="ignore-all">${icon('block')}Ignore all ebook spellings (${n})</button>`
    if (can && canEdit && !isDeviceJob()) h += `<button data-act="retranscribe">${icon('refresh')}Re-transcribe…</button><button data-act="delete" class="tx-danger">${icon('trash')}Delete transcription</button>`
    h += `</div></div>`
    els.menu.innerHTML = h
  }

  function renderSheet() {
    if (!S.showSheet || !S.ebookCheck) {
      els.sheet.innerHTML = ''
      return
    }
    const check = S.ebookCheck
    const all = check.suggestions || []
    const groupsMap = new Map()
    all
      .filter((x) => (x.status || 'pending') === 'pending')
      .forEach((x) => {
        const k = `${x.heard.toLowerCase()}→${x.ebook.toLowerCase()}`
        if (!groupsMap.has(k)) groupsMap.set(k, { key: k, heard: x.heard, ebook: x.ebook, items: [] })
        groupsMap.get(k).items.push(x)
      })
    const groups = [...groupsMap.values()].sort((a, b) => b.items.length - a.items.length)
    S.sheetGroups = groups
    const pendingCount = groups.reduce((n, g) => n + g.items.length, 0)
    const applied = all.filter((x) => x.status === 'applied').length
    let h = `<div class="tx-sheet"><div class="tx-sheet-head"><button class="tx-iconbtn" data-act="sheet-close">${icon('arrowBack')}</button>
      <div class="tx-grow" style="padding:0 8px"><p class="tx-strong" style="font-size:1.1rem;margin:0">Ebook spelling check</p><p class="tx-small" style="margin:0">${pendingCount} to review${check.ebookTitle ? ' · ' + esc(check.ebookTitle) : ''}</p></div></div>
      <div class="tx-sheet-body"><div class="tx-wrap">
      <div class="tx-warnbox">${icon('warn')}<span>${DISCREPANCY}</span></div>
      <p>These words in the transcript differ from the ebook in a way that looks like a mishearing or misspelling. The ebook and the audiobook don't always match word for word, so only words with matching text on both sides are listed. Review them before applying.</p>`
    if (groups.length) h += `<div class="tx-btnrow"><button class="tx-btn-success" data-act="sheet-apply" data-g="all" ${S.ebookBusy ? 'disabled' : ''}>Apply all (${pendingCount})</button><button data-act="sheet-ignore" data-g="all" ${S.ebookBusy ? 'disabled' : ''}>Ignore all</button></div>`
    else h += `<p style="color:inherit">Nothing left to review.</p>`
    groups.forEach((g, i) => {
      const first = g.items[0]
      h += `<div class="tx-group"><div class="tx-row"><p class="tx-grow"><span class="tx-strike">${esc(g.heard)}</span> ${icon('arrowFwd')} <strong>${esc(g.ebook)}</strong></p><span class="tx-small" style="margin-left:8px">${g.items.length}×</span></div>
        <p class="tx-ctx">“…${esc(first.context)}…”</p>
        <p class="tx-warn">${icon('warn')}<span>${DISCREPANCY}</span></p>
        <div class="tx-row" style="margin-top:8px"><button class="tx-link" data-act="sheet-seek" data-t="${first.s}">${ts(first.s)}</button><span class="tx-small tx-grow">${esc(first.chapter || '')}</span>
          <button class="tx-btn-success" data-act="sheet-apply" data-g="${i}" ${S.ebookBusy ? 'disabled' : ''}>Apply</button><button data-act="sheet-ignore" data-g="${i}" ${S.ebookBusy ? 'disabled' : ''}>Ignore</button></div></div>`
    })
    if (check.chapters && check.chapters.length) {
      const matched = check.chapters.filter((c) => c.ebook).length
      h += `<div style="margin-top:24px"><p class="tx-strong" data-act="sheet-chapters" style="cursor:pointer;display:flex;align-items:center">${icon(S.showChapters ? 'expandLess' : 'expandMore')}Chapters lined up with the ebook (${matched}/${check.chapters.length})</p>`
      if (S.showChapters) check.chapters.forEach((c, i) => (h += `<div class="tx-row tx-small" style="padding:4px 0;border-bottom:1px solid var(--tx-btn)"><span style="width:50%;padding-right:8px">${esc(c.audio || 'Chapter ' + (i + 1))}</span><span style="width:50%">${c.ebook ? esc(c.ebook) : '<i>not in the ebook</i>'}</span></div>`))
      h += `</div>`
    }
    if (applied) h += `<p>${plural(applied, 'correction')} applied. The original transcript is kept on the server.</p>`
    h += `</div></div></div>`
    // redrawn while it is open (status checks): keep the reader's place in the list
    const body = els.sheet.querySelector('.tx-sheet-body')
    const keep = body ? body.scrollTop : 0
    els.sheet.innerHTML = h
    const nb = els.sheet.querySelector('.tx-sheet-body')
    if (nb && keep) nb.scrollTop = keep
  }

  function renderDisplay() {
    if (!S.showDisplay) {
      els.displaySheet.innerHTML = ''
      return
    }
    const row = (key, label, help) =>
      `<div class="tx-group"><p class="tx-strong">${label}</p>${help ? `<p class="tx-small" style="white-space:normal;margin-top:2px">${help}</p>` : ''}<select class="tx-select" data-pref="${key}">${ADAPT.OPTIONS[key].map(([v, t]) => `<option value="${v}"${ADAPT.prefs[key] === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`
    els.displaySheet.innerHTML = `<div class="tx-sheet"><div class="tx-sheet-head"><button class="tx-iconbtn" data-act="display-close">${icon('arrowBack')}</button>
      <div class="tx-grow" style="padding:0 8px"><p class="tx-strong" style="font-size:1.1rem;margin:0">Display & colours</p><p class="tx-small" style="margin:0">Saved in this browser</p></div></div>
      <div class="tx-sheet-body"><p>${esc(ADAPT.describe())}</p>
      ${row('screen', 'Screen', 'Automatic uses e-ink on e-ink readers, true black on HDR / OLED-style screens, and follows light or dark mode.')}
      ${row('colorVision', 'Colour vision', 'Swaps reds and greens for colours you can tell apart, and adds patterns so nothing relies on colour alone.')}
      ${row('power', 'Performance', 'Automatic starts at full quality and eases off if this device drops frames, the battery is low or data saver is on.')}
      ${row('motion', 'Motion')}
      </div></div>`
  }

  function renderBookmarks() {
    if (!S.showBookmarks) {
      els.bmSheet.innerHTML = ''
      return
    }
    const list = S.bookmarks.slice().sort((a, b) => a.time - b.time)
    let h = `<div class="tx-sheet"><div class="tx-sheet-head"><button class="tx-iconbtn" data-act="bm-close">${icon('arrowBack')}</button>
      <div class="tx-grow" style="padding:0 8px"><p class="tx-strong" style="font-size:1.1rem;margin:0">Bookmarks</p><p class="tx-small" style="margin:0">Click Bookmark to save a moment, hold it to save a section</p></div></div>
      <div class="tx-sheet-body"><div class="tx-wrap">`
    if (!list.length) h += `<p style="text-align:center;margin-top:48px">No bookmarks yet. Click Bookmark to save the line you're hearing, or hold it while a passage plays to save the whole section.</p>`
    list.forEach((bm) => {
      const p = parseBookmark(bm)
      const len = Math.round(p.end - p.start)
      const editing = S.editingBookmark === bm.time
      h += `<div class="tx-bm-row" ${editing ? '' : `data-act="bm-seek" data-t="${bm.time}"`}>
        <div class="tx-bm-time">${icon(p.kind === 'clip' ? 'cut' : 'bookmark')}<span>${ts(p.start)}</span>${p.kind === 'clip' ? `<div class="tx-bm-end">– ${ts(p.end)}<br><small>${len >= 60 ? `${Math.floor(len / 60)} min ${len % 60} s` : `${len} s`}</small></div>` : ''}</div>
        <div class="tx-bm-quote">${p.quote ? `“${esc(p.quote)}”` : ''}
          ${
            editing
              ? `<textarea class="tx-bm-input" data-el-note rows="4" placeholder="${p.quote ? 'What stood out? Thoughts, a reminder, a question…' : 'Bookmark name or note'}">${esc(p.note)}</textarea>
                 <div class="tx-btnrow"><button data-act="bm-note-cancel">Cancel</button><button class="tx-btn-success" data-act="bm-note-save" data-t="${bm.time}">Save</button></div>`
              : p.note
              ? `<div class="tx-bm-note">${p.quote ? icon('fact') : ''}<span>${esc(p.note)}</span></div>`
              : `<button class="tx-bm-addnote" data-act="bm-note" data-t="${bm.time}">+ Add a note</button>`
          }</div>
        ${editing ? '' : `<button class="tx-iconbtn" data-act="bm-note" data-t="${bm.time}" title="Note">${icon('fact')}</button><button class="tx-iconbtn" data-act="bm-delete" data-t="${bm.time}" title="Remove">${icon('trash')}</button>`}</div>`
    })
    h += `</div></div></div>`
    els.bmSheet.innerHTML = h
    const input = els.bmSheet.querySelector('[data-el-note]')
    if (input) input.focus()
  }

  async function loadBookmarks() {
    if (!S.key) return
    try {
      const me = await absRequest('GET', '/api/me')
      S.bookmarks = ((me && me.bookmarks) || []).filter((b) => b.libraryItemId === S.key)
      renderAll()
      renderLines()
    } catch (e) {}
  }

  async function saveClip(time, end) {
    let start = Math.floor(time)
    let title
    let stop = null
    if (end == null) {
      const q = quoteAt(time)
      title = q ? buildTitle({ quote: q, start }) : new Date().toLocaleString()
    } else {
      const sec = sectionQuote(time, end)
      start = Math.floor(sec.start)
      stop = Math.max(start + 1, Math.ceil(sec.end))
      title = buildTitle({ quote: sec.quote, note: sec.quote ? '' : 'Section', start, end: stop })
    }
    const existing = S.bookmarks.find((b) => b.time === start)
    if (existing) {
      const old = parseBookmark(existing)
      if (old.quote && old.note) title = withNote({ time: start, title }, old.note) // keep the note already written
    }
    const url = `/api/me/item/${encodeURIComponent(S.key)}/bookmark`
    if (existing) await absRequest('PATCH', url, { ...existing, title })
    else await absRequest('POST', url, { time: start, title })
    await loadBookmarks()
    toast('success', `${end == null ? 'Bookmark' : 'Section'} saved at ${end == null ? ts(start) : `${ts(start)}–${ts(stop)}`} · add a note under Bookmarks`)
  }

  /** Tap = bookmark this second; hold = clip from press to release (30 s back when paused). */
  function setupClipButton(btn) {
    let pressedAt = 0
    let startTime = 0
    let timer = null
    let tick = null
    let recording = false
    const reset = () => {
      clearTimeout(timer)
      clearInterval(tick)
      pressedAt = 0
      recording = false
      btn.classList.remove('tx-recording')
      els.clipIcon.innerHTML = icon('bookmarkAdd')
      els.clipLabel.textContent = 'Bookmark'
    }
    btn.addEventListener('contextmenu', (e) => e.preventDefault())
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      try {
        btn.setPointerCapture(e.pointerId)
      } catch (err) {}
      pressedAt = Date.now()
      startTime = player.currentTime()
      timer = setTimeout(() => {
        recording = true
        btn.classList.add('tx-recording')
        els.clipIcon.innerHTML = icon('cut')
        tick = setInterval(() => (els.clipLabel.textContent = ts((Date.now() - pressedAt) / 1000)), 250)
        els.clipLabel.textContent = '0:00'
      }, HOLD_MS)
    })
    const finish = async () => {
      if (!pressedAt) return
      const wasRecording = recording
      const t0 = startTime
      reset()
      try {
        if (!wasRecording) return await saveClip(t0)
        let start = t0
        let end = player.currentTime()
        if (end - start < 2) {
          end = Math.max(start, end)
          start = Math.max(0, end - DEFAULT_CLIP_SEC)
        }
        await saveClip(start, end)
      } catch (err) {
        toast('error', `Couldn't save the bookmark: ${err.message}`)
      }
    }
    btn.addEventListener('pointerup', finish)
    btn.addEventListener('pointercancel', reset)
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        saveClip(player.currentTime()).catch((err) => toast('error', err.message))
      }
    })
  }

  /** line index -> 'bookmark' | 'cut' */
  function bookmarkedLines() {
    const map = new Map()
    S.bookmarks.forEach((bm) => {
      const p = parseBookmark(bm)
      const from = lineIndexAt(p.start)
      const to = p.kind === 'clip' ? lineIndexAt(p.end - 0.5) : from
      for (let i = Math.max(0, from); i <= to && i >= 0; i++) if (!map.has(i) || p.kind === 'mark') map.set(i, p.kind === 'clip' ? 'cut' : 'bookmark')
    })
    return map
  }

  // ---- lines

  function filtered() {
    if (!S.query) return S.lines
    const q = S.query.toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return S.lines.filter((l) => l.lower.includes(q) || terms.every((w) => l.lower.includes(w)))
  }

  function suggestionMap() {
    const map = new Map()
    pending().forEach((x) => {
      const k = Math.round(x.s * 100)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(x)
    })
    return map
  }

  function renderLineText(line, regex, sugg) {
    const fixes = !S.query && sugg.get(Math.round(line.s * 100))
    if (fixes) {
      const marked = new Map()
      fixes.forEach((f) => {
        for (let k = 0; k < (f.wn || 1); k++) marked.set(f.wi + k, f)
      })
      const re = wordRe()
      let out = ''
      let last = 0
      let wi = 0
      let m
      while ((m = re.exec(line.t)) !== null) {
        out += esc(line.t.slice(last, m.index))
        const f = marked.get(wi)
        out += f ? `<span class="tx-sugg" data-msg="${esc(`Heard “${f.heard}”, the ebook says “${f.ebook}”.`)}" title="Ebook: ${esc(f.ebook)}. ${esc(DISCREPANCY)}">${esc(m[0])}</span>` : esc(m[0])
        last = m.index + m[0].length
        wi++
      }
      return out + esc(line.t.slice(last))
    }
    if (!regex) return esc(line.t)
    return line.t
      .split(regex)
      .map((part, i) => (i % 2 ? `<mark class="tx-mark">${esc(part)}</mark>` : esc(part)))
      .join('')
  }

  // ---- karaoke

  function buildKaraokeModel() {
    if (VIEWS) {
      VIEWS.update({ ebook: S.ebookText })
      S.karaoke = VIEWS.buildKaraoke()
    } else S.karaoke = buildKaraoke(S.lines, S.ebookText)
    S.kActive = { pi: -1, wi: -1 }
  }

  function karaokeParas() {
    return S.karaoke ? S.karaoke.paragraphs : []
  }

  function karaokeFiltered() {
    const ps = karaokeParas().map((p, i) => ({ p, i }))
    if (!S.query) return ps
    const q = S.query.toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return ps.filter(({ p }) => {
      const t = p.t.toLowerCase()
      return t.includes(q) || terms.every((w) => t.includes(w))
    })
  }

  function computeKaraokeActive() {
    const m = S.karaoke
    if (!m || !m.times.length) return { pi: -1, wi: -1 }
    const k = wordAt(m, S.liveTime + KARAOKE_LEAD)
    if (k < 0) return { pi: -1, wi: -1 }
    const [pi, wi] = m.refs[k]
    return { pi, wi }
  }

  function paraHtml(p, i) {
    if (i !== S.kActive.pi || S.query) {
      if (!S.query) return esc(p.t)
      const terms = S.query.split(/\s+/).filter(Boolean).map(escRe)
      return p.t
        .split(new RegExp(`(${terms.join('|')})`, 'gi'))
        .map((part, j) => (j % 2 ? `<mark class="tx-mark">${esc(part)}</mark>` : esc(part)))
        .join('')
    }
    const w = p.words[S.kActive.wi]
    if (!w) return esc(p.t)
    return `<span data-o="0">${esc(p.t.slice(0, w.s))}</span><span class="tx-kword" data-o="${w.s}">${esc(p.t.slice(w.s, w.e))}</span><span data-o="${w.e}">${esc(p.t.slice(w.e))}</span>`
  }

  function paraClass(p, i) {
    return `tx-kpara${p.h ? ' tx-khead' : ''}${p.start == null && !S.query ? ' tx-kuntimed' : ''}${!S.query && i === S.kActive.pi ? ' tx-kactive' : ''}`
  }

  function renderKaraoke() {
    const m = S.karaoke
    let note = ''
    if (!S.query && m && m.source === 'ebook') note = `${icon('book')}Text from ${esc(m.ebookTitle || 'the ebook')}, timed to the narration`
    else if (!S.query && S.status && S.status.status === 'done') note = `${icon('fact')}${S.ebookText ? "The ebook's text doesn't match this narration, so the transcript is shown." : 'Showing the transcript. Check spelling against the ebook (⋮ menu) to use the book’s own text here.'}`
    if (!VIEWS) return
    VIEWS.update({ ebook: S.ebookText, note, karaokeSize: S.karaokeSize, query: S.query })
    S.karaoke = VIEWS.buildKaraoke()
    S.kActive = VIEWS.karaokeActive
  }

  const paraEl = (i) => els.klist.querySelector(`.tx-kpara[data-p="${i}"]`)

  // Karaoke: light each word up a touch early (the eye needs a moment to find it), and between clock
  // ticks follow the audio every frame so the outline isn't up to a tick behind the voice.
  const KARAOKE_LEAD = 0.12
  // Read along: the word follows the voice every frame too (not on e-ink or when saving power)
  let raFrame = 0
  function raFrames() {
    if (raFrame) return
    const step = () => {
      raFrame = 0
      const p = ADAPT.profile()
      if (!S.open || S.viewMode !== 'readalong' || !player.isPlaying() || p.eink || p.level === 0 || document.hidden) return
      RA2.tick(player.currentTime())
      raFrame = requestAnimationFrame(step)
    }
    raFrame = requestAnimationFrame(step)
  }
  let kFrame = 0
  function karaokeFrames() {
    if (kFrame) return
    const step = () => {
      kFrame = 0
      const p = ADAPT.profile()
      if (!S.open || S.viewMode !== 'karaoke' || !player.isPlaying() || p.eink || p.level === 0 || document.hidden) return
      S.liveTime = player.currentTime()
      updateKaraokeActive()
      kFrame = requestAnimationFrame(step)
    }
    kFrame = requestAnimationFrame(step)
  }

  function updateKaraokeActive() {
    if (!VIEWS) return
    VIEWS.setTime(S.liveTime)
    S.kActive = VIEWS.karaokeActive
    S.activeIndex = VIEWS.active
  }

  function scrollToPara(i, instant) {
    const el = paraEl(i)
    if (!el) return
    els.scroller.scrollTo({ top: Math.max(0, el.offsetTop - els.scroller.clientHeight * 0.12), behavior: instant || !ADAPT.profile().motion ? 'auto' : 'smooth' })
  }

  function clickParagraph(el, e) {
    const i = parseInt(el.getAttribute('data-p'), 10)
    const p = S.karaoke && S.karaoke.paragraphs[i]
    if (!p) return
    let offset = null
    const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null
    if (range && range.startContainer && range.startContainer.nodeType === 3) {
      const holder = range.startContainer.parentElement
      offset = (holder && holder.dataset && holder.dataset.o !== undefined ? Number(holder.dataset.o) : 0) + range.startOffset
    }
    let word = offset != null ? p.words.find((w) => offset >= w.s && offset <= w.e) || p.words.find((w) => w.s >= offset) : null
    if (!word || word.time == null) word = p.words.find((w) => w.time != null)
    if (!word) return toast('info', "This part isn't in the narration")
    if (S.txReading) return // read mode: the audio stays where it was paused
    S.liveTime = word.time
    S.followPlayback = true
    if (S.reading) {
      updateKaraokeActive()
      return renderTransport()
    }
    player.seek(word.time)
    if (S.query) {
      els.input.value = ''
      S.query = ''
      renderAll()
      renderLines()
      requestAnimationFrame(() => scrollToPara(i, true))
    } else updateKaraokeActive()
  }

  /**
   * The ebook's own text for Karaoke, asked for once per book (again with force, when the ebook check
   * changes). Books without it used to ask on every switch to Karaoke, rebuilding and re-drawing everything.
   */
  async function loadEbookText(force) {
    if (!S.key || (!force && S.ebookTextFor === S.key)) return
    const key = S.key
    S.ebookTextFor = key
    let text = null
    try {
      const res = await request('GET', `${itemPath(key)}/ebook-text`)
      text = (res && res.text) || null
    } catch (e) {}
    if (S.key !== key) return
    const changed = JSON.stringify(text) !== JSON.stringify(S.ebookText)
    S.ebookText = text
    if (changed && S.karaoke) {
      buildKaraokeModel()
      renderKaraoke()
      showMode()
      if (S.viewMode === 'karaoke') requestAnimationFrame(() => scrollToActiveAny(true))
    }
  }

  function scrollToActiveAny(instant) {
    if (VIEWS) VIEWS.follow(instant)
  }

  /**
   * Lyrics and Karaoke each keep their own list, drawn when the text changes (new lines, search, ebook text),
   * not on switching; both follow the narration all the time, so switching just shows the other one.
   */
  function renderLines() {
    renderLyrics()
    if (S.karaoke || S.viewMode === 'karaoke') renderKaraoke()
    showMode()
  }

  function showMode() {
    if (!els.list) return
    if (S.viewMode === 'readalong' && !RA2.isEpub()) S.viewMode = 'lyrics' // another book, not an EPUB
    const ra = S.viewMode === 'readalong'
    els.scroller.style.display = ra ? 'none' : ''
    RA2.show(ra)
    const k = S.viewMode === 'karaoke'
    if (VIEWS && !ra) VIEWS.setMode(k ? 'karaoke' : 'lyrics')
    els.list.style.display = k ? 'none' : ''
    els.klist.style.display = k ? '' : 'none'
  }

  function renderLyrics() {
    if (!VIEWS) return
    const marks = new Map()
    bookmarkedLines().forEach((name, i) => marks.set(i, icon(name)))
    VIEWS.update({ lines: S.lines, query: S.query, marks, suggestions: suggestionMap(), discrepancy: DISCREPANCY, karaokeSize: S.karaokeSize })
    VIEWS.setTime(S.liveTime)
    S.activeIndex = VIEWS.active
  }

  // Lines are in order unless searching: the i-th child is line i (a search through thousands of lines per lookup made big jumps slow)
  const lineEl = (i) => {
    const c = !S.query && els.list.children[i]
    if (c && c.dataset && Number(c.dataset.i) === i) return c
    return els.list.querySelector(`.tx-line[data-i="${i}"]`)
  }

  /** Playback moved: the shared views move the highlight (only the lines it touches) and follow it */
  function updateActive() {
    if (!VIEWS) return
    VIEWS.setTime(S.liveTime)
    S.activeIndex = VIEWS.active
    S.kActive = VIEWS.karaokeActive
  }

  function scrollToLine(i, instant) {
    const el = lineEl(i)
    if (!el) return
    const top = el.offsetTop - els.scroller.clientHeight * 0.35
    els.scroller.scrollTo({ top: Math.max(0, top), behavior: instant || !ADAPT.profile().motion ? 'auto' : 'smooth' })
  }

  function userScrolled() {
    S.lastUserScroll = Date.now()
    if (S.followPlayback) {
      S.followPlayback = false
      els.follow.style.display = hasTranscript() && !S.query ? '' : 'none'
    }
  }

  // ------------------------------------------------------------------ data

  async function fetchLines(reset) {
    if (!S.key) return
    if (S.fetching) {
      S.refetch = S.refetch || reset ? true : false
      return
    }
    S.fetching = true
    const key = S.key
    try {
      const from = reset ? 0 : S.rawCount
      const res = await request('GET', `${itemPath(key)}/lines?fromIndex=${from}`)
      if (key !== S.key) return
      const incoming = (res.lines || []).map((l) => ({ s: l.s, e: l.e, t: l.t || '', lower: (l.t || '').toLowerCase() }))
      let merged = reset ? incoming : S.lines.concat(incoming)
      const last = S.lines.length ? S.lines[S.lines.length - 1].s : -1
      const outOfOrder = incoming.some((l, i) => l.s < (i ? incoming[i - 1].s : last))
      if (reset || outOfOrder) merged = merged.slice().sort((a, b) => a.s - b.s)
      merged.forEach((l, i) => (l.i = i))
      const hadLines = S.lines.length > 0
      S.lines = merged
      S.rawCount = from + incoming.length
      setStatus(res.status)
      renderAll()
      if (!reset && !incoming.length) return // nothing new: the lists stay as they are
      if (S.karaoke || S.viewMode === 'karaoke') buildKaraokeModel()
      renderLines()
      if (!hadLines || reset) requestAnimationFrame(() => S.followPlayback && scrollToActiveAny(true))
    } catch (e) {
      console.error('[Transcription] fetch failed', e)
    } finally {
      S.fetching = false
      if (S.refetch !== null) {
        const r = S.refetch
        S.refetch = null
        fetchLines(r)
      }
    }
  }

  function setStatus(st) {
    const prev = S.status
    S.status = st
    if (S.analysisPending && st && st.analysis === 'done' && (st.analysisAt || 0) !== S.analysisFrom) {
      // Book analysis finished: new book text and suggestions, and the book lined up with the narration again
      S.analysisPending = false
      toast('success', st.ebookCheckMessage || 'Book analysis done')
      loadEbookCheck()
      loadEbookText(true)
      // an open read along lines up again now (one opened later reads the new book text anyway)
      Promise.resolve()
        .then(async () => {
          if (await RA2.realign()) return
          const lines = (S.lines || []).slice().sort((x, y) => x.s - y.s)
          if (lines.length && document.querySelector('#reader')) READALONG.start(S.key, lines, player.currentTime())
        })
        .catch(() => {})
    }
    if (st && st.modelId && !hasTranscript()) S.selectedModelId = st.modelId
    if (st && st.ebookCheck === 'done' && (!prev || prev.ebookCheck !== 'done' || !S.ebookCheck || prev.revision !== st.revision)) {
      loadEbookCheck()
      if (prev) loadEbookText(true) // the check finished: the ebook's text may be new
    }
  }

  async function loadEbookCheck() {
    try {
      const res = await request('GET', `${itemPath(S.key)}/ebook-check`)
      S.ebookCheck = res.check || null
      renderAll()
      renderLines()
    } catch (e) {}
  }

  async function pollStatus() {
    if (!S.open || !S.key) return
    try {
      const st = await request('GET', `${itemPath(S.key)}/status`)
      if (!S.open) return
      const count = st.linesCount || 0
      const revChanged = S.lastRevision !== null && st.revision !== S.lastRevision
      S.lastRevision = st.revision
      setStatus(st)
      if (st.status === 'none') {
        if (S.lines.length) {
          S.lines = []
          S.rawCount = 0
          S.ebookCheck = null
          renderLines()
        }
      } else if (count < S.rawCount || (revChanged && !isActive() && count === S.rawCount)) fetchLines(true)
      else if (count > S.rawCount || st.status === 'done') {
        if (count !== S.rawCount) fetchLines(false)
      }
      renderAll()
    } catch (e) {
      if (e.status === 404) {
        S.status = { status: 'none' }
        renderAll()
      }
    }
  }

  // ------------------------------------------------------------------ actions

  /** Cover colour behind the view (lyrics and karaoke), readable in every theme; plain on e-ink */
  async function applyShade() {
    if (!root) return
    const key = S.key
    const p = ADAPT.profile()
    if (p.eink || !key) {
      root.style.background = ''
      return
    }
    const cover = await SHADE.coverColor(key)
    if (S.key !== key) return
    const cs = getComputedStyle(root)
    const shade = SHADE.build(cover, SHADE.parse(cs.getPropertyValue('--tx-bg')), SHADE.parse(cs.getPropertyValue('--tx-fg')))
    root.style.background = shade ? shade.background : ''
    root.style.setProperty('--tx-shade-top', shade ? shade.upper : 'var(--tx-bg)')
    // read mode's buttons and accents take the book's cover colour (like the gradient)
    setCoverAccent(cover)
  }

  /** The cover colour, made clear enough for buttons on light and dark pages; text on it in white or black */
  function setCoverAccent(rgb) {
    const docEl = document.documentElement
    const m = rgb && String(Array.isArray(rgb) ? rgb.join(',') : typeof rgb === 'object' ? [rgb.r, rgb.g, rgb.b].join(',') : rgb).match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/)
    if (!m || ADAPT.profile().eink) {
      docEl.style.removeProperty('--tra-acc')
      docEl.style.removeProperty('--tra-on-acc')
      return
    }
    let [r, g, b] = [+m[1], +m[2], +m[3]].map((v) => v / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let sat = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6
    }
    const S2 = Math.max(sat, 0.35)
    const L = 0.55
    const f = (n) => {
      const k = (n + h * 12) % 12
      const a = S2 * Math.min(L, 1 - L)
      return Math.round((L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
    }
    const [R, G, B] = [f(0), f(8), f(4)]
    docEl.style.setProperty('--tra-acc', `rgb(${R}, ${G}, ${B})`)
    docEl.style.setProperty('--tra-on-acc', (0.299 * R + 0.587 * G + 0.114 * B) / 255 > 0.6 ? '#111' : '#fff')
  }
  ADAPT.onChange(() => S.open && applyShade())

  /**
   * opts.item + opts.reading: open any book's transcript for reading and searching (book page), without
   * the player: taps open that part as continuous text, "Play from here" starts listening.
   */
  async function open(opts) {
    const o = opts && opts.item ? opts : {}
    const item = o.item || player.libraryItem()
    if (!item) return
    const key = item.id
    S.reading = !!o.reading
    S.item = item
    const ebook = item.media && item.media.ebookFile
    S.ebookFormat = ebook ? String(ebook.ebookFormat || (ebook.metadata && ebook.metadata.ext) || '').replace('.', '').toLowerCase() : ''
    if (!root) build()
    S.open = true
    root.classList.add('tx-open')
    document.documentElement.style.overflow = 'hidden'
    if (S.key !== key) {
      Object.assign(S, { key, lines: [], rawCount: 0, status: null, ebookCheck: null, lastRevision: null, selectedModelId: null, ebookText: null, karaoke: null, kActive: { pi: -1, wi: -1 } })
      els.input.value = ''
      S.query = ''
    }
    S.title = (item.media && item.media.metadata && item.media.metadata.title) || ''
    S.followPlayback = true
    S.showMenu = false
    S.showSheet = false
    S.liveTime = S.reading ? progressTimeOf(key) : player.currentTime()
    const ready = S.lines.length > 0 // loaded already (in the background while it played)
    S.loading = !ready
    renderAll()
    applyShade()
    if (ready) {
      updateActive()
      if (S.karaoke) updateKaraokeActive()
      showMode()
      requestAnimationFrame(() => scrollToActiveAny(true))
    }
    try {
      S.info = await request('GET', '/info')
      if (!S.selectedModelId) {
        // "Automatic": the server picks for this book from its language and the hardware
        S.selectedModelId = S.info.defaultModelId || (S.info.models[0] && S.info.models[0].id)
      }
      await fetchLines(!ready) // only what's new if it was loaded already
      S.lastRevision = S.status ? S.status.revision : null
      loadBookmarks()
      if (S.viewMode === 'karaoke') loadEbookText()
    } catch (e) {
      S.info = null
      toast('error', `Transcription: ${e.message}`)
    }
    S.loading = false
    renderAll()
    if (!ready) {
      renderLines()
      requestAnimationFrame(() => scrollToActiveAny(true))
    }
  }

  /** While a book plays with the panel closed: load its transcript and draw both views, hidden */
  async function warmUp(item) {
    if (S.warming || S.open) return
    S.warming = true
    try {
      if (!root) build()
      const key = item.id
      Object.assign(S, { key, item, lines: [], rawCount: 0, status: null, ebookCheck: null, lastRevision: null, selectedModelId: null, ebookText: null, karaoke: null, kActive: { pi: -1, wi: -1 }, activeIndex: -1 })
      const ebook = item.media && item.media.ebookFile
      S.ebookFormat = ebook ? String(ebook.ebookFormat || (ebook.metadata && ebook.metadata.ext) || '').replace('.', '').toLowerCase() : ''
      S.title = (item.media && item.media.metadata && item.media.metadata.title) || ''
      S.reading = false
      S.liveTime = player.currentTime()
      await fetchLines(true)
      if (S.key !== key || !hasTranscript()) return
      // Karaoke has more to work out: a moment later, when the page is quiet
      setTimeout(() => {
        if (S.key !== key || S.karaoke) return
        buildKaraokeModel()
        renderKaraoke()
        showMode()
        loadEbookText()
        if (RA2.isEpub()) setTimeout(() => S.key === key && RA2.load(item), 3000)
      }, 2000)
    } catch (e) {
      console.log('[Transcription] background load failed', e && e.message)
    } finally {
      S.warming = false
    }
  }

/** Where the signed-in user is in a book (seconds) */
  function progressTimeOf(id) {
    try {
      const p = window.$nuxt.$store.getters['user/getUserMediaProgress'](id)
      return (p && p.currentTime) || 0
    } catch (e) {
      return 0
    }
  }

  /** Reading mode: that part of the book as continuous text (the Karaoke view), marked */
  function readSection(t) {
    if (S.query) {
      els.input.value = ''
      S.query = ''
    }
    S.liveTime = t
    S.followPlayback = true
    S.viewMode = 'karaoke'
    buildKaraokeModel()
    loadEbookText()
    renderAll()
    renderLines()
    requestAnimationFrame(() => scrollToActiveAny(true))
  }

  /** Read along: the web player's e-book reader, the narrated word highlighted in it */
  function startReadAlong() {
    const item = S.item || player.libraryItem()
    if (!item) return
    const key = S.key
    const lines = S.lines.slice()
    const t = S.reading ? S.liveTime : player.currentTime()
    close()
    try {
      READBTN.bypass(() => window.$nuxt.$store.commit('showEReader', { libraryItem: item, keepProgress: true }))
    } catch (e) {
      return toast('error', "Couldn't open the book")
    }
    READALONG.start(key, lines, t)
    raHeader(true)
  }

  /**
   * Read along keeps the panel's header (title, Lyrics / Karaoke / Read along, search) over the book the whole time.
   */
  /** Read along in Audiobookshelf's reader: words are looked up only in reading mode (audiobook put aside) */
  const raBookOk = () => !(root && root.classList.contains('tx-ra')) || root.classList.contains('tx-ra-book')
  let raBookBtn = null
  function raBookButton() {
    if (!raBookBtn) {
      raBookBtn = document.createElement('button')
      raBookBtn.className = 'tx-ra-bookbtn'
      raBookBtn.title = 'Read the book without the audiobook'
      raBookBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>'
      raBookBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (root.classList.contains('tx-ra-book')) return RB.listen() // reading mode -> listening from this page
        root.classList.add('tx-ra-book') // our header and play bar step aside; the reader's own controls stay
        raBookUpdate()
      })
      document.body.appendChild(raBookBtn)
    }
    return raBookBtn
  }
  /** Book button: Read along in Audiobookshelf's reader, audio paused, not reading already */
  function raBookUpdate() {
    if (!root) return
    const inRa = root.classList.contains('tx-ra')
    if (!inRa || player.isPlaying()) root.classList.remove('tx-ra-book')
    const book = root.classList.contains('tx-ra-book')
    const show = inRa && !player.isPlaying()
    if (show || raBookBtn) {
      const b = raBookButton()
      b.style.display = show ? '' : 'none'
      // reading mode: the same button switches to listening
      if (b.dataset.mode !== (book ? 'listen' : 'book')) {
        b.dataset.mode = book ? 'listen' : 'book'
        b.title = book ? 'Listen from here' : 'Read the book without the audiobook'
        b.innerHTML = book
          ? '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>'
      }
    }
  }
  setInterval(raBookUpdate, 400)

  /** Reading mode bars: they fade after a few quiet seconds; a tap in the middle of the page shows them again */
  function fadingBars(apply) {
    let hidden = false
    let timer = 0
    const set = (h) => {
      hidden = h
      apply(h)
    }
    return {
      show() {
        clearTimeout(timer)
        set(false)
        timer = setTimeout(() => set(true), 4000)
      },
      toggle() {
        if (hidden) this.show()
        else {
          clearTimeout(timer)
          set(true)
        }
      },
      reset() {
        clearTimeout(timer)
        set(false)
      },
      get hidden() {
        return hidden
      }
    }
  }

  /** Reading mode → audiobook: the player is ready at [t] (this page), but doesn't start playing */
  function cueAudio(key, t) {
    const loaded = player.libraryItem()
    if (loaded && loaded.id === key) {
      if (typeof t === 'number') player.seek(t)
      if (player.isPlaying()) player.playPause()
      return
    }
    if (!(window.$nuxt && window.$nuxt.$eventBus)) return
    window.$nuxt.$eventBus.$emit('play-item', { libraryItemId: key, startTime: typeof t === 'number' ? t : S.liveTime || 0, paused: true })
    // in case the player starts anyway: pause it as soon as it does
    const until = Date.now() + 10000
    const check = () => {
      const it = player.libraryItem()
      if (it && it.id === key && player.isPlaying()) return player.playPause()
      if (Date.now() < until) setTimeout(check, 150)
    }
    setTimeout(check, 150)
  }

  const bookHasAudio = () => {
    const it = S.item || player.libraryItem()
    return !!(it && it.media && (it.media.numTracks || it.media.duration || (it.media.audioFiles && it.media.audioFiles.length) || (it.media.tracks && it.media.tracks.length)))
  }

  /**
   * Reading mode in Audiobookshelf's reader (MOBI, PDF): the same bars as EPUB books — contents & pages, title,
   * bookmark, search, text size, ✕ (listen from this page); page slider, first / previous / page of pages /
   * next / last. Its own small toolbar steps aside.
   */
  const RB = (() => {
    const B = { el: null, side: false, tab: 'contents', results: [], query: '', searched: false, sliding: null }
    const svg = (d, n = 22) => `<svg viewBox="0 0 24 24" width="${n}" height="${n}" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`
    const I = {
      side: 'M16 20H2V4h14v16zm2-12h4V4h-4v4zm0 12h4v-4h-4v4zm0-6h4v-4h-4v4z',
      mark: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z',
      marked: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z',
      search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      down: 'M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z',
      up: 'M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z',
      close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      first: 'M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z',
      prev: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
      next: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
      last: 'M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z',
      del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
    }
    const ad = () => READALONG.adapter()
    const fade = fadingBars((h) => B.el && B.el.classList.toggle('tra-faded', h))
    let wasOn = false
    /** taps on the page itself: sides turn pages, the middle shows / hides the bars */
    function attachTaps() {
      const a = ad()
      if (!a) return
      const surfaces = []
      if (a.kind === 'mobi') {
        const fr = document.querySelector('.ebook-viewer iframe')
        if (fr && fr.contentDocument) surfaces.push({ el: fr.contentDocument, frame: fr })
      } else {
        const cv = document.querySelector('#reader canvas')
        if (cv && cv.parentElement) surfaces.push({ el: cv.parentElement, frame: null })
        const rd = document.querySelector('#reader')
        if (rd) surfaces.push({ el: rd, frame: null })
      }
      for (const sfc of surfaces) {
        if (sfc.el.__absRbTap) continue
        sfc.el.__absRbTap = true
        sfc.el.addEventListener(
          'click',
          (e) => {
            if (!on() || DICT.justFired()) return
            const sel = (sfc.el.getSelection ? sfc.el : document).getSelection()
            if (sel && !sel.isCollapsed) return
            const x = e.clientX + (sfc.frame ? sfc.frame.getBoundingClientRect().left : 0)
            const W = window.innerWidth || 1
            e.stopPropagation() // reading mode: a tap doesn't start the audio
            e.preventDefault()
            const cur = ad()
            if (!cur) return
            if (x < W * 0.25) cur.step(-1)
            else if (x > W * 0.75) cur.step(1)
            else fade.toggle()
          },
          true
        )
      }
    }
    const marksKey = () => `absTxRbMarks:${S.key}`
    const marks = () => {
      try {
        return JSON.parse(localStorage.getItem(marksKey()) || '[]') || []
      } catch (e) {
        return []
      }
    }
    function el() {
      if (B.el) return B.el
      B.el = document.createElement('div')
      B.el.className = 'tx-rb'
      B.el.innerHTML = `
        <div class="tra-top tx-rb-top">
          <button class="tra-ibtn" data-rb="side" title="Contents and pages">${svg(I.side)}</button>
          <p class="tra-title" data-rbr="title"></p>
          <button class="tra-ibtn" data-rb="mark" data-rbr="mark" title="Bookmark this page">${svg(I.mark)}</button>
          <button class="tra-ibtn" data-rb="search" title="Search in book">${svg(I.search)}</button>
          <button class="tra-ibtn" data-rb="smaller" title="Smaller">${svg(I.down)}</button>
          <button class="tra-ibtn" data-rb="larger" title="Larger">${svg(I.up)}</button>
          <button class="tra-ibtn" data-rb="exit" title="Close">${svg(I.close)}</button>
        </div>
        <div class="tra-bottom tx-rb-bottom">
          <div class="tra-slider"><div class="tra-ticks">${Array.from({ length: 13 }, (_, i) => `<span style="left:${(i / 12) * 100}%"></span>`).join('')}</div><input type="range" min="1" max="1" value="1" data-rbr="slider" aria-label="Page"></div>
          <div class="tra-row">
            <button class="tra-box" data-rb="first" title="First page">${svg(I.first, 18)}</button>
            <button class="tra-box" data-rb="prev" title="Previous page">${svg(I.prev, 18)}</button>
            <button class="tra-pos" data-rb="pos" data-rbr="pos" title="Type a page number">1 of 1</button>
            <input class="tra-pos tra-posin" data-rbr="posin" inputmode="numeric" enterkeyhint="go" style="display:none">
            <button class="tra-box" data-rb="next" title="Next page">${svg(I.next, 18)}</button>
            <button class="tra-box" data-rb="last" title="Last page">${svg(I.last, 18)}</button>
          </div>
        </div>
        <div class="tra-side" data-rbr="side" style="display:none"></div>`
      document.body.appendChild(B.el)
      B.el.addEventListener('click', onClick)
      B.el.addEventListener('pointerdown', (e) => e.target.closest('.tra-top, .tra-bottom, .tra-side') && fade.show())
      const slider = B.el.querySelector('[data-rbr="slider"]')
      slider.addEventListener('input', () => {
        B.sliding = Number(slider.value)
        B.el.querySelector('[data-rbr="pos"]').textContent = `${B.sliding} of ${slider.max}`
      })
      slider.addEventListener('change', () => {
        const a = ad()
        B.sliding = null
        if (a) a.go(Number(slider.value))
      })
      const posin = B.el.querySelector('[data-rbr="posin"]')
      const endPos = (go) => {
        const n = parseInt(posin.value, 10)
        posin.style.display = 'none'
        B.el.querySelector('[data-rbr="pos"]').style.display = ''
        const a = ad()
        if (go && a && !isNaN(n)) a.go(Math.max(1, Math.min(a.total(), n)))
      }
      posin.addEventListener('keyup', (e) => (e.key === 'Enter' ? endPos(true) : e.key === 'Escape' ? endPos(false) : null))
      posin.addEventListener('blur', () => endPos(false))
      return B.el
    }
    function on() {
      return !!(root && root.classList.contains('tx-ra') && root.classList.contains('tx-ra-book') && ad())
    }
    function render() {
      const active = on()
      if (!active) {
        if (B.el) B.el.style.display = 'none'
        document.body.classList.remove('tx-rb-on')
        if (wasOn) fade.reset()
        wasOn = false
        return
      }
      const box = el()
      box.style.display = ''
      document.body.classList.add('tx-rb-on')
      if (!wasOn) {
        wasOn = true
        fade.show()
      }
      attachTaps()
      const a = ad()
      const page = a.page()
      const total = a.total()
      box.querySelector('[data-rbr="title"]').textContent = S.title || ''
      const slider = box.querySelector('[data-rbr="slider"]')
      slider.max = String(total)
      if (B.sliding === null) slider.value = String(page)
      const pos = box.querySelector('[data-rbr="pos"]')
      if (B.sliding === null) pos.textContent = `${page} of ${total}`
      box.querySelector('[data-rbr="posin"]').placeholder = `${page} of ${total}`
      const m = marks().some((x) => x.page === page)
      const mk = box.querySelector('[data-rbr="mark"]')
      if (mk.dataset.on !== String(m)) {
        mk.dataset.on = String(m)
        mk.innerHTML = svg(m ? I.marked : I.mark)
        mk.classList.toggle('tra-acc', m)
      }
    }
    function renderSide() {
      const sd = el().querySelector('[data-rbr="side"]')
      if (!B.side || !ad()) {
        sd.style.display = 'none'
        return
      }
      const a = ad()
      const page = a.page()
      const total = a.total()
      let list = ''
      if (B.tab === 'contents') {
        const toc = a.toc()
        let cur = -1
        toc.forEach((t, i) => {
          if (t.page && t.page <= page && (cur < 0 || t.page >= toc[cur].page)) cur = i
        })
        list = toc.length ? toc.map((t, i) => `<button class="tra-toc${i === cur ? ' tra-cur' : ''}" data-rb="toc" data-i="${i}" style="padding-left:${16 + t.depth * 16}px"><span>${esc(t.title)}</span>${t.page ? `<em>${t.page}</em>` : ''}</button>`).join('') : '<p class="tra-none" style="text-align:center;margin-top:40px">This book has no table of contents.</p>'
      } else if (B.tab === 'pages') {
        let cells = ''
        for (let n = 1; n <= total; n++) cells += `<button class="tra-pg${n === page ? ' tra-cur' : ''}" data-rb="page" data-n="${n}">${n}</button>`
        list = `<div class="tra-grid" style="margin-top:10px">${cells}</div>`
      } else if (B.tab === 'bookmarks') {
        const ms = marks()
        list = ms.length ? ms.map((x) => `<div class="tra-mark" data-rb="page" data-n="${x.page}"><span class="tra-acc">${svg(I.marked, 20)}</span><p>page ${x.page}</p><button class="tra-ibtn" data-rb="unmark" data-n="${x.page}" title="Remove bookmark">${svg(I.del, 20)}</button></div>`).join('') : '<p class="tra-none" style="text-align:center;margin-top:40px">No bookmarks yet. Tap the bookmark icon at the top to mark a page.</p>'
      } else {
        list = `<div class="tra-searchbar"><input type="search" data-rbr="sq" placeholder="Search in book" enterkeyhint="search" value="${esc(B.query)}"></div>${B.searched ? `<p class="tra-none">${B.results.length}${B.results.length >= 300 ? '+' : ''} result${B.results.length === 1 ? '' : 's'}</p>` : ''}${B.results.map((r, i) => `<div class="tra-result" data-rb="result" data-i="${i}"><p class="tra-rmeta">page ${r.page}</p><p>…${esc(r.pre)}<mark>${esc(r.match)}</mark>${esc(r.post)}…</p></div>`).join('')}`
      }
      sd.style.display = ''
      sd.innerHTML = `<div class="tra-sidepanel" data-stop>
          <div class="tra-sidehead"><div class="tra-tabs">${['contents', 'pages', 'bookmarks', 'search'].map((t) => `<button data-rb="tab" data-tab="${t}" class="${B.tab === t ? 'tra-on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><button class="tra-ibtn" data-rb="side-close" title="Close">${svg(I.close)}</button></div>
          <p class="tra-sidesub">${esc(S.title || '')} · page ${page} of ${total}</p>
          <div class="tra-sidelist">${list}</div>
        </div>`
      requestAnimationFrame(() => {
        const c = sd.querySelector('.tra-cur')
        if (c) c.scrollIntoView({ block: 'center' })
      })
      const sq = sd.querySelector('[data-rbr="sq"]')
      if (sq) {
        sq.addEventListener('keyup', (e) => {
          if (e.key !== 'Enter') return
          B.query = sq.value
          if (B.query.trim().length < 2) return
          B.results = ad() ? ad().search(B.query) : []
          B.searched = true
          renderSide()
        })
        if (!B.searched) setTimeout(() => sq.focus(), 50)
      }
    }
    function onClick(e) {
      const b = e.target.closest('[data-rb]')
      const a = ad()
      if (!b) {
        if (e.target.closest('[data-rbr="side"]') && !e.target.closest('[data-stop]')) {
          B.side = false
          renderSide()
        }
        return
      }
      e.stopPropagation()
      const what = b.getAttribute('data-rb')
      if (!a) return
      switch (what) {
        case 'side':
          B.side = true
          B.tab = B.tab === 'search' ? 'contents' : B.tab
          return renderSide()
        case 'search':
          B.side = true
          B.tab = 'search'
          return renderSide()
        case 'side-close':
          B.side = false
          return renderSide()
        case 'tab':
          B.tab = b.getAttribute('data-tab')
          return renderSide()
        case 'toc': {
          const t = a.toc()[Number(b.getAttribute('data-i'))]
          B.side = false
          renderSide()
          return t && t.go()
        }
        case 'page':
          B.side = false
          renderSide()
          return a.go(Number(b.getAttribute('data-n')))
        case 'result': {
          const r = B.results[Number(b.getAttribute('data-i'))]
          B.side = false
          renderSide()
          return r && r.go()
        }
        case 'mark': {
          const page = a.page()
          let ms = marks()
          ms = ms.some((x) => x.page === page) ? ms.filter((x) => x.page !== page) : ms.concat({ page }).sort((x, y) => x.page - y.page)
          localStorage.setItem(marksKey(), JSON.stringify(ms))
          return render()
        }
        case 'unmark': {
          const n = Number(b.getAttribute('data-n'))
          localStorage.setItem(marksKey(), JSON.stringify(marks().filter((x) => x.page !== n)))
          return renderSide()
        }
        case 'smaller':
          return a.font && a.font(-10)
        case 'larger':
          return a.font && a.font(10)
        case 'first':
          return a.go(1)
        case 'last':
          return a.go(a.total())
        case 'prev':
          return a.step(-1)
        case 'next':
          return a.step(1)
        case 'pos': {
          const inp = B.el.querySelector('[data-rbr="posin"]')
          inp.value = ''
          b.style.display = 'none'
          inp.style.display = ''
          return inp.focus()
        }
        case 'exit':
          return listen()
      }
    }
    /** ✕: back to listening, from the first word on this screen */
    function listen() {
      B.side = false
      renderSide()
      if (!bookHasAudio()) {
        // an ebook with no audio: ✕ closes the book
        root.classList.remove('tx-ra-book')
        READALONG.stop()
        raHeader(false)
        try {
          window.$nuxt.$store.commit('setShowEReader', false)
        } catch (e) {}
        return render()
      }
      root.classList.remove('tx-ra-book')
      const loaded = player.libraryItem()
      const here = READALONG.listenHere()
      if (!here) cueAudio(S.key, loaded && loaded.id === S.key ? null : S.liveTime || 0)
      raBookUpdate()
      render()
    }
    setInterval(render, 400)
    return { render, listen }
  })()

  /**
   * Audiobookshelf's blue Read button, for books with audio and a transcript: the read-along reading mode
   * (contents, pages, search, dictionary) instead of its plain reader; ✕ (or the Listen button) switches to
   * listening from that page. Ebook-only books, and books without a transcript, open as before.
   */
  const READBTN = (() => {
    let wrapped = false
    let internal = false
    // eslint-disable-next-line no-unused-vars
    const hasAudio = (it) => !!(it && it.media && (it.media.numTracks || it.media.duration || (it.media.audioFiles && it.media.audioFiles.length) || (it.media.tracks && it.media.tracks.length)))
    function bypass(fn) {
      internal = true
      try {
        return fn()
      } finally {
        internal = false
      }
    }
    function ensure() {
      const st = window.$nuxt && window.$nuxt.$store
      if (!st || wrapped) return
      wrapped = true
      const orig = st.commit.bind(st)
      st.commit = function (type, payload, options) {
        if (type === 'showEReader' && !internal && payload && payload.libraryItem && !payload.fileId) {
          readMode(payload.libraryItem).then((ok) => ok || bypass(() => orig(type, payload, options)))
          return
        }
        return orig(type, payload, options)
      }
    }
    async function readMode(item) {
      try {
        const full = item.media && item.media.ebookFile ? item : await absRequest('GET', `/api/items/${encodeURIComponent(item.id)}?expanded=1`)
        const ebook = full && full.media && full.media.ebookFile
        if (!ebook) return false
        const st = await request('GET', `${itemPath(full.id)}/status`).catch(() => null)
        const transcribed = !!(st && st.linesCount > 0)
        const fmt = String(ebook.ebookFormat || (ebook.metadata && ebook.metadata.ext) || '').replace('.', '').toLowerCase()
        const playingThis = player.libraryItem() && player.libraryItem().id === full.id
        await open({ item: full, reading: !playingThis })
        if (transcribed) for (let i = 0; i < 60 && !hasTranscript(); i++) await new Promise((r) => setTimeout(r, 100))
        if (fmt === 'epub') {
          S.viewMode = 'readalong'
          renderAll()
          showMode()
          RA2.setBook(true)
          return true
        }
        // MOBI / PDF: Audiobookshelf's reader with read along, straight into reading mode
        startReadAlong()
        setTimeout(() => {
          if (root && root.classList.contains('tx-ra')) root.classList.add('tx-ra-book')
          raBookUpdate()
        }, 600)
        return true
      } catch (e) {
        console.log('[ABS+] read mode', e && e.message)
        return false
      }
    }
    setInterval(ensure, 1000)
    return { bypass }
  })()

  /**
   * Read along keeps Audiobookshelf's own player bar in every book (EPUB in the panel too): the panel stops
   * just above it. Reading mode (audiobook put aside) hides it along with the rest of the audio controls.
   */
  /** ⋮ → Re-align read along: the panel's book (EPUB) or the book open in Audiobookshelf's reader */
  async function realignReadAlong() {
    try {
      if (await RA2.realign()) return toast('info', 'Lining up the book with the narration again…')
      const lines = (S.lines || []).slice().sort((a, b) => a.s - b.s)
      if (lines.length && document.querySelector('#reader')) {
        READALONG.start(S.key, lines, player.currentTime())
        return toast('info', 'Lining up the book with the narration again…')
      }
      toast('info', 'Open the book in Read along first, then re-align it.')
    } catch (e) {
      toast('error', e.message)
    }
  }

  function playerBarUpdate() {
    if (!root) return
    const book = (S.open && S.viewMode === 'readalong' && RA2.isEpub() && RA2.book) || root.classList.contains('tx-ra-book')
    document.body.classList.toggle('tx-book-on', !!book)
    const mp = document.querySelector('#mediaPlayerContainer')
    const mpH = mp && !book && getComputedStyle(mp).display !== 'none' ? Math.round(mp.getBoundingClientRect().height) : 0
    // Lyrics, Karaoke and Read along all sit above the player bar (not in reading mode, or reading a book that isn't playing)
    const loadedItem = player.libraryItem()
    const usePlayer = S.open && !S.reading && !S.txReading && !book && mpH > 40 && !!loadedItem && loadedItem.id === S.key
    root.classList.toggle('tx-ra2-player', usePlayer)
    if (usePlayer) document.body.style.setProperty('--tx-mp-h', `${mpH}px`)
  }
  setInterval(playerBarUpdate, 400)

  // Read-mode button in Lyrics and Karaoke too (Read along has its own), audio paused. A book with an EPUB
  // opens in Read along, in reading mode; a book without one (audiobook only) is read as its transcript, as it
  // is, without the player controls. Words are looked up in read mode only
  let anyBookBtn = null
  let listenBtn = null
  function setTxReading(on) {
    S.txReading = !!on
    if (root) root.classList.toggle('tx-txreading', S.txReading)
    if (!S.txReading) DICT.close()
    playerBarUpdate()
    anyBookUpdate()
  }
  function anyBookUpdate() {
    if (!root) return
    // playing again, or the panel closed: read mode ends
    if (S.txReading && (!S.open || player.isPlaying())) return setTxReading(false)
    const want = !!(S.open && S.viewMode !== 'readalong' && !S.txReading && !player.isPlaying() && S.status && S.status.status === 'done' && S.lines && S.lines.length)
    if (S.txReading && !listenBtn) {
      listenBtn = document.createElement('button')
      listenBtn.className = 'tra-bookbtn tx-any-bookbtn'
      listenBtn.title = 'Back to the audiobook'
      listenBtn.setAttribute('aria-label', 'Back to the audiobook')
      listenBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>'
      listenBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        setTxReading(false)
      })
      root.appendChild(listenBtn)
    }
    if (listenBtn) listenBtn.style.display = S.txReading && S.open ? '' : 'none'
    if (want && !anyBookBtn) {
      anyBookBtn = document.createElement('button')
      anyBookBtn.className = 'tra-bookbtn tx-any-bookbtn'
      anyBookBtn.title = 'Read the book without the audiobook'
      anyBookBtn.setAttribute('aria-label', 'Read the book without the audiobook')
      anyBookBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>'
      anyBookBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        // no EPUB to open: read the transcript itself
        if (!RA2.isEpub()) return setTxReading(true)
        S.viewMode = 'readalong'
        localStorage.setItem('absTxView', S.viewMode)
        S.showSize = false
        renderAll()
        showMode()
        RA2.setBook(true) // applied when the book has loaded
        anyBookUpdate()
      })
      root.appendChild(anyBookBtn)
    }
    if (anyBookBtn) anyBookBtn.style.display = want ? '' : 'none'
  }
  setInterval(anyBookUpdate, 400)

  function raHeader(on) {
    if (!root) return
    root.classList.toggle('tx-ra', !!on)
    root.classList.remove('tx-ra-faded')
    document.body.classList.toggle('tx-ra-on', !!on)
    if (!on) document.body.classList.remove('tx-ra-absplayer')
    if (on) renderTransport()
    // The book takes the whole screen above our dock; let the reader lay itself out again
    requestAnimationFrame(() => {
      const dock = root.querySelector('.tx-transport')
      if (on && dock && dock.offsetHeight) document.body.style.setProperty('--tx-dock-h', `${dock.offsetHeight}px`)
      window.dispatchEvent(new Event('resize'))
    })
    if (els.segRead) els.segRead.className = on ? 'tx-on' : ''
    if (on) {
      els.segLyrics.className = ''
      els.segKaraoke.className = ''
    }
  }
  /** Read along's header (title, Lyrics / Karaoke / Read along, search) stays visible */
  function raHeaderFade() {
    if (root) root.classList.remove('tx-ra-faded')
  }
  /** From the docked header back to the full panel (Lyrics, Karaoke or search): the book closes */
  function leaveReadAlong() {
    READALONG.stop()
    raHeader(false)
    try {
      window.$nuxt.$store.commit('setShowEReader', false)
    } catch (e) {}
    S.open = true
    root.classList.add('tx-open')
    document.documentElement.style.overflow = 'hidden'
  }

  function close() {
    if (root && root.classList.contains('tx-ra')) raHeader(false) // the chevron just tucks the docked header away
    S.open = false
    if (root) root.classList.remove('tx-open')
    document.documentElement.style.overflow = ''
  }

  async function start(restart) {
    S.starting = true
    renderAll()
    try {
      const st = await request('POST', `${itemPath(S.key)}/start`, { modelId: S.selectedModelId, restart: !!restart, startSec: player.currentTime() })
      if (restart) {
        S.lines = []
        S.rawCount = 0
        S.ebookCheck = null
        renderLines()
      }
      setStatus(st)
    } catch (e) {
      toast('error', e.message)
      if (e.status !== 409) S.status = { status: 'error', error: e.message }
    }
    S.starting = false
    renderAll()
  }

  async function updateSuggestions(ids, status) {
    if (!ids.length) return
    S.ebookBusy = true
    renderAll()
    try {
      await request('POST', `${itemPath(S.key)}/suggestions`, { ids, status })
      await loadEbookCheck()
      if (status === 'applied') {
        await fetchLines(true)
        toast('success', `Applied ${plural(ids.length, 'correction')}`)
      } else if (status === 'pending') toast('info', 'Ignored spellings are back for review')
      else toast('info', 'Suggestions dismissed')
      const st = await request('GET', `${itemPath(S.key)}/status`)
      S.lastRevision = st.revision
      setStatus(st)
    } catch (e) {
      toast('error', e.message)
    }
    S.ebookBusy = false
    renderAll()
    renderLines()
  }

  async function onClick(e) {
    const t = e.target.closest('[data-act], .tx-line, .tx-kpara')
    if (!t || !root.contains(t)) return
    if (t.classList.contains('tx-line')) return clickLine(t, e)
    if (t.classList.contains('tx-kpara')) return clickParagraph(t, e)
    const act = t.getAttribute('data-act')
    if (act === 'menu-close' && e.target.closest('[data-stop]')) return
    switch (act) {
      case 'close':
        return close()
      case 'menu':
        S.showMenu = !S.showMenu
        return renderAll()
      case 'menu-close':
        S.showMenu = false
        return renderAll()
      case 'display':
        S.showMenu = false
        S.showDisplay = true
        return renderAll()
      case 'display-close':
        S.showDisplay = false
        return renderAll()
      case 'clear':
        els.input.value = ''
        S.query = ''
        renderAll()
        renderLines()
        return requestAnimationFrame(() => scrollToLine(S.activeIndex, true))
      case 'follow':
        S.followPlayback = true
        renderAll()
        return scrollToActiveAny(true)
      case 'back':
        return player.jump(-1)
      case 'fwd':
        return player.jump(1)
      case 'playpause':
        // Read along on a book that isn't the one loaded in the player: start it where the reading is
        if (root.classList.contains('tx-ra') && !(player.libraryItem() && player.libraryItem().id === S.key)) {
          if (window.$nuxt && window.$nuxt.$eventBus) window.$nuxt.$eventBus.$emit('play-item', { libraryItemId: S.key, startTime: S.liveTime || 0 })
          return setTimeout(renderTransport, 800)
        }
        player.playPause()
        return setTimeout(renderTransport, 150)
      case 'model':
        if (e.target.closest('[data-act="delete-model"], [data-act="use-model"], [data-act="download-model"]')) return
        S.selectedModelId = t.getAttribute('data-id')
        return renderAll()
      case 'download-model': {
        const m = S.info.models.find((x) => x.id === t.getAttribute('data-id'))
        try {
          await request('POST', '/admin/models/download', { ids: [m.id] })
          toast('success', `Downloading ${m.name} in the background`)
          S.info = await request('GET', '/info')
        } catch (err) {
          toast('error', err.message)
        }
        renderAll()
        // Refresh until it's there
        clearInterval(S.dlTimer)
        S.dlTimer = setInterval(async () => {
          try {
            S.info = await request('GET', '/info')
            const now = S.info.models.find((x) => x.id === m.id)
            if (!now || now.installed || !now.downloading) clearInterval(S.dlTimer)
            renderAll()
          } catch (e) {
            clearInterval(S.dlTimer)
          }
        }, 5000)
        return
      }
      case 'use-model': {
        // Transcribe this book with that model now (a waiting or failed one switches over)
        S.selectedModelId = t.getAttribute('data-id')
        // Always replace: Use only shows before any text exists, and the status may not be loaded yet
        return start(true)
      }
      case 'delete-model': {
        const m = S.info.models.find((x) => x.id === t.getAttribute('data-id'))
        if (!m || !confirm(`Remove ${m.name} from the server? Existing transcriptions are kept.`)) return
        try {
          await request('DELETE', `/models/${encodeURIComponent(m.id)}`)
          S.info = await request('GET', '/info')
        } catch (err) {
          toast('error', err.message)
        }
        return renderAll()
      }
      case 'start':
        return start(false)
      case 'resume':
        S.starting = true
        renderAll()
        try {
          setStatus(await request('POST', `${itemPath(S.key)}/start`, { modelId: S.status.modelId }))
        } catch (err) {
          toast('error', err.message)
        }
        S.starting = false
        return renderAll()
      case 'pause':
        try {
          setStatus(await request('POST', `${itemPath(S.key)}/pause`))
        } catch (err) {
          toast('error', err.message)
        }
        return renderAll()
      case 'cancel':
        if (!confirm('Stop transcribing this book and delete the lines transcribed so far? (Use Pause instead to keep them and continue later.)')) return
        try {
          await request('POST', `${itemPath(S.key)}/cancel`)
          Object.assign(S, { lines: [], rawCount: 0, ebookCheck: null, status: { status: 'none' } })
          toast('info', 'Transcription cancelled')
        } catch (err) {
          toast('error', err.message)
        }
        renderAll()
        return renderLines()
      case 'analyze':
        // ebook read again and compared, book text and .lrc files rebuilt; read along lines up again when done
        S.showMenu = false
        try {
          S.analysisFrom = (S.status && S.status.analysisAt) || 0
          S.analysisPending = true
          setStatus(await request('POST', `${itemPath(S.key)}/analyze`))
          toast('info', 'Analysing the book…')
        } catch (err) {
          S.analysisPending = false
          toast('error', err.message)
        }
        return renderAll()
      case 'ebook-check':
        S.showMenu = false
        // spellings dismissed with Ignore: Check spelling brings them back for review
        if (S.status && S.status.ebookCheck === 'done') {
          if (!S.ebookCheck) await loadEbookCheck()
          if (ignored().length) {
            await updateSuggestions(ignored().map((x) => x.id), 'pending')
            S.showSheet = true
            return renderAll()
          }
        }
        try {
          setStatus(await request('POST', `${itemPath(S.key)}/ebook-check`))
        } catch (err) {
          toast('error', err.message)
        }
        return renderAll()
      case 'review':
        S.showMenu = false
        await loadEbookCheck()
        S.showSheet = true
        return renderAll()
      case 'apply-all': {
        S.showMenu = false
        renderAll()
        const list = pending()
        if (!list.length) return
        if (!confirm(`Replace ${plural(list.length, 'word')} in the transcript with the ebook's spelling?\n\n${DISCREPANCY}\n\nThe original transcript is kept on the server.`)) return
        return updateSuggestions(
          list.map((x) => x.id),
          'applied'
        )
      }
      case 'ignore-all': {
        S.showMenu = false
        renderAll()
        const list = pending()
        if (!list.length || !confirm(`Keep the transcript as it is and dismiss all ${plural(list.length, 'suggestion')} from the ebook?`)) return
        return updateSuggestions(
          list.map((x) => x.id),
          'ignored'
        )
      }
      case 'review-ignored': {
        // ignored suggestions back for review, then the review sheet
        S.showMenu = false
        const ids = ignored().map((x) => x.id)
        if (!ids.length) return renderAll()
        await updateSuggestions(ids, 'pending')
        S.showSheet = true
        return renderAll()
      }
      case 'realign':
        // match the book to the narration again from scratch (not the saved result)
        S.showMenu = false
        renderAll()
        return realignReadAlong()
      case 'retranscribe': {
        // starts again at once (same model, from where you're listening): the old transcript is replaced as it goes
        S.showMenu = false
        renderAll()
        if (S.status && S.status.modelId) S.selectedModelId = S.status.modelId
        const model = S.selectedModelId ? modelName(S.selectedModelId) : 'the automatic model'
        if (!confirm(`Transcribe this book again from the start with ${model}?

The current transcript is replaced as the new one comes in (spelling fixes from the ebook are redone too).`)) return
        await start(true)
        if (S.status && (S.status.status === 'queued' || S.status.status === 'running')) toast('info', 'Transcribing the book again…')
        return
      }
      case 'delete':
        S.showMenu = false
        renderAll()
        if (!confirm('Delete the transcription for this book? It is also removed from phones that synced it.')) return
        try {
          await request('DELETE', itemPath(S.key))
        } catch (err) {
          return toast('error', err.message)
        }
        Object.assign(S, { lines: [], rawCount: 0, ebookCheck: null, status: { status: 'none' } })
        renderAll()
        return renderLines()
      case 'play-from': {
        const at = S.liveTime
        const key = S.key
        close()
        if (window.$nuxt && window.$nuxt.$eventBus) window.$nuxt.$eventBus.$emit('play-item', { libraryItemId: key, startTime: at })
        return
      }
      case 'view':
        if (t.getAttribute('data-mode') === 'readalong' && RA2.isEpub()) {
          S.viewMode = 'readalong'
          localStorage.setItem('absTxView', S.viewMode)
          S.showSize = false
          renderAll()
          return showMode()
        }
        if (t.getAttribute('data-mode') === 'readalong') return root.classList.contains('tx-ra') ? null : startReadAlong()
        if (root.classList.contains('tx-ra')) leaveReadAlong()
        S.viewMode = t.getAttribute('data-mode')
        localStorage.setItem('absTxView', S.viewMode)
        S.showSize = false
        S.followPlayback = true
        if (S.viewMode === 'karaoke') {
          if (!S.karaoke) {
            buildKaraokeModel()
            renderKaraoke()
          }
          loadEbookText()
        }
        updateActive()
        if (S.karaoke) updateKaraokeActive()
        renderAll()
        showMode()
        return requestAnimationFrame(() => scrollToActiveAny(true))
      case 'textsize':
        S.showSize = !S.showSize
        return renderAll()
      case 'size-down':
      case 'size-up':
        S.karaokeSize = Math.max(14, Math.min(30, S.karaokeSize + (act === 'size-up' ? 1 : -1)))
        localStorage.setItem('absTxKaraokeSize', String(S.karaokeSize))
        renderAll()
        return renderLines()
      case 'bookmarks':
        S.showMenu = false
        S.showBookmarks = true
        renderAll()
        return loadBookmarks()
      case 'bm-close':
        S.showBookmarks = false
        S.editingBookmark = null
        return renderAll()
      case 'bm-note':
        S.editingBookmark = parseFloat(t.getAttribute('data-t'))
        return renderBookmarks()
      case 'bm-note-cancel':
        S.editingBookmark = null
        return renderBookmarks()
      case 'bm-note-save': {
        const time = parseFloat(t.getAttribute('data-t'))
        const bm = S.bookmarks.find((b) => b.time === time)
        const input = els.bmSheet.querySelector('[data-el-note]')
        if (!bm || !input) return
        try {
          await absRequest('PATCH', `/api/me/item/${encodeURIComponent(S.key)}/bookmark`, { ...bm, title: withNote(bm, input.value) })
          S.editingBookmark = null
          await loadBookmarks()
        } catch (err) {
          toast('error', `Couldn't save the note: ${err.message}`)
        }
        return
      }
      case 'bm-seek': {
        if (e.target.closest('[data-act="bm-delete"], [data-act="bm-note"]')) return
        const time = parseFloat(t.getAttribute('data-t'))
        S.showBookmarks = false
        S.liveTime = time
        S.followPlayback = true
        player.seek(time)
        renderAll()
        updateActive()
        return requestAnimationFrame(() => scrollToLine(S.activeIndex, true))
      }
      case 'bm-delete': {
        const time = t.getAttribute('data-t')
        if (!confirm('Remove this bookmark?')) return
        try {
          await absRequest('DELETE', `/api/me/item/${encodeURIComponent(S.key)}/bookmark/${time}`)
        } catch (err) {
          toast('error', err.message)
        }
        return loadBookmarks()
      }
      case 'sheet-close':
        S.showSheet = false
        return renderAll()
      case 'sheet-chapters':
        S.showChapters = !S.showChapters
        return renderAll()
      case 'sheet-seek': {
        const time = parseFloat(t.getAttribute('data-t'))
        // the review stays open: the line shows in Lyrics / Karaoke beside it
        S.liveTime = time
        S.followPlayback = true
        player.seek(time)
        renderAll()
        updateActive()
        return requestAnimationFrame(() => scrollToLine(S.activeIndex, true))
      }
      case 'sheet-apply':
      case 'sheet-ignore': {
        const g = t.getAttribute('data-g')
        const groups = g === 'all' ? S.sheetGroups : [S.sheetGroups[parseInt(g, 10)]]
        const ids = groups.flatMap((x) => x.items.map((s) => s.id))
        return updateSuggestions(ids, act === 'sheet-apply' ? 'applied' : 'ignored')
      }
    }
  }

  function clickLine(el, e) {
    const sugg = e.target.closest('.tx-sugg')
    if (sugg) return toast('warning', `${sugg.getAttribute('data-msg')} ${DISCREPANCY}`)
    const i = parseInt(el.getAttribute('data-i'), 10)
    const line = S.lines[i]
    if (!line) return
    if (S.reading) return readSection(line.s)
    // read mode (audio paused, the book button): reading doesn't move the audio; Play carries on where it paused
    if (S.txReading) return
    S.liveTime = line.s
    S.followPlayback = true
    player.seek(line.s)
    if (S.query) {
      els.input.value = ''
      S.query = ''
      renderAll()
      renderLines()
      requestAnimationFrame(() => scrollToLine(i, true))
    } else {
      updateActive()
      renderAll()
    }
  }

  let searchTimer = null
  function onSearchInput() {
    clearTimeout(searchTimer)
    els.clear.style.display = els.input.value ? '' : 'none'
    searchTimer = setTimeout(() => {
      S.query = els.input.value.trim()
      renderAll()
      renderLines()
      if (!S.query) requestAnimationFrame(() => scrollToLine(S.activeIndex, true))
      else els.scroller.scrollTop = 0
    }, 200)
  }

  // ------------------------------------------------------------------ player button + clocks

  let openBtn = null
  let btnStatus = null
  let btnStatusAt = 0

  async function refreshButtonStatus(key) {
    btnStatusAt = Date.now()
    try {
      btnStatus = { key, ...(await request('GET', `${itemPath(key)}/status`)) }
    } catch (e) {
      btnStatus = { key, status: 'none' }
    }
  }

  function ensureButton() {
    const vm = player.find()
    const item = player.libraryItem()
    const container = vm && vm.$el && vm.$el.nodeType === 1 ? vm.$el : null
    const ok = container && item && item.mediaType !== 'podcast' && !player.episodeId()
    if (!ok) {
      if (openBtn) openBtn.style.display = 'none'
      if (S.open && !item && !S.reading) close()
      return
    }
    if (!openBtn) {
      openBtn = document.createElement('button')
      openBtn.className = 'tx-open-btn'
      openBtn.type = 'button'
      openBtn.title = 'Transcription'
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        open()
      })
    }
    // Fixed to the page just above the player bar (the bar itself may clip overflowing children)
    if (openBtn.parentElement !== document.body) document.body.appendChild(openBtn)
    const rect = container.getBoundingClientRect()
    if (!rect.height) {
      openBtn.style.display = 'none'
      return
    }
    openBtn.style.bottom = `${Math.max(8, window.innerHeight - rect.top + 8)}px`
    openBtn.style.display = ''
    if (!btnStatus || btnStatus.key !== item.id || Date.now() - btnStatusAt > 30000) refreshButtonStatus(item.id)
    const st = btnStatus && btnStatus.key === item.id ? btnStatus : null
    let badge = ''
    if (st && (st.status === 'running' || st.status === 'queued')) badge = `${Math.round((st.progress || 0) * 100)}%`
    else if (st && st.status === 'paused') badge = 'paused'
    const html = `${icon('subtitles')}Transcription${badge ? `<span class="tx-badge">${badge}</span>` : ''}`
    if (openBtn.__html !== html) {
      openBtn.innerHTML = html
      openBtn.__html = html
    }
  }


  // ------------------------------------------------------------------ Settings → Transcription (admins)
  //
  // Adds "Transcription" to Audiobookshelf's settings sidebar. The page lists every book with its
  // transcription state; admins can turn automatic transcription of new books on or off, transcribe
  // everything or chosen books, and cancel waiting or running transcriptions (one or all).
  const ADMIN = (() => {
    const A = { open: false, data: null, query: '', filter: 'all', limit: 60, busy: false, timer: null, el: null, link: null }
    const LABELS = { none: 'Not transcribed', queued: 'Waiting', running: 'Transcribing', paused: 'Paused', error: 'Problem', done: 'Transcribed' }
    const nuxt = () => window.$nuxt
    const isAdmin = () => {
      const s = nuxt() && nuxt().$store
      try {
        return !!(s && (s.getters['user/getIsAdminOrUp'] || (s.state.user && s.state.user.user && ['admin', 'root'].includes(s.state.user.user.type))))
      } catch (e) {
        return false
      }
    }
    const route = () => (nuxt() && nuxt().$route ? nuxt().$route.path : location.pathname)
    const onConfig = () => /\/config(\/|$)/.test(route())

    function sidebar() {
      // The settings sidebar: the container with the most settings links (the header also links to stats)
      let best = null
      let most = 0
      document.querySelectorAll('a[href*="/config/stats"]').forEach((a) => {
        const n = a.parentElement.querySelectorAll(':scope > a[href*="/config/"]').length
        if (n > most) {
          most = n
          best = a.parentElement
        }
      })
      return most >= 5 ? best : null
    }

    // ABS+ pages in the settings sidebar
    const PAGES = [
      { id: 'transcription', label: 'Transcription' },
      { id: 'parental', label: 'Parental controls' },
      { id: 'metadata', label: 'Metadata sources' },
      { id: 'catalog', label: 'Library catalogue' },
      { id: 'authors', label: 'Author photos & bios' },
      { id: 'updates', label: 'Server updates' },
      { id: 'dictionaries', label: 'Dictionaries' },
      { id: 'ocr', label: 'PDF text (OCR)' }
    ]
    A.links = {}
    A.page = null

    /** Called every second: keeps the sidebar entries in place and closes the page when leaving settings */
    function ensure() {
      if (!onConfig() || !isAdmin()) {
        if (A.open) close()
        return
      }
      const nav = sidebar()
      if (!nav) return
      for (const p of PAGES) {
        if (A.links[p.id] && nav.contains(A.links[p.id])) continue
        const tpl = nav.querySelector('a:not([data-abs-tx-admin])')
        const a = document.createElement('a')
        a.href = `#${p.id}`
        a.className = (tpl && tpl.className) || ''
        a.setAttribute('data-abs-tx-admin', p.id)
        a.innerHTML = `<p class="leading-4">${p.label}</p><div class="h-full w-0.5 bg-yellow-400 absolute top-0 left-0" style="display:none"></div>`
        a.addEventListener('click', (e) => {
          e.preventDefault()
          openPage(p.id)
        })
        nav.appendChild(a)
        A.links[p.id] = a
        if (!nav.__absTxWatch) {
          nav.__absTxWatch = true
          // Any other settings link closes the ABS+ page
          nav.addEventListener('click', (e) => {
            const other = e.target.closest('a')
            if (other && !other.hasAttribute('data-abs-tx-admin') && A.open) close()
          })
        }
      }
      PAGES.forEach((p) => (A.links[p.id].querySelector('div').style.display = A.open && A.page === p.id ? '' : 'none'))
      if (A.open && (!A.el || !document.body.contains(A.el))) mount()
      const h = location.hash.slice(1)
      if (!A.open && PAGES.some((p) => p.id === h)) openPage(h)
    }

    function mount() {
      const content = document.querySelector('.configContent')
      const page = content ? content.parentElement : null
      if (!page) return
      if (!A.el) {
        A.el = document.createElement('div')
        A.el.className = 'txa-page'
        A.el.addEventListener('click', onClick)
        A.el.addEventListener('input', (e) => {
          if (e.target.matches('[data-txa="search"]')) {
            A.query = e.target.value
            A.limit = 60
            renderList()
          }
          if (e.target.matches('[data-txp="search"]')) PARENTAL.search(e.target.value)
          if (A.page === 'catalog') CATALOG.onInput(e)
          if (A.page === 'authors') AUTHORS.onInput(e)
          if (A.page === 'dictionaries') DICTS.onInput(e)
        })
        A.el.addEventListener('change', (e) => {
          if (A.page === 'parental') PARENTAL.onChange(e)
          if (A.page === 'metadata') METADATA.onChange(e)
          if (A.page === 'updates') UPDATES.onChange(e)
        })
        A.el.addEventListener('submit', (e) => {
          e.preventDefault()
          if (A.page === 'metadata') METADATA.onSubmit(e)
        })
      }
      // Same place and margins as the settings content (beside the sidebar), which is hidden meanwhile
      A.el.className = 'txa-page ' + content.className.replace(/\bpage-\S+/g, '').replace(/\btxa-hidden\b/g, '')
      content.classList.add('txa-hidden')
      document.documentElement.classList.remove('absplus-want-txa') // the ABS+ page is up: nothing to hold back
      if (A.el.previousElementSibling !== content) content.after(A.el)
    }

    function openPage(id) {
      A.open = true
      A.page = id || 'transcription'
      clearTimeout(A.timer)
      if (location.hash !== `#${A.page}`) history.replaceState(history.state, '', `${location.pathname}${location.search}#${A.page}`)
      PAGES.forEach((p) => A.links[p.id] && (A.links[p.id].querySelector('div').style.display = p.id === A.page ? '' : 'none'))
      mount()
      render()
      load()
    }

    function close() {
      A.open = false
      clearTimeout(A.timer)
      if (A.el) A.el.remove()
      document.querySelectorAll('.configContent.txa-hidden').forEach((c) => c.classList.remove('txa-hidden'))
      if (PAGES.some((p) => `#${p.id}` === location.hash)) history.replaceState(history.state, '', `${location.pathname}${location.search}`)
      PAGES.forEach((p) => A.links[p.id] && (A.links[p.id].querySelector('div').style.display = 'none'))
    }

    async function load() {
      if (A.page === 'parental') return PARENTAL.load()
      if (A.page === 'metadata') return METADATA.load()
      if (A.page === 'catalog') return CATALOG.load()
      if (A.page === 'authors') return AUTHORS.load()
      if (A.page === 'updates') return UPDATES.load()
      if (A.page === 'dictionaries') return DICTS.load()
      if (A.page === 'ocr') return OCRP.load()
      if (Date.now() - (A.modelsAt || 0) > 25000) {
        A.modelsAt = Date.now()
        MODELS.load()
      }
      try {
        A.data = await request('GET', '/admin/library')
        A.error = null
      } catch (e) {
        A.error = e.status === 404 ? 'This server’s transcription add-on is too old for library transcription. Update the container.' : e.message
      }
      render()
      clearTimeout(A.timer)
      if (!A.open) return
      const busy = A.data && (A.data.bulk || A.data.counts.running || A.data.counts.queued)
      A.timer = setTimeout(() => !document.hidden && A.open && load(), busy ? 4000 : 20000)
    }

    const books = () => (A.data && A.data.books) || []
    const active = (b) => (b.status === 'queued' || b.status === 'running') && b.origin !== 'device'
    const activeCount = () => books().filter(active).length

    function matching() {
      const q = A.query.trim().toLowerCase()
      const f = A.filter
      return books().filter((b) => {
        if (f === 'todo' && b.status !== 'none') return false
        if (f === 'active' && !['queued', 'running', 'paused'].includes(b.status)) return false
        if (f === 'done' && b.status !== 'done') return false
        if (f === 'error' && b.status !== 'error') return false
        return !q || `${b.title} ${b.author}`.toLowerCase().includes(q)
      })
    }

    function statusText(b) {
      let t = LABELS[b.status] || b.status
      if (b.status === 'running') t += ` ${Math.round((b.progress || 0) * 100)}%`
      if (b.origin === 'device' && b.status === 'running') t += ' on a phone'
      if (b.status === 'queued' && b.background) t += ' (background)'
      if (b.status === 'error' && b.error) t += `: ${b.error}`
      return t
    }

    function render() {
      if (!A.el || !A.open) return
      if (A.page === 'parental') return PARENTAL.render()
      if (A.page === 'metadata') return METADATA.render()
      if (A.page === 'catalog') return CATALOG.render()
      if (A.page === 'authors') return AUTHORS.render()
      if (A.page === 'updates') return UPDATES.render()
      if (A.page === 'dictionaries') return DICTS.render()
      if (A.page === 'ocr') return OCRP.render()
      const d = A.data
      const c = (d && d.counts) || {}
      const counts = d ? [`${c.total || 0} books`, `${c.done || 0} transcribed`, c.running ? `${c.running} transcribing now` : '', c.queued ? `${c.queued} waiting` : '', c.error ? `${c.error} with a problem` : ''].filter(Boolean).join(' · ') : 'Loading…'
      const filters = [
        ['all', 'All', books().length],
        ['todo', 'Not transcribed', books().filter((b) => b.status === 'none').length],
        ['active', 'In progress', books().filter((b) => ['queued', 'running', 'paused'].includes(b.status)).length],
        ['done', 'Done', books().filter((b) => b.status === 'done').length],
        ['error', 'Problems', books().filter((b) => b.status === 'error').length]
      ]
      A.el.innerHTML = `
        <h1 class="txa-h1">Transcription</h1>
        <p class="txa-muted">The server transcribes books one at a time in the background. Books someone is listening to go first. Finished transcripts appear in the player's Transcription view and in the ABS+ app.</p>
        ${A.error ? `<div class="txa-error">${esc(A.error)}</div>` : ''}
        ${d && !d.ready ? `<div class="txa-warn">Server transcription sets itself up the first time an admin opens a book's Transcription view.</div>` : ''}
        <label class="txa-toggle"><input type="checkbox" data-txa="auto" ${d && d.autoTranscribeNew ? 'checked' : ''} ${d ? '' : 'disabled'}><span><b>Transcribe new books automatically</b><small>New books are found every 10 minutes and transcribed in the background.</small></span></label>
        <p class="txa-counts">${esc(counts)}</p>
        ${d && d.bulk ? (d.bulk.waiting ? `<p class="txa-muted">Working through the library ${d.bulk.batch || 3} books at a time: ${d.bulk.waiting} still waiting. Books that stop because the GPU ran out of memory (or similar) are picked up again by themselves.</p>` : `<p class="txa-muted">Queueing books… ${d.bulk.done} of ${d.bulk.total || '…'}</p>`) : ''}
        <div class="txa-actions">
          <button class="txa-btn txa-primary" data-txa="missing" ${A.busy || !d || !d.ready ? 'disabled' : ''} title="Only books that don't have a transcript yet">Transcribe missing</button>
          <button class="txa-btn" data-txa="all" ${A.busy || !d || !d.ready ? 'disabled' : ''} title="Every book again from the start, finished ones too">Transcribe everything</button>
          ${activeCount() ? `<button class="txa-btn txa-danger" data-txa="cancel-all" ${A.busy ? 'disabled' : ''}>Cancel all (${activeCount()})</button>` : ''}
          <button class="txa-btn" data-txa="refresh">Refresh</button>
        </div>
        <div data-txm="box"></div>
        <h2 class="txa-h2">Books</h2>
        <input class="txa-search" type="search" data-txa="search" placeholder="Search title or author" value="${esc(A.query)}">
        <div class="txa-filters">${filters.map(([id, label, n]) => `<button class="txa-chip${A.filter === id ? ' txa-on' : ''}" data-txa="filter" data-id="${id}">${label} (${n})</button>`).join('')}</div>
        <div data-txa="list"></div>`
      renderList()
      MODELS.render()
    }

    function renderList() {
      const box = A.el && A.el.querySelector('[data-txa="list"]')
      if (!box) return
      const rank = { running: 0, queued: 1, paused: 2, error: 3, none: 4, done: 5 }
      const all = matching().sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
      const shown = all.slice(0, A.limit)
      box.innerHTML =
        shown
          .map((b) => {
            let action = ''
            if (b.status === 'none' || b.status === 'error' || (b.status === 'paused' && b.origin !== 'device')) action = `<button class="txa-btn txa-small" data-txa="one" data-id="${esc(b.id)}" ${A.busy ? 'disabled' : ''}>${b.status === 'none' ? 'Transcribe' : 'Try again'}</button>`
            else if (active(b)) action = `<button class="txa-btn txa-small txa-danger" data-txa="cancel" data-id="${esc(b.id)}" ${A.busy ? 'disabled' : ''}>Cancel</button>`
            else if (b.status === 'done') action = `<span class="txa-done">✓ Done</span><button class="txa-btn txa-small" data-txa="spell" data-id="${esc(b.id)}" ${A.busy ? 'disabled' : ''} style="margin-left:8px" title="Compare the transcript with the ebook for spelling">Check spelling</button><button class="txa-btn txa-small" data-txa="analyze" data-id="${esc(b.id)}" ${A.busy ? 'disabled' : ''} style="margin-left:8px" title="Sync the book with the audio and check it again, without re-transcribing">Book analysis</button><button class="txa-btn txa-small" data-txa="redo" data-id="${esc(b.id)}" ${A.busy ? 'disabled' : ''} style="margin-left:8px">Re-transcribe</button>`
            // edit the book's details (Audiobookshelf's own editor)
            action += `<button class="txa-btn txa-small" data-txa="edit" data-id="${esc(b.id)}" style="margin-left:8px" title="Edit this book's details">Edit</button>`
            const bar = b.status === 'running' ? `<div class="txa-bar"><div style="width:${Math.round((b.progress || 0) * 100)}%"></div></div>` : ''
            return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(b.title)}</p><p class="txa-sub">${b.author ? esc(b.author) + ' · ' : ''}<span class="txa-st-${b.status}">${esc(statusText(b))}</span></p>${bar}</div>${action}</div>`
          })
          .join('') +
        (shown.length ? '' : `<p class="txa-muted" style="text-align:center;padding:24px 0">${A.data ? 'No books here' : 'Loading…'}</p>`) +
        (all.length > A.limit ? `<button class="txa-btn txa-more" data-txa="more">Show more (${all.length - A.limit})</button>` : '')
    }

    async function act(fn, done) {
      A.busy = true
      render()
      try {
        const r = await fn()
        if (done) toast('success', done(r))
      } catch (e) {
        toast('error', e.message || 'The server said no')
      }
      A.busy = false
      load()
    }

    /** Edit: Audiobookshelf's own book editor (details, cover, chapters, files), over this page */
    async function editBook(id) {
      const nuxt = window.$nuxt
      if (!nuxt || !nuxt.$store || !nuxt.$axios) return toast('error', "Couldn't open the book editor")
      try {
        const item = (await nuxt.$axios.get(`/api/items/${encodeURIComponent(id)}?expanded=1`)).data
        nuxt.$store.commit('showEditModal', item)
      } catch (e) {
        toast('error', e.message || "Couldn't open the book editor")
      }
    }

    function onClick(e) {
      if (A.page === 'parental') return PARENTAL.onClick(e)
      if (A.page === 'metadata') return METADATA.onClick(e)
      if (A.page === 'catalog') return CATALOG.onClick(e)
      if (A.page === 'authors') return AUTHORS.onClick(e)
      if (A.page === 'updates') return UPDATES.onClick(e)
      if (A.page === 'dictionaries') return DICTS.onClick(e)
      if (A.page === 'ocr') return OCRP.onClick(e)
      if (MODELS.onClick(e)) return
      const t = e.target.closest('[data-txa]')
      if (!t) return
      const what = t.getAttribute('data-txa')
      const id = t.getAttribute('data-id')
      const book = id && books().find((b) => b.id === id)
      switch (what) {
        case 'auto':
          return act(() => request('PUT', '/admin/settings', { autoTranscribeNew: t.checked }), (r) => (r.autoTranscribeNew ? 'New books will be transcribed automatically' : 'New books won’t be transcribed automatically'))
        case 'missing': {
          const n = books().filter((b) => b.status === 'none' || b.status === 'error' || b.status === 'paused').length
          if (!n) return toast('success', 'Every book has a transcript already')
          if (!confirm(`Transcribe the ${n} book${n === 1 ? '' : 's'} that ${n === 1 ? "doesn't" : "don't"} have a transcript yet?\n\nBooks that are already transcribed are left as they are. The server works through them a few at a time in the background; books someone is listening to still go first. You can cancel any time.`)) return
          return act(() => request('POST', '/admin/transcribe', { all: true }), () => 'Queueing the missing books in the background')
        }
        case 'all': {
          const n = books().length
          const done = books().filter((b) => b.status === 'done').length
          if (!confirm(`Transcribe ALL ${n} books again from the start?\n\nThis redoes every book, including the ${done} that are already transcribed: their transcripts are replaced, and each one isn't available until its new transcript is ready. Spelling fixes applied from the ebook are redone too. It takes a long time and keeps the GPU busy.\n\nTo transcribe only the books that don't have a transcript, use "Transcribe missing" instead.`)) return
          return act(() => request('POST', '/admin/transcribe', { all: true, redo: true }), () => 'Transcribing every book again, in the background')
        }
        case 'cancel-all':
          if (!confirm(`Stop ${activeCount()} waiting or running transcription${activeCount() === 1 ? '' : 's'}?\n\nPartly done transcripts are deleted; finished ones are kept.`)) return
          return act(() => request('POST', '/admin/cancel', { all: true }), (r) => `Cancelled ${r.cancelled}`)
        case 'one':
          return act(() => request('POST', '/admin/transcribe', { itemIds: [id] }), (r) => (r.queued ? `Queued “${book ? book.title : id}”` : 'Already queued'))
        case 'redo':
          if (!confirm(`Transcribe “${book ? book.title : id}” again from the start?

It uses the model chosen under Speech models${A.data && A.data.modelId && A.data.modelId !== 'auto' ? ` (${A.data.modelId})` : ' (Automatic)'}. The current transcript is replaced and isn't available until the new one is ready.`)) return
          return act(() => request('POST', '/admin/transcribe', { itemIds: [id], redo: true }), (r) => (r.queued ? `Re-transcribing “${book ? book.title : id}”` : 'Already queued'))
        case 'analyze':
          // the after-transcription checks again (ebook compare, book text, .lrc files), no new transcription
          return act(() => request('POST', `${itemPath(id)}/analyze`), () => `Analysing “${book ? book.title : id}” in the background`)
        case 'spell':
          return act(() => request('POST', `${itemPath(id)}/ebook-check`), () => `Checking “${book ? book.title : id}” against its ebook in the background`)
        case 'edit':
          return editBook(id)
        case 'cancel':
          return act(() => request('POST', '/admin/cancel', { itemIds: [id] }), () => `Cancelled “${book ? book.title : id}”`)
        case 'filter':
          A.filter = id
          A.limit = 60
          return render()
        case 'more':
          A.limit += 60
          return renderList()
        case 'refresh':
          return load()
      }
    }

    function toast(kind, msg) {
      const t = nuxt() && nuxt().$toast
      if (t && t[kind]) t[kind](msg)
    }


    // ---------------------------------------------------------------- Parental controls page
    const PARENTAL = (() => {
      const P = { data: null, error: null, query: '', filter: 'all', limit: 60, blocksFor: '', busy: false }
      const AGE_OPTIONS = [
        ['none', 'No limit'],
        ['16', 'Up to 16+'],
        ['13', 'Up to 13+'],
        ['7', 'Up to 7+'],
        ['all', 'All ages only']
      ]
      const label = (id) => {
        const r = P.data && P.data.ratings.find((x) => x.id === id)
        return r ? r.label : 'Unrated'
      }
      const books = () => (P.data && P.data.books) || []

      async function load() {
        try {
          P.data = await request('GET', '/admin/parental')
          P.error = null
        } catch (e) {
          P.error = e.status === 404 ? 'Update the ABS+ container to use parental controls.' : e.message
        }
        render()
      }

      async function run(fn, done) {
        P.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        P.busy = false
        load()
      }

      function render() {
        if (!A.el) return
        const d = P.data
        const users = (d && d.users) || []
        const count = (id) => books().filter((b) => (id === 'unrated' ? !b.rating || b.rating === 'unrated' : b.rating === id)).length
        const unratedWithSuggestion = books().filter((b) => (!b.rating || b.rating === 'unrated') && b.suggested).length
        const userRows = users
          .map((u) => {
            const val = u.maxAge === null || u.maxAge === undefined ? 'none' : String(u.maxAge)
            const blocked = books().filter((b) => b.blockedFor.includes(u.id)).length
            return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(u.username)}</p><p class="txa-sub">${esc(u.type)}${blocked ? ` · ${blocked} book${blocked === 1 ? '' : 's'} blocked` : ''}${u.ownTagRules ? ' · <span class="txa-st-error">has its own tag rules in Users; setting a limit replaces them</span>' : ''}</p></div>
              <select class="txa-select" data-txp="age" data-user="${esc(u.id)}" ${P.busy ? 'disabled' : ''}>${AGE_OPTIONS.map(([v, t]) => `<option value="${v}"${val === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
              <label class="txa-check"><input type="checkbox" data-txp="unrated" data-user="${esc(u.id)}" ${u.hideUnrated ? 'checked' : ''} ${P.busy ? 'disabled' : ''}>Hide unrated</label></div>`
          })
          .join('')
        const filters = [['all', 'All', books().length], ['unrated', 'Unrated', count('unrated')], ...['all', '7', '13', '16', '18'].map((id) => [id === 'all' ? 'all-ages' : id, label(id), count(id)]), ['blocked', 'Blocked for someone', books().filter((b) => b.blockedFor.length).length]]
        A.el.innerHTML = `
          <h1 class="txa-h1">Parental controls</h1>
          <p class="txa-muted">Give each person an age limit, and block single books for single people. Audiobookshelf enforces it everywhere: web player, phone apps, search, series, collections and downloads. Books carry an age tag (Age: All ages, 7+, 13+, 16+, 18+ or Unrated); blocks use a private tag only that person is denied. The main admin account is never limited.</p>
          ${P.error ? `<div class="txa-error">${esc(P.error)}</div>` : ''}
          <h2 class="txa-h2">People</h2>
          ${users.length ? userRows : `<p class="txa-muted">${d ? 'No other accounts yet. Add people under Settings → Users, then set their limits here.' : 'Loading…'}</p>`}
          <p class="txa-muted">“Hide unrated” is safest for children: books nobody has rated yet stay hidden until you rate them.</p>
          <h2 class="txa-h2">Book ratings</h2>
          <p class="txa-counts">${['all', '7', '13', '16', '18'].map((id) => `${label(id)}: ${count(id)}`).join(' · ')} · Unrated: ${count('unrated')}</p>
          <div class="txa-actions">
            <button class="txa-btn txa-primary" data-txp="auto" ${P.busy || !d ? 'disabled' : ''}>Rate unrated books from their genres${unratedWithSuggestion ? ` (${unratedWithSuggestion} suggestions)` : ''}</button>
          </div>
          <p class="txa-muted">Suggestions come from genres and tags in many languages (children's, young adult, horror, erotica…) and the explicit flag. Anything unclear stays Unrated for you to decide. New books are rated the same way when they're added.</p>
          <div class="txa-toolbar">
            <input class="txa-search" type="search" data-txp="search" placeholder="Search title or author" value="${esc(P.query)}">
            <label class="txa-check">Blocks for <select class="txa-select" data-txp="blocksfor"><option value="">(choose a person)</option>${users.map((u) => `<option value="${esc(u.id)}"${P.blocksFor === u.id ? ' selected' : ''}>${esc(u.username)}</option>`).join('')}</select></label>
          </div>
          <div class="txa-filters">${filters.map(([id, t, n]) => `<button class="txa-chip${P.filter === id ? ' txa-on' : ''}" data-txp="filter" data-id="${id}">${esc(t)} (${n})</button>`).join('')}</div>
          <div data-txp="list"></div>`
        renderList()
      }

      function renderList() {
        const box = A.el && A.el.querySelector('[data-txp="list"]')
        if (!box) return
        const list = books().filter((b) => {
          const f = P.filter
          if (f === 'unrated') return !b.rating || b.rating === 'unrated'
          if (f === 'blocked') return b.blockedFor.length
          if (f === 'all-ages') return b.rating === 'all'
          if (f !== 'all') return b.rating === f
          return true
        }).filter((b) => !P.query.trim() || `${b.title} ${b.author}`.toLowerCase().includes(P.query.trim().toLowerCase()))
        const users = (P.data && P.data.users) || []
        const who = users.find((u) => u.id === P.blocksFor)
        box.innerHTML =
          list
            .slice(0, P.limit)
            .map((b) => {
              const cur = b.rating || 'unrated'
              const opts = [...((P.data && P.data.ratings) || [])].map((r) => `<option value="${r.id}"${cur === r.id ? ' selected' : ''}>${esc(r.label)}</option>`).join('')
              const sugg = (!b.rating || b.rating === 'unrated') && b.suggested ? ` · suggested ${esc(label(b.suggested))} (${esc(b.suggestedWhy)})` : ''
              const blockedNames = b.blockedFor.map((id) => (users.find((u) => u.id === id) || {}).username).filter(Boolean)
              const blockBtn = who ? `<button class="txa-btn txa-small${b.blockedFor.includes(who.id) ? ' txa-danger' : ''}" data-txp="block" data-id="${esc(b.id)}" data-on="${b.blockedFor.includes(who.id) ? '0' : '1'}" ${P.busy ? 'disabled' : ''}>${b.blockedFor.includes(who.id) ? `Unblock for ${esc(who.username)}` : `Block for ${esc(who.username)}`}</button>` : ''
              return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(b.title)}</p><p class="txa-sub">${esc(b.author)}${b.explicit ? ' · explicit' : ''}${sugg}${blockedNames.length ? ` · <span class="txa-st-error">blocked for ${esc(blockedNames.join(', '))}</span>` : ''}</p></div>
                <select class="txa-select" data-txp="rate" data-id="${esc(b.id)}" ${P.busy ? 'disabled' : ''}>${opts}</select>${blockBtn}</div>`
            })
            .join('') +
          (list.length ? '' : `<p class="txa-muted" style="text-align:center;padding:24px 0">${P.data ? 'No books here' : 'Loading…'}</p>`) +
          (list.length > P.limit ? `<button class="txa-btn txa-more" data-txp="more">Show more (${list.length - P.limit})</button>` : '')
      }

      function onChange(e) {
        const t = e.target
        const what = t.getAttribute('data-txp')
        const userId = t.getAttribute('data-user')
        const user = P.data && P.data.users.find((u) => u.id === userId)
        if (what === 'age') return run(() => request('PUT', `/admin/parental/users/${encodeURIComponent(userId)}`, { maxAge: t.value }), () => `${user ? user.username : 'Limit'}: ${t.options[t.selectedIndex].text}`)
        if (what === 'unrated') return run(() => request('PUT', `/admin/parental/users/${encodeURIComponent(userId)}`, { hideUnrated: t.checked }), () => (t.checked ? 'Unrated books are hidden for ' : 'Unrated books are shown for ') + (user ? user.username : 'them'))
        if (what === 'rate') {
          const id = t.getAttribute('data-id')
          return run(() => request('POST', '/admin/parental/rate', { itemIds: [id], rating: t.value }), () => `Rated ${t.options[t.selectedIndex].text}`)
        }
        if (what === 'blocksfor') {
          P.blocksFor = t.value
          return render()
        }
      }

      function onClick(e) {
        const t = e.target.closest('[data-txp]')
        if (!t || t.tagName === 'SELECT' || t.tagName === 'INPUT') return
        const what = t.getAttribute('data-txp')
        if (what === 'auto') {
          if (!confirm('Give every unrated book an age tag from its genres? Books with no clear signal are tagged Unrated so “Hide unrated” can hide them. You can change any rating afterwards.')) return
          return run(() => request('POST', '/admin/parental/rate', { unrated: true }), (r) => `Rated ${r.rated} book${r.rated === 1 ? '' : 's'}`)
        }
        if (what === 'block') {
          const id = t.getAttribute('data-id')
          const on = t.getAttribute('data-on') === '1'
          return run(() => request('POST', '/admin/parental/block', { userId: P.blocksFor, itemId: id, blocked: on }), () => (on ? 'Blocked' : 'Unblocked'))
        }
        if (what === 'filter') {
          P.filter = t.getAttribute('data-id')
          P.limit = 60
          return render()
        }
        if (what === 'more') {
          P.limit += 60
          return renderList()
        }
      }

      function search(v) {
        P.query = v
        P.limit = 60
        renderList()
      }

      return { load, render, onChange, onClick, search }
    })()

    // ---------------------------------------------------------------- Metadata sources page
    const METADATA = (() => {
      const M = { data: null, libraries: [], error: null, busy: false, test: null, testing: false, reachable: null }
      async function load() {
        try {
          const [d, l] = await Promise.all([request('GET', '/admin/metadata'), request('GET', '/admin/libraries')])
          M.data = d
          M.libraries = l.libraries || []
          M.error = null
        } catch (e) {
          M.error = e.status === 404 ? 'Update the ABS+ container to use the metadata sources.' : e.message
        }
        render()
      }
      async function run(fn, done) {
        M.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        M.busy = false
        load()
      }
      const allSources = () => (M.data && M.data.registered || []).find((p) => /\/abs-plus\/metadata$/.test(p.url))

      function render() {
        if (!A.el) return
        const d = M.data
        const reg = (d && d.registered) || []
        const main = allSources()
        const langs = (d && d.available) || []
        const picked = new Set((d && d.languages) || [])
        const errs = d && d.sourceErrors ? Object.entries(d.sourceErrors).filter(([, v]) => Date.now() - v.at < 3600 * 1000) : []
        A.el.innerHTML = `
          <h1 class="txa-h1">Metadata sources</h1>
          <p class="txa-muted">“ABS+” providers search many places at once and merge what they find about the same book: Audible (11 stores), Apple Books (audiobooks and ebooks, covers up to 3000 px), Storytel (Nordic and European audiobooks), Open Library and Google Books. The biggest cover wins and gaps (narrator, series, description, ISBN) are filled from the other sources.</p>
          ${M.error ? `<div class="txa-error">${esc(M.error)}</div>` : ''}
          <h2 class="txa-h2">Languages</h2>
          <p class="txa-muted">Searched in this order. Each one also gets its own provider (“ABS+ Deutsch”…), for libraries in one language. Titles in Japanese, Chinese, Korean, Cyrillic, Arabic, Hebrew, Greek or Hindi script are recognised automatically.</p>
          <div class="txa-langs">${langs.map((l) => `<label class="txa-check"><input type="checkbox" data-txm="lang" value="${l.id}" ${picked.has(l.id) ? 'checked' : ''} ${M.busy ? 'disabled' : ''}>${esc(l.name)}</label>`).join('')}</div>
          <h2 class="txa-h2">In Audiobookshelf</h2>
          ${reg.length ? `<p class="txa-counts">Set up: ${reg.map((p) => esc(p.name)).join(', ')}</p>` : '<p class="txa-muted">Not set up yet.</p>'}
          ${M.reachable === false ? `<div class="txa-error">Audiobookshelf couldn't reach the provider at ${esc(d ? d.selfUrl : '')}. Set ABS_PLUS_URL on the ABS+ container to an address the Audiobookshelf container can open.</div>` : ''}
          ${M.reachable === true ? '<div class="txa-ok">Checked: Audiobookshelf searches through ABS+ successfully.</div>' : ''}
          <div class="txa-actions"><button class="txa-btn txa-primary" data-txm="register" ${M.busy || !d ? 'disabled' : ''}>${reg.length ? 'Update in Audiobookshelf' : 'Set up in Audiobookshelf'}</button></div>
          ${
            main && M.libraries.length
              ? `<p class="txa-muted">Use it for matching (Match, Quick match, and new books) in:</p>${M.libraries
                  .map((l) => {
                    const using = l.provider === `custom-${main.id}`
                    return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(l.name)}</p><p class="txa-sub">Now: ${using ? 'ABS+ (all sources)' : esc(l.provider || 'default')}</p></div>${using ? '<span class="txa-done">✓ Using ABS+</span>' : `<button class="txa-btn txa-small" data-txm="use" data-id="${esc(l.id)}" ${M.busy ? 'disabled' : ''}>Use ABS+</button>`}</div>`
                  })
                  .join('')}`
              : ''
          }
          <p class="txa-muted">To fix one book: open it → Edit → Match, and pick an ABS+ provider. To redo a whole library: the library's ⋮ menu → Match books (Quick match).</p>
          ${d && !d.googleKey ? '<p class="txa-muted">Google Books uses a shared daily allowance that often runs out (that\'s why Google matches can come back empty). For reliable Google results, set GOOGLE_BOOKS_API_KEY on the ABS+ container (a free key from Google Cloud).</p>' : ''}
          ${errs.length ? `<p class="txa-muted">Recently unavailable: ${errs.map(([k, v]) => `${esc(k)} (${esc(v.error)})`).join(', ')}</p>` : ''}
          <h2 class="txa-h2">Try a search</h2>
          <form class="txa-toolbar" data-txm="testform">
            <input class="txa-search" name="q" placeholder="Title" required value="${esc((M.test && M.test.q) || '')}">
            <input class="txa-search" name="author" placeholder="Author (optional)" value="${esc((M.test && M.test.author) || '')}">
            <select class="txa-select" name="lang"><option value="">All my languages</option>${langs.map((l) => `<option value="${l.id}"${M.test && M.test.lang === l.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
            <button class="txa-btn" type="submit" ${M.testing ? 'disabled' : ''}>${M.testing ? 'Searching…' : 'Search'}</button>
          </form>
          <div class="txa-results">${
            M.test && M.test.matches
              ? M.test.matches.length
                ? M.test.matches
                    .map(
                      (m) => `<div class="txa-result">${m.cover ? `<img src="${esc(m.cover)}" alt="" loading="lazy">` : '<div class="txa-nocover"></div>'}<div class="txa-grow"><p class="txa-title">${esc(m.title)}${m.subtitle ? ` <small>${esc(m.subtitle)}</small>` : ''}</p>
                        <p class="txa-sub">${esc(m.author || '')}${m.narrator ? ` · read by ${esc(m.narrator)}` : ''}${m.publishedYear ? ` · ${esc(m.publishedYear)}` : ''}${m.language ? ` · ${esc(m.language)}` : ''}${m.series ? ` · ${esc(m.series.map((s) => s.series + (s.sequence ? ' #' + s.sequence : '')).join(', '))}` : ''}</p>
                        <p class="txa-sub">From ${esc(m.sources.join(', '))} · covers: ${m.covers.map((c) => `${c.size || '?'} px`).join(', ')}${m.adult ? ' · <span class="txa-st-error">adult</span>' : ''}</p></div></div>`
                    )
                    .join('')
                : '<p class="txa-muted">Nothing found.</p>'
              : ''
          }</div>`
      }
      function onChange(e) {
        const t = e.target
        if (t.getAttribute('data-txm') === 'lang') {
          const langs = [...A.el.querySelectorAll('[data-txm="lang"]:checked')].map((x) => x.value)
          return run(() => request('PUT', '/admin/metadata', { languages: langs }), () => 'Languages saved. Press “Update in Audiobookshelf” to add their providers.')
        }
      }
      function onClick(e) {
        const t = e.target.closest('[data-txm]')
        if (!t || t.tagName === 'INPUT' || t.tagName === 'FORM') return
        const what = t.getAttribute('data-txm')
        if (what === 'register')
          return run(async () => {
            const r = await request('POST', '/admin/metadata/register')
            M.reachable = r.reachable
            return r
          }, (r) => (r.reachable === false ? 'Set up, but Audiobookshelf couldn’t reach it' : `Set up ${r.registered.length} provider${r.registered.length === 1 ? '' : 's'}`))
        if (what === 'use') {
          const main = allSources()
          return run(() => request('POST', '/admin/library/provider', { libraryId: t.getAttribute('data-id'), provider: `custom-${main.id}` }), () => 'The library now matches with ABS+')
        }
      }
      async function onSubmit(e) {
        const f = e.target
        const q = f.q.value.trim()
        if (!q) return
        M.test = { q, author: f.author.value.trim(), lang: f.lang.value, matches: null }
        M.testing = true
        render()
        try {
          const r = await request('GET', `/admin/metadata/test?${new URLSearchParams({ q, author: M.test.author, lang: M.test.lang })}`)
          M.test.matches = r.matches
        } catch (e) {
          toast('error', e.message)
          M.test.matches = []
        }
        M.testing = false
        render()
      }
      return { load, render, onChange, onClick, onSubmit }
    })()

    // Private block tags (abs+hide:...) only drive the rules: hide them wherever Audiobookshelf lists tags
    setInterval(() => {
      if (!document.body || !document.body.textContent.includes('abs+hide:')) return
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (/^\s*abs\+hide:[a-z0-9]+\s*,?\s*$/i.test(n.nodeValue) && n.parentElement && !n.parentElement.closest('.txa-page')) {
          const el = n.parentElement.closest('a, button, li, span') || n.parentElement
          el.style.display = 'none'
        }
      }
    }, 2000)


    // ---------------------------------------------------------------- Library catalogue page (admins)
    const CATALOG = (() => {
      const C = { data: null, error: null, busy: false, timer: null, edit: {} }
      const gb = (n) => (n ? `${(n / 1e9).toFixed(n > 1e10 ? 0 : 1)} GB` : '0 GB')
      async function load() {
        try {
          C.data = await request('GET', '/admin/catalog')
          C.error = null
        } catch (e) {
          C.error = e.status === 404 ? 'Update the ABS+ container to use the library catalogue.' : e.message
        }
        const typing = A.el && document.activeElement && A.el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT'
        if (!typing) render()
        clearTimeout(C.timer)
        const busy = C.data && (C.data.catalog.building || C.data.dewey.job)
        if (A.open && A.page === 'catalog') C.timer = setTimeout(() => A.open && A.page === 'catalog' && !document.hidden && load(), busy ? 3000 : 30000)
      }
      async function run(fn, done) {
        C.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        C.busy = false
        load()
      }
      function phaseText(c) {
        const pct = c.total ? ` ${Math.floor((c.bytes / c.total) * 100)}%` : ''
        switch (c.phase) {
          case 'authors':
            return c.bytes && c.total && c.bytes < c.total ? `Downloading authors${pct} (${gb(c.bytes)} of ${gb(c.total)})` : `Reading authors… ${(c.rows || 0).toLocaleString()}`
          case 'download':
            return `Downloading editions${pct} (${gb(c.bytes)} of ${gb(c.total)})`
          case 'build':
            return `Building${pct}: ${(c.rows || 0).toLocaleString()} books so far`
          case 'index':
            return `Indexing ${(c.rows || 0).toLocaleString()} books (the last step, can take a while)`
          case 'error':
            return `Stopped: ${c.error || 'error'}`
          case 'cancelled':
            return 'Cancelled. Starting again picks the download up where it stopped.'
          default:
            return ''
        }
      }
      function render() {
        if (!A.el) return
        const d = C.data
        const c = (d && d.catalog) || {}
        const w = (d && d.dewey) || {}
        const s = c.stats
        A.el.innerHTML = `
          <h1 class="txa-h1">Library catalogue</h1>
          <p class="txa-muted">A copy of Open Library's catalogue (about 40 million editions, public domain) kept on this server. It gives your books Dewey Decimal numbers for browsing (the “Dewey” tab in each library), looks up ISBNs, and adds an offline source to the ABS+ metadata providers. Without it, Dewey numbers come from Open Library online, one book per second.</p>
          <p class="txa-muted">Why not isbn-international.org? It's the agency that hands out ISBN ranges: it publishes a register of publishers, not a catalogue of books, and doesn't allow bulk copying.</p>
          ${C.error ? `<div class="txa-error">${esc(C.error)}</div>` : ''}
          <h2 class="txa-h2">Catalogue on this server</h2>
          ${
            c.ready && s
              ? `<div class="txa-ok">Ready: ${s.books.toLocaleString()} ISBNs, ${s.withDdc.toLocaleString()} with a Dewey number · ${gb(c.size)}${s.built ? ` · built ${new Date(s.built).toLocaleDateString()}` : ''}</div>`
              : c.ready
              ? '<div class="txa-ok">Ready.</div>'
              : '<p class="txa-counts">Not downloaded.</p>'
          }
          ${c.building || ['download', 'authors', 'build', 'index', 'error', 'cancelled'].includes(c.phase) ? `<p class="txa-counts">${esc(phaseText(c))}</p>${c.building && c.total ? `<div class="txa-bar" style="max-width:520px"><div style="width:${Math.floor(((c.bytes || 0) / c.total) * 100)}%"></div></div>` : ''}` : ''}
          <p class="txa-muted">Download about 13 GB; the finished catalogue takes roughly 6–10 GB in the catalogue volume${c.freeBytes ? ` (${gb(c.freeBytes)} free there now)` : ''}. Building takes an hour or more at low priority; transcription and playback carry on as normal.</p>
          <div class="txa-actions">
            ${c.building ? `<button class="txa-btn txa-danger" data-txc="cancel" ${C.busy ? 'disabled' : ''}>Stop</button>` : `<button class="txa-btn txa-primary" data-txc="build" ${C.busy || !d ? 'disabled' : ''}>${c.ready ? 'Update to the latest copy' : c.phase === 'cancelled' || c.phase === 'error' ? 'Continue download and build' : 'Download and build'}</button>`}
            ${c.ready && !c.building ? `<button class="txa-btn txa-danger" data-txc="delete" ${C.busy ? 'disabled' : ''}>Delete</button>` : ''}
          </div>
          <h2 class="txa-h2">Dewey numbers for your books</h2>
          <p class="txa-counts">${(w.classified || 0).toLocaleString()} of ${(w.total || 0).toLocaleString()} books have a Dewey number${w.notFound ? ` · ${w.notFound} looked up with no result` : ''}</p>
          ${w.job ? `<p class="txa-muted">Looking up… ${w.job.done} of ${w.job.total || '…'} (${w.job.found} found)</p>` : ''}
          <div class="txa-actions">
            <button class="txa-btn txa-primary" data-txc="classify" ${C.busy || w.job ? 'disabled' : ''}>Look up books without a number</button>
            <button class="txa-btn" data-txc="redo" ${C.busy || w.job ? 'disabled' : ''}>Look up all again</button>
          </div>
          <p class="txa-muted">New books are looked up automatically. Numbers you type below are kept when looking up again.</p>
          ${
            d && d.unclassified.length
              ? `<h2 class="txa-h2">Without a Dewey number</h2>${d.unclassified
                  .slice(0, 200)
                  .map(
                    (b) => `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(b.title || b.id)}</p><p class="txa-sub">${esc(b.author)}${b.looked ? ' · not found' : ' · not looked up yet'}</p></div>
                      <input class="txa-search txa-ddc" placeholder="e.g. 823.914" data-txc="ddc" data-id="${esc(b.id)}" value="${esc(C.edit[b.id] || '')}"><button class="txa-btn txa-small" data-txc="save" data-id="${esc(b.id)}">Save</button></div>`
                  )
                  .join('')}`
              : ''
          }`
      }
      function onClick(e) {
        const t = e.target.closest('[data-txc]')
        if (!t || t.tagName === 'INPUT') return
        const what = t.getAttribute('data-txc')
        if (what === 'build') {
          if (!confirm('Download about 13 GB from Open Library and build the catalogue on this server? It runs in the background at low priority.')) return
          return run(() => request('POST', '/admin/catalog/build'), () => 'Downloading in the background')
        }
        if (what === 'cancel') return run(() => request('POST', '/admin/catalog/cancel'), () => 'Stopped')
        if (what === 'delete') {
          if (!confirm('Delete the catalogue from this server? Dewey numbers already found are kept.')) return
          return run(() => request('DELETE', '/admin/catalog'), () => 'Catalogue deleted')
        }
        if (what === 'classify') return run(() => request('POST', '/admin/dewey/classify', {}), () => 'Looking up Dewey numbers in the background')
        if (what === 'redo') return run(() => request('POST', '/admin/dewey/classify', { redo: true }), () => 'Looking up all books again in the background')
        if (what === 'save') {
          const id = t.getAttribute('data-id')
          const input = A.el.querySelector(`[data-txc="ddc"][data-id="${CSS.escape(id)}"]`)
          const v = (input && input.value.trim()) || ''
          if (!/^\d{3}(\.\d+)?$/.test(v)) return toast('error', 'A Dewey number looks like 823 or 823.914')
          delete C.edit[id]
          return run(() => request('PUT', `/admin/dewey/${encodeURIComponent(id)}`, { ddc: v }), () => `Saved ${v}`)
        }
      }
      function onInput(e) {
        if (e.target.matches('[data-txc="ddc"]')) C.edit[e.target.getAttribute('data-id')] = e.target.value
      }
      return { load, render, onClick, onInput }
    })()

    // ---------------------------------------------------------------- Speech models (on the Transcription page)
    const MODELS = (() => {
      const M = { data: null, error: null, busy: false, timer: null, at: 0 }
      const size = (b) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`)
      async function load() {
        try {
          M.data = await request('GET', '/admin/models')
          M.error = null
        } catch (e) {
          M.error = e.status === 404 ? 'Update the ABS+ container to manage speech models here.' : e.message
        }
        M.at = Date.now()
        render()
        clearTimeout(M.timer)
        const busy = M.data && M.data.downloading
        if (A.open && A.page === 'transcription') M.timer = setTimeout(() => A.open && A.page === 'transcription' && !document.hidden && load(), busy ? 3000 : 30000)
      }
      async function run(fn, done) {
        M.busy = true
        render()
        try {
          const r = await fn()
          if (r && r.models) M.data = r
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        M.busy = false
        load()
      }
      function render() {
        const box = A.el && A.el.querySelector('[data-txm="box"]')
        if (!box) return
        const d = M.data
        if (!d) {
          box.innerHTML = M.error ? `<div class="txa-error">${esc(M.error)}</div>` : '<p class="txa-muted">Loading speech models…</p>'
          return
        }
        const h = d.hardware
        const missing = d.models.filter((m) => m.usable && !m.installed)
        const recIds = [...new Set(d.recommendations.map((r) => r.id))]
        const recMissing = recIds.filter((id) => missing.some((m) => m.id === id))
        const ram = h.ramMb ? `${(h.ramMb / 1024).toFixed(h.ramMb < 10240 ? 1 : 0)} GB memory` : ''
        const gpu = h.cuda > 0 ? `${h.gpu || 'NVIDIA GPU'}${h.vramMb ? ` (${(h.vramMb / 1024).toFixed(0)} GB)` : ''}` : 'No GPU (runs on the processor)'
        const order = (m) => (m.recommendedFor.length ? 0 : m.installed ? 1 : m.usable ? 2 : 3)
        const sel = d.selected || 'auto'
        box.innerHTML = `
          <h2 class="txa-h2">Speech models</h2>
          ${M.error ? `<div class="txa-error">${esc(M.error)}</div>` : ''}
          ${h.problems && h.problems.length ? `<div class="txa-error"><b>Speech engine problem</b><br>${h.problems.map(esc).join('<br>')}</div>` : ''}
          <div class="txa-row"><div class="txa-grow"><p class="txa-title">This server</p><p class="txa-sub" style="white-space:normal">${esc(gpu)} · ${h.cpus || '?'} CPU cores${ram ? ` · ${esc(ram)}` : ''}</p>
            <p class="txa-sub">Checked ${new Date(h.scannedAt).toLocaleString()} (and at every start, so upgrades are picked up)</p></div>
            <button class="txa-btn txa-small" data-txm="rescan" ${M.busy ? 'disabled' : ''}>Check hardware again</button></div>
          <p class="txa-muted" style="margin-top:12px"><b>Model used for transcription</b> — click one. New and waiting books use it; books already being transcribed keep theirs.</p>
          <label class="txa-row txa-pick" style="cursor:pointer"><input type="radio" name="txm-use" data-txm="use" data-id="auto" ${sel === 'auto' ? 'checked' : ''} ${M.busy ? 'disabled' : ''}><div class="txa-grow"><p class="txa-title">Automatic (recommended)</p><p class="txa-sub" style="white-space:normal">Picks the best model for each book from its language and this server's hardware, as listed below.</p></div></label>
          <p class="txa-muted" style="margin-top:12px"><b>Recommended for this hardware</b> (what Automatic uses):</p>
          ${d.recommendations.map((r) => `<p class="txa-sub" style="white-space:normal">• ${esc(r.label)}: <b>${esc(r.name)}</b>${r.reason ? ` — ${esc(r.reason)}` : ''}</p>`).join('')}
          <div class="txa-actions">
            ${recMissing.length ? `<button class="txa-btn txa-primary" data-txm="recommended" ${M.busy ? 'disabled' : ''}>Download recommended (${recMissing.length})</button>` : ''}
            <button class="txa-btn${recMissing.length ? '' : ' txa-primary'}" data-txm="all" ${M.busy || !missing.length ? 'disabled' : ''}>${missing.length ? `Download all (${missing.length})` : 'All models downloaded'}</button>
            <button class="txa-btn" data-txm="refresh">Refresh</button>
          </div>
          ${d.freeBytes != null ? `<p class="txa-sub">Free space for models: ${size(d.freeBytes)}</p>` : ''}
          ${d.models
            .slice()
            .sort((a, b) => order(a) - order(b))
            .map((m) => {
              const st = m.state === 'downloading' ? 'Downloading…' : m.state === 'queued' ? 'Waiting to download' : m.installed ? `Downloaded · ${size(m.installedBytes)}` : m.usable ? `Not downloaded · ${esc(m.sizeLabel || '')}` : 'Not available in this image'
              const use = m.usable && sel !== m.id ? `<button class="txa-btn txa-small" data-txm="use" data-id="${esc(m.id)}" ${M.busy ? 'disabled' : ''}>Use</button>` : ''
              const btn = use + (m.state ? '' : m.installed ? `<button class="txa-btn txa-small" data-txm="remove" data-id="${esc(m.id)}">Remove</button>` : m.usable ? `<button class="txa-btn txa-small txa-primary" data-txm="download" data-id="${esc(m.id)}" ${M.busy ? 'disabled' : ''}>Download</button>` : '')
              return `<div class="txa-row">${m.usable ? `<input type="radio" name="txm-use" data-txm="use" data-id="${esc(m.id)}" aria-label="Use ${esc(m.name)}" ${sel === m.id ? 'checked' : ''} ${M.busy ? 'disabled' : ''} style="cursor:pointer">` : ''}<div class="txa-grow" ${m.usable ? `data-txm="use" data-id="${esc(m.id)}" style="cursor:pointer"` : ''}><p class="txa-title">${esc(m.name)}${sel === m.id ? ' <span class="txa-chip txa-on" style="cursor:default">In use</span>' : ''}${m.recommendedFor.length ? ' <span class="txa-chip txa-on" style="cursor:default">Recommended</span>' : ''}</p>
                <p class="txa-sub" style="white-space:normal">${esc(m.description || '')}</p>
                ${m.recommendedFor.length ? `<p class="txa-sub" style="white-space:normal">Best here for: ${m.recommendedFor.map(esc).join(', ')}</p>` : ''}
                <p class="txa-sub">${st}${m.error ? ` · <span style="color:#ef5350">${esc(m.error)}</span>` : ''}</p></div>${btn}</div>`
            })
            .join('')}`
      }
      function onClick(e) {
        const t = e.target.closest('[data-txm]')
        if (!t) return false
        const what = t.getAttribute('data-txm')
        const id = t.getAttribute('data-id')
        const m = id && M.data && M.data.models.find((x) => x.id === id)
        if (what === 'use') {
          if (!M.data || id === (M.data.selected || 'auto')) return true
          const name = id === 'auto' ? 'Automatic' : m ? m.name : id
          run(() => request('POST', '/admin/models/use', { modelId: id }), (r) => `Now using ${name}${r.changed ? ` · ${r.changed} waiting book${r.changed === 1 ? '' : 's'} switched` : ''}${id !== 'auto' && m && !m.installed ? ' · downloading it now' : ''}`)
          return true
        }
        if (what === 'rescan') run(() => request('POST', '/admin/hardware/rescan'), (r) => `Hardware: ${r.hardware.label}`)
        if (what === 'refresh') load()
        if (what === 'download') run(() => request('POST', '/admin/models/download', { ids: [id] }), () => `Downloading ${m ? m.name : id} in the background`)
        if (what === 'recommended') run(() => request('POST', '/admin/models/download', { ids: [...new Set(M.data.recommendations.map((r) => r.id))] }), (r) => `Downloading ${r.queued.length} model${r.queued.length === 1 ? '' : 's'} in the background`)
        if (what === 'all') {
          const missing = M.data.models.filter((x) => x.usable && !x.installed)
          if (!confirm(`Download ${missing.length} speech models (${missing.map((x) => x.sizeLabel).filter(Boolean).join(' + ')})?\n\nThey download one at a time in the background; you can keep using the server.`)) return true
          run(() => request('POST', '/admin/models/download', { all: true }), (r) => `Downloading ${r.queued.length} models in the background`)
        }
        if (what === 'remove') {
          if (!confirm(`Remove ${m ? m.name : id} from this server? It downloads again if a transcription needs it.`)) return true
          run(() => request('DELETE', `/models/${encodeURIComponent(id)}`), () => 'Removed')
        }
        return true
      }
      return { load, render, onClick, stop: () => clearTimeout(M.timer) }
    })()

    // ---------------------------------------------------------------- Author photos and bios page
    const AUTHORS = (() => {
      const W = { data: null, error: null, busy: false, timer: null, query: '', filter: 'missing', limit: 60, preview: {} }
      async function load() {
        try {
          W.data = await request('GET', '/admin/authors')
          W.error = null
        } catch (e) {
          W.error = e.status === 404 ? 'Update the ABS+ container to fill in author photos and bios.' : e.message
        }
        const typing = A.el && document.activeElement && A.el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT'
        if (!typing) render()
        clearTimeout(W.timer)
        if (A.open && A.page === 'authors') W.timer = setTimeout(() => A.open && A.page === 'authors' && !document.hidden && load(), W.data && W.data.job ? 3000 : 60000)
      }
      async function run(fn, done) {
        W.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        W.busy = false
        load()
      }
      const list = () => {
        const q = W.query.trim().toLowerCase()
        return ((W.data && W.data.authors) || []).filter((a) => (W.filter === 'missing' ? !a.hasImage || !a.hasBio : true) && (!q || a.name.toLowerCase().includes(q)))
      }
      function render() {
        if (!A.el || !A.open || A.page !== 'authors') return
        const d = W.data
        const job = d && d.job
        A.el.innerHTML = `
          <h1 class="txa-h1">Author photos and bios</h1>
          <p class="txa-muted">Audiobookshelf's own Match only asks Audible. ABS+ also looks authors up on Wikipedia (photos from Wikimedia Commons, bios in your bio language: ${esc((d && d.lang) || 'en')}) and Open Library, and uses the best it finds: Wikipedia first, then Audible, then Open Library. Wikipedia bios end with a link to the article (CC BY-SA). Only people listed as writers are matched, so a namesake isn't picked up by mistake.</p>
          ${W.error ? `<div class="txa-error">${esc(W.error)}</div>` : ''}
          <p class="txa-counts">${d ? `${d.total} authors · ${d.missingImage} without a photo · ${d.missingBio} without a bio` : 'Loading…'}</p>
          ${job ? `<p class="txa-muted">Filling in… ${job.done} of ${job.total || '…'} · ${job.images} photos and ${job.bios} bios added</p>` : ''}
          <div class="txa-actions">
            <button class="txa-btn txa-primary" data-txw="fill" ${W.busy || job || !d ? 'disabled' : ''}>Fill in what's missing</button>
            <button class="txa-btn" data-txw="replace" ${W.busy || job || !d ? 'disabled' : ''}>Look up every author again</button>
            <button class="txa-btn" data-txw="refresh">Refresh</button>
          </div>
          <h2 class="txa-h2">Authors</h2>
          <input class="txa-search" type="search" data-txw="search" placeholder="Search authors" value="${esc(W.query)}">
          <div class="txa-filters">${[
            ['missing', 'Missing a photo or bio'],
            ['all', 'All']
          ]
            .map(([id, label]) => `<button class="txa-chip${W.filter === id ? ' txa-on' : ''}" data-txw="filter" data-id="${id}">${label}</button>`)
            .join('')}</div>
          <div data-txw="list"></div>`
        renderList()
      }
      function renderList() {
        const box = A.el && A.el.querySelector('[data-txw="list"]')
        if (!box) return
        const all = list()
        box.innerHTML =
          all
            .slice(0, W.limit)
            .map((a) => {
              const p = W.preview[a.id]
              const found = p && p.result
              return `<div class="txa-row" style="flex-wrap:wrap"><div class="txa-grow"><p class="txa-title">${esc(a.name)}</p><p class="txa-sub">${a.numBooks} book${a.numBooks === 1 ? '' : 's'} · ${a.hasImage ? 'has a photo' : 'no photo'} · ${a.hasBio ? 'has a bio' : 'no bio'}</p></div>
                <button class="txa-btn txa-small" data-txw="look" data-id="${esc(a.id)}" ${p && p.loading ? 'disabled' : ''}>${p && p.loading ? 'Looking…' : 'Look up'}</button>
                ${
                  found
                    ? `<div style="flex-basis:100%;display:flex;gap:12px;align-items:flex-start;padding:8px 0">
                        ${found.image ? `<img src="${esc(found.image.url)}" alt="" style="width:72px;height:96px;object-fit:cover;border-radius:6px;flex-shrink:0" loading="lazy">` : ''}
                        <div class="txa-grow"><p class="txa-sub" style="white-space:normal">${found.image ? `Photo: ${esc(found.image.source)}` : 'No photo found'} · ${found.bio ? `Bio: ${esc(found.bio.source)}` : 'No bio found'}</p>
                        ${found.bio ? `<p class="txa-sub" style="white-space:normal;opacity:.9">${esc(found.bio.text.slice(0, 420))}${found.bio.text.length > 420 ? '…' : ''}</p>` : ''}
                        ${found.image || found.bio ? `<button class="txa-btn txa-small txa-primary" data-txw="use" data-id="${esc(a.id)}" style="margin-top:6px">Use these</button>` : ''}</div></div>`
                    : p && p.error
                      ? `<p class="txa-sub" style="flex-basis:100%;color:#ef5350">${esc(p.error)}</p>`
                      : ''
                }</div>`
            })
            .join('') + (all.length > W.limit ? `<div class="txa-actions"><button class="txa-btn" data-txw="more">Show more (${all.length - W.limit})</button></div>` : '') + (W.data && !all.length ? '<p class="txa-muted">Every author has a photo and a bio.</p>' : '')
      }
      async function look(id) {
        const a = W.data.authors.find((x) => x.id === id)
        W.preview[id] = { loading: true }
        renderList()
        try {
          W.preview[id] = { result: await request('GET', `/admin/authors/preview?name=${encodeURIComponent(a.name)}`) }
        } catch (e) {
          W.preview[id] = { error: e.message }
        }
        renderList()
      }
      function onClick(e) {
        const t = e.target.closest('[data-txw]')
        if (!t || t.tagName === 'INPUT') return
        const what = t.getAttribute('data-txw')
        const id = t.getAttribute('data-id')
        if (what === 'fill') return run(() => request('POST', '/admin/authors/fill', {}), () => 'Filling in missing photos and bios in the background')
        if (what === 'replace') {
          if (!confirm('Look up every author again and replace their photos and bios with what ABS+ finds? Bios you wrote yourself are replaced too.')) return
          return run(() => request('POST', '/admin/authors/fill', { replace: true }), () => 'Looking up every author in the background')
        }
        if (what === 'use') return run(() => request('POST', '/admin/authors/fill', { ids: [id], replace: true }), () => 'Saving the photo and bio').then(() => setTimeout(load, 4000))
        if (what === 'look') return look(id)
        if (what === 'filter') {
          W.filter = id
          W.limit = 60
          return render()
        }
        if (what === 'more') {
          W.limit += 60
          return renderList()
        }
        if (what === 'refresh') return load()
      }
      function onInput(e) {
        if (e.target.matches('[data-txw="search"]')) {
          W.query = e.target.value
          W.limit = 60
          renderList()
        }
      }
      return { load, render, onClick, onInput }
    })()

    // ---------------------------------------------------------------- Server updates (the regular Audiobookshelf)
    const UPDATES = (() => {
      const U = { data: null, error: null, busy: false, timer: null }
      const when = (t) => (t ? new Date(t).toLocaleString() : '')
      async function load(fresh) {
        try {
          U.data = await request(fresh ? 'POST' : 'GET', fresh ? '/admin/abs-update/check' : '/admin/abs-update')
          U.error = null
        } catch (e) {
          U.error = e.status === 404 ? 'Update the ABS+ container to manage Audiobookshelf updates here.' : e.message
        }
        render()
        clearTimeout(U.timer)
        if (A.open && A.page === 'updates') U.timer = setTimeout(() => A.open && A.page === 'updates' && !document.hidden && load(), U.data && U.data.job ? 3000 : 60000)
      }
      async function run(fn, done) {
        U.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        U.busy = false
        load()
      }
      function render() {
        if (!A.el || !A.open || A.page !== 'updates') return
        const d = U.data
        const s = (d && d.settings) || {}
        const job = d && d.job
        const last = s.lastResult
        A.el.innerHTML = `
          <h1 class="txa-h1">Server updates</h1>
          <p class="txa-muted">ABS+ runs in front of the regular Audiobookshelf. It can keep that Audiobookshelf up to date: it downloads the official new version, restarts Audiobookshelf with exactly the same settings, libraries and users, checks that it answers, and puts the previous version back by itself if it doesn't.</p>
          ${U.error ? `<div class="txa-error">${esc(U.error)}</div>` : ''}
          ${d && d.error ? `<div class="txa-warn">${esc(d.error)}</div>` : ''}
          ${d && !d.dockerReady ? `<div class="txa-warn"><b>Checking only.</b> To install updates, ABS+ needs access to Docker: add <code>- /var/run/docker.sock:/var/run/docker.sock</code> under the ABS+ service's volumes in the stack and redeploy.</div>` : ''}
          <div class="txa-row"><div class="txa-grow">
            <p class="txa-title">Audiobookshelf ${esc((d && d.running) || '…')}${d && d.available ? ` → ${esc(d.latest.version)} available` : d && d.latest ? ' · up to date' : ''}</p>
            <p class="txa-sub" style="white-space:normal">${d && d.latest ? `Newest release: ${esc(d.latest.version)}${d.latest.publishedAt ? ` (${new Date(d.latest.publishedAt).toLocaleDateString()})` : ''} · <a href="${esc(d.latest.url)}" target="_blank" rel="noopener" style="text-decoration:underline">what's new</a>` : 'Checking…'}${d && d.container ? ` · container ${esc(d.container.name)}` : ''}</p>
            ${d && d.major ? `<p class="txa-sub" style="white-space:normal;color:#fb8c00">This is a major update (${esc(d.running)} → ${esc(d.latest.version)}). Read what's new first; ABS+ may need an update for it too.</p>` : ''}
          </div></div>
          ${job ? `<p class="txa-muted"><b>${job.kind === 'rollback' ? 'Going back' : 'Updating'}…</b> ${esc(job.step)}. Audiobookshelf is unavailable for about a minute.</p>` : ''}
          ${
            last && !last.ok && last.reason === 'features'
              ? `<div class="txa-error"><b>Update failed due to features breaking</b><br>
                  Audiobookshelf ${esc(last.target || 'the new version')} would have stopped these ABS+ features from working, so the update was undone${last.keptVersion ? ` and ${esc(last.keptVersion)} is running again` : ''}:
                  <ul style="margin:6px 0 4px 18px;list-style:disc">${(last.broken || []).map((b) => `<li>${esc(b.feature)}${b.detail ? ` <span style="opacity:.75">(${esc(b.detail)})</span>` : ''}</li>`).join('')}</ul>
                  <small>${esc(when(last.at))} · Wait for an ABS+ update for this version, or use "Install anyway" below.</small></div>`
              : last && !last.ok && last.reason !== 'held'
                ? `<div class="txa-error"><b>Update failed</b><br>${esc(last.error)}<br><small>${esc(when(last.at))}</small></div>`
                : last
                  ? `<p class="txa-sub" style="white-space:normal">Last: ${esc(last.ok ? last.message || 'done' : last.error)} · ${esc(when(last.at))}</p>`
                  : ''
          }
          <div class="txa-actions">
            <button class="txa-btn txa-primary" data-txu="install" ${U.busy || job || !d || !d.canInstall ? 'disabled' : ''}>${d && d.available ? `Update to ${esc(d.latest.version)} now` : 'Reinstall the newest image'}</button>
            <button class="txa-btn" data-txu="check" ${U.busy ? 'disabled' : ''}>Check now</button>
            ${s.previous ? `<button class="txa-btn" data-txu="rollback" ${U.busy || job || !d.canInstall ? 'disabled' : ''}>Go back to ${esc(s.previous.version || 'the previous version')}</button>` : ''}
          </div>
          <h2 class="txa-h2">ABS+ features</h2>
          <p class="txa-muted">ABS+ is its own container, so updating Audiobookshelf never touches its features or data. What an update could change is what ABS+ relies on in Audiobookshelf: its API, the web pages ABS+ adds itself to, and the parts of the web app its features hook into. All of it is checked before and after every update; if something that worked stops working, the update is undone and you'll see what it was here.</p>
          ${
            s.lastCompat
              ? (() => {
                  const bad = s.lastCompat.checks.filter((c) => !c.ok)
                  const feats = [...new Set(s.lastCompat.checks.map((c) => c.feature))]
                  return `<p class="txa-sub" style="white-space:normal;${bad.length ? 'color:#ef5350' : ''}">${bad.length ? `${bad.length} problem${bad.length === 1 ? '' : 's'}` : `All ${s.lastCompat.checks.length} checks passed`} · ${esc(when(s.lastCompat.at))}</p>
                    ${feats
                      .map((f) => {
                        const cs = s.lastCompat.checks.filter((c) => c.feature === f)
                        const fail = cs.filter((c) => !c.ok)
                        return `<p class="txa-sub" style="white-space:normal">${fail.length ? '✕' : '✓'} ${esc(f)}${fail.length ? ` — ${esc(fail.map((c) => c.detail).filter(Boolean).join('; '))}` : ''}</p>`
                      })
                      .join('')}`
                })()
              : '<p class="txa-sub">Not checked yet.</p>'
          }
          <div class="txa-actions">
            <button class="txa-btn" data-txu="compat" ${U.busy || job ? 'disabled' : ''}>Check ABS+ features now</button>
            ${last && !last.ok && /would break ABS\+ features/.test(last.error || '') && d && d.canInstall ? `<button class="txa-btn txa-danger" data-txu="force" ${U.busy || job ? 'disabled' : ''}>Install anyway</button>` : ''}
          </div>
          <h2 class="txa-h2">Automatic</h2>
          <div class="txa-row"><div class="txa-grow"><p class="txa-title">Every day at</p><p class="txa-sub">The check (and the update, if it's on) happens then</p></div>
            <input type="time" class="txa-search" style="max-width:130px" data-txu="time" value="${esc(s.time || '04:00')}"></div>
          <div class="txa-filters">${[
            ['install', 'Check and install'],
            ['notify', 'Only check'],
            ['off', 'Off']
          ]
            .map(([id, label]) => `<button class="txa-chip${s.auto === id ? ' txa-on' : ''}" data-txu="auto" data-id="${id}">${label}</button>`)
            .join('')}</div>
          <label class="txa-toggle"><input type="checkbox" data-txu="major" ${s.allowMajor ? 'checked' : ''}><span><b>Install major versions automatically too</b><small>Off: a new major version (e.g. 3.0) waits for you to press Update. Updates never start while someone is listening; they wait a day.</small></span></label>
          ${d && d.latest && d.latest.notes && d.available ? `<h2 class="txa-h2">What's new in ${esc(d.latest.version)}</h2><pre class="txa-sub" style="white-space:pre-wrap;font-family:inherit;max-height:320px;overflow:auto">${esc(d.latest.notes)}</pre>` : ''}`
      }
      function onClick(e) {
        const t = e.target.closest('[data-txu]')
        if (!t || t.tagName === 'INPUT') return
        const what = t.getAttribute('data-txu')
        const d = U.data
        if (what === 'check') return run(() => load(true))
        if (what === 'install') {
          if (!confirm(`${d && d.available ? `Update Audiobookshelf to ${d.latest.version}` : 'Download and reinstall the newest Audiobookshelf image'}?\n\nAudiobookshelf restarts and is unavailable for about a minute; anyone listening is interrupted. If the new version doesn't start, the current one is put back.`)) return
          return run(() => request('POST', '/admin/abs-update/install'), () => 'Updating in the background')
        }
        if (what === 'rollback') {
          if (!confirm(`Go back to Audiobookshelf ${d.settings.previous.version || 'the previous version'}?\n\nAudiobookshelf restarts. Going back across versions can fail if the newer one changed its database; ABS+ puts the current one back if so.`)) return
          return run(() => request('POST', '/admin/abs-update/rollback'), () => 'Going back in the background')
        }
        if (what === 'auto') return run(() => request('PUT', '/admin/abs-update', { auto: t.getAttribute('data-id') }), () => 'Saved')
        if (what === 'compat') return run(() => request('POST', '/admin/abs-update/compat'), (r) => (r.ok ? 'Every ABS+ feature fits this Audiobookshelf' : 'Some ABS+ features have a problem: see the list'))
        if (what === 'force') {
          if (!confirm('Install the new Audiobookshelf even though some ABS+ features would stop working with it?\n\nThe rest keeps working, and "Go back" returns to the version you have now.')) return
          return run(() => request('POST', '/admin/abs-update/install', { force: true }), () => 'Updating in the background')
        }
      }
      function onChange(e) {
        if (e.target.matches('[data-txu="time"]')) run(() => request('PUT', '/admin/abs-update', { time: e.target.value }), () => 'Saved')
        if (e.target.matches('[data-txu="major"]')) run(() => request('PUT', '/admin/abs-update', { allowMajor: e.target.checked }), () => 'Saved')
      }
      return { load, render, onClick, onChange }
    })()

    // ---------------------------------------------------------------- Dictionaries on the server
    const DICTS = (() => {
      const X = { data: null, error: null, busy: false, timer: null, query: '' }
      const mb = (b) => (b ? `${Math.max(1, Math.round(b / 1e6))} MB` : '')
      async function load() {
        try {
          X.data = await request('GET', '/admin/dictionaries')
          X.error = null
        } catch (e) {
          X.error = e.status === 404 ? 'Update the ABS+ container to download dictionaries here.' : e.message
        }
        const typing = A.el && document.activeElement && A.el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT'
        if (!typing) render()
        clearTimeout(X.timer)
        if (A.open && A.page === 'dictionaries') X.timer = setTimeout(() => A.open && A.page === 'dictionaries' && !document.hidden && load(), X.data && X.data.job ? 1500 : 60000)
      }
      async function run(fn, done) {
        X.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        X.busy = false
        load()
      }
      function row(d) {
        const job = X.data && X.data.job && X.data.job.name === d.name ? X.data.job : null
        const btn = job
          ? `<span class="txa-sub">${esc(job.step)}${job.total ? ` ${Math.round((job.done / job.total) * 100)}%` : ''}</span>`
          : d.installed
            ? `<button class="txa-btn txa-small" data-txd="remove" data-id="${esc(d.name)}" ${X.busy ? 'disabled' : ''}>Remove</button>`
            : `<button class="txa-btn txa-small txa-primary" data-txd="get" data-id="${esc(d.name)}" ${X.busy || (X.data && X.data.job) ? 'disabled' : ''}>Download</button>`
        return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(d.fromName)} → ${esc(d.toName)}${d.installed ? ' <span class="txa-done">✓ Installed</span>' : ''}</p><p class="txa-sub">${d.credit ? esc(d.credit) : `FreeDict ${esc(d.name)}`} · ${d.kind === 'definition' ? 'definitions' : 'translations'} · ${(d.headwords || 0).toLocaleString()} words · ${mb(d.size)}</p></div>${btn}</div>`
      }
      function render() {
        if (!A.el || !A.open || A.page !== 'dictionaries') return
        const d = X.data
        const q = X.query.trim().toLowerCase()
        const rec = d ? d.dicts.filter((x) => x.recommended) : []
        const rest = d ? d.dicts.filter((x) => !x.recommended && (!q || `${x.fromName} ${x.toName} ${x.name}`.toLowerCase().includes(q))) : []
        A.el.innerHTML = `
          <h1 class="txa-h1">Dictionaries</h1>
          <p class="txa-muted">Hold a word while the audio is paused (in Lyrics, Karaoke or Read along) to see what it means. Lookups use the dictionaries on this server first${d && d.online ? ', then Wiktionary online (that covers English and many other languages)' : ''}. Download dictionaries here for the languages of your books: they're free (FreeDict) and also work offline in the ABS+ app (Reader settings → Dictionaries copies them to the phone).</p>
          ${X.error ? `<div class="txa-error">${esc(X.error)}</div>` : ''}
          ${d && d.error ? `<div class="txa-warn">${esc(d.error)}</div>` : ''}
          <h2 class="txa-h2">On this server</h2>
          ${d ? (d.installed.length ? d.installed.map((x) => `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(x.name)}</p><p class="txa-sub">${esc(x.lang)} · ${(x.words || 0).toLocaleString()} words · ${mb(x.size)}</p></div></div>`).join('') : '<p class="txa-muted">None yet.</p>') : '<p class="txa-muted">Loading…</p>'}
          ${d && d.libraryLanguages.length ? `<p class="txa-sub" style="margin-top:10px">Your books: ${d.libraryLanguages.map((l) => `${esc(l.name)} (${l.books})`).join(', ')}</p>` : ''}
          <h2 class="txa-h2">Recommended for your library</h2>
          ${d ? (rec.length ? rec.map(row).join('') : '<p class="txa-muted">Your books are in English (or have no language set): Wiktionary online covers them. Other languages show up here when books in them are added.</p>') : ''}
          <h2 class="txa-h2">All dictionaries</h2>
          <input class="txa-search" type="search" data-txd="search" placeholder="Search languages" value="${esc(X.query)}">
          <div data-txd="list">${rest.slice(0, 120).map(row).join('')}</div>`
      }
      function onClick(e) {
        const t = e.target.closest('[data-txd]')
        if (!t || t.tagName === 'INPUT') return
        const what = t.getAttribute('data-txd')
        const id = t.getAttribute('data-id')
        if (what === 'get') return run(() => request('POST', '/admin/dictionaries/download', { name: id }), () => `Downloading ${id} in the background`)
        if (what === 'remove') {
          if (!confirm(`Remove the ${id} dictionary from the server?`)) return
          return run(() => request('POST', '/admin/dictionaries/remove', { name: id }), () => 'Removed')
        }
      }
      function onInput(e) {
        if (e.target.matches('[data-txd="search"]')) {
          X.query = e.target.value
          const list = A.el.querySelector('[data-txd="list"]')
          const q = X.query.trim().toLowerCase()
          if (list && X.data) list.innerHTML = X.data.dicts.filter((x) => !x.recommended && (!q || `${x.fromName} ${x.toName} ${x.name}`.toLowerCase().includes(q))).slice(0, 120).map(row).join('')
        }
      }
      return { load, render, onClick, onInput }
    })()

    /**
     * Settings → PDF text (OCR): scanned PDFs (pictures of pages) get an invisible text layer so they can be
     * searched, read along, highlighted and looked up. The book in the library isn't changed: readers get a
     * copy with the text.
     */
    const OCRP = (() => {
      const X = { data: null, error: null, busy: false, timer: null }
      const label = { none: 'Not checked', queued: 'Waiting', running: 'Reading the pages…', done: '✓ Readable', 'has-text': 'Has text already', error: 'Failed' }
      async function load() {
        try {
          X.data = await request('GET', '/admin/ocr')
          X.error = null
        } catch (e) {
          X.error = e.status === 404 ? 'Update the ABS+ container to use OCR.' : e.message
        }
        render()
        clearTimeout(X.timer)
        if (A.open && A.page === 'ocr') X.timer = setTimeout(() => A.open && A.page === 'ocr' && !document.hidden && load(), X.data && (X.data.job || X.data.queued) ? 2000 : 30000)
      }
      async function run(fn, done) {
        X.busy = true
        render()
        try {
          const r = await fn()
          if (done) toast('success', done(r))
        } catch (e) {
          toast('error', e.message || 'The server said no')
        }
        X.busy = false
        load()
      }
      function render() {
        if (!A.el || !A.open || A.page !== 'ocr') return
        const d = X.data
        const job = d && d.job
        const books = (d && d.books) || []
        const order = { running: 0, queued: 1, error: 2, none: 3, done: 4, 'has-text': 5 }
        const rows = books
          .slice()
          .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.title.localeCompare(b.title))
          .map((b) => {
            const running = job && job.id === b.id
            const st = running ? `${esc(job.step)}${job.pages ? ` · ${job.done || 0} of ${job.pages} pages` : ''} · ${job.seconds} s` : esc(label[b.status] || b.status)
            const btn = running || b.status === 'queued'
              ? ''
              : b.status === 'done'
                ? `<button class="txa-btn txa-small" data-txo="again" data-id="${esc(b.id)}" ${X.busy ? 'disabled' : ''}>Redo</button> <button class="txa-btn txa-small" data-txo="remove" data-id="${esc(b.id)}" ${X.busy ? 'disabled' : ''}>Remove</button>`
                : b.status === 'has-text'
                  ? ''
                  : `<button class="txa-btn txa-small txa-primary" data-txo="one" data-id="${esc(b.id)}" ${X.busy || !(d && d.available) ? 'disabled' : ''}>${b.status === 'error' ? 'Try again' : 'Make readable'}</button>`
            return `<div class="txa-row"><div class="txa-grow"><p class="txa-title">${esc(b.title)}</p><p class="txa-sub">${esc(b.author || '')}${b.author ? ' · ' : ''}${st}${b.pages && !running ? ` · ${b.pages} pages` : ''}${b.seconds && b.status === 'done' ? ` · took ${b.seconds} s` : ''}</p>${b.error ? `<p class="txa-sub" style="color:#ff8a80">${esc(b.error)}</p>` : ''}</div>${btn}</div>`
          })
          .join('')
        A.el.innerHTML = `
          <h1 class="txa-h1">PDF text (OCR)</h1>
          <p class="txa-muted">Some PDFs are scans: pictures of the pages, with no text in them. Then nothing can be searched, followed in Read along, highlighted or looked up in the dictionary. Optical character recognition reads the pictures and adds an invisible text layer under each page — the pages look exactly the same. Your book isn't changed: readers (web and app) get a copy with the text, kept on this server. Languages: ${esc(((d && d.languages) || []).join(', '))}.</p>
          ${X.error ? `<div class="txa-error">${esc(X.error)}</div>` : ''}
          ${d && !d.available ? '<div class="txa-warn">OCRmyPDF isn\'t in this container yet: update the ABS+ image.</div>' : ''}
          <label class="txa-toggle"><input type="checkbox" data-txo="auto" ${d && d.auto ? 'checked' : ''} ${d && d.available ? '' : 'disabled'}><span><b>Make scanned PDFs readable automatically</b><small>New books with a scanned PDF are read in the background. Turning this on also goes through the PDFs already in your library.</small></span></label>
          <div style="margin:8px 0 4px"><button class="txa-btn txa-primary" data-txo="all" ${X.busy || !(d && d.available) ? 'disabled' : ''}>Check all PDFs now</button> <span class="txa-sub">PDFs that already have text are recognised and left alone.</span></div>
          ${d && (d.job || d.queued) ? `<p class="txa-sub">${d.queued ? `${d.queued} waiting` : ''}</p>` : ''}
          <h2 class="txa-h2">PDF books (${books.length})</h2>
          ${d ? rows || '<p class="txa-muted">No books with a PDF.</p>' : '<p class="txa-muted">Loading…</p>'}`
      }
      function onClick(e) {
        const t = e.target.closest('[data-txo]')
        if (!t) return
        const what = t.getAttribute('data-txo')
        const id = t.getAttribute('data-id')
        if (what === 'auto') return run(() => request('POST', '/admin/ocr/auto', { auto: t.checked }), (r) => (r.auto ? 'Scanned PDFs will be made readable automatically' : 'Automatic OCR is off'))
        if (what === 'all') return run(() => request('POST', '/admin/ocr/start', { all: true }), (r) => `${r.queued} PDF${r.queued === 1 ? '' : 's'} to check`)
        if (what === 'one') return run(() => request('POST', '/admin/ocr/start', { ids: [id] }), () => 'Reading the pages in the background')
        if (what === 'again') return run(() => request('POST', '/admin/ocr/start', { ids: [id], again: true }), () => 'Reading the pages again')
        if (what === 'remove') {
          if (!confirm('Remove the readable copy? Readers go back to the scan.')) return
          return run(() => request('POST', '/admin/ocr/remove', { id }), () => 'Removed')
        }
      }
      return { load, render, onClick }
    })()

    return { ensure, close }
  })()
  // ------------------------------------------------------------------ Browse by Dewey Decimal (everyone)
  //
  // Adds "Dewey" to the library's side rail (and the phone icon bar). It opens a view over the library:
  // the ten Dewey classes with how many of your books are in each, then their divisions, then the books
  // in Dewey order. Only books you're allowed to open are counted (parental controls apply).
  const DEWEY = (() => {
    const D = { open: false, data: null, error: null, cls: null, div: null, el: null, links: [], route: null, loading: false }
    const nuxt = () => window.$nuxt
    const route = () => (nuxt() && nuxt().$route ? nuxt().$route.path : location.pathname)
    const base = () => (nuxt() && nuxt().$config && nuxt().$config.routerBasePath) || ''
    const onLibrary = () => /\/library\//.test(route())
    const ICON = 'numbers'

    function ensure() {
      if (!onLibrary()) {
        if (D.open) close()
        return
      }
      if (D.open && D.route !== route()) close() // the user went to another tab
      // Desktop side rail: after Narrators (or the last item)
      const railItem = [...document.querySelectorAll('a[href*="/library/"]')].find((a) => /\/narrators$/.test(a.getAttribute('href') || '') && a.classList.contains('h-20'))
      const rail = railItem && railItem.parentElement
      if (rail && !rail.querySelector('[data-abs-dewey]')) {
        const a = document.createElement('a')
        a.href = '#dewey'
        a.className = railItem.className.replace(/\btext-white\b(?!\/)/, 'text-white/80')
        a.setAttribute('data-abs-dewey', 'rail')
        a.innerHTML = `<span class="material-symbols text-2xl">${ICON}</span><p class="pt-1 text-center leading-4" style="font-size:0.9rem">Dewey</p><div class="h-full w-0.5 bg-yellow-400 absolute top-0 left-0" style="display:none"></div>`
        a.addEventListener('click', onLink)
        railItem.after(a)
      }
      // Phone icon bar
      const barItem = [...document.querySelectorAll('a[href*="/library/"]')].find((a) => /\/bookshelf\/series$/.test(a.getAttribute('href') || '') && a.parentElement.className.includes('md:hidden'))
      const bar = barItem && barItem.parentElement
      if (bar && !bar.querySelector('[data-abs-dewey]')) {
        const a = document.createElement('a')
        a.href = '#dewey'
        a.className = barItem.className
        a.setAttribute('data-abs-dewey', 'bar')
        a.title = 'Dewey'
        a.innerHTML = `<span class="material-symbols text-lg">${ICON}</span>`
        a.addEventListener('click', onLink)
        bar.appendChild(a)
      }
      document.querySelectorAll('[data-abs-dewey="rail"] > div').forEach((x) => (x.style.display = D.open ? '' : 'none'))
      if (D.open && (!D.el || !document.body.contains(D.el))) mount()
      if (!D.open && location.hash === '#dewey') openView()
    }

    function onLink(e) {
      e.preventDefault()
      D.open ? close() : openView()
    }

    function mount() {
      const page = document.querySelector('#app-content .page') || document.querySelector('.page')
      if (!page) return
      if (getComputedStyle(page).position === 'static') page.style.position = 'relative'
      if (!D.el) {
        D.el = document.createElement('div')
        D.el.className = 'txd-view'
        D.el.addEventListener('click', onClick)
      }
      page.appendChild(D.el)
    }

    async function openView() {
      D.open = true
      D.route = route()
      if (location.hash !== '#dewey') history.replaceState(history.state, '', `${location.pathname}${location.search}#dewey`)
      mount()
      render()
      if (!D.data || Date.now() - D.at > 60000) await load()
    }

    function close() {
      D.open = false
      if (D.el) D.el.remove()
      if (location.hash === '#dewey') history.replaceState(history.state, '', `${location.pathname}${location.search}`)
      document.querySelectorAll('[data-abs-dewey="rail"] > div').forEach((x) => (x.style.display = 'none'))
    }

    async function load() {
      D.loading = true
      render()
      try {
        D.data = await request('GET', '/dewey')
        D.at = Date.now()
        D.error = null
      } catch (e) {
        D.error = e.status === 404 ? 'Dewey browsing needs the latest ABS+ container.' : e.message
      }
      D.loading = false
      render()
    }

    const cover = (id) => `${base()}/api/items/${encodeURIComponent(id)}/cover?width=240`

    function render() {
      if (!D.el || !D.open) return
      const d = D.data
      const crumbs = [`<button data-txd="home">Dewey Decimal</button>`]
      const cls = d && D.cls && d.tree.classes.find((c) => c.id === D.cls)
      const div = cls && D.div && cls.divisions.find((x) => x.id === D.div)
      if (cls) crumbs.push(`<button data-txd="class" data-id="${cls.id}">${cls.id} ${esc(cls.name)}</button>`)
      if (div) crumbs.push(`<span>${div.id} ${esc(div.name || '')}</span>`)
      let body = ''
      if (D.error) body = `<div class="txa-error">${esc(D.error)}</div>`
      else if (!d) body = '<p class="txa-muted">Loading…</p>'
      else if (!cls) {
        const total = d.books.length
        body = `<p class="txa-muted">${total ? `${total} book${total === 1 ? '' : 's'} sorted the way libraries shelve them.` : 'No books have Dewey numbers yet.'}${d.tree.unclassified ? ` ${d.tree.unclassified} not classified yet${isAdmin() ? ' (Settings → Library catalogue)' : ''}.` : ''}</p>
          <div class="txd-grid">${d.tree.classes
            .map((c) => `<button class="txd-card${c.count ? '' : ' txd-empty'}" data-txd="class" data-id="${c.id}" ${c.count ? '' : 'disabled'}><span class="txd-num">${c.id}</span><span class="txd-name">${esc(c.name)}</span><span class="txd-count">${c.count} book${c.count === 1 ? '' : 's'}</span></button>`)
            .join('')}</div>`
      } else {
        const books = d.books.filter((b) => b.class === cls.id && (!div || b.division === div.id))
        const divs = !div ? `<div class="txd-divs">${cls.divisions.map((x) => `<button class="txa-chip" data-txd="div" data-id="${x.id}">${x.id} ${esc(x.name || '')} (${x.count})</button>`).join('')}</div>` : ''
        body = `${divs}<div class="txd-books">${books
          .map(
            (b) => `<button class="txd-book" data-txd="book" data-id="${esc(b.id)}" title="${esc(b.title)}"><img src="${cover(b.id)}" alt="" loading="lazy"><span class="txd-ddc">${esc(b.ddc)}</span><span class="txd-title">${esc(b.title)}</span><span class="txd-author">${esc(b.author)}</span>${b.sectionName ? `<span class="txd-sec">${esc(b.sectionName)}</span>` : ''}</button>`
          )
          .join('')}</div>`
      }
      D.el.innerHTML = `<div class="txd-head"><div class="txd-crumbs">${crumbs.join('<span class="txd-sep">›</span>')}</div><button class="txa-btn txa-small" data-txd="close">Close</button></div>${body}`
    }

    function onClick(e) {
      const t = e.target.closest('[data-txd]')
      if (!t) return
      const what = t.getAttribute('data-txd')
      if (what === 'close') return close()
      if (what === 'home') {
        D.cls = null
        D.div = null
      }
      if (what === 'class') {
        D.cls = t.getAttribute('data-id')
        D.div = null
      }
      if (what === 'div') D.div = t.getAttribute('data-id')
      if (what === 'book') {
        const id = t.getAttribute('data-id')
        close()
        if (nuxt() && nuxt().$router) return nuxt().$router.push(`/item/${id}`)
        location.href = `${base()}/item/${id}`
        return
      }
      render()
      D.el.scrollTop = 0
    }

    const isAdmin = () => {
      try {
        const s = nuxt().$store
        return !!s.getters['user/getIsAdminOrUp']
      } catch (e) {
        return false
      }
    }

    return { ensure, close }
  })()
  setInterval(DEWEY.ensure, 1000)

  // ------------------------------------------------------------------ Reading history (Your Stats page)
  //
  // The same section as the app's Stats page: the books you listened to and finished by day, week, month or year,
  // back to your first session, and the books you should pick up again. From Audiobookshelf's own listening
  // sessions and progress (absplus-views.js → readingHistory).
  const READHIST = (() => {
    const R = { el: null, h: null, kind: 'week', anchor: Date.now(), loading: false, error: null, at: 0, progress: '' }
    const nuxt = () => window.$nuxt
    const route = () => (nuxt() && nuxt().$route ? nuxt().$route.path : location.pathname)
    const base = () => (nuxt() && nuxt().$config && nuxt().$config.routerBasePath) || ''
    const RH = () => window.AbsPlusViews && window.AbsPlusViews.readingHistory
    const onStats = () => /\/config\/stats\/?$/.test(route())
    try {
      const k = localStorage.getItem('absplus-reading-history-kind')
      if (['day', 'week', 'month', 'year'].includes(k)) R.kind = k
    } catch (e) {}

    function ensure() {
      if (!onStats() || !RH()) return
      const page = document.querySelector('#app-content .page') || document.querySelector('#page-wrapper') || document.querySelector('#app-content')
      if (!page) return
      if (!R.el) {
        R.el = document.createElement('div')
        R.el.className = 'txh'
        R.el.addEventListener('click', onClick)
      }
      if (!page.contains(R.el)) {
        page.appendChild(R.el)
        render()
        if (!R.h || Date.now() - R.at > 60000) load()
      }
    }

    async function load() {
      R.loading = true
      render()
      try {
        const get = (path) => nuxt().$axios.$get(path)
        R.h = await RH().loadHistory(get, (n, total) => {
          R.progress = total ? `${n} of ${total}` : ''
          render()
        })
        R.at = Date.now()
        R.error = null
      } catch (e) {
        R.error = 'Your listening history could not be loaded.'
      }
      R.loading = false
      render()
    }

    const cover = (id) => `${base()}/api/items/${encodeURIComponent(id)}/cover?width=120`
    const bookRow = (b, right, extra) =>
      `<button class="txh-book" data-txh="book" data-id="${esc(b.id)}"><img src="${cover(b.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="txh-bk"><span class="txh-title">${esc(b.title)}</span><span class="txh-sub">${esc(b.author)}</span>${extra}</span><span class="txh-right">${right}</span></button>`

    function render() {
      if (!R.el) return
      const rh = RH()
      if (!rh) return
      let body = ''
      if (R.error && !R.h) body = `<p class="txa-error">${esc(R.error)}</p>`
      else if (!R.h) body = `<p class="txa-muted">Loading your history…${R.progress ? ' ' + esc(R.progress) : ''}</p>`
      else {
        const s = rh.summarize(R.h, R.kind, R.anchor)
        const cur = rh.periodOf(R.kind, R.anchor).start === rh.periodOf(R.kind, Date.now()).start
        const t = s.totals
        const big = rh.splitDuration(t.sec)
        const ch = rh.fmtChange(s.change)
        const st = rh.streaks(R.h)
        const icon = (n) => `<span class="material-symbols">${n}</span>`
        const tiles = [
          ['menu_book', t.books, t.books === 1 ? 'book' : 'books'],
          ['task_alt', t.finished, 'finished'],
          ['calendar_today', t.days, t.days === 1 ? 'day' : 'days'],
          ['local_fire_department', st.current, st.current === 1 ? 'day streak' : 'day streak']
        ]
        const facts = [
          t.days ? ['avg_time', 'Average', `${rh.fmtDuration(s.avgPerDay)} a day`] : null,
          s.favTime ? ['schedule', 'Usually', s.favTime.toLowerCase()] : null,
          s.topAuthor ? ['person', 'Top author', s.topAuthor] : null,
          s.longest ? ['timer', 'Longest session', rh.fmtDuration(s.longest)] : null,
          st.longest > st.current ? ['military_tech', 'Best streak', `${st.longest} days`] : null
        ].filter(Boolean)
        const bars = s.bars
          .map((b, i) => `<div class="txh-barcol${i === s.nowBar ? ' now' : ''}${i === s.peak ? ' peak' : ''}" title="${esc(b.title)}: ${esc(rh.fmtDuration(b.sec))}"><div class="txh-bar" style="height:${b.sec ? Math.max(5, Math.round((b.sec / s.maxBar) * 100)) + '%' : '3px'}"></div></div>`)
          .join('')
        const labels = s.bars.map((b, i) => `<span class="${i === s.nowBar ? 'now' : ''}">${esc(b.label)}</span>`).join('')
        const books = s.books.length
          ? s.books
              .map(
                (b, i) => `<button class="txh-book" data-txh="book" data-id="${esc(b.id)}"><span class="txh-rank">${i + 1}</span><img src="${cover(b.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="txh-bk"><span class="txh-title">${esc(b.title)}</span><span class="txh-sub">${esc(b.author)}${b.author ? ' · ' : ''}${esc(rh.fmtWhen(R.kind, b.first, b.last))}</span><span class="txh-share"><span style="width:${Math.max(2, Math.round(b.share * 100))}%"></span></span></span><span class="txh-right">${b.sec ? `<span class="txh-pill">${esc(rh.fmtDuration(b.sec))}</span>` : ''}${b.finishedAt ? `<span class="txh-done">${icon('task_alt')} Finished ${esc(rh.fmtDate(b.finishedAt))}</span>` : ''}</span></button>`
              )
              .join('')
          : `<p class="txh-empty">${icon('headphones')}No listening ${R.kind === 'day' ? 'this day' : 'this ' + R.kind}.</p>`
        const pick = rh.pickUpAgain(R.h)
        const pickHtml = pick.length
          ? `<div class="txh-sec"><h2 class="txh-h2">Books you should pick up again</h2><p class="txh-note">Started and not finished. Click one to carry on where you left off.</p><div class="txh-shelf">${pick
              .map(
                (b) => `<button class="txh-card" data-txh="book" data-id="${esc(b.id)}"><span class="txh-cover"><img src="${cover(b.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span class="txh-cprog"><span style="width:${Math.round(b.progress * 100)}%"></span></span></span><span class="txh-title">${esc(b.title)}</span><span class="txh-sub">${Math.round(b.progress * 100)}% · ${esc(rh.fmtAgo(b.last))}</span></button>`
              )
              .join('')}</div></div>`
          : ''
        body = `<div class="txh-tabs">${rh.PERIODS.map((p) => `<button data-txh="kind" data-id="${p.id}" class="${p.id === R.kind ? 'on' : ''}">${p.label}</button>`).join('')}</div>
          <div class="txh-hero">
            <div class="txh-nav"><button data-txh="prev" ${s.canPrev ? '' : 'disabled'} aria-label="Earlier">${icon('chevron_left')}</button><div class="txh-period">${esc(s.label)}${cur ? '' : ' <button class="txh-now" data-txh="now">Back to now</button>'}</div><button data-txh="next" ${s.canNext ? '' : 'disabled'} aria-label="Later">${icon('chevron_right')}</button></div>
            <div class="txh-big"><span class="txh-num">${esc(big.value)}</span><span class="txh-unit">${big.unit}</span>${big.rest ? `<span class="txh-rest">${esc(big.rest)}</span>` : ''}</div>
            <div class="txh-bigsub">listened${ch ? ` <span class="txh-chg ${s.change > 0 ? 'up' : s.change < 0 ? 'down' : ''}">${esc(ch)} ${esc(s.prevName)}</span>` : ''}</div>
            <div class="txh-bars">${bars}</div><div class="txh-labels">${labels}</div>
          </div>
          <div class="txh-tiles">${tiles.map(([ic, v, l]) => `<div>${icon(ic)}<b>${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
          ${facts.length ? `<div class="txh-facts">${facts.map(([ic, k, v]) => `<div>${icon(ic)}<span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
          <div class="txh-sec"><h2 class="txh-h2">Books ${R.kind === 'day' ? 'today' : 'this ' + R.kind}${cur ? '' : ''}</h2>${books}</div>${pickHtml}`
      }
      R.el.innerHTML = `<h1 class="txh-h1">${'<span class="material-symbols">insights</span>'}Reading history${R.loading && R.h ? ' <span class="txh-note">updating…</span>' : ''}</h1>${body}`
    }

    function onClick(e) {
      const b = e.target.closest('[data-txh]')
      if (!b || !R.h) return
      const rh = RH()
      const what = b.getAttribute('data-txh')
      if (what === 'kind') {
        R.kind = b.getAttribute('data-id')
        try {
          localStorage.setItem('absplus-reading-history-kind', R.kind)
        } catch (err) {}
      } else if (what === 'prev') R.anchor = rh.stepPeriod(R.kind, R.anchor, -1)
      else if (what === 'next') R.anchor = rh.stepPeriod(R.kind, R.anchor, 1)
      else if (what === 'now') R.anchor = Date.now()
      else if (what === 'book') return nuxt().$router.push(`/item/${b.getAttribute('data-id')}`)
      render()
    }

    return { ensure }
  })()
  setInterval(READHIST.ensure, 1000)

  // ------------------------------------------------------------------ "Based on your recent readings" (home page)
  //
  // A row on the library's home page, after Continue Listening: books you haven't started, like the ones you've
  // listened to lately (same series, author, Dewey subject, narrator, genres). The same picks as the app's home
  // page (absplus-views.js → recommend).
  const RECS = (() => {
    const R = { el: null, lib: null, recs: null, at: 0, loading: false }
    const nuxt = () => window.$nuxt
    const route = () => (nuxt() && nuxt().$route ? nuxt().$route.path : location.pathname)
    const base = () => (nuxt() && nuxt().$config && nuxt().$config.routerBasePath) || ''
    const libHome = () => {
      const m = route().match(/\/library\/([^/]+)\/?$/)
      return m ? m[1] : null
    }
    const cover = (id) => `${base()}/api/items/${encodeURIComponent(id)}/cover?width=240`

    function ensure() {
      const lib = libHome()
      const rec = window.AbsPlusViews && window.AbsPlusViews.recommend
      if (!lib || !rec) return
      if (lib !== R.lib) {
        R.lib = lib
        R.recs = null
        R.at = 0
      }
      if (!R.recs && !R.loading) return load(lib)
      if (!R.recs || !R.recs.length) return
      // after the Continue Listening row (or first, when there isn't one)
      const rows = [...document.querySelectorAll('.bookshelf-row')].filter((r) => r !== R.el)
      if (!rows.length) return
      const cl = rows.find((r) => /continue listening/i.test((r.querySelector('h2') || {}).textContent || ''))
      const anchor = cl || rows[0]
      if (!R.el) {
        R.el = document.createElement('div')
        R.el.className = 'w-full bookshelf-row pl-8e my-6e txr'
        R.el.addEventListener('click', onClick)
      }
      if (R.el.dataset.lib !== lib) render()
      const other = document.querySelector('.bookshelf-row:not(.txr) [id^="cover-area-"]')
      if (other) {
        const w = Math.round(other.getBoundingClientRect().width)
        if (w && R.el.style.getPropertyValue('--txr-w') !== w + 'px') R.el.style.setProperty('--txr-w', w + 'px')
      }
      const want = cl ? anchor.nextSibling : anchor
      if (R.el.parentElement !== anchor.parentElement || (cl ? R.el.previousElementSibling !== anchor : R.el.nextElementSibling !== anchor)) {
        anchor.parentElement.insertBefore(R.el, cl ? want : anchor)
      }
    }

    async function load(lib) {
      R.loading = true
      try {
        const get = (path) => nuxt().$axios.$get(path)
        const recs = await window.AbsPlusViews.recommend(get, lib)
        if (lib === R.lib) {
          R.recs = recs
          R.at = Date.now()
          if (R.el) R.el.dataset.lib = ''
        }
      } catch (e) {
        R.recs = []
      }
      R.loading = false
    }

    function render() {
      if (!R.el) return
      R.el.dataset.lib = R.lib
      R.el.innerHTML = `<div class="flex items-center py-3e"><h2 class="font-semibold text-gray-100">Based on Your Recent Readings</h2> <div class="grow"></div> <button data-txr-nav="-1" aria-label="Scroll Left" class="w-8e h-8e mx-1e flex items-center justify-center rounded-full text-white/40 cursor-text"><span class="material-symbols" style="font-size: 1.5em;">chevron_left</span></button> <button data-txr-nav="1" aria-label="Scroll Right" class="w-8e h-8e mx-1e flex items-center justify-center rounded-full hover:bg-white/5 text-gray-300 hover:text-white"><span class="material-symbols" style="font-size: 1.5em;">chevron_right</span></button></div><div class="txr-row w-full overflow-y-hidden overflow-x-auto no-scroll" style="scroll-behavior: smooth;">${(R.recs || [])
        .map((r) => {
          const md = (r.item.media && r.item.media.metadata) || {}
          return `<button class="txr-card" data-txr="${esc(r.item.id)}" title="${esc(md.title || '')}"><span class="txr-cover rounded-sm box-shadow-book"><img src="${cover(r.item.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"></span><span class="txr-title truncate">${esc(md.title || '')}</span><span class="txr-author truncate text-gray-400">${esc(md.authorName || '')}</span><span class="txr-why truncate">${esc(r.reason)}</span></button>`
        })
        .join('')}</div>`
      const row = R.el.querySelector('.txr-row')
      if (row) row.addEventListener('scroll', navState, { passive: true })
      setTimeout(navState, 50)
    }

    /** The arrows look like the other rows': white when there's more that way, faded when not */
    function navState() {
      const row = R.el && R.el.querySelector('.txr-row')
      if (!row) return
      const can = { '-1': row.scrollLeft > 2, 1: row.scrollLeft + row.clientWidth < row.scrollWidth - 2 }
      R.el.querySelectorAll('[data-txr-nav]').forEach((b) => (b.className = can[b.getAttribute('data-txr-nav')] ? 'w-8e h-8e mx-1e flex items-center justify-center rounded-full hover:bg-white/5 text-gray-300 hover:text-white' : 'w-8e h-8e mx-1e flex items-center justify-center rounded-full text-white/40 cursor-text'))
    }

    function onClick(e) {
      const nav = e.target.closest('[data-txr-nav]')
      if (nav) {
        const row = R.el.querySelector('.txr-row')
        if (row) row.scrollLeft += Number(nav.getAttribute('data-txr-nav')) * row.clientWidth * 0.8
        return
      }
      const b = e.target.closest('[data-txr]')
      if (b) nuxt().$router.push(`/item/${b.getAttribute('data-txr')}`)
    }

    return { ensure }
  })()
  setInterval(RECS.ensure, 1000)



  // ------------------------------------------------------------------ Read along in the panel (Readium), like the app
  //
  // EPUB books: the book itself inside the Transcription panel, next to Lyrics and Karaoke, the narrated word
  // highlighted (the same Readium reader the ABS+ app uses: /_abs_transcription/readium.html). It loads and
  // follows the narration in the background, so switching to it is instant.
  // Paused: a book button on the right puts the audiobook aside — the audio controls go, the full reader's
  // controls come (contents and pages, page slider, first / previous / page of pages / next / last, Book or
  // Doc view) and holding a word looks it up (the word stays marked while its meaning shows).
  // Other formats (PDF, MOBI) keep opening Audiobookshelf's own reader.
  const RA2 = (() => {
    const R = { font: Number(localStorage.getItem('absTxRaFont')) || 100, marks: [], api: null, loadedFor: null, aligned: false, busy: false, msg: '', page: 0, total: 0, chapter: '', toc: [], follow: true, book: false, flow: localStorage.getItem('absTxRaFlow') === 'scrolled' ? 'scrolled' : 'paginated', side: false, tab: 'contents', goto: false, sliding: null, frameReady: null }
    const svg = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`
    const I = {
      first: 'M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z',
      prev: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
      next: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
      last: 'M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z',
      close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      side: 'M16 20H2V4h14v16zm2-12h4V4h-4v4zm0 12h4v-4h-4v4zm0-6h4v-4h-4v4z',
      book: 'M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z',
      doc: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
      hash: 'M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z',
      mark: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z',
      marked: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z',
      textDown: 'M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z',
      textUp: 'M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z',
      del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
    }
    const base = () => (window.$nuxt && window.$nuxt.$config && window.$nuxt.$config.routerBasePath) || ''
    let box = null
    const q = (sel) => box && box.querySelector(sel)

    const isEpub = () => S.ebookFormat === 'epub'
    const shown = () => S.open && S.viewMode === 'readalong' && isEpub()

    function theme() {
      const cs = getComputedStyle(root)
      const bg = cs.backgroundColor || '#232323'
      const fg = cs.color || '#ffffff'
      const light = /rgb\((\d+), (\d+), (\d+)/.test(bg) && (() => {
        const m = bg.match(/(\d+), (\d+), (\d+)/)
        return 0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3] > 150
      })()
      const eink = ADAPT.profile().eink
      return { bg, fg, highlight: eink ? (light ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.3)') : light ? 'rgba(255,193,7,.5)' : 'rgba(255,213,79,.38)', eink }
    }

    function settings() {
      const p = ADAPT.profile()
      return { flow: R.flow, fontScale: R.font, lineSpacing: 140, justify: true, hyphenate: true, turnAnimation: 'slide', animate: shown() && !p.eink && p.level !== 0 }
    }

    /** The view's DOM, once (inside the panel, where Lyrics and Karaoke are) */
    function ensure() {
      if (box) return box
      box = els.ra2
      box.innerHTML = `
        <div class="tra-top" data-r="top">
          <button class="tra-ibtn" data-ra="side" title="Pages and contents">${svg(I.side)}</button>
          <p class="tra-title" data-r="title"></p>
          <button class="tra-ibtn" data-ra="mark" data-r="mark" title="Bookmark this page">${svg(I.mark)}</button>
          <button class="tra-ibtn" data-ra="search" title="Search in book">${svg('M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z')}</button>
          <button class="tra-ibtn" data-ra="smaller" title="Smaller text">${svg(I.textDown)}</button>
          <button class="tra-ibtn" data-ra="larger" title="Larger text">${svg(I.textUp)}</button>
          <button class="tra-ibtn" data-ra="exit" title="Close">${svg(I.close)}</button>
        </div>
        <div class="tra-stage">
          <iframe data-r="frame" title="Read along" src="${base()}/_abs_transcription/readium.html"></iframe>
          <div class="tra-msg" data-r="msg"></div>
        </div>
        <div class="tra-bottom" data-r="bottom">
          <div class="tra-slider"><div class="tra-ticks">${Array.from({ length: 13 }, (_, i) => `<span style="left:${(i / 12) * 100}%"></span>`).join('')}</div><input type="range" min="1" max="1" value="1" data-r="slider" aria-label="Page"></div>
          <div class="tra-row">
            <button class="tra-box" data-ra="first" title="First page">${svg(I.first, 18)}</button>
            <button class="tra-box" data-ra="prev" title="Previous page">${svg(I.prev, 18)}</button>
            <button class="tra-pos" data-ra="pos" data-r="pos" title="Type a page number">1 of 1</button>
            <input class="tra-pos tra-posin" data-r="posin" inputmode="numeric" enterkeyhint="go" style="display:none">
            <button class="tra-box" data-ra="next" title="Next page">${svg(I.next, 18)}</button>
            <button class="tra-box" data-ra="last" title="Last page">${svg(I.last, 18)}</button>
            <span style="flex:1"></span>
            <div class="tra-modes"><button data-ra="flow" data-flow="paginated" title="Book view: pages you turn">${svg(I.book, 16)}</button><button data-ra="flow" data-flow="scrolled" title="Doc view: one scrolling page">${svg(I.doc, 16)}</button></div>
          </div>
        </div>
        <button class="tra-bookbtn" data-ra="book" data-r="bookbtn" title="Read the book without the audiobook">${svg(I.book, 26)}</button>
        <button class="tra-listenbtn" data-ra="listen" data-r="listenbtn" title="Listen to the audiobook from this page">${svg('M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z', 26)}</button>
        <div class="tra-side" data-r="side"></div>
        <div class="tra-goto" data-r="goto"></div>`
      box.addEventListener('click', onClick)
      box.addEventListener('pointerdown', (e) => R.book && e.target.closest('.tra-top, .tra-bottom, .tra-side') && fade.show())
      const slider = q('[data-r="slider"]')
      slider.addEventListener('input', () => {
        R.sliding = Number(slider.value)
        q('[data-r="pos"]').textContent = `${R.sliding} of ${R.total}`
      })
      slider.addEventListener('change', () => {
        const n = Number(slider.value)
        R.sliding = null
        if (R.api) R.api.goToPage(n)
      })
      const posin = q('[data-r="posin"]')
      const endPos = (go) => {
        const n = parseInt(posin.value, 10)
        posin.style.display = 'none'
        q('[data-r="pos"]').style.display = ''
        if (go && !isNaN(n) && R.api) R.api.goToPage(Math.max(1, Math.min(R.total, n)))
      }
      posin.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') endPos(true)
        else if (e.key === 'Escape') endPos(false)
      })
      posin.addEventListener('blur', () => endPos(false))
      const frame = q('[data-r="frame"]')
      R.frameReady = new Promise((res) => {
        frame.addEventListener('load', () => {
          const w = frame.contentWindow
          w.absHost = onEvent
          R.api = w.ReadiumAPI || null
          res()
        })
      })
      return box
    }

    function render() {
      if (!box) return
      const reading = R.book
      root.classList.toggle('tx-book', reading && shown())
      playerBarUpdate()
      q('[data-r="top"]').style.display = reading && R.total ? '' : 'none'
      q('[data-r="bottom"]').style.display = reading && R.total ? '' : 'none'
      q('[data-r="title"]').textContent = S.title || ''
      const marked = R.marks.some((m) => m.page === R.page)
      const mk = q('[data-r="mark"]')
      mk.innerHTML = svg(marked ? I.marked : I.mark)
      mk.classList.toggle('tra-acc', marked)
      const msg = q('[data-r="msg"]')
      msg.style.display = R.msg ? '' : 'none'
      msg.innerHTML = R.msg ? `${R.busy ? '<div class="tra-spin"></div>' : ''}<p>${esc(R.msg)}</p>` : ''
      // the narration has left the book (improvised / not in this edition): read along picks up again where they match
      let ob = box.querySelector('.tra-offbook')
      if (!ob) {
        ob = document.createElement('div')
        ob.className = 'tra-offbook'
        ob.textContent = 'Narration differs from the book here · picks up again'
        ob.style.cssText = 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:5;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;background:var(--tx-card,#222);color:inherit;border:1px solid var(--tx-btn,#444);box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none;white-space:nowrap'
        box.appendChild(ob)
      }
      ob.style.display = R.offBook && !R.book && !R.msg ? '' : 'none'
      const slider = q('[data-r="slider"]')
      slider.max = String(Math.max(1, R.total))
      if (R.sliding === null) slider.value = String(R.page || 1)
      q('[data-r="pos"]').textContent = `${R.sliding !== null ? R.sliding : R.page || 1} of ${R.total || 1}`
      q('[data-r="posin"]').placeholder = `${R.page || 1} of ${R.total || 1}`
      box.querySelectorAll('[data-ra="flow"]').forEach((b) => b.classList.toggle('tra-on', b.getAttribute('data-flow') === R.flow))
      // the book button: read along, audio paused, not reading already
      q('[data-r="bookbtn"]').style.display = shown() && !reading && R.total && !player.isPlaying() ? '' : 'none'
      // reading mode: the audiobook button (books with audio) — listen from this page
      q('[data-r="listenbtn"]').style.display = shown() && reading && R.total && bookHasAudio() ? '' : 'none'
      renderSide()
      renderGoto()
    }

    function flatToc() {
      const out = []
      const walk = (list, depth) => (list || []).forEach((t) => {
        if (t.href) out.push({ title: t.title, href: t.href, page: t.page || null, depth })
        walk(t.children, depth + 1)
      })
      walk(R.toc, 0)
      return out
    }

    function renderSide() {
      const el = q('[data-r="side"]')
      if (!R.side) {
        el.style.display = 'none'
        el.innerHTML = ''
        return
      }
      el.style.display = ''
      const toc = flatToc()
      let cur = -1
      toc.forEach((t, i) => {
        if (t.page && t.page <= R.page && (cur < 0 || t.page >= toc[cur].page)) cur = i
      })
      let list = ''
      if (R.tab === 'search') {
        const res = R.results || []
        list = `<div class="tra-searchbar"><input type="search" data-r="sq" placeholder="Search in book" enterkeyhint="search" value="${esc(R.query || '')}"></div>${R.searching ? '<p class="tra-none">Searching…</p>' : R.searched ? `<p class="tra-none">${res.length}${res.length >= 300 ? '+' : ''} result${res.length === 1 ? '' : 's'}</p>` : ''}${res.map((r, i) => `<div class="tra-result" data-ra="result" data-i="${i}"><p class="tra-rmeta">${esc(r.chapter ? r.chapter + ' · ' : '')}page ${r.page}</p><p>…${esc(r.pre)}<mark>${esc(r.match)}</mark>${esc(r.post)}…</p></div>`).join('')}`
      } else if (R.tab === 'contents') {
        list = toc.length ? toc.map((t, i) => `<button class="tra-toc${i === cur ? ' tra-cur' : ''}" data-ra="toc" data-i="${i}" style="padding-left:${16 + t.depth * 16}px"><span>${esc(t.title)}</span>${t.page ? `<em>${t.page}</em>` : ''}</button>`).join('') : '<p class="tra-none">This book has no table of contents.</p>'
      } else if (R.tab === 'bookmarks') {
        list = R.marks.length ? R.marks.map((m) => `<div class="tra-mark" data-ra="page" data-n="${m.page}"><span class="tra-acc">${svg(I.marked, 20)}</span><p>${esc(m.chapter || '')}${m.chapter ? ' · ' : ''}page ${m.page}</p><button class="tra-ibtn" data-ra="unmark" data-n="${m.page}" title="Remove bookmark">${svg(I.del, 20)}</button></div>`).join('') : '<p class="tra-none" style="text-align:center;margin-top:40px">No bookmarks yet. Tap the bookmark icon at the top to mark a page.</p>'
      } else {
        const marks = []
        toc.forEach((t) => t.page && t.depth === 0 && !marks.some((m) => m.page === t.page) && marks.push({ page: t.page, title: t.title }))
        marks.sort((a, b) => a.page - b.page)
        if (!marks.length || marks[0].page > 1) marks.unshift({ page: 1, title: 'Start' })
        list = marks
          .map((m, i) => {
            const end = i + 1 < marks.length ? marks[i + 1].page - 1 : R.total
            let cells = ''
            for (let n = m.page; n <= end; n++) cells += `<button class="tra-pg${n === R.page ? ' tra-cur' : ''}" data-ra="page" data-n="${n}">${n}</button>`
            return `<p class="tra-grouphead">${esc(m.title)}</p><div class="tra-grid">${cells}</div>`
          })
          .join('')
      }
      el.innerHTML = `<div class="tra-sidepanel" data-stop>
          <div class="tra-sidehead"><div class="tra-tabs">${['contents', 'pages', 'bookmarks', 'search'].map((t) => `<button data-ra="tab" data-tab="${t}" class="${R.tab === t ? 'tra-on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div><button class="tra-ibtn" data-ra="side-close" title="Close">${svg(I.close)}</button></div>
          <p class="tra-sidesub">${esc(S.title || '')} · page ${R.page} of ${R.total}</p>
          <div class="tra-sidelist" data-r="sidelist">${list}</div>
        </div>`
      requestAnimationFrame(() => {
        const c = el.querySelector('.tra-cur')
        if (c) c.scrollIntoView({ block: 'center' })
      })
      const sq = el.querySelector('[data-r="sq"]')
      if (sq)
        sq.addEventListener('keyup', async (e) => {
          if (e.key !== 'Enter' || !R.api) return
          R.query = sq.value
          if (R.query.trim().length < 2) return
          R.searching = true
          renderSide()
          try {
            R.results = await R.api.search(R.query)
          } catch (err) {
            R.results = []
          }
          R.searching = false
          R.searched = true
          renderSide()
        })
    }

    function renderGoto() {
      const el = q('[data-r="goto"]')
      if (!R.goto) {
        el.style.display = 'none'
        return
      }
      if (el.style.display === '') return
      el.style.display = ''
      el.innerHTML = `<div class="tra-sheet" data-stop><div class="tra-sheethead"><p>Go to page</p><button class="tra-ibtn" data-ra="goto-close" title="Close">${svg(I.close)}</button></div>
        <div class="tra-gorow"><input type="range" min="1" max="${R.total}" value="${R.page || 1}" data-r="gorange"><input type="number" min="1" max="${R.total}" value="${R.page || 1}" data-r="gonum"></div>
        <p class="tra-none">of ${R.total} pages</p><button class="tra-go" data-ra="go">Go to page ${R.page || 1}</button></div>`
      const range = el.querySelector('[data-r="gorange"]')
      const num = el.querySelector('[data-r="gonum"]')
      const goBtn = el.querySelector('[data-ra="go"]')
      const sync = (v) => {
        range.value = v
        num.value = v
        goBtn.textContent = `Go to page ${v}`
      }
      range.addEventListener('input', () => sync(range.value))
      num.addEventListener('input', () => sync(num.value))
      num.addEventListener('keyup', (e) => e.key === 'Enter' && goBtn.click())
    }

    function onClick(e) {
      const b = e.target.closest('[data-ra]')
      if (!b) {
        // a click on the dimmed area beside the side panel or sheet closes it
        if (e.target.closest('[data-r="side"]') && !e.target.closest('[data-stop]')) R.side = false
        else if (e.target.closest('[data-r="goto"]') && !e.target.closest('[data-stop]')) R.goto = false
        return render()
      }
      e.stopPropagation()
      const a = b.getAttribute('data-ra')
      const api = R.api
      switch (a) {
        case 'book':
          return setBook(true)
        case 'exit':
          return playHere()
        case 'listen':
          return playHere()
        case 'side':
          R.side = true
          return render()
        case 'side-close':
          R.side = false
          return render()
        case 'tab':
          R.tab = b.getAttribute('data-tab')
          return render()
        case 'toc': {
          const t = flatToc()[Number(b.getAttribute('data-i'))]
          R.side = false
          render()
          return t && api && api.goToHref(t.href)
        }
        case 'page':
          R.side = false
          render()
          return api && api.goToPage(Number(b.getAttribute('data-n')))
        case 'goto':
          R.goto = true
          return render()
        case 'pos': {
          const inp = q('[data-r="posin"]')
          inp.value = ''
          b.style.display = 'none'
          inp.style.display = ''
          return inp.focus()
        }
        case 'search':
          R.side = true
          R.tab = 'search'
          render()
          return requestAnimationFrame(() => {
            const i = q('[data-r="sq"]')
            if (i) i.focus()
          })
        case 'result': {
          const r = (R.results || [])[Number(b.getAttribute('data-i'))]
          R.side = false
          render()
          return r && api && api.goToResult(r)
        }
        case 'goto-close':
          R.goto = false
          return render()
        case 'go': {
          const n = Number(q('[data-r="gonum"]').value) || 1
          R.goto = false
          render()
          return api && api.goToPage(Math.max(1, Math.min(R.total, Math.round(n))))
        }
        case 'mark': {
          if (R.marks.some((m) => m.page === R.page)) R.marks = R.marks.filter((m) => m.page !== R.page)
          else R.marks = R.marks.concat({ page: R.page, chapter: R.chapter || '' }).sort((a, b) => a.page - b.page)
          localStorage.setItem(`absTxRaMarks:${S.key}`, JSON.stringify(R.marks))
          return render()
        }
        case 'unmark': {
          const n = Number(b.getAttribute('data-n'))
          R.marks = R.marks.filter((m) => m.page !== n)
          localStorage.setItem(`absTxRaMarks:${S.key}`, JSON.stringify(R.marks))
          return render()
        }
        case 'smaller':
        case 'larger':
          R.font = Math.max(70, Math.min(200, R.font + (a === 'larger' ? 10 : -10)))
          localStorage.setItem('absTxRaFont', String(R.font))
          return api && api.setTheme(null, { fontScale: R.font })
        case 'first':
          return api && api.goToPage(1)
        case 'last':
          return api && api.goToPage(R.total)
        case 'prev':
          return api && api.prev()
        case 'next':
          return api && api.next()
        case 'flow': {
          const f = b.getAttribute('data-flow')
          if (f === R.flow) return
          R.flow = f
          localStorage.setItem('absTxRaFlow', f)
          render()
          return api && api.setTheme(null, { flow: f })
        }
      }
    }

    function onEvent(type, d) {
      if (type === 'position') {
        R.page = d.page
        R.total = d.total
        R.chapter = d.chapter
        try {
          localStorage.setItem(`absTxRaPos:${S.key}`, JSON.stringify({ section: d.section, progression: d.progression }))
        } catch (e) {}
      } else if (type === 'ready') {
        R.toc = d.toc || []
        R.total = d.total
      } else if (type === 'follow') R.follow = d.follow
      else if (type === 'offbook') R.offBook = !!(d && d.off)
      else if (type === 'noaudio') {
        toast('info', "No audio attached to this part: the narrator doesn't read it.")
        return
      }
      else if (type === 'added' && d && d.text) {
        // a tap on a red marker: what the narrator says there that the book doesn't have
        window.alert(`Added in the audiobook

The narrator says this here, but it isn't in the book:

“${d.text}”`)
        return
      }
      else if (type === 'status') {
        if (d.state === 'aligning') {
          R.busy = true
          R.msg = `Lining up the book with the narration… ${Math.round((d.progress || 0) * 100)}%`
        } else if (d.state === 'ready') {
          R.busy = false
          R.msg = ''
          R.aligned = true
          // once per book: the book and the audiobook can differ in places
          try {
            const k = `absTxRaVary:${S.key}`
            if (!localStorage.getItem(k)) {
              localStorage.setItem(k, '1')
              toast('info', 'The book may differ from the audiobook in places: narrators sometimes improvise, and editions can add or leave out lines. Read along pauses there and picks up again where they match.')
            }
          } catch (e) {}
        } else if (d.state === 'no-transcript') {
          R.busy = false
          R.msg = R.book ? '' : 'Read along needs a transcript: transcribe this audiobook first.'
        } else if (d.reason === 'fixed-layout') {
          R.busy = false
          R.msg = "This book has fixed pages (like a picture book), so read along can't follow the words."
        } else {
          R.busy = false
          R.msg = ''
          toast('info', "Read along: the narration doesn't match this book's text closely enough.")
        }
      } else if (type === 'tap') {
        if (R.book) fade.toggle() // a tap in the middle of the page: the bars come and go
        return
      } else if (type === 'position') {
        return
      } else if (type === 'seek') {
        player.seek(d.t)
      } else if (type === 'lookup') {
        // reading mode only (the reader checks): the word stays marked while its meaning shows
        DICT.show(d.word, bookLanguage())
        DICT.onClose(() => R.api && R.api.clearLookup())
      }
      render()
    }

    /** Opens the book for [item] (in the background too, so it's ready when shown) */
    async function load(item) {
      if (!item || !isEpub()) return
      ensure()
      await R.frameReady
      const key = `${item.id}|${S.key}`
      if (R.loadedFor === key || !R.api) return
      R.loadedFor = key
      R.aligned = false
      try {
        R.marks = JSON.parse(localStorage.getItem(`absTxRaMarks:${S.key}`) || '[]') || []
      } catch (e) {
        R.marks = []
      }
      R.busy = true
      R.msg = 'Opening the book…'
      R.total = 0
      render()
      try {
        const nuxt = window.$nuxt
        let blob
        const total = (item.media && item.media.ebookFile && item.media.ebookFile.metadata && item.media.ebookFile.metadata.size) || 0
        const mbOf = (b) => Math.round(b / 1e6)
        if (nuxt && nuxt.$axios)
          blob = (
            await nuxt.$axios.get(`/api/items/${encodeURIComponent(item.id)}/ebook`, {
              responseType: 'blob',
              onDownloadProgress: (p) => {
                const all = p.total || total
                if (all > 8e6 && R.loadedFor === key) {
                  R.msg = `Getting the book… ${mbOf(p.loaded)} of ${mbOf(all)} MB`
                  render()
                }
              }
            })
          ).data
        else {
          const token = localStorage.getItem('token')
          const r = await fetch(`${base()}/api/items/${encodeURIComponent(item.id)}/ebook`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
          if (!r.ok) throw new Error(`the server answered ${r.status}`)
          blob = await r.blob()
        }
        if (R.loadedFor !== key) return
        let start = null
        try {
          start = JSON.parse(localStorage.getItem(`absTxRaPos:${S.key}`) || 'null')
        } catch (e) {}
        await R.api.open(blob, { theme: theme(), settings: settings(), start })
        if (R.loadedFor !== key) return
        R.api.setPlaying(player.isPlaying())
        R.api.setReading(R.book)
        R.msg = 'Lining up the book with the narration…'
        render()
        let lines = (S.lines || []).slice().sort((a, b) => a.s - b.s)
        // Read along picked before the transcript finished loading: wait for it (it used to give up and say
        // the book had no transcript)
        if (!lines.length && (S.loading || (S.status && S.status.status && S.status.status !== 'none'))) {
          R.msg = 'Loading the transcription…'
          render()
          for (let i = 0; i < 240 && !(S.lines || []).length && R.loadedFor === key; i++) await new Promise((r) => setTimeout(r, 500))
          if (R.loadedFor !== key) return
          lines = (S.lines || []).slice().sort((a, b) => a.s - b.s)
          R.msg = 'Lining up the book with the narration…'
          render()
        }
        if (!lines.length) {
          R.busy = false
          R.msg = R.book ? '' : 'Read along needs a transcript: transcribe this audiobook first.'
          return render()
        }
        await R.api.setTranscript(lines)
      } catch (e) {
        R.busy = false
        R.msg = `Couldn't open the book: ${e.message}`
        R.loadedFor = null
        render()
      }
    }

    /** ✕ in reading mode: listen from the first word on this page, and follow the narration from there */
    async function playHere() {
      if (!bookHasAudio()) {
        setBook(false)
        return close()
      }
      let t = null
      try {
        t = R.api && R.api.timeHere ? R.api.timeHere() : null
      } catch (e) {}
      if (!(typeof t === 'number' && isFinite(t))) t = null
      setBook(false)
      cueAudio(S.key, t !== null ? t : null)
      // the panel follows the player from now on
      S.reading = false
      renderAll()
      setTimeout(() => R.api && R.api.follow(), 1200)
    }

    const fade = fadingBars((h) => box && box.classList.toggle('tra-faded', h))
    function setBook(on) {
      R.book = !!on
      if (on) fade.show()
      else fade.reset()
      R.side = false
      R.goto = false
      DICT.close()
      if (R.api) R.api.setReading(R.book)
      render()
      window.dispatchEvent(new Event('resize'))
    }

    let lastPlaying = null
    let lastAnimate = null
    /** Every clock tick (shown or not): follow the narration */
    function tick(t) {
      if (!R.api || !box) return
      const playing = player.isPlaying()
      if (playing !== lastPlaying) {
        lastPlaying = playing
        R.api.setPlaying(playing)
        if (playing && R.book) setBook(false) // the audio is back: follow it again
        render()
      }
      const animate = settings().animate
      if (animate !== lastAnimate) {
        lastAnimate = animate
        R.api.setTheme(null, { animate })
      }
      if (R.aligned) R.api.setTime((t || 0) + 0.12)
    }

    /** Lyrics / Karaoke / Read along switch */
    function show(on) {
      ensure()
      box.classList.toggle('tra-shown', !!on)
      if (!on && R.book) setBook(false)
      if (on) {
        load(S.item || player.libraryItem())
        if (R.api) R.api.setTheme(theme(), settings())
      }
      render()
    }

    /** Match the open book to the narration again, ignoring the saved result (⋮ → Re-align read along) */
    async function realign() {
      const lines = (S.lines || []).slice().sort((a, b) => a.s - b.s)
      if (!R.api || !lines.length) return false
      R.busy = true
      R.aligned = false
      R.msg = 'Lining up the book with the narration again…'
      render()
      await R.api.setTranscript(lines, { fresh: true })
      return true
    }
    return { load, tick, show, render, isEpub, ensure, setBook, realign, reset: () => (R.loadedFor = null), get book() { return R.book } }
  })()

  // ------------------------------------------------------------------ Read along (web player's e-book reader)
  //
  // Opened from Transcription → Read along: Audiobookshelf's own reader shows the book and the word being
  // narrated is highlighted in it as the audiobook plays, using the transcript's own word times (the same
  // data as <audio>_karaoke.lrc); the reader turns pages / scrolls with the narration; a tap on any word
  // plays from there. The transcript is matched to the book's text with unique 4-word phrases.
  //   EPUB: epub.js pages (highlighted with the CSS Highlight API, pages turned by the reader)
  //   MOBI / AZW3: one long scrolling document (highlighted, scrolled into view)
  //   PDF: page pictures (word boxes worked out from the PDF's text, drawn over the page; pages turned)
  const READALONG = (() => {
    const R = { on: false, key: null, a: null, tTime: [], t2e: null, e2t: null, lastUserNav: 0, programmatic: 0, raf: 0, chip: null, lastE: -1 }
    const wre = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
    const nrm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')
    const BLOCKS = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|TD|TH|SECTION|ARTICLE|BODY|DD|DT|PRE|FIGCAPTION|TR|TABLE|UL|OL)$/
    const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|RT|RP)$/
    const HL_CSS = '::highlight(abs-readalong){background-color:rgba(255,196,0,.45);color:inherit}'

    /** Is the point actually on the word around a caret (not snapped there from blank space)? */
    function pointOnWord(range, x, y) {
      const node = range && range.startContainer
      if (!node || node.nodeType !== 3) return false
      const text = node.data
      let a = range.startOffset
      let b = range.startOffset
      const isW = (ch) => /[\p{L}\p{N}'’]/u.test(ch || '')
      while (a > 0 && isW(text[a - 1])) a--
      while (b < text.length && isW(text[b])) b++
      if (a === b) return false
      const r = node.ownerDocument.createRange()
      r.setStart(node, a)
      r.setEnd(node, b)
      return [...r.getClientRects()].some((q) => x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2)
    }

    /** Words of a document in reading order; a word split by styling (drop caps) counts once */
    function docWords(doc) {
      const out = []
      const root = doc && (doc.body || doc.documentElement)
      if (!root) return out
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (SKIP.test(p.nodeName || '')) return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        }
      })
      const blockOf = (node) => {
        let p = node.parentNode
        while (p && p !== root && !BLOCKS.test((p.nodeName || '').toUpperCase())) p = p.parentNode
        return p
      }
      let join = null
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (join && blockOf(join.node) !== blockOf(node)) join = null
        const re = wre()
        let m
        let first = true
        while ((m = re.exec(node.data)) !== null) {
          if (first && join && m.index === 0) {
            join.n += nrm(m[0])
            first = false
            if (m.index + m[0].length === node.data.length) continue
            join = null
            continue
          }
          first = false
          const w = { node, start: m.index, end: m.index + m[0].length, n: nrm(m[0]) }
          out.push(w)
          join = w.end === node.data.length ? w : null
        }
        if (first) join = null
      }
      return out
    }

    /** Transcript words with the engine's word times (estimated from the line when it has none) */
    function transcriptWords(lines) {
      const norms = []
      const times = []
      for (const l of lines) {
        const text = l.t || ''
        const ws = []
        const re = wre()
        let m
        while ((m = re.exec(text)) !== null) ws.push({ n: nrm(m[0]), at: m.index })
        const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
        const measured = []
        if (Array.isArray(l.w))
          for (const [word, s, e] of l.w) {
            const parts = String(word).match(wre()) || []
            parts.forEach((p, i) => measured.push({ n: nrm(p), t: parts.length > 1 ? s + ((e - s) * i) / parts.length : s }))
          }
        let j = 0
        ws.forEach((w, i) => {
          let t = null
          if (measured.length === ws.length) t = measured[i].t
          else
            for (let k = j; k < Math.min(measured.length, j + 4); k++)
              if (measured[k].n === w.n) {
                t = measured[k].t
                j = k + 1
                break
              }
          norms.push(w.n)
          times.push(t != null ? t : l.s + (w.at / Math.max(1, text.length)) * (end - l.s))
        })
      }
      return { norms, times }
    }

    /** Index map a -> b through matched pairs, straight lines in between */
    function mapThrough(pairs, lenA, lenB, swap, offBook) {
      const P = swap ? pairs.map(([x, y]) => [y, x]).sort((p, q) => p[0] - q[0]) : pairs
      const out = new Int32Array(lenA)
      let k = 0
      for (let a = 0; a < lenA; a++) {
        while (k + 1 < P.length && P[k + 1][0] <= a) k++
        const p0 = P[k]
        const p1 = P[k + 1]
        let b
        if (a <= P[0][0]) b = P[0][1] - (P[0][0] - a)
        else if (!p1) b = p0[1] + (a - p0[0])
        // between matches: follow word for word from the last one, never past the next (the narrator skipping
        // or adding lines used to spread the highlight out and run it ahead of the voice)
        else if (p1[0] - p0[0] === p1[1] - p0[1]) b = p0[1] + (a - p0[0])
        else b = Math.min(p0[1] + (a - p0[0]), p1[1] - 1)
        if (offBook && p1 && a > p0[0]) offBook[a] = p1[0] - p0[0] - (p1[1] - p0[1]) >= 6 && a - p0[0] >= p1[1] - p0[1] ? 1 : 0
        out[a] = Math.max(0, Math.min(lenB - 1, b))
      }
      return out
    }

    function vmNamed(re) {
      const root = window.$nuxt && window.$nuxt.$root
      const stack = root ? [root] : []
      while (stack.length) {
        const vm = stack.pop()
        if (!vm._isDestroyed && re.test(vm.$options.name || vm.$options._componentTag || '')) return vm
        if (vm.$children) stack.push(...vm.$children)
      }
      return null
    }

    function setHighlight(win, range) {
      if (!win || !win.CSS || !win.CSS.highlights || !win.Highlight) return
      if (range) win.CSS.highlights.set('abs-readalong', new win.Highlight(range))
      else win.CSS.highlights.delete('abs-readalong')
    }
    function addHighlightStyle(doc) {
      if (!doc || doc.__absRaStyle) return
      doc.__absRaStyle = true
      const st = doc.createElement('style')
      st.textContent = HL_CSS
      ;(doc.head || doc.documentElement).appendChild(st)
    }
    const following = () => player.isPlaying() && Date.now() - R.lastUserNav > 6000

    // ---------------------------------------------------------------- EPUB (epub.js)
    function epubAdapter(vm) {
      const book = vm.book
      const rendition = vm.rendition
      const secStart = []
      const eSec = []
      const eIdx = []
      const live = new WeakMap()
      const liveWords = (doc) => live.get(doc) || (live.set(doc, docWords(doc)), live.get(doc))
      const display = (target) => {
        R.programmatic = Date.now()
        try {
          rendition.display(target)
        } catch (e) {}
      }
      const contentsFor = (sec) => (rendition.getContents ? rendition.getContents() : []).find((c) => c.sectionIndex === sec)
      function rangeOf(e) {
        const c = contentsFor(eSec[e])
        const w = c && liveWords(c.document)[eIdx[e]]
        if (!w) return null
        const r = c.document.createRange()
        r.setStart(w.node, w.start)
        r.setEnd(w.node, w.end)
        return { c, r }
      }
      function attach(contents) {
        const doc = contents && contents.document
        if (!doc || doc.__absRaTap) return
        doc.__absRaTap = true
        addHighlightStyle(doc)
        DICT.attach(doc, (x, y) => (raBookOk() ? DICT.wordAtPoint(doc, x, y) : null), bookLanguage)
        doc.addEventListener('click', (ev) => {
          if (!R.on) return
          const sel = doc.getSelection && doc.getSelection()
          if (sel && !sel.isCollapsed) return
          const r = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(ev.clientX, ev.clientY) : null
          if (!r || !r.startContainer || r.startContainer.nodeType !== 3 || !pointOnWord(r, ev.clientX, ev.clientY)) return
          const wi = liveWords(doc).findIndex((w) => w.node === r.startContainer && r.startOffset >= w.start && r.startOffset <= w.end)
          if (wi < 0) return
          ev.preventDefault()
          tapped((secStart[contents.sectionIndex] || 0) + wi)
        })
      }
      return {
        async words() {
          await book.ready
          const out = []
          const items = (book.spine && book.spine.spineItems) || []
          for (let s = 0; s < items.length; s++) {
            secStart[s] = out.length
            const it = items[s]
            if (!it || it.linear === false || it.linear === 'no') continue
            let doc = null
            try {
              doc = await it.load(book.load.bind(book))
            } catch (e) {}
            const ws = doc ? docWords(doc.ownerDocument || doc) : []
            ws.forEach((w, i) => {
              out.push(w.n)
              eSec.push(s)
              eIdx.push(i)
            })
            try {
              it.unload()
            } catch (e) {}
            if (!R.on) return null
          }
          if (rendition.hooks && rendition.hooks.content) rendition.hooks.content.register((c) => attach(c))
          ;(rendition.getContents ? rendition.getContents() : []).forEach(attach)
          rendition.on && rendition.on('relocated', () => Date.now() - R.programmatic > 900 && (R.lastUserNav = Date.now()))
          return out
        },
        show(e, follow) {
          const hit = rangeOf(e)
          if (!hit) {
            if (follow && Date.now() - R.programmatic > 1500) {
              const it = book.spine.get(eSec[e])
              if (it) display(it.href)
            }
            return
          }
          attach(hit.c)
          const win = hit.c.document.defaultView
          setHighlight(win, hit.r)
          if (!follow || Date.now() - R.programmatic < 700) return
          const frame = win.frameElement
          const box = (rendition.manager && rendition.manager.container) || frame
          if (!frame || !box) return
          const fr = frame.getBoundingClientRect()
          const br = box.getBoundingClientRect()
          const rr = hit.r.getBoundingClientRect()
          const x = fr.left + rr.left + rr.width / 2
          const y = fr.top + rr.top + rr.height / 2
          if (x < br.left || x > br.right || y < br.top || y > br.bottom) {
            try {
              display(hit.c.cfiFromRange(hit.r))
            } catch (err) {}
          }
        },
        goTo(e) {
          const it = book.spine.get(eSec[e])
          if (it) display(it.href)
          setTimeout(() => {
            const hit = rangeOf(e)
            if (hit)
              try {
                display(hit.c.cfiFromRange(hit.r))
                setHighlight(hit.c.document.defaultView, hit.r)
              } catch (err) {}
          }, 900)
        },
        clear() {
          ;(rendition.getContents ? rendition.getContents() : []).forEach((c) => setHighlight(c.document && c.document.defaultView, null))
        },
        alive: () => !vm._isDestroyed
      }
    }

    // ---------------------------------------------------------------- MOBI / AZW3 (one scrolling document)
    function docAdapter(vm) {
      const viewer = (vm.$el && vm.$el.closest && document.querySelector('.ebook-viewer')) || document.querySelector('.ebook-viewer')
      const frame = viewer && viewer.querySelector('iframe')
      let doc = null
      let words = []
      const scroll = (top) => {
        R.programmatic = Date.now()
        viewer.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      }
      return {
        async words() {
          // The reader fills its page in after opening: wait until the book's text is there
          const filled = () => (doc = frame && frame.contentDocument) && doc.body && doc.body.textContent.trim().length > 200 // textContent: innerText laid out the whole book on every check
          for (let i = 0; i < 150 && !filled(); i++) await new Promise((r) => setTimeout(r, 200))
          if (!filled()) throw new Error("the book's text didn't load")
          addHighlightStyle(doc)
          DICT.attach(doc, (x, y) => (raBookOk() ? DICT.wordAtPoint(doc, x, y) : null), bookLanguage)
          words = docWords(doc)
          viewer.addEventListener('scroll', () => Date.now() - R.programmatic > 900 && (R.lastUserNav = Date.now()), { passive: true })
          doc.addEventListener('click', (ev) => {
            if (!R.on) return
            const sel = doc.getSelection && doc.getSelection()
            if (sel && !sel.isCollapsed) return
            const r = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(ev.clientX, ev.clientY) : null
            if (!r || !r.startContainer || r.startContainer.nodeType !== 3 || !pointOnWord(r, ev.clientX, ev.clientY)) return
            const wi = words.findIndex((w) => w.node === r.startContainer && r.startOffset >= w.start && r.startOffset <= w.end)
            if (wi >= 0) tapped(wi)
          })
          return words.map((w) => w.n)
        },
        show(e, follow) {
          const w = words[e]
          if (!w) return
          const r = doc.createRange()
          r.setStart(w.node, w.start)
          r.setEnd(w.node, w.end)
          setHighlight(doc.defaultView, r)
          if (!follow || Date.now() - R.programmatic < 700) return
          const y = frame.offsetTop + r.getBoundingClientRect().top
          if (y < viewer.scrollTop + 40 || y > viewer.scrollTop + viewer.clientHeight - 60) scroll(y - viewer.clientHeight * 0.3)
        },
        goTo(e) {
          const w = words[e]
          if (!w) return
          const r = doc.createRange()
          r.setStart(w.node, w.start)
          r.setEnd(w.node, w.end)
          setHighlight(doc.defaultView, r)
          scroll(frame.offsetTop + r.getBoundingClientRect().top - viewer.clientHeight * 0.3)
        },
        clear() {
          setHighlight(doc && doc.defaultView, null)
        },
        alive: () => !vm._isDestroyed && document.body.contains(viewer),
        // ---- reading mode bars (one long scrolling page, cut into screens)
        kind: 'mobi',
        page: () => Math.floor((viewer.scrollTop + 4) / Math.max(1, viewer.clientHeight)) + 1,
        total: () => Math.max(1, Math.ceil(viewer.scrollHeight / Math.max(1, viewer.clientHeight))),
        go(n) {
          R.lastUserNav = Date.now()
          viewer.scrollTo({ top: Math.max(0, (n - 1) * viewer.clientHeight) })
        },
        step(d) {
          R.lastUserNav = Date.now()
          viewer.scrollTo({ top: Math.max(0, viewer.scrollTop + d * viewer.clientHeight * 0.95) })
        },
        pageOfNode(node) {
          try {
            const el = node.nodeType === 1 ? node : node.parentElement
            const y = frame.offsetTop + el.getBoundingClientRect().top + viewer.scrollTop - viewer.getBoundingClientRect().top + (viewer.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.offsetTop - frame.offsetTop)
            return Math.floor(Math.max(0, frame.offsetTop + el.getBoundingClientRect().top) / Math.max(1, viewer.clientHeight)) + 1
          } catch (e) {
            return 1
          }
        },
        toc() {
          const chapters = (vm.$parent && vm.$parent.chapters) || []
          const out = []
          const walk = (list, depth) =>
            (list || []).forEach((c) => {
              let page = null
              try {
                const id = String(c.href || '').split('#').pop()
                const el = id && doc && (doc.getElementById(id) || doc.querySelector(`[name="${id}"]`))
                if (el) page = Math.floor(Math.max(0, frame.offsetTop + el.getBoundingClientRect().top + 0) / Math.max(1, viewer.clientHeight)) + 1
              } catch (e) {}
              out.push({ title: c.label || c.title || '…', depth, page, go: () => (vm.$parent && vm.$parent.goToChapter ? vm.$parent.goToChapter(c.href) : page && this.go(page)) })
              walk(c.subitems, depth + 1)
            })
          walk(chapters, 0)
          return out
        },
        search(q) {
          const needle = q.toLowerCase()
          const out = []
          const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
          let n
          while ((n = tw.nextNode()) && out.length < 300) {
            const lower = n.data.toLowerCase()
            let at = lower.indexOf(needle)
            while (at >= 0 && out.length < 300) {
              const r = doc.createRange()
              r.setStart(n, at)
              r.setEnd(n, at + q.length)
              const page = Math.floor(Math.max(0, frame.offsetTop + r.getBoundingClientRect().top) / Math.max(1, viewer.clientHeight)) + 1
              out.push({ page, pre: n.data.slice(Math.max(0, at - 40), at), match: n.data.slice(at, at + q.length), post: n.data.slice(at + q.length, at + q.length + 60), go: () => this.go(page) })
              at = lower.indexOf(needle, at + needle.length)
            }
          }
          return out
        },
        font(delta) {
          const cur = Number(doc.body.dataset.absFont || 100)
          const next = Math.max(70, Math.min(200, cur + delta))
          const at = viewer.scrollTop / Math.max(1, viewer.scrollHeight)
          doc.body.dataset.absFont = String(next)
          doc.body.style.fontSize = `${next}%`
          setTimeout(() => {
            try {
              if (vm.handleIFrameHeight) vm.handleIFrameHeight(frame)
            } catch (e) {}
            frame.style.height = `${doc.documentElement.scrollHeight}px`
            viewer.scrollTop = at * viewer.scrollHeight
          }, 60)
          return next
        },
        firstVisible() {
          const top = viewer.getBoundingClientRect().top
          for (let i = 0; i < words.length; i++) {
            const w = words[i]
            const r = doc.createRange()
            r.setStart(w.node, w.start)
            r.setEnd(w.node, w.end)
            const b = r.getBoundingClientRect()
            if (frame.getBoundingClientRect().top + b.top >= top - 2) return i
          }
          return -1
        }
      }
    }

    // ---------------------------------------------------------------- comics (pictures only: pages, no text)
    function comicAdapter(vm) {
      const cur = () => Number(vm.page != null ? vm.page : vm.currentPage != null ? vm.currentPage : 0)
      const count = () => Number(vm.numPages || (vm.pages && vm.pages.length) || 1)
      const zeroBased = vm.page != null && vm.numPages == null // Audiobookshelf counts comic pages from 0
      const set = (n) => {
        const v = zeroBased ? n - 1 : n
        if (typeof vm.setPage === 'function') vm.setPage(v)
        else if (vm.page != null) vm.page = v
        else vm.currentPage = v
      }
      return {
        kind: 'comic',
        async words() {
          return []
        },
        show() {},
        goTo() {},
        clear() {},
        alive: () => !vm._isDestroyed,
        page: () => (zeroBased ? cur() + 1 : cur() || 1),
        total: count,
        go: (n) => set(Math.max(1, Math.min(count(), n))),
        step(d) {
          if (d > 0 && vm.next) vm.next()
          else if (d < 0 && vm.prev) vm.prev()
          else this.go(this.page() + d)
        },
        toc: () => [],
        search: () => [],
        font: null,
        firstVisible: () => -1
      }
    }

    // ---------------------------------------------------------------- PDF (page pictures)
    /** Read along: a PDF fills the screen's width, like EPUB and MOBI books do (instead of 60% of its height) */
    function fitPdf(readerVm) {
      const fit = () => {
        try {
          if (!readerVm || readerVm._isDestroyed || !readerVm.fitToPageWidth) return
          const want = Math.max(1, (window.innerWidth - 16) / readerVm.fitToPageWidth)
          if (Math.abs((readerVm.scale || 1) - want) > 0.02) readerVm.scale = want
        } catch (e) {}
      }
      fit()
      clearInterval(R.fitTimer)
      R.fitTimer = setInterval(() => (R.on && document.querySelector('#reader') ? fit() : clearInterval(R.fitTimer)), 1000)
    }

    function pdfAdapter(readerVm) {
      const pdfVm = vmNamed(/^pdf$/)
      const pages = [] // pdf.js page objects by page number
      const words = [] // { page, item, s, e, n }
      const itemsOf = [] // page -> text items
      let box = null
      const canvas = () => pdfVm && pdfVm.$el && pdfVm.$el.querySelector('canvas')
      function overlay() {
        if (!box) {
          box = document.createElement('div')
          box.className = 'txr-pdfbox'
          document.body.appendChild(box)
        }
        return box
      }
      /** Where a word is on screen (CSS pixels), or null when its page isn't the one showing */
      function rectOf(w) {
        const cv = canvas()
        const page = pages[w.page]
        const item = itemsOf[w.page] && itemsOf[w.page][w.item]
        if (!cv || !page || !item || readerVm.page !== w.page) return null
        const cr = cv.getBoundingClientRect()
        const base = page.getViewport({ scale: 1, rotation: readerVm.rotate || 0 })
        const vp = page.getViewport({ scale: cr.width / base.width, rotation: readerVm.rotate || 0 })
        const [a, b, c, d, ex, fy] = item.transform
        const [x, y] = vp.convertToViewportPoint(ex, fy)
        const scale = cr.width / base.width
        const h = Math.hypot(c, d) * scale || 12 * scale
        const len = Math.max(1, item.str.length)
        const iw = (item.width || 0) * scale
        return { left: cr.left + x + (iw * w.s) / len, top: cr.top + y - h, width: Math.max(4, (iw * (w.e - w.s)) / len), height: h * 1.2 }
      }
      const pdfNav = {
        kind: 'pdf',
        page: () => readerVm.page || 1,
        total: () => readerVm.numPages || 1,
        go(n) {
          R.lastUserNav = Date.now()
          readerVm.page = Math.max(1, Math.min(readerVm.numPages || 1, n))
        },
        step(d) {
          this.go((readerVm.page || 1) + d)
        },
        toc: () => [],
        search(q) {
          const needle = q.toLowerCase()
          const out = []
          for (const pn of Object.keys(itemsOf)) {
            const text = (itemsOf[pn] || []).map((it) => it.str || '').join(' ')
            const lower = text.toLowerCase()
            let at = lower.indexOf(needle)
            while (at >= 0 && out.length < 300) {
              const page = Number(pn)
              out.push({ page, pre: text.slice(Math.max(0, at - 40), at), match: text.slice(at, at + q.length), post: text.slice(at + q.length, at + q.length + 60), go: () => pdfNav.go(page) })
              at = lower.indexOf(needle, at + needle.length)
            }
          }
          return out.sort((x, y) => x.page - y.page)
        },
        font(delta) {
          readerVm.scale = Math.max(0.5, (readerVm.scale || 1) * (delta > 0 ? 1.1 : 1 / 1.1))
          clearInterval(R.fitTimer) // the person picked a size: stop fitting to the width
          return Math.round(readerVm.scale * 100)
        },
        firstVisible: () => words.findIndex((w) => w.page === readerVm.page)
      }
      return {
        ...pdfNav,
        async words() {
          if (!pdfVm || !pdfVm.pdf || typeof pdfVm.pdf.forEachPage !== 'function') throw new Error("this PDF viewer can't be read along with")
          // The viewer hands pages over one by one and may report done early: wait for all of them
          const collected = []
          const seen = new Set()
          await pdfVm.pdf.forEachPage((page) => {
            if (!seen.has(page.pageNumber)) {
              seen.add(page.pageNumber)
              collected.push(page)
            }
            return page
          })
          const total = readerVm.numPages || 0
          for (let i = 0; i < 300 && collected.length < total && R.on; i++) await new Promise((r) => setTimeout(r, 100))
          collected.sort((x, y) => x.pageNumber - y.pageNumber)
          for (const page of collected) {
            if (!R.on) return null
            pages[page.pageNumber] = page
            const tc = await page.getTextContent()
            itemsOf[page.pageNumber] = tc.items
            tc.items.forEach((it, ii) => {
              const re = wre()
              let m
              while ((m = re.exec(it.str || '')) !== null) words.push({ page: page.pageNumber, item: ii, s: m.index, e: m.index + m[0].length, n: nrm(m[0]), t: m[0] })
            })
          }
          // Tap a word on the page: play from it
          const cv = canvas()
          const host = cv && cv.parentElement
          if (host && !host.__absRaTap) {
            host.__absRaTap = true
            DICT.attach(host, (x, y) => {
              const w = words.find((q) => {
                const r = q.page === readerVm.page && rectOf(q)
                return r && x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height
              })
              return w ? w.t : null
            }, bookLanguage)
            host.addEventListener('click', (ev) => {
              if (!R.on) return
              const hit = words.findIndex((w) => {
                const r = w.page === readerVm.page && rectOf(w)
                return r && ev.clientX >= r.left && ev.clientX <= r.left + r.width && ev.clientY >= r.top && ev.clientY <= r.top + r.height
              })
              if (hit >= 0) tapped(hit)
            })
          }
          return words.map((w) => w.n)
        },
        show(e, follow) {
          const w = words[e]
          if (!w) return
          if (readerVm.page !== w.page) {
            if (follow && Date.now() - R.programmatic > 1200) {
              R.programmatic = Date.now()
              readerVm.page = w.page
            }
            overlay().style.display = 'none'
            return
          }
          const r = rectOf(w)
          const b = overlay()
          if (!r) return (b.style.display = 'none')
          Object.assign(b.style, { display: '', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
        },
        goTo(e) {
          const w = words[e]
          if (!w) return
          R.programmatic = Date.now()
          readerVm.page = w.page
          // mark the word once the page has been drawn
          setTimeout(() => this.show(e, false), 700)
        },
        clear() {
          if (box) box.remove()
          box = null
        },
        alive: () => !readerVm._isDestroyed && !!canvas()
      }
    }

    function chip(text) {
      if (!R.chip) {
        R.chip = document.createElement('button')
        R.chip.className = 'txr-chip'
        R.chip.type = 'button'
        R.chip.addEventListener('click', () => stop())
        document.body.appendChild(R.chip)
      }
      R.chip.innerHTML = `${icon('subtitles')}<span>${esc(text)}</span><b>✕</b>`
      R.chip.style.display = text ? '' : 'none'
    }

    /** A word in the book was tapped: play the audiobook from it */
    function tapped(e, cueOnly) {
      if (!R.e2t || e >= R.e2t.length) return
      const t = R.tTime[R.e2t[e]]
      if (t == null) return
      R.lastUserNav = 0
      if (cueOnly) return cueAudio(R.key, t)
      const item = player.libraryItem()
      if (item && item.id === R.key) {
        player.seek(t)
        if (!player.isPlaying()) player.playPause()
      } else if (window.$nuxt && window.$nuxt.$eventBus) window.$nuxt.$eventBus.$emit('play-item', { libraryItemId: R.key, startTime: t })
    }

    function wordAt(t) {
      const a = R.tTime
      let lo = 0
      let hi = a.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (a[mid] <= t) {
          ans = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      return ans
    }

    // The reader's top bar (close, title, settings) stays up while paused, fades once the narration plays,
    // and comes back on pause or a tap at the top of the screen
    function bars(show) {
      clearTimeout(R.fadeTimer)
      const el = document.querySelector('#reader')
      if (el) el.classList.toggle('txr-bars-faded', !show)
      raHeaderFade(!show)
    }
    // Read along keeps its top bar on screen (like Lyrics and Karaoke); only reading mode's bars fade
    function fadeSoon(ms) {
      clearTimeout(R.fadeTimer)
      R.fadeTimer = setTimeout(() => R.on && R.playing && root && root.classList.contains('tx-ra-book') && bars(false), ms)
    }
    function onTop(y) {
      if (!R.on || y > window.innerHeight * 0.15) return
      bars(true)
      if (R.playing) fadeSoon(4000)
    }
    function watchTaps() {
      const docs = [document, ...[...document.querySelectorAll('#reader iframe')].map((f) => { try { return f.contentDocument } catch (e) { return null } })]
      for (const d of docs) {
        if (!d || d.__txrTop) continue
        d.__txrTop = true
        const frame = d.defaultView && d.defaultView.frameElement
        d.addEventListener('pointerdown', (ev) => onTop((frame ? frame.getBoundingClientRect().top : 0) + ev.clientY), true)
        if (d === document) d.addEventListener('mousemove', (ev) => ev.clientY < 70 && onTop(ev.clientY), { passive: true })
      }
    }

    function tick() {
      R.raf = 0
      if (!R.on) return
      if (!R.a || !R.a.alive()) {
        // Audiobookshelf rebuilt the book (it does when the player opens or the window resizes): find it again
        // instead of switching Read along off
        if (document.querySelector('#reader') && R.lines && (R.reattachN || 0) < 6) {
          R.reattachN = (R.reattachN || 0) + 1
          const it = player.libraryItem()
          const at = it && it.id === R.key ? player.currentTime() : null
          start(R.key, R.lines, at, { again: true, keepHeader: !!(root && root.classList.contains('tx-ra')) })
          return
        }
        return stop()
      }
      R.reattachN = 0
      const item = player.libraryItem()
      const playing = !!(item && item.id === R.key && player.isPlaying())
      if ((R.tN = (R.tN || 0) + 1) % 15 === 0 && root && root.classList.contains('tx-ra')) {
        // Audiobookshelf's player bar takes the bottom once a session is open; our dock only before that
        const mp = document.querySelector('#mediaPlayerContainer')
        const mpH = mp && getComputedStyle(mp).display !== "none" ? Math.round(mp.getBoundingClientRect().height) : 0 // (fixed: offsetParent is always null)
        const dock = root.querySelector('.tx-transport')
        document.body.classList.toggle('tx-ra-absplayer', mpH > 40)
        document.body.style.setProperty('--tx-bottom-h', `${mpH > 40 ? mpH : (dock && dock.offsetHeight) || 76}px`)
        if (item && item.id === R.key) S.liveTime = player.currentTime()
        renderTransport()
      }
      if (playing !== R.playing) {
        R.playing = playing
        if (playing) fadeSoon(1500)
        else bars(true)
      }
      if (!(R.tickN = (R.tickN || 0) + 1) || R.tickN % 30 === 0) watchTaps()
      if (item && item.id === R.key && R.t2e) {
        const k = wordAt(player.currentTime() + 0.12) // a touch early, so the eye lands on the word as it's said
        // the narration has left the book (improvised / not in this edition): no highlight until it's back
        const off = k >= 0 && R.off && R.off[k] === 1
        if (off !== !!R.offShown) {
          R.offShown = off
          if (off) toast('info', 'Narration differs from the book here · read along picks up again where they match')
        }
        if (k >= 0 && !off) {
          const e = R.t2e[k]
          if (e !== R.lastE || player.isPlaying()) R.a.show(e, following())
          R.lastE = e
        }
      }
      R.raf = requestAnimationFrame(tick)
    }

    /** key: the book; lines: its transcript; time: where to start (seconds) */
    async function start(key, lines, time, opts = {}) {
      stop(opts.keepHeader)
      R.key = key
      R.lines = lines
      R.on = true
      chip(opts.again ? 'Read along: finding your place again…' : 'Read along: opening the book…')
      let a = null
      for (let i = 0; i < 100 && !a; i++) {
        const epub = vmNamed(/^readers-epub-reader$/)
        const mobi = vmNamed(/^readers-mobi-reader$/)
        const pdf = vmNamed(/^readers-pdf-reader$/)
        if (epub && epub.rendition && epub.book) a = epubAdapter(epub)
        else if (mobi && document.querySelector('.ebook-viewer iframe')) a = docAdapter(mobi)
        else if (vmNamed(/^readers-comic-reader$/)) a = comicAdapter(vmNamed(/^readers-comic-reader$/))
        else if (pdf && vmNamed(/^pdf$/) && pdf.numPages) {
          a = pdfAdapter(pdf)
          fitPdf(pdf)
        }
        else await new Promise((r) => setTimeout(r, 150))
      }
      if (!a) {
        chip('')
        R.on = false
        raHeader(false)
        return toast('info', "Read along: this book's reader isn't supported (EPUB, MOBI, AZW3 and PDF are).")
      }
      R.a = a
      if (!lines || !lines.length) {
        // reading only (no transcript): the bars work, nothing follows the narration
        try {
          await a.words()
        } catch (e) {}
        chip('')
        R.readOnly = true
        return
      }
      R.readOnly = false
      chip('Read along: matching the narration to the book…')
      try {
        const tw = transcriptWords(lines)
        const eNorm = await a.words()
        if (!R.on || !eNorm) return
        // Matched before in this session (same book, transcript and text): no need to match again
        const cacheKey = `${key}:${tw.norms.length}:${eNorm.length}`
        R.cache = R.cache || new Map()
        let hit = R.cache.get(cacheKey)
        if (!hit) {
          const pairs = alignWords(tw.norms, eNorm)
          if (pairs.length < 20) {
            chip('')
            R.on = false
            raHeader(false)
            return toast('info', eNorm.length < 50 ? "Read along: this PDF is a scan with no text to follow. An admin can make it readable in Settings → PDF text (OCR)." : "Read along: the narration doesn't match this book's text closely enough.")
          }
          const offB = new Uint8Array(tw.norms.length)
          hit = {
            t2e: mapThrough(pairs, tw.norms.length, eNorm.length, false, offB),
            off: offB,
            e2t: mapThrough(pairs, eNorm.length, tw.norms.length, true),
            pct: Math.round((pairs.length / Math.max(1, Math.min(tw.norms.length, eNorm.length))) * 100)
          }
          if (R.cache.size > 6) R.cache.delete(R.cache.keys().next().value)
          R.cache.set(cacheKey, hit)
        }
        R.tTime = tw.times
        R.t2e = hit.t2e
        R.off = hit.off || null
        R.e2t = hit.e2t
        const pct = hit.pct
        chip(`Read along · ${pct}% matched · tap a word to play from it`)
        if (typeof time === 'number') {
          const k = wordAt(time)
          if (k >= 0) {
            R.lastUserNav = 0
            a.goTo(R.t2e[k])
          }
        }
        R.raf = requestAnimationFrame(tick)
      } catch (e) {
        chip('')
        R.on = false
        raHeader(false)
        toast('error', `Read along: ${e.message}`)
      }
    }

    function stop(keepHeader) {
      R.on = false
      R.playing = false
      bars(true)
      if (keepHeader !== true) raHeader(false)
      if (R.raf) cancelAnimationFrame(R.raf)
      R.raf = 0
      try {
        if (R.a) R.a.clear()
      } catch (e) {}
      R.a = null
      R.t2e = R.e2t = null
      R.lastE = -1
      chip('')
    }

    /** Reading mode → listening: play from the first word on the screen */
    function listenHere() {
      const a = R.a
      const i = a && a.firstVisible ? a.firstVisible() : -1
      if (i >= 0) {
        tapped(i, true) // ready at this page; the person presses play
        return true
      }
      return false
    }
    return { start, stop, docWords, transcriptWords, mapThrough, adapter: () => (R.on ? R.a : null), listenHere }
  })()
  window.__absPlusReadAlong = READALONG // for support and testing: READALONG.start(itemId, lines, seconds)

  // ------------------------------------------------------------------ Read-along card above the player bar
  //
  // Like the ABS+ app's card under the cover: while a transcribed book plays, the line being narrated floats
  // just above Audiobookshelf's player bar with its words lighting up as they're said. Tap it to open the
  // Transcription view; ✕ hides it for that book. Not shown over the Transcription view or the book reader.
  const CARD = (() => {
    const C = { key: null, lines: [], raw: 0, el: null, hidden: new Set(), loading: false, lastLoad: 0, done: false, lineIdx: -2, words: [] }
    const wre = /(\s+)/

    function el() {
      if (C.el) return C.el
      C.el = document.createElement('div')
      C.el.className = 'txc-card'
      C.el.setAttribute('role', 'button')
      C.el.setAttribute('aria-label', 'Open the transcription')
      C.el.innerHTML = `<div class="txc-head">${icon('subtitles')}<span>Transcription</span><button type="button" class="txc-x" title="Hide for this book">✕</button></div><p class="txc-line"><span class="txc-track"></span></p>`
      C.el.addEventListener('click', (e) => {
        if (e.target.closest('.txc-x')) {
          e.stopPropagation()
          C.hidden.add(C.key)
          C.el.style.display = 'none'
          return
        }
        open()
      })
      document.body.appendChild(C.el)
      return C.el
    }

    async function load(reset) {
      if (C.loading || !C.key) return
      C.loading = true
      const key = C.key
      try {
        const from = reset ? 0 : C.raw
        const res = await request('GET', `${itemPath(key)}/lines?fromIndex=${from}`)
        if (key !== C.key) return
        const incoming = (res.lines || []).map((l) => ({ s: l.s, e: l.e, t: l.t || '', w: Array.isArray(l.w) ? l.w : null }))
        C.lines = (reset ? incoming : C.lines.concat(incoming)).sort((a, b) => a.s - b.s)
        C.raw = from + incoming.length
        C.done = !!(res.status && res.status.status === 'done')
        C.lineIdx = -2
      } catch (e) {
        if (reset) C.lines = []
      } finally {
        C.loading = false
        C.lastLoad = Date.now()
      }
    }

    function lineAt(t) {
      const a = C.lines
      let lo = 0
      let hi = a.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (a[mid].s <= t) {
          ans = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      return ans
    }

    /** Words of a line with when each is said (engine word times, or spread over the line) */
    function wordsOf(l) {
      const text = String(l.t || '')
      const parts = text.split(wre).filter((p) => p !== '')
      const count = parts.filter((p) => !/^\s+$/.test(p)).length
      const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
      const timed = Array.isArray(l.w) && l.w.length === count
      const total = Math.max(1, text.length)
      let at = 0
      let k = 0
      return parts.map((p) => {
        const space = /^\s+$/.test(p)
        let t = null
        if (!space) {
          t = timed ? Number(l.w[k][1]) : l.s + (at / total) * (end - l.s)
          k++
        }
        at += p.length
        return { text: p, t }
      })
    }

    function hide() {
      if (C.el) C.el.style.display = 'none'
    }

    function tick() {
      if (document.hidden) return
      const item = player.libraryItem()
      const mp = document.querySelector('#mediaPlayerContainer')
      const mpH = mp && getComputedStyle(mp).display !== "none" ? Math.round(mp.getBoundingClientRect().height) : 0 // (fixed: offsetParent is always null)
      const blocked = S.open || document.querySelector('#reader') || (root && root.classList.contains('tx-ra'))
      if (!item || item.mediaType !== 'book' || mpH < 40 || blocked || player.episodeId()) return hide()
      if (item.id !== C.key) {
        C.key = item.id
        C.lines = []
        C.raw = 0
        C.lineIdx = -2
        load(true)
        return hide()
      }
      // Still being transcribed: pick up new lines now and then
      if (!C.done && !C.loading && Date.now() - C.lastLoad > 30000) load(false)
      if (C.hidden.has(C.key) || !C.lines.length) return hide()
      const t = player.currentTime()
      const i = lineAt(t + 0.15)
      if (i < 0) return hide()
      const box = el()
      box.style.display = ''
      box.style.bottom = `${mpH + 10}px`
      if (i !== C.lineIdx) {
        C.lineIdx = i
        C.words = wordsOf(C.lines[i])
        const track = box.querySelector('.txc-track')
        track.innerHTML = C.words.map((w) => `<span class="txc-w">${esc(w.text)}</span>`).join('')
        // a new line: placed at once (no glide from where the last line ended)
        track.classList.add('txc-jump')
        C.shift = null
      }
      let now = -1
      C.words.forEach((w, k) => {
        if (w.t != null && w.t <= t + 0.1) now = k
      })
      const spans = box.querySelectorAll('.txc-w')
      spans.forEach((s, k) => {
        s.classList.toggle('txc-said', k <= now)
        s.classList.toggle('txc-now', k === now && C.words[k].t != null)
      })
      // one line, the word being said kept in the middle: the line glides along under it (as in the app)
      const line = box.querySelector('.txc-line')
      const track = box.querySelector('.txc-track')
      const word = track.querySelector('.txc-now') || track.querySelector('.txc-w')
      if (word) {
        const want = Math.round(line.clientWidth / 2 - (word.offsetLeft + word.offsetWidth / 2))
        if (C.shift === null || Math.abs(want - C.shift) > 1) {
          C.shift = want
          track.style.transform = `translateX(${want}px)`
        }
        if (track.classList.contains('txc-jump')) requestAnimationFrame(() => track.classList.remove('txc-jump'))
      }
    }
    return { tick }
  })()
  setInterval(() => CARD.tick(), 200)

  // ------------------------------------------------------------------ Transcript button on the book page
  //
  // Next to Play and Read on a book's page, once the book is (being) transcribed: opens the transcript for
  // reading and searching, without touching what's playing.
  const ITEMPAGE = (() => {
    const cache = new Map() // id -> { at, has }
    let btn = null
    const routeId = () => {
      const p = window.$nuxt && window.$nuxt.$route ? window.$nuxt.$route.path : location.pathname
      const m = p.match(/\/item\/([^/?#]+)/)
      return m ? decodeURIComponent(m[1]) : null
    }
    async function hasTranscript(id) {
      const c = cache.get(id)
      if (c && Date.now() - c.at < 30000) return c.has
      cache.set(id, { at: Date.now(), has: c ? c.has : false })
      try {
        const st = await request('GET', `${itemPath(id)}/status`)
        const has = !!st && st.status && st.status !== 'none'
        cache.set(id, { at: Date.now(), has })
        return has
      } catch (e) {
        return false
      }
    }
    async function ensure() {
      const id = routeId()
      if (!id) {
        if (btn) btn.remove()
        return
      }
      const read = [...document.querySelectorAll('button')].find((b) => /auto_stories/.test(b.textContent) && b.offsetParent)
      const play = [...document.querySelectorAll('button')].find((b) => /^[^A-Za-z]*(play_arrow|pause)?[^A-Za-z]*(Play|Pause|Stream)\s*$/i.test(b.textContent) && b.offsetParent && b.closest('.pt-4')) // the phone layout puts an icon glyph before the word
      const anchor = read || play
      if (!anchor) return
      if (!(await hasTranscript(id))) {
        if (btn) btn.remove()
        return
      }
      if (btn && btn.isConnected && btn.previousElementSibling === anchor && btn.dataset.id === id) return
      if (!btn) {
        btn = document.createElement('button')
        btn.type = 'button'
        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          try {
            const full = (await window.$nuxt.$axios.get(`/api/items/${encodeURIComponent(btn.dataset.id)}?expanded=1`)).data
            open({ item: full, reading: true })
          } catch (err) {
            toast('error', err.message)
          }
        })
      }
      btn.className = anchor.className.replace(/\bbg-(success|info)\b/g, 'bg-primary')
      btn.dataset.id = id
      btn.innerHTML = `<span class="material-symbols text-lg pr-1">subtitles</span><span class="text-sm">Transcript</span>`
      anchor.after(btn)
    }
    return { ensure }
  })()
  setInterval(() => ITEMPAGE.ensure().catch(() => {}), 1500)

  // Fast clock so the highlighted line keeps up with the voice (slower on e-ink and when saving power)
  ADAPT.start(() => S.open)
  const clockTick = () => {
    if (S.open && S.reading) return renderTransport()
    if (!S.open) {
      // Closed: the book that's playing gets its transcript ready, and both views keep following it
      const item = player.libraryItem()
      if (!item || !player.isPlaying() || document.hidden) return
      if (S.key !== item.id) return item.mediaType === 'book' && !player.episodeId() ? warmUp(item) : undefined
      if (!hasTranscript()) return
      S.liveTime = player.currentTime()
      updateActive()
      if (S.karaoke) updateKaraokeActive()
      RA2.tick(S.liveTime)
      return
    }
    if (!hasTranscript()) return renderTransport()
    const t = player.currentTime()
    const moved = Math.abs(t - S.liveTime) > 0.05
    S.liveTime = t
    if (moved) {
      updateActive()
      if (S.karaoke) updateKaraokeActive()
    }
    RA2.tick(t)
    if (S.viewMode === 'karaoke' && player.isPlaying()) karaokeFrames()
    if (S.viewMode === 'readalong' && player.isPlaying()) raFrames()
    renderTransport()
    if (!S.followPlayback && Date.now() - S.lastUserScroll > 6000 && !S.query && player.isPlaying()) {
      S.followPlayback = true
      els.follow.style.display = 'none'
      scrollToActiveAny(false)
    }
    const wasTranscribed = els.notice.innerHTML === ''
    if (wasTranscribed !== currentTimeTranscribed() || (!currentTimeTranscribed() && moved)) renderNotice()
  }
  const clockLoop = () => {
    try {
      clockTick()
    } finally {
      setTimeout(clockLoop, S.open ? ADAPT.profile().clockMs : 1000)
    }
  }
  clockLoop()

  // Status: often while working, now and then otherwise (picks up phones checking in and edits elsewhere)
  let lastPoll = 0
  setInterval(() => {
    if (!S.open) return
    const busy = isActive() || ebookBusy() || isDeviceJob()
    if (Date.now() - lastPoll < (busy ? 2000 : 15000) * ADAPT.profile().pollFactor) return
    lastPoll = Date.now()
    pollStatus()
    if (!busy && S.editingBookmark === null) loadBookmarks() // bookmarks made on other devices
  }, 500)

  setInterval(ensureButton, 1000)

  // Every book's own colour (from its cover, like the panel's gradient) for the Play buttons: on a book's page
  // that book's, elsewhere the playing book's. The read-mode buttons use the same colour.
  let accentFor = null
  setInterval(async () => {
    try {
      const path = window.$nuxt && window.$nuxt.$route ? window.$nuxt.$route.path : location.pathname
      const m = path.match(/\/item\/([^/?#]+)/)
      const playing = player.libraryItem()
      const id = m ? decodeURIComponent(m[1]) : playing && playing.id
      if (!id || id === accentFor) return
      accentFor = id
      if (ADAPT.profile().eink) return setCoverAccent(null)
      setCoverAccent(await SHADE.coverColor(id))
    } catch (e) {}
  }, 1500)
  setInterval(ADMIN.ensure, 1000)

  // ------------------------------------------------------------------ Inside the ABS+ app
  // The app shows the admin pages inside itself (Settings → Admin settings) in a frame. This page asks the app
  // for its sign-in (no token in the address), accepts it only from the app's own origin, then signs in
  // through Audiobookshelf's login page and goes to the page the app asked for.
  ;(() => {
    if (window.parent === window) return
    const APP_ORIGINS = ['http://localhost', 'https://localhost', 'capacitor://localhost']
    document.documentElement.classList.add('absplus-in-app')
    // The app has its own menu and back button for these pages: hide the web page's top bar, its slide-out
    // settings menu and the row that opens it, so only the page itself shows
    const st = document.createElement('style')
    st.textContent = [
      'html.absplus-in-app div:has(> #appbar) { display: none !important }',
      'html.absplus-in-app #page-wrapper > div:has(> div.w-44.fixed) { display: none !important }',
      'html.absplus-in-app .configContent > div.cursor-pointer.border-b:first-child { display: none !important }',
      'html.absplus-in-app .configContent, html.absplus-in-app .txa-page { margin-left: 0 !important }',
      // the page area left room for the top bar
      'html.absplus-in-app #page-wrapper { max-height: 100% !important; height: 100% !important }',
      // an ABS+ page (…/config#transcription): Audiobookshelf's own settings stay hidden until it's up
      'html.absplus-in-app.absplus-want-txa .configContent:not(.txa-page) { visibility: hidden !important }'
    ].join('\n')
    document.head.appendChild(st)
    if (/^#(transcription|parental|metadata|catalog|authors|updates|dictionaries|ocr)$/.test(location.hash)) {
      document.documentElement.classList.add('absplus-want-txa')
      setTimeout(() => document.documentElement.classList.remove('absplus-want-txa'), 20000) // never hide it for good
    }
    const base = () => (window.$nuxt && window.$nuxt.$config && window.$nuxt.$config.routerBasePath) || ''
    let done = false
    window.addEventListener('message', (e) => {
      if (done || e.source !== window.parent || !APP_ORIGINS.includes(e.origin)) return
      const d = e.data || {}
      if (d.type !== 'absplus-signin' || typeof d.token !== 'string' || !d.token) return
      const path = typeof d.path === 'string' && d.path.startsWith('/') && !d.path.startsWith('//') ? d.path : '/config'
      let had = null
      try {
        had = localStorage.getItem('token')
      } catch (err) {}
      // this token is in use already (or was just tried and refused): leave the page as it is, so an expired
      // token can't send it round in circles; the login form shows instead
      if (had === d.token) return
      done = true
      try {
        localStorage.setItem('token', d.token)
      } catch (err) {}
      location.replace(`${base()}/login?redirect=${encodeURIComponent(path)}`)
    })
    // ask once the page is up (and again shortly after, in case the app wasn't listening yet)
    const ask = () => !done && window.parent.postMessage({ type: 'absplus-embed-ready', path: location.pathname }, '*')
    ask()
    setTimeout(ask, 1500)
  })()

  // ------------------------------------------------------------------ The name: audiobookshelf+
  // The web app's name next to the logo (wide screens) and the browser tab title
  const BRAND = () => {
    document.querySelectorAll('h1').forEach((h) => {
      if (h.children.length === 0 && /^\s*audiobookshelf\s*$/i.test(h.textContent)) h.textContent = 'audiobookshelf+'
    })
    if (/^Audiobookshelf(?!\+)/.test(document.title)) document.title = document.title.replace(/^Audiobookshelf/, 'Audiobookshelf+')
    // The gear next to the upload arrow (admins only): "Admin settings"
    try {
      const s = window.$nuxt && window.$nuxt.$strings
      if (s && s.HeaderSettings !== 'Admin settings') s.HeaderSettings = 'Admin settings'
    } catch (e) {}
    document.querySelectorAll('#appbar a[href$="/config"]').forEach((a) => {
      if (a.dataset.absAdmin) return
      a.dataset.absAdmin = '1'
      a.setAttribute('title', 'Admin settings')
      const icon = a.querySelector('[aria-label]')
      if (icon) icon.setAttribute('aria-label', 'Admin settings')
      // its hover label (ABS's tooltip keeps the text it was drawn with)
      let el = a.firstElementChild
      while (el && !(el.__vue__ && el.__vue__._props && 'text' in el.__vue__._props)) el = el.firstElementChild
      if (el) el.__vue__._props.text = 'Admin settings'
    })
    // Edit from the app (Settings → Transcription): /item/<id>?absEdit=1 opens Audiobookshelf's book editor.
    // It waits until the book page has loaded that book, then does what its pencil button does (editClick):
    // opening the editor any earlier left it marked open but never shown, so edits went nowhere
    const em = /[?&]absEdit=1/.test(location.search) && location.pathname.match(/\/item\/([^/?#]+)/)
    if (em && window.$nuxt && window.$nuxt.$route) {
      const id = decodeURIComponent(em[1])
      const m = window.$nuxt.$route.matched[0]
      const page = m && m.instances && m.instances.default
      const ready = page && typeof page.editClick === 'function' && page.libraryItem && page.libraryItem.id === id
      if (ready) {
        history.replaceState(history.state, '', location.pathname)
        setTimeout(() => page.editClick(), 300)
      }
    }
  }
  BRAND()
  setInterval(BRAND, 1000)
})()

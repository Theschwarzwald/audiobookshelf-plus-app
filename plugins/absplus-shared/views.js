/**
 * ABS+ Lyrics and Karaoke — one implementation for the web player and the Android app.
 *
 * The web player (server/public/transcription.js, through the absplus-views bundle) and the app
 * (components/app/TranscriptViews.vue) both create their views here, so the two look and behave the same:
 * the same markup and class names, the same highlight, the same following, the same taps.
 *
 *   const v = createTranscriptViews(scrollerElement, { onSeek, onFollowChange, timestamp, ... })
 *   v.setLines(lines)        // [{ s, e, t, w? }] in time order; a line keeps its index as its id
 *   v.setMode('lyrics' | 'karaoke')
 *   v.setTime(seconds)       // every clock tick (and every frame between ticks when smooth)
 *   v.setQuery('words')      // search: matching lines / paragraphs only, terms marked
 *   v.follow(instant)        // back to the line / word being narrated
 *
 * Lyrics: timed lines, the narrated one bright, the past dimmed, the rest dimmer; tap a line to play it.
 * Karaoke: the book as paragraphs (the ebook's own text when the server has it, timed to the narration;
 * else the transcript grouped at pauses), the narrated word outlined; tap a word to play from it.
 * Both lists are drawn when their text changes, never on switching, and follow the voice all the time,
 * so switching is instant. Moving the highlight only touches the lines / paragraph it changes.
 */
import { buildKaraoke, wordAt } from './karaoke.js'

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
const defaultTs = (sec) => {
  const t = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** The look, shared (the web player has the same rules in transcription.css) */
export const VIEW_CSS = `
.apv { --apv-accent: #e49b4f; --apv-accent-bg: rgba(228, 155, 79, 0.14); --apv-kfg: inherit; }
.apv .tx-line { display: flex; padding: 8px 0; cursor: pointer; transition: opacity 0.25s ease; }
.apv .tx-ts { position: relative; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.75rem; margin-right: 12px; padding-top: 6px; flex-shrink: 0; opacity: 0.7; }
.apv .tx-text { font-size: 1.35rem; line-height: 1.35; font-weight: 700; }
.apv .tx-past { opacity: 0.55; }
.apv .tx-future { opacity: 0.35; }
.apv .tx-active { opacity: 1; }
.apv .tx-active .tx-text { text-shadow: 0 0 1px currentColor; }
.apv.tx-search-mode .tx-line { opacity: 1; }
.apv.tx-search-mode .tx-text { font-size: 1.1rem; font-weight: 600; }
.apv .tx-sugg { text-decoration: underline wavy rgba(255, 82, 82, 0.9); text-underline-offset: 4px; }
.apv .tx-mark { background: rgba(255, 214, 0, 0.85); color: #111; border-radius: 3px; padding: 0 2px; }
.apv .tx-nomatch { text-align: center; opacity: 0.7; margin-top: 32px; }
.apv .tx-bm-mark { position: absolute; left: 0; top: 1.5rem; color: #43a047; font-size: 0.95rem; }
.apv .tx-ktext { font-family: Georgia, 'Noto Serif', 'Droid Serif', serif; line-height: 1.72; color: var(--apv-kfg); }
.apv .tx-kpara { margin: 0 0 0.85em; padding: 0.35em 0.6em; border-left: 3px solid transparent; border-radius: 6px; cursor: pointer; transition: background-color 0.25s ease; }
.apv .tx-kpara.tx-kactive { background: var(--apv-accent-bg); border-left-color: var(--apv-accent); border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.apv .tx-khead { font-weight: 700; font-size: 1.15em; margin-top: 1.2em; }
.apv .tx-kuntimed { opacity: 0.6; }
.apv .tx-kword { border: 1.5px solid var(--apv-accent); background: var(--apv-accent-bg); border-radius: 6px; padding: 0 2px; margin: 0 -3.5px; }
.apv .tx-knote { font-size: 0.75rem; opacity: 0.65; display: flex; align-items: center; gap: 4px; margin: 0 8px 12px; }
.apv.tx-search-mode .tx-kpara { opacity: 1; }
.apv-eink .tx-line, .apv-eink .tx-kpara { transition: none; }
.apv-eink .tx-kword { border: 2px solid currentColor; background: transparent; }
.apv-eink .tx-kpara.tx-kactive { border-left-color: currentColor; background: transparent; }
`

let cssInjected = false
function injectCss(doc) {
  if (cssInjected) return
  cssInjected = true
  const s = doc.createElement('style')
  s.id = 'absplus-views-css'
  s.textContent = VIEW_CSS
  ;(doc.head || doc.documentElement).appendChild(s)
}

/**
 * opts:
 *   onSeek(time, info)       a tap on a line or a word ({ kind: 'line' | 'word', line?, paragraph? })
 *   onFollowChange(on)       the person scrolled away (false) / it follows again (true)
 *   timestamp(sec)           how times look next to the lines
 *   lead                     seconds Karaoke lights a word early (the eye needs a moment)
 *   motion()                 smooth scrolling allowed (not on e-ink / low power)
 *   eink                     e-ink look (no transitions, outlines in ink)
 *   injectCss                add VIEW_CSS to the page (the web player has it in its stylesheet already)
 *   icons: { book, fact }    HTML for the Karaoke note's icon
 */
export function createTranscriptViews(scroller, opts = {}) {
  const o = { lead: 0.12, motion: () => true, timestamp: defaultTs, injectCss: true, icons: {}, ...opts }
  if (o.injectCss) injectCss(scroller.ownerDocument || document)
  const doc = scroller.ownerDocument || document
  const V = {
    lines: [],
    mode: 'lyrics',
    query: '',
    time: 0,
    active: -1,
    kActive: { pi: -1, wi: -1 },
    karaoke: null,
    ebookText: null,
    ebookTitle: '',
    karaokeSize: 18,
    marks: new Map(), // line index -> icon HTML
    sugg: new Map(), // round(line.s * 100) -> [{ wi, wn, heard, ebook }]
    discrepancy: '',
    note: null,
    following: true,
    programmatic: 0,
    dirtyKaraoke: true
  }

  scroller.classList.add('apv')
  if (o.eink) scroller.classList.add('apv-eink')
  // the host can hand in its own containers (the web player's list elements), else they're made here
  const lyricsEl = o.lyricsEl || doc.createElement('div')
  lyricsEl.classList.add('apv-lyrics')
  const karaokeEl = o.karaokeEl || doc.createElement('div')
  karaokeEl.classList.add('apv-karaoke')
  karaokeEl.style.display = 'none'
  if (!o.lyricsEl) scroller.appendChild(lyricsEl)
  if (!o.karaokeEl) scroller.appendChild(karaokeEl)

  // ---------------------------------------------------------------- following
  function userMoved() {
    if (Date.now() - V.programmatic < 700) return
    if (V.following) {
      V.following = false
      o.onFollowChange && o.onFollowChange(false)
    }
  }
  scroller.addEventListener('wheel', userMoved, { passive: true })
  scroller.addEventListener('touchmove', userMoved, { passive: true })
  scroller.addEventListener('mousedown', (e) => e.target === scroller && userMoved())

  function scrollTo(top, instant) {
    V.programmatic = Date.now()
    scroller.scrollTo({ top: Math.max(0, top), behavior: instant || !o.motion() ? 'auto' : 'smooth' })
  }

  // ---------------------------------------------------------------- Lyrics
  function filtered() {
    if (!V.query) return V.lines
    const q = V.query.toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return V.lines.filter((l) => l.lower.includes(q) || terms.every((w) => l.lower.includes(w)))
  }

  function queryRegex() {
    const terms = V.query ? V.query.split(/\s+/).filter(Boolean).map(escRe) : []
    return terms.length ? new RegExp(`(${terms.join('|')})`, 'gi') : null
  }

  function lineText(line, regex) {
    const fixes = !V.query && V.sugg.get(Math.round(line.s * 100))
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
        out += f ? `<span class="tx-sugg" data-msg="${esc(`Heard “${f.heard}”, the ebook says “${f.ebook}”.`)}" title="Ebook: ${esc(f.ebook)}. ${esc(V.discrepancy)}">${esc(m[0])}</span>` : esc(m[0])
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

  function computeActive() {
    const lines = V.lines
    const x = V.time + 0.25
    let lo = 0
    let hi = lines.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (lines[mid].s <= x) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans
  }

  function renderLyrics() {
    const list = filtered()
    const regex = queryRegex()
    V.active = computeActive()
    scroller.classList.toggle('tx-search-mode', !!V.query)
    if (V.query && !list.length) {
      lyricsEl.innerHTML = '<p class="tx-nomatch">No matches</p>'
      return
    }
    const parts = new Array(list.length)
    for (let k = 0; k < list.length; k++) {
      const l = list[k]
      const cls = V.query ? '' : l.i === V.active ? 'tx-active' : l.i < V.active ? 'tx-past' : 'tx-future'
      const mark = V.marks.get(l.i)
      parts[k] = `<div class="tx-line ${cls}" data-i="${l.i}"><span class="tx-ts">${esc(o.timestamp(l.s))}${mark ? `<span class="tx-bm-mark">${mark}</span>` : ''}</span><span class="tx-text">${lineText(l, regex)}</span></div>`
    }
    lyricsEl.innerHTML = parts.join('')
  }

  const lineEl = (i) => {
    const c = !V.query && lyricsEl.children[i]
    if (c && c.dataset && Number(c.dataset.i) === i) return c
    return lyricsEl.querySelector(`.tx-line[data-i="${i}"]`)
  }

  function updateLyrics() {
    const next = computeActive()
    if (next === V.active) return
    const prev = V.active
    V.active = next
    if (V.query) return
    const lo = Math.max(0, Math.min(prev, next))
    const hi = Math.max(prev, next)
    for (let i = lo; i <= hi; i++) {
      const el = lineEl(i)
      if (el) el.className = `tx-line ${i === next ? 'tx-active' : i < next ? 'tx-past' : 'tx-future'}`
    }
    if (V.following && V.mode === 'lyrics') scrollToLine(next, false)
  }

  function scrollToLine(i, instant) {
    const el = lineEl(i)
    if (el) scrollTo(el.offsetTop - scroller.clientHeight * 0.35, instant)
  }

  // ---------------------------------------------------------------- Karaoke
  function ensureKaraoke() {
    if (!V.karaoke || V.dirtyKaraoke) {
      V.karaoke = buildKaraoke(V.lines, V.ebookText)
      if (V.karaoke && V.ebookTitle && !V.karaoke.ebookTitle) V.karaoke.ebookTitle = V.ebookTitle
      V.dirtyKaraoke = false
      V.kActive = { pi: -1, wi: -1 }
    }
    return V.karaoke
  }

  function kFiltered() {
    const ps = (V.karaoke ? V.karaoke.paragraphs : []).map((p, i) => ({ p, i }))
    if (!V.query) return ps
    const q = V.query.toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    return ps.filter(({ p }) => {
      const t = p.t.toLowerCase()
      return t.includes(q) || terms.every((w) => t.includes(w))
    })
  }

  function computeKActive() {
    const m = V.karaoke
    if (!m || !m.times.length) return { pi: -1, wi: -1 }
    const k = wordAt(m, V.time + o.lead)
    if (k < 0) return { pi: -1, wi: -1 }
    const [pi, wi] = m.refs[k]
    return { pi, wi }
  }

  function paraHtml(p, i) {
    if (i !== V.kActive.pi || V.query) {
      if (!V.query) return esc(p.t)
      const regex = queryRegex()
      return regex ? p.t.split(regex).map((part, j) => (j % 2 ? `<mark class="tx-mark">${esc(part)}</mark>` : esc(part))).join('') : esc(p.t)
    }
    const w = p.words[V.kActive.wi]
    if (!w) return esc(p.t)
    return `<span data-o="0">${esc(p.t.slice(0, w.s))}</span><span class="tx-kword" data-o="${w.s}">${esc(p.t.slice(w.s, w.e))}</span><span data-o="${w.e}">${esc(p.t.slice(w.e))}</span>`
  }

  const paraClass = (p, i) => `tx-kpara${p.h ? ' tx-khead' : ''}${p.start == null && !V.query ? ' tx-kuntimed' : ''}${!V.query && i === V.kActive.pi ? ' tx-kactive' : ''}`

  function renderKaraoke() {
    const m = ensureKaraoke()
    V.kActive = computeKActive()
    const list = kFiltered()
    let note = V.note
    if (note == null) {
      if (!V.query && m && m.source === 'ebook') note = `${o.icons.book || ''}Text from ${esc(m.ebookTitle || 'the ebook')}, timed to the narration`
      else note = ''
    }
    if (V.query && !list.length) {
      karaokeEl.innerHTML = '<p class="tx-nomatch">No matches</p>'
      return
    }
    karaokeEl.innerHTML = `${note ? `<p class="tx-knote">${note}</p>` : ''}<div class="tx-ktext" style="font-size:${V.karaokeSize}px">${list.map(({ p, i }) => `<p class="${paraClass(p, i)}" data-p="${i}">${paraHtml(p, i)}</p>`).join('')}</div>`
  }

  const paraEl = (i) => karaokeEl.querySelector(`.tx-kpara[data-p="${i}"]`)

  function updateKaraoke() {
    if (!V.karaoke) return
    const next = computeKActive()
    const prev = V.kActive
    if (next.pi === prev.pi && next.wi === prev.wi) return
    V.kActive = next
    if (V.query) return
    for (const i of new Set([prev.pi, next.pi])) {
      if (i < 0) continue
      const el = paraEl(i)
      const p = V.karaoke.paragraphs[i]
      if (!el || !p) continue
      el.className = paraClass(p, i)
      el.innerHTML = paraHtml(p, i)
    }
    if (!V.following || next.pi < 0 || V.mode !== 'karaoke') return
    if (next.pi !== prev.pi) scrollToPara(next.pi, false)
    else keepWordVisible()
  }

  function keepWordVisible() {
    const w = karaokeEl.querySelector('.tx-kword')
    if (!w) return
    const r = w.getBoundingClientRect()
    const sr = scroller.getBoundingClientRect()
    if (r.bottom > sr.bottom - 140 || r.top < sr.top) {
      V.programmatic = Date.now()
      scroller.scrollBy({ top: r.top - sr.top - scroller.clientHeight * 0.3, behavior: o.motion() ? 'smooth' : 'auto' })
    }
  }

  function scrollToPara(i, instant) {
    const el = paraEl(i)
    if (el) scrollTo(el.offsetTop - scroller.clientHeight * 0.12, instant)
  }

  // ---------------------------------------------------------------- taps
  scroller.addEventListener('click', (e) => {
    if (o.ignoreTap && o.ignoreTap(e)) return
    const line = e.target.closest('.tx-line')
    if (line && lyricsEl.contains(line)) {
      const l = V.lines[Number(line.dataset.i)]
      if (!l) return
      if (e.target.closest('.tx-sugg') && o.onSuggestion) return o.onSuggestion(e.target.closest('.tx-sugg'), l)
      return tapped(l.s, { kind: 'line', line: l })
    }
    const para = e.target.closest('.tx-kpara')
    if (para && karaokeEl.contains(para)) {
      const i = Number(para.dataset.p)
      const p = V.karaoke && V.karaoke.paragraphs[i]
      if (!p) return
      let offset = null
      const range = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(e.clientX, e.clientY) : null
      if (range && range.startContainer && range.startContainer.nodeType === 3) {
        const holder = range.startContainer.parentElement
        offset = (holder && holder.dataset && holder.dataset.o !== undefined ? Number(holder.dataset.o) : 0) + range.startOffset
      }
      let word = offset != null ? p.words.find((w) => offset >= w.s && offset <= w.e) || p.words.find((w) => w.s >= offset) : null
      if (!word || word.time == null) word = p.words.find((w) => w.time != null)
      if (!word) return o.onUntimed && o.onUntimed(p)
      tapped(word.time, { kind: 'word', paragraph: p, index: i })
    }
  })

  function tapped(t, info) {
    V.time = t
    const wasQuery = !!V.query
    if (wasQuery) {
      V.query = ''
      renderAll()
    } else {
      updateLyrics()
      updateKaraoke()
    }
    setFollowing(true)
    requestAnimationFrame(() => api.follow(true))
    o.onSeek && o.onSeek(t, { ...info, clearedSearch: wasQuery })
  }

  function setFollowing(on) {
    if (V.following === on) return
    V.following = on
    o.onFollowChange && o.onFollowChange(on)
  }

  function showMode() {
    lyricsEl.style.display = V.mode === 'karaoke' ? 'none' : ''
    karaokeEl.style.display = V.mode === 'karaoke' ? '' : 'none'
  }

  function renderAll() {
    renderLyrics()
    if (V.karaoke || V.mode === 'karaoke') renderKaraoke()
    showMode()
  }

  const api = {
    /** several changes, drawn once: { lines, query, marks, suggestions, discrepancy, ebook, ebookTitle, note, karaokeSize } */
    update(p = {}) {
      if ('lines' in p) {
        V.lines = (p.lines || []).map((l, i) => ({ ...l, i, lower: String(l.t || '').toLowerCase() }))
        V.dirtyKaraoke = true
      }
      if ('query' in p) V.query = String(p.query || '').trim()
      if ('marks' in p) V.marks = p.marks || new Map()
      if ('suggestions' in p) V.sugg = p.suggestions || new Map()
      if ('discrepancy' in p) V.discrepancy = p.discrepancy || ''
      if ('ebook' in p && JSON.stringify(p.ebook || null) !== JSON.stringify(V.ebookText)) {
        V.ebookText = p.ebook || null
        V.dirtyKaraoke = true
      }
      if ('ebookTitle' in p) V.ebookTitle = p.ebookTitle || ''
      if ('note' in p) V.note = p.note
      if ('karaokeSize' in p) V.karaokeSize = p.karaokeSize
      renderAll()
    },
    /** the Karaoke model, built now (it's otherwise built the first time Karaoke shows) */
    buildKaraoke() {
      renderKaraoke()
      showMode()
      return V.karaoke
    },
    /** [{ s, e, t, w? }] in time order */
    setLines(lines) {
      V.lines = (lines || []).map((l, i) => ({ ...l, i, lower: String(l.t || '').toLowerCase() }))
      V.dirtyKaraoke = true
      renderAll()
    },
    /** the ebook's text for Karaoke (null: the transcript is shown) */
    setEbook(text, title) {
      const changed = JSON.stringify(text || null) !== JSON.stringify(V.ebookText)
      V.ebookText = text || null
      V.ebookTitle = title || ''
      if (changed) {
        V.dirtyKaraoke = true
        if (V.karaoke || V.mode === 'karaoke') renderKaraoke()
      }
    },
    setMode(mode) {
      V.mode = mode === 'karaoke' ? 'karaoke' : 'lyrics'
      if (V.mode === 'karaoke' && (!V.karaoke || V.dirtyKaraoke)) renderKaraoke()
      showMode()
      setFollowing(true)
      requestAnimationFrame(() => api.follow(true))
    },
    setTime(t) {
      if (typeof t !== 'number' || !isFinite(t)) return
      V.time = t
      updateLyrics()
      if (V.karaoke) updateKaraoke()
    },
    setQuery(q) {
      const next = String(q || '').trim()
      if (next === V.query) return
      V.query = next
      renderAll()
      if (!next) requestAnimationFrame(() => api.follow(true))
    },
    setKaraokeSize(px) {
      V.karaokeSize = px
      const box = karaokeEl.querySelector('.tx-ktext')
      if (box) box.style.fontSize = `${px}px`
    },
    /** Map line index -> icon HTML shown by the time (bookmarks, clips) */
    setMarks(map) {
      V.marks = map || new Map()
      renderLyrics()
    },
    /** ebook spelling suggestions: Map round(line.s * 100) -> [{ wi, wn, heard, ebook }] */
    setSuggestions(map, discrepancyText) {
      V.sugg = map || new Map()
      V.discrepancy = discrepancyText || ''
      renderLyrics()
    },
    /** the line above Karaoke ('' for none; null for the built-in one) */
    setKaraokeNote(html) {
      V.note = html
      if (V.karaoke) renderKaraoke()
    },
    /** back to the line / word being narrated */
    follow(instant) {
      setFollowing(true)
      if (V.mode === 'karaoke') {
        if (V.kActive.pi >= 0) scrollToPara(V.kActive.pi, instant)
      } else if (V.active >= 0) scrollToLine(V.active, instant)
    },
    get following() {
      return V.following
    },
    get active() {
      return V.active
    },
    get karaokeActive() {
      return V.kActive
    },
    get karaoke() {
      return V.karaoke
    },
    lineCount: () => V.lines.length,
    matches: () => (V.mode === 'karaoke' ? kFiltered().length : filtered().length),
    redraw: renderAll,
    setEink(on) {
      scroller.classList.toggle('apv-eink', !!on)
    },
    destroy() {
      lyricsEl.remove()
      karaokeEl.remove()
      scroller.classList.remove('apv', 'apv-eink', 'tx-search-mode')
    }
  }
  return api
}

export { buildKaraoke, wordAt }

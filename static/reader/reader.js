/**
 * E-reader page, loaded in an iframe by components/readers/FoliateReader.vue.
 *
 * Renders EPUB, MOBI, AZW3/KF8, FB2, CBZ and PDF with foliate-js (vendored by scripts/fetch-foliate.sh)
 * and exposes `window.ReaderAPI` to the app. The app sets `ReaderAPI.onEvent(type, detail)` to hear
 * back: loaded, relocate, selection, selection-cleared, tap, annotation, search-*, readalong-status,
 * external-link, error.
 */
import './foliate/view.js'
import { Overlayer } from './foliate/overlayer.js'
import * as CFI from './foliate/epubcfi.js'
import { ReadAlong, wordsOfDoc } from './readalong.js'
import { animatedTurn, turnStyle, nextOnRight } from './turn.js'

// Same palettes as components/readers/readerThemes.js (Grimmory's, plus sepia).
// eink: no page-turn animation (it ghosts on e-paper); mono: pictures in greyscale too.
const THEMES = {
  dark: { bg: '#0F0D0C', fg: '#E9E5E1', link: '#FF8C1A', light: false },
  light: { bg: '#FBF9F6', fg: '#1B1815', link: '#DD6B00', light: true },
  sepia: { bg: '#F4ECD8', fg: '#5B4636', link: '#A0522D', light: true },
  oled: { bg: '#000000', fg: '#E6E6E6', link: '#FF8C1A', light: false },
  eink: { bg: '#FFFFFF', fg: '#000000', link: '#000000', light: true, eink: true, mono: true },
  'eink-dark': { bg: '#000000', fg: '#FFFFFF', link: '#FFFFFF', light: false, eink: true, mono: true },
  'eink-color': { bg: '#FFFFFF', fg: '#000000', link: '#E65100', light: true, eink: true },
  'eink-color-dark': { bg: '#000000', fg: '#FFFFFF', link: '#FF9800', light: false, eink: true }
}
THEMES.black = THEMES.oled
const FONTS = {
  serif: "Georgia, 'Noto Serif', 'Droid Serif', serif",
  'sans-serif': "Roboto, 'Noto Sans', 'Helvetica Neue', Arial, sans-serif",
  mono: "'Roboto Mono', 'Noto Sans Mono', monospace",
  publisher: null
}
export const HIGHLIGHT_COLORS = {
  yellow: 'rgba(255, 214, 0, 0.45)',
  green: 'rgba(76, 175, 80, 0.4)',
  blue: 'rgba(66, 165, 245, 0.4)',
  pink: 'rgba(240, 98, 146, 0.4)',
  underline: 'rgba(255, 82, 82, 0.9)'
}

const api = {}
window.ReaderAPI = api
const emit = (type, detail) => {
  try {
    if (api.onEvent) api.onEvent(type, detail)
  } catch (e) {
    console.error('[reader] event handler failed', type, e)
  }
}

let view = null
let book = null
let lastRelocate = null
let detectedToc = null
let settings = {}
let bookmarks = [] // cfis
const annotations = new Map() // cfi -> { color, note }
let readAlong = null
// a transcript that arrived before the book had opened: applied as soon as it has
let pendingTranscript = null
let searchToken = 0
let selectionTimer = null
let lastSelection = null
const docs = new Map() // section index -> doc

// ---------------------------------------------------------------- styles

function css(s) {
  const t = THEMES[s.theme] || THEMES.dark
  const font = FONTS[s.font] === undefined ? FONTS.serif : FONTS[s.font]
  const lh = (s.lineSpacing || 140) / 100
  const stroke = s.textStroke ? `-webkit-text-stroke: ${s.textStroke / 100}px ${t.fg} !important;` : ''
  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html { color-scheme: ${t.light ? 'light' : 'dark'}; font-size: ${s.fontScale || 100}% !important; }
    html, body { background: ${t.bg} !important; color: ${t.fg} !important; }
    body * { color: inherit !important; background-color: transparent !important; border-color: currentColor; ${stroke} }
    ${font ? `body, body p, body div, body span, body li, body td, body blockquote, body h1, body h2, body h3, body h4, body h5, body h6 { font-family: ${font} !important; }` : ''}
    a:link, a:visited { color: ${t.link} !important; }
    p, li, blockquote, dd, div { line-height: ${lh} !important; }
    p, li, blockquote, dd { text-align: ${s.justify ? 'justify' : 'start'} !important; -webkit-hyphens: ${s.hyphenate ? 'auto' : 'manual'} !important; hyphens: ${s.hyphenate ? 'auto' : 'manual'} !important; }
    img, svg, video { max-width: 100% !important; height: auto; object-fit: contain; ${t.mono ? 'filter: grayscale(1) contrast(1.2);' : !t.light && !t.eink ? 'filter: brightness(0.9);' : ''} }
    pre { white-space: pre-wrap !important; }
    aside[epub|type~="footnote"], aside[epub|type~="endnote"], aside[epub|type~="rearnote"] { display: none; }
    ::selection { background: rgba(66, 165, 245, 0.45); }
  `
}

function applySettings(s) {
  settings = { ...settings, ...s }
  document.documentElement.style.setProperty('--reader-bg', (THEMES[settings.theme] || THEMES.dark).bg)
  const r = view && view.renderer
  if (!r) return
  const fixed = book && book.rendition && book.rendition.layout === 'pre-paginated'
  try {
    if (!fixed) {
      r.setAttribute('flow', settings.flow === 'scrolled' ? 'scrolled' : 'paginated')
      // Foldable opened like a book: one column per side, the gap over the hinge
      const hinge = settings.hingeGap || 0
      const gapPct = hinge ? Math.max(settings.margin ?? 6, (hinge / window.innerWidth) * 100 + 4) : settings.margin ?? 6
      r.setAttribute('gap', `${gapPct}%`)
      r.setAttribute('max-inline-size', `${hinge ? Math.round(window.innerWidth / 2) : settings.maxWidth || 720}px`)
      r.setAttribute('max-column-count', hinge ? '2' : settings.spread === 'none' ? '1' : '2')
      r.setAttribute('margin', `${settings.verticalMargin ?? 44}px`)
      // No page-turn animation on e-ink (ghosting), on battery saver or on slower phones
      if ((THEMES[settings.theme] || {}).eink || settings.animate === false) r.removeAttribute('animated')
      else r.setAttribute('animated', '')
      if (r.setStyles) r.setStyles(css(settings))
    } else {
      r.setAttribute('spread', settings.spread === 'none' ? 'none' : 'auto')
    }
  } catch (e) {
    console.warn('[reader] settings', e)
  }
  if (readAlong) {
    readAlong.setMode(settings.readAlong || 'off', settings.readAlongTurnPages !== false)
    const th = THEMES[settings.theme] || THEMES.dark
    // Karaoke's look and colours: the word in an outlined box with a soft tint. Black-and-white e-ink: black outline,
    // light grey tint and an underline; colour e-ink: orange outline and underline, no fill; elsewhere orange
    const colourEink = th.eink && !th.mono
    if (th.eink && !colourEink) readAlong.setColor(th.light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)', th.light ? '#000' : '#fff', { box: true, boxUnderline: true })
    else if (colourEink) readAlong.setColor('transparent', '#e49b4f', { box: true, boxUnderline: true })
    else readAlong.setColor('rgba(228, 155, 79, 0.14)', '#e49b4f', { box: true })
  }
}

// ---------------------------------------------------------------- open

api.open = async ({ file, format: fmt, location, fraction, settings: s, bookmarks: bms, annotations: anns }) => {
  format = fmt || ''
  mobiCoverUrl = null
  view = document.createElement('foliate-view')
  document.body.append(view)
  view.addEventListener('load', onLoad)
  view.addEventListener('relocate', onRelocate)
  view.addEventListener('draw-annotation', onDrawAnnotation)
  view.addEventListener('show-annotation', (e) => emit('annotation', { cfi: e.detail.value }))
  view.addEventListener('external-link', (e) => {
    e.preventDefault()
    emit('external-link', { href: e.detail.a && e.detail.a.href })
  })
  try {
    await view.open(file)
  } catch (e) {
    emit('error', { message: e && e.message ? e.message : String(e) })
    return
  }
  book = view.book
  readAlong = new ReadAlong(view, emit)
  if (pendingTranscript) {
    const p = pendingTranscript
    pendingTranscript = null
    readAlong.setTranscript(p)
  }
  applySettings(s || {})
  setBookmarks(bms || [])

  const isFixed = book.rendition && book.rendition.layout === 'pre-paginated'
  try {
    if (location && /^\d+$/.test(String(location)) && isFixed) await view.goTo(Math.max(0, parseInt(location, 10) - 1))
    else if (location && String(location).startsWith('epubcfi')) await view.init({ lastLocation: location })
    else if (fraction > 0) await view.goToFraction(fraction)
    else await view.init({ showTextStart: true })
  } catch (e) {
    console.warn('[reader] restoring position failed', e)
    await view.goToFraction(fraction || 0).catch(() => view.next())
  }
  setAnnotations(anns || [])

  const md = book.metadata || {}
  const lang = Array.isArray(md.language) ? md.language[0] : md.language
  const author = Array.isArray(md.author) ? md.author.map((a) => (typeof a === 'string' ? a : a.name)).join(', ') : typeof md.author === 'string' ? md.author : md.author && md.author.name
  emit('loaded', {
    title: typeof md.title === 'string' ? md.title : md.title && Object.values(md.title)[0],
    author: author || '',
    language: lang || '',
    isFixedLayout: isFixed,
    sections: (book.sections || []).length,
    toc: tocOut(book.toc || [])
  })
  // Books without a usable table of contents: find the chapters ourselves
  if (!book.toc || book.toc.length < 2) detectChapters().then((toc) => toc && toc.length && emit('toc', { toc, detected: true }))
}

function tocOut(items) {
  return items.map((i) => ({ label: (i.label || '').trim(), target: i.href, subitems: tocOut(i.subitems || []) }))
}

// ---------------------------------------------------------------- chapters for books without a TOC

const CHAPTER_RE = /^\s*((chapter|part|book|prologue|epilogue|interlude|afterword|foreword|introduction|preface|cap[ií]tulo|chapitre|kapitel|capitolo|parte)\b|[IVXLC]{1,7}\.?\s*$|\d{1,3}\.?\s*$)/i

async function detectChapters() {
  const sections = book.sections || []
  const out = []
  for (let i = 0; i < sections.length && i < 1000; i++) {
    const sec = sections[i]
    if (!sec || !sec.createDocument || sec.linear === 'no') continue
    let doc
    try {
      doc = await sec.createDocument()
    } catch (e) {
      continue
    }
    const body = doc.body
    if (!body) continue
    const candidates = [...body.querySelectorAll('h1, h2, h3, p, div')].filter((el) => {
      const text = (el.textContent || '').trim()
      if (!text || text.length > 80) return false
      if (/^H[1-3]$/.test(el.tagName)) return true
      return CHAPTER_RE.test(text) && el.children.length <= 2
    })
    // One chapter per heading; for p/div matches only the first few per section count
    let found = 0
    for (const el of candidates) {
      if (!/^H[1-3]$/.test(el.tagName) && found >= 1 && sections.length > 3) break
      const range = doc.createRange()
      range.selectNodeContents(el)
      let cfi
      try {
        cfi = view.getCFI(i, range)
      } catch (e) {
        continue
      }
      const label = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (out.length && out[out.length - 1].label === label) continue
      out.push({ label, target: cfi, subitems: [] })
      found++
    }
    if (!candidates.length && sections.length > 3 && sections.length < 200) {
      const first = (body.textContent || '').trim().split('\n')[0].trim()
      if (first) out.push({ label: first.slice(0, 60), target: i, subitems: [] })
    }
  }
  detectedToc = out.filter((c) => typeof c.target === 'string')
  return out
}

function chapterLabel(detail) {
  if (detail.tocItem && detail.tocItem.label) return detail.tocItem.label.trim()
  if (!detectedToc || !detectedToc.length || !detail.cfi) return ''
  const start = CFI.collapse(detail.cfi)
  let label = ''
  for (const c of detectedToc) {
    try {
      if (CFI.compare(c.target, start) <= 0) label = c.label
      else break
    } catch (e) {}
  }
  return label
}

// ---------------------------------------------------------------- events from the book

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

/**
 * MOBI files made by some converters start with a cover page whose picture points at a file name
 * ("images/00001.jpg") instead of a MOBI record, so the engine can't find it and the book opens on a
 * blank page. The name's number isn't the record number (the cover is usually far later), so only that
 * case is fixed: a lone unresolved picture on the opening page gets the book's own cover.
 */
let mobiCoverUrl = null
function fixMobiCover(doc, index) {
  const b = book || (view && view.book)
  if (!b || typeof b.loadRecindex !== 'function' || typeof b.getCover !== 'function' || index > 1) return
  const broken = [...doc.querySelectorAll('img[src]')].filter((img) => !/^(blob|data|https?):/i.test(img.getAttribute('src') || ''))
  if (broken.length !== 1 || doc.querySelectorAll('img').length !== 1) return
  ;(mobiCoverUrl ? Promise.resolve(mobiCoverUrl) : b.getCover().then((blob) => (mobiCoverUrl = blob ? URL.createObjectURL(blob) : null)))
    .then((url) => {
      if (url) broken[0].src = url
    })
    .catch(() => {})
}

function onLoad(e) {
  const { doc, index } = e.detail
  docs.set(index, doc)
  fixMobiCover(doc, index)
  if (readAlong) readAlong.onLoad(doc)

  doc.addEventListener('click', (ev) => {
    if (ev.defaultPrevented) return
    if (ev.target.closest && ev.target.closest('a[href]')) return
    const sel = doc.getSelection()
    if (sel && !sel.isCollapsed) return
    const frame = doc.defaultView.frameElement
    const x = (frame ? frame.getBoundingClientRect().left : 0) + ev.clientX
    const w = window.innerWidth
    const zone = settings.flow === 'scrolled' ? 'center' : x < w * 0.28 ? 'left' : x > w * 0.72 ? 'right' : 'center'
    // Read along: a quick tap on any word starts the audiobook from there (pages turn by themselves;
    // swipes, and taps on the margins or blank space, still turn pages)
    if (readAlong && readAlong.ready && settings.readAlong && settings.readAlong !== 'off') {
      const r = doc.caretRangeFromPoint ? doc.caretRangeFromPoint(ev.clientX, ev.clientY) : null
      const node = r && r.startContainer
      if (node && node.nodeType === 3 && pointOnWord(r, ev.clientX, ev.clientY)) {
        const t = readAlong.timeAt(doc, index, r)
        // a word with no narration (skipped by the narrator, or outside what's read): say so
        if (t != null && readAlong.noAudio && readAlong.noAudio(readAlong.lastTapWord)) {
          emit('readalong-noaudio', {})
          return
        }
        if (t != null) {
          emit('play-from', { time: t })
          return
        }
      }
    }
    // The top of the screen brings the bars back (Read along fades them while the audio plays)
    const y = (frame ? frame.getBoundingClientRect().top : 0) + ev.clientY
    if (y < window.innerHeight * 0.15) return emit('tap', { zone: 'top' })
    // Edges turn the page, following the turn direction setting (the book's own direction by default)
    const nextRight = nextOnRight(settings, isRtlBook())
    if (zone === 'left') turnBy(nextRight ? -1 : 1)
    else if (zone === 'right') turnBy(nextRight ? 1 : -1)
    emit('tap', { zone })
  })
  doc.addEventListener('selectionchange', () => {
    clearTimeout(selectionTimer)
    selectionTimer = setTimeout(() => reportSelection(doc, index), 350)
  })
  doc.addEventListener('touchstart', () => readAlong && readAlong.userNavigated(), { passive: true })
  forwardKeys(doc)
  doc.addEventListener('wheel', () => readAlong && readAlong.userNavigated(), { passive: true })
}

function reportSelection(doc, index) {
  const sel = doc.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    if (lastSelection && lastSelection.doc === doc) {
      lastSelection = null
      emit('selection-cleared', {})
    }
    return
  }
  const range = sel.getRangeAt(0)
  const text = sel.toString().replace(/\s+/g, ' ').trim()
  if (!text) return
  let cfi = null
  try {
    cfi = view.getCFI(index, range)
  } catch (e) {}
  const r = range.getBoundingClientRect()
  const frame = doc.defaultView.frameElement
  const fr = frame ? frame.getBoundingClientRect() : { left: 0, top: 0 }
  lastSelection = { doc, index, range: range.cloneRange(), cfi, text }
  if (readAlong) readAlong.userNavigated()
  emit('selection', {
    cfi,
    text,
    word: /^[\p{L}\p{N}'’-]+$/u.test(text) ? text : null,
    rect: { left: fr.left + r.left, top: fr.top + r.top, right: fr.left + r.right, bottom: fr.top + r.bottom },
    canPlayFromHere: !!(readAlong && readAlong.ready)
  })
}

function onRelocate(e) {
  const d = e.detail
  lastRelocate = d
  // a newly shown section: grey out what the narrator skipped there (when read along is lined up)
  if (readAlong && readAlong.ready) readAlong.paintSkipped()
  const start = d.cfi ? CFI.collapse(d.cfi) : null
  const isFixed = book.rendition && book.rendition.layout === 'pre-paginated'
  const pageIndex = d.section ? d.section.current : 0
  emit('relocate', {
    cfi: start,
    // PDFs are saved as page numbers, like the Audiobookshelf web reader does
    location: isFixed && isPdf() ? String(pageIndex + 1) : start,
    fraction: d.fraction || 0,
    chapter: chapterLabel(d),
    page: d.pageItem ? d.pageItem.label : null,
    location_current: d.location ? d.location.current : null,
    location_total: d.location ? d.location.total : null,
    section: d.section || null,
    minutesLeftInChapter: d.time ? d.time.section : null,
    minutesLeft: d.time ? d.time.total : null,
    bookmarked: isBookmarked(d.cfi)
  })
}

let format = ''
const isPdf = () => format === 'pdf'

// ---------------------------------------------------------------- navigation

const isRtlBook = () => !!(book && (book.dir === 'rtl' || (view && view.renderer && view.renderer.getAttribute && view.renderer.getAttribute('dir') === 'rtl')))

/** One page forward (1) or back (-1), with the chosen page-turn animation (page curl by default) */
function turnBy(dir) {
  if (!view) return
  if (readAlong) readAlong.userNavigated()
  const th = THEMES[settings.theme] || THEMES.dark
  return animatedTurn(dir, {
    style: turnStyle(settings, !!th.eink),
    fromRight: nextOnRight(settings, isRtlBook()),
    paper: th.bg,
    turn: () => (dir > 0 ? view.next() : view.prev()),
    drawn: () => new Promise((res) => view.addEventListener('relocate', res, { once: true }))
  })
}

api.next = () => turnBy(1)
api.prev = () => turnBy(-1)
api.goTo = async (target) => {
  if (!view) return
  if (readAlong) readAlong.userNavigated()
  if (typeof target === 'string' && /^\d+$/.test(target)) target = parseInt(target, 10) - 1
  await view.goTo(target)
}
api.goToFraction = async (f) => {
  if (readAlong) readAlong.userNavigated()
  await view.goToFraction(Math.max(0, Math.min(1, f)))
}
api.currentCfi = () => (lastRelocate && lastRelocate.cfi ? CFI.collapse(lastRelocate.cfi) : null)
api.setSettings = (s) => applySettings(s)

// ---------------------------------------------------------------- bookmarks & highlights

function isBookmarked(rangeCfi) {
  if (!rangeCfi || !bookmarks.length) return false
  try {
    const start = CFI.collapse(rangeCfi)
    const end = CFI.collapse(rangeCfi, true)
    return bookmarks.some((b) => CFI.compare(b, start) >= 0 && CFI.compare(b, end) <= 0)
  } catch (e) {
    return false
  }
}

function setBookmarks(list) {
  bookmarks = (list || []).filter((c) => typeof c === 'string' && c.startsWith('epubcfi'))
}

api.setBookmarks = (list) => {
  setBookmarks(list)
  if (lastRelocate) emit('relocate-bookmark', { bookmarked: isBookmarked(lastRelocate.cfi) })
}

/** The bookmark(s) on the current page (to remove them) */
api.bookmarksOnPage = () => {
  if (!lastRelocate || !lastRelocate.cfi) return []
  const start = CFI.collapse(lastRelocate.cfi)
  const end = CFI.collapse(lastRelocate.cfi, true)
  return bookmarks.filter((b) => {
    try {
      return CFI.compare(b, start) >= 0 && CFI.compare(b, end) <= 0
    } catch (e) {
      return false
    }
  })
}

/** Text at the start of the page, for the bookmark's label */
api.pageText = () => {
  try {
    const r = lastRelocate && lastRelocate.range
    if (!r) return ''
    return r.toString().replace(/\s+/g, ' ').trim().slice(0, 200)
  } catch (e) {
    return ''
  }
}

function setAnnotations(list) {
  for (const cfi of annotations.keys()) {
    try {
      view.deleteAnnotation({ value: cfi })
    } catch (e) {}
  }
  annotations.clear()
  for (const a of list || []) {
    if (!a.cfi) continue
    annotations.set(a.cfi, a)
    try {
      view.addAnnotation({ value: a.cfi, color: a.color, note: a.note })
    } catch (e) {}
  }
}
api.setAnnotations = setAnnotations

function onDrawAnnotation(e) {
  const { draw, annotation } = e.detail
  if (annotation.readAlong) return draw(Overlayer.highlight, { color: 'rgba(255, 213, 79, 0.45)' })
  // colour-blind-safe colours when a colour vision mode is on (sent by the app)
  const hl = settings.hl || HIGHLIGHT_COLORS
  const color = hl[annotation.color] || hl.yellow
  if (annotation.color === 'underline') draw(Overlayer.underline, { color })
  else draw(Overlayer.highlight, { color })
}

api.clearSelection = () => {
  for (const doc of docs.values()) {
    try {
      doc.getSelection().removeAllRanges()
    } catch (e) {}
  }
  lastSelection = null
}

// ---------------------------------------------------------------- search

api.search = async (query) => {
  const token = ++searchToken
  if (!view || !query) return
  try {
    view.clearSearch()
  } catch (e) {}
  try {
    for await (const r of view.search({ query, matchCase: false, matchDiacritics: false, matchWholeWords: false })) {
      if (token !== searchToken) return
      if (r === 'done') break
      if (r.progress != null) emit('search-progress', { progress: r.progress })
      else if (r.subitems) emit('search-results', { label: r.label || '', items: r.subitems.map((s) => ({ cfi: s.cfi, pre: s.excerpt.pre, match: s.excerpt.match, post: s.excerpt.post })) })
      else if (r.cfi) emit('search-results', { label: '', items: [{ cfi: r.cfi, pre: r.excerpt.pre, match: r.excerpt.match, post: r.excerpt.post }] })
    }
  } catch (e) {
    console.warn('[reader] search', e)
  }
  if (token === searchToken) emit('search-done', {})
}

api.clearSearch = () => {
  searchToken++
  try {
    view && view.clearSearch()
  } catch (e) {}
}

// ---------------------------------------------------------------- read-along

api.setTranscript = (lines, opts) => {
  // the app can send it before the book has opened: keep it until then (it used to be dropped)
  if (!readAlong) {
    pendingTranscript = lines
    return
  }
  return readAlong.setTranscript(lines, opts)
}
api.setPlaybackTime = (t) => {
  if (!readAlong || !readAlong.ready) return
  readAlong.setTime(t, lastRelocate && lastRelocate.range)
}
api.clearReadAlong = () => readAlong && readAlong.clear()
/** Playback time of the first word on the page showing (Read → X: listen from here) */
api.timeHere = () => {
  try {
    if (!readAlong || !readAlong.ready || !lastRelocate || !lastRelocate.range) return null
    const r = lastRelocate.range
    return readAlong.timeAt(r.startContainer.ownerDocument, lastRelocate.index, r)
  } catch (e) {
    return null
  }
}
/** Playback time for the current selection ("Play from here") */
api.selectionTime = () => {
  if (!readAlong || !lastSelection) return null
  return readAlong.timeAt(lastSelection.doc, lastSelection.index, lastSelection.range)
}

// Desktop: keys pressed while the book has focus go to the app
function forwardKeys(doc) {
  doc.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return
    emit('key', { key: e.key, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })
    if ([' ', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(e.key) && settings.flow !== 'scrolled') e.preventDefault()
  })
}
forwardKeys(document)
api.forwardKeys = forwardKeys

// For chapter detection fallbacks and debugging
api.wordsOfDoc = wordsOfDoc

emit('ready', {})

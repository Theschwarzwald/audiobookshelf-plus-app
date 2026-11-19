/**
 * ABS+ read along, built on the Readium navigator (readium/ts-toolkit).
 *
 * Runs in its own frame (static/reader/readium/index.html) inside the Transcription panel, next to
 * Lyrics and Karaoke, and keeps following the narration while another mode is showing.
 *
 *  - The EPUB is read straight from the file (works offline): container.xml -> OPF -> a Readium Web
 *    Publication manifest, with the table of contents (nav / NCX) and a positions list (page numbers,
 *    Readium's own definition: one position per 1024 bytes of each chapter).
 *  - Readium points each chapter's <base> at the publication's URL, so images, stylesheets and fonts are
 *    swapped for blob: URLs from the zip before Readium sees the chapter.
 *  - Read along: the transcript is aligned with the book's words (static/reader/readalong.js, the same
 *    alignment as the full reader); the narrated word is highlighted (CSS Custom Highlight) and the page
 *    turns when it reaches the end (page curl through the app's AbsTurnHost).
 *  - Taps: edges turn pages, the text plays from the tapped word; swipes turn pages; a hold (audio
 *    paused) looks the word up.
 *
 * API: window.ReadiumAPI (the panel calls it directly; the frame is same-origin)
 * Events to the panel: window.absHost(type, data)
 */
import { EpubNavigator, EpubPreferences } from '@readium/navigator'
import { Manifest, Publication, Link, Locator, Resource } from '@readium/shared'
import { unzipSync, strFromU8 } from 'fflate'
import { wordsOfDoc, alignWords, alignWordsAsync, mapper, offBookFinder, skippedRanges, addedPassages, addedText, noAudioFinder, ADDED_CSS, openAdded } from '../../static/reader/readalong.js'
import { animatedTurn, turnStyle } from '../../static/reader/turn.js'

const BASE = 'https://book.absplus.invalid/'
const XLINK = 'http://www.w3.org/1999/xlink'
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
const norm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')

const emit = (type, data) => {
  try {
    if (typeof window.absHost === 'function') window.absHost(type, data || {})
  } catch (e) {}
}

// ------------------------------------------------------------------ the zip

const MIME = {
  xhtml: 'application/xhtml+xml', html: 'text/html', htm: 'text/html', xml: 'application/xml', css: 'text/css', js: 'text/javascript',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  otf: 'font/otf', ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2', mp3: 'audio/mpeg', mp4: 'video/mp4', m4a: 'audio/mp4', ncx: 'application/x-dtbncx+xml', opf: 'application/oebps-package+xml'
}

class Zip {
  constructor(u8) {
    this.u8 = u8
    this.sizes = new Map()
    unzipSync(u8, {
      filter: (f) => {
        this.sizes.set(f.name, f.originalSize || 0)
        return false
      }
    })
    this.names = [...this.sizes.keys()]
    this.lower = new Map(this.names.map((n) => [n.toLowerCase(), n]))
    this.blobs = new Map()
    this.types = new Map()
  }
  has(p) {
    return this.sizes.has(p) || this.lower.has(String(p).toLowerCase())
  }
  real(p) {
    return this.sizes.has(p) ? p : this.lower.get(String(p).toLowerCase()) || p
  }
  bytes(p) {
    const name = this.real(p)
    const out = unzipSync(this.u8, { filter: (f) => f.name === name })
    return out[name] || null
  }
  text(p) {
    const b = this.bytes(p)
    return b ? strFromU8(b) : null
  }
  type(p) {
    return this.types.get(this.real(p)) || MIME[(p.split('.').pop() || '').toLowerCase()] || 'application/octet-stream'
  }
  /** blob: URL for a file in the book (stylesheets get their own url()s swapped too) */
  url(p, depth = 0) {
    const name = this.real(p)
    if (this.blobs.has(name)) return this.blobs.get(name)
    if (!this.has(name)) return null
    let blob
    const type = this.type(name)
    if (type === 'text/css' && depth < 4) blob = new Blob([rewriteCss(this.text(name) || '', name, this, depth + 1)], { type })
    else blob = new Blob([this.bytes(name)], { type })
    const u = URL.createObjectURL(blob)
    this.blobs.set(name, u)
    return u
  }
}

/** "../Images/a.jpg" seen from "OEBPS/Text/ch1.xhtml" -> "OEBPS/Images/a.jpg" (null for web links) */
function resolvePath(from, rel) {
  if (!rel) return null
  const r = String(rel).trim()
  if (!r || r.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(r)) return null
  try {
    const u = new URL(r, 'https://z.invalid/' + from)
    return decodeURIComponent(u.pathname.slice(1))
  } catch (e) {
    return null
  }
}

function rewriteCss(css, from, zip, depth) {
  return css
    .replace(/@import\s+(['"])([^'"]+)\1/g, (m, q, ref) => {
      const p = resolvePath(from, ref)
      const u = p && zip.url(p, depth)
      return u ? `@import url("${u}")` : m
    })
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
      const p = resolvePath(from, ref)
      const u = p && zip.url(p, depth)
      return u ? `url("${u}")` : m
    })
}

function parseDoc(text, type) {
  const xml = new DOMParser().parseFromString(text, type === 'text/html' ? 'text/html' : 'application/xhtml+xml')
  if (!xml.querySelector('parsererror')) return xml
  // Not well-formed XHTML (an HTML entity, a stray tag): read it as HTML instead
  return new DOMParser().parseFromString(text, 'text/html')
}

/** A chapter with its images, stylesheets and fonts pointing into the zip */
function chapterDoc(zip, path) {
  const doc = parseDoc(zip.text(path) || '', zip.type(path))
  const swap = (el, attr, ns) => {
    const v = ns ? el.getAttributeNS(ns, attr) : el.getAttribute(attr)
    const p = resolvePath(path, v)
    const u = p && zip.url(p)
    if (!u) return
    if (ns) el.setAttributeNS(ns, 'xlink:' + attr, u)
    else el.setAttribute(attr, u)
  }
  doc.querySelectorAll('img[src], source[src], video[src], audio[src], embed[src], input[src], track[src]').forEach((el) => swap(el, 'src'))
  doc.querySelectorAll('img[srcset], source[srcset]').forEach((el) => el.removeAttribute('srcset'))
  doc.querySelectorAll('[poster]').forEach((el) => swap(el, 'poster'))
  doc.querySelectorAll('link[href]').forEach((el) => {
    if (/stylesheet/i.test(el.getAttribute('rel') || '')) swap(el, 'href')
  })
  doc.querySelectorAll('image, use').forEach((el) => {
    if (el.hasAttribute('href')) swap(el, 'href')
    if (el.hasAttributeNS(XLINK, 'href')) swap(el, 'href', XLINK)
  })
  doc.querySelectorAll('object[data]').forEach((el) => swap(el, 'data'))
  doc.querySelectorAll('style').forEach((el) => (el.textContent = rewriteCss(el.textContent || '', path, zip, 1)))
  doc.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style')
    if (/url\(/i.test(s)) el.setAttribute('style', rewriteCss(s, path, zip, 1))
  })
  // Scripts don't run in read along
  doc.querySelectorAll('script').forEach((el) => el.remove())
  return doc
}

// ------------------------------------------------------------------ EPUB -> Readium publication

const hrefOf = (h) => {
  let s = String(h || '')
  if (s.startsWith(BASE)) s = s.slice(BASE.length)
  s = s.split('#')[0].split('?')[0]
  try {
    s = decodeURIComponent(s)
  } catch (e) {}
  return s.replace(/^\/+/, '')
}

class ZipResource extends Resource {
  constructor(zip, link) {
    super()
    this.zip = zip
    this._link = link
    this.path = hrefOf(link.href)
  }
  async link() {
    return this._link
  }
  async length() {
    return this.zip.sizes.get(this.zip.real(this.path))
  }
  async read(range) {
    const b = this.zip.bytes(this.path)
    if (!b) return undefined
    return range ? b.subarray(range.start, range.endInclusive + 1) : b
  }
  async readAsString() {
    return this.zip.text(this.path) || undefined
  }
  async readAsXML() {
    if (!this.zip.has(this.path)) return undefined
    return chapterDoc(this.zip, this.zip.real(this.path))
  }
  close() {}
}

class ZipFetcher {
  constructor(zip, links) {
    this.zip = zip
    this._links = links
  }
  links() {
    return this._links
  }
  get(link) {
    return new ZipResource(this.zip, link)
  }
  close() {}
}

const txt = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '')
const byTag = (root, name) => [...root.getElementsByTagNameNS('*', name)]
const child = (el, name) => [...el.children].find((c) => c.localName === name)

function readBook(zip) {
  const container = zip.text('META-INF/container.xml')
  if (!container) throw new Error("This isn't an EPUB (no META-INF/container.xml)")
  const cdoc = new DOMParser().parseFromString(container, 'application/xml')
  const rootfile = byTag(cdoc, 'rootfile')[0]
  const opfPath = rootfile && rootfile.getAttribute('full-path')
  if (!opfPath || !zip.has(opfPath)) throw new Error('The EPUB has no package file')
  const opf = new DOMParser().parseFromString(zip.text(opfPath), 'application/xml')

  const items = new Map()
  for (const it of byTag(opf, 'item')) {
    const path = resolvePath(opfPath, it.getAttribute('href'))
    if (!path) continue
    const rec = { id: it.getAttribute('id'), path, type: it.getAttribute('media-type') || zip.type(path), props: it.getAttribute('properties') || '' }
    items.set(rec.id, rec)
    zip.types.set(zip.real(path), rec.type)
  }
  const spineEl = byTag(opf, 'spine')[0]
  const spine = byTag(opf, 'itemref')
    .map((r) => ({ item: items.get(r.getAttribute('idref')), linear: r.getAttribute('linear') !== 'no' }))
    .filter((x) => x.item && /html|xml/.test(x.item.type) && zip.has(x.item.path))
  if (!spine.length) throw new Error('The EPUB has no chapters')

  const meta = byTag(opf, 'metadata')[0] || opf
  const title = txt(byTag(meta, 'title')[0]) || 'Book'
  const language = txt(byTag(meta, 'language')[0]) || undefined
  const rtl = spineEl && spineEl.getAttribute('page-progression-direction') === 'rtl'
  const fixed = byTag(meta, 'meta').some((m) => m.getAttribute('property') === 'rendition:layout' && txt(m) === 'pre-paginated')

  // table of contents: EPUB 3 nav, else the NCX
  let toc = []
  const navItem = [...items.values()].find((i) => /\bnav\b/.test(i.props))
  if (navItem && zip.has(navItem.path)) {
    const nd = parseDoc(zip.text(navItem.path), 'application/xhtml+xml')
    const nav = [...nd.getElementsByTagName('nav')].find((n) => /\btoc\b/.test(n.getAttribute('epub:type') || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || n.getAttribute('role') || '')) || nd.getElementsByTagName('nav')[0]
    const walk = (ol) =>
      [...(ol ? ol.children : [])]
        .filter((li) => li.localName === 'li')
        .map((li) => {
          const a = child(li, 'a') || child(li, 'span')
          const href = a && a.getAttribute('href') ? resolvePath(navItem.path, a.getAttribute('href').split('#')[0]) : null
          const frag = a && a.getAttribute('href') && a.getAttribute('href').includes('#') ? '#' + a.getAttribute('href').split('#')[1] : ''
          return { title: txt(a) || '…', href: href ? href + frag : null, children: walk(child(li, 'ol')) }
        })
    if (nav) toc = walk(child(nav, 'ol') || nav.getElementsByTagName('ol')[0])
  }
  if (!toc.length) {
    const ncxId = spineEl && spineEl.getAttribute('toc')
    const ncx = (ncxId && items.get(ncxId)) || [...items.values()].find((i) => i.type === 'application/x-dtbncx+xml')
    if (ncx && zip.has(ncx.path)) {
      const nd = new DOMParser().parseFromString(zip.text(ncx.path), 'application/xml')
      const walk = (el) =>
        [...el.children]
          .filter((c) => c.localName === 'navPoint')
          .map((np) => {
            const src = (byTag(np, 'content')[0] || { getAttribute: () => '' }).getAttribute('src') || ''
            const path = resolvePath(ncx.path, src.split('#')[0])
            return { title: txt(child(child(np, 'navLabel') || np, 'text')) || '…', href: path ? path + (src.includes('#') ? '#' + src.split('#')[1] : '') : null, children: walk(np) }
          })
      const map = byTag(nd, 'navMap')[0]
      if (map) toc = walk(map)
    }
  }

  const enc = (p) => p.split('/').map(encodeURIComponent).join('/')
  const encHref = (h) => (h ? enc(h.split('#')[0]) + (h.includes('#') ? '#' + h.split('#')[1] : '') : h)
  const readingOrder = spine.map((s) => ({ href: enc(s.item.path), type: s.item.type === 'text/html' ? 'text/html' : 'application/xhtml+xml', properties: s.linear ? undefined : { linear: false } }))
  const inSpine = new Set(spine.map((s) => s.item.path))
  const resources = [...items.values()].filter((i) => !inSpine.has(i.path)).map((i) => ({ href: enc(i.path), type: i.type }))
  const tocJson = (list) => list.filter((t) => t.href).map((t) => ({ href: encHref(t.href), title: t.title, children: tocJson(t.children) }))
  const manifest = Manifest.deserialize({
    '@context': 'https://readium.org/webpub-manifest/context.jsonld',
    metadata: { title, language: language ? [language] : undefined, readingProgression: rtl ? 'rtl' : 'ltr', conformsTo: 'https://readium.org/webpub-manifest/profiles/epub', presentation: fixed ? { layout: 'fixed' } : undefined },
    links: [{ rel: 'self', href: BASE + 'manifest.json', type: 'application/webpub+json' }],
    readingOrder,
    resources,
    toc: tocJson(toc)
  })
  if (!manifest) throw new Error("Couldn't read this book's contents")
  const links = [...manifest.readingOrder.items, ...manifest.resources.items]
  const publication = new Publication({ manifest, fetcher: new ZipFetcher(zip, links) })

  // positions (page numbers): one per 1024 bytes of each chapter, like Readium's streamers
  const positions = []
  const sectionFirstPosition = []
  spine.forEach((s, si) => {
    const n = Math.max(1, Math.ceil((zip.sizes.get(zip.real(s.item.path)) || 0) / 1024))
    sectionFirstPosition.push(positions.length + 1)
    for (let i = 0; i < n; i++) positions.push({ href: readingOrder[si].href, type: readingOrder[si].type, locations: { progression: i / n, position: positions.length + 1 } })
  })
  const total = positions.length
  positions.forEach((p) => (p.locations.totalProgression = (p.locations.position - 1) / total))
  return { publication, spine, toc, rtl, fixed, title, language, positions, sectionFirstPosition }
}

/** The contents with the page each entry starts on */
function tocWithPages() {
  const b = S.book
  const order = new Map(b.spine.map((s, i) => [s.item.path, i]))
  const walk = (list) =>
    (list || []).map((t) => {
      const i = t.href ? order.get(t.href.split('#')[0]) : undefined
      return { title: t.title, href: t.href, page: i !== undefined ? b.sectionFirstPosition[i] : null, children: walk(t.children) }
    })
  return walk(b.toc)
}

// ------------------------------------------------------------------ state

const S = {
  zip: null,
  book: null,
  nav: null,
  frames: new Map(), // section -> window
  docWords: new WeakMap(),
  sec: 0,
  progression: 0,
  page: 1,
  playing: false,
  follow: true,
  userNavAt: 0,
  settings: {},
  theme: { bg: '#121212', fg: '#e8e8e8', highlight: 'rgba(255, 213, 79, 0.45)', eink: false },
  ra: null, // alignment
  lastKey: '',
  turning: false,
  // reading the book with the audiobook put aside: page controls, dictionary, no following
  reading: false,
  lookupWnd: null
}

const secOfHref = (href) => {
  const h = hrefOf(href)
  if (!S.book) return -1
  return S.book.spine.findIndex((s) => s.item.path === h || encodeURI(s.item.path) === h)
}

function secOfWindow(wnd) {
  try {
    const b = wnd.document.querySelector('base[data-readium]') || wnd.document.querySelector('base')
    return b ? secOfHref(b.getAttribute('href') || b.href) : -1
  } catch (e) {
    return -1
  }
}

function liveFrame(sec) {
  const w = S.frames.get(sec)
  try {
    if (w && w.document && w.frameElement && w.frameElement.isConnected) return w
  } catch (e) {}
  return null
}

function pageNumber() {
  const b = S.book
  if (!b) return { page: 0, total: 0 }
  const first = b.sectionFirstPosition[S.sec] || 1
  const next = S.sec + 1 < b.sectionFirstPosition.length ? b.sectionFirstPosition[S.sec + 1] : b.positions.length + 1
  const page = Math.min(next - 1, first + Math.round(S.progression * (next - first)))
  return { page: Math.max(1, page), total: b.positions.length }
}

function chapterTitle() {
  const b = S.book
  if (!b) return ''
  let best = ''
  const path = b.spine[S.sec] && b.spine[S.sec].item.path
  const walk = (list) => {
    for (const t of list) {
      if (t.href && t.href.split('#')[0] === path && !best) best = t.title
      walk(t.children || [])
    }
  }
  walk(b.toc)
  if (best) return best
  // the last TOC entry at or before this chapter
  const order = new Map(b.spine.map((s, i) => [s.item.path, i]))
  let at = -1
  const walk2 = (list) => {
    for (const t of list) {
      const i = t.href ? order.get(t.href.split('#')[0]) : undefined
      if (i !== undefined && i <= S.sec && i >= at) {
        at = i
        best = t.title
      }
      walk2(t.children || [])
    }
  }
  walk2(b.toc)
  return best
}

function sendPosition() {
  let { page, total } = pageNumber()
  // just picked a page: say that page (positions are 1024 bytes each, a screen can hold two)
  if (S.wantPage && Math.abs(page - S.wantPage) <= 4) page = S.wantPage
  else S.wantPage = 0
  S.page = page
  emit('position', { page, total, chapter: chapterTitle(), section: S.sec, progression: S.progression, follow: S.follow })
}

// ------------------------------------------------------------------ frames: style, taps, holds, swipes

/** a touch screen (phones): no text selection there, holds look words up; a mouse can select instead */
const coarse = () => { try { return window.matchMedia('(pointer: coarse)').matches } catch (e) { return true } }

function styleFrame(wnd) {
  const doc = wnd.document
  let s = doc.getElementById('absplus-ra-style')
  if (!s) {
    s = doc.createElement('style')
    s.id = 'absplus-ra-style'
    ;(doc.head || doc.documentElement).appendChild(s)
  }
  // the narrated word: a soft tint, underlined (the Karaoke look) when the app gives an underline colour
  // box mode (the app's Karaoke look): the box is drawn by paint(); the highlight only underlines, on e-ink
  const raFill = S.theme.box ? 'transparent' : S.theme.highlight
  const raLine = S.theme.box ? (S.theme.boxUnderline ? S.theme.underline : '') : S.theme.underline
  s.textContent = `::highlight(absplus-ra) { background-color: ${raFill}; color: inherit;${raLine ? ` text-decoration: underline ${raLine}; text-decoration-thickness: 2px; text-underline-offset: 3px;` : ''} }
    ::highlight(absplus-skip) { color: rgba(128, 128, 128, 0.75); text-decoration: line-through rgba(128, 128, 128, 0.45); }
    ::highlight(absplus-lookup) { background-color: ${S.theme.lookup || 'rgba(66, 153, 225, 0.45)'}; color: inherit; text-decoration: underline; }
    ${coarse() ? 'html, body { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }' : ''} html, body { -webkit-tap-highlight-color: transparent; }`
}

function wordAt(doc, x, y) {
  let range = null
  if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(x, y)
  else if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) {
      range = doc.createRange()
      range.setStart(p.offsetNode, p.offset)
    }
  }
  if (!range || !range.startContainer || range.startContainer.nodeType !== 3) return null
  const node = range.startContainer
  const off = range.startOffset
  const re = wordRe()
  let m
  while ((m = re.exec(node.data)) !== null) {
    if (m.index <= off && off <= m.index + m[0].length) {
      // the finger must be on the word itself, not the margin next to it
      const r = doc.createRange()
      r.setStart(node, m.index)
      r.setEnd(node, m.index + m[0].length)
      const box = r.getBoundingClientRect()
      if (x < box.left - 12 || x > box.right + 12 || y < box.top - 12 || y > box.bottom + 12) return null
      return { word: m[0], node, start: m.index, end: m.index + m[0].length, range: r }
    }
  }
  return null
}

function attachFrame(wnd, sec) {
  const doc = wnd.document
  if (doc.__absplus) return
  doc.__absplus = true
  let down = null
  let timer = 0
  let held = 0
  const W = () => wnd.innerWidth || doc.documentElement.clientWidth || 1
  doc.addEventListener(
    'pointerdown',
    (e) => {
      down = { x: e.clientX, y: e.clientY, at: Date.now() }
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!down) return
        const w = wordAt(doc, down.x, down.y)
        if (!w) return
        // the dictionary works in reading mode only (audiobook put aside)
        if (!S.reading || S.playing) return
        held = Date.now()
        markLookup(wnd, w.range)
        const time = timeAtWord(doc, sec, w)
        const r = w.range.getBoundingClientRect()
        const fr = wnd.frameElement ? wnd.frameElement.getBoundingClientRect() : { left: 0, top: 0 }
        emit('lookup', { word: w.word, time, x: fr.left + r.left + r.width / 2, y: fr.top + r.top })
      }, 550)
    },
    true
  )
  doc.addEventListener(
    'pointermove',
    (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) clearTimeout(timer)
    },
    true
  )
  const up = (e) => {
    clearTimeout(timer)
    const d = down
    down = null
    if (!d || e.type === 'pointercancel') return
    if (e.target && e.target.closest && e.target.closest('.abs-added')) return // the red mark shows its text
    if (Date.now() - held < 900) return // that was a hold
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // swipe: left = next (or previous in right-to-left books)
      const forward = dx < 0 !== !!(S.book && S.book.rtl)
      return turnBy(forward ? 1 : -1)
    }
    if (Math.hypot(dx, dy) > 12 || Date.now() - d.at > 500) return
    const x = e.clientX
    const w = W()
    const a = doc.activeElement
    if (e.target && e.target.closest && e.target.closest('a[href]')) return // links: Readium follows them
    if (x < w * 0.22) return turnBy(S.book && S.book.rtl ? 1 : -1)
    if (x > w * 0.78) return turnBy(S.book && S.book.rtl ? -1 : 1)
    if (S.reading) return emit('tap', {}) // reading: text taps don't move the audio
    const hit = wordAt(doc, e.clientX, e.clientY)
    const t = hit ? timeAtWord(doc, sec, hit) : null
    // a word with no narration (skipped by the narrator, or outside what's read): say so
    if (t != null && S.ra && S.ra.noAudio && S.ra.noAudio(S.ra.lastTapWord)) {
      emit('noaudio', {})
      if (a && a.blur) a.blur()
      return
    }
    if (t != null) {
      S.userNavAt = 0
      setFollow(true)
      emit('seek', { t })
    }
    else emit('tap', {})
    if (a && a.blur) a.blur()
  }
  doc.addEventListener('pointerup', up, true)
  doc.addEventListener('pointercancel', up, true)
  doc.addEventListener('contextmenu', (e) => coarse() && e.preventDefault(), true)
  // a mouse: select a word (double-click or drag) to look it up — reading mode, audio paused
  doc.addEventListener('mouseup', (e) => {
    if (!S.reading || S.playing) return
    const sel = wnd.getSelection && wnd.getSelection()
    const text = sel && !sel.isCollapsed ? String(sel).trim() : ''
    if (!text || text.length > 60 || text.split(/\s+/).length > 3) return
    const r = sel.getRangeAt(0)
    markLookup(wnd, r.cloneRange())
    const b = r.getBoundingClientRect()
    const fr = wnd.frameElement ? wnd.frameElement.getBoundingClientRect() : { left: 0, top: 0 }
    held = Date.now()
    emit('lookup', { word: text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), time: null, x: fr.left + b.left + b.width / 2, y: fr.top + b.top })
    setTimeout(() => sel.removeAllRanges(), 0)
  }, true)
}

// ------------------------------------------------------------------ navigation

function userNavigated() {
  S.userNavAt = Date.now()
  if (S.ra && S.playing) setFollow(false)
}

function setFollow(on) {
  if (S.follow === on) return
  S.follow = on
  S.lastKey = ''
  emit('follow', { follow: on })
}

const waitPosition = () => new Promise((res) => {
  S.onNextPosition = res
  setTimeout(res, 1200)
})

function turnBy(dir, auto) {
  if (!S.nav) return Promise.resolve()
  S.wantPage = 0
  if (!auto) userNavigated()
  const nav = S.nav
  const style = turnStyle(S.settings, S.theme.eink)
  if (!window.AbsTurnHost && style !== 'none') {
    // In a browser (no native page curl): the new page slides in
    const box = document.getElementById('book')
    return new Promise((res) => (dir > 0 ? nav.goForward(false, res) : nav.goBackward(false, res))).then(() => {
      try {
        const from = (dir > 0) !== !!(S.book && S.book.rtl) ? 36 : -36
        box.animate([{ transform: 'translateX(' + from + 'px)', opacity: 0.35 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 220, easing: 'ease-out' })
      } catch (e) {}
    })
  }
  return animatedTurn(dir, {
    style,
    fromRight: dir > 0 !== !!(S.book && S.book.rtl),
    paper: S.theme.paper || S.theme.bg, // the page can be see-through (cover shading behind): the curl needs a colour
    turn: () => new Promise((res) => (dir > 0 ? nav.goForward(false, res) : nav.goBackward(false, res))),
    drawn: waitPosition
  })
}

function goSection(sec, progression) {
  const b = S.book
  if (!b || !S.nav || !b.spine[sec]) return Promise.resolve(false)
  const ro = b.publication.readingOrder.items[sec]
  const loc = Locator.deserialize({ href: ro.href, type: ro.type || 'application/xhtml+xml', locations: { progression: Math.max(0, Math.min(0.999, progression || 0)) } })
  return new Promise((res) => S.nav.go(loc, false, res))
}

// ------------------------------------------------------------------ read along

function buildTranscriptWords(lines) {
  const tNorm = []
  const tRaw = []
  const tTime = []
  lines.forEach((l) => {
    const text = l.t || ''
    const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
    const re = wordRe()
    const words = []
    let m
    while ((m = re.exec(text)) !== null) words.push({ n: norm(m[0]), at: m.index, raw: m[0] })
    const measured = []
    if (Array.isArray(l.w)) {
      for (const [word, ws, we] of l.w) {
        const parts = String(word).match(wordRe()) || []
        parts.forEach((p, i) => measured.push({ n: norm(p), t: parts.length > 1 ? ws + ((we - ws) * i) / parts.length : ws }))
      }
    }
    let j = 0
    words.forEach((w, i) => {
      let t = null
      if (measured.length === words.length) t = measured[i].t
      else
        for (let k = j; k < Math.min(measured.length, j + 4); k++)
          if (measured[k].n === w.n) {
            t = measured[k].t
            j = k + 1
            break
          }
      tNorm.push(w.n)
      tRaw.push(w.raw)
      tTime.push(t != null ? t : l.s + (w.at / Math.max(1, text.length)) * (end - l.s))
    })
  })
  return { tNorm, tTime, tRaw }
}

async function align(lines, opts = {}) {
  const b = S.book
  if (!b || !lines || !lines.length) return emit('status', { state: 'no-transcript' })
  if (b.fixed) return emit('status', { state: 'unavailable', reason: 'fixed-layout' })
  const token = {}
  S.aligning = token
  emit('status', { state: 'aligning', progress: 0, step: 'transcript' })
  // how long each step takes (window.__raTimings, for support)
  const tm = { start: performance.now() }
  window.__raTimings = tm
  const { tNorm, tTime, tRaw } = buildTranscriptWords(lines)
  tm.transcript = Math.round(performance.now() - tm.start)
  const eNorm = []
  const eSec = []
  const eIdx = []
  const secCount = []
  const secStart = []
  for (let s = 0; s < b.spine.length; s++) {
    if (S.aligning !== token) return
    secStart.push(eNorm.length)
    let n = 0
    if (b.spine[s].linear) {
      try {
        const doc = parseDoc(S.zip.text(b.spine[s].item.path) || '', S.zip.type(b.spine[s].item.path))
        const words = wordsOfDoc(doc)
        for (let i = 0; i < words.length; i++) {
          eNorm.push(words[i].norm)
          eSec.push(s)
          eIdx.push(i)
        }
        n = words.length
      } catch (e) {}
    }
    secCount.push(n)
    if (s % 4 === 3) {
      emit('status', { state: 'aligning', progress: s / b.spine.length, step: 'book' })
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  tm.book = Math.round(performance.now() - tm.start)
  emit('status', { state: 'aligning', progress: 1, step: 'match', words: tNorm.length + eNorm.length })
  const pairs = await alignWordsAsync(tNorm, eNorm, { fresh: !!opts.fresh })
  tm.match = Math.round(performance.now() - tm.start)
  if (S.aligning !== token) return
  const matched = tNorm.length ? pairs.length / tNorm.length : 0
  if (pairs.length < 50) return emit('status', { state: 'unavailable', reason: 'no-match', matched })
  const pt = pairs.map((p) => p[0])
  const pe = pairs.map((p) => p[1])
  // skipped book text by section: sec -> [[firstIdx, lastIdx]]
  const skipped = new Map()
  for (const [a, b] of skippedRanges(pt, pe)) {
    for (let g = a; g < b; ) {
      const sec = eSec[g]
      let h = g
      while (h + 1 < b && eSec[h + 1] === sec) h++
      if (!skipped.has(sec)) skipped.set(sec, [])
      skipped.get(sec).push([eIdx[g], eIdx[h]])
      g = h + 1
    }
  }
  // added by the narrator, by section: sec -> [{ idx, text }]
  const added = new Map()
  const addedSpans = [] // narration word ranges of each added passage, to open its bubble as it's said
  addedPassages(pt, pe, tNorm.length).forEach((a, pid) => {
    const g = Math.min(eNorm.length - 1, a.at)
    if (!added.has(eSec[g])) added.set(eSec[g], [])
    added.get(eSec[g]).push({ pid, idx: eIdx[g], text: addedText(tRaw, a) })
    addedSpans.push({ pid, from: a.from - 2, to: a.to })
  })
  S.ra = { addedSpans, addedEls: new Map(), addedOpen: -1, noAudio: noAudioFinder(pt, pe), added, skipped, skipPainted: new WeakSet(), t2e: mapper(pt, pe), e2t: mapper(pe, pt), offBook: offBookFinder(pt, pe), isOffBook: false, tTime, eSec, eIdx, eCount: eNorm.length, secCount, secStart }
  S.lastKey = ''
  paintSkipped()
  tm.done = Math.round(performance.now() - tm.start)
  emit('status', { state: 'ready', matched })
}

function wordAtTime(t) {
  const a = S.ra.tTime
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
  return ans
}

/**
 * A red line where the narrator says something the book doesn't have; a tap shows what was said. The markers
 * hold no text, so the book's words (and read along's word positions) don't change.
 */
function markAdded(doc, sec) {
  const list = S.ra && S.ra.added && S.ra.added.get(sec)
  if (!list || !list.length) return
  if (!doc.getElementById('absplus-added-style')) {
    const st = doc.createElement('style')
    st.id = 'absplus-added-style'
    st.textContent = ADDED_CSS
    ;(doc.head || doc.documentElement).appendChild(st)
  }
  const words = wordsFor(doc)
  const spots = list.map((a) => ({ ...a, w: words[Math.min(a.idx, words.length - 1)] })).filter((a) => a.w)
  spots.sort((p, q) => q.idx - p.idx) // from the end: earlier positions stay valid
  for (const a of spots) {
    try {
      const r = doc.createRange()
      r.setStart(a.w.node, a.w.start)
      r.collapse(true)
      const el = doc.createElement('span')
      el.className = 'abs-added'
      el.setAttribute('role', 'button')
      el.setAttribute('aria-label', 'The narrator adds lines here: tap to see them')
      el.dataset.added = a.text
      // a tap shows (or hides) the added words in a bubble right there in the text
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        e.preventDefault()
        openAdded(el, !el.classList.contains('open'))
      })
      r.insertNode(el)
      S.ra.addedEls.set(a.pid, el)
    } catch (e) {}
  }
  S.docWords.delete(doc) // text nodes were split: same words, new positions
}

/** Grey out the book text the narrator skipped, in each section once it's on screen */
function paintSkipped() {
  const ra = S.ra
  if (!ra || ((!ra.skipped || !ra.skipped.size) && (!ra.added || !ra.added.size))) return
  for (const [sec, wnd] of S.frames) {
    try {
      const doc = wnd && wnd.document
      if (!doc || ra.skipPainted.has(doc)) continue
      ra.skipPainted.add(doc)
      markAdded(doc, sec)
      if (!canHighlight(wnd)) continue
      const list = ra.skipped.get(sec)
      if (!list) continue
      const words = wordsFor(doc)
      if (!words.length) continue
      const ranges = []
      for (const [a, b] of list) {
        const w0 = words[Math.min(a, words.length - 1)]
        const w1 = words[Math.min(b, words.length - 1)]
        if (!w0 || !w1) continue
        const r = doc.createRange()
        r.setStart(w0.node, w0.start)
        r.setEnd(w1.node, w1.end)
        ranges.push(r)
      }
      if (ranges.length) wnd.CSS.highlights.set('absplus-skip', new wnd.Highlight(...ranges))
    } catch (e) {}
  }
}

function wordsFor(doc) {
  let w = S.docWords.get(doc)
  if (!w) {
    w = wordsOfDoc(doc)
    S.docWords.set(doc, w)
  }
  return w
}

function timeAtWord(doc, sec, hit) {
  const ra = S.ra
  if (!ra || sec < 0) return null
  const words = wordsFor(doc)
  let wi = words.findIndex((w) => w.node === hit.node && w.start <= hit.start && hit.start < Math.max(w.end, w.start + 1))
  if (wi < 0) wi = words.findIndex((w) => w.node === hit.node)
  if (wi < 0) return null
  ra.lastTapWord = ra.secStart[sec] + wi
  const k = Math.max(0, Math.min(ra.tTime.length - 1, ra.e2t(ra.secStart[sec] + wi)))
  return ra.tTime[k]
}

/** CSS Custom Highlights (Chrome 105+); older Android WebViews get a box drawn over the word instead */
const canHighlight = (wnd) => !!(wnd && wnd.CSS && wnd.CSS.highlights && wnd.Highlight)

/** Marks [range] in its frame as [name] (null clears it) */
function paint(wnd, name, range, color) {
  if (!wnd) return
  // the narrated word, Karaoke style: an outlined box with a soft tint drawn over it (plus the underline highlight on e-ink)
  const box = name === 'absplus-ra' && S.theme.box
  try {
    if (canHighlight(wnd)) {
      if (range) wnd.CSS.highlights.set(name, new wnd.Highlight(range))
      else wnd.CSS.highlights.delete(name)
      if (!box) return
    }
  } catch (e) {}
  // fallback: a box laid over the word (fixed to the frame's view; redrawn as pages turn)
  const doc = wnd.document
  let el = doc.getElementById(name)
  if (!range) {
    if (el) el.style.display = 'none'
    return
  }
  if (!el) {
    el = doc.createElement('div')
    el.id = name
    el.setAttribute('data-readium', 'true')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border-radius:3px;display:none'
    ;(doc.documentElement || doc.body).appendChild(el)
  }
  const rects = range.getClientRects()
  const r = rects.length ? rects[0] : range.getBoundingClientRect()
  if (box) {
    // Karaoke's box: 1.5 px outline, 6 px corners, a little room round the word (more below it on e-ink, for the underline)
    el.style.background = S.theme.highlight
    el.style.border = `1.5px solid ${S.theme.underline || color}`
    el.style.borderRadius = '6px'
    el.style.boxSizing = 'border-box'
    const below = S.theme.boxUnderline ? 7 : 2
    el.style.left = `${r.left - 4}px`
    el.style.top = `${r.top - 2}px`
    el.style.width = `${r.width + 8}px`
    el.style.height = `${r.height + 2 + below}px`
    el.style.display = r.width ? 'block' : 'none'
    return
  }
  el.style.background = color
  if (S.theme.underline) el.style.borderBottom = `2px solid ${S.theme.underline}`
  el.style.left = `${r.left - 1}px`
  el.style.top = `${r.top}px`
  el.style.width = `${r.width + 2}px`
  el.style.height = `${r.height}px`
  el.style.display = r.width ? 'block' : 'none'
}

/** The word being looked up stays marked while its meaning shows */
function markLookup(wnd, range) {
  clearLookup()
  paint(wnd, 'absplus-lookup', range, S.theme.lookup || 'rgba(66, 153, 225, 0.45)')
  S.lookupWnd = wnd
}

function clearLookup() {
  try {
    if (S.lookupWnd) paint(S.lookupWnd, 'absplus-lookup', null)
  } catch (e) {}
  S.lookupWnd = null
}

function clearHighlight() {
  for (const w of S.frames.values()) {
    try {
      paint(w, 'absplus-ra', null)
    } catch (e) {}
  }
}

/** Called every clock tick by the panel (every frame when smooth, every 0.5 s on e-ink) */
function setTime(t) {
  const ra = S.ra
  if (!ra || !S.nav || S.turning || S.reading) return
  // the panel is closed (nothing has a size): catch up when it shows again
  if (isHidden()) return
  const k = wordAtTime(t)
  if (k < 0) return
  // the narration has left the book (improvised / not in this edition): no highlight until it's back
  const off = !!ra.offBook(k)
  if (off !== ra.isOffBook) {
    ra.isOffBook = off
    emit('offbook', { off })
  }
  // lines the narrator adds: their bubble opens over the red mark while they're said, and closes after
  const span = ra.addedSpans.find((s) => k >= s.from && k < s.to)
  const pid = span ? span.pid : -1
  if (pid !== ra.addedOpen) {
    const prev = ra.addedEls.get(ra.addedOpen)
    if (prev && prev.dataset.auto) {
      openAdded(prev, false)
      delete prev.dataset.auto
    }
    const el = pid >= 0 && ra.addedEls.get(pid)
    if (el && !el.classList.contains('open')) {
      openAdded(el, true)
      el.dataset.auto = '1'
    }
    ra.addedOpen = pid
  }
  if (off) {
    if (S.lastKey !== 'off') {
      clearHighlight()
      S.lastKey = 'off'
      // show where the book picks up again (not whatever page was open before a seek or re-align)
      if (S.follow) {
        const g0 = Math.min(ra.eCount - 1, Math.max(0, ra.t2e(k)))
        const sec0 = ra.eSec[g0]
        if (sec0 !== S.sec || !liveFrame(sec0)) {
          S.turning = true
          S.wantPage = 0
          goSection(sec0, ra.eIdx[g0] / Math.max(1, ra.secCount[sec0])).finally(() => setTimeout(() => (S.turning = false), 150))
        }
      }
    }
    return
  }
  const g = Math.min(ra.eCount - 1, Math.max(0, ra.t2e(k)))
  const sec = ra.eSec[g]
  const idx = ra.eIdx[g]
  const key = sec + ':' + idx
  if (key === S.lastKey && canHighlight(liveFrame(sec))) return
  if (!S.follow && Date.now() - S.userNavAt > 12000 && S.playing) setFollow(true) // back to the narration after a while
  const wnd = liveFrame(sec)
  if (!wnd || sec !== S.sec) {
    clearHighlight()
    if (S.follow) {
      S.lastKey = ''
      S.turning = true
      S.wantPage = 0
      goSection(sec, idx / Math.max(1, ra.secCount[sec])).finally(() => setTimeout(() => (S.turning = false), 150))
    }
    return
  }
  const words = wordsFor(wnd.document)
  if (!words.length) return
  const w = words[Math.min(idx, words.length - 1)]
  const range = wnd.document.createRange()
  try {
    range.setStart(w.node, w.start)
    range.setEnd(w.node, w.end)
  } catch (e) {
    return
  }
  S.lastKey = key
  paint(wnd, 'absplus-ra', range, S.theme.highlight)
  if (!S.follow) return
  // keep the word on the page: turn when it moves past the end, jump when it's far away
  const rect = range.getBoundingClientRect()
  const width = wnd.innerWidth || 1
  const height = wnd.innerHeight || 1
  const se = wnd.document.scrollingElement || wnd.document.documentElement
  if (S.settings.flow === 'scrolled') {
    // Doc view: keep the word in the upper part of the screen, scrolling gently
    if (rect.top >= height * 0.08 && rect.bottom <= height * 0.82) return
    try {
      wnd.scrollBy({ top: rect.top - height * 0.3, behavior: S.theme.eink ? 'auto' : 'smooth' })
    } catch (e) {
      se.scrollTop += rect.top - height * 0.3
    }
    return
  }
  const onPage = rect.left >= -2 && rect.right <= width + 2 && rect.top >= -2 && rect.bottom <= height + 2
  if (onPage) return
  const ahead = rect.left >= width - 2 && rect.left < width * 2 + 2
  S.turning = true
  const done = () => setTimeout(() => (S.turning = false), 120)
  if (ahead && !S.book.rtl) turnBy(1, true).finally(done)
  else {
    S.wantPage = 0
    const total = Math.max(1, se.scrollWidth)
    const prog = (se.scrollLeft + rect.left) / total
    goSection(sec, prog).finally(done)
  }
}

/** The panel (or this view) is hidden: nothing is laid out */
function isHidden() {
  try {
    const fe = window.frameElement
    if (fe && fe.getClientRects().length === 0) return true
  } catch (e) {}
  return (window.innerWidth || 0) < 50 || (window.innerHeight || 0) < 50
}

// ------------------------------------------------------------------ the navigator

function preferences() {
  const s = S.settings
  return new EpubPreferences({
    backgroundColor: S.theme.bg,
    textColor: S.theme.fg,
    linkColor: S.theme.fg,
    fontSize: (s.fontScale || 100) / 100,
    lineHeight: (s.lineSpacing || 140) / 100,
    scroll: s.flow === 'scrolled', // Doc view: one long scrolling page
    hyphens: s.hyphenate !== false,
    textAlign: s.justify === false ? 'start' : 'justify',
    pageGutter: S.theme.gutter || 20,
    fontWeight: S.theme.weight || null,
    columnCount: null, // one page, two side by side when the screen is wide
    selectionBackgroundColor: S.theme.highlight
  })
}

async function open(blob, opts) {
  await close()
  const o = opts || {}
  S.settings = o.settings || {}
  if (o.theme) S.theme = { ...S.theme, ...o.theme }
  document.documentElement.style.background = S.theme.bg
  document.body.style.background = S.theme.bg
  const u8 = new Uint8Array(await blob.arrayBuffer())
  S.zip = new Zip(u8)
  S.book = readBook(S.zip)
  const positions = S.book.positions.map((p) => Locator.deserialize(p))
  let initial
  if (o.start && typeof o.start.section === 'number' && S.book.spine[o.start.section]) {
    const ro = S.book.publication.readingOrder.items[o.start.section]
    initial = Locator.deserialize({ href: ro.href, type: ro.type || 'application/xhtml+xml', locations: { progression: o.start.progression || 0 } })
  }
  const container = document.getElementById('book')
  container.innerHTML = ''
  const noop = () => {}
  const listeners = {
    frameLoaded: (wnd) => {
      const sec = secOfWindow(wnd)
      if (sec < 0) return
      S.frames.set(sec, wnd)
      styleFrame(wnd)
      attachFrame(wnd, sec)
      S.lastKey = ''
      paintSkipped()
    },
    positionChanged: (loc) => {
      const sec = secOfHref(loc.href)
      if (sec >= 0) S.sec = sec
      S.progression = (loc.locations && loc.locations.progression) || 0
      sendPosition()
      if (S.onNextPosition) {
        const f = S.onNextPosition
        S.onNextPosition = null
        f()
      }
    },
    viewportChanged: noop,
    timelineItemChanged: noop,
    tap: () => true,
    click: () => true,
    zoom: noop,
    miscPointer: noop,
    scroll: noop,
    customEvent: noop,
    handleLocator: (loc) => {
      // links inside the book: go there; links to the web: ignore
      const h = loc && loc.href ? String(loc.href) : ''
      if (/^https?:/i.test(h) && !h.startsWith(BASE)) return false
      userNavigated()
      return true
    },
    textSelected: noop,
    contentProtection: noop,
    contextMenu: noop,
    peripheral: noop
  }
  S.nav = new EpubNavigator(container, S.book.publication, listeners, positions, initial, { preferences: preferences(), defaults: {} })
  // load() can stay pending after the first chapter is up (frames still settling): the first position
  // report means the book is showing
  const shown = new Promise((res) => (S.onNextPosition = res))
  S.nav.load().catch((e) => emit('error', { message: String((e && e.message) || e) }))
  await Promise.race([shown, new Promise((res) => setTimeout(res, 15000))])
  emit('ready', { title: S.book.title, total: S.book.positions.length, toc: tocWithPages(), rtl: S.book.rtl, fixed: S.book.fixed })
  sendPosition()
}

async function close() {
  S.aligning = null
  if (S.nav) {
    try {
      await S.nav.destroy()
    } catch (e) {}
  }
  S.nav = null
  if (S.zip) for (const u of S.zip.blobs.values()) URL.revokeObjectURL(u)
  S.zip = null
  S.book = null
  S.ra = null
  S.frames = new Map()
  S.lastKey = ''
}

window.ReadiumAPI = {
  open,
  close,
  setTranscript: (lines, opts) => align(lines, opts),
  setTime,
  setPlaying(p) {
    S.playing = !!p
    if (p && !S.follow && Date.now() - S.userNavAt > 3000) setFollow(true)
  },
  setReading(on) {
    S.reading = !!on
    clearLookup()
    if (S.reading) setFollow(false)
    else {
      // stay on this page; a tap on a word plays from it, and pressing play goes back to the narration
      S.userNavAt = Date.now()
      S.lastKey = ''
    }
  },
  clearLookup,
  /** Narration time of the first word on the page showing (X in reading mode: listen from here) */
  timeHere() {
    if (!S.ra) return null
    const wnd = liveFrame(S.sec)
    if (!wnd) return null
    const words = wordsFor(wnd.document)
    const W = wnd.innerWidth || 1
    const H = wnd.innerHeight || 1
    for (const w of words) {
      try {
        const r = wnd.document.createRange()
        r.setStart(w.node, w.start)
        r.setEnd(w.node, w.end)
        const b = r.getBoundingClientRect()
        if (b.width && b.left >= -2 && b.left < W && b.top >= -2 && b.top < H) return timeAtWord(wnd.document, S.sec, w)
      } catch (e) {}
    }
    return null
  },
  /** Every place [query] appears: [{ section, progression, page, chapter, pre, match, post }] (up to 300) */
  async search(query) {
    const b = S.book
    const q = String(query || '').trim()
    if (!b || q.length < 2) return []
    const needle = q.toLowerCase()
    const out = []
    for (let si = 0; si < b.spine.length && out.length < 300; si++) {
      let text = ''
      try {
        const doc = parseDoc(S.zip.text(b.spine[si].item.path) || '', S.zip.type(b.spine[si].item.path))
        text = ((doc.body || doc.documentElement).textContent || '').replace(/\s+/g, ' ')
      } catch (e) {
        continue
      }
      const lower = text.toLowerCase()
      let at = lower.indexOf(needle)
      while (at >= 0 && out.length < 300) {
        const progression = text.length ? at / text.length : 0
        const first = b.sectionFirstPosition[si]
        const next = si + 1 < b.sectionFirstPosition.length ? b.sectionFirstPosition[si + 1] : b.positions.length + 1
        const page = Math.min(next - 1, first + Math.floor(progression * (next - first)))
        out.push({ section: si, progression, page, pre: text.slice(Math.max(0, at - 40), at), match: text.slice(at, at + q.length), post: text.slice(at + q.length, at + q.length + 60) })
        at = lower.indexOf(needle, at + needle.length)
      }
      if (si % 8 === 7) await new Promise((r) => setTimeout(r, 0))
    }
    // chapter names for the results
    const prevSec = S.sec
    out.forEach((r) => {
      S.sec = r.section
      r.chapter = chapterTitle()
    })
    S.sec = prevSec
    return out
  },
  /** Go to a search result */
  async goToResult(r) {
    if (!r) return
    userNavigated()
    S.wantPage = r.page
    await goSection(r.section, r.progression)
  },
  follow() {
    S.userNavAt = 0
    setFollow(true)
  },
  next: () => turnBy(1),
  prev: () => turnBy(-1),
  async goToPage(n) {
    const b = S.book
    if (!b) return
    userNavigated()
    const page = Math.max(1, Math.min(b.positions.length, Math.round(n)))
    S.wantPage = page
    let sec = 0
    for (let i = 0; i < b.sectionFirstPosition.length; i++) if (b.sectionFirstPosition[i] <= page) sec = i
    const first = b.sectionFirstPosition[sec]
    const next = sec + 1 < b.sectionFirstPosition.length ? b.sectionFirstPosition[sec + 1] : b.positions.length + 1
    await goSection(sec, (page - first + 0.5) / Math.max(1, next - first)) // the middle of that page
  },
  async goToHref(href) {
    if (!S.nav || !href) return
    userNavigated()
    const path = href.split('#')[0]
    const sec = S.book.spine.findIndex((s) => s.item.path === path)
    const ro = sec >= 0 ? S.book.publication.readingOrder.items[sec] : null
    if (!ro) return
    const frag = href.includes('#') ? href.split('#')[1] : ''
    const link = Link.deserialize({ href: ro.href + (frag ? '#' + frag : ''), type: ro.type || 'application/xhtml+xml' })
    await new Promise((res) => S.nav.goLink(link, false, res))
  },
  async setTheme(theme, settings) {
    if (theme) S.theme = { ...S.theme, ...theme }
    if (settings) S.settings = { ...S.settings, ...settings }
    document.documentElement.style.background = S.theme.bg
    document.body.style.background = S.theme.bg
    for (const w of S.frames.values()) {
      try {
        styleFrame(w)
      } catch (e) {}
    }
    if (S.nav) await S.nav.submitPreferences(preferences()).catch(() => {})
    S.lastKey = ''
  },
  location: () => ({ section: S.sec, progression: S.progression, ...pageNumber(), page: S.wantPage || pageNumber().page }),
  toc: () => (S.book ? tocWithPages() : [])
}
emit('loaded', {})

/**
 * Page reader for PDFs and comics, loaded in an iframe by components/readers/PageReader.vue.
 *
 * Grimmory Reader's page reader, rebuilt for the WebView:
 *   Book Viewer: one page or a two-page spread (comics keep the cover alone), swipe or tap the
 *     edges to turn (mirrored for right-to-left manga), fit-page or fit-width, pinch or double-tap
 *     to zoom and drag to move around, rotate, night mode
 *   Doc Viewer: every page in one long scrolling column
 * PDFs also get a text layer, so words can be selected for the dictionary, highlights and notes,
 * search, and read-along with the audiobook.
 *
 * window.PagesAPI.onEvent(type, detail): loaded, page, tap, selection, selection-cleared,
 * annotation, search-results, search-progress, search-done, readalong-status, error
 */
import { alignWords, alignWordsAsync, mapper, offBookFinder, skippedRanges, addedPassages, addedText, noAudioFinder } from './readalong.js'
import { animatedTurn, turnStyle, nextOnRight } from './turn.js'

const api = {}
window.PagesAPI = api
const emit = (type, detail) => {
  try {
    if (api.onEvent) api.onEvent(type, detail)
  } catch (e) {
    console.error('[pages]', type, e)
  }
}

const viewport = document.getElementById('viewport')
let pdfjs = null
const S = {
  kind: 'pdf', // pdf | images
  count: 0,
  pdf: null,
  images: [],
  sizes: [],
  page: 0,
  si: 0,
  spreads: [],
  zoom: 1,
  tx: 0,
  ty: 0,
  docZoom: 1,
  settings: { fit: 'width', double: 'auto', rtl: false, night: false, mode: 'book', rotation: 0, eink: false, mono: false, bg: '#0f0d0c', hingeGap: 0, perf: {} },
  highlights: [],
  text: new Map(),
  textPromises: new Map(),
  renders: new WeakMap(),
  lastSelection: null,
  userNavAt: 0
}

// ---------------------------------------------------------------- open

api.open = async ({ kind, file, pages, count, getImage, startPage, settings }) => {
  S.kind = kind
  Object.assign(S.settings, settings || {})
  applyLook()
  try {
    if (kind === 'pdf') {
      // pdf.js: the pinned legacy build (works on older Android WebViews, e-ink devices included),
      // else the copy that ships with foliate-js
      let base = './pdfjs/'
      try {
        pdfjs = await import('./pdfjs/pdf.mjs')
      } catch (e) {
        base = './foliate/vendor/pdfjs/'
        pdfjs = await import('./foliate/vendor/pdfjs/pdf.mjs')
      }
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(`${base}pdf.worker.mjs`, import.meta.url).href
      const data = new Uint8Array(await file.arrayBuffer())
      S.pdf = await pdfjs.getDocument({
        data,
        cMapUrl: new URL(`${base}cmaps/`, import.meta.url).href,
        cMapPacked: true,
        standardFontDataUrl: new URL(`${base}standard_fonts/`, import.meta.url).href,
        isEvalSupported: false
      }).promise
      S.count = S.pdf.numPages
      S.sizes = new Array(S.count).fill(null)
      const first = await S.pdf.getPage(1)
      const v = first.getViewport({ scale: 1 })
      S.defaultAspect = v.width / v.height
    } else {
      // comics: either all page images, or a count and a function that unpacks one page when needed
      if (pages) {
        S.images = pages.map((b) => URL.createObjectURL(b))
        S.count = S.images.length
      } else {
        S.getImage = getImage
        S.count = count
        S.images = new Array(count).fill(null)
      }
      S.sizes = new Array(S.count).fill(null)
      S.defaultAspect = 0.66
    }
  } catch (e) {
    const msg = e && e.name === 'PasswordException' ? 'This PDF is password-protected.' : (e && e.message) || String(e)
    emit('error', { message: /Failed to fetch dynamically imported module|pdf\.mjs/.test(msg) ? 'The PDF engine is missing from this build (run scripts/fetch-foliate.sh).' : msg })
    return
  }
  S.page = Math.max(0, Math.min(S.count - 1, startPage || 0))
  let toc = []
  let hasText = false
  if (S.kind === 'pdf') {
    toc = await outline().catch(() => [])
    hasText = await textFor(S.page).then((t) => t.str.trim().length > 0).catch(() => false)
  }
  relayout(true)
  emit('loaded', { pageCount: S.count, toc, hasText, kind: S.kind })
  if (pendingTranscript) {
    const t = pendingTranscript
    pendingTranscript = null
    setTimeout(() => api.setTranscript(t), 0)
  }
  emit('page', { page: S.page, pageCount: S.count })
  window.addEventListener('resize', () => relayout(false))
}

async function outline() {
  const items = await S.pdf.getOutline()
  if (!items) return []
  const conv = async (list) => {
    const out = []
    for (const it of list) {
      let page = null
      try {
        let dest = it.dest
        if (typeof dest === 'string') dest = await S.pdf.getDestination(dest)
        if (Array.isArray(dest) && dest[0]) page = typeof dest[0] === 'number' ? dest[0] : await S.pdf.getPageIndex(dest[0])
      } catch (e) {}
      out.push({ label: (it.title || '').trim(), target: page, subitems: it.items && it.items.length ? await conv(it.items) : [] })
    }
    return out
  }
  return conv(items)
}

// ---------------------------------------------------------------- look & settings

function applyLook() {
  const st = S.settings
  document.documentElement.style.setProperty('--page-bg', st.bg)
  document.body.classList.toggle('night', !!st.night)
  document.body.classList.toggle('mono', !!st.mono)
  viewport.classList.toggle('doc', st.mode === 'doc')
  viewport.classList.toggle('reflow', isReflow())
  viewport.classList.toggle('fit-width', st.mode !== 'doc' && st.fit === 'width')
}

api.setSettings = (s) => {
  const before = { ...S.settings }
  Object.assign(S.settings, s)
  applyLook()
  const layoutKeys = ['fit', 'double', 'rtl', 'mode', 'rotation', 'hingeGap', 'reflow']
  if (layoutKeys.some((k) => before[k] !== S.settings[k])) {
    S.zoom = 1
    S.tx = S.ty = 0
    relayout(true)
  }
}

/** The device's budget (from the app): sharpness cap, pages prepared ahead, cache sizes */
const perf = (k, fallback) => {
  const v = S.settings.perf && S.settings.perf[k]
  return v === undefined || v === null ? fallback : v
}

function isDouble() {
  const d = S.settings.double
  if (d === 'auto') return window.innerWidth > window.innerHeight && window.innerWidth >= 840
  return !!d
}

/** Groups pages into what's shown at once: one page each, or pairs (comics keep the cover alone). Same as Grimmory. */
function spreadsFor(count, double, coverAlone) {
  if (!double) return Array.from({ length: count }, (_, i) => [i])
  const out = []
  let i = 0
  if (coverAlone && count > 0) {
    out.push([0])
    i = 1
  }
  for (; i < count; i += 2) out.push(i + 1 < count ? [i, i + 1] : [i])
  return out
}

/** Page size at scale 1, after rotation */
async function sizeOf(i) {
  let s = S.sizes[i]
  if (!s) {
    if (S.kind === 'pdf') {
      const page = await S.pdf.getPage(i + 1)
      const v = page.getViewport({ scale: 1 })
      s = { w: v.width, h: v.height }
    } else {
      const url = await imageUrl(i).catch(() => null)
      s = await new Promise((resolve) => {
        if (!url) return resolve({ w: 660, h: 1000 })
        const img = new Image()
        img.onload = () => resolve({ w: img.naturalWidth || 660, h: img.naturalHeight || 1000 })
        img.onerror = () => resolve({ w: 660, h: 1000 })
        img.src = url
      })
    }
    S.sizes[i] = s
  }
  return S.settings.rotation % 180 ? { w: s.h, h: s.w } : s
}

/** Object URL of comic page i (unpacked on first use) */
const imagePromises = new Map()
function imageUrl(i) {
  if (S.images[i]) return Promise.resolve(S.images[i])
  if (!imagePromises.has(i)) {
    imagePromises.set(
      i,
      S.getImage(i).then((blob) => {
        S.images[i] = URL.createObjectURL(blob)
        imagePromises.delete(i)
        return S.images[i]
      })
    )
  }
  return imagePromises.get(i)
}

// ---------------------------------------------------------------- layout & rendering

let layoutToken = 0

async function relayout(keepPage) {
  const token = ++layoutToken
  S.spreads = spreadsFor(S.count, isDouble(), S.kind === 'images')
  if (S.settings.mode === 'doc') return layoutDoc(token, keepPage)
  S.si = Math.max(0, S.spreads.findIndex((sp) => sp.includes(S.page)))
  return layoutBook(token)
}

async function layoutBook(token) {
  const spread = S.spreads[S.si] || [0]
  const pages = S.settings.rtl ? spread.slice().reverse() : spread
  const sizes = await Promise.all(pages.map(sizeOf))
  if (token !== layoutToken) return
  const W = viewport.clientWidth
  const H = viewport.clientHeight
  // Foldable opened like a book: keep the hinge between the two pages
  const gap = pages.length > 1 ? S.settings.hingeGap || 0 : 0
  const unit = sizes.reduce((n, s) => n + s.w / s.h, 0)
  let pageH = S.settings.fit === 'width' ? (W - gap) / unit : Math.min(H, (W - gap) / unit)
  pageH = Math.max(50, Math.floor(pageH))

  const stage = document.createElement('div')
  stage.id = 'stage'
  if (!S.settings.eink && perf('animate', true)) stage.className = 'anim'
  const row = document.createElement('div')
  row.className = 'spread'
  row.style.width = `${W}px`
  row.style.minHeight = `${H}px`
  const els = []
  pages.forEach((i, k) => {
    if (k === 1 && gap > 0) {
      const g = document.createElement('div')
      g.className = 'gap'
      g.style.width = `${gap}px`
      row.append(g)
    }
    const el = pageBox(i, Math.floor((sizes[k].w / sizes[k].h) * pageH), pageH)
    row.append(el)
    els.push(el)
  })
  stage.append(row)
  const old = document.getElementById('stage')
  const doc = document.getElementById('doc')
  if (doc) doc.remove()
  if (old) old.replaceWith(stage)
  else viewport.append(stage)
  viewport.scrollTop = 0
  applyTransform()
  await Promise.all(els.map((el) => renderInto(el)))
  // Fetch the next pages now, so turning is instant (comics); PDFs cache their pages themselves
  if (S.kind === 'images') for (let n = 1; n <= perf('prefetch', 3); n++) prefetchSpread(S.si + n)
}

function prefetchSpread(si) {
  const sp = S.spreads[si]
  if (!sp) return
  sp.forEach((i) =>
    imageUrl(i)
      .then((url) => {
        const img = new Image()
        img.src = url
      })
      .catch(() => {})
  )
}

function pageBox(i, w, h) {
  const el = document.createElement('div')
  el.className = 'pg'
  el.dataset.i = String(i)
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  el.innerHTML = '<div class="spinner"></div>'
  return el
}

/** Draws page [el.dataset.i] into its box (canvas + text layer + overlays), sharp for the current zoom. */
async function renderInto(el) {
  if (isReflow()) return renderReflow(el)
  const i = Number(el.dataset.i)
  const cssW = parseFloat(el.style.width)
  const cssH = parseFloat(el.style.height)
  const zoom = S.settings.mode === 'doc' ? 1 : S.zoom
  // Sharp, but within what the device can afford (2× on low-end / battery saver, up to 4× on fast phones)
  const density = Math.min((window.devicePixelRatio || 1) * Math.min(zoom, 3), perf('maxDensity', 4))
  const prev = S.renders.get(el)
  if (prev && prev.density >= density) return
  const job = { density, cancelled: false }
  if (prev && prev.task) prev.cancelled = true
  S.renders.set(el, job)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(cssW * density)
  canvas.height = Math.round(cssH * density)
  const ctx = canvas.getContext('2d')
  try {
    if (S.kind === 'pdf') {
      const page = await S.pdf.getPage(i + 1)
      const rot = (page.rotate + S.settings.rotation) % 360
      const base = page.getViewport({ scale: 1, rotation: rot })
      const scale = cssW / base.width
      const vp = page.getViewport({ scale: scale * density, rotation: rot })
      job.task = page.render({ canvasContext: ctx, viewport: vp })
      await job.task.promise
      if (job.cancelled) return
      swapCanvas(el, canvas)
      if (!el.querySelector('.tl')) await buildTextLayer(el, i, page.getViewport({ scale, rotation: rot }))
    } else {
      const img = await loadImage(await imageUrl(i))
      if (job.cancelled) return
      ctx.save()
      const r = S.settings.rotation
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((r * Math.PI) / 180)
      const dw = r % 180 ? canvas.height : canvas.width
      const dh = r % 180 ? canvas.width : canvas.height
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
      swapCanvas(el, canvas)
    }
    drawOverlays(el)
  } catch (e) {
    if (e && e.name === 'RenderingCancelledException') return
    console.warn('[pages] render', i, e)
  }
}

function swapCanvas(el, canvas) {
  const old = el.querySelector('canvas')
  if (old) old.replaceWith(canvas)
  else el.prepend(canvas)
  const sp = el.querySelector('.spinner')
  if (sp) sp.remove()
  if (!el.querySelector('.ov')) {
    const ov = document.createElement('div')
    ov.className = 'ov'
    el.append(ov)
  }
}

const imageCache = new Map()
function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url)
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
  imageCache.set(url, p)
  if (imageCache.size > perf('imageCache', 12)) imageCache.delete(imageCache.keys().next().value)
  return p
}

// ---------------------------------------------------------------- Doc Viewer

/** PDF text laid out to the screen (no page pictures): read along, search and the dictionary work as usual */
const isReflow = () => S.kind === 'pdf' && !!S.settings.reflow

async function layoutReflow(token, keepPage) {
  const W = viewport.clientWidth
  const doc = document.createElement('div')
  doc.id = 'doc'
  doc.className = 'rf-doc'
  doc.style.width = `${W}px`
  const stage = document.getElementById('stage')
  if (stage) stage.remove()
  const old = document.getElementById('doc')
  if (old) old.replaceWith(doc)
  else viewport.append(doc)
  if (docObserver) docObserver.disconnect()
  // the page being read first, so it shows at once; then the rest around it
  const first = Math.max(0, Math.min(S.count - 1, S.page))
  const boxes = []
  for (let i = 0; i < S.count; i++) {
    const el = document.createElement('div')
    el.className = 'pg rfp'
    el.dataset.i = String(i)
    doc.append(el)
    boxes.push(el)
  }
  await renderReflow(boxes[first])
  if (token !== layoutToken) return
  const settle = () => {
    if (keepPage && boxes[first]) viewport.scrollTop = boxes[first].offsetTop - 10
  }
  settle()
  for (let d = 1; d < S.count; d++) {
    for (const i of [first - d, first + d]) {
      if (i < 0 || i >= S.count) continue
      const before = boxes[first].offsetTop
      await renderReflow(boxes[i])
      if (token !== layoutToken) return
      // pages above grew: keep the reader where they were
      if (i < first) viewport.scrollTop += boxes[first].offsetTop - before
    }
    if (d % 8 === 0) await new Promise((r) => setTimeout(r, 0))
  }
  drawReadAlong()
}

/**
 * The page's layout from the server (Docling): its blocks in reading order with their labels. Reflow puts
 * each piece of the PDF's own text into the block it sits in, in that order; running headers and page
 * numbers are hidden (still there, so read along and highlights keep their places).
 */
let LAYOUT = null
api.setLayout = (json) => {
  LAYOUT = json && json.pages ? json.pages : null
  if (isReflow()) relayout(true)
}

const HIDDEN = new Set(['page_header', 'page_footer'])
const HEADINGS = new Set(['title', 'section_header'])

function blocksFor(i, items) {
  const pg = LAYOUT && LAYOUT[String(i + 1)]
  if (!pg || !pg.blocks || !pg.blocks.length) return null
  const blocks = pg.blocks.map((b, n) => ({ ...b, n, items: [] }))
  const stray = []
  items.forEach((it, k) => {
    if (!it.str) return
    // the middle of the text's first characters, in PDF points (bottom-left origin, like the layout)
    const h = Math.abs(it.height || it.transform[3]) || 8
    const x = it.transform[4] + Math.min(it.width || 0, h) / 2
    const y = it.transform[5] + h * 0.35
    let best = null
    for (const b of blocks) {
      const [l, bt, r, tp] = b.bbox
      if (x >= l - 2 && x <= r + 2 && y >= bt - 2 && y <= tp + 2) {
        // nested boxes: the smallest one
        if (!best || (r - l) * (tp - bt) < (best.bbox[2] - best.bbox[0]) * (best.bbox[3] - best.bbox[1])) best = b
      }
    }
    if (best) best.items.push(k)
    else stray.push(k)
  })
  // text outside every block: with the block it follows in the PDF's own order
  for (const k of stray) {
    let host = null
    for (const b of blocks) if (b.items.length && b.items[0] < k) host = !host || b.items[0] > host.items[0] ? b : host
    ;(host || blocks.find((b) => !HIDDEN.has(b.label)) || blocks[0]).items.push(k)
  }
  blocks.forEach((b) => b.items.sort((a, c) => a - c))
  const used = blocks.filter((b) => b.items.length)
  return used.length ? used : null
}

/** One block's (or paragraph's) text into a parent, words joined the way they were on the page */
function joinInto(p, items, ks) {
  let prev = null
  for (const k of ks) {
    const it = items[k]
    const y = it.transform[5]
    const h = Math.abs(it.height || it.transform[3]) || 10
    const last = p.lastChild ? p.lastChild.textContent || '' : ''
    if (prev) {
      const dy = Math.abs(prev.y - y)
      if (dy > 0.5) {
        if (!/[\s\u00AD-]$/.test(last)) p.append(' ')
      } else if (it.transform[4] - prev.end > h * 0.15 && !/\s$/.test(last) && !/^\s/.test(it.str)) p.append(' ')
    }
    const sp = document.createElement('span')
    sp.dataset.k = String(k)
    sp.textContent = it.str
    p.append(sp)
    prev = { y, end: it.transform[4] + (it.width || 0) }
  }
}

async function renderReflow(el) {
  if (!el || el.querySelector('.rf')) return
  const i = Number(el.dataset.i)
  const t = await textFor(i).catch(() => null)
  const laid = t && blocksFor(i, t.items)
  if (laid) {
    const rf = document.createElement('div')
    rf.className = 'tl rf rf-ai'
    // the page's usual line distance: inside a block, a bigger gap still starts a new paragraph
    // (some PDFs, typewritten ones especially, come back as one block per page)
    const ys = []
    for (let k = 1; k < t.items.length; k++) {
      const d = Math.abs(t.items[k - 1].transform[5] - t.items[k].transform[5])
      if (d > 0.5) ys.push(d)
    }
    ys.sort((a, c) => a - c)
    const lineGap = ys.length ? ys[Math.floor(ys.length / 2)] : 14
    for (const b of laid) {
      const heading = HEADINGS.has(b.label)
      const runs = [[]]
      let lastY = null
      for (const k of b.items) {
        const y = t.items[k].transform[5]
        if (!heading && lastY !== null && Math.abs(lastY - y) > lineGap * 1.45 + 0.5 && runs[runs.length - 1].length) runs.push([])
        runs[runs.length - 1].push(k)
        lastY = y
      }
      for (const ks of runs) {
        const p = document.createElement(heading ? 'h3' : 'p')
        p.className = `rf-${b.label.replace(/[^a-z_]/g, '')}`
        if (HIDDEN.has(b.label)) p.hidden = true
        joinInto(p, t.items, ks)
        rf.append(p)
      }
    }
    el.innerHTML = ''
    el.append(rf)
    const ov = document.createElement('div')
    ov.className = 'ov'
    el.append(ov)
    drawOverlays(el)
    return
  }
  const rf = document.createElement('div')
  rf.className = 'tl rf'
  const items = t ? t.items : []
  // typical distance between lines on this page: a bigger gap starts a new paragraph
  const ys = []
  for (let k = 1; k < items.length; k++) {
    const d = Math.abs(items[k - 1].transform[5] - items[k].transform[5])
    if (d > 0.5) ys.push(d)
  }
  ys.sort((a, b) => a - b)
  const lineGap = ys.length ? ys[Math.floor(ys.length / 2)] : 14
  let p = document.createElement('p')
  let prev = null
  items.forEach((it, k) => {
    if (!it.str) return
    const y = it.transform[5]
    const h = Math.abs(it.height || it.transform[3]) || 10
    if (prev) {
      const dy = Math.abs(prev.y - y)
      const last = p.lastChild ? p.lastChild.textContent || '' : ''
      if (dy > lineGap * 1.45 + 0.5) {
        if (p.childNodes.length) rf.append(p)
        p = document.createElement('p')
      } else if (dy > 0.5) {
        // next line of the same paragraph: a space, unless the word was split with a hyphen
        if (!/[\s\u00AD-]$/.test(last)) p.append(' ')
      } else if (it.transform[4] - prev.end > h * 0.15 && !/\s$/.test(last) && !/^\s/.test(it.str)) p.append(' ')
    }
    const sp = document.createElement('span')
    sp.dataset.k = String(k)
    sp.textContent = it.str
    p.append(sp)
    prev = { y, end: it.transform[4] + (it.width || 0) }
  })
  if (p.childNodes.length) rf.append(p)
  el.innerHTML = ''
  if (!rf.childNodes.length) {
    const empty = document.createElement('p')
    empty.className = 'rf-empty'
    empty.textContent = `Page ${i + 1}: no text`
    rf.append(empty)
  }
  el.append(rf)
  const ov = document.createElement('div')
  ov.className = 'ov'
  el.append(ov)
  drawOverlays(el)
}

async function layoutDoc(token, keepPage) {
  if (isReflow()) return layoutReflow(token, keepPage)
  const W = viewport.clientWidth
  const width = Math.floor(Math.min(W, 1100) * S.docZoom)
  const doc = document.createElement('div')
  doc.id = 'doc'
  doc.style.width = `${Math.max(W, width)}px`
  doc.style.padding = '10px 0'
  const stage = document.getElementById('stage')
  if (stage) stage.remove()
  const old = document.getElementById('doc')
  const fallback = S.defaultAspect || 0.7
  for (let i = 0; i < S.count; i++) {
    const s = S.sizes[i] ? (S.settings.rotation % 180 ? { w: S.sizes[i].h, h: S.sizes[i].w } : S.sizes[i]) : null
    const aspect = s ? s.w / s.h : fallback
    doc.append(pageBox(i, width - 20, Math.floor((width - 20) / aspect)))
  }
  if (old) old.replaceWith(doc)
  else viewport.append(doc)
  if (token !== layoutToken) return
  if (keepPage) {
    const el = doc.children[S.page]
    if (el) viewport.scrollTop = el.offsetTop - 10
  }
  observeDoc(doc)
}

let docObserver = null
function observeDoc(doc) {
  if (docObserver) docObserver.disconnect()
  docObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const el = e.target
        if (e.isIntersecting) {
          const i = Number(el.dataset.i)
          // correct the box to the page's real shape the first time it's seen
          sizeOf(i).then((s) => {
            const w = parseFloat(el.style.width)
            const h = Math.floor(w / (s.w / s.h))
            if (Math.abs(h - parseFloat(el.style.height)) > 2) {
              el.style.height = `${h}px`
              S.renders.delete(el)
              el.querySelectorAll('canvas,.tl,.ov').forEach((n) => n.remove())
            }
            renderInto(el)
          })
        } else if (el.querySelector('canvas')) {
          // free memory far away from the screen
          const r = el.getBoundingClientRect()
          if (Math.abs(r.top) > viewport.clientHeight * perf('keepScreens', 4)) {
            el.querySelectorAll('canvas').forEach((n) => n.remove())
            S.renders.delete(el)
          }
        }
      }
    },
    { root: viewport, rootMargin: '150% 0px' }
  )
  for (const el of doc.children) docObserver.observe(el)
}

viewport.addEventListener('scroll', () => {
  if (S.settings.mode !== 'doc') return
  const doc = document.getElementById('doc')
  if (!doc) return
  const y = viewport.scrollTop + viewport.clientHeight * 0.3
  let lo = 0
  let hi = doc.children.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (doc.children[mid].offsetTop <= y) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (ans !== S.page) {
    S.page = ans
    emit('page', { page: S.page, pageCount: S.count })
  }
  S.userNavAt = Date.now()
})

// ---------------------------------------------------------------- navigation

api.goTo = (page, opts = {}) => {
  page = Math.max(0, Math.min(S.count - 1, page | 0))
  if (!opts.auto) S.userNavAt = Date.now()
  S.page = page
  S.zoom = 1
  S.tx = S.ty = 0
  if (S.settings.mode === 'doc') {
    const doc = document.getElementById('doc')
    const el = doc && doc.children[page]
    if (el) viewport.scrollTop = el.offsetTop - 10
  } else {
    const si = S.spreads.findIndex((sp) => sp.includes(page))
    if (si !== S.si || !document.getElementById('stage')) {
      S.si = Math.max(0, si)
      layoutBook(++layoutToken)
    } else applyTransform()
  }
  emit('page', { page: S.page, pageCount: S.count })
}

/** +1 / -1: next or previous spread (or page in Doc Viewer) */
/** One page (spread) forward or back with the page-turn animation; other jumps go straight there */
api.turn = (delta) => {
  if (S.settings.mode === 'doc' || S.zoom > 1 || Math.abs(delta) !== 1) return stepNow(delta)
  return animatedTurn(delta, {
    style: turnStyle(S.settings, !!S.settings.eink),
    fromRight: nextOnRight(S.settings, !!S.settings.rtl),
    paper: S.settings.bg || '#ffffff',
    turn: () => stepNow(delta),
    drawn: () => imagesDrawn()
  })
}

/** Resolves when the pictures of the page now on screen have loaded */
function imagesDrawn() {
  return new Promise((res) => {
    const t0 = Date.now()
    const check = () => {
      const stage = document.getElementById('stage')
      const imgs = stage ? [...stage.querySelectorAll('img, canvas')] : []
      const ready = imgs.length && imgs.every((el) => (el.tagName === 'IMG' ? el.complete && el.naturalWidth > 0 : el.width > 0))
      if (ready || Date.now() - t0 > 800) return res()
      setTimeout(check, 40)
    }
    setTimeout(check, 30)
  })
}

const stepNow = (delta) => api.stepRaw(delta)
api.step = (delta) => api.turn(delta)
api.stepRaw = (delta) => {
  if (S.settings.mode === 'doc') return api.goTo(S.page + delta)
  const si = Math.max(0, Math.min(S.spreads.length - 1, S.si + delta))
  if (si === S.si) return
  api.goTo(S.spreads[si][0])
}

api.zoomIn = () => setZoom(S.settings.mode === 'doc' ? null : Math.min(5, S.zoom * 1.25), 1.25)
api.zoomOut = () => setZoom(S.settings.mode === 'doc' ? null : Math.max(1, S.zoom / 1.25), 1 / 1.25)

function setZoom(z, docFactor) {
  if (isReflow()) {
    // reflowed text: zoom is the text size (the words re-wrap; nothing to pan)
    const el = document.querySelector(`.pg[data-i="${S.page}"]`)
    const before = el ? el.getBoundingClientRect().top : 0
    S.docZoom = Math.max(0.6, Math.min(2.5, S.docZoom * docFactor))
    document.documentElement.style.setProperty('--rf-scale', String(S.docZoom))
    if (el) viewport.scrollTop += el.getBoundingClientRect().top - before
    document.querySelectorAll('.pg.rfp').forEach((p) => drawOverlays(p))
    drawReadAlong()
    return
  }
  if (S.settings.mode === 'doc') {
    const before = S.page
    S.docZoom = Math.max(0.5, Math.min(3, S.docZoom * docFactor))
    layoutDoc(++layoutToken, false).then(() => api.goTo(before))
    return
  }
  const W = viewport.clientWidth
  const H = viewport.clientHeight
  // zoom around the middle of the screen
  const cx = W / 2
  const cy = H / 2
  S.tx = cx - ((cx - S.tx) * z) / S.zoom
  S.ty = cy - ((cy - S.ty) * z) / S.zoom
  S.zoom = z
  clampPan()
  applyTransform()
  sharpen()
}

function clampPan() {
  const W = viewport.clientWidth
  const H = Math.max(viewport.clientHeight, (document.getElementById('stage') || {}).scrollHeight || 0)
  if (S.zoom <= 1) {
    S.tx = S.ty = 0
    return
  }
  S.tx = Math.min(0, Math.max(W - W * S.zoom, S.tx))
  S.ty = Math.min(0, Math.max(viewport.clientHeight - H * S.zoom, S.ty))
}

function applyTransform() {
  const stage = document.getElementById('stage')
  if (!stage) return
  stage.style.transform = `translate(${S.tx}px, ${S.ty}px) scale(${S.zoom})`
  viewport.style.touchAction = S.zoom > 1 ? 'none' : S.settings.fit === 'width' ? 'pan-y' : 'none'
}

let sharpenTimer = null
function sharpen() {
  clearTimeout(sharpenTimer)
  sharpenTimer = setTimeout(() => document.querySelectorAll('#stage .pg').forEach((el) => renderInto(el)), 250)
}

// ---------------------------------------------------------------- gestures (Book Viewer)

const pointers = new Map()
let gesture = null
let lastTap = { t: 0, x: 0, y: 0 }
let tapTimer = null

viewport.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) gesture = { x0: e.clientX, y0: e.clientY, tx0: S.tx, ty0: S.ty, t0: Date.now(), moved: false, pinch: null }
  if (pointers.size === 2 && S.settings.mode !== 'doc') {
    const [a, b] = [...pointers.values()]
    gesture.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: S.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx0: S.tx, ty0: S.ty }
    gesture.moved = true
  }
  if (pointers.size === 2 && S.settings.mode === 'doc') gesture.pinch = { d0: null, docZoom0: S.docZoom }
})

viewport.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (gesture.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (S.settings.mode === 'doc') {
      if (!gesture.pinch.d0) gesture.pinch.d0 = d
      gesture.pinch.ratio = d / gesture.pinch.d0
      return
    }
    const p = gesture.pinch
    const z = Math.max(1, Math.min(5, (p.z0 * d) / p.d0))
    S.tx = p.cx - ((p.cx - p.tx0) * z) / p.z0
    S.ty = p.cy - ((p.cy - p.ty0) * z) / p.z0
    S.zoom = z
    clampPan()
    applyTransform()
    return
  }
  const dx = e.clientX - gesture.x0
  const dy = e.clientY - gesture.y0
  if (Math.hypot(dx, dy) > 10) gesture.moved = true
  if (S.zoom > 1 && S.settings.mode !== 'doc') {
    S.tx = gesture.tx0 + dx
    S.ty = gesture.ty0 + dy
    clampPan()
    applyTransform()
  }
})

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return
  pointers.delete(e.pointerId)
  if (pointers.size > 0 || !gesture) return
  const g = gesture
  gesture = null
  if (g.pinch) {
    if (S.settings.mode === 'doc' && g.pinch.ratio) setZoom(null, g.pinch.ratio)
    else sharpen()
    S.userNavAt = Date.now()
    return
  }
  const dx = e.clientX - g.x0
  const dy = e.clientY - g.y0
  const dt = Date.now() - g.t0
  if (S.settings.mode !== 'doc' && S.zoom <= 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 800) {
    // swipe: next page is to the left (to the right for right-to-left books)
    const nextRight = nextOnRight(S.settings, !!S.settings.rtl)
    const forward = nextRight ? dx < 0 : dx > 0
    api.turn(forward ? 1 : -1)
    return
  }
  if (g.moved || dt > 350) return
  if (hasSelection()) return
  const now = Date.now()
  // double tap: zoom in (or back out) around the finger
  if (S.settings.mode !== 'doc' && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
    clearTimeout(tapTimer)
    lastTap.t = 0
    if (S.zoom > 1) {
      S.zoom = 1
      S.tx = S.ty = 0
    } else {
      const z = 2.5
      S.tx = e.clientX - e.clientX * z
      S.ty = e.clientY - e.clientY * z
      S.zoom = z
      clampPan()
    }
    applyTransform()
    sharpen()
    return
  }
  lastTap = { t: now, x: e.clientX, y: e.clientY }
  const x = e.clientX / window.innerWidth
  const px = e.clientX
  const py = e.clientY
  tapTimer = setTimeout(() => tapAt(x, px, py), S.settings.mode === 'doc' ? 0 : 260)
}
viewport.addEventListener('pointerup', endPointer)
viewport.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId)
  if (!pointers.size) gesture = null
})
viewport.addEventListener('wheel', () => (S.userNavAt = Date.now()), { passive: true })

/** Edges turn the page (mirrored for right-to-left); the middle shows/hides the bars. */
function tapAt(x, px, py) {
  // Read along: a quick tap on any word plays the audiobook from it (pages turn by themselves, swipes
  // still work, and taps on the margins or blank space still turn pages)
  if (RA.ready && RA.mode !== 'off' && px != null) {
    const t = timeAtPoint(px, py)
    // a word with no narration (skipped by the narrator, or outside what's read): say so
    if (t != null && RA.noAudio && RA.noAudio(RA.lastTapWord)) return emit('readalong-noaudio', {})
    if (t != null) return emit('play-from', { time: t })
  }
  // The top of the screen brings the bars back (Read along fades them while the audio plays)
  if (py != null && py < window.innerHeight * 0.15) return emit('tap', { zone: 'top' })
  if (S.settings.mode === 'doc' || S.zoom > 1) return emit('tap', { zone: 'center' })
  const nextRight = nextOnRight(S.settings, !!S.settings.rtl)
  const forward = nextRight ? x > 0.7 : x < 0.3
  const backward = nextRight ? x < 0.3 : x > 0.7
  if (forward) api.turn(1)
  else if (backward) api.turn(-1)
  emit('tap', { zone: forward || backward ? 'edge' : 'center' })
}

// ---------------------------------------------------------------- PDF text

/** A page's text: { str, items: [{ s, e, str, transform, width }] } (offsets into str) */
function textFor(i) {
  if (S.text.has(i)) return Promise.resolve(S.text.get(i))
  if (S.textPromises.has(i)) return S.textPromises.get(i)
  const p = (async () => {
    const page = await S.pdf.getPage(i + 1)
    const tc = await page.getTextContent()
    const styles = tc.styles || {}
    let str = ''
    const items = []
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue
      const s = str.length
      str += it.str
      const st = styles[it.fontName] || {}
      items.push({ s, e: str.length, str: it.str, transform: it.transform, width: it.width, height: it.height, font: /mono|courier/i.test((st.fontFamily || '') + ' ' + (it.fontName || '')) ? 'monospace' : /serif/i.test(st.fontFamily || '') && !/sans/i.test(st.fontFamily || '') ? 'serif' : 'sans-serif' })
      str += it.hasEOL ? '\n' : ' '
    }
    const t = { str, items }
    S.text.set(i, t)
    S.textPromises.delete(i)
    return t
  })()
  S.textPromises.set(i, p)
  return p
}

const measureCtx = document.createElement('canvas').getContext('2d')

async function buildTextLayer(el, i, vp) {
  const t = await textFor(i)
  if (!t.str.trim()) return
  const tl = document.createElement('div')
  tl.className = 'tl'
  t.items.forEach((it, k) => {
    if (!it.str) return
    const tx = pdfjs.Util.transform(vp.transform, it.transform)
    const fontH = Math.hypot(tx[2], tx[3])
    if (fontH < 1) return
    const angle = Math.atan2(tx[1], tx[0])
    const span = document.createElement('span')
    span.textContent = it.str
    span.dataset.k = String(k)
    span.style.left = `${tx[4] + fontH * Math.sin(angle)}px`
    span.style.top = `${tx[5] - fontH * Math.cos(angle)}px`
    span.style.fontSize = `${fontH}px`
    const fam = it.font || 'sans-serif'
    span.style.fontFamily = fam
    measureCtx.font = `${fontH}px ${fam}`
    const measured = measureCtx.measureText(it.str).width
    const target = it.width * vp.scale
    const sx = measured > 0 && target > 0 ? target / measured : 1
    span.style.transform = `rotate(${angle}rad) scaleX(${sx})`
    tl.append(span)
  })
  const ov = el.querySelector('.ov')
  if (ov) el.insertBefore(tl, ov)
  else el.append(tl)
  el.addEventListener('pointerdown', () => (S.userNavAt = Date.now()))
}

/** DOM range over page [i]'s text between character offsets [a, b) */
function rangeFor(el, i, a, b) {
  const t = S.text.get(i)
  const tl = el.querySelector('.tl')
  if (!t || !tl) return null
  const spanOf = (k) => tl.querySelector(`span[data-k="${k}"]`)
  const find = (off, end) => {
    for (let k = 0; k < t.items.length; k++) {
      const it = t.items[k]
      if (off < it.e || (end && off === it.e)) {
        const sp = spanOf(k)
        if (!sp || !sp.firstChild) continue
        return { node: sp.firstChild, offset: Math.max(0, Math.min(it.str.length, off - it.s)) }
      }
    }
    return null
  }
  const start = find(a, false)
  const end = find(b, true)
  if (!start || !end) return null
  const r = document.createRange()
  r.setStart(start.node, start.offset)
  r.setEnd(end.node, end.offset)
  return r
}

/** Rectangles (in % of the page box) covering offsets [a, b) of page i */
function rectsFor(el, i, a, b) {
  const r = rangeFor(el, i, a, b)
  if (!r) return []
  const box = el.getBoundingClientRect()
  return [...r.getClientRects()]
    .filter((c) => c.width > 0.5 && c.height > 0.5)
    .map((c) => ({ l: ((c.left - box.left) / box.width) * 100, t: ((c.top - box.top) / box.height) * 100, w: (c.width / box.width) * 100, h: (c.height / box.height) * 100 }))
}

function addRects(el, rects, cls, style = {}, data = null) {
  const ov = el.querySelector('.ov')
  if (!ov) return []
  return rects.map((rc) => {
    const d = document.createElement('div')
    d.className = cls
    Object.assign(d.style, { left: `${rc.l}%`, top: `${rc.t}%`, width: `${rc.w}%`, height: `${rc.h}%`, ...style })
    if (data) d.dataset.anchor = data
    ov.append(d)
    return d
  })
}

// ---------------------------------------------------------------- selection, highlights

/** Highlight anchors: "pdf:<page>:<start>:<end>" (character offsets in the page's text) */
const parseAnchor = (a) => {
  const m = /^pdf:(\d+):(\d+):(\d+)$/.exec(a || '')
  return m ? { page: +m[1], a: +m[2], b: +m[3] } : null
}

function hasSelection() {
  const sel = document.getSelection()
  return !!(sel && !sel.isCollapsed && sel.toString().trim())
}

let selTimer = null
document.addEventListener('selectionchange', () => {
  clearTimeout(selTimer)
  selTimer = setTimeout(reportSelection, 350)
})

function offsetIn(node, offset) {
  const span = node.nodeType === 3 ? node.parentElement : node
  if (!span || !span.dataset || span.dataset.k === undefined) return null
  const page = Number(span.closest('.pg').dataset.i)
  const t = S.text.get(page)
  const it = t && t.items[Number(span.dataset.k)]
  return it ? { page, off: it.s + Math.min(offset, it.str.length) } : null
}

function reportSelection() {
  const sel = document.getSelection()
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    if (S.lastSelection) {
      S.lastSelection = null
      emit('selection-cleared', {})
    }
    return
  }
  const r = sel.getRangeAt(0)
  const a = offsetIn(r.startContainer, r.startOffset)
  const b = offsetIn(r.endContainer, r.endOffset)
  const text = sel.toString().replace(/\s+/g, ' ').trim()
  if (!a || !text) return
  const end = b && b.page === a.page ? b.off : S.text.get(a.page).str.length
  S.lastSelection = { page: a.page, a: a.off, b: end, text }
  S.userNavAt = Date.now()
  const rect = r.getBoundingClientRect()
  emit('selection', {
    anchor: `pdf:${a.page}:${a.off}:${end}`,
    page: a.page,
    text,
    word: /^[\p{L}\p{N}'’-]+$/u.test(text) ? text : null,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    canPlayFromHere: !!(RA.ready && S.kind === 'pdf')
  })
}

api.clearSelection = () => {
  const sel = document.getSelection()
  if (sel) sel.removeAllRanges()
  S.lastSelection = null
}

api.setHighlights = (list) => {
  S.highlights = (list || []).filter((h) => parseAnchor(h.cfi))
  document.querySelectorAll('.pg').forEach((el) => drawOverlays(el))
}

function drawOverlays(el) {
  const ov = el.querySelector('.ov')
  if (!ov) return
  ov.querySelectorAll('.hl,.ul,.skip,.added,.added-bubble').forEach((n) => n.remove())
  const i = Number(el.dataset.i)
  if (S.kind !== 'pdf') return
  // text the narrator skipped: faded, so it's clear why read along jumps past it
  const sk = RA.ready && RA.skipByPage && RA.skipByPage.get(i)
  if (sk && el.querySelector('.tl')) for (const [a, b] of sk) addRects(el, rectsFor(el, i, a, b), 'skip')
  // a red line where the narrator adds lines the book doesn't have; a tap shows them
  const ad = RA.ready && RA.addedByPage && RA.addedByPage.get(i)
  if (ad && el.querySelector('.tl'))
    for (const x of ad) {
      const rc = rectsFor(el, i, x.a, x.b)[0]
      if (!rc) continue
      const [mk] = addRects(el, [{ l: rc.l - 0.9, t: rc.t - 0.2, w: 1.2, h: rc.h + 0.4 }], 'added')
      if (!mk) continue
      mk.title = 'The narrator adds lines here: tap to see them'
      mk.dataset.pid = String(x.pid)
      mk.dataset.added = x.text
      mk.dataset.l = String(rc.l)
      mk.dataset.t = String(rc.t)
      mk.dataset.h = String(rc.h)
      mk.addEventListener('pointerdown', (e) => e.stopPropagation())
      mk.addEventListener('pointerup', (e) => e.stopPropagation())
      // a tap shows (or hides) the added words in a bubble right there on the page
      mk.addEventListener('click', (e) => {
        e.stopPropagation()
        pdfBubble(el, mk, !mk.bubble)
      })
      if (RA.addedOpen === x.pid) pdfBubble(el, mk, true)
    }
  for (const h of S.highlights) {
    const a = parseAnchor(h.cfi)
    if (!a || a.page !== i) continue
    const rects = rectsFor(el, i, a.a, a.b)
    if (h.color === 'underline') addRects(el, rects, 'ul', {}, h.cfi)
    else {
      const hl = S.settings.hl || HL
      addRects(el, rects, 'hl', { backgroundColor: hl[h.color] || hl.yellow }, h.cfi)
    }
  }
  ov.querySelectorAll('[data-anchor]').forEach((n) =>
    n.addEventListener('click', (e) => {
      e.stopPropagation()
      emit('annotation', { cfi: n.dataset.anchor })
    })
  )
  if (RA.current && RA.current.page === i) drawReadAlong()
}
const HL = { yellow: 'rgba(255, 214, 0, 0.45)', green: 'rgba(76, 175, 80, 0.4)', blue: 'rgba(66, 165, 245, 0.4)', pink: 'rgba(240, 98, 146, 0.4)' }

/** Text near the top of a page, for a bookmark's label */
api.pageText = async (i) => {
  if (S.kind !== 'pdf') return ''
  const t = await textFor(i).catch(() => null)
  return t ? t.str.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
}

/** Small page picture for the sidebar (blob URL) */
const thumbs = new Map()
api.thumbnail = async (i, width = 160) => {
  if (thumbs.has(i)) return thumbs.get(i)
  const p = (async () => {
    if (S.kind === 'images') return imageUrl(i)
    const page = await S.pdf.getPage(i + 1)
    const base = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: width / base.width })
    const c = document.createElement('canvas')
    c.width = Math.round(vp.width)
    c.height = Math.round(vp.height)
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.7))
    return URL.createObjectURL(blob)
  })()
  thumbs.set(i, p)
  return p
}

// ---------------------------------------------------------------- search (PDF text)

let searchToken = 0
api.search = async (query) => {
  const token = ++searchToken
  const q = (query || '').trim().toLowerCase()
  if (!q || S.kind !== 'pdf') return emit('search-done', {})
  for (let i = 0; i < S.count; i++) {
    if (token !== searchToken) return
    const t = await textFor(i).catch(() => null)
    if (!t) continue
    const hay = t.str.toLowerCase()
    const items = []
    let at = hay.indexOf(q)
    while (at >= 0 && items.length < 50) {
      items.push({ cfi: `pdf:${i}:${at}:${at + q.length}`, page: i, pre: t.str.slice(Math.max(0, at - 40), at).replace(/\s+/g, ' '), match: t.str.slice(at, at + q.length), post: t.str.slice(at + q.length, at + q.length + 40).replace(/\s+/g, ' ') })
      at = hay.indexOf(q, at + q.length)
    }
    if (items.length) emit('search-results', { label: `Page ${i + 1}`, items })
    if (i % 10 === 0) emit('search-progress', { progress: i / S.count })
  }
  if (token === searchToken) emit('search-done', {})
}
api.clearSearch = () => searchToken++

/** Jumps to a search result / highlight and flashes it */
api.reveal = async (anchor) => {
  const a = parseAnchor(anchor)
  if (!a) return
  api.goTo(a.page)
  for (let n = 0; n < 40; n++) {
    const el = document.querySelector(`.pg[data-i="${a.page}"]`)
    if (el && el.querySelector('.tl')) {
      addRects(el, rectsFor(el, a.page, a.a, a.b), 'find')
      return
    }
    await new Promise((r) => setTimeout(r, 100))
  }
}

// ---------------------------------------------------------------- read-along (PDF text)

const RA = { ready: false, mode: 'off', autoTurn: true, current: null, lastKey: null }
const norm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu

api.setReadAlong = (mode, autoTurn) => {
  RA.mode = mode || 'off'
  if (autoTurn !== undefined) RA.autoTurn = !!autoTurn
  RA.lastKey = null
  if (RA.mode === 'off') clearReadAlong()
}

// a transcript that arrived before the PDF had opened: applied as soon as it has
let pendingTranscript = null
api.setTranscript = async (lines, opts = {}) => {
  if (!S.kind) {
    pendingTranscript = lines
    return
  }
  RA.ready = false
  if (S.kind !== 'pdf') return emit('readalong-status', { state: 'unavailable', reason: 'no-text' })
  if (!lines || !lines.length) return emit('readalong-status', { state: 'unavailable', reason: 'no-transcript' })
  emit('readalong-status', { state: 'aligning', progress: 0 })
  const tNorm = []
  const tRaw = []
  const tTime = []
  const tLine = []
  // The speech engine's own word times when the line has them (l.w, as in <audio>_karaoke.lrc), else estimated
  lines.forEach((l, li) => {
    const text = l.t || ''
    const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
    const re = wordRe()
    const words = []
    let m
    while ((m = re.exec(text)) !== null) words.push({ n: norm(m[0]), at: m.index, raw: m[0] })
    const measured = []
    if (Array.isArray(l.w))
      for (const [word, ws, we] of l.w) {
        const parts = String(word).match(wordRe()) || []
        parts.forEach((p, i) => measured.push({ n: norm(p), t: parts.length > 1 ? ws + ((we - ws) * i) / parts.length : ws }))
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
      tLine.push(li)
    })
  })
  const eNorm = []
  const ePage = []
  const eA = []
  const eB = []
  for (let i = 0; i < S.count; i++) {
    const t = await textFor(i).catch(() => null)
    if (t) {
      const re = wordRe()
      let m
      while ((m = re.exec(t.str)) !== null) {
        eNorm.push(norm(m[0]))
        ePage.push(i)
        eA.push(m.index)
        eB.push(m.index + m[0].length)
      }
    }
    if (i % 10 === 0) {
      emit('readalong-status', { state: 'aligning', progress: i / S.count })
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  if (!eNorm.length) return emit('readalong-status', { state: 'unavailable', reason: 'no-text' })
  const pairs = await alignWordsAsync(tNorm, eNorm, { fresh: !!opts.fresh })
  if (pairs.length < 50) return emit('readalong-status', { state: 'unavailable', reason: 'no-match', matched: pairs.length / Math.max(1, tNorm.length) })
  Object.assign(RA, {
    t2e: mapper(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1])
    ),
    e2t: mapper(
      pairs.map((p) => p[1]),
      pairs.map((p) => p[0])
    ),
    offBook: offBookFinder(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1])
    ),
    isOffBook: false,
    noAudio: noAudioFinder(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1])
    ),
    tTime,
    tLine,
    ePage,
    eA,
    eB,
    eCount: eNorm.length,
    lineWords: new Map(),
    ready: true,
    lastKey: null
  })
  tLine.forEach((l, k) => {
    const r = RA.lineWords.get(l)
    if (!r) RA.lineWords.set(l, [k, k])
    else r[1] = k
  })
  // skipped book text by page: page -> [[charFrom, charTo]]
  RA.skipByPage = new Map()
  for (const [a, b] of skippedRanges(
    pairs.map((p) => p[0]),
    pairs.map((p) => p[1])
  )) {
    for (let g = a; g < b; ) {
      const pg = ePage[g]
      let h = g
      while (h + 1 < b && ePage[h + 1] === pg) h++
      if (!RA.skipByPage.has(pg)) RA.skipByPage.set(pg, [])
      RA.skipByPage.get(pg).push([eA[g], eB[h]])
      g = h + 1
    }
  }
  // added by the narrator, by page: page -> [{ a, b, text }] (the book word they come just before)
  RA.addedByPage = new Map()
  RA.addedSpans = [] // narration word ranges of each added passage, to open its bubble as it's said
  RA.addedOpen = -1
  addedPassages(
    pairs.map((p) => p[0]),
    pairs.map((p) => p[1]),
    tNorm.length
  ).forEach((ad, pid) => {
    const g = Math.min(eNorm.length - 1, ad.at)
    const pg = ePage[g]
    if (!RA.addedByPage.has(pg)) RA.addedByPage.set(pg, [])
    RA.addedByPage.get(pg).push({ pid, a: eA[g], b: eB[g], text: addedText(tRaw, ad) })
    RA.addedSpans.push({ pid, page: pg, from: ad.from - 2, to: ad.to })
  })
  document.querySelectorAll('.pg').forEach((el) => drawOverlays(el))
  emit('readalong-status', { state: 'ready', matched: pairs.length / tNorm.length })
}

function wordAtTime(t) {
  const a = RA.tTime
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

api.setPlaybackTime = (t) => {
  if (!RA.ready || RA.mode === 'off') return
  const k = wordAtTime(t)
  if (k < 0) return
  // the narration has left the book (improvised / not in this edition): no highlight until it's back
  const off = !!(RA.offBook && RA.offBook(k))
  if (off !== RA.isOffBook) {
    RA.isOffBook = off
    emit('readalong-offbook', { off })
  }
  // lines the narrator adds: their bubble opens over the red mark while they're said, and closes after
  const span = RA.addedSpans && RA.addedSpans.find((s) => k >= s.from && k < s.to)
  const pid = span ? span.pid : -1
  if (pid !== RA.addedOpen) {
    const prev = document.querySelector(`.ov .added[data-pid="${RA.addedOpen}"]`)
    if (prev && prev.bubble && prev.bubble.dataset.auto) pdfBubble(prev.closest('.pg'), prev, false)
    RA.addedOpen = pid
    const mk = pid >= 0 && document.querySelector(`.ov .added[data-pid="${pid}"]`)
    if (mk && !mk.bubble) {
      pdfBubble(mk.closest('.pg'), mk, true)
      if (mk.bubble) mk.bubble.dataset.auto = '1'
    }
  }
  if (off) {
    if (RA.lastKey !== 'off') {
      RA.current = null
      clearReadAlong()
      RA.lastKey = 'off'
    }
    return
  }
  let [k0, k1] = RA.mode === 'line' ? RA.lineWords.get(RA.tLine[k]) || [k, k] : [k, k]
  const key = `${RA.mode}:${k0}:${k1}`
  if (key === RA.lastKey) return
  RA.lastKey = key
  const g0 = Math.max(0, Math.min(RA.eCount - 1, RA.t2e(k0)))
  let g1 = Math.max(g0, Math.min(RA.eCount - 1, RA.t2e(k1)))
  const page = RA.ePage[g0]
  if (RA.ePage[g1] !== page) g1 = g0
  RA.current = { page, a: RA.eA[g0], b: RA.eB[g1] }
  const visible = S.settings.mode === 'doc' ? Math.abs(page - S.page) <= 1 : (S.spreads[S.si] || []).includes(page)
  if (!visible && RA.autoTurn && Date.now() - S.userNavAt > 6000) api.goTo(page, { auto: true })
  drawReadAlong()
}

/** A red mark's bubble on a PDF page: above the line (below near the top), towards the page's middle */
function pdfBubble(page, mk, open) {
  if (!page || !mk) return
  if (!open) {
    if (mk.bubble) mk.bubble.remove()
    mk.bubble = null
    return
  }
  if (mk.bubble) return
  const ov = page.querySelector('.ov')
  if (!ov) return
  const b = document.createElement('div')
  b.className = 'added-bubble'
  b.textContent = `Added in the audiobook: \u201C${mk.dataset.added}\u201D`
  const l = parseFloat(mk.dataset.l) || 0
  const t = parseFloat(mk.dataset.t) || 0
  const h = parseFloat(mk.dataset.h) || 2
  const right = l > 55
  const below = t < 12
  Object.assign(b.style, right ? { right: `${Math.max(2, 100 - l - 1)}%` } : { left: `${Math.max(2, l - 1)}%` })
  if (below) b.style.top = `calc(${t + h}% + 6px)`
  else b.style.bottom = `calc(${100 - t}% + 6px)`
  ov.append(b)
  mk.bubble = b
}

function clearReadAlong() {
  document.querySelectorAll('.ov .ra').forEach((n) => n.remove())
}

function drawReadAlong() {
  clearReadAlong()
  const c = RA.current
  if (!c || RA.mode === 'off') return
  const el = document.querySelector(`.pg[data-i="${c.page}"]`)
  if (!el || !el.querySelector('.tl')) return
  const marks = addRects(el, rectsFor(el, c.page, c.a, c.b), 'ra')
  if (isReflow() && RA.autoTurn && Date.now() - S.userNavAt > 6000 && marks && marks[0]) {
    const r = marks[0].getBoundingClientRect()
    const vr = viewport.getBoundingClientRect()
    if (r.top < vr.top + 40 || r.bottom > vr.bottom - 60) {
      viewport.scrollTop += r.top - vr.top - viewport.clientHeight * 0.3
      S.userNavAt = 0
    }
  }
}

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

/** Playback time of the word under a point on the page (tap to play), or null off the text */
function timeAtPoint(px, py) {
  const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(px, py) : null
  const node = r && r.startContainer
  if (!node || node.nodeType !== 3 || !node.parentElement || !node.parentElement.closest('.tl')) return null
  if (!pointOnWord(r, px, py)) return null
  // only on a word, not the gap after a line
  const around = node.data.slice(Math.max(0, r.startOffset - 1), r.startOffset + 1)
  if (!/[\p{L}\p{N}]/u.test(around)) return null
  const at = offsetIn(node, r.startOffset)
  return at ? timeAtOffset(at.page, Math.max(0, at.off - 1)) : null
}

/** Playback time of the top of the page showing (Read → X: listen from here) */
api.timeHere = () => (RA.ready ? timeAtOffset(S.page, 0) : null)

/** Playback time of the selected text ("Listen") */
api.selectionTime = () => {
  if (!RA.ready || !S.lastSelection) return null
  return timeAtOffset(S.lastSelection.page, S.lastSelection.a)
}

function timeAtOffset(page, a) {
  if (!RA.ready) return null
  // first ebook word at or after the selection start
  let lo = 0
  let hi = RA.eCount - 1
  let g = RA.eCount - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (RA.ePage[mid] > page || (RA.ePage[mid] === page && RA.eB[mid] > a)) {
      g = mid
      hi = mid - 1
    } else lo = mid + 1
  }
  RA.lastTapWord = g
  const k = Math.max(0, Math.min(RA.tTime.length - 1, RA.e2t(g)))
  return RA.tTime[k]
}

// ---------------------------------------------------------------- desktop: keyboard and mouse wheel

document.addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return
  emit('key', { key: e.key, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })
  if ([' ', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key) && S.settings.mode !== 'doc') e.preventDefault()
})

let wheelAt = 0
viewport.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) {
      // ctrl + wheel (or a trackpad pinch): zoom
      e.preventDefault()
      if (e.deltaY < 0) api.zoomIn()
      else api.zoomOut()
      return
    }
    // Book Viewer showing whole pages: the wheel turns pages
    if (S.settings.mode === 'doc' || S.settings.fit === 'width' || S.zoom > 1) return
    e.preventDefault()
    const now = Date.now()
    if (now - wheelAt < 280 || Math.abs(e.deltaY) < 8) return
    wheelAt = now
    api.stepRaw(e.deltaY > 0 ? 1 : -1)
  },
  { passive: false }
)

api.currentPage = () => S.page
emit('ready', {})

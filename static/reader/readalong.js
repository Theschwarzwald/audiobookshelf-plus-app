/**
 * Read-along: highlights the line or word being narrated while the audiobook plays.
 *
 * The audiobook's transcript (timed lines) is aligned with the ebook's text the same way the
 * spelling check does it: 4-word phrases that occur once in both texts anchor the alignment
 * (longest chain in the same order), and positions in between are interpolated. That copes with
 * narrator ad-libs, skipped front matter and edited passages.
 *
 * Mapping both ways:
 *   playback time -> transcript word -> ebook word (section, word index) -> DOM range to highlight
 *   selected ebook word -> transcript word -> playback time ("Play from here")
 */

const ANCHOR = 4
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
const norm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'RT', 'RP'])

/** Words of a section document in reading order: [{ node, start, end, norm }] */
export function wordsOfDoc(doc) {
  const out = []
  const root = doc.body || doc.documentElement
  if (!root) return out
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      for (let p = n.parentNode; p && p !== root; p = p.parentNode) if (SKIP.has((p.nodeName || '').toUpperCase())) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })
  const nodes = []
  let n
  while ((n = walker.nextNode())) nodes.push(n)
  // A word split across styling with nothing between (a drop cap: "B" + "arack") is one word, so the
  // count matches the narration; it's highlighted from its first part
  const BLOCKS = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|TD|TH|SECTION|ARTICLE|BODY|DD|DT|PRE|FIGCAPTION|TR|TABLE|UL|OL)$/
  const blockOf = (node) => {
    let p = node.parentNode
    while (p && p !== root && !BLOCKS.test((p.nodeName || '').toUpperCase())) p = p.parentNode
    return p
  }
  let joinNext = null
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (joinNext && blockOf(joinNext.node) !== blockOf(node)) joinNext = null // a new paragraph starts a new word
    const re = wordRe()
    let m
    let first = true
    while ((m = re.exec(node.data)) !== null) {
      if (first && joinNext && m.index === 0) {
        joinNext.norm += norm(m[0])
        first = false
        if (m.index + m[0].length === node.data.length) continue // the whole node continued the word
        joinNext = null
        continue
      }
      first = false
      const w = { node, start: m.index, end: m.index + m[0].length, norm: norm(m[0]) }
      out.push(w)
      joinNext = w.end === node.data.length ? w : null
    }
    if (first) joinNext = null // no word in this node (a space, punctuation): nothing carries over
  }
  return out
}

function phraseKey(w, i) {
  return w[i] + '\u0001' + w[i + 1] + '\u0001' + w[i + 2] + '\u0001' + w[i + 3]
}

/** Matching positions [[tIdx, eIdx]...] ascending in both (anchor blocks, extended word by word). */
export function alignWords(t, e) {
  // self-contained (no outside names), so the same code also runs in a worker on another core
  const ANCHOR = 4
  const phraseKey = (w, i) => w[i] + '\u0001' + w[i + 1] + '\u0001' + w[i + 2] + '\u0001' + w[i + 3]
  if (t.length < ANCHOR || e.length < ANCHOR) return []
  const uniques = (w) => {
    const pos = new Map()
    for (let i = 0; i <= w.length - ANCHOR; i++) {
      const k = phraseKey(w, i)
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
  // longest chain increasing in both
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
  // Every word covered by an anchor matches; extend each anchor forward/backward while words agree
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
  // Between two matched stretches the narrator may reword ("each other" for "one another"), so no four-word
  // phrase lines up there. Match single words inside each such gap too (longest common subsequence), so the
  // words that were said are found wherever they fall; without this, read along assumed they were the first
  // ones of the gap and struck out the rest as skipped, though they had been read. Short, common words alone
  // ("the", "in") only count next to another match, so they don't tie things to the wrong place.
  const refined = []
  const MAX_CELLS = 250000
  for (let k = 0; k < out.length; k++) {
    refined.push(out[k])
    if (k + 1 >= out.length) break
    const [t0, e0] = out[k]
    const [t1, e1] = out[k + 1]
    const n = t1 - t0 - 1
    const m = e1 - e0 - 1
    if (n <= 0 || m <= 0 || n * m > MAX_CELLS) continue
    // LCS table over the gap
    const W = m + 1
    const L = new Uint16Array((n + 1) * W)
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        L[i * W + j] = t[t0 + 1 + i] === e[e0 + 1 + j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1])
    const found = []
    for (let i = 0, j = 0; i < n && j < m; ) {
      if (t[t0 + 1 + i] === e[e0 + 1 + j]) {
        found.push([t0 + 1 + i, e0 + 1 + j])
        i++
        j++
      } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++
      else j++
    }
    // keep a match when it's a real word or it has a neighbouring match (a run of two or more)
    found.forEach((p, i) => {
      const prevNext = (i > 0 && found[i - 1][0] === p[0] - 1 && found[i - 1][1] === p[1] - 1) || (i + 1 < found.length && found[i + 1][0] === p[0] + 1 && found[i + 1][1] === p[1] + 1)
      if (t[p[0]].length >= 4 || prevNext) refined.push(p)
    })
  }
  return refined
}

/**
 * alignWords on another CPU core (a Web Worker): matching a whole book's words against the narration is the
 * heaviest thing read along does, and the screen keeps drawing and responding while it runs. Where workers
 * aren't available (or fail), it runs here as before. Same result either way.
 */
let alignWorkerUrl = null

/**
 * Matching a long book (hundreds of thousands of words) takes a while on a phone, so the result is kept on the
 * device (IndexedDB) and every later opening of the book reuses it. The key is a fingerprint of both word lists,
 * so a new transcript or a different edition of the book is matched afresh. Newest 12 books kept.
 */
const CACHE_DB = 'absplus-readalong'
const CACHE_KEEP = 12
function fingerprint(t, e) {
  let h = 2166136261
  const mix = (s) => {
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
    h = Math.imul(h ^ 31, 16777619)
  }
  for (const w of t) mix(w)
  h = Math.imul(h ^ 0x9e3779b9, 16777619)
  for (const w of e) mix(w)
  return `${t.length}:${e.length}:${(h >>> 0).toString(36)}`
}
function cacheDb() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(CACHE_DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore('pairs')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}
async function cacheGet(key) {
  const db = await cacheDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const r = db.transaction('pairs').objectStore('pairs').get(key)
      r.onsuccess = () => resolve(r.result || null)
      r.onerror = () => resolve(null)
    } catch (e) {
      resolve(null)
    }
  })
}
async function cachePut(key, pairs) {
  const db = await cacheDb()
  if (!db) return
  try {
    const flat = new Int32Array(pairs.length * 2)
    pairs.forEach((p, i) => {
      flat[i * 2] = p[0]
      flat[i * 2 + 1] = p[1]
    })
    const tx = db.transaction('pairs', 'readwrite')
    const store = tx.objectStore('pairs')
    store.put({ at: Date.now(), flat }, key)
    // only the newest few books are kept
    const all = store.getAll()
    const keys = store.getAllKeys()
    tx.oncomplete = () => {
      const list = (all.result || []).map((v, i) => ({ at: v.at, key: keys.result[i] })).sort((a, b) => b.at - a.at)
      if (list.length <= CACHE_KEEP) return
      const del = db.transaction('pairs', 'readwrite').objectStore('pairs')
      list.slice(CACHE_KEEP).forEach((x) => del.delete(x.key))
    }
  } catch (e) {}
}

export async function alignWordsAsync(t, e, { fresh = false } = {}) {
  let key = null
  try {
    key = fingerprint(t, e)
    // fresh: match again from scratch (Re-align), then save the new result
    const hit = fresh ? null : await cacheGet(key)
    if (hit && hit.flat) {
      const out = new Array(hit.flat.length / 2)
      for (let i = 0; i < out.length; i++) out[i] = [hit.flat[i * 2], hit.flat[i * 2 + 1]]
      return out
    }
  } catch (err) {}
  const pairs = await alignWordsFresh(t, e)
  if (key && pairs.length) cachePut(key, pairs)
  return pairs
}

function alignWordsFresh(t, e) {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return Promise.resolve(alignWords(t, e))
  return new Promise((resolve) => {
    let w = null
    const fallback = () => {
      if (w) w.terminate()
      resolve(alignWords(t, e))
    }
    try {
      if (!alignWorkerUrl) {
        const src = `const align = (${alignWords.toString()})\nonmessage = (m) => postMessage(align(m.data.t, m.data.e))`
        alignWorkerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
      }
      w = new Worker(alignWorkerUrl)
      w.onmessage = (m) => {
        w.terminate()
        resolve(m.data)
      }
      w.onerror = fallback
      w.postMessage({ t, e })
    } catch (err) {
      fallback()
    }
  })
}

/** The matched pair at or before x (binary search over ascending xs); -1 before the first */
function pairAt(xs, x) {
  let lo = 0
  let hi = xs.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

/**
 * Lookup over ascending matched [x, y] pairs (narration word <-> book word).
 *
 * Between two matches it follows the narration word for word from the last match, never past the next one:
 *  - the book has text the narrator skipped: the highlight keeps pace with the voice, then jumps over the
 *    skipped part when the narration gets there (spreading it out evenly used to run ahead of the voice);
 *  - the narrator adds lines that aren't in the book: it waits at the next matched word (see offBookFinder).
 * A stretch with the same number of unmatched words on both sides (a misheard name) still moves evenly.
 */
export function mapper(xs, ys) {
  return (x) => {
    const n = xs.length
    if (!n) return -1
    const ans = pairAt(xs, x)
    if (ans < 0) return Math.max(0, ys[0] - (xs[0] - x))
    if (xs[ans] === x || ans === n - 1) return ys[ans] + (x - xs[ans])
    const dx = xs[ans + 1] - xs[ans]
    const dy = ys[ans + 1] - ys[ans]
    if (dx === dy) return ys[ans] + (x - xs[ans])
    return Math.min(ys[ans] + (x - xs[ans]), ys[ans + 1] - 1)
  }
}

/**
 * Is narration word x somewhere the book doesn't have (the narrator improvising, or lines this edition
 * lacks)? True once the narration has used up the book's words before the next match and clearly more words
 * were narrated than the book has there: read along stops highlighting and picks up at the next shared word.
 */
/**
 * Book text the narrator skipped: book word ranges [from, to) between two matches where the book has clearly
 * more words than were narrated. Read along greys them out, so it's clear why the highlight jumps past them.
 */
export function skippedRanges(xs, ys) {
  const out = []
  for (let i = 0; i + 1 < xs.length; i++) {
    const dx = xs[i + 1] - xs[i]
    const dy = ys[i + 1] - ys[i]
    if (dy - dx >= MIN_EXTRA) out.push([ys[i] + dx, ys[i + 1]])
  }
  return out
}

/**
 * Lines the narrator adds that the book doesn't have: where in the book they start (the book word they come
 * just before) and which narrated words they are. Read along marks the spot with a red line; a tap shows them.
 */
export function addedPassages(xs, ys, tLen = 0) {
  const out = []
  if (!xs.length) return out
  // narration before the first word the book shares (credits, an introduction or opening pages the book
  // lacks): marked where the book's text starts lining up
  if (xs[0] >= MIN_EXTRA) out.push({ at: ys[0], from: 0, to: xs[0] })
  for (let i = 0; i + 1 < xs.length; i++) {
    const dx = xs[i + 1] - xs[i]
    const dy = ys[i + 1] - ys[i]
    if (dx - dy >= MIN_EXTRA) out.push({ at: ys[i + 1], from: xs[i] + dy, to: xs[i + 1] })
  }
  // and after the last (closing credits, an afterword only in the audiobook): marked after the last shared word
  const last = xs.length - 1
  if (tLen - 1 - xs[last] >= MIN_EXTRA) out.push({ at: ys[last] + 1, from: xs[last] + 1, to: tLen })
  return out
}

/** The narrated words of an added passage for its bubble (a long one shortened) */
export function addedText(tRaw, a) {
  const words = tRaw.slice(a.from, a.to)
  return words.length > 70 ? words.slice(0, 70).join(' ') + ' …' : words.join(' ')
}

/**
 * Book words with no narration to play: text the narrator skipped, and what lies well before the first or after
 * the last narrated word (front matter, notes, index). A tap there says so instead of jumping somewhere wrong.
 */
export function noAudioFinder(xs, ys) {
  if (!xs.length) return () => false
  const skip = skippedRanges(xs, ys)
  const first = ys[0]
  const last = ys[ys.length - 1]
  return (e) => e < first - MIN_EXTRA || e > last + MIN_EXTRA || skip.some(([a, b]) => e >= a && e < b)
}

/**
 * The red mark for lines the narrator adds, and the bubble that shows them (drawn with CSS from the mark's
 * data-added, so the book's own text and read along's word positions don't change).
 */
export const ADDED_CSS = `.abs-added{display:inline-block;width:3px;height:1.15em;vertical-align:text-bottom;background:#e53935;background-clip:content-box;border-radius:2px;padding:0 11px;margin:0 -9px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.abs-added.open::after{content:"Added in the audiobook: \\201C" attr(data-added) "\\201D";position:absolute;bottom:calc(100% + 6px);left:-4px;width:max-content;max-width:min(20em,76vw);white-space:normal;font:600 0.8em/1.4 system-ui,-apple-system,Roboto,sans-serif;font-style:normal;text-indent:0;text-align:left;letter-spacing:normal;text-transform:none;color:#fff;background:rgba(30,30,30,0.97);border-left:3px solid #e53935;border-radius:10px;padding:8px 11px;box-shadow:0 6px 18px rgba(0,0,0,0.35);z-index:50;pointer-events:none}
.abs-added.open.below::after{bottom:auto;top:calc(100% + 6px)}
.abs-added.open.right::after{left:auto;right:-4px}`

/** Show or hide a red mark's bubble, opening it above the line (below near the top) and towards the page's middle */
export function openAdded(el, open) {
  if (!el) return
  if (!open) {
    el.classList.remove('open')
    return
  }
  try {
    const win = el.ownerDocument.defaultView
    const r = el.getBoundingClientRect()
    // paginated books are one long row of pages: where the mark is on its own page
    const cs = win.getComputedStyle(el.ownerDocument.documentElement)
    const colW = parseFloat(cs.columnWidth) || 0
    const gap = parseFloat(cs.columnGap) || 0
    const pageW = colW > 0 ? colW + gap : win.innerWidth
    const x = pageW > 0 ? ((r.left % pageW) + pageW) % pageW : r.left
    el.classList.toggle('below', r.top < 120)
    el.classList.toggle('right', x > pageW * 0.55)
  } catch (e) {}
  el.classList.add('open')
}

const MIN_EXTRA = 6
export function offBookFinder(xs, ys) {
  return (x) => {
    if (!xs.length) return false
    // before the first word both share, or after the last: the narration isn't in this book (its opening
    // pages missing, an introduction or credits only in the audiobook). Guessing a spot there landed in the
    // contents list or the index.
    if (x < xs[0] - MIN_EXTRA || x > xs[xs.length - 1] + MIN_EXTRA) return true
    const ans = pairAt(xs, x)
    if (ans < 0 || ans >= xs.length - 1) return false
    const dx = xs[ans + 1] - xs[ans]
    const dy = ys[ans + 1] - ys[ans]
    return dx - dy >= MIN_EXTRA && x - xs[ans] >= dy
  }
}

export class ReadAlong {
  constructor(view, emit) {
    this.view = view
    this.emit = emit
    this.mode = 'off' // off | line | word
    this.autoTurn = true
    this.ready = false
    this.building = null
    this.lastKey = null
    this.userNavAt = 0
    this.docWords = new WeakMap()
    this.fallbackCfi = null
    this.color = 'rgba(255, 213, 79, 0.55)'
  }

  setMode(mode, autoTurn) {
    this.mode = mode || 'off'
    if (autoTurn !== undefined) this.autoTurn = !!autoTurn
    this.lastKey = null
    if (this.mode === 'off') this.clear()
  }

  /**
   * The narrated word's look. box: Karaoke's outlined box with a soft tint (fill c, outline edge), drawn over the
   * word; boxUnderline: also underline the word (e-ink). Without box: a tint, underlined if edge is given.
   */
  setColor(c, underline, opts) {
    this.color = c
    this.underline = underline || ''
    this.box = !!(opts && opts.box)
    this.boxUnderline = !!(opts && opts.boxUnderline)
    for (const { doc } of this.contents()) this.injectStyle(doc, true)
  }

  userNavigated() {
    this.userNavAt = Date.now()
  }

  contents() {
    try {
      return this.view.renderer.getContents() || []
    } catch (e) {
      return []
    }
  }

  injectStyle(doc, replace) {
    let s = doc.getElementById('abs-readalong-style')
    if (s && !replace) return
    if (!s) {
      s = doc.createElement('style')
      s.id = 'abs-readalong-style'
      ;(doc.head || doc.documentElement).append(s)
    }
    // skipped by the narrator: greyed out and struck through lightly
    const fill = this.box ? 'transparent' : this.color
    const line = this.box ? (this.boxUnderline ? this.underline : '') : this.underline
    s.textContent = `::highlight(abs-readalong) { background-color: ${fill}; color: inherit;${line ? ` text-decoration: underline ${line}; text-decoration-thickness: 2px; text-underline-offset: 3px;` : ''} }
::highlight(abs-skipped) { color: rgba(128, 128, 128, 0.75); text-decoration: line-through rgba(128, 128, 128, 0.45); }`
  }

  onLoad(doc) {
    this.injectStyle(doc)
    this.lastKey = null
  }

  /** lines: [{ s, e, t }] sorted by time */
  async setTranscript(lines, opts = {}) {
    this.ready = false
    this.lines = lines || []
    const book = this.view.book
    if (!book || !this.lines.length) return this.emit('readalong-status', { state: 'unavailable', reason: 'no-transcript' })
    if (book.rendition && book.rendition.layout === 'pre-paginated') return this.emit('readalong-status', { state: 'unavailable', reason: 'fixed-layout' })
    const token = {}
    this.building = token
    this.emit('readalong-status', { state: 'aligning', progress: 0 })

    // transcript words with times: the speech engine's own word times when the line has them
    // (l.w, the same data as <audio>_karaoke.lrc), otherwise estimated by position in the line
    const tNorm = []
    const tRaw = []
    const tTime = []
    const tLine = []
    this.lines.forEach((l, li) => {
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
        tLine.push(li)
      })
    })

    // ebook words, section by section
    const eNorm = []
    const eSec = []
    const eIdx = []
    const sections = book.sections || []
    for (let s = 0; s < sections.length; s++) {
      if (this.building !== token) return
      const sec = sections[s]
      if (!sec || sec.linear === 'no' || !sec.createDocument) continue
      try {
        const doc = await sec.createDocument()
        const words = wordsOfDoc(doc)
        for (let i = 0; i < words.length; i++) {
          eNorm.push(words[i].norm)
          eSec.push(s)
          eIdx.push(i)
        }
      } catch (e) {
        /* unreadable section */
      }
      if (s % 5 === 0) {
        this.emit('readalong-status', { state: 'aligning', progress: s / sections.length })
        await new Promise((r) => setTimeout(r, 0))
      }
    }
    if (this.building !== token) return

    const pairs = await alignWordsAsync(tNorm, eNorm, { fresh: !!opts.fresh })
    const matched = tNorm.length ? pairs.length / tNorm.length : 0
    if (pairs.length < 50) {
      this.emit('readalong-status', { state: 'unavailable', reason: 'no-match', matched })
      return
    }
    const pt = pairs.map((p) => p[0])
    const pe = pairs.map((p) => p[1])
    this.t2e = mapper(pt, pe)
    this.e2t = mapper(pe, pt)
    this.offBook = offBookFinder(pt, pe)
    this.noAudio = noAudioFinder(pt, pe)
    this.isOffBook = false
    // skipped book words, by section: sec -> [[firstIdx, lastIdx]]
    this.skipped = new Map()
    for (const [a, b] of skippedRanges(pt, pe)) {
      for (let g = a; g < b; ) {
        const sec = eSec[g]
        let h = g
        while (h + 1 < b && eSec[h + 1] === sec) h++
        if (!this.skipped.has(sec)) this.skipped.set(sec, [])
        this.skipped.get(sec).push([eIdx[g], eIdx[h]])
        g = h + 1
      }
    }
    this.skipPainted = new WeakSet()
    // added by the narrator, by section: sec -> [{ idx, text }]
    this.added = new Map()
    this.addedSpans = [] // narration word ranges of each added passage, to open its bubble as it's said
    this.addedEls = new Map() // passage -> its red mark in the page
    addedPassages(pt, pe, tNorm.length).forEach((a, pid) => {
      const g = Math.min(eNorm.length - 1, a.at)
      const sec = eSec[g]
      if (!this.added.has(sec)) this.added.set(sec, [])
      this.added.get(sec).push({ pid, idx: eIdx[g], text: addedText(tRaw, a) })
      this.addedSpans.push({ pid, from: a.from - 2, to: a.to })
    })
    this.addedOpen = -1
    this.tTime = tTime
    this.tLine = tLine
    this.eSec = eSec
    this.eIdx = eIdx
    this.eCount = eNorm.length
    // first word index of each section, for "Play from here"
    this.secStart = new Map()
    eSec.forEach((s, i) => {
      if (!this.secStart.has(s)) this.secStart.set(s, i)
    })
    // line -> [first word, last word]
    this.lineWords = new Map()
    tLine.forEach((l, k) => {
      const r = this.lineWords.get(l)
      if (!r) this.lineWords.set(l, [k, k])
      else r[1] = k
    })
    this.ready = true
    this.lastKey = null
    this.emit('readalong-status', { state: 'ready', matched })
    this.paintSkipped()
  }

  wordAtTime(t) {
    const a = this.tTime
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

  ebookPos(k) {
    const g = Math.min(this.eCount - 1, Math.max(0, this.t2e(k)))
    return { sec: this.eSec[g], idx: this.eIdx[g] }
  }

  wordsFor(doc) {
    let w = this.docWords.get(doc)
    if (!w) {
      w = wordsOfDoc(doc)
      this.docWords.set(doc, w)
    }
    return w
  }

  /** Karaoke's box round the word: fixed to the section's own view, so it stays on the word as pages turn */
  drawBox(doc, range) {
    try {
      let el = doc.getElementById('abs-readalong-box')
      if (!el) {
        el = doc.createElement('div')
        el.id = 'abs-readalong-box'
        el.setAttribute('aria-hidden', 'true')
        el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;box-sizing:border-box;border-radius:6px;display:none'
        ;(doc.documentElement || doc.body).appendChild(el)
      }
      const rects = range.getClientRects()
      const r = rects.length ? rects[0] : range.getBoundingClientRect()
      const below = this.boxUnderline ? 7 : 2
      el.style.background = this.color
      el.style.border = `1.5px solid ${this.underline || this.color}`
      el.style.left = `${r.left - 4}px`
      el.style.top = `${r.top - 2}px`
      el.style.width = `${r.width + 8}px`
      el.style.height = `${r.height + 2 + below}px`
      el.style.display = r.width ? 'block' : 'none'
      // only one section shows the box
      for (const { doc: d } of this.contents()) {
        if (d === doc) continue
        const o = d.getElementById('abs-readalong-box')
        if (o) o.style.display = 'none'
      }
    } catch (e) {}
  }

  clear() {
    for (const { doc } of this.contents()) {
      try {
        doc.defaultView.CSS.highlights.delete('abs-readalong')
      } catch (e) {}
      try {
        const o = doc.getElementById('abs-readalong-box')
        if (o) o.style.display = 'none'
      } catch (e) {}
    }
    if (this.fallbackCfi) {
      try {
        this.view.deleteAnnotation({ value: this.fallbackCfi })
      } catch (e) {}
      this.fallbackCfi = null
    }
  }

  /** Called a few times a second while the audiobook plays */
  /** Grey out the book text the narrator skipped, in every section on screen (once per page load) */
  paintSkipped() {
    if ((!this.skipped || !this.skipped.size) && (!this.added || !this.added.size)) return
    for (const c of this.contents()) {
      if (!c.doc || this.skipPainted.has(c.doc)) continue
      this.skipPainted.add(c.doc)
      this.markAdded(c)
      const list = this.skipped.get(c.index)
      const win = c.doc.defaultView
      if (!list || !win || !win.CSS || !win.CSS.highlights || !win.Highlight) continue
      const words = this.wordsFor(c.doc)
      if (!words.length) continue
      this.injectStyle(c.doc)
      const ranges = []
      for (const [a, b] of list) {
        const w0 = words[Math.min(a, words.length - 1)]
        const w1 = words[Math.min(b, words.length - 1)]
        if (!w0 || !w1) continue
        const r = c.doc.createRange()
        try {
          r.setStart(w0.node, w0.start)
          r.setEnd(w1.node, w1.end)
          ranges.push(r)
        } catch (e) {}
      }
      if (ranges.length) win.CSS.highlights.set('abs-skipped', new win.Highlight(...ranges))
    }
  }

  /**
   * A red line where the narrator says something the book doesn't have; tap it to see what was said.
   * The markers hold no text, so the book's words (and read along's word positions) don't change.
   */
  markAdded(c) {
    const list = this.added && this.added.get(c.index)
    if (!list || !list.length) return
    const doc = c.doc
    this.injectStyle(doc)
    if (!doc.getElementById('abs-added-style')) {
      const st = doc.createElement('style')
      st.id = 'abs-added-style'
      st.textContent = ADDED_CSS
      ;(doc.head || doc.documentElement).append(st)
    }
    const words = this.wordsFor(doc)
    // from the end, so earlier positions stay valid while inserting
    const spots = list.map((a) => ({ ...a, w: words[Math.min(a.idx, words.length - 1)] })).filter((a) => a.w)
    spots.sort((p, q) => q.idx - p.idx)
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
        const toggle = (e) => {
          e.stopPropagation()
          e.preventDefault()
          openAdded(el, !el.classList.contains('open'))
        }
        el.addEventListener('click', toggle)
        el.addEventListener('pointerup', (e) => e.stopPropagation())
        el.addEventListener('pointerdown', (e) => e.stopPropagation())
        el.addEventListener('touchend', (e) => e.stopPropagation())
        r.insertNode(el)
        if (this.addedEls) this.addedEls.set(a.pid, el)
      } catch (e) {}
    }
    // the text nodes were split: work the word positions out again (same words, same order)
    this.docWords.delete(doc)
  }

  setTime(t, visibleRange) {
    if (!this.ready || this.mode === 'off') return
    this.paintSkipped()
    const k = this.wordAtTime(t)
    if (k < 0) return
    // the narration has left the book (improvised / not in this edition): no highlight until it's back
    const off = !!(this.offBook && this.offBook(k))
    if (off !== this.isOffBook) {
      this.isOffBook = off
      this.emit('readalong-offbook', { off })
    }
    // lines the narrator adds: their bubble opens over the red mark while they're said, and closes after
    const span = this.addedSpans && this.addedSpans.find((s) => k >= s.from && k < s.to)
    const pid = span ? span.pid : -1
    if (pid !== this.addedOpen) {
      const prev = this.addedEls && this.addedEls.get(this.addedOpen)
      if (prev && prev.dataset.auto) {
        openAdded(prev, false)
        delete prev.dataset.auto
      }
      const el = pid >= 0 && this.addedEls && this.addedEls.get(pid)
      if (el && !el.classList.contains('open')) {
        openAdded(el, true)
        el.dataset.auto = '1'
      }
      this.addedOpen = pid
    }
    if (off) {
      if (this.lastKey !== 'off') {
        this.clear()
        this.lastKey = 'off'
        // show where the book picks up again (not whatever page was open before a seek or re-align)
        if (this.autoTurn && Date.now() - this.userNavAt >= 6000) {
          const a = this.ebookPos(k)
          if (!this.contents().some((c) => c.index === a.sec)) this.view.goTo(a.sec).catch(() => {})
        }
      }
      return
    }
    let k0 = k
    let k1 = k
    if (this.mode === 'line') [k0, k1] = this.lineWords.get(this.tLine[k]) || [k, k]
    const key = `${this.mode}:${k0}:${k1}`
    if (key === this.lastKey) return
    const a = this.ebookPos(k0)
    let b = this.ebookPos(k1)
    if (b.sec !== a.sec || b.idx < a.idx) b = { sec: a.sec, idx: a.idx + (k1 - k0) }

    const content = this.contents().find((c) => c.index === a.sec)
    const busy = Date.now() - this.userNavAt < 6000
    if (!content) {
      // narration is in another section: follow it there (then highlight on the next tick)
      if (this.autoTurn && !busy) {
        this.lastKey = null
        this.view.goTo(a.sec).catch(() => {})
      }
      return
    }
    const words = this.wordsFor(content.doc)
    if (!words.length) return
    const w0 = words[Math.min(a.idx, words.length - 1)]
    const w1 = words[Math.min(Math.max(b.idx, a.idx), words.length - 1)]
    const range = content.doc.createRange()
    range.setStart(w0.node, w0.start)
    range.setEnd(w1.node, w1.end)
    this.lastKey = key
    this.highlight(content.doc, content.index, range)

    if (this.autoTurn && !busy) {
      let visible = false
      try {
        visible = !!visibleRange && visibleRange.startContainer.ownerDocument === content.doc && visibleRange.isPointInRange(range.startContainer, range.startOffset) && visibleRange.isPointInRange(range.endContainer, Math.max(0, range.endOffset - 1))
      } catch (e) {}
      if (!visible) {
        try {
          const cfi = this.view.getCFI(content.index, range)
          this.view.goTo(cfi).catch(() => {})
        } catch (e) {}
      }
    }
  }

  highlight(doc, index, range) {
    const win = doc.defaultView
    if (this.box) this.drawBox(doc, range)
    if (win && win.CSS && win.CSS.highlights && win.Highlight) {
      win.CSS.highlights.set('abs-readalong', new win.Highlight(range))
      return
    }
    // Older WebView: draw it as an annotation instead
    try {
      if (this.fallbackCfi) this.view.deleteAnnotation({ value: this.fallbackCfi })
      this.fallbackCfi = this.view.getCFI(index, range)
      this.view.addAnnotation({ value: this.fallbackCfi, readAlong: true })
    } catch (e) {}
  }

  /** Playback time for a range in a rendered section ("Play from here") */
  timeAt(doc, index, range) {
    if (!this.ready) return null
    const words = this.wordsFor(doc)
    let wi = words.findIndex((w) => {
      try {
        return range.comparePoint(w.node, w.end) >= 0
      } catch (e) {
        return false
      }
    })
    if (wi < 0) wi = 0
    const base = this.secStart.get(index)
    if (base === undefined) return null
    this.lastTapWord = base + wi
    const k = Math.max(0, Math.min(this.tTime.length - 1, this.e2t(base + wi)))
    return this.tTime[k]
  }
}

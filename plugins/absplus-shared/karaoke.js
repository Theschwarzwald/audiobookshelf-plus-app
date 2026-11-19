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
export function alignWords(t, e) {
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

export function buildKaraoke(lines, ebookText) {
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
export function wordAt(model, t) {
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

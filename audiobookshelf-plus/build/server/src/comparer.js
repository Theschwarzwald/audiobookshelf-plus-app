'use strict'
/**
 * Compares a transcript with the ebook to find words the speech model probably misspelled
 * (names, homophones, split/joined words). Port of EbookComparer.kt from the Android app, so the
 * server and the phone produce the same suggestions (and the same ebook-check.json format).
 *
 * 1. Across the whole book, find 4-word phrases that occur exactly once in both texts (anchors)
 *    and keep the longest chain of them that is in the same order in both.
 * 2. Between anchors, align the few words left over word by word. A word that differs from the
 *    ebook but looks or sounds similar, with matching words on both sides, becomes a suggestion.
 */
const ANCHOR = 4
const MAX_GAP = 40
const wordRe = () => /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu

const normalize = (w) => w.toLowerCase().replace(/’/g, "'").replace(/'/g, '')

/** [[word, startIndex, endIndexExclusive]] */
function words(text) {
  const out = []
  const re = wordRe()
  let m
  while ((m = re.exec(text)) !== null) out.push([m[0], m.index, m.index + m[0].length])
  return out
}

/** Kotlin Double.toString() so suggestion ids look the same as the phone's */
const ktDouble = (x) => (Number.isInteger(x) ? `${x}.0` : String(x))

function compare(lines, chapters, sections, isCancelled = () => false) {
  const sorted = lines.slice().sort((a, b) => a.start - b.start)
  const tWords = []
  for (const line of sorted) {
    words(line.text).forEach(([w], wi) => tWords.push({ norm: normalize(w), text: w, lineStart: line.start, wordIndex: wi }))
  }
  const eWords = []
  for (const sec of sections) {
    words(sec.text).forEach(([w], i) => eWords.push({ norm: normalize(w), text: w, section: sec.index, pos: i }))
  }
  if (isCancelled()) throw new Error('cancelled')

  const { suggestions: raw, matched } = alignAll(tWords, eWords)

  const chs = (chapters || []).slice().sort((a, b) => a.start - b.start)
  const chapterAt = (t) => {
    let lo = 0
    let hi = chs.length - 1
    let ans = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (chs[mid].start <= t + 0.01) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return ans >= 0 ? chs[ans].title || '' : ''
  }
  const seen = new Set()
  const suggestions = []
  for (const s of raw) {
    const k = `${s.s}:${s.wi}`
    if (seen.has(k)) continue
    seen.add(k)
    s.chapter = chapterAt(s.s)
    suggestions.push(s)
  }
  return { suggestions, chapters: [], matchedWords: matched, transcriptWords: tWords.length }
}

function phraseKey(w, i) {
  return w[i] + '\u0001' + w[i + 1] + '\u0001' + w[i + 2] + '\u0001' + w[i + 3]
}

function alignAll(a, e) {
  const an = a.map((x) => x.norm)
  const en = e.map((x) => x.norm)
  if (an.length < ANCHOR || en.length < ANCHOR) return { suggestions: [], matched: 0 }

  const uniques = (w) => {
    const pos = new Map()
    for (let i = 0; i <= w.length - ANCHOR; i++) {
      const k = phraseKey(w, i)
      pos.set(k, pos.has(k) ? -1 : i)
    }
    return pos
  }
  const ua = uniques(an)
  const ue = uniques(en)
  const pairs = []
  for (const [k, ia] of ua) {
    if (ia < 0) continue
    const ie = ue.get(k)
    if (ie !== undefined && ie >= 0) pairs.push([ia, ie])
  }
  pairs.sort((x, y) => x[0] - y[0])

  const chain = lis(pairs)
  if (!chain.length) return { suggestions: [], matched: 0 }

  const blocks = []
  for (const [ia, ie] of chain) {
    const last = blocks[blocks.length - 1]
    if (last && ia - last.a0 === ie - last.e0 && ia <= last.a0 + last.len) {
      last.len = Math.max(last.len, ia - last.a0 + ANCHOR)
    } else if (!last || (ia >= last.a0 + last.len && ie >= last.e0 + last.len)) {
      blocks.push({ a0: ia, e0: ie, len: ANCHOR })
    }
  }
  let matched = blocks.reduce((n, b) => n + b.len, 0)

  const out = []
  for (let b = 0; b < blocks.length - 1; b++) {
    const x = blocks[b]
    const y = blocks[b + 1]
    const aStart = x.a0 + x.len
    const eStart = x.e0 + x.len
    const aGap = a.slice(aStart, y.a0)
    const eGap = e.slice(eStart, y.e0)
    if (!aGap.length || !eGap.length) continue
    if (aGap.length > MAX_GAP || eGap.length > MAX_GAP) continue
    const ops = align(
      aGap.map((w) => w.norm),
      eGap.map((w) => w.norm)
    )
    matched += ops.filter((o) => o.type === 'MATCH').length
    out.push(...suggestionsFromOps(ops, aGap, eGap, e, eStart))
  }
  return { suggestions: out, matched }
}

function lis(pairs) {
  if (!pairs.length) return []
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
  const res = []
  let k = tails[tails.length - 1]
  while (k >= 0) {
    res.push(pairs[k])
    k = prev[k]
  }
  return res.reverse()
}

function align(a, e) {
  const n = a.length
  const m = e.length
  const d = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = 0; i <= n; i++) d[i][0] = i * 10
  for (let j = 0; j <= m; j++) d[0][j] = j * 10
  const cost = (x, y) => (x === y ? 0 : similar(x, y) ? 6 : 14)
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = d[i - 1][j - 1] + cost(a[i - 1], e[j - 1])
      d[i][j] = Math.min(sub, d[i - 1][j] + 10, d[i][j - 1] + 10)
    }
  }
  const steps = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = a[i - 1] === e[j - 1]
      const c = cost(a[i - 1], e[j - 1])
      if (d[i][j] === d[i - 1][j - 1] + c) {
        steps.push({ type: same ? 'MATCH' : 'SUB', ai: i - 1, ei: j - 1 })
        i--
        j--
        continue
      }
    }
    if (i > 0 && d[i][j] === d[i - 1][j] + 10) {
      steps.push({ type: 'INS', ai: i - 1, ei: -1 })
      i--
    } else {
      steps.push({ type: 'DEL', ai: -1, ei: j - 1 })
      j--
    }
  }
  return steps.reverse()
}

function suggestionsFromOps(ops, a, e, allE, eOffset) {
  const out = []
  const isMatchAt = (k) => k < 0 || k >= ops.length || ops[k].type === 'MATCH'
  let k = 0
  while (k < ops.length) {
    const op = ops[k]
    // Two transcript words that the ebook writes as one ("night time" -> "nighttime")
    if (op.type === 'SUB' && k + 1 < ops.length && ops[k + 1].type === 'INS' && isMatchAt(k - 1) && isMatchAt(k + 2)) {
      const t1 = a[op.ai]
      const t2 = a[ops[k + 1].ai]
      const ew = e[op.ei]
      if (t1.norm + t2.norm === ew.norm.replace(/-/g, '')) {
        out.push(make(t1, 2, `${t1.text} ${t2.text}`, ew, allE, eOffset + op.ei))
        k += 2
        continue
      }
    }
    if (op.type === 'INS' && k + 1 < ops.length && ops[k + 1].type === 'SUB' && isMatchAt(k - 1) && isMatchAt(k + 2)) {
      const t1 = a[op.ai]
      const t2 = a[ops[k + 1].ai]
      const ew = e[ops[k + 1].ei]
      if (t1.norm + t2.norm === ew.norm) {
        out.push(make(t1, 2, `${t1.text} ${t2.text}`, ew, allE, eOffset + ops[k + 1].ei))
        k += 2
        continue
      }
    }
    // One transcript word the ebook writes as two ("anymore" -> "any more")
    if (op.type === 'SUB' && k + 1 < ops.length && ops[k + 1].type === 'DEL' && isMatchAt(k - 1) && isMatchAt(k + 2)) {
      const t = a[op.ai]
      const e1 = e[op.ei]
      const e2 = e[ops[k + 1].ei]
      if (t.norm === e1.norm + e2.norm) {
        out.push(make(t, 1, t.text, { norm: e1.norm + e2.norm, text: `${e1.text} ${e2.text}`, section: e1.section, pos: e1.pos }, allE, eOffset + op.ei))
        k += 2
        continue
      }
    }
    // Isolated, similar-looking substitution with matching words on both sides
    if (op.type === 'SUB' && isMatchAt(k - 1) && isMatchAt(k + 1)) {
      const t = a[op.ai]
      const ew = e[op.ei]
      if (similar(t.norm, ew.norm) && !isNumberish(t.norm) && !isNumberish(ew.norm)) {
        out.push(make(t, 1, t.text, ew, allE, eOffset + op.ei))
      }
    }
    k++
  }
  return out
}

function make(t, count, heard, ew, allE, ePos) {
  const from = Math.max(0, ePos - 6)
  const to = Math.min(allE.length, ePos + 7)
  const context = allE
    .slice(from, to)
    .map((w) => w.text)
    .join(' ')
  return {
    id: `${ktDouble(t.lineStart)}-${t.wordIndex}`,
    s: t.lineStart,
    wi: t.wordIndex,
    wn: count,
    heard,
    ebook: matchCase(t.text, ew.text),
    context,
    chapter: '',
    status: 'pending'
  }
}

const isUpper = (c) => c !== c.toLowerCase() && c === c.toUpperCase()
const isLower = (c) => c !== c.toUpperCase() && c === c.toLowerCase()

function matchCase(heard, ebook) {
  if (!ebook || !heard) return ebook
  return isUpper(heard[0]) && isLower(ebook[0]) ? ebook[0].toUpperCase() + ebook.slice(1) : ebook
}

const isNumberish = (w) => /\d/.test(w)

function similar(a, b) {
  if (a === b) return true
  if (a.length < 3 || b.length < 3) return false
  const dist = levenshtein(a, b)
  if (dist / Math.max(a.length, b.length) <= 0.34) return true
  return a[0] === b[0] && sound(a) === sound(b)
}

function levenshtein(a, b) {
  let prev = new Int32Array(b.length + 1)
  let cur = new Int32Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c)
    }
    const t = prev
    prev = cur
    cur = t
  }
  return prev[b.length]
}

function sound(w) {
  const s = w.toLowerCase().replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/gh/g, '').replace(/wh/g, 'w')
  let code = ''
  let last = ' '
  for (const ch of s) {
    let c = '0'
    if ('bfpv'.includes(ch)) c = '1'
    else if ('cgjkqsxz'.includes(ch)) c = '2'
    else if ('dt'.includes(ch)) c = '3'
    else if (ch === 'l') c = '4'
    else if ('mn'.includes(ch)) c = '5'
    else if (ch === 'r') c = '6'
    if (c !== last && c !== '0') code += c
    last = c
  }
  return code
}

function resultToJson(r, ebookTitle) {
  return {
    ebookTitle: ebookTitle || null,
    matchedWords: r.matchedWords,
    transcriptWords: r.transcriptWords,
    chapters: r.chapters,
    suggestions: r.suggestions
  }
}

/** Replaces the suggested words inside a line's text, keeping punctuation around them. */
function applyToLine(text, fixes) {
  const ws = words(text)
  let out = text
  for (const f of fixes.slice().sort((x, y) => y.wi - x.wi)) {
    const wn = f.wn || 1
    if (f.wi >= ws.length) continue
    const lastIdx = f.wi + wn - 1
    if (lastIdx >= ws.length) continue
    const heardNow = ws
      .slice(f.wi, lastIdx + 1)
      .map((w) => w[0])
      .join(' ')
    if (normalize(heardNow).replace(/ /g, '') !== normalize(f.heard).replace(/ /g, '')) continue // line changed since
    out = out.slice(0, ws[f.wi][1]) + f.ebook + out.slice(ws[lastIdx][2])
  }
  return out
}

module.exports = { compare, resultToJson, applyToLine, similar, normalize, words }

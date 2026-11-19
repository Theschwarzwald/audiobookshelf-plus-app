'use strict'
/**
 * Dictionaries for the e-reader (Kindle-style lookups).
 *
 * Put StarDict dictionaries (the common free format: .ifo + .idx + .dict or .dict.dz, optional .syn)
 * in DICTIONARY_DIR, one folder per language:
 *
 *   /dictionaries/en/wordnet/wordnet.ifo …
 *   /dictionaries/es/wiktionary-es.ifo …
 *
 * The folder name is the language (ISO 639-1 code, "any" or no folder = any language).
 * Phones can download a dictionary to look words up offline; anything not found falls back to the
 * server, and (optionally) to Wiktionary online.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const config = require('./config')
const log = require('./log')

// ---------------------------------------------------------------- StarDict

/** StarDict's index order: ASCII-case-insensitive, then byte order */
function asciiCaseCmp(a, aStart, aLen, b) {
  const n = Math.min(aLen, b.length)
  for (let i = 0; i < n; i++) {
    let x = a[aStart + i]
    let y = b[i]
    if (x >= 65 && x <= 90) x += 32
    if (y >= 65 && y <= 90) y += 32
    if (x !== y) return x - y
  }
  return aLen - b.length
}

class DictZip {
  constructor(file) {
    this.fd = fs.openSync(file, 'r')
    const head = Buffer.alloc(65536)
    const n = fs.readSync(this.fd, head, 0, head.length, 0)
    if (n < 10 || head[0] !== 0x1f || head[1] !== 0x8b) throw new Error('Not a gzip file')
    const flg = head[3]
    let p = 10
    this.chunks = null
    if (flg & 4) {
      const xlen = head.readUInt16LE(p)
      let q = p + 2
      const end = q + xlen
      while (q + 4 <= end) {
        const si1 = head[q]
        const si2 = head[q + 1]
        const len = head.readUInt16LE(q + 2)
        if (si1 === 0x52 && si2 === 0x41) {
          // 'RA': dictzip random-access table
          const chlen = head.readUInt16LE(q + 6)
          const chcnt = head.readUInt16LE(q + 8)
          const sizes = []
          for (let i = 0; i < chcnt; i++) sizes.push(head.readUInt16LE(q + 10 + i * 2))
          this.chlen = chlen
          this.sizes = sizes
        }
        q += 4 + len
      }
      p = end
    }
    if (flg & 8) while (head[p++] !== 0);
    if (flg & 16) while (head[p++] !== 0);
    if (flg & 2) p += 2
    this.dataStart = p
    if (this.sizes) {
      this.offsets = new Array(this.sizes.length)
      let off = p
      for (let i = 0; i < this.sizes.length; i++) {
        this.offsets[i] = off
        off += this.sizes[i]
      }
      this.cache = new Map()
    } else {
      // Plain gzip (not dictzip): decompress once
      fs.closeSync(this.fd)
      this.whole = zlib.gunzipSync(fs.readFileSync(file))
    }
  }
  chunk(i) {
    if (this.cache.has(i)) return this.cache.get(i)
    const buf = Buffer.alloc(this.sizes[i])
    fs.readSync(this.fd, buf, 0, buf.length, this.offsets[i])
    const out = zlib.inflateRawSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
    if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value)
    this.cache.set(i, out)
    return out
  }
  read(offset, size) {
    if (this.whole) return this.whole.subarray(offset, offset + size)
    const first = Math.floor(offset / this.chlen)
    const last = Math.floor((offset + size - 1) / this.chlen)
    const parts = []
    for (let i = first; i <= last && i < this.sizes.length; i++) parts.push(this.chunk(i))
    const all = Buffer.concat(parts)
    const start = offset - first * this.chlen
    return all.subarray(start, start + size)
  }
}

class PlainDict {
  constructor(file) {
    this.fd = fs.openSync(file, 'r')
  }
  read(offset, size) {
    const buf = Buffer.alloc(size)
    fs.readSync(this.fd, buf, 0, size, offset)
    return buf
  }
}

class StarDict {
  constructor(ifoPath, lang) {
    this.ifoPath = ifoPath
    this.base = ifoPath.replace(/\.ifo$/i, '')
    this.info = StarDict.readIfo(ifoPath)
    this.name = this.info.bookname || path.basename(this.base)
    this.lang = lang
    this.files = [ifoPath]
    this.loaded = false
  }

  static readIfo(file) {
    const info = {}
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=')
      if (i > 0) info[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
    return info
  }

  find(ext) {
    for (const e of ext) {
      if (fs.existsSync(this.base + e)) return this.base + e
    }
    return null
  }

  load() {
    if (this.loaded) return
    const idxFile = this.find(['.idx', '.idx.gz', '.IDX'])
    const dictFile = this.find(['.dict.dz', '.dict', '.DICT.DZ', '.DICT'])
    if (!idxFile || !dictFile) throw new Error(`${this.name}: missing .idx or .dict file`)
    this.idx = idxFile.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(idxFile)) : fs.readFileSync(idxFile)
    this.offBits = this.info.idxoffsetbits === '64' ? 64 : 32
    const tail = this.offBits === 64 ? 12 : 8
    const starts = []
    let p = 0
    while (p < this.idx.length) {
      starts.push(p)
      const z = this.idx.indexOf(0, p)
      if (z < 0) break
      p = z + 1 + tail
    }
    this.starts = Int32Array.from(starts)
    this.dict = dictFile.endsWith('.dz') || dictFile.endsWith('.DZ') ? new DictZip(dictFile) : new PlainDict(dictFile)
    const synFile = this.find(['.syn'])
    if (synFile) {
      this.syn = fs.readFileSync(synFile)
      const s = []
      let q = 0
      while (q < this.syn.length) {
        s.push(q)
        const z = this.syn.indexOf(0, q)
        if (z < 0) break
        q = z + 5
      }
      this.synStarts = Int32Array.from(s)
    }
    this.files = [this.ifoPath, idxFile, dictFile, synFile].filter(Boolean)
    this.loaded = true
  }

  wordAt(buf, start) {
    const z = buf.indexOf(0, start)
    return { end: z, word: buf.toString('utf8', start, z) }
  }

  /** All index positions whose word matches [word] ignoring ASCII case */
  search(buf, starts, word) {
    const key = Buffer.from(word, 'utf8')
    let lo = 0
    let hi = starts.length - 1
    let found = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const s = starts[mid]
      const z = buf.indexOf(0, s)
      const c = asciiCaseCmp(buf, s, z - s, key)
      if (c < 0) lo = mid + 1
      else {
        if (c === 0) found = mid
        hi = mid - 1
      }
    }
    if (found < 0) return []
    const out = []
    for (let i = found; i < starts.length; i++) {
      const s = starts[i]
      const z = buf.indexOf(0, s)
      if (asciiCaseCmp(buf, s, z - s, key) !== 0) break
      out.push(i)
    }
    return out
  }

  entry(i) {
    const s = this.starts[i]
    const z = this.idx.indexOf(0, s)
    const word = this.idx.toString('utf8', s, z)
    let offset
    let size
    if (this.offBits === 64) {
      offset = this.idx.readUInt32BE(z + 1) * 2 ** 32 + this.idx.readUInt32BE(z + 5)
      size = this.idx.readUInt32BE(z + 9)
    } else {
      offset = this.idx.readUInt32BE(z + 1)
      size = this.idx.readUInt32BE(z + 5)
    }
    return { word, offset, size }
  }

  lookup(word) {
    this.load()
    const idxs = new Set(this.search(this.idx, this.starts, word))
    if (this.syn) {
      for (const i of this.search(this.syn, this.synStarts, word)) {
        const z = this.syn.indexOf(0, this.synStarts[i])
        idxs.add(this.syn.readUInt32BE(z + 1))
      }
    }
    const out = []
    for (const i of [...idxs].sort((a, b) => a - b)) {
      if (i < 0 || i >= this.starts.length) continue
      const e = this.entry(i)
      const data = this.dict.read(e.offset, e.size)
      out.push({ headword: e.word, ...parseEntry(data, this.info.sametypesequence || '') })
    }
    // Exact case first ("Polish" vs "polish")
    return out.sort((a, b) => (b.headword === word) - (a.headword === word))
  }
}

/** Turns one StarDict entry into { format: 'html' | 'text', definition } */
function parseEntry(data, sts) {
  const parts = []
  let p = 0
  const readField = (type, last) => {
    if (type >= 'A' && type <= 'Z') {
      if (last && sts) {
        parts.push({ type, data: data.subarray(p) })
        p = data.length
      } else {
        const len = data.readUInt32BE(p)
        parts.push({ type, data: data.subarray(p + 4, p + 4 + len) })
        p += 4 + len
      }
    } else {
      let z = last && sts ? data.length : data.indexOf(0, p)
      if (z < 0) z = data.length
      parts.push({ type, data: data.subarray(p, z) })
      p = z + 1
    }
  }
  if (sts) {
    for (let i = 0; i < sts.length && p <= data.length; i++) readField(sts[i], i === sts.length - 1)
  } else {
    while (p < data.length) {
      const type = String.fromCharCode(data[p++])
      readField(type, false)
    }
  }
  const html = []
  for (const f of parts) {
    const text = f.data.toString('utf8')
    if (f.type === 'h' || f.type === 'g') html.push(text)
    else if (f.type === 'x') html.push(xdxfToHtml(text))
    else if (f.type === 't') html.push(`<p class="phonetic">[${escapeHtml(text)}]</p>`)
    else if ('mlyk'.includes(f.type)) html.push(`<div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`)
  }
  return { format: 'html', definition: html.join('\n') }
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function xdxfToHtml(x) {
  return x
    .replace(/<k>[\s\S]*?<\/k>/g, '')
    .replace(/<\/?(ar|def)[^>]*>/g, '')
    .replace(/<tr>/g, '<span class="phonetic">[')
    .replace(/<\/tr>/g, ']</span>')
    .replace(/<abr>/g, '<i>')
    .replace(/<\/abr>/g, '</i>')
    .replace(/<ex>/g, '<em>')
    .replace(/<\/ex>/g, '</em>')
    .replace(/<kref>/g, '<b>')
    .replace(/<\/kref>/g, '</b>')
    .replace(/<c[^>]*>/g, '<span>')
    .replace(/<\/c>/g, '</span>')
    .replace(/\n/g, '<br>')
}

// ---------------------------------------------------------------- WordNet (English definitions)

const WN_POS = [
  ['noun', 'noun'],
  ['verb', 'verb'],
  ['adj', 'adjective'],
  ['adv', 'adverb']
]

/** Princeton WordNet's own files (index.noun, data.noun, noun.exc …): a real English dictionary */
class WordNet {
  constructor(dir, lang) {
    this.dir = dir
    this.ifoPath = path.join(dir, 'index.noun') // a stable path for the registry
    this.name = 'WordNet'
    this.lang = lang || 'en'
    this.kind = 'definition'
    this.format = 'wordnet'
    this.info = { wordcount: '155287' }
    this.files = WN_POS.flatMap(([p]) => ['index.' + p, 'data.' + p]).map((x) => path.join(dir, x))
    this.loaded = false
  }

  load() {
    if (this.loaded) return
    this.index = {}
    this.exc = {}
    this.fds = {}
    for (const [p] of WN_POS) {
      const map = new Map()
      for (const line of fs.readFileSync(path.join(this.dir, 'index.' + p), 'utf8').split('\n')) {
        if (!line || line[0] === ' ') continue
        const t = line.trim().split(' ')
        const n = parseInt(t[2], 10)
        if (!n) continue
        map.set(t[0], t.slice(t.length - n))
      }
      this.index[p] = map
      const exc = new Map()
      try {
        for (const line of fs.readFileSync(path.join(this.dir, p + '.exc'), 'utf8').split('\n')) {
          const t = line.trim().split(' ')
          if (t.length > 1) exc.set(t[0], t.slice(1))
        }
      } catch (e) {}
      this.exc[p] = exc
      this.fds[p] = fs.openSync(path.join(this.dir, 'data.' + p), 'r')
    }
    this.loaded = true
  }

  synset(p, offset) {
    const buf = Buffer.alloc(16384)
    const n = fs.readSync(this.fds[p], buf, 0, buf.length, parseInt(offset, 10))
    let line = buf.toString('utf8', 0, n)
    const nl = line.indexOf('\n')
    if (nl >= 0) line = line.slice(0, nl)
    const bar = line.indexOf(' | ')
    const head = (bar >= 0 ? line.slice(0, bar) : line).split(' ')
    const gloss = bar >= 0 ? line.slice(bar + 3).trim() : ''
    const count = parseInt(head[3], 16) || 0
    const words = []
    for (let i = 0; i < count; i++) words.push(String(head[4 + i * 2] || '').replace(/\(.*\)$/, '').replace(/_/g, ' '))
    // gloss: definition; "example"; "example"
    const examples = []
    const definition = gloss
      .replace(/"([^"]*)"/g, (m, ex) => {
        examples.push(ex.trim())
        return ''
      })
      .replace(/(;\s*)+$/, '')
      .replace(/;\s*;/g, ';')
      .trim()
    return { words, definition, examples }
  }

  lookup(word) {
    this.load()
    const w = String(word || '').toLowerCase().trim().replace(/\s+/g, '_')
    if (!w) return []
    const html = []
    for (const [p, label] of WN_POS) {
      const lemmas = [w, ...(this.exc[p].get(w) || [])]
      const seen = new Set()
      const senses = []
      for (const lemma of lemmas) {
        for (const off of this.index[p].get(lemma) || []) {
          if (seen.has(off)) continue
          seen.add(off)
          try {
            senses.push({ lemma, ...this.synset(p, off) })
          } catch (e) {}
        }
      }
      if (!senses.length) continue
      const items = senses.slice(0, 8).map((x) => {
        const similar = x.words.filter((y) => y.toLowerCase() !== x.lemma.replace(/_/g, ' '))
        return `<li>${escapeHtml(x.definition)}${x.examples.slice(0, 2).map((e) => `<br><em>“${escapeHtml(e)}”</em>`).join('')}${similar.length ? `<br><span class="syn">Similar: ${escapeHtml(similar.slice(0, 6).join(', '))}</span>` : ''}</li>`
      })
      html.push(`<p><i>${label}</i></p><ol>${items.join('')}</ol>`)
    }
    if (!html.length) return []
    return [{ headword: word, format: 'html', definition: html.join('') }]
  }
}

/** FreeDict "eng-spa" style dictionaries translate; the rest explain words in their own language */
function kindOf(id, name) {
  const m = String(id || '').match(/freedict-([a-z]{3})-([a-z]{3})/) || String(name || '').match(/^([a-z]{3})-([a-z]{3})$/i)
  if (m && m[1].toLowerCase() !== m[2].toLowerCase()) return 'translation'
  return 'definition'
}

// ---------------------------------------------------------------- word forms

/** Spellings to try, most likely first ("Running," -> running, run) */
function candidates(raw, lang) {
  const w = String(raw || '')
    .normalize('NFC')
    .replace(/[’`´]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!w) return []
  const out = [w, w.toLowerCase()]
  const lower = w.toLowerCase()
  const en = !lang || lang === 'any' || lang.startsWith('en')
  if (en) {
    const base = lower.replace(/'s$|s'$/, '')
    if (base !== lower) out.push(base)
    const rules = [
      [/ies$/, 'y'],
      [/ves$/, 'f'],
      [/ves$/, 'fe'],
      [/(ss|sh|ch|x|z|o)es$/, '$1'],
      [/s$/, ''],
      [/ied$/, 'y'],
      [/([^aeiou])\1ed$/, '$1'],
      [/ed$/, 'e'],
      [/ed$/, ''],
      [/([^aeiou])\1ing$/, '$1'],
      [/ing$/, 'e'],
      [/ing$/, ''],
      [/ier$/, 'y'],
      [/iest$/, 'y'],
      [/er$/, ''],
      [/est$/, ''],
      [/ly$/, ''],
      [/ily$/, 'y']
    ]
    for (const [re, rep] of rules) {
      if (re.test(base) && base.length > 3) out.push(base.replace(re, rep))
    }
  } else {
    // Romance languages: plural -s / -es
    if (/^(es|fr|it|pt|ca)/.test(lang)) {
      if (lower.endsWith('es')) out.push(lower.slice(0, -2))
      if (lower.endsWith('s')) out.push(lower.slice(0, -1))
    }
  }
  return [...new Set(out.filter(Boolean))]
}

// ---------------------------------------------------------------- registry

class Dictionaries {
  constructor(dir = config.dictionaryDir) {
    this.dir = dir
    this.dicts = []
    this.scannedAt = 0
    this.online = new Map() // word|lang -> result (small cache)
  }

  slug(s) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  scan(force) {
    if (!force && Date.now() - this.scannedAt < 60000) return this.dicts
    this.scannedAt = Date.now()
    const found = []
    const walk = (dir, depth, lang) => {
      let entries = []
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch (e) {
        return
      }
      if (entries.some((e) => e.name === 'index.noun') && entries.some((e) => e.name === 'data.noun')) {
        const existing = this.dicts.find((d) => d.dir === dir)
        const d = existing || new WordNet(dir, lang)
        d.lang = lang && lang !== 'any' ? lang : 'en'
        d.id = this.slug(path.relative(this.dir, dir)) || 'wordnet'
        found.push(d)
        return
      }
      for (const e of entries) {
        const p = path.join(dir, e.name)
        if (e.isDirectory() && depth < 3) {
          const isLang = depth === 0 && /^([a-z]{2,3}(-[a-z]{2})?|any)$/i.test(e.name)
          walk(p, depth + 1, isLang ? e.name.toLowerCase() : lang)
        } else if (e.isFile() && /\.ifo$/i.test(e.name)) {
          try {
            const existing = this.dicts.find((d) => d.ifoPath === p)
            const d = existing || new StarDict(p, lang)
            d.lang = (d.info.lang && !lang ? String(d.info.lang).slice(0, 2).toLowerCase() : lang) || 'any'
            d.id = this.slug(path.relative(this.dir, p).replace(/\.ifo$/i, ''))
            d.kind = kindOf(d.id, d.name)
            found.push(d)
          } catch (err) {
            log.warn(`Skipping dictionary ${p}: ${err.message}`)
          }
        }
      }
    }
    walk(this.dir, 0, null)
    this.dicts = found
    return found
  }

  list() {
    return this.scan().map((d) => {
      let size = 0
      try {
        d.load()
        size = d.files.reduce((n, f) => n + fs.statSync(f).size, 0)
      } catch (e) {
        log.warn(`Dictionary ${d.name}: ${e.message}`)
      }
      return { id: d.id, name: d.name, lang: d.lang, kind: d.kind || 'definition', format: d.format || 'stardict', words: parseInt(d.info.wordcount || '0', 10), size, ok: d.loaded }
    })
  }

  get(id) {
    return this.scan().find((d) => d.id === id) || null
  }

  forLang(lang) {
    // no language on the book: most likely English
    const l = (lang || 'en').toLowerCase().slice(0, 2)
    const all = this.scan()
    const exact = all.filter((d) => l && d.lang.slice(0, 2) === l)
    const any = all.filter((d) => d.lang === 'any')
    return exact.length || !l ? exact.concat(any) : any
  }

  /** Results from [dicts] for the first spelling any of them knows */
  firstHit(dicts, word, lang, kind) {
    for (const cand of candidates(word, lang)) {
      const results = []
      for (const d of dicts) {
        try {
          for (const r of d.lookup(cand)) results.push({ dictionary: d.name, dictionaryId: d.id, kind, ...r })
        } catch (e) {
          log.warn(`Lookup in ${d.name} failed: ${e.message}`)
        }
      }
      if (results.length) return { matched: cand, results }
    }
    return null
  }

  /**
   * { word, lang, matched, results: [{ dictionary, dictionaryId, kind, headword, format, definition }], source }
   * Definitions come first (WordNet and other one-language dictionaries, or Wiktionary online), then
   * translations (bilingual FreeDict dictionaries), each marked kind: 'definition' | 'translation'.
   */
  async lookup(word, lang) {
    const dicts = this.forLang(lang)
    const defs = this.firstHit(dicts.filter((d) => d.kind !== 'translation'), word, lang, 'definition')
    const trans = this.firstHit(dicts.filter((d) => d.kind === 'translation'), word, lang, 'translation')
    let definitions = defs ? defs.results : []
    let source = 'server'
    if (!definitions.length && config.dictionaryOnline) {
      try {
        const online = await this.wiktionary(word, lang)
        if (online) {
          definitions = online.results.map((r) => ({ ...r, kind: 'definition' }))
          source = trans ? 'mixed' : 'online'
        }
      } catch (e) {
        log.debug(`Wiktionary lookup failed: ${e.message}`)
      }
    }
    const results = definitions.concat(trans ? trans.results : [])
    const matched = (defs && defs.matched) || (definitions[0] && definitions[0].headword) || (trans && trans.matched) || null
    return { word, lang: lang || null, matched, results, source }
  }

  async wiktionary(word, lang) {
    const l = (lang || 'en').slice(0, 2).toLowerCase()
    for (const cand of candidates(word, l).slice(0, 4)) {
      const key = `${cand}|${l}`
      if (this.online.has(key)) {
        const hit = this.online.get(key)
        if (hit) return hit
        continue
      }
      const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cand)}`, {
        headers: { 'user-agent': 'abs-transcription (Audiobookshelf add-on)', accept: 'application/json' },
        signal: AbortSignal.timeout(6000)
      })
      let hit = null
      if (res.ok) {
        const json = await res.json()
        const groups = json[l] || (l === 'en' ? null : json.en)
        if (groups && groups.length) {
          const html = groups
            .map((g) => `<p><i>${escapeHtml(g.partOfSpeech || '')}</i></p><ol>${(g.definitions || []).slice(0, 6).map((d) => `<li>${d.definition || ''}</li>`).join('')}</ol>`)
            .join('')
          hit = { word, lang: l, matched: cand, results: [{ dictionary: 'Wiktionary', dictionaryId: 'wiktionary', headword: cand, format: 'html', definition: sanitize(html) }], source: 'online' }
        }
      }
      this.online.set(key, hit)
      if (this.online.size > 2000) this.online.delete(this.online.keys().next().value)
      if (hit) return hit
    }
    return null
  }
}

/** Keeps only simple formatting tags from online HTML */
function sanitize(html) {
  return html
    .replace(/<(script|style|iframe|object)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\b[^>]*>/gi, '<span>')
    .replace(/<\/a>/gi, '</span>')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/<(?!\/?(p|ol|ul|li|i|b|em|strong|span|br|div|sup|sub)\b)[^>]*>/gi, '')
}

// ---------------------------------------------------------------- zip (stored) for phone downloads

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

/** Streams a zip (no compression) of [files] as [{ name, path }] to [res] */
function writeZip(res, files) {
  const central = []
  let offset = 0
  for (const f of files) {
    const data = fs.readFileSync(f.path)
    const name = Buffer.from(f.name)
    const crc = crc32(data)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(data.length, 18)
    lh.writeUInt32LE(data.length, 22)
    lh.writeUInt16LE(name.length, 26)
    res.write(lh)
    res.write(name)
    res.write(data)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)
    ch.writeUInt16LE(20, 6)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(data.length, 20)
    ch.writeUInt32LE(data.length, 24)
    ch.writeUInt16LE(name.length, 28)
    ch.writeUInt32LE(offset, 42)
    central.push(ch, name)
    offset += 30 + name.length + data.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(cd.length, 12)
  end.writeUInt32LE(offset, 16)
  res.write(cd)
  res.end(end)
}

module.exports = { Dictionaries, StarDict, WordNet, kindOf, candidates, parseEntry, writeZip, crc32 }

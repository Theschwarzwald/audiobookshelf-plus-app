'use strict'
/**
 * Dictionaries to download onto the server (Settings → Dictionaries): FreeDict's StarDict dictionaries
 * (free, GPL / CC; 30+ languages explained in English), with the ones for the languages of the books in
 * the library recommended. They go into DICTIONARY_DIR/<language>/freedict-<name>/, where lookups find them
 * (and phones can copy them for offline use). English words are covered online by Wiktionary
 * (DICTIONARY_ONLINE); the ABS+ app also has its own offline English dictionary (WordNet).
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { pipeline } = require('stream/promises')
const { Readable } = require('stream')
const config = require('./config')
const log = require('./log')

const DATABASE = 'https://freedict.org/freedict-database.json'
// A real English dictionary (definitions, examples, similar words): Princeton WordNet 3.1
const WORDNET = { name: 'wordnet', kind: 'definition', from: 'en', to: 'en', fromName: 'English', toName: 'English definitions', headwords: 155287, size: 16358468, version: '3.1', url: 'https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz', credit: 'Princeton WordNet 3.1' }
// ISO 639-3 (FreeDict) -> the 2-letter folders lookups use
const ISO2 = { afr: 'af', ara: 'ar', bre: 'br', bul: 'bg', cat: 'ca', ces: 'cs', cym: 'cy', dan: 'da', deu: 'de', ell: 'el', eng: 'en', epo: 'eo', est: 'et', fin: 'fi', fra: 'fr', gla: 'gd', gle: 'ga', heb: 'he', hin: 'hi', hrv: 'hr', hun: 'hu', isl: 'is', ita: 'it', jpn: 'ja', kor: 'ko', kur: 'ku', lat: 'la', lit: 'lt', lav: 'lv', nld: 'nl', nor: 'no', nob: 'nb', pol: 'pl', por: 'pt', ron: 'ro', rus: 'ru', slk: 'sk', slv: 'sl', spa: 'es', srp: 'sr', swe: 'sv', swh: 'sw', tur: 'tr', ukr: 'uk', vie: 'vi', zho: 'zh' }
const NAMES = { af: 'Afrikaans', ar: 'Arabic', bg: 'Bulgarian', br: 'Breton', ca: 'Catalan', cs: 'Czech', cy: 'Welsh', da: 'Danish', de: 'German', el: 'Greek', en: 'English', eo: 'Esperanto', es: 'Spanish', et: 'Estonian', fi: 'Finnish', fr: 'French', ga: 'Irish', gd: 'Scottish Gaelic', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian', hu: 'Hungarian', is: 'Icelandic', it: 'Italian', ja: 'Japanese', ko: 'Korean', ku: 'Kurdish', la: 'Latin', lt: 'Lithuanian', lv: 'Latvian', nb: 'Norwegian', nl: 'Dutch', no: 'Norwegian', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian', sr: 'Serbian', sv: 'Swedish', sw: 'Swahili', tr: 'Turkish', uk: 'Ukrainian', vi: 'Vietnamese', zh: 'Chinese' }

/** "German", "deu", "de-DE" -> "de" */
function langCode(v) {
  const s = String(v || '').trim().toLowerCase()
  if (!s) return null
  if (/^[a-z]{2}([-_][a-z]{2})?$/.test(s)) return s.slice(0, 2)
  if (ISO2[s]) return ISO2[s]
  const byName = Object.entries(NAMES).find(([, n]) => n.toLowerCase() === s || s.startsWith(n.toLowerCase()))
  return byName ? byName[0] : null
}

class DictDownloads {
  constructor(dictionaries, library) {
    this.dictionaries = dictionaries
    this.library = library
    this.cache = null
    this.job = null
  }

  async catalog() {
    if (this.cache && Date.now() - this.cache.at < 24 * 3600 * 1000) return this.cache.list
    const r = await fetch(DATABASE, { headers: { 'user-agent': 'ABS+ (Audiobookshelf add-on)' }, signal: AbortSignal.timeout(20000) })
    if (!r.ok) throw new Error(`FreeDict answered ${r.status}`)
    const j = await r.json()
    const list = (Array.isArray(j) ? j : j.dictionaries || [])
      .map((d) => {
        const rel = (d.releases || []).find((x) => x.platform === 'stardict')
        const [from, to] = String(d.name || '').split('-')
        if (!rel || !from || !to) return null
        return { name: d.name, from: ISO2[from] || from, to: ISO2[to] || to, fromName: NAMES[ISO2[from]] || from, toName: NAMES[ISO2[to]] || to, headwords: parseInt(d.headwords || '0', 10), size: parseInt(rel.size || '0', 10), version: rel.version || '', url: rel.URL }
      })
      .filter(Boolean)
    this.cache = { at: Date.now(), list }
    return list
  }

  folder(d) {
    if (d.name === 'wordnet') return path.join(config.dictionaryDir, 'en', 'wordnet')
    return path.join(config.dictionaryDir, d.from, `freedict-${d.name}`)
  }

  /** Languages of the books in the library, most books first */
  async libraryLanguages() {
    const count = {}
    try {
      for (const b of await this.library.allBooks()) {
        const l = langCode(b.media && b.media.metadata && b.media.metadata.language)
        if (l) count[l] = (count[l] || 0) + 1
      }
    } catch (e) {}
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .map(([code, books]) => ({ code, name: NAMES[code] || code, books }))
  }

  async overview() {
    let list = []
    let error = null
    try {
      list = await this.catalog()
    } catch (e) {
      error = `Couldn't get FreeDict's list: ${e.message}`
    }
    const langs = await this.libraryLanguages()
    const wanted = new Set(langs.map((l) => l.code))
    const dicts = [WORDNET]
      .concat(list.map((d) => ({ ...d, kind: 'translation' })))
      .filter((d) => d.to === 'en' || d.from === 'en') // explained in English, or English into another language
      .map((d) => ({ ...d, installed: fs.existsSync(this.folder(d)), recommended: d.name === 'wordnet' || (d.to === 'en' && d.from !== 'en' && wanted.has(d.from)) }))
      .sort((a, b) => (b.name === 'wordnet') - (a.name === 'wordnet') || b.recommended - a.recommended || a.fromName.localeCompare(b.fromName) || a.toName.localeCompare(b.toName))
    return { installed: this.dictionaries.list(), online: config.dictionaryOnline, libraryLanguages: langs, dicts, job: this.job, error }
  }

  /** Download and unpack one dictionary in the background */
  download(name) {
    if (this.job) throw Object.assign(new Error('A dictionary is already downloading'), { status: 409 })
    this.job = { name, step: 'Starting', done: 0, total: 0 }
    this.run(name)
      .then(() => log.info(`Dictionary ${name} installed`))
      .catch((e) => {
        log.warn(`Dictionary ${name}: ${e.message}`)
        this.lastError = { name, error: e.message, at: Date.now() }
      })
      .finally(() => (this.job = null))
    return this.job
  }

  async run(name) {
    const d = name === 'wordnet' ? WORDNET : (await this.catalog()).find((x) => x.name === name)
    if (!d) throw new Error('Unknown dictionary')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'absplus-dict-'))
    try {
      const file = path.join(tmp, d.url.endsWith('.gz') ? 'dict.tar.gz' : 'dict.tar.xz')
      this.job.step = 'Downloading'
      this.job.total = d.size
      const r = await fetch(d.url, { headers: { 'user-agent': 'ABS+ (Audiobookshelf add-on)' } })
      if (!r.ok) throw new Error(`${d.name === 'wordnet' ? 'Princeton' : 'FreeDict'} answered ${r.status}`)
      const counter = new (require('stream').Transform)({
        transform: (chunk, enc, cb) => {
          this.job.done += chunk.length
          cb(null, chunk)
        }
      })
      await pipeline(Readable.fromWeb(r.body), counter, fs.createWriteStream(file))
      this.job.step = 'Unpacking'
      const dest = this.folder(d)
      fs.rmSync(dest, { recursive: true, force: true })
      fs.mkdirSync(dest, { recursive: true })
      // Python's tarfile reads .tar.xz and its 'data' filter keeps every file inside the folder
      await new Promise((resolve, reject) => {
        const p = spawn('python3', ['-c', 'import sys, tarfile; tarfile.open(sys.argv[1]).extractall(sys.argv[2], filter="data")', file, dest], { stdio: ['ignore', 'ignore', 'pipe'] })
        let err = ''
        p.stderr.on('data', (x) => (err += x))
        p.on('error', reject)
        p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split('\n').pop() || `unpack failed (${code})`))))
      })
      this.dictionaries.scan(true)
      if (!this.dictionaries.scan().some((x) => x.ifoPath && x.ifoPath.startsWith(dest))) throw new Error('No dictionary files in the download')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  }

  remove(name) {
    const d = name === 'wordnet' ? WORDNET : (this.cache && this.cache.list.find((x) => x.name === name)) || null
    if (!d) throw Object.assign(new Error('Unknown dictionary'), { status: 400 })
    fs.rmSync(this.folder(d), { recursive: true, force: true })
    this.dictionaries.scan(true)
    return { ok: true }
  }
}

module.exports = { DictDownloads, langCode }

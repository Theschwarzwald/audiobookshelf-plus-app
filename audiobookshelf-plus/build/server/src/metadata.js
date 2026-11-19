'use strict'
/**
 * "ABS+ Metadata": a custom metadata provider for Audiobookshelf that asks many sources at once, in many
 * languages, merges what they say about the same book, and picks the biggest cover.
 *
 * Sources (no accounts needed): Audible (11 stores), Apple Books / iTunes (per country, covers up to
 * 3000 px), Storytel (Nordic and European audiobooks), Open Library, Google Books (GOOGLE_BOOKS_API_KEY
 * optional; without one Google's shared daily quota often runs out, which is why Audiobookshelf's own
 * Google matches can come back empty).
 *
 * Audiobookshelf calls  GET <url>/search?mediaType=book&query=<title>&author=<author>&isbn=<isbn>
 * with the Authorization header it was registered with, and expects { matches: [...] }.
 * <url> is /abs-plus/metadata (all languages, preferred first) or /abs-plus/metadata/<lang> (one language).
 *
 * Settings: <DATA_DIR>/metadata.json  { languages: ['en', 'de', ...], secret }
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')

const TIMEOUT = 6000
const UA = 'Mozilla/5.0 (ABS+ metadata; +https://www.audiobookshelf.org)'

/** Language -> where to look */
const LANGS = {
  en: { name: 'English', audible: ['com', 'co.uk', 'ca', 'com.au', 'in'], itunes: ['us', 'gb'], storytel: 'en', ol: 'eng' },
  de: { name: 'Deutsch', audible: ['de'], itunes: ['de', 'at'], storytel: 'de', ol: 'ger' },
  fr: { name: 'Français', audible: ['fr', 'ca'], itunes: ['fr', 'ca'], storytel: 'fr', ol: 'fre' },
  es: { name: 'Español', audible: ['es', 'com'], itunes: ['es', 'mx'], storytel: 'es', ol: 'spa' },
  it: { name: 'Italiano', audible: ['it'], itunes: ['it'], storytel: 'it', ol: 'ita' },
  pt: { name: 'Português', audible: ['com.br'], itunes: ['br', 'pt'], storytel: 'pt', ol: 'por' },
  nl: { name: 'Nederlands', audible: [], itunes: ['nl', 'be'], storytel: 'nl', ol: 'dut' },
  sv: { name: 'Svenska', audible: [], itunes: ['se'], storytel: 'sv', ol: 'swe' },
  da: { name: 'Dansk', audible: [], itunes: ['dk'], storytel: 'da', ol: 'dan' },
  no: { name: 'Norsk', audible: [], itunes: ['no'], storytel: 'nb', ol: 'nor' },
  fi: { name: 'Suomi', audible: [], itunes: ['fi'], storytel: 'fi', ol: 'fin' },
  pl: { name: 'Polski', audible: [], itunes: ['pl'], storytel: 'pl', ol: 'pol' },
  tr: { name: 'Türkçe', audible: [], itunes: ['tr'], storytel: 'tr', ol: 'tur' },
  ru: { name: 'Русский', audible: [], itunes: ['ru'], storytel: 'ru', ol: 'rus' },
  ja: { name: '日本語', audible: ['co.jp'], itunes: ['jp'], storytel: null, ol: 'jpn' },
  zh: { name: '中文', audible: [], itunes: ['tw', 'hk'], storytel: null, ol: 'chi' },
  ko: { name: '한국어', audible: [], itunes: ['kr'], storytel: null, ol: 'kor' },
  hi: { name: 'हिन्दी', audible: ['in'], itunes: ['in'], storytel: 'hi', ol: 'hin' },
  ar: { name: 'العربية', audible: [], itunes: ['ae', 'sa'], storytel: 'ar', ol: 'ara' },
  he: { name: 'עברית', audible: [], itunes: ['il'], storytel: null, ol: 'heb' },
  is: { name: 'Íslenska', audible: [], itunes: ['is'], storytel: 'is', ol: 'ice' },
  bg: { name: 'Български', audible: [], itunes: ['bg'], storytel: 'bg', ol: 'bul' },
  cs: { name: 'Čeština', audible: [], itunes: ['cz'], storytel: null, ol: 'cze' },
  hu: { name: 'Magyar', audible: [], itunes: ['hu'], storytel: null, ol: 'hun' },
  el: { name: 'Ελληνικά', audible: [], itunes: ['gr'], storytel: null, ol: 'gre' },
  uk: { name: 'Українська', audible: [], itunes: ['ua'], storytel: null, ol: 'ukr' }
}
const LANG_WORDS = { english: 'en', german: 'de', deutsch: 'de', french: 'fr', 'français': 'fr', spanish: 'es', 'español': 'es', italian: 'it', italiano: 'it', portuguese: 'pt', dutch: 'nl', swedish: 'sv', danish: 'da', norwegian: 'no', finnish: 'fi', polish: 'pl', turkish: 'tr', russian: 'ru', japanese: 'ja', chinese: 'zh', korean: 'ko', hindi: 'hi', arabic: 'ar', hebrew: 'he', icelandic: 'is', bulgarian: 'bg', czech: 'cs', hungarian: 'hu', greek: 'el', ukrainian: 'uk', eng: 'en', ger: 'de', deu: 'de', fre: 'fr', fra: 'fr', spa: 'es', ita: 'it', por: 'pt', dut: 'nl', swe: 'sv', dan: 'da', nor: 'no', fin: 'fi', pol: 'pl', tur: 'tr', rus: 'ru', jpn: 'ja' }
const langCode = (v) => {
  const s = String(v || '').toLowerCase().trim()
  if (!s) return null
  if (LANGS[s]) return s
  if (LANG_WORDS[s]) return LANG_WORDS[s]
  const two = s.slice(0, 2)
  return LANGS[two] ? two : null
}

/** Guess the language from the script of the query (CJK, Cyrillic, Arabic, Hebrew, Greek, Devanagari) */
function scriptLang(q) {
  if (/[぀-ヿ]/.test(q)) return 'ja'
  if (/[가-힯]/.test(q)) return 'ko'
  if (/[一-鿿]/.test(q)) return 'zh'
  if (/[Ѐ-ӿ]/.test(q)) return /[іїєґ]/i.test(q) ? 'uk' : 'ru'
  if (/[؀-ۿ]/.test(q)) return 'ar'
  if (/[֐-׿]/.test(q)) return 'he'
  if (/[Ͱ-Ͽ]/.test(q)) return 'el'
  if (/[ऀ-ॿ]/.test(q)) return 'hi'
  return null
}

async function getJson(url, headers) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...(headers || {}) }, signal: ctrl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

const stripHtml = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim()
const year = (d) => (String(d || '').match(/\d{4}/) || [])[0]

// ---------------------------------------------------------------- sources

async function audible(tld, { query, author }) {
  const q = new URLSearchParams({ num_results: '10', products_sort_by: 'Relevance', response_groups: 'contributors,media,product_attrs,product_desc,product_extended_attrs,series,category_ladders', image_sizes: '500,1024,2400' })
  if (query) q.set('title', query)
  if (author) q.set('author', author)
  const j = await getJson(`https://api.audible.${tld}/1.0/catalog/products?${q}`)
  return (j.products || []).map((p) => {
    const imgs = p.product_images || {}
    return {
      source: `Audible.${tld}`,
      title: p.title,
      subtitle: p.subtitle,
      author: (p.authors || []).map((a) => a.name).join(', '),
      narrator: (p.narrators || []).map((a) => a.name).join(', '),
      publisher: p.publisher_name,
      publishedYear: year(p.release_date || p.issue_date),
      description: stripHtml(p.publisher_summary || p.merchandising_summary),
      cover: imgs['2400'] || imgs['1024'] || imgs['500'],
      coverSize: imgs['2400'] ? 2400 : imgs['1024'] ? 1024 : 500,
      asin: p.asin,
      isbn: p.isbn,
      genres: [...new Set((p.category_ladders || []).flatMap((c) => (c.ladder || []).map((l) => l.name)))].slice(0, 6),
      series: (p.series || []).map((s) => ({ series: s.title, sequence: s.sequence })),
      language: langCode(p.language) || p.language,
      duration: p.runtime_length_min,
      adult: !!p.is_adult_product
    }
  })
}

async function itunes(country, { query, author }, media) {
  const term = [query, author].filter(Boolean).join(' ')
  const j = await getJson(`https://itunes.apple.com/search?${new URLSearchParams({ term, media, country, limit: '10' })}`)
  return (j.results || []).map((r) => ({
    source: `Apple Books (${country.toUpperCase()})`,
    title: r.collectionName || r.trackName,
    author: r.artistName,
    publishedYear: year(r.releaseDate),
    description: stripHtml(r.description),
    cover: r.artworkUrl100 ? r.artworkUrl100.replace(/\/\d+x\d+bb\./, '/3000x3000bb.') : null,
    coverSize: r.artworkUrl100 ? 3000 : 0,
    genres: [r.primaryGenreName, ...(r.genres || [])].filter((g) => g && g !== 'Books' && g !== 'Hörbücher' && g !== 'Audiobooks').slice(0, 4),
    language: null
  }))
}

async function storytel(locale, { query, author }) {
  const q = [query, author].filter(Boolean).join(' ')
  const j = await getJson(`https://www.storytel.com/api/search.action?${new URLSearchParams({ request_locale: locale, q })}`)
  return (j.books || [])
    .slice(0, 10)
    .map((x) => {
      const b = x.book || {}
      const a = x.abook || {}
      const cover = b.largeCover || b.cover
      return {
        source: 'Storytel',
        title: b.name,
        author: (b.authors || []).map((p) => p.name).join(', '),
        narrator: a.narratorAsString || (a.narrators || []).map((p) => p.name).join(', '),
        publisher: a.publisher && a.publisher.name,
        publishedYear: year(a.releaseDateFormat || a.releaseDate),
        description: stripHtml(a.description || (x.ebook && x.ebook.description)),
        cover: cover ? `https://www.storytel.com${cover.replace(/\/\d+x\d+\//, '/640x640/')}` : null,
        coverSize: cover ? 640 : 0,
        isbn: a.isbn,
        series: (b.series || []).filter((s) => s && s.name).map((s) => ({ series: s.name.trim(), sequence: b.seriesOrder || undefined })),
        language: b.language && b.language.isoValue,
        duration: a.length ? Math.round(a.length / 60000) : undefined
      }
    })
    .filter((m) => m.title)
}

async function openLibrary({ query, author, isbn }, ol) {
  const q = new URLSearchParams({ limit: '10', fields: 'key,title,subtitle,author_name,first_publish_year,publisher,isbn,cover_i,subject,language' })
  if (isbn) q.set('isbn', isbn)
  else {
    if (query) q.set('title', query)
    if (author) q.set('author', author)
  }
  if (ol) q.set('language', ol)
  const j = await getJson(`https://openlibrary.org/search.json?${q}`)
  return (j.docs || []).map((d) => ({
    source: 'Open Library',
    title: d.title,
    subtitle: d.subtitle,
    author: (d.author_name || []).slice(0, 3).join(', '),
    publisher: (d.publisher || [])[0],
    publishedYear: d.first_publish_year ? String(d.first_publish_year) : undefined,
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    coverSize: d.cover_i ? 500 : 0,
    isbn: (d.isbn || []).find((i) => i.length === 13) || (d.isbn || [])[0],
    genres: (d.subject || []).slice(0, 5),
    language: langCode((d.language || [])[0])
  }))
}

async function googleBooks({ query, author, isbn }, lang) {
  const parts = isbn ? [`isbn:${isbn}`] : [query && `intitle:${query}`, author && `inauthor:${author}`].filter(Boolean)
  const q = new URLSearchParams({ q: parts.join(' '), maxResults: '10', printType: 'books' })
  if (lang) q.set('langRestrict', lang)
  if (process.env.GOOGLE_BOOKS_API_KEY) q.set('key', process.env.GOOGLE_BOOKS_API_KEY)
  const j = await getJson(`https://www.googleapis.com/books/v1/volumes?${q}`)
  return (j.items || []).map((it) => {
    const v = it.volumeInfo || {}
    const ids = v.industryIdentifiers || []
    return {
      source: 'Google Books',
      title: v.title,
      subtitle: v.subtitle,
      author: (v.authors || []).join(', '),
      publisher: v.publisher,
      publishedYear: year(v.publishedDate),
      description: stripHtml(v.description),
      cover: v.imageLinks ? `https://books.google.com/books/content?id=${it.id}&printsec=frontcover&img=1&zoom=3` : null,
      coverSize: v.imageLinks ? 800 : 0,
      isbn: (ids.find((i) => i.type === 'ISBN_13') || ids.find((i) => i.type === 'ISBN_10') || {}).identifier,
      genres: v.categories || [],
      language: langCode(v.language),
      adult: v.maturityRating === 'MATURE'
    }
  })
}

// ---------------------------------------------------------------- merging

const norm = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 1))
function overlap(a, b) {
  const A = words(a)
  const B = words(b)
  if (!A.size || !B.size) return 0
  let n = 0
  A.forEach((w) => B.has(w) && n++)
  return n / Math.max(A.size, B.size)
}

/** How well a result fits the request (0..1), plus a little for the wanted language */
function score(m, req, wantLang) {
  let s = req.query ? overlap(m.title, req.query) * 0.65 : 0.4
  if (req.author) s += overlap(m.author, req.author) * 0.3
  if (req.isbn && m.isbn && m.isbn.replace(/-/g, '') === req.isbn.replace(/-/g, '')) s += 0.5
  if (wantLang && m.language === wantLang) s += 0.08
  if (m.cover) s += 0.02
  return s
}

/** Same book from several sources: keep one entry, fill in gaps, best cover wins */
function merge(list) {
  const groups = []
  for (const m of list) {
    const key = norm(m.title).replace(/\s+/g, '')
    const g = groups.find((x) => (m.asin && x.asin === m.asin) || (m.isbn && x.isbn === m.isbn) || (x.key === key && overlap(x.author, m.author) >= 0.5))
    if (!g) {
      groups.push({ ...m, key, sources: [m.source], covers: m.cover ? [{ url: m.cover, size: m.coverSize || 0, source: m.source }] : [] })
      continue
    }
    g.sources.push(m.source)
    if (m.cover) g.covers.push({ url: m.cover, size: m.coverSize || 0, source: m.source })
    for (const f of ['subtitle', 'narrator', 'publisher', 'publishedYear', 'asin', 'isbn', 'language', 'duration']) if (!g[f] && m[f]) g[f] = m[f]
    if ((m.description || '').length > (g.description || '').length) g.description = m.description
    if ((!g.series || !g.series.length) && m.series && m.series.length) g.series = m.series
    if ((m.genres || []).length > (g.genres || []).length) g.genres = m.genres
    g.adult = g.adult || m.adult
    g.score = Math.max(g.score, m.score)
  }
  return groups.map((g) => {
    g.covers.sort((a, b) => b.size - a.size)
    g.score += Math.min(0.1, (g.sources.length - 1) * 0.04) // several sources agree
    return g
  })
}

class Metadata {
  constructor() {
    this.file = path.join(config.dataDir, 'metadata.json')
    this.settings = { languages: (process.env.METADATA_LANGUAGES || 'en').split(',').map((s) => s.trim()).filter((l) => LANGS[l]), secret: null }
    try {
      Object.assign(this.settings, JSON.parse(fs.readFileSync(this.file, 'utf8')))
    } catch (e) {}
    if (!this.settings.secret) {
      this.settings.secret = crypto.randomBytes(24).toString('hex')
      this.save()
    }
    this.cache = new Map()
    this.stats = {}
  }

  save() {
    try {
      fs.mkdirSync(config.dataDir, { recursive: true })
      fs.writeFileSync(this.file, JSON.stringify(this.settings, null, 2), { mode: 0o600 })
    } catch (e) {
      log.warn(`Couldn't save metadata settings: ${e.message}`)
    }
  }

  authorized(req) {
    const h = req.headers.authorization || ''
    return h === this.settings.secret || h === `Bearer ${this.settings.secret}`
  }

  /** Searches every source for the languages wanted; returns merged matches, best first */
  async search(req, lang) {
    const query = String(req.query || '').trim()
    const author = String(req.author || '').trim()
    const isbn = String(req.isbn || '').replace(/[^0-9xX]/g, '')
    if (!query && !isbn) return []
    const key = JSON.stringify([query, author, isbn, lang || this.settings.languages])
    const hit = this.cache.get(key)
    if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.matches

    const guess = scriptLang(query + ' ' + author)
    const langs = lang ? [lang] : [...new Set([guess, ...this.settings.languages].filter(Boolean))]
    const r = { query, author, isbn }
    const jobs = []
    const add = (name, p) => jobs.push(p.then((list) => list.map((m) => ({ ...m, source: m.source || name }))).catch((e) => ((this.stats[name] = { at: Date.now(), error: e.message }), [])))
    const tlds = new Set()
    const countries = new Map() // country -> language
    const storytelLocales = new Set()
    for (const l of langs) {
      const L = LANGS[l]
      if (!L) continue
      L.audible.forEach((t) => tlds.add(t))
      L.itunes.slice(0, 2).forEach((c) => !countries.has(c) && countries.set(c, l))
      if (L.storytel) storytelLocales.add(L.storytel)
    }
    if (!lang && !tlds.size) tlds.add('com')
    tlds.forEach((t) => add(`Audible.${t}`, audible(t, r)))
    countries.forEach((l, c) => {
      const withLang = (p) => p.then((list) => list.map((m) => ({ ...m, language: m.language || l })))
      add(`Apple Books ${c}`, withLang(itunes(c, r, 'audiobook')))
      add(`Apple Books ${c} (ebooks)`, withLang(itunes(c, r, 'ebook')))
    })
    storytelLocales.forEach((loc) => add(`Storytel ${loc}`, storytel(loc, r)))
    add('Open Library', openLibrary(r, lang ? LANGS[lang].ol : null))
    if (this.catalog && this.catalog.ready() && !this.catalog.builder) {
      const local = isbn ? this.catalog.byIsbn(isbn) : this.catalog.search(query, author, 8)
      add(
        'Open Library (local copy)',
        local.then((rows) =>
          rows.map((x) => ({
            source: 'Open Library (local copy)',
            title: x.title,
            subtitle: x.subtitle || undefined,
            author: x.author || undefined,
            publisher: x.publisher || undefined,
            publishedYear: x.year || undefined,
            isbn: x.isbn13 || undefined,
            cover: x.cover ? `https://covers.openlibrary.org/b/id/${x.cover}-L.jpg` : null,
            coverSize: x.cover ? 500 : 0,
            language: langCode(x.lang),
            genres: []
          }))
        )
      )
    }
    add('Google Books', googleBooks(r, lang))

    const all = (await Promise.all(jobs)).flat().filter((m) => m && m.title)
    const want = lang || guess || this.settings.languages[0]
    all.forEach((m) => (m.score = score(m, r, want)))
    const merged = merge(all)
      .filter((m) => m.score >= (isbn ? 0.3 : 0.25))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
    this.cache.set(key, { at: Date.now(), matches: merged })
    if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value)
    return merged
  }

  /** In Audiobookshelf's custom-provider format */
  toAbs(m) {
    const out = {
      title: m.title,
      subtitle: m.subtitle,
      author: m.author,
      narrator: m.narrator,
      publisher: m.publisher,
      publishedYear: m.publishedYear,
      description: m.description,
      cover: m.covers && m.covers[0] ? m.covers[0].url : undefined,
      isbn: m.isbn,
      asin: m.asin,
      genres: m.genres && m.genres.length ? m.genres : undefined,
      series: m.series && m.series.length ? m.series.map((s) => ({ series: s.series, sequence: s.sequence !== undefined && s.sequence !== null ? String(s.sequence) : undefined })) : undefined,
      language: m.language ? (LANGS[m.language] ? LANGS[m.language].name : m.language) : undefined,
      duration: m.duration
    }
    Object.keys(out).forEach((k) => out[k] === undefined && delete out[k])
    return out
  }

  // ---------------------------------------------------------------- registration in Audiobookshelf

  /** The URL Audiobookshelf uses to reach this container (same Docker network) */
  selfUrl() {
    return (process.env.ABS_PLUS_URL || `http://${process.env.ABS_PLUS_HOST || 'transcription'}:${config.port}`).replace(/\/+$/, '')
  }

  async registered() {
    const j = await absApi.serviceJson('/api/custom-metadata-providers')
    return ((j && j.providers) || []).filter((p) => /\/abs-plus\/metadata/.test(p.url || ''))
  }

  /** One provider for all your languages, plus one per language. Replaces earlier ABS+ entries. */
  async register() {
    const existing = await this.registered()
    const want = [{ name: 'ABS+ (all sources)', url: `${this.selfUrl()}/abs-plus/metadata` }, ...this.settings.languages.map((l) => ({ name: `ABS+ ${LANGS[l].name}`, url: `${this.selfUrl()}/abs-plus/metadata/${l}` }))]
    for (const p of existing) {
      if (!want.some((w) => w.url === p.url && w.name === p.name)) await absApi.serviceRequest('DELETE', `/api/custom-metadata-providers/${encodeURIComponent(p.id)}`).catch(() => {})
    }
    for (const w of want) {
      if (existing.some((p) => p.url === w.url && p.name === w.name)) continue
      await absApi.serviceRequest('POST', '/api/custom-metadata-providers', { name: w.name, url: w.url, mediaType: 'book', authHeaderValue: this.settings.secret })
    }
    return this.registered()
  }

  /** Checks Audiobookshelf can actually reach the provider (asks ABS to search through it) */
  async verify(providerId, title) {
    const j = await absApi.serviceJson(`/api/search/books?${new URLSearchParams({ title: title || 'The Hobbit', provider: `custom-${providerId}` })}`)
    return Array.isArray(j) ? j.length : j && Array.isArray(j.results) ? j.results.length : 0
  }

  setLanguages(list) {
    this.settings.languages = (list || []).filter((l) => LANGS[l]).slice(0, 12)
    if (!this.settings.languages.length) this.settings.languages = ['en']
    this.save()
    this.cache.clear()
  }

  info() {
    return {
      languages: this.settings.languages,
      available: Object.entries(LANGS).map(([id, l]) => ({ id, name: l.name })),
      googleKey: !!process.env.GOOGLE_BOOKS_API_KEY,
      selfUrl: this.selfUrl(),
      sourceErrors: this.stats
    }
  }
}

module.exports = { Metadata, merge, score, scriptLang, langCode, LANGS, sources: { audible, itunes, storytel, openLibrary, googleBooks } }

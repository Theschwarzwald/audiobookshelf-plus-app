'use strict'
/**
 * Author photos and bios from more places than Audiobookshelf's own match (Audible only):
 *
 *   Wikipedia / Wikidata  photo from Wikimedia Commons (Wikidata P18), bio from the Wikipedia summary in the
 *                         preferred language (falls back to English); only people Wikidata lists as writers
 *                         (author, novelist, poet, journalist, historian, screenwriter…) are accepted
 *   Open Library          author photo and bio
 *   Audnexus              Audible's author pages (what Audiobookshelf's Match uses)
 *
 * Results go into Audiobookshelf with its own API (bio: PATCH /api/authors/:id, photo: POST /api/authors/:id/image).
 * Bios from Wikipedia are CC BY-SA: a "From Wikipedia" line with the link is added.
 */
const log = require('./log')
const absApi = require('./absApi')

const UA = 'ABS+ (Audiobookshelf add-on; author photos and bios)'
// "author" / "writer" in a few languages, for people Wikidata files under another occupation
const WRITES_RE = /(author|writer|novelist|poet|journalist|essayist|memoirist|biographer|schriftsteller|autor|auteur|autrice|écrivain|escritor|scrittore|scrittrice|författare|forfatter|kirjailija|pisarz|schrijver|писатель|作家)/i
const TIMEOUT = 8000
const WRITER = new Set(['Q36180', 'Q482980', 'Q6625963', 'Q49757', 'Q1930187', 'Q201788', 'Q28389', 'Q4853732', 'Q214917', 'Q18844224', 'Q11774202', 'Q333634', 'Q1607826', 'Q4964182', 'Q1622272', 'Q81096', 'Q3606216', 'Q11499147', 'Q15949613', 'Q12144794', 'Q1281618', 'Q17167049', 'Q15980158', 'Q16533', 'Q42973'])
// writer, author, novelist, poet, journalist, historian, screenwriter, children's writer, playwright, science fiction writer,
// essayist, translator, editor, philosopher, university teacher, economist, comics artist, non-fiction writer, …

// Wikimedia throttles bursts (HTTP 429): its requests go one at a time, spaced out, and a 429 waits and retries
let wikiChain = Promise.resolve()
const WIKI_GAP = 350
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT)
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'api-user-agent': UA, accept: 'application/json' }, signal: ctrl.signal })
      if ((r.status === 429 || r.status === 503) && attempt < 3) {
        const after = Number(r.headers.get('retry-after'))
        await sleep(Math.min(30000, (after > 0 ? after * 1000 : 2000 * 2 ** attempt)))
        continue
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } finally {
      clearTimeout(t)
    }
  }
}

function getJson(url) {
  if (!/(wikidata|wikipedia|wikimedia)\.org/.test(url)) return fetchJson(url)
  const run = wikiChain.then(() => fetchJson(url))
  wikiChain = run.catch(() => {}).then(() => sleep(WIKI_GAP))
  return run
}

const norm = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const sameName = (a, b) => {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return false
  if (x === y) return true
  // "J. R. R. Tolkien" vs "J.R.R. Tolkien", "Tolkien, J. R. R."
  const sx = x.split(' ').sort().join(' ')
  const sy = y.split(' ').sort().join(' ')
  return sx === sy || x.replace(/ /g, '') === y.replace(/ /g, '')
}

// ---------------------------------------------------------------- sources

async function wikipedia(name, lang) {
  const s = await getJson(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbsearchentities', search: name, language: lang || 'en', uselang: lang || 'en', type: 'item', limit: '7', format: 'json' })}`)
  const ids = (s.search || []).map((x) => x.id)
  if (!ids.length) return null
  const e = await getJson(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|sitelinks|labels|aliases', languages: `${lang || 'en'}|en`, format: 'json' })}`)
  for (const id of ids) {
    const ent = e.entities && e.entities[id]
    if (!ent || !ent.claims) continue
    const isHuman = (ent.claims.P31 || []).some((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value.id === 'Q5')
    const writes = (ent.claims.P106 || []).some((c) => c.mainsnak && c.mainsnak.datavalue && WRITER.has(c.mainsnak.datavalue.value.id))
    const names = [...Object.values(ent.labels || {}).map((l) => l.value), ...Object.values(ent.aliases || {}).flat().map((a) => a.value)]
    if (!isHuman || !names.some((n) => sameName(n, name))) continue
    // Not filed as a writer (a politician who writes): accept only if their article calls them one
    const needsCheck = !writes
    const file = ent.claims.P18 && ent.claims.P18[0].mainsnak.datavalue && ent.claims.P18[0].mainsnak.datavalue.value
    const image = file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800` : null
    let bio = null
    let url = null
    for (const l of [lang, 'en'].filter(Boolean)) {
      const link = ent.sitelinks && ent.sitelinks[`${l}wiki`]
      if (!link) continue
      try {
        const sum = await getJson(`https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(link.title.replace(/ /g, '_'))}`)
        if (sum && sum.extract && sum.type !== 'disambiguation' && (!needsCheck || WRITES_RE.test(`${sum.description || ''} ${sum.extract}`))) {
          bio = sum.extract
          url = (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || `https://${l}.wikipedia.org/wiki/${encodeURIComponent(link.title)}`
          break
        }
      } catch (err) {}
    }
    if (needsCheck && !bio) continue // couldn't confirm it's the writer
    return { source: 'Wikipedia', id, image, bio: bio ? `${bio}\n\nFrom Wikipedia (CC BY-SA): ${url}` : null, url }
  }
  return null
}

async function openLibrary(name) {
  const s = await getJson(`https://openlibrary.org/search/authors.json?${new URLSearchParams({ q: name, limit: '5' })}`)
  const doc = (s.docs || []).filter((d) => sameName(d.name, name) || (d.alternate_names || []).some((a) => sameName(a, name))).sort((a, b) => (b.work_count || 0) - (a.work_count || 0))[0]
  if (!doc) return null
  const a = await getJson(`https://openlibrary.org/authors/${doc.key}.json`)
  const bio = typeof a.bio === 'string' ? a.bio : a.bio && a.bio.value
  const photo = (a.photos || []).find((p) => p > 0)
  return { source: 'Open Library', id: doc.key, image: photo ? `https://covers.openlibrary.org/a/id/${photo}-L.jpg` : null, bio: bio ? bio.replace(/\r\n/g, '\n').trim() : null, url: `https://openlibrary.org/authors/${doc.key}` }
}

async function audnexus(name, region) {
  const list = await getJson(`https://api.audnex.us/authors?${new URLSearchParams({ name, region: region || 'us' })}`)
  const hit = (Array.isArray(list) ? list : []).find((x) => sameName(x.name, name))
  if (!hit || !hit.asin) return null
  const a = await getJson(`https://api.audnex.us/authors/${hit.asin}?${new URLSearchParams({ region: region || 'us' })}`)
  return { source: 'Audible', id: hit.asin, image: a.image || null, bio: a.description || null, url: `https://www.audible.com/author/${hit.asin}` }
}

/** "A/B", "X - translator", "Plato (Eds. …" → the first real name (library metadata is often messy) */
function cleanName(name) {
  let n = String(name || '').split(/\s*[/;&]\s*|\s+and\s+/)[0]
  n = n.replace(/\s+[-–—]\s+.*$/, '').replace(/\s*[([].*$/, '').replace(/[)\]]/g, '').trim()
  return n.length > 2 ? n : String(name || '').trim()
}

/** All sources at once; the first with a photo and the first with a bio, in order of preference */
async function lookup(rawName, lang) {
  const name = cleanName(rawName)
  const results = await Promise.all([wikipedia(name, lang).catch(() => null), audnexus(name).catch(() => null), openLibrary(name).catch(() => null)])
  const found = results.filter(Boolean)
  const image = found.find((r) => r.image)
  const bio = found.find((r) => r.bio && r.bio.length > 40)
  return {
    image: image ? { url: image.image, source: image.source } : null,
    bio: bio ? { text: bio.bio, source: bio.source } : null,
    sources: found.map((r) => ({ source: r.source, url: r.url, hasImage: !!r.image, hasBio: !!r.bio }))
  }
}

class Authors {
  constructor(library) {
    this.library = library
    this.job = null
    this.lang = (process.env.AUTHOR_BIO_LANGUAGE || 'en').slice(0, 2)
  }

  async all() {
    const out = []
    for (const lib of await this.library.libraries()) {
      const j = await absApi.serviceJson(`/api/libraries/${encodeURIComponent(lib.id)}/authors`)
      for (const a of (j && j.authors) || []) out.push({ id: a.id, name: a.name, hasImage: !!a.imagePath, hasBio: !!(a.description && a.description.trim()), numBooks: a.numBooks || 0, library: lib.name })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }

  async overview() {
    const authors = await this.all()
    return { lang: this.lang, total: authors.length, missingImage: authors.filter((a) => !a.hasImage).length, missingBio: authors.filter((a) => !a.hasBio).length, job: this.job, authors }
  }

  preview(name) {
    return lookup(name, this.lang)
  }

  /** Fill in one author: what's missing (or replace both when replace = true) */
  async fill(author, replace) {
    const found = await lookup(author.name, this.lang)
    const done = { image: false, bio: false }
    if (found.bio && (replace || !author.hasBio)) {
      await absApi.serviceRequest('PATCH', `/api/authors/${encodeURIComponent(author.id)}`, { description: found.bio.text })
      done.bio = found.bio.source
    }
    if (found.image && (replace || !author.hasImage)) {
      try {
        await absApi.serviceRequest('POST', `/api/authors/${encodeURIComponent(author.id)}/image`, { url: found.image.url })
        done.image = found.image.source
      } catch (e) {
        log.warn(`Author photo for ${author.name}: ${e.message}`)
      }
    }
    return done
  }

  /** Background: every author missing a photo or bio (or all, replacing) */
  fillAll({ replace, ids } = {}) {
    if (this.job) return this.job
    this.job = { total: 0, done: 0, images: 0, bios: 0 }
    const run = async () => {
      const authors = (await this.all()).filter((a) => (ids ? ids.includes(a.id) : replace || !a.hasImage || !a.hasBio))
      this.job.total = authors.length
      for (const a of authors) {
        try {
          const r = await this.fill(a, replace)
          if (r.image) this.job.images++
          if (r.bio) this.job.bios++
        } catch (e) {
          log.debug(`Author ${a.name}: ${e.message}`)
        }
        this.job.done++
        await new Promise((r) => setTimeout(r, 600)) // be polite to Wikipedia and Open Library
      }
      log.info(`Authors: added ${this.job.images} photos and ${this.job.bios} bios for ${this.job.total} authors`)
    }
    run()
      .catch((e) => log.warn(`Author photos and bios: ${e.message}`))
      .finally(() => (this.job = null))
    return this.job
  }
}

module.exports = { Authors, lookup, sameName, cleanName }

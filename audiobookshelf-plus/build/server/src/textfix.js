'use strict'
/**
 * Repairs book details that lost their accented / non-English letters.
 *
 * Audiobookshelf reads .nfo / .opf / text files as UTF-8; a file saved in an older encoding (Windows-1252,
 * Latin-1…) turns "Niccolò" into "Niccol�" (U+FFFD, the replacement character) and the real letter is gone.
 * The same name is usually still intact somewhere else: the audio file's tags, the folder or the file names.
 * This finds those books in the background and writes the repaired text back through Audiobookshelf's API
 * (titles, subtitle, narrators, series, publisher, description, and author names).
 */
const absApi = require('./absApi')
const log = require('./log')

const BAD = '�'
const EVERY_MS = 60 * 60 * 1000

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A pattern for the damaged text: every lost letter (one or two replacement characters) is any non-ASCII letter */
function patternFor(broken) {
  const parts = broken.split(/�+/)
  const body = parts.map(esc).join('[^\\x00-\\x7F]{1,2}')
  return new RegExp(body, 'iu')
}

/** The intact spelling of a damaged string, looked up in the other texts we have; null when nowhere */
function repair(broken, sources) {
  if (!broken || !broken.includes(BAD)) return null
  const re = patternFor(broken)
  for (const s of sources) {
    if (!s || s.includes(BAD)) continue
    const m = s.normalize('NFC').match(re)
    if (m) {
      // keep the damaged string's own capitalisation where the letters are plain ASCII
      const found = m[0]
      return found.length ? found : null
    }
  }
  return null
}

/** Every intact text the item carries: tags of each audio file, folder and file names, the other fields */
function sourcesOf(item) {
  const out = []
  const media = item.media || {}
  for (const af of media.audioFiles || []) {
    for (const v of Object.values(af.metaTags || {})) if (typeof v === 'string') out.push(v)
    if (af.metadata) out.push(af.metadata.filename || '', af.metadata.path || '')
  }
  for (const f of item.libraryFiles || []) if (f.metadata) out.push(f.metadata.filename || '', f.metadata.path || '')
  if (item.path) out.push(item.path, ...item.path.split(/[\\/]/))
  if (media.ebookFile && media.ebookFile.metadata) out.push(media.ebookFile.metadata.filename || '')
  for (const ch of media.chapters || []) out.push(ch.title || '')
  const m = media.metadata || {}
  for (const k of ['title', 'subtitle', 'publisher', 'description', 'authorName', 'narratorName']) if (typeof m[k] === 'string') out.push(m[k])
  return out.filter(Boolean)
}

class TextFix {
  constructor() {
    this.job = null
    this.fixedAuthors = new Set()
    this.last = null
  }

  /** Repairs one item (full JSON from /api/items/:id?expanded=1); returns what changed */
  async fixItem(item) {
    const m = (item.media && item.media.metadata) || {}
    const src = sourcesOf(item)
    const changes = {}
    const done = []
    for (const k of ['title', 'subtitle', 'publisher', 'description']) {
      const v = m[k]
      if (typeof v !== 'string' || !v.includes(BAD)) continue
      // a long description: repair word by word
      const fixed = v.replace(/[^\s]*�[^\s]*/g, (w) => repair(w, src) || w)
      if (fixed !== v) {
        changes[k] = fixed
        done.push(k)
      }
    }
    if (Array.isArray(m.narrators) && m.narrators.some((n) => n.includes(BAD))) {
      const list = m.narrators.map((n) => repair(n, src) || n)
      if (list.join('|') !== m.narrators.join('|')) {
        changes.narrators = list
        done.push('narrators')
      }
    }
    if (Array.isArray(m.series) && m.series.some((s) => s.name && s.name.includes(BAD))) {
      const list = m.series.map((s) => ({ id: s.id, name: repair(s.name, src) || s.name, sequence: s.sequence }))
      if (list.some((s, i) => s.name !== m.series[i].name)) {
        changes.series = list
        done.push('series')
      }
    }
    if (Object.keys(changes).length) {
      await absApi.serviceRequest('PATCH', `/api/items/${encodeURIComponent(item.id)}/media`, { metadata: changes })
    }
    // Authors are shared records: rename the author itself (all their books follow)
    for (const a of m.authors || []) {
      if (!a.name || !a.name.includes(BAD) || this.fixedAuthors.has(a.id)) continue
      const name = repair(a.name, src)
      if (!name) continue
      try {
        await absApi.serviceRequest('PATCH', `/api/authors/${encodeURIComponent(a.id)}`, { name })
        this.fixedAuthors.add(a.id)
        done.push(`author ${name}`)
      } catch (e) {
        log.debug(`Text repair: author ${a.id}: ${e.message}`)
      }
    }
    return done
  }

  /** One pass over the library: only books whose details contain the replacement character */
  run(library) {
    if (this.job) return this.job
    this.job = { total: 0, done: 0, fixed: 0, unfixable: 0, startedAt: Date.now() }
    const go = async () => {
      const books = await library.allBooks()
      const todo = books.filter((b) => JSON.stringify(b.media || {}).includes(BAD))
      this.job.total = todo.length
      for (const b of todo) {
        try {
          const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(b.id)}?expanded=1`)
          if (item) {
            const done = await this.fixItem(item)
            if (done.length) {
              this.job.fixed++
              log.info(`Text repair: ${(item.media.metadata || {}).title || b.id}: fixed ${done.join(', ')}`)
            } else this.job.unfixable++
          }
        } catch (e) {
          log.debug(`Text repair ${b.id}: ${e.message}`)
        }
        this.job.done++
      }
      if (todo.length) log.info(`Text repair: ${this.job.fixed} of ${todo.length} books with damaged letters repaired`)
    }
    go()
      .catch((e) => log.warn(`Text repair: ${e.message}`))
      .finally(() => {
        this.last = this.job
        this.job = null
      })
    return this.job
  }

  startBackground(library) {
    if (this.timer) return
    const pass = () => absApi.hasServiceKey() && this.run(library)
    setTimeout(pass, 90 * 1000).unref()
    this.timer = setInterval(pass, EVERY_MS)
    this.timer.unref()
  }
}

module.exports = { TextFix, repair, patternFor }

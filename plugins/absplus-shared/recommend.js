/**
 * "Based on your recent readings": books in your library you haven't started, like the ones you've been
 * listening to lately. Shared by the app's home page and the web player's home page.
 *
 * Recent books: the last 60 days of listening sessions (more listening and more recent count for more).
 * A candidate scores for what it shares with each recent book:
 *   next in the same series ............ 12   same series ................ 6
 *   same author ........................ 5    same narrator .............. 1.5
 *   same Dewey section / division / class (ABS+ servers) ... 4 / 2.5 / 1
 *   each shared genre or tag (not "Audiobook" and the like) ... 1.5
 *   same language ...................... 0.5
 * Books you've started, finished or hidden are left out. Each pick says why ("Next in …", "More from …").
 */

const DAY = 86400000
const GENERIC = /^(audio ?books?|unabridged|abridged|books?|general|ebooks?|fiction|non-?fiction|literature|age: .*|abs\+hide:.*)$/i

/** "The Audacity of Hope: Thoughts on …" → "The Audacity of Hope" */
const shortTitle = (t) => String(t || '').split(/:\s| - | \(/)[0].trim()
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const people = (s) =>
  String(s || '')
    .split(/,|&| and /)
    .map((x) => norm(x.replace(/\s+-\s+.*$/, '')))
    .filter((x) => x && x.split(' ').length <= 5)
/** "Galaxy #2" → { name: 'galaxy', seq: 2 } */
function series(s) {
  const m = String(s || '').match(/^(.*?)\s*#\s*([\d.]+)\s*$/)
  if (!m && !s) return null
  return { name: norm(m ? m[1] : s), seq: m ? Number(m[2]) : null }
}
function topics(md, tags) {
  const out = new Set()
  for (const g of [].concat((md && md.genres) || [], tags || [])) {
    for (const part of String(g).split(/[:/]|&/)) {
      const t = part.trim()
      if (t && !GENERIC.test(t)) out.add(norm(t))
    }
  }
  return out
}

/**
 * get(path) → parsed JSON from the Audiobookshelf API (the app's nativeHttp or the web app's axios).
 * Returns [{ item (the library item, as the shelves use), reason }], best first.
 */
export async function recommend(get, libraryId, opts = {}) {
  const limit = opts.limit || 15
  const [sess, me, lib, dewey] = await Promise.all([
    get('/api/me/listening-sessions?itemsPerPage=200&page=0').catch(() => null),
    get('/api/me').catch(() => null),
    get(`/api/libraries/${encodeURIComponent(libraryId)}/items?minified=1&limit=0`).catch(() => null),
    opts.dewey === false ? null : get('/api/transcription/dewey').catch(() => null)
  ])
  const items = (lib && lib.results) || []
  if (!items.length) return []
  const byId = new Map(items.map((i) => [i.id, i]))

  // the recent books, weighted by how much and how lately they were listened to
  const cutoff = Date.now() - 60 * DAY
  const weight = new Map()
  for (const s of (sess && sess.sessions) || []) {
    const t = Number(s.startedAt) || 0
    if (t < cutoff || !byId.has(s.libraryItemId)) continue
    const recency = 1 - (Date.now() - t) / (60 * DAY) // 1 today … 0 two months ago
    weight.set(s.libraryItemId, (weight.get(s.libraryItemId) || 0) + (0.5 + recency) * Math.min(1, (Number(s.timeListening) || 0) / 1800 + 0.2))
  }
  const recent = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (!recent.length) return []

  // left out: anything started, finished or hidden from Continue Listening
  const touched = new Set()
  for (const p of (me && me.mediaProgress) || []) {
    if (p.episodeId) continue
    if (p.isFinished || p.hideFromContinueListening || Number(p.progress) > 0 || Number(p.currentTime) > 0) touched.add(p.libraryItemId)
  }

  const ddc = new Map(((dewey && dewey.books) || []).map((b) => [b.id, b]))
  const facts = (it) => {
    const md = (it.media && it.media.metadata) || {}
    return { md, authors: people(md.authorName), narrators: people(md.narratorName), series: series(md.seriesName), topics: topics(md, it.media && it.media.tags), d: ddc.get(it.id) || null, lang: norm(md.language) }
  }
  const recentFacts = recent.map(([id, w]) => ({ id, w, f: facts(byId.get(id)) }))
  const maxW = recentFacts[0].w || 1

  const picks = []
  for (const it of items) {
    if (touched.has(it.id) || weight.has(it.id) || it.isMissing || it.isInvalid) continue
    const f = facts(it)
    let score = 0
    let best = null // the strongest single reason
    const why = (pts, text) => {
      if (!best || pts > best.pts) best = { pts, text }
    }
    for (const r of recentFacts) {
      const k = 0.4 + 0.6 * (r.w / maxW) // the books you've listened to most count most
      let s = 0
      if (f.series && r.f.series && f.series.name && f.series.name === r.f.series.name) {
        const next = f.series.seq != null && r.f.series.seq != null && f.series.seq > r.f.series.seq && f.series.seq - r.f.series.seq <= 1.01
        s += next ? 12 : 6
        why((next ? 12 : 6) * k, next ? `Next in ${r.f.md.seriesName.replace(/\s*#.*$/, '')}` : `More in the ${r.f.md.seriesName.replace(/\s*#.*$/, '')} series`)
      }
      const sharedAuthor = f.authors.find((a) => r.f.authors.includes(a))
      if (sharedAuthor) {
        s += 5
        why(5 * k, `More from ${(it.media.metadata.authorName || '').split(',')[0]}`)
      }
      if (f.d && r.f.d) {
        const pts = f.d.section === r.f.d.section ? 4 : f.d.division === r.f.d.division ? 2.5 : f.d.class === r.f.d.class ? 1 : 0
        if (pts) {
          s += pts
          why(pts * k * 0.9, `Like ${shortTitle(r.f.md.title)}`)
        }
      }
      if (f.narrators.some((n) => r.f.narrators.includes(n))) {
        s += 1.5
        why(1.5 * k * 0.6, `Narrated by ${(it.media.metadata.narratorName || '').split(',')[0]}`)
      }
      let shared = 0
      for (const t of f.topics) if (r.f.topics.has(t)) shared++
      if (shared) {
        s += 1.5 * shared
        why(1.5 * shared * k * 0.8, `Like ${shortTitle(r.f.md.title)}`)
      }
      if (f.lang && f.lang === r.f.lang) s += 0.5
      score += s * k
    }
    if (score >= 2 && best) picks.push({ item: it, score, reason: best.text })
  }
  picks.sort((a, b) => b.score - a.score)
  // don't fill the shelf with one series or author: at most 3 of the same reason
  const per = new Map()
  const out = []
  for (const p of picks) {
    const n = per.get(p.reason) || 0
    if (n >= 3) continue
    per.set(p.reason, n + 1)
    out.push({ item: p.item, reason: p.reason })
    if (out.length >= limit) break
  }
  return out
}

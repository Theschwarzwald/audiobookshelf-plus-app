'use strict'
/**
 * Parental controls: age ratings per book, an age limit per user, and books blocked for one person.
 *
 * Enforced by Audiobookshelf itself, so it holds everywhere (web, apps, search, series, collections,
 * downloads, direct file links), not just in this add-on:
 *  - every book carries one age tag:  "Age: All ages" · "Age: 7+" · "Age: 13+" · "Age: 16+" · "Age: 18+" · "Age: Unrated"
 *  - a book blocked for one person also carries a private tag "abs+hide:<8 characters of their user id>"
 *  - a limited user gets Audiobookshelf's tag rule "these tags are not accessible" with the age tags above
 *    their limit (plus Unrated if chosen) and their own hide tag, and no explicit content below 18+.
 *
 * Settings: <DATA_DIR>/parental.json  { users: { <userId>: { maxAge, hideUnrated } } }
 * maxAge: null (no limit) | 'all' | 7 | 13 | 16 | 18
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')

const RATINGS = [
  { id: 'all', tag: 'Age: All ages', label: 'All ages', rank: 0 },
  { id: '7', tag: 'Age: 7+', label: '7+', rank: 7 },
  { id: '13', tag: 'Age: 13+', label: '13+', rank: 13 },
  { id: '16', tag: 'Age: 16+', label: '16+', rank: 16 },
  { id: '18', tag: 'Age: 18+', label: '18+ (adults)', rank: 18 }
]
const UNRATED = { id: 'unrated', tag: 'Age: Unrated', label: 'Unrated', rank: 99 }
const AGE_TAGS = new Set([...RATINGS.map((r) => r.tag), UNRATED.tag])
const HIDE_PREFIX = 'abs+hide:'

const hideTag = (userId) => `${HIDE_PREFIX}${String(userId).replace(/[^a-z0-9]/gi, '').slice(0, 8)}`
const ratingOfTags = (tags) => {
  const t = (tags || []).find((x) => AGE_TAGS.has(x))
  if (!t) return null
  return [...RATINGS, UNRATED].find((r) => r.tag === t).id
}
const rankOf = (id) => {
  const r = RATINGS.find((x) => x.id === String(id))
  return r ? r.rank : null
}

/**
 * Suggested rating from what Audiobookshelf already knows (genres, tags, explicit flag, description,
 * in several languages). Strong signals only; anything else stays Unrated for an admin to decide.
 */
function suggestRating(item) {
  const md = (item.media && item.media.metadata) || {}
  const text = [...(md.genres || []), ...((item.media && item.media.tags) || []).filter((t) => !AGE_TAGS.has(t) && !t.startsWith(HIDE_PREFIX))].join(' | ').toLowerCase()
  const desc = String(md.description || '').toLowerCase()
  const has = (re) => re.test(text)
  if (md.explicit) return { id: '18', why: 'marked explicit' }
  if (has(/erotic|erotik|érotique|erótic|erotica|adult fiction|bdsm|porn/)) return { id: '18', why: 'adult genre' }
  if (has(/picture book|bilderbuch|album jeunesse|bedtime|gutenacht|nursery|toddler|baby|kleinkind|0-3|3-5|kindergarten|vorschul/)) return { id: 'all', why: 'young children' }
  if (has(/children|kids|kinder|enfant|jeunesse|niñ|infantil|bambin|ragazzi|kinderboek|barn|lasten|dziec|детск|juvenile|middle grade|kinderbuch|kinderhörspiel/)) return { id: '7', why: 'children’s genre' }
  if (has(/young adult|\bya\b|teen|jugendbuch|jugend|adolesc|juvenil|giovani|young-adult|nuorten|ungdom|młodzież|подрост/)) return { id: '13', why: 'teen genre' }
  if (has(/horror|grusel|épouvante|terror|splatter|true crime/) || /\b(graphic violence|sexual content|explicit sex)\b/.test(desc)) return { id: '16', why: 'horror / mature themes' }
  return null
}

class Parental {
  constructor() {
    this.file = path.join(config.dataDir, 'parental.json')
    this.settings = { users: {} }
    try {
      Object.assign(this.settings, JSON.parse(fs.readFileSync(this.file, 'utf8')))
    } catch (e) {}
  }

  save() {
    fs.mkdirSync(config.dataDir, { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify(this.settings, null, 2))
  }

  async users() {
    const j = await absApi.serviceJson('/api/users')
    return (Array.isArray(j) ? j : (j && j.users) || []).filter((u) => u.type !== 'root')
  }

  /** Every book with its rating, suggested rating and who it's blocked for */
  async overview(library) {
    const [users, books] = await Promise.all([this.users(), library.allBooks()])
    const userList = users.map((u) => {
      const s = this.settings.users[u.id] || {}
      return { id: u.id, username: u.username, type: u.type, maxAge: s.maxAge ?? null, hideUnrated: !!s.hideUnrated, hideTag: hideTag(u.id), ownTagRules: !s.managed && u.permissions && u.permissions.accessAllTags === false }
    })
    const bookList = books.map((b) => {
      const md = (b.media && b.media.metadata) || {}
      const tags = (b.media && b.media.tags) || []
      const s = suggestRating(b)
      return {
        id: b.id,
        title: md.title || b.id,
        author: md.authorName || '',
        rating: ratingOfTags(tags),
        suggested: s ? s.id : null,
        suggestedWhy: s ? s.why : null,
        explicit: !!md.explicit,
        blockedFor: userList.filter((u) => tags.includes(u.hideTag)).map((u) => u.id)
      }
    })
    return { ratings: [...RATINGS, UNRATED].map(({ id, label, tag }) => ({ id, label, tag })), users: userList, books: bookList }
  }

  /** Set (or replace) the age tag on books. rating: an id, or 'suggested' (unrated ones get Unrated) */
  async rate(library, itemIds, rating) {
    const books = await library.allBooks()
    const byId = new Map(books.map((b) => [b.id, b]))
    const updates = []
    for (const id of itemIds) {
      const b = byId.get(id)
      if (!b) continue
      let r = rating
      if (rating === 'suggested') {
        const s = suggestRating(b)
        r = s ? s.id : 'unrated'
      }
      const tag = r === 'unrated' ? UNRATED.tag : (RATINGS.find((x) => x.id === String(r)) || {}).tag
      if (!tag) continue
      const tags = ((b.media && b.media.tags) || []).filter((t) => !AGE_TAGS.has(t))
      tags.push(tag)
      if (JSON.stringify(tags.slice().sort()) === JSON.stringify(((b.media && b.media.tags) || []).slice().sort())) continue
      updates.push({ id, mediaPayload: { tags } })
    }
    await this.batchUpdate(updates)
    return updates.length
  }

  /** Books without an age tag get one (suggested, else Unrated), so "hide unrated" can work */
  async tagUnrated(library) {
    const books = await library.allBooks()
    const ids = books.filter((b) => !ratingOfTags(b.media && b.media.tags)).map((b) => b.id)
    return ids.length ? this.rate(library, ids, 'suggested') : 0
  }

  async batchUpdate(updates) {
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50)
      try {
        await absApi.serviceRequest('POST', '/api/items/batch/update', chunk)
      } catch (e) {
        // Older servers: one at a time
        for (const u of chunk) await absApi.serviceRequest('PATCH', `/api/items/${encodeURIComponent(u.id)}/media`, u.mediaPayload)
      }
    }
  }

  /** Block or unblock one book for one person */
  async block(library, userId, itemId, blocked) {
    const books = await library.allBooks()
    const b = books.find((x) => x.id === itemId)
    if (!b) throw Object.assign(new Error('Book not found'), { status: 404 })
    const tag = hideTag(userId)
    const tags = ((b.media && b.media.tags) || []).filter((t) => t !== tag)
    if (blocked) tags.push(tag)
    await this.batchUpdate([{ id: itemId, mediaPayload: { tags } }])
    await this.applyUser(userId)
    return { blocked: !!blocked }
  }

  /** Age limit for one person, then make Audiobookshelf enforce it */
  async setUser(library, userId, { maxAge, hideUnrated }) {
    const cur = this.settings.users[userId] || {}
    const next = { ...cur }
    if (maxAge !== undefined) next.maxAge = maxAge === null || maxAge === 'none' ? null : maxAge === 'all' ? 'all' : Number(maxAge)
    if (hideUnrated !== undefined) next.hideUnrated = !!hideUnrated
    this.settings.users[userId] = next
    this.save()
    if (next.hideUnrated) await this.tagUnrated(library) // untagged books would otherwise slip through
    return this.applyUser(userId)
  }

  /** Writes the user's tag rules in Audiobookshelf (only the parts parental controls owns) */
  async applyUser(userId) {
    const s = this.settings.users[userId] || {}
    const users = await this.users()
    const u = users.find((x) => x.id === userId)
    if (!u) throw Object.assign(new Error('User not found'), { status: 404 })
    const limit = s.maxAge === null || s.maxAge === undefined ? null : s.maxAge === 'all' ? 0 : Number(s.maxAge)
    const deny = []
    if (limit !== null) RATINGS.filter((r) => r.rank > limit).forEach((r) => deny.push(r.tag))
    if (s.hideUnrated) deny.push(UNRATED.tag)
    // Their private hide tag is always denied (harmless when nothing carries it)
    deny.push(hideTag(userId))
    const permissions = { accessAllTags: false, selectedTagsNotAccessible: true, itemTagsSelected: deny }
    if (limit !== null) permissions.accessExplicitContent = limit >= 18
    else if (s.managed && s.explicitBefore !== undefined) permissions.accessExplicitContent = s.explicitBefore
    if (!s.managed) {
      s.managed = true
      s.explicitBefore = !!(u.permissions && u.permissions.accessExplicitContent)
      this.settings.users[userId] = s
      this.save()
    }
    await absApi.serviceRequest('PATCH', `/api/users/${encodeURIComponent(userId)}`, { permissions })
    log.info(`Parental controls for ${u.username}: ${limit === null ? 'no age limit' : `up to ${limit === 0 ? 'all ages' : limit + '+'}`}${s.hideUnrated ? ', unrated hidden' : ''}`)
    return { userId, maxAge: s.maxAge ?? null, hideUnrated: !!s.hideUnrated, denied: deny }
  }

  /** New books found by the library watcher: give them an age tag when anyone needs ratings */
  async onNewBooks(library, ids) {
    const anyone = Object.values(this.settings.users).some((s) => s.maxAge !== null && s.maxAge !== undefined)
    if (!anyone || !ids.length) return 0
    return this.rate(library, ids, 'suggested')
  }
}

module.exports = { Parental, suggestRating, hideTag, ratingOfTags, RATINGS, UNRATED, AGE_TAGS, HIDE_PREFIX }

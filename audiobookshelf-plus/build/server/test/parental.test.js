'use strict'
// Parental controls (ratings, per-user limits, per-user blocks) and the metadata provider's merging.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-parental-'))
const absApi = require('../src/absApi')
const { Parental, suggestRating, hideTag, ratingOfTags } = require('../src/parental')
const { merge, score, scriptLang, langCode, Metadata } = require('../src/metadata')

const book = (id, extra = {}) => ({ id, mediaType: 'book', media: { tags: extra.tags || [], metadata: { title: extra.title || id, authorName: 'A', genres: extra.genres || [], explicit: !!extra.explicit, description: extra.description || '' } } })

test('suggested ratings from genres in several languages, explicit flag; unknown stays unrated', () => {
  assert.strictEqual(suggestRating(book('a', { explicit: true })).id, '18')
  assert.strictEqual(suggestRating(book('b', { genres: ['Erotik'] })).id, '18')
  assert.strictEqual(suggestRating(book('c', { genres: ['Kinder & Jugendliche'] })).id, '7')
  assert.strictEqual(suggestRating(book('d', { genres: ['Young Adult', 'Fantasy'] })).id, '13')
  assert.strictEqual(suggestRating(book('e', { genres: ['Jeunesse'] })).id, '7')
  assert.strictEqual(suggestRating(book('f', { genres: ['Bedtime stories'] })).id, 'all')
  assert.strictEqual(suggestRating(book('g', { genres: ['Horror'] })).id, '16')
  assert.strictEqual(suggestRating(book('h', { genres: ['History'] })), null)
  assert.strictEqual(ratingOfTags(['Fantasy', 'Age: 13+']), '13')
  assert.strictEqual(ratingOfTags(['Fantasy']), null)
})

test('age limit, unrated and per-user blocks become Audiobookshelf tag rules; blocks are private tags', async () => {
  const calls = []
  let books = [book('b1', { tags: ['Fantasy'], genres: ['Young Adult'] }), book('b2', { genres: ['History'] }), book('b3', { tags: ['Age: 18+'] })]
  const users = [{ id: 'kid-0001-xyz', username: 'kid', type: 'user', permissions: { accessAllTags: true, accessExplicitContent: false } }, { id: 'root1', username: 'root', type: 'root', permissions: {} }]
  const orig = { serviceJson: absApi.serviceJson, serviceRequest: absApi.serviceRequest }
  absApi.serviceJson = async (p) => (p === '/api/users' ? { users } : null)
  absApi.serviceRequest = async (method, p, body) => {
    calls.push({ method, p, body })
    if (p === '/api/items/batch/update') body.forEach((u) => (books.find((b) => b.id === u.id).media.tags = u.mediaPayload.tags))
    return {}
  }
  const library = { allBooks: async () => books }
  try {
    const par = new Parental()
    const ov = await par.overview(library)
    assert.deepStrictEqual(ov.users.map((u) => u.username), ['kid'], 'the main admin (root) is never limited')

    // Up to 13+, hide unrated: every book gets an age tag first, then the rule
    const r = await par.setUser(library, 'kid-0001-xyz', { maxAge: 13, hideUnrated: true })
    assert.deepStrictEqual(books.map((b) => ratingOfTags(b.media.tags)), ['13', 'unrated', '18'])
    assert.ok(books[0].media.tags.includes('Fantasy'), 'other tags are kept')
    assert.deepStrictEqual(r.denied, ['Age: 16+', 'Age: 18+', 'Age: Unrated', hideTag('kid-0001-xyz')])
    const patch = calls.find((c) => c.method === 'PATCH' && c.p === '/api/users/kid-0001-xyz')
    assert.strictEqual(patch.body.permissions.accessAllTags, false)
    assert.strictEqual(patch.body.permissions.selectedTagsNotAccessible, true)
    assert.strictEqual(patch.body.permissions.accessExplicitContent, false)

    // Block one book for the kid only: a private tag on that book
    await par.block(library, 'kid-0001-xyz', 'b1', true)
    assert.ok(books[0].media.tags.includes(hideTag('kid-0001-xyz')))
    assert.strictEqual((await par.overview(library)).books[0].blockedFor[0], 'kid-0001-xyz')
    await par.block(library, 'kid-0001-xyz', 'b1', false)
    assert.ok(!books[0].media.tags.includes(hideTag('kid-0001-xyz')))

    // Change a rating by hand
    await par.rate(library, ['b2'], '7')
    assert.strictEqual(ratingOfTags(books[1].media.tags), '7')

    // No limit: explicit access goes back to what it was
    const off = await par.setUser(library, 'kid-0001-xyz', { maxAge: 'none', hideUnrated: false })
    assert.deepStrictEqual(off.denied, [hideTag('kid-0001-xyz')])
    const last = calls.filter((c) => c.method === 'PATCH').pop()
    assert.strictEqual(last.body.permissions.accessExplicitContent, false)
  } finally {
    Object.assign(absApi, orig)
  }
})

test('metadata: language from script, merging the same book from several sources, best cover first', () => {
  assert.strictEqual(scriptLang('ノルウェイの森'), 'ja')
  assert.strictEqual(scriptLang('Война и мир'), 'ru')
  assert.strictEqual(scriptLang('Der Schwarm'), null)
  assert.strictEqual(langCode('german'), 'de')
  assert.strictEqual(langCode('fre'), 'fr')
  const req = { query: 'Der Schwarm', author: 'Frank Schätzing' }
  const list = [
    { source: 'Audible.de', title: 'Der Schwarm', author: 'Frank Schätzing', asin: 'B00', cover: 'a.jpg', coverSize: 2400, narrator: 'N', language: 'de', series: [] },
    { source: 'Apple Books (DE)', title: 'Der Schwarm (Gekürzt)', author: 'Frank Schätzing', cover: 'i.jpg', coverSize: 3000, description: 'Longer description here', language: 'de' },
    { source: 'Open Library', title: 'The Swarm', author: 'Frank Schätzing', cover: 'o.jpg', coverSize: 500, language: 'en' }
  ]
  list.forEach((m) => (m.score = score(m, req, 'de')))
  const merged = merge(list).sort((a, b) => b.score - a.score)
  assert.strictEqual(merged.length, 2)
  assert.strictEqual(merged[0].title, 'Der Schwarm')
  assert.deepStrictEqual(merged[0].sources, ['Audible.de', 'Apple Books (DE)'])
  assert.strictEqual(merged[0].covers[0].url, 'i.jpg', 'biggest cover first')
  assert.strictEqual(merged[0].narrator, 'N')
  assert.strictEqual(merged[0].description, 'Longer description here')
})

test('metadata: Audiobookshelf format and the provider secret', () => {
  const m = new Metadata()
  const out = m.toAbs({ title: 'T', author: 'A', covers: [{ url: 'c.jpg', size: 3000 }], series: [{ series: 'S', sequence: 2 }], language: 'de', duration: 120, genres: [] })
  assert.deepStrictEqual(out, { title: 'T', author: 'A', cover: 'c.jpg', series: [{ series: 'S', sequence: '2' }], language: 'Deutsch', duration: 120 })
  assert.ok(m.authorized({ headers: { authorization: m.settings.secret } }))
  assert.ok(!m.authorized({ headers: { authorization: 'nope' } }))
  assert.ok(!m.authorized({ headers: {} }))
})

'use strict'
// Dewey Decimal: names, choosing a number from several editions, lookup order, browse tree.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-dewey-'))
const { Dewey, describe, pickDdc, lccToDdc } = require('../src/catalog')

const book = (id, title, author, isbn) => ({ id, media: { metadata: { title, authorName: author, isbn } } })

test('Dewey names and picking the number most editions agree on', () => {
  const d = describe('823.914')
  assert.strictEqual(d.class, '800')
  assert.strictEqual(d.className, 'Literature')
  assert.strictEqual(d.division, '820')
  assert.strictEqual(d.divisionName, 'English & Old English literatures')
  assert.strictEqual(d.sectionName, 'English fiction')
  assert.strictEqual(describe('005.133').section, '005')
  assert.strictEqual(describe('[Fic]'), null)
  assert.strictEqual(pickDdc(['813.54', '[Fic]', '813.6', '823.914']), '813.54')
  assert.strictEqual(pickDdc(['Fic', 'E']), null)
})

test('lookup: local catalogue by ISBN first, then by title and author', async () => {
  const calls = []
  const catalog = {
    ready: () => true,
    byIsbn: async (isbn) => (calls.push(['isbn', isbn]), isbn === '9780593135204' ? [{ ddc: '813.6' }] : []),
    search: async (t, a) => (calls.push(['search', t, a]), [{ title: 'Dune', ddc: '813.54' }, { title: 'Dune Messiah', ddc: '813.54' }])
  }
  const dw = new Dewey(catalog)
  assert.deepStrictEqual(await dw.lookup(book('a', 'Project Hail Mary', 'Andy Weir', '978-0-593-13520-4')), { ddc: '813.6', source: 'catalogue (ISBN)' })
  assert.deepStrictEqual(await dw.lookup(book('b', 'Dune (Unabridged)', 'Frank Herbert, Simon Vance', '')), { ddc: '813.54', source: 'catalogue' })
  assert.deepStrictEqual(calls[1], ['search', 'Dune', 'Frank Herbert'], 'cleans the title, first author only')
})

test('admin numbers are kept; browse tree counts per class and division', () => {
  const dw = new Dewey({ ready: () => false })
  dw.set('x', '823.914', 'admin')
  dw.map.y = { ddc: '813.6', source: 'Open Library' }
  dw.map.z = { ddc: '520', source: 'Open Library' }
  dw.map.w = { ddc: null, source: 'not found' }
  const t = dw.tree([{ id: 'x' }, { id: 'y' }, { id: 'z' }, { id: 'w' }, { id: 'v' }])
  const lit = t.classes.find((c) => c.id === '800')
  assert.strictEqual(lit.count, 2)
  assert.deepStrictEqual(lit.divisions.map((d) => [d.id, d.count]), [['810', 1], ['820', 1]])
  assert.strictEqual(t.classes.find((c) => c.id === '500').count, 1)
  assert.strictEqual(t.unclassified, 2)
  assert.strictEqual(dw.get('x').source, 'admin')
  assert.strictEqual(dw.set('q', 'abc', 'admin').ddc, null)
})

test('Library of Congress classes convert to Dewey when no edition has a number', () => {
  assert.strictEqual(lccToDdc('PS-3618.00000000.E5478D35 2019', null), '813') // American fiction (genre unknown)
  assert.strictEqual(lccToDdc('PS3604.O27', false), '810') // American literature, not fiction
  assert.strictEqual(lccToDdc('PL-0873.00000000.U73', true), '895.63') // Japanese fiction
  assert.strictEqual(lccToDdc('PQ6668.O5', true), '863') // Spanish fiction
  assert.strictEqual(lccToDdc('QB-0460.72000000.T97T97 2019'), '520') // astronomy
  assert.strictEqual(lccToDdc('QA76.9.A25'), '004') // computing, the narrower range wins over QA → 510
  assert.strictEqual(lccToDdc('D810.S7'), '940.53') // Second World War
  assert.strictEqual(lccToDdc('[Fic]'), null) // a placeholder, not a class
  assert.strictEqual(lccToDdc(''), null)
})

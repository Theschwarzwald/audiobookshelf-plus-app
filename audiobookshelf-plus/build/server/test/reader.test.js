'use strict'
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { make } = require('./fixtures/makeStarDict')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-dict-'))
process.env.DICTIONARY_DIR = path.join(tmp, 'dicts')
process.env.DICTIONARY_ONLINE = 'false'
process.env.DATA_DIR = path.join(tmp, 'data')
const { Dictionaries, candidates, writeZip } = require('../src/dictionary')
const { AnnotationStore } = require('../src/annotations')
const { ZipReader } = require('../src/ebook/zip')

const entries = {
  run: 'to move swiftly on foot; a long run of the text so that it crosses several dictzip chunks for the test',
  polish: 'to make smooth and shiny',
  Polish: 'of or relating to Poland',
  city: 'a large town',
  aardvark: 'a burrowing mammal',
  zebra: 'striped animal'
}
make(path.join(process.env.DICTIONARY_DIR, 'en', 'test'), 'testdict', entries, { synonyms: { metropolis: 'city' } })
make(path.join(process.env.DICTIONARY_DIR, 'es'), 'esdict', { casa: 'house', gato: 'cat' })
const dicts = new Dictionaries(process.env.DICTIONARY_DIR)

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }))

test('lists dictionaries with their language from the folder', () => {
  const list = dicts.list().sort((a, b) => a.lang.localeCompare(b.lang))
  assert.deepStrictEqual(
    list.map((d) => [d.name, d.lang, d.words, d.ok]),
    [
      ['testdict', 'en', 6, true],
      ['esdict', 'es', 2, true]
    ]
  )
})

test('looks words up through word forms, case, synonyms and dictzip chunks', async () => {
  let r = await dicts.lookup('Running,', 'en')
  assert.strictEqual(r.matched, 'run')
  assert.match(r.results[0].definition, /crosses several dictzip chunks/)
  r = await dicts.lookup('cities', 'en')
  assert.strictEqual(r.matched, 'city')
  r = await dicts.lookup('metropolis', 'en')
  assert.match(r.results[0].definition, /large town/)
  r = await dicts.lookup('Polish', 'en')
  assert.strictEqual(r.results[0].headword, 'Polish') // exact case first
  assert.strictEqual(r.results.length, 2)
  r = await dicts.lookup('gatos', 'es')
  assert.strictEqual(r.matched, 'gato')
  r = await dicts.lookup('gato', 'en')
  assert.strictEqual(r.results.length, 0, 'Spanish dictionary not used for English books')
  assert.deepStrictEqual(candidates('“Didn’t”', 'en').slice(0, 2), ["Didn't", "didn't"])
})

test('dictionary download is a zip a phone can unpack', async () => {
  const d = dicts.get(dicts.list().find((x) => x.lang === 'en').id)
  const chunks = []
  await new Promise((resolve) => writeZip({ write: (b) => chunks.push(Buffer.from(b)), end: (b) => (chunks.push(Buffer.from(b)), resolve()) }, d.files.map((f) => ({ name: path.basename(f), path: f }))))
  const zip = new ZipReader(Buffer.concat(chunks))
  assert.deepStrictEqual(zip.names().sort(), ['testdict.dict.dz', 'testdict.idx', 'testdict.ifo', 'testdict.syn'])
  assert.ok(zip.read('testdict.idx').equals(fs.readFileSync(d.files.find((f) => f.endsWith('.idx')))))
})

test('annotations sync between devices, latest edit wins, deletes propagate', () => {
  const store = new AnnotationStore(process.env.DATA_DIR)
  const a = { id: 'h1', type: 'highlight', cfi: 'epubcfi(/6/4!/4/2,/1:0,/1:10)', text: 'Hello', color: 'yellow', updatedAt: 100 }
  // phone A adds a highlight
  let r = store.sync('u1', 'book', 0, [a])
  assert.strictEqual(r.seq, 1)
  // phone B (never synced) gets it
  r = store.sync('u1', 'book', 0, [])
  assert.deepStrictEqual(r.annotations.map((x) => x.id), ['h1'])
  // B adds a note later; A's older edit doesn't overwrite it
  store.sync('u1', 'book', 1, [{ ...a, note: 'from B', updatedAt: 300 }])
  r = store.sync('u1', 'book', 1, [{ ...a, color: 'blue', updatedAt: 200 }])
  assert.deepStrictEqual(r.annotations.map((x) => [x.note, x.color]), [['from B', 'yellow']])
  // delete reaches everyone
  r = store.sync('u1', 'book', r.seq, [{ ...a, deleted: true, updatedAt: 400 }])
  assert.strictEqual(r.annotations[0].deleted, true)
  // other users don't see it
  assert.strictEqual(store.sync('u2', 'book', 0, []).annotations.length, 0)
  // junk is ignored
  assert.strictEqual(store.sync('u1', 'book', 999, [{ id: 'x', type: 'virus' }]).annotations.length, 0)
})

'use strict'
const test = require('node:test')
const assert = require('node:assert')
const comparer = require('../src/comparer')
const lineSplitter = require('../src/lineSplitter')
const { makeEpub, makeZip } = require('./fixtures/mockAbs')
const epub = require('../src/ebook/epub')
const reader = require('../src/ebook/reader')
const mobi = require('../src/ebook/mobi')
const { toJs, defaultMeta } = require('../src/store')
const { injectTags, basePathFor } = require('../src/proxy')

test('line splitter follows the app rules', () => {
  const words = 'It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith hurried home.'.split(' ').map((w, i) => ({ w: ' ' + w, s: i, e: i + 1 }))
  const lines = lineSplitter.split(words, 0, 20)
  assert.deepStrictEqual(lines.map((l) => l.text), ['It was a bright cold day in April, and the clocks were striking thirteen.', 'Winston Smith hurried home.'])
  assert.strictEqual(lines[1].start, 14)
  assert.strictEqual(lines[0].end, 14)
  // dangling 1-2 words merge into the previous line
  const w2 = 'Hello there friend. Yes'.split(' ').map((w, i) => ({ w: ' ' + w, s: i, e: i + 1 }))
  assert.deepStrictEqual(lineSplitter.split(w2, 0, 5).map((l) => l.text), ['Hello there friend. Yes'])
  // no spaces for languages written without them
  const zh = ['今天', '天气', '很好。'].map((w, i) => ({ w, s: i, e: i + 1 }))
  assert.strictEqual(lineSplitter.split(zh, 0, 3)[0].text, '今天天气很好。')
})

test('comparer finds a misheard name between anchors', () => {
  const ebookText = 'the ship came in to the harbour at dawn and Captain Zelenka walked down to the dock where the crew was waiting for him with the news from home'
  const heard = ebookText.replace('Zelenka', 'Zalenka')
  const words = heard.split(' ')
  const lines = []
  for (let i = 0; i < words.length; i += 8) lines.push({ start: i, end: i + 8, text: words.slice(i, i + 8).join(' ') })
  const r = comparer.compare(lines, [{ start: 0, end: 100, title: 'One' }], [{ index: 0, title: 'One', text: ebookText }])
  assert.strictEqual(r.suggestions.length, 1)
  const s = r.suggestions[0]
  assert.strictEqual(s.heard, 'Zalenka')
  assert.strictEqual(s.ebook, 'Zelenka')
  assert.strictEqual(s.chapter, 'One')
  assert.strictEqual(s.id, '8.0-3')
  const line = lines.find((l) => l.start === s.s)
  assert.strictEqual(comparer.applyToLine(line.text, [s]), line.text.replace('Zalenka', 'Zelenka'))
})

test('comparer handles joined and split words', () => {
  const e = 'one two three four we walked home in the nighttime past the old mill five six seven eight'
  const t = 'one two three four we walked home in the night time past the old mill five six seven eight'
  const r = comparer.compare([{ start: 0, end: 10, text: t }], [], [{ index: 0, title: '', text: e }])
  assert.strictEqual(r.suggestions.length, 1)
  assert.strictEqual(r.suggestions[0].heard, 'night time')
  assert.strictEqual(r.suggestions[0].ebook, 'nighttime')
  assert.strictEqual(comparer.applyToLine(t, r.suggestions), e)
})

test('EPUB reader uses spine order and NCX titles', () => {
  const sections = epub.read(makeEpub())
  assert.strictEqual(sections.length, 2)
  assert.strictEqual(sections[0].title, 'Chapter One')
  assert.ok(sections[1].text.split(/\s+/).length > 900)
})

test('format detection', async () => {
  assert.strictEqual(reader.detect(makeEpub()).kind, 'EPUB')
  const kz = makeZip([['book.kfx', 'CONT']])
  assert.strictEqual(reader.detect(kz).kind, 'KFX_ZIP')
  await assert.rejects(reader.read(Buffer.from('hello world, not a book at all, really not')), /isn't supported/)
})

test('PalmDOC decompression', () => {
  // literal run, a back-reference ("abcabc"), and the space+char form
  const input = Buffer.from([0x61, 0x62, 0x63, 0x80, 0x18, 0xe1])
  // 0x8018: distance 3, length 3 -> "abc"; 0xe1 -> " a"
  assert.strictEqual(mobi.palmDocDecompress(input).toString('latin1'), 'abcabc a')
})

test('MOBI with a minimal PalmDB header', () => {
  const html = '<html><body><h1>Chapter 1</h1><p>' + 'word '.repeat(200) + '</p><mbp:pagebreak/><h1>Chapter 2</h1><p>' + 'more '.repeat(200) + '</p></body></html>'
  const text = Buffer.from(html, 'latin1')
  const rec0 = Buffer.alloc(16)
  rec0.writeUInt16BE(1, 0) // no compression
  rec0.writeUInt16BE(1, 8) // one text record
  const numRecords = 2
  const headerLen = 78 + numRecords * 8 + 2
  const pdb = Buffer.alloc(headerLen)
  pdb.write('BOOKMOBI', 60, 'latin1')
  pdb.writeUInt16BE(numRecords, 76)
  pdb.writeUInt32BE(headerLen, 78)
  pdb.writeUInt32BE(headerLen + rec0.length, 86)
  const file = Buffer.concat([pdb, rec0, text])
  const sections = mobi.read(file)
  assert.strictEqual(sections.length, 2)
  assert.strictEqual(sections[0].title, 'Chapter 1')
  // DRM is refused, not decrypted
  const drm = Buffer.from(file)
  drm.writeUInt16BE(2, headerLen + 12)
  assert.throws(() => mobi.read(drm), /DRM-protected/)
})

test('status JSON matches the app (done ranges for both passes)', () => {
  const m = Object.assign(defaultMeta('k'), { durationSec: 1000, firstStartSec: 400, resumeSec: 600, pass: 0, doneSec: 200 })
  assert.deepStrictEqual(toJs(m).doneRanges, [[400, 600]])
  m.pass = 1
  m.resumeSec = 100
  assert.deepStrictEqual(toJs(m).doneRanges, [[400, 1000], [0, 100]])
  assert.strictEqual(toJs(m).progress, 0.2)
})

test('HTML injection and base path', () => {
  const out = injectTags('<html><head><title>x</title></head><body></body></html>', '/audiobookshelf')
  // versioned (?v=…) so browsers fetch the new files after an update
  assert.ok(/<script src="\/audiobookshelf\/_abs_transcription\/transcription\.js\?v=[a-z0-9]+" defer><\/script><\/head>/.test(out))
  assert.strictEqual(injectTags(out, ''), out)
  assert.strictEqual(basePathFor('/audiobookshelf/item/1'), '/audiobookshelf')
  assert.strictEqual(basePathFor('/item/1'), '')
})

'use strict'
// LRC files next to the audio: <audio>.lrc (lyrics) and <audio>_karaoke.lrc (every word, microseconds).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abs-lrc-'))
process.env.DATA_DIR = path.join(tmp, 'data')
const absApi = require('../src/absApi')
const { TranscriptStore, defaultMeta } = require('../src/store')
const { Lrc, stamp, parseStamp, parseLyrics, parseKaraoke, karaokeText, lyricsText } = require('../src/lrc')
const lineSplitter = require('../src/lineSplitter')

test('time stamps: centiseconds for lyrics, microseconds for karaoke, long books keep counting minutes', () => {
  assert.strictEqual(stamp(83.456789, 2), '01:23.46')
  assert.strictEqual(stamp(83.4567891, 6), '01:23.456789')
  assert.strictEqual(stamp(7384.000001, 6), '123:04.000001')
  assert.strictEqual(stamp(59.9999999, 6), '01:00.000000')
  assert.strictEqual(parseStamp('123:04.000001'), 7384.000001)
  assert.strictEqual(parseStamp('01:23.46'), 83.46)
})

test('lines keep the speech engine’s word times; files round-trip', () => {
  const words = [
    { w: ' Hello', s: 1.000001, e: 1.4 },
    { w: ' there,', s: 1.45, e: 1.8 },
    { w: ' world.', s: 1.9, e: 2.512345 }
  ]
  const [line] = lineSplitter.split(words, 1, 3)
  assert.deepStrictEqual(line.words.map((w) => w.s), [1.000001, 1.45, 1.9])
  const stored = JSON.parse(TranscriptStore.lineJson(line))
  assert.deepStrictEqual(stored.w, [['Hello', 1.000001, 1.4], ['there,', 1.45, 1.8], ['world.', 1.9, 2.512345]])

  const l = { start: stored.s, end: stored.e, text: stored.t, words: stored.w }
  const kar = karaokeText({ title: 'T', author: 'A' }, [l], 10)
  assert.ok(kar.includes('[00:01.000001]<00:01.000001>Hello <00:01.450000>there, <00:01.900000>world. <00:02.512345>'), kar)
  assert.ok(kar.includes('[x-word-times:from the speech engine]'))
  const back = parseKaraoke(kar)
  assert.deepStrictEqual(back[0].words, [['Hello', 1.000001, 1.45], ['there,', 1.45, 1.9], ['world.', 1.9, 2.512345]])
  assert.strictEqual(back[0].text, 'Hello there, world.')
  const lyr = lyricsText({ title: 'T' }, [l], 10)
  assert.ok(lyr.includes('[00:01.00]Hello there, world.'))
  assert.deepStrictEqual(parseLyrics(lyr), [{ start: 1, text: 'Hello there, world.' }])
  // Older transcripts without word times: estimated, and the file says so
  assert.ok(karaokeText({}, [{ start: 0, end: 2, text: 'No word times' }], 5).includes('estimated'))
})

test('export next to each audio file, read hand edits back, never overwrite someone else’s file', async () => {
  const lib = path.join(tmp, 'library', 'Author', 'Book')
  fs.mkdirSync(lib, { recursive: true })
  const store = new TranscriptStore()
  const key = 'item1'
  const meta = Object.assign(defaultMeta(key), { title: 'Book', status: 'done', libraryItemId: key, durationSec: 20 })
  store.saveMeta(meta)
  store.appendLines(key, [
    { start: 1, end: 3, text: 'In part one.', words: [{ w: 'In', s: 1, e: 1.3 }, { w: 'part', s: 1.3, e: 1.7 }, { w: 'one.', s: 1.7, e: 2.2 }] },
    { start: 12, end: 14, text: 'In part two.', words: [{ w: 'In', s: 12, e: 12.4 }, { w: 'part', s: 12.4, e: 12.8 }, { w: 'two.', s: 12.8, e: 13.5 }] }
  ])
  const orig = absApi.serviceJson
  absApi.serviceJson = async () => ({
    id: key,
    media: {
      metadata: { title: 'Book', authorName: 'Author' },
      audioFiles: [
        { index: 1, duration: 10, metadata: { path: path.join(lib, 'Part 01.mp3'), filename: 'Part 01.mp3' } },
        { index: 2, duration: 10, metadata: { path: path.join(lib, 'Part 02.mp3'), filename: 'Part 02.mp3' } }
      ]
    }
  })
  try {
    // Someone's own lyrics for part 2 must survive
    fs.writeFileSync(path.join(lib, 'Part 02_karaoke.lrc'), '[00:00.00]Not ours\n')
    const lrc = new Lrc(store)
    const r = await lrc.export(key)
    assert.strictEqual(r.written, 3)
    assert.match(r.errors[0], /wasn't made by ABS\+/)
    const p1 = fs.readFileSync(path.join(lib, 'Part 01.lrc'), 'utf8')
    assert.ok(p1.includes('[00:01.00]In part one.') && !p1.includes('two'))
    const p2 = fs.readFileSync(path.join(lib, 'Part 02.lrc'), 'utf8')
    assert.ok(p2.includes('[00:02.00]In part two.'), 'timed from the start of its own file')
    assert.ok(fs.readFileSync(path.join(lib, 'Part 01_karaoke.lrc'), 'utf8').includes('<00:01.300000>part'))
    assert.strictEqual(fs.readFileSync(path.join(lib, 'Part 02_karaoke.lrc'), 'utf8'), '[00:00.00]Not ours\n')

    // Hand edit of the lyrics file: read back into the transcript (new revision for phones)
    const rev = store.getMeta(key).revision || 0
    await new Promise((res) => setTimeout(res, 2100))
    fs.writeFileSync(path.join(lib, 'Part 01.lrc'), p1.replace('In part one.', 'In chapter one.'))
    const changed = await lrc.syncFromDisk(key)
    assert.strictEqual(changed, true)
    const lines = store.readAllLines(key)
    assert.strictEqual(lines[0].text, 'In chapter one.')
    assert.ok(Math.abs(lines[0].start - 1) < 0.01)
    assert.ok(store.getMeta(key).revision > rev)

    // Deleting the transcript removes only ABS+'s files
    await lrc.remove(key)
    assert.ok(!fs.existsSync(path.join(lib, 'Part 01_karaoke.lrc')))
    assert.ok(fs.existsSync(path.join(lib, 'Part 02_karaoke.lrc')))
  } finally {
    absApi.serviceJson = orig
  }
})

test('karaoke uses the stored word times instead of guessing from the text', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const start = js.indexOf('\nconst wordRe = () =>') + 1
  const end = js.indexOf('function transcriptWords')
  const fn = new Function(`${js.slice(start, end)}; return { wordsOf, lineWordTimes }`)()
  const l = { s: 10, e: 14, t: "Don't stop now", w: [["Don't", 10.123456, 10.9], ['stop', 11.5, 12], ['now', 13.25, 13.8]] }
  const times = fn.lineWordTimes(l, fn.wordsOf(l.t))
  assert.deepStrictEqual(times, [10.123456, 11.5, 13.25])
  // Without word times the old estimate (by position) is used
  const est = fn.lineWordTimes({ s: 10, e: 14, t: 'ab cd' }, fn.wordsOf('ab cd'))
  assert.strictEqual(est[0], 10)
})

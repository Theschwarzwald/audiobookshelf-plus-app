'use strict'
// Server-side adaptation: model step-down after running out of memory, threads from free CPU,
// and the web view's adaptation code (loads, has the Display & colours sheet and the absx-* classes).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const models = require('../src/models')
const { pickThreads } = require('../src/asrWorker')

const both = { whisper: true, sherpa: true, cuda: 0, cpus: 8, ramMb: 16000 }

test('out of memory steps down to the next smaller model', () => {
  assert.strictEqual(models.smallerModel('whisper-large-v3', both), 'whisper-large-v3-turbo')
  assert.strictEqual(models.smallerModel('whisper-large-v3-turbo', both), 'whisper-medium')
  assert.strictEqual(models.smallerModel('whisper-medium', both), 'whisper-small')
  assert.strictEqual(models.smallerModel('whisper-small', both), 'whisper-base')
  assert.strictEqual(models.smallerModel('whisper-base', both), null)
  assert.strictEqual(models.smallerModel('parakeet-tdt-v3', both), 'whisper-small')
})

test('worker threads: CPU_THREADS wins, otherwise the free cores, at least 2', () => {
  const n = pickThreads()
  assert.ok(n >= 2 && n <= Math.max(2, os.cpus().length), `got ${n}`)
})

test('web view carries the adaptation module and styles', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.css'), 'utf8')
  for (const s of ['__absPlusAdapt', 'Display & colours', 'data-pref', "'(update: slow)'", 'getBattery', 'clockLoop']) assert.ok(js.includes(s), s)
  for (const c of ['.absx-eink', '.absx-oled', '.absx-light', '.absx-reduce-motion', '.absx-cvd-protan', '.absx-cvd-tritan', '.absx-cvd-mono', '.absx-ff-desktop']) assert.ok(css.includes(c), c)
})

test('adaptation logic: e-ink, low battery and preferences', () => {
  // Run the module's code in a tiny fake browser
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const start = js.indexOf('  const ADAPT = (() => {')
  const end = js.indexOf('  window.__absPlusAdapt = ADAPT')
  const src = js.slice(start, end)
  const make = ({ ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', media = {}, store = {} } = {}) => {
    const classes = new Set()
    const env = {
      navigator: { userAgent: ua, hardwareConcurrency: 6, deviceMemory: 6 },
      window: { innerWidth: 400, innerHeight: 800, matchMedia: (q) => ({ matches: !!media[q] }), addEventListener() {} },
      localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => (store[k] = v) },
      document: { hidden: false, documentElement: { classList: { add: (...c) => c.forEach((x) => classes.add(x)), remove: (c) => classes.delete(c) } } },
      performance: { now: () => 0 },
      requestAnimationFrame: () => {}
    }
    const fn = new Function(...Object.keys(env), `${src}; return ADAPT`)
    return { A: fn(...Object.values(env)), classes, store }
  }

  let { A, classes } = make({ ua: 'Mozilla/5.0 (Linux; Android 11; BOOX Note Air3 C)' })
  let p = A.apply()
  assert.strictEqual(p.screen, 'eink-color')
  assert.strictEqual(p.motion, false)
  assert.strictEqual(p.clockMs, 900)
  assert.ok(classes.has('absx-eink') && classes.has('absx-eink-color') && classes.has('absx-ff-phone'))

  ;({ A, classes } = make({ media: { '(dynamic-range: high)': true } }))
  p = A.apply()
  assert.strictEqual(p.screen, 'oled')
  assert.strictEqual(p.level, 2) // starts at full quality
  assert.ok(classes.has('absx-oled') && classes.has('absx-level-2'))

  const store = {}
  ;({ A, classes } = make({ store }))
  A.set('power', 'saver')
  A.set('colorVision', 'deutan')
  p = A.profile()
  assert.strictEqual(p.lowPower, true)
  assert.strictEqual(p.level, 0)
  assert.strictEqual(p.clockMs, 600)
  assert.ok(classes.has('absx-cvd-deutan') && classes.has('absx-low-power'))
  assert.deepStrictEqual(JSON.parse(store.absPlusDisplay).colorVision, 'deutan')

  ;({ A, classes } = make({ media: { '(pointer: fine)': true }, store: {} }))
  A.apply()
  assert.ok(!classes.has('absx-ff-desktop')) // 400 px wide: not a desktop window
})

test('cover shading keeps text readable on any cover, in dark and light themes', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const src = js.slice(js.indexOf('  const SHADE = (() => {'), js.indexOf('  /** Cover colour behind the view'))
  const SHADE = new Function('document', 'localStorage', 'window', 'createImageBitmap', `${src.slice(0, src.lastIndexOf('})()') + 4)}; return SHADE`)({}, {}, {}, null)
  const covers = [[90, 160, 170], [250, 240, 80], [255, 255, 255], [10, 10, 10], [200, 30, 30]]
  const themes = [{ bg: [35, 35, 35], fg: [255, 255, 255] }, { bg: [0, 0, 0], fg: [230, 237, 243] }, { bg: [250, 250, 250], fg: [17, 17, 17] }]
  for (const t of themes) {
    for (const c of covers) {
      const sh = SHADE.build(c, t.bg, t.fg)
      const top = SHADE.parse(sh.top)
      assert.ok(SHADE.contrast(top, t.fg) >= 4.5, `cover ${c} on theme ${t.bg}: ${SHADE.contrast(top, t.fg).toFixed(2)}`)
      assert.ok(sh.background.startsWith('linear-gradient(180deg'))
      assert.ok(sh.background.includes(`rgb(${t.bg.join(', ')}) 85%`), 'fades into the page colour')
    }
  }
  // A teal cover in dark mode keeps its colour (only darkened as needed)
  const teal = SHADE.parse(SHADE.build([90, 160, 170], [35, 35, 35], [255, 255, 255]).top)
  assert.ok(teal[2] > teal[0], 'still teal')
})

test('shading reads the web view colours whether they are hex or rgb', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const src = js.slice(js.indexOf('  const SHADE = (() => {'), js.indexOf('  /** Cover colour behind the view'))
  const SHADE = new Function(`${src.slice(0, src.lastIndexOf('})()') + 4)}; return SHADE`)()
  assert.deepStrictEqual(SHADE.parse('#232323'), [35, 35, 35])
  assert.deepStrictEqual(SHADE.parse(' #fff'), [255, 255, 255])
  assert.deepStrictEqual(SHADE.parse('rgb(10, 20, 30)'), [10, 20, 30])
  assert.deepStrictEqual(SHADE.parse('56 56 56'), [56, 56, 56])
  assert.ok(SHADE.build([200, 190, 160], SHADE.parse('#232323'), SHADE.parse('#ffffff')))
})

test('web Read along: word times, drop caps, transcript-to-book mapping', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'transcription.js'), 'utf8')
  const src = js.slice(js.indexOf('  const READALONG = (() => {'), js.indexOf('  // ------------------------------------------------------------------ Transcript button on the book page'))
  const RA = new Function('player', 'icon', 'esc', 'toast', 'alignWords', 'NodeFilter', 'window', `${src}; return READALONG`)({}, () => '', (x) => x, () => {}, () => [], { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 }, {})
  const tw = RA.transcriptWords([{ s: 10, e: 12, t: "Don't stop", w: [["Don't", 10.123456, 10.5], ['stop', 11.25, 11.9]] }, { s: 20, e: 22, t: 'no times here' }])
  assert.deepStrictEqual(tw.norms, ['dont', 'stop', 'no', 'times', 'here'])
  assert.deepStrictEqual(tw.times.slice(0, 2), [10.123456, 11.25])
  assert.strictEqual(tw.times[2], 20)
  // transcript index -> book index through matched pairs; the book has 2 extra words at the start
  const t2e = RA.mapThrough([[0, 2], [10, 12]], 12, 14, false)
  assert.strictEqual(t2e[0], 2)
  assert.strictEqual(t2e[5], 7)
  assert.strictEqual(t2e[11], 13)
  const e2t = RA.mapThrough([[0, 2], [10, 12]], 14, 12, true)
  assert.strictEqual(e2t[7], 5)
  assert.strictEqual(e2t[0], 0)
})

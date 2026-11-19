'use strict'
const test = require('node:test')
const assert = require('node:assert')
const m = require('../src/models')

const hw = {
  cpu: { cuda: 0, cpus: 8, ramMb: 16000, engines: { whisper: true, sherpa: true } },
  bigGpu: { cuda: 1, vramMb: 12288, cpus: 8, ramMb: 32000, engines: { whisper: true, sherpa: true } },
  bigGpuParakeet: { cuda: 1, vramMb: 12288, cpus: 8, ramMb: 32000, engines: { whisper: true, sherpa: true, sherpaCuda: true } },
  smallGpu: { cuda: 1, vramMb: 4096, cpus: 6, ramMb: 16000, engines: { whisper: true, sherpa: true } },
  tiny: { cuda: 0, cpus: 4, ramMb: 2048, engines: { whisper: true, sherpa: true } },
  oldImage: { cuda: 0, cpus: 8, ramMb: 16000 }
}
const pick = (h, l) => m.chooseModel(hw[h], l).id

test('book language from Audiobookshelf metadata', () => {
  assert.strictEqual(m.languageCode('English'), 'en')
  assert.strictEqual(m.languageCode('en-US'), 'en')
  assert.strictEqual(m.languageCode('eng'), 'en')
  assert.strictEqual(m.languageCode('Español'), 'es')
  assert.strictEqual(m.languageCode('日本語'), 'ja')
  assert.strictEqual(m.languageCode(''), '')
  assert.strictEqual(m.languageCode('Klingon'), '')
})

test('CPU-only: Parakeet for English and European languages, Whisper for the rest', () => {
  assert.strictEqual(pick('cpu', 'English'), 'parakeet-tdt-v2')
  assert.strictEqual(pick('cpu', 'German'), 'parakeet-tdt-v3')
  assert.strictEqual(pick('cpu', 'Japanese'), 'whisper-small')
  assert.strictEqual(pick('tiny', 'English'), 'whisper-base')
})

test('NVIDIA GPU: Parakeet on CUDA when available, else Whisper sized to the VRAM', () => {
  assert.strictEqual(pick('bigGpuParakeet', 'English'), 'parakeet-tdt-v2')
  assert.strictEqual(pick('bigGpuParakeet', 'Japanese'), 'whisper-large-v3')
  assert.strictEqual(pick('bigGpu', 'English'), 'whisper-large-v3-turbo')
  assert.strictEqual(pick('bigGpu', 'Spanish'), 'whisper-large-v3')
  assert.strictEqual(pick('smallGpu', 'English'), 'distil-large-v3')
  assert.strictEqual(pick('smallGpu', 'French'), 'whisper-medium')
})

test('older images without Parakeet keep working', () => {
  assert.strictEqual(pick('oldImage', 'English'), 'whisper-small')
  assert.ok(!m.available(hw.oldImage).some((x) => x.engine === 'sherpa'))
})

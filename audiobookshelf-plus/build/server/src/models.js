'use strict'
/**
 * Speech models the server can run, and how to pick one automatically.
 *
 * Engines:
 *  - whisper: faster-whisper (CTranslate2) running OpenAI Whisper / Distil-Whisper. GPU or CPU.
 *  - sherpa:  sherpa-onnx running NVIDIA NeMo Parakeet TDT 0.6B (int8). Near the top of the open ASR
 *             leaderboards for English (v2) and 25 European languages (v3), with punctuation and real
 *             per-token timestamps, and fast enough on a plain CPU. The same files the Android app uses.
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')

const PARAKEET_V3_LANGS = new Set(['bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'de', 'el', 'hu', 'it', 'lv', 'lt', 'mt', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv', 'ru', 'uk'])

const models = [
  {
    id: 'parakeet-tdt-v2',
    engine: 'sherpa',
    archive: 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8',
    name: 'Parakeet TDT 0.6B v2 (English)',
    description: 'NVIDIA’s English model: the most accurate here for English, with punctuation and exact word timings. Fast even without a GPU.',
    languages: 'English',
    langs: ['en'],
    sizeLabel: 'About 650 MB'
  },
  {
    id: 'parakeet-tdt-v3',
    engine: 'sherpa',
    archive: 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8',
    name: 'Parakeet TDT 0.6B v3 (25 languages)',
    description: 'Like v2 for 25 European languages (English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian…), detected automatically.',
    languages: '25 European languages',
    langs: [...PARAKEET_V3_LANGS],
    sizeLabel: 'About 670 MB'
  },
  {
    id: 'whisper-large-v3-turbo',
    engine: 'whisper',
    repo: 'mobiuslabsgmbh/faster-whisper-large-v3-turbo',
    name: 'Whisper Large v3 Turbo',
    description: 'Fast and very accurate in 99 languages. The best all-rounder with a GPU.',
    languages: '99 languages',
    sizeLabel: 'About 1.6 GB'
  },
  {
    id: 'whisper-large-v3',
    engine: 'whisper',
    repo: 'Systran/faster-whisper-large-v3',
    name: 'Whisper Large v3',
    description: 'Most accurate Whisper, best for accents and less common languages. Needs a GPU with 10 GB+ to be quick.',
    languages: '99 languages',
    sizeLabel: 'About 3 GB'
  },
  {
    id: 'distil-large-v3',
    engine: 'whisper',
    repo: 'Systran/faster-distil-whisper-large-v3',
    name: 'Distil-Whisper Large v3 (English)',
    description: 'English only: close to Large v3 accuracy at several times the speed. Good on smaller GPUs.',
    languages: 'English',
    langs: ['en'],
    sizeLabel: 'About 1.5 GB'
  },
  {
    id: 'whisper-medium',
    engine: 'whisper',
    repo: 'Systran/faster-whisper-medium',
    name: 'Whisper Medium',
    description: 'A good balance for other languages on a CPU-only server with many cores.',
    languages: '99 languages',
    sizeLabel: 'About 1.5 GB'
  },
  {
    id: 'whisper-small',
    engine: 'whisper',
    repo: 'Systran/faster-whisper-small',
    name: 'Whisper Small',
    description: 'Fast on a CPU. Fine for clearly narrated books in any language.',
    languages: '99 languages',
    sizeLabel: 'About 480 MB'
  },
  {
    id: 'whisper-base',
    engine: 'whisper',
    repo: 'Systran/faster-whisper-base',
    name: 'Whisper Base',
    description: 'Fastest, least accurate. For very small servers.',
    languages: '99 languages',
    sizeLabel: 'About 150 MB'
  }
]

const AUTO = 'auto'
const get = (id) => models.find((m) => m.id === id)

function cacheDir(m) {
  if (m.engine === 'sherpa') return path.join(config.modelsDir, 'sherpa', m.archive)
  return path.join(config.modelsDir, `models--${m.repo.replace(/\//g, '--')}`)
}

function isInstalled(m) {
  if (m.engine === 'sherpa') return fs.existsSync(path.join(cacheDir(m), 'tokens.txt'))
  const snaps = path.join(cacheDir(m), 'snapshots')
  try {
    return fs.readdirSync(snaps).some((s) => fs.existsSync(path.join(snaps, s, 'model.bin')))
  } catch (e) {
    return false
  }
}

function dirSize(dir) {
  let total = 0
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (e) {
    return 0
  }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) total += dirSize(p)
    else if (e.isFile()) total += fs.statSync(p).size
  }
  return total
}

function remove(m) {
  fs.rmSync(cacheDir(m), { recursive: true, force: true })
}

/** Engines this image can run (older probes didn't report them: assume Whisper only) */
function enginesOf(hw) {
  const e = (hw && hw.engines) || {}
  return { whisper: e.whisper !== false, sherpa: !!e.sherpa, sherpaCuda: !!e.sherpaCuda }
}

function available(hw) {
  const e = enginesOf(hw)
  return models.filter((m) => e[m.engine])
}

// ---------------------------------------------------------------- language of a book

const NAMES = {
  english: 'en', spanish: 'es', español: 'es', castellano: 'es', french: 'fr', français: 'fr', german: 'de', deutsch: 'de', italian: 'it', italiano: 'it',
  portuguese: 'pt', português: 'pt', dutch: 'nl', nederlands: 'nl', polish: 'pl', polski: 'pl', russian: 'ru', русский: 'ru', ukrainian: 'uk', swedish: 'sv', svenska: 'sv',
  danish: 'da', dansk: 'da', finnish: 'fi', suomi: 'fi', czech: 'cs', greek: 'el', hungarian: 'hu', romanian: 'ro', bulgarian: 'bg', croatian: 'hr', slovak: 'sk', slovenian: 'sl',
  estonian: 'et', latvian: 'lv', lithuanian: 'lt', maltese: 'mt', norwegian: 'no', japanese: 'ja', 日本語: 'ja', chinese: 'zh', 中文: 'zh', mandarin: 'zh', korean: 'ko', arabic: 'ar',
  hebrew: 'he', hindi: 'hi', turkish: 'tr', vietnamese: 'vi', thai: 'th', indonesian: 'id', persian: 'fa', farsi: 'fa'
}
const ISO3 = { eng: 'en', spa: 'es', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', ita: 'it', por: 'pt', dut: 'nl', nld: 'nl', pol: 'pl', rus: 'ru', ukr: 'uk', swe: 'sv', dan: 'da', fin: 'fi', cze: 'cs', ces: 'cs', gre: 'el', ell: 'el', hun: 'hu', rum: 'ro', ron: 'ro', jpn: 'ja', chi: 'zh', zho: 'zh', kor: 'ko', ara: 'ar' }

/** "English", "en-US", "eng" -> "en"; '' when unknown */
function languageCode(raw) {
  const s = String(raw || '').trim().toLowerCase()
  if (!s) return ''
  if (NAMES[s]) return NAMES[s]
  const head = s.split(/[-_ ,;(]/)[0]
  if (NAMES[head]) return NAMES[head]
  if (ISO3[head]) return ISO3[head]
  if (/^[a-z]{2}$/.test(head)) return head
  return ''
}

// ---------------------------------------------------------------- automatic choice

/**
 * The best model for this server and this book: { id, reason }.
 *   NVIDIA GPU: Parakeet on the GPU if the CUDA build of sherpa-onnx is there (English / European),
 *     else Whisper Large v3 (10 GB+, non-English) or Large v3 Turbo; small GPUs Distil-Whisper / Medium.
 *   CPU only: Parakeet for English and the 25 European languages (it beats Whisper Small/Medium on a
 *     CPU), Whisper Medium / Small / Base for other languages depending on cores and memory.
 */
function chooseModel(hw, lang) {
  const e = enginesOf(hw)
  const l = languageCode(lang)
  const en = l === 'en'
  const euro = PARAKEET_V3_LANGS.has(l)
  const unknown = !l
  const vram = (hw && hw.vramMb) || 0
  const gpu = hw && hw.cuda > 0 && config.device !== 'cpu'
  const cpus = (hw && hw.cpus) || 4
  const ram = (hw && hw.ramMb) || 8000
  const gb = (mb) => `${Math.round(mb / 1024)} GB`
  const parakeet = (why) => ({ id: en ? 'parakeet-tdt-v2' : 'parakeet-tdt-v3', reason: why })
  const langLabel = en ? 'English' : unknown ? 'books with no language set' : `this language (${l})`

  if (gpu && e.whisper) {
    if ((en || euro || unknown) && e.sherpa && e.sherpaCuda) return parakeet(`Parakeet on the GPU: the most accurate for ${langLabel}, and very fast`)
    if (vram >= 10000 && !en && !unknown) return { id: 'whisper-large-v3', reason: `GPU with ${gb(vram)}: Whisper Large v3 is the most accurate for ${langLabel}` }
    if (vram >= 5000 || vram === 0) return { id: 'whisper-large-v3-turbo', reason: `GPU${vram ? ` with ${gb(vram)}` : ''}: Whisper Large v3 Turbo is fast and very accurate` }
    if (vram >= 3000) return en ? { id: 'distil-large-v3', reason: `Small GPU (${gb(vram)}): Distil-Whisper fits and is fast for English` } : { id: 'whisper-medium', reason: `Small GPU (${gb(vram)}): Whisper Medium fits` }
    // under 3 GB: the CPU choice below
  }
  if (e.sherpa && ram >= 2500 && (en || euro || unknown)) {
    return parakeet(unknown ? 'No GPU: Parakeet v3 (English and 24 European languages) is the most accurate choice that runs well on a CPU. Set the book’s language in Audiobookshelf for others.' : `No GPU: Parakeet runs well on a CPU and is more accurate than Whisper Small/Medium for ${langLabel}`)
  }
  if (!e.whisper) return { id: 'parakeet-tdt-v3', reason: 'Only Parakeet is installed in this image' }
  if (ram < 3000) return { id: 'whisper-base', reason: `Little memory (${gb(ram)}): Whisper Base` }
  if (cpus >= 16 && ram >= 8000) return { id: 'whisper-medium', reason: `${cpus} CPU cores: Whisper Medium for ${langLabel}` }
  return { id: 'whisper-small', reason: `${cpus} CPU cores: Whisper Small for ${langLabel}` }
}

/** Next smaller model to try after running out of memory (same engine family), or null */
const STEP_DOWN = {
  'whisper-large-v3': 'whisper-large-v3-turbo',
  'whisper-large-v3-turbo': 'whisper-medium',
  'distil-large-v3': 'whisper-small',
  'whisper-medium': 'whisper-small',
  'whisper-small': 'whisper-base',
  'parakeet-tdt-v3': 'whisper-small',
  'parakeet-tdt-v2': 'whisper-small'
}
function smallerModel(id, hw) {
  const usable = available(hw).map((m) => m.id)
  let next = STEP_DOWN[id]
  while (next && !usable.includes(next)) next = STEP_DOWN[next]
  return next || null
}

/** What "Automatic" would pick, for the model list */
function autoSummary(hw) {
  const en = get(chooseModel(hw, 'en').id)
  const other = get(chooseModel(hw, 'ja').id)
  const unknown = get(chooseModel(hw, '').id)
  const parts = [`English: ${en.name}`]
  if (other.id !== en.id) parts.push(`other languages: ${other.name}`)
  if (unknown.id !== en.id) parts.push(`language not set: ${unknown.name}`)
  return parts.join(' · ')
}

function hardwareLabel(hw) {
  if (!hw) return ''
  const ram = hw.ramMb ? `${Math.round(hw.ramMb / 1024)} GB RAM` : ''
  if (hw.cuda > 0) return [hw.gpu || 'NVIDIA GPU', hw.vramMb ? `${Math.round(hw.vramMb / 1024)} GB` : '', `${hw.cpus || '?'} CPU cores`, ram].filter(Boolean).join(' · ')
  return [`CPU, ${hw.cpus || '?'} cores`, hw.avx512 ? 'AVX-512' : hw.avx2 ? 'AVX2' : '', ram].filter(Boolean).join(' · ')
}

module.exports = { smallerModel, models, get, AUTO, isInstalled, installedBytes: (m) => dirSize(cacheDir(m)), remove, available, chooseModel, autoSummary, hardwareLabel, languageCode, enginesOf, defaultModelId: () => AUTO }

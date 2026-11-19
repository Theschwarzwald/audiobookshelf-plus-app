'use strict'
const path = require('path')

const env = process.env
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v))

module.exports = {
  port: parseInt(env.PORT || '13378', 10),
  /** The real Audiobookshelf server, reachable from this container (docker network) */
  absUrl: (env.ABS_URL || 'http://audiobookshelf:80').replace(/\/+$/, ''),
  /** Audiobookshelf API key (Settings -> API Keys). Used for background jobs: reading item info, audio and ebooks. */
  absApiKey: env.ABS_API_KEY || '',
  /** ABS's ROUTER_BASE_PATH. Only used to guess where the web client lives; requests with or without it both work. */
  routerBasePath: (env.ROUTER_BASE_PATH === undefined ? '/audiobookshelf' : env.ROUTER_BASE_PATH).replace(/\/+$/, ''),
  dataDir: env.DATA_DIR || '/data',
  modelsDir: env.MODELS_DIR || '/models',
  /** auto | cuda | cpu */
  device: (env.TRANSCRIBE_DEVICE || 'auto').toLowerCase(),
  /** Only admins may start, re-transcribe or delete transcriptions (everyone with access can read them) */
  adminOnly: bool(env.TRANSCRIBE_ADMIN_ONLY, false),
  /** Start the ebook spelling check automatically when a transcription finishes */
  autoEbookCheck: bool(env.AUTO_EBOOK_CHECK, true),
  workerCmd: env.WORKER_CMD || 'python3',
  workerArgs: env.WORKER_ARGS ? env.WORKER_ARGS.split(' ') : [path.join(__dirname, '..', '..', 'worker', 'asr_worker.py')],
  cpuThreads: parseInt(env.CPU_THREADS || '0', 10),
  /** low (default): the speech worker runs at background priority so Audiobookshelf stays responsive · normal */
  priority: (env.TRANSCRIBE_PRIORITY || 'low').toLowerCase(),
  /** Automatic model: step down to a smaller model when the worker runs out of memory */
  autoStepDown: bool(env.AUTO_STEP_DOWN, true),
  /** When the GPU keeps failing (full, or CUDA stuck), carry on on the CPU instead of using up the retries */
  cpuFallback: bool(env.CPU_FALLBACK, true),
  /** A phone that is transcribing a book holds it for this long after its last check-in */
  deviceLockMs: parseInt(env.DEVICE_LOCK_MINUTES || '20', 10) * 60 * 1000,
  injectWebUi: bool(env.INJECT_WEB_UI, true),
  /** StarDict dictionaries for the e-reader, one folder per language (en/, es/, …) */
  dictionaryDir: env.DICTIONARY_DIR || '/dictionaries',
  /** Look words up on Wiktionary when no local dictionary has them */
  dictionaryOnline: bool(env.DICTIONARY_ONLINE, true),
  logLevel: env.LOG_LEVEL || 'info'
}

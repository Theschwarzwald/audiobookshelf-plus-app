'use strict'
/** Runs the Python speech worker and talks to it over JSON lines (see worker/asr_worker.py). */
const { spawn, execFile } = require('child_process')
const os = require('os')
const readline = require('readline')
const config = require('./config')
const log = require('./log')

function probe() {
  return new Promise((resolve) => {
    execFile(config.workerCmd, [...config.workerArgs, '--probe'], { timeout: 60000, env: workerEnv() }, (err, stdout) => {
      if (err) {
        log.warn(`Speech worker probe failed: ${err.message}`)
        return resolve({ cuda: 0, gpu: null, ok: false, error: err.message })
      }
      try {
        resolve({ ...JSON.parse(stdout.trim().split('\n').pop()), ok: true })
      } catch (e) {
        resolve({ cuda: 0, gpu: null, ok: false, error: 'Bad probe output' })
      }
    })
  })
}

/**
 * CPU threads for the speech worker: CPU_THREADS if set; otherwise as many as are free right now
 * (all cores on an idle server, fewer when other apps are busy), at least 2.
 */
function pickThreads() {
  if (config.cpuThreads > 0) return config.cpuThreads
  const cores = os.cpus().length || 4
  const busy = Math.round(os.loadavg()[0] || 0)
  return Math.max(2, Math.min(cores, cores - busy))
}

function workerEnv() {
  return { ...process.env, MODELS_DIR: config.modelsDir, PYTHONUNBUFFERED: '1' }
}

class AsrWorker {
  constructor() {
    this.proc = null
    this.handlers = null // { onEvent, resolve, reject }
    this.nextId = 1
    this.killed = false
    this.stderrTail = []
  }

  start() {
    this.proc = spawn(config.workerCmd, config.workerArgs, { env: workerEnv(), stdio: ['pipe', 'pipe', 'pipe'] })
    // Background priority: other apps on the server win when they need the CPU
    if (config.priority !== 'normal') {
      try {
        os.setPriority(this.proc.pid, 10)
      } catch (e) {}
    }
    const rl = readline.createInterface({ input: this.proc.stdout })
    rl.on('line', (line) => {
      let ev
      try {
        ev = JSON.parse(line)
      } catch (e) {
        return
      }
      if (this.handlers) this.handlers.onEvent(ev)
    })
    readline.createInterface({ input: this.proc.stderr }).on('line', (line) => {
      log.debug(`[worker] ${line}`)
      this.stderrTail.push(line)
      if (this.stderrTail.length > 20) this.stderrTail.shift()
    })
    this.proc.on('exit', (code, signal) => {
      const h = this.handlers
      this.handlers = null
      this.proc = null
      if (h) {
        const tail = this.stderrTail.slice(-3).join(' | ')
        // SIGKILL we didn't send, exit 137, or a memory error: the out-of-memory killer, most likely
        const oom = !this.killed && (signal === 'SIGKILL' || code === 137 || /out of memory|MemoryError|bad_alloc|CUDA out of memory/i.test(tail))
        h.reject(Object.assign(new Error(this.killed ? 'stopped' : `Speech worker exited (${signal || code})${tail ? ': ' + tail : ''}`), { stopped: this.killed, oom }))
      }
    })
    this.proc.on('error', (e) => {
      const h = this.handlers
      this.handlers = null
      if (h) h.reject(e)
    })
  }

  _request(msg, onEvent, isFinal) {
    if (!this.proc) this.start()
    return new Promise((resolve, reject) => {
      this.handlers = {
        resolve,
        reject,
        onEvent: (ev) => {
          if (ev.ev === 'error') {
            this.handlers = null
            return reject(Object.assign(new Error(ev.msg || 'Speech worker error'), { oom: /out of memory|MemoryError|bad_alloc/i.test(ev.msg || '') }))
          }
          if (isFinal(ev)) {
            this.handlers = null
            return resolve(ev)
          }
          if (onEvent) onEvent(ev)
        }
      }
      this.proc.stdin.write(JSON.stringify(msg) + '\n')
    })
  }

  /** model: an entry from models.js (whisper repo or sherpa-onnx archive) */
  load(model, device, onEvent) {
    const msg = model.engine === 'sherpa' ? { op: 'load', engine: 'sherpa', archive: model.archive } : { op: 'load', engine: 'whisper', model: model.repo }
    return this._request({ ...msg, device, threads: pickThreads() }, onEvent, (ev) => ev.ev === 'loaded')
  }

  transcribe(req, onEvent) {
    const id = this.nextId++
    return this._request({ op: 'transcribe', id, ...req }, onEvent, (ev) => ev.ev === 'done' && ev.id === id)
  }

  kill() {
    this.killed = true
    if (this.proc) this.proc.kill('SIGKILL')
  }
}

module.exports = { AsrWorker, probe, pickThreads }

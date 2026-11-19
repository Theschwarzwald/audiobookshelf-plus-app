'use strict'
/**
 * Speech models for admins (Settings → Transcription): every model with what it's best for on this
 * server's hardware, download any of them (or all) at any time in the background, remove them, and
 * re-check the hardware (also done at every start, so a new GPU or more memory is picked up).
 */
const { spawn } = require('child_process')
const os = require('os')
const config = require('./config')
const log = require('./log')
const models = require('./models')
const { probe } = require('./asrWorker')

class ModelAdmin {
  constructor(manager) {
    this.manager = manager
    this.state = new Map() // id -> { state: 'queued' | 'downloading' | 'done' | 'error', error, at }
    this.queue = []
    this.busy = false
    this.lastScan = Date.now()
  }

  hardware() {
    return this.manager.hardware
  }

  /** Re-probes GPU, CPU, memory and installed engines; the Automatic choice follows at once */
  async rescan() {
    const hw = await probe()
    if (config.device === 'cpu') hw.cuda = 0
    Object.assign(this.manager.hardware, hw)
    this.lastScan = Date.now()
    log.info(`Hardware: ${models.hardwareLabel(this.manager.hardware)}${hw.cuda > 0 ? ` · GPU ${hw.gpu}` : ''}`)
    return this.overview()
  }

  /** What Automatic picks per kind of book, so each model can say what it's recommended for */
  recommendations() {
    const hw = this.hardware()
    const kinds = [
      ['English books', 'en'],
      ['European languages', 'de'],
      ['Other languages (Japanese, Chinese, Arabic…)', 'ja'],
      ['Books with no language set', null]
    ]
    return kinds.map(([label, lang]) => ({ label, ...models.chooseModel(hw, lang) }))
  }

  overview() {
    const hw = this.hardware()
    const e = models.enginesOf(hw)
    const recs = this.recommendations()
    const list = models.models.map((m) => {
      const installed = models.isInstalled(m)
      const st = this.state.get(m.id) || null
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        languages: m.languages,
        sizeLabel: m.sizeLabel,
        engine: m.engine,
        usable: !!e[m.engine],
        installed,
        installedBytes: installed ? models.installedBytes(m) : 0,
        state: st && st.state !== 'done' ? st.state : null,
        error: st && st.state === 'error' ? st.error : null,
        recommendedFor: recs.filter((r) => r.id === m.id).map((r) => r.label)
      }
    })
    const free = (() => {
      try {
        const s = require('fs').statfsSync(config.modelsDir)
        return s.bavail * s.bsize
      } catch (e) {
        return null
      }
    })()
    return {
      hardware: { label: models.hardwareLabel(hw), gpu: hw.gpu || null, vramMb: hw.vramMb || 0, cuda: hw.cuda || 0, cpus: hw.cpus || os.cpus().length, ramMb: hw.ramMb || Math.round(os.totalmem() / 1048576), engines: e, problems: (hw.engines && hw.engines.problems) || [], scannedAt: this.lastScan },
      recommendations: recs.map((r) => ({ label: r.label, id: r.id, name: (models.get(r.id) || {}).name || r.id, reason: r.reason })),
      models: list,
      freeBytes: free,
      downloading: this.busy
    }
  }

  /** Queue models for download (they're fetched one at a time, in the background) */
  download(ids) {
    const hw = this.hardware()
    const e = models.enginesOf(hw)
    const added = []
    for (const id of ids) {
      const m = models.get(id)
      if (!m || !e[m.engine] || models.isInstalled(m)) continue
      const st = this.state.get(id)
      if (st && (st.state === 'queued' || st.state === 'downloading')) continue
      this.state.set(id, { state: 'queued', at: Date.now() })
      this.queue.push(id)
      added.push(id)
    }
    this.run()
    return added
  }

  downloadAll() {
    return this.download(models.models.map((m) => m.id))
  }

  async run() {
    if (this.busy) return
    this.busy = true
    try {
      while (this.queue.length) {
        const id = this.queue.shift()
        const m = models.get(id)
        this.state.set(id, { state: 'downloading', at: Date.now() })
        log.info(`Downloading speech model ${m.name}`)
        try {
          await this.fetch(m)
          this.state.set(id, { state: 'done', at: Date.now() })
          log.info(`Downloaded ${m.name}`)
        } catch (err) {
          this.state.set(id, { state: 'error', error: err.message, at: Date.now() })
          log.warn(`Downloading ${m.name} failed: ${err.message}`)
        }
      }
    } finally {
      this.busy = false
    }
  }

  fetch(m) {
    return new Promise((resolve, reject) => {
      const args = [...config.workerArgs, '--download', m.engine === 'sherpa' ? 'sherpa' : 'whisper', m.engine === 'sherpa' ? m.archive : m.repo]
      const p = spawn(config.workerCmd, args, { env: { ...process.env, MODELS_DIR: config.modelsDir, PYTHONUNBUFFERED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
      try {
        os.setPriority(p.pid, 10)
      } catch (e) {}
      let out = ''
      let err = ''
      p.stdout.on('data', (d) => (out += d))
      p.stderr.on('data', (d) => (err = (err + d).slice(-2000)))
      p.on('error', reject)
      p.on('exit', (code) => {
        const last = out.trim().split('\n').pop() || ''
        let ev = null
        try {
          ev = JSON.parse(last)
        } catch (e) {}
        if (code === 0 && models.isInstalled(m)) return resolve()
        reject(new Error((ev && ev.msg) || err.trim().split('\n').pop() || `exit ${code}`))
      })
    })
  }
}

module.exports = { ModelAdmin }

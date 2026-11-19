'use strict'
/**
 * Server transcription jobs, one at a time (the GPU/CPU is shared).
 *
 * Same behaviour as the phone (TranscriptionEngine.kt):
 *   pass 0: from where the listener was when they pressed Start (minus 30 s) to the end of the book
 *   pass 1: from the start of the book up to that point
 * so the part being listened to is ready first. Lines are appended as they're recognised; a paused
 * job resumes from `resumeSec` and drops any partial lines past it.
 */
const EventEmitter = require('events')
const fs = require('fs')
const os = require('os')
const path = require('path')
const config = require('./config')
const log = require('./log')
const absApi = require('./absApi')
const models = require('./models')
const lineSplitter = require('./lineSplitter')
const comparer = require('./comparer')
const ebookReader = require('./ebook/reader')
const { AsrWorker } = require('./asrWorker')
const { STATUS, toJs, defaultMeta } = require('./store')

class StoppedError extends Error {}

class TranscriptionManager extends EventEmitter {
  constructor(store, hardware) {
    super()
    this.store = store
    this.hardware = hardware || { cuda: 0 }
    this.queue = [] // { type: 'transcribe', key, background }
    // Spelling checks against the ebook run in their own lane, next to transcription (they use the CPU,
    // transcription the GPU): they used to wait behind every book queued for transcription, for days
    this.ebookQueue = []
    this.ebookCurrent = null
    this.ebookRunning = false
    this.backgroundKeys = new Set() // queued by the library watcher / Transcribe everything
    this.current = null // { type, key, worker, stop: null | 'pause' | 'cancel' }
    this.retrying = new Map() // key -> timer: waiting a moment before trying again after a failure
    this.running = false
  }

  get hasGpu() {
    return config.device === 'cuda' || (config.device === 'auto' && this.hardware.cuda > 0)
  }

  isBusy(key) {
    if (this.retrying.has(key)) return true
    return (this.current && this.current.type === 'transcribe' && this.current.key === key) || this.queue.some((j) => j.type === 'transcribe' && j.key === key)
  }

  /** A job marked running/queued that isn't actually in the queue (crash) is reported as paused. */
  liveMeta(meta) {
    if (!meta) return meta
    if (meta.origin !== 'device' && (meta.status === STATUS.RUNNING || meta.status === STATUS.QUEUED) && !this.isBusy(meta.key)) meta.status = STATUS.PAUSED
    if ((meta.ebookCheck === 'running' || meta.ebookCheck === 'queued') && !this._ebookBusy(meta.key)) meta.ebookCheck = 'none'
    return meta
  }

  _ebookBusy(key) {
    return this.ebookCurrent === key || this.ebookQueue.includes(key)
  }

  emitUpdate(meta) {
    this.emit('update', toJs(meta))
  }

  // ---------------------------------------------------------------- control

  /** "auto" (or nothing): the best model for this server's hardware and the book's language */
  resolveModel(modelId, item) {
    const usable = models.available(this.hardware)
    const picked = usable.find((m) => m.id === modelId)
    if (picked && modelId !== models.AUTO) return { model: picked, reason: null }
    const lang = item && item.media && item.media.metadata && item.media.metadata.language
    const choice = models.chooseModel(this.hardware, lang)
    return { model: models.get(choice.id) || usable[0], reason: choice.reason }
  }

  isBackground(key) {
    return this.backgroundKeys.has(key)
  }

  async start({ key, item, modelId, restart, startSec, username, background }) {
    const { model, reason } = this.resolveModel(modelId, item)
    if (restart && this.isBusy(key)) await this.stop(key, 'cancel')
    if (this.isBusy(key)) return this.store.getMeta(key)

    const existing = this.store.getMeta(key)
    let meta
    const resumable =
      existing &&
      !restart &&
      existing.status !== STATUS.DONE &&
      existing.modelId === model.id &&
      existing.durationSec > 0 &&
      (existing.linesCount > 0 || existing.pass > 0 || existing.resumeSec > existing.firstStartSec)
    if (resumable) {
      meta = existing
      if (meta.origin === 'device') log.info(`Continuing ${key} on the server (started on ${meta.deviceName || 'a phone'})`)
      meta.origin = 'server'
      meta.lock = null
    } else {
      if (!item || item.mediaType !== 'book') throw Object.assign(new Error('Only books can be transcribed'), { status: 400 })
      const tracks = absApi.tracksOf(item)
      if (!tracks.length) throw Object.assign(new Error('This item has no audio tracks'), { status: 400 })
      const duration = (item.media && item.media.duration) || tracks.reduce((n, t) => n + t.duration, 0)
      if (existing) this.store.delete(key)
      const position = (Number(startSec) || 0) - 30
      const firstStart = position > 60 && position < duration - 60 ? position : 0
      meta = Object.assign(defaultMeta(key), {
        title: (item.media && item.media.metadata && item.media.metadata.title) || '',
        modelId: model.id,
        durationSec: duration,
        firstStartSec: firstStart,
        resumeSec: firstStart,
        chapters: ((item.media && item.media.chapters) || []).map((c) => ({ start: c.start, end: c.end, title: c.title || '' })),
        tracks,
        revision: this.store.nextRevisionBase(key),
        createdBy: username || null,
        modelReason: reason,
        language: (item.media && item.media.metadata && item.media.metadata.language) || null
      })
    }
    meta.status = STATUS.QUEUED
    meta.error = null
    this.store.saveMeta(meta)
    meta.background = !!background
    this.store.saveMeta(meta)
    // Someone listening asked for it: ahead of the background (library-wide) jobs. Background: at the end.
    if (background) {
      this.backgroundKeys.add(key)
      this.queue.push({ type: 'transcribe', key, background: true })
    } else {
      this.backgroundKeys.delete(key)
      const firstBg = this.queue.findIndex((j) => j.background)
      if (firstBg >= 0) this.queue.splice(firstBg, 0, { type: 'transcribe', key })
      else this.queue.push({ type: 'transcribe', key })
    }
    this.emitUpdate(meta)
    this._kick()
    return meta
  }

  /** Pause keeps what's done; cancel deletes it. Resolves once the job has stopped. */
  async stop(key, how) {
    if (this.retrying.has(key)) {
      clearTimeout(this.retrying.get(key))
      this.retrying.delete(key)
      const m = this.store.getMeta(key)
      if (m && how === 'pause') {
        m.status = STATUS.PAUSED
        this.store.bump(m)
        this.emitUpdate(m)
      }
    }
    const qIdx = this.queue.findIndex((j) => j.type === 'transcribe' && j.key === key)
    if (qIdx >= 0) this.queue.splice(qIdx, 1)
    if (this.current && this.current.type === 'transcribe' && this.current.key === key) {
      this.current.stop = how
      if (this.current.worker) this.current.worker.kill()
      await new Promise((resolve) => {
        const check = () => (this.current && this.current.key === key && this.current.type === 'transcribe' ? setTimeout(check, 100) : resolve())
        check()
      })
    } else if (qIdx >= 0) {
      const meta = this.store.getMeta(key)
      if (meta && how === 'pause') {
        meta.status = STATUS.PAUSED
        this.store.bump(meta)
        this.emitUpdate(meta)
      }
    }
    if (how === 'cancel') this.store.delete(key)
  }

  /**
   * Book analysis: everything that runs after a transcription finishes, again, without transcribing the audio
   * again. The ebook is read afresh and compared with the transcript (spelling suggestions, with earlier
   * Ignore choices kept), the book's text for Karaoke / read along is rebuilt, the .lrc files are written
   * again, and phones fetch the result and line the book up with the narration again.
   */
  requestAnalysis(key) {
    if (!this.analysisWanted) this.analysisWanted = new Set()
    this.analysisWanted.add(key)
    try {
      return this.requestEbookCheck(key, { urgent: true, analysis: true })
    } catch (e) {
      this.analysisWanted.delete(key)
      throw e
    }
  }

  /** urgent: someone asked for it (button or menu): goes ahead of the background checks */
  requestEbookCheck(key, { urgent = false, analysis = false } = {}) {
    const meta = this.store.getMeta(key)
    if (!meta) throw Object.assign(new Error('Transcribe the book first'), { status: 400 })
    if (meta.status !== STATUS.DONE) throw Object.assign(new Error('Wait until the transcription is finished'), { status: 400 })
    // (an analysis asked for while a plain check of the same book runs goes again straight after it)
    if (this.ebookCurrent !== key || analysis) {
      const at = this.ebookQueue.indexOf(key)
      if (at >= 0 && urgent) this.ebookQueue.splice(at, 1)
      if (at < 0 || urgent) urgent ? this.ebookQueue.unshift(key) : this.ebookQueue.push(key)
    }
    if (analysis) meta.analysis = 'queued'
    meta.ebookCheck = this.ebookCurrent === key && !analysis ? 'running' : 'queued'
    const running = meta.ebookCheck === 'running'
    meta.ebookCheckMessage = analysis
      ? 'Waiting to analyse the book…'
      : running
        ? 'Comparing with the ebook…'
        : 'Waiting to compare with the ebook…'
    this.store.saveMeta(meta)
    this.emitUpdate(meta)
    this._kickEbook()
    return meta
  }

  /** The spelling-check lane: one book at a time, alongside transcription */
  async _kickEbook() {
    if (this.ebookRunning) return
    this.ebookRunning = true
    try {
      while (this.ebookQueue.length) {
        const key = this.ebookQueue.shift()
        this.ebookCurrent = key
        try {
          await this._runEbookCheck(key)
        } catch (e) {
          log.error(`Ebook check ${key} crashed`, e)
        }
        this.ebookCurrent = null
      }
    } finally {
      this.ebookCurrent = null
      this.ebookRunning = false
    }
  }

  /** After a restart: carry on with server jobs that were running or waiting. */
  recover() {
    for (const meta of this.store.listAll()) {
      if (meta.origin === 'device') continue
      if (meta.status === STATUS.RUNNING || meta.status === STATUS.QUEUED) {
        meta.status = STATUS.QUEUED
        this.store.saveMeta(meta)
        this.queue.push({ type: 'transcribe', key: meta.key, background: !!meta.background })
        if (meta.background) this.backgroundKeys.add(meta.key)
        log.info(`Resuming transcription of "${meta.title}" after restart`)
      }
      if ((meta.ebookCheck === 'running' || meta.ebookCheck === 'queued') && meta.status === STATUS.DONE) {
        if (!this.ebookQueue.includes(meta.key)) this.ebookQueue.push(meta.key)
        meta.ebookCheck = 'queued'
        this.store.saveMeta(meta)
      } else if (meta.ebookCheck === 'running' || meta.ebookCheck === 'queued') {
        meta.ebookCheck = 'none'
        this.store.saveMeta(meta)
      }
    }
    this._kick()
    this._kickEbook()
    // Spelling against the ebook: finished books never compared (or interrupted by a restart) get it
    // in the background, a few minutes after start and then every few hours
    if (!this._ebookTimer) {
      const sweep = () => this.ebookSweep()
      setTimeout(sweep, 2 * 60 * 1000).unref()
      this._ebookTimer = setInterval(sweep, 60 * 60 * 1000)
      this._ebookTimer.unref()
    }
  }

  /** Queues the ebook check for every finished transcript that hasn't had one (one at a time, behind other work) */
  ebookSweep() {
    if (!config.autoEbookCheck) return 0
    let n = 0
    for (const meta of this.store.listAll()) {
      if (meta.status !== STATUS.DONE) continue // transcripts made on phones too: the check always runs here
      const age = Date.now() - (meta.updatedAt || 0)
      // failed: try again a day later; no ebook then: look again every few hours (one may have been added)
      const retry = (meta.ebookCheck === 'error' && age > 24 * 60 * 60 * 1000) || (meta.ebookCheck === 'unavailable' && age > 3 * 60 * 60 * 1000)
      if (meta.ebookCheck && meta.ebookCheck !== 'none' && !retry) continue
      try {
        this.requestEbookCheck(meta.key)
        n++
      } catch (e) {}
    }
    if (n) log.info(`Ebook spelling check: ${n} finished transcript${n === 1 ? '' : 's'} queued`)
    return n
  }

  /** Put a book back in the queue after [ms] (a failure that may go away by itself) */
  retryLater(key, ms, background) {
    if (this.retrying.has(key)) clearTimeout(this.retrying.get(key))
    const t = setTimeout(() => {
      this.retrying.delete(key)
      const meta = this.store.getMeta(key)
      if (!meta || meta.status !== STATUS.QUEUED) return
      if (this.queue.some((j) => j.type === 'transcribe' && j.key === key)) return
      if (background) {
        this.backgroundKeys.add(key)
        this.queue.push({ type: 'transcribe', key, background: true })
      } else {
        const firstBg = this.queue.findIndex((j) => j.background)
        if (firstBg >= 0) this.queue.splice(firstBg, 0, { type: 'transcribe', key })
        else this.queue.push({ type: 'transcribe', key })
      }
      this._kick()
    }, ms)
    if (t.unref) t.unref()
    this.retrying.set(key, t)
  }

  /** Background (library) jobs waiting or running, for the library's batch feeder */
  backgroundLoad() {
    let n = this.queue.filter((j) => j.background).length + [...this.retrying.keys()].filter((k) => this.backgroundKeys.has(k)).length
    if (this.current && this.current.background) n++
    return n
  }

  // ---------------------------------------------------------------- worker loop

  async _kick() {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.length) {
        const job = this.queue.shift()
        this.current = { ...job, worker: null, stop: null }
        try {
          if (job.type === 'transcribe') await this._runTranscribe(job.key)
        } catch (e) {
          log.error(`Job ${job.type} ${job.key} crashed`, e)
        }
        this.current = null
      }
    } finally {
      this.current = null
      this.running = false
    }
  }

  async _runTranscribe(key) {
    const meta = this.store.getMeta(key)
    if (!meta) return
    meta.status = STATUS.RUNNING
    meta.error = null
    this.store.saveMeta(meta)
    this.emitUpdate(meta)
    const cur = this.current
    try {
      await this._engine(meta, cur)
      meta.status = STATUS.DONE
      meta.retries = 0
      meta.oomCount = 0
      meta.gpuFails = 0
      meta.forceCpu = false
      meta.notice = null
      meta.phase = ''
      meta.processedSec = meta.durationSec
      meta.doneSec = meta.durationSec
      log.info(`Finished transcribing "${meta.title}" (${meta.linesCount} lines)`)
      if (this.lrc) this.lrc.exportSoon(key, 500) // <audio>.lrc and <audio>_karaoke.lrc next to the audio
    } catch (e) {
      if (this.shuttingDown) return // leave it "running" so it carries on after the restart
      // Out of memory: the automatic choice steps down at once; a chosen model gets a few more tries first
      // (the worker already retried with smaller batches), then steps down too rather than failing
      // The GPU keeps failing (full of other apps' work, or its driver got stuck): after a couple of tries the
      // book carries on on the CPU from the same point, slower but moving, instead of using up its retries.
      // Other books use the CPU too for a while, then the GPU is tried again
      const gpuFailed = cur.device === 'cuda' && !cur.stop && !(e instanceof StoppedError) && !e.stopped && isGpuError(e)
      if (gpuFailed) meta.gpuFails = (meta.gpuFails || 0) + 1
      if (gpuFailed && config.cpuFallback && meta.gpuFails >= GPU_FAILS_BEFORE_CPU) {
        this.gpuBusyUntil = Date.now() + GPU_REST_MS
        log.warn(`"${meta.title}": the GPU keeps failing (${shortError(e)}); carrying on on the CPU. The GPU is tried again in ${Math.round(GPU_REST_MS / 60000)} min`)
        meta.forceCpu = true
        meta.gpuFails = 0
        meta.oomCount = 0
        meta.retries = 0
        meta.status = STATUS.QUEUED
        meta.error = null
        meta.notice = 'The GPU is busy: carrying on on the processor (slower)'
        this.store.saveMeta(meta)
        this.emitUpdate(meta)
        if (cur.worker) cur.worker.kill()
        this.queue.unshift({ type: 'transcribe', key })
        return
      }
      if (e.oom && !cur.stop) meta.oomCount = (meta.oomCount || 0) + 1
      const stepDown = e.oom && config.autoStepDown && !cur.stop && (meta.modelReason || meta.oomCount >= 3)
      const smaller = stepDown ? models.smallerModel(meta.modelId, this.hardware) : null
      if (cur.stop || e instanceof StoppedError || e.stopped) {
        meta.status = STATUS.PAUSED
      } else if (!smaller && isTransient(e) && (meta.retries || 0) < MAX_RETRIES) {
        // Out of memory, the worker dying, Audiobookshelf briefly unreachable: carry on by itself
        meta.retries = (meta.retries || 0) + 1
        const wait = Math.min(15 * 60, 20 * 2 ** (meta.retries - 1)) * 1000
        log.warn(`"${meta.title}" stopped (${e.message}); trying again in ${Math.round(wait / 1000)} s (attempt ${meta.retries} of ${MAX_RETRIES})`)
        meta.status = STATUS.QUEUED
        meta.error = null
        meta.notice = `Stopped (${shortError(e)}); trying again by itself`
        this.store.saveMeta(meta)
        this.emitUpdate(meta)
        if (cur.worker) cur.worker.kill()
        this.retryLater(key, wait, !!meta.background)
        return
      } else if (smaller) {
        // Automatic choice ran out of memory: carry on from the same point with the next smaller model
        const from = models.get(meta.modelId)
        const to = models.get(smaller)
        log.warn(`"${meta.title}": ${from ? from.name : meta.modelId} ran out of memory, continuing with ${to ? to.name : smaller}`)
        meta.modelId = smaller
        meta.modelReason = `${to ? to.name : smaller}: stepped down automatically because the server ran out of memory`
        meta.oomCount = 0
        meta.status = STATUS.QUEUED
        meta.error = null
        this.store.saveMeta(meta)
        this.emitUpdate(meta)
        if (cur.worker) cur.worker.kill()
        this.queue.unshift({ type: 'transcribe', key })
        return
      } else {
        log.error(`Transcription of "${meta.title}" failed: ${e.message}`)
        meta.status = STATUS.ERROR
        meta.error = e.message
        meta.transient = isTransient(e) // the library sweeper tries these again later
        meta.failedAt = Date.now()
      }
    } finally {
      if (cur.worker) cur.worker.kill()
    }
    if (cur.stop === 'cancel') {
      this.store.delete(key)
      this.emit('update', { key, status: STATUS.NONE, cancelled: true })
      return
    }
    meta.speed = meta.status === STATUS.DONE ? meta.speed : 0
    this.store.bump(meta)
    this.emitUpdate(meta)
    if (meta.status === STATUS.DONE && config.autoEbookCheck && meta.ebookCheck === 'none') {
      try {
        this.requestEbookCheck(key)
      } catch (e) {}
    }
  }

  async _engine(meta, cur) {
    const model = models.get(meta.modelId)
    if (!model) throw new Error(`Unknown model ${meta.modelId}`)

    // Fresh track list every run (files may have been re-scanned since the job was created)
    const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(meta.libraryItemId || meta.key)}?expanded=1`)
    if (!item) throw new Error('The book is no longer in Audiobookshelf')
    const tracks = absApi.tracksOf(item)
    if (!tracks.length) throw new Error('This item has no audio tracks')
    meta.tracks = tracks

    const worker = new AsrWorker()
    cur.worker = worker
    if (cur.stop) throw new StoppedError()

    meta.phase = models.isInstalled(model) ? 'transcribing' : 'model'
    meta.phaseProgress = 0
    this.store.saveMeta(meta)
    this.emitUpdate(meta)
    // the processor when the GPU kept failing for this book, or for the last little while
    const gpuResting = Date.now() < (this.gpuBusyUntil || 0)
    const device = config.device !== 'cpu' && (meta.forceCpu || gpuResting) ? 'cpu' : config.device
    const loaded = await worker.load(model, device, (ev) => {
      if (ev.ev === 'downloading') {
        meta.phase = 'model'
        this.emitUpdate(meta)
      }
    })
    cur.device = loaded.device
    const why = device === 'cpu' && config.device !== 'cpu' ? ' — the GPU is busy, so on the processor for now' : ''
    log.info(`Transcribing "${meta.title}" with ${model.name} on ${loaded.device} (${loaded.compute})${meta.modelReason ? ` — ${meta.modelReason}` : ''}${why}`)
    meta.phase = 'transcribing'
    meta.phaseProgress = 0
    this.store.saveMeta(meta)
    this.emitUpdate(meta)

    const startedAt = Date.now()
    const startedDoneSec = doneSec(meta)
    let lastUpdate = 0
    const tick = (force) => {
      const now = Date.now()
      if (!force && now - lastUpdate < 1500) return
      lastUpdate = now
      const wall = (now - startedAt) / 1000
      meta.doneSec = doneSec(meta)
      meta.speed = wall > 0 ? (meta.doneSec - startedDoneSec) / wall : 0
      this.store.saveMeta(meta)
      this.emitUpdate(meta)
    }

    const headers = absApi.ffmpegHeaders()
    while (meta.pass <= 1) {
      const rangeStart = meta.pass === 0 ? meta.firstStartSec : 0
      const rangeEnd = meta.pass === 0 ? Number.MAX_VALUE : meta.firstStartSec
      if (rangeEnd - rangeStart > 0.5) {
        if (meta.resumeSec < rangeStart) meta.resumeSec = rangeStart
        meta.linesCount = this.store.truncateLinesInRange(meta.key, meta.resumeSec, rangeEnd)

        for (const track of tracks.slice().sort((a, b) => a.startOffset - b.startOffset)) {
          const trackEnd = track.startOffset + track.duration
          if (meta.resumeSec >= trackEnd - 0.5) continue
          if (track.startOffset >= rangeEnd) break
          if (cur.stop) throw new StoppedError()

          const localStart = Math.max(0, meta.resumeSec - track.startOffset)
          const localEnd = Math.min(track.duration, rangeEnd - track.startOffset)
          // the file itself when this container can see it (same library mount), otherwise through Audiobookshelf
          const url = track.path && fs.existsSync(track.path) ? track.path : await absApi.serviceUrl(track.source)
          await worker.transcribe({ url, headers, start: localStart, end: localEnd, language: meta.language || null }, (ev) => {
            if (ev.ev === 'language') {
              meta.language = ev.language
              log.info(`"${meta.title}": detected language ${ev.language} (${Math.round((ev.probability || 0) * 100)}%)`)
            } else if (ev.ev === 'segment') {
              const words = (ev.words || []).map((w) => ({ w: w.w, s: track.startOffset + w.s, e: track.startOffset + w.e }))
              const segStart = track.startOffset + ev.start
              const segEnd = track.startOffset + ev.end
              if (segStart >= rangeEnd) return // the other pass covers it
              const lines = lineSplitter.split(words, segStart, segEnd).filter((l) => l.start < rangeEnd)
              this.store.appendLines(meta.key, lines)
              meta.linesCount += lines.length
              meta.resumeSec = Math.min(segEnd, rangeEnd)
              meta.processedSec = segEnd
              tick(false)
            } else if (ev.ev === 'notice') {
              meta.notice = ev.msg
              log.warn(`"${meta.title}": ${ev.msg}`)
              this.emitUpdate(meta)
            } else if (ev.ev === 'progress') {
              const t = track.startOffset + ev.t
              meta.processedSec = t
              // Silence counts as done too, so progress and resume points move through long pauses
              meta.resumeSec = Math.max(meta.resumeSec, Math.min(t, rangeEnd))
              tick(false)
            }
          })
          if (cur.stop) throw new StoppedError()
          meta.resumeSec = Math.min(trackEnd, rangeEnd)
          tick(true)
        }
      }
      meta.pass += 1
      meta.resumeSec = 0
      meta.doneSec = doneSec(meta)
      this.store.saveMeta(meta)
    }
  }

  // ---------------------------------------------------------------- ebook check

  async _runEbookCheck(key) {
    const meta = this.store.getMeta(key)
    if (!meta || meta.status !== STATUS.DONE) return
    const was = meta.ebookCheck
    const analysis = !!(this.analysisWanted && this.analysisWanted.delete(key))
    meta.ebookCheck = 'running'
    meta.ebookCheckMessage = analysis ? 'Analysing the book: reading the ebook and comparing it with the narration…' : 'Comparing with the ebook…'
    if (analysis) meta.analysis = 'running'
    this.store.saveMeta(meta)
    this.emitUpdate(meta)
    const tmp = path.join(os.tmpdir(), `abs-ebook-${process.pid}-${Date.now()}.bin`)
    try {
      const count = await this._ebookCheck(meta, tmp)
      meta.ebookCheck = 'done'
      meta.ebookSuggestions = count
    } catch (e) {
      if (e.noEbook) {
        meta.ebookCheck = 'unavailable'
        meta.ebookCheckMessage = e.message
      } else {
        log.error(`Ebook check for "${meta.title}" failed`, e)
        meta.ebookCheck = 'error'
        meta.ebookCheckMessage = `Ebook check failed: ${e.message}`
      }
    } finally {
      fs.rmSync(tmp, { force: true })
    }
    if (!this.store.getMeta(key)) return // deleted meanwhile
    if (analysis) {
      // the rest of what a finished transcription gets: the .lrc files next to the audio, and a new revision
      // (bump) so phones fetch the new book text and line the book up with the narration again
      if (this.lrc) this.lrc.exportSoon(key, 500)
      meta.analysis = 'done'
      meta.analysisAt = Date.now()
      const what = meta.ebookCheck === 'unavailable' ? `no ebook to compare (${meta.ebookCheckMessage})` : meta.ebookCheckMessage
      meta.ebookCheckMessage = `Book analysis done · ${what}`
      log.info(`Book analysis for "${meta.title}": ${what}`)
      this.store.bump(meta)
      this.emitUpdate(meta)
      return
    }
    // still no ebook (a background recheck): nothing for phones to fetch again
    if (was === 'unavailable' && meta.ebookCheck === 'unavailable') this.store.saveMeta(meta)
    else this.store.bump(meta)
    this.emitUpdate(meta)
  }

  async _ebookCheck(meta, tmp) {
    const noEbook = (msg) => Object.assign(new Error(msg), { noEbook: true })
    const itemId = meta.libraryItemId || meta.key
    const item = await absApi.serviceJson(`/api/items/${encodeURIComponent(itemId)}?expanded=1`)
    if (!item) throw noEbook('The book is no longer in Audiobookshelf')

    const candidates = []
    const primary = item.media && item.media.ebookFile
    if (primary) {
      const name = (primary.metadata && primary.metadata.filename) || 'ebook'
      const ext = ebookReader.extOf(name) || String(primary.ebookFormat || '').toLowerCase()
      if (ebookReader.supportedExtensions.has(ext)) candidates.push({ name, ext, path: `/api/items/${itemId}/ebook` })
    }
    for (const f of item.libraryFiles || []) {
      if (primary && f.ino === primary.ino) continue
      const name = f.metadata && f.metadata.filename
      if (!name) continue
      const ext = ebookReader.extOf(name)
      if (!ebookReader.supportedExtensions.has(ext)) continue
      candidates.push({ name, ext, path: `/api/items/${itemId}/file/${f.ino}` })
    }
    const rank = (ext) => {
      const i = ebookReader.priority.indexOf(ext)
      return i < 0 ? 99 : i
    }
    candidates.sort((a, b) => rank(a.ext) - rank(b.ext))
    if (!candidates.length) throw noEbook('No ebook in Audiobookshelf for this book')

    const problems = []
    let sections = null
    let title = null
    for (const c of candidates) {
      fs.rmSync(tmp, { force: true })
      try {
        if (!(await absApi.download(c.path, tmp)) || fs.statSync(tmp).size === 0) {
          problems.push(`${c.name}: couldn't download`)
          continue
        }
        sections = await ebookReader.read(tmp)
        title = c.name
        break
      } catch (e) {
        problems.push(e instanceof ebookReader.UnsupportedEbookError ? `${c.name}: ${e.message}` : `${c.name}: couldn't read the file (${e.message})`)
      }
    }
    if (!sections) throw noEbook(problems.join('; ') || 'No readable ebook found')

    const lines = this.store.readAllLines(meta.key)
    if (!lines.length) throw new Error('The transcript is empty')
    const result = comparer.compare(lines, meta.chapters || [], sections)
    // spellings ignored before stay ignored (same place, same words)
    const before = this.store.getEbookCheck(meta.key)
    if (before && Array.isArray(before.suggestions)) {
      const ignored = new Map(before.suggestions.filter((s) => s.status === 'ignored').map((s) => [s.id, s]))
      for (const s of result.suggestions) {
        const old = ignored.get(s.id)
        if (old && old.heard === s.heard && old.ebook === s.ebook) s.status = 'ignored'
      }
    }
    this.store.saveEbookCheck(meta.key, comparer.resultToJson(result, title))
    this.store.saveEbookText(meta.key, ebookParagraphs(sections, title))
    const pct = result.transcriptWords > 0 ? Math.floor((result.matchedWords * 100) / result.transcriptWords) : 0
    meta.ebookCheckMessage = `Compared with ${title || 'the ebook'} · ${pct}% of words match`
    return result.suggestions.filter((x) => (x.status || 'pending') === 'pending').length
  }
}

/**
 * The ebook's text as paragraphs, for the karaoke view: { ebookTitle, paragraphs: [{ t, h }] }
 * (h = heading). Same shape on the phone (EbookCheckRunner.kt).
 */
function ebookParagraphs(sections, title) {
  const paragraphs = []
  for (const sec of sections) {
    const parts = sec.text
      .split('\n')
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    parts.forEach((t, i) => {
      const heading = (i === 0 && sec.title && t === sec.title.trim()) || (t.length <= 60 && !/[.!?…:;,"”’)]$/.test(t) && t.split(' ').length <= 8)
      paragraphs.push(heading ? { t, h: true } : { t })
    })
  }
  return { ebookTitle: title || null, paragraphs }
}

/** Seconds of the book transcribed so far, across both passes. */
const MAX_RETRIES = Math.max(1, parseInt(process.env.TRANSCRIBE_RETRIES || '8', 10))
/** GPU failures on one book before it carries on on the CPU, and how long other books then skip the GPU */
const GPU_FAILS_BEFORE_CPU = Math.max(1, parseInt(process.env.GPU_FAILS_BEFORE_CPU || '2', 10))
const GPU_REST_MS = Math.max(1, parseInt(process.env.GPU_REST_MINUTES || '30', 10)) * 60 * 1000

/** The GPU itself failed (out of its memory, or CUDA gave up), as opposed to a bad file or network trouble */
function isGpuError(e) {
  if (!e) return false
  if (e.oom) return true
  return /CUDA|cuBLAS|cudnn|invalid device|device ordinal|out of memory/i.test(String(e.message || e))
}

/** Failures worth trying again without anyone doing anything */
function isTransient(e) {
  if (!e) return false
  if (e.oom) return true
  const m = String(e.message || e)
  return /out of memory|CUDA|cuBLAS|cudnn|Speech worker exited|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|network|timed? ?out|ffmpeg failed|503|502|504|Server returned 5/i.test(m)
}

function shortError(e) {
  const m = String((e && e.message) || e)
  if (/out of memory/i.test(m)) return 'the GPU ran out of memory'
  if (/Speech worker exited/i.test(m)) return 'the speech worker stopped'
  return m.length > 80 ? m.slice(0, 77) + '…' : m
}

function doneSec(meta) {
  const firstPassLen = Math.max(0, meta.durationSec - meta.firstStartSec)
  let v
  if (meta.pass === 0) v = meta.resumeSec - meta.firstStartSec
  else if (meta.pass === 1) v = firstPassLen + meta.resumeSec
  else v = meta.durationSec
  return Math.min(meta.durationSec, Math.max(0, v))
}

module.exports = { TranscriptionManager, doneSec, ebookParagraphs }

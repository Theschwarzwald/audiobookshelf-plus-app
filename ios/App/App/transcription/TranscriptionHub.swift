//
//  TranscriptionHub.swift
//  ABS+ on-device transcription
//
//  Port of TranscriptionHub + the work loop of Android's TranscriptionService.kt.
//  Differs from Android: there is no foreground service on iOS. Jobs run on a background queue while
//  the app is open, pause cleanly when it goes to the background or the phone gets hot, and continue
//  later (see TranscriptionBackground.swift).
//

import Foundation

enum TxPauseReason: String {
    /// The app went to the background (iOS doesn't let it keep transcribing)
    case background
    /// The background processing time iOS gave us is over
    case expired
    /// ProcessInfo.thermalState is .serious or worse
    case hot

    var message: String {
        switch self {
        case .background, .expired:
            return "Paused: iPhone only transcribes while ABS+ is open. It continues when you open the app again, or while the phone is charging and not in use."
        case .hot:
            return "Paused because the phone got too hot. It continues when it has cooled down."
        }
    }
}

final class TranscriptionHub {
    static let shared = TranscriptionHub()

    enum Job: Equatable {
        case transcribe(String)
        case downloadModel(String)

        var cancelId: String {
            switch self {
            case .transcribe(let key): return key
            case .downloadModel(let id): return "model:" + id
            }
        }
    }

    private let lock = NSRecursiveLock()
    private var queue: [Job] = []
    private var current: Job?
    private var cancelFlags = Set<String>()
    /// Transcripts whose job should delete everything once it stops (Cancel, not Pause)
    private var discardOnStop = Set<String>()
    /// Why a job was stopped by the system rather than the user
    private var pauseReasons: [String: TxPauseReason] = [:]
    private var workerRunning = false
    private let workQueue = DispatchQueue(label: "abs-transcriber", qos: .utility)

    private var listeners: [UUID: (String, [String: Any]) -> Void] = [:]

    private let store = TranscriptStore.shared
    private let models = TxModelManager.shared

    // MARK: listeners

    @discardableResult
    func addListener(_ l: @escaping (String, [String: Any]) -> Void) -> UUID {
        let id = UUID()
        lock.lock()
        listeners[id] = l
        lock.unlock()
        return id
    }

    func removeListener(_ id: UUID) {
        lock.lock()
        listeners.removeValue(forKey: id)
        lock.unlock()
    }

    func emit(_ event: String, _ data: [String: Any]) {
        lock.lock()
        let ls = Array(listeners.values)
        lock.unlock()
        ls.forEach { $0(event, data) }
    }

    // MARK: state

    var currentJob: Job? {
        lock.lock()
        defer { lock.unlock() }
        return current
    }

    /// Transcribing this book now or queued to (Android: currentJob/queue checks)
    func isTranscribing(_ key: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return current == .transcribe(key) || queue.contains(.transcribe(key))
    }

    var hasTranscribeWork: Bool {
        lock.lock()
        defer { lock.unlock() }
        if case .transcribe = current { return true }
        return queue.contains { if case .transcribe = $0 { return true } else { return false } }
    }

    var hasAnyWork: Bool {
        lock.lock()
        defer { lock.unlock() }
        return current != nil || !queue.isEmpty
    }

    func isCancelled(_ id: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return cancelFlags.contains(id)
    }

    func pauseReason(_ key: String) -> TxPauseReason? {
        lock.lock()
        defer { lock.unlock() }
        return pauseReasons[key]
    }

    // MARK: control

    func enqueue(_ job: Job) {
        lock.lock()
        if current != job && !queue.contains(job) { queue.append(job) }
        cancelFlags.remove(job.cancelId)
        if case .transcribe(let key) = job { pauseReasons.removeValue(forKey: key) }
        let start = !workerRunning
        if start { workerRunning = true }
        lock.unlock()
        if start { workQueue.async { [weak self] in self?.workLoop() } }
    }

    /// Pause keeps what's done for Resume
    func cancel(_ id: String) {
        lock.lock()
        cancelFlags.insert(id)
        queue.removeAll { $0.cancelId == id }
        lock.unlock()
    }

    /// Cancel = stop and delete the partial transcript
    func cancelAndDiscard(_ key: String) {
        lock.lock()
        discardOnStop.insert(key)
        lock.unlock()
        cancel(key)
    }

    /// The system wants the work stopped (background, heat, end of background time).
    /// Running and queued transcriptions are paused with that reason (and resume automatically later);
    /// a model download is stopped too (its partial files are kept, so it continues later).
    /// Returns the keys of the transcriptions that were stopped.
    @discardableResult
    func pauseAll(reason: TxPauseReason) -> [String] {
        lock.lock()
        var keys: [String] = []
        var queuedKeys: [String] = []
        for j in queue {
            switch j {
            case .transcribe(let k): queuedKeys.append(k)
            case .downloadModel(let id): TranscriptionBackground.shared.rememberModelDownload(id)
            }
        }
        queue.removeAll()
        if let c = current {
            if case .transcribe(let k) = c {
                pauseReasons[k] = reason
                keys.append(k)
            }
            cancelFlags.insert(c.cancelId)
            if case .downloadModel(let id) = c { TranscriptionBackground.shared.rememberModelDownload(id) }
        }
        lock.unlock()
        // Queued ones never started: mark them paused right away
        for k in queuedKeys {
            if let m = store.getMeta(k), m.status == TranscriptStatus.queued || m.status == TranscriptStatus.running {
                m.status = TranscriptStatus.paused
                m.error = reason.message
                store.saveMeta(m)
                emit("onTranscriptionUpdate", m.toJs())
            }
            TranscriptionBackground.shared.markAutoResume(k)
        }
        return keys + queuedKeys
    }

    // MARK: work loop

    private func workLoop() {
        while true {
            lock.lock()
            if queue.isEmpty {
                workerRunning = false
                current = nil
                lock.unlock()
                return
            }
            let job = queue.removeFirst()
            current = job
            lock.unlock()

            autoreleasepool {
                switch job {
                case .transcribe(let key): runTranscribe(key)
                case .downloadModel(let id): runModelDownload(id)
                }
            }

            lock.lock()
            current = nil
            lock.unlock()
        }
    }

    private func runModelDownload(_ modelId: String) {
        guard let model = TxModelCatalog.get(modelId) else { return }
        let flag = "model:" + modelId
        var last = Date.distantPast
        do {
            try models.download(model, isCancelled: { [weak self] in self?.isCancelled(flag) ?? true }) { read, total in
                guard Date().timeIntervalSince(last) > 0.5 else { return }
                last = Date()
                let p = total > 0 ? Double(read) / Double(total) : 0
                emit("onModelDownload", ["modelId": modelId, "status": "downloading", "progress": p, "bytes": read, "total": total])
            }
            TranscriptionBackground.shared.forgetModelDownload(modelId)
            emit("onModelDownload", ["modelId": modelId, "status": "done", "progress": 1.0])
        } catch {
            let cancelled = isCancelled(flag)
            let systemPause = TranscriptionBackground.shared.isRememberedModelDownload(modelId)
            if cancelled && !systemPause {
                // Cancelled by the user: remove it (Android deletes on any failure; partial files are kept here
                // after errors and system pauses, so the next try continues where this one stopped)
                models.delete(model)
            }
            AbsLogger.error(message: "Transcription: model download \(modelId) stopped: \(error.localizedDescription)")
            emit("onModelDownload", ["modelId": modelId, "status": cancelled ? "cancelled" : "error", "error": error.localizedDescription])
        }
        lock.lock()
        cancelFlags.remove(flag)
        lock.unlock()
    }

    private func runTranscribe(_ key: String) {
        guard let meta = store.getMeta(key) else { return }
        let lifecycle = TranscriptionBackground.shared

        // Not a good moment (app in the background, phone too hot): wait instead
        if let reason = lifecycle.blockReason() {
            meta.status = TranscriptStatus.paused
            meta.error = reason.message
            store.saveMeta(meta)
            lifecycle.markAutoResume(key)
            emit("onTranscriptionUpdate", meta.toJs())
            return
        }

        meta.status = TranscriptStatus.running
        meta.error = nil
        store.saveMeta(meta)
        lifecycle.forgetAutoResume(key)
        emit("onTranscriptionUpdate", meta.toJs())
        // Tell the server (if it has the transcription add-on) that this phone is transcribing the book
        TranscriptSync.async(key, allowPull: false)

        var lastCheckIn = Date()
        var lastPowerCheck = Date.distantPast
        let engine = TranscriptionEngine(store: store, models: models)

        let update: (TranscriptMeta) -> Void = { [weak self] m in
            guard let self = self else { return }
            let now = Date()
            // Every 5 s: app sent to the background or phone too hot -> pause, picked up again automatically
            if now.timeIntervalSince(lastPowerCheck) > 5 {
                lastPowerCheck = now
                if let reason = lifecycle.blockReason() {
                    self.lock.lock()
                    if self.pauseReasons[key] == nil { self.pauseReasons[key] = reason }
                    self.cancelFlags.insert(key)
                    self.lock.unlock()
                }
            }
            // Warm (.fair): give the CPU short breaks so the phone doesn't throttle hard or get hot (Android: MODERATE)
            if ProcessInfo.processInfo.thermalState == .fair { Thread.sleep(forTimeInterval: 0.4) }
            if now.timeIntervalSince(lastCheckIn) > TranscriptSync.partialPushInterval {
                lastCheckIn = now
                self.store.saveMeta(m)
                TranscriptSync.async(key, allowPull: false)
            }
            self.emit("onTranscriptionUpdate", m.toJs())
        }

        do {
            try engine.run(meta, isCancelled: { [weak self] in self?.isCancelled(key) ?? true }, onUpdate: update)
            meta.status = TranscriptStatus.done
            meta.phase = ""
            meta.processedSec = meta.durationSec
            meta.doneSec = meta.durationSec
            meta.error = nil
        } catch TxError.cancelled {
            meta.status = TranscriptStatus.paused
            if let reason = pauseReason(key) {
                meta.error = reason.message
                lifecycle.markAutoResume(key)
            } else {
                meta.error = nil
            }
        } catch {
            AbsLogger.error(message: "Transcription of \(key) failed: \(error.localizedDescription)")
            if isCancelled(key) {
                meta.status = TranscriptStatus.paused
                if let reason = pauseReason(key) {
                    meta.error = reason.message
                    lifecycle.markAutoResume(key)
                }
            } else {
                meta.status = TranscriptStatus.error
                meta.error = error.localizedDescription
            }
        }

        lock.lock()
        cancelFlags.remove(key)
        let discard = discardOnStop.remove(key) != nil
        pauseReasons.removeValue(forKey: key)
        lock.unlock()

        if discard {
            lifecycle.forgetAutoResume(key)
            store.delete(key)
            emit("onTranscriptionUpdate", ["key": key, "status": TranscriptStatus.none, "cancelled": true])
            TranscriptSync.async(key) // removes the partial copy from the server too
            return
        }
        if meta.status != TranscriptStatus.paused || meta.error == nil { lifecycle.forgetAutoResume(key) }
        store.saveMeta(meta)
        store.markDirty(key)
        emit("onTranscriptionUpdate", meta.toJs())
        // Finished, paused or stopped: send the result to the server
        TranscriptSync.async(key)
        // Paused by the system but the reason is already gone (app reopened while this job was stopping)
        if meta.status == TranscriptStatus.paused && meta.error != nil && lifecycle.blockReason() == nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { lifecycle.resumeAutoPaused() }
        }
    }
}

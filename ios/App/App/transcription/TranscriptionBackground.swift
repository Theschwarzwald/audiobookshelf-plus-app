//
//  TranscriptionBackground.swift
//  ABS+ on-device transcription
//
//  iOS limits, explicit. Android runs transcription in a foreground service for hours; iOS has no such thing:
//
//   - Transcription runs while the app is open (in the foreground).
//   - Going to the background: beginBackgroundTask buys the ~30 s needed to stop at a clean point and
//     save; the job is paused and marked to resume. It resumes when the app comes back.
//   - A BGProcessingTask (requiresExternalPower) lets iOS continue it while the phone is charging and
//     idle, when iOS chooses (often overnight). When that time runs out it pauses again and asks for more.
//   - ProcessInfo.thermalState .serious or worse pauses it; it resumes when the phone has cooled down.
//   - Keeping the screen on is the screen lock's job (KeepAwake in the web view), not this file's.
//
//  Needs (done outside this file, see the port notes):
//   - AppDelegate: TranscriptionBackground.registerBackgroundTasks() in didFinishLaunchingWithOptions
//   - Info.plist: BGTaskSchedulerPermittedIdentifiers containing "<bundle id>.transcription",
//     and "processing" in UIBackgroundModes
//

import Foundation
import UIKit
import BackgroundTasks

final class TranscriptionBackground {
    static let shared = TranscriptionBackground()

    static var taskIdentifier: String { (Bundle.main.bundleIdentifier ?? "com.audiobookshelf.app") + ".transcription" }

    private let lock = NSLock()
    private var started = false
    private var appActive = true
    private var bgTaskActive = false
    private var registered = false
    private var backgroundTaskId: UIBackgroundTaskIdentifier = .invalid
    /// Model downloads stopped by the system (not the user), to continue later
    private var pausedModelDownloads = Set<String>()
    private var observers: [NSObjectProtocol] = []

    private let store = TranscriptStore.shared
    private var hub: TranscriptionHub { TranscriptionHub.shared }

    // Transcripts paused by the system, persisted so they continue after the app was closed
    private var autoResumeFile: URL { TxPaths.base.appendingPathComponent("auto-resume.json") }

    // MARK: setup

    /// Call from AppDelegate.application(_:didFinishLaunchingWithOptions:), before it returns.
    /// (BGTaskScheduler requires registration before launch finishes; registering later crashes.)
    static func registerBackgroundTasks() {
        let me = shared
        let id = taskIdentifier
        let permitted = (Bundle.main.object(forInfoDictionaryKey: "BGTaskSchedulerPermittedIdentifiers") as? [String]) ?? []
        if permitted.contains(id) {
            let ok = BGTaskScheduler.shared.register(forTaskWithIdentifier: id, using: nil) { task in
                guard let t = task as? BGProcessingTask else {
                    task.setTaskCompleted(success: false)
                    return
                }
                TranscriptionBackground.shared.handle(t)
            }
            me.lock.lock()
            me.registered = ok
            me.lock.unlock()
        } else {
            AbsLogger.info(message: "Transcription: \(id) is not in BGTaskSchedulerPermittedIdentifiers, no background processing")
        }
        me.start()
    }

    /// Observers for app state and heat. Safe to call more than once (the plugin calls it too).
    func start() {
        let work = { [weak self] in
            guard let self = self else { return }
            self.lock.lock()
            if self.started { self.lock.unlock(); return }
            self.started = true
            self.appActive = UIApplication.shared.applicationState != .background
            self.lock.unlock()
            TranscriptSync.captureDeviceName()

            let nc = NotificationCenter.default
            var tokens: [NSObjectProtocol] = []
            tokens.append(nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.didEnterBackground() })
            tokens.append(nc.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in self?.willEnterForeground() })
            tokens.append(nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.willEnterForeground() })
            tokens.append(nc.addObserver(forName: ProcessInfo.thermalStateDidChangeNotification, object: nil, queue: .main) { [weak self] _ in self?.thermalChanged() })
            self.observers = tokens
            // Launched in the foreground: continue what the system paused last time
            // (after a few seconds, so the app's own start-up isn't slowed down)
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                guard let self = self, self.isAppActive else { return }
                self.resumeAutoPaused()
            }
        }
        if Thread.isMainThread { work() } else { DispatchQueue.main.async(execute: work) }
    }

    var isAppActive: Bool {
        lock.lock()
        defer { lock.unlock() }
        return appActive
    }

    private var isBgTaskActive: Bool {
        lock.lock()
        defer { lock.unlock() }
        return bgTaskActive
    }

    /// Why a transcription can't run right now, or nil
    func blockReason() -> TxPauseReason? {
        let t = ProcessInfo.processInfo.thermalState
        if t == .serious || t == .critical { return .hot }
        if !isAppActive && !isBgTaskActive { return .background }
        return nil
    }

    // MARK: auto-resume list

    private func readAutoResume() -> [String] {
        guard let d = try? Data(contentsOf: autoResumeFile), let a = TxJSON.parse(d) as? [String] else { return [] }
        return a
    }

    private func writeAutoResume(_ keys: [String]) {
        try? TxJSON.data(keys).write(to: autoResumeFile, options: .atomic)
    }

    func markAutoResume(_ key: String) {
        lock.lock()
        var keys = readAutoResume()
        if !keys.contains(key) { keys.append(key) }
        writeAutoResume(keys)
        lock.unlock()
    }

    func forgetAutoResume(_ key: String) {
        lock.lock()
        let keys = readAutoResume()
        if keys.contains(key) { writeAutoResume(keys.filter { $0 != key }) }
        lock.unlock()
    }

    func rememberModelDownload(_ id: String) {
        lock.lock(); pausedModelDownloads.insert(id); lock.unlock()
    }

    func forgetModelDownload(_ id: String) {
        lock.lock(); pausedModelDownloads.remove(id); lock.unlock()
    }

    func isRememberedModelDownload(_ id: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return pausedModelDownloads.contains(id)
    }

    /// Re-queues what the system paused. Returns true if anything was started.
    @discardableResult
    func resumeAutoPaused() -> Bool {
        guard blockReason() == nil else { return false }
        lock.lock()
        let keys = readAutoResume()
        let downloads = pausedModelDownloads
        lock.unlock()
        var any = false
        for id in downloads {
            hub.enqueue(.downloadModel(id))
            any = true
        }
        for key in keys {
            guard let meta = store.getMeta(key), meta.status != TranscriptStatus.done, meta.status != TranscriptStatus.error, !meta.tracks.isEmpty else {
                forgetAutoResume(key)
                continue
            }
            if hub.isTranscribing(key) { any = true; continue }
            meta.status = TranscriptStatus.queued
            meta.error = nil
            store.saveMeta(meta)
            hub.emit("onTranscriptionUpdate", meta.toJs())
            hub.enqueue(.transcribe(key))
            any = true
        }
        return any
    }

    // MARK: app state

    private func didEnterBackground() {
        lock.lock()
        appActive = false
        lock.unlock()
        // During a background processing task the work is iOS's to schedule, leave it running
        if isBgTaskActive { return }
        guard hub.hasAnyWork else { return }

        // A few seconds to stop at a clean point and save
        let app = UIApplication.shared
        if backgroundTaskId == .invalid {
            backgroundTaskId = app.beginBackgroundTask(withName: "abs-transcription-pause") { [weak self] in
                self?.endBackgroundTask()
            }
        }
        hub.pauseAll(reason: .background)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.waitUntilIdle(timeout: 25)
            DispatchQueue.main.async {
                self?.scheduleProcessingTask()
                self?.endBackgroundTask()
            }
        }
    }

    private func endBackgroundTask() {
        if backgroundTaskId != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTaskId)
            backgroundTaskId = .invalid
        }
    }

    private func willEnterForeground() {
        lock.lock()
        let wasActive = appActive
        appActive = true
        lock.unlock()
        if !wasActive || !hub.hasTranscribeWork { resumeAutoPaused() }
    }

    private func thermalChanged() {
        let t = ProcessInfo.processInfo.thermalState
        if t == .serious || t == .critical {
            // The running job notices within a few seconds (it checks blockReason); nothing else to do
            return
        }
        if t == .nominal || t == .fair {
            if isAppActive || isBgTaskActive { resumeAutoPaused() }
        }
    }

    private func waitUntilIdle(timeout: TimeInterval) {
        let until = Date().addingTimeInterval(timeout)
        while hub.hasAnyWork && Date() < until { Thread.sleep(forTimeInterval: 0.2) }
    }

    // MARK: BGProcessingTask

    /// Asks iOS for time to continue while charging and idle (only if there is paused work)
    func scheduleProcessingTask() {
        lock.lock()
        let ok = registered
        let keys = readAutoResume()
        let downloads = pausedModelDownloads
        lock.unlock()
        guard ok, !keys.isEmpty || !downloads.isEmpty else { return }
        // Streamed books fetch their audio from the server
        let needsNetwork = !downloads.isEmpty || keys.contains { k in store.getMeta(k)?.tracks.contains { $0.remote } ?? false }
        let req = BGProcessingTaskRequest(identifier: TranscriptionBackground.taskIdentifier)
        req.requiresExternalPower = true
        req.requiresNetworkConnectivity = needsNetwork
        req.earliestBeginDate = Date(timeIntervalSinceNow: 60)
        do {
            try BGTaskScheduler.shared.submit(req)
        } catch {
            AbsLogger.info(message: "Transcription: background processing not scheduled: \(error.localizedDescription)")
        }
    }

    private func handle(_ task: BGProcessingTask) {
        lock.lock()
        bgTaskActive = true
        lock.unlock()
        let expired = TxBox(false)
        task.expirationHandler = { [weak self] in
            expired.value = true
            self?.hub.pauseAll(reason: .expired)
        }
        resumeAutoPaused()
        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard let self = self else {
                task.setTaskCompleted(success: false)
                return
            }
            // Runs until the work is done or iOS takes the time back (expiration pauses the jobs)
            while self.hub.hasAnyWork { Thread.sleep(forTimeInterval: 2) }
            self.lock.lock()
            self.bgTaskActive = false
            self.lock.unlock()
            DispatchQueue.main.async {
                // Paused again (time over, or the app went away): ask for another slot
                self.scheduleProcessingTask()
                task.setTaskCompleted(success: !expired.value)
            }
        }
    }
}

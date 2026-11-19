//
//  AbsLiveActivity.swift
//  The narrated line in a Live Activity (lock screen + Dynamic Island): the iOS counterpart of the
//  Android lock-screen line. Like Android, JS hands over the book's lines once (setTranscript) and a
//  native 1 s tick follows the player, because the web view doesn't run reliably in the background.
//

import Foundation
import UIKit
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(AbsLiveActivity)
public class AbsLiveActivity: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "AbsLiveActivityPlugin"
    public var jsName = "AbsLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTranscript", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    /// Paused this long (while the app is still running): take the card away
    private static let pausedEndAfter: TimeInterval = 10 * 60
    /// Apple budgets updates: never more often than this, and only when something visible changed
    private static let minUpdateInterval: TimeInterval = 1.0

    private struct Line {
        let s: Double
        let t: String
    }

    // All state below is touched on the main thread only
    private var key: String?
    private var lines: [Line] = []
    private var titleOverride: String?
    private var authorOverride: String?
    private var enabled = true
    private var timer: Timer?

    /// Activity<AbsReadAlongAttributes>, typed Any because stored properties can't be iOS 16.1-only
    private var activityRef: Any?
    private var activityKey: String?
    private var shownIndex = -2
    private var shownPlaying: Bool?
    private var lastUpdate = Date.distantPast
    private var pausedSince: Date?
    private var wasPlaying = false
    /// The person swiped the card away: don't bring it back until they press play again
    private var suppressed = false

    override public func load() {
        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(onPlayerClosed), name: NSNotification.Name(PlayerEvents.closed.rawValue), object: nil)
        nc.addObserver(self, selector: #selector(onBecameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(onWillTerminate), name: UIApplication.willTerminateNotification, object: nil)
        // A card left over from a previous run (app killed) would show a frozen line forever
        DispatchQueue.main.async { self.endAll() }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        timer?.invalidate()
    }

    // MARK: - JS methods

    /// { supported: iOS 16.1+, enabled: Live Activities allowed in Settings }
    @objc func isAvailable(_ call: CAPPluginCall) {
        var supported = false
        var allowed = false
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            supported = true
            allowed = ActivityAuthorizationInfo().areActivitiesEnabled
        }
        #endif
        call.resolve(["supported": supported, "enabled": allowed])
    }

    /// { key, lines: [{ s, e, t }], title?, author? } — same shape as Android's setLockscreenTranscript
    @objc func setTranscript(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), !key.isEmpty else {
            call.reject("key required")
            return
        }
        let raw = call.getArray("lines") ?? []
        var out: [Line] = []
        out.reserveCapacity(raw.count)
        for v in raw {
            guard let o = v as? JSObject, let s = Self.num(o["s"]) else { continue }
            out.append(Line(s: s, t: (o["t"] as? String) ?? ""))
        }
        out.sort { $0.s < $1.s }
        let title = call.getString("title")
        let author = call.getString("author")
        let count = out.count
        DispatchQueue.main.async {
            if self.key != key {
                self.endActivity()
                self.suppressed = false
            }
            self.key = key
            self.lines = out
            self.titleOverride = title
            self.authorOverride = author
            self.shownIndex = -2 // lines may have grown (server still transcribing): re-evaluate
            if out.isEmpty {
                self.endActivity()
                self.stopTimer()
            } else {
                self.startTimer()
                self.tick()
            }
        }
        call.resolve(["lines": count])
    }

    /// { enabled } — mirrors the lock-screen transcription switch; off ends the card now
    @objc func setEnabled(_ call: CAPPluginCall) {
        let on = call.getBool("enabled") ?? true
        DispatchQueue.main.async {
            self.enabled = on
            if on {
                if !self.lines.isEmpty { self.startTimer(); self.tick() }
            } else {
                self.endActivity()
                self.stopTimer()
            }
        }
        call.resolve()
    }

    /// Ends the card and forgets the lines (book closed, transcript deleted)
    @objc func end(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.key = nil
            self.lines = []
            self.stopTimer()
            self.endActivity()
        }
        call.resolve()
    }

    // MARK: - Player events

    @objc private func onPlayerClosed() {
        DispatchQueue.main.async { self.endActivity() }
    }

    @objc private func onBecameActive() {
        // Activities can only be started from the foreground: this is the chance to (re)start one
        DispatchQueue.main.async {
            if !self.lines.isEmpty && self.enabled { self.startTimer(); self.tick() }
        }
    }

    @objc private func onWillTerminate() {
        endAll()
    }

    // MARK: - Tick

    private func startTimer() {
        guard timer == nil else { return }
        let t = Timer(timeInterval: 1.0, repeats: true) { [weak self] _ in self?.tick() }
        t.tolerance = 0.2
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func tick() {
        guard enabled, let key = key, !lines.isEmpty else { return }
        guard let session = PlayerHandler.getPlaybackSession() else {
            endActivity()
            return
        }
        // Another book is playing: wait for its lines (JS sends them when its transcript loads)
        if let sk = Self.keyFor(session), sk != key {
            endActivity()
            return
        }
        let playing = !PlayerHandler.paused
        let time = PlayerHandler.getCurrentTime() ?? session.currentTime
        let now = Date()

        if playing && !wasPlaying { suppressed = false } // a fresh press of play may bring the card back
        wasPlaying = playing
        if playing {
            pausedSince = nil
        } else if pausedSince == nil {
            pausedSince = now
        }
        if let since = pausedSince, now.timeIntervalSince(since) > Self.pausedEndAfter {
            endActivity()
            return
        }

        let idx = indexAt(time + 0.25) // a touch ahead, like Android: the line appears as it starts
        let line = idx >= 0 ? lines[idx].t : ""
        let duration = session.duration
        let progress: Double? = duration > 0 ? min(1, max(0, time / duration)) : nil

        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            show(key: key, session: session, line: line, index: idx, playing: playing, progress: progress, now: now)
        }
        #endif
    }

    /// Last line that has started by [t] (binary search; lines are sorted by start)
    private func indexAt(_ t: Double) -> Int {
        var lo = 0
        var hi = lines.count - 1
        var ans = -1
        while lo <= hi {
            let mid = (lo + hi) / 2
            if lines[mid].s <= t {
                ans = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }
        return ans
    }

    /// Same key the JS uses (AudioPlayer.vue mediaId)
    private static func keyFor(_ session: PlaybackSession) -> String? {
        guard let id = session.libraryItemId, !id.isEmpty else { return nil }
        if let ep = session.episodeId, !ep.isEmpty { return "\(id)-\(ep)" }
        return id
    }

    private static func num(_ v: Any?) -> Double? {
        if let n = v as? NSNumber {
            let d = n.doubleValue
            return d.isFinite ? d : nil
        }
        if let s = v as? String, let d = Double(s), d.isFinite { return d }
        return nil
    }

    // MARK: - ActivityKit

    private func endActivity() {
        shownIndex = -2
        shownPlaying = nil
        pausedSince = nil
        activityKey = nil
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            guard let a = activityRef as? Activity<AbsReadAlongAttributes> else {
                activityRef = nil
                return
            }
            activityRef = nil
            Self.end(a)
        }
        #endif
        activityRef = nil
    }

    private func endAll() {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            for a in Activity<AbsReadAlongAttributes>.activities { Self.end(a) }
        }
        #endif
        activityRef = nil
        activityKey = nil
    }

    #if canImport(ActivityKit)
    @available(iOS 16.1, *)
    private static func end(_ a: Activity<AbsReadAlongAttributes>) {
        Task {
            // Gone at once: a stale line on the lock screen is worse than none
            if #available(iOS 16.2, *) {
                await a.end(nil, dismissalPolicy: .immediate)
            } else {
                await a.end(using: nil, dismissalPolicy: .immediate)
            }
        }
    }

    @available(iOS 16.1, *)
    private func show(key: String, session: PlaybackSession, line: String, index: Int, playing: Bool, progress: Double?, now: Date) {
        var current = activityRef as? Activity<AbsReadAlongAttributes>

        // Swiped away by the person, or ended by the system (8 h limit). A merely stale one (16.2+) is
        // still ours: the next update freshens it, so it must not be dropped and duplicated.
        if let a = current, a.activityState == .dismissed || a.activityState == .ended {
            if a.activityState == .dismissed { suppressed = true }
            activityRef = nil
            activityKey = nil
            current = nil
            shownIndex = -2
            shownPlaying = nil
        }

        let state = AbsReadAlongAttributes.ContentState(
            line: AbsReadAlongAttributes.clip(line, AbsReadAlongAttributes.maxLineLength),
            isPlaying: playing,
            progress: progress
        )
        // Playing: refreshed every line, so a card that stops changing is stale. Paused: stale once it would be ended.
        let staleDate = playing ? now.addingTimeInterval(5 * 60) : (pausedSince ?? now).addingTimeInterval(Self.pausedEndAfter)

        guard let activity = current else {
            // Start only while playing, from the foreground (iOS refuses requests from the background)
            guard playing, !suppressed, UIApplication.shared.applicationState == .active else { return }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
            let title = AbsReadAlongAttributes.clip(titleOverride ?? session.displayTitle ?? "", AbsReadAlongAttributes.maxTitleLength)
            let author = (authorOverride ?? session.displayAuthor).map { AbsReadAlongAttributes.clip($0, AbsReadAlongAttributes.maxTitleLength) }
            let attrs = AbsReadAlongAttributes(title: title, author: author)
            do {
                let a: Activity<AbsReadAlongAttributes>
                if #available(iOS 16.2, *) {
                    a = try Activity.request(attributes: attrs, content: ActivityContent(state: state, staleDate: staleDate), pushType: nil)
                } else {
                    a = try Activity.request(attributes: attrs, contentState: state, pushType: nil)
                }
                activityRef = a
                activityKey = key
                shownIndex = index
                shownPlaying = playing
                lastUpdate = now
            } catch {
                AbsLogger.info(message: "Live Activity not started: \(error.localizedDescription)")
            }
            return
        }

        // Only when the line or play state changed, and not more than once a second
        guard index != shownIndex || playing != shownPlaying else { return }
        guard now.timeIntervalSince(lastUpdate) >= Self.minUpdateInterval else { return }
        shownIndex = index
        shownPlaying = playing
        lastUpdate = now
        Task {
            if #available(iOS 16.2, *) {
                await activity.update(ActivityContent(state: state, staleDate: staleDate))
            } else {
                await activity.update(using: state)
            }
        }
    }
    #endif
}

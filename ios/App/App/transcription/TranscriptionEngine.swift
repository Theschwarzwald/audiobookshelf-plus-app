//
//  TranscriptionEngine.swift
//  ABS+ on-device transcription
//
//  Port of Android's TranscriptionEngine.kt: decode -> 16 kHz mono -> Silero VAD -> offline ASR -> lines.
//  Everything is local; the only network use is fetching audio from the user's own server when the
//  book is streamed rather than downloaded.
//

import Foundation
import RealmSwift

final class TranscriptionEngine {
    static let noEngineMessage = "On-device transcription needs the speech engine: run ios/App/scripts/fetch-sherpa-onnx.sh"

    static var isAvailable: Bool {
        #if ABS_SHERPA
        return true
        #else
        return false
        #endif
    }

    private let store: TranscriptStore
    private let models: TxModelManager
    private let sampleRate = 16000
    private let vadWindow = 512

    init(store: TranscriptStore, models: TxModelManager) {
        self.store = store
        self.models = models
    }

    /// Recognizer threads: performance cores plus a little (6-core iPhones -> 4), fewer in Low Power Mode.
    static func recognizerThreads() -> Int {
        let cores = ProcessInfo.processInfo.activeProcessorCount
        var n = max(1, min(4, cores - 2))
        if ProcessInfo.processInfo.isLowPowerModeEnabled { n = min(n, 2) }
        return n
    }

    func run(_ meta: TranscriptMeta, isCancelled: @escaping () -> Bool, onUpdate: @escaping (TranscriptMeta) -> Void) throws {
        #if ABS_SHERPA
        guard let model = TxModelCatalog.get(meta.modelId) else { throw TxError.message("Unknown model \(meta.modelId)") }

        if !models.isInstalled(model) {
            meta.phase = "model"
            meta.phaseProgress = 0
            onUpdate(meta)
            var last = Date.distantPast
            try models.download(model, isCancelled: isCancelled) { read, total in
                meta.phaseProgress = total > 0 ? Double(read) / Double(total) : 0
                if Date().timeIntervalSince(last) > 1 {
                    last = Date()
                    onUpdate(meta)
                }
            }
        }
        try models.ensureVad(isCancelled: isCancelled)

        let recognizer = try TxRecognizer(model: model, manager: models, threads: TranscriptionEngine.recognizerThreads())
        let maxSpeech: Float = model.kind == .nemoTransducer ? 25 : 15

        let startedAt = Date()
        let startedDoneSec = doneSec(meta)
        var lastUpdate = Date.distantPast

        // Two passes so the part you're listening to is ready first:
        //   pass 0: from where playback was when transcription started -> end of book
        //   pass 1: start of book -> that point
        while meta.pass <= 1 {
            let rangeStart = meta.pass == 0 ? meta.firstStartSec : 0.0
            let rangeEnd = meta.pass == 0 ? Double.greatestFiniteMagnitude : meta.firstStartSec
            if rangeEnd - rangeStart > 0.5 {
                if meta.resumeSec < rangeStart { meta.resumeSec = rangeStart }
                // When resuming, drop partial lines past the checkpoint in this pass's range
                meta.linesCount = store.truncateLinesInRange(meta.key, meta.resumeSec, rangeEnd)

                for track in meta.tracks.sorted(by: { $0.startOffset < $1.startOffset }) {
                    let trackEnd = track.startOffset + track.duration
                    if meta.resumeSec >= trackEnd - 0.5 { continue }
                    if track.startOffset >= rangeEnd { break }
                    if isCancelled() { throw TxError.cancelled }

                    let localStart = max(0, meta.resumeSec - track.startOffset)
                    var tempFile: URL?
                    let fileUrl: URL
                    if track.remote {
                        let f = try fetchRemoteTrack(meta, track, isCancelled: isCancelled, onUpdate: onUpdate)
                        tempFile = f
                        fileUrl = f
                    } else {
                        fileUrl = try localUrl(track)
                    }
                    defer { if let t = tempFile { try? FileManager.default.removeItem(at: t) } }

                    meta.phase = "transcribing"
                    meta.phaseProgress = 0
                    onUpdate(meta)

                    let vad = try TxVad(modelPath: models.vadFile.path, maxSpeechDuration: maxSpeech, windowSize: vadWindow)
                    var baseSec = -1.0 // file time of VAD sample 0
                    var window = [Float]()
                    window.reserveCapacity(vadWindow)
                    var drainError: Error?

                    // Recognizes every finished speech segment
                    let drain: () throws -> Void = { [self] in
                        while !vad.isEmpty {
                            guard let seg = vad.front() else { vad.pop(); continue }
                            vad.pop()
                            let segStart = track.startOffset + baseSec + Double(seg.start) / Double(sampleRate)
                            let segDur = Double(seg.samples.count) / Double(sampleRate)
                            if segStart >= rangeEnd { continue } // already covered by the other pass
                            if segDur >= 0.3 {
                                let r = try recognizer.recognize(seg.samples)
                                let lines = LineSplitter.split(text: r.text, tokens: r.tokens, timestamps: r.timestamps,
                                                               segStart: segStart, segDuration: segDur, useTokenTimes: model.hasTokenTimestamps)
                                    .filter { $0.start < rangeEnd }
                                store.appendLines(meta.key, lines)
                                meta.linesCount += lines.count
                            }
                            meta.resumeSec = min(segStart + segDur, rangeEnd)
                            meta.doneSec = doneSec(meta)
                            if isCancelled() { throw TxError.cancelled }
                        }
                    }

                    try TxAudioDecoder(url: fileUrl).decode(startSec: localStart) { samples, chunkStart in
                        if drainError != nil { return false }
                        if baseSec < 0 { baseSec = chunkStart }
                        var i = 0
                        while i < samples.count {
                            let n = min(vadWindow - window.count, samples.count - i)
                            window.append(contentsOf: samples[i..<(i + n)])
                            i += n
                            if window.count == vadWindow {
                                vad.accept(window)
                                window.removeAll(keepingCapacity: true)
                                do { try drain() } catch {
                                    drainError = error
                                    return false
                                }
                            }
                        }
                        meta.processedSec = track.startOffset + chunkStart + Double(samples.count) / Double(sampleRate)
                        if Date().timeIntervalSince(lastUpdate) > 1.5 {
                            lastUpdate = Date()
                            let wall = Date().timeIntervalSince(startedAt)
                            meta.speed = wall > 0 ? (doneSec(meta) - startedDoneSec) / wall : 0
                            store.saveMeta(meta)
                            onUpdate(meta)
                        }
                        // Stop at the end of this pass's range (the other pass covers the rest)
                        return !isCancelled() && meta.processedSec < rangeEnd + 2.0
                    }
                    if let e = drainError { throw e }
                    if isCancelled() { throw TxError.cancelled }

                    vad.flush()
                    try drain()

                    meta.resumeSec = min(trackEnd, rangeEnd)
                    meta.doneSec = doneSec(meta)
                    store.saveMeta(meta)
                    onUpdate(meta)
                }
            }
            meta.pass += 1
            meta.resumeSec = 0
            meta.doneSec = doneSec(meta)
            store.saveMeta(meta)
        }
        #else
        throw TxError.message(TranscriptionEngine.noEngineMessage)
        #endif
    }

    /// Seconds of the book transcribed so far, across both passes.
    func doneSec(_ meta: TranscriptMeta) -> Double {
        let firstPassLen = max(0, meta.durationSec - meta.firstStartSec)
        let v: Double
        if meta.pass == 0 { v = meta.resumeSec - meta.firstStartSec }
        else if meta.pass == 1 { v = firstPassLen + meta.resumeSec }
        else { v = meta.durationSec }
        return min(max(0, v), meta.durationSec)
    }

    /// Downloaded book: the file is looked up again by its Realm id, because the app container
    /// path changes with app updates (iOS only; Android keeps the content:// uri).
    private func localUrl(_ track: TrackSource) throws -> URL {
        if let id = track.localFileId {
            let path: URL? = autoreleasepool {
                Database.shared.getLocalFile(localFileId: id)?.contentPath
            }
            if let p = path, FileManager.default.fileExists(atPath: p.path) { return p }
        }
        if let u = URL(string: track.source), u.isFileURL, FileManager.default.fileExists(atPath: u.path) { return u }
        if FileManager.default.fileExists(atPath: track.source) { return URL(fileURLWithPath: track.source) }
        throw TxError.message("The downloaded audio file is missing. Download the book again, then resume.")
    }

    // MARK: Streaming (not downloaded) books: fetch each track from the user's server to a temp file

    private func fetchRemoteTrack(_ meta: TranscriptMeta, _ track: TrackSource, isCancelled: @escaping () -> Bool, onUpdate: @escaping (TranscriptMeta) -> Void) throws -> URL {
        guard let server = TxServer.resolve(configId: meta.serverConnectionConfigId, fallbackAddress: meta.serverAddress) else {
            throw TxError.message("Server not available. Download the book to transcribe it offline.")
        }
        let urlString = track.source.hasPrefix("http") ? track.source : server.address + track.source
        guard let url = URL(string: urlString) else { throw TxError.message("Bad audio address for this book") }

        meta.phase = "audio"
        meta.phaseProgress = 0
        onUpdate(meta)

        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let ext = (track.ext ?? "").trimmingCharacters(in: CharacterSet(charactersIn: ".")).lowercased()
        let out = caches.appendingPathComponent("transcription-track." + (ext.isEmpty ? "m4a" : ext))
        try? FileManager.default.removeItem(at: out)

        func attempt(_ token: String?) throws {
            var req = URLRequest(url: url)
            if let t = token, !t.isEmpty { req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }
            var last = Date.distantPast
            try TxDownloader.download(req, to: out, isCancelled: isCancelled, progress: { w, e in
                guard e > 0, Date().timeIntervalSince(last) > 1 else { return }
                last = Date()
                meta.phaseProgress = Double(w) / Double(e)
                onUpdate(meta)
            }, checkExpected: { expected in
                if let v = try? caches.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
                   let free = v.volumeAvailableCapacityForImportantUsage, free < expected + 200 * 1024 * 1024 {
                    throw TxError.message("Not enough free space to stream this book for transcription. Download it instead or free up space.")
                }
            })
        }

        do {
            try attempt(server.token)
        } catch TxError.http(401) {
            // Differs from Android (which refreshes the token itself): the app's own API client and the web
            // view refresh it, so use a newer token if there is one, else ask the user to sign in.
            // Refreshing here too could race their refresh and sign the user out.
            if let fresh = TxServer.resolve(configId: meta.serverConnectionConfigId, fallbackAddress: meta.serverAddress)?.token,
               fresh != server.token {
                do { try attempt(fresh) } catch TxError.http(401) {
                    throw TxError.message("Server login expired. Open the app, sign in, and resume.")
                }
            } else {
                throw TxError.message("Server login expired. Open the app, sign in, and resume.")
            }
        } catch TxError.http(let code) {
            throw TxError.message("Server returned \(code) while fetching audio")
        }
        return out
    }
}

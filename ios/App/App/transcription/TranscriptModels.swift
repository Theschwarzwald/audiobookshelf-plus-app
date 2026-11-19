//
//  TranscriptModels.swift
//  ABS+ on-device transcription
//
//  Port of the data classes in Android's TranscriptStore.kt / EbookComparer.kt.
//  meta.json uses the same field names as Android's Jackson output, so a transcript reads the same everywhere.
//

import Foundation

struct TrackSource {
    /// Local file URL, or a server path like /api/items/{id}/file/{ino}
    var source: String = ""
    var startOffset: Double = 0
    var duration: Double = 0
    var remote: Bool = false
    /// iOS only: the downloaded file's Realm id. The app container path changes with app updates,
    /// so the file is looked up again at run time. Android ignores unknown fields.
    var localFileId: String?
    /// iOS only: file extension (AVFoundation needs it to open a fetched temp file)
    var ext: String?

    init(source: String, startOffset: Double, duration: Double, remote: Bool, localFileId: String? = nil, ext: String? = nil) {
        self.source = source
        self.startOffset = startOffset
        self.duration = duration
        self.remote = remote
        self.localFileId = localFileId
        self.ext = ext
    }

    init(json o: [String: Any]) {
        source = TxJSON.str(o, "source") ?? ""
        startOffset = TxJSON.dbl(o, "startOffset")
        duration = TxJSON.dbl(o, "duration")
        remote = TxJSON.bool(o, "remote")
        localFileId = TxJSON.str(o, "localFileId")
        ext = TxJSON.str(o, "ext")
    }

    func toJSON() -> [String: Any] {
        var o: [String: Any] = ["source": source, "startOffset": startOffset, "duration": duration, "remote": remote]
        if let id = localFileId { o["localFileId"] = id }
        if let e = ext { o["ext"] = e }
        return o
    }
}

struct ChapterSource {
    var start: Double = 0
    var end: Double = 0
    var title: String = ""

    init(start: Double, end: Double, title: String) {
        self.start = start
        self.end = end
        self.title = title
    }

    init(json o: [String: Any]) {
        start = TxJSON.dbl(o, "start")
        end = TxJSON.dbl(o, "end")
        title = TxJSON.str(o, "title") ?? ""
    }

    func toJSON() -> [String: Any] { ["start": start, "end": end, "title": title] }
}

enum TranscriptStatus {
    static let none = "none"
    static let queued = "queued"
    static let running = "running"
    static let paused = "paused"
    static let done = "done"
    static let error = "error"
}

/// Same fields as Android's TranscriptMeta. A class (not a struct) because the engine updates it in place, like Kotlin's vars.
final class TranscriptMeta {
    var key: String = ""
    var title: String = ""
    var modelId: String = ""
    var status: String = TranscriptStatus.none
    /// what the job is doing right now: model, audio, transcribing
    var phase: String = ""
    var phaseProgress: Double = 0
    var durationSec: Double = 0
    var processedSec: Double = 0
    /// Within the current pass, everything before this absolute time is final; a resumed job continues from here.
    var resumeSec: Double = 0
    /// Playback position when transcription started; pass 0 covers [firstStartSec, end], pass 1 covers [0, firstStartSec].
    var firstStartSec: Double = 0
    var pass: Int = 0
    /// Seconds of the book transcribed so far (for progress)
    var doneSec: Double = 0
    var linesCount: Int = 0
    /// audio seconds transcribed per wall-clock second
    var speed: Double = 0
    var error: String?
    var createdAt: Int64 = TxPaths.nowMs()
    var updatedAt: Int64 = TxPaths.nowMs()
    var serverConnectionConfigId: String?
    var serverAddress: String?
    var tracks: [TrackSource] = []
    // ---- ebook spelling check ----
    var libraryItemId: String?
    var ebookLocalUri: String?
    var chapters: [ChapterSource] = []
    /// none | queued | running | done | error | unavailable
    var ebookCheck: String = "none"
    var ebookCheckMessage: String?
    var ebookSuggestions: Int = 0
    // ---- sync with the server ----
    /// device | server: where this transcript was made
    var origin: String = "device"
    var deviceName: String?
    var language: String?

    init(key: String) { self.key = key }

    /// Lenient read (unknown fields ignored, missing ones defaulted), like Jackson with ignoreUnknown
    init(json o: [String: Any]) {
        key = TxJSON.str(o, "key") ?? ""
        title = TxJSON.str(o, "title") ?? ""
        modelId = TxJSON.str(o, "modelId") ?? ""
        status = TxJSON.str(o, "status") ?? TranscriptStatus.none
        phase = TxJSON.str(o, "phase") ?? ""
        phaseProgress = TxJSON.dbl(o, "phaseProgress")
        durationSec = TxJSON.dbl(o, "durationSec")
        processedSec = TxJSON.dbl(o, "processedSec")
        resumeSec = TxJSON.dbl(o, "resumeSec")
        firstStartSec = TxJSON.dbl(o, "firstStartSec")
        pass = TxJSON.int(o, "pass")
        doneSec = TxJSON.dbl(o, "doneSec")
        linesCount = TxJSON.int(o, "linesCount")
        speed = TxJSON.dbl(o, "speed")
        error = TxJSON.str(o, "error")
        createdAt = TxJSON.int64(o, "createdAt", TxPaths.nowMs())
        updatedAt = TxJSON.int64(o, "updatedAt", TxPaths.nowMs())
        serverConnectionConfigId = TxJSON.str(o, "serverConnectionConfigId")
        serverAddress = TxJSON.str(o, "serverAddress")
        tracks = ((o["tracks"] as? [Any]) ?? []).compactMap { ($0 as? [String: Any]).map { TrackSource(json: $0) } }
        libraryItemId = TxJSON.str(o, "libraryItemId")
        ebookLocalUri = TxJSON.str(o, "ebookLocalUri")
        chapters = ((o["chapters"] as? [Any]) ?? []).compactMap { ($0 as? [String: Any]).map { ChapterSource(json: $0) } }
        ebookCheck = TxJSON.str(o, "ebookCheck") ?? "none"
        ebookCheckMessage = TxJSON.str(o, "ebookCheckMessage")
        ebookSuggestions = TxJSON.int(o, "ebookSuggestions")
        origin = TxJSON.str(o, "origin") ?? "device"
        deviceName = TxJSON.str(o, "deviceName")
        language = TxJSON.str(o, "language")
    }

    /// meta.json content (Android: Jackson writeValue of the data class, nulls included)
    func toJSON() -> [String: Any] {
        return [
            "key": key,
            "title": title,
            "modelId": modelId,
            "status": status,
            "phase": phase,
            "phaseProgress": phaseProgress,
            "durationSec": durationSec,
            "processedSec": processedSec,
            "resumeSec": resumeSec,
            "firstStartSec": firstStartSec,
            "pass": pass,
            "doneSec": doneSec,
            "linesCount": linesCount,
            "speed": speed,
            "error": TxJSON.orNull(error),
            "createdAt": createdAt,
            "updatedAt": updatedAt,
            "serverConnectionConfigId": TxJSON.orNull(serverConnectionConfigId),
            "serverAddress": TxJSON.orNull(serverAddress),
            "tracks": tracks.map { $0.toJSON() },
            "libraryItemId": TxJSON.orNull(libraryItemId),
            "ebookLocalUri": TxJSON.orNull(ebookLocalUri),
            "chapters": chapters.map { $0.toJSON() },
            "ebookCheck": ebookCheck,
            "ebookCheckMessage": TxJSON.orNull(ebookCheckMessage),
            "ebookSuggestions": ebookSuggestions,
            "origin": origin,
            "deviceName": TxJSON.orNull(deviceName),
            "language": TxJSON.orNull(language)
        ]
    }

    func copy() -> TranscriptMeta { TranscriptMeta(json: toJSON()) }

    /// The status object the UI gets (Android: TranscriptMeta.toJs)
    func toJs() -> [String: Any] {
        let progress = durationSec > 0 ? min(1.0, max(0.0, doneSec / durationSec)) : 0.0
        // Absolute time ranges that are finished, so the UI can tell "not transcribed yet" from silence
        var ranges: [[Double]] = []
        if pass == 0 {
            ranges.append([firstStartSec, max(firstStartSec, resumeSec)])
        } else {
            ranges.append([firstStartSec, durationSec])
            ranges.append([0.0, pass >= 2 ? firstStartSec : min(resumeSec, firstStartSec)])
        }
        return [
            "key": key,
            "title": title,
            "modelId": modelId,
            "status": status,
            "phase": phase,
            "phaseProgress": phaseProgress,
            "durationSec": durationSec,
            "processedSec": processedSec,
            "progress": progress,
            "doneSec": doneSec,
            "firstStartSec": firstStartSec,
            "doneRanges": ranges,
            "linesCount": linesCount,
            "speed": speed,
            "error": TxJSON.orNull(error),
            "updatedAt": updatedAt,
            "ebookCheck": ebookCheck,
            "ebookCheckMessage": TxJSON.orNull(ebookCheckMessage),
            "ebookSuggestions": ebookSuggestions,
            "origin": origin,
            "deviceName": TxJSON.orNull(deviceName),
            "engine": "device"
        ]
    }
}

/// One transcript line: {"s","e","t"} plus "w" when the speech engine gave word times.
struct TranscriptLine {
    var start: Double
    var end: Double
    var text: String
    /// [word, start, end] per word, only when measured by the engine (Parakeet token timestamps).
    /// Lines without "w" are the "estimated" ones: readers spread the words over the line, and the
    /// server's karaoke .lrc marks those times as estimated. Same rule as the server (store.js lineJson).
    /// Differs from Android, which never writes "w" (it keeps line times only).
    var words: [(String, Double, Double)]?

    func toJson() -> String {
        var o: [String: Any] = [
            "s": TranscriptLine.round(start, 100),
            "e": TranscriptLine.round(end, 100),
            "t": text
        ]
        if let ws = words, !ws.isEmpty {
            o["w"] = ws.map { [$0.0, TranscriptLine.round($0.1, 1000), TranscriptLine.round($0.2, 1000)] as [Any] }
        }
        // Keys in the usual order (s, e, t, w), like the other writers
        var s = "{\"s\":" + TxJSON.stringify(o["s"]) + ",\"e\":" + TxJSON.stringify(o["e"]) + ",\"t\":" + TxJSON.stringify(o["t"])
        if let w = o["w"] { s += ",\"w\":" + TxJSON.stringify(w) }
        return s + "}"
    }

    static func round(_ v: Double, _ scale: Double) -> Double { (v * scale).rounded() / scale }
}

// MARK: - Ebook spelling suggestions (only the parts needed to apply/ignore them offline)

final class SpellingSuggestion {
    let id: String
    let lineStart: Double
    let wordIndex: Int
    /// how many transcript words are replaced (2 when the ebook joins two words)
    let wordCount: Int
    let heard: String
    let ebook: String
    let context: String
    let chapter: String
    var status: String // pending | applied | ignored
    /// Fields we don't use, passed through unchanged
    private let extra: [String: Any]

    init?(json o: [String: Any]) {
        guard let id = TxJSON.str(o, "id"), o["s"] is NSNumber, let heard = TxJSON.str(o, "heard"), let ebook = TxJSON.str(o, "ebook") else { return nil }
        self.id = id
        lineStart = TxJSON.dbl(o, "s")
        wordIndex = TxJSON.int(o, "wi")
        wordCount = TxJSON.int(o, "wn", 1)
        self.heard = heard
        self.ebook = ebook
        context = TxJSON.str(o, "context") ?? ""
        chapter = TxJSON.str(o, "chapter") ?? ""
        status = TxJSON.str(o, "status") ?? "pending"
        extra = o
    }

    func toJSON() -> [String: Any] {
        var o = extra
        o["id"] = id
        o["s"] = lineStart
        o["wi"] = wordIndex
        o["wn"] = wordCount
        o["heard"] = heard
        o["ebook"] = ebook
        o["context"] = context
        o["chapter"] = chapter
        o["status"] = status
        return o
    }
}

enum TxEbookText {
    // Same word pattern as EbookComparer.kt
    private static let wordRe = try! NSRegularExpression(pattern: "[\\p{L}\\p{N}]+(?:['’][\\p{L}]+)*", options: [])

    static func normalize(_ w: String) -> String {
        w.lowercased().replacingOccurrences(of: "’", with: "'").replacingOccurrences(of: "'", with: "")
    }

    /// Words with their UTF-16 ranges (Kotlin string indices are UTF-16 too)
    static func words(_ text: String) -> [(String, NSRange)] {
        let ns = text as NSString
        return wordRe.matches(in: text, options: [], range: NSRange(location: 0, length: ns.length)).map { (ns.substring(with: $0.range), $0.range) }
    }

    /// Replaces the suggested words inside a line's text, keeping punctuation around them (EbookComparer.applyToLine).
    static func applyToLine(_ text: String, _ fixes: [SpellingSuggestion]) -> String {
        let ws = words(text)
        let sb = NSMutableString(string: text)
        for f in fixes.sorted(by: { $0.wordIndex > $1.wordIndex }) {
            if f.wordIndex >= ws.count { continue }
            let lastIdx = f.wordIndex + f.wordCount - 1
            if lastIdx >= ws.count || lastIdx < f.wordIndex { continue }
            let heardNow = (f.wordIndex...lastIdx).map { ws[$0].0 }.joined(separator: " ")
            if normalize(heardNow).replacingOccurrences(of: " ", with: "") != normalize(f.heard).replacingOccurrences(of: " ", with: "") { continue } // line changed since
            let from = ws[f.wordIndex].1.location
            let to = ws[lastIdx].1.location + ws[lastIdx].1.length
            sb.replaceCharacters(in: NSRange(location: from, length: to - from), with: f.ebook)
        }
        return sb as String
    }
}

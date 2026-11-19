//
//  TranscriptStore.swift
//  ABS+ on-device transcription
//
//  Port of Android's TranscriptStore.kt. Same layout and file formats, under Application Support:
//    transcription/transcripts/{safe key}/meta.json
//    transcription/transcripts/{safe key}/lines.jsonl          one {"s","e","t"[,"w"]} object per line
//    transcription/transcripts/{safe key}/sync.json            { syncRevision, dirtySeq, syncedSeq }
//    transcription/transcripts/{safe key}/ebook-check.json     ebook spelling check (from the server)
//    transcription/transcripts/{safe key}/ebook-text.json      the ebook's paragraphs (karaoke view)
//    transcription/transcripts/{safe key}/lines.original.jsonl lines from before the first spelling fix
//    transcription/transcripts/{safe key}/lines.conflict.jsonl this phone's lines when the server's copy won
//    transcription/pending-deletes.json                        deletes still to be sent to the server
//

import Foundation

final class TranscriptStore {
    static let shared = TranscriptStore()

    /// Reentrant like Kotlin's @Synchronized (methods call each other)
    private let lock = NSRecursiveLock()
    private let fm = FileManager.default

    let root: URL

    init() {
        root = TxPaths.base.appendingPathComponent("transcripts", isDirectory: true)
        TxPaths.ensureDir(root)
    }

    private func locked<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try body()
    }

    static func safe(_ key: String) -> String {
        key.replacingOccurrences(of: "[^A-Za-z0-9._-]", with: "_", options: .regularExpression)
    }

    func dir(_ key: String) -> URL { root.appendingPathComponent(TranscriptStore.safe(key), isDirectory: true) }
    private func metaFile(_ key: String) -> URL { dir(key).appendingPathComponent("meta.json") }
    private func linesFile(_ key: String) -> URL { dir(key).appendingPathComponent("lines.jsonl") }
    private func checkFile(_ key: String) -> URL { dir(key).appendingPathComponent("ebook-check.json") }
    private func textFile(_ key: String) -> URL { dir(key).appendingPathComponent("ebook-text.json") }
    private func originalFile(_ key: String) -> URL { dir(key).appendingPathComponent("lines.original.jsonl") }
    private func conflictFile(_ key: String) -> URL { dir(key).appendingPathComponent("lines.conflict.jsonl") }
    private func syncFile(_ key: String) -> URL { dir(key).appendingPathComponent("sync.json") }
    private var pendingFile: URL { TxPaths.base.appendingPathComponent("pending-deletes.json") }

    private func exists(_ url: URL) -> Bool { fm.fileExists(atPath: url.path) }

    private func writeAtomic(_ s: String, to url: URL) {
        TxPaths.ensureDir(url.deletingLastPathComponent())
        do {
            try Data(s.utf8).write(to: url, options: .atomic)
        } catch {
            AbsLogger.error(message: "TranscriptStore: couldn't write \(url.lastPathComponent): \(error)")
        }
    }

    // MARK: meta

    func getMeta(_ key: String) -> TranscriptMeta? {
        locked {
            let f = metaFile(key)
            guard exists(f), let data = try? Data(contentsOf: f), let o = TxJSON.object(data) else { return nil }
            return TranscriptMeta(json: o)
        }
    }

    func saveMeta(_ meta: TranscriptMeta) {
        locked {
            meta.updatedAt = TxPaths.nowMs()
            writeAtomic(TxJSON.stringify(meta.toJSON()), to: metaFile(meta.key))
        }
    }

    func metaJson(_ meta: TranscriptMeta) -> [String: Any] { meta.toJSON() }

    // MARK: lines

    func appendLines(_ key: String, _ lines: [TranscriptLine]) {
        guard !lines.isEmpty else { return }
        locked {
            TxPaths.ensureDir(dir(key))
            let text = lines.map { $0.toJson() }.joined(separator: "\n") + "\n"
            let f = linesFile(key)
            if !exists(f) {
                writeAtomic(text, to: f)
            } else {
                do {
                    let h = try FileHandle(forWritingTo: f)
                    defer { try? h.close() }
                    try h.seekToEnd()
                    try h.write(contentsOf: Data(text.utf8))
                } catch {
                    AbsLogger.error(message: "TranscriptStore: append failed: \(error)")
                }
            }
            markDirty(key)
        }
    }

    private func lineStart(_ raw: String) -> Double? {
        guard let o = TxJSON.object(raw), let s = o["s"] as? NSNumber else { return nil }
        return s.doubleValue
    }

    /// Drops lines starting in [fromSec, toSec) (resuming a pass, so nothing is duplicated). Returns lines kept.
    @discardableResult
    func truncateLinesInRange(_ key: String, _ fromSec: Double, _ toSec: Double) -> Int {
        locked {
            let f = linesFile(key)
            guard exists(f) else { return 0 }
            let all = TxText.lines(of: f)
            let kept = all.filter { raw in
                guard let s = lineStart(raw) else { return false }
                return s < fromSec || s >= toSec
            }
            writeAtomic(TxText.joinLines(kept), to: f)
            if kept.count != all.count { markDirty(key) }
            return kept.count
        }
    }

    /// Drops lines that start at/after fromSec
    @discardableResult
    func truncateLinesFrom(_ key: String, _ fromSec: Double) -> Int {
        locked {
            let f = linesFile(key)
            guard exists(f) else { return 0 }
            let all = TxText.lines(of: f)
            let kept = all.filter { raw in (lineStart(raw) ?? .greatestFiniteMagnitude) < fromSec }
            writeAtomic(TxText.joinLines(kept), to: f)
            if kept.count != all.count { markDirty(key) }
            return kept.count
        }
    }

    /// Raw JSON lines starting at fromIndex
    func readLines(_ key: String, _ fromIndex: Int) -> [String] {
        locked {
            let f = linesFile(key)
            guard exists(f) else { return [] }
            let all = TxText.lines(of: f)
            let from = max(0, fromIndex)
            return from >= all.count ? [] : Array(all[from...])
        }
    }

    func originalLinesRaw(_ key: String) -> [String]? {
        locked {
            let f = originalFile(key)
            return exists(f) ? TxText.lines(of: f) : nil
        }
    }

    // MARK: ebook check / text

    /// The ebook's paragraphs (karaoke view). Not a "change" for sync on its own: it comes with the ebook check.
    func saveEbookText(_ key: String, _ json: [String: Any]) {
        locked { writeAtomic(TxJSON.stringify(json), to: textFile(key)) }
    }

    func getEbookText(_ key: String) -> [String: Any]? {
        locked {
            let f = textFile(key)
            guard exists(f), let d = try? Data(contentsOf: f) else { return nil }
            return TxJSON.object(d)
        }
    }

    /// Raw file content, spliced into sync uploads as is
    func ebookTextRaw(_ key: String) -> String? {
        locked {
            let f = textFile(key)
            guard exists(f), let d = try? Data(contentsOf: f) else { return nil }
            return String(data: d, encoding: .utf8)
        }
    }

    func saveEbookCheck(_ key: String, _ json: [String: Any]) {
        locked {
            writeAtomic(TxJSON.stringify(json), to: checkFile(key))
            markDirty(key)
        }
    }

    func getEbookCheck(_ key: String) -> [String: Any]? {
        locked {
            let f = checkFile(key)
            guard exists(f), let d = try? Data(contentsOf: f) else { return nil }
            return TxJSON.object(d)
        }
    }

    /// Sets the status of ebook suggestions; "applied" ones are written into the transcript text.
    /// The transcript from before the first correction is kept as lines.original.jsonl. Returns how many are still pending.
    func updateSuggestions(_ key: String, _ ids: Set<String>, _ status: String) -> Int {
        locked {
            guard var check = getEbookCheck(key), let arr = check["suggestions"] as? [Any] else { return 0 }
            let all = arr.compactMap { ($0 as? [String: Any]).flatMap { SpellingSuggestion(json: $0) } }
            var toApply: [SpellingSuggestion] = []
            for s in all where ids.contains(s.id) && s.status == "pending" {
                s.status = status
                if status == "applied" { toApply.append(s) }
            }
            if !toApply.isEmpty {
                let lf = linesFile(key)
                let backup = originalFile(key)
                if !exists(backup) && exists(lf) { try? fm.copyItem(at: lf, to: backup) }
                var byLine: [Int64: [SpellingSuggestion]] = [:]
                for s in toApply { byLine[Int64((s.lineStart * 100).rounded()), default: []].append(s) }
                let out: [String] = TxText.lines(of: lf).map { raw in
                    guard var o = TxJSON.object(raw), let sNum = o["s"] as? NSNumber, let t = o["t"] as? String else { return raw }
                    guard let fixes = byLine[Int64((sNum.doubleValue * 100).rounded())] else { return raw }
                    o["t"] = TxEbookText.applyToLine(t, fixes)
                    return TxJSON.stringify(o)
                }
                writeAtomic(TxText.joinLines(out), to: lf)
            }
            check["suggestions"] = all.map { $0.toJSON() }
            saveEbookCheck(key, check) // marks the transcript as changed, so it syncs
            return all.filter { $0.status == "pending" }.count
        }
    }

    // MARK: delete

    /// Deleted by the user: also remembered so the copy on the server is deleted at the next sync.
    func delete(_ key: String) {
        locked {
            let state = getSyncState(key)
            if state.syncRevision > 0, let meta = getMeta(key) {
                var pending = readPendingDeletes()
                pending[key] = ["revision": state.syncRevision, "configId": TxJSON.orNull(meta.serverConnectionConfigId)] as [String: Any]
                writePendingDeletes(pending)
            }
            try? fm.removeItem(at: dir(key))
        }
    }

    /// Removed because the server deleted it (no delete is sent back).
    func deleteLocalOnly(_ key: String) {
        locked { _ = try? fm.removeItem(at: dir(key)) }
    }

    // MARK: sync state
    //   syncRevision = server revision this copy was last pushed as / pulled from
    //   dirtySeq goes up with every local change; syncedSeq = the dirtySeq that was last pushed

    struct SyncState {
        var syncRevision: Int64 = 0
        var dirtySeq: Int64 = 0
        var syncedSeq: Int64 = 0
        /// Changed here since the last sync (or never synced)
        var dirty: Bool { dirtySeq != syncedSeq || syncRevision == 0 }
    }

    func getSyncState(_ key: String) -> SyncState {
        locked {
            let f = syncFile(key)
            guard exists(f), let d = try? Data(contentsOf: f), let o = TxJSON.object(d) else { return SyncState() }
            return SyncState(syncRevision: TxJSON.int64(o, "syncRevision"), dirtySeq: TxJSON.int64(o, "dirtySeq"), syncedSeq: TxJSON.int64(o, "syncedSeq"))
        }
    }

    func saveSyncState(_ key: String, _ s: SyncState) {
        locked {
            guard exists(dir(key)) else { return }
            writeAtomic(TxJSON.stringify(["syncRevision": s.syncRevision, "dirtySeq": s.dirtySeq, "syncedSeq": s.syncedSeq] as [String: Any]), to: syncFile(key))
        }
    }

    func markDirty(_ key: String) {
        locked {
            guard exists(dir(key)) else { return }
            var s = getSyncState(key)
            s.dirtySeq += 1
            saveSyncState(key, s)
        }
    }

    /// After a successful push of the state at seq: anything changed during the upload stays dirty.
    func markSynced(_ key: String, _ revision: Int64, _ seq: Int64) {
        locked {
            var s = getSyncState(key)
            s.syncRevision = revision
            if s.dirtySeq == seq { s.syncedSeq = seq }
            saveSyncState(key, s)
        }
    }

    func readPendingDeletes() -> [String: Any] {
        locked {
            guard let d = try? Data(contentsOf: pendingFile), let o = TxJSON.object(d) else { return [:] }
            return o
        }
    }

    func writePendingDeletes(_ o: [String: Any]) {
        locked { writeAtomic(TxJSON.stringify(o), to: pendingFile) }
    }

    func clearPendingDelete(_ key: String) {
        locked {
            var o = readPendingDeletes()
            if o[key] != nil {
                o.removeValue(forKey: key)
                writePendingDeletes(o)
            }
        }
    }

    /// Keeps the local copy around when the server's version wins a conflict.
    func backupForConflict(_ key: String) {
        locked {
            let lf = linesFile(key)
            guard exists(lf) else { return }
            let dest = conflictFile(key)
            try? fm.removeItem(at: dest)
            try? fm.copyItem(at: lf, to: dest)
        }
    }

    /// Replaces the local copy with the server's (meta, lines, ebook check, original lines).
    func replaceFromServer(_ key: String, serverMeta: [String: Any], lines: [Any], ebookCheck: [String: Any]?, original: [Any]?,
                           revision: Int64, local: TranscriptMeta?, configId: String?, serverAddress: String?, ebookText: [String: Any]?) -> TranscriptMeta {
        locked {
            TxPaths.ensureDir(dir(key))
            var sm = serverMeta
            sm.removeValue(forKey: "tracks")
            sm["key"] = key
            let meta = TranscriptMeta(json: sm)
            meta.tracks = []
            meta.serverConnectionConfigId = configId ?? local?.serverConnectionConfigId
            meta.serverAddress = serverAddress ?? local?.serverAddress
            meta.ebookLocalUri = local?.ebookLocalUri
            if meta.libraryItemId == nil { meta.libraryItemId = key }
            meta.linesCount = lines.count

            writeAtomic(TxText.joinLines(lines.map { TxJSON.stringify($0) }), to: linesFile(key))
            if let c = ebookCheck {
                writeAtomic(TxJSON.stringify(c), to: checkFile(key))
            } else {
                try? fm.removeItem(at: checkFile(key))
            }
            if let t = ebookText, t["paragraphs"] != nil { saveEbookText(key, t) }
            if let o = original, !o.isEmpty {
                writeAtomic(TxText.joinLines(o.map { TxJSON.stringify($0) }), to: originalFile(key))
            } else {
                try? fm.removeItem(at: originalFile(key))
            }
            // Written as is: keeps the server's updatedAt (Android writes it with the mapper directly too)
            writeAtomic(TxJSON.stringify(meta.toJSON()), to: metaFile(key))

            var s = getSyncState(key)
            s.syncRevision = revision
            s.syncedSeq = s.dirtySeq
            saveSyncState(key, s)
            clearPendingDelete(key)
            return meta
        }
    }

    func listAll() -> [TranscriptMeta] {
        locked {
            guard let dirs = try? fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) else { return [] }
            return dirs.compactMap { d -> TranscriptMeta? in
                let f = d.appendingPathComponent("meta.json")
                guard let data = try? Data(contentsOf: f), let o = TxJSON.object(data) else { return nil }
                return TranscriptMeta(json: o)
            }
        }
    }
}

//
//  TranscriptSync.swift
//  ABS+ on-device transcription
//
//  Port of Android's TranscriptSync.kt: two-way sync of transcripts between this phone and an
//  Audiobookshelf server running the abs-transcription add-on (/api/transcription).
//
//  Each side keeps a revision number. The server bumps its revision on every change; the phone
//  remembers the revision it last pushed or pulled (sync.json) and whether it changed anything since.
//
//    changed here only     -> push
//    changed there only    -> pull (only finished transcripts; a running job is shown live from the server)
//    changed on both sides -> the more complete copy wins (finished > unfinished > more transcribed > newer);
//                             if the server wins, the phone's lines are kept as lines.conflict.jsonl
//    deleted here          -> deleted there too, unless the server copy changed since
//    deleted there         -> deleted here, unless the phone changed it since
//
//  While the phone is transcribing, its partial transcript is pushed every 10 minutes. That also tells
//  the server the book is being transcribed on this phone, so nobody starts it there at the same time.
//  The server only accepts phone transcripts from admins: a 403 keeps the transcript on the phone ("local-only").
//  Servers without the add-on answer 404 and are left alone.
//
//  Needs no speech engine: server- and Android-made transcripts reach the iPhone (offline too) without sherpa-onnx.
//

import Foundation
import UIKit
import RealmSwift

/// Address and token of a server connection, copied out of Realm (Realm objects are thread-bound)
struct TxServer {
    let configId: String?
    let address: String
    let token: String?

    /// The config with this id (or the active one), else the address saved with the transcript.
    /// Differs from Android: the active server's token is only sent to that same server's address.
    static func resolve(configId: String?, fallbackAddress: String?) -> TxServer? {
        return autoreleasepool { () -> TxServer? in
            guard let realm = try? Realm() else { return nil }
            realm.refresh()
            var config: ServerConnectionConfig?
            if let id = configId { config = realm.object(ofType: ServerConnectionConfig.self, forPrimaryKey: id) }
            let active: ServerConnectionConfig? = {
                guard let index = realm.objects(ServerConnectionConfigActiveIndex.self).first?.index else { return nil }
                return realm.objects(ServerConnectionConfig.self).first(where: { $0.index == index })
            }()
            if config == nil && configId == nil { config = active }
            if let c = config, !c.address.isEmpty {
                return TxServer(configId: c.id, address: TxServer.trim(c.address), token: c.token)
            }
            guard let addr = fallbackAddress.map(TxServer.trim), !addr.isEmpty else { return nil }
            var token: String?
            if let a = active, TxServer.trim(a.address) == addr { token = a.token }
            return TxServer(configId: configId, address: addr, token: token)
        }
    }

    static func activeConfigId() -> String? {
        return autoreleasepool { () -> String? in
            guard let realm = try? Realm() else { return nil }
            realm.refresh()
            guard let index = realm.objects(ServerConnectionConfigActiveIndex.self).first?.index else { return nil }
            return realm.objects(ServerConnectionConfig.self).first(where: { $0.index == index })?.id
        }
    }

    private static func trim(_ s: String) -> String {
        var a = s
        while a.hasSuffix("/") { a.removeLast() }
        return a
    }

    func base(_ key: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        let enc = key.addingPercentEncoding(withAllowedCharacters: allowed) ?? key
        return "\(address)/api/transcription/items/\(enc)"
    }
}

enum TranscriptSync {
    /// How often a running transcription checks in with the server
    static let partialPushInterval: TimeInterval = 10 * 60

    private static let queue = DispatchQueue(label: "abs-transcript-sync", qos: .utility)
    private static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 180
        c.timeoutIntervalForResource = 600
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    /// Books whose upload the server refused because this user isn't an admin: their transcript stays on the phone
    private static let localOnlyLock = NSLock()
    private static var localOnly = Set<String>()

    /// Set once from the main thread (UIDevice); "iPhone"/"iPad" only, never the user's device name
    static var deviceNameValue: String = "iPhone"

    static func captureDeviceName() {
        if Thread.isMainThread {
            deviceNameValue = UIDevice.current.model
        } else {
            DispatchQueue.main.async { TranscriptSync.deviceNameValue = UIDevice.current.model }
        }
    }

    static func async(_ key: String, allowPull: Bool = true) {
        queue.async {
            _ = TranscriptSync.sync(key, allowPull: allowPull, configIdHint: nil)
        }
    }

    /// Syncs every transcript on the phone (and sends pending deletes).
    static func asyncAll() {
        queue.async {
            let store = TranscriptStore.shared
            var keys = Set(store.listAll().map { $0.key })
            for k in store.readPendingDeletes().keys { keys.insert(k) }
            for k in keys { _ = TranscriptSync.sync(k, allowPull: true, configIdHint: nil) }
        }
    }

    /// Runs on the sync queue and waits for the result (for the UI). Call off the main thread.
    static func syncNow(_ key: String, allowPull: Bool, configId: String?, timeout: TimeInterval = 60) -> String {
        let result = TxBox<String?>(nil)
        let sem = DispatchSemaphore(value: 0)
        queue.async {
            result.value = TranscriptSync.sync(key, allowPull: allowPull, configIdHint: configId)
            sem.signal()
        }
        if sem.wait(timeout: .now() + timeout) == .timedOut { return "error: timeout" }
        return result.value ?? "error"
    }

    static func deviceId() -> String {
        let f = TxPaths.base.appendingPathComponent("device-id")
        if let d = try? Data(contentsOf: f), let s = String(data: d, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
            return s
        }
        let id = UUID().uuidString.lowercased()
        try? Data(id.utf8).write(to: f, options: .atomic)
        return id
    }

    private static func isRunningLocally(_ key: String) -> Bool { TranscriptionHub.shared.isTranscribing(key) }

    private static func emit(_ data: [String: Any]) {
        TranscriptionHub.shared.emit("onTranscriptionUpdate", data)
    }

    // MARK: HTTP

    private struct Resp {
        let code: Int
        let body: Data?
        var json: [String: Any]? { body.flatMap { TxJSON.object($0) } }
    }

    private static func call(_ server: TxServer, _ method: String, _ url: String, body: Data? = nil, gzip: Bool = false) -> Resp {
        func attempt(_ token: String?) -> Resp {
            guard let u = URL(string: url) else { return Resp(code: -1, body: nil) }
            var req = URLRequest(url: u)
            req.httpMethod = method
            if let t = token, !t.isEmpty { req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            if method != "GET" && method != "DELETE" {
                req.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
                req.httpBody = body ?? Data()
                if gzip { req.setValue("gzip", forHTTPHeaderField: "Content-Encoding") }
            }
            let box = TxBox(Resp(code: -1, body: nil))
            let sem = DispatchSemaphore(value: 0)
            let task = session.dataTask(with: req) { data, response, _ in
                box.value = Resp(code: (response as? HTTPURLResponse)?.statusCode ?? -1, body: data)
                sem.signal()
            }
            task.resume()
            sem.wait()
            return box.value
        }
        var res = attempt(server.token)
        // Differs from Android (which refreshes the token itself): retry once with a newer token if the
        // app has refreshed it meanwhile. Refreshing here as well could race the app's refresh and sign the user out.
        if res.code == 401, let fresh = TxServer.resolve(configId: server.configId, fallbackAddress: server.address)?.token, fresh != server.token {
            res = attempt(fresh)
        }
        return res
    }

    // MARK: sync

    /// One sync step for key (always on the sync queue). Returns what happened (for logs and the UI).
    private static func sync(_ key: String, allowPull: Bool, configIdHint: String?) -> String {
        if key.hasPrefix("local_") { return "local-only" } // not linked to a server item
        let store = TranscriptStore.shared
        let meta = store.getMeta(key)
        let pending = store.readPendingDeletes()[key] as? [String: Any]

        // ---- deleted on the phone: delete on the server too
        if meta == nil, let pending = pending {
            let cid = TxJSON.str(pending, "configId").flatMap { $0.isEmpty || $0 == "null" ? nil : $0 } ?? configIdHint
            guard let server = TxServer.resolve(configId: cid, fallbackAddress: nil) else { return "offline" }
            let rev = TxJSON.int64(pending, "revision")
            let r = call(server, "DELETE", "\(server.base(key))/sync?baseRevision=\(rev)")
            switch r.code {
            case 200, 404, 403:
                store.clearPendingDelete(key)
                return r.code == 200 ? "deleted-on-server" : "delete-skipped"
            case 409:
                store.clearPendingDelete(key) // newer edits on the server win over the delete
                return "server-changed"
            case -1:
                return "offline"
            default:
                return "error \(r.code)"
            }
        }
        if meta != nil && pending != nil { store.clearPendingDelete(key) } // transcribed again since the delete

        guard let server = TxServer.resolve(configId: meta?.serverConnectionConfigId ?? configIdHint, fallbackAddress: meta?.serverAddress) else { return "offline" }
        let st = call(server, "GET", "\(server.base(key))/status")
        if st.code == -1 { return "offline" }
        if st.code == 401 { return "signed-out" }
        guard st.code == 200, let srv = st.json else { return "unsupported" } // no add-on on this server, or no access
        guard srv["revision"] != nil else { return "unsupported" }

        let serverStatus = TxJSON.str(srv, "status") ?? "none"
        let serverRev = TxJSON.int64(srv, "revision")
        let serverHas = serverStatus != "none"
        let serverEngine = TxJSON.str(srv, "engine") ?? "server"
        let serverActive = serverStatus == "running" || serverStatus == "queued"
        let serverJob = serverHas && serverActive && serverEngine == "server"

        // ---- nothing here
        guard let local = meta else {
            if !serverHas { return "none" }
            if !allowPull { return "remote-only" }
            if serverActive { return "remote-running" }
            if serverEngine == "server" && serverStatus != "done" { return "remote-partial" }
            return pull(store, server, key, nil)
        }

        let state = store.getSyncState(key)
        let serverChanged = serverRev != state.syncRevision

        // ---- this phone is transcribing it: check in with the partial transcript
        if isRunningLocally(key) {
            if serverJob { return "busy" }
            return push(store, server, key, local, base: serverChanged ? serverRev : state.syncRevision, force: serverChanged)
        }

        if !serverHas {
            if TxJSON.bool(srv, "deleted") && state.syncRevision > 0 && state.dirtySeq == state.syncedSeq {
                store.deleteLocalOnly(key)
                emit(["key": key, "status": TranscriptStatus.none, "deleted": true])
                return "deleted-here"
            }
            return push(store, server, key, local, base: serverRev, force: false)
        }
        if !serverChanged && !state.dirty { return "up-to-date" }
        if !serverChanged { return push(store, server, key, local, base: serverRev, force: false) }
        if serverActive { return "remote-running" } // keep ours until the other job is finished
        if !state.dirty { return allowPull ? pull(store, server, key, local) : "remote-newer" }

        // ---- changed on both sides: the more complete copy wins
        let localDone = local.status == TranscriptStatus.done
        let serverDone = serverStatus == "done"
        let serverDoneSec = TxJSON.dbl(srv, "doneSec")
        let localWins: Bool
        if localDone != serverDone { localWins = localDone }
        else if abs(local.doneSec - serverDoneSec) > 1.0 { localWins = local.doneSec > serverDoneSec }
        else { localWins = local.updatedAt >= TxJSON.int64(srv, "updatedAt") }
        if localWins { return push(store, server, key, local, base: serverRev, force: true) }
        store.backupForConflict(key)
        return pull(store, server, key, local)
    }

    private static func push(_ store: TranscriptStore, _ server: TxServer, _ key: String, _ meta: TranscriptMeta, base: Int64, force: Bool) -> String {
        let localOnlyKey = server.base(key)
        localOnlyLock.lock()
        let refused = localOnly.contains(localOnlyKey)
        localOnlyLock.unlock()
        if refused { return "local-only" }

        let seq = store.getSyncState(key).dirtySeq
        var m = store.metaJson(meta)
        for f in ["tracks", "ebookLocalUri", "serverConnectionConfigId", "serverAddress", "origin", "deviceName"] { m.removeValue(forKey: f) }
        let running = isRunningLocally(key)
        // A job the app was stopped in the middle of isn't running any more
        if !running && (meta.status == TranscriptStatus.running || meta.status == TranscriptStatus.queued) { m["status"] = TranscriptStatus.paused }
        if running { m["status"] = TranscriptStatus.running }

        let head: [String: Any] = [
            "baseRevision": base,
            "force": force,
            "deviceId": deviceId(),
            "deviceName": deviceNameValue,
            "meta": m,
            "ebookCheck": TxJSON.orNull(store.getEbookCheck(key))
        ]
        // Lines are already JSON: splice them in instead of re-parsing a few MB
        let lines = store.readLines(key, 0)
        var body = TxJSON.stringify(head)
        body.removeLast() // the closing brace
        body += ",\"lines\":[" + lines.joined(separator: ",") + "]"
        if let original = store.originalLinesRaw(key) { body += ",\"originalLines\":[" + original.joined(separator: ",") + "]" }
        if let text = store.ebookTextRaw(key), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { body += ",\"ebookText\":" + text }
        body += "}"

        let raw = Data(body.utf8)
        var r: Resp
        if let gz = TxGzip.gzip(raw) {
            r = call(server, "PUT", "\(server.base(key))/sync", body: gz, gzip: true)
            // iOS only: if the server couldn't read our gzip, send it plain once
            if r.code == 400 || r.code == 415 { r = call(server, "PUT", "\(server.base(key))/sync", body: raw, gzip: false) }
        } else {
            r = call(server, "PUT", "\(server.base(key))/sync", body: raw, gzip: false)
        }
        if r.code == 200 {
            let rev = r.json.map { TxJSON.int64($0, "revision") } ?? 0
            if rev > 0 { store.markSynced(key, rev, seq) }
            AbsLogger.info(message: "TranscriptSync: pushed \(key) (\(lines.count) lines) as revision \(rev)")
            return "pushed"
        }
        if r.code == 409 {
            return (r.json.map { TxJSON.bool($0, "busy") } ?? false) ? "busy" : "conflict"
        }
        // Only admins share phone transcripts with the server: keep this one here and stop offering it
        if r.code == 403 {
            localOnlyLock.lock()
            localOnly.insert(localOnlyKey)
            localOnlyLock.unlock()
            AbsLogger.info(message: "TranscriptSync: \(key) stays on this phone (only admins share transcripts with the server)")
            return "local-only"
        }
        if r.code == -1 { return "offline" }
        return "error \(r.code)"
    }

    private static func pull(_ store: TranscriptStore, _ server: TxServer, _ key: String, _ local: TranscriptMeta?) -> String {
        let r = call(server, "GET", "\(server.base(key))/sync")
        guard r.code == 200, let o = r.json else { return r.code == -1 ? "offline" : "error \(r.code)" }
        if TxJSON.bool(o, "deleted") || !(o["meta"] is [String: Any]) {
            if local != nil {
                store.deleteLocalOnly(key)
                emit(["key": key, "status": TranscriptStatus.none, "deleted": true])
                return "deleted-here"
            }
            return "none"
        }
        let configAddress = TxServer.resolve(configId: server.configId, fallbackAddress: nil)?.address
        let meta = store.replaceFromServer(
            key,
            serverMeta: o["meta"] as? [String: Any] ?? [:],
            lines: o["lines"] as? [Any] ?? [],
            ebookCheck: o["ebookCheck"] as? [String: Any],
            original: o["originalLines"] as? [Any],
            revision: TxJSON.int64(o, "revision"),
            local: local,
            configId: server.configId,
            serverAddress: configAddress ?? server.address,
            ebookText: o["ebookText"] as? [String: Any]
        )
        AbsLogger.info(message: "TranscriptSync: pulled \(key) (\(meta.linesCount) lines, revision \(TxJSON.int64(o, "revision")))")
        var js = meta.toJs()
        js["reload"] = true
        emit(js)
        return "pulled"
    }
}

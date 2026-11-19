//
//  AbsTranscriber.swift
//  ABS+ on-device transcription
//
//  Capacitor bridge for the Transcription view: the iOS port of Android's plugins/AbsTranscriber.kt.
//  Same jsName, methods, arguments, results and events (onTranscriptionUpdate, onModelDownload).
//
//  Works without the speech engine (sherpa-onnx): transcripts, sync with the server, status and the
//  model list all work; only starting a transcription needs it (see ios/App/scripts/fetch-sherpa-onnx.sh).
//

import Foundation
import Capacitor
import UIKit
import UniformTypeIdentifiers
import RealmSwift

@objc(AbsTranscriber)
public class AbsTranscriber: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public var identifier = "AbsTranscriberPlugin"
    public var jsName = "AbsTranscriber"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getModels", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTranscriptStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTranscript", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listTranscripts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startTranscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "downloadModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "importModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkWithEbook", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEbookCheck", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateSuggestions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelTranscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelModelDownload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseTranscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteTranscript", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncTranscript", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEbookText", returnType: CAPPluginReturnPromise)
    ]

    private let store = TranscriptStore.shared
    private let models = TxModelManager.shared
    private let hub = TranscriptionHub.shared
    private let io = DispatchQueue(label: "abs-transcriber-plugin", qos: .userInitiated)
    /// Sync calls wait up to a minute: on their own queue so status calls aren't held up behind them
    private let syncCalls = DispatchQueue(label: "abs-transcriber-plugin-sync", qos: .userInitiated)
    private var listenerId: UUID?
    private var pendingImport: (call: CAPPluginCall, model: AsrModelInfo)?

    override public func load() {
        TranscriptionBackground.shared.start()
        listenerId = hub.addListener { [weak self] event, data in
            DispatchQueue.main.async { self?.notifyListeners(event, data: data) }
        }
    }

    deinit {
        if let id = listenerId { TranscriptionHub.shared.removeListener(id) }
    }

    private func background(_ call: CAPPluginCall, on queue: DispatchQueue? = nil, _ block: @escaping () throws -> Void) {
        (queue ?? io).async {
            do { try block() } catch { call.reject(error.localizedDescription) }
        }
    }

    private func requireKey(_ call: CAPPluginCall) throws -> String {
        guard let key = call.getString("key"), !key.isEmpty else { throw TxError.message("key required") }
        return key
    }

    // MARK: models

    /// Rough device class, like Android's DeviceProfile.tier (big models on small phones take many hours)
    private func deviceTier() -> String {
        let gb = Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824
        let cores = ProcessInfo.processInfo.processorCount
        if gb >= 5.5 && cores >= 6 { return "high" }
        if gb < 3.5 { return "low" }
        return "mid"
    }

    @objc func getModels(_ call: CAPPluginCall) {
        background(call) { [self] in
            let current = hub.currentJob
            let tier = deviceTier()
            let heavy: Set<String> = ["parakeet-tdt-v2-en", "parakeet-tdt-v3", "whisper-small"]
            var arr: [[String: Any]] = []
            for m in TxModelCatalog.models {
                let installed = models.isInstalled(m)
                var o: [String: Any] = [
                    "id": m.id,
                    "name": m.name,
                    "description": m.description,
                    "languages": m.languages,
                    "sizeLabel": m.sizeLabel,
                    // Differs from Android (the .tar.bz2 link): iPhone can't unpack the archive, so this is
                    // the page with the separate files, and fileName lists them (for "Import model file")
                    "url": m.filesPageUrl,
                    "fileName": m.files.map { $0.name }.joined(separator: ", "),
                    "archiveUrl": m.archiveUrl,
                    "files": m.files.map { ["name": $0.name, "bytes": $0.bytes, "url": m.fileUrl($0).absoluteString] as [String: Any] },
                    "installed": installed,
                    "installedBytes": installed ? models.installedSizeBytes(m) : Int64(0),
                    "downloading": current == .downloadModel(m.id)
                ]
                if tier == "low" && heavy.contains(m.id) {
                    o["fit"] = "slow"
                    o["fitNote"] = "Slow on this phone: expect a 10-hour book to take most of a day. Moonshine or Whisper Base are faster here."
                } else if tier == "high" && heavy.contains(m.id) {
                    o["fit"] = "good"
                }
                arr.append(o)
            }
            call.resolve([
                "models": arr,
                "defaultModelId": TxModelCatalog.defaultModelId,
                "deviceTier": tier,
                "threads": TranscriptionEngine.recognizerThreads(),
                // iOS only: false when the app was built without sherpa-onnx
                "engineAvailable": TranscriptionEngine.isAvailable
            ])
        }
    }

    @objc func downloadModel(_ call: CAPPluginCall) {
        guard let id = call.getString("modelId") else { return call.reject("modelId required") }
        guard TxModelCatalog.get(id) != nil else { return call.reject("Unknown model") }
        hub.enqueue(.downloadModel(id))
        call.resolve()
    }

    @objc func cancelModelDownload(_ call: CAPPluginCall) {
        guard let id = call.getString("modelId") else { return call.reject("modelId required") }
        TranscriptionBackground.shared.forgetModelDownload(id)
        hub.cancel("model:" + id)
        call.resolve()
    }

    /// Offline install: the file picker, to choose the model's files (or the folder they're in) that were
    /// downloaded on a computer. Differs from Android, which takes the .tar.bz2: iOS can't unpack it.
    /// Progress arrives as onModelDownload with import: true.
    @objc func importModel(_ call: CAPPluginCall) {
        guard let id = call.getString("modelId") else { return call.reject("modelId required") }
        guard let model = TxModelCatalog.get(id) else { return call.reject("Unknown model") }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let vc = self.bridge?.viewController else { return call.reject("Can't show the file picker right now") }
            if let previous = self.pendingImport { previous.call.resolve(["cancelled": true]) }
            self.pendingImport = (call, model)
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.folder, UTType.item], asCopy: false)
            picker.allowsMultipleSelection = true
            picker.delegate = self
            vc.present(picker, animated: true)
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingImport?.call.resolve(["cancelled": true])
        pendingImport = nil
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let pending = pendingImport else { return }
        pendingImport = nil
        let model = pending.model
        if urls.isEmpty {
            pending.call.resolve(["cancelled": true])
            return
        }
        pending.call.resolve(["cancelled": false])

        let flag = "model:" + model.id
        let accessed = urls.map { ($0, $0.startAccessingSecurityScopedResource()) }
        io.async { [weak self] in
            guard let self = self else { return }
            defer { accessed.forEach { if $0.1 { $0.0.stopAccessingSecurityScopedResource() } } }
            func evt(_ status: String) -> [String: Any] { ["modelId": model.id, "status": status, "import": true] }
            do {
                try self.models.importFiles(model, from: urls, isCancelled: { [weak self] in self?.hub.isCancelled(flag) ?? false }) { read, total in
                    var e = evt("downloading")
                    e["progress"] = total > 0 ? Double(read) / Double(total) : 0
                    e["bytes"] = read
                    e["total"] = total
                    self.hub.emit("onModelDownload", e)
                }
                var done = evt("done")
                done["progress"] = 1.0
                self.hub.emit("onModelDownload", done)
            } catch {
                var e = evt("error")
                e["error"] = error.localizedDescription
                self.hub.emit("onModelDownload", e)
            }
        }
    }

    @objc func deleteModel(_ call: CAPPluginCall) {
        background(call) { [self] in
            guard let m = TxModelCatalog.get(call.getString("modelId")) else { throw TxError.message("Unknown model") }
            models.delete(m)
            call.resolve()
        }
    }

    // MARK: transcripts

    /// A job marked running but not actually running (app was stopped) is reported as paused.
    private func withLiveStatus(_ meta: TranscriptMeta) -> TranscriptMeta {
        if meta.status == TranscriptStatus.running || meta.status == TranscriptStatus.queued {
            if !hub.isTranscribing(meta.key) { meta.status = TranscriptStatus.paused }
        }
        return meta
    }

    /// Status of a transcript, { status: 'none' } when the item has never been transcribed.
    @objc func getTranscriptStatus(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            if let meta = store.getMeta(key) {
                call.resolve(withLiveStatus(meta).toJs())
            } else {
                call.resolve(["key": key, "status": TranscriptStatus.none])
            }
        }
    }

    /// Lines from fromIndex: { lines: [{s, e, t, w?}], fromIndex, status: {...} }
    @objc func getTranscript(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            let from = call.getInt("fromIndex") ?? 0
            let lines: [[String: Any]] = store.readLines(key, from).compactMap { TxJSON.object($0) }
            let status: [String: Any]
            if let meta = store.getMeta(key) { status = withLiveStatus(meta).toJs() } else { status = ["status": TranscriptStatus.none] }
            call.resolve(["lines": lines, "fromIndex": from, "status": status])
        }
    }

    @objc func listTranscripts(_ call: CAPPluginCall) {
        background(call) { [self] in
            call.resolve(["transcripts": store.listAll().map { withLiveStatus($0).toJs() }])
        }
    }

    /// What startTranscription needs from the player's session, copied out of Realm on this thread
    private struct SessionInfo {
        var title = ""
        var duration = 0.0
        var currentTime = 0.0
        var libraryItemId: String?
        var localItemId: String?
        var serverConnectionConfigId: String?
        var serverAddress: String?
        var chapters: [ChapterSource] = []
        var tracks: [TrackSource] = []
    }

    private func readSession() throws -> SessionInfo {
        return try autoreleasepool { () throws -> SessionInfo in
            guard let session = PlayerHandler.getPlaybackSession() else {
                throw TxError.message("Start playing the book first, then open Transcription.")
            }
            var info = SessionInfo()
            info.title = session.displayTitle ?? ""
            info.duration = session.totalDuration
            info.currentTime = session.currentTime
            info.libraryItemId = session.libraryItemId
            info.localItemId = session.localLibraryItem?.id
            info.serverConnectionConfigId = session.serverConnectionConfigId
            info.serverAddress = session.serverAddress
            info.chapters = session.chapters.map { ChapterSource(start: $0.start, end: $0.end, title: $0.title ?? "") }
            if !session.isLocal && session.playMethod == PlayMethod.transcode.rawValue {
                throw TxError.message("This book is being transcoded by the server, which can't be transcribed. Download the book to the device and try again.")
            }
            var offset = 0.0
            for t in session.audioTracks {
                let start = t.startOffset ?? offset
                offset = start + t.duration
                if session.isLocal {
                    let lf = t.getLocalFile()
                    let source = lf?.contentPath.absoluteString ?? (t.contentUrl ?? "")
                    let ext = (lf?.filename as NSString?)?.pathExtension
                    info.tracks.append(TrackSource(source: source, startOffset: start, duration: t.duration, remote: false, localFileId: t.localFileId, ext: ext))
                } else {
                    // The file's own address (/api/items/{id}/file/{ino}), as the iOS player builds it: it keeps
                    // working after the playback session closes (a session track URL doesn't). Android uses contentUrl.
                    let path = t.metadata?.path ?? ""
                    let ino = session.libraryItem?.media?.audioFiles.first(where: { $0.metadata?.path == path })?.ino ?? ""
                    let source: String
                    if let itemId = session.libraryItemId, !ino.isEmpty, !path.isEmpty {
                        source = "/api/items/\(itemId)/file/\(ino)"
                    } else {
                        source = t.contentUrl ?? ""
                    }
                    info.tracks.append(TrackSource(source: source, startOffset: start, duration: t.duration, remote: true, localFileId: nil, ext: t.metadata?.ext))
                }
            }
            return info
        }
    }

    /// Starts (or resumes) transcribing the item that is loaded in the player. { key, modelId, restart?, startSec? }
    @objc func startTranscription(_ call: CAPPluginCall) {
        guard TranscriptionEngine.isAvailable else {
            return call.reject(TranscriptionEngine.noEngineMessage)
        }
        background(call) { [self] in
            let key = try requireKey(call)
            let restart = call.getBool("restart") ?? false
            let existing = store.getMeta(key)
            let modelId = call.getString("modelId") ?? existing?.modelId ?? TxModelCatalog.defaultModelId
            guard TxModelCatalog.get(modelId) != nil else { throw TxError.message("Unknown model") }

            let meta: TranscriptMeta
            if let e = existing, !restart, e.modelId == modelId, !e.tracks.isEmpty, e.status != TranscriptStatus.done {
                meta = e // resume where it left off
            } else {
                let s = try readSession()
                // iOS only: make sure the player holds this book (Android takes whatever is playing)
                if s.libraryItemId != key && s.localItemId != key {
                    throw TxError.message("Start playing this book first, then open Transcription.")
                }
                if s.tracks.isEmpty { throw TxError.message("This item has no audio tracks") }
                store.delete(key)
                // Start where the listener is, so the part they're hearing is transcribed first
                // (the beginning of the book is done afterwards). Back up a little for context.
                let position = (call.getDouble("startSec") ?? s.currentTime) - 30.0
                let firstStart = (position > 60.0 && position < s.duration - 60.0) ? position : 0.0
                let m = TranscriptMeta(key: key)
                m.title = s.title
                m.modelId = modelId
                m.durationSec = s.duration
                m.firstStartSec = firstStart
                m.resumeSec = firstStart
                m.libraryItemId = s.libraryItemId
                m.ebookLocalUri = nil // the on-device ebook check isn't ported to iOS (the server does it)
                m.chapters = s.chapters
                m.serverConnectionConfigId = s.serverConnectionConfigId ?? TxServer.activeConfigId()
                m.serverAddress = s.serverAddress
                m.tracks = s.tracks
                meta = m
            }
            meta.status = TranscriptStatus.queued
            meta.error = nil
            store.saveMeta(meta)
            hub.enqueue(.transcribe(key))
            call.resolve(meta.toJs())
        }
    }

    /// Differs from Android: the spelling check against the ebook isn't ported to the phone on iOS.
    /// The app sends it to the server (plugins/transcriber.js checkWithEbook), which is the normal path on Android too.
    @objc func checkWithEbook(_ call: CAPPluginCall) {
        call.reject("Checking spelling against the book needs your server: connect and try again.")
    }

    /// { check: { chapters, suggestions, ... } | null }
    @objc func getEbookCheck(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            call.resolve(["check": TxJSON.orNull(store.getEbookCheck(key))])
        }
    }

    /// { key, ids: [...], status: 'applied' | 'ignored' } -> applies ebook spellings to the transcript
    @objc func updateSuggestions(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            let status = call.getString("status") ?? "applied"
            guard status == "applied" || status == "ignored" else { throw TxError.message("Bad status") }
            guard let ids = call.getArray("ids", String.self) else { throw TxError.message("ids required") }
            let pending = store.updateSuggestions(key, Set(ids), status)
            if let m = store.getMeta(key) {
                m.ebookSuggestions = pending
                store.saveMeta(m)
                hub.emit("onTranscriptionUpdate", m.toJs())
            }
            TranscriptSync.async(key)
            call.resolve(["pending": pending])
        }
    }

    @objc func pauseTranscription(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("key required") }
        hub.cancel(key)
        TranscriptionBackground.shared.forgetAutoResume(key)
        io.async { [self] in
            if let m = store.getMeta(key), m.status == TranscriptStatus.queued || (m.status == TranscriptStatus.paused && m.error != nil) {
                m.status = TranscriptStatus.paused
                m.error = nil
                store.saveMeta(m)
                hub.emit("onTranscriptionUpdate", m.toJs())
            }
        }
        call.resolve()
    }

    @objc func cancelTranscription(_ call: CAPPluginCall) {
        deleteTranscript(call)
    }

    /// Stops any running job for this item and deletes its transcript (Cancel / Delete).
    @objc func deleteTranscript(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            if hub.currentJob == .transcribe(key) { hub.cancelAndDiscard(key) } else { hub.cancel(key) }
            TranscriptionBackground.shared.forgetAutoResume(key)
            // Give a running job a moment to notice the cancel before removing its files
            var waited = 0.0
            while waited < 5 && hub.currentJob == .transcribe(key) {
                Thread.sleep(forTimeInterval: 0.1)
                waited += 0.1
            }
            store.delete(key)
            TranscriptSync.async(key) // deletes the server's copy too (two-way sync)
            call.resolve()
        }
    }

    /// The ebook's paragraphs saved by the ebook check (karaoke view): { text: { ebookTitle, paragraphs } | null }
    @objc func getEbookText(_ call: CAPPluginCall) {
        background(call) { [self] in
            let key = try requireKey(call)
            call.resolve(["text": TxJSON.orNull(store.getEbookText(key))])
        }
    }

    /// Syncs one transcript with the server now. { key, pull?: true, configId? } -> { result }
    @objc func syncTranscript(_ call: CAPPluginCall) {
        background(call, on: syncCalls) { [self] in
            let key = try requireKey(call)
            let result = TranscriptSync.syncNow(key, allowPull: call.getBool("pull") ?? true, configId: call.getString("configId"))
            call.resolve(["result": result])
        }
    }

    /// Background sync of every transcript on the phone.
    @objc func syncAll(_ call: CAPPluginCall) {
        TranscriptSync.asyncAll()
        call.resolve()
    }
}

//
//  TranscriptionModels.swift
//  ABS+ on-device transcription
//
//  Port of Android's TranscriptionModels.kt: the same model catalog (ids, names, sizes, languages).
//
//  Differs from Android: iOS has no public bzip2/tar extraction, so each model's files are downloaded
//  one by one from the Hugging Face mirrors of the sherpa-onnx release archives (same files the Android
//  build keeps from the .tar.bz2). Sizes below were read from the Hugging Face file listings.
//

import Foundation

enum ModelKind { case moonshineV2, nemoTransducer, whisper }

struct TxModelFile {
    let name: String
    let bytes: Int64
}

struct AsrModelInfo {
    let id: String
    let name: String
    let description: String
    let languages: String
    let sizeLabel: String
    /// Name of the Android .tar.bz2 archive (also what importModel accepts the unpacked files of)
    let archiveName: String
    let kind: ModelKind
    /// true when the model returns per-token timestamps (more accurate line and word times)
    let hasTokenTimestamps: Bool
    /// Hugging Face repo with the archive's files, unpacked
    let hfRepo: String
    let files: [TxModelFile]

    /// Android's download (the .tar.bz2), kept for reference / the "Copy download link" fallback on a computer
    var archiveUrl: String { "\(TxModelCatalog.releaseBase)/\(archiveName).tar.bz2" }
    /// Page listing the separate files, for downloading them on a computer and importing them
    var filesPageUrl: String { "https://huggingface.co/\(hfRepo)/tree/main" }
    func fileUrl(_ f: TxModelFile) -> URL { URL(string: "https://huggingface.co/\(hfRepo)/resolve/main/\(f.name)")! }
    var totalBytes: Int64 { files.reduce(0) { $0 + $1.bytes } }
}

enum TxModelCatalog {
    static let releaseBase = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
    static let vadUrl = URL(string: "\(releaseBase)/silero_vad.onnx")!
    static let vadBytes: Int64 = 643_854

    static let models: [AsrModelInfo] = [
        AsrModelInfo(
            id: "moonshine-base-en",
            name: "Moonshine Base (English)",
            description: "Fastest. Built for phones, good accuracy, light on battery.",
            languages: "English",
            sizeLabel: "Small download",
            archiveName: "sherpa-onnx-moonshine-base-en-quantized-2026-02-27",
            kind: .moonshineV2,
            hasTokenTimestamps: false,
            // Mirrored by the sherpa-onnx maintainer's second account (csukuangfj2), not csukuangfj
            hfRepo: "csukuangfj2/sherpa-onnx-moonshine-base-en-quantized-2026-02-27",
            files: [
                TxModelFile(name: "encoder_model.ort", bytes: 31_326_816),
                TxModelFile(name: "decoder_model_merged.ort", bytes: 109_424_400),
                TxModelFile(name: "tokens.txt", bytes: 549_350)
            ]
        ),
        AsrModelInfo(
            id: "parakeet-tdt-v2-en",
            name: "Parakeet TDT 0.6B v2 (English)",
            description: "Best English accuracy with punctuation and word timestamps. Slower, needs a recent phone.",
            languages: "English",
            sizeLabel: "Large download (~600 MB)",
            archiveName: "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8",
            kind: .nemoTransducer,
            hasTokenTimestamps: true,
            hfRepo: "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8",
            files: [
                TxModelFile(name: "encoder.int8.onnx", bytes: 652_282_309),
                TxModelFile(name: "decoder.int8.onnx", bytes: 7_257_753),
                TxModelFile(name: "joiner.int8.onnx", bytes: 1_739_080),
                TxModelFile(name: "tokens.txt", bytes: 9_384)
            ]
        ),
        AsrModelInfo(
            id: "parakeet-tdt-v3",
            name: "Parakeet TDT 0.6B v3 (25 languages)",
            description: "Like v2 but supports 25 European languages, auto-detected.",
            languages: "25 European languages",
            sizeLabel: "Large download (~650 MB)",
            archiveName: "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
            kind: .nemoTransducer,
            hasTokenTimestamps: true,
            hfRepo: "csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8",
            files: [
                TxModelFile(name: "encoder.int8.onnx", bytes: 652_282_294),
                TxModelFile(name: "decoder.int8.onnx", bytes: 11_845_274),
                TxModelFile(name: "joiner.int8.onnx", bytes: 6_355_277),
                TxModelFile(name: "tokens.txt", bytes: 93_939)
            ]
        ),
        AsrModelInfo(
            id: "whisper-base",
            name: "Whisper Base (multilingual)",
            description: "OpenAI Whisper, 99 languages, language auto-detected.",
            languages: "99 languages",
            sizeLabel: "Medium download",
            archiveName: "sherpa-onnx-whisper-base",
            kind: .whisper,
            hasTokenTimestamps: false,
            hfRepo: "csukuangfj/sherpa-onnx-whisper-base",
            files: [
                TxModelFile(name: "base-encoder.int8.onnx", bytes: 29_120_534),
                TxModelFile(name: "base-decoder.int8.onnx", bytes: 130_672_026),
                TxModelFile(name: "base-tokens.txt", bytes: 816_730)
            ]
        ),
        AsrModelInfo(
            id: "whisper-small",
            name: "Whisper Small (multilingual)",
            description: "More accurate Whisper, 99 languages. Slow on most phones.",
            languages: "99 languages",
            sizeLabel: "Large download",
            archiveName: "sherpa-onnx-whisper-small",
            kind: .whisper,
            hasTokenTimestamps: false,
            hfRepo: "csukuangfj/sherpa-onnx-whisper-small",
            files: [
                TxModelFile(name: "small-encoder.int8.onnx", bytes: 112_442_483),
                TxModelFile(name: "small-decoder.int8.onnx", bytes: 262_226_114),
                TxModelFile(name: "small-tokens.txt", bytes: 816_730)
            ]
        )
    ]

    static let defaultModelId = "moonshine-base-en"

    static func get(_ id: String?) -> AsrModelInfo? {
        guard let id = id else { return nil }
        return models.first { $0.id == id }
    }
}

final class TxModelManager {
    static let shared = TxModelManager()

    private let fm = FileManager.default

    var rootDir: URL {
        let d = TxPaths.base.appendingPathComponent("models", isDirectory: true)
        if !fm.fileExists(atPath: d.path) {
            TxPaths.ensureDir(d)
            // iOS only: hundreds of MB that can be downloaded again, so not in iCloud/iTunes backups
            var url = d
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? url.setResourceValues(values)
        }
        return d
    }

    var vadFile: URL { rootDir.appendingPathComponent("silero_vad.onnx") }
    func modelDir(_ m: AsrModelInfo) -> URL { rootDir.appendingPathComponent(m.id, isDirectory: true) }
    private func readyMarker(_ m: AsrModelInfo) -> URL { modelDir(m).appendingPathComponent(".ready") }

    func isInstalled(_ m: AsrModelInfo) -> Bool { fm.fileExists(atPath: readyMarker(m).path) }

    var vadInstalled: Bool { fileSize(vadFile) > 0 }

    func fileSize(_ url: URL) -> Int64 {
        guard let a = try? fm.attributesOfItem(atPath: url.path), let n = a[.size] as? NSNumber else { return 0 }
        return n.int64Value
    }

    func installedSizeBytes(_ m: AsrModelInfo) -> Int64 {
        guard let e = fm.enumerator(at: modelDir(m), includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey]) else { return 0 }
        var total: Int64 = 0
        for case let u as URL in e {
            if let v = try? u.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey]), v.isRegularFile == true {
                total += Int64(v.fileSize ?? 0)
            }
        }
        return total
    }

    func delete(_ m: AsrModelInfo) {
        try? fm.removeItem(at: modelDir(m))
    }

    /// The Silero VAD model. Android bundles it in the APK; here it is downloaded once (a single small file).
    func ensureVad(isCancelled: () -> Bool) throws {
        if vadInstalled { return }
        let resume = rootDir.appendingPathComponent("silero_vad.onnx.resume")
        try TxDownloader.download(URLRequest(url: TxModelCatalog.vadUrl), to: vadFile, resumeFile: resume, isCancelled: isCancelled, progress: { _, _ in })
        if !vadInstalled { throw TxError.message("Couldn't download the voice detection model. Try again.") }
    }

    /// Downloads the model's files one by one (resumable). onProgress gets (bytesDone, totalBytes).
    /// Differs from Android: files already downloaded (or partly downloaded) are kept, so a stopped
    /// download continues instead of starting over. Cancel (Android: delete) still removes them, in the worker.
    func download(_ m: AsrModelInfo, isCancelled: () -> Bool, onProgress: (Int64, Int64) -> Void) throws {
        let dir = modelDir(m)
        TxPaths.ensureDir(dir)
        try? fm.removeItem(at: readyMarker(m))
        let total = m.totalBytes + (vadInstalled ? 0 : TxModelCatalog.vadBytes)
        var doneBytes: Int64 = 0

        if !vadInstalled {
            let resume = rootDir.appendingPathComponent("silero_vad.onnx.resume")
            try TxDownloader.download(URLRequest(url: TxModelCatalog.vadUrl), to: vadFile, resumeFile: resume, isCancelled: isCancelled,
                                      progress: { w, _ in onProgress(w, total) })
            doneBytes += TxModelCatalog.vadBytes
        }

        for f in m.files {
            if isCancelled() { throw TxError.cancelled }
            let dest = dir.appendingPathComponent(f.name)
            let have = fileSize(dest)
            // Complete already (a mirror may update a file: accept any non-empty file whose size matches, or tokens)
            if have > 0 && (have == f.bytes || f.name.hasSuffix(".txt")) {
                doneBytes += f.bytes
                onProgress(doneBytes, total)
                continue
            }
            let resume = dir.appendingPathComponent(f.name + ".resume")
            let base = doneBytes
            var request = URLRequest(url: m.fileUrl(f))
            request.setValue("application/octet-stream", forHTTPHeaderField: "Accept")
            try TxDownloader.download(request, to: dest, resumeFile: resume, isCancelled: isCancelled,
                                      progress: { w, _ in onProgress(base + w, total) },
                                      checkExpected: { expected in try self.checkSpace(expected, in: dir) })
            if fileSize(dest) <= 0 { throw TxError.message("Downloaded \(f.name) is empty. Try again.") }
            doneBytes += f.bytes
            onProgress(doneBytes, total)
        }
        try validate(m)
        try? Data(String(TxPaths.nowMs()).utf8).write(to: readyMarker(m), options: .atomic)
    }

    private func checkSpace(_ expected: Int64, in dir: URL) throws {
        guard expected > 0 else { return }
        if let v = try? dir.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
           let free = v.volumeAvailableCapacityForImportantUsage, free < expected + 200 * 1024 * 1024 {
            throw TxError.message("Not enough free space for this model. Free up some space and try again.")
        }
    }

    /// Same file rules as Android's keepFile
    func keepFile(_ m: AsrModelInfo, _ name: String) -> Bool {
        if name.hasSuffix("tokens.txt") { return true }
        switch m.kind {
        case .moonshineV2: return name.hasSuffix(".ort")
        case .nemoTransducer: return name.hasSuffix(".int8.onnx")
        case .whisper: return name.hasSuffix("-encoder.int8.onnx") || name.hasSuffix("-decoder.int8.onnx")
        }
    }

    /// Path of the model file matching predicate (Android: ModelManager.find)
    func find(_ m: AsrModelInfo, _ predicate: (String) -> Bool) throws -> String {
        let names = (try? fm.contentsOfDirectory(atPath: modelDir(m).path)) ?? []
        for n in names.sorted() where predicate(n) && !n.hasSuffix(".resume") {
            let u = modelDir(m).appendingPathComponent(n)
            if fileSize(u) > 0 { return u.path }
        }
        throw TxError.message("Model \(m.id) is missing a required file. Delete and download it again.")
    }

    struct ModelPaths {
        var tokens = ""
        var encoder = ""
        var decoder = ""
        var joiner = ""
    }

    /// The files the recognizer needs, the same lookups as Android's buildRecognizerConfig
    func paths(_ m: AsrModelInfo) throws -> ModelPaths {
        var p = ModelPaths()
        p.tokens = try find(m) { $0.hasSuffix("tokens.txt") }
        switch m.kind {
        case .moonshineV2:
            p.encoder = try find(m) { $0.hasPrefix("encoder_model") && $0.hasSuffix(".ort") }
            p.decoder = try find(m) { $0.hasPrefix("decoder_model_merged") && $0.hasSuffix(".ort") }
        case .nemoTransducer:
            p.encoder = try find(m) { $0 == "encoder.int8.onnx" }
            p.decoder = try find(m) { $0 == "decoder.int8.onnx" }
            p.joiner = try find(m) { $0 == "joiner.int8.onnx" }
        case .whisper:
            p.encoder = try find(m) { $0.hasSuffix("-encoder.int8.onnx") }
            p.decoder = try find(m) { $0.hasSuffix("-decoder.int8.onnx") }
        }
        return p
    }

    func validate(_ m: AsrModelInfo) throws { _ = try paths(m) }

    /// Offline install from files the user picked (separate files or a folder with them: the unpacked
    /// .tar.bz2, or the files from the Hugging Face page). Differs from Android, which takes the archive itself.
    func importFiles(_ m: AsrModelInfo, from picked: [URL], isCancelled: () -> Bool, onProgress: (Int64, Int64) -> Void) throws {
        // Collect candidate files (folders are searched)
        var sources: [URL] = []
        var sawArchive = false
        for u in picked {
            var isDir: ObjCBool = false
            if fm.fileExists(atPath: u.path, isDirectory: &isDir), isDir.boolValue {
                if let e = fm.enumerator(at: u, includingPropertiesForKeys: [.isRegularFileKey]) {
                    for case let f as URL in e { sources.append(f) }
                }
            } else {
                sources.append(u)
            }
        }
        var wanted: [(URL, String)] = []
        var vadSource: URL?
        for s in sources {
            let name = s.lastPathComponent
            if name.hasSuffix(".tar.bz2") || name.hasSuffix(".tar") || name.hasSuffix(".bz2") { sawArchive = true }
            if name == "silero_vad.onnx" { vadSource = s; continue }
            if keepFile(m, name) { wanted.append((s, name)) }
        }
        if wanted.isEmpty {
            if sawArchive {
                throw TxError.message("iPhone can't unpack .tar.bz2 archives. Unpack \"\(m.archiveName).tar.bz2\" on a computer, or download the separate files from \(m.filesPageUrl), then pick those files (or their folder).")
            }
            throw TxError.message("Those aren't the \(m.name) model files. Pick \(m.files.map { $0.name }.joined(separator: ", ")) (or the folder they're in).")
        }

        let dir = modelDir(m)
        try? fm.removeItem(at: dir)
        TxPaths.ensureDir(dir)
        let total = wanted.reduce(Int64(0)) { $0 + fileSize($1.0) } + (vadSource.map { fileSize($0) } ?? 0)
        var done: Int64 = 0
        do {
            for (src, name) in wanted {
                if isCancelled() { throw TxError.cancelled }
                let dest = dir.appendingPathComponent(name)
                try? fm.removeItem(at: dest)
                try fm.copyItem(at: src, to: dest)
                done += fileSize(dest)
                onProgress(done, total)
            }
            if let v = vadSource {
                try? fm.removeItem(at: vadFile)
                try fm.copyItem(at: v, to: vadFile)
                done += fileSize(vadFile)
                onProgress(done, total)
            }
            try validate(m)
        } catch {
            delete(m)
            if case TxError.cancelled = error { throw error }
            throw TxError.message("That isn't the complete \(m.name) model (\(error.localizedDescription)). Pick \(m.files.map { $0.name }.joined(separator: ", ")).")
        }
        try? Data(String(TxPaths.nowMs()).utf8).write(to: readyMarker(m), options: .atomic)
    }
}

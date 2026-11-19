//
//  TxSupport.swift
//  ABS+ on-device transcription (iOS port of the Android transcription package)
//
//  Small helpers shared by the transcription files: JSON reading/writing, gzip, errors, paths.
//

import Foundation
import Compression

/// Errors with a message the UI can show as is (Android throws IllegalStateException with the same texts).
enum TxError: LocalizedError {
    case message(String)
    /// Paused / cancelled by the user, by the system (background, heat) or by a newer request
    case cancelled
    case http(Int)

    var errorDescription: String? {
        switch self {
        case .message(let m): return m
        case .cancelled: return "Transcription paused"
        case .http(let c): return "Server returned \(c)"
        }
    }
}

/// Reference box, so closures that may be @Sendable can hand values back without mutating captured vars.
final class TxBox<T> {
    var value: T
    init(_ value: T) { self.value = value }
}

enum TxPaths {
    /// Application Support/transcription (Android: files/transcription). Same sub-layout on both.
    static var base: URL {
        let fm = FileManager.default
        let support = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = support.appendingPathComponent("transcription", isDirectory: true)
        if !fm.fileExists(atPath: dir.path) {
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir
    }

    static func ensureDir(_ url: URL) {
        if !FileManager.default.fileExists(atPath: url.path) {
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
    }

    static func nowMs() -> Int64 { Int64((Date().timeIntervalSince1970 * 1000).rounded()) }
}

// MARK: - JSON

/// JSON in the same shape the Android app (org.json / Jackson) and the server (JSON.stringify) write.
/// Our own writer instead of JSONSerialization: shortest round-trip numbers (12.34, not 12.339999…),
/// no escaped slashes, and Bool vs number kept apart.
enum TxJSON {
    static func parse(_ data: Data) -> Any? {
        try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
    }

    static func parse(_ s: String) -> Any? {
        guard let d = s.data(using: .utf8) else { return nil }
        return parse(d)
    }

    static func object(_ s: String) -> [String: Any]? { parse(s) as? [String: Any] }
    static func object(_ d: Data) -> [String: Any]? { parse(d) as? [String: Any] }

    static func stringify(_ v: Any?) -> String {
        var out = ""
        write(v, &out)
        return out
    }

    static func data(_ v: Any?) -> Data { Data(stringify(v).utf8) }

    private static func write(_ v: Any?, _ out: inout String) {
        guard let v = v else { out += "null"; return }
        if v is NSNull { out += "null"; return }
        if let s = v as? String { writeString(s, &out); return }
        if let n = v as? NSNumber { writeNumber(n, &out); return }
        if let d = v as? [String: Any] {
            out += "{"
            var first = true
            for k in d.keys.sorted() {
                if !first { out += "," }
                first = false
                writeString(k, &out)
                out += ":"
                write(d[k], &out)
            }
            out += "}"
            return
        }
        if let a = v as? [Any] {
            out += "["
            for (i, e) in a.enumerated() {
                if i > 0 { out += "," }
                write(e, &out)
            }
            out += "]"
            return
        }
        // An Optional stored in [String: Any] (casts above see through .some, not .none)
        let mirror = Mirror(reflecting: v)
        if mirror.displayStyle == .optional {
            write(mirror.children.first?.value, &out)
            return
        }
        // Anything else (should not happen): write its description as a string
        writeString(String(describing: v), &out)
    }

    private static func writeNumber(_ n: NSNumber, _ out: inout String) {
        if CFGetTypeID(n as CFTypeRef) == CFBooleanGetTypeID() {
            out += n.boolValue ? "true" : "false"
            return
        }
        if CFNumberIsFloatType(n as CFNumber) {
            let d = n.doubleValue
            if !d.isFinite { out += "null"; return }
            // Swift's description is the shortest form that reads back as the same Double
            out += "\(d)"
        } else {
            out += "\(n.int64Value)"
        }
    }

    private static func writeString(_ s: String, _ out: inout String) {
        out += "\""
        for u in s.unicodeScalars {
            switch u {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            default:
                if u.value < 0x20 {
                    out += String(format: "\\u%04x", u.value)
                } else {
                    out.unicodeScalars.append(u)
                }
            }
        }
        out += "\""
    }

    // Lenient getters (missing or wrong type -> default), like Jackson with defaults / optX in org.json

    static func dbl(_ o: [String: Any], _ k: String, _ def: Double = 0) -> Double {
        if let n = o[k] as? NSNumber { return n.doubleValue }
        if let s = o[k] as? String, let d = Double(s) { return d }
        return def
    }

    static func int(_ o: [String: Any], _ k: String, _ def: Int = 0) -> Int {
        if let n = o[k] as? NSNumber { return n.intValue }
        if let s = o[k] as? String, let d = Int(s) { return d }
        return def
    }

    static func int64(_ o: [String: Any], _ k: String, _ def: Int64 = 0) -> Int64 {
        if let n = o[k] as? NSNumber { return n.int64Value }
        if let s = o[k] as? String, let d = Int64(s) { return d }
        return def
    }

    static func str(_ o: [String: Any], _ k: String) -> String? {
        if let s = o[k] as? String { return s }
        return nil
    }

    static func bool(_ o: [String: Any], _ k: String, _ def: Bool = false) -> Bool {
        if let n = o[k] as? NSNumber { return n.boolValue }
        return def
    }

    /// String or JSON null, for `[String: Any]` values
    static func orNull(_ s: String?) -> Any {
        if let s = s { return s }
        return NSNull()
    }

    static func orNull(_ o: [String: Any]?) -> Any {
        if let o = o { return o }
        return NSNull()
    }
}

// MARK: - gzip

/// gzip for sync uploads (Android sends them gzipped too). The Compression framework's ZLIB is raw
/// DEFLATE (RFC 1951), so the gzip header and CRC-32 trailer are added here.
enum TxGzip {
    private static let crcTable: [UInt32] = (0..<256).map { i -> UInt32 in
        var c = UInt32(i)
        for _ in 0..<8 { c = (c & 1) != 0 ? (0xEDB8_8320 ^ (c >> 1)) : (c >> 1) }
        return c
    }

    static func crc32(_ data: Data) -> UInt32 {
        var crc: UInt32 = 0xFFFF_FFFF
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            for b in raw { crc = crcTable[Int((crc ^ UInt32(b)) & 0xFF)] ^ (crc >> 8) }
        }
        return crc ^ 0xFFFF_FFFF
    }

    /// nil when compression fails (the caller then sends the body uncompressed)
    static func gzip(_ input: Data) -> Data? {
        guard !input.isEmpty else { return nil }
        let capacity = input.count + input.count / 100 + 64 * 1024
        var deflated = Data(count: capacity)
        let written: Int = deflated.withUnsafeMutableBytes { (dst: UnsafeMutableRawBufferPointer) -> Int in
            input.withUnsafeBytes { (src: UnsafeRawBufferPointer) -> Int in
                guard let d = dst.bindMemory(to: UInt8.self).baseAddress,
                      let s = src.bindMemory(to: UInt8.self).baseAddress else { return 0 }
                return compression_encode_buffer(d, capacity, s, input.count, nil, COMPRESSION_ZLIB)
            }
        }
        guard written > 0 else { return nil }
        var out = Data([0x1F, 0x8B, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF])
        out.append(deflated.prefix(written))
        var crc = crc32(input).littleEndian
        var size = UInt32(truncatingIfNeeded: input.count).littleEndian
        withUnsafeBytes(of: &crc) { out.append(contentsOf: $0) }
        withUnsafeBytes(of: &size) { out.append(contentsOf: $0) }
        return out
    }
}

// MARK: - Text lines of a file

enum TxText {
    /// Non-blank lines of a text file (Kotlin: readLines().filter { it.isNotBlank() })
    static func lines(of url: URL) -> [String] {
        guard let data = try? Data(contentsOf: url), let s = String(data: data, encoding: .utf8) else { return [] }
        return lines(in: s)
    }

    static func lines(in s: String) -> [String] {
        var out: [String] = []
        for part in s.split(omittingEmptySubsequences: true, whereSeparator: { $0 == "\n" || $0 == "\r" || $0 == "\r\n" }) {
            if part.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { continue }
            out.append(String(part))
        }
        return out
    }

    /// One JSON value per line, each followed by "\n" (empty string when there are none)
    static func joinLines(_ lines: [String]) -> String {
        lines.isEmpty ? "" : lines.joined(separator: "\n") + "\n"
    }
}

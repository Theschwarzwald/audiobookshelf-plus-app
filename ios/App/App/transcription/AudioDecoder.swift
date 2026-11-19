//
//  AudioDecoder.swift
//  ABS+ on-device transcription
//
//  iOS counterpart of Android's AudioDecoder.kt (MediaExtractor/MediaCodec + windowed-sinc resampler):
//  AVAssetReader decodes the file to Float32 PCM at its own rate, AVAudioConverter turns that into
//  16 kHz mono (downmix + resampling).
//  Plays whatever AVFoundation can open: m4b/m4a/aac/mp3/alac/flac/wav/aiff. Not Ogg Vorbis/Opus or WMA.
//

import Foundation
import AVFoundation
import CoreMedia

final class TxAudioDecoder {
    static let outRate = 16_000.0

    private let url: URL

    init(url: URL) { self.url = url }

    /// Decodes from startSec (seconds into this file) to the end.
    /// onChunk receives (samples16kMono, chunkStartSecInFile) and returns false to stop.
    func decode(startSec: Double, onChunk: ([Float], Double) -> Bool) throws {
        // Precise timing: accurate seeking and timestamps in VBR mp3 (costs a scan of the file once)
        let asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
        guard let track = asset.tracks(withMediaType: .audio).first else {
            throw TxError.message("No audio track found in \(url.lastPathComponent). This audio format may not be supported on iPhone.")
        }
        let reader: AVAssetReader
        do {
            reader = try AVAssetReader(asset: asset)
        } catch {
            throw TxError.message("Couldn't open \(url.lastPathComponent): \(error.localizedDescription)")
        }
        // Native sample rate and channels; AVAudioConverter does the rest
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVLinearPCMBitDepthKey: 32,
            AVLinearPCMIsFloatKey: true,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false
        ]
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
        output.alwaysCopiesSampleData = false
        guard reader.canAdd(output) else { throw TxError.message("Can't decode \(url.lastPathComponent)") }
        reader.add(output)
        if startSec > 0 {
            reader.timeRange = CMTimeRange(start: CMTime(seconds: startSec, preferredTimescale: 1000), duration: .positiveInfinity)
        }
        guard reader.startReading() else {
            throw TxError.message("Couldn't read \(url.lastPathComponent): \(reader.error?.localizedDescription ?? "unknown error")")
        }
        defer { if reader.status == .reading { reader.cancelReading() } }

        guard let outFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: TxAudioDecoder.outRate, channels: 1, interleaved: false) else {
            throw TxError.message("Audio output format unavailable")
        }
        var converter: AVAudioConverter?
        var inFormat: AVAudioFormat?
        var baseSec = -1.0
        var emitted: Int64 = 0
        var stopped = false

        while reader.status == .reading && !stopped {
            let more: Bool = try autoreleasepool {
                guard let sb = output.copyNextSampleBuffer() else { return false }
                let frames = CMSampleBufferGetNumSamples(sb)
                if frames <= 0 { return true }
                if converter == nil {
                    guard let fd = CMSampleBufferGetFormatDescription(sb),
                          let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(fd),
                          let f = AVAudioFormat(streamDescription: asbd),
                          let c = AVAudioConverter(from: f, to: outFormat) else {
                        throw TxError.message("Unsupported audio format in \(url.lastPathComponent)")
                    }
                    if f.channelCount > 1 { c.downmix = true }
                    c.sampleRateConverterQuality = AVAudioQuality.max.rawValue
                    inFormat = f
                    converter = c
                    let pts = CMSampleBufferGetPresentationTimeStamp(sb).seconds
                    baseSec = pts.isFinite ? pts : max(0, startSec)
                }
                guard let conv = converter, let fmt = inFormat,
                      let inBuf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(frames)) else {
                    throw TxError.message("Out of memory while decoding audio")
                }
                inBuf.frameLength = AVAudioFrameCount(frames)
                let st = CMSampleBufferCopyPCMDataIntoAudioBufferList(sb, at: 0, frameCount: Int32(frames), into: inBuf.mutableAudioBufferList)
                if st != 0 { throw TxError.message("Audio decode error \(st) in \(url.lastPathComponent)") }
                let samples = try TxAudioDecoder.convert(conv, input: inBuf, outFormat: outFormat, endOfStream: false)
                if samples.isEmpty { return true }
                let chunkStart = baseSec + Double(emitted) / TxAudioDecoder.outRate
                emitted += Int64(samples.count)
                if !onChunk(samples, chunkStart) {
                    stopped = true
                    return false
                }
                return true
            }
            if !more { break }
        }
        if stopped { return }
        if reader.status == .failed {
            throw TxError.message("Audio decoding failed in \(url.lastPathComponent): \(reader.error?.localizedDescription ?? "unknown error")")
        }
        // Flush what the resampler still holds
        if let conv = converter {
            let tail = try TxAudioDecoder.convert(conv, input: nil, outFormat: outFormat, endOfStream: true)
            if !tail.isEmpty {
                _ = onChunk(tail, baseSec + Double(emitted) / TxAudioDecoder.outRate)
            }
        }
    }

    /// Runs the converter on one input buffer (or flushes it), returning all 16 kHz samples produced.
    private static func convert(_ conv: AVAudioConverter, input: AVAudioPCMBuffer?, outFormat: AVAudioFormat, endOfStream: Bool) throws -> [Float] {
        let ratio = outRate / conv.inputFormat.sampleRate
        let capacity = AVAudioFrameCount(Double(input?.frameLength ?? 0) * ratio) + 4096
        var result: [Float] = []
        let fed = TxBox(false)
        while true {
            guard let out = AVAudioPCMBuffer(pcmFormat: outFormat, frameCapacity: capacity) else {
                throw TxError.message("Out of memory while resampling audio")
            }
            var error: NSError?
            let status = conv.convert(to: out, error: &error) { _, outStatus in
                if let input = input, !fed.value {
                    fed.value = true
                    outStatus.pointee = .haveData
                    return input
                }
                outStatus.pointee = endOfStream ? .endOfStream : .noDataNow
                return nil
            }
            if status == .error {
                throw TxError.message("Resampling failed: \(error?.localizedDescription ?? "unknown error")")
            }
            if out.frameLength > 0, let ch = out.floatChannelData {
                result.append(contentsOf: UnsafeBufferPointer(start: ch[0], count: Int(out.frameLength)))
            }
            // A full buffer means there may be more output waiting
            if status == .haveData && out.frameLength == capacity { continue }
            break
        }
        return result
    }
}

//
//  SherpaBridge.swift
//  ABS+ on-device transcription
//
//  Thin wrappers over the sherpa-onnx C API (https://github.com/k2-fsa/sherpa-onnx, Apache-2.0).
//  The config structs are built with the helper functions from sherpa-onnx's SherpaOnnx.swift
//  (swift-api-examples, same tag as Android's SHERPA_ONNX_VERSION, fetched by ios/App/scripts/fetch-sherpa-onnx.sh).
//  The recognizer and VAD are created through the C functions directly instead of SherpaOnnx.swift's
//  classes, because those call fatalError() when a model can't be loaded; here that is an error the UI shows.
//
//  Only compiled with ABS_SHERPA (set by ios/App/scripts/add-sherpa-onnx.rb).
//

#if ABS_SHERPA
import Foundation

struct TxRecognition {
    let text: String
    let tokens: [String]
    let timestamps: [Float]
}

final class TxRecognizer {
    private let ptr: OpaquePointer

    init(model: AsrModelInfo, manager: TxModelManager, threads: Int) throws {
        let p = try manager.paths(model)
        let modelConfig: SherpaOnnxOfflineModelConfig
        switch model.kind {
        case .moonshineV2:
            modelConfig = sherpaOnnxOfflineModelConfig(
                tokens: p.tokens,
                numThreads: threads,
                moonshine: sherpaOnnxOfflineMoonshineModelConfig(encoder: p.encoder, mergedDecoder: p.decoder)
            )
        case .nemoTransducer:
            modelConfig = sherpaOnnxOfflineModelConfig(
                tokens: p.tokens,
                transducer: sherpaOnnxOfflineTransducerModelConfig(encoder: p.encoder, decoder: p.decoder, joiner: p.joiner),
                numThreads: threads,
                modelType: "nemo_transducer"
            )
        case .whisper:
            modelConfig = sherpaOnnxOfflineModelConfig(
                tokens: p.tokens,
                whisper: sherpaOnnxOfflineWhisperModelConfig(encoder: p.encoder, decoder: p.decoder, language: "", task: "transcribe"),
                numThreads: threads,
                modelType: "whisper"
            )
        }
        var config = sherpaOnnxOfflineRecognizerConfig(
            featConfig: sherpaOnnxFeatureConfig(sampleRate: 16000, featureDim: 80),
            modelConfig: modelConfig
        )
        guard let r = SherpaOnnxCreateOfflineRecognizer(&config) else {
            throw TxError.message("Couldn't load the \(model.name) speech model. Delete it and download it again.")
        }
        ptr = r
    }

    deinit {
        SherpaOnnxDestroyOfflineRecognizer(ptr)
    }

    func recognize(_ samples: [Float], sampleRate: Int32 = 16000) throws -> TxRecognition {
        guard let stream = SherpaOnnxCreateOfflineStream(ptr) else { throw TxError.message("Speech engine: couldn't create a stream") }
        defer { SherpaOnnxDestroyOfflineStream(stream) }
        samples.withUnsafeBufferPointer { buf in
            SherpaOnnxAcceptWaveformOffline(stream, sampleRate, buf.baseAddress, Int32(buf.count))
        }
        SherpaOnnxDecodeOfflineStream(ptr, stream)
        guard let r = SherpaOnnxGetOfflineStreamResult(stream) else { return TxRecognition(text: "", tokens: [], timestamps: []) }
        defer { SherpaOnnxDestroyOfflineRecognizerResult(r) }

        let res = r.pointee
        let text: String
        if let t = res.text { text = String(cString: t) } else { text = "" }
        let n = Int(res.count)
        var tokens: [String] = []
        var times: [Float] = []
        if n > 0, let arr = res.tokens_arr {
            tokens.reserveCapacity(n)
            for i in 0..<n {
                if let tp = arr[i] { tokens.append(String(cString: tp)) } else { tokens.append("") }
            }
        }
        if n > 0, let ts = res.timestamps {
            times.reserveCapacity(n)
            for i in 0..<n { times.append(ts[i]) }
        }
        return TxRecognition(text: text, tokens: tokens, timestamps: times)
    }
}

final class TxVad {
    private let ptr: OpaquePointer

    /// Same settings as Android (TranscriptionEngine.kt)
    init(modelPath: String, maxSpeechDuration: Float, windowSize: Int) throws {
        var config = sherpaOnnxVadModelConfig(
            sileroVad: sherpaOnnxSileroVadModelConfig(
                model: modelPath,
                threshold: 0.5,
                minSilenceDuration: 0.3,
                minSpeechDuration: 0.25,
                windowSize: windowSize,
                maxSpeechDuration: maxSpeechDuration
            ),
            sampleRate: 16000,
            numThreads: 1
        )
        // 60 s buffer: holds a full maximum-length segment (25 s) with room to spare
        guard let v = SherpaOnnxCreateVoiceActivityDetector(&config, 60) else {
            throw TxError.message("Couldn't load the voice detection model. Delete the speech model and download it again.")
        }
        ptr = v
    }

    deinit {
        SherpaOnnxDestroyVoiceActivityDetector(ptr)
    }

    func accept(_ samples: [Float]) {
        samples.withUnsafeBufferPointer { buf in
            SherpaOnnxVoiceActivityDetectorAcceptWaveform(ptr, buf.baseAddress, Int32(buf.count))
        }
    }

    var isEmpty: Bool { SherpaOnnxVoiceActivityDetectorEmpty(ptr) == 1 }

    /// The oldest finished speech segment: (absolute start sample, samples)
    func front() -> (start: Int64, samples: [Float])? {
        guard let seg = SherpaOnnxVoiceActivityDetectorFront(ptr) else { return nil }
        defer { SherpaOnnxDestroySpeechSegment(seg) }
        let s = seg.pointee
        let n = Int(s.n)
        var samples: [Float] = []
        if n > 0, let p = s.samples {
            samples = Array(UnsafeBufferPointer(start: p, count: n))
        }
        return (Int64(s.start), samples)
    }

    func pop() { SherpaOnnxVoiceActivityDetectorPop(ptr) }
    func flush() { SherpaOnnxVoiceActivityDetectorFlush(ptr) }
}
#endif

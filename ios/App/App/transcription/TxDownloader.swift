//
//  TxDownloader.swift
//  ABS+ on-device transcription
//
//  Blocking file download for the transcription worker thread (models, VAD, streamed audio tracks).
//  URLSessionDownloadTask, so an interrupted model download resumes where it stopped: the resume data
//  is kept next to the file (Android streams the archive with OkHttp and starts over instead).
//

import Foundation

final class TxDownloader: NSObject, URLSessionDownloadDelegate {
    struct Result {
        let statusCode: Int
    }

    private let destination: URL
    private let resumeFile: URL?
    private let lock = NSLock()
    private var written: Int64 = 0
    private var expected: Int64 = -1
    private var statusCode: Int = 0
    private var failure: Error?
    private var moved = false
    private var freshResumeData = false
    private let done = DispatchSemaphore(value: 0)

    private init(destination: URL, resumeFile: URL?) {
        self.destination = destination
        self.resumeFile = resumeFile
    }

    /// Downloads request to destination (replacing it), blocking the calling thread.
    /// isCancelled is polled 4x a second; progress(bytesWritten, bytesExpected or -1) is called on the calling thread.
    /// beforeStart(expected) can throw to stop early (free space checks). Throws TxError.cancelled when cancelled.
    @discardableResult
    static func download(_ request: URLRequest, to destination: URL, resumeFile: URL? = nil,
                         isCancelled: () -> Bool,
                         progress: (Int64, Int64) -> Void,
                         checkExpected: ((Int64) throws -> Void)? = nil) throws -> Result {
        let d = TxDownloader(destination: destination, resumeFile: resumeFile)
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 24 * 60 * 60
        config.waitsForConnectivity = false
        let queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: config, delegate: d, delegateQueue: queue)
        defer { session.finishTasksAndInvalidate() }

        let task: URLSessionDownloadTask
        var usedResumeData = false
        if let rf = resumeFile, let data = try? Data(contentsOf: rf), !data.isEmpty {
            task = session.downloadTask(withResumeData: data)
            usedResumeData = true
        } else {
            task = session.downloadTask(with: request)
        }
        task.resume()

        var cancelRequested = false
        var checked = false
        var lastReported: Int64 = -1
        var checkError: Error?
        while d.done.wait(timeout: .now() + 0.25) == .timedOut {
            let (w, e) = d.snapshot()
            if !checked && e > 0 {
                checked = true
                do { try checkExpected?(e) } catch {
                    checkError = error
                    cancelRequested = true
                    task.cancel()
                }
            }
            if w != lastReported {
                lastReported = w
                progress(w, e)
            }
            if !cancelRequested && isCancelled() {
                cancelRequested = true
                // Keeps what was downloaded so far, so the next try continues from there
                task.cancel(byProducingResumeData: { data in
                    d.saveResumeData(data)
                })
            }
        }
        let (w, e) = d.snapshot()
        progress(w, e)

        if let err = checkError { throw err }
        if cancelRequested { throw TxError.cancelled }
        d.lock.lock()
        let failure = d.failure
        let code = d.statusCode
        let moved = d.moved
        let fresh = d.freshResumeData
        d.lock.unlock()
        if let f = failure {
            // Resume data that can't be used any more: start from the beginning next time
            if usedResumeData && !fresh, let rf = resumeFile { try? FileManager.default.removeItem(at: rf) }
            throw f
        }
        if !moved { throw TxError.message("Download failed (\(code))") }
        if let rf = resumeFile { try? FileManager.default.removeItem(at: rf) }
        return Result(statusCode: code)
    }

    private func snapshot() -> (Int64, Int64) {
        lock.lock()
        defer { lock.unlock() }
        return (written, expected)
    }

    private func saveResumeData(_ data: Data?) {
        guard let rf = resumeFile else { return }
        if let data = data, !data.isEmpty {
            try? data.write(to: rf, options: .atomic)
            lock.lock()
            freshResumeData = true
            lock.unlock()
        }
    }

    // MARK: URLSessionDownloadDelegate

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64,
                    totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        lock.lock()
        written = totalBytesWritten
        expected = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : -1
        lock.unlock()
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didResumeAtOffset fileOffset: Int64, expectedTotalBytes: Int64) {
        lock.lock()
        written = fileOffset
        expected = expectedTotalBytes > 0 ? expectedTotalBytes : -1
        lock.unlock()
    }

    /// The temp file is deleted when this returns, so it is moved here
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let code = (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0
        lock.lock()
        statusCode = code
        lock.unlock()
        guard (200..<300).contains(code) else {
            lock.lock()
            failure = TxError.http(code)
            lock.unlock()
            // A bad answer isn't resumable
            if let rf = resumeFile { try? FileManager.default.removeItem(at: rf) }
            return
        }
        do {
            let fm = FileManager.default
            TxPaths.ensureDir(destination.deletingLastPathComponent())
            if fm.fileExists(atPath: destination.path) { try fm.removeItem(at: destination) }
            try fm.moveItem(at: location, to: destination)
            lock.lock()
            moved = true
            lock.unlock()
        } catch {
            lock.lock()
            failure = error
            lock.unlock()
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error as NSError? {
            if let data = error.userInfo[NSURLSessionDownloadTaskResumeData] as? Data { saveResumeData(data) }
            lock.lock()
            if failure == nil && !(error.domain == NSURLErrorDomain && error.code == NSURLErrorCancelled) {
                failure = TxDownloader.friendly(error)
            }
            if statusCode == 0 { statusCode = (task.response as? HTTPURLResponse)?.statusCode ?? 0 }
            lock.unlock()
        }
        done.signal()
    }

    /// Same advice as Android's friendlyNetworkErrors
    static func friendly(_ error: NSError) -> Error {
        guard error.domain == NSURLErrorDomain else { return error }
        switch error.code {
        case NSURLErrorCannotFindHost, NSURLErrorDNSLookupFailed:
            return TxError.message("Can't reach the download server (the phone couldn't look up the address). Check that the phone is online and that a VPN, Private Relay or an ad-blocker isn't blocking it. Or download the model files on a computer and use \"Import model file\".")
        case NSURLErrorTimedOut:
            return TxError.message("The download timed out. Check your connection and try again, or use \"Import model file\".")
        case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost, NSURLErrorCannotConnectToHost:
            return TxError.message("Couldn't connect to download the file. Try again, or use \"Import model file\".")
        default:
            return error
        }
    }
}

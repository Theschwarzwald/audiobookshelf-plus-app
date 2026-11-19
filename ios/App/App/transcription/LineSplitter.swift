//
//  LineSplitter.swift
//  ABS+ on-device transcription
//
//  Port of LineSplitter in Android's TranscriptionEngine.kt (and the server's lineSplitter.js):
//  short, lyric-style lines. Break after sentence punctuation (3+ words), after a comma/semicolon/dash
//  (10+ words), or at 16 words, and never leave a dangling 1-2 word line.
//

import Foundation

enum LineSplitter {
    private struct Word {
        let text: String
        /// seconds from the start of the speech segment
        let start: Double
    }

    // The server's patterns (Android's plus CJK punctuation, which changes nothing for other languages)
    private static let sentenceEnd = try! NSRegularExpression(pattern: "[.!?…。！？][\"'”’)\\]」』]*$", options: [])
    private static let softBreak = try! NSRegularExpression(pattern: "[,;:—–，、；：][\"'”’)\\]」』]*$", options: [])

    private static func matches(_ re: NSRegularExpression, _ s: String) -> Bool {
        re.firstMatch(in: s, options: [], range: NSRange(location: 0, length: (s as NSString).length)) != nil
    }

    /// text/tokens/timestamps: the recognizer's result for one VAD segment starting at segStart (absolute seconds)
    static func split(text rawText: String, tokens: [String], timestamps: [Float], segStart: Double, segDuration: Double, useTokenTimes: Bool) -> [TranscriptLine] {
        let text = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { return [] }

        let measured = useTokenTimes && !tokens.isEmpty && tokens.count == timestamps.count
        let words: [Word] = measured ? wordsFromTokens(tokens, timestamps) : wordsByCharacters(text, segDuration)
        if words.isEmpty { return [] }

        var groups: [[Word]] = []
        var current: [Word] = []
        for w in words {
            current.append(w)
            let n = current.count
            let brk = (matches(sentenceEnd, w.text) && n >= 3) || (matches(softBreak, w.text) && n >= 10) || n >= 16
            if brk {
                groups.append(current)
                current = []
            }
        }
        if !current.isEmpty {
            // Avoid a dangling 1-2 word line: merge into the previous one
            if current.count <= 2, let last = groups.last, last.count < 16 {
                groups[groups.count - 1].append(contentsOf: current)
            } else {
                groups.append(current)
            }
        }

        let segEnd = segStart + segDuration
        var lines: [TranscriptLine] = []
        for (i, g) in groups.enumerated() {
            let start = segStart + g[0].start
            let end = i + 1 < groups.count ? segStart + groups[i + 1][0].start : segEnd
            var line = TranscriptLine(start: start, end: max(end, start), text: g.map { $0.text }.joined(separator: " "), words: nil)
            if measured {
                // Each word ends where the next one starts (the last one at the end of the segment), like the server
                var ws: [(String, Double, Double)] = []
                for (k, w) in g.enumerated() {
                    let s = segStart + w.start
                    let next: Double
                    if k + 1 < g.count { next = segStart + g[k + 1].start }
                    else if i + 1 < groups.count { next = segStart + groups[i + 1][0].start }
                    else { next = segEnd }
                    ws.append((w.text, s, max(s, next)))
                }
                line.words = ws
            }
            lines.append(line)
        }
        return lines
    }

    /// BPE/sentencepiece tokens: a token beginning with ▁ (or a space) starts a new word.
    private static func wordsFromTokens(_ tokens: [String], _ times: [Float]) -> [Word] {
        var words: [Word] = []
        var sb = ""
        var start = 0.0
        for i in 0..<tokens.count {
            let tok = tokens[i]
            let newWord = tok.hasPrefix("▁") || tok.hasPrefix(" ")
            let clean = tok.replacingOccurrences(of: "▁", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
            if clean.isEmpty && !newWord { continue }
            if newWord && !sb.isEmpty {
                words.append(Word(text: sb, start: start))
                sb = ""
            }
            if sb.isEmpty { start = Double(times[i]) }
            sb += clean
        }
        if !sb.isEmpty { words.append(Word(text: sb, start: start)) }
        return words
    }

    /// No token times: estimate each word's start from its character position in the segment (Android's rule).
    private static func wordsByCharacters(_ text: String, _ duration: Double) -> [Word] {
        let parts = text.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
        let totalChars = Double(parts.reduce(0) { $0 + $1.utf16.count + 1 })
        var chars = 0
        var out: [Word] = []
        for p in parts {
            out.append(Word(text: p, start: totalChars > 0 ? duration * Double(chars) / totalChars : 0))
            chars += p.utf16.count + 1
        }
        return out
    }
}

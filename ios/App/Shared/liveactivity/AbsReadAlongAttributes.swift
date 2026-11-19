//
//  AbsReadAlongAttributes.swift
//  Compiled into both the app and the AbsPlusLiveActivity widget extension:
//  the two sides must agree on this exact type to talk to each other.
//

import Foundation
#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.1, *)
struct AbsReadAlongAttributes: ActivityAttributes {
    /// What changes while the book plays. Kept tiny: the whole payload must stay under ~4 KB.
    struct ContentState: Codable, Hashable {
        /// The line being narrated; empty before the first line (the view then shows the title)
        var line: String
        var isPlaying: Bool
        /// 0...1 through the book, nil when the duration isn't known
        var progress: Double?

        init(line: String, isPlaying: Bool, progress: Double? = nil) {
            self.line = line
            self.isPlaying = isPlaying
            self.progress = progress
        }
    }

    /// Fixed for the life of the activity (a new book means a new activity)
    var title: String
    var author: String?

    init(title: String, author: String? = nil) {
        self.title = title
        self.author = author
    }

    /// Upper bounds so a long paragraph or title can't blow the payload limit
    static let maxLineLength = 320
    static let maxTitleLength = 120

    static func clip(_ s: String, _ max: Int) -> String {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.count > max ? String(t.prefix(max - 1)) + "\u{2026}" : t
    }
}
#endif

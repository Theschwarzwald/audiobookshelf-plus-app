//
//  AbsReadAlongLiveActivity.swift
//  The narrated line on the lock screen and in the Dynamic Island.
//  System colours only (.primary / .secondary): they follow light and dark mode, and the Dynamic Island,
//  which is always dark, gets the dark variants automatically.
//

import ActivityKit
import SwiftUI
import WidgetKit

struct AbsReadAlongLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AbsReadAlongAttributes.self) { context in
            ReadAlongLockScreenView(context: context)
                .activitySystemActionForegroundColor(Color.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    PlayStateIcon(isPlaying: context.state.isPlaying)
                        .font(.title3)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let p = context.state.progress {
                        Text("\(Int((p * 100).rounded()))%")
                            .font(.caption)
                            .monospacedDigit()
                            .foregroundColor(.secondary)
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(lineOrTitle(context))
                        .font(.body.weight(.semibold))
                        .foregroundColor(.primary)
                        .lineLimit(3)
                        .minimumScaleFactor(0.8)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: "book.fill")
            } compactTrailing: {
                PlayStateIcon(isPlaying: context.state.isPlaying)
            } minimal: {
                Image(systemName: "book.fill")
            }
        }
    }
}

/// Before the first line there's nothing narrated yet: show the book instead of a blank card
private func lineOrTitle(_ context: ActivityViewContext<AbsReadAlongAttributes>) -> String {
    let line = context.state.line
    return line.isEmpty ? context.attributes.title : line
}

private struct PlayStateIcon: View {
    let isPlaying: Bool

    var body: some View {
        Image(systemName: isPlaying ? "waveform" : "pause.fill")
            .foregroundColor(isPlaying ? Color.accentColor : Color.secondary)
    }
}

private struct ReadAlongLockScreenView: View {
    let context: ActivityViewContext<AbsReadAlongAttributes>

    /// Stale = the app stopped updating (paused a long while, or killed): dim the line so it doesn't look live
    private var isStale: Bool {
        if #available(iOS 16.2, *) {
            return context.isStale
        }
        return false
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                PlayStateIcon(isPlaying: context.state.isPlaying && !isStale)
                    .font(.caption)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            Text(lineOrTitle(context))
                .font(.title3.weight(.semibold))
                .foregroundColor(isStale ? Color.secondary : Color.primary)
                .lineLimit(3)
                .minimumScaleFactor(0.75)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let p = context.state.progress {
                ProgressView(value: min(max(p, 0), 1))
                    .tint(Color.accentColor)
            }
        }
        .padding(16)
    }

    private var subtitle: String {
        if let author = context.attributes.author, !author.isEmpty {
            return "\(context.attributes.title) \u{00B7} \(author)"
        }
        return context.attributes.title
    }
}

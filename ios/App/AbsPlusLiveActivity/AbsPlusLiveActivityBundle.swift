//
//  AbsPlusLiveActivityBundle.swift
//  Entry point of the widget extension. It only hosts the read-along Live Activity (no home-screen widgets).
//

import SwiftUI
import WidgetKit

@main
struct AbsPlusLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        AbsReadAlongLiveActivity()
    }
}

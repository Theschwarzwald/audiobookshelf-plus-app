//
//  AbsPageTurn.swift
//  App
//
//  ABS+: page-turn animations are switched off by design. Same JS contract as AbsPageTurn.kt so the
//  readers' turn.js never sees a missing plugin: begin says "no overlay", the reader just turns the page.
//

import Foundation
import Capacitor

@objc(AbsPageTurn)
public class AbsPageTurn: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "AbsPageTurnPlugin"
    public var jsName = "AbsPageTurn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "begin", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]

    /** { ok: false }: no snapshot taken, so turn.js skips finish() and turns without an animation */
    @objc func begin(_ call: CAPPluginCall) {
        call.resolve(["ok": false])
    }

    @objc func finish(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func cancel(_ call: CAPPluginCall) {
        call.resolve()
    }
}

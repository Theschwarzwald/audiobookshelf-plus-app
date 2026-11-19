//
//  AbsUpdater.swift
//  App
//
//  ABS+: the iOS side of AbsUpdater.kt (JS contract in plugins/capacitor/AbsUpdater.js, components/app/UpdateBanner.vue).
//

import Foundation
import UIKit
import Network
import Capacitor

/**
 * iOS apps can't download and install their own updates (no APKs, no sideloading). The JS still finds
 * newer builds itself (the server's /abs-plus/app/latest.json and GitHub, in UpdateBanner.vue); here:
 *
 *   getPrefs() / setPrefs({ mode, wifiOnly })  -> { build, mode, wifiOnly }   mode defaults to off: nothing downloads
 *   network()                                  -> { online, unmetered }
 *   status()                                   -> { ready: false, downloading: false }
 *   download()                                 rejects: update from TestFlight or GitHub
 *   canInstall()                               -> { allowed: false }
 *   openInstallSettings() / install()          open the releases page in Safari instead
 */
@objc(AbsUpdater)
public class AbsUpdater: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "AbsUpdaterPlugin"
    public var jsName = "AbsUpdater"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPrefs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPrefs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "network", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "canInstall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openInstallSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "install", returnType: CAPPluginReturnPromise)
    ]

    private static let releasesPage = "https://github.com/Theschwarzwald/audiobookshelf-plus-app/releases"
    private static let noSideload = "On iPhone and iPad, update ABS+ from TestFlight or GitHub"
    private static let modeKey = "absplus_updates.mode"
    private static let wifiKey = "absplus_updates.wifiOnly"

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "AbsUpdater.network")
    private var path: NWPath? // written and read on monitorQueue only

    override public func load() {
        monitor.pathUpdateHandler = { [weak self] p in self?.path = p }
        monitor.start(queue: monitorQueue)
    }

    deinit {
        monitor.cancel()
    }

    /**
     * This app's ABS+ build. The JS has it compiled in (plugins/absPlusBuild.js, ABS_PLUS_BUILD); natively it
     * comes from the AbsPlusBuild Info.plist key, else from CFBundleVersion when that follows Android's
     * 1000 + build, else 0 (unknown: upstream's own build numbers mean nothing here).
     */
    private static func currentBuild() -> Int {
        let info = Bundle.main.infoDictionary ?? [:]
        if let n = info["AbsPlusBuild"] as? Int { return n }
        if let s = info["AbsPlusBuild"] as? String, let n = Int(s) { return n }
        if let s = info["CFBundleVersion"] as? String, let n = Int(s), n >= 1000 { return n - 1000 }
        return 0
    }

    private func prefsJson() -> [String: Any] {
        let ud = UserDefaults.standard
        let wifiOnly = ud.object(forKey: AbsUpdater.wifiKey) as? Bool ?? true
        return ["build": AbsUpdater.currentBuild(), "mode": ud.string(forKey: AbsUpdater.modeKey) ?? "off", "wifiOnly": wifiOnly]
    }

    @objc func getPrefs(_ call: CAPPluginCall) {
        call.resolve(prefsJson())
    }

    /** { mode?: auto | ask | off, wifiOnly?: boolean }: kept for the settings screen; nothing downloads on iOS either way */
    @objc func setPrefs(_ call: CAPPluginCall) {
        let ud = UserDefaults.standard
        if let mode = call.getString("mode"), ["auto", "ask", "off"].contains(mode) { ud.set(mode, forKey: AbsUpdater.modeKey) }
        if let wifiOnly = call.getBool("wifiOnly") { ud.set(wifiOnly, forKey: AbsUpdater.wifiKey) }
        call.resolve(prefsJson())
    }

    /** { online, unmetered }: unmetered = not cellular / hotspot and not Low Data Mode */
    @objc func network(_ call: CAPPluginCall) {
        let p = monitorQueue.sync { path } ?? monitor.currentPath
        var unmetered = !p.isExpensive
        if #available(iOS 13.0, *) { unmetered = unmetered && !p.isConstrained }
        call.resolve(["online": p.status == .satisfied, "unmetered": p.status == .satisfied && unmetered])
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["ready": false, "downloading": false])
    }

    /** Never downloads: an iOS app can't install a build itself */
    @objc func download(_ call: CAPPluginCall) {
        call.reject(AbsUpdater.noSideload, "UNSUPPORTED")
    }

    @objc func canInstall(_ call: CAPPluginCall) {
        call.resolve(["allowed": false])
    }

    /** Android opens "Install unknown apps" here; iOS has no such switch, so: the releases page */
    @objc func openInstallSettings(_ call: CAPPluginCall) {
        openReleases { _ in call.resolve() }
    }

    /** { build }: opens the releases page; started is false because nothing installs from the app */
    @objc func install(_ call: CAPPluginCall) {
        openReleases { opened in
            call.resolve(["started": false, "opened": opened, "message": AbsUpdater.noSideload])
        }
    }

    private func openReleases(_ done: @escaping (Bool) -> Void) {
        guard let url = URL(string: AbsUpdater.releasesPage) else { return done(false) }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { ok in done(ok) }
        }
    }
}

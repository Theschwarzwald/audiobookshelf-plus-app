//
//  AbsDevice.swift
//  App
//
//  ABS+: the iOS side of AbsDevice.kt (same JS contract, see plugins/capacitor/AbsDevice.js and store/device.js).
//

import Foundation
import os // os_proc_available_memory
import UIKit
import AVFoundation
import LocalAuthentication
import Capacitor

/**
 * Tells the app what device it's on and keeps it posted, so screens, readers and transcription adapt:
 *   getProfile()                 -> cores, performance cores, RAM, tier, Low Power Mode, thermal, battery,
 *                                   refresh rates (ProMotion 120 Hz), OLED guess, never e-ink or foldable
 *   setRefreshRate({ mode, hz }) iOS picks the rate itself: accepted, nothing forced
 *   getPrefs() / setPrefs({...}) the Device & performance choices (same keys and values as AdaptPrefs.kt)
 *   events: onPrefsChange { prefs } · onMemoryPressure { level, availRamMb } · onAudioOutput { latencyMs, bluetooth, measured }
 *           onPowerChange { powerSave, thermal, battery, charging } · onGuidedAccessChange { enabled }
 *
 * Screen lock: iOS can't pin an app or block Home for an app. setLockMode never claims a pin; it reports
 * Guided Access (Settings → Accessibility → Guided Access, then triple-click the side or Home button),
 * which is the system's own way to keep one app on screen.
 */
@objc(AbsDevice)
public class AbsDevice: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "AbsDevicePlugin"
    public var jsName = "AbsDevice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProfile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPrefs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPrefs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRefreshRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAudioOutput", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setScreenDim", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLockMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getGuidedAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "biometricAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deviceUnlockAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "confirmDeviceUnlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLockscreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLockscreen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLockscreenTranscript", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openLockscreenPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openOverlayPermission", returnType: CAPPluginReturnPromise)
    ]

    private var observers: [NSObjectProtocol] = []

    // screen lock state (touched on the main thread only)
    private var idleDisabledBefore: Bool?
    private var brightnessBefore: CGFloat?
    private var dimLevel: CGFloat?

    override public func load() {
        DispatchQueue.main.async {
            UIDevice.current.isBatteryMonitoringEnabled = true
        }
        let nc = NotificationCenter.default
        // Low Power Mode, heat, plugged in or out, battery level (closures inline: the SDK wants them @Sendable)
        let powerNames: [Notification.Name] = [
            Notification.Name.NSProcessInfoPowerStateDidChange,
            ProcessInfo.thermalStateDidChangeNotification,
            UIDevice.batteryStateDidChangeNotification,
            UIDevice.batteryLevelDidChangeNotification
        ]
        for name in powerNames {
            observers.append(nc.addObserver(forName: name, object: nil, queue: nil) { [weak self] _ in self?.emitPower() })
        }
        // iOS says memory is getting tight: tell the app so it steps down (smaller caches, fewer pages ahead)
        observers.append(nc.addObserver(forName: UIApplication.didReceiveMemoryWarningNotification, object: nil, queue: nil) { [weak self] _ in
            self?.notifyListeners("onMemoryPressure", data: ["level": 80, "availRamMb": AbsDevice.availRamMb()])
        })
        // headphones connected or disconnected: the delay changes
        observers.append(nc.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: nil) { [weak self] _ in
            guard let self = self else { return }
            self.notifyListeners("onAudioOutput", data: self.audioOutputJson())
        })
        observers.append(nc.addObserver(forName: UIAccessibility.guidedAccessStatusDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.notifyListeners("onGuidedAccessChange", data: ["enabled": UIAccessibility.isGuidedAccessEnabled])
        })
        // Screen brightness is system-wide on iOS (Android's is per window): give it back while ABS+ is
        // in the background, dim again on return
        observers.append(nc.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            if let before = self?.brightnessBefore { UIScreen.main.brightness = before }
        })
        observers.append(nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            guard let self = self, self.brightnessBefore != nil, let level = self.dimLevel else { return }
            self.brightnessBefore = UIScreen.main.brightness
            UIScreen.main.brightness = min(level, UIScreen.main.brightness)
        })
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    // ---------------------------------------------------------------- power

    /** 0 none · 1 light · 2 moderate · 4 critical, the same scale as Android's THERMAL_STATUS_* (the app eases off at 2, low power at 3+) */
    private static func thermal() -> Int {
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: return 0
        case .fair: return 1
        case .serious: return 2
        case .critical: return 4
        @unknown default: return 0
        }
    }

    /** UIDevice is UIKit: read on the main thread */
    private func powerJson() -> [String: Any] {
        let d = UIDevice.current
        let level = d.batteryLevel
        let charging = d.batteryState == .charging || d.batteryState == .full
        return [
            "powerSave": ProcessInfo.processInfo.isLowPowerModeEnabled,
            "thermal": AbsDevice.thermal(),
            "battery": level < 0 ? -1 : Int((level * 100).rounded()),
            "charging": charging
        ]
    }

    private func emitPower() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.notifyListeners("onPowerChange", data: self.powerJson())
        }
    }

    // ---------------------------------------------------------------- hardware

    private static func sysctlInt(_ name: String) -> Int? {
        var value: Int32 = 0
        var size = MemoryLayout<Int32>.size
        return sysctlbyname(name, &value, &size, nil, 0) == 0 ? Int(value) : nil
    }

    private static func totalRamMb() -> Int {
        return Int(ProcessInfo.processInfo.physicalMemory / (1024 * 1024))
    }

    /** What this app may still use before iOS stops it (os_proc_available_memory, iOS 13+) */
    private static func availRamMb() -> Int {
        return Int(os_proc_available_memory() / (1024 * 1024))
    }

    /** e.g. "iPhone15,2" (the simulator reports the device it simulates) */
    private static func machineId() -> String {
        if let sim = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return sim }
        var sys = utsname()
        uname(&sys)
        let mirror = Mirror(reflecting: sys.machine)
        return mirror.children.reduce("") { acc, el in
            guard let v = el.value as? Int8, v != 0 else { return acc }
            return acc + String(UnicodeScalar(UInt8(v)))
        }
    }

    private static func isMac() -> Bool {
        if #available(iOS 14.0, *) {
            if ProcessInfo.processInfo.isiOSAppOnMac { return true }
        }
        return ProcessInfo.processInfo.isMacCatalystApp
    }

    /**
     * OLED from the model: every iPhone from the X on except XR, 11, SE (2nd/3rd gen); on iPad only the
     * M4 iPad Pro. iOS has no API that says what the panel is.
     */
    private static func oledLikely(_ id: String) -> Bool {
        let parts = id.split(separator: ",")
        guard parts.count == 2 else { return false }
        let name = String(parts[0])
        let minor = Int(parts[1]) ?? 0
        if name.hasPrefix("iPhone"), let major = Int(name.dropFirst("iPhone".count)) {
            if major >= 13 { return !(major == 14 && minor == 6) } // 12 series on; iPhone14,6 = SE 3rd gen (LCD)
            switch (major, minor) {
            case (10, 3), (10, 6), (11, 2), (11, 4), (11, 6), (12, 3), (12, 5): return true // X, XS, XS Max, 11 Pro, 11 Pro Max
            default: return false
            }
        }
        if name.hasPrefix("iPad"), let major = Int(name.dropFirst("iPad".count)) {
            return major == 16 && (3...6).contains(minor) // iPad Pro (M4)
        }
        return false
    }

    /** low | mid | high from memory: Apple's cores are fast, so Android's core-count rule would call every iPhone low */
    private static func tier(ramMb: Int) -> String {
        if ramMb >= 7000 { return "high" }
        if ramMb >= 3500 { return "mid" }
        return "low"
    }

    // ---------------------------------------------------------------- methods

    @objc func getProfile(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let cores = ProcessInfo.processInfo.activeProcessorCount
            // performance / efficiency cores (iOS 15+ kernels); a guess before that
            let big = AbsDevice.sysctlInt("hw.perflevel0.logicalcpu") ?? Int((Double(cores) / 2).rounded(.up))
            let little = AbsDevice.sysctlInt("hw.perflevel1.logicalcpu") ?? max(0, cores - big)
            let ram = AbsDevice.totalRamMb()
            let maxFps = UIScreen.main.maximumFramesPerSecond
            let rates: [Double] = maxFps > 60 ? [60, Double(maxFps)] : [Double(max(maxFps, 60))]
            let bounds = UIScreen.main.bounds
            let id = AbsDevice.machineId()
            let mac = AbsDevice.isMac()
            let colorCorrection = UIAccessibility.isGrayscaleEnabled ? "mono" : "none"
            let fontScale = Double(UIFontMetrics.default.scaledValue(for: 17) / 17)
            var o = self.powerJson()
            o["cores"] = cores
            o["bigCores"] = big
            o["littleCores"] = little
            o["ramMb"] = ram
            o["availRamMb"] = AbsDevice.availRamMb()
            o["lowRam"] = ram < 3000
            o["tier"] = AbsDevice.tier(ramMb: ram)
            o["refreshRates"] = rates
            o["oledLikely"] = !mac && AbsDevice.oledLikely(id)
            o["eink"] = false
            o["einkColor"] = false
            o["foldable"] = false
            o["desktop"] = mac
            o["chromeOs"] = false
            // systemDark left out on purpose: the web view's prefers-color-scheme follows iOS at once, and
            // store/device.js only watches it when the profile has no systemDark
            o["smallestWidthDp"] = Int(min(bounds.width, bounds.height))
            o["manufacturer"] = "Apple"
            o["model"] = UIDevice.current.model
            o["modelId"] = id
            o["osVersion"] = UIDevice.current.systemVersion
            o["fold"] = ["posture": "none"]
            o["colorCorrection"] = colorCorrection
            o["highContrastText"] = UIAccessibility.isDarkerSystemColorsEnabled
            o["fontScale"] = fontScale
            call.resolve(o)
        }
    }

    // ---- Device & performance choices (AdaptPrefs.kt), kept in UserDefaults

    private static let prefKeys = ["formFactor", "screen", "refresh", "power", "background", "lowBatteryAt", "theme", "colorVision"]
    private static let allowed: [String: Set<String>] = [
        "formFactor": ["auto", "phone", "tablet", "desktop"],
        "screen": ["auto", "lcd", "oled", "eink", "eink-color"],
        "refresh": ["auto", "max", "120", "90", "60"],
        "power": ["auto", "max", "balanced", "saver"],
        "background": ["auto", "charging", "always", "manual"],
        "theme": ["auto", "system", "dark", "black", "light", "eink", "eink-dark", "eink-color", "eink-color-dark"],
        "colorVision": ["none", "protan", "deutan", "tritan", "mono"]
    ]
    private static let prefPrefix = "abs_plus_adapt."

    private static func pref(_ key: String) -> String {
        let def = key == "lowBatteryAt" ? "20" : (key == "theme" || key == "colorVision") ? "" : "auto"
        return UserDefaults.standard.string(forKey: prefPrefix + key) ?? def
    }

    private static func prefsJson() -> [String: Any] {
        var o: [String: Any] = [:]
        prefKeys.forEach { o[$0] = pref($0) }
        return o
    }

    @objc func getPrefs(_ call: CAPPluginCall) {
        call.resolve(AbsDevice.prefsJson())
    }

    @objc func setPrefs(_ call: CAPPluginCall) {
        let ud = UserDefaults.standard
        var changed = false
        if call.getBool("reset") == true {
            AbsDevice.prefKeys.forEach { ud.removeObject(forKey: AbsDevice.prefPrefix + $0) }
            changed = true
        }
        for k in AbsDevice.prefKeys {
            var raw: String?
            if let s = call.getString(k) {
                raw = s
            } else if let d = call.getDouble(k) {
                raw = d == d.rounded() ? String(Int(d)) : String(d)
            }
            guard let r = raw else { continue }
            let v = r.trimmingCharacters(in: .whitespaces).lowercased()
            let ok: Bool
            if k == "lowBatteryAt" {
                ok = Int(v).map { (5...50).contains($0) } ?? false
            } else {
                ok = AbsDevice.allowed[k]?.contains(v) ?? false
            }
            if !ok { continue }
            if AbsDevice.pref(k) != v { changed = true }
            ud.set(v, forKey: AbsDevice.prefPrefix + k)
        }
        let prefs = AbsDevice.prefsJson()
        // Android tells the app on every change (SharedPreferences listener): same here
        if changed { notifyListeners("onPrefsChange", data: ["prefs": prefs]) }
        call.resolve(prefs)
    }

    /**
     * iOS chooses the refresh rate itself (ProMotion goes up to 120 Hz when the app animates, and needs
     * CADisableMinimumFrameDurationOnPhone in Info.plist on iPhone). Accepted; reports the rate asked for, capped at the screen's.
     */
    @objc func setRefreshRate(_ call: CAPPluginCall) {
        let mode = call.getString("mode") ?? "max"
        let hz = call.getDouble("hz")
        DispatchQueue.main.async {
            let maxFps = Double(max(UIScreen.main.maximumFramesPerSecond, 60))
            let rate: Double
            if let hz = hz { rate = min(hz, maxFps) } else if mode == "max" { rate = maxFps } else { rate = min(60, maxFps) }
            call.resolve(["refreshRate": rate])
        }
    }

    /** What the sound comes out of and how far behind the player's position it is heard: { latencyMs, bluetooth, measured } */
    @objc func getAudioOutput(_ call: CAPPluginCall) {
        call.resolve(audioOutputJson())
    }

    private func audioOutputJson() -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        let bluetoothPorts: [AVAudioSession.Port] = [.bluetoothA2DP, .bluetoothLE, .bluetoothHFP]
        let bt = session.currentRoute.outputs.contains { bluetoothPorts.contains($0.portType) }
        // outputLatency covers the route, Bluetooth's included; plus one I/O buffer
        let seconds = session.outputLatency + session.ioBufferDuration
        let measured = seconds > 0
        return [
            "bluetooth": bt,
            "latencyMs": measured ? Int((seconds * 1000).rounded()) : (bt ? 250 : 40),
            "measured": measured
        ]
    }

    // ---- ABS+ screen lock (the lock button in the player and the transcription views)

    /** Locked: the screen dims and stays on (no sleep). Unlocked: brightness and auto-lock as before. */
    @objc func setScreenDim(_ call: CAPPluginCall) {
        let dim = call.getBool("dim") ?? false
        let keepOn = call.getBool("keepOn") ?? dim
        let level = CGFloat(call.getDouble("level") ?? 0.3)
        DispatchQueue.main.async {
            let app = UIApplication.shared
            if keepOn && self.idleDisabledBefore == nil {
                self.idleDisabledBefore = app.isIdleTimerDisabled
                app.isIdleTimerDisabled = true
            } else if !keepOn, let before = self.idleDisabledBefore {
                app.isIdleTimerDisabled = before
                self.idleDisabledBefore = nil
            }
            if dim {
                if self.brightnessBefore == nil { self.brightnessBefore = UIScreen.main.brightness }
                self.dimLevel = level
                // dimming never brightens a screen that is already darker
                UIScreen.main.brightness = min(level, self.brightnessBefore ?? level)
            } else if let before = self.brightnessBefore {
                UIScreen.main.brightness = before
                self.brightnessBefore = nil
                self.dimLevel = nil
            }
            call.resolve()
        }
    }

    /**
     * Android pins the app here. iOS has no pinning for apps: never reports pinned, and says whether
     * Guided Access is on so the app can suggest it. statusBarTop 0: the bars never hide here, so the
     * page's own env(safe-area-inset-top) stays right.
     */
    @objc func setLockMode(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve([
                "pinned": false,
                "statusBarTop": 0,
                "guidedAccess": UIAccessibility.isGuidedAccessEnabled
            ])
        }
    }

    /** { enabled }: Guided Access keeps one app on screen (Settings → Accessibility → Guided Access, triple-click to start) */
    @objc func getGuidedAccess(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["enabled": UIAccessibility.isGuidedAccessEnabled])
        }
    }

    /** available: Face ID / Touch ID set up and ready · hardware: the device has the sensor at all */
    @objc func biometricAvailable(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err)
        var hardware = true
        if !ok, let code = err?.code, code == LAError.Code.biometryNotAvailable.rawValue {
            // biometryNotAvailable is also what a refused Face ID permission gives: the sensor is still
            // there then (biometryType says so), and the phone's passcode unlocks
            hardware = ctx.biometryType != .none
        }
        call.resolve(["available": ok, "hardware": hardware])
    }

    /** Whether the device has a passcode (and so Face ID / Touch ID) to unlock with */
    @objc func deviceUnlockAvailable(_ call: CAPPluginCall) {
        var err: NSError?
        let ok = LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &err)
        call.resolve(["available": ok])
    }

    /** The device's own unlock: Face ID / Touch ID, falling back to its passcode */
    @objc func confirmDeviceUnlock(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else {
            return call.resolve(["ok": false, "reason": "no-lock"])
        }
        let title = call.getString("title") ?? "Unlock ABS+"
        let subtitle = call.getString("subtitle") ?? ""
        let reason = subtitle.isEmpty ? title : "\(title) · \(subtitle)"
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
            if success {
                call.resolve(["ok": true])
            } else {
                call.resolve(["ok": false, "reason": error?.localizedDescription ?? "cancelled"])
            }
        }
    }

    // ---- lock-screen transcription card: Android only (iOS doesn't let apps draw on the lock screen)

    @objc func getLockscreen(_ call: CAPPluginCall) {
        let oled = !AbsDevice.isMac() && AbsDevice.oledLikely(AbsDevice.machineId())
        call.resolve(["mode": "off", "enabled": false, "allowed": false, "oled": oled, "overlay": false])
    }

    @objc func setLockscreen(_ call: CAPPluginCall) {
        getLockscreen(call)
    }

    /** Nothing shows them on iOS: accepted, none kept */
    @objc func setLockscreenTranscript(_ call: CAPPluginCall) {
        guard call.getString("key") != nil else { return call.reject("key required") }
        call.resolve(["lines": 0])
    }

    @objc func openLockscreenPermission(_ call: CAPPluginCall) {
        call.reject("The lock-screen card is only in the Android app")
    }

    @objc func openOverlayPermission(_ call: CAPPluginCall) {
        call.reject("The lock-screen card is only in the Android app")
    }
}

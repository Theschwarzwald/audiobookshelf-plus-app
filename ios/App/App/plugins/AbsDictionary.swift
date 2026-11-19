//
//  AbsDictionary.swift
//  App
//
//  ABS+: the iOS side of AbsDictionary.kt (JS contract in plugins/capacitor/AbsDictionary.js and plugins/dictionary.js).
//

import Foundation
import UIKit
import Capacitor

/**
 * Word lookups for the e-reader on iPhone and iPad. The offline StarDict and built-in (WordNet / WikDict /
 * FreeDict) dictionaries aren't ported yet: list/lookup answer "none installed", downloads reject with a
 * message the app shows, and lookups carry on to the server's dictionaries in JS (plugins/dictionary.js).
 * iOS's own dictionary stands in for the offline ones:
 *
 *   builtinLookup({ word, lang })  -> { entry: null, suggested: null, anyInstalled: false, online: false, systemDefinition }
 *                                     systemDefinition: iOS's dictionary has the word
 *   showDefinition({ word })       -> { shown }  opens iOS's dictionary card for the word
 */
@objc(AbsDictionary)
public class AbsDictionary: CAPPlugin, CAPBridgedPlugin {
    public var identifier = "AbsDictionaryPlugin"
    public var jsName = "AbsDictionary"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lookup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "install", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "builtinList", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "builtinInstall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "builtinRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setOnline", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "builtinLookup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showDefinition", returnType: CAPPluginReturnPromise)
    ]

    private static let notOnIos = "Downloaded dictionaries aren't on iPhone and iPad yet. Words are looked up on your server, or in the iOS dictionary."

    // ---- StarDict dictionaries from the server: none on iOS yet

    @objc func list(_ call: CAPPluginCall) {
        call.resolve(["dictionaries": []])
    }

    /** Same shape as Android's "nothing matched": the JS then asks the server */
    @objc func lookup(_ call: CAPPluginCall) {
        call.resolve(["matched": NSNull(), "results": [], "source": "device", "installed": 0])
    }

    @objc func install(_ call: CAPPluginCall) {
        call.reject(AbsDictionary.notOnIos, "UNAVAILABLE")
    }

    @objc func remove(_ call: CAPPluginCall) {
        call.resolve()
    }

    // ---- built-in dictionaries: none to download on iOS; online lookups are the server's (in JS)

    @objc func builtinList(_ call: CAPPluginCall) {
        call.resolve(["dictionaries": [], "online": false])
    }

    @objc func builtinInstall(_ call: CAPPluginCall) {
        call.reject(AbsDictionary.notOnIos, "UNAVAILABLE")
    }

    @objc func builtinRemove(_ call: CAPPluginCall) {
        call.resolve()
    }

    /** Phone-side online lookups (Free Dictionary API / Wiktionary) aren't ported: accepted, stays off */
    @objc func setOnline(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func builtinLookup(_ call: CAPPluginCall) {
        let word = (call.getString("word") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !word.isEmpty else { return call.reject("word required") }
        // UIReferenceLibraryViewController is UIKit: main thread
        DispatchQueue.main.async {
            let has = UIReferenceLibraryViewController.dictionaryHasDefinition(forTerm: word)
            call.resolve([
                "entry": NSNull(),
                "suggested": NSNull(),
                "anyInstalled": false,
                "online": false,
                "systemDefinition": has
            ])
        }
    }

    /** iOS's dictionary card over the reader (it also offers to download dictionaries when none has the word) */
    @objc func showDefinition(_ call: CAPPluginCall) {
        let word = (call.getString("word") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !word.isEmpty else { return call.reject("word required") }
        DispatchQueue.main.async {
            var top = self.bridge?.viewController
            while let presented = top?.presentedViewController { top = presented }
            guard let host = top else { return call.resolve(["shown": false]) }
            let card = UIReferenceLibraryViewController(term: word)
            if UIDevice.current.userInterfaceIdiom == .pad { card.modalPresentationStyle = .formSheet }
            host.present(card, animated: true) {
                call.resolve(["shown": true])
            }
        }
    }
}

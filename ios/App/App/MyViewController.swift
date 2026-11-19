//
//  MyViewController.swift
//  Audiobookshelf
//
//  Created by advplyr on 1/12/25.
//

import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
    }
    
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AbsDatabase())
        bridge?.registerPluginInstance(AbsAudioPlayer())
        bridge?.registerPluginInstance(AbsDownloader())
        bridge?.registerPluginInstance(AbsFileSystem())
        bridge?.registerPluginInstance(AbsLogger())
        // ABS+
        bridge?.registerPluginInstance(AbsDevice())
        bridge?.registerPluginInstance(AbsDictionary())
        bridge?.registerPluginInstance(AbsUpdater())
        bridge?.registerPluginInstance(AbsPageTurn())
        // Transcripts on the phone, sync with the server, and (once the speech engine is added) transcription
        bridge?.registerPluginInstance(AbsTranscriber())
        // Added to the project by ios/App/scripts/add-live-activity-target.rb, so looked up by name: the app still
        // builds and runs before that script has been run.
        for name in ["AbsLiveActivity"] {
            if let objectType = NSClassFromString(name) as? NSObject.Type, let plugin = objectType.init() as? CAPPlugin {
                bridge?.registerPluginInstance(plugin)
            }
        }
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */

}

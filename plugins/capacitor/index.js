import Vue from 'vue'
import { AbsAudioPlayer } from './AbsAudioPlayer'
import { AbsDownloader } from './AbsDownloader'
import { AbsFileSystem } from './AbsFileSystem'
import { AbsDatabase } from './AbsDatabase'
import { AbsLogger } from './AbsLogger'
import { AbsTranscriber } from './AbsTranscriber'
import { AbsDictionary } from './AbsDictionary'
import { AbsDevice } from './AbsDevice'
import { Capacitor } from '@capacitor/core'

Vue.prototype.$platform = Capacitor.getPlatform()

export { AbsAudioPlayer, AbsDownloader, AbsFileSystem, AbsLogger, AbsDatabase, AbsTranscriber, AbsDictionary, AbsDevice }

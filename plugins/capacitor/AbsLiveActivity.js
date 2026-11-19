import { registerPlugin, WebPlugin } from '@capacitor/core'

// iOS Live Activity: the line being read on the lock screen and in the Dynamic Island (iOS 16.1+)
class AbsLiveActivityWeb extends WebPlugin {
  async isAvailable() {
    return { supported: false, enabled: false }
  }
  async setTranscript() {
    return { lines: 0 }
  }
  async setEnabled() {}
  async end() {}
}

const AbsLiveActivity = registerPlugin('AbsLiveActivity', { web: () => new AbsLiveActivityWeb() })

export { AbsLiveActivity }

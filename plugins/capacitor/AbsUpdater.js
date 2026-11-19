import { registerPlugin, WebPlugin } from '@capacitor/core'

// ABS+ updating itself (Android only; the web build has nothing to install)
class AbsUpdaterWeb extends WebPlugin {
  async getPrefs() {
    return { build: 0, mode: 'off', wifiOnly: true }
  }
  async setPrefs() {
    return this.getPrefs()
  }
  async network() {
    return { online: navigator.onLine, unmetered: true }
  }
  async status() {
    return { ready: false, downloading: false }
  }
  async download() {
    throw new Error('Updates install on Android only')
  }
  async canInstall() {
    return { allowed: false }
  }
  async openInstallSettings() {}
  async install() {
    throw new Error('Updates install on Android only')
  }
}

export const AbsUpdater = registerPlugin('AbsUpdater', { web: () => new AbsUpdaterWeb() })

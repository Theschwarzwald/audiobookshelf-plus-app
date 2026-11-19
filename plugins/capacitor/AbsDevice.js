import { registerPlugin, WebPlugin } from '@capacitor/core'

// Outside Android: a profile from what the browser can tell
class AbsDeviceWeb extends WebPlugin {
  async getProfile() {
    const cores = navigator.hardwareConcurrency || 4
    const ramMb = (navigator.deviceMemory || 4) * 1024
    const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches
    return {
      cores,
      bigCores: Math.ceil(cores / 2),
      littleCores: Math.floor(cores / 2),
      ramMb,
      lowRam: ramMb < 3000,
      tier: cores >= 8 && ramMb >= 8000 ? 'high' : cores <= 4 ? 'low' : 'mid',
      powerSave: false,
      thermal: 0,
      battery: -1,
      charging: true,
      refreshRates: [],
      oledLikely: false,
      eink: false,
      einkColor: false,
      foldable: false,
      desktop: fine && window.innerWidth >= 1024,
      systemDark: dark,
      smallestWidthDp: Math.min(window.innerWidth, window.innerHeight),
      fold: { posture: 'none' }
    }
  }
  async setRefreshRate() {
    return {}
  }
  async getPrefs() {
    try {
      return JSON.parse(localStorage.getItem('absPlusPrefs') || '{}')
    } catch (e) {
      return {}
    }
  }
  async setPrefs(values) {
    const next = values && values.reset ? {} : { ...(await this.getPrefs()), ...values }
    delete next.reset
    localStorage.setItem('absPlusPrefs', JSON.stringify(next))
    return next
  }
}

const AbsDevice = registerPlugin('AbsDevice', { web: () => new AbsDeviceWeb() })
export { AbsDevice }

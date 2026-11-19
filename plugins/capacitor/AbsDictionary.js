import { registerPlugin, WebPlugin } from '@capacitor/core'

// Offline dictionaries are Android-only; elsewhere lookups go to the server.
class AbsDictionaryWeb extends WebPlugin {
  async list() {
    return { dictionaries: [] }
  }
  async lookup() {
    return { matched: null, results: [], source: 'device' }
  }
  async install() {
    throw new Error('Offline dictionaries are available in the Android app')
  }
  async remove() {}
  async builtinList() {
    return { dictionaries: [], online: false }
  }
  async builtinInstall() {
    throw new Error('Built-in dictionaries are available in the Android app')
  }
  async builtinRemove() {}
  async setOnline() {}
  async builtinLookup() {
    return { entry: null, suggested: null, anyInstalled: false, online: false }
  }
}

const AbsDictionary = registerPlugin('AbsDictionary', {
  web: () => new AbsDictionaryWeb()
})

export { AbsDictionary }

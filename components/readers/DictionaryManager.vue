<template>
  <!-- Dictionaries: built-in ones (from Grimmory), your server's, and online lookups -->
  <div>
    <p class="text-sm mb-3" :style="{ color: p.muted }">Press and hold a word to look it up. Download a dictionary to look words up without a connection. The right one is picked from the word and the book's language.</p>

    <p class="text-xs font-semibold mb-1 mt-4" :style="{ color: p.muted }">Built-in dictionaries</p>
    <div v-for="d in builtin" :key="d.code" class="py-2 flex items-center border-b" :style="{ borderColor: p.border }">
      <div class="flex-grow min-w-0">
        <p class="text-sm">{{ d.direction }}</p>
        <p class="text-xs" :style="{ color: p.faint }">{{ d.credit }} · about {{ d.sizeLabel }}</p>
        <p v-if="d.status === 'failed'" class="text-xs" style="color: #e53935">{{ d.message }}</p>
      </div>
      <span v-if="d.status === 'installing'" class="text-xs" :style="{ color: p.muted }">{{ Math.round((d.progress || 0) * 100) }}%</span>
      <button v-else-if="d.status === 'ready'" class="material-symbols" :style="{ color: p.muted }" aria-label="Remove" @click.stop="removeBuiltin(d)">delete</button>
      <button v-else class="px-3 py-1 rounded-full text-xs font-semibold" :style="{ backgroundColor: p.accentSoft, color: p.accent }" @click.stop="installBuiltin(d)">Download</button>
    </div>
    <p v-if="!builtin.length" class="text-sm py-2" :style="{ color: p.muted }">Built-in dictionaries are available in the Android app.</p>

    <label class="flex items-center py-3 mt-2 cursor-pointer">
      <input type="checkbox" :checked="onlineAllowed" class="mr-3" :style="{ accentColor: p.accent }" @change="toggleOnline($event.target.checked)" />
      <span class="text-sm">Look words up online when no download has them<br /><span class="text-xs" :style="{ color: p.faint }">Free Dictionary API for English, Wiktionary for other languages</span></span>
    </label>

    <p class="text-xs font-semibold mb-1 mt-4" :style="{ color: p.muted }">From your server</p>
    <div v-for="d in serverDicts" :key="d.id" class="py-2 flex items-center border-b" :style="{ borderColor: p.border }">
      <div class="flex-grow min-w-0">
        <p class="text-sm">{{ d.name }}</p>
        <p class="text-xs" :style="{ color: p.faint }">{{ langName(d.lang) }} · {{ (d.words || 0).toLocaleString() }} words · {{ formatBytes(d.size) }}</p>
      </div>
      <span v-if="progress[d.id] !== undefined" class="text-xs" :style="{ color: p.muted }">{{ Math.round(progress[d.id] * 100) }}%</span>
      <button v-else-if="installed.some((x) => x.id === d.id)" class="material-symbols" :style="{ color: p.muted }" aria-label="Remove" @click.stop="removeDict(d)">delete</button>
      <button v-else class="px-3 py-1 rounded-full text-xs font-semibold" :style="{ backgroundColor: p.accentSoft, color: p.accent }" @click.stop="installDict(d)">Download</button>
    </div>
    <p v-if="!serverDicts.length" class="text-sm py-2" :style="{ color: p.muted }">{{ online ? 'None on your server. (Server admins: put StarDict dictionaries in the transcription container’s /dictionaries folder.) Words are still looked up there online if it allows that.' : 'Connect to your server to see its dictionaries.' }}</p>
  </div>
</template>

<script>
import { serverDictionaries, installedDictionaries, installDictionary, removeDictionary, onDownloadProgress, builtinDictionaries, installBuiltin, removeBuiltin, setOnlineLookups, onBuiltinProgress } from '@/plugins/dictionary'

export default {
  props: { p: { type: Object, required: true } },
  data() {
    return { builtin: [], onlineAllowed: false, serverDicts: [], installed: [], progress: {}, listeners: [] }
  },
  computed: {
    online() {
      return !!(this.$store.state.user.user && this.$store.state.networkConnected !== false)
    }
  },
  methods: {
    async load() {
      const b = await builtinDictionaries()
      this.builtin = b.dictionaries || []
      this.onlineAllowed = !!b.online
      this.installed = await installedDictionaries()
      this.serverDicts = await serverDictionaries()
    },
    async installBuiltin(d) {
      this.update({ ...d, status: 'installing', progress: 0 })
      try {
        await installBuiltin(d.code)
      } catch (e) {
        this.$toast.error(e.message)
      }
    },
    async removeBuiltin(d) {
      await removeBuiltin(d.code)
      this.update({ ...d, status: 'none' })
    },
    update(d) {
      const i = this.builtin.findIndex((x) => x.code === d.code)
      if (i >= 0) this.$set(this.builtin, i, { ...this.builtin[i], ...d })
    },
    async toggleOnline(v) {
      this.onlineAllowed = v
      await setOnlineLookups(v)
    },
    async installDict(d) {
      this.$set(this.progress, d.id, 0)
      try {
        await installDictionary(d)
        this.$toast.success(`${d.name} is ready to use offline`)
      } catch (e) {
        this.$toast.error(`Download failed: ${e.message}`)
      }
      this.$delete(this.progress, d.id)
      this.installed = await installedDictionaries()
    },
    async removeDict(d) {
      await removeDictionary(d.id)
      this.installed = await installedDictionaries()
    },
    langName(l) {
      if (!l || l === 'any') return 'Any language'
      try {
        return new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(l) || l
      } catch (e) {
        return l
      }
    },
    formatBytes(b) {
      if (!b) return '–'
      return b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`
    }
  },
  async mounted() {
    this.load()
    this.listeners.push(await onBuiltinProgress((e) => this.update(e)))
    this.listeners.push(
      await onDownloadProgress((e) => {
        if (e.done) {
          this.$delete(this.progress, e.id)
          installedDictionaries().then((l) => (this.installed = l))
        } else this.$set(this.progress, e.id, e.progress)
      })
    )
  },
  beforeDestroy() {
    this.listeners.forEach((l) => l && l.remove && l.remove())
  }
}
</script>

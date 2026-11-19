<template>
  <!-- Settings → App updates: how ABS+ keeps itself up to date from your server (Android) -->
  <div v-if="$platform === 'android'">
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">App updates</p>
    <div class="py-3 flex items-center">
      <p class="pr-4 w-36">Updates</p>
      <div @click.stop="showModes = true">
        <ui-text-input :value="modeLabel" readonly append-icon="expand_more" style="max-width: 220px" />
      </div>
    </div>
    <p class="text-xs text-fg-muted -mt-1 mb-2">{{ modeHelp }}</p>
    <div v-if="prefs.mode !== 'off'" class="flex items-center py-3" @click="toggleWifi">
      <div class="w-10 flex justify-center">
        <ui-toggle-switch :value="prefs.wifiOnly" class="pointer-events-none" />
      </div>
      <div class="pl-4">
        <p>Download on Wi-Fi only</p>
        <p class="text-xs text-fg-muted">Each update is about 120 MB</p>
      </div>
    </div>
    <div class="py-3 flex items-center cursor-pointer" @click="checkNow">
      <span class="material-symbols mr-3">system_update</span>
      <div class="flex-grow">
        <p>Check for updates now</p>
        <p class="text-xs text-fg-muted">{{ lastCheck || 'Looks for a new version on your server' }}</p>
      </div>
      <span class="material-symbols text-fg-muted">chevron_right</span>
    </div>
    <modals-dialog v-model="showModes" :items="modeItems" @action="setMode" />
  </div>
</template>

<script>
import { AbsUpdater } from '@/plugins/capacitor/AbsUpdater'

const MODES = [
  { text: 'Install automatically', value: 'auto', help: 'Downloads and installs new versions in the background, like the Play Store. Never while something is playing or the phone is transcribing.' },
  { text: 'Download, ask to install', value: 'ask', help: 'Downloads new versions in the background, then asks before installing.' },
  { text: 'Off', value: 'off', help: 'Only shows "Update available" when you open the app.' }
]

export default {
  data() {
    return { prefs: { build: 0, mode: 'auto', wifiOnly: true }, showModes: false, lastCheck: '' }
  },
  computed: {
    modeItems() {
      return MODES.map((m) => ({ text: m.text, value: m.value }))
    },
    modeLabel() {
      return (MODES.find((m) => m.value === this.prefs.mode) || MODES[0]).text
    },
    modeHelp() {
      return (MODES.find((m) => m.value === this.prefs.mode) || MODES[0]).help
    }
  },
  async mounted() {
    try {
      this.prefs = await AbsUpdater.getPrefs()
    } catch (e) {}
  },
  methods: {
    async setMode(mode) {
      this.showModes = false
      this.prefs = await AbsUpdater.setPrefs({ mode })
    },
    async toggleWifi() {
      this.prefs = await AbsUpdater.setPrefs({ wifiOnly: !this.prefs.wifiOnly })
    },
    checkNow() {
      this.lastCheck = 'checking…'
      this.$eventBus.$emit('abs-plus-check-update', (found) => {
        this.lastCheck = found ? 'An update is available' : 'ABS+ is up to date'
      })
    }
  }
}
</script>

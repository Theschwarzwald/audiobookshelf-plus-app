<template>
  <!-- First start: how the app should look, and colour vision. Both can be changed later in Settings. -->
  <div class="fixed inset-0 bg-bg text-fg overflow-y-auto" style="z-index: 150; padding-top: max(env(safe-area-inset-top), 24px)">
    <div class="max-w-2xl mx-auto px-5 pb-10">
      <div class="flex items-center justify-center gap-2 mb-6 mt-2">
        <span v-for="n in 2" :key="n" class="h-2 rounded-full" :class="n - 1 === step ? 'w-6 bg-fg' : 'w-2 bg-fg-muted'" />
      </div>

      <!-- 1. Appearance -->
      <template v-if="step === 0">
        <img src="/Logo.png" class="h-14 w-14 mb-3" alt="" />
        <h1 class="text-2xl font-semibold mb-1">Welcome! How should the app look?</h1>
        <p class="text-fg-muted text-sm mb-4">{{ detectedText }} You can change this any time in Settings.</p>
        <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))">
          <button v-for="t in themes" :key="t.value" class="text-left rounded-xl border-2 overflow-hidden" :class="choice === t.value ? 'border-fg' : 'border-border'" @click="pickTheme(t.value)">
            <div class="h-20 p-2.5 flex flex-col justify-between" :style="{ backgroundColor: t.p.bg, color: t.p.fg }">
              <div class="flex items-center gap-1.5">
                <span class="w-6 h-6 rounded" :style="{ backgroundColor: t.p.card }" />
                <span class="flex-grow">
                  <span class="block h-1.5 rounded w-4/5 mb-1" :style="{ backgroundColor: t.p.fg }" />
                  <span class="block h-1.5 rounded w-1/2" :style="{ backgroundColor: t.p.muted }" />
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full" :style="{ backgroundColor: t.p.accent }" />
                <span class="h-1 rounded flex-grow" :style="{ backgroundColor: t.p.muted }"><span class="block h-1 rounded w-2/5" :style="{ backgroundColor: t.p.fg }" /></span>
              </div>
            </div>
            <div class="px-2.5 py-2">
              <p class="text-sm font-semibold flex items-center">
                {{ t.label }}<span v-if="t.recommended" class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-fg text-bg font-semibold">Suggested</span>
              </p>
              <p class="text-xs text-fg-muted leading-snug">{{ t.description }}</p>
            </div>
          </button>
        </div>
        <button v-if="choice !== 'light' && !isEink" class="w-full mt-3 rounded-xl border-2 border-border px-3 py-3 flex items-center text-left" @click="toggleTrueBlack">
          <span class="material-symbols mr-3">{{ trueBlackOn ? 'toggle_on' : 'toggle_off' }}</span>
          <span class="flex-grow">
            <span class="block font-semibold text-sm">True black (OLED)</span>
            <span class="block text-xs text-fg-muted">{{ trueBlackHint }}</span>
          </span>
        </button>
        <button class="w-full mt-6 py-3 rounded-full bg-fg text-bg font-semibold" @click="step = 1">Continue</button>
      </template>

      <!-- 2. Colour vision -->
      <template v-else>
        <span class="material-symbols text-5xl mb-2">visibility</span>
        <h1 class="text-2xl font-semibold mb-1">Colour vision</h1>
        <p class="text-fg-muted text-sm mb-4">
          If some colours are hard to tell apart, the app can use colours that stay distinct for you. Labels and icons always say what things mean too.
          <template v-if="systemCvd !== 'none'"><br /><b>Your phone's colour correction is on, so the matching mode is picked.</b></template>
        </p>
        <div class="space-y-2">
          <button v-for="m in modes" :key="m.id" class="w-full text-left rounded-xl border-2 px-3 py-3 flex items-center" :class="cvd === m.id ? 'border-fg' : 'border-border'" @click="pickCvd(m.id)">
            <span class="material-symbols mr-3">{{ cvd === m.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
            <div class="flex-grow min-w-0">
              <p class="font-semibold text-sm">{{ m.label }}</p>
              <p class="text-xs text-fg-muted">{{ m.description }}</p>
            </div>
            <div class="flex gap-1 ml-2 flex-shrink-0" :style="m.id === 'mono' ? 'filter: grayscale(1)' : ''">
              <span v-for="(c, i) in samples[m.id]" :key="i" class="w-4 h-4 rounded-full" :style="{ backgroundColor: c }" />
            </div>
          </button>
        </div>
        <div class="rounded-xl border border-border p-3 mt-4">
          <p class="text-xs text-fg-muted mb-2">Preview</p>
          <div class="flex flex-wrap gap-2 text-xs font-semibold">
            <span class="px-2 py-1 rounded bg-success text-white flex items-center"><span class="material-symbols text-sm mr-1">check_circle</span>Downloaded</span>
            <span class="px-2 py-1 rounded bg-error text-white flex items-center"><span class="material-symbols text-sm mr-1">error</span>Failed</span>
            <span class="px-2 py-1 rounded bg-warning text-white flex items-center"><span class="material-symbols text-sm mr-1">cloud_off</span>Not synced</span>
            <span v-for="(c, n) in highlightSample" :key="n" class="px-2 py-1 rounded text-fg" :style="{ backgroundColor: c }">{{ n }}</span>
          </div>
        </div>
        <div class="flex mt-6 gap-3">
          <button class="flex-1 py-3 rounded-full border border-border font-semibold" @click="step = 0">Back</button>
          <button class="flex-1 py-3 rounded-full bg-fg text-bg font-semibold" @click="done">Continue</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { MODES, SAMPLES, highlightColors } from './colorVision'

const PREVIEW = {
  dark: { bg: 'rgb(35,35,35)', card: 'rgb(56,56,56)', fg: 'rgb(230,237,243)', muted: 'rgb(142,147,153)', accent: '#1ad691' },
  black: { bg: '#000', card: '#111', fg: 'rgb(230,237,243)', muted: 'rgb(120,126,132)', accent: '#1ad691' },
  light: { bg: '#fff', card: 'rgb(222,222,222)', fg: 'rgb(37,37,37)', muted: 'rgb(101,109,118)', accent: '#1ad691' },
  eink: { bg: '#fff', card: '#fff', fg: '#000', muted: '#444', accent: '#000' },
  'eink-dark': { bg: '#000', card: '#000', fg: '#fff', muted: '#bbb', accent: '#fff' },
  'eink-color': { bg: '#fff', card: '#ffe0b2', fg: '#000', muted: '#444', accent: '#e65100' },
  'eink-color-dark': { bg: '#000', card: '#4a2a00', fg: '#fff', muted: '#bbb', accent: '#ff9800' }
}

export default {
  data() {
    return { step: 0, choice: 'system', cvd: 'none', systemCvd: 'none' }
  },
  computed: {
    device() {
      return this.$store.state.device
    },
    profile() {
      return this.device.profile || {}
    },
    autoTheme() {
      return this.$store.getters['device/autoTheme']
    },
    detectedText() {
      const p = this.profile
      const ff = this.$store.getters['device/formFactor']
      const name = [p.manufacturer, p.model].filter(Boolean).join(' ')
      if (p.eink) return `This looks like ${p.einkColor ? 'a colour e-ink' : 'an e-ink'} reader${name ? ` (${name})` : ''}, so the e-ink versions are used: high contrast and no animations, in light or dark.`
      const kind = p.foldable ? 'foldable' : ff === 'tablet' ? 'tablet' : ff === 'desktop' ? 'computer' : 'phone'
      const mode = this.device.systemDark ? 'dark' : 'light'
      if (p.oledLikely) return `Your ${kind} is in ${mode} mode and its screen looks like OLED, so dark mode uses true black: deeper blacks and less battery.`
      return `Your ${kind} is in ${mode} mode. System follows it.`
    },
    isEink() {
      return this.$store.getters['device/isEink']
    },
    trueBlackOn() {
      return this.$store.getters['device/trueBlack']
    },
    trueBlackHint() {
      const t = this.device.appearance.trueBlack
      if (t === 'auto') return this.$store.getters['device/isOled'] ? 'On: this screen looks like OLED. Saves battery.' : 'Off: this screen doesn\'t look like OLED. Turn on for pure black.'
      return t === 'on' ? 'Pure black backgrounds. Saves battery on OLED screens.' : 'Dark grey backgrounds.'
    },
    themes() {
      const themeFor = this.$store.getters['device/themeFor']
      const list = [
        { value: 'system', label: 'System', description: this.isEink ? 'Light or dark e-ink, following your device.' : 'Light or dark, following your device.' },
        { value: 'light', label: 'Light', description: this.isEink ? 'Black on white e-ink.' : 'Dark text on white.' },
        { value: 'dark', label: 'Dark', description: this.isEink ? 'White on black e-ink.' : 'Easy on the eyes.' }
      ]
      return list.map((t) => ({ ...t, p: PREVIEW[themeFor(t.value)] || PREVIEW.dark, recommended: t.value === 'system' }))
    },
    modes: () => MODES,
    samples: () => SAMPLES,
    highlightSample() {
      const c = highlightColors(this.cvd) || { yellow: 'rgba(255, 214, 0, 0.75)', green: 'rgba(76, 175, 80, 0.7)', blue: 'rgba(66, 165, 245, 0.7)', pink: 'rgba(240, 98, 146, 0.7)' }
      return { Yellow: c.yellow, Green: c.green, Blue: c.blue, Pink: c.pink }
    }
  },
  watch: {
    'device.profile'(p) {
      if (p && p.colorCorrection && this.cvd === 'none') {
        this.systemCvd = p.colorCorrection
        this.pickCvd(p.colorCorrection)
      }
    }
  },
  methods: {
    pickTheme(v) {
      this.choice = v
      this.$store.dispatch('device/setAppearance', { mode: v })
    },
    toggleTrueBlack() {
      this.$store.dispatch('device/setAppearance', { trueBlack: this.trueBlackOn ? 'off' : 'on' })
    },
    pickCvd(m) {
      this.cvd = m
      this.$store.dispatch('onboarding/setColorVision', m)
    },
    done() {
      this.$store.dispatch('onboarding/finishSetup')
    }
  },
  mounted() {
    this.pickTheme('system')
    const p = this.profile
    if (p.colorCorrection && p.colorCorrection !== 'none') {
      this.systemCvd = p.colorCorrection
      this.pickCvd(p.colorCorrection)
    }
  }
}
</script>

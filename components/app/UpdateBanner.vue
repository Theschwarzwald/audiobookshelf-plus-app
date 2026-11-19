<template>
  <!-- App updates from the ABS+ server, the way an app store does it: download in the app, then Android's installer -->
  <div v-if="show" class="update-banner fixed left-0 right-0 z-[60] px-3" :style="{ top: 'calc(var(--sat, env(safe-area-inset-top)) + 64px)' }">
    <div class="mx-auto max-w-xl rounded-xl shadow-lg px-4 py-3 bg-primary text-fg" style="border: 1px solid rgba(var(--color-fg), 0.15)">
      <div class="flex items-center gap-3">
        <span class="material-symbols text-2xl text-success">{{ state === 'ready' ? 'install_mobile' : 'system_update' }}</span>
        <div class="flex-grow min-w-0">
          <p class="font-semibold leading-tight">{{ title }}</p>
          <p class="text-xs text-fg-muted leading-snug truncate">{{ subtitle }}</p>
        </div>
        <button v-if="action" class="px-3 py-1.5 rounded-full text-sm font-semibold bg-success text-white flex-shrink-0" :disabled="busy" @click="doAction">{{ action }}</button>
        <button v-if="state !== 'installing'" class="px-2 py-1.5 text-sm text-fg-muted flex-shrink-0" @click="later">Later</button>
      </div>
      <div v-if="state === 'downloading'" class="mt-2 h-1 rounded-full overflow-hidden" style="background: rgba(var(--color-fg), 0.15)">
        <div class="h-full bg-success transition-all" :style="{ width: Math.round(progress * 100) + '%' }" />
      </div>
    </div>
  </div>
</template>

<script>
import { CapacitorHttp } from '@capacitor/core'
import { AbsUpdater } from '@/plugins/capacitor/AbsUpdater'
import { ABS_PLUS_BUILD } from '@/plugins/absPlusBuild'

const mb = (b) => `${Math.round((b || 0) / 1e6)} MB`

export default {
  data() {
    return {
      latest: null,
      // available | downloading | ready | permission | installing
      state: 'available',
      progress: 0,
      busy: false,
      laterThisSession: false,
      prefs: { mode: 'auto', wifiOnly: true }
    }
  },
  computed: {
    serverAddress() {
      return this.$store.getters['user/getServerAddress']
    },
    show() {
      return !!(this.latest && this.latest.build > ABS_PLUS_BUILD && !this.laterThisSession)
    },
    title() {
      return {
        available: 'Update available',
        downloading: `Downloading the update…`,
        ready: `The update is ready to install`,
        permission: 'One more step',
        installing: `Installing the update…`
      }[this.state]
    },
    subtitle() {
      const l = this.latest || {}
      if (this.state === 'downloading') return `${Math.round(this.progress * 100)}% of ${mb(l.size)}`
      if (this.state === 'permission') return 'Allow ABS+ to install updates (Android asks once), then come back'
      if (this.state === 'installing') return 'ABS+ restarts when it is done'
      if (this.state === 'ready') return l.notes || 'Installs in a few seconds; ABS+ restarts'
      return `A new version of ABS+ · ${mb(l.size)}${l.notes ? ` · ${l.notes}` : ''}`
    },
    action() {
      return { available: 'Download', downloading: null, ready: 'Install', permission: 'Allow', installing: null }[this.state]
    }
  },
  watch: {
    serverAddress() {
      this.check(true)
    }
  },
  async mounted() {
    if (this.$platform !== 'android') return
    // Just updated: say so once
    try {
      const was = Number(localStorage.getItem('absPlusLastBuild') || 0)
      if (was && was < ABS_PLUS_BUILD) setTimeout(() => this.$toast.success('ABS+ was updated'), 1500)
      localStorage.setItem('absPlusLastBuild', String(ABS_PLUS_BUILD))
    } catch (e) {}
    AbsUpdater.addListener('onUpdateProgress', (d) => {
      if (!this.latest || d.build !== this.latest.build) return
      this.state = 'downloading'
      this.progress = d.total ? d.done / d.total : 0
    })
    AbsUpdater.addListener('onUpdateResult', (r) => {
      if (r.ok) return
      this.busy = false
      this.state = 'ready'
      if (r.message) this.$toast.error(r.message)
    })
    setTimeout(() => this.check(), 2500)
    this.onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (this.state === 'permission') this.afterPermission()
      else this.check()
    }
    document.addEventListener('visibilitychange', this.onVisible)
    // Settings → App updates → Check for updates now
    this.$eventBus.$on('abs-plus-check-update', this.checkFromSettings)
  },
  beforeDestroy() {
    document.removeEventListener('visibilitychange', this.onVisible)
    this.$eventBus.$off('abs-plus-check-update', this.checkFromSettings)
  },
  methods: {
    async checkFromSettings(done) {
      this.laterThisSession = false
      await this.check(true)
      if (done) done(this.latest && this.latest.build > ABS_PLUS_BUILD ? this.latest.build : null)
    },
    async check(force) {
      const base = (this.serverAddress || '').replace(/\/+$/, '')
      if (!base || this.$platform !== 'android') return
      if (!force && this.lastCheck && Date.now() - this.lastCheck < 10 * 60 * 1000) return
      this.lastCheck = Date.now()
      try {
        this.prefs = await AbsUpdater.getPrefs()
        const r = await CapacitorHttp.get({ url: `${base}/abs-plus/app/latest.json`, connectTimeout: 8000, readTimeout: 8000 })
        const j = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
        if (r.status !== 200 || !j || typeof j.build !== 'number') return
        j.url = `${base}/abs-plus/app/ABS+.apk` // the address this phone already reaches the server at
        const changed = !this.latest || this.latest.build !== j.build
        this.latest = j
        if (j.build <= ABS_PLUS_BUILD || !changed && this.state !== 'available') return
        const st = await AbsUpdater.status({ build: j.build, sha256: j.sha256 || '' })
        if (st.ready) this.state = 'ready'
        else if (st.downloading) this.state = 'downloading'
        else {
          this.state = 'available'
          // Like the Play Store: download by itself (unless updates are off, or not on Wi-Fi when that's asked)
          if (this.prefs.mode !== 'off') {
            const net = await AbsUpdater.network()
            if (net.unmetered || !this.prefs.wifiOnly) this.download()
          }
        }
      } catch (e) {
        console.log('[ABS+] update check failed', e && e.message)
      }
    },
    async download() {
      const l = this.latest
      this.state = 'downloading'
      this.progress = 0
      try {
        await AbsUpdater.download({ url: l.url, build: l.build, sha256: l.sha256 || '' })
        this.state = 'ready'
      } catch (e) {
        this.state = 'available'
        if (!/Already downloading/.test(e.message || '')) this.$toast.error(`Update download: ${e.message}`)
      }
    },
    async install() {
      const { allowed } = await AbsUpdater.canInstall()
      if (!allowed) {
        this.state = 'permission'
        return
      }
      this.busy = true
      this.state = 'installing'
      try {
        await AbsUpdater.install({ build: this.latest.build })
        // Android takes over: its "Update?" screen (or none), then ABS+ restarts
        setTimeout(() => {
          if (this.state === 'installing') {
            this.busy = false
            this.state = 'ready'
          }
        }, 20000)
      } catch (e) {
        this.busy = false
        this.state = 'ready'
        this.$toast.error(e.message || 'The update did not start')
      }
    },
    async afterPermission() {
      const { allowed } = await AbsUpdater.canInstall()
      if (allowed) this.install()
    },
    doAction() {
      if (this.state === 'available') return this.download()
      if (this.state === 'ready') return this.install()
      if (this.state === 'permission') return AbsUpdater.openInstallSettings()
    },
    later() {
      this.laterThisSession = true
    }
  }
}
</script>

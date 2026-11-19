<template>
  <!-- One admin page (from Admin settings): its own back bar, then the server's page signed in with this app's
       account. The web page's own top bar and side menu are hidden inside the app (ABS+ web script) -->
  <div class="w-full h-full flex flex-col bg-bg">
    <div class="flex items-center h-12 px-2 border-b border-border flex-shrink-0">
      <button class="flex items-center h-10 pr-3 rounded-md" aria-label="Back to Admin settings" @click="back">
        <span class="material-symbols text-2xl">chevron_left</span>
        <span class="text-sm text-fg-muted">Admin settings</span>
      </button>
      <p class="flex-grow text-right pr-2 font-semibold truncate">{{ title }}</p>
    </div>
    <div class="relative flex-grow">
      <iframe v-if="src" ref="frame" :src="src" class="absolute inset-0 w-full h-full border-0" :title="title" @load="onLoad" />
      <div v-if="!loaded || error" class="absolute inset-0 flex flex-col items-center justify-center px-8 text-center pointer-events-none bg-bg">
        <template v-if="error">
          <span class="material-symbols text-4xl text-fg-muted mb-2">cloud_off</span>
          <p class="text-fg-muted">{{ error }}</p>
        </template>
        <template v-else>
          <div class="w-8 h-8 border-2 border-fg-muted border-t-transparent rounded-full animate-spin mb-3" />
          <p class="text-fg-muted text-sm">Opening {{ title }}…</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { src: null, loaded: false, error: null, origin: null, token: null }
  },
  computed: {
    path() {
      const p = this.$route.query.path
      return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/config'
    },
    title() {
      return (typeof this.$route.query.title === 'string' && this.$route.query.title) || 'Admin settings'
    }
  },
  watch: {
    path() {
      this.open()
    }
  },
  methods: {
    back() {
      this.$router.replace('/admin')
    },
    async open() {
      this.error = null
      this.loaded = false
      if (!this.$store.getters['user/getIsAdminOrUp']) {
        this.error = 'Admin settings are for server admins.'
        return
      }
      const addr = (this.$store.getters['user/getServerAddress'] || '').replace(/\/+$/, '')
      if (!addr) {
        this.error = 'Not connected to a server.'
        return
      }
      // a signed-in request first, so an expired sign-in is renewed before it's handed to the page
      try {
        await this.$nativeHttp.get('/api/me')
      } catch (e) {}
      this.token = this.$store.getters['user/getToken']
      try {
        this.origin = new URL(addr).origin
      } catch (e) {
        this.error = 'The server address looks wrong.'
        return
      }
      // the login page signs in with the token the page asks for, then goes on to the page
      this.src = `${addr}/login?redirect=${encodeURIComponent(this.path)}`
    },
    onLoad() {
      this.loaded = true
    },
    /** The framed page (ABS+ web script) asks for the sign-in: only the server's own page gets it */
    onMessage(e) {
      const frame = this.$refs.frame
      if (!frame || e.source !== frame.contentWindow || e.origin !== this.origin) return
      if (!e.data || e.data.type !== 'absplus-embed-ready' || !this.token) return
      frame.contentWindow.postMessage({ type: 'absplus-signin', token: this.token, path: this.path }, this.origin)
    }
  },
  mounted() {
    window.addEventListener('message', this.onMessage)
    this.open()
  },
  beforeDestroy() {
    window.removeEventListener('message', this.onMessage)
  }
}
</script>

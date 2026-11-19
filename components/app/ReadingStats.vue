<template>
  <!-- ABS+: a row of reading stats at the top of Home. Tap for the full Stats page. -->
  <div v-if="user" class="w-full px-3 pt-3 pb-1">
    <div class="rs-row flex rounded-lg border border-border" :class="{ 'rs-eink': isEink }" role="button" :aria-label="ariaLabel" @click="$router.push('/stats')">
      <div v-for="t in tiles" :key="t.key" class="rs-tile flex-1 min-w-0 text-center py-2 px-1">
        <p class="rs-num font-bold leading-tight truncate">
          {{ t.value }}<span v-if="t.unit" class="rs-unit font-normal text-fg-muted">{{ t.unit }}</span>
        </p>
        <p class="rs-label text-fg-muted leading-tight truncate">{{ t.label }}</p>
      </div>
    </div>
  </div>
</template>

<script>
// Books finished this year come from your progress (isFinished + finishedAt); time comes from
// Audiobookshelf's listening stats (/api/me/listening-stats: seconds per day, keyed YYYY-MM-DD).
// The last numbers are kept per user, so the row shows straight away and also when offline.
const CACHE = 'absplus-reading-stats:'
const REFRESH_MS = 60 * 1000

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default {
  data() {
    return {
      days: null, // { 'YYYY-MM-DD': seconds }
      lastFetch: 0
    }
  },
  computed: {
    user() {
      return this.$store.state.user.user
    },
    userId() {
      return this.user ? this.user.id : null
    },
    networkConnected() {
      return this.$store.state.networkConnected
    },
    isEink() {
      return this.$store.getters['device/isEink']
    },
    booksThisYear() {
      const progress = (this.user && this.user.mediaProgress) || []
      const start = new Date(new Date().getFullYear(), 0, 1).getTime()
      return progress.filter((p) => p.isFinished && !p.episodeId && (p.finishedAt || 0) >= start).length
    },
    secondsThisWeek() {
      if (!this.days) return null
      const now = new Date()
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
      let total = 0
      for (let d = new Date(monday); d <= now; d.setDate(d.getDate() + 1)) total += this.days[dayKey(d)] || 0
      return total
    },
    secondsToday() {
      return this.days ? this.days[dayKey(new Date())] || 0 : null
    },
    streak() {
      // Days in a row with some listening. Today not listened yet doesn't break it until the day is over.
      if (!this.days) return null
      const listened = (d) => (this.days[dayKey(d)] || 0) >= 60
      const d = new Date()
      if (!listened(d)) d.setDate(d.getDate() - 1)
      let n = 0
      while (listened(d) && n < 3660) {
        n++
        d.setDate(d.getDate() - 1)
      }
      return n
    },
    tiles() {
      const dash = '–'
      const hrs = (s) => (s == null ? dash : s < 36000 ? (Math.round(s / 360) / 10).toString() : Math.round(s / 3600).toString())
      const mins = (s) => (s == null ? dash : s < 3600 ? Math.round(s / 60).toString() : hrs(s))
      return [
        { key: 'books', value: this.$formatNumber ? this.$formatNumber(this.booksThisYear) : this.booksThisYear, label: `Books in ${new Date().getFullYear()}` },
        { key: 'week', value: hrs(this.secondsThisWeek), unit: this.secondsThisWeek == null ? '' : 'h', label: 'This week' },
        { key: 'streak', value: this.streak == null ? dash : this.streak, unit: this.streak == null ? '' : this.streak === 1 ? ' day' : ' days', label: 'Streak' },
        { key: 'today', value: mins(this.secondsToday), unit: this.secondsToday == null ? '' : this.secondsToday < 3600 ? 'm' : 'h', label: 'Today' }
      ]
    },
    ariaLabel() {
      return this.tiles.map((t) => `${t.label}: ${t.value}${t.unit || ''}`).join(', ') + '. Open stats'
    }
  },
  watch: {
    userId() {
      this.loadCache()
      this.refresh(true)
    },
    networkConnected(v) {
      if (v) this.refresh(true)
    }
  },
  methods: {
    loadCache() {
      this.days = null
      if (!this.userId) return
      try {
        const c = JSON.parse(localStorage.getItem(CACHE + this.userId) || 'null')
        if (c && c.days) this.days = Object.freeze(c.days)
      } catch (e) {}
    },
    async refresh(force) {
      if (!this.userId || !this.networkConnected) return
      if (!force && Date.now() - this.lastFetch < REFRESH_MS) return
      this.lastFetch = Date.now()
      const uid = this.userId
      const stats = await this.$nativeHttp.get('/api/me/listening-stats').catch(() => null)
      if (!stats || !stats.days || uid !== this.userId) return
      this.days = Object.freeze({ ...stats.days })
      try {
        localStorage.setItem(CACHE + uid, JSON.stringify({ days: stats.days, at: Date.now() }))
      } catch (e) {}
    },
    onFocus(visible) {
      if (visible !== false) this.refresh(false)
    },
    onVisible() {
      if (document.visibilityState === 'visible') this.refresh(false)
    }
  },
  mounted() {
    this.loadCache()
    this.refresh(true)
    document.addEventListener('visibilitychange', this.onVisible)
    this.$eventBus.$on('device-focus-update', this.onFocus)
    this.$eventBus.$on('close-stream', this.onFocus)
  },
  beforeDestroy() {
    document.removeEventListener('visibilitychange', this.onVisible)
    this.$eventBus.$off('device-focus-update', this.onFocus)
    this.$eventBus.$off('close-stream', this.onFocus)
  }
}
</script>

<style scoped>
.rs-row {
  background: rgb(var(--color-fg) / 0.04);
}
.rs-tile + .rs-tile {
  border-left: 1px solid rgb(var(--color-border));
}
.rs-num {
  font-size: 1.25rem;
}
.rs-unit {
  font-size: 0.8rem;
}
.rs-label {
  font-size: 0.68rem;
  margin-top: 1px;
}
/* e-ink: no tint (greys ghost), solid black lines */
.rs-eink {
  background: transparent;
  border-color: #000;
}
.rs-eink .rs-tile + .rs-tile {
  border-left-color: #000;
}
@media (min-width: 768px) {
  .rs-num {
    font-size: 1.5rem;
  }
  .rs-label {
    font-size: 0.78rem;
  }
}
</style>

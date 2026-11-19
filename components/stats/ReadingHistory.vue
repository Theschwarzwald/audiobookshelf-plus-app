<template>
  <!-- ABS+ reading history (on the Stats page): books listened to and finished by day, week, month or year, back
       to the first session, a few facts about your listening, and books to pick up again. The same design as the web
       player's Your Stats page. Works offline from the copy kept on the device. -->
  <div class="rh w-full max-w-3xl mx-auto px-4 pb-8">
    <div class="flex items-center mt-6 mb-3">
      <span class="material-symbols rh-accent text-2xl mr-2">insights</span>
      <h1 class="text-xl font-bold flex-grow">Reading history</h1>
      <span v-if="loading" class="text-xs text-fg-muted">{{ loadingText }}</span>
      <span v-else-if="offlineNote" class="text-xs text-fg-muted">{{ offlineNote }}</span>
    </div>

    <p v-if="error && !history" class="text-sm text-error">{{ error }}</p>
    <p v-else-if="!history && !loading" class="text-sm text-fg-muted">No listening history yet.</p>

    <template v-if="history">
      <!-- Day / Week / Month / Year -->
      <div class="rh-tabs flex rounded-full p-1 mb-3">
        <button v-for="p in periods" :key="p.id" class="flex-1 py-1.5 rounded-full text-sm font-semibold" :class="kind === p.id ? 'rh-tab-on' : 'opacity-75'" @click="setKind(p.id)">{{ p.label }}</button>
      </div>

      <!-- the period: time listened, the change, and when -->
      <div class="rh-hero rounded-2xl px-4 pt-3 pb-2">
        <div class="flex items-center justify-between">
          <button class="rh-round w-9 h-9 rounded-full flex items-center justify-center" :disabled="!s.canPrev" aria-label="Earlier" @click="step(-1)"><span class="material-symbols text-2xl">chevron_left</span></button>
          <div class="text-center">
            <p class="font-bold text-sm">{{ s.label }}</p>
            <button v-if="!isCurrent" class="rh-accent text-xs font-semibold" @click="anchor = Date.now()">Back to now</button>
          </div>
          <button class="rh-round w-9 h-9 rounded-full flex items-center justify-center" :disabled="!s.canNext" aria-label="Later" @click="step(1)"><span class="material-symbols text-2xl">chevron_right</span></button>
        </div>
        <p class="text-center mt-2 leading-none">
          <span class="rh-num">{{ big.value }}</span><span class="rh-unit">{{ big.unit }}</span><span v-if="big.rest" class="rh-rest">{{ big.rest }}</span>
        </p>
        <p class="text-center text-xs text-fg-muted mt-1 mb-3">
          listened<span v-if="change" class="rh-chg ml-1" :class="s.change > 0 ? 'rh-up' : s.change < 0 ? 'rh-down' : ''">{{ change }} {{ s.prevName }}</span>
        </p>
        <div class="rh-bars flex items-end">
          <div v-for="(b, i) in s.bars" :key="i" class="flex-1 h-full flex items-end" :title="`${b.title}: ${fmt(b.sec)}`">
            <div class="rh-bar w-full" :class="{ 'rh-now': i === s.nowBar, 'rh-peak': i === s.peak }" :style="{ height: barHeight(b.sec) }" />
          </div>
        </div>
        <div class="flex mt-1 rh-gap">
          <span v-for="(b, i) in s.bars" :key="i" class="flex-1 text-center text-[10px] whitespace-nowrap" :class="i === s.nowBar ? 'rh-accent font-bold' : 'text-fg-muted'">{{ b.label }}</span>
        </div>
      </div>

      <!-- counts -->
      <div class="grid grid-cols-4 gap-2 mt-3">
        <div v-for="t in tiles" :key="t.label" class="rh-card rounded-xl py-2 px-1 flex flex-col items-center min-w-0">
          <span class="material-symbols rh-accent text-xl">{{ t.icon }}</span>
          <p class="text-lg font-bold leading-tight">{{ t.value }}</p>
          <p class="text-[10px] text-fg-muted leading-tight text-center">{{ t.label }}</p>
        </div>
      </div>

      <!-- facts -->
      <div v-if="facts.length" class="grid grid-cols-2 gap-2 mt-2">
        <div v-for="f in facts" :key="f.label" class="rh-card rounded-xl py-2 px-3 flex items-center min-w-0">
          <span class="material-symbols text-xl text-fg-muted mr-2">{{ f.icon }}</span>
          <div class="min-w-0">
            <p class="text-[10px] text-fg-muted leading-tight">{{ f.label }}</p>
            <p class="text-sm font-semibold truncate">{{ f.value }}</p>
          </div>
        </div>
      </div>

      <!-- the books -->
      <h2 class="text-base font-bold mt-6 mb-1">Books {{ kind === 'day' ? 'today' : `this ${kind}` }}</h2>
      <p v-if="!s.books.length" class="text-sm text-fg-muted py-3 flex items-center"><span class="material-symbols mr-2">headphones</span>No listening {{ kind === 'day' ? 'this day' : `this ${kind}` }}.</p>
      <div v-for="(b, i) in s.books" :key="b.id" class="flex items-center py-2 cursor-pointer" @click="openBook(b.id)">
        <span class="w-5 text-sm font-bold text-fg-muted flex-shrink-0">{{ i + 1 }}</span>
        <img :src="cover(b.id)" alt="" class="rh-cover w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" @error="(e) => (e.target.style.visibility = 'hidden')" />
        <div class="flex-grow min-w-0 px-3">
          <p class="text-sm font-semibold truncate">{{ b.title }}</p>
          <p class="text-xs text-fg-muted truncate">{{ b.author }}{{ b.author ? ' · ' : '' }}{{ when(b) }}</p>
          <div class="rh-share mt-1"><div :style="{ width: Math.max(2, Math.round(b.share * 100)) + '%' }" /></div>
        </div>
        <div class="flex flex-col items-end flex-shrink-0">
          <span v-if="b.sec" class="rh-pill text-xs font-bold">{{ fmt(b.sec) }}</span>
          <span v-if="b.finishedAt" class="rh-done text-[11px] font-bold mt-1">Finished {{ fmtDate(b.finishedAt) }}</span>
        </div>
      </div>

      <!-- started and not finished -->
      <template v-if="pickUp.length">
        <h2 class="text-base font-bold mt-6">Books you should pick up again</h2>
        <p class="text-xs text-fg-muted mb-2">Started and not finished. Tap one to carry on where you left off.</p>
        <div class="flex overflow-x-auto pb-2 -mx-1">
          <div v-for="b in pickUp" :key="'p' + b.id" class="flex-shrink-0 w-28 mx-1 cursor-pointer" @click="openBook(b.id)">
            <div class="rh-cover relative w-28 h-28 rounded-xl overflow-hidden">
              <img :src="cover(b.id)" alt="" class="w-full h-full object-cover" loading="lazy" @error="(e) => (e.target.style.visibility = 'hidden')" />
              <div class="rh-cprog absolute left-0 right-0 bottom-0"><div :style="{ width: Math.round(b.progress * 100) + '%' }" /></div>
            </div>
            <p class="text-xs font-semibold truncate mt-1">{{ b.title }}</p>
            <p class="text-[11px] text-fg-muted truncate">{{ Math.round(b.progress * 100) }}% · {{ ago(b.last) }}</p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script>
import { loadHistory, summarize, stepPeriod, periodOf, pickUpAgain, streaks, fmtDuration, fmtWhen, fmtDate, fmtAgo, fmtChange, splitDuration, PERIODS } from '@/plugins/absplus-shared/readingHistory'

const CACHE = 'absplus-reading-history:'

export default {
  data() {
    return {
      history: null,
      kind: 'week',
      anchor: Date.now(),
      loading: false,
      loaded: 0,
      total: 0,
      error: null,
      fromCache: false
    }
  },
  computed: {
    userId() {
      const u = this.$store.state.user.user
      return u ? u.id : null
    },
    periods() {
      return PERIODS
    },
    s() {
      return summarize(this.history, this.kind, this.anchor)
    },
    big() {
      return splitDuration(this.s.totals.sec)
    },
    change() {
      return fmtChange(this.s.change)
    },
    streak() {
      return streaks(this.history)
    },
    isCurrent() {
      return periodOf(this.kind, this.anchor).start === periodOf(this.kind, Date.now()).start
    },
    tiles() {
      const t = this.s.totals
      return [
        { icon: 'menu_book', label: t.books === 1 ? 'book' : 'books', value: t.books },
        { icon: 'task_alt', label: 'finished', value: t.finished },
        { icon: 'calendar_today', label: t.days === 1 ? 'day' : 'days', value: t.days },
        { icon: 'local_fire_department', label: 'day streak', value: this.streak.current }
      ]
    },
    facts() {
      const s = this.s
      return [
        s.totals.days ? { icon: 'avg_time', label: 'Average', value: `${fmtDuration(s.avgPerDay)} a day` } : null,
        s.favTime ? { icon: 'schedule', label: 'Usually', value: s.favTime.toLowerCase() } : null,
        s.topAuthor ? { icon: 'person', label: 'Top author', value: s.topAuthor } : null,
        s.longest ? { icon: 'timer', label: 'Longest session', value: fmtDuration(s.longest) } : null,
        this.streak.longest > this.streak.current ? { icon: 'military_tech', label: 'Best streak', value: `${this.streak.longest} days` } : null
      ].filter(Boolean)
    },
    pickUp() {
      return pickUpAgain(this.history)
    },
    loadingText() {
      return this.total ? `Loading history… ${this.loaded} of ${this.total}` : 'Loading history…'
    },
    offlineNote() {
      if (!this.fromCache || !this.history) return ''
      return `Offline · as of ${fmtDate(this.history.at)}`
    }
  },
  methods: {
    fmt: fmtDuration,
    fmtDate,
    ago: fmtAgo,
    when(b) {
      return fmtWhen(this.kind, b.first, b.last)
    },
    barHeight(sec) {
      if (!sec) return '3px'
      return Math.max(5, Math.round((sec / this.s.maxBar) * 100)) + '%'
    },
    setKind(k) {
      this.kind = k
      try {
        localStorage.setItem('absplus-reading-history-kind', k)
      } catch (e) {}
    },
    step(n) {
      this.anchor = stepPeriod(this.kind, this.anchor, n)
    },
    cover(id) {
      const g = this.$store.getters['globals/getLibraryItemCoverSrcById']
      return g ? g(id) : ''
    },
    openBook(id) {
      this.$router.push(`/item/${id}`)
    },
    readCache() {
      if (!this.userId) return
      try {
        const c = JSON.parse(localStorage.getItem(CACHE + this.userId) || 'null')
        if (c && c.sessions) {
          this.history = Object.freeze(c)
          this.fromCache = true
        }
      } catch (e) {}
    },
    async refresh() {
      if (!this.userId || !this.$store.state.networkConnected) return
      this.loading = true
      this.error = null
      try {
        const h = await loadHistory(
          (path) => this.$nativeHttp.get(path),
          (n, total) => {
            this.loaded = n
            this.total = total
          }
        )
        this.history = Object.freeze(h)
        this.fromCache = false
        try {
          localStorage.setItem(CACHE + this.userId, JSON.stringify(h))
        } catch (e) {}
      } catch (e) {
        this.error = this.history ? null : 'Your listening history could not be loaded.'
      }
      this.loading = false
    }
  },
  mounted() {
    try {
      const k = localStorage.getItem('absplus-reading-history-kind')
      if (PERIODS.some((p) => p.id === k)) this.kind = k
    } catch (e) {}
    this.readCache()
    this.refresh()
  }
}
</script>

<style scoped>
.rh {
  --rh-accent: #e49b4f;
  --rh-card: rgb(var(--color-fg) / 0.05);
  --rh-line: rgb(var(--color-fg) / 0.1);
}
.rh-accent {
  color: var(--rh-accent);
}
.rh-tabs {
  background: var(--rh-card);
  border: 1px solid var(--rh-line);
}
.rh-tab-on {
  background: var(--rh-accent);
  color: #1b1206;
}
.rh-hero {
  background: linear-gradient(160deg, rgba(228, 155, 79, 0.16), rgba(228, 155, 79, 0.03) 60%);
  border: 1px solid rgba(228, 155, 79, 0.25);
}
html[data-theme^='eink'] .rh-hero {
  background: transparent;
  border: 2px solid rgb(var(--color-fg));
}
.rh-round {
  background: var(--rh-card);
}
.rh-round:disabled {
  opacity: 0.2;
}
.rh-num {
  font-size: 2.8rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.rh-unit {
  font-size: 1.3rem;
  font-weight: 700;
  margin-left: 2px;
  opacity: 0.85;
}
.rh-rest {
  font-size: 1rem;
  font-weight: 600;
  margin-left: 6px;
  opacity: 0.7;
}
.rh-chg {
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 9999px;
  background: var(--rh-card);
}
.rh-up {
  color: #1ad691;
}
.rh-down {
  color: #ff8a65;
}
.rh-bars {
  height: 100px;
  gap: 3px;
  border-bottom: 1px solid var(--rh-line);
}
.rh-gap {
  gap: 3px;
}
.rh-bar {
  background: rgba(228, 155, 79, 0.45);
  border-radius: 5px 5px 2px 2px;
}
.rh-bar.rh-peak {
  background: rgba(228, 155, 79, 0.8);
}
.rh-bar.rh-now {
  background: var(--rh-accent);
}
.rh-card {
  background: var(--rh-card);
  border: 1px solid var(--rh-line);
}
.rh-cover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.rh-share {
  height: 4px;
  border-radius: 9999px;
  background: var(--rh-line);
  overflow: hidden;
}
.rh-share > div,
.rh-cprog > div {
  height: 100%;
  background: var(--rh-accent);
  border-radius: 9999px;
}
.rh-cprog {
  height: 5px;
  background: rgba(0, 0, 0, 0.45);
}
.rh-pill {
  padding: 3px 10px;
  border-radius: 9999px;
  background: var(--rh-card);
  border: 1px solid var(--rh-line);
}
.rh-done {
  color: #1ad691;
}
</style>

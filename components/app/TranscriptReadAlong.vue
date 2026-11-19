<template>
  <!--
    Read along inside the Transcription panel, built on the Readium navigator (static/reader/readium).
    Kept loaded while Lyrics or Karaoke shows (hidden at its last size, not removed), so it keeps following
    the narration and switching to it is instant.
  -->
  <div ref="box" class="tra flex flex-col absolute inset-0" :style="boxStyle">
    <div class="relative flex-grow min-h-0">
      <iframe ref="frame" src="/reader/readium/index.html" class="absolute inset-0 w-full h-full border-0 block" title="Read along" @load="frameLoaded" />
      <div v-if="message" class="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" :style="{ backgroundColor: theme.bg, color: theme.fg }">
        <widgets-spinner-icon v-if="busy" class="h-8 w-8 mb-3" />
        <p class="text-sm opacity-80">{{ message }}</p>
      </div>
      <!-- the narration has left the book (improvised / not in this edition): read along picks up again where they match -->
      <div v-if="offBook && !reading && !message" class="absolute left-1/2 -translate-x-1/2 transform top-2 z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center shadow" :style="{ backgroundColor: theme.panel, color: theme.fg, borderColor: theme.border, borderWidth: '1px' }">
        <span class="material-symbols text-sm mr-1">record_voice_over</span>Narration differs from the book here · picks up again
      </div>

      <!-- Reading mode: the full reader's own bars (same as every other book) -->
      <readers-reader-bars
        v-if="reading && total && p"
        :p="p"
        :visible="barsShown"
        :fade="true"
        kind="ebook"
        :title="title"
        :bookmarked="bookmarked"
        :searchable="true"
        :fullscreen="false"
        :fraction="fraction"
        :location="`${page} of ${total}`"
        :mode="flow === 'scrolled' ? 'doc' : 'book'"
        :bottom-offset="0"
        @sidebar="openSidebar('contents')"
        @search="openSearch"
        @goPageNumber="(n) => api && api.goToPage(Math.max(1, Math.min(total, n)))"
        @bookmark="toggleBookmark"
        @fontSmaller="setFont(-10)"
        @fontLarger="setFont(10)"
        @fullscreen="showSettings = true"
        @settings="showSettings = true"
        @close="playHere"
        @step="(d) => api && (d > 0 ? api.next() : api.prev())"
        @goFraction="goFraction"
        @mode="(m) => setFlow(m === 'doc' ? 'scrolled' : 'paginated')"
      />
    </div>

    <!-- Reading mode: the audiobook button — listen from this page -->
    <button v-if="reading && total && hasAudio" class="tra-listen absolute right-3 z-40 rounded-full shadow-lg flex items-center justify-center" :style="{ bottom: '108px', backgroundColor: p ? p.accent : '#1AD691', color: p ? p.onAccent : '#06251A' }" aria-label="Listen to the audiobook from this page" title="Listen from this page" @click.stop="playHere">
      <span class="material-symbols fill text-[26px]">headphones</span>
    </button>

    <!-- Search the book: a search bar at the top, results with their page -->
    <div v-if="showSearch && p" class="absolute inset-0 z-50 flex flex-col" :style="{ backgroundColor: p.panel, color: p.fg, paddingTop: 'max(var(--sat, env(safe-area-inset-top)), 28px)' }" @click.stop>
      <div class="flex items-center px-2 h-14 border-b flex-shrink-0" :style="{ borderColor: p.border }">
        <span class="material-symbols text-xl mx-1" :style="{ color: p.muted }">search</span>
        <input ref="searchInput" v-model="searchQuery" type="search" enterkeyhint="search" placeholder="Search in book" class="flex-grow rounded-md px-3 h-9 outline-none text-sm" :style="{ backgroundColor: p.field, color: p.fg, border: `1px solid ${p.border}` }" @keyup.enter="runSearch" />
        <button class="material-symbols text-2xl ml-2" :style="{ color: p.muted }" aria-label="Close search" @click.stop="showSearch = false">close</button>
      </div>
      <div class="flex-grow overflow-y-auto px-4 pb-10">
        <p v-if="searching" class="text-xs my-2" :style="{ color: p.muted }">Searching…</p>
        <p v-else-if="searchDone" class="text-xs my-2" :style="{ color: p.muted }">{{ searchResults.length }}{{ searchResults.length >= 300 ? '+' : '' }} result{{ searchResults.length === 1 ? '' : 's' }}</p>
        <div v-for="(r, i) in searchResults" :key="i" class="py-2 border-b text-sm cursor-pointer" :style="{ borderColor: p.border }" @click.stop="goToResult(r)">
          <p class="text-xs mb-0.5" :style="{ color: p.faint }">{{ r.chapter ? r.chapter + ' · ' : '' }}page {{ r.page }}</p>
          <p class="leading-snug">…{{ r.pre }}<mark class="rounded px-0.5" :style="{ backgroundColor: p.accent, color: p.onAccent }">{{ r.match }}</mark>{{ r.post }}…</p>
        </div>
      </div>
    </div>

    <!-- Contents / Pages / Bookmarks: the full reader's panel -->
    <div v-if="showSidebar && p" class="absolute inset-0 z-50 flex flex-col" :style="{ backgroundColor: p.panel, color: p.fg, paddingTop: 'max(var(--sat, env(safe-area-inset-top)), 28px)' }" @click.stop>
      <div class="flex items-center px-2 h-12 border-b flex-shrink-0" :style="{ borderColor: p.border }">
        <button v-for="t in sidebarTabs" :key="t.id" class="px-3 h-full text-sm" :style="{ color: sidebarTab === t.id ? p.accent : p.muted, fontWeight: sidebarTab === t.id ? 600 : 400, borderBottom: sidebarTab === t.id ? `2px solid ${p.accent}` : '2px solid transparent' }" @click.stop="sidebarTab = t.id">{{ t.label }}</button>
        <div class="flex-grow" />
        <button class="material-symbols text-2xl ml-2" :style="{ color: p.muted }" aria-label="Close panel" @click.stop="showSidebar = false">close</button>
      </div>
      <div class="flex-grow overflow-y-auto px-4 pb-10">
        <template v-if="sidebarTab === 'contents'">
          <p v-if="!flatToc.length" class="text-center mt-10" :style="{ color: p.muted }">This book has no table of contents.</p>
          <button v-for="(t, i) in flatToc" :key="i" class="flex items-baseline w-full text-left py-2.5 border-b text-sm" :class="{ 'tra-current': i === currentTocIndex }" :style="{ borderColor: p.border, paddingLeft: `${t.depth * 16}px`, color: i === currentTocIndex ? p.accent : p.fg, fontWeight: i === currentTocIndex ? 600 : 400 }" @click.stop="goToToc(t)">
            <span class="flex-grow min-w-0">{{ t.title }}</span>
            <span v-if="t.page" class="ml-3 text-xs flex-shrink-0" :style="{ color: p.faint }">{{ t.page }}</span>
          </button>
        </template>
        <template v-else-if="sidebarTab === 'pages'">
          <template v-for="(g, gi) in pageGroups">
            <p :key="'h' + gi" class="text-xs font-semibold mt-3 mb-1.5 truncate" :style="{ color: p.muted }">{{ g.title }}</p>
            <div :key="'g' + gi" class="grid grid-cols-5 gap-1.5">
              <button v-for="n in g.pages" :key="n" class="tra-page" :class="{ 'tra-current': n === page }" :style="n === page ? { backgroundColor: p.accent, color: p.onAccent, borderColor: p.accent } : { borderColor: p.border }" @click.stop="pickPage(n)">{{ n }}</button>
            </div>
          </template>
        </template>
        <template v-else>
          <div v-for="b in bookmarks" :key="b.page" class="py-3 border-b flex items-start cursor-pointer" :style="{ borderColor: p.border }" @click.stop="pickPage(b.page)">
            <span class="material-symbols fill mr-2 text-xl" :style="{ color: p.accent }">bookmark</span>
            <div class="flex-grow min-w-0">
              <p class="text-xs mb-0.5" :style="{ color: p.faint }">{{ b.chapter || '' }}{{ b.chapter ? ' · ' : '' }}page {{ b.page }}</p>
            </div>
            <button class="material-symbols text-xl ml-2" :style="{ color: p.muted }" aria-label="Remove bookmark" @click.stop="removeBookmark(b.page)">delete</button>
          </div>
          <p v-if="!bookmarks.length" class="text-center mt-10 px-6" :style="{ color: p.muted }">No bookmarks yet. Tap the bookmark icon at the top to mark a page.</p>
        </template>
      </div>
    </div>

    <!-- Reader settings: text size and Book / Doc view -->
    <div v-if="showSettings && p" class="absolute inset-0 z-50 flex items-end" style="background: rgba(0, 0, 0, 0.35)" @click.stop="showSettings = false">
      <div class="w-full rounded-t-2xl px-4 pt-3 pb-6" :style="{ backgroundColor: p.panel, color: p.fg, borderTop: `1px solid ${p.border}` }" @click.stop>
        <div class="flex items-center mb-3">
          <p class="font-semibold flex-grow">Reader settings</p>
          <button class="material-symbols text-2xl" :style="{ color: p.muted }" aria-label="Close" @click.stop="showSettings = false">close</button>
        </div>
        <p class="text-xs mb-1" :style="{ color: p.muted }">Text size · {{ fontScale }}%</p>
        <div class="flex items-center mb-4">
          <button class="font-serif text-sm px-3 py-1" @click.stop="setFont(-10)">A</button>
          <input type="range" min="70" max="200" step="10" :value="fontScale" class="flex-grow mx-2" :style="{ accentColor: p.accent }" @change="setFont(Number($event.target.value) - fontScale)" />
          <button class="font-serif text-2xl px-3" @click.stop="setFont(10)">A</button>
        </div>
        <p class="text-xs mb-1" :style="{ color: p.muted }">View</p>
        <div class="flex rounded-lg overflow-hidden border" :style="{ borderColor: p.border }">
          <button v-for="m in viewModes" :key="m.id" class="flex-1 py-2 text-sm font-semibold flex items-center justify-center" :style="{ backgroundColor: flow === m.flow ? p.accent : 'transparent', color: flow === m.flow ? p.onAccent : p.fg }" @click.stop="setFlow(m.flow)">
            <span class="material-symbols text-base mr-1.5">{{ m.icon }}</span>{{ m.short }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { Dialog } from '@capacitor/dialog'
import { Transcriber } from '@/plugins/transcriber'
import { installTurnHost } from '@/plugins/capacitor/AbsPageTurn'

const CACHE = 'abs-ebooks-v1' // the full reader's cache: a book opened there is ready here
const LEAD = 0.12 // words a touch early, like Karaoke

export default {
  props: {
    /** shown (false: kept following in the background) */
    active: Boolean,
    /** reading mode: the audiobook put aside, page controls and the dictionary on */
    reading: Boolean,
    /** the library item (local or server) with the EPUB */
    item: Object,
    /** transcript key (the panel's itemKey) */
    itemKey: String,
    title: String,
    isPlaying: Boolean,
    /** number of transcript lines: reload the transcript as transcription goes on */
    lineCount: { type: Number, default: 0 },
    /** { bg, fg, panel, border, highlight } */
    theme: { type: Object, required: true },
    /** the e-reader palette (the full reader's colours), for its bars and panels */
    p: Object,
    eink: Boolean
  },
  data() {
    return {
      offBook: false,
      api: null,
      loadedFor: null,
      busy: true,
      message: 'Opening the book…',
      page: 0,
      total: 0,
      chapter: '',
      toc: [],
      follow: true,
      aligned: false,
      showGoTo: false,
      showSettings: false,
      // reading mode: the bars fade after a few quiet seconds; a tap in the middle brings them back
      barsShown: true,
      showSearch: false,
      searchQuery: '',
      searchResults: [],
      searching: false,
      searchDone: false,
      showSidebar: false,
      fontScale: Number(localStorage.getItem('absplusReadAlongFont')) || 100,
      bookmarks: [],
      sidebarTab: 'contents',
      sliding: null,
      // Book view: pages you turn; Doc view: one long scrolling page
      flow: localStorage.getItem('absplusReadAlongFlow') === 'scrolled' ? 'scrolled' : 'paginated',
      goPage: 1,
      size: { w: 0, h: 0 }
    }
  },
  computed: {
    boxStyle() {
      if (this.active) return { backgroundColor: this.theme.bg }
      // hidden in place, at the same size as when showing (it shares its spot with Lyrics and Karaoke), so pages
      // keep their layout, turning goes on in the background, and switching back is instant with no jump
      return { backgroundColor: this.theme.bg, visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }
    },
    viewModes() {
      return [
        { id: 'book', icon: 'auto_stories', label: 'Book view: pages you turn', short: 'Book Viewer', flow: 'paginated' },
        { id: 'doc', icon: 'description', label: 'Doc view: one scrolling page', short: 'Doc Viewer', flow: 'scrolled' }
      ]
    },
    sidebarTabs() {
      return [
        { id: 'contents', icon: 'toc', label: 'Contents' },
        { id: 'pages', icon: 'grid_view', label: 'Pages' },
        { id: 'bookmarks', icon: 'bookmark', label: 'Bookmarks' }
      ]
    },
    floatStyle() {
      return { backgroundColor: this.theme.bar, color: this.theme.fg, border: `1px solid ${this.theme.border}` }
    },
    hasAudio() {
      const m = this.item && this.item.media
      return !!(m && ((m.tracks && m.tracks.length) || (m.audioFiles && m.audioFiles.length) || m.numTracks || m.duration))
    },
    fraction() {
      return this.total > 1 ? (this.page - 1) / (this.total - 1) : 0
    },
    bookmarked() {
      return this.bookmarks.some((b) => b.page === this.page)
    },
    bookmarksKey() {
      return `absplusReadAlongMarks:${this.itemKey}`
    },
    sliderValue() {
      return this.sliding !== null ? this.sliding : this.page || 1
    },
    /** the contents entry for the page showing */
    currentTocIndex() {
      let at = -1
      this.flatToc.forEach((t, i) => {
        if (t.page && t.page <= this.page && (at < 0 || t.page >= this.flatToc[at].page)) at = i
      })
      return at
    },
    /** every page, in groups under the part of the book they're in */
    pageGroups() {
      const total = this.total || 0
      if (!total) return []
      const marks = []
      this.flatToc.forEach((t) => {
        if (t.page && t.depth === 0 && !marks.some((m) => m.page === t.page)) marks.push({ page: t.page, title: t.title })
      })
      marks.sort((a, b) => a.page - b.page)
      if (!marks.length || marks[0].page > 1) marks.unshift({ page: 1, title: 'Start' })
      return marks.map((m, i) => {
        const end = i + 1 < marks.length ? marks[i + 1].page - 1 : total
        const pages = []
        for (let n = m.page; n <= end; n++) pages.push(n)
        return { title: m.title, pages }
      })
    },
    flatToc() {
      const out = []
      const walk = (list, depth) => {
        for (const t of list || []) {
          if (t.href) out.push({ title: t.title, href: t.href, page: t.page || null, depth })
          walk(t.children, depth + 1)
        }
      }
      walk(this.toc, 0)
      return out
    },
    storeKey() {
      return `absplusReadAlong:${this.itemKey}`
    }
  },
  watch: {
    active(a) {
      if (a) {
        this.$nextTick(this.measure)
        if (this.api) this.api.setTheme(null, { animate: true })
      } else {
        this.showSidebar = false
        this.showGoTo = false
        if (this.api) this.api.setTheme(null, { animate: false }) // no page curl while hidden
      }
    },
    isPlaying(p) {
      if (this.api) this.api.setPlaying(p)
    },
    item() {
      this.open()
    },
    itemKey: {
      immediate: true,
      handler() {
        this.loadBookmarks()
        this.open()
      }
    },
    sidebarTab() {
      if (this.showSidebar) this.openSidebar()
    },
    lineCount(n, old) {
      // transcription going on: line up the new part too (not more than once a minute)
      if (!this.aligned || !n || n === old) return
      clearTimeout(this.realignTimer)
      this.realignTimer = setTimeout(this.loadTranscript, 60000)
    },
    theme: {
      deep: true,
      handler() {
        if (this.api) this.api.setTheme(this.readerTheme(), this.readerSettings())
      }
    }
  },
  mounted() {
    this.ro = new ResizeObserver(this.measure)
    this.ro.observe(this.$refs.box)
    this.$eventBus.$on('readalong-realign', this.onRealign)
  },
  beforeDestroy() {
    this.$eventBus.$off('readalong-realign', this.onRealign)
    if (this.ro) this.ro.disconnect()
    clearTimeout(this.realignTimer)
    if (this.api) this.api.close().catch(() => {})
  },
  methods: {
    measure() {
      if (!this.active || !this.$refs.box) return
      const r = this.$refs.box.getBoundingClientRect()
      if (r.width > 50 && r.height > 50) this.size = { w: Math.round(r.width), h: Math.round(r.height) }
    },
    readerSettings() {
      let s = {}
      try {
        s = JSON.parse(localStorage.getItem('ereaderSettings') || '{}') || {}
      } catch (e) {}
      const perf = this.$store.getters['device/perf'] || {}
      return { flow: this.flow, fontScale: this.fontScale || s.fontScale || 100, lineSpacing: s.lineSpacing || 140, justify: s.justify !== false, hyphenate: s.hyphenate !== false, turnAnimation: s.turnAnimation || 'curl', turnDirection: s.turnDirection || 'follow', animate: this.active && perf.tier !== 'low' }
    },
    readerTheme() {
      return { bg: this.theme.bg, paper: this.theme.paper || this.theme.bg, fg: this.theme.fg, highlight: this.theme.highlight, underline: this.theme.underline || '', box: !!this.theme.box, boxUnderline: !!this.theme.boxUnderline, weight: this.theme.weight || null, gutter: this.theme.gutter || null, eink: this.eink }
    },
    frameLoaded() {
      const w = this.$refs.frame && this.$refs.frame.contentWindow
      if (!w) return
      try {
        installTurnHost(w) // page curl
      } catch (e) {}
      w.absHost = (type, d) => this.onEvent(type, d)
      this.api = w.ReadiumAPI || null
      this.loadedFor = null
      this.open()
    },
    isEpub(item) {
      const f = item && item.media && item.media.ebookFile
      if (!f) return false
      const fmt = (f.ebookFormat || (f.metadata && f.metadata.ext) || '').toLowerCase().replace(/^\./, '')
      return fmt === 'epub'
    },
    async fetchBook(item) {
      const f = item.media.ebookFile
      if (f.contentUrl || f.isLocal || f.localFileId) {
        const res = await fetch(Capacitor.convertFileSrc(f.contentUrl))
        if (!res.ok) throw new Error(`Couldn't read the downloaded book (${res.status})`)
        return res.blob()
      }
      const id = item.id
      const cacheKey = `/ebook-cache/${id}/main`
      const cache = window.caches ? await window.caches.open(CACHE).catch(() => null) : null
      const hit = cache && (await cache.match(cacheKey).catch(() => null))
      if (hit) return hit.blob()
      this.message = 'Getting the book from your server…'
      const blob = await this.$axios.$get(`/api/items/${id}/ebook`, { responseType: 'blob' })
      if (cache) cache.put(cacheKey, new Response(blob)).catch(() => {})
      return blob
    },
    async open() {
      const item = this.item
      if (!this.api || !item || !this.itemKey) return
      const key = `${this.itemKey}|${item.id}`
      if (this.loadedFor === key) return
      this.loadedFor = key
      this.aligned = false
      this.busy = true
      this.message = 'Opening the book…'
      this.page = 0
      this.total = 0
      this.toc = []
      if (!this.isEpub(item)) {
        this.busy = false
        this.message = 'Read along here works with EPUB books.'
        return
      }
      try {
        const blob = await this.fetchBook(item)
        if (this.loadedFor !== key) return
        let start = null
        try {
          start = JSON.parse(localStorage.getItem(this.storeKey) || 'null')
        } catch (e) {}
        await this.api.open(blob, { theme: this.readerTheme(), settings: this.readerSettings(), start })
        if (this.loadedFor !== key) return
        this.api.setPlaying(this.isPlaying)
        this.api.setReading(this.reading)
        this.message = 'Lining up the book with the narration…'
        await this.loadTranscript()
      } catch (e) {
        this.busy = false
        this.message = `Couldn't open the book: ${(e && e.message) || e}`
        this.loadedFor = null
      }
    },
    /** Transcription ⋮ → Re-align read along: match this book to the narration again from scratch */
    onRealign(d) {
      if (!d || d.key !== this.itemKey || !this.api) return
      this.aligned = false
      this.busy = true
      this.message = 'Lining up the book with the narration again…'
      this.loadTranscript({ fresh: true })
    },
    async loadTranscript(opts = {}) {
      if (!this.api) return
      try {
        await Transcriber.prepare(this.itemKey).catch(() => null) // server or phone: look first
        const res = await Transcriber.getTranscript({ key: this.itemKey, fromIndex: 0 })
        const lines = ((res && res.lines) || []).slice().sort((a, b) => a.s - b.s)
        if (!lines.length) {
          this.busy = false
          this.message = 'Read along needs a transcript: transcribe this audiobook first.'
          return
        }
        // after a Book analysis: line the book up with the narration from scratch the first time it opens
        try {
          const fk = `absplus-ra-fresh:${this.itemKey}:panel`
          if (localStorage.getItem(fk)) {
            localStorage.removeItem(fk)
            opts = { ...opts, fresh: true }
          }
        } catch (e) {}
        await this.api.setTranscript(lines, opts.fresh ? { fresh: true } : undefined)
      } catch (e) {
        this.busy = false
        this.message = "Couldn't load the transcript."
      }
    },
    onEvent(type, d) {
      if (type === 'position') {
        this.page = d.page
        this.total = d.total
        this.chapter = d.chapter
        try {
          localStorage.setItem(this.storeKey, JSON.stringify({ section: d.section, progression: d.progression }))
        } catch (e) {}
      } else if (type === 'ready') {
        this.toc = d.toc || []
        this.total = d.total
      } else if (type === 'follow') this.follow = d.follow
      else if (type === 'offbook') this.offBook = !!(d && d.off)
      else if (type === 'noaudio') this.$toast.info("No audio attached to this part: the narrator doesn't read it.")
      else if (type === 'added' && d && d.text) Dialog.alert({ title: 'Added in the audiobook', message: `The narrator says this here, but it isn't in the book:

“${d.text}”` }).catch(() => {})
      else if (type === 'status') {
        if (d.state === 'aligning') {
          this.busy = true
          // the steps: reading the transcript, reading the book (with a percentage), matching the words
          this.message =
            d.step === 'match'
              ? `Matching the narration to the book’s words… (${Math.round((d.words || 0) / 1000)}k words: a long book can take a minute)`
              : d.step === 'transcript'
                ? 'Reading the transcription…'
                : `Reading the book… ${Math.round((d.progress || 0) * 100)}%`
        } else if (d.state === 'ready') {
          this.busy = false
          this.message = ''
          this.aligned = true
          this.$emit('aligned')
          // once per book: the book and the audiobook can differ in places
          try {
            const k = `absplus-ra-vary:${this.itemKey || ''}`
            if (!localStorage.getItem(k)) {
              localStorage.setItem(k, '1')
              this.$toast.info('The book may differ from the audiobook in places: narrators sometimes improvise, and editions can add or leave out lines. Read along pauses there and picks up again where they match.', { timeout: 9000 })
            }
          } catch (e) {}
        } else if (d.state === 'no-transcript') {
          this.busy = false
          this.message = 'Read along needs a transcript: transcribe this audiobook first.'
        } else if (d.reason === 'fixed-layout') {
          this.busy = false
          this.message = "This book has fixed pages (like a picture book), so read along can't follow the words."
        } else {
          this.busy = false
          this.message = ''
          this.$toast.info("Read along: the narration doesn't match this book's text closely enough.")
        }
      } else if (type === 'seek') this.$emit('seek', d.t)
      else if (type === 'lookup') this.$emit('lookup', d)
      else if (type === 'tap' && this.reading) this.barsShown ? this.hideBars() : this.showBars()
      else if (type === 'tap') this.$emit('tap')
      else if (type === 'lookup-playing') this.$emit('lookup-playing')
    },
    /** The panel's clock: every frame when smooth, every 0.5 s on e-ink */
    tick(t) {
      if (this.api && this.aligned) this.api.setTime((t || 0) + LEAD + (this.$store.getters['device/timeShift'] || 0))
    },
    openSearch() {
      this.showSearch = true
      this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus())
    },
    async runSearch() {
      if (!this.api || this.searchQuery.trim().length < 2) return
      this.searching = true
      this.searchDone = false
      try {
        this.searchResults = await this.api.search(this.searchQuery)
      } catch (e) {
        this.searchResults = []
      }
      this.searching = false
      this.searchDone = true
    },
    async goToResult(r) {
      this.showSearch = false
      if (this.api) await this.api.goToResult(r)
    },
    goFraction(f) {
      if (!this.api || !this.total) return
      this.api.goToPage(1 + Math.round(Math.max(0, Math.min(1, f)) * (this.total - 1)))
    },
    setFont(delta) {
      this.fontScale = Math.max(70, Math.min(200, (this.fontScale || 100) + delta))
      try {
        localStorage.setItem('absplusReadAlongFont', String(this.fontScale))
      } catch (e) {}
      if (this.api) this.api.setTheme(null, { fontScale: this.fontScale })
    },
    loadBookmarks() {
      try {
        this.bookmarks = JSON.parse(localStorage.getItem(this.bookmarksKey) || '[]') || []
      } catch (e) {
        this.bookmarks = []
      }
    },
    saveBookmarks() {
      try {
        localStorage.setItem(this.bookmarksKey, JSON.stringify(this.bookmarks))
      } catch (e) {}
    },
    toggleBookmark() {
      if (this.bookmarked) this.bookmarks = this.bookmarks.filter((b) => b.page !== this.page)
      else this.bookmarks = this.bookmarks.concat({ page: this.page, chapter: this.chapter || '', at: Date.now() }).sort((a, b) => a.page - b.page)
      this.saveBookmarks()
    },
    removeBookmark(page) {
      this.bookmarks = this.bookmarks.filter((b) => b.page !== page)
      this.saveBookmarks()
    },
    /** ✕ in reading mode: listen from the first word on this page */
    async playHere() {
      let t = null
      try {
        t = this.api && this.api.timeHere ? this.api.timeHere() : null
      } catch (e) {}
      const ok = typeof t === 'number' && isFinite(t)
      this.$emit('exit-reading', ok ? t : null)
      // once the audio has moved there, follow it again
      if (ok) setTimeout(() => this.api && this.api.follow(), 800)
    },
    showBars() {
      this.barsShown = true
      clearTimeout(this.barsTimer)
      this.barsTimer = setTimeout(() => (this.barsShown = false), 4000)
    },
    hideBars() {
      clearTimeout(this.barsTimer)
      this.barsShown = false
    },
    setReading(on) {
      if (on) this.showBars()
      else this.barsShown = true
      this.showSearch = false
      this.showSettings = false
      this.showSidebar = false
      this.showGoTo = false
      if (this.api) this.api.setReading(on)
    },
    clearLookup() {
      if (this.api) this.api.clearLookup()
    },
    backToNarration() {
      if (!this.api) return
      this.api.follow()
      this.$emit('follow')
    },
    openGoTo() {
      if (!this.total) return
      this.goPage = this.page || 1
      this.showGoTo = true
    },
    async goToPage() {
      const n = Math.max(1, Math.min(this.total, Math.round(Number(this.goPage) || 1)))
      this.showGoTo = false
      if (this.api) await this.api.goToPage(n)
    },
    async goToToc(t) {
      this.showSidebar = false
      if (this.api) await this.api.goToHref(t.href)
    },
    openSidebar(tab) {
      this.sidebarTab = tab || this.sidebarTab
      this.showSidebar = true
      // open at the part being read
      this.$nextTick(() => {
        const list = this.$refs[this.sidebarTab === 'pages' ? 'pageList' : 'tocList']
        const cur = list && list.querySelector('.tra-current')
        if (cur) cur.scrollIntoView({ block: 'center' })
      })
    },
    async pickPage(n) {
      this.showSidebar = false
      if (this.api) await this.api.goToPage(n)
    },
    async slide(n) {
      this.sliding = null
      if (this.api) await this.api.goToPage(n)
    },
    async setFlow(flow) {
      if (flow === this.flow) return
      this.flow = flow
      try {
        localStorage.setItem('absplusReadAlongFlow', flow)
      } catch (e) {}
      if (this.api) await this.api.setTheme(null, { flow })
    }
  }
}
</script>

<style scoped>
.tra-listen {
  width: 52px;
  height: 52px;
}
.tra-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tra-float {
  height: 38px;
  min-width: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.92;
}
.tra-slider {
  position: relative;
  height: 26px;
  margin: 0 4px 2px;
}
.tra-slider input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
}
.tra-ticks {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  height: 8px;
  transform: translateY(-50%);
  pointer-events: none;
}
.tra-tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 8px;
  opacity: 0.5;
}
.tra-box {
  width: 36px;
  height: 36px;
  border: 1px solid;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tra-pos {
  min-width: 84px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
}
.tra-modes {
  display: flex;
  border: 1px solid;
  border-radius: 8px;
  overflow: hidden;
}
.tra-mode {
  width: 40px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tra-mode + .tra-mode {
  border-left: 1px solid;
}
.tra-page {
  height: 36px;
  border: 1px solid;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
</style>

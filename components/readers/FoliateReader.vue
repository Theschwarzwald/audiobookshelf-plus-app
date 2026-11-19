<template>
  <!--
    E-books (EPUB, MOBI, AZW, AZW3, FB2): foliate-js in static/reader, with Grimmory's bars.
    Progress syncs through Audiobookshelf; bookmarks, highlights and notes through the server add-on.
    Both work offline and catch up later.
  -->
  <div class="foliate-reader fixed inset-0 z-40" :style="{ backgroundColor: p.page, bottom: playerOverBookInset + 'px' }">
    <iframe ref="frame" src="/reader/index.html" class="absolute inset-0 w-full border-0 block" :style="frameStyle" title="Book" @load="frameLoaded" />

    <div v-if="loading || error" class="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 text-center" :style="{ backgroundColor: p.page, color: p.fg }">
      <template v-if="error">
        <span class="material-symbols text-5xl mb-2" :style="{ color: p.muted }">error</span>
        <p class="mb-1">This book couldn't be opened</p>
        <p class="text-sm mb-4" :style="{ color: p.muted }">{{ error }}</p>
        <button class="px-4 py-2 rounded-full text-sm font-semibold" :style="{ backgroundColor: p.accent, color: p.onAccent }" @click="$emit('close')">Close</button>
      </template>
      <template v-else>
        <div class="w-10 h-10 border-4 rounded-full animate-spin mb-3" :style="{ borderColor: p.border, borderTopColor: p.accent }" />
        <p class="text-sm" :style="{ color: p.muted }">{{ loadingText }}</p>
      </template>
    </div>

    <!-- bookmark ribbon on a bookmarked page -->
    <span v-if="bookmarked && !showingToolbar && !loading" class="material-symbols fill absolute top-0 right-4 z-10 text-4xl pointer-events-none" :style="{ color: p.accent }">bookmark</span>

    <!-- "back to where you were" after jumping -->
    <button v-if="backTarget && !loading" class="absolute left-1/2 -translate-x-1/2 transform z-20 px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center" :style="{ bottom: `${bottomOffset + 40}px`, backgroundColor: p.accent, color: p.onAccent }" @click.stop="goBack">
      <span class="material-symbols text-base mr-1">undo</span>Back to {{ backLabel }}
    </button>

    <!-- read-along chip -->
    <button v-if="readAlongAvailable && readAlongLabel && !loading && !showingToolbar" class="absolute left-3 z-20 px-3 py-1 rounded-full text-xs font-semibold flex items-center" :style="{ bottom: `${bottomOffset + 34}px`, backgroundColor: p.panel, color: p.fg, border: `1px solid ${p.border}` }" @click.stop="cycleReadAlong">
      <span class="material-symbols text-sm mr-1" :class="{ 'animate-pulse': readAlongState === 'aligning' }">{{ readAlongMode === 'off' ? 'headphones' : 'record_voice_over' }}</span>{{ readAlongLabel }}
    </button>

    <!-- status line -->
    <div v-if="!tabletopPosture" class="absolute left-0 w-full h-7 px-4 flex items-center text-xs z-10" :style="{ bottom: `${bottomOffset}px`, backgroundColor: p.page, color: p.muted }">
      <p class="truncate flex-grow pr-2">{{ chapter }}</p>
      <p v-if="minutesLeftInChapter" class="pr-3 whitespace-nowrap">{{ minutesLeftInChapter }} min left in chapter</p>
      <p v-else-if="pageLabel" class="pr-3 whitespace-nowrap">p. {{ pageLabel }}</p>
      <p class="whitespace-nowrap">{{ Math.round(fraction * 100) }}%</p>
    </div>

    <reader-bars
      v-if="!loading && !error"
      :p="p"
      :visible="showingToolbar || tabletopPosture"
      :fade="fadeBars"
      :top-offset="barsTop"
      kind="ebook"
      :title="title"
      :bookmarked="bookmarked"
      :searchable="true"
      :fullscreen="fullscreen"
      :fraction="fraction"
      :location="locationLabel"
      :mode="settings.flow === 'scrolled' ? 'doc' : 'book'"
      :bottom-offset="bottomOffset"
      @sidebar="openPanel('contents')"
      @bookmark="toggleBookmark"
      @search="openPanel('search')"
      @fontSmaller="setFont(-10)"
      @fontLarger="setFont(10)"
      @fullscreen="toggleFullscreen"
      @settings="$emit('openSettings')"
      @close="$emit('close')"
      @step="(d) => (d > 0 ? next() : prev())"
      @goFraction="goFraction"
      @goPageNumber="goToPageNumber"
      @mode="(m) => updateSettings({ flow: m === 'doc' ? 'scrolled' : 'paginated' }, true)"
    />

    <selection-sheet
      v-if="selection"
      :p="p"
      :selection="selection"
      :language="language"
      @close="closeSelection"
      @highlight="highlightSelection"
      @note="noteSelection"
      @copy="copyText(selection.text), closeSelection()"
      @search="searchSelection"
      @listen="playFromSelection"
    />
    <annotation-editor v-if="editing" :key="editing.id" :p="p" :annotation="editing" @close="editing = null" @save="saveEditing" @delete="deleteEditing" />

    <!-- panels: contents / bookmarks / highlights / search / dictionaries -->
    <div v-if="panel" class="absolute inset-0 z-50 flex flex-col" :style="{ backgroundColor: p.panel, color: p.fg, paddingTop: 'max(env(safe-area-inset-top), 28px)' }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
      <div class="flex items-center px-2 h-12 border-b" :style="{ borderColor: p.border }">
        <template v-if="['contents', 'pages', 'bookmarks', 'highlights'].includes(panel)">
          <button v-for="t in tabs" :key="t.id" class="px-3 h-full text-sm" :style="{ color: panel === t.id ? p.accent : p.muted, fontWeight: panel === t.id ? 600 : 400, borderBottom: panel === t.id ? `2px solid ${p.accent}` : '2px solid transparent' }" @click.stop="panel = t.id">{{ t.label }}</button>
          <div class="flex-grow" />
        </template>
        <input v-else-if="panel === 'search'" ref="searchInput" v-model="searchQuery" type="search" placeholder="Search in book" class="flex-grow rounded-md px-3 h-9 outline-none text-sm" :style="{ backgroundColor: p.field, color: p.fg, border: `1px solid ${p.border}` }" @keyup.enter="runSearch" />
        <p v-else class="flex-grow font-semibold px-2">Dictionaries</p>
        <button class="material-symbols text-2xl ml-2" :style="{ color: p.muted }" aria-label="Close panel" @click.stop="panel = null">close</button>
      </div>

      <div class="flex-grow overflow-y-auto px-4 pb-10">
        <template v-if="panel === 'contents'">
          <p v-if="tocDetected" class="text-xs my-2" :style="{ color: p.muted }">This book has no table of contents; these chapters were found in the text.</p>
          <toc-list :items="toc" :current="chapter" :p="p" @go="goToTarget" />
          <p v-if="!toc.length" class="text-center mt-10" :style="{ color: p.muted }">{{ tocLoading ? 'Finding chapters…' : 'This book has no table of contents.' }}</p>
        </template>

        <!-- every page: tap one to go there (like the browser) -->
        <template v-if="panel === 'pages'">
          <p v-if="!locationTotal" class="text-center mt-10" :style="{ color: p.muted }">Pages are still being counted…</p>
          <div class="grid grid-cols-5 gap-1.5 pt-3">
            <button v-for="n in locationTotal" :key="n" :class="{ 'fr-cur': n === currentLocation }" class="h-9 rounded-md border text-[13px] font-semibold" :style="n === currentLocation ? { backgroundColor: p.accent, color: p.onAccent, borderColor: p.accent } : { borderColor: p.border }" @click.stop="goToPageNumber(n)">{{ n }}</button>
          </div>
        </template>

        <template v-if="panel === 'bookmarks' || panel === 'highlights'">
          <p v-if="pendingCount" class="text-xs my-2 flex items-center" style="color: #fb8c00"><span class="material-symbols text-sm mr-1">cloud_off</span>{{ pendingCount }} change{{ pendingCount === 1 ? '' : 's' }} will sync when you're back online</p>
          <div v-for="a in panel === 'bookmarks' ? bookmarks : highlights" :key="a.id" class="py-3 border-b flex items-start cursor-pointer" :style="{ borderColor: p.border }" @click.stop="goToTarget(a.cfi)">
            <span v-if="a.type === 'highlight'" class="w-1.5 self-stretch rounded mr-3 flex-shrink-0" :style="{ backgroundColor: colors[a.color] || colors.yellow }" />
            <span v-else class="material-symbols fill mr-2 text-xl" :style="{ color: p.accent }">bookmark</span>
            <div class="flex-grow min-w-0">
              <p class="text-xs mb-0.5" :style="{ color: p.faint }">{{ a.chapter || '' }}{{ a.chapter ? ' · ' : '' }}{{ Math.round((a.fraction || 0) * 100) }}%</p>
              <p v-if="a.text" class="text-sm leading-snug line-clamp-3">{{ a.type === 'highlight' ? `“${a.text}”` : a.text }}</p>
              <p v-if="a.note" class="text-sm mt-1 flex items-start whitespace-pre-line"><span class="material-symbols text-sm mr-1" :style="{ color: p.muted }">edit_note</span>{{ a.note }}</p>
            </div>
            <button class="material-symbols text-xl ml-2" :style="{ color: p.muted }" aria-label="Edit" @click.stop="editAnnotation(a)">edit</button>
          </div>
          <p v-if="!(panel === 'bookmarks' ? bookmarks : highlights).length" class="text-center mt-10 px-6" :style="{ color: p.muted }">
            {{ panel === 'bookmarks' ? 'No bookmarks yet. Tap the bookmark icon at the top to mark a page.' : 'No highlights yet. Press and hold a word, drag to select text, and pick a colour.' }}
          </p>
        </template>

        <template v-if="panel === 'search'">
          <p v-if="searching" class="text-xs my-2" :style="{ color: p.muted }">Searching… {{ Math.round(searchProgress * 100) }}%</p>
          <p v-else-if="searchDone" class="text-xs my-2" :style="{ color: p.muted }">{{ searchCount }} result{{ searchCount === 1 ? '' : 's' }}</p>
          <div v-for="(g, gi) in searchResults" :key="gi" class="mb-3">
            <p v-if="g.label" class="text-xs font-semibold mb-1" :style="{ color: p.muted }">{{ g.label }}</p>
            <div v-for="(r, ri) in g.items" :key="ri" class="py-2 border-b text-sm cursor-pointer" :style="{ borderColor: p.border }" @click.stop="goToTarget(r.cfi)">
              …{{ r.pre }}<mark class="rounded px-0.5" :style="{ backgroundColor: p.accent, color: p.onAccent }">{{ r.match }}</mark>{{ r.post }}…
            </div>
          </div>
        </template>

        <dictionary-manager v-if="panel === 'dictionaries'" class="pt-3" :p="p" />
      </div>
    </div>
  </div>
</template>

<script>
import readerCommon from './readerCommon'
// registered here: the reader's own bars, dictionary card, note editor and dictionaries (they weren't, so none of them showed)
import ReaderBars from './ReaderBars.vue'
import SelectionSheet from './SelectionSheet.vue'
import AnnotationEditor from './AnnotationEditor.vue'
import DictionaryManager from './DictionaryManager.vue'
import { installTurnHost } from '@/plugins/capacitor/AbsPageTurn'
import { hlColors, hlColorsForPage } from './readerThemes'

/** Small recursive TOC list */
const TocList = {
  name: 'TocList',
  props: { items: Array, current: String, p: Object, depth: { type: Number, default: 0 } },
  render(h) {
    return h(
      'ul',
      this.items.map((it) =>
        h('li', { key: `${it.label}-${it.target}` }, [
          h(
            'p',
            {
              class: 'py-2 text-sm cursor-pointer',
              style: { paddingLeft: `${this.depth * 16}px`, fontWeight: it.label === this.current ? '700' : '400', color: it.label === this.current ? this.p.accent : this.p.fg },
              on: { click: (e) => (e.stopPropagation(), this.$emit('go', it.target)) }
            },
            it.label || 'Untitled'
          ),
          it.subitems && it.subitems.length ? h('toc-list', { props: { items: it.subitems, current: this.current, p: this.p, depth: this.depth + 1 }, on: { go: (t) => this.$emit('go', t) } }) : null
        ])
      )
    )
  }
}

export default {
  components: { TocList, ReaderBars, SelectionSheet, AnnotationEditor, DictionaryManager },
  mixins: [readerCommon],
  data() {
    return {
      api: null,
      title: '',
      bookLanguage: '',
      toc: [],
      tocDetected: false,
      tocLoading: true,
      chapter: '',
      fraction: 0,
      pageLabel: null,
      locationLabel: '',
      locationTotal: 0,
      minutesLeftInChapter: null,
      bookmarked: false,
      currentCfi: null,
      backTarget: null,
      backLabel: '',
      searchQuery: '',
      searchResults: [],
      searching: false,
      searchDone: false,
      searchProgress: 0,
      statusLineHeight: 28
    }
  },
  computed: {
    colors: () => hlColors(),
    tabs() {
      return [
        { id: 'contents', label: 'Contents' },
        { id: 'pages', label: 'Pages' },
        { id: 'bookmarks', label: `Bookmarks (${this.bookmarks.length})` },
        { id: 'highlights', label: `Highlights (${this.highlights.length})` }
      ]
    },
    currentLocation() {
      const m = /^(\d+) of/.exec(this.locationLabel || '')
      return m ? Number(m[1]) : 0
    },
    searchCount() {
      return this.searchResults.reduce((n, g) => n + g.items.length, 0)
    }
  },
  watch: {
    bookmarks() {
      if (this.api) this.api.setBookmarks(this.bookmarks.map((b) => b.cfi))
    },
    highlights() {
      if (this.api) this.api.setAnnotations(this.highlights)
    },
    isPlayerOpen() {
      this.$nextTick(() => window.dispatchEvent(new Event('resize')))
    }
  },
  methods: {
    frameLoaded() {
      const wait = (n) => {
        const api = this.$refs.frame && this.$refs.frame.contentWindow && this.$refs.frame.contentWindow.ReaderAPI
        if (api) {
          installTurnHost(this.$refs.frame.contentWindow) // page curl / slide / fade
          return this.start(api)
        }
        if (n > 100) {
          this.error = 'The reader engine is missing from this build (run scripts/fetch-foliate.sh).'
          return
        }
        setTimeout(() => wait(n + 1), 100)
      }
      wait(0)
    },
    async start(api) {
      this.api = api
      api.onEvent = (type, detail) => this.onEvent(type, detail)
      await this.$store.dispatch('reader/init')
      this.loadSettings()
      let blob
      try {
        blob = await this.fetchBook()
      } catch (e) {
        this.error = e.message || String(e)
        return
      }
      this.loadingText = 'Laying out pages…'
      const saved = this.savedProgress
      if (this.$store.state.reader.jump) this.$store.commit('reader/setJump', null) // Notebook jump used up
      const file = new File([blob], this.fileName || `book.${this.format || 'epub'}`, { type: blob.type || '' })
      await api.open({
        file,
        format: this.format,
        location: saved ? saved.ebookLocation : null,
        fraction: saved ? saved.ebookProgress || 0 : 0,
        settings: this.frameSettings(),
        bookmarks: this.bookmarks.map((b) => b.cfi),
        annotations: this.highlights
      })
      this.$store.dispatch('reader/syncAnnotations', this.itemKey)
    },
    /** From Reader.vue's settings sheet (and the bars) */
    updateSettings(s, persist) {
      const prevMode = this.settings.readAlong
      if (persist) this.persistSettings(s)
      else this.settings = { ...this.settings, ...s }
      if (this.api) this.api.setSettings(this.frameSettings())
      if (prevMode !== this.settings.readAlong) this.prepareReadAlong()
    },
    /** Settings for the book, plus what this device can afford and where the hinge is */
    frameSettings() {
      return { ...this.settings, animate: this.perf.animate, hingeGap: this.hingeGap, hl: hlColorsForPage() }
    },
    onDeviceChange() {
      if (this.api) this.api.setSettings(this.frameSettings())
    },
    zoomIn(k) {
      if (k && k.ctrl) this.setFont(10)
    },
    zoomOut(k) {
      if (k && k.ctrl) this.setFont(-10)
    },
    goFirst() {
      this.goFraction(0)
    },
    goLast() {
      this.goFraction(0.9999)
    },
    toggleViewer() {
      this.updateSettings({ flow: this.settings.flow === 'scrolled' ? 'paginated' : 'scrolled' }, true)
    },
    /** A− / A+ (70%–200%, like Grimmory) */
    setFont(delta) {
      const next = Math.min(200, Math.max(70, (this.settings.fontScale || 100) + delta))
      this.updateSettings({ fontScale: next }, true)
    },
    applyReadAlongSetting() {
      if (this.api) this.api.setSettings(this.frameSettings())
      this.prepareReadAlong()
    },

    onEvent(type, d) {
      switch (type) {
        case 'loaded':
          this.loading = false
          this.title = d.title || (this.libraryItem.media && this.libraryItem.media.metadata.title) || ''
          this.bookLanguage = d.language || ''
          this.toc = d.toc || []
          this.tocLoading = this.toc.length < 2
          this.prepareReadAlong()
          this.startTour('reader-ebook')
          break
        case 'toc':
          this.toc = d.toc
          this.tocDetected = !!d.detected
          this.tocLoading = false
          break
        case 'relocate':
          this.fraction = d.fraction
          this.chapter = d.chapter || this.chapter
          this.pageLabel = d.page
          this.locationLabel = d.location_total ? `${(d.location_current || 0) + 1} of ${d.location_total}` : ''
          this.locationTotal = d.location_total || 0
          this.minutesLeftInChapter = d.minutesLeftInChapter ? Math.max(1, Math.round(d.minutesLeftInChapter)) : null
          this.bookmarked = d.bookmarked
          this.currentCfi = d.cfi
          this.scheduleSave({ ebookLocation: d.location, ebookProgress: d.fraction })
          if (this.tocLoading && this.toc.length >= 2) this.tocLoading = false
          break
        case 'relocate-bookmark':
          this.bookmarked = d.bookmarked
          break
        case 'play-from':
          this.$hapticsImpact && this.$hapticsImpact()
          this.playFrom(d.time)
          break
        case 'tap':
          if (d.zone === 'top') this.$emit('showToolbar')
          else if (d.zone === 'center') this.$emit('toggleToolbar')
          else this.$emit('hideToolbar')
          if (this.selection) this.closeSelection()
          break
        case 'selection':
          if (!this.lookupAllowed) break // Read along: tap the book button (audio paused) to look words up
          this.editing = null
          this.selection = { ...d, canHighlight: !!d.cfi }
          break
        case 'selection-cleared':
          this.selection = null
          break
        case 'annotation': {
          const a = this.highlights.find((h) => h.cfi === d.cfi)
          if (a) this.editAnnotation(a)
          break
        }
        case 'search-progress':
          this.searchProgress = d.progress
          break
        case 'search-results':
          this.searchResults.push(d)
          break
        case 'search-done':
          this.searching = false
          this.searchDone = true
          break
        case 'readalong-noaudio':
          this.$toast.info("No audio attached to this part: the narrator doesn't read it.")
          break
        case 'readalong-added':
          this.raShowAdded(d)
          break
        case 'readalong-offbook':
          this.raOffBook = !!(d && d.off)
          break
        case 'readalong-status':
          this.onReadAlongStatus(d)
          break
        case 'key':
          this.onKey(d)
          break
        case 'external-link':
          if (d.href) window.open(d.href, '_blank')
          break
        case 'error':
          this.error = d.message
          this.loading = false
          break
      }
    },

    // ---- navigation
    next() {
      this.api && this.api.next()
    },
    prev() {
      this.api && this.api.prev()
    },
    rememberSpot() {
      if (!this.currentCfi) return
      this.backTarget = this.currentCfi
      this.backLabel = `${Math.round(this.fraction * 100)}%`
      clearTimeout(this._backTimer)
      this._backTimer = setTimeout(() => (this.backTarget = null), 15000)
    },
    async goToTarget(target) {
      this.rememberSpot()
      this.panel = null
      await this.api.goTo(target)
    },
    goToChapter(href) {
      this.goToTarget(href)
    },
    /** a page number ("4 of 350", the Pages tab): that location */
    goToPageNumber(n) {
      this.panel = null
      if (this.locationTotal) this.goFraction(Math.max(0, Math.min(1, (n - 1) / this.locationTotal)))
    },
    goFraction(f) {
      this.rememberSpot()
      this.api.goToFraction(f)
    },
    goBack() {
      const t = this.backTarget
      this.backTarget = null
      if (t) this.api.goTo(t)
    },
    openPanel(name) {
      this.$emit('hideToolbar')
      this.panel = name
      if (name === 'search') this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus())
      if (['contents', 'bookmarks', 'highlights'].includes(name)) this.$store.dispatch('reader/syncAnnotations', this.itemKey)
    },

    // ---- bookmarks & highlights
    async toggleBookmark() {
      await this.$hapticsImpact()
      if (this.bookmarked) {
        const onPage = new Set(this.api.bookmarksOnPage())
        for (const b of this.bookmarks.filter((x) => onPage.has(x.cfi))) await this.removeAnnotation(b.id)
        return
      }
      if (!this.currentCfi) return
      await this.addAnnotation({ type: 'bookmark', cfi: this.currentCfi, fraction: this.fraction, text: this.api.pageText(), chapter: this.chapter })
    },
    closeSelection() {
      this.selection = null
      this.api && this.api.clearSelection()
    },
    async highlightSelection(color) {
      const s = this.selection
      if (!s || !s.cfi) return
      await this.addAnnotation({ type: 'highlight', cfi: s.cfi, text: s.text, color, fraction: this.fraction, chapter: this.chapter })
      this.closeSelection()
    },
    async noteSelection() {
      const s = this.selection
      if (!s || !s.cfi) return
      const rec = await this.addAnnotation({ type: 'highlight', cfi: s.cfi, text: s.text, color: 'yellow', fraction: this.fraction, chapter: this.chapter })
      this.closeSelection()
      this.editAnnotation(rec)
    },
    searchSelection() {
      this.searchQuery = this.selection.text
      this.closeSelection()
      this.openPanel('search')
      this.runSearch()
    },
    playFromSelection() {
      const t = this.api.selectionTime()
      this.closeSelection()
      this.playFrom(t)
    },

    // ---- search
    runSearch() {
      const q = (this.searchQuery || '').trim()
      if (!q) return
      this.searchResults = []
      this.searchDone = false
      this.searching = true
      this.searchProgress = 0
      this.api.search(q)
    },

    // ---- read-along hooks (readerCommon)
    raSetTranscript(lines, opts) {
      this.api.setTranscript(lines, opts)
    },
    raClear() {
      this.api && this.api.clearReadAlong()
    },
    raSetTime(t) {
      this.api.setPlaybackTime(t)
    }
  }
}
</script>

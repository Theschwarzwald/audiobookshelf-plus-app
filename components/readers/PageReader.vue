<template>
  <!--
    PDFs and comics (CBZ, CBR, CB7), laid out like Grimmory's page reader. The pages are drawn by
    static/reader/pages.html (pdf.js for PDFs; comics are unpacked here with libarchive).
  -->
  <div class="page-reader fixed inset-0 z-40" :style="{ backgroundColor: p.page, bottom: playerOverBookInset + 'px' }">
    <iframe ref="frame" src="/reader/pages.html" class="absolute inset-0 w-full border-0 block" :style="frameStyle" title="Pages" @load="frameLoaded" />

    <div v-if="loading || error" class="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-30" :style="{ backgroundColor: p.page, color: p.fg }">
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

    <reader-bars
      v-if="!loading && !error"
      :p="p"
      :visible="showingToolbar || tabletopPosture"
      :fade="fadeBars"
      :top-offset="barsTop"
      kind="pages"
      :title="title"
      :bookmarked="bookmarked"
      :searchable="hasText"
      :fullscreen="fullscreen"
      :page="page"
      :page-count="pageCount"
      :fit="view.fit"
      :double="isDouble"
      :rtl="isComic ? view.rtl : null"
      :night="view.night"
      :reflow="canReflow ? !!view.reflow : null"
      :mode="view.mode"
      :bottom-offset="bottomOffset"
      @sidebar="openPanel('sidebar')"
      @bookmark="toggleBookmark"
      @zoomIn="zoomIn"
      @zoomOut="zoomOut"
      @fit="setView({ fit: view.fit === 'width' ? 'page' : 'width' })"
      @double="(d) => setView({ double: d })"
      @rotate="rotate"
      @rtl="setRtl(!view.rtl)"
      @night="setView({ night: !view.night })"
      @fullscreen="toggleFullscreen"
      @settings="$emit('openSettings')"
      @close="$emit('close')"
      @search="openPanel('search')"
      @step="(d) => api.step(d)"
      @goPage="goPage"
      @mode="(m) => setView({ mode: m })"
      @reflow="setView({ reflow: !view.reflow })"
    />

    <!-- Read along on a reflowed PDF: say so once, with the button that brings the original pages back -->
    <transition name="fade">
      <div v-if="reflowHint" class="absolute left-3 right-3 z-30 rounded-xl px-3 py-2 flex items-center text-sm shadow-lg" :style="{ top: `${($store.state.readerBookMode ? 0 : $store.state.readerTopInset || 0) + 12}px`, backgroundColor: p.panel, color: p.fg, border: `1px solid ${p.border}` }" @click.stop="reflowHint = false">
        <span class="flex-grow">Book has been formatted to the screen. In read mode, tap</span>
        <span class="material-symbols text-xl mx-1 rounded-full p-1" :style="{ color: p.accent, border: `1px solid ${p.border}` }" aria-label="Reflow button">wrap_text</span>
        <span>for the original pages.</span>
      </div>
    </transition>

    <!-- quiet page number while the bars are hidden -->
    <p v-if="!loading && !error && !showingToolbar" class="absolute right-3 text-[11px] px-2 py-0.5 rounded z-20 pointer-events-none" :style="{ bottom: `${bottomOffset + 6}px`, color: p.muted, backgroundColor: `${p.page}cc` }">{{ page + 1 }} / {{ pageCount }}</p>

    <!-- read-along (PDFs with text) -->
    <button v-if="readAlongAvailable && readAlongLabel && hasText && !loading && !showingToolbar" class="absolute left-3 z-20 px-3 py-1 rounded-full text-xs font-semibold flex items-center" :style="{ bottom: `${bottomOffset + 6}px`, backgroundColor: p.panel, color: p.fg, border: `1px solid ${p.border}` }" @click.stop="cycleReadAlong">
      <span class="material-symbols text-sm mr-1" :class="{ 'animate-pulse': readAlongState === 'aligning' }">{{ readAlongMode === 'off' ? 'headphones' : 'record_voice_over' }}</span>{{ readAlongLabel }}
    </button>

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

    <!-- sidebar (pages, contents, bookmarks, highlights), search, dictionaries -->
    <div v-if="panel" class="absolute inset-0 z-50 flex" :style="{ backgroundColor: panel === 'sidebar' && wide ? 'rgba(0,0,0,0.4)' : p.panel }" @click.self="panel = null">
      <div class="flex flex-col h-full" :class="panel === 'sidebar' && wide ? 'w-[320px]' : 'w-full'" :style="{ backgroundColor: p.panel, color: p.fg, paddingTop: 'max(env(safe-area-inset-top), 28px)' }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
        <div class="flex items-center px-2 h-12 border-b" :style="{ borderColor: p.border }">
          <template v-if="panel === 'sidebar'">
            <button v-for="t in sidebarTabs" :key="t.id" class="px-3 h-full text-sm" :style="{ color: tab === t.id ? p.accent : p.muted, fontWeight: tab === t.id ? 600 : 400, borderBottom: tab === t.id ? `2px solid ${p.accent}` : '2px solid transparent' }" @click.stop="tab = t.id">{{ t.label }}</button>
            <div class="flex-grow" />
          </template>
          <template v-else-if="panel === 'search'">
            <input ref="searchInput" v-model="searchQuery" type="search" placeholder="Search in this PDF" class="flex-grow rounded-md px-3 h-9 outline-none text-sm" :style="{ backgroundColor: p.field, color: p.fg, border: `1px solid ${p.border}` }" @keyup.enter="runSearch" />
          </template>
          <p v-else class="flex-grow font-semibold px-2">Dictionaries</p>
          <button class="material-symbols text-2xl ml-2" :style="{ color: p.muted }" aria-label="Close panel" @click.stop="panel = null">close</button>
        </div>

        <div class="flex-grow overflow-y-auto">
          <!-- pages: thumbnails -->
          <div v-if="panel === 'sidebar' && tab === 'pages'" ref="thumbs" class="grid gap-2 p-2.5" style="grid-template-columns: repeat(auto-fill, minmax(84px, 1fr))">
            <div v-for="i in pageCount" :key="i" :ref="`thumb-${i - 1}`" class="cursor-pointer text-center" :data-i="i - 1" @click.stop="goPage(i - 1), (panel = null)">
              <div class="w-full rounded overflow-hidden" :style="{ aspectRatio: '0.7', border: `${i - 1 === page ? 2 : 1}px solid ${i - 1 === page ? p.accent : p.border}`, backgroundColor: p.field }">
                <img v-if="thumbUrls[i - 1]" :src="thumbUrls[i - 1]" class="w-full h-full object-contain" :style="view.night ? 'filter: invert(1) hue-rotate(180deg)' : ''" />
              </div>
              <p class="text-[11px] mt-0.5" :style="{ color: i - 1 === page ? p.accent : p.muted }">{{ i }}</p>
            </div>
          </div>
          <!-- contents (PDF outline) -->
          <div v-if="panel === 'sidebar' && tab === 'contents'" class="px-4 py-2">
            <toc-list :items="toc" :p="p" :current-page="page" @go="(t) => (goPage(t), (panel = null))" />
          </div>
          <!-- bookmarks & highlights -->
          <div v-if="panel === 'sidebar' && (tab === 'bookmarks' || tab === 'highlights')" class="px-3 py-1">
            <p v-if="pendingCount" class="text-xs my-2 flex items-center" style="color: #fb8c00"><span class="material-symbols text-sm mr-1">cloud_off</span>{{ pendingCount }} change{{ pendingCount === 1 ? '' : 's' }} will sync when you're back online</p>
            <div v-for="a in tab === 'bookmarks' ? bookmarks : highlights" :key="a.id" class="py-3 border-b flex items-start cursor-pointer" :style="{ borderColor: p.border }" @click.stop="goToAnnotation(a)">
              <span v-if="a.type === 'highlight'" class="w-1.5 self-stretch rounded mr-3 flex-shrink-0" :style="{ backgroundColor: colors[a.color] || colors.yellow }" />
              <span v-else class="material-symbols fill mr-2 text-xl" :style="{ color: p.accent }">bookmark</span>
              <div class="flex-grow min-w-0">
                <p class="text-sm font-semibold" :style="{ color: pageOf(a) === page ? p.accent : p.fg }">Page {{ pageOf(a) + 1 }}</p>
                <p v-if="a.text" class="text-sm leading-snug line-clamp-3" :style="{ color: p.muted }">{{ a.type === 'highlight' ? `“${a.text}”` : a.text }}</p>
                <p v-if="a.note" class="text-sm mt-1 whitespace-pre-line flex"><span class="material-symbols text-sm mr-1" :style="{ color: p.muted }">edit_note</span>{{ a.note }}</p>
              </div>
              <button class="material-symbols text-xl ml-2" :style="{ color: p.muted }" aria-label="Edit" @click.stop="editAnnotation(a)">edit</button>
            </div>
            <p v-if="!(tab === 'bookmarks' ? bookmarks : highlights).length" class="text-sm p-3" :style="{ color: p.muted }">{{ tab === 'bookmarks' ? 'No bookmarks yet. Tap the bookmark icon at the top to mark a page.' : 'No highlights yet. Press and hold text, then pick a colour.' }}</p>
          </div>
          <!-- search -->
          <div v-if="panel === 'search'" class="px-3 py-2">
            <p v-if="searching" class="text-xs mb-2" :style="{ color: p.muted }">Searching… {{ Math.round(searchProgress * 100) }}%</p>
            <p v-else-if="searchDone" class="text-xs mb-2" :style="{ color: p.muted }">{{ searchCount }} result{{ searchCount === 1 ? '' : 's' }}</p>
            <div v-for="(g, gi) in searchResults" :key="gi" class="mb-2">
              <p class="text-xs font-semibold mb-1" :style="{ color: p.muted }">{{ g.label }}</p>
              <div v-for="(r, ri) in g.items" :key="ri" class="py-2 border-b text-sm cursor-pointer" :style="{ borderColor: p.border }" @click.stop="revealResult(r)">
                …{{ r.pre }}<mark class="rounded px-0.5" :style="{ backgroundColor: p.accent, color: p.onAccent }">{{ r.match }}</mark>{{ r.post }}…
              </div>
            </div>
          </div>
          <div v-if="panel === 'dictionaries'" class="px-4 py-3">
            <dictionary-manager :p="p" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Archive } from 'libarchive.js/main.js'
import { CompressedFile } from 'libarchive.js/src/compressed-file'
import readerCommon from './readerCommon'
// registered here: the reader's own bars, dictionary card, note editor and dictionaries (they weren't, so none of them showed)
import ReaderBars from './ReaderBars.vue'
import SelectionSheet from './SelectionSheet.vue'
import AnnotationEditor from './AnnotationEditor.vue'
import DictionaryManager from './DictionaryManager.vue'
import { installTurnHost } from '@/plugins/capacitor/AbsPageTurn'
import { hlColors, hlColorsForPage } from './readerThemes'

Archive.init({ workerUrl: '/libarchive/worker-bundle.js' })

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|jxl)$/i

/** Contents list (PDF outline) */
const TocList = {
  name: 'TocList',
  props: { items: Array, p: Object, currentPage: Number, depth: { type: Number, default: 0 } },
  render(h) {
    if (!this.items.length && !this.depth) return h('p', { class: 'text-sm py-2', style: { color: this.p.muted } }, 'This PDF has no table of contents. Use the Pages tab to jump around.')
    return h(
      'ul',
      this.items.map((it, i) =>
        h('li', { key: i }, [
          h(
            'p',
            {
              class: 'py-2 text-sm flex cursor-pointer',
              style: { paddingLeft: `${this.depth * 14}px`, color: it.target === this.currentPage ? this.p.accent : this.p.fg },
              on: { click: (e) => (e.stopPropagation(), it.target != null && this.$emit('go', it.target)) }
            },
            [h('span', { class: 'flex-grow' }, it.label || 'Untitled'), it.target != null ? h('span', { style: { color: this.p.faint } }, String(it.target + 1)) : null]
          ),
          it.subitems && it.subitems.length ? h('toc-list', { props: { items: it.subitems, p: this.p, currentPage: this.currentPage, depth: this.depth + 1 }, on: { go: (t) => this.$emit('go', t) } }) : null
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
      page: 0,
      pageCount: 0,
      hasText: false,
      toc: [],
      view: { fit: 'width', double: 'auto', night: false, mode: 'book', rtl: false, rotation: 0 },
      wide: window.innerWidth >= 720,
      tab: 'pages',
      thumbUrls: {},
      thumbObserver: null,
      searchQuery: '',
      searchResults: [],
      searching: false,
      searchDone: false,
      searchProgress: 0,
      bookLanguage: '',
      pendingFraction: null,
      contentsPanel: 'sidebar',
      reflowHint: false
    }
  },
  computed: {
    colors: () => hlColors(),
    /** PDFs with a text layer can be reflowed to the screen (not comics or scanned pages without OCR) */
    canReflow() {
      return !this.isComic && this.hasText
    },
    isComic() {
      return /^(cbz|cbr|cb7|cbt|cbx)$/i.test(this.format || '')
    },
    title() {
      return (this.libraryItem.media && this.libraryItem.media.metadata && this.libraryItem.media.metadata.title) || ''
    },
    isDouble() {
      if (this.view.double === 'auto') return window.innerWidth > window.innerHeight && window.innerWidth >= 840
      return !!this.view.double
    },
    bookmarked() {
      return this.bookmarks.some((b) => b.cfi === `page:${this.page}`)
    },
    sidebarTabs() {
      const tabs = [{ id: 'pages', label: 'Pages' }]
      if (!this.isComic) tabs.push({ id: 'contents', label: 'Contents' })
      tabs.push({ id: 'bookmarks', label: 'Bookmarks' })
      if (this.hasText) tabs.push({ id: 'highlights', label: 'Highlights' })
      return tabs
    },
    searchCount() {
      return this.searchResults.reduce((n, g) => n + g.items.length, 0)
    }
  },
  watch: {
    highlights() {
      if (this.api) this.api.setHighlights(this.highlights)
    },
    tab(t) {
      if (t === 'pages') this.$nextTick(this.observeThumbs)
    },
    panel(v) {
      if (v === 'sidebar' && this.tab === 'pages') this.$nextTick(this.observeThumbs)
    }
  },
  methods: {
    frameLoaded() {
      const wait = (n) => {
        const api = this.$refs.frame && this.$refs.frame.contentWindow && this.$refs.frame.contentWindow.PagesAPI
        if (api) {
          installTurnHost(this.$refs.frame.contentWindow) // page curl / slide / fade
          return this.start(api)
        }
        if (n > 100) {
          this.error = 'The page reader is missing from this build.'
          return
        }
        setTimeout(() => wait(n + 1), 100)
      }
      wait(0)
    },
    loadView() {
      try {
        Object.assign(this.view, JSON.parse(localStorage.getItem('pageReaderView') || '{}'))
      } catch (e) {}
      this.view.rotation = 0
      // Phones: PDFs reflowed to the screen unless the reader chose the original pages
      if (typeof this.view.reflow !== 'boolean') this.view.reflow = Math.min(window.innerWidth, window.innerHeight) < 600
      // right-to-left is remembered per comic, like Grimmory
      this.view.rtl = this.isComic && localStorage.getItem(`pageReaderRtl:${this.itemKey}`) === '1'
    },
    frameSettings() {
      // Foldable opened like a book: two pages, one each side of the hinge
      const double = this.bookPosture ? true : this.view.double
      // reflowed text scrolls like the Doc Viewer
      const mode = this.view.reflow && !this.isComic ? 'doc' : this.view.mode
      return { ...this.view, mode, reflow: !!this.view.reflow && !this.isComic, double, eink: this.p.eink, mono: this.p.mono, bg: this.p.page, hingeGap: this.hingeGap, perf: { ...this.perf }, hl: hlColorsForPage(), animate: this.perf.animate, turnAnimation: this.settings.turnAnimation || 'curl', turnDirection: this.settings.turnDirection || 'follow' }
    },
    onDeviceChange() {
      this.api && this.api.setSettings(this.frameSettings())
    },
    zoomIn() {
      this.api && this.api.zoomIn()
    },
    zoomOut() {
      this.api && this.api.zoomOut()
    },
    goFirst() {
      this.goPage(0)
    },
    goLast() {
      this.goPage(this.pageCount - 1)
    },
    toggleViewer() {
      this.setView({ mode: this.view.mode === 'doc' ? 'book' : 'doc' })
    },
    async start(api) {
      this.api = api
      api.onEvent = (type, d) => this.onEvent(type, d)
      await this.$store.dispatch('reader/init')
      this.loadSettings()
      this.loadView()
      let blob
      try {
        blob = await this.fetchBook()
      } catch (e) {
        this.error = e.message || String(e)
        return
      }
      const saved = this.savedProgress
      if (this.$store.state.reader.jump) this.$store.commit('reader/setJump', null) // Notebook jump used up
      const startFrom = (count) => {
        if (!saved) return 0
        const n = parseInt(saved.ebookLocation, 10)
        if (!isNaN(n) && String(n) === String(saved.ebookLocation).trim()) return n - 1
        return Math.round((saved.ebookProgress || 0) * count) - 1
      }
      try {
        if (this.isComic) {
          this.loadingText = 'Unpacking pages…'
          const files = await this.openArchive(blob)
          if (!files.length) throw new Error('No pages found in this comic.')
          await api.open({ kind: 'images', count: files.length, getImage: (i) => files[i].extract(), startPage: Math.max(0, startFrom(files.length)), settings: this.frameSettings() })
        } else {
          this.loadingText = 'Opening…'
          // page count isn't known yet: start from the saved page number (or its percentage once loaded)
          const n = saved ? parseInt(saved.ebookLocation, 10) : 1
          if (saved && isNaN(n)) this.pendingFraction = saved.ebookProgress || 0
          await api.open({ kind: 'pdf', file: blob, startPage: isNaN(n) ? 0 : n - 1, settings: this.frameSettings() })
        }
      } catch (e) {
        this.error = e.message || String(e)
      }
      this.$store.dispatch('reader/syncAnnotations', this.itemKey)
    },
    /** Comic archives (zip, rar incl. RAR5, 7z, tar) with libarchive; pages in natural name order */
    async openArchive(blob) {
      const archive = await Archive.open(blob)
      const obj = await archive.getFilesObject()
      const flat = []
      const walk = (o, prefix) => {
        for (const key in o) {
          const v = o[key]
          const name = prefix ? `${prefix}/${key}` : key
          if (v instanceof CompressedFile) flat.push({ name, file: v })
          else if (v && typeof v === 'object' && !key.startsWith('_')) walk(v, name)
        }
      }
      walk(obj, '')
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
      return flat
        .filter((f) => IMAGE_EXT.test(f.name) && !/(^|\/)(__MACOSX|\.)/.test(f.name))
        .sort((a, b) => collator.compare(a.name, b.name))
        .map((f) => ({ name: f.name, extract: () => f.file.extract() }))
    },

    onEvent(type, d) {
      switch (type) {
        case 'loaded':
          this.loading = false
          this.pageCount = d.pageCount
          this.toc = d.toc || []
          this.hasText = !!d.hasText
          if (this.pendingFraction) this.api.goTo(Math.max(0, Math.round(this.pendingFraction * d.pageCount) - 1))
          this.pendingFraction = null
          this.api.setHighlights(this.highlights)
          this.api.setReadAlong(this.readAlongMode, this.settings.readAlongTurnPages !== false)
          if (this.hasText) this.prepareReadAlong()
          if (this.hasText && !this.isComic) this.loadLayout()
          if (this.hasText && this.view.reflow && this.readAlongMode !== 'off' && !this.$store.state.readerBookMode) {
            this.reflowHint = true
            setTimeout(() => (this.reflowHint = false), 8000)
          }
          this.startTour('reader-pages')
          break
        case 'page':
          this.page = d.page
          this.pageCount = d.pageCount
          this.scheduleSave({ ebookLocation: String(d.page + 1), ebookProgress: (d.page + 1) / Math.max(1, d.pageCount) })
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
          this.selection = { ...d, canHighlight: true }
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
        case 'error':
          this.error = d.message
          this.loading = false
          break
      }
    },

    /** The server's layout of this PDF (Docling) for reflow; a copy stays on the phone for offline */
    async loadLayout() {
      const id = this.serverLibraryItemId
      if (!id) return
      const key = `absplus-layout:${id}`
      let cached = null
      try {
        cached = JSON.parse(localStorage.getItem(key) || 'null')
      } catch (e) {}
      if (cached && this.api) this.api.setLayout(cached)
      if (!this.online) return
      try {
        const res = await this.$nativeHttp.get(`/api/transcription/items/${encodeURIComponent(id)}/layout`)
        const layout = res && res.layout
        if (layout && layout.pages && JSON.stringify(layout) !== JSON.stringify(cached)) {
          try {
            localStorage.setItem(key, JSON.stringify(layout))
          } catch (e) {
            // full: make room by dropping other books' layouts
            Object.keys(localStorage)
              .filter((k) => k.startsWith('absplus-layout:') && k !== key)
              .forEach((k) => localStorage.removeItem(k))
            try {
              localStorage.setItem(key, JSON.stringify(layout))
            } catch (e2) {}
          }
          this.api && this.api.setLayout(layout)
        }
      } catch (e) {}
    },
    // ---- view (Grimmory's tools)
    setView(changes) {
      Object.assign(this.view, changes)
      const { rtl, rotation, ...keep } = this.view
      localStorage.setItem('pageReaderView', JSON.stringify(keep))
      this.api && this.api.setSettings(this.frameSettings())
    },
    setRtl(v) {
      localStorage.setItem(`pageReaderRtl:${this.itemKey}`, v ? '1' : '0')
      this.setView({ rtl: v })
    },
    rotate() {
      this.setView({ rotation: (this.view.rotation + 90) % 360 })
    },
    goPage(i) {
      this.api && this.api.goTo(i)
    },
    // Reader.vue: volume buttons / page keys
    next() {
      this.api && this.api.step(1)
    },
    prev() {
      this.api && this.api.step(-1)
    },
    /** From Reader.vue's settings sheet */
    updateSettings(s) {
      const prevMode = this.settings.readAlong
      this.settings = { ...this.settings, ...s }
      this.api && this.api.setSettings(this.frameSettings())
      this.api && this.api.setReadAlong(this.settings.readAlong, this.settings.readAlongTurnPages !== false)
      if (prevMode !== this.settings.readAlong) this.prepareReadAlong()
    },
    openPanel(name) {
      this.$emit('hideToolbar')
      this.panel = name
      if (name === 'search') this.$nextTick(() => this.$refs.searchInput && this.$refs.searchInput.focus())
      if (name === 'sidebar') this.$store.dispatch('reader/syncAnnotations', this.itemKey)
    },

    // ---- thumbnails (rendered lazily as they scroll into view)
    observeThumbs() {
      const box = this.$refs.thumbs
      if (!box || !this.api) return
      if (this.thumbObserver) this.thumbObserver.disconnect()
      this.thumbObserver = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            const i = Number(e.target.dataset.i)
            if (this.thumbUrls[i]) continue
            this.api.thumbnail(i, this.perf.thumbWidth).then((url) => this.$set(this.thumbUrls, i, url))
          }
        },
        { root: box.parentElement, rootMargin: '300px 0px' }
      )
      box.querySelectorAll('[data-i]').forEach((el) => this.thumbObserver.observe(el))
      const cur = this.$refs[`thumb-${this.page}`]
      const el = Array.isArray(cur) ? cur[0] : cur
      if (el) el.scrollIntoView({ block: 'center' })
    },

    // ---- bookmarks & highlights
    pageOf(a) {
      const m = /^(?:page|pdf):(\d+)/.exec(a.cfi || '')
      return m ? Number(m[1]) : Math.round((a.fraction || 0) * this.pageCount)
    },
    async toggleBookmark() {
      await this.$hapticsImpact()
      const cfi = `page:${this.page}`
      const existing = this.bookmarks.filter((b) => b.cfi === cfi)
      if (existing.length) {
        for (const b of existing) await this.removeAnnotation(b.id)
        return
      }
      const text = await this.api.pageText(this.page)
      await this.addAnnotation({ type: 'bookmark', cfi, fraction: (this.page + 1) / Math.max(1, this.pageCount), text, chapter: `Page ${this.page + 1}` })
    },
    goToAnnotation(a) {
      this.panel = null
      if (a.type === 'highlight') this.api.reveal(a.cfi)
      else this.goPage(this.pageOf(a))
    },
    closeSelection() {
      this.selection = null
      this.api && this.api.clearSelection()
    },
    async highlightSelection(color) {
      const s = this.selection
      if (!s || !s.anchor) return
      await this.addAnnotation({ type: 'highlight', cfi: s.anchor, text: s.text, color, fraction: (s.page + 1) / Math.max(1, this.pageCount), chapter: `Page ${s.page + 1}` })
      this.closeSelection()
    },
    async noteSelection() {
      const s = this.selection
      if (!s || !s.anchor) return
      const rec = await this.addAnnotation({ type: 'highlight', cfi: s.anchor, text: s.text, color: 'yellow', fraction: (s.page + 1) / Math.max(1, this.pageCount), chapter: `Page ${s.page + 1}` })
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
    revealResult(r) {
      this.panel = null
      this.api.reveal(r.cfi)
    },

    // ---- read-along hooks (readerCommon)
    raSetTranscript(lines, opts) {
      this.api.setReadAlong(this.readAlongMode, this.settings.readAlongTurnPages !== false)
      this.api.setTranscript(lines, opts)
    },
    raClear() {
      this.api && this.api.setReadAlong('off')
    },
    raSetTime(t) {
      this.api.setPlaybackTime(t)
    },
    applyReadAlongSetting() {
      this.api && this.api.setReadAlong(this.readAlongMode, this.settings.readAlongTurnPages !== false)
      this.prepareReadAlong()
    },
    onResize() {
      this.wide = window.innerWidth >= 720
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    if (this.thumbObserver) this.thumbObserver.disconnect()
  }
}
</script>

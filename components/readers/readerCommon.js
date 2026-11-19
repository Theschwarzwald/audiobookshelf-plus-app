import { AbsAudioPlayer } from '@/plugins/capacitor'
import { Transcriber } from '@/plugins/transcriber'
import { Clipboard } from '@capacitor/clipboard'
import { Dialog } from '@capacitor/dialog'
import { palette, themeKey, themeForApp, withCoverAccent } from './readerThemes'

const CACHE = 'abs-ebooks-v1'

/**
 * Shared by the e-book reader (FoliateReader) and the page reader for PDFs and comics (PageReader):
 * which item this is (server / downloaded), loading the file (downloaded copy, else the server with an
 * offline cache), progress that syncs through Audiobookshelf (and waits while offline), bookmarks and
 * highlights from the offline-first reader store, read-along with the audiobook, fullscreen.
 *
 * A reader implements: raSetTranscript(lines), raClear(), raSetTime(t), raSelectionTime().
 */
export default {
  props: {
    url: String,
    libraryItem: { type: Object, default: () => {} },
    isLocal: Boolean,
    keepProgress: Boolean,
    showingToolbar: Boolean,
    /** Read along: the bars fade out (instead of sliding away) while the audio plays */
    fadeBars: Boolean,
    /** Read along: words are looked up only in reading mode (audiobook put aside) */
    lookupAllowed: { type: Boolean, default: true },
    fileName: String,
    format: String,
    fileId: String
  },
  data() {
    return {
      settings: {},
      loading: true,
      loadingText: 'Opening book…',
      error: null,
      panel: null,
      selection: null,
      editing: null,
      fullscreen: false,
      readAlongState: 'off',
      readAlongMatched: 0,
      // the narration is somewhere the book doesn't have (improvised, or not in this edition)
      raOffBook: false,
      readAlongTimer: null,
      transcriptLoadedFor: null,
      saveTimer: null
    }
  },
  computed: {
    /** the phone's light / dark setting, for books */
    phoneReaderTheme() {
      return this.$store.getters['device/readerTheme']
    },
    p() {
      // the book's cover colour for buttons and accents (like the player's gradient)
      return withCoverAccent(palette(this.settings.theme), this.$store.state.readerCoverRgb || this.$store.state.coverAccentRgb)
    },
    /** What this device can spend right now (store/device.js) */
    perf() {
      return this.$store.getters['device/perf']
    },
    fold() {
      return this.$store.state.device.fold || { posture: 'none' }
    },
    /** Foldable opened like a book, or half-open on a table */
    bookPosture() {
      return this.fold.posture === 'book' && !!this.fold.hinge
    },
    tabletopPosture() {
      return this.fold.posture === 'tabletop' && !!this.fold.hinge
    },
    /** px width of the hinge to keep pages off of (book posture) */
    hingeGap() {
      return this.bookPosture && this.fold.separating !== false ? Math.round(this.fold.hinge.width || 0) || 24 : 0
    },
    /** Tabletop: the book in the top half, the controls in the bottom half */
    frameStyle() {
      if (this.tabletopPosture) return { height: `${Math.round(this.fold.hinge.top)}px` }
      const top = this.$store.state.readerBookMode ? 0 : this.$store.state.readerTopInset || 0
      return { top: `${top}px`, height: `calc(100% - ${this.bottomOffset + (this.statusLineHeight || 0) + top}px)` }
    },
    barsTop() {
      return this.tabletopPosture ? Math.round(this.fold.hinge.top + (this.fold.hinge.height || 0)) : null
    },
    isPlayerOpen() {
      return this.$store.getters['getIsPlayerOpen'] && !this.$store.state.readerBookMode
    },
    /** Read along with the player opened: the book stops above its controls (like Lyrics / Karaoke) */
    playerOverBookInset() {
      const st = this.$store.state
      return st.playerIsFullscreen && st.showReader && !st.readerBookMode && this.readAlongMode !== 'off' ? st.playerControlsInset || 0 : 0
    },
    bottomOffset() {
      if (this.playerOverBookInset) return 0 // the whole reader already stops above the controls
      return this.isPlayerOpen ? 120 : 0
    },
    online() {
      return !!(this.$store.state.user.user && this.$store.state.networkConnected !== false)
    },
    localLibraryItem() {
      if (this.isLocal) return this.libraryItem
      return this.libraryItem.localLibraryItem || null
    },
    localLibraryItemId() {
      return this.localLibraryItem ? this.localLibraryItem.id : null
    },
    serverLibraryItemId() {
      if (!this.isLocal) return this.libraryItem.id
      if (!this.libraryItem.serverAddress || !this.libraryItem.libraryItemId) return null
      if (this.$store.getters['user/getServerAddress'] === this.libraryItem.serverAddress) return this.libraryItem.libraryItemId
      return null
    },
    /** annotations live under the server id when there is one, so every device shares them */
    itemKey() {
      return this.serverLibraryItemId || this.localLibraryItemId || this.libraryItem.id
    },
    bookmarks() {
      return this.$store.getters['reader/bookmarksFor'](this.itemKey)
    },
    highlights() {
      return this.$store.getters['reader/highlightsFor'](this.itemKey)
    },
    pendingCount() {
      return this.$store.getters['reader/pendingFor'](this.itemKey)
    },
    /** progress: whichever is newest of the phone's copy, the server's, and one still waiting to be sent */
    savedProgress() {
      // Opened from the Notebook: start at that bookmark / highlight (once)
      const jump = this.$store.state.reader.jump
      if (jump && jump.key === this.itemKey && jump.location) return { ebookLocation: jump.location, ebookProgress: jump.fraction || 0, lastUpdate: Date.now() }
      if (!this.keepProgress) return null
      const local = this.localLibraryItemId ? this.$store.getters['globals/getLocalMediaProgressById'](this.localLibraryItemId) : null
      const server = this.serverLibraryItemId ? this.$store.getters['user/getUserMediaProgress'](this.serverLibraryItemId) : null
      const queued = this.serverLibraryItemId ? this.$store.state.reader.progress[this.serverLibraryItemId] : null
      const all = [local, server, queued].filter((x) => x && x.ebookLocation)
      all.sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0))
      return all[0] || null
    },
    hasAudio() {
      const m = this.libraryItem && this.libraryItem.media
      return !!(m && ((m.tracks && m.tracks.length) || (m.audioFiles && m.audioFiles.length) || m.numTracks))
    },
    transcriptKey() {
      return this.serverLibraryItemId || this.localLibraryItemId
    },
    readAlongMode() {
      return this.settings.readAlong || 'off'
    },
    readAlongAvailable() {
      return this.hasAudio && this.readAlongState !== 'unavailable'
    },
    readAlongLabel() {
      if (this.readAlongMode === 'off') return 'Read along: off'
      if (this.readAlongState === 'aligning') return 'Lining up text with narration…'
      if (this.raOffBook && this.readAlongState === 'ready') return 'Narration differs from the book here · picks up again'
      if (this.readAlongState === 'no-transcript') return 'Transcribe to read along'
      // reading along normally: no chip (only the messages above, which say something needs attention)
      return null
    },
    isThisItemSession() {
      const s = this.$store.state.currentPlaybackSession
      if (!s) return false
      if (this.serverLibraryItemId && s.libraryItemId === this.serverLibraryItemId) return true
      return !!(this.localLibraryItemId && s.localLibraryItem && s.localLibraryItem.id === this.localLibraryItemId)
    },
    isThisItemPlaying() {
      return this.isThisItemSession && this.$store.state.playerIsPlaying
    },
    language() {
      return (this.bookLanguage || (this.libraryItem.media && this.libraryItem.media.metadata && this.libraryItem.media.metadata.language) || '').toString()
    }
  },
  methods: {
    /** The book file: downloaded copy, else the server (cached so it opens offline next time) */
    async fetchBook() {
      const cacheKey = `/ebook-cache/${this.serverLibraryItemId || this.libraryItem.id}/${this.fileId || 'main'}`
      if (this.isLocal || (this.url && /^(https?:\/\/localhost|capacitor:|file:|_capacitor)/.test(this.url))) {
        const res = await fetch(this.url)
        if (!res.ok) throw new Error(`Couldn't read the downloaded file (${res.status})`)
        return res.blob()
      }
      const cache = window.caches ? await window.caches.open(CACHE).catch(() => null) : null
      if (!this.online && cache) {
        const hit = await cache.match(cacheKey)
        if (hit) return hit.blob()
        throw new Error("You're offline and this book isn't downloaded.")
      }
      this.loadingText = 'Loading from your server…'
      try {
        const blob = await this.$axios.$get(this.url, { responseType: 'blob' })
        if (cache) {
          cache.put(cacheKey, new Response(blob)).catch(() => {})
          cache.keys().then((keys) => keys.slice(0, Math.max(0, keys.length - 25)).forEach((k) => cache.delete(k)))
        }
        return blob
      } catch (e) {
        const hit = cache && (await cache.match(cacheKey))
        if (hit) return hit.blob()
        throw new Error(`Couldn't download the book (${e.message})`)
      }
    },
    loadSettings() {
      let s = {}
      try {
        s = JSON.parse(localStorage.getItem('ereaderSettings') || '{}')
      } catch (e) {}
      // Until a reader theme is picked, match the app (e-ink on e-ink readers, OLED black on OLED screens…)
      const deviceTheme = themeForApp(this.$store.getters['device/readerTheme'])
      this.settings = { theme: deviceTheme, font: 'serif', fontScale: 100, lineSpacing: 140, flow: 'paginated', spread: 'auto', margin: 6, justify: true, hyphenate: true, textStroke: 0, readAlong: 'off', readAlongTurnPages: true, turnAnimation: 'curl', turnDirection: 'follow', ...s }
      // the page follows the device's light / dark setting (and e-ink / OLED), like the rest of the app
      this.settings.theme = deviceTheme
    },
    persistSettings(changes) {
      this.settings = { ...this.settings, ...changes }
      try {
        const stored = JSON.parse(localStorage.getItem('ereaderSettings') || '{}')
        localStorage.setItem('ereaderSettings', JSON.stringify({ ...stored, ...changes }))
      } catch (e) {}
      this.$emit('settingsChanged', this.settings)
    },

    // ---- progress
    scheduleSave(payload) {
      if (!this.keepProgress || !payload || !payload.ebookLocation) return
      clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => this.saveProgress(payload), 1500)
    },
    async saveProgress(payload) {
      payload = { ebookLocation: payload.ebookLocation, ebookProgress: Math.max(0, Math.min(1, payload.ebookProgress || 0)) }
      if (this.localLibraryItemId) {
        try {
          const res = await this.$db.updateLocalEbookProgress({ localLibraryItemId: this.localLibraryItemId, ...payload })
          if (res && res.localMediaProgress) this.$store.commit('globals/updateLocalMediaProgress', res.localMediaProgress)
        } catch (e) {
          console.error('[Reader] local progress', e)
        }
      }
      if (this.serverLibraryItemId) this.$store.dispatch('reader/saveProgress', { serverLibraryItemId: this.serverLibraryItemId, ...payload })
    },

    // ---- bookmarks & highlights
    async addAnnotation(record) {
      // The book's title and author go with it, so the Notebook can list it without looking it up
      const md = (this.libraryItem && this.libraryItem.media && this.libraryItem.media.metadata) || {}
      const extra = record.bookTitle ? {} : { bookTitle: md.title || '', bookAuthor: md.authorName || (md.authors || []).map((a) => a.name).join(', ') }
      return this.$store.dispatch('reader/saveAnnotation', { key: this.itemKey, record: { ...extra, ...record } })
    },
    async removeAnnotation(id) {
      return this.$store.dispatch('reader/removeAnnotation', { key: this.itemKey, id })
    },
    editAnnotation(a) {
      this.selection = null
      this.panel = null
      this.editing = { ...a, note: a.note || '' }
    },
    async saveEditing({ color, note }) {
      const prev = this.$store.state.reader.books[this.itemKey].records[this.editing.id]
      await this.addAnnotation({ ...prev, color, note })
      this.editing = null
    },
    async deleteEditing() {
      await this.removeAnnotation(this.editing.id)
      this.editing = null
    },
    async copyText(text) {
      await Clipboard.write({ string: text })
      this.$toast.success('Copied')
    },

    /** Guided tour, the first time a reader opens (bars shown so their buttons can be pointed at) */
    startTour(screen) {
      const ob = this.$store.state.onboarding
      if (!ob.toursEnabled || ob.toursSeen[screen]) return
      this.$emit('showToolbar')
      setTimeout(() => this.$store.dispatch('onboarding/maybeTour', screen), 500)
    },

    // ---- desktop mode: keyboard (keys pressed in the book come here too)
    onKey(k) {
      if (this.$store.state.onboarding.activeTour) return
      if (this.editing || (this.panel && this.panel !== 'sidebar' && k.key !== 'Escape')) return
      const key = k.key
      if (key === 'Escape') {
        if (this.selection) return this.closeSelection()
        if (this.editing) return (this.editing = null)
        if (this.panel) return (this.panel = null)
        if (this.fullscreen) return this.toggleFullscreen()
        return this.$emit('close')
      }
      if (this.panel) return
      const rtl = this.view && this.view.rtl
      if (key === 'ArrowRight') return rtl ? this.prev() : this.next()
      if (key === 'ArrowLeft') return rtl ? this.next() : this.prev()
      if (key === 'PageDown' || (key === ' ' && !k.shift) || key === 'j') return this.next()
      if (key === 'PageUp' || (key === ' ' && k.shift) || key === 'k') return this.prev()
      if (key === 'Home' && this.goFirst) return this.goFirst()
      if (key === 'End' && this.goLast) return this.goLast()
      if ((key === 'f' && k.ctrl) || key === '/') return this.openPanel('search')
      if (key === 'f' || key === 'F11') return this.toggleFullscreen()
      if (key === 'b') return this.toggleBookmark()
      if (key === 't' || key === 'c') return this.openPanel(this.contentsPanel || 'contents')
      if ((key === '+' || key === '=') && this.zoomIn) return this.zoomIn(k)
      if ((key === '-' || key === '_') && this.zoomOut) return this.zoomOut(k)
      if (key === 'v' && this.toggleViewer) return this.toggleViewer()
    },
    onWindowKey(e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      this.onKey({ key: e.key, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey })
    },

    // ---- fullscreen (hides the status bar; the bars come back with a tap in the middle)
    toggleFullscreen() {
      this.fullscreen = !this.fullscreen
      this.$emit('fullscreen', this.fullscreen)
      if (this.fullscreen) this.$emit('hideToolbar')
    },

    // ---- read-along
    /** Transcription ⋮ → Re-align read along: match this book to the narration again from scratch */
    onRealign(d) {
      if (!d || d.key !== this.transcriptKey) return
      this.transcriptLoadedFor = null
      this.prepareReadAlong({ fresh: true })
    },
    async prepareReadAlong(opts = {}) {
      if (!this.hasAudio) return
      if (this.readAlongMode === 'off') return this.raClear()
      // after a Book analysis: line the book up with the narration from scratch the first time it opens
      try {
        const fk = `absplus-ra-fresh:${this.transcriptKey}:reader`
        if (localStorage.getItem(fk)) {
          localStorage.removeItem(fk)
          opts = { ...opts, fresh: true }
        }
      } catch (e) {}
      if (!opts.fresh && this.transcriptLoadedFor === this.transcriptKey && this.readAlongState !== 'no-transcript') return
      try {
        const st = await Transcriber.prepare(this.transcriptKey)
        if (!st || st.status === 'none') {
          this.readAlongState = 'no-transcript'
          return
        }
        const res = await Transcriber.getTranscript({ key: this.transcriptKey, fromIndex: 0 })
        const lines = (res.lines || []).slice().sort((a, b) => a.s - b.s)
        if (!lines.length) {
          this.readAlongState = 'no-transcript'
          return
        }
        this.transcriptLoadedFor = this.transcriptKey
        this.raSetTranscript(lines, opts.fresh ? { fresh: true } : undefined)
      } catch (e) {
        this.readAlongState = 'no-transcript'
      }
    },
    onReadAlongStatus(d) {
      if (d.state === 'unavailable') this.readAlongState = d.reason === 'no-transcript' ? 'no-transcript' : 'unavailable'
      else this.readAlongState = d.state
      if (d.state === 'ready') {
        this.raJumpToNarration()
        this.raVaryNote()
      }
      if (d.matched) this.readAlongMatched = d.matched
      if (d.state === 'unavailable' && d.reason === 'no-match') this.$toast.info("Read along: the narration doesn't match this book's text closely enough.")
    },
    /** No transcript yet: offer to make one (the Transcription screen, where the model and server / phone are picked) */
    async offerTranscribe() {
      const { value } = await Dialog.confirm({
        title: 'Transcribe this audiobook?',
        message: 'Read along follows the narration word by word using a transcript, and this book has none yet. Transcribe it now? It runs in the background on your server (or on this phone if you choose), and read along starts working as soon as the first part is done.',
        okButtonTitle: 'Transcribe',
        cancelButtonTitle: 'Not now'
      })
      if (!value) return
      const id = this.localLibraryItemId || this.serverLibraryItemId
      this.$store.commit('setShowReader', false)
      if (this.isThisItemSession) return this.$nextTick(() => this.$eventBus.$emit('open-transcription'))
      this.$eventBus.$emit('open-transcription', { pending: true })
      this.$eventBus.$emit('play-item', { libraryItemId: id, serverLibraryItemId: this.serverLibraryItemId, paused: true })
    },
    /** A tap on a red marker: what the narrator says there that the book doesn't have */
    raShowAdded(d) {
      const text = (d && d.text) || ''
      if (!text) return
      Dialog.alert({ title: 'Added in the audiobook', message: `The narrator says this here, but it isn't in the book:

“${text}”` }).catch(() => {})
    },
    /** Once per book: the book and the audiobook can differ in places */
    raVaryNote() {
      const k = `absplus-ra-vary:${this.itemKey || ''}`
      try {
        if (localStorage.getItem(k)) return
        localStorage.setItem(k, '1')
      } catch (e) {}
      this.$toast.info('The book may differ from the audiobook in places: narrators sometimes improvise, and editions can add or leave out lines. Read along pauses there and picks up again where they match.', { timeout: 9000 })
    },
    cycleReadAlong() {
      if (this.readAlongState === 'no-transcript') return this.offerTranscribe()
      const next = { off: 'line', line: 'word', word: 'off' }[this.readAlongMode]
      this.persistSettings({ readAlong: next })
      this.applyReadAlongSetting()
    },
    applyReadAlongSetting() {
      this.prepareReadAlong()
    },
    /** Opened from Transcription → Read along (or with the book loaded): go to the word being narrated */
    async raJumpToNarration() {
      const jump = this.$store.state.reader.jump
      if (jump && jump.key === this.itemKey && typeof jump.time === 'number') {
        this.$store.commit('reader/setJump', null)
        return this.raSetTime(jump.time)
      }
      if (!this.isThisItemSession) return
      try {
        const d = await AbsAudioPlayer.getCurrentTime()
        if (d && typeof d.value === 'number') this.raSetTime(d.value)
      } catch (e) {}
    },
    async tickReadAlong() {
      if (this.readAlongMode === 'off' || this.readAlongState !== 'ready' || !this.isThisItemPlaying) return
      try {
        const asked = performance.now()
        const d = await AbsAudioPlayer.getCurrentTime()
        if (d && typeof d.value === 'number') {
          this.raSetTime(d.value + (this.readAlongMode === 'word' ? 0.12 : 0) + this.raOffset()) // words a touch early, like Karaoke
          this._raAnchor = { t: d.value, at: (asked + performance.now()) / 2 }
          if (this.readAlongMode === 'word') this.raFrames()
        }
      } catch (e) {}
    },
    /** The highlight timing set in the Transcription menu (+ earlier, − later) */
    raOffset() {
      return this.$store.getters['device/timeShift'] || 0
    },
    /** Word read-along: follow the voice every frame between position checks (not on e-ink / low power) */
    raFrames() {
      if (this._raFrame) return
      const step = () => {
        this._raFrame = 0
        const a = this._raAnchor
        if (!a || this.readAlongMode !== 'word' || !this.isThisItemPlaying || this.perf.tier === 'low' || this.$store.getters['device/isEink'] || document.hidden) return
        const rate = (this.$store.state.user.settings && this.$store.state.user.settings.playbackRate) || 1
        this.raSetTime(a.t + Math.min(1.5, ((performance.now() - a.at) / 1000) * rate) + 0.12 + this.raOffset())
        this._raFrame = setTimeout(step, 80)
      }
      this._raFrame = setTimeout(step, 80) // ~12 a second, not every display frame: easier on the battery
    },
    /** Narration time of the page showing (null when read along isn't lined up) */
    async timeHere() {
      try {
        const t = this.api && this.api.timeHere ? await this.api.timeHere() : null
        return typeof t === 'number' && isFinite(t) ? t : null
      } catch (e) {
        return null
      }
    },
    /** Reading mode → audiobook: ready at [t] (this page), not playing — the person presses play */
    async cueFrom(t) {
      const at = typeof t === 'number' && isFinite(t) ? t : null
      if (this.isThisItemSession) {
        if (at !== null) await AbsAudioPlayer.seek({ value: at })
        if (this.$store.state.playerIsPlaying) AbsAudioPlayer.pausePlayer()
      } else {
        this.$eventBus.$emit('play-item', { libraryItemId: this.localLibraryItemId || this.serverLibraryItemId, serverLibraryItemId: this.serverLibraryItemId, startTime: at !== null ? at : undefined, paused: true })
      }
      if (this.readAlongMode === 'off') {
        this.persistSettings({ readAlong: 'word' })
        this.applyReadAlongSetting()
      }
    },
    async playFrom(t) {
      if (t == null) return
      if (this.isThisItemSession) {
        await AbsAudioPlayer.seek({ value: t })
        if (!this.$store.state.playerIsPlaying) AbsAudioPlayer.playPlayer()
      } else {
        this.$eventBus.$emit('play-item', { libraryItemId: this.localLibraryItemId || this.serverLibraryItemId, serverLibraryItemId: this.serverLibraryItemId, startTime: t })
      }
      if (this.readAlongMode === 'off') {
        this.persistSettings({ readAlong: 'line' })
        this.applyReadAlongSetting()
      }
    }
  },
  watch: {
    // the phone switched light / dark while reading: the book follows
    phoneReaderTheme(t) {
      const theme = themeForApp(t)
      if (!this.settings || this.settings.theme === theme) return
      if (this.updateSettings) this.updateSettings({ theme })
      else this.settings = { ...this.settings, theme }
    },
    'perf.clockMs'() {
      clearInterval(this.readAlongTimer)
      this.readAlongTimer = setInterval(this.tickReadAlong, this.perf.clockMs)
    },
    // battery saver / heat / fold changes: tell the book
    perf() {
      this.onDeviceChange && this.onDeviceChange()
    },
    fold() {
      this.onDeviceChange && this.onDeviceChange()
      this.$nextTick(() => window.dispatchEvent(new Event('resize')))
    }
  },
  mounted() {
    // Follows the narration 4×/s normally; less often on slower phones, battery saver and e-ink
    this.readAlongTimer = setInterval(this.tickReadAlong, this.perf.clockMs)
    window.addEventListener('keydown', this.onWindowKey)
    this.$eventBus.$on('readalong-realign', this.onRealign)
  },
  beforeDestroy() {
    this.$eventBus.$off('readalong-realign', this.onRealign)
    window.removeEventListener('keydown', this.onWindowKey)
    clearInterval(this.readAlongTimer)
    if (this._raFrame) clearTimeout(this._raFrame)
    clearTimeout(this.saveTimer)
    if (this.fullscreen) this.$emit('fullscreen', false)
  }
}

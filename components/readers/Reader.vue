<template>
  <div v-if="show" :data-theme="ereaderTheme" class="group fixed top-0 left-0 right-0 layout-wrapper w-full z-40 pt-8 data-[theme=black]:bg-black data-[theme=black]:text-white data-[theme=dark]:bg-[#232323] data-[theme=dark]:text-white data-[theme=light]:bg-white data-[theme=light]:text-black" :class="{ 'reader-player-open': isPlayerOpen }" :style="playerOverBook ? { zIndex: 55, bottom: $store.state.playerControlsInset + 'px' } : null">
    <!-- toolbar -->
    <div v-if="!ownsBars" class="w-full px-2 fixed top-0 left-0 z-30 transition-transform bg-bg text-fg" :class="`${showingToolbar ? 'translate-y-0' : '-translate-y-36'} ${isIos ? 'pt-14 h-36' : 'pt-10 h-32'}`" :style="{ boxShadow: showingToolbar ? '0px 8px 8px #11111155' : '' }" @touchstart.stop @mousedown.stop @touchend.stop @mouseup.stop>
      <div class="flex items-center mb-2">
        <button type="button" class="inline-flex mx-2" @click.stop="show = false">
          <span class="material-symbols text-3xl text-fg">chevron_left</span>
        </button>
        <div class="flex-grow" />
        <button v-if="isFoliate" type="button" class="inline-flex mx-2" @click.stop="openReaderPanel('search')">
          <span class="material-symbols text-2xl text-fg">search</span>
        </button>
        <button v-if="isComic || isEpub || isFoliate" type="button" class="inline-flex mx-2" @click.stop="clickTOCBtn">
          <span class="material-symbols text-2xl text-fg">format_list_bulleted</span>
        </button>
        <button v-if="isEpub || isFoliate" type="button" class="inline-flex mx-2" @click.stop="clickSettingsBtn">
          <span class="material-symbols text-2xl text-fg">settings</span>
        </button>
        <button v-if="comicHasMetadata" type="button" class="inline-flex mx-2" @click.stop="clickMetadataBtn">
          <span class="material-symbols text-2xl text-fg">more</span>
        </button>
      </div>

      <p class="text-center truncate">{{ title }}</p>
    </div>

    <!-- ereader -->
    <component
      v-if="readerComponentName"
      ref="readerComponent"
      :is="readerComponentName"
      :url="ebookUrl"
      :library-item="selectedLibraryItem"
      :is-local="isLocal"
      :keep-progress="keepProgress"
      :showing-toolbar="showingToolbar"
      :fade-bars="barsFade"
      :lookup-allowed="!readAlongOn || bookMode"
      :file-name="ebookFileName"
      :format="ebookFormat"
      :file-id="ebookFileId || ''"
      @touchstart="touchstart"
      @touchend="touchend"
      @loaded="readerLoaded"
      @hook:mounted="readerMounted"
      @toggleToolbar="toggleToolbar"
      @hideToolbar="onReaderHide"
      @showToolbar="showToolbar"
      @settingsChanged="(s) => (ereaderSettings = { ...ereaderSettings, ...s })"
      @openSettings="clickSettingsBtn"
      @close="onBarsClose"
      @fullscreen="setFullscreen"
    />

    <!-- Read along, audio playing: the screen lock button, in the place and size of the read button that replaces it when paused -->
    <button v-if="showLockBtn" class="reader-bookbtn fixed right-3 z-50 rounded-full shadow-lg flex items-center justify-center" :style="{ bottom: isPlayerOpen ? '136px' : '16px', ...raLockStyle }" aria-label="Lock the screen" title="Lock the screen" @click.stop="$eventBus.$emit('screen-lock')">
      <span class="material-symbols fill text-[26px]">lock</span>
    </button>

    <!-- Read along, audio paused: put the audiobook aside to read (bars, contents, dictionary) — like the Transcription panel -->
    <button v-if="showBookBtn" data-tour="ra-book" class="reader-bookbtn fixed right-3 z-50 rounded-full shadow-lg flex items-center justify-center" :style="{ bottom: isPlayerOpen ? '136px' : '16px', ...raLockStyle }" aria-label="Read the book without the audiobook" title="Read the book without the audiobook" @click.stop="bookMode = true">
      <span class="material-symbols text-[26px]">auto_stories</span>
    </button>

    <!-- Reading mode: the audiobook button — listen from this page -->
    <button v-if="show && bookMode && itemHasAudio" class="reader-bookbtn fixed right-3 z-50 rounded-full shadow-lg flex items-center justify-center" :style="{ bottom: '120px', backgroundColor: appPalette.accent, color: appPalette.onAccent }" aria-label="Listen to the audiobook from this page" title="Listen from this page" @click.stop="onBarsClose">
      <span class="material-symbols fill text-[26px]">headphones</span>
    </button>

    <!-- Read along (following the narration): the Transcription panel's top bar, as in the web player —
         title, Lyrics / Karaoke / Read along, search. It stays on screen (the book starts below it); reading mode has its own bars. -->
    <div v-if="show && readAlongOn && !bookMode && raBarFromPanel" ref="raTop" class="ra-top fixed top-0 left-0 right-0 z-50" :style="raTopStyle" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop @click="raTopShow">
      <div class="flex items-center px-3 pt-3 pb-1" :style="{ paddingTop: 'max(var(--sat, env(safe-area-inset-top)), 12px)' }">
        <span class="material-symbols text-4xl cursor-pointer" aria-label="Close" @click.stop="show = false">keyboard_arrow_down</span>
        <div class="flex-grow min-w-0 text-center px-2">
          <p class="text-lg font-semibold leading-tight">Transcription</p>
          <app-marquee-text class="text-xs opacity-70" :text="title || ''" />
        </div>
        <!-- the same right-hand side as Lyrics and Karaoke (Aa's space, then ⋮, which opens their menu), so the title sits in the same place in every mode -->
        <span class="font-serif text-xl px-2 select-none invisible" aria-hidden="true">Aa</span>
        <span v-if="!screenLocked" class="material-symbols text-3xl cursor-pointer" aria-label="Menu" @click.stop="raMenu">more_vert</span>
      </div>
      <div v-if="!screenLocked" class="flex justify-center pb-2 relative">
        <div data-tour="ra-modes" class="flex rounded-full p-0.5" style="background: rgb(var(--color-primary))">
          <button v-for="m in raModes" :key="m.id" class="px-4 py-1 rounded-full text-sm font-semibold flex items-center" :style="m.id === 'readalong' ? { backgroundColor: 'rgb(var(--color-fg))', color: 'rgb(var(--color-bg))' } : {}" @click.stop="raSwitch(m.id)">
            <span class="material-symbols text-base mr-1">{{ m.icon }}</span>{{ m.label }}
          </button>
        </div>
      </div>
      <div v-if="!screenLocked" data-tour="ra-search" class="px-4 pb-2">
        <div class="flex items-center rounded-full px-3 h-10" style="background: rgb(var(--color-primary))" @click.stop="raSwitch('lyrics', true)">
          <span class="material-symbols text-xl opacity-70">search</span>
          <span class="px-2 text-base opacity-60">Search transcription</span>
        </div>
      </div>
    </div>

    <!-- table of contents modal -->
    <modals-fullscreen-modal v-model="showTOCModal" :theme="ereaderTheme">
      <div class="flex items-end justify-between h-20 px-4 pb-2">
        <h1 class="text-lg">{{ $strings.HeaderTableOfContents }}</h1>
        <button class="flex" @click.stop="showTOCModal = false">
          <span class="material-symbols">close</span>
        </button>
      </div>

      <!-- chapters list -->
      <div class="w-full overflow-y-auto overflow-x-hidden h-full max-h-[calc(100vh-85px)]">
        <div class="w-full h-full px-4">
          <ul>
            <li v-for="chapter in chapters" :key="chapter.id" class="py-1">
              <a :href="chapter.href" class="opacity-80 hover:opacity-100" @click.prevent="goToChapter(chapter.href)">{{ chapter.label }}</a>
              <ul v-if="chapter.subitems.length">
                <li v-for="subchapter in chapter.subitems" :key="subchapter.id" class="py-1 pl-4">
                  <a :href="subchapter.href" class="opacity-80 hover:opacity-100" @click.prevent="goToChapter(subchapter.href)">{{ subchapter.label }}</a>
                </li>
              </ul>
            </li>
          </ul>
          <div v-if="!chapters.length" class="flex h-full items-center justify-center">
            <p class="text-xl">{{ $strings.MessageNoChapters }}</p>
          </div>
        </div>
      </div>
    </modals-fullscreen-modal>

    <!-- ereader settings modal -->
    <modals-fullscreen-modal v-model="showSettingsModal" :theme="ereaderTheme" threeQuartersScreen>
      <div style="box-shadow: 0px -8px 8px #11111155">
        <div class="flex items-end justify-between h-14 px-4 pb-2 mb-6">
          <h1 class="text-lg">{{ $strings.HeaderEreaderSettings }}</h1>
          <button class="flex" @click="showSettingsModal = false">
            <span class="material-symbols">close</span>
          </button>
        </div>
        <div class="w-full overflow-y-auto overflow-x-hidden h-[calc(75vh-85px)] min-h-[320px] short:min-h-0 short:h-[calc(100vh-85px)]">
          <div class="w-full h-full px-4">
            <div class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelTheme }}</p>
              </div>
              <ui-toggle-btns v-if="!ownsBars" v-model="ereaderSettings.theme" name="theme" :items="themeItems" @input="settingsUpdated" />
              <select v-else v-model="ereaderSettings.theme" class="rounded-md px-3 py-2 bg-bg text-fg border border-border text-sm" @change="settingsUpdated">
                <option v-for="t in readerThemeItems" :key="t.value" :value="t.value">{{ t.text }}</option>
              </select>
            </div>
            <div v-if="!isPageReader" class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelFontFamily }}</p>
              </div>
              <ui-toggle-btns v-model="ereaderSettings.font" name="font" :items="fontItems" @input="settingsUpdated" />
            </div>
            <template v-if="ownsBars">
              <!-- Page turn animation and direction (from Grimmory Reader) -->
              <div class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Turn direction</p></div>
                <ui-toggle-btns v-model="ereaderSettings.turnDirection" name="turn-direction" :items="turnDirectionItems" @input="settingsUpdated" />
              </div>
              <div v-if="isFoliate" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Page turning</p></div>
                <ui-toggle-btns v-model="ereaderSettings.flow" name="flow" :items="flowItems" @input="settingsUpdated" />
              </div>
              <div v-if="isFoliate" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Margins</p></div>
                <ui-range-input v-model="ereaderSettings.margin" :min="0" :max="20" :step="1" input-width="180px" @input="settingsUpdated" />
              </div>
              <div v-if="isFoliate" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Justify text</p></div>
                <ui-toggle-btns v-model="ereaderSettings.justify" name="justify" :items="onOffToggleButtonItems" @input="settingsUpdated" />
              </div>
              <div v-if="isFoliate" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Hyphenation</p></div>
                <ui-toggle-btns v-model="ereaderSettings.hyphenate" name="hyphenate" :items="onOffToggleButtonItems" @input="settingsUpdated" />
              </div>
              <div v-if="itemHasAudio && !isComicFile" class="flex items-center mb-2">
                <div class="w-32"><p class="text-sm">Read along with the audiobook</p></div>
                <ui-toggle-btns v-model="ereaderSettings.readAlong" name="read-along" :items="readAlongItems" @input="settingsUpdated" />
              </div>
              <p v-if="itemHasAudio && !isComicFile" class="text-xs opacity-60 mb-4 pl-32">Highlights the line or each word as it's narrated. Needs a transcript of the audiobook.</p>
              <div v-if="itemHasAudio && !isComicFile && ereaderSettings.readAlong !== 'off'" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">Turn pages with the narration</p></div>
                <ui-toggle-btns v-model="ereaderSettings.readAlongTurnPages" name="read-along-turn" :items="onOffToggleButtonItems" @input="settingsUpdated" />
              </div>
              <div v-if="isPdfFile" class="flex items-center mb-6">
                <div class="w-32"><p class="text-sm">PDF viewer</p></div>
                <ui-toggle-btns v-model="ereaderSettings.pdfEngine" name="pdf-engine" :items="pdfEngineItems" @input="settingsUpdated" />
              </div>
              <div v-if="!isComicFile" class="flex items-center mb-6 cursor-pointer" @click.stop="openReaderPanel('dictionaries')">
                <div class="w-32"><p class="text-sm">Dictionaries</p></div>
                <p class="text-sm flex items-center opacity-80">Manage offline dictionaries<span class="material-symbols ml-1">chevron_right</span></p>
              </div>
            </template>
            <div v-if="!isPageReader" class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelFontScale }}</p>
              </div>
              <ui-range-input v-model="ereaderSettings.fontScale" :min="5" :max="300" :step="5" input-width="180px" @input="settingsUpdated" />
            </div>
            <div v-if="!isPageReader" class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelLineSpacing }}</p>
              </div>
              <ui-range-input v-model="ereaderSettings.lineSpacing" :min="100" :max="300" :step="5" input-width="180px" @input="settingsUpdated" />
            </div>
            <div v-if="!isPageReader" class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelFontBoldness }}</p>
              </div>
              <ui-range-input v-model="ereaderSettings.textStroke" :min="0" :max="300" :step="5" input-width="180px" @input="settingsUpdated" />
            </div>
            <div v-if="!isPageReader" class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelLayout }}</p>
              </div>
              <ui-toggle-btns v-model="ereaderSettings.spread" name="spread" :items="spreadItems" @input="settingsUpdated" />
            </div>
            <div class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelNavigateWithVolume }}</p>
              </div>
              <ui-toggle-btns v-model="ereaderSettings.navigateWithVolume" name="navigate-volume" :items="navigateWithVolumeItems" @input="settingsUpdated" />
            </div>
            <div class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelNavigateWithVolumeWhilePlaying }}</p>
              </div>
              <ui-toggle-btns v-model="ereaderSettings.navigateWithVolumeWhilePlaying" name="navigate-volume-playing" :items="onOffToggleButtonItems" @input="settingsUpdated" />
            </div>
            <div class="flex items-center mb-6">
              <div class="w-32">
                <p class="text-sm">{{ $strings.LabelKeepScreenAwake }}</p>
              </div>
              <ui-toggle-btns v-model="ereaderSettings.keepScreenAwake" name="keep-awake" :items="onOffToggleButtonItems" @input="settingsUpdated" />
            </div>
          </div>
        </div>
      </div>
    </modals-fullscreen-modal>
  </div>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { AbsAudioPlayer } from '@/plugins/capacitor'
import { VolumeButtons } from '@capacitor-community/volume-buttons'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { THEME_ITEMS, themeKey, themeForApp, palette, withCoverAccent } from './readerThemes'
import { buildShade, themeColors } from '@/plugins/coverShade'
import { einkButton, einkTint } from '@/plugins/einkButton'
import { getAverageColorFromCoverUrl } from '@/utils/coverAverageColor'

export default {
  data() {
    return {
      touchstartX: 0,
      touchstartY: 0,
      touchendX: 0,
      touchendY: 0,
      touchstartTime: 0,
      touchIdentifier: null,
      showingToolbar: false,
      // Read along: reading the book with the audiobook put aside (the bars and the dictionary)
      bookMode: false,
      raTopFaded: false,
      raTime: 0,
      barsFade: false,
      fadeTimer: null,
      showTOCModal: false,
      showSettingsModal: false,
      fullscreen: false,
      comicHasMetadata: false,
      chapters: [],
      isInittingWatchVolume: false,
      ereaderSettings: {
        theme: 'dark',
        font: 'serif',
        fontScale: 100,
        lineSpacing: 115,
        spread: 'auto',
        textStroke: 0,
        navigateWithVolume: 'enabled',
        navigateWithVolumeWhilePlaying: false,
        keepScreenAwake: false,
        flow: 'paginated',
        margin: 6,
        justify: true,
        hyphenate: true,
        readAlong: 'off',
        readAlongTurnPages: true,
        turnAnimation: 'curl',
        turnDirection: 'follow',
        pdfEngine: 'reader'
      }
    }
  },
  watch: {
    /** the open book's own cover colour for the reader's buttons (the player may hold another book, or none) */
    selectedLibraryItem: {
      immediate: true,
      async handler(item) {
        this.$store.commit('setReaderCoverRgb', null)
        if (!item) return
        const src = this.$store.getters['globals/getLibraryItemCoverSrc'](item, null, true)
        if (!src) return
        const avg = await getAverageColorFromCoverUrl(this, src).catch(() => null)
        if (avg && this.selectedLibraryItem === item) this.$store.commit('setReaderCoverRgb', avg.rgba)
      }
    },
    raTopOn(on) {
      if (on) this.$showHideStatusBar(true)
    },
    show: {
      handler(newVal) {
        if (newVal) {
          this.comicHasMetadata = false
          this.registerListeners()
          this.bookMode = false
          this.hideToolbar()
          // Read button: straight into reading mode (read along turned on so X can play from here)
          if (this.$store.state.ereaderReadMode) {
            this.$nextTick(() => {
              this.bookMode = true
            })
          }
        } else {
          this.bookMode = false
          this.unregisterListeners()
          this.$showHideStatusBar(true)
        }
      }
    },
    readAlongOn() {
      if (this.show) this.initKeepScreenAwake()
    },
    // Read along's top bar, opened while the audio is already playing: fade it after a moment too
    raTopOn: {
      immediate: true,
      handler(on) {
        this.measureRaTop()
        // first time in read along: show its top bar and the read-mode button
        if (on) setTimeout(() => this.$store.dispatch('onboarding/maybeTour', 'reader-readalong'), 1500)
      }
    },
    // Read along: no bars while it follows the narration; pausing shows the book button, playing again
    // leaves reading mode
    playerPlaying(playing) {
      if (!this.show || !this.readAlongOn) return
      // the top bar: fades a moment after the audio starts, back when it pauses
      if (playing) {
        this.bookMode = false
        this.hideToolbar(true)
      }
    },
    ownsTransport: {
      immediate: true,
      handler(on) {
        this.$store.commit('setReaderOwnsTransport', on)
        clearInterval(this.raTimer)
        if (on) {
          this.raTick()
          this.raTimer = setInterval(this.raTick, 1000)
        }
      }
    },
    bookMode(on) {
      this.$store.commit('setReaderBookMode', on)
      if (on) this.showToolbar()
      else this.hideToolbar()
    },
    isPlayerOpen(newVal, oldVal) {
      // Closed player
      if (!newVal && oldVal) {
        this.initWatchVolume()
      }
    }
  },
  computed: {
    show: {
      get() {
        return this.$store.state.showReader
      },
      set(val) {
        this.$store.commit('setShowReader', val)
      }
    },
    isIos() {
      return this.$platform === 'ios'
    },
    title() {
      return this.mediaMetadata.title || 'No Title'
    },
    selectedLibraryItem() {
      return this.$store.state.selectedLibraryItem
    },
    media() {
      return this.selectedLibraryItem?.media || null
    },
    mediaMetadata() {
      return this.media?.metadata || {}
    },
    ereaderTheme() {
      if (this.ownsBars) return ['light', 'sepia', 'eink', 'eink-color'].includes(this.ereaderSettings.theme) ? 'light' : 'black'
      if (this.isEpub) return this.ereaderSettings.theme
      return document.documentElement.dataset.theme || 'dark'
    },
    spreadItems() {
      return [
        {
          text: this.$strings.LabelLayoutSinglePage,
          value: 'none'
        },
        {
          text: this.$strings.LabelLayoutAuto,
          value: 'auto'
        }
      ]
    },
    navigateWithVolumeItems() {
      return [
        {
          text: this.$strings.LabelOn,
          value: 'enabled'
        },
        {
          text: this.$strings.LabelNavigateWithVolumeMirrored,
          value: 'mirrored'
        },
        {
          text: this.$strings.LabelOff,
          value: 'none'
        }
      ]
    },
    onOffToggleButtonItems() {
      return [
        {
          text: this.$strings.LabelOn,
          value: true
        },
        {
          text: this.$strings.LabelOff,
          value: false
        }
      ]
    },
    themeItems() {
      return [
        {
          text: this.$strings.LabelThemeBlack,
          value: 'black'
        },
        {
          text: this.$strings.LabelThemeDark,
          value: 'dark'
        },
        {
          text: this.$strings.LabelThemeLight,
          value: 'light'
        },
        ...(this.isFoliate ? [{ text: 'Sepia', value: 'sepia' }] : [])
      ]
    },
    flowItems() {
      return [
        { text: 'Pages', value: 'paginated' },
        { text: 'Scroll', value: 'scrolled' }
      ]
    },
    readAlongItems() {
      return [
        { text: 'Off', value: 'off' },
        { text: 'Line', value: 'line' },
        { text: 'Word', value: 'word' }
      ]
    },
    pdfEngineItems() {
      return [
        { text: 'Reader', value: 'reader' },
        { text: 'Classic', value: 'classic' }
      ]
    },
    readerThemeItems() {
      return THEME_ITEMS
    },
    /** PDFs and comics: Grimmory-style page reader */
    isPageReader() {
      if (this.ebookFormat === 'pdf') return this.ereaderSettings.pdfEngine !== 'classic'
      return this.isComicFile
    },
    isComicFile() {
      return ['cbz', 'cbr', 'cb7', 'cbt', 'cbx'].includes(this.ebookFormat)
    },
    /** The e-book and page readers bring their own bars (Grimmory's layout) */
    ownsBars() {
      return this.isFoliate || this.isPageReader
    },
    /** EPUB, MOBI, AZW3, FB2, CBZ and PDF open in the full reader (foliate-js) */
    isFoliate() {
      const f = this.ebookFormat
      return ['epub', 'kepub', 'mobi', 'azw3', 'azw', 'prc', 'fb2', 'fbz', 'kf8'].includes(f)
    },
    isPdfFile() {
      return this.ebookFormat === 'pdf'
    },
    playerPlaying() {
      return !!this.$store.state.playerIsPlaying
    },
    readAlongOn() {
      return this.itemHasAudio && !!this.ereaderSettings.readAlong && this.ereaderSettings.readAlong !== 'off'
    },
    itemHasAudio() {
      const m = this.media
      return !!(m && ((m.tracks && m.tracks.length) || (m.audioFiles && m.audioFiles.length) || m.numTracks))
    },
    ebookFileName() {
      return (this.ebookFile && this.ebookFile.metadata && this.ebookFile.metadata.filename) || `book.${this.ebookFormat || 'epub'}`
    },
    turnAnimationItems() {
      return [
        { text: 'Page curl', value: 'curl' },
        { text: 'Slide', value: 'slide' },
        { text: 'Fade', value: 'fade' },
        { text: 'None', value: 'none' }
      ]
    },
    turnDirectionItems() {
      return [
        { text: 'Follow the book', value: 'follow' },
        { text: 'To the left', value: 'left' },
        { text: 'To the right', value: 'right' }
      ]
    },
    fontItems() {
      return [
        {
          text: this.$strings.LabelFontFamilySans,
          value: 'sans-serif'
        },
        {
          text: this.$strings.LabelFontFamilySerif,
          value: 'serif'
        }
      ]
    },
    readerComponentName() {
      if (this.isPageReader) return 'readers-page-reader'
      if (this.isFoliate) return 'readers-foliate-reader'
      if (this.ebookType === 'epub') return 'readers-epub-reader'
      else if (this.ebookType === 'mobi') return 'readers-mobi-reader'
      else if (this.ebookType === 'comic') return 'readers-comic-reader'
      else if (this.ebookType === 'pdf') return 'readers-pdf-reader'
      return null
    },
    ebookFile() {
      if (!this.media) return null
      // ebook file id is passed when reading a supplementary ebook
      if (this.ebookFileId) {
        return this.selectedLibraryItem.libraryFiles.find((lf) => lf.ino === this.ebookFileId)
      }
      return this.media.ebookFile
    },
    ebookFormat() {
      if (!this.ebookFile) return null
      // Use file extension for supplementary ebook
      if (!this.ebookFile.ebookFormat) {
        return this.ebookFile.metadata.ext.toLowerCase().slice(1)
      }
      return this.ebookFile.ebookFormat
    },
    ebookType() {
      if (this.isMobi) return 'mobi'
      else if (this.isEpub) return 'epub'
      else if (this.isPdf) return 'pdf'
      else if (this.isComic) return 'comic'
      return null
    },
    isEpub() {
      return this.ebookFormat == 'epub'
    },
    isMobi() {
      return this.ebookFormat == 'mobi' || this.ebookFormat == 'azw3'
    },
    isPdf() {
      return this.ebookFormat == 'pdf'
    },
    isComic() {
      return this.ebookFormat == 'cbz' || this.ebookFormat == 'cbr'
    },
    isLocal() {
      return !!this.ebookFile?.isLocal || !!this.ebookFile?.localFileId
    },
    localContentUrl() {
      return this.ebookFile?.contentUrl
    },
    ebookUrl() {
      if (!this.ebookFile) return null
      if (this.localContentUrl) {
        return Capacitor.convertFileSrc(this.localContentUrl)
      }

      if (this.ebookFileId) {
        return `/api/items/${this.selectedLibraryItem.id}/ebook/${this.ebookFileId}`
      }
      return `/api/items/${this.selectedLibraryItem.id}/ebook`
    },
    isPlayerOpen() {
      return this.$store.getters['getIsPlayerOpen'] && !this.bookMode
    },
    /** Read along: the reader shows its own play / pause bar (the panel's style), not the mini player */
    /** Read along keeps the app's player bar (the same in every book); reading mode hides it */
    ownsTransport() {
      return false
    },
    // the app's theme colours, exactly like the Transcription panel's bar
    transportBg() {
      return 'rgb(var(--color-bg))'
    },
    transportFg() {
      return 'rgb(var(--color-fg))'
    },
    /** the same colours as the Transcription panel uses (its book button and dictionary card) */
    appPalette() {
      return withCoverAccent(palette(themeForApp(this.$store.getters['device/readerTheme'])), this.$store.state.readerCoverRgb || this.$store.state.coverAccentRgb)
    },
    readModeOpen() {
      return this.$store.state.ereaderReadMode
    },
    /** read along that came from the Transcription panel (not the Read button): it keeps the panel's top bar */
    raBarFromPanel() {
      return this.readAlongOn && this.$store.getters['getIsPlayerOpen']
    },
    /** Read along with the player opened: the book stays on screen above its controls, as in Lyrics / Karaoke */
    playerOverBook() {
      const st = this.$store.state
      return this.show && this.readAlongOn && !this.bookMode && st.playerIsFullscreen && st.playerControlsInset > 0
    },
    raTopOn() {
      return this.show && this.readAlongOn && !this.bookMode && this.raBarFromPanel
    },
    /** The top bar looks like the Transcription panel's: the cover's colour at the top, shading toward the page colour (plain page colour on e-ink) */
    raTopStyle() {
      const base = { color: 'rgb(var(--color-fg))', background: 'rgb(var(--color-bg))' }
      const theme = this.$store.getters['device/theme'] || ''
      const cover = this.$store.state.readerCoverRgb || this.$store.state.coverAccentRgb
      // colour e-ink: the same light band of the book's colour as Lyrics and Karaoke; black-and-white: plain
      if (theme.startsWith('eink-color') && cover) {
        const t = einkTint(cover)
        return t ? { ...base, background: t } : base
      }
      if (theme.startsWith('eink') || !cover) return base
      const c = themeColors()
      const sh = buildShade(cover, c.bg, c.fg)
      if (!sh) return base
      // the panel's gradient runs the whole screen; its top eighth or so is what sits behind this bar
      return { ...base, background: `linear-gradient(180deg, ${sh.top} 0%, ${sh.upper} 100%)` }
    },
    /** Like the panel's lock button: the cover's colour (plain outline on e-ink) */
    raLockStyle() {
      const theme = this.$store.getters['device/theme'] || ''
      const cover = this.$store.state.readerCoverRgb || this.$store.state.coverAccentRgb
      // colour e-ink: the cover's colour with a black outline, as in Lyrics and Karaoke
      if (theme.startsWith('eink-color') && cover) {
        const m = String(cover).match(/(\d+)\D+(\d+)\D+(\d+)/)
        const light = m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255 > 0.6 : false
        const b = einkButton(cover, light)
        if (b) return b
      }
      if (theme.startsWith('eink')) return { backgroundColor: 'rgb(var(--color-bg))', color: 'rgb(var(--color-fg))', border: '2px solid rgb(var(--color-fg))' }
      const p = this.appPalette
      return { backgroundColor: p.accent, color: p.onAccent, border: '1px solid rgba(255, 255, 255, 0.35)' }
    },
    raModes() {
      return [
        { id: 'lyrics', label: 'Lyrics', icon: 'lyrics' },
        { id: 'karaoke', label: 'Karaoke', icon: 'article' },
        { id: 'readalong', label: 'Read along', icon: 'menu_book' }
      ]
    },
    showLockBtn() {
      return this.show && this.readAlongOn && this.playerPlaying && !this.bookMode && !!this.readerComponentName
    },
    screenLocked() {
      return this.$store.state.screenLocked
    },
    showBookBtn() {
      return this.show && this.readAlongOn && !this.playerPlaying && !this.bookMode && !!this.readerComponentName
    },
    keepProgress() {
      return this.$store.state.ereaderKeepProgress
    },
    ebookFileId() {
      return this.$store.state.ereaderFileId
    }
  },
  methods: {
    settingsUpdated() {
      this.$refs.readerComponent?.updateSettings?.(this.ereaderSettings)
      localStorage.setItem('ereaderSettings', JSON.stringify(this.ereaderSettings))

      this.initWatchVolume()
      this.initKeepScreenAwake()
    },
    openReaderPanel(name) {
      this.showSettingsModal = false
      this.hideToolbar()
      this.$refs.readerComponent?.openPanel?.(name)
    },
    goToChapter(href) {
      this.showTOCModal = false
      this.$refs.readerComponent?.goToChapter(href)
    },
    readerMounted() {
      if (this.isEpub || this.ownsBars) {
        this.loadEreaderSettings()
      }
      // Read along: just the book until the book button (audio paused) puts the audiobook aside
      if (this.readAlongOn) this.hideToolbar()
    },
    async raTick() {
      try {
        const d = await AbsAudioPlayer.getCurrentTime()
        if (d && typeof d.value === 'number') this.raTime = d.value
      } catch (e) {}
    },
    async raPlayPause() {
      try {
        await AbsAudioPlayer.playPause()
      } catch (e) {}
      setTimeout(this.raTick, 200)
    },
    raJump(dir) {
      if (dir > 0) AbsAudioPlayer.seekForward({ value: this.$store.getters['getJumpForwardTime'] })
      else AbsAudioPlayer.seekBackward({ value: this.$store.getters['getJumpBackwardsTime'] })
      setTimeout(this.raTick, 250)
    },
    /** The bars' ✕: in reading mode it switches to listening (from the page showing); otherwise it closes */
    /** the top bar's Lyrics / Karaoke / search: back to the Transcription panel in that mode */
    raSwitch(mode, search) {
      if (mode === 'readalong') return
      this.show = false
      this.$nextTick(() => this.$eventBus.$emit('open-transcription', { mode, search: !!search }))
    },
    /** ⋮: back to the Transcription panel with its menu open */
    raMenu() {
      this.show = false
      this.$nextTick(() => this.$eventBus.$emit('open-transcription', { menu: true }))
    },
    raTopShow() {
      this.raTopFaded = false
    },
    /** How much room the top bar takes, so the book is laid out below it */
    measureRaTop() {
      this.$nextTick(() => {
        const el = this.$refs.raTop
        this.$store.commit('setReaderTopInset', this.raTopOn && el ? el.offsetHeight : 0)
      })
    },
    async onBarsClose() {
      if (!(this.bookMode && this.itemHasAudio)) {
        this.show = false
        return
      }
      const reader = this.$refs.readerComponent
      const t = reader && reader.timeHere ? await reader.timeHere() : null
      this.$store.state.ereaderReadMode = false
      this.bookMode = false
      // the audiobook is ready at this page; it starts when the person presses play
      if (reader && reader.cueFrom) return reader.cueFrom(t)
    },
    scheduleFade(ms) {
      clearTimeout(this.fadeTimer)
      this.fadeTimer = setTimeout(() => {
        if (this.show && this.readAlongOn && this.playerPlaying) this.hideToolbar(true)
      }, ms)
    },
    /** The reader asks to hide the bars (a page-turn tap): in Read along they stay while paused */
    onReaderHide() {
      // reading mode: a page turn lets the bars fade
      if (this.bookMode) return this.hideToolbar(true)
      this.hideToolbar()
    },
    readerLoaded(data) {
      if (this.isComic) {
        this.comicHasMetadata = data.hasMetadata
      }
    },
    clickMetadataBtn() {
      this.$refs.readerComponent?.clickShowInfoMenu()
    },
    clickTOCBtn() {
      this.hideToolbar()
      if (this.isPageReader) {
        this.$refs.readerComponent?.openPanel?.('sidebar')
      } else if (this.isFoliate) {
        this.$refs.readerComponent?.openPanel?.('contents')
      } else if (this.isComic) {
        this.$refs.readerComponent?.clickShowPageMenu?.()
      } else {
        this.chapters = this.$refs.readerComponent?.chapters || []
        this.showTOCModal = true
      }
    },
    clickSettingsBtn() {
      this.hideToolbar()
      this.showSettingsModal = true
    },
    next() {
      if (this.$refs.readerComponent && this.$refs.readerComponent.next) {
        this.$refs.readerComponent.next()
      }
    },
    prev() {
      if (this.$refs.readerComponent && this.$refs.readerComponent.prev) {
        this.$refs.readerComponent.prev()
      }
    },
    handleGesture() {
      // Touch must be less than 1s. Must be > 60px drag and X distance > Y distance
      const touchTimeMs = Date.now() - this.touchstartTime
      if (touchTimeMs >= 1000) {
        return
      }

      const touchDistanceX = Math.abs(this.touchendX - this.touchstartX)
      const touchDistanceY = Math.abs(this.touchendY - this.touchstartY)
      const touchDistance = Math.sqrt(Math.pow(this.touchstartX - this.touchendX, 2) + Math.pow(this.touchstartY - this.touchendY, 2))
      if (touchDistance < 30) {
        if (this.showSettingsModal) {
          this.showSettingsModal = false
        } else {
          this.toggleToolbar()
        }
        return
      }

      if (touchDistanceX < 60 || touchDistanceY > touchDistanceX) {
        return
      }
      this.hideToolbar()
      if (!this.isEpub && !this.ownsBars) {
        if (this.touchendX < this.touchstartX) {
          this.next()
        }
        if (this.touchendX > this.touchstartX) {
          this.prev()
        }
      }
    },
    showToolbar() {
      if (this.readAlongOn && !this.bookMode) return // following the narration: no bars
      clearTimeout(this.fadeTimer)
      // reading mode: the bars fade after a few quiet seconds (a tap in the middle brings them back)
      if (this.bookMode) {
        this.fadeTimer = setTimeout(() => this.show && this.bookMode && this.hideToolbar(true), 4000)
      }
      this.showingToolbar = true
      // Brought back by a tap while the audio plays: fades again after a moment
      if (this.show && this.readAlongOn && this.playerPlaying) this.scheduleFade(4000)
      if (!this.fullscreen) this.$showHideStatusBar(true)
    },
    setFullscreen(on) {
      this.fullscreen = on
      this.$showHideStatusBar(this.raTopOn || (!on && this.showingToolbar))
    },
    hideToolbar(fade) {
      this.barsFade = fade === true
      this.showingToolbar = false
      // Read along from the Transcription panel keeps the status bar, as Lyrics and Karaoke do, so the top bar
      // stays exactly where the panel's was
      this.$showHideStatusBar(this.raTopOn)
    },
    toggleToolbar() {
      if (this.showingToolbar) this.hideToolbar()
      else this.showToolbar()
    },
    touchstart(e) {
      // Ignore rapid touch
      if (this.touchstartTime && Date.now() - this.touchstartTime < 250) {
        return
      }

      this.touchstartX = e.touches[0].screenX
      this.touchstartY = e.touches[0].screenY
      this.touchstartTime = Date.now()
      this.touchIdentifier = e.touches[0].identifier
    },
    touchend(e) {
      if (this.touchIdentifier !== e.changedTouches[0].identifier) {
        return
      }

      this.touchendX = e.changedTouches[0].screenX
      this.touchendY = e.changedTouches[0].screenY
      this.handleGesture()
    },
    closeEvt() {
      this.show = false
    },
    loadEreaderSettings() {
      try {
        const settings = localStorage.getItem('ereaderSettings')
        if (settings) {
          const _ereaderSettings = JSON.parse(settings)
          for (const key in this.ereaderSettings) {
            if (_ereaderSettings[key] !== undefined) {
              this.ereaderSettings[key] = _ereaderSettings[key]
            }
          }
          // the reader follows the device's light / dark setting
          if (this.ownsBars) this.ereaderSettings.theme = themeForApp(this.$store.getters['device/readerTheme'])
          this.settingsUpdated()
        } else if (this.ownsBars) {
          this.ereaderSettings.theme = themeForApp(this.$store.getters['device/readerTheme'])
        }
      } catch (error) {
        console.error('Failed to load ereader settings', error)
      }
    },
    async initWatchVolume() {
      if (this.isInittingWatchVolume || !(this.isEpub || this.ownsBars)) return
      this.isInittingWatchVolume = true
      const isWatching = await VolumeButtons.isWatching()

      if (this.ereaderSettings.navigateWithVolume !== 'none' && (this.ereaderSettings.navigateWithVolumeWhilePlaying || !this.isPlayerOpen)) {
        if (!isWatching.value) {
          const options = {
            disableSystemVolumeHandler: true,
            suppressVolumeIndicator: true
          }
          await VolumeButtons.watchVolume(options, this.volumePressed)
        }
      } else if (isWatching.value) {
        await VolumeButtons.clearWatch().catch((error) => {
          console.error('Failed to clear volume watch', error)
        })
      }

      this.isInittingWatchVolume = false
    },
    async initKeepScreenAwake() {
      try {
        // on when asked for, and always while Read along follows the narration
        if (this.ereaderSettings.keepScreenAwake || this.readAlongOn || this.$store.state.playerIsPlaying) {
          await KeepAwake.keepAwake()
          console.log('Reader keep screen awake enabled')
        } else {
          await KeepAwake.allowSleep()
          console.log('Reader keep screen awake disabled')
        }
      } catch (error) {
        console.error('Failed to init keep screen awake', error)
      }
    },
    registerListeners() {
      this.$eventBus.$on('close-ebook', this.closeEvt)
      document.body.addEventListener('touchstart', this.touchstart)
      document.body.addEventListener('touchend', this.touchend)
      this.initWatchVolume()
      this.initKeepScreenAwake()
    },
    unregisterListeners() {
      this.$eventBus.$on('close-ebook', this.closeEvt)
      document.body.removeEventListener('touchstart', this.touchstart)
      document.body.removeEventListener('touchend', this.touchend)
      VolumeButtons.clearWatch().catch((error) => {
        console.error('Failed to clear volume watch', error)
      })
      if (!this.$store.state.playerIsPlaying)
        KeepAwake.allowSleep().catch((error) => {
          console.error('Failed to allow sleep', error)
        })
    },
    volumePressed(e) {
      if (this.ereaderSettings.navigateWithVolume == 'enabled') {
        if (e.direction == 'up') {
          this.prev()
        } else {
          this.next()
        }
      } else if (this.ereaderSettings.navigateWithVolume == 'mirrored') {
        if (e.direction == 'down') {
          this.prev()
        } else {
          this.next()
        }
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.raTimer)
    clearTimeout(this.fadeTimer)
    this.unregisterListeners()
  }
}
</script>

<style scoped>
.ra-top {
  transition: opacity 0.4s ease;
}
.ra-top-faded {
  opacity: 0;
}
.reader-bookbtn {
  width: 52px;
  height: 52px;
}
</style>

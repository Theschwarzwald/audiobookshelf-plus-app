<template>
  <!-- Main container - only shows when playback session exists, applies fullscreen/platform classes -->
  <div v-if="playbackSession" v-show="!(($store.state.readerBookMode || $store.state.readerOwnsTransport) && $store.state.showReader && !showFullscreen)" id="streamContainer" class="fixed top-0 left-0 layout-wrapper right-0 z-50 pointer-events-none" :class="{ fullscreen: showFullscreen, 'ios-player': $platform === 'ios', 'web-player': $platform === 'web' }">
    <!-- Fullscreen overlays: colored background and menu overlays -->
    <div v-if="showFullscreen" class="w-full h-full z-10 absolute top-0 left-0 pointer-events-auto" :style="{ backgroundColor: coverRgb }">
      <!-- Background gradient for player -->
      <div class="w-full h-full absolute top-0 left-0 pointer-events-none" style="background: var(--gradient-audio-player)" />

      <!-- Collapse button - minimizes player -->
      <div class="top-4 left-4 absolute cursor-pointer">
        <span class="material-symbols text-5xl" :class="{ 'text-black text-opacity-75': coverBgIsLight && theme !== 'black' }" @click="collapseFullscreen">keyboard_arrow_down</span>
      </div>

      <!-- Screen lock: dims, stays on, touches do nothing until unlocked -->
      <div class="top-5 absolute" :class="showCastBtn ? 'right-28' : 'right-16'">
        <button class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" :style="lockBtnStyle" aria-label="Lock the screen" @click.stop="$eventBus.$emit('screen-lock')">
          <span class="material-symbols fill text-xl">lock</span>
        </button>
      </div>

      <!-- Cast button - Chromecast toggle -->
      <div v-show="showCastBtn" class="top-6 right-16 absolute cursor-pointer">
        <span class="material-symbols text-3xl" :class="coverBgIsLight && theme !== 'black' ? 'text-black' : ''" @click="castClick">{{ isCasting ? 'cast_connected' : 'cast' }}</span>
      </div>

      <!-- Player options menu button -->
      <div class="top-6 right-4 absolute cursor-pointer">
        <span data-tour="pl-more" class="material-symbols text-3xl" :class="{ 'text-black text-opacity-75': coverBgIsLight && theme !== 'black' }" @click="showMoreMenuDialog = true">more_vert</span>
      </div>

      <!-- Playback method indicator (Direct/Local/Transcode) -->
      <p class="top-4 absolute left-0 right-0 mx-auto text-center uppercase tracking-widest text-opacity-75 z-50" :class="{ 'text-black text-opacity-75': coverBgIsLight && theme !== 'black' }" style="font-size: 10px">{{ isDirectPlayMethod ? $strings.LabelPlaybackDirect : isLocalPlayMethod ? $strings.LabelPlaybackLocal : $strings.LabelPlaybackTranscode }}</p>
    </div>

    <!-- Overall book progress bar -->
    <div v-if="playerSettings.useChapterTrack && playerSettings.useTotalTrack && showFullscreen" class="absolute total-track w-full z-30 px-6">
      <div class="flex">
        <p class="font-mono text-fg" style="font-size: 0.8rem">{{ currentTimePretty }}</p>
        <div class="flex-grow" />
        <p class="font-mono text-fg" style="font-size: 0.8rem">{{ totalTimeRemainingPretty }}</p>
      </div>
      <div class="w-full">
        <div class="h-1 w-full bg-track/50 relative rounded-full overflow-hidden">
          <div ref="totalReadyTrack" class="h-full bg-track-buffered absolute top-0 left-0 pointer-events-none rounded-full" />
          <div ref="totalBufferedTrack" class="h-full bg-track absolute top-0 left-0 pointer-events-none rounded-full" />
          <div ref="totalPlayedTrack" class="h-full bg-track-cursor absolute top-0 left-0 pointer-events-none rounded-full" />
        </div>
      </div>
    </div>

    <!-- Book cover wrapper  -->
    <div class="cover-wrapper absolute z-30 pointer-events-auto" @click="clickContainer">
      <div class="w-full h-full flex justify-center">
        <covers-book-cover v-if="libraryItem || localLibraryItemCoverSrc" ref="cover" :library-item="libraryItem" :download-cover="localLibraryItemCoverSrc" :width="bookCoverWidth" :book-cover-aspect-ratio="bookCoverAspectRatio" raw @imageLoaded="coverImageLoaded" />
      </div>

      <!-- Sync failed indicator - shows error icon if progress sync failed -->
      <div v-if="syncStatus === $constants.SyncStatus.FAILED" class="absolute top-0 left-0 w-full h-full flex items-center justify-center z-30" @click.stop="showSyncsFailedDialog">
        <span class="material-symbols text-error text-3xl">error</span>
      </div>
    </div>

    <!-- Title and author text -->
    <div class="title-author-texts absolute z-30 left-0 right-0 overflow-hidden" @click="clickTitleAndAuthor">
      <div ref="titlewrapper" key="abs-title-marquee" data-title-marquee class="overflow-hidden relative">
        <p class="title-text whitespace-nowrap"></p>
      </div>
      <p class="author-text text-fg text-opacity-75 truncate">{{ authorName }}</p>
    </div>

    <!-- Transcription preview card under the artwork (tap to open Transcription) -->
    <app-transcription-preview v-if="showFullscreen && showTranscriptionBtn && !showTranscription && !$store.state.showReader && transcriptionPreviewBox" class="absolute z-30 pointer-events-auto" :style="transcriptionPreviewBox.style" :compact="transcriptionPreviewBox.compact" :item-key="mediaId" :current-time="currentTime" :is-playing="isPlaying" :playback-rate="currentPlaybackRate" :cover-bg-is-light="cardOnLight" @open="openTranscription" />

    <div id="playerContent" class="playerContainer w-full z-20 absolute bottom-0 left-0 right-0 p-2 pointer-events-auto transition-all" :style="{ backgroundColor: showFullscreen ? '' : coverRgb }" @click="clickContainer">
      <!-- Top controls bar - fullscreen only: bookmarks, speed, sleep timer, chapters -->
      <div v-if="showFullscreen" class="absolute bottom-4 left-0 right-0 w-full pb-4 pt-2 mx-auto px-6" style="max-width: 414px">
        <div class="flex items-center justify-between pointer-events-auto">
          <!-- Bookmark: tap = this second, hold = the section you hold through (like Audible's Clip). Works offline. -->
          <app-bookmark-button v-if="!isPodcast && bookmarkItemId" data-tour="pl-bookmark" size="lg" :library-item-id="bookmarkItemId" :item-key="mediaId" :get-time="getPlayerTime" @edit="(bm) => $emit('editBookmark', bm)" />
          <!-- hidden for podcasts but still using this as a placeholder -->
          <span v-else class="material-symbols text-3xl text-white text-opacity-0">bookmark</span>

          <span data-tour="pl-speed" class="font-mono text-fg-muted cursor-pointer" style="font-size: 1.35rem" @click="$emit('selectPlaybackSpeed')">{{ currentPlaybackRate }}x</span>
          <svg v-if="!sleepTimerRunning" data-tour="pl-sleep" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-fg-muted cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" @click.stop="$emit('showSleepTimer')">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <div v-else class="h-7 w-7 flex items-center justify-around cursor-pointer" @click.stop="$emit('showSleepTimer')">
            <p class="text-xl font-mono text-success">{{ sleepTimeRemainingPretty }}</p>
          </div>

          <div v-if="showTranscriptionBtn" data-tour="pl-transcription" class="flex flex-col items-center text-fg-muted cursor-pointer" @click.stop="openTranscription">
            <span class="material-symbols text-3xl leading-none">transcribe</span>
            <span class="text-[10px] font-semibold leading-tight">Transcription</span>
          </div>

          <span data-tour="pl-chapters" class="material-symbols text-3xl text-fg cursor-pointer" :class="chapters.length ? 'text-opacity-75' : 'text-opacity-10'" @click="clickChaptersBtn">format_list_bulleted</span>
        </div>
      </div>
      <div v-else class="w-full h-full absolute top-0 left-0 pointer-events-none" style="background: var(--gradient-minimized-audio-player)" />

      <!-- Playback controls - jump buttons, play/pause, chapter navigation -->
      <div id="playerControls" class="absolute right-0 bottom-0 mx-auto" style="max-width: 414px">
        <div class="flex items-center max-w-full" :class="playerSettings.lockUi ? 'justify-center' : 'justify-between'">
          <span v-show="showFullscreen && !playerSettings.lockUi" class="material-symbols next-icon text-fg cursor-pointer" :class="showLoadingState ? 'text-opacity-10' : 'text-opacity-75'" @click.stop="jumpChapterStart">first_page</span>
          <div v-show="!playerSettings.lockUi" data-tour="pl-jump" class="jump-icon text-fg cursor-pointer flex flex-col items-center" :class="showLoadingState ? 'text-opacity-10' : 'text-opacity-75'" @click.stop="jumpBackwards">
            <span class="material-symbols text-3xl leading-none">replay</span>
            <span v-if="showFullscreen" class="jump-label text-[10px] font-semibold leading-tight">{{ jumpBackwardsLabel }}</span>
          </div>
          <div data-tour="pl-play" class="play-btn cursor-pointer shadow-sm flex items-center justify-center rounded-full text-primary mx-4 relative overflow-hidden" :style="playBtnStyle" :class="{ 'animate-spin': seekLoading }" @mousedown.prevent @mouseup.prevent @click.stop="playPauseClick">
            <div v-if="!coverBgIsLight && !isEinkTheme" class="absolute top-0 left-0 w-full h-full bg-white bg-opacity-20 pointer-events-none" />

            <!-- e-ink: a solid ink circle with the icon in the page colour (the page-coloured circle was invisible in light e-ink) -->
            <span v-if="!showLoadingState" class="material-symbols fill" :class="{ 'text-white': coverRgb && !coverBgIsLight && !isEinkTheme }" :style="playIconStyle">{{ seekLoading ? 'autorenew' : !isPlaying ? 'play_arrow' : 'pause' }}</span>
            <widgets-spinner-icon v-else class="h-8 w-8" />
          </div>
          <div v-show="!playerSettings.lockUi" class="jump-icon text-fg cursor-pointer flex flex-col items-center" :class="showLoadingState ? 'text-opacity-10' : 'text-opacity-75'" @click.stop="jumpForward">
            <span class="material-symbols text-3xl leading-none">forward_media</span>
            <span v-if="showFullscreen" class="jump-label text-[10px] font-semibold leading-tight">{{ jumpForwardLabel }}</span>
          </div>
          <span v-show="showFullscreen && !playerSettings.lockUi" class="material-symbols next-icon text-fg cursor-pointer" :class="nextChapter && !showLoadingState ? 'text-opacity-75' : 'text-opacity-10'" @click.stop="jumpNextChapter">last_page</span>
        </div>
      </div>

      <!-- Chapter progress bar -->
      <div id="playerTrack" class="absolute left-0 w-full px-6">
        <div class="flex pointer-events-none">
          <p class="font-mono text-fg" style="font-size: 0.8rem" ref="currentTimestamp">0:00</p>
          <div class="flex-grow" />
          <p class="font-mono text-fg" style="font-size: 0.8rem">{{ timeRemainingPretty }}</p>
        </div>
        <div ref="track" class="h-1.5 w-full bg-track/50 relative rounded-full overflow-hidden" :class="{ 'animate-pulse': showLoadingState }" @click.stop>
          <div ref="readyTrack" class="h-full bg-track-buffered absolute top-0 left-0 rounded-full pointer-events-none" />
          <div ref="bufferedTrack" class="h-full bg-track absolute top-0 left-0 rounded-full pointer-events-none" />
          <div ref="playedTrack" class="h-full bg-track-cursor absolute top-0 left-0 rounded-full pointer-events-none" :style="isEinkTheme && buttonRgb ? { backgroundColor: buttonRgb } : null" />
          <div ref="trackCursor" class="h-7 w-7 rounded-full absolute pointer-events-auto flex items-center justify-center" :style="{ top: '-11px' }" :class="{ 'opacity-0': playerSettings.lockUi || !showFullscreen }" @touchstart="touchstartCursor">
            <div class="bg-track-cursor rounded-full w-3.5 h-3.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>

    <!-- Chapters modal - lists chapters for navigation -->
    <modals-chapters-modal v-model="showChapterModal" :current-chapter="currentChapter" :chapters="chapters" :playback-rate="currentPlaybackRate" @select="selectChapter" />
    <!-- Transcription - on-device speech-to-text, Spotify lyrics style -->
    <app-transcription-panel ref="transcriptionPanel" v-model="showTranscription" :bottom-inset="panelInset" :item-key="mediaId" :bookmark-item-id="bookmarkItemId" :get-time="getPlayerTime" :title="title" :current-time="currentTime" :is-playing="isPlaying" :cover-rgb="coverRgb" :cover-bg-is-light="coverBgIsLight" :button-rgb="buttonRgb" :button-is-light="buttonIsLight" :playback-rate="currentPlaybackRate" :has-ebook="hasEbookForReadAlong" :ebook-item="localLibraryItem || libraryItem" @openReadAlong="openReadAlong" @miniPlayer="onReadAlongMini" @seek="seek" @playPause="playPauseClick" @jumpForward="jumpForward" @jumpBackward="jumpBackwards" />
    <!-- More menu dialog - player settings and options -->
    <modals-dialog v-model="showMoreMenuDialog" :items="menuItems" width="80vw" @action="clickMenuAction" />
  </div>
</template>

<script>
import { einkButton } from '@/plugins/einkButton'
import { warnPowerSaving } from '@/plugins/powerSaveNotice'
import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { AbsAudioPlayer } from '@/plugins/capacitor'
import { Dialog } from '@capacitor/dialog'
import { getAverageColorFromCoverUrl } from '@/utils/coverAverageColor'
import WrappingMarquee from '@/assets/WrappingMarquee.js'
import jumpLabelMixin from '@/mixins/jumpLabel'

export default {
  props: {
    bookmarks: {
      type: Array,
      default: () => []
    },
    sleepTimerRunning: Boolean,
    sleepTimeRemaining: Number,
    serverLibraryItemId: String
  },
  mixins: [jumpLabelMixin],
  data() {
    return {
      windowHeight: 0,
      windowWidth: 0,
      // landscape: where the one-line transcription card fits (measured from the laid-out player)
      landscapeCardBox: null,
      playbackSession: null,
      showChapterModal: false,
      showFullscreen: false,
      // room the player's controls take at the bottom, so Transcription stops above them
      panelInset: 0,
      totalDuration: 0,
      currentPlaybackRate: 1,
      currentTime: 0,
      bufferedTime: 0,
      playInterval: null,
      trackWidth: 0,
      isPlaying: false,
      isEnded: false,
      volume: 0.5,
      readyTrackWidth: 0,
      seekedTime: 0,
      seekLoading: false,
      touchStartY: 0,
      touchStartTime: 0,
      playerSettings: {
        useChapterTrack: false,
        useTotalTrack: true,
        scaleElapsedTimeBySpeed: true,
        lockUi: false
      },
      isLoading: false,
      isCheckingServerProgress: false,
      isDraggingCursor: false,
      draggingTouchStartX: 0,
      draggingTouchStartTime: 0,
      draggingCurrentTime: 0,
      syncStatus: 0,
      showMoreMenuDialog: false,
      showTranscription: false,
      pendingTranscription: false,
      coverRgb: 'rgb(55, 56, 56)',
      // e-ink: the cover's colour for the buttons only (the page stays plain)
      buttonRgb: null,
      buttonIsLight: false,
      coverBgIsLight: false,
      titleMarquee: null,
      isRefreshingUI: false
    }
  },
  watch: {
    // while the audiobook plays, the screen stays on (whatever is showing); paused, it times out as usual
    isPlaying: {
      immediate: true,
      handler() {
        this.updateKeepAwake()
      }
    },
    showTranscription() {
      this.measurePanelInset()
      this.updateKeepAwake()
    },
    showFullscreen(val) {
      // the card's landscape spot, once the full player has opened (its open animation moves things)
      setTimeout(() => this.measureLandscapeCard(), val ? 450 : 0)
      if (val) setTimeout(() => this.measureLandscapeCard(), 1200)
      if (val) setTimeout(() => this.$store.dispatch('onboarding/maybeTour', 'player'), 700)
      if (val) warnPowerSaving(this)
      this.measurePanelInset()
      this.updateKeepAwake()
      this.updateScreenSize()
      this.$store.commit('setPlayerFullscreen', !!val)
      document.querySelector('body').style.backgroundColor = this.showFullscreen ? this.coverRgb : ''
    },
    bookCoverAspectRatio() {
      this.updateScreenSize()
    },
    title(val) {
      this.ensureTitleMarquee()
      if (this.titleMarquee) this.titleMarquee.init(val)
    }
  },
  updated() {
    this.ensureTitleMarquee()
  },
  computed: {
    // From the store so the player follows a light / dark switch straight away (the page attribute isn't reactive)
    theme() {
      return this.$store.getters['device/theme'] || document.documentElement.dataset.theme || 'dark'
    },
    /** Light page behind the card: light theme or a light e-ink one; every dark theme gets white text */
    /** any e-ink theme (light or dark, black & white or colour) */
    isEinkTheme() {
      return String(this.theme || '').startsWith('eink')
    },
    cardOnLight() {
      return this.theme === 'light' || this.theme === 'eink' || this.theme === 'eink-color'
    },
    /** Server item id, or the local item id for books only on the phone */
    bookmarkItemId() {
      if (this.isPodcast) return null
      return this.serverLibraryItemId || this.mediaId
    },
    menuItems() {
      const items = []
      // TODO: Implement on iOS
      if (this.$platform !== 'ios' && !this.isPodcast && this.mediaId) {
        items.push({
          text: this.$strings.ButtonHistory,
          value: 'history',
          icon: 'history'
        })
      }

      if (!this.isPodcast && this.bookmarkItemId) {
        const n = this.bookmarks.length
        items.push({
          text: n ? `Bookmarks (${n})` : 'Bookmarks',
          value: 'bookmarks',
          icon: 'bookmarks'
        })
      }

      if (this.showTranscriptionBtn) {
        items.push({
          text: 'Transcription',
          value: 'transcription',
          icon: 'transcribe'
        })
      }

      items.push(
        ...[
          {
            text: this.$strings.LabelTotalTrack,
            value: 'total_track',
            icon: this.playerSettings.useTotalTrack ? 'check_box' : 'check_box_outline_blank'
          },
          {
            text: this.$strings.LabelChapterTrack,
            value: 'chapter_track',
            icon: this.playerSettings.useChapterTrack ? 'check_box' : 'check_box_outline_blank'
          },
          {
            text: this.$strings.LabelScaleElapsedTimeBySpeed,
            value: 'scale_elapsed_time',
            icon: this.playerSettings.scaleElapsedTimeBySpeed ? 'check_box' : 'check_box_outline_blank'
          },
          {
            text: this.playerSettings.lockUi ? this.$strings.LabelUnlockPlayer : this.$strings.LabelLockPlayer,
            value: 'lock',
            icon: this.playerSettings.lockUi ? 'lock' : 'lock_open'
          },
          {
            text: this.$strings.LabelClosePlayer,
            value: 'close',
            icon: 'close'
          }
        ]
      )

      return items
    },
    // Space between the author line and the progress track in the portrait full-screen player
    transcriptionPreviewBox() {
      // landscape: the gap between the author line and the time row on the right, measured (see measureLandscapeCard)
      if (this.windowHeight && this.windowWidth >= this.windowHeight) return this.landscapeCardBox
      if (!this.windowHeight) return null
      const coverHeight = this.fullscreenBookCoverWidth * this.bookCoverAspectRatio
      const titleBottom = this.windowHeight / 2 - coverHeight / 2 + 50
      const showsTotalTrack = this.playerSettings.useChapterTrack && this.playerSettings.useTotalTrack
      const base = showsTotalTrack ? 252 : 212
      const available = titleBottom - base - 8
      // One line of text (plus a small label when there is room)
      if (available < 36) return null
      const height = Math.min(available, 60)
      return {
        compact: height < 52,
        style: {
          left: '24px',
          right: '24px',
          height: height + 'px',
          bottom: base + (available - height) / 2 + 'px'
        }
      }
    },
    showTranscriptionBtn() {
      // On-device transcription is implemented for Android only
      return this.$platform === 'android' && !!this.mediaId
    },
    jumpForwardLabel() {
      return this.getJumpLabel(this.jumpForwardTime)
    },
    jumpBackwardsLabel() {
      return this.getJumpLabel(this.jumpBackwardsTime)
    },
    jumpForwardTime() {
      return this.$store.getters['getJumpForwardTime']
    },
    jumpBackwardsTime() {
      return this.$store.getters['getJumpBackwardsTime']
    },
    bookCoverAspectRatio() {
      return this.$store.getters['libraries/getBookCoverAspectRatio']
    },
    bookCoverWidth() {
      if (this.showFullscreen) return this.fullscreenBookCoverWidth
      return 46 / this.bookCoverAspectRatio
    },
    fullscreenBookCoverWidth() {
      if (this.windowWidth < this.windowHeight) {
        // Portrait
        let sideSpace = 20
        if (this.bookCoverAspectRatio === 1.6) sideSpace += (this.windowWidth - sideSpace) * 0.375

        // Room under the cover for the author line and the one-line transcription card: the cover gives up only
        // what that needs (36px), and only when it is limited by the screen height
        const availableHeight = this.windowHeight - (this.showTranscriptionBtn ? 436 : 400)
        let width = this.windowWidth - sideSpace
        const totalHeight = width * this.bookCoverAspectRatio
        if (totalHeight > availableHeight) {
          width = availableHeight / this.bookCoverAspectRatio
        }
        return width
      } else {
        // Landscape
        const heightScale = (this.windowHeight - 200) / 651
        if (this.bookCoverAspectRatio === 1) {
          return 260 * heightScale
        }
        return 190 * heightScale
      }
    },
    showLoadingState() {
      return this.isLoading || this.isCheckingServerProgress
    },
    showCastBtn() {
      return this.$store.state.isCastAvailable
    },
    isCasting() {
      return this.mediaPlayer === 'cast-player'
    },
    mediaPlayer() {
      return this.playbackSession?.mediaPlayer || null
    },
    mediaType() {
      return this.playbackSession?.mediaType || null
    },
    /** e-ink: the cover's colour, solid, black outline (a solid ink circle when there's no cover colour) */
    einkPlay() {
      return this.isEinkTheme && this.buttonRgb ? einkButton(this.buttonRgb, this.buttonIsLight) : null
    },
    playBtnStyle() {
      if (this.einkPlay) return this.einkPlay
      return this.isEinkTheme ? { backgroundColor: 'rgb(var(--color-fg))' } : { backgroundColor: this.coverRgb }
    },
    playIconStyle() {
      if (this.einkPlay) return { color: this.einkPlay.color }
      return this.isEinkTheme ? { color: 'rgb(var(--color-bg))' } : null
    },
    /** Like the player's play button: the cover's colour */
    lockBtnStyle() {
      if (this.isEinkTheme) return (this.buttonRgb && einkButton(this.buttonRgb, this.buttonIsLight)) || { backgroundColor: '#fff', color: '#000', border: '2px solid #000' }
      return { backgroundColor: this.coverRgb, color: this.coverBgIsLight ? 'rgb(30, 30, 30)' : '#fff', border: '1px solid rgba(255, 255, 255, 0.35)' }
    },
    isPodcast() {
      return this.mediaType === 'podcast'
    },
    mediaMetadata() {
      return this.playbackSession?.mediaMetadata || null
    },
    libraryItem() {
      return this.playbackSession?.libraryItem || null
    },
    hasEbookForReadAlong() {
      const it = this.localLibraryItem || this.libraryItem
      return !!(it && it.media && it.media.ebookFile)
    },
    localLibraryItem() {
      return this.playbackSession?.localLibraryItem || null
    },
    localLibraryItemCoverSrc() {
      var localItemCover = this.localLibraryItem?.coverContentUrl || null
      if (localItemCover) return Capacitor.convertFileSrc(localItemCover)
      return null
    },
    playMethod() {
      return this.playbackSession?.playMethod || 0
    },
    isLocalPlayMethod() {
      return this.playMethod == this.$constants.PlayMethod.LOCAL
    },
    isDirectPlayMethod() {
      return this.playMethod == this.$constants.PlayMethod.DIRECTPLAY
    },
    title() {
      const mediaItemTitle = this.playbackSession?.displayTitle || this.mediaMetadata?.title || 'Title'
      if (this.currentChapterTitle) {
        if (this.showFullscreen) return this.currentChapterTitle
        return `${mediaItemTitle} | ${this.currentChapterTitle}`
      }
      return mediaItemTitle
    },
    authorName() {
      if (this.playbackSession) return this.playbackSession.displayAuthor
      return this.mediaMetadata?.authorName || 'Author'
    },
    chapters() {
      return this.playbackSession?.chapters || []
    },
    currentChapter() {
      if (!this.chapters.length) return null
      return this.chapters.find((ch) => Number(Number(ch.start).toFixed(2)) <= this.currentTime && Number(Number(ch.end).toFixed(2)) > this.currentTime)
    },
    nextChapter() {
      if (!this.chapters.length) return
      return this.chapters.find((c) => Number(Number(c.start).toFixed(2)) > this.currentTime)
    },
    currentChapterTitle() {
      return this.currentChapter?.title || ''
    },
    currentChapterDuration() {
      return this.currentChapter ? this.currentChapter.end - this.currentChapter.start : this.totalDuration
    },
    totalDurationPretty() {
      return this.$secondsToTimestamp(this.totalDuration)
    },
    currentTimePretty() {
      let currentTimeToUse = this.isDraggingCursor ? this.draggingCurrentTime : this.currentTime
      if (this.playerSettings.scaleElapsedTimeBySpeed) {
        currentTimeToUse = currentTimeToUse / this.currentPlaybackRate
      }
      return this.$secondsToTimestamp(currentTimeToUse)
    },
    timeRemaining() {
      let currentTimeToUse = this.isDraggingCursor ? this.draggingCurrentTime : this.currentTime
      if (this.playerSettings.useChapterTrack && this.currentChapter) {
        var currChapTime = currentTimeToUse - this.currentChapter.start
        return (this.currentChapterDuration - currChapTime) / this.currentPlaybackRate
      }
      return this.totalTimeRemaining
    },
    totalTimeRemaining() {
      let currentTimeToUse = this.isDraggingCursor ? this.draggingCurrentTime : this.currentTime
      return (this.totalDuration - currentTimeToUse) / this.currentPlaybackRate
    },
    totalTimeRemainingPretty() {
      if (this.totalTimeRemaining < 0) {
        return this.$secondsToTimestamp(this.totalTimeRemaining * -1)
      }
      return '-' + this.$secondsToTimestamp(this.totalTimeRemaining)
    },
    timeRemainingPretty() {
      if (this.timeRemaining < 0) {
        return this.$secondsToTimestamp(this.timeRemaining * -1)
      }
      return '-' + this.$secondsToTimestamp(this.timeRemaining)
    },
    sleepTimeRemainingPretty() {
      if (!this.sleepTimeRemaining) return '0s'
      var secondsRemaining = Math.round(this.sleepTimeRemaining)
      if (secondsRemaining > 91) {
        return Math.ceil(secondsRemaining / 60) + 'm'
      } else {
        return secondsRemaining + 's'
      }
    },
    socketConnected() {
      return this.$store.state.socketConnected
    },
    mediaId() {
      if (this.isPodcast || !this.playbackSession) return null
      if (this.playbackSession.libraryItemId) {
        return this.playbackSession.episodeId ? `${this.playbackSession.libraryItemId}-${this.playbackSession.episodeId}` : this.playbackSession.libraryItemId
      }
      const localLibraryItem = this.playbackSession.localLibraryItem
      if (!localLibraryItem) return null

      return this.playbackSession.localEpisodeId ? `${localLibraryItem.id}-${this.playbackSession.localEpisodeId}` : localLibraryItem.id
    }
  },
  methods: {
    /**
     * While the book plays the screen stays on where there's something to follow: the opened player,
     * Transcription or a book. Browsing the library it times out as usual (the screen is the biggest drain).
     */
    updateKeepAwake() {
      const following = this.showFullscreen || this.showTranscription || this.$store.state.showReader
      if (this.isPlaying && following) KeepAwake.keepAwake().catch(() => {})
      else if (!this.showTranscription && !this.$store.state.showReader) KeepAwake.allowSleep().catch(() => {})
    },
    /** Transcription sits above the player: the bar (mini) or all of its controls (opened) */
    measurePanelInset() {
      const measure = () => {
        const el = this.$el && this.$el.querySelector && this.$el.querySelector('#playerContent')
        if (!el || !this.showFullscreen) {
          this.panelInset = 0
        } else {
          const top = el.getBoundingClientRect().top
          this.panelInset = Math.max(0, Math.round(window.innerHeight - top))
        }
        this.$store.commit('setPlayerControlsInset', this.panelInset)
      }
      this.$nextTick(measure)
      setTimeout(measure, 350) // after the open / close animation
    },
    /** Read along in the Transcription panel: show the mini player bar below it (as in the full reader) */
    onReadAlongMini(on) {
      if (on) {
        this.raWasFullscreen = this.raWasFullscreen || this.showFullscreen
        this.showFullscreen = false
      } else if (this.raWasFullscreen) {
        this.raWasFullscreen = false
        this.showFullscreen = true
      }
    },
    /** Transcription → Read along: the book, every word highlighted as it's read, from [time] */
    openReadAlong(time) {
      try {
        const s = JSON.parse(localStorage.getItem('ereaderSettings') || '{}')
        localStorage.setItem('ereaderSettings', JSON.stringify({ ...s, readAlong: 'word', readAlongTurnPages: true }))
      } catch (e) {}
      const item = this.localLibraryItem || this.libraryItem
      if (!item) return
      const key = (this.libraryItem && this.libraryItem.id) || (this.localLibraryItem && this.localLibraryItem.id)
      this.$store.commit('reader/setJump', { key, time: Math.max(0, time || 0) })
      this.showTranscription = false
      // the reader sits under the full-screen player: drop to the mini player so the book shows
      this.showFullscreen = false
      this.raWasFullscreen = false // the panel closing must not bring the full-screen player back over the book
      this.$store.commit('showReader', { libraryItem: item, keepProgress: true })
    },
    /** Exact playback position (the 1 s player clock is too coarse for bookmarks) */
    async getPlayerTime() {
      try {
        const data = await AbsAudioPlayer.getCurrentTime()
        if (data && typeof data.value === 'number') return data.value
      } catch (e) {}
      return this.currentTime || 0
    },
    showSyncsFailedDialog() {
      Dialog.alert({
        title: this.$strings.HeaderProgressSyncFailed,
        message: this.$strings.MessageProgressSyncFailed,
        cancelText: this.$strings.ButtonOk
      })
    },
    clickChaptersBtn() {
      if (!this.chapters.length) return
      this.showChapterModal = true
    },
    async coverImageLoaded(fullCoverUrl) {
      if (!fullCoverUrl) return
      // E-ink: plain page colour instead of a tint from the cover (greys ghost and look muddy)
      const theme = document.documentElement.dataset.theme || ''
      if (theme.startsWith('eink')) {
        this.coverRgb = 'rgb(var(--color-bg))'
        this.coverBgIsLight = theme === 'eink' || theme === 'eink-color'
        // Buttons in the cover's colour on colour e-ink only: a black-and-white panel draws colour as grey dots
        const a = theme.startsWith('eink-color') ? await getAverageColorFromCoverUrl(this, fullCoverUrl).catch(() => null) : null
        this.buttonRgb = a ? a.rgba : null
        this.buttonIsLight = a ? a.isLight : false
        return
      }
      this.buttonRgb = null
      const avg = await getAverageColorFromCoverUrl(this, fullCoverUrl)
      if (!avg) {
        this.coverRgb = 'rgb(55, 56, 56)'
        this.coverBgIsLight = false
      } else {
        this.coverRgb = avg.rgba
        this.coverBgIsLight = avg.isLight
      }
      this.$store.commit('setCoverAccent', avg ? avg.rgba : null)
    },
    clickTitleAndAuthor() {
      if (!this.showFullscreen) return
      const llid = this.serverLibraryItemId || this.libraryItem?.id || this.localLibraryItem?.id
      if (llid) {
        this.$router.push(`/item/${llid}`)
        this.showFullscreen = false
      }
    },
    async selectChapter(chapter) {
      await this.$hapticsImpact()
      this.seek(chapter.start)
      this.showChapterModal = false
    },
    async castClick() {
      await this.$hapticsImpact()
      if (this.isLocalPlayMethod) {
        this.$eventBus.$emit('cast-local-item')
        return
      }
      AbsAudioPlayer.requestSession()
    },
    clickContainer() {
      this.expandToFullscreen()
    },
    expandToFullscreen() {
      this.showFullscreen = true
      if (this.titleMarquee) this.titleMarquee.reset()

      this.$nextTick(() => {
        this.measureAndUpdateTrackWidth()
      })
    },
    collapseFullscreen() {
      this.showFullscreen = false
      if (this.titleMarquee) this.titleMarquee.reset()

      this.forceCloseDropdownMenu()
    },
    async jumpNextChapter() {
      await this.$hapticsImpact()
      if (this.showLoadingState) return
      if (!this.nextChapter) return
      this.seek(this.nextChapter.start)
    },
    async jumpChapterStart() {
      await this.$hapticsImpact()
      if (this.showLoadingState) return
      if (!this.currentChapter) {
        return this.restart()
      }

      // If 4 seconds or less into current chapter, then go to previous
      if (this.currentTime - this.currentChapter.start <= 4) {
        const currChapterIndex = this.chapters.findIndex((ch) => Number(ch.start) <= this.currentTime && Number(ch.end) >= this.currentTime)
        if (currChapterIndex > 0) {
          const prevChapter = this.chapters[currChapterIndex - 1]
          this.seek(prevChapter.start)
        }
      } else {
        this.seek(this.currentChapter.start)
      }
    },
    showSleepTimerModal() {
      this.$emit('showSleepTimer')
    },
    async setPlaybackSpeed(speed) {
      console.log(`[AudioPlayer] Set Playback Rate: ${speed}`)
      this.currentPlaybackRate = speed
      this.updateTimestamp()
      AbsAudioPlayer.setPlaybackSpeed({ value: speed })
    },
    restart() {
      this.seek(0)
    },
    /** Keyboard (desktop mode, or a keyboard on a tablet): Space play/pause, ← → jump */
    onKey(e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return
      if (this.showTranscription || this.$store.state.showReader || this.$store.state.globals.isModalOpen) return
      if (e.key === ' ' || e.key === 'MediaPlayPause') {
        e.preventDefault()
        this.playPauseClick()
      } else if (e.key === 'ArrowLeft' && this.showFullscreen) this.jumpBackwards()
      else if (e.key === 'ArrowRight' && this.showFullscreen) this.jumpForward()
    },
    async jumpBackwards() {
      await this.$hapticsImpact()
      if (this.showLoadingState) return
      AbsAudioPlayer.seekBackward({ value: this.jumpBackwardsTime })
    },
    async jumpForward() {
      await this.$hapticsImpact()
      if (this.showLoadingState) return
      AbsAudioPlayer.seekForward({ value: this.jumpForwardTime })
    },
    setStreamReady() {
      this.readyTrackWidth = this.trackWidth
      this.updateReadyTrack()
    },
    setChunksReady(chunks, numSegments) {
      let largestSeg = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (typeof chunk === 'string') {
          const chunkRange = chunk.split('-').map((c) => Number(c))
          if (chunkRange.length < 2) continue
          if (chunkRange[1] > largestSeg) largestSeg = chunkRange[1]
        } else if (chunk > largestSeg) {
          largestSeg = chunk
        }
      }
      const percentageReady = largestSeg / numSegments
      const widthReady = Math.round(this.trackWidth * percentageReady)
      if (this.readyTrackWidth === widthReady) {
        return
      }
      this.readyTrackWidth = widthReady
      this.updateReadyTrack()
    },
    updateReadyTrack() {
      if (!this.$refs.readyTrack) return

      if (this.playerSettings.useChapterTrack) {
        if (this.$refs.totalReadyTrack && this.trackWidth) {
          const readyPercent = (this.readyTrackWidth / this.trackWidth) * 100
          this.$refs.totalReadyTrack.style.width = readyPercent + '%'
        }
        this.$refs.readyTrack.style.width = '100%'
      } else if (this.trackWidth) {
        const readyPercent = (this.readyTrackWidth / this.trackWidth) * 100
        this.$refs.readyTrack.style.width = readyPercent + '%'
      }
    },
    updateTimestamp() {
      const ts = this.$refs.currentTimestamp
      if (!ts) {
        console.error('No timestamp el')
        return
      }

      let currentTime = this.isDraggingCursor ? this.draggingCurrentTime : this.currentTime
      if (this.playerSettings.useChapterTrack && this.currentChapter) {
        currentTime = Math.max(0, currentTime - this.currentChapter.start)
      }
      if (this.playerSettings.scaleElapsedTimeBySpeed) {
        currentTime = currentTime / this.currentPlaybackRate
      }

      ts.innerText = this.$secondsToTimestamp(currentTime)
    },
    timeupdate() {
      if (!this.$refs.playedTrack) {
        console.error('Invalid no played track ref')
        return
      }
      this.$emit('updateTime', this.currentTime)

      if (this.seekLoading) {
        this.seekLoading = false
        if (this.$refs.playedTrack) {
          this.$refs.playedTrack.classList.remove('bg-yellow-300')
          this.$refs.playedTrack.classList.add('bg-gray-200')
        }
      }

      this.updateTimestamp()
      this.updateTrack()
    },
    updateTrack() {
      // Update progress track UI
      let currentTimeToUse = this.isDraggingCursor ? this.draggingCurrentTime : this.currentTime
      let percentDone = currentTimeToUse / this.totalDuration
      const totalPercentDone = percentDone
      let bufferedPercent = this.bufferedTime / this.totalDuration
      const totalBufferedPercent = bufferedPercent

      if (this.playerSettings.useChapterTrack && this.currentChapter) {
        const currChapTime = currentTimeToUse - this.currentChapter.start
        percentDone = currChapTime / this.currentChapterDuration
        bufferedPercent = Math.max(0, Math.min(1, (this.bufferedTime - this.currentChapter.start) / this.currentChapterDuration))
      }

      const playedPercent = percentDone * 100
      const bufferedPercentWidth = bufferedPercent * 100
      if (this.$refs.playedTrack) {
        this.$refs.playedTrack.style.width = playedPercent + '%'
      }
      if (this.$refs.bufferedTrack) {
        this.$refs.bufferedTrack.style.width = bufferedPercentWidth + '%'
      }

      if (this.$refs.trackCursor && this.$refs.track) {
        const trackWidth = this.$refs.track.clientWidth
        this.$refs.trackCursor.style.left = Math.round(percentDone * trackWidth) - 14 + 'px'
      }

      if (this.playerSettings.useChapterTrack) {
        if (this.$refs.totalPlayedTrack) this.$refs.totalPlayedTrack.style.width = totalPercentDone * 100 + '%'
        if (this.$refs.totalBufferedTrack) this.$refs.totalBufferedTrack.style.width = totalBufferedPercent * 100 + '%'
      }
    },
    seek(time) {
      if (this.showLoadingState) return
      // ABS+: a newer seek always wins. It used to be dropped while an earlier one was still "loading", a
      // flag only cleared by the 1-second clock, which stops while paused: tapping another line in Lyrics or
      // Karaoke moved the transcript but not the audio.
      this.seekedTime = time
      this.seekLoading = true

      // Pass fractional seconds so seeks to non-integer chapter starts don't truncate
      Promise.resolve(AbsAudioPlayer.seek({ value: time }))
        .then(async () => {
          if (this.seekedTime !== time) return // a later seek took over
          try {
            const d = await AbsAudioPlayer.getCurrentTime()
            if (d && typeof d.value === 'number') this.currentTime = Number(d.value.toFixed(2))
          } catch (e) {}
          this.timeupdate() // ends the seeking state, playing or paused
        })
        .catch(() => (this.seekLoading = false))

      if (this.$refs.playedTrack) {
        const perc = time / this.totalDuration
        this.$refs.playedTrack.style.width = perc * 100 + '%'

        this.$refs.playedTrack.classList.remove('bg-gray-200')
        this.$refs.playedTrack.classList.add('bg-yellow-300')
      }
    },
    async touchstartCursor(e) {
      if (!e || !e.touches || !this.$refs.track || !this.showFullscreen || this.playerSettings.lockUi) return

      await this.$hapticsImpact()
      this.isDraggingCursor = true
      this.draggingTouchStartX = e.touches[0].pageX
      this.draggingTouchStartTime = this.currentTime
      this.draggingCurrentTime = this.currentTime
      this.updateTrack()
    },
    async playPauseClick() {
      await this.$hapticsImpact()
      if (this.showLoadingState) return

      this.isPlaying = !!((await AbsAudioPlayer.playPause()) || {}).playing
      this.isEnded = false
    },
    setIsCheckingServerProgress(value) {
      this.isCheckingServerProgress = !!value
    },
    play() {
      AbsAudioPlayer.playPlayer()
      this.startPlayInterval()
      this.isPlaying = true
    },
    pause() {
      AbsAudioPlayer.pausePlayer()
      this.stopPlayInterval()
      this.isPlaying = false
    },
    startPlayInterval() {
      clearInterval(this.playInterval)
      this.playInterval = setInterval(async () => {
        var data = await AbsAudioPlayer.getCurrentTime()
        this.currentTime = Number(data.value.toFixed(2))
        this.bufferedTime = Number(data.bufferedTime.toFixed(2))
        this.timeupdate()
      }, 1000)
    },
    stopPlayInterval() {
      clearInterval(this.playInterval)
    },
    resetStream(startTime) {
      this.closePlayback()
    },
    touchstart(e) {
      if (!e.changedTouches || this.$store.state.globals.isModalOpen) return
      const touchPosY = e.changedTouches[0].pageY
      // when minimized only listen to touchstart on the player
      if (!this.showFullscreen && touchPosY < window.innerHeight - 120) return

      // for ios
      if (!this.showFullscreen && e.pageX < 20) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }

      this.touchStartY = touchPosY
      this.touchStartTime = Date.now()
    },
    touchend(e) {
      if (!e.changedTouches) return
      const touchDuration = Date.now() - this.touchStartTime
      const touchEndY = e.changedTouches[0].pageY
      const touchDistanceY = touchEndY - this.touchStartY

      // reset touch start data
      this.touchStartTime = 0
      this.touchStartY = 0

      if (this.isDraggingCursor) {
        if (this.draggingCurrentTime !== this.currentTime) {
          this.seek(this.draggingCurrentTime)
        }
        this.isDraggingCursor = false
      } else {
        if (touchDuration > 1200) {
          // console.log('touch too long', touchDuration)
          return
        }
        if (this.showFullscreen) {
          // Touch start higher than touchend
          if (touchDistanceY > 100) {
            this.collapseFullscreen()
          }
        } else if (touchDistanceY < -100) {
          this.expandToFullscreen()
        }
      }
    },
    touchmove(e) {
      if (!this.isDraggingCursor || !e.touches) return

      const distanceMoved = e.touches[0].pageX - this.draggingTouchStartX
      let duration = this.totalDuration
      let minTime = 0
      let maxTime = duration
      if (this.playerSettings.useChapterTrack && this.currentChapter) {
        duration = this.currentChapterDuration
        minTime = this.currentChapter.start
        maxTime = minTime + duration
      }

      const trackWidth = this.$refs.track?.clientWidth || this.trackWidth
      const timePerPixel = duration / trackWidth
      const newTime = this.draggingTouchStartTime + timePerPixel * distanceMoved
      this.draggingCurrentTime = Math.min(maxTime, Math.max(minTime, newTime))

      this.updateTimestamp()
      this.updateTrack()
    },
    async clickMenuAction(action) {
      await this.$hapticsImpact()
      this.showMoreMenuDialog = false
      this.$nextTick(() => {
        if (action === 'bookmarks') {
          this.$emit('showBookmarks')
        } else if (action === 'history') {
          this.$router.push(`/media/${this.mediaId}/history?title=${this.title}`)
          this.showFullscreen = false
        } else if (action === 'scale_elapsed_time') {
          this.playerSettings.scaleElapsedTimeBySpeed = !this.playerSettings.scaleElapsedTimeBySpeed
          this.updateTimestamp()
          this.savePlayerSettings()
        } else if (action === 'lock') {
          this.playerSettings.lockUi = !this.playerSettings.lockUi
          this.savePlayerSettings()
        } else if (action === 'chapter_track') {
          this.playerSettings.useChapterTrack = !this.playerSettings.useChapterTrack
          this.playerSettings.useTotalTrack = !this.playerSettings.useChapterTrack || this.playerSettings.useTotalTrack

          this.updateTimestamp()
          this.updateTrack()
          this.updateReadyTrack()
          this.updateUseChapterTrack()
          this.savePlayerSettings()
        } else if (action === 'total_track') {
          this.playerSettings.useTotalTrack = !this.playerSettings.useTotalTrack
          this.playerSettings.useChapterTrack = !this.playerSettings.useTotalTrack || this.playerSettings.useChapterTrack

          this.updateTimestamp()
          this.updateTrack()
          this.updateReadyTrack()
          this.updateUseChapterTrack()
          this.savePlayerSettings()
        } else if (action === 'transcription') {
          this.openTranscription()
        } else if (action === 'close') {
          this.closePlayback()
        }
      })
    },
    async openTranscription() {
      await this.$hapticsImpact()
      this.showTranscription = true
    },
    updateUseChapterTrack() {
      // Chapter track in NowPlaying only supported on iOS for now
      if (this.$platform === 'ios') {
        AbsAudioPlayer.setChapterTrack({ enabled: this.playerSettings.useChapterTrack })
      }
    },
    forceCloseDropdownMenu() {
      if (this.$refs.dropdownMenu && this.$refs.dropdownMenu.closeMenu) {
        this.$refs.dropdownMenu.closeMenu()
      }
    },
    closePlayback() {
      this.endPlayback()
      AbsAudioPlayer.closePlayback()
    },
    endPlayback() {
      this.$store.commit('setPlaybackSession', null)
      this.showFullscreen = false
      this.showTranscription = false
      this.isEnded = false
      this.isLoading = false
      this.playbackSession = null
    },
    async loadPlayerSettings() {
      const savedPlayerSettings = await this.$localStore.getPlayerSettings()
      if (!savedPlayerSettings) {
        // In 0.9.72-beta 'useChapterTrack', 'useTotalTrack' and 'playerLock' was replaced with 'playerSettings' JSON object
        // Check if this old key was set and if so migrate them over to 'playerSettings'
        const chapterTrackPref = await this.$localStore.getPreferenceByKey('useChapterTrack')
        if (chapterTrackPref) {
          this.playerSettings.useChapterTrack = chapterTrackPref === '1'
          const totalTrackPref = await this.$localStore.getPreferenceByKey('useTotalTrack')
          this.playerSettings.useTotalTrack = totalTrackPref === '1'
          const playerLockPref = await this.$localStore.getPreferenceByKey('playerLock')
          this.playerSettings.lockUi = playerLockPref === '1'
        }
        this.savePlayerSettings()
      } else {
        this.playerSettings.useChapterTrack = !!savedPlayerSettings.useChapterTrack
        this.playerSettings.useTotalTrack = !!savedPlayerSettings.useTotalTrack
        this.playerSettings.lockUi = !!savedPlayerSettings.lockUi
        this.playerSettings.scaleElapsedTimeBySpeed = !!savedPlayerSettings.scaleElapsedTimeBySpeed
      }
    },
    savePlayerSettings() {
      return this.$localStore.setPlayerSettings({ ...this.playerSettings })
    },
    //
    // Listeners from audio AbsAudioPlayer
    //
    onPlayingUpdate(data) {
      console.log('onPlayingUpdate', JSON.stringify(data))
      this.isPlaying = !!data.value
      this.$store.commit('setPlayerPlaying', this.isPlaying)
      if (this.isPlaying) {
        this.startPlayInterval()
      } else {
        this.stopPlayInterval()
      }
    },
    onMetadata(data) {
      console.log('onMetadata', JSON.stringify(data))
      this.totalDuration = Number(data.duration.toFixed(2))
      this.currentTime = Number(data.currentTime.toFixed(2))

      // Done loading
      if (data.playerState !== 'BUFFERING' && data.playerState !== 'IDLE') {
        this.isLoading = false
      }

      if (data.playerState === 'ENDED') {
        console.log('[AudioPlayer] Playback ended')
      }
      this.isEnded = data.playerState === 'ENDED'

      console.log('received metadata update', data)

      this.timeupdate()
    },
    // When a playback session is started the native android/ios will send the session
    onPlaybackSession(playbackSession) {
      console.log('onPlaybackSession received', JSON.stringify(playbackSession))
      this.playbackSession = playbackSession

      this.isEnded = false
      this.isLoading = true
      this.syncStatus = 0
      this.$store.commit('setPlaybackSession', this.playbackSession)

      if (this.pendingTranscription) {
        this.pendingTranscription = false
        this.$nextTick(() => {
          this.expandToFullscreen()
          this.showTranscription = true
        })
      }

      // Set track width
      this.$nextTick(() => {
        if (this.titleMarquee) this.titleMarquee.reset()
        this.titleMarquee = new WrappingMarquee(this.$refs.titlewrapper)
        this.titleMarquee.init(this.title)

        this.measureAndUpdateTrackWidth()
      })
    },
    /**
     * The title line is filled by a marquee bound to its element. When the player re-renders that element (a new
     * session, the transcription views opening) the marquee kept writing into the old one and the title above the
     * author showed empty: bind it to the element on screen whenever that changes.
     */
    ensureTitleMarquee() {
      const el = this.$refs.titlewrapper
      if (!el) return
      if (this.titleMarquee && this.titleMarquee.el === el) return
      if (this.titleMarquee) this.titleMarquee.reset()
      this.titleMarquee = new WrappingMarquee(el)
      this.titleMarquee.init(this.title)
    },
    onPlaybackClosed() {
      this.endPlayback()
    },
    onPlaybackFailed(data) {
      console.log('Received onPlaybackFailed evt')
      this.pendingTranscription = false
      var errorMessage = data.value || 'Unknown Error'
      this.$toast.error(`Playback Failed: ${errorMessage}`)
      this.endPlayback()
    },
    onPlaybackSpeedChanged(data) {
      if (!data.value || isNaN(data.value)) return
      this.currentPlaybackRate = Number(data.value)
      this.updateTimestamp()
    },
    async init() {
      await this.loadPlayerSettings()

      AbsAudioPlayer.addListener('onPlaybackSession', this.onPlaybackSession)
      AbsAudioPlayer.addListener('onPlaybackClosed', this.onPlaybackClosed)
      AbsAudioPlayer.addListener('onPlaybackFailed', this.onPlaybackFailed)
      AbsAudioPlayer.addListener('onPlayingUpdate', this.onPlayingUpdate)
      AbsAudioPlayer.addListener('onMetadata', this.onMetadata)
      AbsAudioPlayer.addListener('onProgressSyncFailing', this.showProgressSyncIsFailing)
      AbsAudioPlayer.addListener('onProgressSyncSuccess', this.showProgressSyncSuccess)
      AbsAudioPlayer.addListener('onPlaybackSpeedChanged', this.onPlaybackSpeedChanged)
    },
    async screenOrientationChange() {
      if (this.isRefreshingUI) return
      this.isRefreshingUI = true
      const windowWidth = window.innerWidth
      this.refreshUI()

      // Window width does not always change right away. Wait up to 250ms for a change.
      // iPhone 10 on iOS 16 took between 100 - 200ms to update when going from portrait to landscape
      //   but landscape to portrait was immediate
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (window.innerWidth !== windowWidth) {
          this.refreshUI()
          break
        }
      }

      // playerContainer width transition is 150ms, remeasure after layout settles
      await new Promise((resolve) => setTimeout(resolve, 200))
      this.refreshUI()

      this.isRefreshingUI = false
    },
    measureAndUpdateTrackWidth() {
      if (!this.$refs.track) {
        console.error('Track not loaded', this.$refs)
        return
      }
      this.trackWidth = this.$refs.track.clientWidth
      this.updateTrack()
      this.updateReadyTrack()
    },
    refreshUI() {
      this.updateScreenSize()
      this.$nextTick(() => {
        this.measureAndUpdateTrackWidth()
      })
    },
    /**
     * Landscape: the cover is on the left; on the right the title and author, then the time row and the
     * controls. The read-along card goes in the gap between the author line and the time row, measured from
     * the actual layout (it differs between phones and tablets). No gap big enough: no card.
     */
    measureLandscapeCard() {
      if (!this.showFullscreen || !this.windowHeight || this.windowWidth < this.windowHeight || !this.$el || !this.$el.querySelector) {
        if (this.landscapeCardBox) this.landscapeCardBox = null
        return
      }
      const root = this.$el.getBoundingClientRect()
      const author = this.$el.querySelector('.title-author-texts .author-text')
      const track = this.$el.querySelector('#playerTrack')
      if (!author || !track) return
      const a = author.getBoundingClientRect()
      const t = track.getBoundingClientRect()
      const top = a.bottom + 2
      const height = Math.min(44, t.top - 2 - top)
      if (height < 28 || t.width < 120) {
        this.landscapeCardBox = null
        return
      }
      const box = {
        compact: true,
        style: { left: Math.round(t.left - root.left + 24) + 'px', width: Math.round(t.width - 48) + 'px', top: Math.round(top - root.top + (t.top - 2 - top - height) / 2) + 'px', height: Math.round(height) + 'px' }
      }
      if (JSON.stringify(box) !== JSON.stringify(this.landscapeCardBox)) this.landscapeCardBox = box
    },
    updateScreenSize() {
      setTimeout(() => {
        if (this.titleMarquee) this.titleMarquee.init(this.title)
      }, 500)
      // after the player has laid itself out for the new size
      this.$nextTick(() => this.measureLandscapeCard())
      setTimeout(() => this.measureLandscapeCard(), 450)
      setTimeout(() => this.measureLandscapeCard(), 1200)

      this.windowHeight = window.innerHeight
      this.windowWidth = window.innerWidth
      const coverHeight = this.fullscreenBookCoverWidth * this.bookCoverAspectRatio
      const coverImageWidthCollapsed = 46 / this.bookCoverAspectRatio
      const titleAuthorLeftOffsetCollapsed = 30 + coverImageWidthCollapsed
      const titleAuthorWidthCollapsed = this.windowWidth - 128 - titleAuthorLeftOffsetCollapsed - 10

      document.documentElement.style.setProperty('--cover-image-width', this.fullscreenBookCoverWidth + 'px')
      document.documentElement.style.setProperty('--cover-image-height', coverHeight + 'px')
      document.documentElement.style.setProperty('--cover-image-width-collapsed', coverImageWidthCollapsed + 'px')
      document.documentElement.style.setProperty('--cover-image-height-collapsed', 46 + 'px')
      document.documentElement.style.setProperty('--title-author-left-offset-collapsed', titleAuthorLeftOffsetCollapsed + 'px')
      document.documentElement.style.setProperty('--title-author-width-collapsed', titleAuthorWidthCollapsed + 'px')
    },
    // From the book page "Transcribe" button. { pending: true } = a session is about to load for that book
    openTranscriptionEvt(payload) {
      if (payload && payload.pending) {
        this.pendingTranscription = true
        return
      }
      if (!this.playbackSession) return
      this.expandToFullscreen()
      this.showTranscription = true
      // from read along's top bar: Lyrics / Karaoke, or the search box
      if (payload && (payload.mode || payload.search || payload.menu)) {
        this.$nextTick(() => {
          const panel = this.$refs.transcriptionPanel
          if (!panel) return
          if (payload.mode) panel.setViewMode(payload.mode)
          if (payload.menu) panel.showMenu = true
          if (payload.search) setTimeout(() => panel.$refs.searchInput && panel.$refs.searchInput.focus(), 350)
        })
      }
    },
    minimizePlayerEvt() {
      // Android back button: close Transcription first, then minimize the player
      if (this.showTranscription) {
        this.showTranscription = false
        return
      }
      this.collapseFullscreen()
    },
    showProgressSyncIsFailing() {
      this.syncStatus = this.$constants.SyncStatus.FAILED
    },
    showProgressSyncSuccess() {
      this.syncStatus = this.$constants.SyncStatus.SUCCESS
    }
  },
  mounted() {
    // the landscape card's spot follows the layout: measured again whenever the player's track row or the
    // title/author block change size or place (rotation, the full player opening, a longer title)
    if (window.ResizeObserver) {
      let pending = 0
      this.cardRO = new ResizeObserver(() => {
        cancelAnimationFrame(pending)
        pending = requestAnimationFrame(() => this.measureLandscapeCard())
      })
      this.$nextTick(() => {
        ;['#playerTrack', '.title-author-texts'].forEach((sel) => {
          const el = this.$el && this.$el.querySelector && this.$el.querySelector(sel)
          if (el) this.cardRO.observe(el)
        })
        if (this.$el) this.cardRO.observe(this.$el)
      })
    }
    window.addEventListener('keydown', this.onKey)
    this.updateScreenSize()
    if (screen.orientation) {
      // Not available on ios
      screen.orientation.addEventListener('change', this.screenOrientationChange)
    } else {
      document.addEventListener('orientationchange', this.screenOrientationChange)
    }
    window.addEventListener('resize', this.screenOrientationChange)

    this.$eventBus.$on('minimize-player', this.minimizePlayerEvt)
    this.$eventBus.$on('open-transcription', this.openTranscriptionEvt)
    document.body.addEventListener('touchstart', this.touchstart, { passive: false })
    document.body.addEventListener('touchend', this.touchend)
    document.body.addEventListener('touchmove', this.touchmove)
    this.$nextTick(this.init)
  },
  beforeDestroy() {
    if (this.cardRO) this.cardRO.disconnect()
    window.removeEventListener('keydown', this.onKey)
    if (screen.orientation) {
      // Not available on ios
      screen.orientation.removeEventListener('change', this.screenOrientationChange)
    } else {
      document.removeEventListener('orientationchange', this.screenOrientationChange)
    }
    window.removeEventListener('resize', this.screenOrientationChange)

    if (this.playbackSession) {
      console.log('[AudioPlayer] Before destroy closing playback')
      this.closePlayback()
    }

    this.forceCloseDropdownMenu()
    this.$eventBus.$off('minimize-player', this.minimizePlayerEvt)
    this.$eventBus.$off('open-transcription', this.openTranscriptionEvt)
    document.body.removeEventListener('touchstart', this.touchstart)
    document.body.removeEventListener('touchend', this.touchend)
    document.body.removeEventListener('touchmove', this.touchmove)

    if (AbsAudioPlayer.removeAllListeners) {
      AbsAudioPlayer.removeAllListeners()
    }
    clearInterval(this.playInterval)
  }
}
</script>

<style>
:root {
  --cover-image-width: 0px;
  --cover-image-height: 0px;
  --cover-image-width-collapsed: 46px;
  --cover-image-height-collapsed: 46px;
  --title-author-left-offset-collapsed: 80px;
  --title-author-width-collapsed: 40%;
}

.playerContainer {
  height: 120px;
}
.fullscreen .playerContainer {
  height: 200px;
}
@media (orientation: landscape) {
  .fullscreen .playerContainer {
    width: 50%;
    left: 50%;
  }
}
#playerContent {
  box-shadow: 0px -8px 8px #11111155;
}
.fullscreen #playerContent {
  box-shadow: none;
}

#playerTrack {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: margin;
  bottom: 35px;
  max-width: 100%;
}
.fullscreen #playerTrack {
  bottom: unset;
}

.cover-wrapper {
  bottom: 68px;
  left: 24px;
  height: var(--cover-image-height-collapsed);
  width: var(--cover-image-width-collapsed);
  transition: all 0.25s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: left, bottom, width, height;
  transform-origin: left bottom;
  border-radius: 3px;
  overflow: hidden;
}
@media (orientation: landscape) {
  .fullscreen .cover-wrapper {
    left: 25px !important;
    top: 50px;
    width: calc(50% - 25px) !important;
    height: calc(100% - 85px) !important;
  }
  .fullscreen .cover-wrapper > div > div {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
  }
  .fullscreen .cover-wrapper > div > div > div {
    background-color: transparent;
  }
  .fullscreen .cover-wrapper img {
    object-fit: contain;
  }
}

.total-track {
  bottom: 215px;
  left: 0;
  right: 0;
}
@media (orientation: landscape) {
  .fullscreen .total-track {
    left: 50%;
    width: 50%;
  }
}

@media (orientation: landscape) {
  .fullscreen .title-author-texts {
    left: 50% !important;
    width: 50% !important;
  }
}
.title-author-texts {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: left, bottom, width, height;
  transform-origin: left bottom;

  width: var(--title-author-width-collapsed);
  bottom: 76px;
  left: var(--title-author-left-offset-collapsed);
  text-align: left;
}
.title-author-texts .title-text {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: font-size;
  font-size: 0.85rem;
  line-height: 1.5;
}
@media (orientation: landscape) {
  .fullscreen .title-author-texts .title-text {
    font-size: larger !important;
  }
}
.title-author-texts .author-text {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: font-size;
  font-size: 0.75rem;
  line-height: 1.2;
}
@media (orientation: landscape) {
  .fullscreen .title-author-texts .author-text {
    font-size: inherit !important;
  }
}

.fullscreen .title-author-texts {
  bottom: calc(50% - var(--cover-image-height) / 2 + 50px);
  width: 80%;
  left: 10%;
  text-align: center;
  padding-bottom: calc(((260px - var(--cover-image-height)) / 260) * 40);
  pointer-events: auto;
}
.fullscreen .title-author-texts .title-text {
  font-size: clamp(0.8rem, calc(var(--cover-image-height) / 260 * 20), 1.3rem);
}
.fullscreen .title-author-texts .author-text {
  font-size: clamp(0.6rem, calc(var(--cover-image-height) / 260 * 16), 1rem);
}

#playerControls {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: width, bottom;
  width: 128px;
  padding-right: 24px;
  bottom: 70px;
}
#playerControls .jump-icon {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: font-size;

  margin: 0px 0px;
  font-size: 1.6rem;
}
#playerControls .jump-label {
  margin-top: 2px;
}
#playerControls .play-btn {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: padding, margin, height, width, min-width, min-height;

  height: 40px;
  width: 40px;
  min-width: 40px;
  min-height: 40px;
  margin: 0px 7px;
}
#playerControls .play-btn .material-symbols {
  transition: all 0.15s cubic-bezier(0.39, 0.575, 0.565, 1);
  transition-property: font-size;

  font-size: 1.5rem;
}

.fullscreen .cover-wrapper {
  margin: 0 auto;
  height: var(--cover-image-height);
  width: var(--cover-image-width);
  left: calc(50% - (calc(var(--cover-image-width)) / 2));
  bottom: calc(50% + 120px - (calc(var(--cover-image-height)) / 2));
  border-radius: 16px;
  overflow: hidden;
}

.fullscreen #playerControls {
  width: 100%;
  padding-left: 24px;
  padding-right: 24px;
  bottom: 78px;
  left: 0;
}
.fullscreen #playerControls .jump-icon {
  font-size: 2.4rem;
}
.fullscreen #playerControls .next-icon {
  font-size: 2rem;
}
.fullscreen #playerControls .play-btn {
  height: 65px;
  width: 65px;
  min-width: 65px;
  min-height: 65px;
}
.fullscreen #playerControls .play-btn .material-symbols {
  font-size: 2.1rem;
}
</style>

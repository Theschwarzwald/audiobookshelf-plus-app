<template>
  <!-- Bookmark button (like Audible's Clip): tap = bookmark this second, hold = save the section you hold through -->
  <div
    class="bookmark-btn flex flex-col items-center cursor-pointer select-none relative"
    :class="recording ? 'text-error' : 'text-fg-muted'"
    role="button"
    :aria-label="recording ? 'Saving a section, release to finish' : 'Bookmark. Hold to save a section'"
    @pointerdown.stop.prevent="down"
    @pointerup.stop.prevent="up"
    @pointercancel.stop="cancel"
    @pointerleave="leave"
    @click.stop
    @contextmenu.prevent
  >
    <div class="relative flex items-center justify-center" :class="size === 'lg' ? 'w-9 h-9' : 'w-8 h-8'">
      <svg v-if="recording" class="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" :stroke-dasharray="100.5" :stroke-dashoffset="100.5 - (100.5 * ((elapsed % 60) / 60))" />
      </svg>
      <span class="material-symbols leading-none" :class="[size === 'lg' ? 'text-3xl' : 'text-2xl', { fill: recording || saving || count > 0 }]">{{ recording ? 'content_cut' : 'bookmark_add' }}</span>
      <span v-if="count && !recording" class="absolute -top-1 -right-2 text-[9px] font-bold rounded-full px-1 min-w-[14px] text-center bg-fg text-bg leading-[14px]">{{ count > 99 ? '99+' : count }}</span>
    </div>
    <span class="text-[10px] font-semibold leading-tight" :class="{ 'font-mono': recording }">{{ recording ? formatTime(elapsed) : 'Bookmark' }}</span>
  </div>
</template>

<script>
import { saveBookmark, formatTime, parseBookmark, DEFAULT_CLIP_SEC } from '@/plugins/bookmarks'

const HOLD_MS = 450

export default {
  props: {
    /** Audiobookshelf library item id, or the local item id for books only on the phone */
    libraryItemId: String,
    /** transcript key, for the quote */
    itemKey: String,
    /** () => Promise<number>: current playback position in seconds */
    getTime: { type: Function, required: true },
    size: { type: String, default: 'md' }
  },
  data() {
    return {
      pressedAt: 0,
      startTime: null,
      holdTimer: null,
      tick: null,
      recording: false,
      elapsed: 0,
      saving: false
    }
  },
  computed: {
    count() {
      return this.$store.getters['bookmarks/forItem'](this.libraryItemId).length
    }
  },
  methods: {
    formatTime,
    down(e) {
      if (e.button !== undefined && e.button !== 0) return
      if (e.target && e.target.setPointerCapture) {
        try {
          e.target.setPointerCapture(e.pointerId)
        } catch (err) {}
      }
      this.pressedAt = Date.now()
      this.startTime = null
      // Position at the moment of the press (a tap bookmarks exactly this second)
      this.getTime().then((t) => (this.startTime = t))
      clearTimeout(this.holdTimer)
      this.holdTimer = setTimeout(this.startRecording, HOLD_MS)
    },
    async startRecording() {
      if (!this.pressedAt) return
      this.recording = true
      this.elapsed = 0
      await this.$hapticsImpact()
      this.tick = setInterval(() => {
        this.elapsed = Math.floor((Date.now() - this.pressedAt) / 1000)
      }, 250)
    },
    up() {
      if (!this.pressedAt) return
      const wasRecording = this.recording
      this.reset()
      this.save(wasRecording)
    },
    cancel() {
      this.reset()
    },
    leave(e) {
      // With pointer capture the finger can wander; only a mouse leaving ends the press
      if (e.pointerType === 'mouse' && this.pressedAt) this.up()
    },
    reset() {
      clearTimeout(this.holdTimer)
      clearInterval(this.tick)
      this.holdTimer = null
      this.tick = null
      this.pressedAt = 0
      this.recording = false
    },
    async save(isSection) {
      if (!this.libraryItemId || this.saving) return
      this.saving = true
      try {
        let start = this.startTime
        if (start == null) start = await this.getTime()
        let bm
        if (!isSection) {
          bm = await saveBookmark(this, { libraryItemId: this.libraryItemId, key: this.itemKey, time: start })
        } else {
          let end = await this.getTime()
          // Held while paused (or the player didn't move): save what was just heard
          if (end - start < 2) {
            end = Math.max(start, end)
            start = Math.max(0, end - DEFAULT_CLIP_SEC)
          }
          bm = await saveBookmark(this, { libraryItemId: this.libraryItemId, key: this.itemKey, time: start, end })
        }
        const p = parseBookmark(bm)
        const when = p.kind === 'clip' ? `${formatTime(p.start)}–${formatTime(p.end)}` : formatTime(p.start)
        const offline = !this.$store.state.user.user || this.$store.state.networkConnected === false
        this.$toast.success(`${p.kind === 'clip' ? 'Section' : 'Bookmark'} saved at ${when}${offline ? ' (syncs when online)' : ''} · tap to add a note`, {
          timeout: 5000,
          onClick: () => this.$emit('edit', bm)
        })
        await this.$hapticsImpact()
        this.$emit('saved', bm)
      } catch (error) {
        console.error('[Bookmark] save failed', error)
        this.$toast.error(this.$strings.ToastBookmarkCreateFailed || 'Failed to save bookmark')
      }
      this.saving = false
    }
  },
  beforeDestroy() {
    this.reset()
  }
}
</script>

<style scoped>
.bookmark-btn {
  touch-action: none;
  -webkit-touch-callout: none;
}
</style>

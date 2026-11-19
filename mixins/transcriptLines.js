import { Transcriber } from '@/plugins/transcriber'

/**
 * Shared transcript loading for the Transcription view and the player preview bar.
 * Component must provide `itemKey` and `liveTime` (current playback time in seconds).
 *
 * Lines are stored on the device in the order they were transcribed. Transcription starts
 * where you were listening and does the beginning of the book afterwards, so lines are
 * re-sorted by time here.
 */
export default {
  data() {
    return {
      lines: [],
      rawCount: 0,
      status: null,
      fetchingLines: false,
      refetchPending: false,
      fetchTimer: null,
      fetchResetPending: false
    }
  },
  computed: {
    hasTranscript() {
      return this.lines.length > 0
    },
    activeIndex() {
      // Last line whose start <= current time (binary search)
      const t = (this.liveTime || 0) + 0.15
      const lines = this.lines
      let lo = 0
      let hi = lines.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (lines[mid].s <= t) {
          ans = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      return ans
    },
    /** false when playback is in a part of the book that hasn't been transcribed yet */
    currentTimeTranscribed() {
      const s = this.status
      if (!s || s.status === 'done') return true
      const ranges = s.doneRanges
      if (!Array.isArray(ranges)) return true
      const t = this.liveTime || 0
      return ranges.some((r) => t >= r[0] && t <= r[1])
    }
  },
  methods: {
    resetTranscript() {
      this.lines = []
      this.rawCount = 0
      this.status = null
    },
    async fetchLines(reset) {
      if (!this.itemKey) return
      if (this.fetchingLines) {
        this.refetchPending = true
        return
      }
      this.fetchingLines = true
      try {
        const from = reset ? 0 : this.rawCount
        const res = await Transcriber.getTranscript({ key: this.itemKey, fromIndex: from })
        const incoming = (res.lines || []).map((l) => {
          const line = { s: l.s, e: l.e, t: l.t, lower: (l.t || '').toLowerCase() }
          if (Array.isArray(l.w)) line.w = l.w // per-word times, when the transcript has them
          return line
        })
        let merged = reset ? incoming : this.lines.concat(incoming)
        const last = this.lines.length ? this.lines[this.lines.length - 1].s : -1
        // Only sort when lines arrive out of time order (the second pass covers the start of the book)
        const outOfOrder = incoming.some((l, i) => l.s < (i ? incoming[i - 1].s : last))
        if (reset || outOfOrder) merged = merged.slice().sort((a, b) => a.s - b.s)
        merged.forEach((l, i) => (l.i = i))
        // Frozen: Vue doesn't make thousands of lines reactive. Otherwise every read of `lines` while the
        // player re-renders walks the whole array (Vue 2 dependArray), which cost a full frame on long books.
        // The list is only ever replaced, never changed in place.
        this.lines = Object.freeze(merged)
        this.rawCount = from + incoming.length
        this.status = res.status
        this.onStatusLoaded && this.onStatusLoaded(res.status)
      } catch (error) {
        console.error('[Transcription] fetch failed', error)
      }
      this.fetchingLines = false
      if (this.refetchPending) {
        this.refetchPending = false
        this.fetchLines(false)
      }
    },
    scheduleFetch(reset) {
      if (reset) this.fetchResetPending = true
      if (this.fetchTimer) return
      this.fetchTimer = setTimeout(async () => {
        this.fetchTimer = null
        const r = !!this.fetchResetPending
        this.fetchResetPending = false
        await this.fetchLines(r)
      }, 1500)
    },
    /** Call with each onTranscriptionUpdate event */
    handleTranscriptUpdate(data) {
      if (!data || data.key !== this.itemKey) return
      if (data.status === 'none') {
        // Cancelled / deleted
        this.resetTranscript()
        this.status = data
        return
      }
      this.status = data
      const count = data.linesCount || 0
      // reload: replaced by a newer copy from the server (or the server's job finished and was copied here)
      if (data.reload || count < this.rawCount) this.scheduleFetch(true) // lines were trimmed on resume
      else if (count > this.rawCount || data.status === 'done') this.scheduleFetch(false)
    }
  },
  beforeDestroy() {
    clearTimeout(this.fetchTimer)
  }
}

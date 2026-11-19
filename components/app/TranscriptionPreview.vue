<template>
  <!-- Read along on the cover screen: the line being narrated under the artwork, its words lighting up as they're said -->
  <div class="transcription-preview rounded-xl px-4 cursor-pointer overflow-hidden flex flex-col justify-center" :class="compact ? 'py-1' : 'py-2'" :style="{ backgroundColor: overlay(0.12), color: textColor }" @click.stop="$emit('open')">
    <div v-if="!compact" class="flex items-center text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-0.5">
      <span class="material-symbols text-sm mr-1">record_voice_over</span>
      <span class="flex-grow">Transcription</span>
      <span v-if="isActive">{{ progressPct }}%</span>
      <span class="material-symbols text-sm ml-1">open_in_full</span>
    </div>

    <template v-if="hasTranscript && currentTimeTranscribed && currentLine">
      <!-- One line, the word being said kept in the centre: the line glides along under it -->
      <p ref="line" class="p-current font-bold leading-snug">
        <span ref="track" class="p-track" :class="{ 'p-jump': trackJump || eink, 'p-smooth': smooth }" :style="smooth ? null : { transform: `translateX(${shift}px)` }"
          ><span v-if="smooth" ref="pill" class="p-pill" :style="{ backgroundColor: kSoft, boxShadow: 'inset 0 0 0 1.5px ' + kAccent }" /><template v-if="prevWords.length"
            ><span v-for="(w, i) in prevWords" :key="'p' + activeIndex + '-' + i" class="p-behind">{{ w }}</span><span class="p-behind">&nbsp;&nbsp;&nbsp;</span></template
          ><span v-for="(w, i) in currentWords" :key="activeIndex + '-' + i" class="p-word" :class="{ 'p-said': w.said, 'p-now': w.now, 'p-grp': w.grp && !smooth, 'p-grp-first': w.grpFirst, 'p-grp-last': w.grpLast }" :style="!smooth && (w.now || w.grp) ? blockStyleFor(w) : null">{{ w.text }}</span
          ><template v-if="nextWords.length"
            ><span class="p-gap">&nbsp;&nbsp;&nbsp;</span><span v-for="(w, i) in nextWords" :key="'n' + activeIndex + '-' + i" class="p-ahead">{{ w }}</span></template
          ></span
        >
      </p>
    </template>
    <p v-else-if="hasTranscript && !currentTimeTranscribed" class="text-sm opacity-80 leading-snug truncate">This part isn't transcribed yet{{ isActive ? ` · ${progressPct}% done` : '' }}. Tap to see what's ready.</p>
    <p v-else-if="isActive" class="text-sm opacity-80 leading-snug truncate">Transcribing… {{ progressPct }}%. The first lines will show here soon.</p>
    <p v-else-if="status && status.status === 'paused'" class="text-sm opacity-80 leading-snug truncate">Transcription paused at {{ progressPct }}%. Tap to resume.</p>
    <p v-else-if="hasTranscript" class="text-sm opacity-80 leading-snug truncate">Tap to open the transcription.</p>
    <p v-else class="text-sm opacity-80 leading-snug truncate">Tap to transcribe this book and follow along with the words.</p>
  </div>
</template>

<script>
import { AbsAudioPlayer } from '@/plugins/capacitor'
import { Transcriber } from '@/plugins/transcriber'
import transcriptLines from '@/mixins/transcriptLines'

export default {
  mixins: [transcriptLines],
  props: {
    itemKey: String,
    currentTime: { type: Number, default: 0 },
    isPlaying: Boolean,
    /** playback speed, to follow the voice between position checks */
    playbackRate: { type: Number, default: 1 },
    coverBgIsLight: Boolean,
    /** true when there is only room for one line */
    compact: Boolean
  },
  data() {
    return {
      liveTime: 0,
      // how far the line is moved so the current word sits in the middle
      shift: 0,
      trackJump: false,
      timePoll: null,
      listener: null
    }
  },
  computed: {
    /** LCD / OLED (not e-ink, not low power): the line glides with the voice every frame, the highlight slides */
    smooth() {
      return !this.$store.getters['device/isEink'] && this.$store.getters['device/perf'].tier !== 'low'
    },
    /** e-ink: no sliding at all (each frame of a slide is a slow, ghosting redraw on the panel) */
    eink() {
      return !!this.$store.getters['device/isEink']
    },
    /** The same colours as the Karaoke highlight: an orange outline round a soft orange tint */
    /** black-and-white e-ink: ink instead of orange (colour turns into grey dots there) */
    bwEink() {
      const t = this.$store.getters['device/theme'] || ''
      return t === 'eink' || t === 'eink-dark'
    },
    kAccent() {
      if (this.bwEink) return this.$store.getters['device/theme'] === 'eink-dark' ? '#fff' : '#000'
      return '#e49b4f'
    },
    kSoft() {
      // colour e-ink: no fill (drawn as dots), just the outline and underline
      if ((this.$store.getters['device/theme'] || '').startsWith('eink-color')) return 'transparent'
      if (this.bwEink) return this.$store.getters['device/theme'] === 'eink-dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)'
      return 'rgba(228, 155, 79, 0.14)'
    },
    textColor() {
      return this.coverBgIsLight ? '#111111' : '#ffffff'
    },
    isActive() {
      return this.status && (this.status.status === 'running' || this.status.status === 'queued')
    },
    progressPct() {
      return Math.round(((this.status && this.status.progress) || 0) * 100)
    },
    currentLine() {
      if (this.activeIndex < 0) return null
      // Long pause with no speech: still show the last line, like Spotify does
      return this.lines[this.activeIndex]
    },
    nextLine() {
      if (this.activeIndex + 1 >= this.lines.length) return null
      return this.lines[this.activeIndex + 1]
    },
    /**
     * Smooth mode: the lines before and after sit on the same track as the current one, so the text runs on
     * like a ticker: the sentence just said scrolls away to the left instead of disappearing.
     */
    nextWords() {
      const l = this.nextLine
      if (!l) return []
      // only the words that can come into view: about half the card (~150 px) either side of the middle word is
      // ever seen, so ~6 words (12 parts with the spaces) is enough; a short strip is cheaper to slide
      return String(l.t || '')
        .split(/(\s+)/)
        .filter((p) => p !== '')
        .slice(0, 12)
    },
    prevWords() {
      const l = this.activeIndex > 0 ? this.lines[this.activeIndex - 1] : null
      if (!l) return []
      return String(l.t || '')
        .split(/(\s+)/)
        .filter((p) => p !== '')
        .slice(-12)
    },
    /** The current line split into words and spaces, each word with when it's said (engine word times, or spread over the line) */
    lineWords() {
      const l = this.currentLine
      if (!l) return []
      const text = String(l.t || '')
      const parts = text.split(/(\s+)/).filter((p) => p !== '')
      const wordCount = parts.filter((p) => !/^\s+$/.test(p)).length
      const end = typeof l.e === 'number' && l.e > l.s ? l.e : l.s + 2
      const timed = Array.isArray(l.w) && l.w.length === wordCount
      const total = Math.max(1, text.length)
      let at = 0
      let k = 0
      return parts.map((p) => {
        const space = /^\s+$/.test(p)
        let t = null
        if (!space) {
          t = timed ? Number(l.w[k][1]) : l.s + (at / total) * (end - l.s)
          k++
        }
        at += p.length
        return { text: p, t }
      })
    },
    /** Words already said are full strength, the one being said is marked, the rest are dimmed */
    currentWords() {
      const t = (this.liveTime || 0) + 0.02 // the word being said now (0.02 s covers timer jitter)
      const ws = this.lineWords
      let now = -1
      ws.forEach((w, i) => {
        if (w.t != null && w.t <= t) now = i
      })
      // e-ink / low power: a block of three words (the one being said and one either side, the spaces between
      // included) so each step reads as a phrase; the middle word stays in the centre of the card
      let from = -1
      let to = -1
      if (!this.smooth && now >= 0 && ws[now] && ws[now].t != null) {
        const wordIdx = ws.map((w, i) => (w.t != null ? i : -1)).filter((i) => i >= 0)
        const k = wordIdx.indexOf(now)
        from = wordIdx[Math.max(0, k - 1)]
        to = wordIdx[Math.min(wordIdx.length - 1, k + 1)]
      }
      return ws.map((w, i) => ({ text: w.text, said: i <= now, now: i === now && w.t != null, grp: from >= 0 && i >= from && i <= to, grpFirst: i === from, grpLast: i === to }))
    }
  },
  watch: {
    itemKey: {
      immediate: true,
      handler() {
        this.resetTranscript()
        if (this.itemKey) this.fetchLines(true)
      }
    },
    currentTime: {
      immediate: true,
      handler(t) {
        // The player's 1 s clock lags the position checks: only take it when paused or after a jump
        if (!this.isPlaying || !this.anchor || Math.abs(t - this.liveTime) > 2) {
          this.liveTime = t
          this.anchor = { t, at: performance.now() }
        }
      }
    },
    isPlaying(p) {
      if (p) this.frames()
    },
    activeIndex(now, before) {
      if (this.smooth) {
        // The words moved inside the track (the line just said is now in front, the old next line is now the
        // current one). Next line in order: shift the track and the highlight by exactly what moved, from
        // wherever their slide has got to, so nothing moves on screen, then carry on. Otherwise (a seek):
        // place them at once.
        const aheadX = now === before + 1 ? this._nextX : null
        this.$nextTick(() => {
          const track = this.$refs.track
          const first = track && track.querySelector('.p-word')
          if (aheadX != null && first) {
            const d = first.offsetLeft - aheadX
            this.moveTo(track, this.liveX(track) - d, 0)
            const pill = this.$refs.pill
            if (pill) this.moveTo(pill, this.liveX(pill) + d, 0, this.liveW(pill))
            this.measureWords()
            if (this.isPlaying) this.glide()
            else this.placeTrack(this.nowTime(), true)
          } else {
            this.measureWords()
            this.placeTrack(this.nowTime(), true)
            if (this.isPlaying) this.glide()
          }
        })
        return
      }
      // a new line: place it at once (no glide from where the last line ended)
      this.trackJump = true
      this.$nextTick(() => {
        this.keepWordInView()
        requestAnimationFrame(() => (this.trackJump = false))
      })
    },
    currentWords() {
      if (this.smooth) {
        // glide() moves the line while playing; only place it here when paused (or not yet measured)
        if (this.isPlaying && this._stops && this._stops.length) return
        this.$nextTick(() => {
          if (!this._stops || !this._stops.length) this.measureWords()
          this.placeTrack(this.liveTime || 0, !this.isPlaying)
          if (this.isPlaying) this.glide()
        })
        return
      }
      this.$nextTick(this.keepWordInView)
    }
  },
  methods: {
    /**
     * Between position checks, follow the voice from the last known position and the playback speed
     * (10 steps a second), so the word lights up as it's said rather than up to a check later.
     * Not on e-ink or in low power.
     */
    frames() {
      if (this.smooth) return this.glide()
      if (this.$store.getters['device/isEink'] && this.$store.getters['device/perf'].tier !== 'low') return this.einkStep()
      if (this.raf) return
      const step = () => {
        this.raf = 0
        const a = this.anchor
        const perf = this.$store.getters['device/perf']
        if (!this.isPlaying || !a || document.hidden || perf.tier === 'low' || this.$store.getters['device/isEink']) return
        const t = a.t + Math.min(1.5, ((performance.now() - a.at) / 1000) * (this.playbackRate || 1))
        if (Math.floor(t * 10) !== Math.floor(this.liveTime * 10)) this.liveTime = t
        this.raf = setTimeout(step, 80)
      }
      this.raf = setTimeout(step, 80) // ~12 a second, not every display frame: easier on the battery
    },
    /**
     * E-ink: the card changes only when the next word starts (from the last position check and the playback
     * speed), so each step lands on the word, with nothing redrawn in between (the panel is slow to redraw)
     */
    einkStep() {
      clearTimeout(this.raf)
      this.raf = 0
      const a = this.anchor
      if (!this.isPlaying || !a || document.hidden) return
      const rate = this.playbackRate || 1
      const now = a.t + Math.min(1.5, ((performance.now() - a.at) / 1000) * rate)
      this.liveTime = now
      // the next moment something changes: the next word (as currentWords sees it) or the next line
      const t = now + 0.02
      let next = Infinity
      for (const w of this.lineWords) if (w.t != null && w.t > t) next = Math.min(next, w.t)
      const nl = this.nextLine
      if (nl) next = Math.min(next, nl.s - 0.15)
      if (!isFinite(next)) return
      const ms = Math.max(30, ((next - t) / rate) * 1000 + 15)
      this.raf = setTimeout(() => this.einkStep(), Math.min(ms, 2000))
    },
    /** Where each word sits on the line, and when it's said (measured once per line) */
    measureWords() {
      const track = this.$refs.track
      if (!track) return (this._stops = [])
      const els = track.querySelectorAll('.p-word')
      const ws = this.lineWords
      // The stops the line moves between: the word being said is held exactly in the middle of the card, and
      // just before the next word (MOVE seconds, less for quick words) the line slides on so that word arrives
      // in the middle as it's said. After the last word it slides on to the next line's first word, already
      // waiting on the track, so the text never stops or jumps between sentences.
      const stops = []
      els.forEach((el, i) => {
        const w = ws[i]
        if (w && w.t != null) stops.push({ t: w.t, x: el.offsetLeft, w: el.offsetWidth })
      })
      const ahead = track.querySelector('.p-ahead')
      this._nextX = ahead ? ahead.offsetLeft : null
      const next = this.nextLine
      const nextT = next ? (Array.isArray(next.w) && next.w.length ? Number(next.w[0][1]) : next.s) : null
      const last = stops[stops.length - 1]
      if (last && ahead && nextT != null && nextT > last.t) stops.push({ t: nextT, x: ahead.offsetLeft, w: ahead.offsetWidth })
      // Each word arrives in the middle, highlighted, a little BEFORE it is said, so it is already marked when
      // the eye gets there: up to LEAD ahead, or 60% of the gap since the word before when words come faster
      // (so the highlight is always on the word about to be said, never words ahead of the voice).
      const MOVE = this.moveSecs()
      const LEAD = this.lead()
      stops.forEach((s, j) => {
        const gap = j ? s.t - stops[j - 1].t : Infinity
        s.arrive = s.t - Math.min(LEAD, gap * 0.6)
        s.slide = j ? s.arrive - Math.min(MOVE, Math.max(0, s.arrive - stops[j - 1].arrive) * 0.6) : -Infinity
      })
      this._stops = stops
      this._k = null
      // the middle of the card in the track's own coordinates (the line has padding on the left)
      const box = this.$refs.line
      this._half = box ? box.clientWidth / 2 - (parseFloat(getComputedStyle(box).paddingLeft) || 0) : 0
    },
    /** Playback time now, following the voice from the last position check */
    nowTime() {
      const a = this.anchor
      if (!this.isPlaying || !a) return this.liveTime || 0
      return a.t + Math.min(1.5, ((performance.now() - a.at) / 1000) * (this.playbackRate || 1))
    },
    /**
     * The most a word is highlighted ahead of the voice (media seconds, about half a second of real time).
     * Quick words get less (see measureWords), so it never runs words ahead.
     */
    lead() {
      return 0 // the highlighted word is the word being spoken (it used to run half a second ahead)
    },
    /** How long the slide from one word to the next takes */
    moveSecs() {
      return 0.16 * (this.playbackRate || 1) > 0.3 ? 0.3 : 0.16
    },
    /**
     * Smooth mode while playing. Battery friendly: no work on every frame. Each slide to the next word is a
     * CSS transition the compositor runs by itself; this wakes once per word (when the next slide is due),
     * starts it, and sleeps again. While a word is being said nothing runs at all.
     */
    glide() {
      clearTimeout(this._glideT)
      this._glideT = 0
      if (!this.smooth || !this.isPlaying || !this.anchor || document.hidden) return
      const now = this.nowTime()
      this.liveTime = now // words said so far, and the current line
      const due = this.placeTrack(now, false)
      if (due != null) this._glideT = setTimeout(() => this.glide(), Math.max(16, (due * 1000) / (this.playbackRate || 1)))
    },
    /** The track's (or the highlight's) current position, part way through a slide if one is running */
    liveX(el) {
      const m = getComputedStyle(el).transform
      if (!m || m === 'none') return 0
      const v = m.match(/matrix(3d)?\(([^)]+)\)/)
      if (!v) return 0
      const n = v[2].split(',').map(Number)
      return v[1] ? n[12] : n[4]
    },
    /** The highlight's current width (its scale times its 100 px base), part way through a slide too */
    liveW(el) {
      const m = getComputedStyle(el).transform
      const v = m && m.match(/matrix(3d)?\(([^)]+)\)/)
      return v ? Number(v[2].split(',')[0]) * 100 : 100
    },
    /**
     * Move el to translateX(x), sliding there over `secs` (0 = at once). width: the highlight's width, done
     * with scaleX of a 100 px box so the slide is transform only: the compositor runs it with no layout or
     * repaint on any frame.
     */
    moveTo(el, x, secs, width) {
      if (!el) return
      el.style.transition = secs > 0.01 ? `transform ${secs.toFixed(3)}s ease-in-out` : 'none'
      el.style.transform = `translate3d(${x.toFixed(2)}px,0,0)` + (width != null ? ` scaleX(${(width / 100).toFixed(4)})` : '')
      if (!(secs > 0.01)) void el.offsetWidth // apply now, without a transition
    },
    /**
     * Smooth mode: put the line (and the highlight) on the word for time t, sliding there if its slide has
     * started. Returns how long (media seconds) until the next slide is due, or null when there is none.
     */
    placeTrack(t, snap) {
      const stops = this._stops
      if (!this.$refs.track || !stops || !stops.length) return null
      if (this._half == null) this.measureWords()
      let k = 0
      for (let j = 1; j < stops.length; j++) if (stops[j].slide <= t) k = j
      const s = stops[k]
      if (k !== this._k || snap) {
        const secs = snap ? 0 : Math.max(0, s.arrive - t) / (this.playbackRate || 1)
        this._k = k
        this._x = this._half - (s.x + s.w / 2)
        this.moveTo(this.$refs.track, this._x, secs)
        const pill = this.$refs.pill
        if (pill) {
          pill.style.opacity = '1'
          this.moveTo(pill, s.x - 2, secs, s.w + 4)
        }
      }
      return k + 1 < stops.length ? Math.max(0, stops[k + 1].slide - t) : null
    },
    /** Move the line so the word being said (or the first word, before it starts) is in the middle of the card */
    keepWordInView() {
      if (this.smooth) {
        this.measureWords()
        this.placeTrack(this.liveTime || 0, true)
        if (this.isPlaying) this.glide()
        return
      }
      const box = this.$refs.line
      const track = this.$refs.track
      if (!box || !track) return
      const word = track.querySelector('.p-now') || track.querySelector('.p-word')
      if (!word) return
      const center = word.offsetLeft + word.offsetWidth / 2
      const want = Math.round(box.clientWidth / 2 - center)
      if (Math.abs(want - this.shift) > 1) this.shift = want
    },
    /**
     * e-ink / low power: the three-word block looks like Karaoke's: one box outlined in orange round a soft tint
     * (each word draws its part of the outline: top and bottom, plus the left end on the first and the right on
     * the last), the word being said underlined
     */
    blockStyleFor(w) {
      const line = '1.5px solid ' + this.kAccent
      return {
        backgroundColor: this.kSoft,
        borderTop: line,
        borderBottom: line,
        borderLeft: w.grpFirst ? line : '0',
        borderRight: w.grpLast ? line : '0',
        boxShadow: '0.5px 0 0 ' + this.kSoft
      }
    },
    overlay(alpha) {
      return this.coverBgIsLight ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`
    }
  },
  mounted() {
    Transcriber.addListener('onTranscriptionUpdate', (data) => this.handleTranscriptUpdate(data)).then((h) => (this.listener = h))
    // Follow the voice closely (word by word) while the cover screen is showing
    this.timePoll = setInterval(async () => {
      if (!this.isPlaying || document.hidden) return
      try {
        const data = await AbsAudioPlayer.getCurrentTime()
        if (data && typeof data.value === 'number') {
          this.liveTime = data.value
          this.anchor = { t: data.value, at: performance.now() }
          this.frames()
        }
      } catch (e) {}
    }, Math.max(150, this.$store.getters['device/perf'].clockMs))
  },
  beforeDestroy() {
    clearInterval(this.timePoll)
    if (this.raf) clearTimeout(this.raf)
    clearTimeout(this._glideT)
    if (this.listener) this.listener.remove()
  }
}
</script>

<style scoped>
.p-word {
  opacity: 0.45;
  border-radius: 4px;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}
.p-word.p-said {
  opacity: 1;
}
/* e-ink / low power: three words highlighted as one block */
.p-word.p-grp {
  border-radius: 0;
  opacity: 1;
  transition: none;
}
/* black-and-white e-ink: taller than the text, so the underline under the word being said sits clear of the
   box's bottom edge */
html:is([data-theme='eink'], [data-theme='eink-dark']) .p-word.p-grp {
  padding-top: 3px;
  padding-bottom: 9px;
}
.p-word.p-grp.p-grp-first {
  border-radius: 6px 0 0 6px;
  padding-left: 2px;
}
.p-word.p-grp.p-grp-last {
  border-radius: 0 6px 6px 0;
  padding-right: 2px;
}
.p-word.p-grp.p-grp-first.p-grp-last {
  border-radius: 6px;
}
.p-word.p-grp.p-now {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
html:is([data-theme='eink'], [data-theme='eink-dark']) .p-word.p-grp.p-now {
  text-underline-offset: 4px;
}
.p-current {
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  /* soft fade at the edges where the line continues */
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%);
  padding: 0 4px;
}
.p-track {
  display: inline-block;
  will-change: transform;
  transition: transform 0.28s ease-out;
}
.p-track.p-jump,
.p-track.p-smooth {
  transition: none;
}
.p-track.p-smooth {
  position: relative;
}
.p-pill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  opacity: 0;
  z-index: -1;
  /* a 100 px box scaled to the word (scaleX) and moved with translate: transform only, so the compositor
     slides it with the line and nothing is laid out or repainted per frame */
  width: 100px;
  transform-origin: 0 50%;
  will-change: transform;
  transition: opacity 0.2s ease;
}
.p-track.p-smooth .p-word {
  position: relative;
}
/* e-ink / low power: the next sentence waits dimmed like the words not said yet (the one before is full strength) */
.p-track:not(.p-smooth) .p-ahead,
.p-track:not(.p-smooth) .p-gap {
  opacity: 0.45;
}
/* smooth mode: every word the same full white (the highlight alone shows the word being said) */
.p-track.p-smooth .p-word {
  opacity: 1;
  transition: none;
}
.p-next {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

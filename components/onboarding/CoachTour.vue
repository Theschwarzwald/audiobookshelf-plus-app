<template>
  <!-- Guided tour: dims the screen, rings the button being explained, and says what it does -->
  <div v-if="screen && step" class="coach fixed inset-0" style="z-index: 200" @click.stop @touchstart.stop>
    <div v-if="rect" class="coach-hole" :style="holeStyle" />
    <div v-else class="coach-dim" />
    <div ref="card" class="coach-card" :style="cardStyle" role="dialog" aria-live="polite">
      <p class="text-xs coach-muted mb-1">{{ index + 1 }} of {{ steps.length }}</p>
      <p class="font-semibold text-base mb-1">{{ step.title }}</p>
      <p class="text-sm leading-snug">{{ step.text }}</p>
      <div class="flex items-center mt-3">
        <button class="text-sm coach-muted px-1 py-1" @click="finish(true)">Skip tour</button>
        <div class="flex-grow" />
        <button v-if="index > 0" class="coach-btn mr-2" @click="go(-1)">Back</button>
        <button class="coach-btn coach-primary" @click="go(1)">{{ index === steps.length - 1 ? 'Done' : 'Next' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { TOURS } from './tourSteps'

const PAD = 8

export default {
  data() {
    return { index: 0, steps: [], rect: null, timer: null, cardH: 160 }
  },
  computed: {
    screen() {
      return this.$store.state.onboarding.activeTour
    },
    step() {
      return this.steps[this.index]
    },
    holeStyle() {
      const r = this.rect
      return { left: `${r.left - PAD}px`, top: `${r.top - PAD}px`, width: `${r.width + PAD * 2}px`, height: `${r.height + PAD * 2}px` }
    },
    cardStyle() {
      const W = window.innerWidth
      const H = window.innerHeight
      const width = Math.min(360, W - 24)
      if (!this.rect) return { width: `${width}px`, left: `${(W - width) / 2}px`, top: `${Math.max(24, H / 2 - this.cardH / 2)}px` }
      const r = this.rect
      const below = r.bottom + PAD + 12
      const fitsBelow = below + this.cardH < H - 12
      const top = fitsBelow ? below : Math.max(12, r.top - PAD - 12 - this.cardH)
      const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), W - width - 12)
      return { width: `${width}px`, left: `${left}px`, top: `${top}px` }
    }
  },
  watch: {
    screen: {
      immediate: true,
      handler(s) {
        clearInterval(this.timer)
        if (!s) return
        // only the steps whose buttons are on screen
        this.steps = (TOURS[s] || []).filter((st) => !st.target || this.find(st.target))
        this.index = 0
        if (!this.steps.length) return this.$store.dispatch('onboarding/tourDone', { screen: s })
        this.measure()
        // follow the button if the layout moves (keyboard, rotation, the player opening…)
        this.timer = setInterval(this.measure, 400)
      }
    },
    index() {
      this.measure()
    }
  },
  methods: {
    find(id) {
      const el = document.querySelector(`[data-tour="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight ? el : null
    },
    measure() {
      if (!this.step) return
      const el = this.step.target && this.find(this.step.target)
      const r = el ? el.getBoundingClientRect() : null
      this.rect = r ? { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom } : null
      this.$nextTick(() => {
        if (this.$refs.card) this.cardH = this.$refs.card.offsetHeight
      })
    },
    go(d) {
      const next = this.index + d
      if (next >= this.steps.length) return this.finish(false)
      if (next >= 0) this.index = next
    },
    finish(skipAll) {
      clearInterval(this.timer)
      this.$store.dispatch('onboarding/tourDone', { screen: this.screen, skipAll })
    },
    onKey(e) {
      if (!this.screen) return
      if (e.key === 'Escape') this.finish(true)
      else if (e.key === 'ArrowRight' || e.key === 'Enter') this.go(1)
      else if (e.key === 'ArrowLeft') this.go(-1)
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey, true)
  },
  beforeDestroy() {
    clearInterval(this.timer)
    window.removeEventListener('keydown', this.onKey, true)
  }
}
</script>

<style scoped>
.coach-dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}
.coach-hole {
  position: absolute;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 0 3px rgb(var(--color-fg)) inset;
  transition: all 0.2s ease;
  pointer-events: none;
}
.coach-card {
  position: absolute;
  border-radius: 14px;
  padding: 14px 16px;
  background: rgb(var(--color-secondary));
  color: rgb(var(--color-fg));
  border: 1px solid rgb(var(--color-border));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.coach-muted {
  color: rgb(var(--color-fg-muted));
}
.coach-btn {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid rgb(var(--color-border));
}
.coach-primary {
  background: rgb(var(--color-fg));
  color: rgb(var(--color-primary));
  border-color: rgb(var(--color-fg));
}
/* E-ink: no grey wash (it smears); a thick black ring and a bordered card instead */
html[data-theme^='eink'] .coach-dim {
  background: transparent;
}
html[data-theme^='eink'] .coach-hole {
  box-shadow: 0 0 0 4px rgb(var(--color-fg));
  transition: none;
}
html[data-theme^='eink'] .coach-card {
  border-width: 2px;
  box-shadow: none !important;
}
</style>

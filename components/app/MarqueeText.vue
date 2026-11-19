<template>
  <!-- One line of text. Too long to fit: it scrolls slowly to its end and back, pausing at each end, so the whole
       of it can be read. Fits, or e-ink / reduced motion: it stays still (shortened with … when it doesn't fit). -->
  <div ref="box" class="mq" :class="{ 'mq-on': distance > 0 }" :title="text">
    <span ref="inner" class="mq-inner" :style="distance > 0 ? { '--mq-d': `-${distance}px`, animationDuration: `${duration}s` } : null">{{ text }}</span>
  </div>
</template>

<script>
export default {
  props: {
    text: { type: String, default: '' }
  },
  data() {
    return { distance: 0 }
  },
  computed: {
    /** about 30 px a second, plus the pauses at each end (see the keyframes) */
    duration() {
      return Math.max(6, (this.distance / 30) * 2 + 4)
    }
  },
  watch: {
    text() {
      this.distance = 0
      this.$nextTick(this.measure)
    }
  },
  methods: {
    measure() {
      const box = this.$refs.box
      const inner = this.$refs.inner
      if (!box || !inner) return
      // the box's own scroll width (an inline span reports 0): how far the text runs past the edge
      const over = Math.ceil(Math.max(box.scrollWidth, inner.getBoundingClientRect().width) - box.clientWidth)
      this.distance = over > 2 ? over : 0
    }
  },
  mounted() {
    this.$nextTick(this.measure)
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.measure())
      this.ro.observe(this.$refs.box)
    }
  },
  beforeDestroy() {
    if (this.ro) this.ro.disconnect()
  }
}
</script>

<style scoped>
.mq {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.mq-inner {
  display: inline;
}
.mq.mq-on {
  text-overflow: clip;
}
.mq.mq-on .mq-inner {
  display: inline-block;
  will-change: transform;
  animation-name: mq-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
/* rest at the start, scroll to the end, rest, scroll back */
@keyframes mq-scroll {
  0%,
  15% {
    transform: translateX(0);
  }
  50%,
  65% {
    transform: translateX(var(--mq-d));
  }
  100% {
    transform: translateX(0);
  }
}
</style>

<style>
/* E-ink and reduced motion: no scrolling (each frame would be a slow redraw); shortened with … instead */
html.reduce-motion .mq.mq-on,
html[data-theme^='eink'] .mq.mq-on {
  text-overflow: ellipsis;
}
html.reduce-motion .mq.mq-on .mq-inner,
html[data-theme^='eink'] .mq.mq-on .mq-inner {
  display: inline;
  animation: none !important;
  transform: none !important;
}
</style>

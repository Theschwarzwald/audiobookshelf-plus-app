<template>
  <!--
    Lyrics lines. Drawn once and only again when the lines themselves change (new lines, search, ebook fixes);
    the moving highlight is applied straight to the few lines it touches, so following the voice doesn't
    re-draw thousands of lines several times a second.
  -->
  <div>
    <div v-for="line in lines" :key="line.i" :data-i="line.i" class="t-line flex py-2 cursor-pointer" :class="classFor(line.i)" @click="$emit('line', line, $event)">
      <span class="t-ts font-mono text-xs mr-3 pt-1.5 flex-shrink-0 relative">{{ $secondsToTimestamp(line.s) }}<span v-if="bookmarkedLines.has(line.i)" class="material-symbols fill t-bm">{{ bookmarkedLines.get(line.i) }}</span></span>
      <span class="t-text" v-html="renderLine(line)" />
    </div>
  </div>
</template>

<script>
const STATES = ['t-active', 't-past', 't-future']

export default {
  props: {
    lines: { type: Array, default: () => [] },
    query: { type: String, default: '' },
    renderLine: { type: Function, required: true },
    bookmarkedLines: { type: Map, default: () => new Map() },
    /** index of the line being narrated (-1: none) */
    active: { type: Number, default: -1 }
  },
  watch: {
    active(n, o) {
      this.applyActive(n, o)
    }
  },
  created() {
    // read by the render but not reactive: changing the active line must not re-draw the list
    this.snap = this.active
  },
  beforeUpdate() {
    this.snap = this.active
  },
  methods: {
    classFor(i) {
      if (this.query) return 't-search'
      return i === this.snap ? 't-active' : i < this.snap ? 't-past' : 't-future'
    },
    /** The element of line i (children are in line order unless searching) */
    el(i) {
      if (!this.$el) return null
      if (!this.query) {
        const c = this.$el.children[i]
        if (c && Number(c.dataset.i) === i) return c
      }
      return this.$el.querySelector(`[data-i="${i}"]`)
    },
    applyActive(n, o) {
      if (this.query || !this.$el) return
      const kids = this.$el.children
      const from = Math.max(0, Math.min(n, o < 0 ? n : o))
      const to = Math.min(kids.length - 1, Math.max(n, o))
      for (let i = from; i <= to; i++) {
        const c = kids[i]
        if (!c) continue
        const want = i === n ? 't-active' : i < n ? 't-past' : 't-future'
        if (c.classList.contains(want)) continue
        c.classList.remove(...STATES)
        c.classList.add(want)
      }
      this.snap = n
    }
  }
}
</script>

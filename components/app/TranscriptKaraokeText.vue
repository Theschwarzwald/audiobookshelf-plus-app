<template>
  <!--
    Karaoke paragraphs. Drawn once and only again when the text changes; the paragraph and word being
    narrated are marked straight in the page, so following the voice word by word touches one paragraph,
    not the whole book.
  -->
  <div class="k-text" :class="{ 'k-smooth': smooth }" :style="{ fontSize: size + 'px', position: smooth ? 'relative' : null }">
    <!-- LCD / OLED: the word highlight slides from word to word instead of jumping -->
    <div v-if="smooth" ref="pill" class="k-pill" :style="{ borderColor: accent }" />
    <p
      v-for="p in paras"
      :key="'p' + p.i"
      :data-pi="p.i"
      class="k-para"
      :class="{ 'k-heading': p.h, 'k-untimed': p.start == null && !query }"
      @click="$emit('para', p, $event)"
      v-html="renderParagraph(p, null)"
    />
  </div>
</template>

<script>
export default {
  props: {
    paras: { type: Array, default: () => [] },
    query: { type: String, default: '' },
    /** (paragraph, wordIndex | null) -> HTML; with a word index, that word is marked */
    renderParagraph: { type: Function, required: true },
    activePi: { type: Number, default: -1 },
    activeWi: { type: Number, default: -1 },
    accent: { type: String, default: '' },
    accentSoft: { type: String, default: '' },
    size: { type: Number, default: 18 },
    /** slide the word highlight (not on e-ink / low power) */
    smooth: Boolean,
    /** e-ink: mark three words as one block (the word being said and one either side) */
    group: Boolean
  },
  watch: {
    activePi() {
      this.applyActive()
    },
    activeWi() {
      this.applyActive()
    },
    paras() {
      // re-drawn: the marks have to go on again
      this.marked = null
      this.$nextTick(() => this.applyActive())
    },
    query() {
      if (this.$refs.pill) this.$refs.pill.style.opacity = '0' // searching: no word is followed
      this.marked = null
      this.$nextTick(() => this.applyActive())
    }
  },
  mounted() {
    this.marked = null
    this.applyActive()
  },
  methods: {
    el(pi) {
      return this.$el ? this.$el.querySelector(`[data-pi="${pi}"]`) : null
    },
    paraOf(pi) {
      const list = this.paras
      const guess = list[pi]
      if (guess && guess.i === pi) return guess
      return list.find((p) => p.i === pi) || null
    },
    /** Move the sliding highlight onto the word being said */
    placePill(node, jump) {
      const pill = this.$refs.pill
      if (!pill || !this.$el) return
      const w = node.querySelector('.k-word')
      const r = w && w.getClientRects()[0]
      if (!r) {
        pill.style.opacity = '0'
        return
      }
      const box = this.$el.getBoundingClientRect()
      const x = r.left - box.left - 3
      const y = r.top - box.top - 1
      // a new paragraph far away: appear there rather than sweep across the page
      const far = jump && this._pillY != null && Math.abs(y - this._pillY) > r.height * 4
      if (far) pill.style.transition = 'none'
      pill.style.transform = `translate(${x}px, ${y}px)`
      pill.style.width = r.width + 6 + 'px'
      pill.style.height = r.height + 2 + 'px'
      pill.style.opacity = '1'
      if (far) {
        void pill.offsetWidth
        pill.style.transition = ''
      }
      this._pillY = y
    },
    unmark(pi) {
      const node = this.el(pi)
      const p = this.paraOf(pi)
      if (!node || !p) return
      node.classList.remove('k-active')
      node.style.backgroundColor = ''
      node.style.borderLeftColor = ''
      node.innerHTML = this.renderParagraph(p, null)
    },
    applyActive() {
      if (this.query) return
      const pi = this.activePi
      const wi = this.activeWi
      const was = this.marked
      if (was && was.pi === pi && was.wi === wi) return
      if (was && was.pi !== pi) this.unmark(was.pi)
      const node = pi >= 0 ? this.el(pi) : null
      const p = pi >= 0 ? this.paraOf(pi) : null
      if (!node || !p) {
        this.marked = null
        return
      }
      node.classList.add('k-active')
      node.style.backgroundColor = this.accentSoft
      node.style.borderLeftColor = this.accent
      // e-ink: the word being said and one either side, as one block (each step reads as a phrase)
      const words = p.words || []
      node.innerHTML = this.group && !this.smooth && wi >= 0 ? this.renderParagraph(p, wi, Math.max(0, wi - 1), Math.min(words.length - 1, wi + 1)) : this.renderParagraph(p, wi)
      this.marked = { pi, wi }
      if (this.smooth) this.placePill(node, was && was.pi !== pi)
    }
  }
}
</script>

<style>
/* LCD / OLED: one highlight slides between words; the word's own box is hidden */
.k-text.k-smooth .k-word {
  border-color: transparent !important;
  background-color: transparent !important;
}
.k-pill {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  pointer-events: none;
  border: 1.5px solid;
  border-radius: 6px;
  background-color: rgba(228, 155, 79, 0.14);
  opacity: 0;
  will-change: transform, width;
  transition: transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.16s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.16s ease, opacity 0.2s ease;
}
</style>

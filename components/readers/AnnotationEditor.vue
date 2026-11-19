<template>
  <!-- A bookmark or highlight: its text, colour and note -->
  <div class="absolute left-0 right-0 bottom-0 z-50 rounded-t-2xl shadow-2xl p-4" :style="{ backgroundColor: p.panel, color: p.fg, borderTop: `1px solid ${p.border}` }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
    <div class="flex items-center mb-2">
      <p class="flex-grow font-semibold">{{ annotation.type === 'bookmark' ? 'Bookmark' : 'Highlight' }}</p>
      <button class="material-symbols text-2xl" aria-label="Close" @click.stop="$emit('close')">close</button>
    </div>
    <p v-if="annotation.text" class="text-sm italic mb-3 max-h-24 overflow-y-auto" :style="{ color: p.muted }">“{{ annotation.text }}”</p>
    <div v-if="annotation.type === 'highlight'" class="flex mb-3">
      <button v-for="c in colorNames" :key="c" class="w-7 h-7 rounded-full mr-2 border-2" :title="c" :style="{ backgroundColor: colors[c], borderColor: color === c ? p.fg : 'transparent' }" :aria-label="c" @click.stop="color = c"><span v-if="cvd" class="text-[10px] font-bold" style="color: #000">{{ c === 'underline' ? 'U' : c[0].toUpperCase() }}</span></button>
    </div>
    <textarea ref="input" v-model="note" rows="4" class="w-full rounded-lg px-3 py-2 text-base outline-none resize-none" :style="{ backgroundColor: p.field, color: p.fg, border: `1px solid ${p.border}` }" placeholder="Write a note…" />
    <div class="flex mt-3">
      <button class="flex-1 py-2 rounded-full text-sm font-semibold mr-2 border" :style="{ borderColor: p.border }" @click.stop="$emit('delete')">Delete</button>
      <button class="flex-1 py-2 rounded-full text-sm font-semibold" :style="{ backgroundColor: p.accent, color: p.onAccent }" @click.stop="$emit('save', { color, note })">Save</button>
    </div>
  </div>
</template>

<script>
import { hlColors, hlColorsForPage } from './readerThemes'

export default {
  props: { p: { type: Object, required: true }, annotation: { type: Object, required: true } },
  data() {
    return { color: this.annotation.color || 'yellow', note: this.annotation.note || '' }
  },
  computed: {
    colors: () => hlColors(),
    cvd: () => document.documentElement.className.includes('cvd-'),
    colorNames: () => ['yellow', 'green', 'blue', 'pink', 'underline']
  },
  mounted() {
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
  }
}
</script>

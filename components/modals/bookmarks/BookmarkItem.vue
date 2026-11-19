<template>
  <!-- One bookmark: timestamp (or section range) beside the quote, with its note -->
  <div :key="bookmark.time" :id="`bookmark-row-${bookmark.time}`" class="flex items-start px-1 py-3 justify-start relative border-b border-fg/5" :class="highlight ? 'bg-bg bg-opacity-60' : ' bg-opacity-20'" @click="click">
    <div class="flex-shrink-0 w-24 pl-2 pt-0.5">
      <div class="flex items-center" :class="highlight ? 'text-success' : 'text-fg-muted'">
        <i class="material-symbols text-base pr-1" :class="{ fill: highlight }">{{ info.kind === 'clip' ? 'content_cut' : 'bookmark' }}</i>
        <span class="text-sm font-mono">{{ $secondsToTimestamp(info.start / playbackRate) }}</span>
      </div>
      <p v-if="info.kind === 'clip'" class="text-xs font-mono text-fg-muted pl-5">– {{ $secondsToTimestamp(info.end / playbackRate) }}</p>
      <p v-if="info.kind === 'clip'" class="text-[10px] text-fg-muted pl-5">{{ clipLength }}</p>
      <p v-if="pending" class="text-[10px] text-warning pl-5 flex items-center"><span class="material-symbols text-xs mr-0.5">cloud_off</span>not synced</p>
    </div>
    <div class="flex-grow min-w-0 px-2">
      <p v-if="info.quote" class="text-sm leading-snug quote" :class="{ 'quote-open': expanded }">“{{ info.quote }}”</p>
      <button v-if="info.quote && info.quote.length > 140" class="text-xs text-fg-muted mt-1" @click.stop="expanded = !expanded">{{ expanded ? 'Show less' : 'Show more' }}</button>
      <p v-if="info.note" class="text-sm leading-snug mt-1 flex items-start whitespace-pre-line" :class="info.quote ? 'text-fg' : ''">
        <span v-if="info.quote" class="material-symbols text-sm mr-1 mt-0.5 text-fg-muted">edit_note</span><span>{{ info.note }}</span>
      </p>
      <button v-else-if="info.quote" class="text-xs text-fg-muted mt-1 flex items-center" @click.stop="editClick"><span class="material-symbols text-sm mr-1">add</span>Add a note</button>
    </div>
    <div class="flex items-center justify-end w-16 pr-2 pt-0.5 flex-shrink-0" @click.stop>
      <span class="material-symbols text-2xl mr-2 text-fg hover:text-yellow-400" @click.stop="editClick">edit_note</span>
      <span class="material-symbols text-2xl text-fg hover:text-error" @click.stop="deleteClick">delete</span>
    </div>
  </div>
</template>

<script>
import { parseBookmark } from '@/plugins/bookmarks'

export default {
  props: {
    bookmark: {
      type: Object,
      default: () => {}
    },
    highlight: Boolean,
    playbackRate: { type: Number, default: 1 }
  },
  data() {
    return {
      expanded: false
    }
  },
  computed: {
    info() {
      return parseBookmark(this.bookmark)
    },
    pending() {
      return !!this.bookmark.dirty
    },
    clipLength() {
      const sec = Math.round(this.info.end - this.info.start)
      return sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s` : `${sec} s`
    }
  },
  methods: {
    click() {
      this.$emit('click', this.bookmark)
    },
    deleteClick() {
      this.$emit('delete', this.bookmark)
    },
    editClick() {
      this.$emit('edit', this.bookmark)
    }
  }
}
</script>

<style scoped>
.quote {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.quote-open {
  -webkit-line-clamp: unset;
  display: block;
}
</style>

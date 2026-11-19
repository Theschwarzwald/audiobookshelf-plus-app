<template>
  <!-- Write a note about a bookmark or section; the quote and time stay as they are -->
  <div class="w-full p-4">
    <div class="flex mb-3 items-center">
      <div class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-10 cursor-pointer" @click.stop="$emit('cancel')">
        <span class="material-symbols text-3xl">arrow_back</span>
      </div>
      <p class="text-xl pl-2 flex-grow">{{ info.kind === 'clip' ? 'Section note' : 'Bookmark note' }}</p>
      <p class="text-sm font-mono text-fg-muted text-right">
        {{ $secondsToTimestamp(info.start) }}<template v-if="info.kind === 'clip'"><br />– {{ $secondsToTimestamp(info.end) }}</template>
      </p>
    </div>
    <p v-if="info.quote" class="text-sm italic text-fg-muted mb-3 max-h-40 overflow-y-auto">“{{ info.quote }}”</p>
    <label class="text-xs text-fg-muted px-1">Note</label>
    <textarea ref="input" v-model="text" rows="5" class="w-full rounded-lg bg-bg border border-border px-3 py-2 text-base text-fg outline-none focus:border-fg-muted resize-none" :placeholder="info.quote ? 'What stood out? Thoughts, a reminder, a question…' : 'Bookmark name or note'" />
    <div class="flex mt-4">
      <ui-btn class="flex-1 mr-2" @click.stop="$emit('cancel')">Cancel</ui-btn>
      <ui-btn color="success" class="flex-1" @click.stop="save">Save</ui-btn>
    </div>
  </div>
</template>

<script>
import { parseBookmark, withNote } from '@/plugins/bookmarks'

export default {
  props: {
    bookmark: { type: Object, required: true }
  },
  data() {
    return {
      text: parseBookmark(this.bookmark).note
    }
  },
  computed: {
    info() {
      return parseBookmark(this.bookmark)
    }
  },
  methods: {
    async save() {
      await this.$hapticsImpact()
      await this.$store.dispatch('bookmarks/save', {
        libraryItemId: this.bookmark.libraryItemId,
        time: this.bookmark.time,
        title: withNote(this.bookmark, this.text)
      })
      this.$emit('saved')
    }
  },
  mounted() {
    this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
  }
}
</script>

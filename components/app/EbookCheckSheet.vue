<template>
  <!-- Review spelling suggestions found by comparing the transcript with the ebook -->
  <!-- the lower half of the screen (a side panel on tablets), so Lyrics / Karaoke stay readable while reviewing -->
  <div class="ecs-sheet absolute left-0 right-0 bottom-0 z-20 flex flex-col bg-bg text-fg">
    <div class="flex items-center px-3 pt-3 pb-2 flex-shrink-0 border-b border-border">
      <span class="material-symbols text-3xl cursor-pointer" @click="$emit('close')">arrow_back</span>
      <div class="flex-grow min-w-0 px-2">
        <p class="text-lg font-semibold leading-tight">Ebook spelling check</p>
        <p class="text-xs text-fg-muted truncate">{{ subtitle }}</p>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto px-4 pb-8">
      <!-- Warning: a difference isn't always a transcription mistake -->
      <div class="mt-3 rounded-lg px-3 py-2 flex items-start bg-warning/15 border border-warning/60">
        <span class="material-symbols text-lg text-warning mr-2 mt-px">warning</span>
        <p class="text-sm">{{ discrepancyWarning }}</p>
      </div>

      <p class="text-sm text-fg-muted mt-3">
        These words in the transcript differ from the ebook in a way that looks like a mishearing or misspelling. The ebook and the audiobook don't always match word for word, so only words with matching text on both sides are listed. Review them before applying.
      </p>

      <div v-if="pendingGroups.length" class="flex mt-3">
        <button class="flex-1 py-2 rounded-full text-sm font-semibold bg-success text-white mr-2" :disabled="busy" @click="applyGroups(pendingGroups)">Apply all ({{ pendingCount }})</button>
        <button class="flex-1 py-2 rounded-full text-sm font-semibold bg-bg-hover" :disabled="busy" @click="ignoreGroups(pendingGroups)">Ignore all</button>
      </div>
      <p v-else class="text-sm mt-4">Nothing left to review.</p>

      <div v-for="g in pendingGroups" :key="g.key" class="rounded-xl p-3 mt-3 bg-bg-hover">
        <div class="flex items-center">
          <p class="flex-grow min-w-0">
            <span class="line-through text-fg-muted">{{ g.heard }}</span>
            <span class="material-symbols text-base align-middle mx-1">arrow_forward</span>
            <span class="font-semibold">{{ g.ebook }}</span>
          </p>
          <span class="text-xs text-fg-muted ml-2 flex-shrink-0">{{ g.items.length }}×</span>
        </div>
        <p class="text-xs text-fg-muted mt-1 italic">“…{{ g.items[0].context }}…”</p>
        <p class="text-xs text-warning mt-1 flex items-start">
          <span class="material-symbols text-sm mr-1">warning</span>
          <span>{{ discrepancyWarning }}</span>
        </p>
        <div class="flex items-center mt-2">
          <button class="text-xs font-mono underline mr-3" @click="$emit('seek', g.items[0].s)">{{ $secondsToTimestamp(g.items[0].s) }}</button>
          <span class="text-xs text-fg-muted truncate flex-grow">{{ g.items[0].chapter }}</span>
          <button class="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-success text-white" :disabled="busy" @click="applyGroups([g])">Apply</button>
          <button class="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-bg border border-border" :disabled="busy" @click="ignoreGroups([g])">Ignore</button>
        </div>
      </div>

      <!-- How chapters lined up -->
      <div v-if="check && check.chapters && check.chapters.length" class="mt-6">
        <p class="text-sm font-semibold cursor-pointer flex items-center" @click="showChapters = !showChapters">
          <span class="material-symbols text-lg mr-1">{{ showChapters ? 'expand_less' : 'expand_more' }}</span>
          Chapters lined up with the ebook ({{ matchedChapters }}/{{ check.chapters.length }})
        </p>
        <div v-if="showChapters" class="mt-2">
          <div v-for="(c, i) in check.chapters" :key="i" class="flex text-xs py-1 border-b border-border">
            <span class="w-1/2 pr-2 truncate">{{ c.audio || 'Chapter ' + (i + 1) }}</span>
            <span class="w-1/2 truncate" :class="c.ebook ? '' : 'text-fg-muted italic'">{{ c.ebook || 'not in the ebook' }}</span>
          </div>
        </div>
      </div>

      <p v-if="appliedCount" class="text-xs text-fg-muted mt-4">{{ appliedCount }} correction{{ appliedCount === 1 ? '' : 's' }} applied. The original transcript is kept on the device.</p>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    check: Object,
    busy: Boolean
  },
  data() {
    return {
      showChapters: false,
      discrepancyWarning: 'Discrepancy may be caused by narrator ad-libs or edits between book and audiobook.'
    }
  },
  computed: {
    suggestions() {
      return (this.check && this.check.suggestions) || []
    },
    pendingGroups() {
      const map = new Map()
      this.suggestions
        .filter((s) => s.status === 'pending')
        .forEach((s) => {
          const key = `${s.heard.toLowerCase()}→${s.ebook.toLowerCase()}`
          if (!map.has(key)) map.set(key, { key, heard: s.heard, ebook: s.ebook, items: [] })
          map.get(key).items.push(s)
        })
      return [...map.values()].sort((a, b) => b.items.length - a.items.length)
    },
    pendingCount() {
      return this.suggestions.filter((s) => s.status === 'pending').length
    },
    appliedCount() {
      return this.suggestions.filter((s) => s.status === 'applied').length
    },
    matchedChapters() {
      return ((this.check && this.check.chapters) || []).filter((c) => c.ebook).length
    },
    subtitle() {
      if (!this.check) return ''
      return `${this.pendingCount} to review${this.check.ebookTitle ? ' · ' + this.check.ebookTitle : ''}`
    }
  },
  methods: {
    ids(groups) {
      return groups.flatMap((g) => g.items.map((s) => s.id))
    },
    applyGroups(groups) {
      this.$emit('update', { ids: this.ids(groups), status: 'applied' })
    },
    ignoreGroups(groups) {
      this.$emit('update', { ids: this.ids(groups), status: 'ignored' })
    }
  }
}
</script>

<style scoped>
.ecs-sheet {
  height: 56%;
  border-radius: 16px 16px 0 0;
  border-top: 1px solid rgb(var(--color-border, 80 80 80));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
}
@media (min-width: 840px) {
  .ecs-sheet {
    top: 0;
    left: auto;
    width: 440px;
    height: auto;
    border-radius: 0;
    border-top: 0;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.3);
  }
}
</style>

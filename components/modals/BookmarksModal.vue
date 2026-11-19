<template>
  <modals-modal v-model="show" :width="400" height="100%">
    <template #outer>
      <div class="absolute top-11 left-4 z-40">
        <p class="text-white text-2xl truncate">{{ $strings.LabelYourBookmarks }}</p>
      </div>
    </template>
    <div class="w-full h-full overflow-hidden absolute top-0 left-0 flex items-center justify-center" @click="show = false">
      <div class="w-full rounded-lg bg-primary border border-border overflow-y-auto overflow-x-hidden relative mt-16" style="max-height: 80vh" @click.stop.prevent>
        <modals-bookmarks-bookmark-note-editor v-if="editing" :key="editing.time" :bookmark="editing" @cancel="closeEditor" @saved="closeEditor" />
        <div class="w-full h-full" v-else>
          <p v-if="pendingCount" class="px-4 py-2 text-xs text-warning flex items-center border-b border-fg/10">
            <span class="material-symbols text-sm mr-1">cloud_off</span>{{ pendingCount }} change{{ pendingCount === 1 ? '' : 's' }} will sync when you're back online
          </p>
          <template v-for="bookmark in bookmarks">
            <modals-bookmarks-bookmark-item :key="bookmark.time" :highlight="isCurrent(bookmark)" :bookmark="bookmark" :playback-rate="_playbackRate" @click="clickBookmark" @edit="editBookmark" @delete="deleteBookmark" />
          </template>
          <div v-if="!bookmarks.length" class="flex flex-col h-40 items-center justify-center px-8 text-center">
            <p class="text-xl">{{ $strings.MessageNoBookmarks }}</p>
            <p class="text-sm text-fg-muted mt-2">Tap Bookmark in the player to save the line you're hearing, or hold it while a passage plays to save the whole section.</p>
          </div>
        </div>
        <div v-if="!editing && libraryItemId" class="flex px-4 py-2 items-center text-center justify-between border-b border-fg/10 bg-success cursor-pointer text-white text-opacity-80 sticky bottom-0 left-0 w-full" @click.stop="createBookmark">
          <span class="material-symbols">bookmark_add</span>
          <p class="text-base pl-2">{{ $strings.ButtonCreateBookmark }}</p>
          <p class="text-sm font-mono">{{ $secondsToTimestamp(currentTime / _playbackRate) }}</p>
        </div>
      </div>
    </div>
  </modals-modal>
</template>

<script>
import { Dialog } from '@capacitor/dialog'
import { parseBookmark, saveBookmark } from '@/plugins/bookmarks'

export default {
  props: {
    value: Boolean,
    /** Audiobookshelf item id, or the local item id for books only on the phone */
    libraryItemId: String,
    /** transcript key (for quotes) */
    itemKey: String,
    currentTime: {
      type: Number,
      default: 0
    },
    playbackRate: {
      type: Number,
      default: 1
    },
    /** open straight into the note editor for this bookmark */
    editTarget: Object
  },
  data() {
    return {
      editing: null
    }
  },
  watch: {
    show(newVal) {
      if (newVal) this.editing = this.editTarget ? this.findCurrent(this.editTarget) : null
    },
    editTarget(bm) {
      if (bm && this.show) this.editing = this.findCurrent(bm)
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    bookmarks() {
      return this.$store.getters['bookmarks/forItem'](this.libraryItemId)
    },
    pendingCount() {
      return this.bookmarks.filter((b) => b.dirty).length
    },
    _playbackRate() {
      if (!this.playbackRate || isNaN(this.playbackRate)) return 1
      return this.playbackRate
    }
  },
  methods: {
    findCurrent(bm) {
      return this.bookmarks.find((b) => b.time === bm.time) || bm
    },
    isCurrent(bm) {
      const p = parseBookmark(bm)
      return p.kind === 'clip' ? this.currentTime >= p.start && this.currentTime <= p.end : Math.floor(this.currentTime) === bm.time
    },
    closeEditor() {
      this.editing = null
      this.$emit('editDone')
    },
    editBookmark(bm) {
      this.editing = bm
    },
    async deleteBookmark(bm) {
      await this.$hapticsImpact()
      const { value } = await Dialog.confirm({
        title: 'Remove Bookmark',
        message: this.$strings.MessageConfirmRemoveBookmark
      })
      if (!value) return
      await this.$store.dispatch('bookmarks/remove', { libraryItemId: bm.libraryItemId, time: bm.time })
    },
    async clickBookmark(bm) {
      await this.$hapticsImpact()
      this.$emit('select', bm)
    },
    async createBookmark() {
      await this.$hapticsImpact()
      try {
        const bm = await saveBookmark(this, { libraryItemId: this.libraryItemId, key: this.itemKey, time: this.currentTime })
        this.editing = bm
      } catch (error) {
        this.$toast.error(this.$strings.ToastBookmarkCreateFailed)
      }
    }
  }
}
</script>

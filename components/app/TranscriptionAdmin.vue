<template>
  <!-- Settings → Transcription for the library (admins, on servers with the transcription add-on) -->
  <div v-if="visible">
    <p class="uppercase text-xs font-semibold text-fg-muted mb-2 mt-10">Transcription for the library</p>
    <p class="text-xs text-fg-muted mb-2">Your server transcribes books in the background, one at a time. Books someone is listening to go first.</p>

    <div class="flex items-center py-3">
      <div class="w-10 flex justify-center" @click.stop="toggleAuto">
        <ui-toggle-switch :value="!!data && data.autoTranscribeNew" class="pointer-events-none" />
      </div>
      <div class="pl-4">
        <p>Transcribe new books automatically</p>
        <p class="text-xs text-fg-muted">Checks for new books every 10 minutes</p>
      </div>
    </div>

    <div v-if="data && !data.ready" class="text-xs rounded-lg p-3 mb-2 bg-warning/20">Server transcription sets itself up the first time an admin signs in. Open a book's Transcription once, then come back.</div>

    <p v-if="data" class="text-sm py-1">{{ countsText }}</p>
    <p v-if="data && data.bulk" class="text-xs text-fg-muted">Queueing books… {{ data.bulk.done }} of {{ data.bulk.total || '…' }}</p>

    <div class="flex flex-wrap gap-2 py-3">
      <button class="px-4 py-2 rounded-full bg-fg text-bg text-sm font-semibold flex items-center" :disabled="busy || !data || !data.ready" @click="transcribeAll">
        <span class="material-symbols text-base mr-1">library_books</span>Transcribe missing
      </button>
      <button class="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center" :disabled="busy" @click="showBooks = !showBooks">
        <span class="material-symbols text-base mr-1">{{ showBooks ? 'expand_less' : 'menu_book' }}</span>{{ showBooks ? 'Hide books' : 'Choose books' }}
      </button>
      <button v-if="activeCount" class="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center text-error" :disabled="busy" @click="cancelAll">
        <span class="material-symbols text-base mr-1">cancel</span>Cancel all ({{ activeCount }})
      </button>
    </div>

    <div v-if="showBooks && data">
      <div class="flex gap-2 mb-2">
        <ui-text-input v-model="query" placeholder="Search title or author" class="flex-grow" />
      </div>
      <div class="flex flex-wrap gap-1.5 mb-2">
        <button v-for="f in filters" :key="f.id" class="px-3 py-1 rounded-full text-xs font-semibold border" :class="filter === f.id ? 'bg-fg text-bg border-fg' : 'border-border'" @click="filter = f.id">{{ f.label }} ({{ f.count }})</button>
      </div>
      <div v-for="b in shownBooks" :key="b.id" class="py-2 border-b border-border">
        <div class="flex items-center">
          <div class="flex-grow min-w-0 pr-2">
            <p class="text-sm font-semibold truncate">{{ b.title }}</p>
            <p class="text-xs text-fg-muted truncate">{{ b.author }}<template v-if="b.author"> · </template>{{ statusText(b) }}</p>
            <div v-if="b.status === 'running'" class="h-1 rounded-full bg-border mt-1 overflow-hidden"><div class="h-1 bg-fg" :style="{ width: Math.round(b.progress * 100) + '%' }" /></div>
          </div>
          <button v-if="canStart(b)" class="px-3 py-1 rounded-full border border-border text-xs font-semibold" :disabled="busy" @click="transcribe(b)">{{ b.status === 'none' ? 'Transcribe' : 'Try again' }}</button>
          <button v-else-if="canCancel(b)" class="px-3 py-1 rounded-full border border-border text-xs font-semibold text-error" :disabled="busy" @click="cancel(b)">Cancel</button>
          <span v-else-if="b.status === 'done'" class="material-symbols text-success mr-1" title="Transcribed">check_circle</span>
          <button class="ml-2 px-3 py-1 rounded-full border border-border text-xs font-semibold flex items-center" title="Edit this book's details" @click="editBook(b)"><span class="material-symbols text-sm mr-0.5">edit</span>Edit</button>
        </div>
        <!-- finished books: the checks after a transcription again, or the whole transcription again -->
        <div v-if="b.status === 'done'" class="flex flex-wrap gap-1.5 mt-1.5">
          <button class="px-3 py-1 rounded-full border border-border text-xs font-semibold flex items-center" :disabled="busy" title="Sync the book with the audio and check it again, without re-transcribing" @click="analyze(b)"><span class="material-symbols text-sm mr-0.5">manage_search</span>Book analysis</button>
          <button class="px-3 py-1 rounded-full border border-border text-xs font-semibold flex items-center" :disabled="busy" title="Compare the transcript with the ebook for spelling" @click="checkSpelling(b)"><span class="material-symbols text-sm mr-0.5">spellcheck</span>Check spelling</button>
          <button class="px-3 py-1 rounded-full border border-border text-xs font-semibold flex items-center" :disabled="busy" @click="retranscribe(b)"><span class="material-symbols text-sm mr-0.5">refresh</span>Re-transcribe</button>
        </div>
      </div>
      <p v-if="!shownBooks.length" class="text-sm text-fg-muted py-4 text-center">No books here</p>
      <button v-if="matchingBooks.length > limit" class="w-full py-3 text-sm text-fg-muted" @click="limit += 50">Show more ({{ matchingBooks.length - limit }})</button>
    </div>
  </div>
</template>

<script>
import { Dialog } from '@capacitor/dialog'
import { Browser } from '@capacitor/browser'
import { Transcriber } from '@/plugins/transcriber'

const LABELS = { none: 'Not transcribed', queued: 'Waiting', running: 'Transcribing', paused: 'Paused', error: 'Problem', done: 'Transcribed' }

export default {
  data() {
    return { visible: false, data: null, busy: false, showBooks: false, query: '', filter: 'all', limit: 50, timer: null }
  },
  computed: {
    books() {
      return (this.data && this.data.books) || []
    },
    activeCount() {
      return this.books.filter((b) => (b.status === 'queued' || b.status === 'running') && b.origin !== 'device').length
    },
    countsText() {
      const c = this.data.counts || {}
      const bits = [`${c.total || 0} books`, `${c.done || 0} transcribed`]
      if (c.running) bits.push(`${c.running} transcribing now`)
      if (c.queued) bits.push(`${c.queued} waiting`)
      if (c.error) bits.push(`${c.error} with a problem`)
      return bits.join(' · ')
    },
    filters() {
      const n = (fn) => this.books.filter(fn).length
      return [
        { id: 'all', label: 'All', count: this.books.length },
        { id: 'todo', label: 'Not transcribed', count: n((b) => b.status === 'none') },
        { id: 'active', label: 'In progress', count: n((b) => ['queued', 'running', 'paused'].includes(b.status)) },
        { id: 'done', label: 'Done', count: n((b) => b.status === 'done') },
        { id: 'error', label: 'Problems', count: n((b) => b.status === 'error') }
      ]
    },
    matchingBooks() {
      const q = this.query.trim().toLowerCase()
      return this.books.filter((b) => {
        if (this.filter === 'todo' && b.status !== 'none') return false
        if (this.filter === 'active' && !['queued', 'running', 'paused'].includes(b.status)) return false
        if (this.filter === 'done' && b.status !== 'done') return false
        if (this.filter === 'error' && b.status !== 'error') return false
        return !q || `${b.title} ${b.author}`.toLowerCase().includes(q)
      })
    },
    shownBooks() {
      // Running first, then waiting, then the rest (newest first, as the server lists them)
      const rank = { running: 0, queued: 1, paused: 2, error: 3, none: 4, done: 5 }
      return this.matchingBooks
        .slice()
        .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))
        .slice(0, this.limit)
    }
  },
  methods: {
    statusText(b) {
      let t = LABELS[b.status] || b.status
      if (b.status === 'running') t += ` ${Math.round((b.progress || 0) * 100)}%`
      if (b.origin === 'device' && b.status === 'running') t += ' on a phone'
      if (b.status === 'queued' && b.background) t += ' (background)'
      if (b.status === 'error' && b.error) t += `: ${b.error}`
      return t
    },
    canStart(b) {
      return b.status === 'none' || b.status === 'error' || (b.status === 'paused' && b.origin !== 'device')
    },
    canCancel(b) {
      return (b.status === 'queued' || b.status === 'running') && b.origin !== 'device'
    },
    async load() {
      try {
        this.data = await Transcriber.admin('GET', '/library')
      } catch (e) {
        if (!this.data) this.visible = false
      }
      this.schedule()
    },
    schedule() {
      clearTimeout(this.timer)
      const busy = this.data && (this.data.bulk || this.activeCount)
      const ms = (this.$store.getters['device/perf'].statusPollMs || 2500) * (busy ? 2 : 12)
      this.timer = setTimeout(() => !document.hidden && this.load(), ms)
    },
    async run(fn, done) {
      this.busy = true
      try {
        const r = await fn()
        if (done) this.$toast.success(done(r))
      } catch (e) {
        this.$toast.error((e && e.message) || 'The server said no')
      }
      this.busy = false
      this.load()
    },
    async toggleAuto() {
      const on = !(this.data && this.data.autoTranscribeNew)
      await this.run(() => Transcriber.admin('PUT', '/settings', { autoTranscribeNew: on }))
    },
    async transcribeAll() {
      const todo = this.books.filter((b) => b.status === 'none' || b.status === 'error').length
      const { value } = await Dialog.confirm({
        title: 'Transcribe missing',
        message: `Queue ${todo} book${todo === 1 ? '' : 's'} that aren't transcribed yet? The server works through them one at a time in the background; books someone is listening to still go first. You can cancel any time.`,
        okButtonTitle: 'Transcribe missing',
        cancelButtonTitle: 'Not now'
      })
      if (!value) return
      await this.run(() => Transcriber.admin('POST', '/transcribe', { all: true }), () => 'Queueing books in the background')
    },
    async transcribe(b) {
      await this.run(() => Transcriber.admin('POST', '/transcribe', { itemIds: [b.id] }), (r) => (r.queued ? `Queued “${b.title}”` : 'Already queued'))
    },
    /** A finished book, transcribed again from the start with the server's chosen model */
    async retranscribe(b) {
      const { value } = await Dialog.confirm({
        title: 'Re-transcribe',
        message: `Transcribe “${b.title}” again from the start? It uses the model chosen on the server (Settings → Transcription → Speech models). The current transcript is replaced and isn't available until the new one is ready.`,
        okButtonTitle: 'Re-transcribe',
        cancelButtonTitle: 'Keep it'
      })
      if (!value) return
      await this.run(() => Transcriber.admin('POST', '/transcribe', { itemIds: [b.id], redo: true }), (r) => (r.queued ? `Re-transcribing “${b.title}”` : 'Already queued'))
    },
    /** Book analysis: the after-transcription checks again on the server (ebook, book text, .lrc), no new transcription */
    async analyze(b) {
      await this.run(() => Transcriber.analyzeBook({ key: b.id }), () => `Analysing “${b.title}” in the background`)
    },
    /** Spelling against the ebook, on the server */
    async checkSpelling(b) {
      await this.run(() => Transcriber.checkWithEbook({ key: b.id }), () => `Checking “${b.title}” against its ebook in the background`)
    },
    /** Edit: Audiobookshelf's book editor, inside the app (Admin settings screen) */
    editBook(b) {
      this.$router.push({ path: '/admin/page', query: { path: `/item/${encodeURIComponent(b.id)}?absEdit=1`, title: b.title } })
    },
    async openWeb(path) {
      const addr = (this.$store.getters['user/getServerAddress'] || '').replace(/\/+$/, '')
      if (!addr) return this.$toast.error('Not connected to a server')
      try {
        await Browser.open({ url: addr + path })
      } catch (e) {
        this.$toast.error((e && e.message) || "Couldn't open the browser")
      }
    },
    async cancel(b) {
      await this.run(() => Transcriber.admin('POST', '/cancel', { itemIds: [b.id] }), () => `Cancelled “${b.title}”`)
    },
    async cancelAll() {
      const { value } = await Dialog.confirm({
        title: 'Cancel all',
        message: `Stop ${this.activeCount} waiting or running transcription${this.activeCount === 1 ? '' : 's'}? Partly done transcripts are deleted; finished ones are kept.`,
        okButtonTitle: 'Cancel all',
        cancelButtonTitle: 'Keep going'
      })
      if (!value) return
      await this.run(() => Transcriber.admin('POST', '/cancel', { all: true }), (r) => `Cancelled ${r.cancelled}`)
    }
  },
  async mounted() {
    const info = await Transcriber.serverInfo(true).catch(() => null)
    if (!info || !info.isAdmin) return
    this.visible = true
    this.load()
  },
  beforeDestroy() {
    clearTimeout(this.timer)
  }
}
</script>

<template>
  <!-- Notebook (from Grimmory Reader): every highlight, note and bookmark across your books -->
  <div class="w-full h-full overflow-y-auto px-4 py-6">
    <div class="flex items-center mb-1">
      <h1 class="text-xl font-semibold flex-grow">Notebook</h1>
      <button class="px-3 py-1.5 rounded-full border border-border text-sm font-semibold flex items-center" :disabled="!shown.length" @click="exportMarkdown">
        <span class="material-symbols text-base mr-1">ios_share</span>Export
      </button>
    </div>
    <p class="text-xs text-fg-muted mb-4">{{ countText }}. Tap one to open the book there.</p>

    <ui-text-input v-model="search" placeholder="Search highlights, notes and bookmarks" class="mb-3" />
    <div class="flex flex-wrap gap-2 mb-3">
      <button v-for="t in types" :key="t.id" class="px-3 py-1 rounded-full text-xs font-semibold border flex items-center" :class="shownTypes.includes(t.id) ? 'bg-fg text-bg border-fg' : 'border-border'" @click="toggleType(t.id)">
        <span class="material-symbols text-sm mr-1">{{ t.icon }}</span>{{ t.label }} ({{ countOf(t.id) }})
      </button>
      <button class="px-3 py-1 rounded-full text-xs font-semibold border border-border flex items-center" @click="newestFirst = !newestFirst">
        <span class="material-symbols text-sm mr-1">swap_vert</span>{{ newestFirst ? 'Newest first' : 'Oldest first' }}
      </button>
    </div>
    <div class="mb-4">
      <select v-model="bookFilter" class="w-full rounded-md px-3 py-2 bg-bg text-fg border border-border text-sm">
        <option value="">All books ({{ books.length }})</option>
        <option v-for="b in books" :key="b.key" :value="b.key">{{ b.title }} ({{ b.count }})</option>
      </select>
    </div>

    <div v-for="e in shown.slice(0, limit)" :key="e.key + e.id" class="py-3 border-b border-border cursor-pointer" @click="open(e)">
      <div class="flex items-center text-xs text-fg-muted mb-1">
        <span class="material-symbols text-sm mr-1" :style="e.kind !== 'bookmark' ? { color: swatch(e.color) } : {}">{{ iconOf(e.kind) }}</span>
        <span class="font-semibold mr-1">{{ labelOf(e.kind) }}</span>
        <span class="truncate">· {{ e.title }}<template v-if="e.chapter"> · {{ e.chapter }}</template></span>
        <span class="ml-auto pl-2 whitespace-nowrap">{{ when(e) }}</span>
      </div>
      <p v-if="e.text" class="text-sm leading-snug" :class="e.kind === 'bookmark' ? 'text-fg-muted' : ''" :style="e.kind !== 'bookmark' ? { borderLeft: `3px solid ${swatch(e.color)}`, paddingLeft: '8px' } : {}">{{ clip(e.text) }}</p>
      <p v-if="e.note" class="text-sm mt-1 flex"><span class="material-symbols text-sm mr-1 text-fg-muted">edit_note</span><span class="whitespace-pre-line">{{ e.note }}</span></p>
    </div>
    <p v-if="!shown.length" class="text-sm text-fg-muted text-center py-10">{{ all.length ? 'Nothing matches.' : 'Highlights, notes and bookmarks you make while reading show up here.' }}</p>
    <button v-if="shown.length > limit" class="w-full py-3 text-sm text-fg-muted" @click="limit += 100">Show more ({{ shown.length - limit }})</button>
  </div>
</template>

<script>
import { FileSharer } from '@webnativellc/capacitor-filesharer'

const COLORS = { yellow: '#f5c518', green: '#4caf50', blue: '#42a5f5', pink: '#f06292', red: '#ef5350', orange: '#ffa726', purple: '#ab47bc', underline: '#9e9e9e' }

export default {
  data() {
    return { search: '', bookFilter: '', shownTypes: ['highlight', 'note', 'bookmark'], newestFirst: true, limit: 100, titles: {} }
  },
  computed: {
    types() {
      return [
        { id: 'highlight', label: 'Highlights', icon: 'ink_highlighter' },
        { id: 'note', label: 'Notes', icon: 'edit_note' },
        { id: 'bookmark', label: 'Bookmarks', icon: 'bookmark' }
      ]
    },
    /** Every live record of every book, as notebook entries (a highlight with a note counts as a note) */
    all() {
      const out = []
      const books = this.$store.state.reader.books || {}
      for (const [key, b] of Object.entries(books)) {
        for (const r of Object.values(b.records || {})) {
          if (r.deleted) continue
          const kind = r.type === 'bookmark' ? 'bookmark' : r.note ? 'note' : 'highlight'
          out.push({ ...r, key, kind, title: r.bookTitle || this.titles[key] || 'Book', author: r.bookAuthor || '' })
        }
      }
      return out
    },
    books() {
      const map = new Map()
      this.all.forEach((e) => {
        const b = map.get(e.key) || { key: e.key, title: e.title, count: 0 }
        b.count++
        map.set(e.key, b)
      })
      return [...map.values()].sort((a, b) => a.title.localeCompare(b.title))
    },
    shown() {
      const q = this.search.trim().toLowerCase()
      return this.all
        .filter((e) => this.shownTypes.includes(e.kind))
        .filter((e) => !this.bookFilter || e.key === this.bookFilter)
        .filter((e) => !q || `${e.text || ''} ${e.note || ''} ${e.title} ${e.chapter || ''}`.toLowerCase().includes(q))
        .sort((a, b) => (this.newestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt))
    },
    countText() {
      const n = (k) => this.all.filter((e) => e.kind === k).length
      return `${n('highlight')} highlights, ${n('note')} notes, ${n('bookmark')} bookmarks in ${this.books.length} book${this.books.length === 1 ? '' : 's'}`
    }
  },
  methods: {
    countOf(kind) {
      return this.all.filter((e) => e.kind === kind && (!this.bookFilter || e.key === this.bookFilter)).length
    },
    toggleType(id) {
      this.shownTypes = this.shownTypes.includes(id) ? this.shownTypes.filter((t) => t !== id) : [...this.shownTypes, id]
    },
    iconOf(kind) {
      return { highlight: 'ink_highlighter', note: 'edit_note', bookmark: 'bookmark' }[kind]
    },
    labelOf(kind) {
      return { highlight: 'Highlight', note: 'Note', bookmark: 'Bookmark' }[kind]
    },
    swatch(c) {
      return COLORS[c] || COLORS.yellow
    },
    clip(t) {
      return t.length > 400 ? t.slice(0, 400) + '…' : t
    },
    when(e) {
      if (!e.createdAt) return ''
      return new Date(e.createdAt).toLocaleDateString()
    },
    /** Where the reader should open: an e-book position (CFI), a page number, or how far through */
    locationOf(e) {
      if (e.cfi && String(e.cfi).startsWith('epubcfi')) return e.cfi
      const m = String(e.chapter || '').match(/^Page (\d+)$/)
      if (m) return m[1]
      return e.cfi || null
    },
    async open(e) {
      let item = null
      try {
        if (String(e.key).startsWith('local')) item = await this.$db.getLocalLibraryItem(e.key)
        else item = await this.$nativeHttp.get(`/api/items/${encodeURIComponent(e.key)}?expanded=1`)
      } catch (err) {}
      if (!item) return this.$toast.error('This book isn’t available right now (offline, or no longer in the library)')
      this.$store.commit('reader/setJump', { key: e.key, location: this.locationOf(e), fraction: e.fraction || 0 })
      this.$store.commit('showReader', { libraryItem: item, keepProgress: true })
    },
    /** The same layout as Grimmory's Notebook export: by book, then each entry with its chapter and date */
    exportMarkdown() {
      const lines = ['# Notebook', '', `Exported ${new Date().toLocaleString()}`, '']
      const byBook = new Map()
      this.shown.forEach((e) => byBook.set(e.key, [...(byBook.get(e.key) || []), e]))
      for (const entries of byBook.values()) {
        const first = entries[0]
        lines.push(`## ${first.title}${first.author ? ` — ${first.author}` : ''}`, '')
        for (const e of entries) {
          lines.push(`### ${this.labelOf(e.kind)}${e.chapter ? ` · ${e.chapter}` : ''}${e.createdAt ? ` · ${new Date(e.createdAt).toLocaleDateString()}` : ''}`)
          if (e.text) lines.push('', ...String(e.text).split('\n').map((l) => `> ${l}`))
          if (e.note) lines.push('', e.note)
          lines.push('')
        }
      }
      const md = lines.join('\n')
      const base64Data = btoa(unescape(encodeURIComponent(md)))
      FileSharer.share({ filename: 'notebook-export.md', contentType: 'text/markdown', base64Data }).catch((err) => {
        if (err && err.message !== 'USER_CANCELLED') this.$toast.error('Couldn’t share: ' + err.message)
      })
    },
    /** Titles for entries saved before titles were kept */
    async loadTitles() {
      const missing = [...new Set(this.all.filter((e) => !e.bookTitle && !this.titles[e.key]).map((e) => e.key))]
      for (const key of missing) {
        try {
          const item = String(key).startsWith('local') ? await this.$db.getLocalLibraryItem(key) : await this.$nativeHttp.get(`/api/items/${encodeURIComponent(key)}`)
          const md = item && item.media && item.media.metadata
          if (md && md.title) this.$set(this.titles, key, md.title)
        } catch (e) {}
      }
    }
  },
  async mounted() {
    await this.$store.dispatch('reader/init')
    this.loadTitles()
  }
}
</script>

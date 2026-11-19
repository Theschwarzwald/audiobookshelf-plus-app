<template>
  <!-- Browse the library by Dewey Decimal, laid out like the web app: class cards, then division chips and book covers -->
  <div class="dw w-full h-full overflow-y-auto px-4 pt-4 pb-32">
    <div class="dw-head">
      <div class="dw-crumbs">
        <button @click="home">Dewey Decimal</button>
        <template v-if="cls">
          <span class="dw-sep">›</span>
          <button @click="openClass(cls)">{{ cls.id }} {{ cls.name }}</button>
        </template>
        <template v-if="div && div.id">
          <span class="dw-sep">›</span>
          <span>{{ div.id }} {{ div.name }}</span>
        </template>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><widgets-loading-spinner /></div>
    <p v-else-if="error" class="text-sm text-error py-6">{{ error }}</p>

    <!-- the ten classes, as cards -->
    <template v-else-if="!cls">
      <p class="text-sm text-fg-muted">
        {{ total ? `${total} book${total === 1 ? '' : 's'} sorted the way libraries shelve them.` : 'No books have Dewey numbers yet.' }}
        <template v-if="unclassified"> {{ unclassified }} not classified yet.</template>
      </p>
      <div class="dw-grid">
        <button v-for="c in classes" :key="c.id" class="dw-card" :class="{ 'dw-empty': !c.count }" :disabled="!c.count" @click="openClass(c)">
          <span class="dw-num">{{ c.id }}</span>
          <span class="dw-name">{{ c.name }}</span>
          <span class="dw-count">{{ c.count }} book{{ c.count === 1 ? '' : 's' }}</span>
        </button>
      </div>
    </template>

    <!-- a class: its divisions as chips, then the books as covers -->
    <template v-else>
      <div v-if="!div" class="dw-divs">
        <button v-for="d in cls.divisions" :key="d.id" class="dw-chip" @click="openDivision(d)">{{ d.id }} {{ d.name }} ({{ d.count }})</button>
      </div>
      <div class="dw-books">
        <button v-for="b in shownBooks" :key="b.id" class="dw-book" @click="$router.push(`/item/${b.id}`)">
          <img :src="coverOf(b.id)" alt="" loading="lazy" />
          <span class="dw-ddc">{{ b.ddc }}</span>
          <span class="dw-title">{{ b.title }}</span>
          <span class="dw-author">{{ b.author }}</span>
          <span v-if="b.sectionName" class="dw-author">{{ b.sectionName }}</span>
        </button>
      </div>
      <p v-if="!shownBooks.length" class="text-sm text-fg-muted py-6">No books here.</p>
    </template>
  </div>
</template>

<script>
export default {
  data() {
    return { loading: true, error: null, classes: [], unclassified: 0, books: [], cls: null, div: null }
  },
  computed: {
    total() {
      return this.books.length || this.classes.reduce((a, c) => a + c.count, 0)
    },
    shownBooks() {
      if (!this.cls) return []
      return this.books.filter((b) => b.class === this.cls.id && (!this.div || !this.div.id || b.division === this.div.id))
    }
  },
  async mounted() {
    try {
      const res = await this.$nativeHttp.get('/api/transcription/dewey')
      this.classes = (res && res.tree && res.tree.classes) || []
      this.unclassified = (res && res.tree && res.tree.unclassified) || 0
      this.books = (res && res.books) || []
    } catch (e) {
      this.error = /404/.test(String(e && e.message)) ? 'This server has no ABS+ add-on, so there are no Dewey numbers to browse.' : `Couldn't load the Dewey Decimal browser: ${(e && e.message) || e}`
    }
    this.loading = false
  },
  methods: {
    coverOf(id) {
      return this.$store.getters['globals/getLibraryItemCoverSrcById'](id)
    },
    home() {
      this.cls = null
      this.div = null
    },
    openClass(c) {
      if (!c.count) return
      this.cls = c
      this.div = null
    },
    openDivision(d) {
      this.div = d || { id: null, name: 'All' }
    }
  }
}
</script>

<style scoped>
.dw-head {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.dw-crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 1.1rem;
  font-weight: 600;
}
.dw-sep {
  opacity: 0.5;
}
.dw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.dw-card {
  text-align: left;
  border: 1px solid rgba(var(--color-fg), 0.12);
  background: rgba(var(--color-fg), 0.05);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 120px;
}
.dw-card.dw-empty {
  opacity: 0.4;
}
.dw-num {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.6rem;
  font-weight: 700;
}
.dw-name {
  font-weight: 600;
  line-height: 1.25;
}
.dw-count {
  margin-top: auto;
  font-size: 0.8rem;
  opacity: 0.7;
}
.dw-divs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.dw-chip {
  border: 1px solid rgba(var(--color-fg), 0.18);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
}
.dw-books {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 16px;
}
.dw-book {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.dw-book img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  background: rgba(var(--color-fg), 0.06);
  margin-bottom: 4px;
}
.dw-ddc {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  opacity: 0.8;
}
.dw-title {
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dw-author {
  font-size: 0.75rem;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

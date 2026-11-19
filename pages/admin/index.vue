<template>
  <!-- Admin settings (☰ → Admin settings): the server's admin pages, each opening on its own screen -->
  <div class="w-full h-full px-4 py-6 overflow-y-auto">
    <template v-if="isAdmin">
      <div v-for="group in groups" :key="group.title" class="mb-6">
        <p class="uppercase text-xs font-semibold text-fg-muted mb-1">{{ group.title }}</p>
        <div v-for="p in group.pages" :key="p.path" class="py-3 flex items-center cursor-pointer border-b border-border/40" @click="open(p)">
          <span class="material-symbols mr-4 text-fg-muted">{{ p.icon }}</span>
          <p class="flex-grow">{{ p.title }}</p>
          <span class="material-symbols text-fg-muted">chevron_right</span>
        </div>
      </div>
    </template>
    <p v-else class="text-fg-muted text-center pt-12">Admin settings are for server admins.</p>
  </div>
</template>

<script>
// Audiobookshelf's own admin pages, then the ABS+ ones (shown on the same settings page, by name after #)
const GROUPS = [
  {
    title: 'Server',
    pages: [
      { title: 'General', icon: 'tune', path: '/config' },
      { title: 'Libraries', icon: 'library_books', path: '/config/libraries' },
      { title: 'Users', icon: 'group', path: '/config/users' },
      { title: 'API Keys', icon: 'key', path: '/config/api-keys' },
      { title: 'Listening Sessions', icon: 'headphones', path: '/config/sessions' },
      { title: 'Backups', icon: 'backup', path: '/config/backups' },
      { title: 'Logs', icon: 'receipt_long', path: '/config/log' },
      { title: 'Notifications', icon: 'notifications', path: '/config/notifications' },
      { title: 'Email', icon: 'mail', path: '/config/email' },
      { title: 'Item Metadata Utils', icon: 'build', path: '/config/item-metadata-utils' },
      { title: 'RSS Feeds', icon: 'rss_feed', path: '/config/rss-feeds' },
      { title: 'Authentication', icon: 'lock', path: '/config/authentication' },
      { title: 'Your Stats', icon: 'equalizer', path: '/config/stats' }
    ]
  },
  {
    title: 'ABS+',
    pages: [
      { title: 'Transcription', icon: 'subtitles', path: '/config#transcription' },
      { title: 'Parental controls', icon: 'family_restroom', path: '/config#parental' },
      { title: 'Metadata sources', icon: 'travel_explore', path: '/config#metadata' },
      { title: 'Library catalogue', icon: 'menu_book', path: '/config#catalog' },
      { title: 'Author photos & bios', icon: 'portrait', path: '/config#authors' },
      { title: 'Server updates', icon: 'system_update', path: '/config#updates' },
      { title: 'Dictionaries', icon: 'translate', path: '/config#dictionaries' },
      { title: 'PDF text (OCR)', icon: 'document_scanner', path: '/config#ocr' }
    ]
  }
]

export default {
  data() {
    return { groups: GROUPS }
  },
  computed: {
    isAdmin() {
      return !!this.$store.getters['user/getIsAdminOrUp']
    }
  },
  methods: {
    open(p) {
      this.$router.push({ path: '/admin/page', query: { path: p.path, title: p.title } })
    }
  }
}
</script>

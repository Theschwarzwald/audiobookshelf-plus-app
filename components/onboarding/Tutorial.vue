<template>
  <!-- Written tutorial: what the app does and how to use it. Ends with "Show me around". -->
  <div class="fixed inset-0 bg-bg text-fg flex flex-col" style="z-index: 150; padding-top: max(env(safe-area-inset-top), 24px)" @touchstart="touchStart" @touchend="touchEnd">
    <div class="flex items-center px-4 h-12 flex-shrink-0">
      <p class="text-xs text-fg-muted">{{ index + 1 }} of {{ pages.length }}</p>
      <div class="flex-grow" />
      <button v-if="index < pages.length - 1" class="text-sm text-fg-muted px-2 py-1" @click="finish(false)">Skip</button>
    </div>
    <div class="flex-grow overflow-y-auto">
      <div class="max-w-xl mx-auto px-6 pb-6">
        <span class="material-symbols text-6xl mb-3 block">{{ page.icon }}</span>
        <h1 class="text-2xl font-semibold mb-2">{{ page.title }}</h1>
        <p class="text-base leading-relaxed mb-4">{{ page.text }}</p>
        <ul class="space-y-3">
          <li v-for="(b, i) in page.points" :key="i" class="flex items-start">
            <span class="material-symbols text-xl mr-3 text-fg-muted flex-shrink-0">{{ b.icon }}</span>
            <p class="text-sm leading-snug"><b v-if="b.label">{{ b.label }}</b><template v-if="b.label"> — </template>{{ b.text }}</p>
          </li>
        </ul>
      </div>
    </div>
    <div class="flex-shrink-0 px-6 pb-6 pt-2 max-w-xl w-full mx-auto">
      <div class="flex justify-center gap-1.5 mb-4">
        <span v-for="(p, i) in pages" :key="i" class="h-1.5 rounded-full" :class="i === index ? 'w-5 bg-fg' : 'w-1.5 bg-fg-muted'" />
      </div>
      <template v-if="index < pages.length - 1">
        <div class="flex gap-3">
          <button v-if="index > 0" class="flex-1 py-3 rounded-full border border-border font-semibold" @click="index--">Back</button>
          <button class="flex-1 py-3 rounded-full bg-fg text-bg font-semibold" @click="index++">Next</button>
        </div>
      </template>
      <template v-else>
        <button class="w-full py-3 rounded-full bg-fg text-bg font-semibold mb-2" @click="finish(true)">Show me around</button>
        <button class="w-full py-3 rounded-full border border-border font-semibold" @click="finish(false)">I'll explore myself</button>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { index: 0, x0: null }
  },
  computed: {
    isAdmin() {
      return !!this.$store.getters['user/getIsAdminOrUp']
    },
    page() {
      return this.pages[this.index]
    },
    pages() {
      return [
        {
          icon: 'waving_hand',
          title: 'Hi! Here’s what I can do',
          text: 'I play the audiobooks and podcasts on your own Audiobookshelf server, turn them into text you can follow along with, and read e-books, PDFs and comics. Stream from the server or download for when you’re offline.',
          points: [
            { icon: 'headphones', text: 'Listen, with bookmarks you can write notes on.' },
            { icon: 'subtitles', text: 'Follow along as text, like lyrics or karaoke.' },
            { icon: 'menu_book', text: 'Read, with a dictionary and the narration highlighted as you go.' },
            { icon: 'sync', text: 'Everything syncs between your devices.' }
          ]
        },
        {
          icon: 'library_books',
          title: 'Your library',
          text: 'Everything starts on the home screen.',
          points: [
            { icon: 'swap_horiz', label: 'Library button (top left)', text: 'switch between libraries: audiobooks, podcasts, e-books.' },
            { icon: 'tab', label: 'Tabs', text: 'Home, Library, Series, Collections, Authors.' },
            { icon: 'search', label: 'Search', text: 'by title, author, series or narrator.' },
            { icon: 'recommend', label: 'Based on Your Recent Readings', text: 'a shelf on the home screen with books like the ones you have been listening to, each with the reason it was picked.' },
            { icon: 'menu', label: 'Menu', text: 'downloads, Stats, your Notebook, your account, Settings, and this tutorial again (Settings → Help).' },
            { icon: 'touch_app', label: 'Tap a cover', text: 'to play, read, transcribe or download a book.' }
          ]
        },
        {
          icon: 'play_circle',
          title: 'Listening',
          text: 'Press Play on a book. A small player stays at the bottom while you browse; tap it to open the full player.',
          points: [
            { icon: 'replay', label: 'Jump', text: 'back or forward (set the seconds in Settings); the outer arrows jump by chapter.' },
            { icon: 'speed', label: 'Speed', text: 'listen faster or slower.' },
            { icon: 'bedtime', label: 'Sleep timer', text: 'stop after a while or at the end of the chapter.' },
            { icon: 'format_list_bulleted', label: 'Chapters', text: 'jump to any chapter.' },
            { icon: 'bluetooth', text: 'Headphones, the lock screen and your car control it too.' }
          ]
        },
        {
          icon: 'bookmark_add',
          title: 'Bookmarks',
          text: 'The Bookmark button in the player saves the moment and the words being read.',
          points: [
            { icon: 'touch_app', label: 'Tap', text: 'bookmark this exact second. If the book is transcribed, it saves the line being read.' },
            { icon: 'pan_tool', label: 'Hold', text: 'while a passage plays to save the whole section.' },
            { icon: 'edit_note', label: 'Notes', text: 'tap “add a note” on any bookmark.' },
            { icon: 'cloud_off', text: 'Works offline and syncs when you’re back online. Find them under More → Bookmarks.' },
            { icon: 'auto_stories', label: 'Notebook', text: 'in the menu: every bookmark, highlight and note from all your books in one place.' }
          ]
        },
        {
          icon: 'subtitles',
          title: 'Transcription',
          text: 'Turn any audiobook into text: tap Transcribe on the book, or Transcription in the player.',
          points: [
            { icon: 'lyrics', label: 'Lyrics', text: 'timed lines, the current one highlighted, like song lyrics.' },
            { icon: 'article', label: 'Karaoke', text: 'the book as paragraphs, each word outlined as it is said. Uses the ebook’s own text when there is one.' },
            { icon: 'menu_book', label: 'Read along', text: 'the e-book or PDF itself, the narrated words highlighted and pages turning by themselves. All three stay ready, so switching is instant.' },
            { icon: 'search', label: 'Search', text: 'and tap any line or word to jump there.' },
            { icon: 'spellcheck', label: 'Spelling', text: this.isAdmin ? 'checked against the ebook by itself when there is one; review or apply the fixes from the card at the top.' : 'checked against the ebook by itself when there is one. Your server admin reviews and applies the fixes.' },
            { icon: 'timer', label: 'Timing', text: 'if the highlight runs early or late, nudge it in the ⋮ menu (Highlight timing).' },
            { icon: 'lock', label: 'Screen lock', text: 'while the book plays, the lock button pins the screen so taps, Back and Home do nothing (handy in a pocket or for children). Unlock with your face, fingerprint or ABS+ PIN. When paused, the Read button takes its place.' },
            { icon: 'smartphone', label: 'Lock screen', text: 'the line being read shows on your phone’s lock screen while the book plays.' },
            { icon: 'dns', label: 'Where', text: this.isAdmin ? 'on your server (fast) or on this phone (slower, keep it charging).' : 'on your server (fast) or on this phone (slower, keep it charging). A transcript made on this phone stays on this phone.' }
          ]
        },
        {
          icon: 'menu_book',
          title: 'Reading',
          text: 'Tap Read on a book for its e-book, PDF or comic, downloaded or straight from your server.',
          points: [
            { icon: 'swipe', label: 'Turn pages', text: 'tap the edges or swipe; tap the middle for the menus.' },
            { icon: 'translate', label: 'Dictionary', text: 'press and hold a word for its meaning. Download dictionaries to use them offline.' },
            { icon: 'ink_highlighter', label: 'Highlights and notes', text: 'select text and pick a colour.' },
            { icon: 'record_voice_over', label: 'Read along', text: 'with the audiobook: the narrated line or word is highlighted and pages turn by themselves.' },
            { icon: 'auto_stories', label: 'Read mode', text: 'pause, then tap the book button to put the audiobook aside and read with all the tools; the headphones button picks the audio up from your page (it doesn’t start playing until you press play).' },
            { icon: 'wrap_text', label: 'Reflow', text: 'PDFs are re-flowed to fit a phone screen; tap this button in read mode for the original pages.' },
            { icon: 'zoom_in', label: 'PDFs and comics', text: 'pinch to zoom, one or two pages, right-to-left for manga. Scanned PDFs are made readable on the server.' }
          ]
        },
        {
          icon: 'tune',
          title: 'Make it yours',
          text: 'In Settings you can change the look (including e-ink and true-black OLED), colour vision mode, playback and reader options.',
          points: [
            { icon: 'sync', text: 'Your place, bookmarks and highlights follow you to your other devices.' },
            { icon: 'download_for_offline', text: 'Download books to listen and read with no connection: the e-book and the transcription come along, so Lyrics, Karaoke, Read along and reflow all work offline.' },
            { icon: 'account_tree', text: 'The Dewey tab sorts your library by subject, kept up to date by the server.' },
            { icon: 'bar_chart', text: 'Stats (in the menu) shows how much you listened by day, week, month or year, your streaks, and books you should pick up again.' },
            { icon: 'help', text: 'Settings → Help shows this tutorial and the guided tour again.' }
          ]
        },
        {
          icon: 'explore',
          title: 'Want a quick tour?',
          text: 'I can point out the buttons on each screen the first time you open it: the home screen, a book, the player, Transcription and the readers. You can skip it at any time.',
          points: []
        }
      ]
    }
  },
  methods: {
    finish(showAround) {
      this.$store.dispatch('onboarding/finishTutorial', showAround)
    },
    touchStart(e) {
      this.x0 = e.touches[0].clientX
    },
    touchEnd(e) {
      if (this.x0 == null) return
      const dx = e.changedTouches[0].clientX - this.x0
      this.x0 = null
      if (dx < -60 && this.index < this.pages.length - 1) this.index++
      else if (dx > 60 && this.index > 0) this.index--
    },
    onKey(e) {
      if (e.key === 'ArrowRight' && this.index < this.pages.length - 1) this.index++
      else if (e.key === 'ArrowLeft' && this.index > 0) this.index--
      else if (e.key === 'Escape') this.finish(false)
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onKey)
  }
}
</script>

<template>
  <!-- Selected text: the dictionary (Kindle / Grimmory style) and what to do with the selection -->
  <div class="absolute left-0 right-0 bottom-0 z-50 rounded-t-2xl shadow-2xl max-h-[62%] flex flex-col" :style="{ backgroundColor: p.panel, color: p.fg, borderTop: `1px solid ${p.border}` }" @touchstart.stop @touchend.stop @mousedown.stop @mouseup.stop>
    <div class="flex items-start px-4 pt-3 pb-1">
      <div class="flex-grow min-w-0">
        <p class="font-bold text-xl truncate">{{ heading }}</p>
        <p v-if="entry && entry.phonetic" class="text-sm" :style="{ color: p.muted }">{{ entry.phonetic }}</p>
        <p v-if="entry && entry.languageLabel" class="text-xs" :style="{ color: p.faint }">{{ entry.languageLabel }}</p>
      </div>
      <!-- Translate, next to the word -->
      <button v-if="canTranslate" class="flex items-center rounded-full px-3 py-1 mr-2 text-sm font-semibold border" :style="showTranslate ? { backgroundColor: p.accent, color: p.onAccent, borderColor: p.accent } : { borderColor: p.border, color: p.fg }" aria-label="Translate" @click.stop="toggleTranslate">
        <span class="material-symbols text-lg mr-1">translate</span>Translate
      </button>
      <button class="material-symbols text-2xl" :style="{ color: p.muted }" aria-label="Close" @click.stop="$emit('close')">close</button>
    </div>

    <!-- the translation (Translate), above the definitions -->
    <div v-if="showTranslate" class="px-4 pb-2">
      <div class="flex items-center text-xs mb-1" :style="{ color: p.faint }">
        <span>{{ langName(trFrom) }} →</span>
        <select class="ml-1 bg-transparent border rounded px-1 py-0.5 text-xs" :style="{ borderColor: p.border, color: p.fg }" :value="trTo" @change="setTo($event.target.value)" @click.stop>
          <option v-for="l in languages" :key="l.code" :value="l.code" :style="{ backgroundColor: p.panel, color: p.fg }">{{ l.name }}</option>
        </select>
      </div>
      <p v-if="trLoading" class="text-sm" :style="{ color: p.muted }">Translating…</p>
      <p v-else-if="trError" class="text-sm" :style="{ color: p.muted }">{{ trError }}</p>
      <template v-else-if="tr">
        <p class="text-lg font-semibold leading-snug">{{ tr.text }}</p>
        <p v-if="tr.alternatives && tr.alternatives.length" class="text-xs" :style="{ color: p.muted }">Also: {{ tr.alternatives.join(', ') }}</p>
        <p class="text-[10px] mt-1" :style="{ color: p.faint }">Translated online by {{ tr.source || 'MyMemory' }} (via your server)</p>
      </template>
    </div>

    <div v-if="selection.word" class="px-4 overflow-y-auto flex-grow min-h-0 pb-2">
      <p v-if="loading" class="text-sm py-2" :style="{ color: p.muted }">Looking up…</p>

      <!-- definitions first, then the translation (when the book isn't in English) -->
      <template v-else-if="entry">
        <template v-if="entryIsTranslation && definitionResults.length">
          <div v-for="(r, i) in definitionResults.slice(0, 4)" :key="'d' + i" class="mb-3">
            <p class="text-xs mb-1" :style="{ color: p.faint }">{{ r.dictionary }}</p>
            <div class="dict-def text-sm leading-snug" v-html="clean(r.definition)" />
          </div>
        </template>
        <p v-if="entryIsTranslation" class="text-[11px] font-bold uppercase tracking-wider mt-2" :style="{ color: p.faint }">Translation</p>
        <div v-for="(m, mi) in entry.meanings" :key="mi">
          <p v-if="m.partOfSpeech" class="italic text-sm mt-2 mb-0.5" :style="{ color: p.accent }">{{ m.partOfSpeech }}</p>
          <div v-for="(s, si) in m.senses" :key="si" class="flex mb-1.5">
            <span class="w-6 flex-shrink-0 text-sm" :style="{ color: p.muted }">{{ si + 1 }}.</span>
            <div class="min-w-0">
              <p class="text-[15px] leading-snug">{{ s.definition }}</p>
              <p v-for="(ex, ei) in s.examples" :key="ei" class="text-[13px] italic" :style="{ color: p.muted }">“{{ ex }}”</p>
              <p v-if="s.synonyms && s.synonyms.length" class="text-xs" :style="{ color: p.faint }">Similar: {{ s.synonyms.join(', ') }}</p>
            </div>
          </div>
        </div>
        <p class="text-[11px] mt-2" :style="{ color: p.faint }">{{ entry.source }}{{ result.source === 'online' ? ' · online' : '' }}</p>
      </template>

      <!-- StarDict / server dictionaries -->
      <template v-else-if="result && result.results && result.results.length">
        <div v-for="(r, i) in result.results.slice(0, 6)" :key="i" class="mb-3">
          <p v-if="r.kind === 'translation' && (i === 0 || result.results[i - 1].kind !== 'translation')" class="text-[11px] font-bold uppercase tracking-wider mt-2 mb-1" :style="{ color: p.faint }">Translation</p>
          <p class="text-xs mb-1" :style="{ color: p.faint }">{{ r.dictionary }}<template v-if="r.headword && r.headword.toLowerCase() !== selection.word.toLowerCase()"> · {{ r.headword }}</template></p>
          <div class="dict-def text-sm leading-snug" v-html="clean(r.definition)" />
        </div>
        <p class="text-[10px] mb-2" :style="{ color: p.faint }">{{ result.source === 'device' ? 'Downloaded dictionary on this phone' : result.source === 'online' ? 'Wiktionary (via your server)' : 'Dictionary on your server' }}</p>
      </template>

      <!-- nothing found: offer the matching built-in dictionary, like Grimmory -->
      <template v-else-if="result">
        <template v-if="installing">
          <p class="text-sm py-2">Downloading the {{ installing.label }} dictionary… {{ Math.round((installing.progress || 0) * 100) }}%</p>
          <div class="h-1.5 rounded-full overflow-hidden" :style="{ backgroundColor: p.border }"><div class="h-full" :style="{ width: `${Math.round((installing.progress || 0) * 100)}%`, backgroundColor: p.accent }" /></div>
          <p class="text-xs mt-2" :style="{ color: p.muted }">You can keep reading; it finishes in the background.</p>
        </template>
        <template v-else>
          <p class="text-sm py-1" :style="{ color: p.muted }">{{ result.hint || 'No definition found.' }}</p>
          <template v-if="result.suggested && result.suggested.status !== 'ready' && isAndroid">
            <p v-if="result.suggested.status === 'failed'" class="text-xs" :style="{ color: p.muted }">The last download didn't finish: {{ result.suggested.message }}</p>
            <button class="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold" :style="{ backgroundColor: p.accent, color: p.onAccent }" @click.stop="install(result.suggested)">Download {{ result.suggested.label }} dictionary (about {{ result.suggested.sizeLabel }})</button>
            <button v-if="!result.online" class="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold border" :style="{ borderColor: p.border }" @click.stop="goOnline">Look up online instead</button>
            <p class="text-[11px] mt-2" :style="{ color: p.faint }">{{ result.suggested.credit }}. Downloaded once, then it works offline.</p>
          </template>
        </template>
      </template>
    </div>
    <p v-else class="px-4 pb-2 text-sm italic max-h-24 overflow-y-auto" :style="{ color: p.muted }">“{{ selection.text }}”</p>

    <div class="flex items-center px-3 py-3 border-t" :style="{ borderColor: p.border }">
      <template v-if="selection.canHighlight !== false">
        <button v-for="c in colorNames" :key="c" class="w-7 h-7 rounded-full mx-1 border-2" :title="c" :style="{ backgroundColor: colors[c], borderColor: p.border }" :aria-label="`Highlight ${c}`" @click.stop="$emit('highlight', c)"><span v-if="cvd" class="text-[10px] font-bold" style="color: #000">{{ c === 'underline' ? 'U' : c[0].toUpperCase() }}</span></button>
      </template>
      <div class="flex-grow" />
      <button v-if="selection.canHighlight !== false" class="sel-btn" @click.stop="$emit('note')"><span class="material-symbols">edit_note</span><span>Note</span></button>
      <button class="sel-btn" @click.stop="$emit('copy')"><span class="material-symbols">content_copy</span><span>Copy</span></button>
      <button class="sel-btn" @click.stop="$emit('search')"><span class="material-symbols">search</span><span>Search</span></button>
      <button v-if="selection.canPlayFromHere" class="sel-btn" @click.stop="$emit('listen')"><span class="material-symbols">play_circle</span><span>Listen</span></button>
    </div>
  </div>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { lookup, installBuiltin, setOnlineLookups, onBuiltinProgress, translate } from '@/plugins/dictionary'

// languages offered for Translate (MyMemory's two-letter codes)
const LANGUAGES = [
  ['en', 'English'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['nl', 'Dutch'],
  ['sv', 'Swedish'], ['da', 'Danish'], ['no', 'Norwegian'], ['fi', 'Finnish'], ['pl', 'Polish'], ['cs', 'Czech'], ['ro', 'Romanian'],
  ['el', 'Greek'], ['tr', 'Turkish'], ['ru', 'Russian'], ['uk', 'Ukrainian'], ['ar', 'Arabic'], ['he', 'Hebrew'], ['hi', 'Hindi'],
  ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['vi', 'Vietnamese'], ['th', 'Thai'], ['id', 'Indonesian'], ['la', 'Latin']
].map(([code, name]) => ({ code, name }))
const NAME_TO_CODE = Object.fromEntries(LANGUAGES.map((l) => [l.name.toLowerCase(), l.code]))
/** "en", "en-US", "English", "eng" -> "en" */
function langCode(v) {
  const s = String(v || '').trim().toLowerCase()
  if (!s) return ''
  if (NAME_TO_CODE[s]) return NAME_TO_CODE[s]
  const three = { eng: 'en', spa: 'es', fra: 'fr', fre: 'fr', deu: 'de', ger: 'de', ita: 'it', por: 'pt', nld: 'nl', dut: 'nl', rus: 'ru', jpn: 'ja', zho: 'zh', chi: 'zh', kor: 'ko' }
  if (three[s]) return three[s]
  const m = s.match(/^([a-z]{2})(\b|-|_)/)
  return m ? m[1] : ''
}
import { hlColors, hlColorsForPage } from './readerThemes'

export default {
  props: {
    p: { type: Object, required: true },
    /** { text, word, canPlayFromHere, canHighlight } */
    selection: { type: Object, required: true },
    language: String
  },
  data() {
    let trTo = ''
    try {
      trTo = localStorage.getItem('absTranslateTo') || ''
    } catch (e) {}
    return { loading: false, result: null, installing: null, listener: null, showTranslate: false, tr: null, trLoading: false, trError: null, trTo, languages: LANGUAGES }
  },
  computed: {
    /** a word, or a short selection */
    canTranslate() {
      return !!(this.selection.word || (this.selection.text && this.selection.text.length <= 300))
    },
    trText() {
      return this.selection.word || this.selection.text || ''
    },
    /** the book's language (the transcript's, else English) */
    trFrom() {
      return langCode(this.language) || 'en'
    },
    colors: () => hlColors(),
    cvd: () => document.documentElement.className.includes('cvd-'),
    colorNames: () => ['yellow', 'green', 'blue', 'pink', 'underline'],
    entry() {
      return this.result && this.result.entry
    },
    entryIsTranslation() {
      return !!(this.result && this.result.entryKind === 'translation')
    },
    definitionResults() {
      return ((this.result && this.result.results) || []).filter((r) => r.kind !== 'translation')
    },
    heading() {
      if (this.entry) return this.entry.word
      return this.selection.word || (this.selection.text.length > 60 ? this.selection.text.slice(0, 59) + '…' : `“${this.selection.text}”`)
    },
    isAndroid() {
      return Capacitor.getPlatform() === 'android'
    }
  },
  watch: {
    'selection.word': {
      immediate: true,
      handler(w) {
        if (w) this.look(w)
      }
    },
    // another word while Translate is open: translate that one too
    trText() {
      this.tr = null
      this.trError = null
      if (this.showTranslate) this.runTranslate()
    }
  },
  methods: {
    langName(code) {
      const l = LANGUAGES.find((x) => x.code === code)
      return l ? l.name : code
    },
    toggleTranslate() {
      this.showTranslate = !this.showTranslate
      if (!this.showTranslate) return
      if (!this.trTo) {
        // first time: the phone's language, or Spanish when that's the book's language too
        const mine = langCode(navigator.language) || 'en'
        this.trTo = mine !== this.trFrom ? mine : this.trFrom === 'es' ? 'en' : 'es'
      }
      if (!this.tr) this.runTranslate()
    },
    setTo(code) {
      this.trTo = code
      try {
        localStorage.setItem('absTranslateTo', code)
      } catch (e) {}
      this.tr = null
      this.runTranslate()
    },
    async runTranslate() {
      const text = this.trText
      if (!text) return
      this.trLoading = true
      this.trError = null
      try {
        const r = await translate(text, this.trFrom, this.trTo)
        if (text !== this.trText) return
        this.tr = r
      } catch (e) {
        if (text !== this.trText) return
        this.trError = (e && e.message) || "Couldn't translate this"
      } finally {
        if (text === this.trText) this.trLoading = false
      }
    },
    async look(word) {
      this.loading = true
      this.result = null
      const r = await lookup(word, this.language)
      if (this.selection.word !== word) return
      this.result = r
      this.loading = false
    },
    async install(d) {
      this.installing = { ...d, progress: 0 }
      if (!this.listener) {
        this.listener = await onBuiltinProgress((e) => {
          if (!this.installing || e.code !== this.installing.code) return
          if (e.status === 'installing') this.installing = { ...this.installing, progress: e.progress }
          else {
            this.installing = null
            if (e.status === 'ready') this.look(this.selection.word)
            else if (e.status === 'failed' && this.result) this.result = { ...this.result, suggested: e }
          }
        })
      }
      try {
        await installBuiltin(d.code)
      } catch (e) {
        this.installing = null
        this.$toast.error(e.message)
      }
    },
    async goOnline() {
      await setOnlineLookups(true)
      this.$toast.info('Online lookups are on. Turn them off in Reader settings → Dictionaries.')
      this.look(this.selection.word)
    },
    clean(html) {
      return String(html || '')
        .replace(/<(script|style|iframe|object|embed|link|meta)[\s\S]*?(<\/\1>|\/?>)/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '')
    }
  },
  beforeDestroy() {
    if (this.listener) this.listener.remove()
  }
}
</script>

<style scoped>
.sel-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  margin: 0 6px;
  opacity: 0.9;
}
.sel-btn .material-symbols {
  font-size: 22px;
}
.dict-def ::v-deep p {
  margin: 0 0 4px;
}
.dict-def ::v-deep ol,
.dict-def ::v-deep ul {
  padding-left: 18px;
  margin: 2px 0 4px;
}
.dict-def ::v-deep .phonetic {
  opacity: 0.7;
}
</style>

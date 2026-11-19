import { AbsDictionary } from '@/plugins/capacitor'
import { Transcriber } from '@/plugins/transcriber'

/**
 * Word lookups for the e-reader: dictionaries downloaded to the phone first (works offline), then the
 * server's dictionaries (and Wiktionary, if the server allows it).
 */

/** Spellings to try ("Running," -> running, run). Same rules as the server. */
export function candidates(raw, lang) {
  const w = String(raw || '')
    .normalize('NFC')
    .replace(/[’`´]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!w) return []
  const lower = w.toLowerCase()
  const out = [w, lower]
  const l = (lang || '').toLowerCase()
  if (!l || l === 'any' || l.startsWith('en')) {
    const base = lower.replace(/'s$|s'$/, '')
    if (base !== lower) out.push(base)
    const rules = [
      [/ies$/, 'y'],
      [/ves$/, 'f'],
      [/ves$/, 'fe'],
      [/(ss|sh|ch|x|z|o)es$/, '$1'],
      [/s$/, ''],
      [/ied$/, 'y'],
      [/([^aeiou])\1ed$/, '$1'],
      [/ed$/, 'e'],
      [/ed$/, ''],
      [/([^aeiou])\1ing$/, '$1'],
      [/ing$/, 'e'],
      [/ing$/, ''],
      [/ier$/, 'y'],
      [/iest$/, 'y'],
      [/er$/, ''],
      [/est$/, ''],
      [/ly$/, ''],
      [/ily$/, 'y']
    ]
    for (const [re, rep] of rules) if (re.test(base) && base.length > 3) out.push(base.replace(re, rep))
  } else if (/^(es|fr|it|pt|ca)/.test(l)) {
    if (lower.endsWith('es')) out.push(lower.slice(0, -2))
    if (lower.endsWith('s')) out.push(lower.slice(0, -1))
  }
  return [...new Set(out.filter(Boolean))]
}

const online = () => {
  const s = window.$nuxt && window.$nuxt.$store
  return !!(s && s.state.user && s.state.user.user && s.state.networkConnected !== false)
}

/** 'translation' for bilingual dictionaries (FreeDict "eng-spa"), else 'definition' */
export function kindOf(r) {
  if (r && r.kind) return r.kind
  const m = String((r && (r.dictionaryId || r.dictionary)) || '').match(/([a-z]{3})-([a-z]{3})/i)
  return m && m[1].toLowerCase() !== m[2].toLowerCase() ? 'translation' : 'definition'
}
const definitionsFirst = (list) => list.map((r) => ({ ...r, kind: kindOf(r) })).sort((a, b) => (a.kind === 'translation') - (b.kind === 'translation'))

/**
 * Looks a word up, like a Kindle:
 *   1. built-in dictionaries downloaded to the phone (WordNet, WikDict, FreeDict: from Grimmory)
 *   2. StarDict dictionaries downloaded from your server
 *   3. your server's dictionaries (and Wiktionary through the server, if it allows that)
 *   4. online on the phone (Free Dictionary API / Wiktionary), if you turned that on
 *
 * Returns { word, entry?, results: [{ dictionary, headword, definition }], source, hint, suggested, anyInstalled, online }
 *   entry = a structured definition (pronunciation, parts of speech, examples, synonyms)
 *   results = HTML definitions from StarDict / server dictionaries
 *   suggested = the built-in dictionary to offer for download when nothing is installed
 */
export async function lookup(word, lang) {
  const words = candidates(word, lang)
  if (!words.length) return { word, matched: null, results: [], source: 'none' }
  let builtin = null
  try {
    builtin = await AbsDictionary.builtinLookup({ word, lang: lang || '', online: false })
    if (builtin && builtin.entry) {
      // English: WordNet is the definition. Other languages: the built-in entry is a translation, so put
      // a real definition (the server's dictionaries / Wiktionary) above it when the server has one.
      const translated = !!lang && !/^(en|any)/i.test(lang)
      let defs = []
      if (translated && online() && (await Transcriber.serverInfo())) {
        try {
          const res = await window.$nuxt.$nativeHttp.get(`/api/transcription/dictionary/lookup?word=${encodeURIComponent(word)}&lang=${encodeURIComponent(lang)}`)
          defs = ((res && res.results) || []).filter((r) => kindOf(r) === 'definition')
        } catch (e) {}
      }
      return { word, entry: builtin.entry, entryKind: translated ? 'translation' : 'definition', results: defs, source: 'builtin', online: builtin.online }
    }
  } catch (e) {}
  const extra = { suggested: builtin && builtin.suggested, anyInstalled: !!(builtin && builtin.anyInstalled), online: !!(builtin && builtin.online), systemDefinition: !!(builtin && builtin.systemDefinition) }
  let local = null
  try {
    local = await AbsDictionary.lookup({ words, lang: lang || '' })
    if (local && local.results && local.results.length) return { word, ...local, results: definitionsFirst(local.results), ...extra }
  } catch (e) {}
  if (online() && (await Transcriber.serverInfo())) {
    try {
      const qs = `word=${encodeURIComponent(word)}&lang=${encodeURIComponent(lang || '')}`
      const res = await window.$nuxt.$nativeHttp.get(`/api/transcription/dictionary/lookup?${qs}`)
      if (res && res.results && res.results.length) return { ...res, results: definitionsFirst(res.results), ...extra }
    } catch (e) {}
  }
  if (extra.online && online()) {
    try {
      const res = await AbsDictionary.builtinLookup({ word, lang: lang || '', online: true })
      if (res && res.entry) return { word, entry: res.entry, results: [], source: 'online', ...extra }
    } catch (e) {}
  }
  const hasLocal = extra.anyInstalled || (local && local.installed > 0)
  return {
    word,
    matched: null,
    results: [],
    source: 'none',
    ...extra,
    hint: hasLocal ? `“${word}” isn't in your dictionaries.` : !online() ? "You're offline and no dictionary is downloaded for this language yet." : 'No dictionary has this word yet.'
  }
}

// ---- built-in dictionaries (downloaded straight to the phone)

/** A word or short phrase in another language, through the server (Translate in the dictionary sheet) */
export async function translate(text, from, to) {
  const qs = new URLSearchParams({ q: String(text || '').slice(0, 300), from: from || 'en', to })
  const res = await window.$nuxt.$nativeHttp.get(`/api/transcription/translate?${qs}`)
  return res && res.data !== undefined ? res.data : res
}

export async function builtinDictionaries() {
  try {
    return await AbsDictionary.builtinList()
  } catch (e) {
    return { dictionaries: [], online: false }
  }
}
export const installBuiltin = (code) => AbsDictionary.builtinInstall({ code })
export const removeBuiltin = (code) => AbsDictionary.builtinRemove({ code })
export const setOnlineLookups = (allowed) => AbsDictionary.setOnline({ allowed })
export const onBuiltinProgress = (cb) => AbsDictionary.addListener('onBuiltinDictionary', cb)

export async function serverDictionaries() {
  if (!online() || !(await Transcriber.serverInfo())) return []
  try {
    const res = await window.$nuxt.$nativeHttp.get('/api/transcription/dictionary')
    return res.dictionaries || []
  } catch (e) {
    return []
  }
}

export async function installedDictionaries() {
  try {
    return (await AbsDictionary.list()).dictionaries || []
  } catch (e) {
    return []
  }
}

export function installDictionary(d) {
  return AbsDictionary.install({ id: d.id, name: d.name, lang: d.lang, path: `/api/transcription/dictionary/${encodeURIComponent(d.id)}/download` })
}

export function removeDictionary(id) {
  return AbsDictionary.remove({ id })
}

export function onDownloadProgress(cb) {
  return AbsDictionary.addListener('onDictionaryDownload', cb)
}

/** iOS: open the system dictionary's card for a word (AbsDictionary.swift) */
export const showSystemDefinition = (word) => AbsDictionary.showDefinition({ word })

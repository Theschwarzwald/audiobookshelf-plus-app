package com.audiobookshelf.app.dictionary

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import okhttp3.OkHttpClient
import okhttp3.Request
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import org.apache.commons.compress.compressors.xz.XZCompressorInputStream
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FilterInputStream
import java.io.InputStream
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/*
 * Built-in dictionaries, ported from Grimmory Reader (data/dictionary/Dictionary.kt):
 * free downloads that are turned into small databases on the phone, so lookups work offline.
 *   English: WordNet 3.1 (Princeton University)
 *   Spanish, French, Japanese, Chinese: WikDict (from Wiktionary), explained in English
 *   Arabic: FreeDict Arabic-English
 * Optional online lookups (no download): Free Dictionary API for English, Wiktionary for the rest.
 * The language is picked from the word itself (Arabic script, kana, Chinese characters) and the
 * book's language. Same behaviour as Grimmory; Compose state replaced by a listener for Capacitor.
 */

/** One meaning of a word. */
data class Sense(val definition: String, val examples: List<String>, val synonyms: List<String>)

/** Meanings grouped by part of speech ("noun", "verb"...). */
data class Meaning(val partOfSpeech: String, val senses: List<Sense>)

data class DictionaryEntry(
    val word: String,
    val phonetic: String?,
    val meanings: List<Meaning>,
    /** Credit line shown under the definition. */
    val source: String,
    /** Which dictionary answered, e.g. "Spanish → English". */
    val languageLabel: String = "",
)

/** The dictionaries the app can download. All are free; each explains to English. */
enum class DictLanguage(
    val code: String,
    val label: String,
    val sizeLabel: String,
    val credit: String,
) {
    ENGLISH("en", "English", "10 MB", "WordNet 3.1 · Princeton University"),
    SPANISH("es", "Spanish", "11 MB", "WikDict · from Wiktionary (CC BY-SA)"),
    FRENCH("fr", "French", "22 MB", "WikDict · from Wiktionary (CC BY-SA)"),
    JAPANESE("ja", "Japanese", "5 MB", "WikDict · from Wiktionary (CC BY-SA)"),
    CHINESE("zh", "Chinese (Mandarin)", "12 MB", "WikDict · from Wiktionary (CC BY-SA)"),
    ARABIC("ar", "Arabic", "2 MB", "FreeDict · Arabic–English (GPL)");

    /** "Spanish → English", or just "English". */
    val direction: String get() = if (this == ENGLISH) "English" else "$label → English"

    companion object {
        /** Maps a book's language metadata ("es", "spa", "Spanish", "Español"...) to a dictionary. */
        fun fromBookLanguage(value: String?): DictLanguage? {
            val v = value?.trim()?.lowercase() ?: return null
            return when {
                v.startsWith("en") || v == "eng" -> ENGLISH
                v.startsWith("es") || v == "spa" || v.startsWith("spanish") || v.startsWith("español") -> SPANISH
                v.startsWith("fr") || v == "fra" || v == "fre" || v.startsWith("french") -> FRENCH
                v.startsWith("ja") || v == "jpn" || v.startsWith("japanese") || v.startsWith("日本") -> JAPANESE
                v.startsWith("zh") || v == "chi" || v == "zho" || v == "cmn" || v.startsWith("chinese") || v.startsWith("mandarin") || v.startsWith("中文") -> CHINESE
                v.startsWith("ar") || v == "ara" || v.startsWith("arabic") || v.startsWith("العربية") -> ARABIC
                else -> null
            }
        }
    }
}

/**
 * The dictionary for long-press lookups, like the Kindle app's. See the note at the top of the file.
 */
object BuiltInDictionary {
    private const val WORDNET_URL = "https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz"
    private const val WIKDICT_URL = "https://download.wikdict.com/dictionaries/sqlite/2/"
    private const val FREEDICT_DATABASE = "https://freedict.org/freedict-database.json"
    private const val FREEDICT_FALLBACK = "https://download.freedict.org/dictionaries/ara-eng/0.6.3/freedict-ara-eng-0.6.3.dictd.tar.xz"
    private const val ENGLISH_ONLINE = "https://api.dictionaryapi.dev/api/v2/entries/en/"
    private const val WIKTIONARY_ONLINE = "https://en.wiktionary.org/api/rest_v1/page/definition/"

    sealed interface Status {
        object NotInstalled : Status
        data class Installing(val progress: Float) : Status
        object Ready : Status
        data class Failed(val message: String) : Status
    }

    private val statuses = ConcurrentHashMap<DictLanguage, Status>()

    /** Told about every status change (the plugin forwards it to the app as an event). */
    @Volatile var listener: ((DictLanguage, Status) -> Unit)? = null

    fun status(language: DictLanguage): Status = statuses[language] ?: Status.NotInstalled

    fun isInstalled(language: DictLanguage) = status(language) == Status.Ready

    /** Use online lookups when no downloaded dictionary has the word. */
    @Volatile var onlineAllowed = false
        private set

    private val executor = Executors.newSingleThreadExecutor()
    // A plain client: dictionary lookups never carry your Audiobookshelf sign-in.
    private val http by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .addInterceptor { chain -> chain.proceed(chain.request().newBuilder().header("User-Agent", "Audiobookshelf-app (e-reader dictionary)").build()) }
            .build()
    }
    private val open = HashMap<DictLanguage, SQLiteDatabase>()
    @Volatile private var loaded = false

    private fun dbFile(context: Context, language: DictLanguage) = File(context.filesDir, "builtin-dict-${language.code}.db")
    private fun prefs(context: Context) = context.getSharedPreferences("builtin-dictionary", Context.MODE_PRIVATE)

    @Synchronized
    fun load(context: Context) {
        if (loaded) return
        onlineAllowed = prefs(context).getBoolean("online", false)
        DictLanguage.values().forEach { lang ->
            if (statuses[lang] !is Status.Installing) statuses[lang] = if (dbFile(context, lang).exists()) Status.Ready else Status.NotInstalled
        }
        loaded = true
    }

    fun setOnlineAllowed(context: Context, allowed: Boolean) {
        onlineAllowed = allowed
        prefs(context).edit().putBoolean("online", allowed).apply()
    }

    private fun setStatus(language: DictLanguage, s: Status) {
        statuses[language] = s
        listener?.invoke(language, s)
    }

    // ---------------------------------------------------------------- which language

    /** The dictionaries to try for a word, best first. */
    fun candidates(word: String, bookLanguage: DictLanguage?): List<DictLanguage> {
        val byScript: List<DictLanguage>? = when {
            word.any { it in '\u0600'..'\u06FF' || it in '\u0750'..'\u077F' || it in '\u08A0'..'\u08FF' } -> listOf(DictLanguage.ARABIC)
            word.any { it in '\u3040'..'\u30FF' } -> listOf(DictLanguage.JAPANESE) // hiragana / katakana
            word.any { Character.UnicodeScript.of(it.code) == Character.UnicodeScript.HAN } ->
                if (bookLanguage == DictLanguage.JAPANESE) listOf(DictLanguage.JAPANESE, DictLanguage.CHINESE)
                else listOf(DictLanguage.CHINESE, DictLanguage.JAPANESE)
            else -> null
        }
        if (byScript != null) return byScript
        // Latin letters: the book's language first, then the others.
        val latin = listOf(DictLanguage.ENGLISH, DictLanguage.SPANISH, DictLanguage.FRENCH)
        return (listOfNotNull(bookLanguage?.takeIf { it in latin }) + latin).distinct()
    }

    /** The dictionary to offer for download when none of the candidates is installed. */
    fun suggested(word: String, bookLanguage: DictLanguage?): DictLanguage = candidates(word, bookLanguage).first()

    // ---------------------------------------------------------------- install / remove

    /** Downloads a dictionary in the background. */
    fun install(context: Context, language: DictLanguage) {
        if (status(language) is Status.Installing) return
        val app = context.applicationContext
        setStatus(language, Status.Installing(0f))
        executor.execute {
            val target = dbFile(app, language)
            val partial = File(app.filesDir, "builtin-dict-${language.code}.db.part")
            partial.delete()
            try {
                when (language) {
                    DictLanguage.ENGLISH -> download(WORDNET_URL, language) { WordNetBuilder.build(it, partial) }
                    DictLanguage.ARABIC -> download(freeDictUrl(), language) { FreeDictBuilder.build(it, partial) }
                    else -> download("$WIKDICT_URL${language.code}-en.sqlite3", language) { input ->
                        partial.outputStream().use { input.copyTo(it) } // already a ready-made database
                        check(WikDict.isValid(partial)) { "The downloaded file isn't a WikDict dictionary." }
                    }
                }
                synchronized(open) { open.remove(language)?.close() }
                target.delete()
                if (!partial.renameTo(target)) error("Couldn't save the dictionary.")
                setStatus(language, Status.Ready)
            } catch (e: Exception) {
                partial.delete()
                setStatus(language, Status.Failed(e.message ?: "The download failed."))
            }
        }
    }

    fun remove(context: Context, language: DictLanguage) {
        synchronized(open) { open.remove(language)?.close() }
        dbFile(context, language).delete()
        setStatus(language, Status.NotInstalled)
    }

    private fun download(url: String, language: DictLanguage, handle: (InputStream) -> Unit) {
        http.newCall(Request.Builder().url(url).build()).execute().use { response ->
            if (!response.isSuccessful) error("The dictionary server returned error ${response.code}.")
            val body = response.body ?: error("The download was empty.")
            val total = body.contentLength()
            handle(CountingStream(body.byteStream()) { read ->
                if (total > 0) setStatus(language, Status.Installing((read.toFloat() / total).coerceAtMost(0.99f)))
            })
        }
    }

    /** Finds the current Arabic-English release in FreeDict's catalogue (falls back to a known release). */
    private fun freeDictUrl(): String = runCatching {
        http.newCall(Request.Builder().url(FREEDICT_DATABASE).build()).execute().use { response ->
            val found = ArrayList<String>()
            fun walk(v: Any?) {
                when (v) {
                    is JSONObject -> v.keys().forEach { walk(v.opt(it)) }
                    is JSONArray -> for (i in 0 until v.length()) walk(v.opt(i))
                    is String -> if (v.contains("ara-eng") && v.endsWith(".dictd.tar.xz")) found.add(v)
                }
            }
            val text = response.body?.string().orEmpty().trim()
            walk(if (text.startsWith("[")) JSONArray(text) else JSONObject(text))
            found.maxOrNull()
        }
    }.getOrNull() ?: FREEDICT_FALLBACK

    // ---------------------------------------------------------------- look up

    /** Downloaded dictionaries first, then online if allowed. Null when nothing was found. */
    fun lookUp(context: Context, rawWord: String, bookLanguage: DictLanguage?, allowOnline: Boolean = onlineAllowed): DictionaryEntry? {
        load(context)
        val word = rawWord.trim().trim { !it.isLetterOrDigit() && it != '\'' && it != '-' }
        if (word.isEmpty()) return null
        val languages = candidates(word, bookLanguage)
        for (lang in languages) {
            if (!isInstalled(lang)) continue
            val db = database(context, lang) ?: continue
            val entry = synchronized(db) {
                when (lang) {
                    DictLanguage.ENGLISH -> WordNetBuilder.lookUp(db, word)
                    DictLanguage.ARABIC -> FreeDictBuilder.lookUp(db, word)
                    else -> WikDict.lookUp(db, word)
                }
            }
            if (entry != null) return entry.copy(source = lang.credit, languageLabel = lang.direction)
        }
        if (allowOnline) {
            for (lang in languages) {
                val entry = if (lang == DictLanguage.ENGLISH) englishOnline(word) else wiktionaryOnline(word, lang)
                if (entry != null) return entry.copy(languageLabel = lang.direction)
            }
        }
        return null
    }

    private fun database(context: Context, language: DictLanguage): SQLiteDatabase? = synchronized(open) {
        open[language] ?: runCatching {
            SQLiteDatabase.openDatabase(dbFile(context, language).path, null, SQLiteDatabase.OPEN_READONLY)
        }.getOrNull()?.also { open[language] = it }
    }

    private fun JSONObject.s(key: String): String? = optString(key, "").takeIf { it.isNotBlank() && it != "null" }

    /** English online: the Free Dictionary API. */
    private fun englishOnline(word: String): DictionaryEntry? = runCatching {
        val request = Request.Builder().url(ENGLISH_ONLINE + URLEncoder.encode(word.lowercase(), "UTF-8")).build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val entries = JSONArray(response.body?.string().orEmpty())
            val first = entries.optJSONObject(0) ?: return null
            var phonetic = first.s("phonetic")
            if (phonetic == null) {
                val ph = first.optJSONArray("phonetics")
                if (ph != null) for (i in 0 until ph.length()) { phonetic = ph.optJSONObject(i)?.s("text"); if (phonetic != null) break }
            }
            val meanings = ArrayList<Meaning>()
            for (e in 0 until entries.length()) {
                val ms = entries.optJSONObject(e)?.optJSONArray("meanings") ?: continue
                for (m in 0 until ms.length()) {
                    val meaning = ms.optJSONObject(m) ?: continue
                    val defs = meaning.optJSONArray("definitions") ?: continue
                    val senses = ArrayList<Sense>()
                    for (d in 0 until defs.length()) {
                        if (senses.size >= 6) break
                        val def = defs.optJSONObject(d) ?: continue
                        val text = def.s("definition") ?: continue
                        val syn = def.optJSONArray("synonyms")
                        senses += Sense(text, listOfNotNull(def.s("example")), (0 until (syn?.length() ?: 0)).mapNotNull { syn?.optString(it) })
                    }
                    if (senses.isNotEmpty()) meanings += Meaning(meaning.s("partOfSpeech") ?: "", senses)
                }
            }
            if (meanings.isEmpty()) null
            else DictionaryEntry(first.s("word") ?: word, phonetic, meanings, "Free Dictionary API · Wiktionary (CC BY-SA)")
        }
    }.getOrNull()

    /** Other languages online: Wiktionary's definitions, explained in English. */
    private fun wiktionaryOnline(word: String, language: DictLanguage): DictionaryEntry? = runCatching {
        val request = Request.Builder().url(WIKTIONARY_ONLINE + URLEncoder.encode(word, "UTF-8").replace("+", "%20")).build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            val root = JSONObject(response.body?.string().orEmpty())
            val groups = root.optJSONArray(language.code) ?: return null
            fun clean(html: String?) = html?.replace(Regex("<[^>]+>"), "")?.replace("&nbsp;", " ")?.replace("&amp;", "&")?.trim().orEmpty()
            val meanings = ArrayList<Meaning>()
            for (g in 0 until groups.length()) {
                val group = groups.optJSONObject(g) ?: continue
                val defs = group.optJSONArray("definitions") ?: continue
                val senses = ArrayList<Sense>()
                for (d in 0 until defs.length()) {
                    if (senses.size >= 6) break
                    val def = defs.optJSONObject(d) ?: continue
                    val text = clean(def.s("definition")).takeIf { it.isNotEmpty() } ?: continue
                    val ex = def.optJSONArray("examples")
                    senses += Sense(text, (0 until minOf(2, ex?.length() ?: 0)).map { clean(ex?.optString(it)) }, emptyList())
                }
                if (senses.isNotEmpty()) meanings += Meaning(group.s("partOfSpeech")?.lowercase() ?: "", senses)
            }
            if (meanings.isEmpty()) null else DictionaryEntry(word, null, meanings, "Wiktionary (CC BY-SA)")
        }
    }.getOrNull()

    /** Reports how many bytes have been read, for the download progress bar. */
    private class CountingStream(input: InputStream, private val onRead: (Long) -> Unit) : FilterInputStream(input) {
        private var count = 0L
        private var lastReport = 0L
        override fun read(): Int = super.read().also { if (it >= 0) bump(1) }
        override fun read(b: ByteArray, off: Int, len: Int): Int = super.read(b, off, len).also { if (it > 0) bump(it.toLong()) }
        private fun bump(n: Long) {
            count += n
            if (count - lastReport > 64 * 1024) {
                lastReport = count
                onRead(count)
            }
        }
    }

    /** For the app: the entry as JSON */
    fun toJson(e: DictionaryEntry): JSONObject {
        val ms = JSONArray()
        e.meanings.forEach { m ->
            val ss = JSONArray()
            m.senses.forEach { s -> ss.put(JSONObject().put("definition", s.definition).put("examples", JSONArray(s.examples)).put("synonyms", JSONArray(s.synonyms))) }
            ms.put(JSONObject().put("partOfSpeech", m.partOfSpeech).put("senses", ss))
        }
        return JSONObject().put("word", e.word).put("phonetic", e.phonetic ?: JSONObject.NULL).put("source", e.source).put("languageLabel", e.languageLabel).put("meanings", ms)
    }
}

/**
 * WikDict dictionaries (Spanish, French, Japanese, Chinese → English). They
 * download as ready-made SQLite databases, built from Wiktionary.
 */
internal object WikDict {
    fun isValid(file: File): Boolean = runCatching {
        SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
            db.rawQuery("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('translation', 'simple_translation')", null).use { it.count > 0 }
        }
    }.getOrDefault(false)

    fun lookUp(db: SQLiteDatabase, raw: String): DictionaryEntry? {
        // Try the word as written, then in lower case (the first word of a sentence is capitalised).
        val forms = listOf(raw, raw.lowercase()).distinct()
        for (form in forms) {
            detailed(db, form)?.let { return it }
            simple(db, form)?.let { return it }
        }
        return null
    }

    /** The full table: one row per meaning, with a short gloss. */
    private fun detailed(db: SQLiteDatabase, word: String): DictionaryEntry? = runCatching {
        val byPos = LinkedHashMap<String, MutableList<Sense>>()
        db.rawQuery(
            "SELECT lexentry, sense, trans_list FROM translation WHERE written_rep = ? ORDER BY importance DESC, sense_num LIMIT 24",
            arrayOf(word),
        ).use { c ->
            while (c.moveToNext()) {
                val pos = partOfSpeech(c.getString(0))
                val translations = c.getString(2)?.split("|")?.map { it.trim() }?.filter { it.isNotEmpty() }?.distinct().orEmpty()
                if (translations.isEmpty()) continue
                val list = byPos.getOrPut(pos) { mutableListOf() }
                if (list.size < 6) list += Sense(translations.joinToString(", "), listOfNotNull(c.getString(1)?.takeIf { it.isNotBlank() }), emptyList())
            }
        }
        if (byPos.isEmpty()) null
        else DictionaryEntry(word, null, byPos.map { (pos, senses) -> Meaning(pos, senses) }, "")
    }.getOrNull()

    /** The compact table, used if the full one is missing. */
    private fun simple(db: SQLiteDatabase, word: String): DictionaryEntry? = runCatching {
        db.rawQuery("SELECT trans_list FROM simple_translation WHERE written_rep = ? LIMIT 1", arrayOf(word)).use { c ->
            if (!c.moveToFirst()) return@use null
            val translations = c.getString(0)?.split("|")?.map { it.trim() }?.filter { it.isNotEmpty() }.orEmpty()
            if (translations.isEmpty()) null
            else DictionaryEntry(word, null, listOf(Meaning("", translations.take(8).map { Sense(it, emptyList(), emptyList()) })), "")
        }
    }.getOrNull()

    /** "perro__Noun__1" → "noun" (WikDict keeps the part of speech in the entry id). */
    private fun partOfSpeech(lexentry: String?): String {
        val parts = lexentry?.split("__").orEmpty()
        val raw = parts.getOrNull(1)?.lowercase() ?: return ""
        return when {
            raw.startsWith("noun") || raw.startsWith("sub") -> "noun"
            raw.startsWith("verb") -> "verb"
            raw.startsWith("adj") -> "adjective"
            raw.startsWith("adv") -> "adverb"
            else -> raw.replace('_', ' ')
        }
    }
}

/**
 * FreeDict's Arabic–English dictionary (about 53,000 words), turned into a small
 * database. Lookups ignore vowel marks and try the word without common prefixes
 * such as "ال" (the), "و" (and) and "ب" (with).
 */
internal object FreeDictBuilder {
    private const val B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

    fun build(download: InputStream, out: File) {
        var index: List<String>? = null
        var dict: ByteArray? = null
        TarArchiveInputStream(XZCompressorInputStream(download)).use { tar ->
            var entry = tar.nextEntry
            while (entry != null) {
                val name = entry.name
                when {
                    // lineSequence() doesn't close the reader (that would close the whole archive).
                    name.endsWith(".index") -> index = tar.bufferedReader(Charsets.UTF_8).lineSequence().toList()
                    name.endsWith(".dict.dz") -> dict = GzipCompressorInputStream(tar).readBytes()
                    name.endsWith(".dict") -> dict = ByteArrayOutputStream().also { tar.copyTo(it) }.toByteArray()
                }
                entry = tar.nextEntry
            }
        }
        val lines = index ?: error("The Arabic dictionary download had no index.")
        val data = dict ?: error("The Arabic dictionary download had no definitions.")

        val db = SQLiteDatabase.openOrCreateDatabase(out, null)
        try {
            db.execSQL("CREATE TABLE entry (key TEXT NOT NULL, word TEXT NOT NULL, definition TEXT NOT NULL)")
            val insert = db.compileStatement("INSERT INTO entry VALUES (?, ?, ?)")
            db.beginTransaction()
            for (line in lines) {
                val parts = line.split('\t')
                if (parts.size < 3 || parts[0].startsWith("00-database")) continue
                val offset = decode(parts[1]).toInt()
                val length = decode(parts[2]).toInt()
                if (offset < 0 || offset + length > data.size) continue
                val text = String(data, offset, length, Charsets.UTF_8)
                insert.bindString(1, normalize(parts[0])); insert.bindString(2, parts[0]); insert.bindString(3, text)
                insert.executeInsert()
            }
            db.execSQL("CREATE INDEX entry_key ON entry(key)")
            db.setTransactionSuccessful()
        } finally {
            if (db.inTransaction()) db.endTransaction()
            db.close()
        }
    }

    fun lookUp(db: SQLiteDatabase, raw: String): DictionaryEntry? {
        val word = normalize(raw)
        val prefixes = listOf("", "وال", "بال", "فال", "كال", "ال", "لل", "و", "ف", "ب", "ل", "ك")
        val candidates = prefixes.filter { word.startsWith(it) && word.length - it.length >= 2 }.map { word.removePrefix(it) }.distinct()
        for (key in candidates) {
            val senses = mutableListOf<Sense>()
            var headword: String? = null
            db.rawQuery("SELECT word, definition FROM entry WHERE key = ? LIMIT 8", arrayOf(key)).use { c ->
                while (c.moveToNext()) {
                    headword = headword ?: c.getString(0)
                    c.getString(1).lines().map { it.trim() }
                        .filter { it.isNotEmpty() && normalize(it) != key && !it.equals(c.getString(0), true) }
                        .forEach { if (senses.size < 8) senses += Sense(it, emptyList(), emptyList()) }
                }
            }
            if (senses.isNotEmpty()) return DictionaryEntry(headword ?: raw, null, listOf(Meaning("", senses)), "")
        }
        return null
    }

    /** Removes vowel marks and stretching, and evens out the different forms of alef and ya. */
    fun normalize(text: String): String = text.trim()
        .replace(Regex("[\u064B-\u065F\u0670\u0640]"), "")
        .replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ٱ', 'ا')
        .replace('ى', 'ي').replace('ة', 'ه')

    /** dictd stores offsets and lengths as base-64 numbers. */
    private fun decode(value: String): Long = value.fold(0L) { acc, c -> acc * 64 + B64.indexOf(c).coerceAtLeast(0) }
}

/**
 * Turns WordNet's text files into a small searchable database on the phone,
 * and answers lookups from it (including plurals and verb forms: "running"
 * finds "run", "geese" finds "goose").
 */
internal object WordNetBuilder {
    private val POS_OF_FILE = mapOf("noun" to "n", "verb" to "v", "adj" to "a", "adv" to "r")
    private val POS_NAMES = linkedMapOf("n" to "noun", "v" to "verb", "a" to "adjective", "r" to "adverb")

    /** WordNet's rules for finding a word's base form. */
    private val SUFFIX_RULES = mapOf(
        "n" to listOf("s" to "", "ses" to "s", "xes" to "x", "zes" to "z", "ches" to "ch", "shes" to "sh", "men" to "man", "ies" to "y"),
        "v" to listOf("s" to "", "ies" to "y", "es" to "e", "es" to "", "ed" to "e", "ed" to "", "ing" to "e", "ing" to ""),
        "a" to listOf("er" to "", "est" to "", "er" to "e", "est" to "e"),
        "r" to emptyList(),
    )

    fun build(download: InputStream, out: File) {
        val db = SQLiteDatabase.openOrCreateDatabase(out, null)
        try {
            db.execSQL("CREATE TABLE lemma (word TEXT NOT NULL, pos TEXT NOT NULL, synset TEXT NOT NULL, rank INTEGER NOT NULL)")
            db.execSQL("CREATE TABLE synset (key TEXT PRIMARY KEY, words TEXT, gloss TEXT)")
            db.execSQL("CREATE TABLE exc (form TEXT NOT NULL, base TEXT NOT NULL, pos TEXT NOT NULL)")
            val addLemma = db.compileStatement("INSERT INTO lemma VALUES (?, ?, ?, ?)")
            val addSynset = db.compileStatement("INSERT OR REPLACE INTO synset VALUES (?, ?, ?)")
            val addExc = db.compileStatement("INSERT INTO exc VALUES (?, ?, ?)")

            db.beginTransaction()
            TarArchiveInputStream(GzipCompressorInputStream(download)).use { tar ->
                var entry = tar.nextEntry
                while (entry != null) {
                    val name = entry.name.substringAfterLast('/')
                    val reader = tar.bufferedReader(Charsets.UTF_8) // not closed: it would close the whole archive
                    when {
                        name.startsWith("index.") && name.substringAfter('.') in POS_OF_FILE -> {
                            reader.lineSequence().filterNot { it.startsWith("  ") || it.isBlank() }.forEach { line ->
                                val t = line.trim().split(' ')
                                val pos = t.getOrNull(1) ?: return@forEach
                                val count = t.getOrNull(2)?.toIntOrNull() ?: return@forEach
                                val filePos = if (pos == "s") "a" else pos
                                t.takeLast(count).forEachIndexed { rank, offset ->
                                    addLemma.bindString(1, t[0]); addLemma.bindString(2, filePos)
                                    addLemma.bindString(3, filePos + offset); addLemma.bindLong(4, rank.toLong())
                                    addLemma.executeInsert()
                                }
                            }
                        }
                        name.startsWith("data.") && name.substringAfter('.') in POS_OF_FILE -> {
                            val filePos = POS_OF_FILE.getValue(name.substringAfter('.'))
                            reader.lineSequence().filterNot { it.startsWith("  ") || it.isBlank() }.forEach { line ->
                                val t = line.substringBefore(" | ").split(' ')
                                val count = t.getOrNull(3)?.toIntOrNull(16) ?: return@forEach
                                val words = (0 until count).mapNotNull { t.getOrNull(4 + it * 2) }
                                    .joinToString(",") { it.replace('_', ' ').substringBefore('(') }
                                addSynset.bindString(1, filePos + t[0]); addSynset.bindString(2, words)
                                addSynset.bindString(3, line.substringAfter(" | ", "").trim())
                                addSynset.executeInsert()
                            }
                        }
                        name.endsWith(".exc") && name.substringBefore('.') in POS_OF_FILE -> {
                            val pos = POS_OF_FILE.getValue(name.substringBefore('.'))
                            reader.lineSequence().forEach { line ->
                                val t = line.trim().split(' ')
                                if (t.size >= 2) t.drop(1).forEach { base ->
                                    addExc.bindString(1, t[0]); addExc.bindString(2, base); addExc.bindString(3, pos)
                                    addExc.executeInsert()
                                }
                            }
                        }
                    }
                    entry = tar.nextEntry
                }
            }
            db.execSQL("CREATE INDEX lemma_word ON lemma(word)")
            db.execSQL("CREATE INDEX exc_form ON exc(form)")
            db.setTransactionSuccessful()
        } finally {
            if (db.inTransaction()) db.endTransaction()
            db.close()
        }
    }

    fun lookUp(db: SQLiteDatabase, raw: String): DictionaryEntry? {
        val word = raw.lowercase().replace(' ', '_')
        // Try the word itself, then irregular forms ("geese" → "goose"), then suffix rules ("running" → "run").
        val candidates = LinkedHashMap<String, MutableSet<String>>() // base form → parts of speech to try
        POS_NAMES.keys.forEach { candidates.getOrPut(word) { mutableSetOf() }.add(it) }
        db.rawQuery("SELECT base, pos FROM exc WHERE form = ?", arrayOf(word)).use { c ->
            while (c.moveToNext()) candidates.getOrPut(c.getString(0)) { mutableSetOf() }.add(c.getString(1))
        }
        SUFFIX_RULES.forEach { (pos, rules) ->
            rules.forEach { (suffix, ending) ->
                if (word.endsWith(suffix) && word.length > suffix.length + 1) {
                    candidates.getOrPut(word.dropLast(suffix.length) + ending) { mutableSetOf() }.add(pos)
                }
            }
        }

        val byPos = LinkedHashMap<String, MutableList<Sense>>()
        var found: String? = null
        for ((base, posSet) in candidates) {
            db.rawQuery("SELECT l.pos, s.words, s.gloss FROM lemma l JOIN synset s ON s.key = l.synset WHERE l.word = ? ORDER BY l.rank", arrayOf(base)).use { c ->
                while (c.moveToNext()) {
                    val pos = c.getString(0)
                    if (pos !in posSet) continue
                    val list = byPos.getOrPut(pos) { mutableListOf() }
                    if (list.size >= 6) continue
                    found = found ?: base
                    val gloss = c.getString(2) ?: ""
                    val examples = Regex("\"([^\"]+)\"").findAll(gloss).map { it.groupValues[1] }.toList()
                    val definition = gloss.substringBefore("; \"").substringBefore(" \"").trim().trimEnd(';').trim()
                    val synonyms = c.getString(1).split(',').map { it.trim() }.filter { it.isNotEmpty() && !it.equals(base.replace('_', ' '), true) }
                    list += Sense(definition.ifEmpty { gloss }, examples, synonyms.take(5))
                }
            }
        }
        if (byPos.isEmpty()) return null
        val meanings = POS_NAMES.mapNotNull { (pos, name) -> byPos[pos]?.let { Meaning(name, it) } }
        return DictionaryEntry((found ?: word).replace('_', ' '), null, meanings, "WordNet 3.1 · Princeton University")
    }
}

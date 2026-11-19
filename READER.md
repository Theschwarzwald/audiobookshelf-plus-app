# E-reader

Books open in the app whether they're downloaded or not (books read from the server are cached, so the
last 25 still open offline). The reading features come from **Grimmory Reader**: its page reader for PDFs
and comics, its e-book bars, its themes and its built-in dictionaries, plus everything this app already
had (synced progress, bookmarks, highlights and notes, read-along with the audiobook).

| Kind | Formats | Opens in |
|---|---|---|
| E-books | EPUB, KEPUB, MOBI, AZW, AZW3, PRC, FB2 | E-book reader (foliate-js, the engine Grimmory uses) |
| Documents | PDF | Page reader (pdf.js). Settings → PDF viewer → Classic switches back to the old viewer |
| Comics | CBZ, CBR (incl. RAR5), CB7, CBT, CBX | Page reader (pages unpacked on the phone as you reach them) |

## Bars (both readers, like Grimmory)

Tap the middle of a page to show or hide them; tap the left or right edge, or swipe, to turn the page.

- **Top:** ☰ sidebar, the title, 🔖 bookmark, then the tools, ⚙ settings and ✕. On phones the less-used
  tools move into ⋮.
  - Page reader: zoom −, **fit-page / fit-width**, zoom +, one page / two pages, rotate, ⇄ right-to-left
    (comics, remembered per comic), ☀ night mode (inverts the page), search (PDFs with text), fullscreen.
  - E-book reader: A− / A+ text size, search, fullscreen.
- **Bottom:** « ‹ **15 of 288** › », a slider with tick marks, **Page + GO** (wide screens, page reader), and
  **Book Viewer** (turn pages) / **Doc Viewer** (one long scrolling column).

## Page reader (PDFs and comics)

- Pinch or double-tap to zoom, drag to move around while zoomed; pages are redrawn sharp at the new size.
- Two-page spreads start automatically on wide landscape screens; comics keep the cover on its own.
- **Sidebar:** page thumbnails, the PDF's contents (outline), bookmarks, highlights.
- **PDFs with text:** press and hold to select → dictionary, highlight (4 colours or underline), note,
  copy, search; search the whole PDF; read along with the audiobook (line or word, pages turn with the
  narration) and **Listen** from any selected text. Scanned PDFs without a text layer just show pages.
- Comic pages ahead are prepared in advance so turning is instant.
- E-ink themes turn off animations; the black-and-white ones show pages in greyscale.

## E-book reader

Everything from before: pages or scrolling, themes, fonts, size, spacing, margins, justification,
hyphenation, contents (or chapters found in the text when a book has none), the "minutes left in
chapter" line, the back button after jumps, bookmarks, highlights and notes, search, dictionary,
read-along.

## Page turn animation (from Grimmory Reader 13)

In ⚙ for both readers:

- **Page turn animation:** **Page curl** (the default, like Apple Books: the page peels back from its edge,
  showing the back of the paper with shading along the fold, and casts a shadow on the page underneath),
  **Slide**, **Fade** or **None**. Edge taps, the ‹ › buttons, volume/arrow keys and (in the page reader)
  swipes animate; e-book swipes keep the engine's own slide. Turning back uncurls the previous page.
- **Turn direction:** **Follow the book** (to the left, or to the right in right-to-left books and manga),
  **To the left** or **To the right**. Edge taps, swipes and the curl all follow it.
- Off by itself on e-ink, in battery saver / low power, and in scrolling mode.

How: the app snapshots the page natively (AbsPageTurn), lays the snapshot over the reader, turns the real
page underneath, then animates the snapshot away (PageTurnView, ported from Grimmory's PageCurl).

## Notebook (from Grimmory Reader 13)

**Notebook** in the side menu lists every highlight, note and bookmark across your books, on the phone and
offline: search their text, filter by book, switch highlights / notes / bookmarks on or off, newest or
oldest first. Tap one to open the book right there. **Export** shares what's shown as a Markdown file
(notebook-export.md) to any app.

## Themes

Dark, Light, OLED and the four e-ink modes are Grimmory's (Grimmory dark, light, OLED black, E-ink light
and dark, Colour e-ink light and dark); Sepia is kept. Choose in ⚙.

## Dictionary

Press and hold a word. The definition card shows the pronunciation, parts of speech, numbered meanings,
examples and similar words (built-in dictionaries) or the dictionary's own text (StarDict ones). Lookups
try, in order:

1. **Built-in dictionaries** downloaded to the phone (from Grimmory): English (WordNet 3.1), Spanish,
   French, Japanese, Chinese (WikDict) and Arabic (FreeDict), each explained in English. The right one is
   picked from the word itself (Arabic script, kana, Chinese characters) and the book's language. If none
   is installed, the card offers to download it (2–22 MB, then offline).
2. StarDict dictionaries downloaded from your server.
3. Your server's dictionaries (and Wiktionary through the server, if it allows that).
4. **Online on the phone** (Free Dictionary API, Wiktionary), if you turn that on in ⚙ → Dictionaries.

## Sync and offline

- **Reading position** goes to Audiobookshelf's own ebook progress (CFI for e-books, page numbers for
  PDFs and comics, like the web reader). Saves made offline are sent when you reconnect; on opening, the
  newest position wins.
- **Bookmarks, highlights and notes** are saved on the phone first and synced through the server's
  transcription add-on, per user (offline changes are marked and sent later).

## How it's built

- `static/reader/index.html` + `reader.js`: e-books with foliate-js. `static/reader/pages.html` +
  `pages.js`: the page reader (pdf.js, its own text layer, zoom, spreads, Doc Viewer, highlights,
  search, read-along). `readalong.js`: lining narration up with the text.
- `scripts/fetch-foliate.sh` (run by `npm run generate`) vendors foliate-js (pinned by date or commit)
  and pdf.js's legacy build (pinned by `PDFJS_VERSION`) into `static/reader/`.
- `components/readers/`: `FoliateReader.vue`, `PageReader.vue`, shared `ReaderBars.vue` (Grimmory's bars),
  `SelectionSheet.vue` (dictionary card and selection actions), `AnnotationEditor.vue`,
  `DictionaryManager.vue`, `readerThemes.js`, `readerCommon.js` (loading, cache, progress, read-along).
- `android/.../dictionary/BuiltInDictionary.kt`: Grimmory's dictionary downloads and lookups, ported;
  `StarDict.kt` for server dictionaries; both behind the `AbsDictionary` plugin.

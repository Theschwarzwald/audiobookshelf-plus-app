# Transcription (on-device speech-to-text)

This fork adds a **Transcription** view to the Android player, similar to Spotify's lyrics:

- Every line starts with a timestamp, e.g. `1:02:37  The clocks were striking thirteen.`
- The line being spoken is highlighted and scrolls into view as the book plays.
- A **search bar** at the top filters the transcript to matching lines, with the words highlighted.
- **Tap any line** and playback jumps to that spot.
- Transcription runs **entirely on the phone**. Nothing is sent to a cloud service.

Open it with the **Transcribe** button under Play on the book page, or from the full-screen player with the **Transcription** button (between the sleep timer and chapters),
or from the ⋮ menu → **Transcription**.

While it works, a **Transcription card** sits under the artwork in the full-screen player and shows
the line being spoken. Tap it to open the full view.

Transcription starts at the point you're listening to (backing up 30 seconds), runs to the end of the
book, then goes back and does the beginning. That way the part you're hearing is ready first. You can
use the transcript while it's still running. If you're at a part that isn't done yet, the view tells you.

- **Pause** stops and keeps what's done. **Resume** continues from there.
- **Cancel** stops and deletes the partial transcript. It's also available from the notification.

## Read along

Next to Lyrics and Karaoke, **Read along** (books that have an ebook) opens the book itself at the part being
narrated, with every word highlighted as it's read and pages turning with the narration. It uses the
transcript's own word times (the same as `<audio>_karaoke.lrc` on the server) and follows the voice every
frame, a touch early so your eye lands on the word as it's said. **Tap any word** in the book to start the
audiobook from there. Words split by styling (drop caps) count as one, so the highlight stays on the right word.

## Reading a transcript from the book page

The book page has a **Transcript** button next to Play and Read once a book is (being) transcribed. It opens
the transcript for reading and searching without touching what's playing. Tap a line and that part opens as
continuous text; tap text to mark it; **Play from here** starts listening at the marked part.

## Two ways to read along: Lyrics and Karaoke

The switch under the Transcription title picks the view (remembered for next time):

- **Lyrics**: the original view, timestamped lines like song lyrics on Spotify. Tap a line to jump there.
- **Karaoke**: the book as ordinary paragraphs. The paragraph being read gets a tinted background and
  an accent bar, and each word is outlined as it's said. Tap any word to play from it. **Aa** changes
  the text size.

When the book's ebook is in Audiobookshelf, karaoke shows **the ebook's own text** (its paragraphs,
headings, punctuation and spelling, so names and unusual words are right) and times every word to the
narration by matching the two texts. The ebook text is saved when the spelling check runs (on the
server or the phone) and syncs with the transcript. Without an ebook, or if it doesn't match the
narration, the transcript is shown as paragraphs instead (split at pauses and every few sentences).
Text the narrator doesn't read (front matter, not yet transcribed parts) is shown dimmed and isn't
highlighted. The web player's Transcription view has the same switch.

## Spelling check against the ebook

When a transcription finishes, the app looks for an ebook of the book. It checks the downloaded copy
first, then the main ebook and any other ebook files in the book's folder on your Audiobookshelf
server. If it finds one, it
compares the two and lists words the speech model probably got wrong: character and place names,
there/their, "night time" vs "nighttime", and so on.

The audiobook and the ebook rarely match word for word (opening credits, narrator changes,
abridgement), so the comparison is deliberately conservative:

1. **Anchor the text.** The whole transcript is compared with the whole ebook in one pass, without
   lining up chapters first. 4-word phrases that occur exactly once in both are anchors, and the
   longest chain of anchors in the same order lines the two texts up. Credits, ad-libs and front
   matter simply don't get anchors.
2. **Compare word by word.** Only the short stretches between anchors (up to 40 words) are compared.
   A word is flagged only if it looks or sounds like the ebook's word and the words on both sides
   match. Reworded sentences and long differences are skipped.

This takes under a second for a typical book (about 150,000 words) and needs very little memory.

Every suggestion carries the warning *"Discrepancy may be caused by narrator ad-libs or edits between
book and audiobook."* It appears on the summary card, on each item in Review, in the Apply all
confirmation, and when you tap an underlined word.

Nothing changes until you choose. The Transcription view shows "N possible spelling errors found",
and suspect words get a wavy underline. **Review** groups the suggestions ("Zalenka → Zelenka, 7×")
with the ebook sentence for context, so you can **Apply** or **Ignore** them one at a time or all at
once. The transcript from before any change is kept on the phone (`lines.original.jsonl`). You can also
run the check by hand from the ⋮ menu → **Check spelling against ebook**.

### Supported ebook formats

The format is recognised from the file's contents, not just its extension. If a book has several
ebooks, the one with the best chapter structure is used first. If that one can't be read (for example
it has DRM), the next one is tried.

| Format | Extensions | Notes |
| --- | --- | --- |
| EPUB | `.epub` | Chapters and titles from the table of contents |
| Apple Books | `.ibooks` | EPUB-based, read the same way |
| Kindle (KF8) | `.azw3` | Split into chapters at headings and page breaks |
| Kindle / Mobipocket | `.mobi`, `.azw`, `.prc` | PalmDOC and HUFF/CDIC compression |
| Kindle KFX | `.kfx`, `.kfb`, `.kfx-zip` | Text in reading order (sections → storylines → content) |
| DjVu | `.djvu`, `.djv`, `.jvu` | Only scans that have an OCR text layer, grouped into roughly chapter-sized chunks |

**DRM:** Kindle books bought from Amazon are usually DRM-protected. Their text can't be read, and the
app says so instead of removing the DRM. DRM-free files (your own, Calibre conversions, publishers'
DRM-free books) work. PDF and comics (CBZ/CBR) aren't used for the check.

Credits: the MOBI HUFF/CDIC and DjVu BZZ decoders are ported from calibre (GPLv3; BZZ originally from
DjVuLibre, GPLv2+). The KFX container layout follows John Howell's KFX Input plugin (GPLv3).

## Server transcription and sync

Books are transcribed on your Audiobookshelf server (the abs-transcription add-on): it's much faster and
doesn't touch the phone's battery. The server picks the best model for each book automatically, from the
book's language and the server's hardware (see `abs-transcription/README.md`).

**Transcribing on the phone** is only offered when the server can't do it: when you're offline (or the
server has no transcription add-on) and open Transcription for a book that isn't transcribed, the app
asks **"It appears you are offline, would you like to transcribe here?"**

- **Yes** explains that it's slow (a 10-hour book can take several hours) and uses a lot of battery,
  then shows the phone's speech models.
- **No** just closes the question.
- **Never** stops asking. Transcribing on the phone stays available from the **⋮ menu** in
  Transcription ("Transcribe on this phone…"), and the choice can be changed any time in the ⋮ menu
  ("When offline: …") or **Settings → Transcription → When offline**.

A transcript made on the phone is synced both ways with the server once you're back online:

- the phone sends its transcript when a job finishes, pauses or stops, after the ebook check, and after
  you apply or ignore spelling fixes; while it's running it checks in every 10 minutes, so the web
  player shows progress and nobody starts the same book on the server meanwhile
- changes made elsewhere (spelling fixes in the web player, a re-transcription, a delete) come back
  when you open the book or the app reconnects
- if both sides changed, the more complete copy wins; the phone keeps its own lines as
  `lines.conflict.jsonl` when the server's copy wins
- deleting a transcript on the phone deletes it on the server too

A transcript finished on the server is copied to the phone when you open it, so it works offline after
that. Servers without the add-on are detected and ignored.

Sync code: `transcription/TranscriptSync.kt` (native, runs from the background service too) and
`plugins/transcriber.js` (picks phone or server for each book; same API as `AbsTranscriber`).

## Bookmark button

One **Bookmark** button (it replaces the old bookmark icon and works like Audible's Clip) sits in the
full-screen player's top bar and in the Transcription view's controls:

- **Tap**: bookmarks the exact second you tapped, with the transcript line being spoken as its text.
- **Hold**: saves the section from when you press to when you let go (the button turns red and counts
  up), snapped to the transcript lines it covers. Holding while paused saves the last 30 seconds.
- **Notes**: tap the "saved" message, or the note icon in the list, to write a note about any bookmark or
  section.
- **Offline**: everything works without a connection. Changes are kept on the phone (marked "not synced")
  and sent to the server when it's reachable again. Books that exist only on the phone keep their
  bookmarks on the phone.

The list (More menu → Bookmarks, or *Bookmarks* in the Transcription menu) shows the timestamp, or a
section's range and length, beside the quote and its note. Lines with a bookmark or inside a section
are marked in the transcript.

They're ordinary Audiobookshelf bookmarks, so they reach every device and the web player. A section
with a note is stored as `“quote” ✎ note [clip 1:02:03–1:02:41]`, which stays readable elsewhere.
Code: `store/bookmarks.js` (offline list and sync queue), `plugins/bookmarks.js` (quotes and format),
`components/app/BookmarkButton.vue`.

## Models

You pick a model the first time you transcribe a book. It downloads once from the sherpa-onnx GitHub
releases and then works offline.

| Model | Languages | Notes |
| --- | --- | --- |
| **Moonshine Base** (default) | English | Fastest and built for phones. A good default. |
| **Parakeet TDT 0.6B v2** | English | Most accurate, with punctuation and real word timestamps. Needs a recent phone. About 600 MB. |
| **Parakeet TDT 0.6B v3** | 25 European languages | Like v2, multilingual |
| **Whisper Base** | 99 languages | OpenAI Whisper, language detected automatically |
| **Whisper Small** | 99 languages | Better Whisper, slow on most phones |

Why not plain whisper.cpp? On phones, Moonshine and Parakeet are faster than Whisper at the same or
better English accuracy. sherpa-onnx runs all of them, Whisper included, behind one API, so you can
switch models without changing any code.

Expect a 10-hour book to take somewhere between under an hour and several hours. It depends on the
phone and the model, and the view shows the speed (for example "6.2× real time") and the time left.
Keep the phone plugged in. On Android 15+, the system limits this kind of background job to about
6 hours a day. When that limit hits, the job pauses and you can tap **Resume**.

### If the phone can't reach github.com

Model downloads first use the phone's normal DNS. If that fails (for example "Unable to resolve host
github.com" because of Private DNS, Pi-hole/AdGuard, a VPN or router DNS), the app looks the address up
through Cloudflare or Google DNS-over-HTTPS instead. The voice-detection model (Silero VAD) is now
bundled in the APK.

If the phone has no internet access at all, open Transcription, select a model, tap
**Copy download link**, download that `.tar.bz2` on any computer, copy it to the phone, then tap
**Import model file** and pick it. You don't need to unpack it first.

## Building the APK

The build downloads the sherpa-onnx native libraries automatically (Gradle task `downloadSherpaOnnx`).

**Easiest: GitHub Actions**

1. Push this code to your fork on GitHub.
2. Open **Actions** → **Build APK** (it also runs on every push, or use **Run workflow**).
3. When it finishes, download the `audiobookshelf-apk` artifact, unzip it, and install the `.apk` on your phone.

**Locally (Android Studio)**

```bash
npm ci
npm run generate
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

The debug build installs as `com.audiobookshelf.app.debug`, so it sits **next to** the official app
instead of replacing it. You'll need to sign in to your server again in it.

## Files changed / added

- `android/app/src/main/java/com/audiobookshelf/app/transcription/` (new): engine, models, decoder, store, service, ebook check, server sync (`TranscriptSync.kt`)
- `android/app/src/main/java/com/audiobookshelf/app/plugins/AbsTranscriber.kt` (new): Capacitor bridge
- `android/app/src/main/java/com/k2fsa/sherpa/onnx/`: sherpa-onnx Kotlin API, copied from tag v2.0.1
- `components/app/TranscriptionPanel.vue` (new): the Transcription view; `EbookCheckSheet.vue`, `TranscriptionPreview.vue` (new)
- `mixins/transcriptLines.js` (new): shared line loading; `plugins/transcriber.js` (new): phone/server routing
- `pages/item/_id/index.vue`: Transcribe button; `layouts/default.vue`: background sync after connecting
- `components/app/AudioPlayer.vue`: button, menu item, back-button handling
- `plugins/capacitor/AbsTranscriber.js`, `plugins/capacitor/index.js`: JS plugin registration
- `android/app/build.gradle`, `AndroidManifest.xml`, `MainActivity.kt`: dependency, native libs, service, plugin registration

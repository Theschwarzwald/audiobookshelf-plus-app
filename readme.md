# ABS+ (Audiobookshelf Plus)

ABS+ adds read-along to [Audiobookshelf](https://github.com/advplyr/audiobookshelf), the self-hosted audiobook and podcast server. This repository is the **ABS+ app** for Android and iOS, a fork of the [Audiobookshelf app](https://github.com/advplyr/audiobookshelf-app). The optional server add-on, which runs beside an unmodified Audiobookshelf container, is in its own repository: [audiobookshelf-plus-server](https://github.com/Theschwarzwald/audiobookshelf-plus-server).

**[⬇ Download the newest ABS+ app for Android (APK)](https://github.com/Theschwarzwald/audiobookshelf-plus-app/releases/latest/download/ABS-Plus.apk)** · [All releases](https://github.com/Theschwarzwald/audiobookshelf-plus-app/releases)

> ABS+ is an independent, unofficial project. It is not made or supported by the Audiobookshelf team, so please don't send ABS+ issues to them.

### About this project

ABS+ was made by someone with only minimal programming knowledge. It was **vibe coded**: written with an AI coding assistant, guided by research into speech transcription methods and a lot of hands-on testing. It was built to fix one personal frustration, how hard it is to find your way around an audiobook, and grew from there.

- **Tested:** the Android app, on an Android phone and a colour e-ink tablet, and the server and web player on a home Docker/Portainer setup.
- **Not tested:** the iOS app. Its ABS+ features are written and compile (GitHub builds it on every change), but it has never been run on an iPhone or iPad.
- **Maintenance:** the creator doesn't expect to have time to maintain ABS+ regularly. Issues and pull requests may go unanswered for a long time. Forks are welcome.
- **The hope:** that some of these ideas, such as read-along, word-timed transcripts and e-ink support, find their way back into the main [Audiobookshelf](https://github.com/advplyr/audiobookshelf) project, where they can be looked after properly.

**Contents:** [How it works](#how-it-works-and-whats-different) · [No server needed](#you-dont-need-the-abs-server) · [Who can do what](#who-can-do-what) · [Features](#features-at-a-glance) · [Lyric files](#the-lyric-files) · [Install](#install) · [E-ink readers](#e-ink-readers-black-and-white-and-colour) · [Speech models](#why-these-speech-models) · [Android and iOS](#the-android-and-ios-apps) · [Building from source](#building-from-source)

## How it works and what's different

ABS+ is the Audiobookshelf app with a read-along layer added. A regular audiobook app plays sound and shows the cover. ABS+ also turns the narration into text with a time for every word. You can read along while you listen, search what was said, jump to any sentence and see the book's own text highlighted as it's narrated.

### The two halves

```
ABS+ app (Android / iOS) ──► ABS+ server :13378 ──► Audiobookshelf (official, unchanged)
   on-device transcription      server transcription (GPU/CPU), sync,
   player, readers, sync        web read-along, parental controls, updates
```

- **The app** works with any Audiobookshelf server. Against a plain server, the ABS+ extras that need the server simply stay off (the app detects the server is missing them).
- **The ABS+ server** ([audiobookshelf-plus-server](https://github.com/Theschwarzwald/audiobookshelf-plus-server)) is **not a modified Audiobookshelf server**. It's a separate, small program in its own container. The stack runs it next to the **official Audiobookshelf image, pulled unchanged** from the Audiobookshelf project. ABS+ sits in front of it on the same port, passes every request through untouched, and adds its own `/api/transcription/*` routes and the web-player add-on. In the browser, the add-on is one extra script added to the pages as they pass through. No Audiobookshelf file is changed, so Audiobookshelf can be updated as usual.

### You don't need the ABS+ server

The ABS+ app works with an ordinary Audiobookshelf server, so you can try read-along without installing anything on the server. Connect the app to your existing server, open a book, and choose **Transcription → ⋮ → Transcribe on this phone…**. The phone makes the transcript itself, and Lyrics, Karaoke, Read along, search and quote bookmarks all work from it.

Without the ABS+ server, transcripts stay on the phone that made them. Server transcription (faster, and done once for everyone), sharing transcripts with the web player and other devices, parental controls and Dewey browsing need the ABS+ server.

### Who can do what

A transcript is shared by everyone who can open the book, so only admins can change or remove one:

| | Admins | Other users |
|---|:---:|:---:|
| Read along, search, bookmarks, stats | ✅ | ✅ |
| Start, pause and resume a server transcription | ✅ | ✅ (unless `TRANSCRIBE_ADMIN_ONLY=true`) |
| Transcribe on their own phone | ✅ | ✅ |
| Send a phone transcript to the server | ✅ | ❌ It stays on that phone |
| Cancel, delete or re-transcribe a transcript | ✅ | ❌ |
| Spelling fixes, book analysis, ebook check | ✅ | ❌ |
| Admin settings, edit book details | ✅ | ❌ |

These buttons are hidden for other users, and the server refuses the requests even if they're sent another way. Before another user starts transcribing on their phone, the app warns that the transcript will stay on that phone and won't appear in the web player or on their other devices. Editing and deleting books themselves follows each user's Audiobookshelf permissions (**Can update**, **Can delete**), which only admins can change.

### How a book becomes read-along

1. **Transcribe.** Speech is turned into timed text, either:
   - **on the phone**: audio decoded to 16 kHz mono, then speech detection (Silero VAD), then an offline model (Parakeet TDT v2/v3, Whisper Base/Small, Moonshine). It works fully offline;
   - **or on the server**: Parakeet or Whisper on the GPU, falling back to the CPU. New books are picked up automatically.

   Transcription starts where you're listening, so lines appear while it works.
2. **Word times.** Every word gets its own start time. They're saved as two lyric files, `.lrc` (lines) and `_karaoke.lrc` (every word), in the same folder as the audiobook file (see *The lyric files* below).
3. **Book analysis.** If the book has an ebook (EPUB, MOBI/AZW3, KFX, PDF, DjVu with text), the transcript is compared with it:
   - spelling and names are fixed from the real text;
   - the narration is aligned to the ebook's pages.

   **Book analysis** in the transcription menu (and in Admin settings › Transcription) re-runs this alignment and check without transcribing again.
4. **Sync.** Phone and server transcripts sync both ways, with revision numbers. A book transcribed on one phone shows up in the web player and on your other devices. Fixes made anywhere flow back.

### Features at a glance

✅ yes · ⚠️ partly · ❌ no · ➖ not applicable

| Feature | Audiobookshelf app | ABS+ Android | ABS+ iOS (compiles, untested) | ABS+ web player |
|---|:---:|:---:|:---:|:---:|
| Play, download, offline listening | ✅ | ✅ | ✅ | ⚠️ play only |
| Read-along card in the player | ❌ | ✅ | ✅ | ❌ |
| Lyrics and Karaoke views | ❌ | ✅ | ✅ | ✅ |
| Search what was said, tap to play | ❌ | ✅ | ✅ | ✅ |
| Read along in the ebook | ❌ | ✅ | ✅ | ✅ |
| Server transcription | ❌ | ✅ | ✅ | ✅ |
| On-device transcription | ❌ | ✅ | ⚠️ while the app is open | ➖ |
| Bookmarks with the quote and notes | ❌ | ✅ | ✅ | ✅ |
| Notebook (all highlights, notes, bookmarks) | ❌ | ✅ | ✅ | ❌ |
| Dictionary lookups | ❌ | ✅ online + offline | ⚠️ online + iOS dictionary | ✅ online |
| E-ink modes (black-and-white and colour) | ❌ | ✅ | ➖ | ⚠️ basic |
| Parental controls | ❌ | ✅ | ✅ | ✅ |
| Screen lock | ❌ | ✅ | ⚠️ with Guided Access | ❌ |
| Lock-screen view of the line being read | ❌ | ✅ | ✅ Live Activity (iOS 16.1+) | ➖ |
| Dewey Decimal browsing | ❌ | ✅ | ✅ | ✅ |
| Stats and reading history | ⚠️ totals | ✅ | ✅ | ✅ |
| Based on Your Recent Readings | ❌ | ✅ | ✅ | ✅ |
| Updates (from your ABS+ server or GitHub) | ❌ | ✅ | ⚠️ tells you, links to GitHub | ➖ |

The iOS column is what the iOS code is written to do. It compiles, but the iOS app has never been run, so none of it is confirmed yet. For why some features are missing on iOS, see [Why some features aren't on iOS](#why-some-features-arent-on-ios). Features that need an ABS+ server (server transcription, parental controls, Dewey, sync) switch off against a plain Audiobookshelf server.

**What the main features do**

- **Read-along card:** the spoken word sits in the centre of the player and is highlighted as it's heard, with the sentences before and after.
- **Three read modes (Lyrics, Karaoke, Read along):** three ways to follow the narration as text, explained in *The three read modes* below.
- **Search what was said:** find any passage by its words instead of scrubbing, then tap a line to play from there.
- **Bookmarks with the quote:** tap for the moment, hold to save a whole section, and add notes. The Notebook collects every highlight, note and bookmark.
- **Dictionary:** long-press a word. Lookups use offline StarDict dictionaries, the server's dictionaries, then Wiktionary.
- **Screens:** e-ink (below), OLED/HDR true black, phones, tablets and landscape, colour-vision options, and power saving that slows animations on low battery.
- **Parental controls:** age tags on every book, per-person age limits and per-book blocks, enforced by Audiobookshelf itself.
- **Browsing:** a Dewey Decimal tab, plus richer metadata, covers and author bios from several sources.

### The three read modes

Tap **Transcription** in the player to open the book's text. A switcher at the top changes between three views of the same narration. All three follow the voice as it plays, all three can be searched, and tapping text jumps the audio to that spot.

| | **Lyrics** | **Karaoke** | **Read along** |
|---|---|---|---|
| **What you see** | The transcript as short lines, each with its time, like song lyrics | The book as ordinary paragraphs, like a page of text | The ebook itself, with its own layout, chapters and pages |
| **What's highlighted** | The line being spoken. Lines already heard are dimmed | The word being spoken, inside its paragraph | The word being spoken, in the book's own text |
| **How it moves** | Scrolls a line at a time, keeping the current line in view | Keeps the current paragraph near the top and the word on screen. On phones the highlight slides from word to word | Turns pages (or scrolls) with the narration |
| **Tap to** | Play from that line | Play from that word | Play from that word |
| **Needs** | A transcript | A transcript | A transcript and the book's ebook (EPUB) on the same item |
| **Comes from** | `.lrc` (line times) | `_karaoke.lrc` (word times) | `_karaoke.lrc` word times matched to the ebook's words |
| **Best for** | Skimming, finding a passage, seeing where you are at a glance | Reading along closely without an ebook | Reading the real book while you listen |

**Lyrics** is the simplest view and the quickest to scan. Each line shows its time on the left, so it doubles as a table of contents for what was said. Searching in Lyrics lists every matching line (in Karaoke, every matching paragraph), and tapping one plays from there.

**Karaoke** shows the narration as continuous paragraphs, so it reads like a book rather than a list. The spoken word is marked as it's heard (on e-ink, three words are boxed at once, see *E-ink readers*). If the book has an ebook and the ebook check has run, Karaoke uses the **ebook's own paragraphs, spelling and punctuation**, with each ebook word given the time of the matching spoken word. Without an ebook it groups the transcript into paragraphs at pauses. Parts the narration doesn't cover, such as front matter, are shown but not highlighted.

**Read along** opens the ebook inside the Transcription panel and highlights the narrated word in it, turning pages as the narrator goes. It only appears for books that have an ebook. EPUBs open in the panel; PDF, MOBI and other formats open in the full reader in Read along. Where the narration leaves the text (an introduction the narrator added, or a different edition), a small note says so, and the highlight picks up again where the two match. Read along keeps following in the background while you're in Lyrics or Karaoke, so switching back is instant.

You can also open any of the three from the book's page without playing, to read the transcript on its own. Tap a passage and **Play from here** starts listening at that spot.

### Stats and reading history

The **Stats** page (side menu in the app, **Your Stats** in the web player) shows your listening history. It works online and on the device:

- **Day / Week / Month / Year** tabs, going back as far as your history goes.
- Time listened, compared with the period before, with bars showing when you listened.
- Books, books finished, days listened and your current streak. Also the average per listening day, the time of day you usually listen, your top author, your longest session and your best streak.
- Each book you listened to in the period, with dates and its share of your time.
- **Books you should pick up again**: books you started and didn't finish, with how far you got and when you last listened.

### Based on Your Recent Readings

This home-page shelf, after Continue Listening, suggests books from your own library. It weighs your last 60 days of listening (recent and longer listening count more) and scores each unstarted book by what it shares with them: the next book in a series, the same series, author or narrator, the same Dewey section (on ABS+ servers), shared genres and tags, and language. It shows at most three picks for the same reason, so one series or author doesn't fill it.

### Screen lock

The screen lock pins the player so that taps, Back and Home do nothing until it's unlocked. This is useful for children, or for reading along in a pocket or bag.

- In the Transcription view, the **lock button** sits where the Read button is while the book plays. When paused, the Read button takes its place.
- While locked, only "Transcription", the book title and the text stay on screen. The search bar, the mode switcher, the spelling card and the menu are hidden.
- Unlock with face or fingerprint, or with an ABS+ PIN. On devices with no face or fingerprint sensor (most e-ink readers), that option is greyed out in **Settings → Screen lock** and the PIN is used.

### First start and the guided tour

On first start, the app asks how it should look (Automatic, dark, black/OLED, light or e-ink) and about colour vision, then shows a short tutorial. Its last page offers **Show me around**: a guided tour that points out the real buttons on each screen the first time you reach it (home, book page, player, Transcription, readers). After 30 days away, the app offers a refresher. The tutorial can be reopened from Settings at any time.

### E-ink readers (black-and-white and colour)

ABS+ is meant to be used on e-ink readers as well as phones. An e-ink tablet is a comfortable way to read along for hours, and the transcript files make it practical (see *Transcribe once, play anywhere*). It was tuned on a colour e-ink tablet.

E-ink panels behave very differently from phone screens, and most of the e-ink changes follow from three facts:

- **They redraw slowly.** The panel refreshes at most about 38 times a second. Anything that moves smoothly on a phone (sliding text, fades) turns into a jittery, smeared trail and costs battery.
- **Partial redraws leave ghosts.** Faint traces of what was there before stay behind, and greys and gradients make it worse.
- **Colour is limited.** Black-and-white panels show only greys. Colour panels (Kaleido / Gallery) put a colour filter over a grey panel, so colours come out paler and coarser, and gradients turn into dots and bands.

The app recognises e-ink readers by maker and model, and picks black-and-white or colour. You can change it under **Settings → E-ink** (Auto, Off, Black & white, Colour).

**On both kinds of e-ink**

| What changes | Why |
|---|---|
| Paper-white pages, black text | Highest contrast, and it doesn't ghost |
| No animations, fades, shadows, blur or see-through layers | Each frame of an animation is a slow redraw that smears. Shadows and blur become grey smudges |
| Outlines and solid rules instead of shading, for example boxes around the home shelves and a line under the tabs | On a white screen, lines separate parts of the page without the greys that ghost |
| No cover-tinted backgrounds, and no blurred copy of the cover behind it on the book page | Gradients turn into bands and a large grey smudge |
| **The read-along card and Karaoke step word by word**, with **three words boxed at a time** and the spoken word underlined and kept in the centre | Smooth sliding at 38 Hz looked choppy. Stepping once per word, exactly when it starts, means one clean redraw per word. A three-word block reads as a phrase, so the eye isn't chasing a single jumping word |
| In **Lyrics**, the line being spoken gets the same outlined box as Karaoke and Read along (phones keep the plain highlight) | One consistent marker across the three views, drawn with lines rather than shading |
| The Transcription header in Lyrics, Karaoke and Read along (including the full reader's Read along) has an outlined mode switcher and search bar, with a rule underneath | Separates the controls from the text without grey fills |
| The player and transcript follow the voice less often | Fewer redraws: less flashing, less battery |
| The screen lock uses the ABS+ PIN | Most e-ink readers have no face or fingerprint sensor, so that option is greyed out on them |

**Black and white only**

| What changes | Why |
|---|---|
| **Everything is drawn in greys**: buttons, icons, progress bars, highlights, toasts, and pictures inside books | Colour on a black-and-white panel can only be faked with dots, which look grainy. Real greys are clean |
| Coloured buttons (Stream / Play, Read, warnings) become solid black with white text, and the selected choice in a row of options is black with white bold text | Fixed colours such as green and blue came out as grey dots. A selected option had been black text on black, which looked blacked out |
| Progress bars, the loading dots and other markers are solid black | A pale yellow or green bar would turn into a faint, nearly invisible grey |
| **Covers use a colour-aware grey** (warm colours lighter, cool colours darker), with extra contrast | Plain greyscale keeps only brightness, so an orange ship and a blue sky, which are about equally bright, became the same grey and the picture went flat. Compared with plain greyscale and the TV formula, this keeps covers closest to how they look in colour |
| A line along the bottom of the cover on the book page | It gives white or pale covers an edge against the white page, and gives the progress bar under the cover a track to sit on |
| Highlights are black and grey: the three-word box has a black edge and a light grey tint, the box is taller than the text, and the word being said is underlined | Orange came out as grey dots. The taller box keeps the underline clear of the box's bottom edge, so it stays easy to see |
| Highlights you make in the ebook (yellow, green, blue, pink) become four greys, light to dark, with a black underline | They stay distinguishable without colour |

**Colour only**

| What changes | Why |
|---|---|
| Covers are made richer and slightly brighter | The colour filter layer washes colours out. The boost brings them back to roughly how they look on a phone |
| The play, lock and read buttons (in the player, the Transcription view and the full reader) are filled with the book cover's colour, with a black outline, and a light band of the cover colour sits behind the Transcription header | Solid fills print cleanly on colour e-ink (gradients don't). The colour ties the controls to the book playing and makes the main buttons easy to spot on a mostly white screen |
| The reading highlight is Karaoke's orange as a thin outline and underline, with no fill. Karaoke's current paragraph keeps its orange side bar without a tinted background | Thin colour lines look clean on a colour panel; colour fills come out as a grainy dot pattern |
| Cards (spelling, progress, text size) are white with a thin black outline instead of grey | Large tinted areas turn into dots. White with rules looks like a printed page |
| Book text in Karaoke and Read along is set like print: slightly heavier, justified and hyphenated, with wider margins | Thin strokes come out grey on e-ink. A heavier, justified page reads more like ink on paper |

### Transcribe once, play anywhere

Turning speech into text is heavy work: a speech model has to listen to every second of a 10-hour book. Following along afterwards is not. Every finished transcript is saved as ordinary lyric files (`.lrc` and `_karaoke.lrc`), which are just timed text: "this word at 1:02:37.42".

So the expensive part happens **once**, wherever the power is (the server's GPU, or a phone left on its charger), and from then on any device can read along: an old phone, a budget tablet, an e-ink reader, the web player in any browser. Playing a transcript costs about as much as showing song lyrics. The device only looks up which word belongs to the current second, and needs no speech model, no GPU and no large download.

The same files work in other lyric-capable players, and they're plain text you can open and correct by hand. ABS+ reads your edits back.

### The lyric files

Both files are saved **in the same folder as the audiobook file**, one pair for each audio file, named after it and timed from the start of that file:

```
Audiobooks/Author/Book Title/
├── Book Title.m4b
├── Book Title.lrc            ← one timed line per sentence or phrase
└── Book Title_karaoke.lrc    ← every word with its own time
```

- **`.lrc`** is a standard lyrics file: one line of text per timestamp, for example `[01:02:37.42]It was a dark and stormy night.` Any player that shows lyrics can use it.
- **`_karaoke.lrc`** keeps track of **every word's placement down to the millisecond**. Each word carries its own start time, so the app can highlight the exact word being spoken and jump to it when tapped. The times are written to the microsecond. How close they are to the voice depends on the speech engine, usually within a few hundredths of a second.

Because they sit next to the audio, the transcript travels with the book: back it up, move the library, or open the folder in another player, and the read-along comes too. ABS+ only replaces or deletes lyric files it wrote itself.

### Why these speech models

ABS+ ships several models because no single one is best everywhere. The choice is a trade between accuracy, speed, memory and language.

- **Parakeet TDT (NVIDIA), v2 English and v3 for 25 European languages**: the most accurate open models for these languages. It writes punctuation and capitals, and gives **real per-word timings**, which is what makes Karaoke and Read along land on the right word. It's fast on an ordinary CPU, so it's the default wherever it fits.
- **Whisper (OpenAI), Base to Large v3**: covers **99 languages** and detects the language by itself. It's the fallback for books Parakeet can't handle. The larger sizes need a GPU to be practical.
- **Moonshine Base** (phones only): built for phones. The fastest English option on a phone's processor, with lower accuracy than Parakeet. Good for older or slower phones.
- **Silero VAD**: a tiny voice detector that skips silence and music before the speech model runs, saving time and stopping the model from inventing words in quiet stretches.

All of them run through one engine (sherpa-onnx on the phone; sherpa-onnx or faster-whisper on the server), so a model can be swapped without code changes. On the server, **Automatic** picks a model per book from its language and the hardware. On the phone you choose one the first time.

### The Android and iOS apps

The app is the regular Audiobookshelf app (player, library, downloads, offline listening, Android Auto, casting), with the ABS+ features layered on top. The read-along views, readers and settings are shared web code, so they're the same on both platforms. The parts that need native code differ.

**Android** has everything in this readme, including:

- **On-device transcription** (below)
- e-reader dictionaries downloadable for offline use
- the screen lock, which pins the app so taps, Back and Home do nothing until it's unlocked
- updates delivered from your own server
- a lock-screen view of the line being narrated

**iOS** builds from this same source. Lyrics, Karaoke, Read along, the readers, bookmarks and the Notebook are shared code, so they carry over, and the ABS+ native parts have iOS versions written in Swift (see *iOS status*). The iOS app **compiles** (GitHub's *Build iOS* check builds it, with and without the speech engine and Live Activity, on every change) but has **not been run or tested** on a device yet.

#### On-device transcription (Android)

The phone can transcribe a book by itself, with **nothing sent anywhere**, so it works on a plane, with no server, or for books that live only on the phone.

- **How it runs.** The audio is decoded to 16 kHz mono and passed through the Silero voice detector, then a speech model (Parakeet v2/v3, Whisper Base/Small or Moonshine Base) that runs on the phone's processor through sherpa-onnx.
- **Where it starts.** It starts 30 seconds before where you're listening, runs to the end, then goes back for the beginning. The part you're hearing is ready first, and you can read along while it's still working.
- **Speed.** Depending on the phone and model, a 10-hour book takes from under an hour to several hours. The view shows the speed (for example "6.2× real time") and the time left.
- **Battery.** Keep the phone plugged in. It runs as a background job with a notification. On Android 15 and later the system limits such jobs to about 6 hours a day: when that limit hits, the job pauses and **Resume** carries on from the same point.
- **Control.** Pause keeps what's done. Resume continues. Cancel deletes the partial transcript.
- **Models.** Each one downloads once (from tens of megabytes up to about 600 MB) and then works offline. If the phone can't reach the download site, the app tries other DNS routes. You can also download the file on a computer and use **Import model file**.
- **When it's offered.** If an ABS+ server is reachable, the server transcribes instead: it's faster and spares the battery. The phone offers to transcribe when you're offline or the server has no add-on, and you can always choose it from the Transcription menu.
- **Afterwards.** A finished transcript goes through the same ebook spelling check as on the server, entirely on the phone. For an admin, it syncs to the server when you're back online, so the web player and your other devices get it, and fixes made elsewhere come back. For other users it stays on the phone (see *Who can do what*). With a plain Audiobookshelf server it always stays on the phone.

Details: `TRANSCRIPTION.md`.

#### Why some features aren't on iOS

There are two different reasons a feature is missing on iPhone and iPad. Some can't be done there; the rest just haven't been written yet.

**1. Apple doesn't allow it.** iOS gives apps less control over the phone than Android does. These limits apply to every app, so no amount of work in ABS+ removes them:

| Feature | Apple's rule | What iOS offers instead |
|---|---|---|
| On-device transcription in the background | iOS stops apps from running long, heavy jobs once you leave them. Android lets them run as a background job with a notification | Transcribe while the app is open and plugged in. iOS may also continue overnight while charging, when it chooses to |
| Lock-screen view of the line being read | Apps can't draw on the iOS lock screen | A Live Activity, which shows the current line on the lock screen and in the Dynamic Island |
| Screen lock that blocks Home and Back | Apps can't pin themselves or block the Home gesture | iOS's own Guided Access (Settings → Accessibility) does exactly this |
| Updates from your own server | iOS only installs apps from the App Store, TestFlight or approved alternative stores, so an app can't install its own update | TestFlight or an alternative store. The app can still tell you a new version is out |

**2. Still to be done.** Downloaded (offline) StarDict dictionaries aren't ported to iOS yet, and on-device spelling checks against the ebook run on the ABS+ server instead of the phone. Everything else ABS+ needs natively has an iOS version written in Swift (below), untested until someone builds it on a Mac.

Everything built from shared web code (the player, Lyrics, Karaoke, Read along, search, bookmarks, the Notebook, stats and recommendations) should work on iOS as it does on Android.

#### iOS status, feature by feature

The iOS app has its own versions of the ABS+ native plugins (`ios/App/App/plugins/`), plus a Live Activity and on-device transcription. **All of it compiles, but none of it has been run yet.** Expect fixes once it is tried on a device.

| Feature | Android | iOS (compiles, untested) | How |
|---|---|---|---|
| Transcripts on the phone and two-way sync | Yes | Written | `AbsTranscriber`: the same files and sync rules as Android, so server and Android transcripts are available on the iPhone, offline too |
| On-device transcription | Yes | Written, needs the speech engine added | sherpa-onnx's iOS build with the same models. Runs while ABS+ is open; iOS may continue it while charging and idle. See below |
| Lock-screen view of the line being read | Custom lock-screen view | Written (iOS 16.1+) | A **Live Activity**: the current line on the lock screen and in the Dynamic Island, from the same transcript hand-off Android uses |
| Screen lock | Pins the app | Written | The in-app lock, with Face ID / Touch ID or the ABS+ PIN to unlock. iOS can't pin apps, so ABS+ points you to **Guided Access** (Settings → Accessibility → Guided Access, then triple-click the side button) and detects when it's on |
| Face ID / Touch ID unlock | Yes | Written | LocalAuthentication. Devices without a sensor use the passcode or the ABS+ PIN |
| Device adaptation (battery, heat, refresh rate, memory) | Yes | Written | Low Power Mode, thermal state, battery and memory warnings feed the same power-saving rules. ProMotion 120 Hz is switched on |
| Dictionary | Online + offline | Written: online + iOS dictionary | The server dictionary and Wiktionary as on Android, plus a button for iOS's own dictionary card. Downloaded StarDict dictionaries aren't ported yet |
| Updates | Downloads and installs the new APK | Written: tells you | iOS can't install apps itself. ABS+ can say a new version is out and opens the GitHub releases page |
| Saving edited book details to downloaded books | Yes | Written | An addition to the iOS database plugin |
| Page-turn animations | Off | Off | Not needed: page-turn animations are switched off |

#### On-device transcription on iOS (written, untested)

The iPhone can transcribe a book itself with the same engine and models as Android, once the speech engine has been added to the build (see *Building from source*). Until someone has built and tested it, treat it as experimental. Transcribing on the ABS+ server or an Android phone always works, and the transcript then syncs to the iPhone.

**Warnings**

- **It needs the app open.** iOS doesn't let an app run a long, heavy job in the background. Transcription runs while ABS+ is open on screen. If you switch apps or lock the phone, it saves its place and pauses, then carries on when you come back.
- **Overnight help is up to iOS.** ABS+ asks iOS to continue while the phone is charging and idle, for example overnight. iOS decides when and for how long, so this can't be counted on to finish a book.
- **Battery and heat.** Transcribing works the processor hard. Keep the device plugged in. When iOS reports the device is getting hot, ABS+ pauses until it cools down, as on Android.
- **Memory.** Parakeet, the most accurate model, needs a lot of memory and may not run on iPhones with 4 GB. Whisper Small or Moonshine are lighter.
- **Time.** Expect a 10-hour book to take hours, depending on the device and model.
- **Storage.** Each speech model is a one-time download of up to about 650 MB.
- **Audio formats.** Ogg, Opus and WMA audio can't be decoded on iOS; MP3, M4A/M4B, AAC and FLAC can.

**Instructions**

1. Plug the device in.
2. Open the book, then **Transcription**, then **⋮ → Transcribe on this phone…**, and pick a model. Parakeet is the most accurate for English and European languages; Whisper covers the rest.
3. To keep the screen on while it works, turn on the screen lock. It dims the screen and ignores touches, so the job keeps running.
4. Leave ABS+ open. Progress, speed and time left show in the Transcription view. If you leave, it pauses and resumes when you return.
5. When it finishes, an admin's transcript syncs to the server the next time you're online, as on Android. For other users it stays on the phone.

**Android and iOS compared**

| | Android | iOS |
|---|---|---|
| Runs in the background | Yes, as a background job with a notification. Android 15+ limits it to about 6 h a day | Only while the app is open; iOS may continue it while charging and idle |
| Engine and models | sherpa-onnx: Parakeet, Whisper, Moonshine | The same engine and models (sherpa-onnx's iOS build). Models download file by file |
| Survives switching apps | Yes | Pauses, then resumes when you return |
| Pauses when hot | Yes | Yes |
| Spelling check against the ebook | On the phone | On the ABS+ server |
| Syncs to the server | Yes | Yes |

### Where things live in this code

- `components/app/TranscriptionPreview.vue`: the read-along card in the player.
- `components/app/TranscriptionPanel.vue`, `TranscriptLyricsList.vue`, `TranscriptKaraokeText.vue`, `TranscriptReadAlong.vue`: the Lyrics, Karaoke and Read along views, plus the transcription menu.
- `plugins/transcriber.js` and `android/.../transcription/`: transcription on the phone, ebook comparison and sync.
- `plugins/absplus-shared/`: views shared with the web player.
- `pages/notebook.vue`, `pages/bookshelf/dewey.vue`, `components/app/ScreenLock.vue`, `components/app/UpdateBanner.vue`: Notebook, Dewey, screen lock, update banner.
- Build number: `plugins/absPlusBuild.js`. Android `versionCode` = 1000 + build.

The server side is documented in the [server repository](https://github.com/Theschwarzwald/audiobookshelf-plus-server).

## Install

ABS+ needs a running Audiobookshelf server. The app also works against a plain Audiobookshelf server, with the server-side extras switched off.

### Server (optional)

The ABS+ server runs as a second container next to the **official, unmodified** Audiobookshelf image, on the port your apps use (13378). Everything about installing and running it, including a stack file with placeholders, is in [audiobookshelf-plus-server](https://github.com/Theschwarzwald/audiobookshelf-plus-server).

### Android app

- **From your ABS+ server:** open `http://<your-server>:13378/abs-plus/app/ABS+.apk` on the phone. The server fetches new builds from the server repository's releases by itself, and the app offers each one as an update.
- **From GitHub:** [download the newest APK](https://github.com/Theschwarzwald/audiobookshelf-plus-app/releases/latest/download/ABS-Plus.apk) (the same file is in the [server repository's releases](https://github.com/Theschwarzwald/audiobookshelf-plus-server/releases)).

After that the app keeps itself up to date: it checks your ABS+ server and GitHub, and offers whichever build is newer. That works on a plain Audiobookshelf server too.

Android asks you to allow installs from that source the first time. The app installs alongside the official Audiobookshelf app.

The iOS app hasn't been built yet: build it yourself on a Mac (below). Its ABS+ features are written but untested (see *iOS status* above).

## Building from source

The app is built with [NuxtJS](https://nuxtjs.org/) and [Capacitor](https://capacitorjs.com/), so Android and iOS share one code base. The read-along reader (`readium-reader`) is built separately and copied into the app.

### Requirements

- [Node.js](https://nodejs.org/en/) 20
- [Git](https://git-scm.com/downloads)
- Android: [Android Studio](https://developer.android.com/studio) with the Android SDK
- iOS: a Mac with [Xcode](https://developer.apple.com/xcode/) and [CocoaPods](https://guides.cocoapods.org/using/getting-started.html#installation)

On Windows you can install these with [winget](https://learn.microsoft.com/windows/package-manager/winget/):

```powershell
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS --version 20.11.0
winget install -e --id Google.AndroidStudio
```

On a Mac, with [Homebrew](https://brew.sh/):

```bash
brew install android-studio node cocoapods
```

### Build

The read-along reader and the views shared with the web player are built first, from `readium-reader`. If the [server repository](https://github.com/Theschwarzwald/audiobookshelf-plus-server) is checked out next to this one (or `ABS_PLUS_SERVER_PUBLIC` points at its `build/server/public`), the build also copies them there for the web player:

```bash
cd readium-reader
npm install
npm run build          # the reader, for the app and the web player
npm run build:views    # the shared views, for the web player
cd ..
```

Then the app:

```bash
npm install
npm run generate   # build the web app
npx cap sync       # copy it into the android/ and ios/ projects
npx cap open android   # or: npx cap open ios
```

After changing the JavaScript, rebuild and copy it into the native projects:

```bash
npm run sync
```

Before a release, raise the build number in `plugins/absPlusBuild.js`, `android/app/build.gradle` (`versionCode` = 1000 + build) and `ios/App/App/Info.plist` (`AbsPlusBuild`), so phones see the new build as an update.

### iOS (on a Mac)

The iOS project needs two one-time setup steps on top of the usual `npx cap sync ios`, both run from the repository root. They use scripts in `ios/App/scripts/`; the Ruby ones need the `xcodeproj` gem, which comes with CocoaPods.

1. **The speech engine for on-device transcription** (optional: without it, the app works and syncs transcripts, but can't transcribe on the phone):
   ```bash
   bash ios/App/scripts/fetch-sherpa-onnx.sh
   ruby ios/App/scripts/add-sherpa-onnx.rb
   ```
   The first downloads sherpa-onnx's iOS framework (same version as Android) into `ios/App/Frameworks/`; the second links it into the Xcode project. `ruby ios/App/scripts/add-sherpa-onnx.rb --remove` takes it out again.
2. **The Live Activity** (the line being read on the lock screen, iOS 16.1+):
   ```bash
   ruby ios/App/scripts/add-live-activity-target.rb
   ```
   It adds the widget extension target to the Xcode project.

Then:

```bash
cd ios/App && pod install && cd ../..
npx cap open ios
```

In Xcode, set your signing team for the app and, if you added it, the **AbsPlusLiveActivity** target (Signing & Capabilities), then build. The same steps run on GitHub for every change (`.github/workflows/build-ios.yml`), so the project should compile; running it on a device is still untested. Please share what you find.

## Licence

ABS+ is free and open-source software under the **GNU General Public License v3.0** (GPL-3.0). The full text is in [`LICENSE`](LICENSE). In short:

- **You may** use, study, change and share ABS+, including for commercial use.
- **If you share it**, changed or not, you must make the source code available under the same GPL-3.0 licence, keep the copyright and licence notices, and say what you changed. This keeps ABS+, and anything built from it, open source.
- **No warranty.** ABS+ comes as it is, with no guarantee that it works or is fit for any purpose.

### Based on Audiobookshelf

The ABS+ app is a **modified version** of the [Audiobookshelf app](https://github.com/advplyr/audiobookshelf-app) (version 0.14.2-beta), copyright advplyr and contributors, licensed under GPL-3.0. ABS+ changes to it were made in 2026. They add transcription, read-along, e-ink support, the screen lock, stats, recommendations, onboarding and the other features described here. The ABS+ server is new code that works alongside an unmodified [Audiobookshelf server](https://github.com/advplyr/audiobookshelf); it is released under GPL-3.0 as well, so the whole project carries one licence.

"Audiobookshelf" and its logo belong to their owners. ABS+ uses the name only to say what it works with, and is not endorsed by the Audiobookshelf project.

### Third-party software and models

ABS+ includes or downloads the following. Each keeps its own licence; full notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

| Component | Used for | Licence | Shipped how |
|---|---|---|---|
| [Audiobookshelf app](https://github.com/advplyr/audiobookshelf-app) | Base of the ABS+ app | GPL-3.0 | Source, in the app |
| [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Speech engine (phone and server) | Apache-2.0 | Inside the APK and the server image |
| [ONNX Runtime](https://github.com/microsoft/onnxruntime) | Runs the models on the phone | MIT | Inside the APK |
| [Silero VAD](https://github.com/snakers4/silero-vad) | Skips silence before transcription | MIT | Inside the APK |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Whisper engine on the server | MIT | Installed in the server image |
| [Readium](https://github.com/readium/ts-toolkit) | Ebook reader for Read along | BSD-3-Clause | Bundled in the app and web player |
| [fflate](https://github.com/101arrowz/fflate) | Unzipping ebooks | MIT | Bundled in the app and web player |
| [Docling](https://github.com/docling-project/docling) | Ebook layout analysis on the server | MIT | Installed in the server image |
| NVIDIA Parakeet TDT 0.6B v2 / v3 | Speech model | CC-BY-4.0 | Downloaded when first used |
| OpenAI Whisper / Distil-Whisper | Speech models | MIT | Downloaded when first used |
| Moonshine | Speech model (phones) | MIT | Downloaded when first used |
| Wiktionary, Wikipedia | Dictionary lookups, author bios | CC BY-SA | Fetched online, with credit links |
| Open Library | Catalogue and Dewey numbers | CC0 | Downloaded on request |

Speech models are not part of this repository. They download from their publishers the first time they're used, under the publishers' licences. The optional NVIDIA GPU libraries (CUDA, cuDNN) are installed from NVIDIA when the server image is built, under NVIDIA's own licence, and are not included here.

Translations of the original app come from the Audiobookshelf community on [Weblate](https://hosted.weblate.org/engage/audiobookshelf/).

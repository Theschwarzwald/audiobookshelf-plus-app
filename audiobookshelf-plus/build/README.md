# Audiobookshelf transcription add-on (TrueNAS / Docker)

Adds the app's **Transcription** feature to your Audiobookshelf server:

- **Server transcription** with OpenAI Whisper (faster-whisper). Uses an NVIDIA GPU if the container
  has one, otherwise the CPU. Languages are detected per book (99 languages).
- **The same Transcription view in the web player**, with both views: **Lyrics** (timestamped lines,
  the current line highlighted and followed) and **Karaoke** (the book as paragraphs, each word
  outlined as it's narrated, using the ebook's exact text when the book has one), search, click a line to jump there, Pause / Resume / Cancel, and the ebook spelling check
  with Review / Apply all / Ignore all.
- **Bookmark button** in the web Transcription view: click to bookmark the moment
  with the line being spoken, hold to save a whole section, and write notes about each one. *Bookmarks*
  lists the timestamp (or range) beside the quote and note. They're regular Audiobookshelf bookmarks,
  shared with the Android app (which also saves them offline and syncs later).
- **Two-way sync with the Android app** for books transcribed *on the phone*: the phone's transcript
  goes to the server (and shows up in the web player and on your other phones), and changes made
  elsewhere (spelling fixes, re-transcribing, deleting) come back to the phone.

It behaves like the on-device version: transcription starts where you're listening (30 s back), runs to
the end, then does the beginning; lines appear while it works; the ebook check runs when it's done.

- **E-reader support for the Android app**: per-user bookmarks, highlights and notes synced between
  devices, and dictionaries (StarDict files you provide, plus optional Wiktionary lookups) that phones
  can use online or download for offline lookups.

## How it fits in

```
phone / browser ──► abs-transcription :13378 ──► audiobookshelf :80 (unchanged official image)
                      │  /api/transcription/*     everything else is passed through untouched,
                      │  web player add-on        including the websocket
                      └─ speech worker (GPU/CPU)
```

The transcription container sits in front of Audiobookshelf on the port your apps already use. It
doesn't modify Audiobookshelf itself, so you keep updating Audiobookshelf as usual. Every request is
checked against Audiobookshelf as the signed-in user (they must be able to open the book).

## Building on standard Audiobookshelf (and keeping both up to date)

ABS+ is designed to **sit beside an unmodified Audiobookshelf**, never to replace or patch it. That is what keeps
updates painless.

**Two containers, one stack:**

| Container | Image | What it does |
|---|---|---|
| `audiobookshelf` | the **official** `ghcr.io/advplyr/audiobookshelf` image, exactly as published | your library, users, playback, progress: everything Audiobookshelf already does |
| `audiobookshelf-plus` (ABS+) | built from this folder (`Dockerfile`, `server/`, `worker/`) | takes the port your apps use (13378), passes every request through to Audiobookshelf untouched, and adds transcription, read along, sync, parental controls, Dewey and the rest |

How they fit together:

- **Same library, read-write.** ABS+ mounts the audiobook folders at the **same paths** Audiobookshelf uses, so a
  book has one path for both. ABS+ writes its `.lrc` files there, and Audiobookshelf ignores them.
- **Its own data.** Transcripts, settings and models live in ABS+'s own volumes (`/data`, `/models`,
  `/dictionaries`, `/catalog`), never in Audiobookshelf's `/config` or `/metadata`.
- **Only the public API.** ABS+ talks to Audiobookshelf through its normal API with its own API key (made
  automatically the first time an admin signs in), and adds its web features by injecting one script into the
  pages it passes through. No Audiobookshelf file is changed.
- **Port 13379** stays as a direct way into plain Audiobookshelf, handy for checking whether a problem is in
  ABS+ or in Audiobookshelf.

**Updating Audiobookshelf.** Because its image is untouched, Audiobookshelf updates exactly as it always would:
pull the new official image and recreate that one container, or let **Settings → Server updates** do it for
you (see *Keeping Audiobookshelf up to date* below). That page checks before and after that every part of
Audiobookshelf ABS+ relies on still works, and puts the previous version back if one doesn't. ABS+ itself is
not touched by an Audiobookshelf update.

**Updating ABS+.** ABS+ is built locally from this folder, not pulled from a registry:

1. Replace `Dockerfile`, `server/` and `worker/` with the new version.
2. Rebuild the ABS+ image and recreate **only** that container: `docker compose up -d --build transcription` (the
   ABS+ service is called `transcription` in `docker-compose.yml`), or in Portainer, rebuild the image and update
   the stack.
3. Everything carries over, because it lives in the volumes: transcripts, settings, downloaded models,
   dictionaries, the catalogue and the API key. Audiobookshelf keeps running throughout. The apps just
   reconnect when ABS+ comes back, usually within a minute.

Speech models are not baked into the image: they download into `/models` the first time they're needed, so an ABS+ update never re-downloads them.

**What can break, and why it's contained.** ABS+ depends on Audiobookshelf's API and on the structure of its
web pages (for the web player add-on). If a future Audiobookshelf changes those, the web add-on is the part
that can stop showing. Its API, sync and the apps keep working, and the update check above catches it
before an automatic update goes through.

## Install on TrueNAS SCALE

1. **Build the image.** Push this folder to a GitHub repo; the *Build image* workflow publishes
   `ghcr.io/<you>/abs-transcription:latest` (GPU+CPU) and `:cpu` (smaller, CPU only). Make the package
   public, or add a registry login on TrueNAS. (Or put the folder on the NAS and use `build:` in the
   compose file.)
2. **Edit `docker-compose.yml`**: your image name, and the same `/mnt/...` paths your Audiobookshelf app
   uses today. Stop the old Audiobookshelf app first so port 13378 is free.
3. **Apps → Discover Apps → ⋮ → Install via YAML**, paste the compose file, save.
4. **No API key step.** Sign in once as an Audiobookshelf admin (web player or app). The add-on uses that
   session to create its own API key, `abs-plus-transcription`, and keeps it in `/data/abs-api-key.json`. If
   the key is ever deleted in Audiobookshelf, the next admin sign-in makes a new one.
   (Setting `ABS_API_KEY` yourself still works and takes priority.)
5. **GPU** (optional): uncomment the `deploy:` block. The log says which one it picked:
   `GPU found: NVIDIA ... — transcription runs on the GPU` or `No GPU found — ... on the CPU`.

Behind a reverse proxy (Nginx Proxy Manager, Traefik, Caddy)? Point it at the transcription container
instead of Audiobookshelf, with websockets enabled — the same settings Audiobookshelf needs.

### Settings

| Variable | Default | |
| --- | --- | --- |
| `ABS_URL` | `http://audiobookshelf:80` | Audiobookshelf as seen from this container |
| `ABS_API_KEY` | – | Optional. Without it the add-on creates its own key the first time an admin signs in |
| `TRANSCRIBE_DEVICE` | `auto` | `auto`, `cuda` or `cpu` |
| `TRANSCRIBE_ADMIN_ONLY` | `false` | Only admins may start server transcriptions. (Deleting, cancelling, re-transcribing, spelling fixes, book analysis and receiving phone transcripts are always admin-only) |
| `AUTO_EBOOK_CHECK` | `true` | Compare with the ebook when a transcription finishes |
| `ROUTER_BASE_PATH` | `/audiobookshelf` | Match Audiobookshelf's setting if you changed it |
| `CPU_THREADS` | free cores | CPU transcription threads. Automatic: the cores not busy with other apps when a book starts (at least 2) |
| `TRANSCRIBE_PRIORITY` | `low` | `low`: the speech worker runs at background priority so Audiobookshelf and other apps stay responsive · `normal` |
| `GOOGLE_BOOKS_API_KEY` | – | Optional. Google Books' shared keyless allowance often runs out; a free key makes Google results reliable |
| `METADATA_LANGUAGES` | `en` | Starting languages for the ABS+ metadata providers (change them later in Settings → Metadata sources) |
| `ABS_PLUS_URL` | `http://transcription:13378` | How the Audiobookshelf container reaches this one, for the metadata providers |
| `AUTO_STEP_DOWN` | `true` | With the Automatic model: if the server runs out of memory, carry on from the same point with the next smaller model |
| `ASR_BATCH_SIZE` | `16` | GPU batch size for Whisper (lower it if the GPU runs out of memory) |
| `DEVICE_LOCK_MINUTES` | `20` | How long a phone "holds" a book it is transcribing after its last check-in |
| `INJECT_WEB_UI` | `true` | Add the Transcription view to the web player |
| `DICTIONARY_DIR` | `/dictionaries` | StarDict dictionaries for the e-reader, one folder per language |
| `DICTIONARY_ONLINE` | `true` | Fall back to Wiktionary for words not in a local dictionary |

### Models and the automatic choice

Two engines are built in:

| Engine | Models | Strengths |
|---|---|---|
| **sherpa-onnx** | NVIDIA **Parakeet TDT 0.6B v2** (English), **v3** (25 European languages) | Among the most accurate open models for these languages, with punctuation and real per-word timings (better Karaoke). Fast on a plain CPU; on the GPU when the CUDA build of sherpa-onnx installs. Same model files as the Android app. |
| **faster-whisper** | Whisper **Large v3**, **Large v3 Turbo**, **Medium**, **Small**, **Base**; **Distil-Whisper Large v3** (English) | 99 languages. Large v3 is the most accurate for less common languages; Turbo is the fast all-rounder on a GPU; Distil-Whisper is fast English on small GPUs. |

**Automatic** (the default) picks per book, from the book's language in Audiobookshelf and the
hardware the container sees (GPU and its memory, CPU cores, RAM, installed engines):

| Hardware | English | European languages | Other languages |
|---|---|---|---|
| NVIDIA GPU + Parakeet on CUDA | Parakeet v2 | Parakeet v3 | Whisper Large v3 (10 GB+) / Turbo |
| NVIDIA GPU, 10 GB+ | Whisper Large v3 Turbo | Whisper Large v3 | Whisper Large v3 |
| NVIDIA GPU, 5–10 GB | Whisper Large v3 Turbo | Turbo | Turbo |
| NVIDIA GPU, 3–5 GB | Distil-Whisper Large v3 | Whisper Medium | Whisper Medium |
| CPU only | Parakeet v2 | Parakeet v3 | Whisper Medium (16+ cores) / Small |
| Under 3 GB RAM | Whisper Base | Whisper Base | Whisper Base |

Books with no language set are treated as English/European on a CPU (Parakeet v3) and get Whisper
Large v3 Turbo on a GPU; set the language in Audiobookshelf for best results. The choice and the
reason are shown with the transcript and in the log, and you can always pick a model yourself. Models
download the first time they're used and stay in `/models`.

**Settings → Transcription → Speech models** (web, admins) lists every model with its size and state, shows
this server's hardware (GPU, cores, memory, and any engine problem) and which model Automatic recommends
for English, European, other languages and books without a language. Download any model at any time,
**Download recommended** or **Download all** (one at a time, in the background, at low priority), or remove
one. The hardware is checked again at every start, so a new GPU or more memory changes the choice at once;
**Check hardware again** does it without a restart.

**Why these models.** Each covers a gap the others leave:

- **Parakeet** is the most accurate open model for English and the main European languages. It writes punctuation
  and gives real per-word timings, which is what makes Karaoke and Read along land on the right word. It's also
  fast on an ordinary CPU, so servers without a graphics card still get good transcripts.
- **Whisper** covers 99 languages and detects the language itself, so any book Parakeet can't handle still
  gets a transcript. Large v3 is the most accurate for less common languages. Turbo trades a little accuracy
  for several times the speed on a GPU. Medium, Small and Base fit smaller GPUs and CPUs.
- **Distil-Whisper** is a slimmed-down English Whisper for GPUs with little memory.

Considered and left out, for now:
- **NVIDIA Canary-1B** and the full **NeMo** toolkit: similar accuracy to Parakeet, but needs PyTorch
  and NeMo (several GB more in the image) for a small gain.
- **WhisperX** (extra wav2vec2 alignment for word timings): Parakeet already gives real word timings,
  and it would add PyTorch.
- **Intel / AMD GPUs** (whisper.cpp with Vulkan or OpenVINO): not built in; those servers use the CPU
  path, where Parakeet is the fast choice anyway.

## Transcribing the whole library

New books are found in the background (every 10 minutes, `LIBRARY_WATCH_MINUTES`) and transcribed one at a time, behind anything someone is listening to. The first look only remembers what's there, so turning the add-on on doesn't queue the whole library. Admins manage it in the web app under **Settings → Transcription** (added to the settings sidebar) or in the ABS+ app under **Settings → Transcription for the library**: turn automatic transcription of new books off or on (`AUTO_TRANSCRIBE_NEW` sets the default), **Transcribe everything**, choose books, and cancel any waiting or running transcription (or all of them).

## Author photos and bios

**Settings → Author photos & bios** (web, admins) fills in authors from more sources than Audiobookshelf's
Match (Audible only): **Wikipedia/Wikidata** (photo from Wikimedia Commons, bio from the article summary in
`AUTHOR_BIO_LANGUAGE`, default `en`, with a CC BY-SA credit link), **Audible** (Audnexus) and **Open Library**,
preferring them in that order. Only people Wikidata lists as writers (or whose article calls them one) are
matched, so namesakes aren't picked up. Fill in what's missing, look everyone up again, or preview and
apply one author. Requests to Wikimedia are spaced out and retried when it asks to slow down.

## Parental controls

**Settings → Parental controls** (web) gives each person an age limit (All ages only, up to 7+, 13+ or 16+, or none) and can block single books for single people. Every book carries an age tag (`Age: All ages`, `7+`, `13+`, `16+`, `18+`, `Unrated`), suggested from its genres and tags in many languages and the explicit flag, and changeable per book. Audiobookshelf itself enforces it through its per-user tag rules, so it holds in the web player, the apps, search, series, collections and downloads. Blocks use a private `abs+hide:<id>` tag that only that person is denied (hidden from tag lists in the web player). "Hide unrated" keeps books nobody has rated yet away from children. The main admin account is never limited.

## Metadata and covers

**Settings → Metadata sources** sets up "ABS+" custom metadata providers in Audiobookshelf. Each search asks Audible (11 stores), Apple Books (audiobooks and ebooks; covers up to 3000 px), Storytel, Open Library and Google Books at once, in the languages you pick (26 available; non-Latin scripts are recognised automatically), merges results about the same book and keeps the biggest cover. There's one provider for all your languages and one per language, a one-click switch to use ABS+ for a library's matching, and a test search.

## Stats and recommendations in the web player

- **Your Stats** gets a reading history section, the same as the app's Stats page: Day / Week / Month / Year tabs back to the first session, time listened compared with the period before, books, days and streaks, the usual time of day, top author, longest session, the books listened to, and **Books you should pick up again** (started but not finished).
- The home page gets a **Based on Your Recent Readings** row after Continue Listening. It holds unstarted books from the library that are like the last 60 days of listening (next in a series, same author or narrator, same Dewey section, shared genres and tags), each with its reason. Only books the viewer may open are shown, so parental controls apply.

## Read along in the web player

- **Transcript button** on a book's page (next to Play and Read, once it's transcribed or being transcribed):
  opens the transcript for reading and searching without touching what's playing. Tap a line and that part
  opens as continuous text (Karaoke view); tap text to mark it; **Play from here** starts listening there.
- **Read along** (next to Lyrics and Karaoke, for books with an EPUB, MOBI, AZW3 or PDF): opens the book in
  Audiobookshelf's own reader with the narrated word highlighted as it plays, using the transcript's word
  times (the same data as `_karaoke.lrc`). It turns pages (EPUB, PDF) or scrolls (MOBI) with the narration,
  and **a tap on any word plays from there**. PDFs need a text layer (scanned PDFs have no words to follow).
  The ✕ on the "Read along" label at the bottom stops it.

## LRC files next to the audio

Every finished transcript is also saved beside the audio, one pair per audio file, timed from the start of that file:

- `<audio name>.lrc`: standard lyrics, one timed line per transcript line (`[mm:ss.xx]Text`). The Lyrics view shows these lines, and any lyrics-capable player can use the file.
- `<audio name>_karaoke.lrc`: every word timed, enhanced LRC to the microsecond (`[mm:ss.ffffff]<mm:ss.ffffff>Word <mm:ss.ffffff>word … <end>`). The Karaoke view uses the same word times.

**Transcribe once, play anywhere.** Transcribing is the heavy part: a speech model has to listen to the whole
book, and that is why it runs on the server's GPU (or a phone on its charger). Playing a transcript back is
not heavy at all. An `.lrc` file is just timed text, so following along only means looking up which line or word
belongs to the current second, about the cost of showing song lyrics. Any device can do it, however low-powered:
an old phone, a cheap tablet, an e-ink reader, or the web player in a browser. They need no speech model, no GPU
and no large download.

Word times come from the speech engine (Whisper word timestamps, Parakeet token times) and are stored to 0.000001 s; the engines themselves are accurate to roughly 0.02-0.1 s. Transcripts made before word times were kept get estimated word times, and the file says so (`[x-word-times:estimated…]`); transcribing again gives measured ones.

Edit a `.lrc` file by hand and the change is read back the next time the book's transcript is opened (and synced to phones). A book that already has `.lrc` files but no transcript shows them too. ABS+ only replaces or deletes files it wrote itself (marked `[re:ABS+ transcription]`).

The container needs the library **read-write at the same path Audiobookshelf uses** (e.g. `/mnt/…/audiobooks:/audiobooks`), or `LIBRARY_PATH_MAP="/audiobookshelf/path=/container/path"`.

## Dewey Decimal browsing and the library catalogue

Every library gets a **Dewey** tab (side rail, or the icon bar on phones): the ten Dewey classes with how many of your books are in each, then divisions, then the books in Dewey order. It only counts books the viewer may open, so parental controls apply. Numbers come from, in order: one typed in by an admin, a local copy of Open Library's catalogue (by ISBN, then title and author), then Open Library online.

**Settings → Library catalogue** downloads Open Library's editions and authors dumps (CC0, about 13 GB, resumable) and builds a searchable copy in the `/catalog` volume (6–10 GB) at low priority. It also becomes an offline source for the ABS+ metadata providers. (isbn-international.org can't be used: it publishes a register of publishers, not a book catalogue, and doesn't allow bulk copying.)

| Variable | Default | |
| --- | --- | --- |
| `CATALOG_DIR` | `/catalog` | Where the catalogue copy lives |
| `CATALOG_KEEP_DUMPS` | – | `1` keeps the downloaded dump files after building |

## Adapts to the device

The web player's Transcription view adapts like the ABS+ app: e-ink (black-and-white or colour, from the browser's `(update: slow)` or the device name) gets paper white with no animation and a slower follow clock; HDR / OLED-style dark screens get true black; phone, tablet and desktop layouts; low battery or data saver switches to a lighter mode; and if the page drops frames it eases off by itself (remembered per browser). **⋮ → Display & colours** changes the screen, colour vision (red-, green-, blue-weak, no colour), performance and motion.

## Dictionaries for the e-reader

Long-pressing a word in the app's e-reader shows its definition. Lookups use, in order:
dictionaries downloaded to the phone (offline), dictionaries on this server, then Wiktionary (if
`DICTIONARY_ONLINE=true`).

Put dictionaries in StarDict format (`.ifo` + `.idx` + `.dict.dz`, sometimes `.syn`) in the
`/dictionaries` volume, in a folder named after the language:

```
/dictionaries/en/wordnet/wordnet.ifo  wordnet.idx  wordnet.dict.dz
/dictionaries/es/wiktionary-es/…
/dictionaries/any/…                   (used for every language)
```

StarDict is a widely used open dictionary format, so free dictionaries are easy to find: for example
WordNet, or the many Wiktionary-based StarDict dictionaries. The server
picks them up within a minute. In the app: reader settings → Dictionaries → Download, to use one offline.

## Two-way sync

Only admins' phones send transcripts to the server. Anyone can transcribe on their own phone, but for other users the transcript stays on that phone: the app warns them before it starts, and the server refuses the upload (403). Phones still receive the server's transcripts as usual.

Every transcript has a revision number on the server. The phone remembers the revision it last synced
and whether it changed anything since:

| Phone | Server | Result |
| --- | --- | --- |
| changed | unchanged | phone → server |
| unchanged | changed | server → phone (finished transcripts) |
| changed | changed | the more complete one wins (finished > unfinished > further along > newer). If the server wins, the phone keeps its lines as `lines.conflict.jsonl` |
| deleted | unchanged | deleted on the server too |
| unchanged | deleted | deleted on the phone too |

While a phone is transcribing, it checks in every 10 minutes with its partial transcript. The web player
shows "Transcribing on <phone name>… 42%" with the lines so far, and the server won't start the same book
until the phone pauses or 20 minutes pass without a check-in. Syncing happens when the app connects to
the server, when a book's page or Transcription view opens, and whenever a transcription or spelling
check finishes on the phone.

Servers without this add-on are detected (404) and left alone, so the app keeps working everywhere.

## Files

```
/data/transcripts/<library item id>/meta.json            status, progress, revision, origin
/data/transcripts/<library item id>/lines.jsonl          {"s": start, "e": end, "t": text} per line
/data/transcripts/<library item id>/ebook-check.json     spelling suggestions
/data/transcripts/<library item id>/lines.original.jsonl before the first spelling fix
/data/tombstones.json                                    deleted transcripts (so phones delete theirs)
/data/reader/<user id>/<library item id>.json            e-reader bookmarks, highlights and notes
```

Same formats as the app, so a transcript moves between phone and server unchanged.

## Limits

- Books only (the app doesn't transcribe podcasts either).
- DRM-protected Kindle books can't be used for the spelling check (the reason is shown). EPUB, MOBI,
  AZW3, KFX and DjVu with an OCR text layer work.
- The web player hook relies on Audiobookshelf's current web client (Nuxt). If a future release changes
  the player, the Transcription button may not appear, but nothing else is affected: the API, sync and
  the app keep working. Audiobookshelf is rewriting its web client; the view will need a small update then.

## Development

```bash
cd server && npm test     # unit + end-to-end tests with a fake Audiobookshelf and a fake speech worker
```

No npm dependencies: the server uses only Node's standard library. The speech worker
(`worker/asr_worker.py`) speaks JSON lines and can be swapped for another engine.

## Keeping Audiobookshelf up to date

**Settings → Server updates** (web, admins) keeps the regular Audiobookshelf container (the official image
ABS+ sits in front of) up to date. It compares the running version with the newest GitHub release and, when
there is one, downloads the official image and recreates the Audiobookshelf container with exactly the same
settings: volumes, network names, environment, restart policy and the stack's labels, so Portainer still lists
it in the stack. It waits until Audiobookshelf answers again; if it doesn't, the previous container is put back
as it was. The previous version is kept (tagged `absplus-previous`) for **Go back to …**.

Automatic: a daily check at a set time (default 04:00) that installs the update (or only checks, or is off).
It doesn't start while someone is listening (it tries again the next day), and a new major version (3.x) waits
for an admin unless allowed.

ABS+ features are kept: ABS+ is its own container, so an update never touches it. Before and after every
update it checks what it relies on in Audiobookshelf (its API, adding the ABS+ script to the web pages, and
the parts of the web app its features hook into); if something that worked stops working, the update is
undone and Settings → Server updates says which feature it was ("Install anyway" is there if you choose).

It needs the Docker socket in the ABS+ service (`- /var/run/docker.sock:/var/run/docker.sock`) and the
Audiobookshelf container's name (`ABS_CONTAINER`, default `audiobookshelf-plus-abs`). The socket gives ABS+
control of Docker on that host; leave it out and ABS+ only checks and tells you. ABS+ itself is built locally,
so it doesn't update itself from a registry: rebuild it from a new zip.

## Updating the ABS+ Android app from this server

The server hands out the newest ABS+ app: `/abs-plus/app/latest.json` (build number, size, SHA-256, notes) and
`/abs-plus/app/ABS+.apk` (resumable download). Both are public on purpose: the app checks before anyone signs
in, and Android's installer can't send an Audiobookshelf token; nothing private is in them.

Each time the app opens (and when it comes back to the front) it asks the server it's connected to; if the
server has a newer build, it shows **Update available** with **Update** (downloads the APK; open it to install,
allowing installs from that source if Android asks) and **Later** (until the app is next opened).

Publish a new build without rebuilding the image:

    node publish-app.js path/to/ABS+_24.apk 24 "what's new"

It copies the APK and its details into the container's `/data/android/`. The app's build number lives in
`plugins/absPlusBuild.js` and its Android versionCode is 1000 + that number, so each APK installs as an update.

## Licence

The ABS+ server is free and open-source software under the GNU General Public License v3.0 (see `LICENSE`). It runs alongside an unmodified Audiobookshelf server and is not endorsed by the Audiobookshelf project. Third-party software and speech models keep their own licences; see `THIRD_PARTY_NOTICES.md`.

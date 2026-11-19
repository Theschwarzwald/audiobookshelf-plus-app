<template>
  <transition name="transcription-slide">
    <div v-if="warm || value" v-show="value" class="transcription-panel fixed inset-0 z-[60] pointer-events-auto flex flex-col" :style="{ '--tp-accent': accent, '--tp-accent-soft': accentSoft, background: shade ? shade.background : bgColor, color: textColor, bottom: useMiniPlayer ? (bottomInset > 120 ? bottomInset : 120) + 'px' : 0 }">
      <div class="tp-top flex-shrink-0" :class="{ 'tp-top-faded': topFaded }" :style="einkHeaderStyle">
      <!-- Header -->
      <div v-if="!bookMode" class="flex items-center px-3 pt-3 pb-1 flex-shrink-0">
        <span class="material-symbols text-4xl cursor-pointer" @click="close">keyboard_arrow_down</span>
        <div class="flex-grow min-w-0 text-center px-2">
          <p class="text-lg font-semibold leading-tight">Transcription</p>
          <app-marquee-text class="text-xs opacity-70" :text="title || ''" />
        </div>
        <!-- Aa (Karaoke's text size): its space is kept in every mode, so the title doesn't move when switching -->
        <span v-if="hasTranscript" class="font-serif text-xl px-2 select-none" :class="viewMode === 'karaoke' ? 'cursor-pointer' : 'invisible pointer-events-none'" :aria-hidden="viewMode === 'karaoke' ? null : 'true'" @click="viewMode === 'karaoke' && (showTextSize = !showTextSize)">Aa</span>
        <span v-if="!screenLocked" data-tour="tp-menu" class="material-symbols text-3xl cursor-pointer" @click="showMenu = !showMenu">more_vert</span>
      </div>

      <!-- View: lyrics (timed lines) or karaoke (paragraphs, word by word) -->
      <div v-if="hasTranscript && !bookMode && !screenLocked" data-tour="tp-views" class="flex justify-center pb-2 flex-shrink-0 relative">
        <div class="flex rounded-full p-0.5" :style="{ backgroundColor: overlay(0.12) }">
          <button v-for="m in viewModes" :key="m.id" class="px-4 py-1 rounded-full text-sm font-semibold flex items-center" :style="viewMode === m.id ? { backgroundColor: textColor, color: bgColor } : {}" @click="setViewMode(m.id)">
            <span class="material-symbols text-base mr-1">{{ m.icon }}</span>{{ m.label }}
          </button>
        </div>
      </div>
      <div v-if="showTextSize && viewMode === 'karaoke'" class="tp-card mx-4 mb-2 rounded-xl px-3 py-2 flex items-center flex-shrink-0" :style="{ backgroundColor: overlay(0.1) }">
        <button class="font-serif text-sm px-3 py-1" @click="setKaraokeSize(karaokeSize - 1)">A</button>
        <input type="range" min="14" max="30" :value="karaokeSize" class="flex-grow mx-2" @input="setKaraokeSize(Number($event.target.value))" />
        <button class="font-serif text-2xl px-3" @click="setKaraokeSize(karaokeSize + 1)">A</button>
      </div>

      <!-- Search bar -->
      <div v-if="hasTranscript && viewMode !== 'readalong' && !screenLocked" data-tour="tp-search" class="px-4 pb-2 flex-shrink-0">
        <div class="flex items-center rounded-full px-3 h-10" :style="{ backgroundColor: overlay(0.14) }">
          <span class="material-symbols text-xl opacity-70">search</span>
          <input ref="searchInput" v-model="searchInput" type="search" enterkeyhint="search" placeholder="Search transcription" class="flex-grow bg-transparent outline-none px-2 text-base placeholder-current" :style="{ color: textColor }" @keyup.enter="blurSearch" />
          <span v-if="searchInput" class="material-symbols text-xl cursor-pointer opacity-80" @click="clearSearch">close</span>
        </div>
        <p v-if="query && viewMode === 'lyrics'" class="text-xs opacity-75 mt-1 px-2">{{ filteredLines.length }} {{ filteredLines.length === 1 ? 'line matches' : 'lines match' }} "{{ query }}"</p>
        <p v-if="query && viewMode === 'karaoke'" class="text-xs opacity-75 mt-1 px-2">{{ karaokeFiltered.length }} {{ karaokeFiltered.length === 1 ? 'paragraph matches' : 'paragraphs match' }} "{{ query }}"</p>
      </div>
      <!-- Read along: the same search bar as the web player (searches the transcription in Lyrics) -->
      <div v-if="hasTranscript && viewMode === 'readalong' && !bookMode && !screenLocked" class="px-4 pb-2 flex-shrink-0">
        <div class="flex items-center rounded-full px-3 h-10 cursor-pointer" :style="{ backgroundColor: overlay(0.14) }" @click="searchFromReadAlong">
          <span class="material-symbols text-xl opacity-70">search</span>
          <span class="flex-grow px-2 text-base opacity-60">Search transcription</span>
        </div>
      </div>
      </div>

      <!-- Progress (running / paused / error) -->
      <div v-if="showProgressCard && !bookMode" class="tp-card mx-4 mb-2 rounded-xl p-3 flex-shrink-0" :style="{ backgroundColor: overlay(0.1) }">
        <div class="flex items-center">
          <div class="flex-grow min-w-0">
            <p class="text-sm font-semibold">{{ progressTitle }}</p>
            <p class="text-xs opacity-75 truncate">{{ progressSubtitle }}</p>
          </div>
          <template v-if="!remoteDeviceJob">
            <button v-if="isActive" class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" @click="pause">Pause</button>
            <button v-else class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" @click="resume">Resume</button>
            <button v-if="canEdit" class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" @click="cancelTranscription">Cancel</button>
          </template>
        </div>
        <div class="h-1.5 w-full rounded-full mt-2 overflow-hidden" :style="{ backgroundColor: overlay(0.2) }">
          <div class="h-full rounded-full transition-all" :style="{ width: progressPercent + '%', backgroundColor: textColor }" />
        </div>
      </div>

      <!-- Ebook spelling check (after transcription finishes, if Audiobookshelf has the ebook) -->
      <div v-if="showEbookCard && !bookMode && !screenLocked" data-tour="tp-ebook" class="tp-card mx-4 mb-2 rounded-xl px-3 py-2 flex-shrink-0 flex flex-wrap items-center" :style="{ backgroundColor: overlay(0.1) }">
        <span class="material-symbols text-xl mr-2" :class="{ 'animate-pulse': ebookCheckBusy }">{{ ebookCheckBusy ? 'auto_stories' : status.ebookCheck === 'error' ? 'error' : 'spellcheck' }}</span>
        <div class="flex-grow min-w-0">
          <p class="text-sm font-semibold">{{ ebookCardTitle }}</p>
          <p v-if="status.ebookCheck === 'done' && ebookPendingCount" class="text-xs text-warning flex items-start mt-0.5">
            <span class="material-symbols text-sm mr-1">warning</span>
            <span>{{ discrepancyWarning }}</span>
          </p>
          <p v-if="status.ebookCheckMessage && !ebookCheckBusy" class="text-xs opacity-75 truncate">{{ status.ebookCheckMessage }}</p>
        </div>
        <div v-if="canEdit && status.ebookCheck === 'done' && ebookPendingCount" class="w-full flex justify-end mt-2">
          <button class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" :disabled="ebookBusy" @click="applyAllSuggestions">Apply all</button>
          <button class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" :disabled="ebookBusy" @click="ignoreAllSuggestions">Ignore all</button>
          <button class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" @click="openEbookSheet">Review</button>
        </div>
        <button v-else-if="status.ebookCheck === 'error'" class="ml-2 px-3 py-1 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" @click="runEbookCheck">Retry</button>

      </div>

      <!-- Setup: pick a model -->
      <!-- Can't transcribe on the server right now, and the phone wasn't chosen -->
      <div v-if="!loading && !hasTranscript && engine === 'none' && (!status || status.status === 'none' || status.status === 'error')" class="flex-grow flex flex-col items-center justify-center px-8 text-center">
        <span class="material-symbols text-5xl mb-2 opacity-70">{{ online ? 'dns' : 'cloud_off' }}</span>
        <p class="font-semibold mb-1">{{ online ? "Your server can't transcribe right now" : "You're offline" }}</p>
        <p class="text-sm opacity-75 mb-4">{{ online ? 'It needs the transcription add-on (or an admin to set it up).' : 'Transcription runs on your server. Connect to it and open this again.' }}</p>
        <p class="text-xs opacity-60">To transcribe on this phone instead, use the ⋮ menu.</p>
      </div>

      <!-- Setup: pick a model -->
      <div v-if="!loading && !hasTranscript && engine !== 'none' && (!status || status.status === 'none' || status.status === 'error')" class="flex-grow overflow-y-auto px-4 pb-6">
        <!-- On this phone: only after "Yes" to the offline question, or from the ⋮ menu -->
        <div v-if="engine === 'device'" class="text-sm mb-3 rounded-lg p-2 flex items-start bg-warning/15 border border-warning/60">
          <span class="material-symbols text-lg text-warning mr-2">battery_charging_full</span>
          <span>Transcribing on this phone. This takes a long time and uses a lot of battery, so keep it plugged in.<template v-if="serverUsable"> <button class="underline font-semibold" @click="setEngine('server')">Use the server instead</button></template></span>
        </div>
        <p v-if="engine === 'server' && serverInfo && serverInfo.hardware" class="text-xs opacity-60 mb-1">Server: {{ serverInfo.hardware }}</p>
        <p v-if="engine === 'server'" class="text-sm opacity-80 mb-3">Transcribe this book {{ serverWhere }} to follow along with the words, search them, and tap any line to jump there. It keeps going when you close the app, and the finished transcript is copied to this phone.</p>
        <p v-else class="text-sm opacity-80 mb-3">Transcribe this book on your phone to follow along with the words, search them, and tap any line to jump there. Everything runs offline on this device.</p>
        <div v-if="engine === 'device' && serverAvailable" class="text-sm mb-3 rounded-lg p-2 flex items-start bg-warning/15 border border-warning/60">
          <span class="material-symbols text-lg text-warning mr-2">battery_charging_full</span>
          <span>Much slower than the server and uses a lot of battery. Keep the phone plugged in. The result is synced to the server when it's done.</span>
        </div>
        <p v-if="status && status.error" class="text-sm mb-3 rounded-lg p-2" style="background: rgba(255, 82, 82, 0.25)">{{ status.error }}</p>
        <p v-if="engine === 'server' && serverInfo && !serverInfo.canTranscribe" class="text-sm mb-3 rounded-lg p-2" style="background: rgba(255, 82, 82, 0.25)">Only admins can start transcriptions on this server. You can still transcribe on this phone.</p>
        <p v-if="engine === 'server' && serverInfo && serverInfo.canTranscribe && !serverInfo.apiKeyConfigured" class="text-sm mb-3 rounded-lg p-2" style="background: rgba(255, 82, 82, 0.25)">Server transcription isn't set up yet (the server admin needs to set ABS_API_KEY). You can still transcribe on this phone.</p>
        <p v-if="!models.length" class="text-sm opacity-75">Transcription is available in the Android app.</p>
        <div v-for="m in models" :key="m.id" class="rounded-xl p-3 mb-2 cursor-pointer border-2" :style="{ backgroundColor: overlay(0.08), borderColor: selectedModelId === m.id ? textColor : 'transparent' }" @click="selectedModelId = m.id">
          <div class="flex items-center">
            <span class="material-symbols text-xl mr-2">{{ selectedModelId === m.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
            <p class="font-semibold flex-grow">{{ m.name }}</p>
            <span v-if="m.installed" class="text-xs px-2 py-0.5 rounded-full" :style="{ backgroundColor: overlay(0.18) }">Downloaded</span>
            <span v-if="m.installed && engine === 'device'" class="material-symbols text-xl ml-1 opacity-70" @click.stop="deleteModel(m)">delete</span>
          </div>
          <p class="text-sm opacity-80 mt-1 ml-7">{{ m.description }}</p>
          <p class="text-xs opacity-60 mt-1 ml-7">{{ m.languages }} · {{ m.installed ? formatBytes(m.installedBytes) + (engine === 'server' ? ' on server' : ' on device') : m.sizeLabel }}</p>
          <div v-if="modelDownload && modelDownload.modelId === m.id" class="ml-7 mt-2">
            <div class="h-1 w-full rounded-full overflow-hidden" :style="{ backgroundColor: overlay(0.2) }">
              <div class="h-full" :style="{ width: Math.round(modelDownload.progress * 100) + '%', backgroundColor: textColor }" />
            </div>
          </div>
        </div>
        <button v-if="models.length && canStartHere" class="w-full mt-3 py-3 rounded-full font-semibold text-base" :style="{ backgroundColor: textColor, color: bgColor }" :disabled="starting" @click="start(false)">
          {{ starting ? 'Starting…' : selectedModel && !selectedModel.installed && !selectedModel.auto ? 'Download model & transcribe' : 'Start transcription' }}
        </button>
        <!-- Offline install: for phones that can't reach github.com -->
        <div v-if="engine === 'device' && selectedModel && !selectedModel.installed" class="mt-4 rounded-xl p-3" :style="{ backgroundColor: overlay(0.08) }">
          <p class="text-sm font-semibold">Can't download on this phone?</p>
          <p class="text-xs opacity-80 mt-1">Download <span class="font-mono break-all">{{ selectedModel.fileName }}</span> on a computer or in your browser, copy it to the phone, then import it.</p>
          <div class="flex mt-2">
            <button class="flex-1 py-2 rounded-full text-sm font-semibold mr-2" :style="{ backgroundColor: overlay(0.2) }" @click="copyModelLink">Copy download link</button>
            <button class="flex-1 py-2 rounded-full text-sm font-semibold" :style="{ backgroundColor: overlay(0.2) }" :disabled="!!modelDownload" @click="importModel">Import model file</button>
          </div>
        </div>
        <p v-if="engine === 'server'" class="text-xs opacity-60 mt-3">Tip: languages are detected automatically. You can keep listening while it works; lines appear as they are ready, starting where you are.</p>
        <p v-else class="text-xs opacity-60 mt-3">Tip: a 10 hour book can take a few hours on a phone. Plug in your phone; you can keep listening while it works and lines appear as they are ready.</p>
      </div>

      <!-- Running, no lines yet -->
      <div v-if="!loading && !hasTranscript && isActive" class="flex-grow flex flex-col items-center justify-center px-8 text-center opacity-80">
        <span class="material-symbols text-5xl mb-2">graphic_eq</span>
        <p>Lines will appear here as soon as the first part is transcribed. You can close this screen; transcription keeps running {{ isServerSource ? 'on the server' : 'in the background' }}.</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-grow flex items-center justify-center">
        <widgets-spinner-icon class="h-8 w-8" />
      </div>

      <!-- Lines -->
      <!-- Lyrics and Karaoke stacked in one place: switching only shows one and hides the other (visibility), so
           neither has to lay out thousands of lines again when it comes back (that took about a second) -->
      <div v-if="hasTranscript && (karaokeOpened || lyricsOpened || readAlongOpened)" class="flex-grow relative min-h-0">
      <!-- Karaoke: the book as paragraphs, the narrated word highlighted -->
      <div v-if="hasTranscript && karaokeOpened" ref="scrollerK" class="tp-scroller absolute inset-0 overflow-y-auto px-3" :class="[useMiniPlayer ? 'pb-12' : 'pb-32', viewMode === 'karaoke' ? '' : 'tp-off']" @touchstart.passive="userScrolled" @wheel.passive="userScrolled" @pointerdown="lpStart" @pointermove="lpMove" @pointerup="lpEnd" @pointercancel="lpEnd" @contextmenu="lpMenu">
        <div class="h-2" />
        <div v-if="!query && !currentTimeTranscribed" class="sticky top-0 z-10 rounded-lg px-3 py-2 mb-2 text-sm flex items-center" :style="{ backgroundColor: shade ? shade.upper : bgColor, boxShadow: `0 0 0 1px ${overlay(0.25)}` }">
          <span class="material-symbols text-lg mr-2">hourglass_top</span>
          <span>You're at {{ $secondsToTimestamp(liveTime) }}. This part isn't transcribed yet{{ isActive ? ' — it will be soon' : '' }}.</span>
        </div>
        <p v-if="karaokeNote" class="text-xs opacity-60 px-3 mb-3 flex items-center"><span class="material-symbols text-sm mr-1">{{ karaokeSource === 'ebook' ? 'menu_book' : 'info' }}</span>{{ karaokeNote }}</p>
        <p v-if="query && !karaokeFiltered.length" class="text-center opacity-70 mt-8">No matches</p>
        <app-transcript-karaoke-text ref="karaokeList" :paras="karaokeFiltered" :query="query" :render-paragraph="renderParagraph" :active-pi="karaokeActive.pi" :active-wi="karaokeActive.wi" :accent="accent" :accent-soft="accentSoft" :size="karaokeSize" :smooth="smoothWords" :group="$store.getters['device/isEink']" @para="clickParagraph" />
        <p v-if="isActive" class="text-sm opacity-60 py-4 px-3">Transcribing… more text will appear here.</p>
      </div>

      <div v-if="hasTranscript && lyricsOpened" ref="scrollerL" class="tp-scroller absolute inset-0 overflow-y-auto px-4" :class="[useMiniPlayer ? 'pb-12' : 'pb-32', viewMode === 'lyrics' ? '' : 'tp-off']" @touchstart.passive="userScrolled" @wheel.passive="userScrolled" @pointerdown="lpStart" @pointermove="lpMove" @pointerup="lpEnd" @pointercancel="lpEnd" @contextmenu="lpMenu">
        <div class="h-4" />
        <div v-if="!query && !currentTimeTranscribed" class="sticky top-0 z-10 rounded-lg px-3 py-2 mb-2 text-sm flex items-center" :style="{ backgroundColor: shade ? shade.upper : bgColor, boxShadow: `0 0 0 1px ${overlay(0.25)}` }">
          <span class="material-symbols text-lg mr-2">hourglass_top</span>
          <span>You're at {{ $secondsToTimestamp(liveTime) }}. This part isn't transcribed yet{{ isActive ? ' — it will be soon' : '' }}. Lines below are from the parts that are done.</span>
        </div>
        <p v-if="query && !filteredLines.length" class="text-center opacity-70 mt-8">No matches</p>
        <app-transcript-lyrics-list ref="lyricsList" :lines="filteredLines" :query="query" :render-line="renderLine" :bookmarked-lines="bookmarkedLines" :active="lineNow" @line="clickLine" />
        <p v-if="isActive" class="text-sm opacity-60 py-4">Transcribing… more lines will appear here.</p>
      </div>

      <!-- Read along: the book itself (Readium), the narrated word highlighted. Stacked in the same place as Lyrics and
           Karaoke at the same size, so switching between all three only shows one and hides the others: nothing moves or
           re-lays out (it used to be parked elsewhere at a guessed size and jump into place). Keeps following when hidden -->
      <app-transcript-read-along v-if="hasTranscript && readAlongOpened && canReadAlongHere" ref="readAlong" :active="value && viewMode === 'readalong'" :item="ebookItem" :item-key="itemKey" :title="title" :is-playing="isPlaying" :line-count="lines.length" :theme="readAlongTheme" :p="dictPalette" :eink="isEinkTheme" :reading="bookMode" @tap="topShow" @seek="(t) => { topShow(); $emit('seek', t) }" @lookup="onReadAlongLookup" @exit-reading="onExitReading" />
      </div>


      <!-- Audio paused, in any view: put the audiobook aside and read the book (page controls, contents, dictionary) -->
      <!-- Transcript read mode (a book without an ebook): back to listening -->
      <button v-if="txReading" class="tp-bookbtn absolute right-3 z-20 rounded-full shadow-lg flex items-center justify-center" :style="bookBtnStyle" aria-label="Back to the audiobook" title="Back to the audiobook" @click="txReading = false">
        <span class="material-symbols text-[26px]">headphones</span>
      </button>
      <!-- Playing: the screen lock button, in the same place and size as the read button that replaces it when paused -->
      <button v-if="showLockBtn" data-tour="tp-lock" class="tp-bookbtn absolute right-3 z-20 rounded-full shadow-lg flex items-center justify-center" :style="bookBtnStyle" aria-label="Lock the screen" title="Lock the screen" @click="$eventBus.$emit('screen-lock')">
        <span class="material-symbols fill text-[26px]">lock</span>
      </button>
      <button v-if="showBookModeBtn" class="tp-bookbtn absolute right-3 z-20 rounded-full shadow-lg flex items-center justify-center" :style="bookBtnStyle" aria-label="Read the book without the audiobook" title="Read the book without the audiobook" @click="enterBookMode">
        <span class="material-symbols text-[26px]">auto_stories</span>
      </button>

      <!-- Hold a word (paused): its meaning, Kindle style, from the phone's dictionaries, then the server's -->
      <readers-selection-sheet v-if="dictSel" class="tp-dict" :p="dictPalette" :selection="dictSel" :language="(status && status.language) || ''" @close="closeDict" @copy="dictCopy" @search="dictSearch" @listen="dictListen" />

      <!-- Follow current line -->
      <button v-if="hasTranscript && !txReading && !followPlayback && !query && viewMode !== 'readalong'" :class="useMiniPlayer ? 'bottom-4' : 'bottom-24'" class="tp-follow absolute left-1/2 -translate-x-1/2 transform px-4 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center" :style="{ backgroundColor: textColor, color: bgColor }" @click="resumeFollow">
        <span class="material-symbols text-lg mr-1">my_location</span>{{ reading ? 'Back to the marked part' : viewMode === 'karaoke' ? 'Back to current word' : 'Back to current line' }}
      </button>

      <!-- Mini transport -->
      <div v-if="reading" class="tp-transport absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 flex items-center" :style="{ background: `linear-gradient(to top, ${bgColor} 82%, transparent)` }">
        <span class="font-mono text-sm opacity-80 w-20">{{ $secondsToTimestamp(liveTime) }}</span>
        <p class="flex-grow min-w-0 text-xs opacity-70 px-2 text-center leading-snug">{{ hasTranscript ? 'Tap a line to read that part · tap text to mark it' : '' }}</p>
        <button v-if="hasTranscript" class="px-4 h-11 rounded-full flex flex-shrink-0 items-center font-semibold text-sm whitespace-nowrap shadow-lg" :style="bookGradientStyle" @click="$emit('playFrom', liveTime)">
          <span class="material-symbols fill text-2xl mr-1">play_arrow</span>Play from here
        </button>
      </div>
      <div v-else-if="!bookMode && !txReading && !useMiniPlayer" class="tp-transport absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 flex items-center" :style="{ background: `linear-gradient(to top, ${bgColor} 82%, transparent)` }">
        <span class="font-mono text-sm opacity-80 w-20">{{ $secondsToTimestamp(liveTime) }}</span>
        <div class="flex-grow flex justify-center items-center">
          <span class="material-symbols text-3xl cursor-pointer mx-4" @click="$emit('jumpBackward')">replay</span>
          <div class="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg" :style="bookGradientStyle" @click="$emit('playPause')">
            <span class="material-symbols fill text-4xl">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
          </div>
          <span class="material-symbols text-3xl cursor-pointer mx-4" @click="$emit('jumpForward')">forward_media</span>
        </div>
        <div class="w-20 flex justify-end">
          <app-bookmark-button v-if="bookmarkItemId" data-tour="tp-bookmark" :library-item-id="bookmarkItemId" :item-key="itemKey" :get-time="clipTime" @edit="editBookmarkNote" />
        </div>
      </div>

      <!-- Bookmarks & clips: timestamp beside the quote -->
      <div v-if="showBookmarks" class="absolute inset-0 z-20 flex flex-col bg-bg text-fg">
        <div class="flex items-center px-3 pt-3 pb-2 flex-shrink-0 border-b border-border">
          <span class="material-symbols text-3xl cursor-pointer" @click="showBookmarks = false">arrow_back</span>
          <div class="flex-grow min-w-0 px-2">
            <p class="text-lg font-semibold leading-tight">Bookmarks</p>
            <p class="text-xs text-fg-muted">Tap Bookmark to save a moment, hold it to save a section</p>
          </div>
        </div>
        <div class="flex-grow overflow-y-auto pb-8">
          <modals-bookmarks-bookmark-note-editor v-if="editingBookmark" :key="editingBookmark.time" :bookmark="editingBookmark" @cancel="editingBookmark = null" @saved="editingBookmark = null" />
          <template v-else>
            <modals-bookmarks-bookmark-item v-for="bm in sortedBookmarks" :key="bm.time" :bookmark="bm" @click="seekBookmark" @edit="(b) => (editingBookmark = b)" @delete="deleteBookmark" />
            <p v-if="!sortedBookmarks.length" class="text-center text-fg-muted mt-12 px-8">No bookmarks yet. Tap Bookmark to save the line you're hearing, or hold it while a passage plays to save the whole section.</p>
          </template>
        </div>
      </div>

      <app-ebook-check-sheet v-if="showEbookSheet" :check="ebookCheckData" :busy="ebookBusy" @close="showEbookSheet = false" @seek="seekFromSheet" @update="updateSuggestions" />

      <!-- Offline (or no server transcription): offer the phone -->
      <div v-if="phonePrompt" class="absolute inset-0 z-30 flex items-center justify-center px-6" style="background: rgba(0, 0, 0, 0.55)">
        <div class="w-full max-w-sm rounded-2xl p-5 bg-bg text-fg border border-border" role="dialog">
          <template v-if="phonePrompt === 'lengthy'">
            <span class="material-symbols text-4xl mb-2 block">hourglass_top</span>
            <p class="text-lg font-semibold mb-2">This takes a while</p>
            <p class="text-sm opacity-85 mb-2">Transcribing on the phone is much slower than on your server: a 10-hour book can take several hours, longer on older phones. It also uses a lot of battery.</p>
            <p class="text-sm opacity-85" :class="canEdit ? 'mb-4' : 'mb-2'">Keep the phone plugged in. It carries on in the background, lines appear as they're ready, and you can pause at any time.{{ canEdit ? " When you're back online the transcript is copied to your server." : '' }}</p>
            <p v-if="!canEdit" class="text-sm mb-4 rounded-lg p-2 flex items-start" style="background: rgba(255, 170, 0, 0.18)">
              <span class="material-symbols text-base mr-1.5">phone_android</span>
              <span><b>It stays on this phone.</b> Only admins' transcripts are copied to the server, so this one won't appear in the web player or on your other devices, and it can't be deleted or changed afterwards. If the server transcribes the book later, its copy can replace this one.</span>
            </p>
            <div class="flex gap-3">
              <button class="flex-1 py-2.5 rounded-full border border-border font-semibold" @click="phonePrompt = null">Cancel</button>
              <button class="flex-1 py-2.5 rounded-full bg-fg text-bg font-semibold" @click="usePhone">Continue</button>
            </div>
          </template>
          <template v-else>
            <span class="material-symbols text-4xl mb-2 block">{{ phonePrompt === 'offline' ? 'cloud_off' : 'dns' }}</span>
            <p class="text-lg font-semibold mb-4">{{ phonePrompt === 'offline' ? 'It appears you are offline, would you like to transcribe here?' : "Your server can't transcribe right now, would you like to transcribe here?" }}</p>
            <div class="flex gap-2">
              <button class="flex-1 py-2.5 rounded-full border border-border font-semibold" @click="answerPhonePrompt('never')">Never</button>
              <button class="flex-1 py-2.5 rounded-full border border-border font-semibold" @click="answerPhonePrompt('no')">No</button>
              <button class="flex-1 py-2.5 rounded-full bg-fg text-bg font-semibold" @click="answerPhonePrompt('yes')">Yes</button>
            </div>
            <p class="text-xs opacity-60 mt-3">"Never" stops asking. You can still transcribe on this phone from the ⋮ menu, and change this in Settings.</p>
          </template>
        </div>
      </div>

      <!-- Menu -->
      <div v-if="showMenu" class="absolute inset-0 z-10" @click="showMenu = false">
        <!-- scrolls when it is taller than the panel, so the last items (Re-transcribe, Delete) can always be reached -->
        <div class="absolute right-3 top-14 rounded-lg shadow-xl py-1 min-w-[220px] bg-bg text-fg overflow-y-auto overscroll-contain" style="max-height: calc(100% - 4.5rem)" @click.stop>
          <p v-if="status && status.modelId" class="px-4 py-2 text-xs text-fg-muted">Model: {{ modelName(status.modelId) }}{{ originLabel ? ' · ' + originLabel : '' }}</p>
          <!-- The phone option is always here, even after "Never" -->
          <div v-if="!hasTranscript && !isActive && engine !== 'device'" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="showMenu = false; phonePrompt = 'lengthy'">
            <span class="material-symbols text-xl mr-3">smartphone</span>
            <p>Transcribe on this phone…</p>
          </div>
          <div class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="toggleOfflinePref">
            <span class="material-symbols text-xl mr-3">{{ offlinePref === 'never' ? 'notifications_off' : 'notifications' }}</span>
            <div>
              <p>When offline: {{ offlinePref === 'never' ? "don't ask" : 'ask to transcribe here' }}</p>
              <p class="text-xs text-fg-muted">Tap to change</p>
            </div>
          </div>
          <!-- highlight timing: nudge the words earlier / later until they match the voice -->
          <div class="px-4 py-2 flex items-center">
            <span class="material-symbols text-xl mr-3">timer</span>
            <div class="flex-grow">
              <p>Highlight timing</p>
              <p class="text-xs text-fg-muted">{{ syncOffsetLabel }}</p>
            </div>
            <button class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-bg-hover" aria-label="Later" @click="$store.commit('device/setSyncOffset', syncOffset - 0.1)"><span class="material-symbols">remove</span></button>
            <button class="w-9 h-9 rounded-full flex items-center justify-center hover:bg-bg-hover" aria-label="Earlier" @click="$store.commit('device/setSyncOffset', syncOffset + 0.1)"><span class="material-symbols">add</span></button>
          </div>
          <div v-if="bookmarkItemId" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="openBookmarks">
            <span class="material-symbols text-xl mr-3">bookmarks</span>
            <p>Bookmarks ({{ bookmarks.length }})</p>
          </div>
          <div v-if="canEdit && ebookCheckData && ebookCheckData.suggestions && ebookCheckData.suggestions.length" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="openEbookSheet">
            <span class="material-symbols text-xl mr-3">fact_check</span>
            <p>Review ebook spelling fixes</p>
          </div>
          <div v-if="canEdit && ebookPendingCount" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="applyAllSuggestions">
            <span class="material-symbols text-xl mr-3">done_all</span>
            <p>Apply all ebook spellings ({{ ebookPendingCount }})</p>
          </div>
          <div v-if="canEdit && ebookPendingCount" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="ignoreAllSuggestions">
            <span class="material-symbols text-xl mr-3">block</span>
            <p>Ignore all ebook spellings ({{ ebookPendingCount }})</p>
          </div>
          <!-- Book analysis: everything a finished transcription gets, again, without transcribing the audio again -->
          <div v-if="canEdit && status && status.status === 'done'" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="runAnalysis">
            <span class="material-symbols text-xl mr-3">manage_search</span>
            <div>
              <p>Book analysis</p>
              <p v-if="analysisBusy" class="text-xs text-fg-muted">{{ status.ebookCheckMessage || 'Analysing the book…' }}</p>
              <p v-else class="text-xs text-fg-muted">Sync the book with the audio and check it again, without re-transcribing</p>
            </div>
          </div>
          <!-- next to Re-transcribe: compare the transcript with the book now (it also runs by itself whenever the book has an ebook) -->
          <div v-if="canEdit && status && status.status === 'done'" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="runEbookCheck">
            <span class="material-symbols text-xl mr-3">spellcheck</span>
            <div>
              <p>Check spelling against the book</p>
              <p v-if="status.ebookCheck === 'unavailable'" class="text-xs text-fg-muted">No ebook found last time</p>
              <p v-else-if="status.ebookCheck === 'done' && ebookIgnoredCount" class="text-xs text-fg-muted">{{ ebookIgnoredCount }} ignored · tap to review them</p>
              <p v-else-if="status.ebookCheck === 'done'" class="text-xs text-fg-muted">Checked · runs again after changes</p>
            </div>
          </div>
          <div v-if="status && status.status === 'done' && hasEbook" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="realignReadAlong">
            <span class="material-symbols text-xl mr-3">sync_alt</span>
            <div>
              <p>Re-align read along</p>
              <p class="text-xs text-fg-muted">Match the book to the narration again</p>
            </div>
          </div>
          <div v-if="canEdit && !remoteDeviceJob" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover" @click="retranscribe">
            <span class="material-symbols text-xl mr-3">refresh</span>
            <p>Re-transcribe…</p>
          </div>
          <div v-if="canEdit && !remoteDeviceJob" class="px-4 py-3 flex items-center cursor-pointer hover:bg-bg-hover text-error" @click="deleteTranscript">
            <span class="material-symbols text-xl mr-3">delete</span>
            <p>Delete transcription</p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { AbsAudioPlayer } from '@/plugins/capacitor'
import { Transcriber } from '@/plugins/transcriber'
import { Dialog } from '@capacitor/dialog'
import { Clipboard } from '@capacitor/clipboard'
import { KeepAwake } from '@capacitor-community/keep-awake'
import transcriptLines from '@/mixins/transcriptLines'
import { palette, themeForApp, withCoverAccent } from '@/components/readers/readerThemes'
import { parseBookmark } from '@/plugins/bookmarks'
import { buildKaraoke, wordAt } from '@/plugins/karaoke'
import { buildShade, themeColors } from '@/plugins/coverShade'
import { einkButton, einkTint } from '@/plugins/einkButton'
import { warnPowerSaving } from '@/plugins/powerSaveNotice'
import { AbsDevice } from '@/plugins/capacitor/AbsDevice'

// Karaoke: light each word up a touch early, the eye needs a moment to find it
const KARAOKE_LEAD = 0.2

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default {
  mixins: [transcriptLines],
  props: {
    /** height of the player's controls below (when the full player is open over Transcription) */
    bottomInset: { type: Number, default: 0 },
    value: Boolean,
    itemKey: String,
    title: String,
    currentTime: { type: Number, default: 0 },
    isPlaying: Boolean,
    coverRgb: String,
    coverBgIsLight: Boolean,
    /** e-ink: the cover's colour for the buttons (the page itself stays plain) */
    buttonRgb: String,
    buttonIsLight: Boolean,
    /** Audiobookshelf item id, or the local item id for books only on the phone */
    bookmarkItemId: String,
    /** () => Promise<number>, exact player position */
    getTime: Function,
    /** playback speed, to follow the voice between position checks */
    playbackRate: { type: Number, default: 1 },
    /**
     * Reading mode (opened from the book page, the player isn't involved): tapping a line opens that
     * section as continuous text; tapping a paragraph marks it, and "Play from here" starts listening there.
     */
    reading: Boolean,
    /** The book has an ebook: offer Read along (the book itself, words highlighted as they're read) */
    hasEbook: Boolean,
    /** the item with the ebook (local or server), for Read along inside the panel */
    ebookItem: Object
  },
  data() {
    return {
      loading: false,
      models: [],
      selectedModelId: null,
      starting: false,
      modelDownload: null,
      searchInput: '',
      query: '',
      searchTimeout: null,
      followPlayback: true,
      lastUserScroll: 0,
      liveTime: 0,
      kIndex: -1,
      timePoll: null,
      listeners: [],
      showMenu: false,
      topFaded: false,
      ebookCheckData: null,
      discrepancyWarning: 'Discrepancy may be caused by narrator ad-libs or edits between book and audiobook.',
      showEbookSheet: false,
      ebookBusy: false,
      lastScrolledIndex: -1,
      /** where a new transcription runs: server | device */
      /** server | device | none (offline and the phone not chosen) */
      engine: 'server',
      serverInfo: null,
      /** offline | no-server | lengthy */
      phonePrompt: null,
      /** ask | never: offer to transcribe on the phone when offline */
      offlinePref: localStorage.getItem('offlineTranscribe') === 'never' ? 'never' : 'ask',
      showBookmarks: false,
      editingBookmark: null,
      /** lyrics: timed lines; karaoke: paragraphs with the narrated word highlighted */
      viewMode: ['karaoke', 'readalong'].includes(localStorage.getItem('transcriptionView')) ? localStorage.getItem('transcriptionView') : 'lyrics',
      readAlongOpened: false,
      // Read along with the audiobook put aside: just the book, with page controls and the dictionary
      bookMode: false,
      // read mode for a book without an ebook: the transcript as it is, no player controls, words can be looked up
      txReading: false,
      // each view is drawn the first time it's shown and then kept, so switching back and forth is instant
      lyricsOpened: false,
      // the word held for its meaning: { text, word, canHighlight, canPlayFromHere }
      dictSel: null,
      karaokeOpened: false,
      // loaded for this book and kept up to date in the background while the audio plays
      warm: false,
      loadedKey: null,
      // the line being narrated (follows the voice between position checks)
      lineNow: -1,
      karaokeSize: Number(localStorage.getItem('karaokeTextSize')) || 18,
      showTextSize: false,
      ebookText: null,
      ebookTextFor: null,
      karaokeVersion: 0,
      karaokeTimer: null
    }
  },
  computed: {
    /** Only admins change or delete a transcript (spelling fixes, analysis, re-transcribe, cancel, delete) */
    canEdit() {
      return !!this.$store.getters['user/getIsAdminOrUp']
    },
    syncOffset() {
      return this.$store.state.device.syncOffset || 0
    },
    /** the nudge plus the headphones' delay */
    timeShift() {
      return this.$store.getters['device/timeShift'] || 0
    },
    syncOffsetLabel() {
      const v = this.syncOffset
      const d = this.$store.state.device.outputDelay || 0
      const base = v === 0 ? 'in step with the voice' : `${Math.abs(v).toFixed(1)} s ${v > 0 ? 'earlier' : 'later'}`
      return d >= 0.08 ? `${base} · ${Math.round(d * 1000)} ms headphone delay allowed for` : base
    },
    /** colours for the dictionary card: the e-reader palette for the app's theme */
    dictPalette() {
      return withCoverAccent(palette(themeForApp(this.$store.getters['device/readerTheme'])), this.$store.state.coverAccentRgb)
    },
    // App theme colours (same as the book page and its "Your Progress" bar) instead of the cover
    // colour, so text is always readable in dark, black and light themes
    bgColor() {
      return 'rgb(var(--color-bg))'
    },
    /** Cover colour fading into the page colour, like the full-screen player (not on e-ink) */
    shade() {
      const theme = this.$store.getters['device/theme'] || ''
      if (theme.startsWith('eink') || !this.coverRgb) return null
      const c = themeColors()
      return buildShade(this.coverRgb, c.bg, c.fg)
    },
    textColor() {
      return 'rgb(var(--color-fg))'
    },
    bookmarks() {
      return this.$store.getters['bookmarks/forItem'](this.bookmarkItemId)
    },
    /** Read along runs here for EPUBs (other formats open the full reader) */
    /** Read along (following): the app's player bar below, like in every other book */
    useMiniPlayer() {
      // Lyrics, Karaoke and Read along all sit above the player bar (the same in every mode and book)
      return this.value && !this.reading && this.hasTranscript && !this.bookMode && !this.txReading
    },
    /** The read-mode / listen button sits above the bottom bar when one is showing, never on top of it */
    bookBtnBottom() {
      if (this.reading || (!this.bookMode && !this.txReading && !this.useMiniPlayer)) return '104px'
      return '16px'
    },
    /** The same background gradient as the panel behind it */
    bookBtnStyle() {
      return { bottom: this.bookBtnBottom, ...this.bookGradientStyle }
    },
    /** Coloured like the player's play button: the book cover's colour, white or dark text to suit it */
    /** e-ink: a light band of the book's colour behind the header (the reading area stays white) */
    einkHeaderStyle() {
      if (!this.isEinkTheme || !this.buttonRgb) return null
      const t = einkTint(this.buttonRgb)
      return t ? { backgroundColor: t } : null
    },
    bookGradientStyle() {
      if (this.isEinkTheme) return (this.buttonRgb && einkButton(this.buttonRgb, this.buttonIsLight)) || { backgroundColor: '#fff', color: '#000', border: '2px solid #000' }
      if (!this.coverRgb) return { backgroundColor: 'rgb(var(--color-fg))', color: 'rgb(var(--color-bg))' }
      return { backgroundColor: this.coverRgb, color: this.coverBgIsLight ? 'rgb(30, 30, 30)' : '#fff' }
    },
    /** Playing: the screen lock button (paused: the read button takes its place) */
    showLockBtn() {
      return this.value && this.isPlaying && !this.bookMode && !this.txReading && this.hasTranscript && !this.dictSel
    },
    screenLocked() {
      return this.$store.state.screenLocked
    },
    showBookModeBtn() {
      // Lyrics, Karaoke and Read along alike (it opens the book in Read along)
      return this.value && !this.isPlaying && !this.bookMode && !this.txReading && this.hasTranscript && !this.dictSel
    },
    canReadAlongHere() {
      const f = this.ebookItem && this.ebookItem.media && this.ebookItem.media.ebookFile
      if (!f) return false
      return (f.ebookFormat || (f.metadata && f.metadata.ext) || '').toLowerCase().replace(/^\./, '') === 'epub'
    },
    isEinkTheme() {
      return (this.$store.getters['device/theme'] || '').startsWith('eink')
    },
    /** real colours for the book's frame (it can't see the app's CSS variables) */
    readAlongTheme() {
      const c = themeColors()
      const p = this.dictPalette
      const eink = this.isEinkTheme
      const light = !!(p && p.light)
      const theme = this.$store.getters['device/theme'] || ''
      const page = (p && p.page) || `rgb(${(c.bg || '18 18 18').trim()})`
      // The narrated word looks like Karaoke's: a soft orange tint, underlined. Black-and-white e-ink: a light
      // grey with a black underline (colour can only be dots there).
      const bw = theme === 'eink' || theme === 'eink-dark'
      const colourEink = theme.startsWith('eink-color')
      // Karaoke's look: the word in an outlined box with a soft tint (e-ink: plus the underline), in Karaoke's colours
      const highlight = this.accentSoft
      const underline = bw ? (light ? '#000' : '#fff') : this.accent
      return {
        // colour screens: the page is see-through, so the cover shading behind carries on as in Lyrics and Karaoke
        bg: !eink && this.shade ? 'transparent' : page,
        paper: page,
        underline,
        box: true,
        boxUnderline: eink,
        // colour e-ink: print-like type (slightly heavier strokes, which e-ink otherwise draws grey; wider margins)
        weight: colourEink ? 470 : null,
        gutter: colourEink ? 32 : null,
        fg: (p && p.fg) || `rgb(${(c.fg || '232 232 232').trim()})`,
        panel: (p && p.panel) || '#262626',
        border: (p && p.border) || 'rgba(255,255,255,0.15)',
        bar: (p && p.bar) || '#1a1a1a',
        field: (p && p.field) || '#1c1a19',
        faint: (p && p.faint) || '#6c6763',
        accent: (p && p.accent) || '#ff8c1a',
        onAccent: (p && p.onAccent) || '#1a0d02',
        highlight
      }
    },
    viewModes() {
      const modes = [
        { id: 'lyrics', label: 'Lyrics', icon: 'lyrics' },
        { id: 'karaoke', label: 'Karaoke', icon: 'article' }
      ]
      if (this.hasEbook) modes.push({ id: 'readalong', label: 'Read along', icon: 'menu_book' })
      return modes
    },
    /** Karaoke's colour; black-and-white e-ink: ink (colour turns into grey dots there) */
    accent() {
      const t = this.$store.getters['device/theme'] || ''
      if (t === 'eink') return '#000'
      if (t === 'eink-dark') return '#fff'
      return '#e49b4f'
    },
    /** colour e-ink: white and black areas with thin colour lines, as on paper (colour fills are drawn as dots) */
    colourEink() {
      return (this.$store.getters['device/theme'] || '').startsWith('eink-color')
    },
    accentSoft() {
      const t = this.$store.getters['device/theme'] || ''
      if (t.startsWith('eink-color')) return 'transparent'
      if (t === 'eink') return 'rgba(0, 0, 0, 0.08)'
      if (t === 'eink-dark') return 'rgba(255, 255, 255, 0.16)'
      return 'rgba(228, 155, 79, 0.14)'
    },
    /** LCD / OLED (not e-ink, not low power): the word highlight slides from word to word */
    smoothWords() {
      return !this.isEinkTheme && !this.$store.getters['device/isEink'] && this.$store.getters['device/perf'].tier !== 'low'
    },
    /** paragraphs of the karaoke model, with their index (rebuilt when lines or the ebook text change) */
    karaokeParagraphs() {
      this.karaokeVersion // dependency
      const m = this._karaoke
      return m ? m.paragraphs.map((p, i) => ({ ...p, i })) : []
    },
    karaokeSource() {
      this.karaokeVersion // dependency
      return this._karaoke ? this._karaoke.source : null
    },
    karaokeNote() {
      if (this.query || !this._karaoke) return ''
      this.karaokeVersion // dependency
      if (this.karaokeSource === 'ebook') return `Text from ${this._karaoke.ebookTitle || 'the ebook'}, timed to the narration`
      if (this.status && this.status.status === 'done') return this.ebookText ? "The ebook's text doesn't match this narration, so the transcript is shown." : 'Showing the transcript. Check spelling against the ebook (⋮ menu) to use the book’s own text here.'
      return ''
    },
    karaokeFiltered() {
      if (!this.query) return this.karaokeParagraphs
      const q = this.query.toLowerCase()
      const terms = q.split(/\s+/).filter(Boolean)
      return this.karaokeParagraphs.filter((p) => {
        const t = p.t.toLowerCase()
        return t.includes(q) || terms.every((w) => t.includes(w))
      })
    },
    /** { k, pi, wi } of the word being narrated */
    karaokeActive() {
      this.karaokeVersion // dependency
      const m = this._karaoke
      if (!m || !m.times.length) return { k: -1, pi: -1, wi: -1 }
      const k = this.kIndex
      if (k < 0 || k >= m.refs.length) return { k: -1, pi: -1, wi: -1 }
      const [pi, wi] = m.refs[k]
      return { k, pi, wi }
    },
    sortedBookmarks() {
      return this.bookmarks
    },
    /** line index -> icon, for lines that have a bookmark or are inside a clip */
    bookmarkedLines() {
      const map = new Map()
      if (!this.lines.length) return map
      const indexAt = (t) => {
        let lo = 0
        let hi = this.lines.length - 1
        let ans = -1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (this.lines[mid].s <= t + 0.3) {
            ans = mid
            lo = mid + 1
          } else hi = mid - 1
        }
        return ans
      }
      this.bookmarks.forEach((bm) => {
        const p = parseBookmark(bm)
        const from = indexAt(p.start)
        const to = p.kind === 'clip' ? indexAt(p.end - 0.5) : from
        for (let i = Math.max(0, from); i <= to && i >= 0; i++) if (!map.has(i) || p.kind === 'mark') map.set(i, p.kind === 'clip' ? 'content_cut' : 'bookmark')
      })
      return map
    },
    online() {
      return !!(this.$store.state.user.user && this.$store.state.networkConnected !== false)
    },
    /** The server can transcribe for this user right now */
    serverUsable() {
      return this.online && !!(this.serverInfo && this.serverInfo.canTranscribe && this.serverInfo.apiKeyConfigured)
    },
    serverAvailable() {
      return !!(this.serverInfo && this.serverInfo.available)
    },
    serverWhere() {
      const d = this.serverInfo && this.serverInfo.device
      if (!d) return 'on the server'
      return d.type === 'cuda' ? `on the server's GPU${d.gpu ? ` (${d.gpu})` : ''}` : 'on the server'
    },
    canStartHere() {
      if (this.engine !== 'server') return true
      return !!(this.serverInfo && this.serverInfo.canTranscribe && this.serverInfo.apiKeyConfigured)
    },
    isServerSource() {
      return !!this.status && this.status.source === 'server'
    },
    /** Another phone is transcribing this book; we only follow along */
    remoteDeviceJob() {
      const s = this.status
      return !!s && s.source === 'server' && s.engine === 'device' && (s.status === 'running' || s.status === 'queued')
    },
    originLabel() {
      const s = this.status
      if (!s) return ''
      if (s.source === 'server' && s.engine === 'device') return `made on ${s.deviceName || 'another phone'}`
      if (s.source === 'server' || s.origin === 'server') return 'made on the server'
      if (s.deviceName) return `made on ${s.deviceName}`
      return ''
    },
    ebookCheckBusy() {
      return this.status && (this.status.ebookCheck === 'running' || this.status.ebookCheck === 'queued')
    },
    showEbookCard() {
      const s = this.status
      if (!s || s.status !== 'done' || !s.ebookCheck) return false
      // the bar goes away once nothing is left to review (after Ignore all, or nothing to fix)
      if (s.ebookCheck === 'done') return (this.ebookCheckData ? this.ebookPendingCount : s.ebookSuggestions || 0) > 0
      return ['queued', 'running', 'error'].includes(s.ebookCheck)
    },
    /** Book analysis waiting or running on the server */
    analysisBusy() {
      return !!this.status && (this.status.analysis === 'queued' || this.status.analysis === 'running')
    },
    /** suggestions dismissed with Ignore (they can be looked at again) */
    ebookIgnoredCount() {
      const list = (this.ebookCheckData && this.ebookCheckData.suggestions) || []
      return list.filter((x) => x.status === 'ignored').length
    },
    ebookPendingCount() {
      const list = (this.ebookCheckData && this.ebookCheckData.suggestions) || []
      return list.filter((x) => x.status === 'pending').length
    },
    ebookCardTitle() {
      const s = this.status
      if (this.ebookCheckBusy) return 'Comparing with the ebook for spelling…'
      if (s.ebookCheck === 'error') return "Couldn't compare with the ebook"
      const n = this.ebookCheckData ? this.ebookPendingCount : s.ebookSuggestions || 0
      if (n) return `${n} possible spelling error${n === 1 ? '' : 's'} found using the ebook`
      return 'Checked against the ebook: nothing to fix'
    },
    /** pending ebook suggestions by line start → [{ wi, wn }] */
    suggestionMap() {
      const map = new Map()
      const list = (this.ebookCheckData && this.ebookCheckData.suggestions) || []
      list.forEach((x) => {
        if (x.status !== 'pending') return
        const k = Math.round(x.s * 100)
        if (!map.has(k)) map.set(k, [])
        map.get(k).push(x)
      })
      return map
    },
    showProgressCard() {
      const s = this.status
      if (!s || s.status === 'done' || s.status === 'none') return false
      return !(s.status === 'error' && !this.hasTranscript)
    },
    isActive() {
      return this.status && (this.status.status === 'running' || this.status.status === 'queued')
    },
    selectedModel() {
      return this.models.find((m) => m.id === this.selectedModelId)
    },
    progressPercent() {
      if (!this.status) return 0
      if (this.status.phase === 'model' || this.status.phase === 'audio') return Math.round((this.status.phaseProgress || 0) * 100)
      return Math.round((this.status.progress || 0) * 100)
    },
    progressTitle() {
      const s = this.status
      if (!s) return ''
      if (this.remoteDeviceJob) return `Transcribing on ${s.deviceName || 'another phone'}… ${Math.round((s.progress || 0) * 100)}%`
      if (s.status === 'error') return 'Transcription stopped'
      if (s.status === 'paused') return `Paused at ${Math.round((s.progress || 0) * 100)}%`
      if (s.status === 'queued') return 'Waiting to start…'
      if (s.phase === 'model') return this.isServerSource ? 'Downloading speech model to the server…' : `Downloading speech model… ${this.progressPercent}%`
      if (s.phase === 'audio') return `Fetching audio from server… ${this.progressPercent}%`
      return `${this.isServerSource ? 'Transcribing on the server' : 'Transcribing'}… ${this.progressPercent}%`
    },
    progressSubtitle() {
      const s = this.status
      if (!s) return ''
      if (s.status === 'error') return s.error || 'Unknown error'
      if (this.remoteDeviceJob) return `${s.linesCount || 0} lines · new lines arrive each time that phone checks in`
      const parts = [`${s.linesCount || 0} lines`]
      if (s.status === 'running' && s.speed > 0 && s.phase === 'transcribing') {
        parts.push(`${s.speed.toFixed(1)}× real time`)
        const left = (s.durationSec - (s.doneSec || 0)) / s.speed
        if (left > 0) parts.push(`~${this.formatDuration(left)} left`)
      }
      parts.push(this.modelName(s.modelId))
      return parts.join(' · ')
    },
    searchRegex() {
      if (!this.query) return null
      const terms = this.query
        .split(/\s+/)
        .filter((w) => w)
        .map(escapeRegex)
      if (!terms.length) return null
      return new RegExp(`(${terms.join('|')})`, 'gi')
    },
    filteredLines() {
      if (!this.query) return this.lines
      const q = this.query.toLowerCase()
      const terms = q.split(/\s+/).filter((w) => w)
      // Exact phrase matches first, then lines containing all the words
      return this.lines.filter((l) => {
        const t = l.lower
        return t.includes(q) || terms.every((w) => t.includes(w))
      })
    }
  },
  watch: {
    value(val) {
      if (!val) this.txReading = false // closed: read mode ends
      if (val) warnPowerSaving(this)
      // the screen stays on while Lyrics / Karaoke is open
      ;(val || this.isPlaying ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {})
      if (val) this.open()
      else this.onClose()
    },
    itemKey() {
      // another book: start over (and get it ready in the background if it's playing)
      this.teardown()
      this.warm = false
      this.loadedKey = null
      this.lyricsOpened = this.viewMode === 'lyrics'
      this.karaokeOpened = this.viewMode === 'karaoke'
      this.readAlongOpened = this.viewMode === 'readalong'
      if (this.value) this.open()
      else if (this.isPlaying) this.warmUp()
    },
    isPlaying(p) {
      if (p && this.bookMode) this.bookMode = false
      if (p && this.txReading) this.txReading = false // playing again: back to listening
      // As soon as a book plays, Lyrics and Karaoke get ready and follow it, so opening them is instant
      if (p && !this.value && this.loadedKey !== this.itemKey) this.warmUp()
    },
    currentTime(t) {
      // The player's own clock ticks once a second and is a little behind the faster position checks: only
      // take it when paused or after a jump, or it pulls the highlight back every second
      if (!this.isPlaying || Math.abs(t - this.liveTime) > 2) {
        this.liveTime = t
        this._kAnchor = { t, at: performance.now() }
      }
    },
    searchInput(val) {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => {
        this.query = (val || '').trim()
        if (!this.query) this.$nextTick(() => this.scrollToActive(true))
      }, 200)
    },
    lineNow() {
      if (this.value && this.viewMode === 'lyrics' && this.followPlayback && !this.query) this.scrollToActive(false)
    },
    viewMode: {
      immediate: true,
      handler(m) {
        if (m !== 'readalong') this.bookMode = false
        this.topFadeSoon && this.topFadeSoon()
        if (m === 'karaoke') this.karaokeOpened = true
        else if (m === 'readalong') this.readAlongOpened = true
        else this.lyricsOpened = true
      }
    },
    liveTime(t) {
      this.updateKaraokeIndex(t)
      this.updateLineIndex(t)
      if (this.readAlongOpened && this.$refs.readAlong) this.$refs.readAlong.tick(t)
    },
    canReadAlongHere(ok) {
      if (!ok && this.viewMode === 'readalong') this.viewMode = 'lyrics'
    },
    karaokeVersion() {
      this.updateKaraokeIndex(this.liveTime)
    },
    'karaokeActive.pi'(pi, old) {
      if (this.value && this.viewMode === 'karaoke' && this.followPlayback && !this.query && pi >= 0 && pi !== old) this.scrollToParagraph(pi, false)
    },
    'karaokeActive.wi'() {
      // long paragraphs: keep the current word on screen
      if (this.value && this.viewMode === 'karaoke' && this.followPlayback && !this.query) this.keepWordVisible()
    },
    useMiniPlayer: {
      immediate: true,
      handler(on) {
        this.$emit('miniPlayer', on)
      }
    },
    txReading(on) {
      if (on) {
        this.followPlayback = false
        return
      }
      this.dictSel = null
      // back to the audio: where it was paused, not wherever the reading went
      if (!this.isPlaying) this.liveTime = this.currentTime
      this.followPlayback = true
      this.$nextTick(() => this.scrollToActive(true))
    },
    dictSel(sel) {
      if (!sel) this.markLookup(null) // the definition closed: the word isn't marked any more
    },
    bookMode(on) {
      this.dictSel = null
      if (this.$refs.readAlong) this.$refs.readAlong.setReading(on)
    },
    lines() {
      this.pushLockscreenLines()
      this.scheduleKaraoke()
      this.updateLineIndex(this.liveTime)
    },
    'status.ebookCheck'(v, old) {
      // (two watchers on this used to override each other, so the first never ran)
      if (v === 'done' && old !== 'done') this.loadEbookCheck()
      if (v === 'done') this.loadEbookText(true)
    },
    'status.revision'() {
      // newer copy from the server or another phone (maybe with the ebook text)
      if (this.viewMode === 'karaoke' && this.status && this.status.status === 'done') this.loadEbookText(true)
    }
  },
  methods: {
    /** Only re-renders when the narrated word changes (the time itself can move every frame) */
    updateKaraokeIndex(t) {
      const m = this._karaoke
      const k = m && m.times.length ? wordAt(m, (t || 0) + KARAOKE_LEAD + this.timeShift) : -1
      if (k !== this.kIndex) this.kIndex = k
    },
    /**
     * Between position checks, follow the voice every frame from the last known position and the
     * playback speed, so the outline moves with the word instead of up to a check behind.
     * Not on e-ink or in low power (the 4-per-second checks are enough there).
     */
    /** The narrated line, only set when it changes */
    updateLineIndex(t) {
      const lines = this.lines
      const x = (t || 0) + 0.25 + this.timeShift
      let lo = 0
      let hi = lines.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (lines[mid].s <= x) {
          ans = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      if (ans !== this.lineNow) this.lineNow = ans
    },
    karaokeFrames() {
      // e-ink, Karaoke: step exactly when the next word starts (nothing redrawn in between)
      if (this.$store.getters['device/isEink'] && this.viewMode === 'karaoke' && this.$store.getters['device/perf'].tier !== 'low') return this.karaokeEinkStep()
      if (this._kFrame) return
      const step = () => {
        this._kFrame = 0
        const perf = this.$store.getters['device/perf']
        const a = this._kAnchor
        if (!this.value || !this.isPlaying || !a || this.$store.getters['device/isEink'] || perf.tier === 'low' || document.hidden) return
        const ahead = Math.min(1.5, ((performance.now() - a.at) / 1000) * (this.playbackRate || 1))
        if (this.viewMode === 'karaoke') this.updateKaraokeIndex(a.t + ahead)
        else if (this.viewMode === 'readalong') this.$refs.readAlong && this.$refs.readAlong.tick(a.t + ahead)
        else this.updateLineIndex(a.t + ahead)
        this._kFrame = setTimeout(step, 80)
      }
      this._kFrame = setTimeout(step, 80) // ~12 a second, not every display frame: easier on the battery
    },
    karaokeEinkStep() {
      clearTimeout(this._kFrame)
      this._kFrame = 0
      const a = this._kAnchor
      const m = this._karaoke
      if (!this.value || !this.isPlaying || !a || !m || !m.times.length || document.hidden || this.viewMode !== 'karaoke') return
      const rate = this.playbackRate || 1
      const now = a.t + Math.min(1.5, ((performance.now() - a.at) / 1000) * rate)
      this.updateKaraokeIndex(now)
      // when the next word starts (the same lead and sync shift updateKaraokeIndex uses)
      const nextT = m.times[this.kIndex + 1]
      if (nextT == null) return
      const due = nextT - KARAOKE_LEAD - this.timeShift
      const ms = Math.max(30, ((due - now) / rate) * 1000 + 15)
      this._kFrame = setTimeout(() => this.karaokeEinkStep(), Math.min(ms, 2000))
    },
    overlay(alpha) {
      // Cards use the "Your Progress" bar colour; buttons and tracks a slightly lighter shade
      return alpha >= 0.18 ? 'rgb(var(--color-bg-hover))' : 'rgb(var(--color-primary))'
    },
    /** Read along's top bar: folds away a moment after the audio starts; a tap on the page or a pause brings it back */
    /** Read along keeps its top bar (title, modes, search) like Lyrics and Karaoke; reading mode has its own bars */
    topFadeSoon() {
      this.topFaded = false
    },
    topShow() {
      this.topFaded = false
      this.topFadeSoon(4000)
    },
    searchFromReadAlong() {
      this.setViewMode('lyrics')
      this.$nextTick(() => setTimeout(() => this.$refs.searchInput && this.$refs.searchInput.focus(), 150))
    },
    close() {
      this.$emit('input', false)
    },
    modelName(id) {
      const m = this.models.find((m) => m.id === id)
      return m ? m.name : id || ''
    },
    formatBytes(b) {
      if (!b) return '0 MB'
      if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB'
      return Math.round(b / 1e6) + ' MB'
    },
    formatDuration(sec) {
      const h = Math.floor(sec / 3600)
      const m = Math.round((sec % 3600) / 60)
      return h ? `${h}h ${m}m` : `${m}m`
    },
    renderLine(line) {
      const fixes = !this.query && this.suggestionMap.get(Math.round(line.s * 100))
      if (!fixes) return this.renderText(line.t)
      // Underline words the ebook spells differently (same word splitting as the Android side)
      const marked = new Map()
      fixes.forEach((f) => {
        for (let k = 0; k < (f.wn || 1); k++) marked.set(f.wi + k, f)
      })
      const re = /[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu
      let out = ''
      let last = 0
      let wi = 0
      let m
      while ((m = re.exec(line.t)) !== null) {
        out += escapeHtml(line.t.slice(last, m.index))
        const f = marked.get(wi)
        out += f ? `<span class="t-sugg" data-ebook-msg="${escapeHtml(`Heard “${f.heard}”, the ebook says “${f.ebook}”.`)}" title="Ebook: ${escapeHtml(f.ebook)}. ${escapeHtml(this.discrepancyWarning)}">${escapeHtml(m[0])}</span>` : escapeHtml(m[0])
        last = m.index + m[0].length
        wi++
      }
      return out + escapeHtml(line.t.slice(last))
    },
    async loadEbookCheck() {
      if (!this.itemKey) return
      try {
        const res = await Transcriber.getEbookCheck({ key: this.itemKey })
        this.ebookCheckData = res && res.check ? res.check : null
      } catch (error) {
        console.error('[Transcription] ebook check load failed', error)
      }
    },
    /** The server compares the transcript with the ebook; the card follows its progress and shows the result */
    /** Re-align read along: the open reader (or the panel's book) matches the book to the narration again */
    realignReadAlong() {
      this.showMenu = false
      this.$eventBus.$emit('readalong-realign', { key: this.itemKey })
      this.$toast.info('Lining up the book with the narration again…')
    },
    /** After Ignore all: the ignored spellings back for review */
    async reviewIgnored() {
      this.showMenu = false
      const ids = ((this.ebookCheckData && this.ebookCheckData.suggestions) || []).filter((x) => x.status === 'ignored').map((x) => x.id)
      if (!ids.length) return
      try {
        await Transcriber.updateSuggestions({ key: this.itemKey, ids, status: 'pending' })
        await this.loadEbookCheck()
        this.showEbookSheet = true
      } catch (e) {
        this.$toast.error(e.message || String(e))
      }
    },
    async runEbookCheck() {
      this.showMenu = false
      // spellings dismissed with Ignore: Check spelling brings them back for review
      if (this.status && this.status.ebookCheck === 'done') {
        if (!this.ebookCheckData) await this.loadEbookCheck()
        if (this.ebookIgnoredCount) return this.reviewIgnored()
      }
      const key = this.itemKey
      try {
        const st = await Transcriber.checkWithEbook({ key })
        this.status = { ...(this.status || {}), ebookCheck: st.ebookCheck, ebookCheckMessage: st.ebookCheckMessage, ebookSuggestions: st.ebookSuggestions }
        this.$toast.info('Comparing with the book on the server…')
        this.followServerCheck(key)
      } catch (error) {
        this.$toast.error(error.message || String(error))
      }
    },
    /**
     * Book analysis: the server reads the ebook again, compares it with the transcript and rebuilds the book's
     * text and the .lrc files (no new transcription). When it's done this phone fetches the result and lines
     * the book up with the narration again from scratch (read along, red and grey marks).
     */
    async runAnalysis() {
      this.showMenu = false
      if (this.analysisBusy) return this.$toast.info(this.status.ebookCheckMessage || 'The book analysis is already running')
      const key = this.itemKey
      try {
        const st = await Transcriber.analyzeBook({ key })
        this.status = { ...(this.status || {}), analysis: st.analysis, ebookCheck: st.ebookCheck, ebookCheckMessage: st.ebookCheckMessage, ebookSuggestions: st.ebookSuggestions }
        this.$toast.info('Analysing the book on the server…')
      } catch (error) {
        return this.$toast.error(error.message || String(error))
      }
      clearTimeout(this.checkTimer)
      for (let i = 0; i < 600 && key === this.itemKey; i++) {
        await new Promise((r) => (this.checkTimer = setTimeout(r, 3000)))
        const st = await Transcriber.serverStatus(key).catch(() => null)
        if (!st || key !== this.itemKey) continue
        this.status = { ...(this.status || {}), analysis: st.analysis, ebookCheck: st.ebookCheck, ebookCheckMessage: st.ebookCheckMessage, ebookSuggestions: st.ebookSuggestions }
        if (st.analysis === 'queued' || st.analysis === 'running') continue
        // the new copy (book text, suggestions) onto this phone, then match the book to the narration afresh
        await Transcriber.prepare(key).catch(() => null)
        await this.loadEbookCheck()
        this.loadEbookText(true)
        try {
          // readers opened later align from scratch too (each kind of reader once)
          localStorage.setItem(`absplus-ra-fresh:${key}:reader`, '1')
          localStorage.setItem(`absplus-ra-fresh:${key}:panel`, '1')
        } catch (e) {}
        this.$eventBus.$emit('readalong-realign', { key })
        this.$toast.success(st.ebookCheckMessage || 'Book analysis done')
        return
      }
    },
    async followServerCheck(key) {
      clearTimeout(this.checkTimer)
      for (let i = 0; i < 400 && key === this.itemKey; i++) {
        await new Promise((r) => (this.checkTimer = setTimeout(r, 3000)))
        const st = await Transcriber.serverStatus(key).catch(() => null)
        if (!st || key !== this.itemKey) continue
        this.status = { ...(this.status || {}), ebookCheck: st.ebookCheck, ebookCheckMessage: st.ebookCheckMessage, ebookSuggestions: st.ebookSuggestions }
        if (!['queued', 'running'].includes(st.ebookCheck)) {
          if (st.ebookCheck === 'done') {
            await this.loadEbookCheck()
            this.loadEbookText(true)
          }
          return
        }
      }
    },
    async openEbookSheet() {
      this.showMenu = false
      await this.loadEbookCheck()
      this.showEbookSheet = true
    },
    seekFromSheet(time) {
      // the review stays open: the line shows in Lyrics / Karaoke above it
      this.liveTime = time
      this.followPlayback = true
      this.$emit('seek', time)
      this.$nextTick(() => this.scrollToActive(true))
    },
    async applyAllSuggestions() {
      this.showMenu = false
      const list = ((this.ebookCheckData && this.ebookCheckData.suggestions) || []).filter((x) => x.status === 'pending')
      if (!list.length) return
      const { value } = await Dialog.confirm({
        title: 'Apply all',
        message: `Replace ${list.length} word${list.length === 1 ? '' : 's'} in the transcript with the ebook's spelling?\n\n${this.discrepancyWarning}\n\nThe original transcript is kept on this device.`,
        okButtonTitle: 'Apply all',
        cancelButtonTitle: 'Cancel'
      })
      if (!value) return
      await this.updateSuggestions({ ids: list.map((x) => x.id), status: 'applied' })
    },
    async ignoreAllSuggestions() {
      this.showMenu = false
      const list = ((this.ebookCheckData && this.ebookCheckData.suggestions) || []).filter((x) => x.status === 'pending')
      if (!list.length) return
      const { value } = await Dialog.confirm({
        title: 'Ignore all',
        message: `Keep the transcript as it is and dismiss all ${list.length} suggestion${list.length === 1 ? '' : 's'} from the ebook?`,
        okButtonTitle: 'Ignore all',
        cancelButtonTitle: 'Cancel'
      })
      if (!value) return
      await this.updateSuggestions({ ids: list.map((x) => x.id), status: 'ignored' })
      this.$toast.info('Suggestions dismissed')
    },
    async updateSuggestions({ ids, status }) {
      if (!ids || !ids.length) return
      this.ebookBusy = true
      try {
        await Transcriber.updateSuggestions({ key: this.itemKey, ids, status })
        await this.loadEbookCheck()
        if (status === 'applied') {
          await this.fetchLines(true)
          this.$toast.success(`Applied ${ids.length} correction${ids.length === 1 ? '' : 's'}`)
        }
      } catch (error) {
        this.$toast.error(error.message || String(error))
      }
      this.ebookBusy = false
    },
    renderText(text) {
      if (!this.searchRegex) return escapeHtml(text)
      // split() with a capturing group puts the matches at odd indexes
      return text
        .split(this.searchRegex)
        .map((part, i) => (i % 2 ? `<mark class="t-mark">${escapeHtml(part)}</mark>` : escapeHtml(part)))
        .join('')
    },
    lineClass(line) {
      const idx = line.i
      if (this.query) return 't-search'
      if (idx === this.activeIndex) return 't-active'
      if (idx < this.activeIndex) return 't-past'
      return 't-future'
    },
    // ---- hold a word for its meaning (only while paused: while playing, a hold is just a hold)
    lpStart(e) {
      if (e.button !== undefined && e.button !== 0) return
      clearTimeout(this.lpTimer)
      this.lpAt = { x: e.clientX, y: e.clientY, target: e.target }
      this.lpTimer = setTimeout(() => this.lpFire(), 550)
    },
    lpMove(e) {
      if (this.lpAt && Math.hypot(e.clientX - this.lpAt.x, e.clientY - this.lpAt.y) > 8) clearTimeout(this.lpTimer)
    },
    lpEnd() {
      clearTimeout(this.lpTimer)
    },
    lpMenu(e) {
      if (Date.now() - (this.lpFiredAt || 0) < 900) e.preventDefault()
    },
    wordAtPoint(x, y) {
      const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null
      const node = r && r.startContainer
      if (!node || node.nodeType !== 3) return null
      const text = node.data
      const isW = (ch) => /[\p{L}\p{N}'’-]/u.test(ch || '')
      let a = r.startOffset
      let b = r.startOffset
      while (a > 0 && isW(text[a - 1])) a--
      while (b < text.length && isW(text[b])) b++
      const word = text.slice(a, b).replace(/^['’-]+|['’-]+$/g, '')
      if (!word || !/\p{L}/u.test(word)) return null
      const range = document.createRange()
      range.setStart(node, a)
      range.setEnd(node, b)
      if (![...range.getClientRects()].some((q) => x >= q.left - 3 && x <= q.right + 3 && y >= q.top - 3 && y <= q.bottom + 3)) return null
      this.lpRange = range // marked while its definition is open
      return word
    },
    /** The word being looked up stays highlighted while its definition is open (Lyrics / Karaoke) */
    markLookup(range) {
      try {
        if (!window.CSS || !CSS.highlights || !window.Highlight) return
        if (range) CSS.highlights.set('abs-lookup', new Highlight(range))
        else CSS.highlights.delete('abs-lookup')
      } catch (e) {}
    },
    async lpFire() {
      const at = this.lpAt
      if (!at) return
      const word = this.wordAtPoint(at.x, at.y)
      if (!word) return
      this.lpFiredAt = Date.now()
      if (!this.txReading) {
        if (!this.lpHinted) this.$toast.info(this.isPlaying ? 'Pause the audio, then tap the book button to look up words' : 'Tap the book button (read mode) to look up words')
        this.lpHinted = true
        return
      }
      await this.$hapticsImpact()
      try {
        window.getSelection().removeAllRanges()
      } catch (e) {}
      const line = at.target && at.target.closest && at.target.closest('[data-i]')
      const para = at.target && at.target.closest && at.target.closest('[data-pi]')
      this.dictSel = { text: word, word, canHighlight: false, canPlayFromHere: !!(line || para), at: { x: at.x, y: at.y, line: line ? Number(line.dataset.i) : null, para: para ? Number(para.dataset.pi) : null } }
      this.markLookup(this.lpRange)
    },
    /** Held a word in Read along (audio paused) */
    async onReadAlongLookup(d) {
      if (!d || !d.word || !this.bookMode) return
      this.lpFiredAt = Date.now()
      await this.$hapticsImpact()
      this.dictSel = { text: d.word, word: d.word, canHighlight: false, canPlayFromHere: typeof d.time === 'number', at: { x: d.x, y: d.y, time: typeof d.time === 'number' ? d.time : null, line: null, para: null } }
    },
    lookupPlayingHint() {
      if (!this.lpHinted) this.$toast.info('Pause the audio to look up words')
      this.lpHinted = true
    },
    /** Reading mode ✕: back to listening, from the page that was open */
    onExitReading(t) {
      this.bookMode = false
      // ready at this page; it plays when the person presses play
      if (typeof t === 'number') this.$emit('seek', t)
    },
    closeDict() {
      this.dictSel = null
      this.markLookup(null)
      if (this.$refs.readAlong) this.$refs.readAlong.clearLookup()
    },
    /** The lock-screen card shows the narrated line: give it this book's lines (server transcripts aren't on the phone) */
    pushLockscreenLines() {
      if (this.$platform !== 'android' || !this.itemKey || !this.lines.length) return
      clearTimeout(this.lockLinesTimer)
      this.lockLinesTimer = setTimeout(() => {
        const key = this.itemKey
        const lines = this.lines.map((l) => ({ s: l.s, e: l.e, t: l.t }))
        AbsDevice.setLockscreenTranscript({ key, lines }).catch(() => {})
      }, 2500)
    },
    dictCopy() {
      if (this.dictSel) Clipboard.write({ string: this.dictSel.word })
      this.$toast.success('Copied')
    },
    dictSearch() {
      const w = this.dictSel && this.dictSel.word
      this.dictSel = null
      if (w) this.searchInput = w
    },
    /** Listen: play from the held word */
    dictListen() {
      const at = this.dictSel && this.dictSel.at
      this.dictSel = null
      if (!at) return
      this.lpFiredAt = 0
      if (at.time != null) return this.$emit('seek', at.time)
      if (at.para != null) {
        const p = this.karaokeParagraphs.find((x) => x.i === at.para)
        if (p) this.clickParagraph(p, { clientX: at.x, clientY: at.y })
      } else if (at.line != null && this.lines[at.line]) this.clickLine(this.lines[at.line])
    },
    async clickLine(line, event) {
      if (event && Date.now() - (this.lpFiredAt || 0) < 700) return // that was a hold for a word's meaning
      // Tapping an underlined word explains the ebook suggestion instead of seeking
      const sugg = event && event.target && event.target.closest ? event.target.closest('.t-sugg') : null
      if (sugg) {
        await this.$hapticsImpact()
        this.$toast.warning(`${sugg.getAttribute('data-ebook-msg')} ${this.discrepancyWarning}`, { timeout: 6000 })
        return
      }
      if (this.txReading) return // read mode: browse freely, the audio stays where it was paused
      await this.$hapticsImpact()
      if (this.reading) return this.readSection(line.s)
      this.liveTime = line.s
      this.followPlayback = true
      this.$emit('seek', line.s)
      if (this.query) {
        // Leave search so the user sees the line in context
        this.searchInput = ''
        this.query = ''
        this.$nextTick(() => this.scrollToLine(line.i, true))
      }
    },
    blurSearch() {
      if (this.$refs.searchInput) this.$refs.searchInput.blur()
    },
    clearSearch() {
      this.searchInput = ''
      this.query = ''
      this.$nextTick(() => this.scrollToActive(true))
    },
    /** The scroller of the view that's showing (both stay in the page once opened) */
    scrollerEl() {
      return this.$refs[this.viewMode === 'karaoke' ? 'scrollerK' : 'scrollerL'] || null
    },
    userScrolled() {
      this.lastUserScroll = Date.now()
      this.followPlayback = false
    },
    resumeFollow() {
      this.followPlayback = true
      this.scrollToActive(true)
    },
    scrollToActive(instant) {
      if (this.viewMode === 'karaoke') {
        if (this.karaokeActive.pi >= 0) this.scrollToParagraph(this.karaokeActive.pi, instant)
        return
      }
      this.updateLineIndex(this.liveTime)
      if (this.lineNow < 0) return
      this.scrollToLine(this.lineNow, instant)
    },
    scrollToParagraph(index, instant) {
      const node = this.$refs.karaokeList && this.$refs.karaokeList.el(index)
      const scroller = this.scrollerEl()
      if (!node || !scroller) return
      // Like the video: the paragraph being read sits near the top
      const top = node.offsetTop - scroller.clientHeight * 0.12
      scroller.scrollTo({ top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth' })
    },
    keepWordVisible() {
      this.$nextTick(() => {
        const scroller = this.scrollerEl()
        const w = scroller && scroller.querySelector('.k-word')
        if (!w) return
        const r = w.getBoundingClientRect()
        const sr = scroller.getBoundingClientRect()
        if (r.bottom > sr.bottom - 140 || r.top < sr.top) scroller.scrollBy({ top: r.top - sr.top - scroller.clientHeight * 0.3, behavior: 'smooth' })
      })
    },
    /** The read-mode button (any view, audio paused): the book in Read along, without the audiobook */
    enterBookMode() {
      // no ebook to open here (audiobook only): read the transcript itself, as it is
      if (!this.canReadAlongHere) {
        if (this.viewMode === 'readalong') this.setViewMode('lyrics')
        this.txReading = true
        return
      }
      if (this.viewMode !== 'readalong') this.setViewMode('readalong')
      this.$nextTick(() => (this.bookMode = true))
    },
    setViewMode(mode) {
      // read mode: the other view opens at the part being read, not back at the paused point
      const keep = this.txReading && mode !== 'readalong' ? this.readingSpotTime() : null
      // Read along opens the book itself, words highlighted as they're read, at this point
      if (mode === 'readalong' && !this.canReadAlongHere) return this.$emit('openReadAlong', this.liveTime) // PDF, MOBI…: the full reader
      this.viewMode = mode
      if (mode === 'readalong') {
        this.readAlongOpened = true
        this.showTextSize = false
        localStorage.setItem('transcriptionView', mode)
        return
      }
      localStorage.setItem('transcriptionView', mode)
      this.showTextSize = false
      if (mode === 'karaoke') {
        if (!this._karaoke || this._karaokeFor !== this.lines.length) this.buildKaraokeNow()
        this.loadEbookText()
      }
      if (keep != null) {
        this.followPlayback = false
        this.$nextTick(() => setTimeout(() => this.scrollToTime(keep), 60))
        return
      }
      this.followPlayback = true
      this.$nextTick(() => this.scrollToActive(true))
    },
    /** The time of the text at the top of the view being read (read mode browses away from the audio) */
    readingSpotTime() {
      const scroller = this.scrollerEl()
      if (!scroller) return null
      const r = scroller.getBoundingClientRect()
      for (let y = r.top + 24; y < r.bottom; y += 32) {
        const hit = document.elementFromPoint(r.left + r.width * 0.6, y)
        const el = hit && hit.closest && hit.closest('[data-i],[data-pi]')
        if (!el || !scroller.contains(el)) continue
        if (el.hasAttribute('data-i')) {
          const line = this.lines[Number(el.getAttribute('data-i'))]
          if (line) return line.s
        } else {
          const p = this._karaoke && this._karaoke.paragraphs[Number(el.getAttribute('data-pi'))]
          const w = p && p.words.find((x) => x.time != null)
          if (w) return w.time
        }
      }
      return null
    },
    /** Shows the part at [t] in the view that's open, without following the audio */
    scrollToTime(t) {
      const last = (arr, get) => {
        let lo = 0
        let hi = arr.length - 1
        let ans = 0
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (get(arr[mid]) <= t + 0.01) {
            ans = mid
            lo = mid + 1
          } else hi = mid - 1
        }
        return ans
      }
      if (this.viewMode === 'karaoke') {
        const m = this._karaoke
        if (!m || !m.times.length) return
        this.scrollToParagraph(m.refs[last(m.times, (x) => x)][0], true)
      } else if (this.lines.length) {
        const i = last(this.lines, (l) => l.s)
        const node = this.$refs.lyricsList && this.$refs.lyricsList.el(i)
        const scroller = this.scrollerEl()
        if (node && scroller) scroller.scrollTo({ top: Math.max(0, node.offsetTop - 24) })
      }
    },
    setKaraokeSize(n) {
      this.karaokeSize = Math.max(14, Math.min(30, n))
      localStorage.setItem('karaokeTextSize', String(this.karaokeSize))
    },
    async loadEbookText(force) {
      if (!this.itemKey || (!force && this.ebookTextFor === this.itemKey)) return
      this.ebookTextFor = this.itemKey
      try {
        const res = await Transcriber.getEbookText({ key: this.itemKey })
        this.ebookText = (res && res.text) || null
      } catch (e) {
        this.ebookText = null
      }
      this.buildKaraokeNow()
    },
    scheduleKaraoke() {
      if (!this.karaokeOpened) return
      clearTimeout(this.karaokeTimer)
      this.karaokeTimer = setTimeout(() => this.buildKaraokeNow(), this._karaoke ? 1500 : 0)
    },
    buildKaraokeNow() {
      // kept out of Vue's reactivity: tens of thousands of words
      this._karaoke = buildKaraoke(this.lines, this.ebookText)
      this._karaokeFor = this.lines.length
      this.karaokeVersion++
      if (this.followPlayback) this.$nextTick(() => this.scrollToActive(true))
    },
    /** fromWi: when the highlight moved several words in one step, those words are marked too (none skipped) */
    renderParagraph(p, wi, fromWi, toWi) {
      const esc = (x) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
      if (this.query) {
        const terms = this.query.split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        const re = new RegExp(`(${terms.join('|')})`, 'gi')
        return p.t
          .split(re)
          .map((part, i) => (i % 2 ? `<mark class="t-mark">${esc(part)}</mark>` : esc(part)))
          .join('')
      }
      if (wi == null || wi < 0) return esc(p.t)
      // Current paragraph: wrap the word being said; data-o keeps tap-to-seek offsets right
      const w = p.words[wi]
      if (!w) return esc(p.t)
      const first = fromWi != null && fromWi >= 0 && fromWi < wi && p.words[fromWi] ? p.words[fromWi] : w
      const last = toWi != null && toWi > wi && p.words[toWi] ? p.words[toWi] : w
      if (last !== w) {
        // e-ink: a block of words with the one being said a little stronger inside it
        return `<span data-o="0">${esc(p.t.slice(0, first.s))}</span><span class="k-word k-grp" data-o="${first.s}" style="border-color:${this.accent};background-color:${this.accentSoft}"><span data-o="${first.s}">${esc(p.t.slice(first.s, w.s))}</span><span class="k-main" data-o="${w.s}">${esc(p.t.slice(w.s, w.e))}</span><span data-o="${w.e}">${esc(p.t.slice(w.e, last.e))}</span></span><span data-o="${last.e}">${esc(p.t.slice(last.e))}</span>`
      }
      return `<span data-o="0">${esc(p.t.slice(0, first.s))}</span><span class="k-word" data-o="${first.s}" style="border-color:${this.accent};background-color:${this.accentSoft}">${esc(p.t.slice(first.s, w.e))}</span><span data-o="${w.e}">${esc(p.t.slice(w.e))}</span>`
    },
    /** Tap a word to play from it */
    clickParagraph(p, e) {
      if (this.txReading) return // read mode: browse freely, the audio stays where it was paused
      if (e && e.type === 'click' && Date.now() - (this.lpFiredAt || 0) < 700) return // a hold for a word's meaning
      let offset = null
      const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null
      if (range && range.startContainer && range.startContainer.nodeType === 3) {
        const holder = range.startContainer.parentElement
        const base = holder && holder.dataset && holder.dataset.o !== undefined ? Number(holder.dataset.o) : 0
        offset = base + range.startOffset
      }
      let word = null
      if (offset != null) word = p.words.find((w) => offset >= w.s && offset <= w.e) || p.words.find((w) => w.s >= offset)
      const timed = word && word.time != null ? word : p.words.find((w) => w.time != null)
      if (!timed) {
        this.$toast.info("This part isn't in the narration")
        return
      }
      if (this.query) this.clearSearch()
      this.liveTime = timed.time
      this.followPlayback = true
      if (this.reading) return
      this.$emit('seek', timed.time)
    },
    /** Reading mode: show the section around [time] as continuous text (Karaoke view), marked */
    readSection(time) {
      if (this.query) {
        this.searchInput = ''
        this.query = ''
      }
      this.liveTime = time
      this.followPlayback = true
      if (this.viewMode !== 'karaoke') this.setViewMode('karaoke')
      this.$nextTick(() => setTimeout(() => this.scrollToActive(true), 60))
    },
    scrollToLine(index, instant) {
      const node = this.$refs.lyricsList && this.$refs.lyricsList.el(index)
      const scroller = this.scrollerEl()
      if (!node || !scroller) return
      const top = node.offsetTop - scroller.clientHeight * 0.35
      scroller.scrollTo({ top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth' })
      this.lastScrolledIndex = index
    },
    async open() {
      if (this.loadedKey === this.itemKey && this.lines.length) {
        this.showMenu = false
        this.showBookmarks = false
        this.followPlayback = true
        if (!this.isPlaying) this.liveTime = this.currentTime
        this.addListeners()
        this.startTimePoll()
        this.fetchLines(false) // only what's new
        this.$nextTick(() => this.scrollToActive(true))
        return
      }
      this.loading = true
      this._karaoke = null
      this.ebookText = null
      this.ebookTextFor = null
      this.karaokeVersion++
      this.resetTranscript()
      this.ebookCheckData = null
      this.showEbookSheet = false
      this.showMenu = false
      this.showBookmarks = false
      this.searchInput = ''
      this.query = ''
      this.followPlayback = true
      this.liveTime = this.currentTime
      this.addListeners()
      this.startTimePoll()
      try {
        this.serverInfo = await Transcriber.serverInfo()
        this.phonePrompt = null
        let prepared = null
        if (this.itemKey) prepared = await Transcriber.prepare(this.itemKey)
        // The server does the transcribing. The phone is offered only when the server can't
        // (offline, or no transcription add-on), or when picked from the ⋮ menu.
        if (prepared && prepared.source === 'server') this.engine = 'server'
        else if (prepared && prepared.status && prepared.status !== 'none') this.engine = 'device'
        else if (this.serverUsable) this.engine = 'server'
        else {
          this.engine = 'none'
          if (this.offlinePref === 'ask' && Capacitor.getPlatform() === 'android') this.phonePrompt = this.online ? 'no-server' : 'offline'
        }
        if (this.engine !== 'none') await this.loadModels()
        if (this.itemKey) await this.fetchLines(true)
        if (this.viewMode === 'karaoke') this.loadEbookText()
        setTimeout(() => this.$store.dispatch('onboarding/maybeTour', 'transcription'), 600)
      } catch (error) {
        console.error('[Transcription] open failed', error)
      }
      this.loading = false
      if (this.lines.length) {
        this.loadedKey = this.itemKey
        this.warm = true
        this.readyBothViews()
      }
      this.$nextTick(() => this.scrollToActive(true))
    },
    /** In the background while the book plays: load the transcript and draw both views, hidden */
    async warmUp() {
      if (this.warming || !this.itemKey || this.value) return
      this.warming = true
      const key = this.itemKey
      try {
        await new Promise((r) => setTimeout(r, 1500)) // let playback settle first
        if (key !== this.itemKey || this.value) return
        const prepared = await Transcriber.prepare(key)
        if (!prepared || prepared.status === 'none' || key !== this.itemKey) return
        this.engine = prepared.source === 'server' ? 'server' : 'device'
        this.resetTranscript()
        await this.fetchLines(true)
        if (!this.lines.length || key !== this.itemKey) return
        this.liveTime = this.currentTime
        this.loadedKey = key
        this.warm = true
        this.addListeners()
        this.startTimePoll()
        this.readyBothViews()
      } catch (e) {
        console.log('[Transcription] background load failed', e && e.message)
      } finally {
        this.warming = false
      }
    },
    /** Both views drawn (Karaoke a moment later, it has more to work out) and following the narration */
    readyBothViews() {
      this.lyricsOpened = true
      this.updateLineIndex(this.liveTime)
      clearTimeout(this.readyTimer)
      this.readyTimer = setTimeout(() => {
        if (!this.loadedKey) return
        if (!this._karaoke || this._karaokeFor !== this.lines.length) this.buildKaraokeNow()
        this.karaokeOpened = true
        this.loadEbookText()
        // Read along opens the book and lines it up in the background, so it's ready when shown
        if (this.canReadAlongHere && !this.readAlongOpened) setTimeout(() => this.loadedKey && (this.readAlongOpened = true), 3000)
      }, this.value && this.viewMode === 'karaoke' ? 0 : 1200)
    },
    /** Closed: keeps following the narration in the background if it has a transcript */
    onClose() {
      if (this._kFrame) clearTimeout(this._kFrame)
      this._kFrame = 0
      if (!this.warm) this.teardown()
    },
    async clipTime() {
      if (this.getTime) return this.getTime()
      try {
        const data = await AbsAudioPlayer.getCurrentTime()
        if (data && typeof data.value === 'number') return data.value
      } catch (e) {}
      return this.liveTime
    },
    openBookmarks() {
      this.showMenu = false
      this.editingBookmark = null
      this.showBookmarks = true
    },
    /** From the "tap to add a note" toast */
    editBookmarkNote(bm) {
      this.showMenu = false
      this.showBookmarks = true
      this.editingBookmark = this.bookmarks.find((b) => b.time === bm.time) || bm
    },
    seekBookmark(bm) {
      this.showBookmarks = false
      this.liveTime = bm.time
      this.followPlayback = true
      this.$emit('seek', bm.time)
      this.$nextTick(() => this.scrollToActive(true))
    },
    async deleteBookmark(bm) {
      const { value } = await Dialog.confirm({ title: 'Remove bookmark', message: this.$strings.MessageConfirmRemoveBookmark })
      if (!value) return
      await this.$store.dispatch('bookmarks/remove', { libraryItemId: bm.libraryItemId, time: bm.time })
    },
    async loadModels() {
      const res = await Transcriber.getModels({ engine: this.engine })
      this.models = res.models || []
      if (!this.models.find((m) => m.id === this.selectedModelId)) {
        // Server: "Automatic" picks the best model for the book and the server's hardware
        const installed = this.models.find((m) => m.installed)
        this.selectedModelId = this.engine === 'server' ? res.defaultModelId : installed ? installed.id : res.defaultModelId
      }
    },
    answerPhonePrompt(answer) {
      if (answer === 'yes') return (this.phonePrompt = 'lengthy')
      this.phonePrompt = null
      if (answer === 'never') this.setOfflinePref('never')
    },
    async usePhone() {
      this.phonePrompt = null
      await this.setEngine('device')
    },
    setOfflinePref(v) {
      this.offlinePref = v
      localStorage.setItem('offlineTranscribe', v)
      this.$toast.info(v === 'never' ? "Won't ask again. Transcribing on this phone stays in the ⋮ menu." : "Will ask when you're offline.")
    },
    toggleOfflinePref() {
      this.showMenu = false
      this.setOfflinePref(this.offlinePref === 'never' ? 'ask' : 'never')
    },
    async setEngine(engine) {
      if (this.engine === engine) return
      this.engine = engine
      this.selectedModelId = null
      await this.loadModels()
    },
    teardown() {
      clearTimeout(this.readyTimer)
      this.stopTimePoll()
      this.removeListeners()
      clearTimeout(this.fetchTimer)
    },
    addListeners() {
      this.removeListeners()
      Transcriber.addListener('onTranscriptionUpdate', (data) => this.handleTranscriptUpdate(data)).then((h) => this.listeners.push(h))
      Transcriber.addListener('onModelDownload', (data) => {
        if (!data) return
        if (data.status === 'downloading') this.modelDownload = data
        else {
          this.modelDownload = null
          if (data.status === 'error') this.$toast.error(`${data.import ? 'Import' : 'Model download'} failed: ${data.error}`)
          if (data.status === 'done' && data.import) this.$toast.success('Model imported. Tap Start transcription.')
          if (this.engine === 'device') Transcriber.getModels({ engine: 'device' }).then((res) => (this.models = res.models || []))
        }
      }).then((h) => this.listeners.push(h))
    },
    removeListeners() {
      this.listeners.forEach((h) => h && h.remove && h.remove())
      this.listeners = []
    },
    /** Desktop / keyboard: Space play-pause, ← → jump, / search, L K switch view, Esc close */
    onKey(e) {
      if (!this.value) return
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur()
        return
      }
      if (e.key === 'Escape') {
        if (this.editingBookmark) this.editingBookmark = null
        else if (this.showBookmarks) this.showBookmarks = false
        else if (this.showEbookSheet) this.showEbookSheet = false
        else if (this.showMenu) this.showMenu = false
        else this.close()
      } else if (e.key === ' ') {
        e.preventDefault()
        this.$emit('playPause')
      } else if (e.key === 'ArrowLeft') this.$emit('jumpBackward')
      else if (e.key === 'ArrowRight') this.$emit('jumpForward')
      else if (e.key === '/' || (e.key === 'f' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        this.$refs.searchInput && this.$refs.searchInput.focus()
      } else if (e.key === 'l') this.setViewMode('lyrics')
      else if (e.key === 'k') this.setViewMode('karaoke')
      else if (e.key === 'b' && this.bookmarkItemId) this.openBookmarks()
    },
    startTimePoll() {
      this.stopTimePoll()
      // Faster than the player's 1s clock so the highlighted line keeps up with the voice
      this.timePoll = setInterval(async () => {
        // (not while the app itself is in the background: nothing to show, and it saves battery)
        if (!this.isPlaying || document.hidden || !this.value) return // closed: nothing to follow
        try {
          const asked = performance.now()
          const data = await AbsAudioPlayer.getCurrentTime()
          if (data && typeof data.value === 'number') {
            this.liveTime = data.value
            this._kAnchor = { t: data.value, at: (asked + performance.now()) / 2 }
            if (this.value) this.karaokeFrames() // between checks while it's on screen
          }
        } catch (e) {}
        if (this.value && !this.txReading && !this.followPlayback && Date.now() - this.lastUserScroll > 6000 && !this.query) {
          // Re-follow after the user has stopped scrolling for a while
          this.followPlayback = true
          this.scrollToActive(false)
        }
      }, this.$store.getters['device/perf'].clockMs)
    },
    stopTimePoll() {
      clearInterval(this.timePoll)
      this.timePoll = null
      if (this._kFrame) clearTimeout(this._kFrame)
      this._kFrame = 0
    },
    async start(restart) {
      if (!this.itemKey) return
      this.starting = true
      try {
        const status = await Transcriber.startTranscription({ key: this.itemKey, modelId: this.selectedModelId, restart: !!restart, startSec: this.liveTime || 0, engine: this.engine })
        this.status = status
        if (restart) {
          this.lines = []
          this.rawCount = 0
        }
      } catch (error) {
        const msg = error && error.message ? error.message : String(error)
        this.$toast.error(msg)
        this.status = { status: 'error', error: msg }
      }
      this.starting = false
    },
    onStatusLoaded(status) {
      if (status && status.source === 'server' && this.engine !== 'server' && status.status !== 'none') {
        this.engine = 'server'
        this.loadModels()
      }
      if (status && status.modelId) this.selectedModelId = status.modelId
      if (status && status.ebookCheck === 'done' && !this.ebookCheckData) this.loadEbookCheck()
    },
    async cancelTranscription() {
      const { value } = await Dialog.confirm({
        title: 'Cancel transcription',
        message: 'Stop transcribing this book and delete the lines transcribed so far? (Use Pause instead to keep them and continue later.)',
        okButtonTitle: 'Cancel transcription',
        cancelButtonTitle: 'Keep going'
      })
      if (!value) return
      try {
        await Transcriber.cancelTranscription({ key: this.itemKey })
      } catch (error) {
        this.$toast.error(error.message || String(error))
      }
      this.resetTranscript()
      this.ebookCheckData = null
      this.status = { status: 'none' }
      this.$toast.info('Transcription cancelled')
    },
    async pause() {
      await Transcriber.pauseTranscription({ key: this.itemKey })
    },
    async resume() {
      this.starting = true
      try {
        this.status = await Transcriber.startTranscription({ key: this.itemKey, modelId: this.status.modelId, engine: Transcriber.sourceOf(this.itemKey) })
      } catch (error) {
        this.$toast.error(error.message || String(error))
      }
      this.starting = false
    },
    /** Transcribe the book again from the start, at once, with the same model (where it was made: server or phone) */
    async retranscribe() {
      this.showMenu = false
      if (this.status && this.status.modelId) this.selectedModelId = this.status.modelId
      const model = this.selectedModelId ? this.modelName(this.selectedModelId) : 'the automatic model'
      const { value } = await Dialog.confirm({
        title: 'Re-transcribe',
        message: `Transcribe this book again from the start with ${model}? The current transcript is replaced as the new one comes in (spelling fixes from the ebook are redone too).`,
        okButtonTitle: 'Re-transcribe'
      })
      if (!value) return
      this.ebookCheckData = null
      await this.start(true)
      if (this.status && (this.status.status === 'queued' || this.status.status === 'running')) this.$toast.info('Transcribing the book again…')
    },
    async deleteTranscript() {
      this.showMenu = false
      const { value } = await Dialog.confirm({ title: 'Delete transcription', message: this.serverAvailable ? 'Delete the transcription for this book? It is also deleted on the server.' : 'Delete the transcription for this book?' })
      if (!value) return
      await Transcriber.deleteTranscript({ key: this.itemKey })
      this.resetTranscript()
      this.ebookCheckData = null
      this.status = { status: 'none' }
    },
    async copyModelLink() {
      if (!this.selectedModel) return
      await Clipboard.write({ string: this.selectedModel.url })
      this.$toast.info('Download link copied')
    },
    async importModel() {
      if (!this.selectedModel) return
      try {
        const res = await Transcriber.importModel({ modelId: this.selectedModel.id })
        if (res && !res.cancelled) this.modelDownload = { modelId: this.selectedModel.id, progress: 0 }
      } catch (error) {
        this.$toast.error(error.message || String(error))
      }
    },
    async deleteModel(m) {
      const { value } = await Dialog.confirm({ title: 'Delete model', message: `Remove ${m.name} from this device? Existing transcriptions are kept.` })
      if (!value) return
      await Transcriber.deleteModel({ modelId: m.id })
      const res = await Transcriber.getModels({ engine: 'device' })
      this.models = res.models || []
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
    // A book that started playing while the app was asleep (lock screen, headphones, Android Auto) never
    // fired the isPlaying watcher here: look again now and then, and whenever the app comes back, so the
    // transcript is loaded (and handed to the lock screen) without opening the panel first
    this.warmCheck = () => {
      if (this.isPlaying && !this.value && !this.warming && this.itemKey && this.loadedKey !== this.itemKey) this.warmUp()
    }
    this.warmCheckTimer = setInterval(this.warmCheck, 10000)
    document.addEventListener('visibilitychange', this.warmCheck)
  },
  beforeDestroy() {
    clearInterval(this.warmCheckTimer)
    document.removeEventListener('visibilitychange', this.warmCheck)
    window.removeEventListener('keydown', this.onKey)
    this.teardown()
  }
}
</script>

<style scoped>
.tp-top {
  max-height: 340px;
  overflow: hidden;
  transition: max-height 0.45s ease, opacity 0.35s ease;
}
.tp-top-faded {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}
.tp-bookbtn {
  width: 52px;
  height: 52px;
}
.transcription-panel {
  padding-top: var(--sat, env(safe-area-inset-top));
}
.placeholder-current::placeholder {
  color: currentColor;
  opacity: 0.6;
}
/* Tablets and desktop: a comfortable reading width instead of edge-to-edge lines */
html.ff-tablet .tp-scroller > *,
html.ff-desktop .tp-scroller > * {
  max-width: 780px;
  margin-left: auto;
  margin-right: auto;
}
/* Foldable opened like a book: the text on the left of the hinge, everything else on the right */
html.posture-book .transcription-panel {
  padding-left: calc(var(--hinge-left) + var(--hinge-width));
}
html.posture-book .tp-scroller {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--hinge-left);
  padding-top: 16px;
}
html.posture-book .tp-transport {
  left: calc(var(--hinge-left) + var(--hinge-width));
}
html.posture-book .tp-follow {
  left: calc(var(--hinge-left) / 2);
}
/* Foldable half-open on a table: text in the top half, controls in the bottom half */
html.posture-tabletop .transcription-panel {
  padding-top: calc(var(--hinge-top) + var(--hinge-height));
}
html.posture-tabletop .tp-scroller {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: var(--hinge-top);
  padding-bottom: 12px;
}
html.posture-tabletop .tp-follow {
  bottom: auto;
  top: calc(var(--hinge-top) - 56px);
}
/* holding a word looks it up: no text selection handles or callout in the lists */
.tp-scroller {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
/* Lyrics / Karaoke lists are child components: reached through the scroller (scoped styles stop at a child) */
.tp-scroller >>> .k-text {
  font-family: Georgia, 'Noto Serif', 'Droid Serif', serif;
  line-height: 1.72;
}
/* colour e-ink: set like a printed page: slightly heavier strokes (thin ones come out grey), justified with
   hyphenation, wider margins */
html:is([data-theme='eink-color'], [data-theme='eink-color-dark']) .tp-scroller >>> .k-text {
  font-weight: 470;
  text-align: justify;
  hyphens: auto;
  -webkit-hyphens: auto;
  line-height: 1.6;
}
html:is([data-theme='eink-color'], [data-theme='eink-color-dark']) .tp-scroller.px-3 {
  padding-left: 1.75rem;
  padding-right: 1.75rem;
}
.tp-scroller >>> .k-para {
  margin: 0 0 0.85em;
  padding: 0.35em 0.6em;
  border-left: 3px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}
.tp-scroller >>> .k-para.k-active {
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
}
.tp-scroller >>> .k-heading {
  font-weight: 700;
  font-size: 1.15em;
  margin-top: 1.2em;
}
.tp-scroller >>> .k-untimed {
  opacity: 0.6;
}
.tp-scroller >>> .k-text .k-word {
  border: 1.5px solid;
  border-radius: 6px;
  padding: 0 2px;
  margin: 0 -3.5px;
  transition: background-color 0.06s linear;
}
/* e-ink: three words as one block; the one being said underlined inside it (no fades on the panel) */
.tp-scroller >>> .k-text .k-word.k-grp {
  transition: none;
}
/* black-and-white e-ink: taller than the text, so the underline under the word being said sits clear of the
   box's bottom edge */
html:is([data-theme='eink'], [data-theme='eink-dark']) .tp-scroller >>> .k-text .k-word.k-grp {
  padding-top: 3px;
  padding-bottom: 9px;
}
.tp-scroller >>> .k-text .k-grp .k-main {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
html:is([data-theme='eink'], [data-theme='eink-dark']) .tp-scroller >>> .k-text .k-grp .k-main {
  text-underline-offset: 4px;
}
/* No content-visibility on the lines: with an accessibility service on (Samsung, Onyx floating button) Chrome
   laid each skipped line out one by one when a touch refreshed its accessibility tree: minutes frozen in long
   books. One full layout of every line is quick. */
.tp-scroller >>> .t-text {
  font-size: 1.35rem;
  line-height: 1.35;
  font-weight: 700;
}
.tp-scroller >>> .t-ts {
  opacity: 0.7;
}
.tp-scroller >>> .t-past {
  opacity: 0.55;
}
.tp-scroller >>> .t-future {
  opacity: 0.35;
}
.tp-scroller >>> .t-active {
  opacity: 1;
}
.tp-scroller >>> .t-active .t-text {
  text-shadow: 0 0 1px currentColor;
}
/* E-ink (black-and-white and colour) Lyrics: the line being spoken gets Karaoke's highlight, an outlined box with a
   soft tint (black on black-and-white, orange on colour). Every line keeps the same room for it, so nothing moves. */
html[data-theme^='eink'] .tp-scroller >>> .t-line {
  border: 1.5px solid transparent;
  border-radius: 8px;
  padding-left: 8px;
  padding-right: 8px;
  margin-left: -8px;
  margin-right: -8px;
}
html[data-theme^='eink'] .tp-scroller >>> .t-line.t-active {
  border-color: var(--tp-accent);
  background-color: var(--tp-accent-soft);
}
.tp-scroller >>> .t-bm {
  position: absolute;
  left: 0;
  top: 1.6rem;
  font-size: 0.9rem;
  color: #4caf50;
}
.tp-scroller >>> .t-search {
  opacity: 1;
}
.tp-scroller >>> .t-search .t-text {
  font-size: 1.1rem;
  font-weight: 600;
}
.tp-scroller >>> .t-line .t-sugg {
  text-decoration: underline wavy rgba(255, 82, 82, 0.9);
  text-underline-offset: 3px;
}
.tp-scroller >>> .t-line .t-mark {
  background: rgba(255, 214, 0, 0.85);
  color: #111;
  border-radius: 3px;
  padding: 0 2px;
}
.transcription-slide-enter-active,
.transcription-slide-leave-active {
  transition: transform 0.25s ease;
}
.transcription-slide-enter,
.transcription-slide-leave-to {
  transform: translateY(100%);
}
</style>

<style>
/* the word being looked up (Lyrics / Karaoke), while its definition is open */
::highlight(abs-lookup) {
  background-color: rgba(66, 153, 225, 0.45);
  text-decoration: underline;
}
/* the view not showing (Lyrics or Karaoke): kept laid out underneath, out of sight and out of reach */
.tp-off {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
</style>

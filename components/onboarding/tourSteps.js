/**
 * The guided tour, screen by screen. Each step points at an element with data-tour="…"; steps whose
 * button isn't on screen right now are skipped. A step without a target is a centred card.
 */
export const TOURS = {
  home: [
    { target: 'library', title: 'Your libraries', text: 'Switch between your Audiobookshelf libraries here: audiobooks, podcasts, e-books.' },
    { target: 'shelf-tabs', title: 'Browse', text: 'Home, the whole library, series, collections and authors.' },
    { target: 'search', title: 'Search', text: 'Find books by title, author, series or narrator.' },
    { target: 'cast', title: 'Cast', text: 'Play on a Chromecast or smart speaker.' },
    { target: 'menu', title: 'Menu', text: 'Downloads, Stats, your Notebook, your account and Settings. The tutorial lives under Settings → Help if you want it again.' },
    { target: null, title: 'Based on Your Recent Readings', text: 'On the home screen, a shelf of books from your library like the ones you have been listening to lately. Each one says why it was picked.' },
    { target: null, title: 'Open a book', text: 'Tap any cover to see the book, play it, read it, transcribe it or download it for offline.' }
  ],
  item: [
    { target: 'item-play', title: 'Play', text: 'Starts the audiobook. The player stays at the bottom while you browse; tap it to open it full screen.' },
    { target: 'item-read', title: 'Read', text: 'Opens the e-book, PDF or comic, downloaded or straight from your server.' },
    { target: 'item-transcribe', title: 'Transcribe', text: 'Turns the audiobook into text you can follow along with, search and read along with in the e-book.' },
    { target: 'item-download', title: 'Download', text: 'Takes the audiobook, its e-book or PDF and its transcription with you, so everything works offline.' }
  ],
  player: [
    { target: 'pl-play', title: 'Play and pause', text: 'Also works from your headphones, lock screen and car.' },
    { target: 'pl-jump', title: 'Jump back and forward', text: 'By the number of seconds set in Settings. The arrows at the ends jump by chapter.' },
    { target: 'pl-bookmark', title: 'Bookmark', text: 'Tap to bookmark this exact second, with the line being read. Hold it while a passage plays to save the whole section. You can add notes, and it works offline.' },
    { target: 'pl-speed', title: 'Speed', text: 'Listen faster or slower.' },
    { target: 'pl-sleep', title: 'Sleep timer', text: 'Stop playing after a while, or at the end of the chapter.' },
    { target: 'pl-transcription', title: 'Transcription', text: 'Follow along as text: Lyrics (timed lines), Karaoke (paragraphs, word by word) or Read along (the book itself). The narrated line also shows on your lock screen.' },
    { target: 'pl-chapters', title: 'Chapters', text: 'Jump to any chapter.' },
    { target: 'pl-more', title: 'More', text: 'Your bookmarks, listening history and other options.' }
  ],
  transcription: [
    { target: 'tp-views', title: 'Lyrics, Karaoke, Read along', text: 'Lyrics shows timed lines like a music app. Karaoke shows the book as paragraphs and outlines each word as it is said. Read along opens the e-book or PDF and highlights the words as they are read. All three keep up in the background, so switching is instant.' },
    { target: 'tp-ebook', title: 'Spelling from the ebook', text: 'When the book has an ebook, the transcript is checked against it by itself. Admins review or apply the fixes here. Differences can also come from the narrator ad-libbing or edits between book and audiobook.' },
    { target: 'tp-search', title: 'Search', text: 'Find any word in the book, then tap the result to jump there.' },
    { target: 'tp-bookmark', title: 'Bookmark', text: 'Same as in the player: tap for this second, hold for a section.' },
    { target: 'tp-menu', title: 'More', text: 'Highlight timing (if the words run early or late) and your bookmarks. Admins also find spelling checks, book analysis, re-transcribing and deleting here.' },
    { target: 'tp-lock', title: 'Screen lock', text: 'Pins the screen while the book plays, so taps, Back and Home do nothing until you unlock it. When paused, the Read button takes its place.' },
    { target: null, title: 'Tap to jump', text: 'Tap any line (or word in Karaoke) to play from there. Scroll freely; it catches up with the voice by itself.' }
  ],
  'reader-ebook': [
    { target: null, title: 'Turning pages', text: 'Tap the left or right edge, or swipe. Tap the middle to show or hide these bars.' },
    { target: 'rd-sidebar', title: 'Contents', text: 'Chapters, your bookmarks and your highlights.' },
    { target: 'rd-bookmark', title: 'Bookmark this page', text: 'Bookmarks, highlights and notes sync to your other devices.' },
    { target: 'rd-tools', title: 'Tools', text: 'Text size, search, fullscreen and reader settings.' },
    { target: 'rd-settings', title: 'Reader settings', text: 'Theme, font, spacing, read-along with the audiobook, and dictionaries.' },
    { target: 'rd-pages', title: 'Where you are', text: 'Jump with the slider. Book Viewer turns pages; Doc Viewer is one long scroll.' },
    { target: null, title: 'Press and hold a word', text: 'For its definition. Drag to select more, then highlight it, add a note, copy, search, or listen from there.' }
  ],
  'reader-readalong': [
    { target: 'ra-modes', title: 'Read along', text: 'The book follows the narration. Switch to Lyrics or Karaoke here, or search the transcription; this bar stays while you listen.' },
    { target: 'ra-book', title: 'Read mode', text: 'Paused? Tap here to put the audiobook aside and read with all the tools: contents, search, dictionary, highlights.' },
    { target: null, title: 'Back to listening', text: 'In read mode the headphones button picks the audiobook up from your page. It waits for you to press play.' }
  ],
  'reader-pages': [
    { target: null, title: 'Turning pages', text: 'Tap the edges or swipe. Pinch or double-tap to zoom, and drag to look around. Tap the middle to show or hide the bars.' },
    { target: 'rd-reflow', title: 'Reflow', text: 'Fits the PDF’s text to your screen (on by default on phones). Tap again for the original pages; your choice carries over to read along.' },
    { target: 'rd-sidebar', title: 'Pages', text: 'Page thumbnails, contents, bookmarks and highlights.' },
    { target: 'rd-bookmark', title: 'Bookmark this page', text: 'Synced to your other devices.' },
    { target: 'rd-tools', title: 'Tools', text: 'Zoom, one or two pages, rotate, right-to-left for manga, night mode and fullscreen.' },
    { target: 'rd-pages', title: 'Pages and viewers', text: '« ‹ page › », the slider, and Book Viewer (page by page) or Doc Viewer (one long scroll).' }
  ]
}

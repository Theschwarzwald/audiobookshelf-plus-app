# How the app adapts to the device

On start the app reads a device profile (`AbsDevice` plugin → `store/device.js`) and keeps it up to date
when battery saver, temperature, the fold or the window size change. Screens read it instead of guessing.

| | Detected from | What changes |
|---|---|---|
| **Phone** | short side < 600 dp | Compact bars; less-used reader tools under ⋮ |
| **Tablet** | short side ≥ 600 dp | Wide reader bars (all tools, Page + GO), two-page spreads in landscape, transcription text kept at a comfortable reading width |
| **Foldable** | hinge sensor, live hinge position (androidx.window) | **Open like a book:** two pages (PDF/comics) or two columns (e-books) with the gap over the hinge; the Transcription screen puts the text left of the hinge and the cards and controls on the right. **Half open on a table:** book or text in the top half, bars and controls in the bottom half |
| **OLED** | best guess: HDR or wide-colour high-refresh screen (Android doesn't say) | Dark mode uses **true black** (Settings → True black (OLED), on by itself); readers default to the OLED theme |
| **E-ink** | maker / model (Onyx Boox, Kobo, PocketBook, Meebook, Bigme, Hisense A…); colour models by name (Kaleido / Gallery) | Automatic theme becomes E-ink (or Colour e-ink); no animations, shadows or blur anywhere; greyscale images on black-and-white screens; page turns without animation; the player and transcription follow the voice less often (fewer slow redraws); no cover-tinted backgrounds |
| **Desktop mode** | Samsung DeX, ChromeOS, desk dock, Android desktop windows, or a mouse on a big screen | Hover feedback, focus rings, normal scrollbars. **Keys:** readers ← → / PgUp PgDn / Space turn pages, Home End, + − zoom (Ctrl + − text size in e-books), F fullscreen, B bookmark, / or Ctrl+F search, T contents, V Book/Doc Viewer, Esc back. Transcription: Space play/pause, ← → jump, / search, L lyrics, K karaoke, B bookmarks, Esc close. Player: Space, ← →. Mouse wheel turns pages in the page reader; Ctrl + wheel zooms |
| **Battery saver / hot / battery ≤ 10 %** | Android's battery saver, thermal status, battery level | Treated as a low-end device until it passes: no animation or blur, screen back to the default refresh rate, sharpness capped, fewer pages prepared ahead, slower polling of the player and the server. On-device transcription uses 2 threads, and **pauses itself if the phone gets too hot** (Resume when cool) |
| **Low-end hardware** (e.g. 2 performance + 4 efficiency cores, 6 GB RAM, or Android's low-RAM flag) | CPU clusters from each core's max clock, total RAM | Page reader draws at up to 2× sharpness, prepares 1 spread ahead, keeps fewer pages and images in memory, smaller thumbnails; the player clock runs at 2×/s instead of 4×/s; large on-device speech models are marked "slow on this phone" |
| **High-end hardware** (≥ 8 GB, 4+ performance cores) | same | Up to 4× sharpness when zoomed, 3 spreads prepared ahead, bigger caches; on-device transcription uses every performance core plus half the efficiency cores |
| **120 Hz** | the screen's supported modes | The app asks for the highest refresh rate at the current resolution, so scrolling and page turns are smooth; it goes back to Android's choice on battery saver or e-ink |

## Automatic, with choices (Settings → Device & performance)

Everything starts on **Automatic**, so nobody has to touch anything. Each part can be set by hand:

| Setting | Automatic | Choices |
|---|---|---|
| **Device type** | from the screen size, DeX / ChromeOS / dock, mouse | Phone · Tablet · Desktop |
| **Screen** | e-ink by maker/model, OLED best guess | LCD · OLED (true black) · E-ink · Colour e-ink |
| **Smoothness** | the screen's fastest rate (120 Hz…), **60 Hz in low power**, Android's choice on e-ink | Always the fastest · 120 · 90 · 60 Hz (only rates the screen has) |
| **Performance** | starts at **full quality** (the most the hardware could do; only Android's low-RAM flag or under ~5 GB caps it) and **works down from what the device reports**: frames dropped while scrolling (timed for 1.5 s while you swipe, at most every 5 s), Android asking the app to free memory, the phone getting warm. One step at a time, remembered for next time; after 15 quiet minutes it tries one step up | Always full quality · Balanced · Battery saver |
| **Low power** | battery saver, too hot, or battery at 20 % or less off the charger | Battery saver = always |
| **Run on its own** (Transcription) | on-device transcription keeps going in the background; pauses on battery saver or low battery off the charger and **carries on by itself** when you plug in | Only while charging · Any time · Only when I start it |
| **Colour vision** | Android's colour correction if it's on | Standard · Red-weak · Green-weak · Blue-weak · No colour |

The line above the settings says what was detected and where Automatic has settled, e.g.
"Phone · OLED · up to 120 Hz · 6 cores (2 fast + 4 efficient) · 6 GB. Running at balanced quality
(eased off because scrolling was dropping frames), 120 Hz." **Set everything back to Automatic** starts over.

On-device transcription threads follow the same choice: Automatic / Always full = performance cores + half the
efficiency cores, Balanced = performance cores, Battery saver / low power = 2; one fewer when warm, with short
breaks so it doesn't throttle; paused (and resumed later) when too hot.

### Automation (Tasker, MacroDroid, Automate, adb)

Send a broadcast, action `com.audiobookshelf.app.plus.SET`, to the app's package, with any of: `power`
(auto, max, balanced, saver), `refresh` (auto, max, 120, 90, 60), `screen` (auto, lcd, oled, eink, eink-color),
`formFactor` (auto, phone, tablet, desktop), `background` (auto, charging, always, manual), `lowBatteryAt`
(5–50), `theme`, `colorVision` (none, protan, deutan, tritan, mono), `reset` (true). The open app updates at once.

```
adb shell am broadcast -a com.audiobookshelf.app.plus.SET -p com.audiobookshelf.app.plus.debug --es power saver --es refresh 60
```

Code: `device/AdaptPrefs.kt`, `device/PowerPolicy.kt`, `device/AutomationReceiver.kt`, `store/device.js`.

On-device transcription threads: performance cores + half the efficiency cores (2 + 4 cores → 4 threads,
1 + 3 + 4 → 6), 2 on battery saver or when hot.

Code: `android/.../device/DeviceProfile.kt`, `plugins/AbsDevice.kt`, `store/device.js`, the classes in
`assets/tailwind.css`, and the `perf` / fold handling in `components/readers/readerCommon.js`.

# First start, tutorial and help

**First-time setup** (once, before anything else):
1. **How the app should look**: **System** (suggested: light or dark following the device), **Light** or
   **Dark**, with a live preview. Under Dark, **True black (OLED)** is switched on by itself when the screen
   looks like OLED (and can be turned on or off). On e-ink readers the same three choices use the e-ink
   versions (black-and-white or colour, light or dark); the screen type can be changed under Settings →
   Device & performance → Screen.
2. **Colour vision**: Standard, Red-weak (protanopia), Green-weak (deuteranopia), Blue-weak
   (tritanopia), No colour (monochrome). If Android's own colour correction is on, the matching mode is
   picked for you. Status colours, the accent and reading highlights switch to the Okabe-Ito palette,
   highlight swatches get letters, and spelling marks become dotted; "No colour" shows the app in
   greyscale with extra contrast.

Both can be changed any time in **Settings** (Theme, Colour vision), and Settings → Help → "Run
first-time setup again" repeats it.

**Tutorial** (right after setup): swipeable pages on what the app does and how: the library, listening,
the Bookmark button (tap / hold / notes), Transcription (Lyrics, Karaoke), reading (dictionary,
highlights, read-along, PDFs and comics), sync and offline, settings. The last page asks **"Show me
around"** or "I'll explore myself".

**Guided tour** ("Show me around"): the first time you reach each screen (home, a book's page, the full
player, Transcription, the e-book reader, the PDF/comic reader) it dims the screen, rings each button
in turn and says what it does: Next / Back / Skip tour (keyboard: → ← Enter Esc). Buttons that aren't
on the screen are skipped. On e-ink it uses a black ring and no grey wash.

**After 30 days away** (on start, or when the app comes back to the foreground): "It's been a while,
need a refresher on how to use me?" Yes opens the tutorial (and the tour again); No carries on.

**Settings → Help**: Show the tutorial again · Show me around again · Run first-time setup again.

Note: on a phone that already had the app, setup appears once after this update.

Code: `components/onboarding/` (FirstRunSetup, Tutorial, CoachTour + tourSteps.js, WelcomeBack,
colorVision.js), `store/onboarding.js`, `data-tour="…"` attributes on the buttons, the `cvd-*` rules in
`assets/tailwind.css`.

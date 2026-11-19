// The web player's copy of the shared views (served as /_abs_transcription/absplus-views.js)
import { createTranscriptViews, buildKaraoke, wordAt, VIEW_CSS } from './views.js'
import * as readingHistory from './readingHistory.js'
import { recommend } from './recommend.js'
window.AbsPlusViews = { createTranscriptViews, buildKaraoke, wordAt, VIEW_CSS, readingHistory, recommend }

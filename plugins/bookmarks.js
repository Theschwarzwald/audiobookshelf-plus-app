import { Transcriber } from '@/plugins/transcriber'

/**
 * Bookmarks with quotes, clips and notes (Audible-style), stored as ordinary Audiobookshelf bookmarks
 * so they sync to every device and stay readable in the stock bookmark lists:
 *
 *   quick tap  -> bookmark at that second         “line being spoken”
 *   hold       -> clip of the section held through “lines in the section” [clip 1:02:03–1:02:41]
 *   note       -> added after the quote            “…” ✎ my note [clip …]
 *
 * The bookmark's time is where it starts; a clip's end lives in the "[clip a–b]" suffix.
 * A bookmark with a plain title (typed by hand, or from another app) has no quote: its title is the note.
 * Saving goes through the `bookmarks` store, which works offline and syncs later.
 */

const CLIP_RE = /\s*\[clip (\d+(?::\d{2}){0,2})[–-](\d+(?::\d{2}){0,2})\]\s*$/
const NOTE_MARK = '” ✎ '
const MAX_QUOTE = 600
/** Hold while paused (or too briefly to cover anything): the last 30 s, like Audible's default */
export const DEFAULT_CLIP_SEC = 30
/** Start/end snap to the edges of the transcript lines within this many seconds */
const SNAP_SEC = 5

export function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

function parseTime(str) {
  return str.split(':').reduce((acc, p) => acc * 60 + parseInt(p, 10), 0)
}

/** { kind: 'clip' | 'mark' | 'note', start, end, quote, note } */
export function parseBookmark(bm) {
  const title = (bm && bm.title) || ''
  const m = title.match(CLIP_RE)
  const body = m ? title.slice(0, m.index).trim() : title.trim()
  let quote = ''
  let note = ''
  if (body.startsWith('“')) {
    const i = body.lastIndexOf(NOTE_MARK)
    if (i >= 0) {
      quote = body.slice(1, i)
      note = body.slice(i + NOTE_MARK.length).trim()
    } else if (body.endsWith('”')) quote = body.slice(1, -1)
    else note = body
  } else note = body
  const time = bm ? bm.time : 0
  if (m) return { kind: 'clip', start: time, end: Math.max(time, parseTime(m[2])), quote, note }
  return { kind: quote ? 'mark' : 'note', start: time, end: time, quote, note }
}

/** Builds a title from its parts (the inverse of parseBookmark). */
export function buildTitle({ quote, note, start, end }) {
  const n = (note || '').trim()
  let t = quote ? `“${quote}”${n ? ` ✎ ${n}` : ''}` : n || 'Bookmark'
  if (end != null && end > start) t += ` [clip ${formatTime(start)}–${formatTime(end)}]`
  return t
}

/** Same bookmark with a new note (keeps the quote and the clip range). */
export function withNote(bm, note) {
  const p = parseBookmark(bm)
  return buildTitle({ quote: p.quote, note, start: p.start, end: p.kind === 'clip' ? p.end : null })
}

function trimQuote(q) {
  q = q.replace(/\s+/g, ' ').trim()
  return q.length > MAX_QUOTE ? q.slice(0, MAX_QUOTE - 1).replace(/\s+\S*$/, '') + '…' : q
}

// ---- transcript lines (cached per book; refetched when the transcript grows or changes)

const cache = new Map() // key -> { count, revision, lines }

async function linesFor(key) {
  if (!key) return []
  try {
    const st = await Transcriber.getTranscriptStatus({ key })
    if (!st || st.status === 'none') return []
    const c = cache.get(key)
    if (c && c.count === st.linesCount && c.revision === st.revision && c.updatedAt === st.updatedAt) return c.lines
    const res = await Transcriber.getTranscript({ key, fromIndex: 0 })
    const lines = (res.lines || []).filter((l) => typeof l.s === 'number').sort((a, b) => a.s - b.s)
    cache.set(key, { count: st.linesCount, revision: st.revision, updatedAt: st.updatedAt, lines })
    return lines
  } catch (e) {
    return []
  }
}

/** The line being spoken at [t] (or the last one before it). */
export async function quoteAt(key, t) {
  const lines = await linesFor(key)
  let best = null
  for (const l of lines) {
    if (l.s <= t + 0.3) best = l
    else break
  }
  if (!best || t - (best.e || best.s) > 10) return '' // nothing transcribed near here
  return trimQuote(best.t)
}

/** Lines overlapping [start, end], with start/end snapped to line edges when close. */
export async function sectionQuote(key, start, end) {
  const lines = (await linesFor(key)).filter((l) => (l.e || l.s) > start && l.s < end)
  if (!lines.length) return { quote: '', start, end }
  const first = lines[0]
  const last = lines[lines.length - 1]
  const s = first.s < start && start - first.s <= SNAP_SEC ? first.s : start
  const e = (last.e || end) > end && (last.e || end) - end <= SNAP_SEC ? last.e : end
  return { quote: trimQuote(lines.map((l) => l.t).join(' ')), start: s, end: e }
}

// ---- saving

/**
 * Saves a bookmark (end == null) or a clip [time, end] for [libraryItemId] (server id, or the local
 * item id for books that only exist on the phone). [key] is the transcript key, for the quote.
 * Works offline: the store syncs it to the server later. Returns the saved bookmark.
 */
export async function saveBookmark(ctx, { libraryItemId, key, time, end, note }) {
  let start = Math.floor(time)
  let title
  if (end == null) {
    const quote = await quoteAt(key, time)
    title = buildTitle({ quote, note, start })
    if (!quote && !note) title = ctx.$formatDate ? ctx.$formatDate(Date.now(), 'MMM dd, yyyy HH:mm') : 'Bookmark'
  } else {
    const sec = await sectionQuote(key, time, end)
    start = Math.floor(sec.start)
    const stop = Math.max(start + 1, Math.ceil(sec.end))
    title = buildTitle({ quote: sec.quote || '', note: note || (sec.quote ? '' : 'Clip'), start, end: stop })
  }
  // One bookmark per second: keep a note already written on an existing one
  const existing = ctx.$store.getters['bookmarks/forItem'](libraryItemId).find((b) => b.time === start)
  if (existing && !note) {
    const old = parseBookmark(existing)
    if (old.note && old.quote) {
      const p = parseBookmark({ time: start, title })
      title = buildTitle({ quote: p.quote, note: old.note, start, end: p.kind === 'clip' ? p.end : null })
    }
  }
  return ctx.$store.dispatch('bookmarks/save', { libraryItemId, time: start, title })
}

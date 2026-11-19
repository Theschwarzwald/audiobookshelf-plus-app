/**
 * Reading stats: which books you listened to (and finished), how much, and when, by day, week, month or year,
 * back to your very first session. Shared by the app (pages/reading-stats.vue) and the web player
 * (absplus-views.js → transcription.js), so both show the same numbers.
 *
 * The history comes from Audiobookshelf itself: every listening session (book, start, seconds listened) from
 * /api/me/listening-sessions, and the finished date of each book from the user's progress (/api/me). It works on any
 * Audiobookshelf server, with or without the ABS+ add-on. Times are the device's local time.
 */

const DAY = 86400000
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Everything needed, compact (kept on the device for offline use).
 * get(path) → the parsed JSON of an Audiobookshelf API GET (the app's nativeHttp, or the web app's axios).
 */
export async function loadHistory(get, onProgress) {
  const per = 500
  const sessions = []
  let page = 0
  let pages = 1
  while (page < pages && page < 200) {
    const r = await get(`/api/me/listening-sessions?itemsPerPage=${per}&page=${page}`)
    pages = (r && r.numPages) || 0
    for (const s of (r && r.sessions) || []) {
      if (s.mediaType && s.mediaType !== 'book') continue
      const t = Number(s.startedAt) || Date.parse(s.date) || 0
      if (!t || !s.libraryItemId) continue
      sessions.push({ id: s.libraryItemId, title: s.displayTitle || (s.mediaMetadata && s.mediaMetadata.title) || '', author: s.displayAuthor || '', t, sec: Math.max(0, Math.round(Number(s.timeListening) || 0)) })
    }
    page++
    if (onProgress) onProgress(sessions.length, (r && r.total) || sessions.length)
  }
  const me = await get('/api/me').catch(() => null)
  const progress = ((me && me.mediaProgress) || []).filter((p) => !p.episodeId && p.libraryItemId)
  const finished = progress.filter((p) => p.isFinished && p.finishedAt).map((p) => ({ id: p.libraryItemId, t: Number(p.finishedAt) }))
  // started and not finished (for "Books you should pick up again")
  const unfinished = progress
    .filter((p) => !p.isFinished && !p.hideFromContinueListening && Number(p.progress) > 0.01 && Number(p.progress) < 0.97)
    .map((p) => ({ id: p.libraryItemId, progress: Number(p.progress), t: Number(p.lastUpdate) || 0 }))
  return { sessions, finished, unfinished, at: Date.now() }
}

// ---- periods (local time)
function startOf(kind, d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  if (kind === 'week') x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Monday
  if (kind === 'month') x.setDate(1)
  if (kind === 'year') {
    x.setMonth(0)
    x.setDate(1)
  }
  return x
}
function shift(kind, d, n) {
  const x = new Date(d)
  if (kind === 'day') x.setDate(x.getDate() + n)
  if (kind === 'week') x.setDate(x.getDate() + 7 * n)
  if (kind === 'month') x.setMonth(x.getMonth() + n)
  if (kind === 'year') x.setFullYear(x.getFullYear() + n)
  return x
}

/** The period of this kind containing `anchor` (a time in ms): { start, end, label } */
export function periodOf(kind, anchor) {
  const start = startOf(kind, anchor || Date.now())
  const end = shift(kind, start, 1)
  const now = startOf(kind, Date.now()).getTime()
  let label
  if (kind === 'day') {
    const diff = Math.round((now - start.getTime()) / DAY)
    label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${DAYS_SHORT[(start.getDay() + 6) % 7]} ${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} ${start.getFullYear()}`
  } else if (kind === 'week') {
    const last = new Date(end.getTime() - DAY)
    const same = start.getMonth() === last.getMonth()
    label = start.getTime() === now ? 'This week' : `${start.getDate()}${same ? '' : ' ' + MONTHS_SHORT[start.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]} ${last.getFullYear()}`
  } else if (kind === 'month') label = `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
  else label = String(start.getFullYear())
  return { start: start.getTime(), end: end.getTime(), label }
}

/** The period before / after (n = -1 / 1) */
export function stepPeriod(kind, anchor, n) {
  return shift(kind, startOf(kind, anchor), n).getTime()
}

/** The earliest moment in the history (first session or first finished book), or null */
export function firstDate(h) {
  let first = Infinity
  for (const s of (h && h.sessions) || []) if (s.t < first) first = s.t
  for (const f of (h && h.finished) || []) if (f.t < first) first = f.t
  return isFinite(first) ? first : null
}

/**
 * Everything shown for one period:
 *   totals: seconds listened, days with listening, books listened to, books finished
 *   books: each book listened to (or finished) in the period, most listened first: time, sessions, first and last
 *          day, finished date
 *   bars: listening spread over the period (hours of a day, days of a week or month, months of a year)
 *   canPrev / canNext: whether there's history before / the period isn't the current one
 */
export function summarize(h, kind, anchor) {
  const p = periodOf(kind, anchor)
  const titles = {}
  for (const s of (h && h.sessions) || []) if (s.title && !titles[s.id]) titles[s.id] = { title: s.title, author: s.author }
  const inP = (t) => t >= p.start && t < p.end
  const books = {}
  const days = new Set()
  let sec = 0
  const book = (id) => (books[id] = books[id] || { id, title: (titles[id] && titles[id].title) || 'A book', author: (titles[id] && titles[id].author) || '', sec: 0, sessions: 0, first: null, last: null, finishedAt: null })
  // bars
  let bars
  const slot = (t) => {
    const d = new Date(t)
    if (kind === 'day') return d.getHours()
    if (kind === 'week') return (d.getDay() + 6) % 7
    if (kind === 'month') return d.getDate() - 1
    return d.getMonth()
  }
  if (kind === 'day') bars = Array.from({ length: 24 }, (_, i) => ({ label: i % 6 === 0 ? `${i}:00` : '', title: `${i}:00`, sec: 0 }))
  else if (kind === 'week') bars = DAYS_SHORT.map((d) => ({ label: d, title: d, sec: 0 }))
  else if (kind === 'month') {
    const n = new Date(new Date(p.start).getFullYear(), new Date(p.start).getMonth() + 1, 0).getDate()
    bars = Array.from({ length: n }, (_, i) => ({ label: i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '', title: `${i + 1} ${MONTHS_SHORT[new Date(p.start).getMonth()]}`, sec: 0 }))
  } else bars = MONTHS_SHORT.map((m) => ({ label: m[0], title: m, sec: 0 }))

  for (const s of (h && h.sessions) || []) {
    if (!inP(s.t)) continue
    const b = book(s.id)
    b.sec += s.sec
    b.sessions++
    if (b.first == null || s.t < b.first) b.first = s.t
    if (b.last == null || s.t > b.last) b.last = s.t
    sec += s.sec
    if (s.sec > 0) days.add(new Date(s.t).toDateString())
    const i = slot(s.t)
    if (bars[i]) bars[i].sec += s.sec
  }
  let finishedCount = 0
  for (const f of (h && h.finished) || []) {
    if (!inP(f.t)) continue
    finishedCount++
    const b = book(f.id)
    b.finishedAt = f.t
    if (b.last == null || f.t > b.last) b.last = f.t
    if (b.first == null) b.first = f.t
  }
  const list = Object.values(books).sort((a, b) => b.sec - a.sec || (b.last || 0) - (a.last || 0))
  for (const b of list) b.share = sec ? b.sec / sec : 0
  const first = firstDate(h)
  // the period before, for "▲ 38% vs last week"
  const prevStart = shift(kind, new Date(p.start), -1).getTime()
  let prevSec = 0
  for (const s of (h && h.sessions) || []) if (s.t >= prevStart && s.t < p.start) prevSec += s.sec
  const change = prevSec ? (sec - prevSec) / prevSec : null
  // which bar is "now" (this hour / today / this month), to pick it out
  const nowT = Date.now()
  const nowBar = nowT >= p.start && nowT < p.end ? slot(nowT) : -1
  let peak = -1
  bars.forEach((b, i) => {
    if (b.sec && (peak < 0 || b.sec > bars[peak].sec)) peak = i
  })
  const parts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 }
  const authors = {}
  let longest = 0
  for (const s of (h && h.sessions) || []) {
    if (!inP(s.t)) continue
    const hr = new Date(s.t).getHours()
    parts[hr >= 5 && hr < 12 ? 'Morning' : hr >= 12 && hr < 17 ? 'Afternoon' : hr >= 17 && hr < 22 ? 'Evening' : 'Night'] += s.sec
    const a = (s.author || '').split(/,| - /)[0].trim()
    if (a) authors[a] = (authors[a] || 0) + s.sec
    if (s.sec > longest) longest = s.sec
  }
  const favTime = Object.entries(parts).sort((a, b) => b[1] - a[1])[0]
  const topAuthor = Object.entries(authors).sort((a, b) => b[1] - a[1])[0]
  return {
    kind,
    label: p.label,
    start: p.start,
    end: p.end,
    totals: { sec, days: days.size, books: list.filter((b) => b.sec > 0).length, finished: finishedCount },
    books: list,
    bars,
    maxBar: Math.max(1, ...bars.map((b) => b.sec)),
    prevSec,
    change,
    prevName: { day: 'the day before', week: 'last week', month: 'last month', year: 'last year' }[kind],
    nowBar,
    peak,
    favTime: favTime && favTime[1] > 0 ? favTime[0] : null,
    topAuthor: topAuthor ? topAuthor[0] : null,
    longest,
    avgPerDay: days.size ? sec / days.size : 0,
    canPrev: first != null && first < p.start,
    canNext: p.end <= Date.now()
  }
}

/**
 * Books you started and didn't finish, to pick up again: how far you got and when you last listened, the most
 * recently listened first. Books listened to in the last two days are left out (you're in the middle of them).
 */
export function pickUpAgain(h, limit = 12) {
  const titles = {}
  const last = {}
  for (const s of (h && h.sessions) || []) {
    if (s.title && !titles[s.id]) titles[s.id] = { title: s.title, author: s.author }
    if (!last[s.id] || s.t > last[s.id]) last[s.id] = s.t
  }
  const recent = Date.now() - 2 * DAY
  return ((h && h.unfinished) || [])
    .map((u) => ({ id: u.id, title: (titles[u.id] && titles[u.id].title) || 'A book', author: (titles[u.id] && titles[u.id].author) || '', progress: u.progress, last: Math.max(u.t || 0, last[u.id] || 0) }))
    .filter((b) => b.last && b.last < recent)
    .sort((a, b) => b.last - a.last)
    .slice(0, limit)
}

/** "3 days ago", "5 weeks ago", "2 years ago" */
export function fmtAgo(t) {
  const d = Math.max(0, Math.floor((Date.now() - t) / DAY))
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  if (d < 60) return `${Math.round(d / 7)} weeks ago`
  if (d < 730) return `${Math.round(d / 30.4)} months ago`
  return `${Math.round(d / 365)} years ago`
}

/** Days in a row with listening (at least a minute): the current run (today or up to yesterday) and the longest */
export function streaks(h) {
  const set = new Set()
  for (const s of (h && h.sessions) || []) if (s.sec >= 60) set.add(new Date(s.t).toDateString())
  if (!set.size) return { current: 0, longest: 0 }
  const day = (d) => d.toDateString()
  const d = new Date()
  if (!set.has(day(d))) d.setDate(d.getDate() - 1)
  let current = 0
  while (set.has(day(d))) {
    current++
    d.setDate(d.getDate() - 1)
  }
  const sorted = [...set].map((x) => new Date(x).getTime()).sort((a, b) => a - b)
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = Math.round((sorted[i] - sorted[i - 1]) / DAY) === 1 ? run + 1 : 1
    if (run > longest) longest = run
  }
  return { current, longest: Math.max(longest, current) }
}

/** "▲ 38%" / "▼ 12%" / "same as" (null when there's nothing to compare with) */
export function fmtChange(change) {
  if (change == null) return null
  const pc = Math.round(Math.abs(change) * 100)
  if (pc === 0) return 'Same as'
  return `${change > 0 ? '▲' : '▼'} ${pc}% vs`
}

/** Short hours/minutes for big numbers: { value: '6', unit: 'h', rest: '52 min' } */
export function splitDuration(sec) {
  sec = Math.round(sec || 0)
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (!h) return { value: String(m), unit: 'min', rest: '' }
  return { value: String(h), unit: 'h', rest: m ? `${m} min` : '' }
}

// ---- wording
export function fmtDuration(sec) {
  sec = Math.round(sec || 0)
  if (sec < 60) return sec ? '< 1 min' : '0 min'
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** When a book was listened to within the period: "Tue 4 Mar", "3 – 9 Mar", "Mar – Jun" … */
export function fmtWhen(kind, first, last) {
  if (first == null) return ''
  const a = new Date(first)
  const b = new Date(last == null ? first : last)
  const day = (d) => `${DAYS_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
  const time = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (kind === 'day') return a.getTime() === b.getTime() ? time(a) : `${time(a)} – ${time(b)}`
  if (a.toDateString() === b.toDateString()) return day(a)
  if (kind === 'year' && a.getMonth() !== b.getMonth()) return `${MONTHS_SHORT[a.getMonth()]} – ${MONTHS_SHORT[b.getMonth()]}`
  return a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}` : `${day(a)} – ${day(b)}`
}

export function fmtDate(t) {
  const d = new Date(t)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export const PERIODS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' }
]

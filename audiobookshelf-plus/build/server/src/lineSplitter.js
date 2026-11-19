'use strict'
/**
 * Groups recognised words into transcript lines, with the same rules as the Android app
 * (LineSplitter in TranscriptionEngine.kt), so a book reads the same whichever side transcribed it:
 * break after sentence punctuation (3+ words), after a comma/semicolon/dash (10+ words), or at 16 words,
 * and never leave a dangling 1-2 word line.
 *
 * words: [{ w: " raw text with its leading space", s: absStartSec, e: absEndSec }]
 */
const sentenceEnd = /[.!?…。！？]["'”’)\]」』]*$/
const softBreak = /[,;:—–，、；：]["'”’)\]」』]*$/

function split(words, segStart, segEnd) {
  const clean = words.filter((w) => w && typeof w.w === 'string' && w.w.trim())
  if (!clean.length) return []
  const groups = []
  let current = []
  for (const w of clean) {
    current.push(w)
    const n = current.length
    const t = w.w.trim()
    const brk = (sentenceEnd.test(t) && n >= 3) || (softBreak.test(t) && n >= 10) || n >= 16
    if (brk) {
      groups.push(current)
      current = []
    }
  }
  if (current.length) {
    if (current.length <= 2 && groups.length && groups[groups.length - 1].length < 16) groups[groups.length - 1].push(...current)
    else groups.push(current)
  }
  return groups.map((g, i) => {
    const start = typeof g[0].s === 'number' ? g[0].s : segStart
    const end = i + 1 < groups.length ? groups[i + 1][0].s : segEnd
    // Join the raw pieces: keeps the model's own spacing (none for Chinese/Japanese, spaces elsewhere)
    const text = g
      .map((w) => w.w)
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    // Each word with its own times (for karaoke and the _karaoke.lrc file)
    const words = g.filter((w) => typeof w.s === 'number').map((w) => ({ w: w.w.trim(), s: w.s, e: typeof w.e === 'number' ? w.e : w.s }))
    return { start, end: Math.max(end, start), text, words }
  })
}

module.exports = { split }

'use strict'
/**
 * E-reader bookmarks, highlights and notes, per user and book, synced between devices.
 *
 *   <DATA_DIR>/reader/<user id>/<item id>.json   { seq, records: { <id>: record } }
 *
 * A record: { id, type: bookmark | highlight, cfi, fraction, text, color, note, chapter,
 *             createdAt, updatedAt, deleted, seq }
 * Phones send what they changed and get back everything changed since their last sync (by seq).
 * The most recent edit of a record wins; deletes are kept as `deleted: true` so they reach every device.
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')

const TYPES = new Set(['bookmark', 'highlight'])
const MAX_TEXT = 4000
const MAX_NOTE = 20000

const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, '_')

class AnnotationStore {
  constructor(dataDir = config.dataDir) {
    this.root = path.join(dataDir, 'reader')
  }

  file(userId, itemId) {
    return path.join(this.root, safe(userId), `${safe(itemId)}.json`)
  }

  read(userId, itemId) {
    try {
      return JSON.parse(fs.readFileSync(this.file(userId, itemId), 'utf8'))
    } catch (e) {
      return { seq: 0, records: {} }
    }
  }

  write(userId, itemId, data) {
    const f = this.file(userId, itemId)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    const tmp = `${f}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data))
    fs.renameSync(tmp, f)
  }

  static clean(r) {
    if (!r || typeof r.id !== 'string' || r.id.length > 100 || !TYPES.has(r.type)) return null
    const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0)
    const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')
    return {
      id: r.id,
      type: r.type,
      cfi: str(r.cfi, 2000),
      fraction: Math.max(0, Math.min(1, num(r.fraction))),
      text: str(r.text, MAX_TEXT),
      color: str(r.color, 20) || (r.type === 'highlight' ? 'yellow' : ''),
      note: str(r.note, MAX_NOTE),
      chapter: str(r.chapter, 300),
      createdAt: num(r.createdAt) || Date.now(),
      updatedAt: num(r.updatedAt) || Date.now(),
      deleted: !!r.deleted
    }
  }

  /** Applies [changes] (latest edit wins) and returns everything changed after [since]. */
  sync(userId, itemId, since, changes) {
    const data = this.read(userId, itemId)
    let changed = false
    for (const raw of changes || []) {
      const r = AnnotationStore.clean(raw)
      if (!r) continue
      const cur = data.records[r.id]
      if (cur && cur.updatedAt > r.updatedAt) continue
      if (cur && cur.updatedAt === r.updatedAt && JSON.stringify({ ...cur, seq: 0 }) === JSON.stringify({ ...r, seq: 0 })) continue
      data.seq += 1
      data.records[r.id] = { ...r, seq: data.seq }
      changed = true
    }
    if (changed) this.write(userId, itemId, data)
    const from = Number(since) || 0
    const out = Object.values(data.records).filter((r) => r.seq > from)
    return { seq: data.seq, annotations: out }
  }
}

module.exports = { AnnotationStore }

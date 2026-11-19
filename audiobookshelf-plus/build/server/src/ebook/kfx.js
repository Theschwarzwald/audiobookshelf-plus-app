'use strict'
/**
 * Kindle KFX text in reading order (port of KfxText in EbookFormats.kt; container layout follows
 * John Howell's KFX Input plugin, GPLv3). Minimal Ion binary reader, text-relevant fragments only.
 */
const UNIT = Symbol('unit')
class Sym {
  constructor(id) {
    this.id = id
  }
}
class Annot {
  constructor(ids, value) {
    this.ids = ids
    this.value = value
  }
}
const DRMION = Buffer.from([0xea, 0x44, 0x52, 0x4d, 0x49, 0x4f, 0x4e, 0xee])

function unsupported(msg) {
  const { UnsupportedEbookError } = require('./reader')
  return new UnsupportedEbookError(msg)
}
const le32 = (b, o) => b.readUInt32LE(o)
const le64 = (b, o) => b.readUInt32LE(o) + b.readUInt32LE(o + 4) * 2 ** 32

class Ion {
  constructor(b, pos, end) {
    this.b = b
    this.pos = pos
    this.end = end
  }
  varUInt() {
    let r = 0
    while (this.pos < this.end) {
      const x = this.b[this.pos++]
      r = r * 128 + (x & 0x7f)
      if (x & 0x80) break
    }
    return r
  }
  uint(len) {
    let r = 0
    for (let k = 0; k < len; k++) r = r * 256 + this.b[this.pos + k]
    return r
  }
  value() {
    const b = this.b
    const td = b[this.pos++]
    if (td === 0xe0 && this.pos + 3 <= this.end && b[this.pos] === 0x01 && b[this.pos + 1] === 0x00 && b[this.pos + 2] === 0xea) {
      this.pos += 3
      return UNIT // binary version marker
    }
    const t = td >> 4
    const l = td & 0x0f
    if (t === 1) return l === 15 ? null : l === 1
    if (l === 15) return null
    let len
    if ((t === 0xd && l === 1) || l === 14) len = this.varUInt()
    else len = l
    const start = this.pos
    if (start + len > this.end) throw new Error('Ion value runs past the end')
    let v
    switch (t) {
      case 0:
        v = UNIT
        break
      case 2:
        v = this.uint(len)
        break
      case 3:
        v = -this.uint(len)
        break
      case 4:
        v = len === 4 ? b.readFloatBE(start) : len === 8 ? b.readDoubleBE(start) : 0
        break
      case 7:
        v = new Sym(this.uint(len))
        break
      case 8:
        v = b.toString('utf8', start, start + len)
        break
      case 0xb:
      case 0xc: {
        const inner = new Ion(b, start, start + len)
        v = []
        while (inner.pos < inner.end) {
          const x = inner.value()
          if (x !== UNIT) v.push(x)
        }
        break
      }
      case 0xd: {
        const inner = new Ion(b, start, start + len)
        v = new Map()
        while (inner.pos < inner.end) {
          const field = inner.varUInt()
          const x = inner.value()
          if (x !== UNIT) v.set(field, x)
        }
        break
      }
      case 0xe: {
        const inner = new Ion(b, start, start + len)
        const annLen = inner.varUInt()
        const annEnd = inner.pos + annLen
        const ids = []
        while (inner.pos < annEnd) ids.push(inner.varUInt())
        v = new Annot(ids, inner.value())
        break
      }
      default:
        v = UNIT // decimal, timestamp, clob, blob: not needed for text
    }
    this.pos = start + len
    return v
  }
}

const unwrap = (v) => (v instanceof Annot ? unwrap(v.value) : v)
const struct = (v) => {
  const u = unwrap(v)
  return u instanceof Map ? u : null
}
const symId = (v) => {
  const u = unwrap(v)
  if (u instanceof Sym) return u.id
  if (typeof u === 'string') return 's:' + u
  return null
}

function parseSingle(b, from, to) {
  const ion = new Ion(b, from, to)
  while (ion.pos < ion.end) {
    const v = ion.value()
    if (v !== UNIT) return unwrap(v)
  }
  return null
}

function parseContainer(data) {
  if (data.toString('latin1', 0, 4) !== 'CONT') throw unsupported('Not a KFX container')
  const headerLen = le32(data, 6)
  const infoOffset = le32(data, 10)
  const infoLength = le32(data, 14)
  const info = struct(parseSingle(data, infoOffset, infoOffset + infoLength)) || new Map()
  const drm = info.get(411) || 0
  if (drm !== 0) throw unsupported("This KFX book is DRM-protected, so its text can't be read")
  const indexOffset = info.get(413)
  if (typeof indexOffset !== 'number') return []
  const indexLength = info.get(414) || 0
  const out = []
  let p = indexOffset
  while (p + 24 <= indexOffset + indexLength) {
    const id = le32(data, p)
    const type = le32(data, p + 4)
    const off = le64(data, p + 8)
    const len = le64(data, p + 16)
    p += 24
    const es = headerLen + off
    if (es + len > data.length || len < 10) continue
    if (data.toString('latin1', es, es + 4) !== 'ENTY') continue
    const ds = es + le32(data, es + 6)
    if (ds + DRMION.length <= es + len && data.subarray(ds, ds + DRMION.length).equals(DRMION)) {
      throw unsupported("This KFX book is DRM-protected, so its text can't be read")
    }
    if (type === 145 || type === 259 || type === 260 || type === 538) {
      try {
        out.push({ id, type, value: parseSingle(data, ds, es + len) })
      } catch (e) {
        /* skip bad entity */
      }
    }
  }
  return out
}

function read(containers) {
  const { sectionsFromParts } = require('./reader')
  const frags = containers.flatMap((c) => (c.length >= 18 && c.toString('latin1', 0, 4) === 'CONT' ? parseContainer(c) : []))
  if (!frags.length) throw unsupported('No readable text found in the KFX book')

  const content = new Map()
  frags
    .filter((f) => f.type === 145)
    .forEach((f) => {
      const s = struct(f.value)
      if (!s) return
      const name = symId(s.get(4)) ?? f.id
      const list = Array.isArray(s.get(146)) ? s.get(146) : []
      content.set(
        name,
        list.map((x) => (typeof unwrap(x) === 'string' ? unwrap(x) : ''))
      )
    })
  const stories = new Map()
  frags
    .filter((f) => f.type === 259)
    .forEach((f) => {
      const s = struct(f.value)
      if (s) stories.set(symId(s.get(176)) ?? f.id, s)
    })
  const sections = new Map()
  frags
    .filter((f) => f.type === 260)
    .forEach((f) => {
      const s = struct(f.value)
      if (s) sections.set(symId(s.get(174)) ?? f.id, s)
    })

  const textOf = (ref) => {
    const u = unwrap(ref)
    if (typeof u === 'string') return u
    if (u instanceof Map) {
      const name = symId(u.get(4))
      const idx = u.get(403)
      if (name != null && typeof idx === 'number') {
        const list = content.get(name)
        return list ? list[idx] : null
      }
    }
    return null
  }

  const seenStories = new Set()
  const walkStory = (node, sb, depth = 0) => {
    if (depth > 60) return
    const u = unwrap(node)
    if (Array.isArray(u)) u.forEach((x) => walkStory(x, sb, depth + 1))
    else if (u instanceof Map) {
      const t = textOf(u.get(145))
      if (t && t.trim()) sb.push(t)
      for (const [k, v] of u) if (k !== 145) walkStory(v, sb, depth + 1)
      const st = symId(u.get(176))
      if (st != null && u.get(146) == null && !seenStories.has(st)) {
        seenStories.add(st)
        const s = stories.get(st)
        if (s) walkStory(s.get(146), sb, depth + 1)
      }
    }
  }
  const storyNames = (node, out, depth = 0) => {
    if (depth > 30) return
    const u = unwrap(node)
    if (Array.isArray(u)) u.forEach((x) => storyNames(x, out, depth + 1))
    else if (u instanceof Map) {
      const id = symId(u.get(176))
      if (id != null) out.push(id)
      for (const [k, v] of u) if (k !== 176) storyNames(v, out, depth + 1)
    }
  }

  const order = []
  const doc = frags.find((f) => f.type === 538)
  if (doc) {
    const ros = struct(doc.value) && struct(doc.value).get(169)
    const ro = Array.isArray(ros) ? ros[0] : null
    const secs = struct(ro) && struct(ro).get(170)
    if (Array.isArray(secs)) secs.forEach((s) => symId(s) != null && order.push(symId(s)))
  }
  if (!order.length) order.push(...sections.keys())

  let parts = []
  for (const secName of order) {
    const sec = sections.get(secName)
    if (!sec) continue
    const names = []
    storyNames(sec.get(141), names)
    const sb = []
    for (const n of [...new Set(names)]) {
      if (seenStories.has(n)) continue
      seenStories.add(n)
      const s = stories.get(n)
      if (s) walkStory(s.get(146), sb)
    }
    if (sb.join('').trim()) parts.push([null, sb.join('\n')])
  }
  if (!parts.length) {
    for (const s of stories.values()) {
      const sb = []
      walkStory(s.get(146), sb)
      if (sb.join('').trim()) parts.push([null, sb.join('\n')])
    }
  }
  if (!parts.length) for (const list of content.values()) parts.push([null, list.join('\n')])
  parts = parts.map(([, text]) => {
    const first = (text.split('\n').find((l) => l.trim()) || '').trim()
    return [first && first.length <= 60 && first.split(' ').length <= 8 ? first : null, text]
  })
  return sectionsFromParts(parts)
}

module.exports = { read }

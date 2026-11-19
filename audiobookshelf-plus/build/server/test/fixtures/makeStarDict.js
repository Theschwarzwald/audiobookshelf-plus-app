'use strict'
/** Builds a tiny StarDict dictionary (dictzip-compressed) for tests. */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function asciiLower(s) {
  return s.replace(/[A-Z]/g, (c) => c.toLowerCase())
}
function cmp(a, b) {
  const x = asciiLower(a)
  const y = asciiLower(b)
  if (x !== y) return Buffer.compare(Buffer.from(x), Buffer.from(y))
  return Buffer.compare(Buffer.from(a), Buffer.from(b))
}

function make(dir, name, entries, { synonyms = {}, chlen = 64 } = {}) {
  fs.mkdirSync(dir, { recursive: true })
  const words = Object.keys(entries).sort(cmp)
  const dictParts = []
  const idxParts = []
  let off = 0
  for (const w of words) {
    const data = Buffer.from(entries[w], 'utf8')
    dictParts.push(data)
    const head = Buffer.from(w + '\0', 'utf8')
    const nums = Buffer.alloc(8)
    nums.writeUInt32BE(off, 0)
    nums.writeUInt32BE(data.length, 4)
    idxParts.push(head, nums)
    off += data.length
  }
  const dict = Buffer.concat(dictParts)
  const idx = Buffer.concat(idxParts)
  // dictzip: gzip header with an RA extra field listing independently inflatable chunks
  const chunks = []
  for (let p = 0; p < dict.length; p += chlen) chunks.push(zlib.deflateRawSync(dict.subarray(p, p + chlen)))
  const ra = Buffer.alloc(6 + chunks.length * 2)
  ra.writeUInt16LE(1, 0)
  ra.writeUInt16LE(chlen, 2)
  ra.writeUInt16LE(chunks.length, 4)
  chunks.forEach((c, i) => ra.writeUInt16LE(c.length, 6 + i * 2))
  const sub = Buffer.concat([Buffer.from('RA'), Buffer.from([ra.length & 0xff, ra.length >> 8]), ra])
  const header = Buffer.from([0x1f, 0x8b, 8, 4, 0, 0, 0, 0, 0, 3, sub.length & 0xff, sub.length >> 8])
  fs.writeFileSync(path.join(dir, `${name}.dict.dz`), Buffer.concat([header, sub, ...chunks, Buffer.alloc(8)]))
  fs.writeFileSync(path.join(dir, `${name}.idx`), idx)
  const syn = Object.keys(synonyms).sort(cmp)
  if (syn.length) {
    const parts = []
    for (const s of syn) {
      const n = Buffer.alloc(4)
      n.writeUInt32BE(words.indexOf(synonyms[s]), 0)
      parts.push(Buffer.from(s + '\0'), n)
    }
    fs.writeFileSync(path.join(dir, `${name}.syn`), Buffer.concat(parts))
  }
  fs.writeFileSync(path.join(dir, `${name}.ifo`), `StarDict's dict ifo file\nversion=3.0.0\nbookname=${name}\nwordcount=${words.length}\nidxfilesize=${idx.length}\nsametypesequence=m\n`)
}

module.exports = { make }

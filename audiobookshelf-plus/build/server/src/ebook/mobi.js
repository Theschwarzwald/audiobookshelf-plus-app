'use strict'
/**
 * MOBI / AZW / AZW3 / PRC text (port of MobiText in EbookFormats.kt).
 * HUFF/CDIC decompression ported from calibre's huffcdic.py (GPLv3).
 */
const html = require('./html')

function UnsupportedEbookError(msg) {
  const { UnsupportedEbookError: E } = require('./reader')
  return new E(msg)
}
const u16 = (b, o) => (b[o] << 8) | b[o + 1]
const u32 = (b, o) => b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3])

function decodeText(buf, utf8) {
  if (utf8) return buf.toString('utf8')
  try {
    return new TextDecoder('windows-1252').decode(buf)
  } catch (e) {
    return buf.toString('latin1')
  }
}

function extractHtml(data) {
  if (data.length < 86) throw UnsupportedEbookError('The MOBI file is too short')
  const ident = data.toString('latin1', 60, 68)
  const numRecords = u16(data, 76)
  const offsets = new Array(numRecords + 1)
  for (let i = 0; i < numRecords; i++) offsets[i] = u32(data, 78 + i * 8)
  offsets[numRecords] = data.length
  const record = (i) => data.subarray(offsets[i], offsets[i + 1])

  const r0 = record(0)
  const compression = u16(r0, 0)
  const textRecords = u16(r0, 8)
  const encryption = u16(r0, 12)
  if (encryption !== 0) throw UnsupportedEbookError("This Kindle book is DRM-protected, so its text can't be read")

  let utf8 = false
  let extraFlags = 0
  let huffOffset = 0
  let huffCount = 0
  if (r0.length > 16 && r0.toString('latin1', 16, 20) === 'MOBI') {
    const headerLen = u32(r0, 20)
    const codepage = u32(r0, 28)
    if (codepage === 65001) utf8 = true
    if (ident !== 'TEXtREAd' && headerLen >= 0xe4 && headerLen <= 500 && r0.length >= 0xf4) extraFlags = u16(r0, 0xf2)
    if (compression === 17480 && r0.length >= 0x78) {
      huffOffset = u32(r0, 0x70)
      huffCount = u32(r0, 0x74)
    }
  }
  let huff = null
  if (compression === 17480) {
    const recs = [record(huffOffset)]
    for (let k = 1; k < huffCount; k++) recs.push(record(huffOffset + k))
    huff = new HuffCdic(recs)
  }
  const parts = []
  for (let i = 1; i <= Math.min(textRecords, numRecords - 1); i++) {
    let rec = record(i)
    rec = rec.subarray(0, rec.length - trailingSize(rec, extraFlags))
    if (compression === 1) parts.push(Buffer.from(rec))
    else if (compression === 2) parts.push(palmDocDecompress(rec))
    else if (compression === 17480) parts.push(huff.unpack(rec))
    else throw UnsupportedEbookError(`Unknown MOBI compression (${compression})`)
  }
  return decodeText(Buffer.concat(parts), utf8).replace(/\u0000/g, '')
}

function trailingSize(data, extraFlags) {
  const entry = (psizeIn) => {
    let psize = psizeIn
    let bitpos = 0
    let result = 0
    while (psize > 0) {
      const v = data[psize - 1]
      result |= (v & 0x7f) << bitpos
      bitpos += 7
      psize -= 1
      if ((v & 0x80) !== 0 || bitpos >= 28 || psize === 0) return result
    }
    return result
  }
  let num = 0
  const size = data.length
  let flags = extraFlags >> 1
  while (flags !== 0) {
    if (flags & 1) num += entry(size - num)
    flags >>= 1
  }
  if (extraFlags & 1) {
    const off = size - num - 1
    if (off >= 0) num += (data[off] & 0x3) + 1
  }
  return Math.min(Math.max(num, 0), size)
}

function palmDocDecompress(input) {
  let buf = Buffer.alloc(input.length * 8 + 16)
  let o = 0
  const put = (b) => {
    if (o >= buf.length) {
      const nb = Buffer.alloc(buf.length * 2)
      buf.copy(nb)
      buf = nb
    }
    buf[o++] = b & 0xff
  }
  let i = 0
  while (i < input.length) {
    let c = input[i++]
    if (c >= 1 && c <= 8) {
      while (c-- > 0 && i < input.length) put(input[i++])
    } else if (c <= 0x7f) put(c)
    else if (c >= 0xc0) {
      put(0x20)
      put(c ^ 0x80)
    } else if (i < input.length) {
      c = (c << 8) + input[i++]
      const di = (c & 0x3fff) >> 3
      if (di >= 1 && di <= o) {
        let n = (c & 7) + 3
        while (n-- > 0) put(buf[o - di])
      }
    }
  }
  return buf.subarray(0, o)
}

class HuffCdic {
  constructor(records) {
    const huff = records[0]
    if (huff.toString('latin1', 0, 4) !== 'HUFF') throw UnsupportedEbookError('Invalid HUFF header')
    const off1 = u32(huff, 8)
    const off2 = u32(huff, 12)
    this.dict1Len = new Array(256)
    this.dict1Term = new Array(256)
    this.dict1Max = new Array(256)
    for (let i = 0; i < 256; i++) {
      const v = u32(huff, off1 + i * 4)
      const codelen = v & 0x1f
      this.dict1Len[i] = codelen
      this.dict1Term[i] = (v & 0x80) !== 0
      this.dict1Max[i] = (Math.floor(v / 256) + 1) * 2 ** (32 - codelen) - 1
    }
    this.mincode = new Array(33)
    this.maxcode = new Array(33)
    this.mincode[0] = 0
    this.maxcode[0] = 2 ** 32 - 1
    for (let codelen = 1; codelen <= 32; codelen++) {
      this.mincode[codelen] = u32(huff, off2 + (codelen - 1) * 8) * 2 ** (32 - codelen)
      this.maxcode[codelen] = (u32(huff, off2 + (codelen - 1) * 8 + 4) + 1) * 2 ** (32 - codelen) - 1
    }
    this.dictionary = []
    this.dictFlag = []
    for (const cdic of records.slice(1)) {
      if (cdic.toString('latin1', 0, 4) !== 'CDIC') throw UnsupportedEbookError('Invalid CDIC header')
      const phrases = u32(cdic, 8)
      const bits = u32(cdic, 12)
      const n = Math.min(2 ** bits, phrases - this.dictionary.length)
      for (let k = 0; k < n; k++) {
        const off = u16(cdic, 16 + k * 2)
        const blen = u16(cdic, 16 + off)
        this.dictionary.push(cdic.subarray(18 + off, Math.min(cdic.length, 18 + off + (blen & 0x7fff))))
        this.dictFlag.push((blen & 0x8000) !== 0)
      }
    }
  }

  unpack(input) {
    // Reads the 32 bits starting at any bit position (5 bytes fit exactly in a JS number)
    const data = Buffer.alloc(input.length + 8)
    input.copy(data)
    const read32 = (bit) => {
      const p = bit >> 3
      const v = data[p] * 2 ** 32 + data[p + 1] * 2 ** 24 + data[p + 2] * 2 ** 16 + data[p + 3] * 2 ** 8 + data[p + 4]
      return Math.floor(v / 2 ** (8 - (bit & 7))) % 2 ** 32
    }
    let bit = 0
    let bitsleft = input.length * 8
    const out = []
    for (;;) {
      const code = read32(bit)
      const top = Math.floor(code / 2 ** 24)
      let codelen = this.dict1Len[top]
      let mc = this.dict1Max[top]
      if (!this.dict1Term[top]) {
        while (codelen < 32 && code < this.mincode[codelen]) codelen++
        mc = this.maxcode[codelen]
      }
      bit += codelen
      bitsleft -= codelen
      if (bitsleft < 0) break
      const r = Math.floor((mc - code) / 2 ** (32 - codelen))
      if (r < 0 || r >= this.dictionary.length) break
      let slice = this.dictionary[r]
      if (!slice) break
      if (!this.dictFlag[r]) {
        this.dictionary[r] = null
        slice = this.unpack(slice)
        this.dictionary[r] = slice
        this.dictFlag[r] = true
      }
      out.push(slice)
      if (codelen === 0) break // corrupt table: avoid an endless loop
    }
    return Buffer.concat(out)
  }
}

function splitChapters(htmlText) {
  const { sectionsFromParts } = require('./reader')
  const parts = htmlText
    .split(/<mbp:pagebreak[^>]*>|(?=<h[12][\s>])/i)
    .map((chunk) => [html.firstHeading(chunk), html.toText(chunk)])
    .filter((p) => p[1].trim())
  return sectionsFromParts(parts)
}

function read(buf) {
  return splitChapters(extractHtml(buf))
}

module.exports = { read, extractHtml, palmDocDecompress, HuffCdic }

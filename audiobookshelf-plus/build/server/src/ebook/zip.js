'use strict'
/** Minimal ZIP reader (central directory + stored/deflate entries); enough for EPUB and KFX-ZIP. */
const zlib = require('zlib')

class ZipReader {
  constructor(buf) {
    this.buf = buf
    this.entries = new Map()
    let eocd = -1
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) throw new Error('Not a zip file')
    const count = buf.readUInt16LE(eocd + 10)
    let p = buf.readUInt32LE(eocd + 16)
    for (let n = 0; n < count && p + 46 <= buf.length; n++) {
      if (buf.readUInt32LE(p) !== 0x02014b50) break
      const method = buf.readUInt16LE(p + 10)
      const compSize = buf.readUInt32LE(p + 20)
      const nameLen = buf.readUInt16LE(p + 28)
      const extraLen = buf.readUInt16LE(p + 30)
      const commentLen = buf.readUInt16LE(p + 32)
      const localOff = buf.readUInt32LE(p + 42)
      const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
      this.entries.set(name, { name, method, compSize, localOff })
      p += 46 + nameLen + extraLen + commentLen
    }
  }
  names() {
    return [...this.entries.keys()]
  }
  find(path) {
    if (this.entries.has(path)) return this.entries.get(path)
    const lower = path.toLowerCase()
    for (const [n, e] of this.entries) if (n.toLowerCase() === lower) return e
    return null
  }
  read(path) {
    const e = typeof path === 'string' ? this.find(path) : path
    if (!e) return null
    const b = this.buf
    const p = e.localOff
    if (b.readUInt32LE(p) !== 0x04034b50) throw new Error('Bad zip entry')
    const start = p + 30 + b.readUInt16LE(p + 26) + b.readUInt16LE(p + 28)
    const data = b.subarray(start, start + e.compSize)
    if (e.method === 0) return Buffer.from(data)
    if (e.method === 8) return zlib.inflateRawSync(data)
    throw new Error(`Unsupported zip compression ${e.method}`)
  }
  text(path) {
    const d = this.read(path)
    return d ? d.toString('utf8') : null
  }
}

module.exports = { ZipReader }

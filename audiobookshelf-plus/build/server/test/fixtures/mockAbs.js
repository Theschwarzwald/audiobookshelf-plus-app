'use strict'
/** A tiny fake Audiobookshelf for tests. */
const http = require('http')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function makeZip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, content] of files) {
    const data = Buffer.from(content)
    const comp = zlib.deflateRawSync(data)
    const nameBuf = Buffer.from(name)
    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8)
    lh.writeUInt32LE(crc32(data), 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nameBuf.length, 26)
    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10)
    ch.writeUInt32LE(crc32(data), 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt32LE(offset, 42)
    locals.push(lh, nameBuf, comp)
    centrals.push(ch, nameBuf)
    offset += 30 + nameBuf.length + comp.length
  }
  const cd = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

function makeEpub() {
  const text = fs.readFileSync(path.join(__dirname, 'book.txt'), 'utf8').split(' ')
  const ch1 = text.slice(0, 1000).join(' ')
  const ch2 = text.slice(1000).join(' ')
  return makeZip([
    ['mimetype', 'application/epub+zip'],
    ['META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>'],
    ['OEBPS/content.opf', '<package><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'],
    ['OEBPS/toc.ncx', '<ncx><navMap><navPoint><navLabel><text>Chapter One</text></navLabel><content src="ch1.xhtml"/></navPoint><navPoint><navLabel><text>Chapter Two</text></navLabel><content src="ch2.xhtml"/></navPoint></navMap></ncx>'],
    ['OEBPS/ch1.xhtml', `<html><head><title>x</title></head><body><h1>Chapter One</h1><p>${ch1}</p></body></html>`],
    ['OEBPS/ch2.xhtml', `<html><body><h1>Chapter Two</h1><p>${ch2}</p></body></html>`]
  ])
}

const USERS = {
  'Bearer user-token': { id: 'u1', username: 'alice', type: 'user', permissions: { update: true } },
  'Bearer admin-token': { id: 'u0', username: 'root', type: 'root', permissions: { update: true } },
  'Bearer api-key': { id: 'svc', username: 'transcriber', type: 'admin', permissions: { update: true } }
}

function item(id) {
  return {
    id,
    mediaType: 'book',
    media: {
      metadata: { title: 'Test Book' },
      duration: 200,
      chapters: [{ start: 0, end: 100, title: 'Chapter One' }, { start: 100, end: 200, title: 'Chapter Two' }],
      audioFiles: [
        { ino: '1', index: 1, duration: 100, metadata: { filename: 'part1.mp3' } },
        { ino: '2', index: 2, duration: 100, metadata: { filename: 'part2.mp3' } }
      ],
      ebookFile: { ino: '9', ebookFormat: 'epub', metadata: { filename: 'book.epub' } }
    },
    libraryFiles: [{ ino: '9', metadata: { filename: 'book.epub' } }]
  }
}

function start(port, prefix = '') {
  const epub = makeEpub()
  const handler = (req, res) => {
    const u = new URL(req.url, 'http://x')
    let p = u.pathname
    if (prefix && p.startsWith(prefix)) p = p.slice(prefix.length)
    const user = USERS[req.headers.authorization]
    if (p === '/' || p === '/index.html' || p === '/item/abc') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end('<!doctype html><html><head><title>ABS</title></head><body><div id="__nuxt"></div></body></html>')
    }
    if (p === '/api/me') {
      if (!user) { res.writeHead(401); return res.end('Unauthorized') }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(user))
    }
    if (p === '/api/libraries') {
      if (!user) { res.writeHead(401); return res.end() }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ libraries: [{ id: 'lib1', name: 'Audiobooks', mediaType: 'book' }, { id: 'lib2', name: 'Podcasts', mediaType: 'podcast' }] }))
    }
    if (p === '/api/libraries/lib1/items') {
      if (!user) { res.writeHead(401); return res.end() }
      const books = (module.exports.libraryBooks || ['b1', 'b2', 'b3']).map((id, i) => ({ id, mediaType: 'book', addedAt: 1000 + i, media: { metadata: { title: `Book ${id}`, authorName: 'Ann Author' }, duration: 200 } }))
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ results: books.reverse(), total: books.length }))
    }
    if (p === '/api/api-keys' && req.method === 'POST') {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
        module.exports.createdKeys = (module.exports.createdKeys || 0) + 1
        if (!user || (user.type !== 'admin' && user.type !== 'root')) { res.writeHead(403); return res.end() }
        if (!body.name || !body.userId || body.isActive !== true) { res.writeHead(400); return res.end() }
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ apiKey: { id: 'k1', name: body.name, userId: body.userId, isActive: true, apiKey: 'api-key' } }))
      })
      return
    }
    let m = p.match(/^\/api\/items\/([^/]+)(\/.*)?$/)
    if (m) {
      if (!user) { res.writeHead(401); return res.end() }
      if (m[1] === 'secret' && user.username === 'alice') { res.writeHead(403); return res.end() }
      if (!m[2]) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(item(m[1]))) }
      if (m[2] === '/ebook' || m[2] === '/file/9') { res.writeHead(200, { 'content-type': 'application/epub+zip' }); return res.end(epub) }
      if (/^\/file\/[12]$/.test(m[2])) { res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(Buffer.alloc(1000)) }
    }
    if (p === '/echo' && req.method === 'POST') {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(Buffer.concat(chunks)) })
      return
    }
    res.writeHead(404)
    res.end('nope')
  }
  module.exports.lastHandler = handler
  const server = http.createServer(handler)
  server.on('upgrade', (req, socket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n')
    socket.on('data', (d) => socket.write(Buffer.concat([Buffer.from('echo:'), d])))
  })
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}

module.exports = { start, makeZip, makeEpub }

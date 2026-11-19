'use strict'
/** EPUB -> sections in spine order, titles from nav/NCX (port of EpubText). */
const { ZipReader } = require('./zip')
const html = require('./html')

const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g
function attrs(tag) {
  const out = {}
  let m
  attrRe.lastIndex = 0
  while ((m = attrRe.exec(tag)) !== null) out[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : m[4] || ''
  return out
}
function tags(xml, name) {
  const re = new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>`, 'gi')
  return (xml.match(re) || []).map(attrs)
}
function resolve(baseDir, href) {
  let decoded = href.split('#')[0]
  try {
    decoded = decodeURIComponent(decoded)
  } catch (e) {}
  const parts = (baseDir ? `${baseDir}/${decoded}` : decoded).split('/')
  const out = []
  for (const p of parts) {
    if (p === '' || p === '.') continue
    if (p === '..') out.pop()
    else out.push(p)
  }
  return out.join('/')
}
const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')

function read(buf) {
  const zip = buf instanceof ZipReader ? buf : new ZipReader(buf)
  const container = zip.text('META-INF/container.xml')
  if (!container) throw new Error('Not an EPUB (no container.xml)')
  const root = tags(container, 'rootfile')[0]
  const opfPath = root && root['full-path']
  if (!opfPath) throw new Error('EPUB has no package file')
  const opf = zip.text(opfPath)
  if (!opf) throw new Error('EPUB package file missing')
  const opfDir = dirOf(opfPath)
  const manifest = new Map()
  tags(opf, 'item').forEach((it) => manifest.set(it.id || '', it))
  const spine = tags(opf, 'itemref')
    .filter((it) => it.linear !== 'no')
    .map((it) => it.idref)
    .filter(Boolean)

  const titles = new Map()
  const nav = [...manifest.values()].find((it) => (it.properties || '').split(' ').includes('nav'))
  if (nav) {
    const navPath = resolve(opfDir, nav.href || '')
    const t = zip.text(navPath)
    if (t) {
      const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      let m
      while ((m = re.exec(t)) !== null) {
        const key = resolve(dirOf(navPath), m[1])
        const title = html.toText(m[2]).trim()
        if (title && !titles.has(key)) titles.set(key, title)
      }
    }
  }
  const ncx = [...manifest.values()].find((it) => it['media-type'] === 'application/x-dtbncx+xml')
  if (ncx) {
    const ncxPath = resolve(opfDir, ncx.href || '')
    const x = zip.text(ncxPath)
    if (x) {
      const re = /<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\b[^>]*src\s*=\s*["']([^"']+)["']/gi
      let m
      while ((m = re.exec(x)) !== null) {
        const key = resolve(dirOf(ncxPath), m[2])
        const title = html.toText(m[1]).trim()
        if (title && !titles.has(key)) titles.set(key, title)
      }
    }
  }

  const sections = []
  for (const idref of spine) {
    const item = manifest.get(idref)
    if (!item || !(item['media-type'] || '').includes('html') || !item.href) continue
    const p = resolve(opfDir, item.href)
    const h = zip.text(p)
    if (!h) continue
    const body = html.toText(h)
    if (!body.trim()) continue
    const title = titles.get(p) || html.firstHeading(h) || `Section ${sections.length + 1}`
    sections.push({ index: sections.length, title, href: p, text: body })
  }
  if (!sections.length) throw new Error('No readable text found in the ebook')
  return sections
}

module.exports = { read }

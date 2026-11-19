'use strict'
/** HTML -> plain text (port of HtmlText in EbookText.kt). */
const named = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', iacute: 'í',
  oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ccedil: 'ç', uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', shy: '',
  copy: '©', reg: '®', trade: '™', zwnj: '', zwj: ''
}

function decode(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    try {
      if (e[0] === '#' && (e[1] === 'x' || e[1] === 'X')) return String.fromCodePoint(parseInt(e.slice(2), 16))
      if (e[0] === '#') return String.fromCodePoint(parseInt(e.slice(1), 10))
      return named[e] !== undefined ? named[e] : m
    } catch (err) {
      return m
    }
  })
}

function toText(html) {
  let s = html
  s = s.replace(/<head\b[\s\S]*?<\/head>/gi, ' ')
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr|blockquote|section)>/gi, '\n')
  s = s.replace(/<[^>]*>/g, '')
  s = decode(s)
  return s.replace(/[ \t\x0B\f\r]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
}

function firstHeading(html) {
  const m = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(html)
  if (!m) return null
  const t = toText(m[1]).trim()
  return t || null
}

module.exports = { decode, toText, firstHeading }

'use strict'
/**
 * Everything that isn't /api/transcription goes to Audiobookshelf unchanged (HTTP and the socket.io
 * websocket). HTML pages get two tags added so the web player gains the Transcription view.
 */
const http = require('http')
const net = require('net')
const config = require('./config')
const log = require('./log')

const upstream = new URL(config.absUrl)
const upstreamPort = parseInt(upstream.port || '80', 10)
const agent = new http.Agent({ keepAlive: true, maxSockets: 256 })

const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'te', 'trailer', 'upgrade'])

function forwardedHeaders(req) {
  const h = {}
  for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) h[k] = v
  const ip = req.socket.remoteAddress || ''
  h['x-forwarded-for'] = req.headers['x-forwarded-for'] ? `${req.headers['x-forwarded-for']}, ${ip}` : ip
  if (!req.headers['x-forwarded-proto']) h['x-forwarded-proto'] = req.socket.encrypted ? 'https' : 'http'
  if (!req.headers['x-forwarded-host'] && req.headers.host) h['x-forwarded-host'] = req.headers.host
  return h
}

function wantsHtml(req) {
  return config.injectWebUi && req.method === 'GET' && /text\/html/.test(req.headers.accept || '') && !/\/api\//.test(req.url)
}

/** Where the web client lives, so injected tags work with or without ABS's router base path. */
function basePathFor(url) {
  const b = config.routerBasePath
  return b && (url === b || url.startsWith(b + '/') || url.startsWith(b + '?')) ? b : ''
}

/** The ABS+ app's WebView origins (Capacitor: http://localhost on Android, capacitor://localhost on iOS) */
const APP_FRAME_ORIGINS = 'http://localhost https://localhost capacitor://localhost'

// Changes with every start of the server, so browsers fetch the add-on's files again after an update instead of
// keeping an old copy from their cache
const ASSET_V = Date.now().toString(36)

function injectTags(html, base) {
  if (html.includes('/_abs_transcription/transcription.js')) return html
  const v = `?v=${ASSET_V}`
  const tags = `<link rel="stylesheet" href="${base}/_abs_transcription/transcription.css${v}"><script src="${base}/_abs_transcription/absplus-views.js${v}" defer></script><script src="${base}/_abs_transcription/transcription.js${v}" defer></script>`
  if (html.includes('</head>')) return html.replace('</head>', `${tags}</head>`)
  if (html.includes('</body>')) return html.replace('</body>', `${tags}</body>`)
  return html + tags
}

function proxyHttp(req, res) {
  const headers = forwardedHeaders(req)
  const inject = wantsHtml(req)
  if (inject) {
    delete headers['accept-encoding'] // need plain HTML to edit it
    // always the full page (never "304 Not Modified" straight from Audiobookshelf, which would bring back its
    // own headers and skip the edits below)
    delete headers['if-modified-since']
    delete headers['if-none-match']
  }
  const preq = http.request(
    { hostname: upstream.hostname, port: upstreamPort, method: req.method, path: req.url, headers, agent },
    (pres) => {
      const type = pres.headers['content-type'] || ''
      if (inject && pres.statusCode === 200 && type.includes('text/html') && !pres.headers['content-encoding']) {
        const chunks = []
        pres.on('data', (c) => chunks.push(c))
        pres.on('end', () => {
          const body = Buffer.from(injectTags(Buffer.concat(chunks).toString('utf8'), basePathFor(req.url)), 'utf8')
          const out = { ...pres.headers }
          // the ABS+ app shows the admin pages inside itself (Settings → Admin settings): let its WebView frame
          // the web client. Only the app's own origins are added; other sites still can't
          const csp = out['content-security-policy']
          if (typeof csp === 'string' && /frame-ancestors\s+'self'\s*(;|$)/.test(csp)) {
            out['content-security-policy'] = csp.replace(/frame-ancestors\s+'self'/, `frame-ancestors 'self' ${APP_FRAME_ORIGINS}`)
          }
          delete out['content-length']
          delete out['transfer-encoding']
          delete out.etag
          delete out['last-modified']
          out['cache-control'] = 'no-cache'
          out['content-length'] = body.length
          res.writeHead(pres.statusCode, out)
          res.end(body)
        })
        pres.on('error', () => res.destroy())
        return
      }
      const out = {}
      for (const [k, v] of Object.entries(pres.headers)) if (!HOP.has(k) || k === 'transfer-encoding') out[k] = v
      res.writeHead(pres.statusCode, pres.statusMessage, out)
      pres.pipe(res)
    }
  )
  preq.on('error', (e) => {
    log.warn(`Upstream error for ${req.method} ${req.url}: ${e.message}`)
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain' })
      res.end('Audiobookshelf is not reachable')
    } else res.destroy()
  })
  res.on('close', () => {
    if (!res.writableFinished) preq.destroy()
  })
  req.pipe(preq)
}

/** WebSocket (socket.io) upgrade: raw TCP passthrough after re-sending the request head. */
function proxyUpgrade(req, socket, head) {
  const up = net.connect(upstreamPort, upstream.hostname, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`]
    const raw = req.rawHeaders
    for (let i = 0; i < raw.length; i += 2) lines.push(`${raw[i]}: ${raw[i + 1]}`)
    if (!req.headers['x-forwarded-for']) lines.push(`X-Forwarded-For: ${socket.remoteAddress || ''}`)
    up.write(lines.join('\r\n') + '\r\n\r\n')
    if (head && head.length) up.write(head)
    socket.pipe(up).pipe(socket)
  })
  const close = () => {
    socket.destroy()
    up.destroy()
  }
  up.on('error', close)
  socket.on('error', close)
  up.on('close', () => socket.destroy())
  socket.on('close', () => up.destroy())
}

module.exports = { proxyHttp, proxyUpgrade, injectTags, basePathFor }

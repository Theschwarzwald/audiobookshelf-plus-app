'use strict'
/**
 * The newest ABS+ Android app, handed out by this server so phones can update themselves.
 *
 *   GET /abs-plus/app/latest.json   { build, versionName, versionCode, size, sha256, publishedAt, notes, url }
 *   GET /abs-plus/app/ABS+.apk      the app (range requests work, so downloads can resume)
 *
 * Both are public on purpose: the app checks before anyone signs in, and Android's installer / the
 * phone's browser can't send an Audiobookshelf token. Nothing private is in them.
 *
 * The APK lives in <DATA_DIR>/android/ (ABS+.apk + latest.json), put there by publish-app.js, so a new app
 * build reaches phones without rebuilding this image.
 */
const fs = require('fs')
const path = require('path')
const config = require('./config')

const DIR = path.join(config.dataDir, 'android')
const APK = path.join(DIR, 'ABS+.apk')
const INFO = path.join(DIR, 'latest.json')

function info(base) {
  try {
    const j = JSON.parse(fs.readFileSync(INFO, 'utf8'))
    const st = fs.statSync(APK)
    return { ...j, size: st.size, url: `${base}/abs-plus/app/ABS+.apk` }
  } catch (e) {
    return null
  }
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS' }

/** Handles /abs-plus/app/*; returns true when it did */
function handle(req, res, pathname, base) {
  const m = pathname.match(/\/abs-plus\/app\/(latest\.json|ABS\+\.apk|ABS%2B\.apk)$/)
  if (!m) return false
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return true
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (m[1] === 'latest.json') {
    const i = info(base)
    res.writeHead(i ? 200 : 404, { ...cors, 'content-type': 'application/json', 'cache-control': 'no-cache' })
    res.end(JSON.stringify(i || { error: 'No app published on this server' }))
    return true
  }
  let st
  try {
    st = fs.statSync(APK)
  } catch (e) {
    res.writeHead(404, cors)
    res.end()
    return true
  }
  const headers = { ...cors, 'content-type': 'application/vnd.android.package-archive', 'content-disposition': 'attachment; filename="ABS+.apk"', 'accept-ranges': 'bytes', 'cache-control': 'no-cache' }
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0
    const end = range[2] ? Math.min(parseInt(range[2], 10), st.size - 1) : st.size - 1
    if (start > end || start >= st.size) {
      res.writeHead(416, { ...headers, 'content-range': `bytes */${st.size}` })
      return res.end(), true
    }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 })
    if (req.method === 'HEAD') return res.end(), true
    fs.createReadStream(APK, { start, end }).pipe(res)
    return true
  }
  res.writeHead(200, { ...headers, 'content-length': st.size })
  if (req.method === 'HEAD') return res.end(), true
  fs.createReadStream(APK).pipe(res)
  return true
}

module.exports = { handle, info }

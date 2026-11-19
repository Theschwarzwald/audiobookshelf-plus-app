'use strict'
/** DjVu: text layer via djvulibre's `djvutxt` (installed in the image). Scans without OCR text have nothing to read. */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')

function read(buf) {
  const { UnsupportedEbookError, chunkByWords, sectionsFromParts } = require('./reader')
  const tmp = path.join(os.tmpdir(), `abs-djvu-${process.pid}-${Date.now()}.djvu`)
  fs.writeFileSync(tmp, buf)
  return new Promise((resolve, reject) => {
    execFile('djvutxt', [tmp], { maxBuffer: 256 * 1024 * 1024 }, (err, stdout) => {
      fs.rmSync(tmp, { force: true })
      if (err) {
        if (err.code === 'ENOENT') return reject(new UnsupportedEbookError('DjVu needs djvulibre (djvutxt), which is not installed'))
        return reject(new UnsupportedEbookError(`Couldn't read the DjVu text layer (${err.message})`))
      }
      const pages = stdout.split('\f').filter((p) => p.trim())
      if (!pages.length) return reject(new UnsupportedEbookError('This DjVu file has no text layer (it is a scan without OCR)'))
      try {
        resolve(sectionsFromParts(chunkByWords(pages)))
      } catch (e) {
        reject(e)
      }
    })
  })
}

module.exports = { read }

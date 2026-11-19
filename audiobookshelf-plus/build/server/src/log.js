'use strict'
const config = require('./config')
const levels = { debug: 10, info: 20, warn: 30, error: 40 }
const min = levels[config.logLevel] || 20
function log(level, ...args) {
  if (levels[level] < min) return
  const ts = new Date().toISOString()
  ;(level === 'error' ? console.error : console.log)(`[${ts}] [${level.toUpperCase()}] [transcription]`, ...args)
}
module.exports = {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a)
}

// Copies a built file into the ABS+ server's web folder, so the web player gets the same reader and views.
//   node copy-to-server.js <built file> <name in the server's public folder>
// The server folder is found automatically: ABS_PLUS_SERVER_PUBLIC, a server repository checked out next to this
// one, or the server repository this app sits in (app/). Without one, the app build still works.
'use strict'
const fs = require('fs')
const path = require('path')
const [src, name] = process.argv.slice(2)
const candidates = [
  process.env.ABS_PLUS_SERVER_PUBLIC,
  path.resolve(__dirname, '../../audiobookshelf-plus-server/build/server/public'),
  path.resolve(__dirname, '../../build/server/public')
].filter(Boolean)
const dir = candidates.find((d) => fs.existsSync(d))
if (!dir) {
  console.log(`No ABS+ server folder found: ${name} is only built for the app (set ABS_PLUS_SERVER_PUBLIC to copy it to a server).`)
  process.exit(0)
}
fs.copyFileSync(path.resolve(src), path.join(dir, name))
console.log(`Copied ${name} to ${dir}`)

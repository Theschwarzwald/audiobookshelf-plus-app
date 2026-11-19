/**
 * Older Android WebViews (and e-ink readers, which often ship one): the Readium navigator uses a few newer
 * built-ins (Chrome 93-97). Without them the reader stops while opening the book.
 */
if (!Object.hasOwn) Object.hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const def = (proto, name, fn) => {
  if (!proto[name]) Object.defineProperty(proto, name, { value: fn, configurable: true, writable: true })
}
def(Array.prototype, 'findLast', function (fn, that) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(that, this[i], i, this)) return this[i]
  return undefined
})
def(Array.prototype, 'findLastIndex', function (fn, that) {
  for (let i = this.length - 1; i >= 0; i--) if (fn.call(that, this[i], i, this)) return i
  return -1
})
def(Array.prototype, 'at', function (n) {
  n = Math.trunc(n) || 0
  if (n < 0) n += this.length
  return n < 0 || n >= this.length ? undefined : this[n]
})
def(String.prototype, 'at', function (n) {
  n = Math.trunc(n) || 0
  if (n < 0) n += this.length
  return n < 0 || n >= this.length ? undefined : this[n]
})
def(String.prototype, 'replaceAll', function (a, b) {
  return typeof a === 'string' ? this.split(a).join(b) : this.replace(a, b)
})
if (typeof globalThis.structuredClone !== 'function') globalThis.structuredClone = (v) => JSON.parse(JSON.stringify(v))
export {}

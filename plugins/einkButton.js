/**
 * E-ink: the round buttons (play, read mode, lock, Play from here) in the book's cover colour, as a solid fill
 * (gradients turn into dots and bands on e-ink), with a black outline to keep the edge crisp.
 */
function parse(rgb) {
  const m = String(rgb || '').match(/(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

export function einkButton(rgb, isLight) {
  const c = parse(rgb)
  if (!c) return null
  return { backgroundColor: `rgb(${c.join(',')})`, color: isLight ? 'rgb(20, 20, 20)' : '#fff', border: '2px solid #000' }
}

/** E-ink: the book's colour blended about halfway to white, for the transcript's header band */
export function einkTint(rgb, f = 0.45) {
  const c = parse(rgb)
  if (!c) return null
  return `rgb(${c.map((v) => Math.round(v * (1 - f) + 255 * f)).join(',')})`
}

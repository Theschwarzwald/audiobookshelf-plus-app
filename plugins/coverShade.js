/**
 * Cover shading, like the full-screen player: the cover's average colour at the top, fading into the
 * theme's page colour. The top colour is darkened (dark themes) or lightened (light theme) only as much
 * as needed for the theme's text colour to keep 4.5:1 contrast, so lyrics and karaoke stay readable on
 * any cover. Returns null on e-ink (greys ghost there) or without a cover colour.
 */
const parse = (c) => {
  const m = String(c || '').match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/)
  return m ? [+m[1], +m[2], +m[3]] : null
}
const lum = (c) => {
  const f = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
}
export const contrast = (a, b) => {
  const x = lum(a)
  const y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`

export function buildShade(coverRgb, bgRgb, fgRgb) {
  const cover = parse(coverRgb)
  const bg = parse(bgRgb)
  const fg = parse(fgRgb)
  if (!cover || !bg || !fg) return null
  let top = cover
  for (let t = 0.1; t <= 1.001 && contrast(top, fg) < 4.5; t += 0.1) top = mix(cover, bg, t)
  return {
    top: css(top),
    upper: css(mix(top, bg, 0.3)),
    background: `linear-gradient(180deg, ${css(top)} 0%, ${css(mix(top, bg, 0.55))} 45%, ${css(bg)} 85%)`
  }
}

/** The theme's page and text colours from the CSS variables (e.g. "35 35 35") */
export function themeColors() {
  const cs = getComputedStyle(document.documentElement)
  return { bg: cs.getPropertyValue('--color-bg'), fg: cs.getPropertyValue('--color-fg') }
}

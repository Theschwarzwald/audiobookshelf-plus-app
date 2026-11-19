/**
 * Reader colours. Dark, Light, OLED and the four e-ink modes are Grimmory Reader's palettes;
 * Sepia is kept from before. E-ink modes turn off animations (they ghost on e-paper), and the
 * black-and-white ones show images in greyscale.
 */
export const PALETTES = {
  dark: { page: '#0F0D0C', fg: '#E9E5E1', bar: '#0A0908', panel: '#151312', border: '#2B2826', field: '#1C1A19', accent: '#1AD691', accentSoft: '#0E3326', onAccent: '#06251A', muted: '#9C9692', faint: '#6C6763', light: false, eink: false, mono: false },
  light: { page: '#FBF9F6', fg: '#1B1815', bar: '#FFFFFF', panel: '#FFFFFF', border: '#E3DED9', field: '#EFEBE7', accent: '#0F9E6A', accentSoft: '#D3F5E7', onAccent: '#FFFFFF', muted: '#68615B', faint: '#9A928B', light: true, eink: false, mono: false },
  sepia: { page: '#F4ECD8', fg: '#5B4636', bar: '#EDE2C9', panel: '#F1E7D0', border: '#D8C9A9', field: '#E9DCC0', accent: '#0F8A5F', accentSoft: '#D7EBD9', onAccent: '#FFFFFF', muted: '#7A6550', faint: '#A08B74', light: true, eink: false, mono: false },
  oled: { page: '#000000', fg: '#E6E6E6', bar: '#000000', panel: '#080808', border: '#1E1E1E', field: '#101010', accent: '#1AD691', accentSoft: '#0B2A1F', onAccent: '#06251A', muted: '#8A8A8A', faint: '#5E5E5E', light: false, eink: false, mono: false },
  eink: { page: '#FFFFFF', fg: '#000000', bar: '#FFFFFF', panel: '#FFFFFF', border: '#000000', field: '#FFFFFF', accent: '#000000', accentSoft: '#DDDDDD', onAccent: '#FFFFFF', muted: '#222222', faint: '#444444', light: true, eink: true, mono: true },
  'eink-dark': { page: '#000000', fg: '#FFFFFF', bar: '#000000', panel: '#000000', border: '#FFFFFF', field: '#000000', accent: '#FFFFFF', accentSoft: '#333333', onAccent: '#000000', muted: '#DDDDDD', faint: '#BBBBBB', light: false, eink: true, mono: true },
  'eink-color': { page: '#FFFFFF', fg: '#000000', bar: '#FFFFFF', panel: '#FFFFFF', border: '#000000', field: '#FFFFFF', accent: '#E65100', accentSoft: '#FFE0B2', onAccent: '#FFFFFF', muted: '#222222', faint: '#444444', light: true, eink: true, mono: false },
  'eink-color-dark': { page: '#000000', fg: '#FFFFFF', bar: '#000000', panel: '#000000', border: '#FFFFFF', field: '#000000', accent: '#FF9800', accentSoft: '#4A2A00', onAccent: '#000000', muted: '#DDDDDD', faint: '#BBBBBB', light: false, eink: true, mono: false }
}

/** The reader theme that matches the app's theme (used until you pick one in the reader) */
export function themeForApp(appTheme) {
  const map = { black: 'oled', dark: 'dark', light: 'light', eink: 'eink', 'eink-dark': 'eink-dark', 'eink-color': 'eink-color', 'eink-color-dark': 'eink-color-dark' }
  return map[appTheme] || 'dark'
}

/** Older settings used "black" for what is now OLED */
export function themeKey(theme) {
  if (theme === 'black') return 'oled'
  return PALETTES[theme] ? theme : 'dark'
}

export function palette(theme) {
  return PALETTES[themeKey(theme)]
}

export const THEME_ITEMS = [
  { text: 'Dark', value: 'dark' },
  { text: 'Light', value: 'light' },
  { text: 'Sepia', value: 'sepia' },
  { text: 'OLED', value: 'oled' },
  { text: 'E-ink', value: 'eink' },
  { text: 'E-ink dark', value: 'eink-dark' },
  { text: 'Colour e-ink', value: 'eink-color' },
  { text: 'Colour e-ink dark', value: 'eink-color-dark' }
]

import { highlightColors, currentMode } from '../onboarding/colorVision'

/**
 * Black-and-white e-ink: the highlight colours as four greys light to dark (the panel can't show colour, and
 * colour comes out as dots), the underline in ink. Null on other screens.
 */
function monoHighlights(alpha) {
  const t = (typeof document !== 'undefined' && document.documentElement.dataset.theme) || ''
  if (t !== 'eink' && t !== 'eink-dark') return null
  const ink = t === 'eink' ? '0, 0, 0' : '255, 255, 255'
  const k = alpha ? 0.6 : 1
  return { yellow: `rgba(${ink}, ${0.12 * k})`, green: `rgba(${ink}, ${0.22 * k})`, blue: `rgba(${ink}, ${0.34 * k})`, pink: `rgba(${ink}, ${0.48 * k})`, underline: `rgb(${ink})` }
}

/** Highlight colours for the current colour vision mode (swatches and lists) */
export function hlColors() {
  return monoHighlights(false) || highlightColors(currentMode()) || HIGHLIGHT_COLORS
}

/** The same, lighter, for drawing over text in the book */
export function hlColorsForPage() {
  const mono = monoHighlights(true)
  if (mono) return mono
  const c = highlightColors(currentMode())
  if (!c) return null
  const out = {}
  for (const k in c) out[k] = k === 'underline' ? c[k] : c[k].replace(/[\d.]+\)$/, '0.45)')
  return out
}

export const HIGHLIGHT_COLORS = { yellow: 'rgba(255, 214, 0, 0.75)', green: 'rgba(76, 175, 80, 0.7)', blue: 'rgba(66, 165, 245, 0.7)', pink: 'rgba(240, 98, 146, 0.7)', underline: 'rgba(255, 82, 82, 0.9)' }

/**
 * The book's own colour for buttons and accents (the play / read-mode buttons, sliders, selected icons),
 * taken from the cover like the player's gradient. Made light or dark enough to stand out on the page,
 * with text in white or black to match. E-ink keeps its ink colours. Returns the palette unchanged without one.
 */
export function withCoverAccent(pal, coverRgb) {
  if (!pal || pal.eink || !coverRgb) return pal
  const m = String(coverRgb).match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/)
  if (!m) return pal
  let [r, g, b] = [+m[1], +m[2], +m[3]].map((v) => v / 255)
  // to HSL
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  // a dull cover still gives a clear colour; the lightness suits the page
  const sat = Math.max(s, 0.35)
  const light = pal.light ? 0.38 : 0.62
  const hsl = (H, S, L) => {
    const f = (n) => {
      const k = (n + H * 12) % 12
      const a = S * Math.min(L, 1 - L)
      return Math.round((L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
    }
    return [f(0), f(8), f(4)]
  }
  const [R, G, B] = hsl(h, sat, light)
  const [R2, G2, B2] = hsl(h, sat * 0.6, pal.light ? 0.9 : 0.2)
  const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255
  return { ...pal, accent: `rgb(${R}, ${G}, ${B})`, accentSoft: `rgb(${R2}, ${G2}, ${B2})`, onAccent: lum > 0.6 ? '#111111' : '#FFFFFF' }
}

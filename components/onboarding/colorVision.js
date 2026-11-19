/**
 * Colour vision modes. Status colours, the app's accent and reading highlights switch to the
 * Okabe-Ito palette, which stays distinguishable with every common colour vision deficiency; meaning
 * is never carried by colour alone (labels, icons and line styles stay). "No colour" shows the whole
 * app in greyscale with the shapes doing the work.
 */
export const MODES = [
  { id: 'none', label: 'Standard colours', description: 'The usual colours.' },
  { id: 'protan', label: 'Red-weak (protanopia)', description: 'Reds look darker and close to greens. Uses blue and orange instead of green and red.' },
  { id: 'deutan', label: 'Green-weak (deuteranopia)', description: 'The most common kind: greens and reds look alike. Uses blue and orange instead.' },
  { id: 'tritan', label: 'Blue-weak (tritanopia)', description: 'Blues and greens, yellows and pinks look alike. Uses teal, vermilion and purple.' },
  { id: 'mono', label: 'No colour (monochrome)', description: 'Everything in shades of grey, with stronger contrast.' }
]

/** Sample colours for the setup preview: [success, error, warning, accent] */
export const SAMPLES = {
  none: ['#4CAF50', '#FF5252', '#FB8C00', '#1ad691'],
  protan: ['#0072B2', '#D55E00', '#E69F00', '#56B4E9'],
  deutan: ['#0072B2', '#D55E00', '#E69F00', '#56B4E9'],
  tritan: ['#009E73', '#D55E00', '#CC79A7', '#009E73'],
  mono: ['#4a4a4a', '#111111', '#8a8a8a', '#bbbbbb']
}

/** Reading highlight colours for each mode (names stay: yellow, green, blue, pink, underline) */
export function highlightColors(mode) {
  if (mode === 'protan' || mode === 'deutan' || mode === 'tritan') {
    return { yellow: 'rgba(240, 228, 66, 0.6)', green: 'rgba(0, 158, 115, 0.45)', blue: 'rgba(86, 180, 233, 0.5)', pink: 'rgba(204, 121, 167, 0.5)', underline: 'rgba(213, 94, 0, 0.95)' }
  }
  return null
}

export function currentMode() {
  const cls = document.documentElement.className.match(/\bcvd-(\w+)/)
  return cls ? cls[1] : 'none'
}

export function applyColorVision(mode) {
  const html = document.documentElement
  MODES.forEach((m) => html.classList.remove(`cvd-${m.id}`))
  if (mode && mode !== 'none') html.classList.add(`cvd-${mode}`)
}

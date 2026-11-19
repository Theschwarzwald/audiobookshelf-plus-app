/**
 * Page-turn animations for both readers (Grimmory Reader's page curl, slide and fade).
 *
 * The app's native AbsPageTurn plugin (exposed to this frame as window.AbsTurnHost) snapshots the page
 * and lays the snapshot over the reader; the real page turns underneath; then the snapshot curls (or
 * slides, or fades) away. Turning back: the old page stays on top while the previous page is drawn, then
 * the previous page uncurls over it.
 *
 * settings.turnAnimation: curl (default) | slide | fade | none
 * settings.turnDirection: follow (the book's own direction; right-to-left books turn the other way) |
 *                         left (pages turn to the left, next = right edge) | right (mirrored)
 * No animation on e-ink, when the device is saving power (settings.animate === false), or in scrolled mode.
 */
let busy = false

export function turnStyle(settings, eink) {
  // ABS+: pages turn instantly (no curl / slide / fade): the animations redrew the whole page every frame,
  // which took a lot of power and got in the way of reading along
  return 'none'
  // eslint-disable-next-line no-unreachable
  const s = (settings && settings.turnAnimation) || 'curl'
  if (s === 'none' || eink || (settings && settings.animate === false) || (settings && settings.flow === 'scrolled')) return 'none'
  return ['curl', 'slide', 'fade'].includes(s) ? s : 'curl'
}

/** true when "next" is on the right-hand edge (pages turn toward the left) */
export function nextOnRight(settings, rtlBook) {
  const d = (settings && settings.turnDirection) || 'follow'
  if (d === 'left') return true
  if (d === 'right') return false
  return !rtlBook
}

const frames = (n) => new Promise((res) => {
  const step = () => (--n <= 0 ? res() : requestAnimationFrame(step))
  requestAnimationFrame(step)
})

/**
 * dir: 1 = next, -1 = previous. turn(): changes the page. drawn(): resolves once the new page is drawn.
 */
export async function animatedTurn(dir, { style, fromRight, paper, turn, drawn }) {
  const host = window.AbsTurnHost
  if (!host || style === 'none' || busy) {
    if (busy && host) host.cancel().catch(() => {}) // tapping quickly: skip straight to the page
    return turn()
  }
  busy = true
  let began = false
  try {
    const r = await host.begin({ style, forward: dir > 0, fromRight, paper: paper || '#ffffff' })
    began = !!(r && r.ok)
  } catch (e) {}
  try {
    await turn()
    if (!began) return
    await Promise.race([drawn(), new Promise((r) => setTimeout(r, 900))])
    await frames(2)
    await host.finish({ duration: style === 'fade' ? 260 : style === 'slide' ? 320 : 450 })
  } catch (e) {
    if (began) host.cancel().catch(() => {})
  } finally {
    busy = false
  }
}

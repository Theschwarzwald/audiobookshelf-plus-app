/**
 * Power saving (Android's battery saver, or ABS+'s own low-power level) slows the word animations in the player and
 * the transcript down to save battery. Say so once per app session, when one of those screens opens.
 * Not on e-ink, where the animations are already stepped on purpose.
 */
let shown = false

export function warnPowerSaving(vm) {
  if (shown || !vm || !vm.$store) return
  const g = vm.$store.getters
  if (g['device/isEink'] || !g['device/lowPower']) return
  shown = true
  const p = vm.$store.state.device.power || {}
  const why = p.powerSave ? 'Power saving mode is on' : p.thermal >= 3 ? 'The phone is running hot' : 'The battery is low'
  vm.$toast.info(`${why}: word animations will be slower and less smooth to save battery.`, { timeout: 6000 })
}

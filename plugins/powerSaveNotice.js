/**
 * Power saving (Android's battery saver, a low battery, heat, Battery saver chosen in Settings, or ABS+ easing off by
 * itself after the phone got warm, ran low on memory or dropped frames) makes the word highlight in the player and the
 * transcript step instead of glide, to save battery. Say so, with the reason, once per app session, when one of those
 * screens opens. Not on e-ink, where the highlight steps on purpose.
 */
let shown = false

export function warnPowerSaving(vm) {
  if (shown || !vm || !vm.$store) return
  const g = vm.$store.getters
  if (g['device/isEink'] || g['device/effectiveTier'] !== 'low') return
  shown = true
  const st = vm.$store.state.device
  const p = st.power || {}
  let why
  if (g['device/lowPower']) {
    if (st.prefs && st.prefs.power === 'saver') why = 'Battery saver is chosen in Settings'
    else if (p.thermal >= 3) why = 'The phone is running hot'
    else if (p.powerSave) why = 'Power saving mode is on'
    else why = 'The battery is low'
  } else {
    const reason = (st.learned && st.learned.reason) || 'the phone was struggling'
    why = 'ABS+ eased off because ' + reason
  }
  vm.$toast.info(`${why}: the word highlight will step instead of glide to save battery. Settings → Device & performance has the details.`, { timeout: 7000 })
}

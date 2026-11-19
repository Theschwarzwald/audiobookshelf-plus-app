/**
 * Screen lock settings (the lock button in the player and the transcription views).
 *   method: 'device' = the phone's own unlock (face, fingerprint, its PIN)  ·  'pin' = a PIN just for ABS+
 * The PIN is kept only as a salted SHA-256 hash.
 */
const KEY = 'absScreenLock'

export function lockSettings() {
  try {
    return { method: 'device', pinHash: '', pinLength: 4, salt: '', ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch (e) {
    return { method: 'device', pinHash: '', pinLength: 4, salt: '' }
  }
}

export function saveLockSettings(patch) {
  const s = { ...lockSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(s))
  return s
}

async function hash(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * How the screen lock unlocks here: 'pin' (the ABS+ PIN) or 'device' (face / fingerprint / the phone's PIN).
 * E-ink readers: the ABS+ PIN unless a face or fingerprint is set up on the device.
 */
export async function unlockMethod(AbsDevice, isEink) {
  const s = lockSettings()
  if (s.method === 'pin') return 'pin'
  const b = await AbsDevice.biometricAvailable().catch(() => ({ available: false, hardware: false }))
  // no face or fingerprint sensor on this device: the face / fingerprint choice is switched off, the PIN unlocks
  if (b.hardware === false) return 'pin'
  if (isEink) return b.available ? 'device' : 'pin'
  const r = await AbsDevice.deviceUnlockAvailable().catch(() => ({ available: false }))
  return r.available ? 'device' : 'pin'
}

export async function setPin(pin) {
  const salt = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
  return saveLockSettings({ pinHash: await hash(pin, salt), salt, pinLength: pin.length })
}

export async function checkPin(pin) {
  const s = lockSettings()
  if (!s.pinHash) return false
  return (await hash(pin, s.salt)) === s.pinHash
}

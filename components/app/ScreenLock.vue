<template>
  <div>
    <!-- Screen lock: the player / transcript stays in view and keeps following, touches do nothing.
         The screen dims after a few seconds but doesn't sleep. Double-tap to unlock (PIN or the phone's own unlock). -->
    <div v-if="locked" class="screen-lock fixed inset-0" @touchstart.prevent.stop="onTouch" @mousedown.prevent.stop="onTouch" @click.prevent.stop @contextmenu.prevent.stop>
      <div v-if="!eink" class="absolute inset-0 bg-black pointer-events-none transition-opacity duration-700" :style="{ opacity: dimmed ? 0.12 : 0 }" />
      <div class="absolute left-0 right-0 flex justify-center pointer-events-none" :class="eink ? '' : 'transition-opacity duration-500'" :style="{ top: 'calc(var(--sat, env(safe-area-inset-top)) + 76px)', opacity: showBadge ? 1 : 0 }">
        <div class="px-4 py-1.5 rounded-full flex items-center text-sm font-semibold shadow-lg" :style="c.badge">
          <span class="material-symbols fill text-base mr-1.5">lock</span>Locked · double-tap to unlock
        </div>
      </div>
    </div>

    <!-- PIN pad: unlock, or choose a PIN (typed twice) -->
    <div v-if="pad" class="screen-lock fixed inset-0 flex items-center justify-center" :style="c.backdrop" @touchstart.stop @mousedown.stop @click.stop>
      <div class="w-72 rounded-2xl p-5 text-center" :style="c.card">
        <p class="font-semibold mb-1">{{ padTitle }}</p>
        <p class="text-xs mb-3" :style="{ color: pinError ? (eink ? '#000' : '#dc2626') : c.muted, fontWeight: pinError && eink ? 700 : null }">{{ pinError || padSub }}</p>
        <div class="flex justify-center mb-4">
          <span v-for="i in Math.max(4, pin.length)" :key="i" class="w-3 h-3 rounded-full mx-1.5" :style="i <= pin.length ? c.dotOn : c.dotOff" />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" class="h-14 rounded-full text-2xl" :style="c.key" @click="pinKey(d)">{{ d }}</button>
          <button class="h-14 rounded-full text-sm" @click="cancelPad">Cancel</button>
          <button class="h-14 rounded-full text-2xl" :style="c.key" @click="pinKey('0')">0</button>
          <button class="h-14 rounded-full flex items-center justify-center" @click="pin = pin.slice(0, -1)"><span class="material-symbols">backspace</span></button>
        </div>
        <button v-if="pad !== 'unlock' && pin.length >= 4" class="mt-4 w-full h-11 rounded-full font-semibold" :style="c.primary" @click="confirmNewPin">{{ pad === 'new' ? 'Next' : 'Set PIN' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { AbsDevice } from '@/plugins/capacitor'
import { lockSettings, checkPin, setPin, unlockMethod } from '@/plugins/screenLock'

export default {
  data() {
    return {
      locked: false,
      dimmed: false,
      showBadge: false,
      pad: null, // 'unlock' | 'new' | 'confirm'
      pin: '',
      firstPin: '',
      pinError: '',
      lockAfterSet: false,
      lastTap: 0,
      dimTimer: null,
      badgeTimer: null,
      unlocking: false
    }
  },
  computed: {
    eink() {
      return this.$store.getters['device/isEink'] || (this.$store.getters['device/theme'] || '').startsWith('eink')
    },
    /** Light, high-contrast on e-ink (like light mode); dark elsewhere */
    c() {
      if (this.eink) {
        return {
          badge: { background: '#fff', color: '#000', border: '2px solid #000' },
          backdrop: { background: 'rgba(255, 255, 255, 0.92)' },
          card: { background: '#fff', color: '#000', border: '2px solid #000' },
          muted: '#444',
          key: { background: '#fff', color: '#000', border: '2px solid #000' },
          dotOn: { backgroundColor: '#000' },
          dotOff: { backgroundColor: '#fff', border: '2px solid #000' },
          primary: { background: '#000', color: '#fff' }
        }
      }
      return {
        badge: { background: 'rgba(0, 0, 0, 0.6)', color: '#fff' },
        backdrop: { background: 'rgba(0, 0, 0, 0.7)' },
        card: { background: '#262626', color: '#fff' },
        muted: 'rgba(255,255,255,0.6)',
        key: { background: 'rgba(255, 255, 255, 0.1)', color: '#fff' },
        dotOn: { backgroundColor: '#fff' },
        dotOff: { backgroundColor: 'rgba(255,255,255,0.25)' },
        primary: { background: '#fff', color: '#000' }
      }
    },
    padTitle() {
      if (this.pad === 'new') return 'Choose a PIN'
      if (this.pad === 'confirm') return 'Enter it again'
      return 'Enter your PIN'
    },
    padSub() {
      if (this.pad === 'new') return this.lockAfterSet ? 'First, a PIN to unlock with (4 to 8 digits). Needed before the screen can lock.' : '4 to 8 digits, to unlock the screen lock'
      if (this.pad === 'confirm') return 'To make sure'
      return 'To unlock the screen'
    }
  },
  methods: {
    async lock() {
      if (this.locked || this.pad) return
      // Never lock without a way back in: the first time, always choose an ABS+ PIN (it's also the fallback when
      // face, fingerprint or the phone's own unlock fails or isn't there), then lock
      if (!this.hasPin()) {
        this.lockAfterSet = true
        return this.openNewPin()
      }
      this.doLock()
    },
    /** A PIN is saved (and the storage it lives in works) */
    hasPin() {
      const s = lockSettings()
      return !!(s.pinHash && s.salt && (s.pinLength || 0) >= 4)
    },
    /**
     * Locking hides the status bar, and on Android 15+ the page would then slide up under the camera. Keep every
     * view exactly where it was: hold the top spacing at the status bar's height (--sat, used instead of the
     * system's safe-area value) and fill that strip with black (html.screen-locked, assets/tailwind.css).
     */
    holdTopInset(on, statusBarTop) {
      const html = document.documentElement
      window.removeEventListener('resize', this._insetResize || (() => {}))
      if (!on) {
        // unlocking: the bars come back and the page shrinks below them; drop the held space as that happens
        const was = window.innerHeight
        const clear = () => {
          html.classList.remove('screen-locked')
          html.style.removeProperty('--sat')
        }
        if (!html.classList.contains('screen-locked')) return clear()
        this._insetResize = () => {
          if (window.innerHeight < was - 8) {
            window.removeEventListener('resize', this._insetResize)
            clear()
          }
        }
        window.addEventListener('resize', this._insetResize)
        setTimeout(() => (window.removeEventListener('resize', this._insetResize), clear()), 1500)
        return
      }
      // Android says how tall the status bar is (the page sits below it, so the web view's own safe-area value is 0)
      let h = Number(statusBarTop) || 0
      if (!h) {
        const probe = document.createElement('div')
        probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;height:env(safe-area-inset-top)'
        document.body.appendChild(probe)
        h = probe.getBoundingClientRect().height
        probe.remove()
      }
      if (!h) return
      // apply it the moment the bars hide and the page grows up into their place, so nothing moves on screen
      const was = window.innerHeight
      this._insetResize = () => {
        if (window.innerHeight > was + 8 && this.locked) {
          window.removeEventListener('resize', this._insetResize)
          html.style.setProperty('--sat', `${Math.round(h)}px`)
          html.classList.add('screen-locked')
        }
      }
      window.addEventListener('resize', this._insetResize)
    },
    doLock() {
      this.locked = true
      window.__absScreenLocked = true
      this.$store.commit('setScreenLocked', true)
      this.$hapticsImpact && this.$hapticsImpact()
      AbsDevice.setScreenDim({ dim: false, keepOn: true }).catch(() => {})
      // the status bar's height comes back before the bars hide (they wait for the pin), so nothing moves
      AbsDevice.setLockMode({ on: true })
        .then((r) => {
          if (!this.locked) return
          this.holdTopInset(true, r && r.statusBarTop)
          // iOS can't pin apps: Guided Access is the system's way to keep ABS+ on screen
          if (this.$platform === 'ios' && r && !r.pinned && !r.guidedAccess && !this._guidedHintShown) {
            this._guidedHintShown = true
            this.$toast.info('To keep ABS+ on screen, turn on Guided Access (Settings → Accessibility → Guided Access), then triple-click the side button.')
          }
        })
        .catch(() => this.locked && this.holdTopInset(true))
      this.flashBadge()
      this.scheduleDim()
    },
    unlockDone() {
      this.locked = false
      this.dimmed = false
      this.pad = null
      this.pin = ''
      this.pinError = ''
      window.__absScreenLocked = false
      this.$store.commit('setScreenLocked', false)
      this.holdTopInset(false)
      clearTimeout(this.dimTimer)
      clearTimeout(this.badgeTimer)
      AbsDevice.setScreenDim({ dim: false, keepOn: false }).catch(() => {})
      AbsDevice.setLockMode({ on: false }).catch(() => {})
    },
    scheduleDim() {
      clearTimeout(this.dimTimer)
      this.dimTimer = setTimeout(() => {
        if (!this.locked || this.pad) return
        this.dimmed = true
        AbsDevice.setScreenDim({ dim: true, keepOn: true, level: 0.3 }).catch(() => {})
      }, 8000)
    },
    brighten() {
      if (this.dimmed) {
        this.dimmed = false
        AbsDevice.setScreenDim({ dim: false, keepOn: true }).catch(() => {})
      }
      this.scheduleDim()
    },
    flashBadge() {
      this.showBadge = true
      clearTimeout(this.badgeTimer)
      this.badgeTimer = setTimeout(() => (this.showBadge = false), 3000)
    },
    onTouch() {
      if (this.pad || this.unlocking) return
      const now = Date.now()
      if (now - this.lastTap < 400) {
        this.lastTap = 0
        this.startUnlock()
        return
      }
      this.lastTap = now
      this.brighten()
      this.flashBadge()
    },
    async startUnlock() {
      this.brighten()
      // safety net: no PIN saved any more (app data cleared) means nothing could unlock it, so just unlock
      if (!this.hasPin()) return this.unlockDone()
      const usePin = (await unlockMethod(AbsDevice, this.eink)) === 'pin'
      if (usePin) {
        this.pin = ''
        this.pinError = ''
        this.pad = 'unlock'
        clearTimeout(this.dimTimer)
        return
      }
      this.unlocking = true
      try {
        const r = await AbsDevice.confirmDeviceUnlock({ title: 'Unlock the screen', subtitle: 'ABS+ screen lock' })
        if (r && r.ok) this.unlockDone()
        else this.openUnlockPin() // cancelled or failed: the ABS+ PIN instead
      } catch (e) {
        this.openUnlockPin()
      } finally {
        this.unlocking = false
      }
    },
    openUnlockPin() {
      this.pin = ''
      this.pinError = ''
      this.pad = 'unlock'
      clearTimeout(this.dimTimer)
    },
    openNewPin() {
      this.pin = ''
      this.firstPin = ''
      this.pinError = ''
      this.pad = 'new'
    },
    async pinKey(d) {
      if (this.pin.length >= 8) return
      this.pin += d
      this.pinError = ''
      if (this.pad !== 'unlock') return
      const s = lockSettings()
      const need = s.pinLength || 4
      if (this.pin.length < need) return
      if (await checkPin(this.pin)) this.unlockDone()
      else {
        this.pinError = 'Wrong PIN'
        this.pin = ''
      }
    },
    async confirmNewPin() {
      if (this.pad === 'new') {
        this.firstPin = this.pin
        this.pin = ''
        this.pad = 'confirm'
        return
      }
      if (this.pin !== this.firstPin) {
        this.pinError = "The PINs didn't match. Try again."
        this.pin = ''
        this.firstPin = ''
        this.pad = 'new'
        return
      }
      // save it and read it back before anything locks: if it didn't save, don't lock
      let saved = false
      try {
        await setPin(this.pin)
        saved = this.hasPin() && (await checkPin(this.pin))
      } catch (e) {}
      if (!saved) {
        this.pinError = "Couldn't save the PIN, so the screen wasn't locked. Try again."
        this.pin = ''
        this.firstPin = ''
        this.pad = 'new'
        this.lockAfterSet = false
        return
      }
      this.$eventBus.$emit('screen-lock-pin-set')
      this.pad = null
      this.pin = ''
      this.firstPin = ''
      this.$toast.success('PIN set')
      if (this.lockAfterSet) {
        this.lockAfterSet = false
        this.doLock()
      }
    },
    cancelPad() {
      const wasUnlock = this.pad === 'unlock'
      this.pad = null
      this.pin = ''
      this.lockAfterSet = false
      if (wasUnlock) this.scheduleDim()
    },
    setPinFromSettings() {
      this.lockAfterSet = false
      this.openNewPin()
    }
  },
  mounted() {
    this.$eventBus.$on('screen-lock', this.lock)
    this.$eventBus.$on('screen-lock-setpin', this.setPinFromSettings)
  },
  beforeDestroy() {
    this.$eventBus.$off('screen-lock', this.lock)
    this.$eventBus.$off('screen-lock-setpin', this.setPinFromSettings)
    if (this.locked) this.unlockDone()
  }
}
</script>

<style scoped>
.screen-lock {
  z-index: 2147483000;
  touch-action: none;
}
</style>

import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Native page-turn animations (page curl, slide, fade) for the readers; see AbsPageTurn.kt and
 * static/reader/turn.js. Only on Android: elsewhere the readers turn pages without the overlay.
 */
const AbsPageTurn = registerPlugin('AbsPageTurn')

/** Gives a reader frame (reader.html / pages.html) access to the animation, as window.AbsTurnHost */
export function installTurnHost(frameWindow) {
  if (!frameWindow || Capacitor.getPlatform() !== 'android') return
  frameWindow.AbsTurnHost = {
    begin: (o) => AbsPageTurn.begin(o),
    finish: (o) => AbsPageTurn.finish(o || {}),
    cancel: () => AbsPageTurn.cancel()
  }
}

export { AbsPageTurn }

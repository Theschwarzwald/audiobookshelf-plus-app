package com.audiobookshelf.app.plugins

import android.animation.ValueAnimator
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import android.widget.FrameLayout
import com.audiobookshelf.app.device.PageTurnView
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Page-turn animations for the readers (Grimmory Reader's page curl, plus slide and fade).
 * A snapshot of the page covers the reader while the real page changes underneath, then animates away:
 *
 *   begin({ style, forward, fromRight, paper })   snapshot now. Forward: this page will curl away.
 *                                                Back: this page becomes the one underneath.
 *   finish({ duration })                          (after the reader has turned and drawn the new page)
 *                                                forward: animate the snapshot away; back: snapshot the
 *                                                previous page and uncurl it over the old one.
 *   cancel()                                      remove the overlay at once
 */
@CapacitorPlugin(name = "AbsPageTurn")
class AbsPageTurn : Plugin() {
  private var overlay: PageTurnView? = null
  private var forward = true
  private var animator: ValueAnimator? = null

  private fun snapshot(): Bitmap? {
    val web = bridge?.webView ?: return null
    if (web.width <= 0 || web.height <= 0) return null
    return try {
      val b = Bitmap.createBitmap(web.width, web.height, Bitmap.Config.ARGB_8888)
      web.draw(Canvas(b))
      b
    } catch (e: Throwable) {
      null // out of memory on a huge screen: just turn without the animation
    }
  }

  private fun parentOf(): ViewGroup? = bridge?.webView?.parent as? ViewGroup

  private fun removeOverlay() {
    animator?.cancel()
    animator = null
    overlay?.let { v ->
      (v.parent as? ViewGroup)?.removeView(v)
      v.topPage?.recycle()
      v.underPage?.recycle()
    }
    overlay = null
  }

  @PluginMethod
  fun begin(call: PluginCall) {
    activity.runOnUiThread {
      removeOverlay()
      val shot = snapshot()
      val parent = parentOf()
      if (shot == null || parent == null) return@runOnUiThread call.resolve(JSObject().put("ok", false))
      forward = call.getBoolean("forward") ?: true
      val v = PageTurnView(context)
      v.style = call.getString("style") ?: "curl"
      v.fromRight = call.getBoolean("fromRight") ?: true
      v.paper = runCatching { Color.parseColor(call.getString("paper") ?: "#ffffff") }.getOrDefault(Color.WHITE)
      if (forward) {
        v.topPage = shot
        v.progress = 0f
      } else {
        v.underPage = shot // the old page stays on screen while the previous one is prepared underneath
        v.progress = 1f
      }
      parent.addView(v, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
      overlay = v
      call.resolve(JSObject().put("ok", true))
    }
  }

  @PluginMethod
  fun finish(call: PluginCall) {
    val duration = (call.getInt("duration") ?: 450).toLong().coerceIn(80, 1500)
    activity.runOnUiThread {
      val v = overlay ?: return@runOnUiThread call.resolve()
      if (!forward) {
        // The previous page is now drawn in the reader: snapshot it and uncurl it over the old page
        val prev = snapshot()
        if (prev == null) {
          removeOverlay()
          return@runOnUiThread call.resolve()
        }
        v.topPage = prev
      }
      val anim = if (forward) ValueAnimator.ofFloat(0f, 1f) else ValueAnimator.ofFloat(1f, 0f)
      anim.duration = duration
      anim.interpolator = PathInterpolator(0.4f, 0f, 0.2f, 1f) // fast out, slow in
      anim.addUpdateListener { v.progress = it.animatedValue as Float }
      anim.addListener(object : android.animation.AnimatorListenerAdapter() {
        override fun onAnimationEnd(a: android.animation.Animator) {
          if (overlay === v) removeOverlay()
          call.resolve()
        }
        override fun onAnimationCancel(a: android.animation.Animator) {
          call.resolve()
        }
      })
      animator = anim
      anim.start()
    }
  }

  @PluginMethod
  fun cancel(call: PluginCall) {
    activity.runOnUiThread {
      removeOverlay()
      call.resolve()
    }
  }

  override fun handleOnDestroy() {
    activity?.runOnUiThread { removeOverlay() }
    super.handleOnDestroy()
  }
}

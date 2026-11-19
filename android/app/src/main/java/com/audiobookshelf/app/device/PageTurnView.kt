package com.audiobookshelf.app.device

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.view.View
import kotlin.math.max
import kotlin.math.min

/**
 * Draws a page turn over the reader, from snapshots of the page (ported from Grimmory Reader's PageCurl):
 *
 *  - curl: the page folds along a vertical line moving from its free edge to the spine; the turned part
 *    shows the back of the paper (a faint mirror of the printing), shaded along the fold, and casts a
 *    shadow on the page underneath, which shows where this page has lifted.
 *  - slide: the page slides off sideways.   - fade: the page fades out.
 *
 * [topPage] is the page that moves (progress 0 = lying flat, 1 = gone); [underPage] (optional) is drawn beneath it,
 * otherwise the real reader shows through. [fromRight] = the free edge is on the right (turning left).
 */
class PageTurnView(ctx: Context) : View(ctx) {
  var topPage: Bitmap? = null
  var underPage: Bitmap? = null
  var progress = 0f
    set(v) {
      field = v
      invalidate()
    }
  var fromRight = true
  var style = "curl"
  var paper = Color.WHITE

  private val bmpPaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)

  override fun onDraw(canvas: Canvas) {
    underPage?.let { canvas.drawBitmap(it, null, android.graphics.Rect(0, 0, width, height), bmpPaint) }
    val page = topPage ?: return
    val t = progress.coerceIn(0f, 1f)
    if (t >= 0.999f) return
    val w = width.toFloat()
    val h = height.toFloat()
    val dst = android.graphics.RectF(0f, 0f, w, h)
    when (style) {
      "fade" -> {
        bmpPaint.alpha = ((1f - t) * 255).toInt()
        canvas.drawBitmap(page, null, dst, bmpPaint)
        bmpPaint.alpha = 255
      }
      "slide" -> {
        val dx = if (fromRight) -w * t else w * t
        canvas.save()
        canvas.translate(dx, 0f)
        canvas.drawBitmap(page, null, dst, bmpPaint)
        // a soft edge shadow on the side it leaves
        val sx = if (fromRight) w else 0f
        val sw = min(w * 0.06f, 40f)
        fill.shader = LinearGradient(sx, 0f, if (fromRight) sx + sw else sx - sw, 0f, Color.argb(70, 0, 0, 0), Color.TRANSPARENT, Shader.TileMode.CLAMP)
        canvas.drawRect(if (fromRight) sx else sx - sw, 0f, if (fromRight) sx + sw else sx, h, fill)
        fill.shader = null
        canvas.restore()
      }
      else -> drawCurl(canvas, page, dst, w, h, t)
    }
  }

  private fun drawCurl(canvas: Canvas, page: Bitmap, dst: android.graphics.RectF, w: Float, h: Float, t: Float) {
    if (t <= 0.001f) {
      canvas.drawBitmap(page, null, dst, bmpPaint)
      return
    }
    // The fold moves from the free edge to the spine; the free edge itself travels twice as far
    val fold = if (fromRight) w * (1f - t) else w * t
    val edge = if (fromRight) w - 2f * w * t else 2f * w * t
    val backStart = if (fromRight) max(edge, 0f) else fold
    val backEnd = if (fromRight) fold else min(edge, w)

    // 1. The front: the part of the page that hasn't turned yet
    canvas.save()
    if (fromRight) canvas.clipRect(0f, 0f, fold, h) else canvas.clipRect(fold, 0f, w, h)
    canvas.drawBitmap(page, null, dst, bmpPaint)
    canvas.restore()

    // 2. The back of the turned part: mirrored around the fold, washed out like thin paper,
    //    darkest near the fold where it curves
    if (backEnd > backStart) {
      canvas.save()
      canvas.clipRect(backStart, 0f, backEnd, h)
      canvas.save()
      canvas.scale(-1f, 1f, fold, h / 2f)
      canvas.drawBitmap(page, null, dst, bmpPaint)
      canvas.restore()
      fill.color = Color.argb((0.86f * 255).toInt(), Color.red(paper), Color.green(paper), Color.blue(paper))
      canvas.drawRect(backStart, 0f, backEnd, h, fill)
      val light = Color.argb((0.04f * 255).toInt(), 0, 0, 0)
      val dark = Color.argb((0.22f * 255).toInt(), 0, 0, 0)
      fill.shader = LinearGradient(backStart, 0f, backEnd, 0f, if (fromRight) light else dark, if (fromRight) dark else light, Shader.TileMode.CLAMP)
      canvas.drawRect(backStart, 0f, backEnd, h, fill)
      fill.shader = null
      canvas.restore()
    }

    // 3. The shadow the lifted page casts on the page underneath, just past the fold
    val shadowWidth = min(w * 0.12f, if (fromRight) w - fold else fold)
    if (shadowWidth > 1f) {
      val strength = 0.35f * (1f - t) + 0.08f
      val c = Color.argb((strength * 255).toInt(), 0, 0, 0)
      val x0 = if (fromRight) fold else fold - shadowWidth
      val x1 = if (fromRight) fold + shadowWidth else fold
      fill.shader = LinearGradient(x0, 0f, x1, 0f, if (fromRight) c else Color.TRANSPARENT, if (fromRight) Color.TRANSPARENT else c, Shader.TileMode.CLAMP)
      canvas.drawRect(x0, 0f, x1, h, fill)
      fill.shader = null
    }
  }
}

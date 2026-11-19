package com.audiobookshelf.app.player

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.support.v4.media.MediaMetadataCompat
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.audiobookshelf.app.R
import com.audiobookshelf.app.device.DeviceProfile
import com.audiobookshelf.app.transcription.TranscriptStore
import org.json.JSONObject
import kotlin.random.Random

/**
 * ABS+ lock screen: when the screen turns off while a transcribed book plays, the next time it's woken
 * it shows the artwork with the transcription card centred under it (black, for OLED), over the
 * keyguard. A tap goes on to the normal unlock.
 *
 * Android's own lock-screen player can't be laid out by apps, so this is a separate screen, launched the
 * way alarm and call apps do it (a full-screen notification). Android 14+ asks once to allow that.
 *
 * Settings → Lock screen transcription: auto (on for OLED screens) · on · off.
 */
object LockscreenPlayer {
  private const val TAG = "LockscreenPlayer"
  private const val PREFS = "absplus_lockscreen"
  private const val CHANNEL = "absplus_lockscreen"
  private const val NOTIFY_ID = 4720

  fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  fun mode(ctx: Context): String = prefs(ctx).getString("mode", "auto") ?: "auto"

  fun enabled(ctx: Context): Boolean = when (mode(ctx)) {
    "on" -> true
    "off" -> false
    else -> runCatching { DeviceProfile.oledLikely(ctx) }.getOrDefault(false) && !DeviceProfile.isEink()
  }

  /** Android 14+: may this app open a screen over the lock screen (full-screen notifications)? */
  fun allowed(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT < 34) return true
    val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return nm.canUseFullScreenIntent()
  }

  /** "Display over other apps": lets the card open by itself the moment the screen turns off */
  fun canOverlay(ctx: Context): Boolean = Build.VERSION.SDK_INT < 23 || android.provider.Settings.canDrawOverlays(ctx)

  /** The transcript key for what's playing (same key the app uses) */
  fun keyFor(service: PlayerNotificationService): String? {
    val s = service.currentPlaybackSession ?: return null
    s.libraryItemId?.let { return if (s.episodeId != null) "$it-${s.episodeId}" else it }
    val local = s.localLibraryItem ?: return null
    return if (s.localEpisodeId != null) "${local.id}-${s.localEpisodeId}" else local.id
  }

  private var receiver: BroadcastReceiver? = null

  /**
   * Lines the app handed over for what's playing (books transcribed on the server aren't stored on the
   * phone): key -> [(start, end, text)]
   */
  @Volatile private var pushed: Pair<String, List<Triple<Double, Double, String>>>? = null

  fun setLines(key: String, lines: List<Triple<Double, Double, String>>) {
    pushed = key to lines.sortedBy { it.first }
  }

  /** The transcript for [key]: what the app handed over, else the copy on the phone */
  fun linesFor(ctx: Context, key: String): List<Triple<Double, Double, String>> {
    pushed?.let { if (it.first == key && it.second.isNotEmpty()) return it.second }
    return TranscriptStore(ctx).readLines(key, 0).mapNotNull { raw ->
      runCatching { JSONObject(raw).let { Triple(it.optDouble("s"), it.optDouble("e", it.optDouble("s")), it.optString("t")) } }.getOrNull()
    }.sortedBy { it.first }
  }

  // ---- the narrated line in the lock screen's own media card (in place of the book title) ----
  // Every phone's lock screen shows the player's media card from the media session; while the phone is
  // locked its title is the line being narrated and its subtitle the book. Unlocking puts the title back.

  /** The line shown as the media card's title while locked; null = the book's own title */
  @Volatile var lockLine: String? = null
    private set
  private val main = Handler(Looper.getMainLooper())
  private var cardLines: List<Triple<Double, Double, String>> = emptyList()
  private var cardKey: String? = null
  private var cardShown = -2
  private var cardService: PlayerNotificationService? = null

  private val cardTick = object : Runnable {
    override fun run() {
      val s = cardService ?: return
      try {
        val key = keyFor(s)
        if (key == null) return stopCard()
        if (key != cardKey) {
          cardKey = key
          cardLines = linesFor(s.applicationContext, key)
          cardShown = -2
        }
        if (cardLines.isNotEmpty()) {
          val t = s.getCurrentTimeSeconds() + 0.25
          var lo = 0
          var hi = cardLines.size - 1
          var ans = -1
          while (lo <= hi) {
            val mid = (lo + hi) / 2
            if (cardLines[mid].first <= t) {
              ans = mid
              lo = mid + 1
            } else hi = mid - 1
          }
          if (ans != cardShown) {
            cardShown = ans
            lockLine = if (ans >= 0) cardLines[ans].third.trim().ifEmpty { null } else null
            s.refreshLockscreenLine()
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "Lock screen line: ${e.message}")
      }
      main.postDelayed(this, 1000) // lines change every few seconds: once a second is plenty
    }
  }

  private fun startCard(service: PlayerNotificationService) {
    val ctx = service.applicationContext
    if (!cardEnabled(ctx)) return
    val key = keyFor(service) ?: return
    if (linesFor(ctx, key).isEmpty()) return
    cardService = service
    main.removeCallbacks(cardTick)
    main.post(cardTick)
  }

  private fun stopCard() {
    main.removeCallbacks(cardTick)
    val s = cardService
    cardService = null
    cardKey = null
    cardShown = -2
    if (lockLine != null) {
      lockLine = null
      s?.refreshLockscreenLine()
    }
  }

  /** The line in the media card: on unless lock screen transcription is switched off */
  fun cardEnabled(ctx: Context): Boolean = mode(ctx) != "off"

  /** The media card's details, with the narrated line as the title while the phone is locked */
  fun withLine(base: MediaMetadataCompat): MediaMetadataCompat {
    val line = lockLine ?: return base
    val book = base.getString(MediaMetadataCompat.METADATA_KEY_TITLE) ?: ""
    return MediaMetadataCompat.Builder(base)
      .putString(MediaMetadataCompat.METADATA_KEY_TITLE, line)
      .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, line)
      .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, book)
      .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, book)
      .build()
  }

  private fun locked(ctx: Context): Boolean = (ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked

  /** Called from the player service: watches the screen turning off / on and the phone unlocking */
  fun register(service: PlayerNotificationService) {
    if (receiver != null) return
    receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.action) {
          Intent.ACTION_SCREEN_OFF -> {
            if (runCatching { service.currentPlayer.isPlaying }.getOrDefault(false)) startCard(service)
            onScreenOff(service)
          }
          // woken without a lock screen (no PIN / smart unlock): straight back to the book title
          Intent.ACTION_SCREEN_ON -> main.postDelayed({ if (!locked(service)) stopCard() }, 600)
          Intent.ACTION_USER_PRESENT -> stopCard()
        }
      }
    }
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_USER_PRESENT)
    }
    if (Build.VERSION.SDK_INT >= 33) service.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    else service.registerReceiver(receiver, filter)
  }

  /** Playback started while the phone is already locked (from the lock screen's play button) */
  fun onPlaying(service: PlayerNotificationService) {
    if (cardService == null && locked(service)) startCard(service)
  }

  fun unregister(service: PlayerNotificationService) {
    receiver?.let { runCatching { service.unregisterReceiver(it) } }
    receiver = null
    stopCard()
  }

  private fun onScreenOff(service: PlayerNotificationService) {
    try {
      val ctx = service.applicationContext
      if (!enabled(ctx) || (!allowed(ctx) && !canOverlay(ctx))) return Log.i(TAG, "Lock screen card: off (enabled=${enabled(ctx)}, allowed=${allowed(ctx)})").let { }
      if (!service.currentPlayer.isPlaying) return
      val key = keyFor(service) ?: return
      if (linesFor(ctx, key).isEmpty()) return Log.i(TAG, "Lock screen card: no transcript lines for $key yet").let { }
      LockscreenActivity.service = service
      if (canOverlay(ctx)) {
        try {
          ctx.startActivity(Intent(ctx, LockscreenActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION or Intent.FLAG_ACTIVITY_NO_ANIMATION))
          Log.i(TAG, "Lock screen card opened directly")
          return
        } catch (e: Exception) {
          Log.w(TAG, "Lock screen card: direct start refused (${e.message}), using the notification")
        }
      }
      val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) nm.createNotificationChannel(NotificationChannel(CHANNEL, "Lock screen transcription", NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); enableVibration(false) })
      val open = PendingIntent.getActivity(ctx, 0, Intent(ctx, LockscreenActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val n = NotificationCompat.Builder(ctx, CHANNEL)
        .setSmallIcon(R.drawable.icon_monochrome)
        .setContentTitle("Transcription")
        .setContentText("Following the narration")
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
        .setSilent(true)
        .setFullScreenIntent(open, true)
        .setAutoCancel(true)
        .build()
      nm.notify(NOTIFY_ID, n)
      Log.i(TAG, "Lock screen card: full-screen notification posted")
    } catch (e: Exception) {
      Log.w(TAG, "Lock screen: ${e.message}")
    }
  }

  fun clear(ctx: Context) {
    runCatching { (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(NOTIFY_ID) }
  }
}

/** The word being said: a soft rounded box behind it, like the player's transcription preview */
class WordBox(private val color: Int, private val radius: Float, private val padX: Float) : android.text.style.ReplacementSpan() {
  override fun getSize(paint: android.graphics.Paint, text: CharSequence, start: Int, end: Int, fm: android.graphics.Paint.FontMetricsInt?): Int {
    if (fm != null) paint.getFontMetricsInt(fm)
    return (paint.measureText(text, start, end) + padX * 2).toInt()
  }

  override fun draw(canvas: android.graphics.Canvas, text: CharSequence, start: Int, end: Int, x: Float, top: Int, y: Int, bottom: Int, paint: android.graphics.Paint) {
    val w = paint.measureText(text, start, end)
    val old = paint.color
    paint.color = color
    canvas.drawRoundRect(android.graphics.RectF(x, top.toFloat(), x + w + padX * 2, bottom.toFloat()), radius, radius, paint)
    paint.color = Color.WHITE
    canvas.drawText(text, start, end, x + padX, y.toFloat(), paint)
    paint.color = old
  }
}

/** The lock-screen view itself: artwork, the narrated line centred under it, play / pause */
class LockscreenActivity : Activity() {
  companion object {
    var service: PlayerNotificationService? = null
  }

  private val handler = Handler(Looper.getMainLooper())
  private var lines: List<Triple<Double, Double, String>> = emptyList()
  private var shown = -2
  private var shownWord = -2
  private lateinit var cover: ImageView
  private lateinit var current: TextView
  private lateinit var next: TextView
  private lateinit var ticker: android.widget.HorizontalScrollView
  private var lastScrollWord = -9
  private var pending: Pair<Int, Int>? = null

  /** Slide the line so the word being said is in the middle of the card (once the new text is laid out) */
  private fun centerWord() {
    if (lastScrollWord != -9) return // after the first placement the glide moves it, every frame
    val (ws, we) = pending ?: return
    val lay = current.layout ?: return
    if (ws > current.text.length || we > current.text.length) return
    val mid = current.paddingLeft + (lay.getPrimaryHorizontal(ws) + lay.getPrimaryHorizontal(we)) / 2f
    val x = (mid - ticker.width / 2f).toInt().coerceAtLeast(0)
    if (lastScrollWord == -9) ticker.scrollTo(x, 0) else ticker.smoothScrollTo(x, 0)
    lastScrollWord = ws
  }
  private lateinit var playBtn: ImageView
  private lateinit var column: LinearLayout
  private var dimmed = false

  /** Touches work only after a double tap (no taps in a pocket or by a stray finger), for a few seconds */
  private var armedUntil = 0L
  private var lastDown = 0L
  private val ARM_MS = 8_000L
  private lateinit var hintView: TextView

  private fun armed() = android.os.SystemClock.uptimeMillis() < armedUntil

  private val disarm = Runnable { if (::hintView.isInitialized) hintView.text = "Double-tap to use · then swipe up to unlock" }

  private val dim = Runnable {
    dimmed = true
    armedUntil = 0L
    disarm.run()
    window.attributes = window.attributes.apply { screenBrightness = 0.3f } // dimmed, still comfortable for reading
    veil.animate().alpha(0.12f).setDuration(600).start()
  }

  private fun wake() {
    dimmed = false
    window.attributes = window.attributes.apply { screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE }
    veil.animate().alpha(0f).setDuration(200).start()
    handler.removeCallbacks(dim)
    handler.postDelayed(dim, 10_000)
  }

  override fun dispatchTouchEvent(ev: android.view.MotionEvent): Boolean {
    if (!armed()) {
      // locked against stray touches: a double tap brightens the screen and lets the buttons work
      if (ev.action == android.view.MotionEvent.ACTION_DOWN) {
        val now = android.os.SystemClock.uptimeMillis()
        if (now - lastDown < 400) {
          lastDown = 0L
          if (dimmed) wake()
          armedUntil = now + ARM_MS
          hintView.text = "Ready · swipe up to unlock"
          handler.removeCallbacks(disarm)
          handler.postDelayed(disarm, ARM_MS)
        } else lastDown = now
      }
      return true
    }
    if (ev.action == android.view.MotionEvent.ACTION_DOWN) {
      // each touch keeps it ready a little longer
      armedUntil = android.os.SystemClock.uptimeMillis() + ARM_MS
      handler.removeCallbacks(disarm)
      handler.postDelayed(disarm, ARM_MS)
      handler.removeCallbacks(dim)
      handler.postDelayed(dim, 10_000)
    }
    swipeDetector?.onTouchEvent(ev)
    return super.dispatchTouchEvent(ev)
  }

  private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    LockscreenPlayer.clear(this)
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(false) // the screen was just turned off: don't light it up again
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
    }
    // ---- laid out like the app's full-screen player: the cover's colour fading to dark, the artwork,
    // author, the transcription line, progress, and the player's buttons
    val md = service?.mediaSession?.controller?.metadata
    val art: Bitmap? = md?.getBitmap(MediaMetadataCompat.METADATA_KEY_ART) ?: md?.getBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART) ?: md?.getBitmap(MediaMetadataCompat.METADATA_KEY_DISPLAY_ICON)
    coverColor = art?.let { runCatching { Bitmap.createScaledBitmap(it, 1, 1, true).getPixel(0, 0) }.getOrNull() } ?: Color.rgb(55, 56, 56)
    val dark = Color.rgb(38, 38, 38)
    val mid = blend(coverColor, dark, 0.55f)
    window.statusBarColor = coverColor
    window.navigationBarColor = dark

    val root = FrameLayout(this).apply {
      background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(coverColor, mid, dark, dark))
    }
    column = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
    }
    val wide = (resources.displayMetrics.widthPixels - dp(48f)).toInt()
    val size = (resources.displayMetrics.widthPixels * 0.82f).toInt()
    cover = ImageView(this).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      outlineProvider = object : ViewOutlineProvider() {
        override fun getOutline(view: View, outline: Outline) = outline.setRoundRect(0, 0, view.width, view.height, dp(18f))
      }
      clipToOutline = true
      elevation = dp(8f)
    }
    if (art != null) cover.setImageBitmap(art) else cover.setImageResource(R.drawable.icon)
    column.addView(cover, LinearLayout.LayoutParams(size, size))

    val author = TextView(this).apply {
      text = md?.getString(MediaMetadataCompat.METADATA_KEY_ARTIST) ?: md?.getString(MediaMetadataCompat.METADATA_KEY_AUTHOR) ?: ""
      setTextColor(Color.argb(200, 255, 255, 255))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 19f)
      gravity = Gravity.CENTER
      isSingleLine = true
      ellipsize = android.text.TextUtils.TruncateAt.END
    }
    column.addView(author, LinearLayout.LayoutParams(wide, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(28f).toInt() })

    // the transcription strip: one line sliding so the word being said stays in the middle
    val card = FrameLayout(this).apply {
      background = GradientDrawable().apply { cornerRadius = dp(16f); setColor(Color.argb(38, 255, 255, 255)) }
      setPadding(dp(16f).toInt(), dp(12f).toInt(), dp(16f).toInt(), dp(12f).toInt())
    }
    current = TextView(this).apply {
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
      typeface = Typeface.DEFAULT_BOLD
      isSingleLine = true
      setHorizontallyScrolling(true)
      val half = ((wide - dp(32f)) / 2f).toInt()
      setPadding(half, 0, half, 0)
    }
    ticker = android.widget.HorizontalScrollView(this).apply {
      isHorizontalScrollBarEnabled = false
      isHorizontalFadingEdgeEnabled = true
      setFadingEdgeLength(dp(40f).toInt())
      overScrollMode = View.OVER_SCROLL_NEVER
      setOnTouchListener { _, _ -> true }
      addView(current, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT))
      current.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ -> centerWord() }
    }
    card.addView(ticker, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
    column.addView(card, LinearLayout.LayoutParams(wide, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(14f).toInt() })
    next = TextView(this) // kept for the line logic; not shown

    // progress: elapsed · time left, the bar under them
    val times = FrameLayout(this)
    elapsed = TextView(this).apply { setTextColor(Color.argb(220, 255, 255, 255)); setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f); typeface = Typeface.MONOSPACE }
    remaining = TextView(this).apply { setTextColor(Color.argb(220, 255, 255, 255)); setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f); typeface = Typeface.MONOSPACE }
    times.addView(elapsed, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.START))
    times.addView(remaining, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.END))
    column.addView(times, LinearLayout.LayoutParams(wide, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(22f).toInt() })
    val track = FrameLayout(this).apply { background = GradientDrawable().apply { cornerRadius = dp(3f); setColor(Color.argb(60, 255, 255, 255)) } }
    bar = View(this).apply { background = GradientDrawable().apply { cornerRadius = dp(3f); setColor(Color.WHITE) } }
    track.addView(bar, FrameLayout.LayoutParams(0, FrameLayout.LayoutParams.MATCH_PARENT))
    barWidth = wide
    column.addView(track, LinearLayout.LayoutParams(wide, dp(6f).toInt()).apply { topMargin = dp(8f).toInt() })

    // the player's buttons: chapter back · 10s back · play / pause · 10s forward · next chapter
    val controls = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val small = dp(40f).toInt()
    fun icon(res: Int, label: String?, onTap: () -> Unit): View {
      val box = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setOnClickListener {
          onTap()
          handler.postDelayed({ update() }, 150)
        }
      }
      box.addView(ImageView(this).apply { setImageResource(res) }, LinearLayout.LayoutParams(small, small))
      if (label != null) {
        box.addView(TextView(this).apply {
          text = label
          setTextColor(Color.argb(200, 255, 255, 255))
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
          gravity = Gravity.CENTER
        })
      }
      return box
    }
    controls.addView(icon(R.drawable.ls_prev, null) { chapterJump(-1) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    controls.addView(icon(R.drawable.ls_replay, "10s") { service?.jumpBackward() }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    playBtn = ImageView(this).apply {
      background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(coverColor) }
      val pad = dp(22f).toInt()
      setPadding(pad, pad, pad, pad)
      if (isLight(coverColor)) setColorFilter(Color.rgb(30, 30, 30))
      setOnClickListener {
        service?.let { s -> if (s.currentPlayer.isPlaying) s.pause() else s.play() }
        handler.postDelayed({ refreshPlay() }, 150)
      }
    }
    controls.addView(playBtn, LinearLayout.LayoutParams(dp(88f).toInt(), dp(88f).toInt()))
    controls.addView(icon(R.drawable.ls_forward, "10s") { service?.jumpForward() }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    controls.addView(icon(R.drawable.ls_next, null) { chapterJump(1) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
    column.addView(controls, LinearLayout.LayoutParams(wide, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(26f).toInt() })

    val hint = TextView(this).apply {
      text = "Double-tap to use · then swipe up to unlock"
      setTextColor(Color.argb(120, 255, 255, 255))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      gravity = Gravity.CENTER
    }
    hintView = hint
    column.addView(hint, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(22f).toInt() })
    root.addView(column, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
    // the dim veil, like the phone's own lock screen dimming before it sleeps
    veil = View(this).apply {
      setBackgroundColor(Color.BLACK)
      alpha = 0f
    }
    root.addView(veil, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    // swipe up anywhere: on to the normal unlock
    swipeDetector = android.view.GestureDetector(this, object : android.view.GestureDetector.SimpleOnGestureListener() {
      override fun onFling(e1: android.view.MotionEvent?, e2: android.view.MotionEvent, velocityX: Float, velocityY: Float): Boolean {
        if (e1 != null && e1.y - e2.y > dp(120f) && kotlin.math.abs(velocityY) > kotlin.math.abs(velocityX)) {
          unlock()
          return true
        }
        return false
      }
    })
    setContentView(root)
    loadLines()
  }

  private var coverColor = Color.rgb(55, 56, 56)
  private lateinit var elapsed: TextView
  private lateinit var remaining: TextView
  private lateinit var bar: View
  private lateinit var veil: View
  private var barWidth = 0
  private var swipeDetector: android.view.GestureDetector? = null

  private fun blend(a: Int, b: Int, f: Float): Int = Color.rgb(
    (Color.red(a) * (1 - f) + Color.red(b) * f).toInt(),
    (Color.green(a) * (1 - f) + Color.green(b) * f).toInt(),
    (Color.blue(a) * (1 - f) + Color.blue(b) * f).toInt()
  )

  private fun isLight(c: Int) = (Color.red(c) * 299 + Color.green(c) * 587 + Color.blue(c) * 114) / 1000 > 160

  private fun clock(sec: Double): String {
    val t = sec.toLong().coerceAtLeast(0)
    val h = t / 3600
    val m = (t % 3600) / 60
    val s = t % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
  }

  /** The chapter buttons, like the player's: back = start of this chapter (or the one before, near its start) */
  private fun chapterJump(dir: Int) {
    val s = service ?: return
    val session = s.getCurrentPlaybackSessionCopy() ?: return
    val chapters = session.chapters
    if (chapters.isEmpty()) return
    val now = s.getCurrentTime()
    val i = chapters.indexOfFirst { now >= it.startMs && it.endMs > now }
    if (dir < 0) {
      val ch = chapters.getOrNull(i) ?: return
      val target = if (now - ch.startMs > 3000 || i == 0) ch.startMs else chapters[i - 1].startMs
      s.seekPlayer(target)
    } else {
      chapters.getOrNull(i + 1)?.let { s.seekPlayer(it.startMs) }
    }
  }

  private fun updateProgress() {
    val s = service ?: return
    val now = runCatching { s.getCurrentTimeSeconds() }.getOrDefault(0.0)
    val total = runCatching { s.getDuration() / 1000.0 }.getOrDefault(0.0)
    elapsed.text = clock(now)
    remaining.text = "-" + clock(total - now)
    val w = if (total > 0) (barWidth * (now / total)).toInt().coerceIn(0, barWidth) else 0
    val lp = bar.layoutParams
    if (lp.width != w) {
      lp.width = w
      bar.layoutParams = lp
    }
  }

  private fun loadLines() {
    val s = service ?: return
    val key = LockscreenPlayer.keyFor(s) ?: return
    lines = LockscreenPlayer.linesFor(this, key)
  }

  private val tick = object : Runnable {
    override fun run() {
      update()
      handler.postDelayed(this, 120)
    }
  }

  // OLED: move everything a little every minute so nothing stays lit in one place
  private val drift = object : Runnable {
    override fun run() {
      column.translationX = Random.nextInt(-12, 13) * resources.displayMetrics.density
      column.translationY = Random.nextInt(-16, 17) * resources.displayMetrics.density
      handler.postDelayed(this, 60_000)
    }
  }

  /** The line being said: (its offset in the text, its length, (start, end) times), for the glide */
  private var glideLine: Triple<Int, Int, Pair<Double, Double>>? = null
  private var clockT = 0.0
  private var clockAt = 0L
  private var clockPlaying = false

  /** Every frame: slide the line smoothly with the voice (character by character, not word by word) */
  private val glide = object : Runnable {
    override fun run() {
      try {
        val g = glideLine
        val lay = current.layout
        if (g != null && lay != null && ticker.width > 0) {
          val (off, len, se) = g
          val now = android.os.SystemClock.uptimeMillis()
          val t = clockT + if (clockPlaying) (now - clockAt) / 1000.0 * (runCatching { service?.currentPlayer?.playbackParameters?.speed?.toDouble() }.getOrNull() ?: 1.0) else 0.0
          val frac = ((t + 0.12 - se.first) / (se.second - se.first)).coerceIn(0.0, 1.0)
          val pos = off + frac * len
          val i = pos.toInt().coerceIn(0, current.text.length)
          val j = (i + 1).coerceAtMost(current.text.length)
          val x0 = lay.getPrimaryHorizontal(i)
          val x1 = lay.getPrimaryHorizontal(j)
          val x = current.paddingLeft + x0 + (x1 - x0) * (pos - i).toFloat()
          val target = (x - ticker.width / 2f).coerceAtLeast(0f)
          val cur = ticker.scrollX.toFloat()
          val step = (target - cur) * 0.18f
          if (kotlin.math.abs(target - cur) > 0.5f) ticker.scrollTo((cur + step).toInt().let { if (it == cur.toInt()) (cur + kotlin.math.sign(step)).toInt() else it }, 0)
        }
      } catch (e: Exception) {}
      ticker.postOnAnimation(this)
    }
  }

  private fun update() {
    val s = service ?: return finish()
    val t = runCatching { s.getCurrentTimeSeconds() }.getOrDefault(0.0) + 0.25
    clockT = t - 0.25
    clockAt = android.os.SystemClock.uptimeMillis()
    clockPlaying = runCatching { s.currentPlayer.isPlaying }.getOrDefault(false)
    var lo = 0
    var hi = lines.size - 1
    var ans = -1
    while (lo <= hi) {
      val mid = (lo + hi) / 2
      if (lines[mid].first <= t) {
        ans = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    if (ans != shown) {
      shown = ans
      shownWord = -2
    }
    if (ans < 0) {
      if (shownWord != -1) current.text = "…"
      shownWord = -1
    } else {
      // the word being said: where the time falls in the line, by how long each word is
      val (s, e, text) = lines[ans]
      val end = if (e > s) e else s + 2.0
      val frac = ((t - 0.25 + 0.12 - s) / (end - s)).coerceIn(0.0, 0.999)
      val words = Regex("\\S+").findAll(text).toList()
      if (words.isNotEmpty()) {
        val total = words.sumOf { it.value.length + 1 }.toDouble()
        var acc = 0.0
        var wi = words.size - 1
        for ((i, w) in words.withIndex()) {
          acc += w.value.length + 1
          if (acc / total > frac) {
            wi = i
            break
          }
        }
        if (wi != shownWord) {
          shownWord = wi
          // the line between its neighbours, so there's always text either side of the word
          val prev = if (ans - 1 in lines.indices) lines[ans - 1].third.trim() + "  " else ""
          val nxt = if (ans + 1 in lines.indices) "  " + lines[ans + 1].third.trim() else ""
          val all = prev + text + nxt
          val w = words[wi]
          val ws = prev.length + w.range.first
          val we = prev.length + w.range.last + 1
          val sp = android.text.SpannableString(all)
          val span = android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
          // read: bright · being said: boxed · still to come: dimmer
          sp.setSpan(android.text.style.ForegroundColorSpan(Color.WHITE), 0, we, span)
          sp.setSpan(android.text.style.ForegroundColorSpan(Color.argb(120, 255, 255, 255)), we, all.length, span)
          sp.setSpan(WordBox(Color.argb(70, 255, 255, 255), dp(6f), dp(4f)), ws, we, span)
          current.text = sp
          pending = ws to we
          glideLine = Triple(prev.length, text.length, s to end)
          if (lastScrollWord == -9) current.post { centerWord() }
        }
      } else if (shownWord != -3) {
        shownWord = -3
        current.text = text
      }
    }
    refreshPlay()
    updateProgress()
  }

  private var keptOn: Boolean? = null

  private fun refreshPlay() {
    val playing = runCatching { service?.currentPlayer?.isPlaying == true }.getOrDefault(false)
    playBtn.setImageResource(if (playing) R.drawable.ls_pause else R.drawable.ls_play)
    // while the book plays the card stays on and bright (no screen timeout, no dimming); paused, the phone's
    // own timeout applies again
    if (keptOn != playing) {
      keptOn = playing
      if (playing) {
        // stays on while the book plays; it still dims after a while, the card staying in view
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        handler.removeCallbacks(dim)
        handler.postDelayed(dim, 10_000)
      } else {
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        handler.removeCallbacks(dim)
        handler.postDelayed(dim, 10_000)
      }
    }
  }

  private fun unlock() {
    if (Build.VERSION.SDK_INT >= 26) {
      val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      km.requestDismissKeyguard(this, null)
    }
    finish()
  }

  override fun onResume() {
    super.onResume()
    handler.post(tick)
    ticker.removeCallbacks(glide)
    ticker.postOnAnimation(glide)
    handler.postDelayed(drift, 60_000)
    handler.postDelayed(dim, 10_000) // dims like the lock screen; the screen still times out as usual
  }

  override fun onPause() {
    super.onPause()
    ticker.removeCallbacks(glide)
    handler.removeCallbacksAndMessages(null)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    unlock()
  }
}

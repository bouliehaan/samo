package app.samo.android.tv

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.scroll.ReactHorizontalScrollView
import com.facebook.react.views.scroll.ReactScrollView
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * The TV's one focusable control, with everything focus does to it done here,
 * on the UI thread, in the frame Android moves focus.
 *
 * Focus on a TV is the cursor: it has to move with the press. Drawn from
 * React it cannot. A focus event crosses to JS, sets state, re-renders the
 * control, commits, and mounts — per move, twice (one control loses focus,
 * one gains it) — and on a streaming box's little cores, with a list
 * virtualizing on the same thread, the highlight arrives a beat after the
 * press and falls further behind for as long as the D-pad is held. So React
 * is told about focus (it still places it and remembers it) but draws none
 * of it. This view does three things when focus arrives:
 *
 *  - **Shows it.** A ring around the control, an optional fill under its
 *    content, and an optional lift (scale), faded in together. Nothing about
 *    the control's layout changes, so nothing beside it moves.
 *  - **Brings it into view.** React Native's scroll views jump a focused
 *    child on screen (`scrollBy`, no animation) and stop the moment its edge
 *    clears theirs, which leaves it flush against the clip. Lists on the TV
 *    turn that off (`scrollsChildToFocus={false}`) and this glides instead:
 *    to an anchor when one is given (a shelf keeps its focused cover on the
 *    page's keyline while the row moves beneath it), else just far enough to
 *    clear a margin.
 *  - **Holds it**, in the directions it is pinned: the end of a row, the
 *    edges of a menu, a seek bar's Left and Right.
 *
 * It also takes its D-pad moves to its focus zone itself (see `focusSearch`).
 */
class SamoTvFocusableView(context: Context) : ReactViewGroup(context) {
  /** How large the control stands while focused; 1 leaves it alone. */
  var focusScale = 1f

  var ringColor = Color.TRANSPARENT
    set(value) {
      field = value
      ringPaint.color = value
    }

  var ringWidth = 0f
    set(value) {
      field = value
      ringPaint.strokeWidth = value
    }

  /** The gap between the control's edge and the ring's inner edge. */
  var ringOutset = 0f

  /** The control's own corner radius; the ring's follows it, further out. */
  var ringRadius = 0f

  /**
   * The ring and fill cover only this much of the control's height, from its
   * top: a cover's ring goes around the artwork, not the title under it.
   * Zero is the whole control.
   */
  var ringHeight = 0f

  var fillColor = Color.TRANSPARENT
    set(value) {
      field = value
      fillPaint.color = value
    }

  /**
   * Where focus puts this control in the scroll view around it, measured from
   * that view's leading edge. NaN is no anchor: scroll only as far as
   * `scrollMargin` needs.
   */
  var anchorX = Float.NaN
  var anchorY = Float.NaN
  var scrollMargin = 0f

  var pinLeft = false
  var pinRight = false
  var pinUp = false
  var pinDown = false

  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
  private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
  private val shape = RectF()
  private val bounds = Rect()

  /** 0 at rest, 1 focused. */
  private var presence = 0f
  private var animator: ValueAnimator? = null

  override fun onFocusChanged(gainFocus: Boolean, direction: Int, previouslyFocusedRect: Rect?) {
    super.onFocusChanged(gainFocus, direction, previouslyFocusedRect)
    animatePresence(if (gainFocus) 1f else 0f)
    if (gainFocus) reveal()
  }

  override fun focusSearch(direction: Int): View? {
    val pinned = when (direction) {
      View.FOCUS_LEFT -> pinLeft
      View.FOCUS_RIGHT -> pinRight
      View.FOCUS_UP -> pinUp
      View.FOCUS_DOWN -> pinDown
      else -> false
    }
    if (pinned) return this
    // Straight to the zone, which decides every D-pad move on its side of
    // the screen. Asked the usual way (up through each parent), a React
    // Native scroll view on the way answers first: when the zone's choice
    // lies outside it, it substitutes the nearest control of its own, from
    // geometry alone. So Left from a button beside a cover went to a cover
    // in the row below, never to the rail.
    if (isArrow(direction)) zone()?.let { return it.focusSearch(this, direction) }
    return super.focusSearch(direction)
  }

  private fun isArrow(direction: Int): Boolean =
    direction == View.FOCUS_LEFT ||
      direction == View.FOCUS_RIGHT ||
      direction == View.FOCUS_UP ||
      direction == View.FOCUS_DOWN

  private fun zone(): SamoTvFocusZoneView? {
    var ancestor = parent
    while (ancestor != null) {
      if (ancestor is SamoTvFocusZoneView) return ancestor
      ancestor = ancestor.parent
    }
    return null
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // A list recycles nothing here, but it does detach: never come back lit.
    animator?.cancel()
    animator = null
    applyPresence(if (isFocused) 1f else 0f)
  }

  private fun animatePresence(target: Float) {
    animator?.cancel()
    if (presence == target) return
    animator = ValueAnimator.ofFloat(presence, target).apply {
      // Arriving is the answer to a press, so it is quick and decelerates
      // into place; leaving is quicker still, and never the thing watched.
      duration = if (target > presence) FOCUS_IN_MS else FOCUS_OUT_MS
      interpolator = DECELERATE
      addUpdateListener { applyPresence(it.animatedValue as Float) }
      start()
    }
  }

  private fun applyPresence(value: Float) {
    presence = value
    if (focusScale != 1f) {
      val scale = 1f + (focusScale - 1f) * value
      scaleX = scale
      scaleY = scale
    }
    invalidate()
  }

  override fun dispatchDraw(canvas: Canvas) {
    val lit = presence > 0f
    val bottom = if (ringHeight > 0f) min(ringHeight, height.toFloat()) else height.toFloat()
    if (lit && Color.alpha(fillColor) != 0) {
      fillPaint.alpha = (Color.alpha(fillColor) * presence).roundToInt()
      shape.set(0f, 0f, width.toFloat(), bottom)
      canvas.drawRoundRect(shape, ringRadius, ringRadius, fillPaint)
    }
    super.dispatchDraw(canvas)
    if (lit && ringWidth > 0f && Color.alpha(ringColor) != 0) {
      ringPaint.alpha = (Color.alpha(ringColor) * presence).roundToInt()
      // The stroke is centred on its path: half of it either side.
      val out = ringOutset + ringWidth / 2f
      shape.set(-out, -out, width + out, bottom + out)
      val radius = if (ringRadius > 0f) ringRadius + out else 0f
      canvas.drawRoundRect(shape, radius, radius, ringPaint)
    }
  }

  /** Glide the scroll views around this control until it sits where it should. */
  private fun reveal() {
    if (width == 0 || height == 0) return
    var horizontal = false
    var vertical = false
    var ancestor = parent
    while (ancestor is ViewGroup && !(horizontal && vertical)) {
      if (!horizontal && ancestor is ReactHorizontalScrollView) {
        horizontal = true
        getDrawingRect(bounds)
        ancestor.offsetDescendantRectToMyCoords(this, bounds)
        val content = ancestor.getChildAt(0)?.width ?: 0
        val target = scrollTarget(
          bounds.left, bounds.right, ancestor.scrollX, ancestor.width, content, anchorX)
        if (target != ancestor.scrollX) ancestor.reactSmoothScrollTo(target, ancestor.scrollY)
      } else if (!vertical && ancestor is ReactScrollView) {
        vertical = true
        getDrawingRect(bounds)
        ancestor.offsetDescendantRectToMyCoords(this, bounds)
        val content = ancestor.getChildAt(0)?.height ?: 0
        val target = scrollTarget(
          bounds.top, bounds.bottom, ancestor.scrollY, ancestor.height, content, anchorY)
        if (target != ancestor.scrollY) ancestor.reactSmoothScrollTo(ancestor.scrollX, target)
      }
      ancestor = ancestor.parent
    }
  }

  /**
   * Where a scroll view should be for a control spanning `start..end` of its
   * content: on the anchor, or (without one) wherever is nearest that keeps
   * the control a margin clear of both edges.
   */
  private fun scrollTarget(
    start: Int, end: Int, scroll: Int, viewport: Int, content: Int, anchor: Float
  ): Int {
    val limit = max(0, content - viewport)
    val wanted = if (!anchor.isNaN()) {
      start - anchor.roundToInt()
    } else {
      val margin = scrollMargin.roundToInt()
      when {
        start - margin < scroll -> start - margin
        end + margin > scroll + viewport -> end + margin - viewport
        else -> scroll
      }
    }
    return wanted.coerceIn(0, limit)
  }

  private companion object {
    const val FOCUS_IN_MS = 140L
    const val FOCUS_OUT_MS = 100L
    val DECELERATE = DecelerateInterpolator(1.6f)
  }
}

class SamoTvFocusableManager : ReactViewManager() {
  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    SamoTvFocusableView(context)

  @ReactProp(name = "focusScale", defaultFloat = 1f)
  fun setFocusScale(view: ReactViewGroup, scale: Float) {
    (view as SamoTvFocusableView).focusScale = scale
  }

  // Colours arrive already processed (ARGB ints): a legacy view manager's
  // colour props are not processed for it under the new architecture.
  @ReactProp(name = "ringColor", defaultInt = Color.TRANSPARENT)
  fun setRingColor(view: ReactViewGroup, color: Int) {
    (view as SamoTvFocusableView).ringColor = color
  }

  @ReactProp(name = "ringWidth", defaultFloat = 0f)
  fun setRingWidth(view: ReactViewGroup, width: Float) {
    (view as SamoTvFocusableView).ringWidth = PixelUtil.toPixelFromDIP(width)
  }

  @ReactProp(name = "ringOutset", defaultFloat = 0f)
  fun setRingOutset(view: ReactViewGroup, outset: Float) {
    (view as SamoTvFocusableView).ringOutset = PixelUtil.toPixelFromDIP(outset)
  }

  @ReactProp(name = "ringRadius", defaultFloat = 0f)
  fun setRingRadius(view: ReactViewGroup, radius: Float) {
    (view as SamoTvFocusableView).ringRadius = PixelUtil.toPixelFromDIP(radius)
  }

  @ReactProp(name = "ringHeight", defaultFloat = 0f)
  fun setRingHeight(view: ReactViewGroup, height: Float) {
    (view as SamoTvFocusableView).ringHeight = PixelUtil.toPixelFromDIP(height)
  }

  @ReactProp(name = "fillColor", defaultInt = Color.TRANSPARENT)
  fun setFillColor(view: ReactViewGroup, color: Int) {
    (view as SamoTvFocusableView).fillColor = color
  }

  @ReactProp(name = "anchorX", defaultFloat = Float.NaN)
  fun setAnchorX(view: ReactViewGroup, anchor: Float) {
    (view as SamoTvFocusableView).anchorX =
      if (anchor.isNaN()) anchor else PixelUtil.toPixelFromDIP(anchor)
  }

  @ReactProp(name = "anchorY", defaultFloat = Float.NaN)
  fun setAnchorY(view: ReactViewGroup, anchor: Float) {
    (view as SamoTvFocusableView).anchorY =
      if (anchor.isNaN()) anchor else PixelUtil.toPixelFromDIP(anchor)
  }

  @ReactProp(name = "scrollMargin", defaultFloat = 0f)
  fun setScrollMargin(view: ReactViewGroup, margin: Float) {
    (view as SamoTvFocusableView).scrollMargin = PixelUtil.toPixelFromDIP(margin)
  }

  @ReactProp(name = "pinLeft", defaultBoolean = false)
  fun setPinLeft(view: ReactViewGroup, pinned: Boolean) {
    (view as SamoTvFocusableView).pinLeft = pinned
  }

  @ReactProp(name = "pinRight", defaultBoolean = false)
  fun setPinRight(view: ReactViewGroup, pinned: Boolean) {
    (view as SamoTvFocusableView).pinRight = pinned
  }

  @ReactProp(name = "pinUp", defaultBoolean = false)
  fun setPinUp(view: ReactViewGroup, pinned: Boolean) {
    (view as SamoTvFocusableView).pinUp = pinned
  }

  @ReactProp(name = "pinDown", defaultBoolean = false)
  fun setPinDown(view: ReactViewGroup, pinned: Boolean) {
    (view as SamoTvFocusableView).pinDown = pinned
  }

  companion object {
    const val NAME = "SamoTvFocusable"
  }
}

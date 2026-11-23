package app.samo.android.tv

import android.content.Context
import android.graphics.Rect
import android.view.View
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import kotlin.math.abs

/**
 * A row of controls that D-pad focus enters at one place: the selected
 * control (a filter's active pill), else the first (a page's Play button).
 *
 * Android otherwise picks whichever control is geometrically nearest to the
 * one focus leaves. Up from a cover lands on the filter pill above it rather
 * than the filter in force, and Up from a full-width track row lands on the
 * button nearest the row's centre — Shuffle or More, not Play.
 *
 * A row of covers is entered at a place instead (`entryInset`): the cover
 * standing on the page's keyline, where the row keeps the one focus was last
 * on. Geometry alone gets there from the row above, whose focused cover is on
 * the same line, but not from a button that sits further over.
 *
 * Focus search asks every view for its focusable descendants; while focus is
 * outside this group, it offers only the entry. Moves within the group are
 * Android's own.
 */
class SamoTvFocusGroupView(context: Context) : ReactViewGroup(context) {
  /** Enter at the control whose leading edge is nearest this far in (px). */
  var entryInset = Float.NaN

  private val bounds = Rect()

  private fun leadingEdge(view: View): Int {
    view.getDrawingRect(bounds)
    offsetDescendantRectToMyCoords(view, bounds)
    return bounds.left
  }

  override fun addFocusables(views: ArrayList<View>, direction: Int, focusableMode: Int) {
    if (!hasFocus() && isArrow(direction)) {
      val members = ArrayList<View>()
      // Sorted by position, top to bottom and left to right.
      super.addFocusables(members, direction, focusableMode)
      val entry =
        if (entryInset.isNaN()) {
          members.firstOrNull { it.isSelected } ?: members.firstOrNull()
        } else {
          members.minByOrNull { abs(leadingEdge(it) - entryInset) }
        }
      if (entry != null) {
        views.add(entry)
        return
      }
    }
    super.addFocusables(views, direction, focusableMode)
  }

  private fun isArrow(direction: Int): Boolean =
    direction == View.FOCUS_UP ||
      direction == View.FOCUS_DOWN ||
      direction == View.FOCUS_LEFT ||
      direction == View.FOCUS_RIGHT
}

class SamoTvFocusGroupManager : ReactViewManager() {
  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    SamoTvFocusGroupView(context)

  @ReactProp(name = "entryInset", defaultFloat = Float.NaN)
  fun setEntryInset(view: ReactViewGroup, inset: Float) {
    (view as SamoTvFocusGroupView).entryInset =
      if (inset.isNaN()) inset else PixelUtil.toPixelFromDIP(inset)
  }

  companion object {
    const val NAME = "SamoTvFocusGroup"
  }
}

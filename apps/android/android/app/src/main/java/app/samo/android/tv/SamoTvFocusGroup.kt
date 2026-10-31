package app.samo.android.tv

import android.content.Context
import android.view.View
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * A row of controls that D-pad focus enters at one place: the selected
 * control (a filter's active pill), else the first (a page's Play button).
 *
 * Android otherwise picks whichever control is geometrically nearest to the
 * one focus leaves. Up from a cover lands on the filter pill above it rather
 * than the filter in force, and Up from a full-width track row lands on the
 * button nearest the row's centre — Shuffle or More, not Play.
 *
 * Focus search asks every view for its focusable descendants; while focus is
 * outside this group, it offers only the entry. Moves within the group are
 * Android's own.
 */
class SamoTvFocusGroupView(context: Context) : ReactViewGroup(context) {
  override fun addFocusables(views: ArrayList<View>, direction: Int, focusableMode: Int) {
    if (!hasFocus() && isArrow(direction)) {
      val members = ArrayList<View>()
      // Sorted by position, top to bottom and left to right.
      super.addFocusables(members, direction, focusableMode)
      val entry = members.firstOrNull { it.isSelected } ?: members.firstOrNull()
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

  companion object {
    const val NAME = "SamoTvFocusGroup"
  }
}

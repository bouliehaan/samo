package app.samo.android.tv

import android.content.Context
import android.view.FocusFinder
import android.view.View
import android.view.ViewGroup
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

/**
 * A region of the TV screen that D-pad focus leaves only through its gates.
 *
 * Android's focus search is global geometry. Up from the top row of a page
 * finds the nearest rail icon above and to the left; Left from a control near
 * the top or bottom edge finds a rail icon before the seam guide, because the
 * guide is screen-tall and is scored from its centre. Either way focus lands
 * on a rail destination that has nothing to do with the page being shown.
 *
 * So a D-pad move searches this view alone: the nearest control in it, by
 * Android's own geometry and its own nextFocus overrides. Only when there is
 * none does focus leave, to the gate given for that direction (a React tag,
 * which React Native also uses as the view's Android id); a direction without
 * a gate goes nowhere. Searching the whole screen and refusing what lay
 * outside was not the same: a rail icon nearer than the filter pill above a
 * cover won the search, was refused, and Up went nowhere at all.
 */
class SamoTvFocusZoneView(context: Context) : ReactViewGroup(context) {
  var gateLeft = View.NO_ID
  var gateRight = View.NO_ID
  var gateUp = View.NO_ID
  var gateDown = View.NO_ID

  private val openFocusability = descendantFocusability

  /**
   * Covered by a menu or panel: no control in here can take focus. Each
   * control is also made unfocusable, but one at a time, and Android hands
   * the focus the first one loses to the next that still can take it, then
   * the next — scrolling the shelves behind the menu as it goes. Closing the
   * zone first leaves focus nowhere to go but the menu.
   */
  var covered = false
    set(value) {
      field = value
      descendantFocusability =
        if (value) ViewGroup.FOCUS_BLOCK_DESCENDANTS else openFocusability
    }

  override fun focusSearch(focused: View?, direction: Int): View? {
    val gate = when (direction) {
      View.FOCUS_LEFT -> gateLeft
      View.FOCUS_RIGHT -> gateRight
      View.FOCUS_UP -> gateUp
      View.FOCUS_DOWN -> gateDown
      // Tab order (forward/backward) is not a D-pad move.
      else -> return super.focusSearch(focused, direction)
    }
    if (focused == null) return super.focusSearch(focused, direction)
    FocusFinder.getInstance().findNextFocus(this, focused, direction)?.let { return it }
    if (gate == View.NO_ID) return null
    return rootView.findViewById<View>(gate)?.takeIf { it.isShown && it.isFocusable }
  }
}

class SamoTvFocusZoneManager : ReactViewManager() {
  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup =
    SamoTvFocusZoneView(context)

  @ReactProp(name = "covered", defaultBoolean = false)
  fun setCovered(view: ReactViewGroup, covered: Boolean) {
    (view as SamoTvFocusZoneView).covered = covered
  }

  @ReactProp(name = "gateLeft", defaultInt = View.NO_ID)
  fun setGateLeft(view: ReactViewGroup, tag: Int) {
    (view as SamoTvFocusZoneView).gateLeft = tag
  }

  @ReactProp(name = "gateRight", defaultInt = View.NO_ID)
  fun setGateRight(view: ReactViewGroup, tag: Int) {
    (view as SamoTvFocusZoneView).gateRight = tag
  }

  @ReactProp(name = "gateUp", defaultInt = View.NO_ID)
  fun setGateUp(view: ReactViewGroup, tag: Int) {
    (view as SamoTvFocusZoneView).gateUp = tag
  }

  @ReactProp(name = "gateDown", defaultInt = View.NO_ID)
  fun setGateDown(view: ReactViewGroup, tag: Int) {
    (view as SamoTvFocusZoneView).gateDown = tag
  }

  companion object {
    const val NAME = "SamoTvFocusZone"
  }
}

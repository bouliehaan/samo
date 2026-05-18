package app.samo.android.audio

import androidx.mediarouter.app.MediaRouteButton
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.google.android.gms.cast.framework.CastButtonFactory

class SamoCastButtonManager : SimpleViewManager<MediaRouteButton>() {
  override fun getName(): String = "SamoCastButton"

  override fun createViewInstance(reactContext: ThemedReactContext): MediaRouteButton {
    return MediaRouteButton(reactContext).apply {
      CastButtonFactory.setUpMediaRouteButton(reactContext, this)
      contentDescription = "Connect to Chromecast"
      setAlwaysVisible(true)
    }
  }

  @ReactProp(name = "tintColor")
  fun setTintColor(view: MediaRouteButton, tintColor: String?) {
    // MediaRouteButton owns its route-state drawable; the Cast framework
    // handles connected/available state coloring internally on this version.
  }
}

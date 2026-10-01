package app.samo.android

import android.os.Build
import android.os.Bundle
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.view.KeyEvent
import android.widget.EditText

import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    val isTv = (resources.configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) ==
      Configuration.UI_MODE_TYPE_TELEVISION
    // Text fields and the IME keep Android's normal key handling. Media keys
    // also pass through to the MediaSession, including while backgrounded.
    if (isTv && currentFocus !is EditText) {
      val key = when (event.keyCode) {
        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> "select"
        KeyEvent.KEYCODE_MENU -> "menu"
        KeyEvent.KEYCODE_DPAD_LEFT -> "left"
        KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
        KeyEvent.KEYCODE_DPAD_UP -> "up"
        KeyEvent.KEYCODE_DPAD_DOWN -> "down"
        else -> null
      }
      val context = (application as ReactApplication).reactHost?.currentReactContext
      if (key != null && context != null &&
          (event.action == KeyEvent.ACTION_DOWN || event.action == KeyEvent.ACTION_UP)) {
        context.emitDeviceEvent("samoTvKey", Arguments.createMap().apply {
          putString("eventType", key)
          putInt("eventKeyAction", event.action)
          putInt("repeatCount", event.repeatCount)
        })
        // Select is completed in JS on release, once it is known whether the
        // user held it. Native click handling can otherwise activate the item
        // before the hold opens its menu. Directional focus stays native.
        if (key == "select" || key == "menu") return true
      }
    }
    return super.dispatchKeyEvent(event)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    // Select at runtime: declaring portrait in the manifest makes stores infer
    // required portrait-screen hardware, excluding televisions from one APK.
    requestedOrientation = if ((resources.configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) ==
        Configuration.UI_MODE_TYPE_TELEVISION) {
      ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
    } else {
      ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }
    super.onCreate(null)
    // Required for SamoImeControlModule: the app must own its insets before the
    // system will hand over the IME animation. Without this the window is resized
    // FOR us and controlWindowInsetsAnimation has nothing to give.
    WindowCompat.setDecorFitsSystemWindows(window, false)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Root back must BACKGROUND the task, never finish the activity. The
    * playback foreground service keeps the process — and the JS VM with its
    * module stores — alive across a finish, so the next launch re-runs the
    * React root against surviving store state (observed: restored tab with a
    * permanently blank scene). The Android 12+ system default is supposed to
    * move root launcher tasks to back on its own, but this device (LineageOS,
    * API 36) still finished the activity — so enforce it on every SDK level.
    */
  override fun invokeDefaultOnBackPressed() {
      if (!moveTaskToBack(false)) {
          // Non-root activities keep the default finish behavior.
          super.invokeDefaultOnBackPressed()
      }
  }
}

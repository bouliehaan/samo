package app.samo.android

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
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

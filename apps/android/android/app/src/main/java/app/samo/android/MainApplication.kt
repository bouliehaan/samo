package app.samo.android

import android.app.Application
import android.content.res.Configuration

import android.util.Log
import app.samo.android.audio.SamoAudioPackage
import app.samo.android.ime.SamoImeControlPackage
import com.facebook.react.PackageList
import com.google.android.gms.cast.framework.CastContext
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  /**
   * The autolinked packages plus Samo's own two. Declared once and read by both
   * hosts below: SDK 57 removed `ReactNativeHostWrapper`, so the new-architecture
   * `reactHost` is now built from a package LIST rather than by wrapping the
   * legacy host, and the two would silently drift if each built its own.
   */
  private val reactPackages: List<ReactPackage>
    get() = PackageList(this).packages.apply {
      // Packages that cannot be autolinked yet can be added manually here, for example:
      // add(MyReactNativePackage())
      add(SamoAudioPackage())
      add(SamoImeControlPackage())
    }

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> = reactPackages

        override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }

  override val reactHost: ReactHost
    get() = ExpoReactHostFactory.getDefaultReactHost(applicationContext, reactPackages)

  override fun onCreate() {
    super.onCreate()
    // Warm up Cast SDK discovery early so the output picker isn't empty on first open.
    try {
      CastContext.getSharedInstance(this)
    } catch (error: Exception) {
      Log.w("SamoCast", "CastContext init deferred: ${error.message}")
    }
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}

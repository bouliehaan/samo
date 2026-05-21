package app.samo.android.audio

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class SamoAudioModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val engine = SamoAudioEngine(reactContext)

  override fun getName(): String = "SamoAudio"

  @ReactMethod
  fun addListener(eventName: String) = engine.addListener(eventName)

  @ReactMethod
  fun removeListeners(count: Int) = engine.removeListeners(count)

  @ReactMethod
  fun play(source: ReadableMap, promise: Promise) = engine.play(source, promise)

  @ReactMethod
  fun pause(promise: Promise) = engine.pause(promise)

  @ReactMethod
  fun resume(promise: Promise) = engine.resume(promise)

  @ReactMethod
  fun seekTo(positionMs: Double, promise: Promise) = engine.seekTo(positionMs, promise)

  @ReactMethod
  fun setSleepTimer(seconds: Double, promise: Promise) = engine.setSleepTimer(seconds, promise)

  @ReactMethod
  fun cancelSleepTimer(promise: Promise) = engine.cancelSleepTimer(promise)

  @ReactMethod
  fun stop(promise: Promise) = engine.stop(promise)

  @ReactMethod
  fun getStatus(promise: Promise) = engine.getStatus(promise)

  @ReactMethod
  fun updateNowPlayingMetadata(metadata: ReadableMap, promise: Promise) =
    engine.updateNowPlayingMetadata(metadata, promise)

  @ReactMethod
  fun getAudioDeviceInfo(promise: Promise) {
    promise.resolve(engine.getAudioDeviceInfoMap())
  }

  @ReactMethod
  fun getOutputRoutes(promise: Promise) = engine.getOutputRoutes(promise)

  @ReactMethod
  fun selectOutputRoute(route: ReadableMap, promise: Promise) = engine.selectOutputRoute(route, promise)

  @ReactMethod
  fun getCastState(promise: Promise) = engine.getCastState(promise)

  override fun invalidate() {
    engine.invalidate()
    super.invalidate()
  }
}

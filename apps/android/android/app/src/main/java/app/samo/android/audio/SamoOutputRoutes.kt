package app.samo.android.audio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.google.android.gms.cast.CastMediaControlIntent
import com.google.android.gms.cast.framework.CastContext
import app.samo.android.BuildConfig

internal class SamoOutputRoutes(
  private val reactContext: ReactApplicationContext,
  private val mainHandler: Handler,
) {
  private var outputRouteDiscoveryCallback: MediaRouter.Callback? = null
  private var outputRouteDiscoveryStop: Runnable? = null

  /**
   * Custom receiver app IDs only match routes registered for that app in the Cast
   * console. Union the default Cast category so nearby Chromecasts still appear in
   * the picker; sessions still launch [SamoCastOptionsProvider]'s receiver id.
   */
  private fun buildCastDiscoverySelector(castContext: CastContext): MediaRouteSelector {
    val builder = MediaRouteSelector.Builder()
    castContext.getMergedSelector()?.controlCategories?.forEach { category ->
      builder.addControlCategory(category)
    }
    val customReceiverId = BuildConfig.CAST_RECEIVER_APPLICATION_ID.trim()
    if (customReceiverId.isNotEmpty()) {
      builder.addControlCategory(CastMediaControlIntent.categoryForCast(customReceiverId))
    }
    builder.addControlCategory(
      CastMediaControlIntent.categoryForCast(
        CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID,
      ),
    )
    return builder.build()
  }

  fun ensureOutputRouteDiscovery(castContext: CastContext, selectedLocalOutputDeviceId: Int?, getCastStateMap: (Int?) -> com.facebook.react.bridge.WritableMap, getUnavailableCastStateMap: () -> com.facebook.react.bridge.WritableMap, emitOutputRoutes: (com.facebook.react.bridge.WritableMap) -> Unit) {
    val router = MediaRouter.getInstance(reactContext.applicationContext)
    outputRouteDiscoveryCallback?.let { router.removeCallback(it) }

    val callback = object : MediaRouter.Callback() {
      override fun onRouteAdded(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emitOutputRoutes(getOutputRoutesMap(castContext, selectedLocalOutputDeviceId, getCastStateMap, getUnavailableCastStateMap))
      }

      override fun onRouteChanged(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emitOutputRoutes(getOutputRoutesMap(castContext, selectedLocalOutputDeviceId, getCastStateMap, getUnavailableCastStateMap))
      }

      override fun onRouteRemoved(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emitOutputRoutes(getOutputRoutesMap(castContext, selectedLocalOutputDeviceId, getCastStateMap, getUnavailableCastStateMap))
      }

      override fun onRouteSelected(router: MediaRouter, route: MediaRouter.RouteInfo, reason: Int) {
        emitOutputRoutes(getOutputRoutesMap(castContext, selectedLocalOutputDeviceId, getCastStateMap, getUnavailableCastStateMap))
      }

      override fun onRouteUnselected(router: MediaRouter, route: MediaRouter.RouteInfo, reason: Int) {
        emitOutputRoutes(getOutputRoutesMap(castContext, selectedLocalOutputDeviceId, getCastStateMap, getUnavailableCastStateMap))
      }
    }

    outputRouteDiscoveryCallback = callback
    val discoverySelector = buildCastDiscoverySelector(castContext)
    router.addCallback(
      discoverySelector,
      callback,
      MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY or MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN
    )

    outputRouteDiscoveryStop?.let { mainHandler.removeCallbacks(it) }
    outputRouteDiscoveryStop = Runnable { stopOutputRouteDiscovery() }
    mainHandler.postDelayed(outputRouteDiscoveryStop!!, 90_000)

    emitOutputRoutes(
      getOutputRoutesMap(
        castContext,
        selectedLocalOutputDeviceId,
        getCastStateMap,
        getUnavailableCastStateMap,
      ),
    )
  }

  fun stopOutputRouteDiscovery() {
    outputRouteDiscoveryStop?.let { mainHandler.removeCallbacks(it) }
    outputRouteDiscoveryStop = null

    val callback = outputRouteDiscoveryCallback ?: return
    outputRouteDiscoveryCallback = null
    try {
      MediaRouter.getInstance(reactContext.applicationContext).removeCallback(callback)
    } catch (_: Exception) {
      // Discovery is opportunistic; teardown should never destabilize playback.
    }
  }

  fun getOutputRoutesMap(castContext: CastContext?, selectedLocalOutputDeviceId: Int?, getCastStateMap: (Int?) -> com.facebook.react.bridge.WritableMap, getUnavailableCastStateMap: () -> com.facebook.react.bridge.WritableMap): WritableMap {
    val map = Arguments.createMap()
    val routes = Arguments.createArray()
    val castSession = castContext?.sessionManager?.currentCastSession
    val isCastConnected = castSession?.isConnected == true

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).toList()
      val speaker = outputDevices.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
      val selectedLocalDeviceId = if (isCastConnected) null else selectedLocalOutputDeviceId
      val selectedSystemRoute = try {
        MediaRouter.getInstance(reactContext.applicationContext).getSelectedRoute()
      } catch (_: Exception) {
        null
      }

      routes.pushMap(
        getLocalOutputRouteMap(
          device = speaker,
          fallbackId = "local-speaker",
          fallbackTitle = "Local Speakers",
          fallbackType = "speaker",
          isSelected = !isCastConnected &&
            (selectedLocalDeviceId == speaker?.id ||
              (selectedLocalDeviceId == null &&
                (selectedSystemRoute?.isDeviceSpeaker == true || selectedSystemRoute?.isDefault == true)))
        )
      )

      outputDevices
        .filter { it.type != AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
        .filter { isUserSelectableAudioOutput(it) }
        .sortedWith(compareBy({ getAudioDeviceSortRank(it.type) }, { getAudioDeviceTitle(it) }))
        .forEach { device ->
          val route = getLocalOutputRouteMap(
            device = device,
            fallbackId = "local-${device.id}",
            fallbackTitle = getAudioDeviceTitle(device),
            fallbackType = getAudioDeviceType(device.type),
            isSelected = !isCastConnected &&
              (selectedLocalDeviceId == device.id ||
                (selectedLocalDeviceId == null && selectedSystemRouteMatchesDevice(selectedSystemRoute, device)))
          )
          routes.pushMap(route)
        }
    } else {
      routes.pushMap(
        getLocalOutputRouteMap(
          device = null,
          fallbackId = "local-speaker",
          fallbackTitle = "Local Speakers",
          fallbackType = "speaker",
          isSelected = !isCastConnected
        )
      )
    }

    if (castContext != null) {
      val router = MediaRouter.getInstance(reactContext.applicationContext)
      val selector = buildCastDiscoverySelector(castContext)
      router.getRoutes()
        .filter { route ->
          route.isEnabled &&
            route.matchesSelector(selector) &&
            !route.isDefault &&
            !route.isBluetooth
        }
        .sortedBy { it.getName() }
        .forEach { route ->
          val routeMap = Arguments.createMap()
          routeMap.putString("id", "cast-${route.getId()}")
          routeMap.putString("kind", "cast")
          routeMap.putString("routeId", route.getId())
          routeMap.putString("title", route.getName())
          routeMap.putString("subtitle", getCastRouteSubtitle(route))
          routeMap.putString("type", getMediaRouteDeviceType(route.getDeviceType()))
          routeMap.putBoolean("isSelected", isCastConnected && route.isSelected)
          routeMap.putBoolean("isAvailable", true)
          routes.pushMap(routeMap)
        }
    }

    map.putArray("routes", routes)
    map.putMap(
      "cast",
      if (castContext != null) getCastStateMap(castContext.getCastState()) else getUnavailableCastStateMap()
    )
    return map
  }

  fun getLocalOutputRouteMap(
    device: AudioDeviceInfo?,
    fallbackId: String,
    fallbackTitle: String,
    fallbackType: String,
    isSelected: Boolean
  ): WritableMap {
    val map = Arguments.createMap()
    val type = device?.let { getAudioDeviceType(it.type) } ?: fallbackType

    map.putString("id", device?.let { "local-${it.id}" } ?: fallbackId)
    map.putString("kind", "local")
    if (device != null) {
      map.putDouble("deviceId", device.id.toDouble())
    }
    map.putString("title", device?.let { getAudioDeviceTitle(it) } ?: fallbackTitle)
    map.putString("subtitle", getLocalOutputSubtitle(type))
    map.putString("type", type)
    map.putBoolean("isSelected", isSelected)
    map.putBoolean("isAvailable", true)
    return map
  }

  fun isUserSelectableAudioOutput(device: AudioDeviceInfo): Boolean {
    return when (device.type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLE_HEADSET,
      AudioDeviceInfo.TYPE_BLE_SPEAKER,
      AudioDeviceInfo.TYPE_HEARING_AID,
      AudioDeviceInfo.TYPE_USB_DEVICE,
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> true
      else -> false
    }
  }

  fun getAudioDeviceTitle(device: AudioDeviceInfo): String {
    val productName = device.productName?.toString()?.trim()
    if (!productName.isNullOrBlank()) {
      return productName
    }

    return when (getAudioDeviceType(device.type)) {
      "bluetooth-a2dp", "ble-headset", "ble-speaker", "hearing-aid" -> "Bluetooth Audio"
      "usb-device", "usb-headset" -> "USB Audio"
      "wired-headphones" -> "Wired Headphones"
      "wired-headset" -> "Wired Headset"
      "speaker" -> "Local Speakers"
      else -> "Audio Output"
    }
  }

  fun getAudioDeviceSortRank(type: Int): Int {
    return when (type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
      AudioDeviceInfo.TYPE_BLE_HEADSET,
      AudioDeviceInfo.TYPE_BLE_SPEAKER,
      AudioDeviceInfo.TYPE_HEARING_AID -> 0
      AudioDeviceInfo.TYPE_USB_DEVICE,
      AudioDeviceInfo.TYPE_USB_HEADSET -> 1
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> 2
      else -> 9
    }
  }

  fun selectedSystemRouteMatchesDevice(
    route: MediaRouter.RouteInfo?,
    device: AudioDeviceInfo
  ): Boolean {
    if (route == null) return false
    return when (device.type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> route.isBluetooth ||
        route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_BLUETOOTH_A2DP
      AudioDeviceInfo.TYPE_BLE_HEADSET,
      AudioDeviceInfo.TYPE_BLE_SPEAKER -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_BLE_HEADSET
      AudioDeviceInfo.TYPE_HEARING_AID -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_HEARING_AID
      AudioDeviceInfo.TYPE_USB_DEVICE -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_USB_DEVICE
      AudioDeviceInfo.TYPE_USB_HEADSET -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_USB_HEADSET
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_WIRED_HEADPHONES
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> route.getDeviceType() == MediaRouter.RouteInfo.DEVICE_TYPE_WIRED_HEADSET
      else -> false
    }
  }

  fun getLocalOutputSubtitle(type: String): String {
    return when (type) {
      "speaker" -> "This phone"
      "bluetooth-a2dp", "ble-headset", "ble-speaker", "hearing-aid" -> "Bluetooth"
      "usb-device", "usb-headset" -> "USB audio"
      "wired-headphones", "wired-headset" -> "Wired audio"
      else -> "Local audio"
    }
  }

  fun getCastRouteSubtitle(route: MediaRouter.RouteInfo): String {
    return when (route.getConnectionState()) {
      MediaRouter.RouteInfo.CONNECTION_STATE_CONNECTED -> "Chromecast · Connected"
      MediaRouter.RouteInfo.CONNECTION_STATE_CONNECTING -> "Chromecast · Connecting"
      else -> route.getDescription()?.takeIf { it.isNotBlank() } ?: "Chromecast"
    }
  }

  fun getMediaRouteDeviceType(type: Int): String {
    return when (type) {
      MediaRouter.RouteInfo.DEVICE_TYPE_TV -> "cast-tv"
      MediaRouter.RouteInfo.DEVICE_TYPE_SPEAKER,
      MediaRouter.RouteInfo.DEVICE_TYPE_REMOTE_SPEAKER -> "cast-speaker"
      MediaRouter.RouteInfo.DEVICE_TYPE_GROUP -> "cast-group"
      else -> "cast"
    }
  }

  fun getAudioDeviceInfoMap(): WritableMap {
    val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val map = Arguments.createMap()

    map.putString(
      "outputSampleRate",
      audioManager.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)
    )
    map.putString(
      "framesPerBuffer",
      audioManager.getProperty(AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER)
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val devices = Arguments.createArray()
      val outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)

      map.putBoolean(
        "isBluetoothA2dpOn",
        outputDevices.any { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP }
      )
      map.putBoolean(
        "isSpeakerphoneOn",
        outputDevices.any { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
      )
      map.putBoolean(
        "isWiredHeadsetOn",
        outputDevices.any {
          it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
            it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
            it.type == AudioDeviceInfo.TYPE_USB_DEVICE ||
            it.type == AudioDeviceInfo.TYPE_USB_HEADSET
        }
      )

      outputDevices.forEach { device ->
        val deviceMap = Arguments.createMap()
        val sampleRates = Arguments.createArray()
        val channelCounts = Arguments.createArray()
        val encodings = Arguments.createArray()

        device.sampleRates.forEach { sampleRates.pushInt(it) }
        device.channelCounts.forEach { channelCounts.pushInt(it) }
        device.encodings.forEach { encodings.pushInt(it) }

        deviceMap.putString("type", getAudioDeviceType(device.type))
        deviceMap.putDouble("id", device.id.toDouble())
        deviceMap.putString("productName", device.productName?.toString())
        deviceMap.putArray("sampleRates", sampleRates)
        deviceMap.putArray("channelCounts", channelCounts)
        deviceMap.putArray("encodings", encodings)
        devices.pushMap(deviceMap)
      }

      map.putArray("outputs", devices)
    }

    return map
  }

  fun getAudioDeviceType(type: Int): String {
    return when (type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetooth-a2dp"
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
      AudioDeviceInfo.TYPE_BLE_HEADSET -> "ble-headset"
      AudioDeviceInfo.TYPE_BLE_SPEAKER -> "ble-speaker"
      AudioDeviceInfo.TYPE_HEARING_AID -> "hearing-aid"
      AudioDeviceInfo.TYPE_USB_DEVICE -> "usb-device"
      AudioDeviceInfo.TYPE_USB_HEADSET -> "usb-headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired-headphones"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired-headset"
      else -> "type-$type"
    }
  }
}

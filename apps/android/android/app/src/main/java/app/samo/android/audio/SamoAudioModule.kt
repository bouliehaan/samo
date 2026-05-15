package app.samo.android.audio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.AudioMixerAttributes
import android.media.AudioTrack
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import android.media.AudioAttributes as PlatformAudioAttributes
import android.media.AudioFormat as PlatformAudioFormat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.audio.AudioSink
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

class SamoAudioModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var boundService: SamoPlaybackService? = null
  private var isBinding = false
  private val pendingServiceActions = mutableListOf<(SamoPlaybackService) -> Unit>()
  private var currentAudioTrackConfig: AudioSink.AudioTrackConfig? = null
  private var currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
  private var currentHlsFallbackAttempted = false
  private var currentMediaItem: MediaItem? = null
  private var currentQuality: SamoAudioSourceQuality? = null
  private var currentSource: SamoAudioSourceSnapshot? = null
  private var currentSessionId: String? = null
  private var playerListenersInstalledOn: ExoPlayer? = null

  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val service = (binder as? SamoPlaybackService.LocalBinder)?.getService() ?: return
      boundService = service
      isBinding = false
      val pending = pendingServiceActions.toList()
      pendingServiceActions.clear()
      pending.forEach { it(service) }
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      boundService = null
      playerListenersInstalledOn = null
    }
  }

  override fun getName(): String = "SamoAudio"

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  @ReactMethod
  fun play(source: ReadableMap, promise: Promise) {
    val url = getOptionalString(source, "url")
    if (url == null) {
      promise.reject("SAMO_AUDIO_ERROR", "Missing audio URL")
      return
    }
    val sessionId = getOptionalString(source, "sessionId") ?: UUID.randomUUID().toString()
    val title = getOptionalString(source, "title") ?: "Samo"
    val subtitle = getOptionalString(source, "subtitle")
    val artworkUrl = getOptionalString(source, "artworkUrl")
    val mediaId = getOptionalString(source, "id") ?: sessionId
    val mimeType = getMediaItemMimeType(url, getOptionalString(source, "mimeType"))
    val requestHeaders = getHttpHeaders(source)
    val quality = getSourceQuality(source)
    val sourceLabel = getOptionalString(source, "source")

    withService(promise) { service ->
      val mediaMetadataBuilder = MediaMetadata.Builder()
        .setTitle(title)
        .setArtist(subtitle)

      if (!artworkUrl.isNullOrBlank()) {
        mediaMetadataBuilder.setArtworkUri(Uri.parse(artworkUrl))
      }

      val mediaItem = MediaItem.Builder()
        .setMediaId(mediaId)
        .setMediaMetadata(mediaMetadataBuilder.build())
        .setMimeType(mimeType)
        .setUri(Uri.parse(url))
        .build()
      val resolvedPlayer = service.ensurePlayer(requestHeaders)
      installListenersIfNeeded(resolvedPlayer)

      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      clearPreferredMixerAttributes(service)
      currentAudioTrackConfig = null
      currentHlsFallbackAttempted = mimeType == MimeTypes.APPLICATION_M3U8
      currentMediaItem = mediaItem
      currentQuality = quality
      currentBitPerfectTruth = buildBitPerfectTruth(
        audioTrackConfig = null,
        quality = quality,
        requestPreferredMixer = true,
        service = service
      )
      currentSource = SamoAudioSourceSnapshot(
        artworkUrl = artworkUrl,
        id = mediaId,
        source = sourceLabel,
        subtitle = subtitle,
        title = title
      )
      currentSessionId = sessionId
      resolvedPlayer.setMediaItem(mediaItem)
      resolvedPlayer.prepare()
      resolvedPlayer.playWhenReady = true
      emitState("buffering")
      promise.resolve(getStatusMap(resolvedPlayer, "buffering"))
    }
  }

  @ReactMethod
  fun pause(promise: Promise) {
    withService(promise) { service ->
      // Critical: must use the existing player. ensurePlayer(emptyMap()) would
      // see a header mismatch with whatever was used for play() and tear the
      // current player down — silently stopping audio every time the user
      // taps pause.
      val resolvedPlayer = service.getCurrentPlayer()
      if (resolvedPlayer == null) {
        promise.resolve(getIdleStatusMap())
        return@withService
      }
      installListenersIfNeeded(resolvedPlayer)
      resolvedPlayer.pause()
      emitState("paused")
      promise.resolve(getStatusMap(resolvedPlayer, "paused"))
    }
  }

  @ReactMethod
  fun resume(promise: Promise) {
    withService(promise) { service ->
      val resolvedPlayer = service.getCurrentPlayer()
      if (resolvedPlayer == null) {
        promise.resolve(getIdleStatusMap())
        return@withService
      }
      installListenersIfNeeded(resolvedPlayer)
      resolvedPlayer.play()
      emitState("playing")
      promise.resolve(getStatusMap(resolvedPlayer, "playing"))
    }
  }

  @ReactMethod
  fun seekTo(positionMs: Double, promise: Promise) {
    withService(promise) { service ->
      val resolvedPlayer = service.getCurrentPlayer()
      if (resolvedPlayer == null) {
        promise.resolve(getIdleStatusMap())
        return@withService
      }
      installListenersIfNeeded(resolvedPlayer)
      resolvedPlayer.seekTo(positionMs.toLong())
      promise.resolve(getStatusMap(resolvedPlayer))
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mainHandler.post {
      val service = boundService
      if (service == null) {
        promise.resolve(getIdleStatusMap())
        return@post
      }
      try {
        service.resetPlayerState()
        clearPreferredMixerAttributes(service)
        currentAudioTrackConfig = null
        currentHlsFallbackAttempted = false
        currentMediaItem = null
        currentQuality = null
        currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
        currentSource = null
        currentSessionId = null
        emitState("idle")
        promise.resolve(getIdleStatusMap())
        val intent = Intent(reactContext, SamoPlaybackService::class.java)
        reactContext.stopService(intent)
      } catch (error: Exception) {
        promise.reject("SAMO_AUDIO_ERROR", error.message, error)
      }
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    mainHandler.post {
      val service = boundService
      if (service == null) {
        promise.resolve(getIdleStatusMap())
        return@post
      }
      try {
        val resolvedPlayer = service.getCurrentPlayer()
        promise.resolve(
          if (resolvedPlayer == null) getIdleStatusMap() else getStatusMap(resolvedPlayer)
        )
      } catch (error: Exception) {
        promise.reject("SAMO_AUDIO_ERROR", error.message, error)
      }
    }
  }

  @ReactMethod
  fun getAudioDeviceInfo(promise: Promise) {
    promise.resolve(getAudioDeviceInfoMap())
  }

  override fun invalidate() {
    mainHandler.post {
      val service = boundService
      if (service != null) {
        try {
          clearPreferredMixerAttributes(service)
        } catch (_: Exception) {
          // Best-effort cleanup; never block teardown on opportunistic mixer state.
        }
      }
      try {
        reactContext.unbindService(serviceConnection)
      } catch (_: Exception) {
        // Service may not be bound; that's fine.
      }
      boundService = null
      playerListenersInstalledOn = null
      currentAudioTrackConfig = null
      currentHlsFallbackAttempted = false
      currentMediaItem = null
      currentQuality = null
      currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
      currentSource = null
      currentSessionId = null
    }
  }

  private fun withService(promise: Promise, block: (SamoPlaybackService) -> Unit) {
    // Confine all reads/writes of boundService, isBinding, and
    // pendingServiceActions to the main thread. ReactMethod calls arrive on
    // RN's module dispatch thread; ServiceConnection callbacks arrive on the
    // main thread. Without this confinement they race and pending commands
    // can silently strand — the user-visible symptom is a tap that does
    // nothing and eventually an ANR while the JS thread waits on a never-
    // resolved promise.
    mainHandler.post {
      val existing = boundService
      if (existing != null) {
        try {
          block(existing)
        } catch (error: Exception) {
          promise.reject("SAMO_AUDIO_ERROR", error.message, error)
        }
        return@post
      }

      pendingServiceActions.add { service ->
        try {
          block(service)
        } catch (error: Exception) {
          promise.reject("SAMO_AUDIO_ERROR", error.message, error)
        }
      }

      if (isBinding) {
        return@post
      }
      isBinding = true
      val intent = Intent(reactContext, SamoPlaybackService::class.java).apply {
        action = SamoPlaybackService.ACTION_BIND_LOCAL
      }
      try {
        ContextCompat.startForegroundService(reactContext, intent)
        val bound = reactContext.bindService(
          intent,
          serviceConnection,
          Context.BIND_AUTO_CREATE
        )
        if (!bound) {
          isBinding = false
          pendingServiceActions.clear()
          promise.reject("SAMO_AUDIO_ERROR", "Could not bind audio playback service")
        }
      } catch (error: Exception) {
        isBinding = false
        pendingServiceActions.clear()
        promise.reject("SAMO_AUDIO_ERROR", error.message, error)
      }
    }
  }

  private fun installListenersIfNeeded(player: ExoPlayer) {
    if (playerListenersInstalledOn === player) {
      return
    }
    playerListenersInstalledOn = player

    player.addListener(object : Player.Listener {
      override fun onIsPlayingChanged(isPlaying: Boolean) {
        emitState(if (isPlaying) "playing" else getCurrentStatus(player))
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        emitState(getCurrentStatus(player))
      }

      override fun onPlayerError(error: PlaybackException) {
        if (retryCurrentSourceAsHls(player, error)) {
          return
        }

        val event = getStatusMap(player, "error")
        val cause = error.cause
        val details = listOfNotNull(
          error.errorCodeName,
          error.message,
          cause?.javaClass?.name,
          cause?.message
        ).joinToString(" - ")

        Log.e("SamoAudio", "Playback error: $details", error)
        event.putString("message", details.ifBlank { "Playback failed" })
        emit("SamoAudioPlaybackState", event)
      }
    })
    player.addAnalyticsListener(object : AnalyticsListener {
      override fun onAudioTrackInitialized(
        eventTime: AnalyticsListener.EventTime,
        audioTrackConfig: AudioSink.AudioTrackConfig
      ) {
        currentAudioTrackConfig = audioTrackConfig
        currentBitPerfectTruth = buildBitPerfectTruth(
          audioTrackConfig = audioTrackConfig,
          quality = currentQuality,
          requestPreferredMixer = false,
          service = boundService
        )
        emitState()
      }

      override fun onAudioTrackReleased(
        eventTime: AnalyticsListener.EventTime,
        audioTrackConfig: AudioSink.AudioTrackConfig
      ) {
        currentAudioTrackConfig = null
        currentBitPerfectTruth = buildBitPerfectTruth(
          audioTrackConfig = null,
          quality = currentQuality,
          requestPreferredMixer = false,
          service = boundService
        )
        emitState()
      }
    })
  }

  private fun emitState(status: String? = null) {
    val resolvedPlayer = boundService?.getCurrentPlayer()
    val event = if (resolvedPlayer == null) getIdleStatusMap() else getStatusMap(resolvedPlayer, status)

    emit("SamoAudioPlaybackState", event)
  }

  private fun emit(eventName: String, event: WritableMap) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, event)
  }

  private fun getCurrentStatus(resolvedPlayer: ExoPlayer): String {
    return when (resolvedPlayer.playbackState) {
      Player.STATE_BUFFERING -> "buffering"
      Player.STATE_ENDED -> "ended"
      Player.STATE_IDLE -> "idle"
      Player.STATE_READY -> if (resolvedPlayer.isPlaying) "playing" else "paused"
      else -> "idle"
    }
  }

  private fun retryCurrentSourceAsHls(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    val mediaItem = currentMediaItem ?: return false

    if (
      currentHlsFallbackAttempted ||
        error.errorCode != PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED
    ) {
      return false
    }

    currentHlsFallbackAttempted = true
    currentMediaItem = mediaItem.buildUpon()
      .setMimeType(MimeTypes.APPLICATION_M3U8)
      .build()

    Log.w("SamoAudio", "Retrying current source as HLS after unsupported container parse.")
    resolvedPlayer.stop()
    resolvedPlayer.clearMediaItems()
    resolvedPlayer.setMediaItem(currentMediaItem!!)
    resolvedPlayer.prepare()
    resolvedPlayer.playWhenReady = true
    emitState("buffering")
    return true
  }

  private fun getOptionalString(source: ReadableMap, key: String): String? {
    if (!source.hasKey(key) || source.isNull(key)) {
      return null
    }

    return source.getString(key)
  }

  private fun getOptionalBoolean(source: ReadableMap, key: String): Boolean? {
    if (!source.hasKey(key) || source.isNull(key)) {
      return null
    }

    return source.getBoolean(key)
  }

  private fun getHttpHeaders(source: ReadableMap): Map<String, String> {
    if (!source.hasKey("httpHeaders") || source.isNull("httpHeaders")) {
      return emptyMap()
    }

    val headers = source.getMap("httpHeaders") ?: return emptyMap()
    val iterator = headers.keySetIterator()
    val result = mutableMapOf<String, String>()

    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()

      if (!headers.isNull(key)) {
        headers.getString(key)?.let { value ->
          if (key.isNotBlank() && value.isNotBlank()) {
            result[key] = value
          }
        }
      }
    }

    return result
  }

  private fun getMediaItemMimeType(url: String, declaredMimeType: String?): String? {
    val normalizedUrl = url.lowercase()

    if (
      declaredMimeType?.lowercase()?.contains("mpegurl") == true ||
        normalizedUrl.contains("/hls/") ||
        normalizedUrl.contains(".m3u8")
    ) {
      return MimeTypes.APPLICATION_M3U8
    }

    return declaredMimeType
  }

  private fun getOptionalInt(source: ReadableMap, key: String): Int? {
    if (!source.hasKey(key) || source.isNull(key)) {
      return null
    }

    return source.getDouble(key).toInt()
  }

  private fun getSourceQuality(source: ReadableMap): SamoAudioSourceQuality {
    val quality = if (source.hasKey("quality") && !source.isNull("quality")) {
      source.getMap("quality")
    } else {
      null
    }

    return SamoAudioSourceQuality(
      bitDepth = quality?.let { getOptionalInt(it, "bitDepth") },
      channelCount = quality?.let { getOptionalInt(it, "channelCount") },
      container = quality?.let { getOptionalString(it, "container") },
      losslessRequired = quality?.let { getOptionalBoolean(it, "losslessRequired") } ?: false,
      sampleRate = quality?.let { getOptionalInt(it, "sampleRate") },
      serverTranscodeRequested =
        quality?.let { getOptionalBoolean(it, "serverTranscodeRequested") } ?: true
    )
  }

  private fun getStatusMap(resolvedPlayer: ExoPlayer, status: String? = null): WritableMap {
    val map = Arguments.createMap()
    val source = currentSource
    val duration = resolvedPlayer.duration

    map.putString("sessionId", currentSessionId)
    map.putString("status", status ?: getCurrentStatus(resolvedPlayer))
    map.putDouble("positionMs", resolvedPlayer.currentPosition.toDouble())
    map.putDouble("durationMs", if (duration == C.TIME_UNSET) -1.0 else duration.toDouble())
    map.putBoolean("isPlaying", resolvedPlayer.isPlaying)
    map.putMap("bitPerfect", getBitPerfectTruthMap(currentBitPerfectTruth))

    if (source != null) {
      val sourceMap = Arguments.createMap()

      sourceMap.putString("id", source.id)
      sourceMap.putString("source", source.source)
      sourceMap.putString("title", source.title)
      sourceMap.putString("subtitle", source.subtitle)
      sourceMap.putString("artworkUrl", source.artworkUrl)
      map.putMap("source", sourceMap)
    }

    return map
  }

  private fun getIdleStatusMap(): WritableMap {
    val map = Arguments.createMap()

    map.putString("status", "idle")
    map.putBoolean("isPlaying", false)
    map.putDouble("positionMs", 0.0)
    map.putDouble("durationMs", -1.0)
    map.putMap("bitPerfect", getBitPerfectTruthMap(SamoBitPerfectTruth.unknown()))
    return map
  }

  private fun getBitPerfectTruthMap(truth: SamoBitPerfectTruth): WritableMap {
    val map = Arguments.createMap()
    val evidence = Arguments.createArray()

    truth.evidence.forEach { evidence.pushString(it) }

    map.putString("activeClaim", truth.activeClaim)
    map.putBoolean("directBitstreamSupported", truth.directBitstreamSupported)
    map.putBoolean("directOffloadGaplessSupported", truth.directOffloadGaplessSupported)
    map.putBoolean("directOffloadSupported", truth.directOffloadSupported)
    map.putBoolean("directPcmSupported", truth.directPcmSupported)
    map.putArray("evidence", evidence)
    map.putBoolean("offloadedPlaybackActive", truth.offloadedPlaybackActive)
    truth.sourceBitDepth?.let { map.putInt("sourceBitDepth", it) }
    truth.sourceChannelCount?.let { map.putInt("sourceChannelCount", it) }
    truth.sourceSampleRate?.let { map.putInt("sourceSampleRate", it) }
    map.putBoolean("usbBitPerfectMixerRequested", truth.usbBitPerfectMixerRequested)
    map.putBoolean("usbBitPerfectMixerSupported", truth.usbBitPerfectMixerSupported)

    return map
  }

  private fun buildBitPerfectTruth(
    audioTrackConfig: AudioSink.AudioTrackConfig?,
    quality: SamoAudioSourceQuality?,
    requestPreferredMixer: Boolean,
    service: SamoPlaybackService?
  ): SamoBitPerfectTruth {
    val evidence = mutableListOf<String>()

    if (quality == null) {
      return SamoBitPerfectTruth(
        activeClaim = "unknown",
        evidence = listOf("No source quality descriptor was provided to the Android audio engine.")
      )
    }

    val sourceFormat = buildSourcePcmFormat(quality)
    val platformAttributes = getPlatformAudioAttributes()
    val directSupport = sourceFormat?.let { getDirectPlaybackSupport(it, platformAttributes) } ?: 0
    val directOffloadSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_OFFLOAD_SUPPORTED != 0
    val directOffloadGaplessSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_OFFLOAD_GAPLESS_SUPPORTED ==
        AudioManager.DIRECT_PLAYBACK_OFFLOAD_GAPLESS_SUPPORTED
    val directBitstreamSupported =
      directSupport and AudioManager.DIRECT_PLAYBACK_BITSTREAM_SUPPORTED != 0
    val directPcmSupported = sourceFormat?.let {
      isDirectPcmPlaybackSupported(it, platformAttributes)
    } ?: false
    val usbMixerSupported = sourceFormat?.let {
      getSupportedBitPerfectUsbMixerAttributes(it) != null
    } ?: false
    val usbMixerRequested = if (requestPreferredMixer && sourceFormat != null && service != null) {
      requestBitPerfectUsbMixer(sourceFormat, platformAttributes, service)
    } else {
      currentBitPerfectTruth.usbBitPerfectMixerRequested
    }
    val outputMatchesSource =
      audioTrackConfig != null && outputConfigMatchesSource(audioTrackConfig, quality)
    val offloadedPlaybackActive = audioTrackConfig?.offload == true

    if (quality.losslessRequired) {
      evidence.add("Source requested lossless/direct delivery.")
    } else {
      evidence.add("Source does not require lossless delivery.")
    }

    if (quality.serverTranscodeRequested) {
      evidence.add("Server transcode is requested; bit-perfect is impossible.")
    } else {
      evidence.add("Server transcode is not requested.")
    }

    if (sourceFormat == null) {
      evidence.add("Source sample rate, bit depth, or channel count is missing; route cannot be proven.")
    } else {
      evidence.add("Source PCM target is ${quality.bitDepth}-bit/${quality.sampleRate} Hz/${quality.channelCount}ch.")
    }

    if (directPcmSupported) {
      evidence.add("Android reports direct PCM support for this source format.")
    } else {
      evidence.add("Android does not report direct PCM support for this source format.")
    }

    if (usbMixerRequested) {
      evidence.add("Android accepted a USB bit-perfect mixer request for this source format.")
    } else if (usbMixerSupported) {
      evidence.add("A USB bit-perfect mixer format is supported, but it is not active yet.")
    } else {
      evidence.add("No matching USB bit-perfect mixer route is currently available.")
    }

    if (offloadedPlaybackActive) {
      evidence.add("Media3 reports the current AudioTrack is offloaded.")
    } else {
      evidence.add("Media3 does not report active offloaded playback.")
    }

    if (outputMatchesSource) {
      evidence.add("Android AudioTrack output format matches the source quality descriptor.")
    } else if (audioTrackConfig != null) {
      evidence.add("Android AudioTrack output format does not prove a source-matched path.")
    }

    val activeClaim = when {
      !quality.losslessRequired -> "not-bit-perfect"
      quality.serverTranscodeRequested -> "not-bit-perfect"
      usbMixerRequested && outputMatchesSource -> "bit-perfect-active"
      offloadedPlaybackActive && (directOffloadSupported || directOffloadGaplessSupported) ->
        "bit-perfect-active"
      else -> "unknown"
    }

    return SamoBitPerfectTruth(
      activeClaim = activeClaim,
      directBitstreamSupported = directBitstreamSupported,
      directOffloadGaplessSupported = directOffloadGaplessSupported,
      directOffloadSupported = directOffloadSupported,
      directPcmSupported = directPcmSupported,
      evidence = evidence,
      offloadedPlaybackActive = offloadedPlaybackActive,
      sourceBitDepth = quality.bitDepth,
      sourceChannelCount = quality.channelCount,
      sourceSampleRate = quality.sampleRate,
      usbBitPerfectMixerRequested = usbMixerRequested,
      usbBitPerfectMixerSupported = usbMixerSupported
    )
  }

  private fun getPlatformAudioAttributes(): PlatformAudioAttributes {
    return PlatformAudioAttributes.Builder()
      .setContentType(PlatformAudioAttributes.CONTENT_TYPE_MUSIC)
      .setUsage(PlatformAudioAttributes.USAGE_MEDIA)
      .build()
  }

  @Suppress("DEPRECATION")
  private fun getDirectPlaybackSupport(
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes
  ): Int {
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        AudioManager.getDirectPlaybackSupport(format, attributes)
      } else {
        if (AudioTrack.isDirectPlaybackSupported(format, attributes)) {
          AudioManager.DIRECT_PLAYBACK_BITSTREAM_SUPPORTED
        } else {
          AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
        }
      }
    } catch (_: Exception) {
      AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
    }
  }

  @Suppress("DEPRECATION")
  private fun isDirectPcmPlaybackSupported(
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes
  ): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getDirectPlaybackSupport(format, attributes) != AudioManager.DIRECT_PLAYBACK_NOT_SUPPORTED
    } else {
      AudioTrack.isDirectPlaybackSupported(format, attributes)
    }
  }

  private fun buildSourcePcmFormat(quality: SamoAudioSourceQuality): PlatformAudioFormat? {
    val bitDepth = quality.bitDepth ?: return null
    val channelCount = quality.channelCount ?: return null
    val sampleRate = quality.sampleRate ?: return null
    val channelMask = getChannelMask(channelCount) ?: return null
    val encoding = getPcmEncoding(bitDepth) ?: return null

    return PlatformAudioFormat.Builder()
      .setChannelMask(channelMask)
      .setEncoding(encoding)
      .setSampleRate(sampleRate)
      .build()
  }

  private fun getChannelMask(channelCount: Int): Int? {
    return when (channelCount) {
      1 -> PlatformAudioFormat.CHANNEL_OUT_MONO
      2 -> PlatformAudioFormat.CHANNEL_OUT_STEREO
      6 -> PlatformAudioFormat.CHANNEL_OUT_5POINT1
      8 -> PlatformAudioFormat.CHANNEL_OUT_7POINT1_SURROUND
      else -> null
    }
  }

  private fun getPcmEncoding(bitDepth: Int): Int? {
    return when (bitDepth) {
      8 -> PlatformAudioFormat.ENCODING_PCM_8BIT
      16 -> PlatformAudioFormat.ENCODING_PCM_16BIT
      24 -> PlatformAudioFormat.ENCODING_PCM_24BIT_PACKED
      32 -> PlatformAudioFormat.ENCODING_PCM_32BIT
      else -> null
    }
  }

  private fun outputConfigMatchesSource(
    audioTrackConfig: AudioSink.AudioTrackConfig,
    quality: SamoAudioSourceQuality
  ): Boolean {
    val sourceEncoding = quality.bitDepth?.let { getPcmEncoding(it) } ?: return false
    val sourceSampleRate = quality.sampleRate ?: return false
    val sourceChannelMask = quality.channelCount?.let { getChannelMask(it) } ?: return false

    return audioTrackConfig.sampleRate == sourceSampleRate &&
      audioTrackConfig.channelConfig == sourceChannelMask &&
      audioTrackConfig.encoding == sourceEncoding
  }

  private fun requestBitPerfectUsbMixer(
    format: PlatformAudioFormat,
    attributes: PlatformAudioAttributes,
    service: SamoPlaybackService
  ): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return false
    }

    val supported = getSupportedBitPerfectUsbMixerAttributes(format) ?: return false
    val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val wasSet = try {
      audioManager.setPreferredMixerAttributes(
        attributes,
        supported.device,
        supported.mixerAttributes
      )
    } catch (_: Exception) {
      false
    }

    if (wasSet) {
      service.preferredMixerDevice = supported.device
    }

    return wasSet
  }

  private fun getSupportedBitPerfectUsbMixerAttributes(
    format: PlatformAudioFormat
  ): SamoSupportedMixerAttributes? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return null
    }

    val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val usbDevices = outputDevices.filter {
      it.type == AudioDeviceInfo.TYPE_USB_DEVICE || it.type == AudioDeviceInfo.TYPE_USB_HEADSET
    }

    usbDevices.forEach { device ->
      val mixerAttributes = try {
        audioManager.getSupportedMixerAttributes(device)
      } catch (_: Exception) {
        emptyList()
      }

      mixerAttributes
        .firstOrNull { attributes ->
          val mixerFormat = attributes.format

          attributes.mixerBehavior == AudioMixerAttributes.MIXER_BEHAVIOR_BIT_PERFECT &&
            mixerFormat.sampleRate == format.sampleRate &&
            mixerFormat.encoding == format.encoding &&
            mixerFormat.channelMask == format.channelMask
        }?.let { return SamoSupportedMixerAttributes(device, it) }
    }

    return null
  }

  private fun clearPreferredMixerAttributes(service: SamoPlaybackService) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return
    }

    val device = service.preferredMixerDevice ?: return
    val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    try {
      audioManager.clearPreferredMixerAttributes(getPlatformAudioAttributes(), device)
    } catch (_: Exception) {
      // Mixer preferences are opportunistic; cleanup must never make app teardown unsafe.
    }
    service.preferredMixerDevice = null
  }

  private fun getAudioDeviceInfoMap(): WritableMap {
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

  private fun getAudioDeviceType(type: Int): String {
    return when (type) {
      AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "bluetooth-a2dp"
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "speaker"
      AudioDeviceInfo.TYPE_USB_DEVICE -> "usb-device"
      AudioDeviceInfo.TYPE_USB_HEADSET -> "usb-headset"
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "wired-headphones"
      AudioDeviceInfo.TYPE_WIRED_HEADSET -> "wired-headset"
      else -> "type-$type"
    }
  }

  internal data class SamoAudioSourceSnapshot(
    val artworkUrl: String?,
    val id: String,
    val source: String?,
    val subtitle: String?,
    val title: String
  )

  internal data class SamoAudioSourceQuality(
    val bitDepth: Int?,
    val channelCount: Int?,
    val container: String?,
    val losslessRequired: Boolean,
    val sampleRate: Int?,
    val serverTranscodeRequested: Boolean
  )

  internal data class SamoBitPerfectTruth(
    val activeClaim: String,
    val directBitstreamSupported: Boolean = false,
    val directOffloadGaplessSupported: Boolean = false,
    val directOffloadSupported: Boolean = false,
    val directPcmSupported: Boolean = false,
    val evidence: List<String>,
    val offloadedPlaybackActive: Boolean = false,
    val sourceBitDepth: Int? = null,
    val sourceChannelCount: Int? = null,
    val sourceSampleRate: Int? = null,
    val usbBitPerfectMixerRequested: Boolean = false,
    val usbBitPerfectMixerSupported: Boolean = false
  ) {
    companion object {
      fun unknown(): SamoBitPerfectTruth {
        return SamoBitPerfectTruth(
          activeClaim = "unknown",
          evidence = listOf("No active Android playback route is being evaluated.")
        )
      }
    }
  }

  internal data class SamoSupportedMixerAttributes(
    val device: AudioDeviceInfo,
    val mixerAttributes: AudioMixerAttributes
  )
}

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
import androidx.mediarouter.media.MediaRouteSelector
import androidx.mediarouter.media.MediaRouter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.cast.MediaInfo as CastMediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata as CastMediaMetadata
import com.google.android.gms.cast.MediaStatus
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.CastState
import com.google.android.gms.cast.framework.CastStateListener
import com.google.android.gms.cast.framework.SessionManagerListener
import com.google.android.gms.cast.framework.media.RemoteMediaClient
import com.google.android.gms.common.images.WebImage
import java.util.UUID
import java.util.concurrent.Executors

class SamoAudioModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val castExecutor = Executors.newSingleThreadExecutor()
  private var boundService: SamoPlaybackService? = null
  private var castContext: CastContext? = null
  private var castContextInitializing = false
  private val pendingCastContextActions =
    mutableListOf<Pair<(CastContext) -> Unit, (Exception) -> Unit>>()
  private var castListenersInstalled = false
  private var currentRemoteMediaClient: RemoteMediaClient? = null
  private var isBinding = false
  private val pendingServiceActions = mutableListOf<(SamoPlaybackService) -> Unit>()
  private var currentAudioTrackConfig: AudioSink.AudioTrackConfig? = null
  private var currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
  private var currentCastSource: SamoCastSource? = null
  private var currentHlsFallbackAttempted = false
  private var currentMediaItem: MediaItem? = null
  private var currentQuality: SamoAudioSourceQuality? = null
  private var currentSource: SamoAudioSourceSnapshot? = null
  private var currentSessionId: String? = null
  private var lastCastPositionMs = 0L
  private var liveReconnectAttempts = 0
  private var pendingLiveReconnect: Runnable? = null
  private var playerListenersInstalledOn: ExoPlayer? = null
  private var resumeLocalPlaybackAfterCastDisconnect = false
  private var selectedLocalOutputDeviceId: Int? = null
  private var outputRouteDiscoveryCallback: MediaRouter.Callback? = null
  private var outputRouteDiscoveryStop: Runnable? = null
  private var noisyHandlingRestore: Runnable? = null
  private var noisyHandlingSuppressedSessionId: String? = null
  private var sleepTimerStop: Runnable? = null

  private val serviceConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val service = (binder as? SamoPlaybackService.LocalBinder)?.getService() ?: return
      boundService = service
      isBinding = false
      // Notification's previous/next buttons land on the ForwardingPlayer
      // wrapping ExoPlayer; ForwardingPlayer calls back to the service,
      // which calls this handler. We then bounce up to JS so the React
      // queue can pick the right track. The previous/next physically
      // present in the shade comes from the ForwardingPlayer claiming the
      // commands are always available — see SamoForwardingPlayer.
      service.navigationHandler = { direction ->
        val event = Arguments.createMap()
        event.putInt("direction", direction)
        emit("SamoAudioNavigationRequest", event)
      }
      service.preferredOutputDevice = getSelectedLocalOutputDevice()
      service.getCurrentPlayer()?.setPreferredAudioDevice(service.preferredOutputDevice)
      val pending = pendingServiceActions.toList()
      pendingServiceActions.clear()
      pending.forEach { it(service) }
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      boundService?.navigationHandler = null
      boundService = null
      playerListenersInstalledOn = null
    }
  }

  private val castStateListener = CastStateListener { state ->
    emit("SamoAudioCastState", getCastStateMap(state))
  }

  private val castSessionListener = object : SessionManagerListener<CastSession> {
    override fun onSessionStarting(session: CastSession) {
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionStarted(session: CastSession, sessionId: String) {
      attachRemoteMediaClient(session.remoteMediaClient)
      handOffLocalPlaybackToCast()
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionStartFailed(session: CastSession, error: Int) {
      detachRemoteMediaClient()
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionEnding(session: CastSession) {
      lastCastPositionMs = session.remoteMediaClient?.approximateStreamPosition ?: lastCastPositionMs
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionEnded(session: CastSession, error: Int) {
      val shouldResumeLocal = resumeLocalPlaybackAfterCastDisconnect
      resumeLocalPlaybackAfterCastDisconnect = false
      restoreLocalPlaybackPosition(shouldResumeLocal)
      detachRemoteMediaClient()
      emit("SamoAudioCastState", getCastStateMap())
      emitState(if (shouldResumeLocal) "playing" else "paused")
    }

    override fun onSessionResuming(session: CastSession, sessionId: String) {
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
      attachRemoteMediaClient(session.remoteMediaClient)
      emit("SamoAudioCastState", getCastStateMap())
      emitCastPlaybackState()
    }

    override fun onSessionResumeFailed(session: CastSession, error: Int) {
      detachRemoteMediaClient()
      emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionSuspended(session: CastSession, reason: Int) {
      resumeLocalPlaybackAfterCastDisconnect = false
      lastCastPositionMs = session.remoteMediaClient?.approximateStreamPosition ?: lastCastPositionMs
      detachRemoteMediaClient()
      emit("SamoAudioCastState", getCastStateMap())
      emitState("paused")
    }
  }

  private val remoteMediaClientCallback = object : RemoteMediaClient.Callback() {
    override fun onStatusUpdated() {
      emitCastPlaybackState()
    }

    override fun onMetadataUpdated() {
      emitCastPlaybackState()
    }
  }

  private val castProgressListener = RemoteMediaClient.ProgressListener { progressMs, _ ->
    lastCastPositionMs = progressMs
    emitCastPlaybackState()
  }

  override fun getName(): String = "SamoAudio"

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  @ReactMethod
  fun play(source: ReadableMap, promise: Promise) {
    mainHandler.post {
      if (getActiveRemoteMediaClient() != null) {
        try {
          playOnCast(source, promise)
        } catch (error: Exception) {
          promise.reject("SAMO_CAST_ERROR", error.message, error)
        }
        return@post
      }

      playLocally(source, promise)
    }
  }

  private fun playLocally(source: ReadableMap, promise: Promise) {
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
      service.preferredOutputDevice = getSelectedLocalOutputDevice()
      resolvedPlayer.setPreferredAudioDevice(service.preferredOutputDevice)
      installListenersIfNeeded(resolvedPlayer)
      if (shouldSuppressNoisyPauseForTrackLoad(service, quality)) {
        suppressNoisyHandlingForTrackStart(resolvedPlayer, sessionId)
      } else {
        restoreNoisyHandlingNow(resolvedPlayer)
      }

      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      clearPreferredMixerAttributes(service)
      cancelPendingLiveReconnect()
      currentAudioTrackConfig = null
      currentHlsFallbackAttempted = mimeType == MimeTypes.APPLICATION_M3U8
      currentMediaItem = mediaItem
      currentQuality = quality
      currentCastSource = getCastSource(source, url, mimeType, title, subtitle, artworkUrl, mediaId)
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
    mainHandler.post {
      val remoteMediaClient = getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        remoteMediaClient.pause()
        emitCastPlaybackState("paused")
        promise.resolve(getCastStatusMap("paused"))
        return@post
      }

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
        restoreNoisyHandlingNow(resolvedPlayer)
        resolvedPlayer.pause()
        emitState("paused")
        promise.resolve(getStatusMap(resolvedPlayer, "paused"))
      }
    }
  }

  @ReactMethod
  fun resume(promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        remoteMediaClient.play()
        emitCastPlaybackState("playing")
        promise.resolve(getCastStatusMap("playing"))
        return@post
      }

      withService(promise) { service ->
        val resolvedPlayer = service.getCurrentPlayer()
        if (resolvedPlayer == null) {
          promise.resolve(getIdleStatusMap())
          return@withService
        }
        installListenersIfNeeded(resolvedPlayer)
        restoreNoisyHandlingNow(resolvedPlayer)
        resolvedPlayer.play()
        emitState("playing")
        promise.resolve(getStatusMap(resolvedPlayer, "playing"))
      }
    }
  }

  @ReactMethod
  fun seekTo(positionMs: Double, promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        val nextPositionMs = positionMs.toLong().coerceAtLeast(0L)
        remoteMediaClient.seek(nextPositionMs)
        lastCastPositionMs = nextPositionMs
        emitCastPlaybackState()
        promise.resolve(getCastStatusMap())
        return@post
      }

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
  }

  @ReactMethod
  fun setSleepTimer(seconds: Double, promise: Promise) {
    mainHandler.post {
      cancelNativeSleepTimer()
      val delayMs = (seconds * 1000.0).toLong().coerceAtLeast(0L)
      if (delayMs <= 0L) {
        promise.resolve(getLocalStatusMap())
        return@post
      }

      val runnable = Runnable {
        sleepTimerStop = null
        val remoteMediaClient = getActiveRemoteMediaClient()
        if (remoteMediaClient != null) {
          remoteMediaClient.pause()
          emitCastPlaybackState("paused")
          return@Runnable
        }

        val service = boundService ?: return@Runnable
        val resolvedPlayer = service.getCurrentPlayer() ?: return@Runnable
        resolvedPlayer.pause()
        emitState("paused")
      }
      sleepTimerStop = runnable
      mainHandler.postDelayed(runnable, delayMs)
      promise.resolve(getLocalStatusMap())
    }
  }

  @ReactMethod
  fun cancelSleepTimer(promise: Promise) {
    mainHandler.post {
      cancelNativeSleepTimer()
      promise.resolve(getLocalStatusMap())
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    mainHandler.post {
      cancelNativeSleepTimer()
      val remoteMediaClient = getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        remoteMediaClient.stop()
        currentCastSource = null
        currentSource = null
        currentSessionId = null
        lastCastPositionMs = 0L
        emitState("idle")
        promise.resolve(getIdleStatusMap())
        return@post
      }

      val service = boundService
      if (service == null) {
        promise.resolve(getIdleStatusMap())
        return@post
      }
      try {
        service.resetPlayerState()
        restoreNoisyHandlingNow(service.getCurrentPlayer())
        clearPreferredMixerAttributes(service)
        cancelPendingLiveReconnect()
        currentAudioTrackConfig = null
        currentCastSource = null
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
      val remoteMediaClient = getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        promise.resolve(getCastStatusMap())
        return@post
      }

      ensureServiceBound(
        startService = false,
        onReady = { service ->
          try {
            val resolvedPlayer = service.getCurrentPlayer()
            promise.resolve(
              if (resolvedPlayer == null) getIdleStatusMap() else getStatusMap(resolvedPlayer)
            )
          } catch (error: Exception) {
            promise.reject("SAMO_AUDIO_ERROR", error.message, error)
          }
        },
        onError = {
          promise.resolve(getIdleStatusMap())
        }
      )
    }
  }

  @ReactMethod
  fun updateNowPlayingMetadata(metadata: ReadableMap, promise: Promise) {
    mainHandler.post {
      val metadataSessionId = getOptionalString(metadata, "sessionId")
      val activeSessionId = currentSessionId
      if (
        !metadataSessionId.isNullOrBlank() &&
        !activeSessionId.isNullOrBlank() &&
        metadataSessionId != activeSessionId
      ) {
        promise.resolve(getLocalStatusMap())
        return@post
      }

      val previousSource = currentSource
      val title = getOptionalString(metadata, "title") ?: previousSource?.title ?: "Samo"
      val subtitle = getOptionalString(metadata, "subtitle") ?: previousSource?.subtitle
      val artworkUrl = getOptionalString(metadata, "artworkUrl") ?: previousSource?.artworkUrl
      val mediaId =
        previousSource?.id ?: getOptionalString(metadata, "id") ?: activeSessionId ?: metadataSessionId ?: "samo"
      val sourceLabel = previousSource?.source ?: getOptionalString(metadata, "source")

      currentSource = SamoAudioSourceSnapshot(
        artworkUrl = artworkUrl,
        id = mediaId,
        source = sourceLabel,
        subtitle = subtitle,
        title = title
      )

      ensureServiceBound(
        startService = false,
        onReady = { service ->
          try {
            val resolvedPlayer = service.getCurrentPlayer()
            if (resolvedPlayer == null) {
              promise.resolve(getIdleStatusMap())
              return@ensureServiceBound
            }

            val currentIndex = resolvedPlayer.currentMediaItemIndex
            val currentItem = resolvedPlayer.currentMediaItem
            if (
              currentItem != null &&
              currentIndex != C.INDEX_UNSET &&
              currentIndex >= 0 &&
              currentIndex < resolvedPlayer.mediaItemCount
            ) {
              val metadataBuilder = MediaMetadata.Builder()
                .setTitle(title)
                .setArtist(subtitle)

              if (!artworkUrl.isNullOrBlank()) {
                metadataBuilder.setArtworkUri(Uri.parse(artworkUrl))
              }

              val updatedItem = currentItem
                .buildUpon()
                .setMediaMetadata(metadataBuilder.build())
                .build()
              currentMediaItem = updatedItem
              resolvedPlayer.replaceMediaItem(currentIndex, updatedItem)
            }

            emitState()
            promise.resolve(getStatusMap(resolvedPlayer))
          } catch (error: Exception) {
            promise.reject("SAMO_AUDIO_ERROR", error.message, error)
          }
        },
        onError = {
          promise.resolve(getIdleStatusMap())
        }
      )
    }
  }

  @ReactMethod
  fun getAudioDeviceInfo(promise: Promise) {
    promise.resolve(getAudioDeviceInfoMap())
  }

  @ReactMethod
  fun getOutputRoutes(promise: Promise) {
    withCastContext(
      onReady = { context ->
        ensureOutputRouteDiscovery(context)
        promise.resolve(getOutputRoutesMap(context))
      },
      onError = { promise.resolve(getOutputRoutesMap(null)) }
    )
  }

  @ReactMethod
  fun selectOutputRoute(route: ReadableMap, promise: Promise) {
    mainHandler.post {
      when (getOptionalString(route, "kind")) {
        "cast" -> {
          val routeId = getOptionalString(route, "routeId")
          if (routeId.isNullOrBlank()) {
            promise.reject("SAMO_OUTPUT_ERROR", "Missing Cast route id")
            return@post
          }
          selectCastOutputRoute(routeId, promise)
        }
        "local" -> {
          val deviceId = getOptionalInt(route, "deviceId")
          selectLocalOutputRoute(deviceId, promise)
        }
        else -> promise.reject("SAMO_OUTPUT_ERROR", "Unknown output route")
      }
    }
  }

  private fun getLocalStatusMap(): WritableMap {
    val service = boundService ?: return getIdleStatusMap()
    val resolvedPlayer = service.getCurrentPlayer()
    return if (resolvedPlayer == null) getIdleStatusMap() else getStatusMap(resolvedPlayer)
  }

  private fun cancelNativeSleepTimer() {
    val timer = sleepTimerStop ?: return
    mainHandler.removeCallbacks(timer)
    sleepTimerStop = null
  }

  @ReactMethod
  fun getCastState(promise: Promise) {
    withCastContext(
      onReady = { context -> promise.resolve(getCastStateMap(context.getCastState())) },
      onError = { promise.resolve(getUnavailableCastStateMap()) }
    )
  }

  override fun invalidate() {
    mainHandler.post {
      cancelNativeSleepTimer()
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
      castContext?.let { context ->
        if (castListenersInstalled) {
          context.removeCastStateListener(castStateListener)
          context.sessionManager.removeSessionManagerListener(
            castSessionListener,
            CastSession::class.java
          )
        }
      }
      stopOutputRouteDiscovery()
      detachRemoteMediaClient()
      cancelPendingLiveReconnect()
      restoreNoisyHandlingNow(boundService?.getCurrentPlayer())
      boundService = null
      castContext = null
      castContextInitializing = false
      castListenersInstalled = false
      pendingCastContextActions.clear()
      playerListenersInstalledOn = null
      currentAudioTrackConfig = null
      currentCastSource = null
      currentHlsFallbackAttempted = false
      currentMediaItem = null
      currentQuality = null
      currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
      currentSource = null
      currentSessionId = null
    }
  }

  private fun withCastContext(
    onReady: (CastContext) -> Unit,
    onError: (Exception) -> Unit
  ) {
    mainHandler.post {
      val existing = castContext
      if (existing != null) {
        try {
          onReady(existing)
        } catch (error: Exception) {
          onError(error)
        }
        return@post
      }

      pendingCastContextActions.add(Pair(onReady, onError))

      if (castContextInitializing) {
        return@post
      }
      castContextInitializing = true

      try {
        CastContext
          .getSharedInstance(reactContext.applicationContext, castExecutor)
          .addOnSuccessListener { context ->
            mainHandler.post {
              castContext = context
              castContextInitializing = false
              installCastListenersIfNeeded(context)
              attachRemoteMediaClient(context.sessionManager.currentCastSession?.remoteMediaClient)

              val pending = pendingCastContextActions.toList()
              pendingCastContextActions.clear()
              pending.forEach { (ready, errorHandler) ->
                try {
                  ready(context)
                } catch (error: Exception) {
                  errorHandler(error)
                }
              }
            }
          }
          .addOnFailureListener { error ->
            mainHandler.post {
              castContextInitializing = false
              val pending = pendingCastContextActions.toList()
              pendingCastContextActions.clear()
              pending.forEach { (_, errorHandler) -> errorHandler(error) }
            }
          }
      } catch (error: Exception) {
        castContextInitializing = false
        val pending = pendingCastContextActions.toList()
        pendingCastContextActions.clear()
        pending.forEach { (_, errorHandler) -> errorHandler(error) }
      }
    }
  }

  private fun installCastListenersIfNeeded(context: CastContext) {
    if (castListenersInstalled) {
      return
    }

    context.addCastStateListener(castStateListener)
    context.sessionManager.addSessionManagerListener(castSessionListener, CastSession::class.java)
    castListenersInstalled = true
  }

  private fun attachRemoteMediaClient(remoteMediaClient: RemoteMediaClient?) {
    if (currentRemoteMediaClient === remoteMediaClient) {
      return
    }

    detachRemoteMediaClient()
    currentRemoteMediaClient = remoteMediaClient
    remoteMediaClient?.registerCallback(remoteMediaClientCallback)
    remoteMediaClient?.addProgressListener(castProgressListener, 1000L)
  }

  private fun detachRemoteMediaClient() {
    currentRemoteMediaClient?.removeProgressListener(castProgressListener)
    currentRemoteMediaClient?.unregisterCallback(remoteMediaClientCallback)
    currentRemoteMediaClient = null
  }

  private fun getActiveRemoteMediaClient(): RemoteMediaClient? {
    val session = castContext?.sessionManager?.currentCastSession
    val remoteMediaClient = session?.remoteMediaClient ?: currentRemoteMediaClient

    return if (session?.isConnected == true && remoteMediaClient != null) {
      attachRemoteMediaClient(remoteMediaClient)
      remoteMediaClient
    } else {
      null
    }
  }

  private fun selectCastOutputRoute(routeId: String, promise: Promise) {
    withCastContext(
      onReady = { context ->
        try {
          ensureOutputRouteDiscovery(context)
          val router = MediaRouter.getInstance(reactContext.applicationContext)
          val route = router.getRoutes().firstOrNull { it.getId() == routeId }

          if (route == null || !route.isEnabled) {
            promise.reject("SAMO_OUTPUT_ERROR", "Cast route is no longer available")
            return@withCastContext
          }

          router.selectRoute(route)
          promise.resolve(getOutputRoutesMap(context))
        } catch (error: Exception) {
          promise.reject("SAMO_OUTPUT_ERROR", error.message, error)
        }
      },
      onError = { error -> promise.reject("SAMO_OUTPUT_ERROR", error.message, error) }
    )
  }

  private fun selectLocalOutputRoute(deviceId: Int?, promise: Promise) {
    val device = deviceId?.let { findAudioOutputDevice(it) }

    if (deviceId != null && device == null) {
      promise.reject("SAMO_OUTPUT_ERROR", "Audio output is no longer available")
      return
    }

    selectedLocalOutputDeviceId = deviceId
    boundService?.let { service ->
      service.preferredOutputDevice = device
      service.getCurrentPlayer()?.setPreferredAudioDevice(device)
    }

    val session = castContext?.sessionManager?.currentCastSession
    val remoteMediaClient = getActiveRemoteMediaClient()
    if (session?.isConnected == true) {
      resumeLocalPlaybackAfterCastDisconnect =
        remoteMediaClient?.playerState == MediaStatus.PLAYER_STATE_PLAYING ||
          remoteMediaClient?.playerState == MediaStatus.PLAYER_STATE_BUFFERING
      lastCastPositionMs = remoteMediaClient?.approximateStreamPosition ?: lastCastPositionMs
      castContext?.sessionManager?.endCurrentSession(true)
      promise.resolve(getOutputRoutesMap(castContext))
      return
    }

    emitState()
    promise.resolve(getOutputRoutesMap(castContext))
  }

  private fun getSelectedLocalOutputDevice(): AudioDeviceInfo? {
    val deviceId = selectedLocalOutputDeviceId ?: return null
    return findAudioOutputDevice(deviceId)
  }

  private fun findAudioOutputDevice(deviceId: Int): AudioDeviceInfo? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return null
    }
    val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    return audioManager
      .getDevices(AudioManager.GET_DEVICES_OUTPUTS)
      .firstOrNull { it.id == deviceId }
  }

  private fun playOnCast(source: ReadableMap, promise: Promise) {
    val url = getOptionalString(source, "url")
    if (url == null) {
      promise.reject("SAMO_CAST_ERROR", "Missing audio URL")
      return
    }

    val sessionId = getOptionalString(source, "sessionId") ?: UUID.randomUUID().toString()
    val title = getOptionalString(source, "title") ?: "Samo"
    val subtitle = getOptionalString(source, "subtitle")
    val artworkUrl = getOptionalString(source, "artworkUrl")
    val mediaId = getOptionalString(source, "id") ?: sessionId
    val mimeType = getMediaItemMimeType(url, getOptionalString(source, "mimeType"))
    val sourceLabel = getOptionalString(source, "source")
    val castSource = getCastSource(source, url, mimeType, title, subtitle, artworkUrl, mediaId)
    val startPositionMs = getInitialPositionMs(source)

    currentSource = SamoAudioSourceSnapshot(
      artworkUrl = artworkUrl,
      id = mediaId,
      source = sourceLabel,
      subtitle = subtitle,
      title = title
    )
    currentSessionId = sessionId
    currentCastSource = castSource
    cancelPendingLiveReconnect()
    lastCastPositionMs = startPositionMs

    // Always bind the playback service while casting so the local mirror is
    // ready to take over on disconnect. Without this, a user who connects
    // Cast before any local play, then disconnects mid-track, lands in a
    // limbo state: native has no local player to restore, emits a bare idle
    // map without a sessionId, and JS keeps the previous status forever.
    //
    // Extract everything we need from the ReadableMap up front — RN may
    // recycle the bridge object once playOnCast returns, so the async
    // onReady closure has to work from snapshots, not the raw map.
    val mirrorHeaders = getHttpHeaders(source)
    val mirrorQuality = getSourceQuality(source)
    ensureServiceBound(
      onReady = {
        // Skip if the cast target changed (or ended) while we were waiting
        // for the service to bind. Without these guards, a late-arriving
        // prep would either set up the wrong media (cast moved on) or
        // trigger state-change listeners after cast disconnected (cast is
        // no longer active, so the listener's isCastActive() suppression
        // doesn't fire and the mirror's prepare → buffering noise leaks
        // out as the user-facing playback state).
        if (currentCastSource?.id != mediaId) return@ensureServiceBound
        if (!isCastActive()) return@ensureServiceBound
        prepareLocalMirrorForCast(
          artworkUrl = artworkUrl,
          mediaId = mediaId,
          mimeType = mimeType,
          positionMs = startPositionMs,
          requestHeaders = mirrorHeaders,
          quality = mirrorQuality,
          subtitle = subtitle,
          title = title,
          url = url
        )
      },
      onError = { error ->
        Log.w(
          "SamoAudio",
          "Could not prepare local mirror for cast — disconnect will fall back to idle: ${error.message}"
        )
      }
    )

    loadCastSource(castSource, startPositionMs, true)
    emitState("buffering")
    promise.resolve(getCastStatusMap("buffering"))
  }

  private fun prepareLocalMirrorForCast(
    artworkUrl: String?,
    mediaId: String,
    mimeType: String?,
    positionMs: Long,
    requestHeaders: Map<String, String>,
    quality: SamoAudioSourceQuality,
    subtitle: String?,
    title: String,
    url: String
  ) {
    val service = boundService ?: return
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
    service.preferredOutputDevice = getSelectedLocalOutputDevice()
    resolvedPlayer.setPreferredAudioDevice(service.preferredOutputDevice)

    installListenersIfNeeded(resolvedPlayer)
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

    resolvedPlayer.stop()
    resolvedPlayer.clearMediaItems()
    resolvedPlayer.setMediaItem(mediaItem)
    resolvedPlayer.prepare()
    if (positionMs > 0) {
      resolvedPlayer.seekTo(positionMs)
    }
    resolvedPlayer.pause()
  }

  private fun handOffLocalPlaybackToCast() {
    val castSource = currentCastSource ?: return
    val resolvedPlayer = boundService?.getCurrentPlayer()
    val startPositionMs = resolvedPlayer?.currentPosition ?: lastCastPositionMs
    val autoplay = resolvedPlayer?.isPlaying ?: true

    resolvedPlayer?.pause()
    try {
      loadCastSource(castSource, startPositionMs, autoplay)
      emitState("buffering")
    } catch (error: Exception) {
      val event = getCastStatusMap("error")
      event.putString("message", error.message ?: "Chromecast playback failed")
      emit("SamoAudioPlaybackState", event)
    }
  }

  private fun ensureOutputRouteDiscovery(context: CastContext) {
    val router = MediaRouter.getInstance(reactContext.applicationContext)
    outputRouteDiscoveryCallback?.let { router.removeCallback(it) }

    val callback = object : MediaRouter.Callback() {
      override fun onRouteAdded(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emit("SamoAudioOutputRoutes", getOutputRoutesMap(context))
      }

      override fun onRouteChanged(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emit("SamoAudioOutputRoutes", getOutputRoutesMap(context))
      }

      override fun onRouteRemoved(router: MediaRouter, route: MediaRouter.RouteInfo) {
        emit("SamoAudioOutputRoutes", getOutputRoutesMap(context))
      }

      override fun onRouteSelected(router: MediaRouter, route: MediaRouter.RouteInfo, reason: Int) {
        emit("SamoAudioOutputRoutes", getOutputRoutesMap(context))
      }

      override fun onRouteUnselected(router: MediaRouter, route: MediaRouter.RouteInfo, reason: Int) {
        emit("SamoAudioOutputRoutes", getOutputRoutesMap(context))
      }
    }

    outputRouteDiscoveryCallback = callback
    router.addCallback(
      context.getMergedSelector() ?: MediaRouteSelector.EMPTY,
      callback,
      MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY or MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN
    )

    outputRouteDiscoveryStop?.let { mainHandler.removeCallbacks(it) }
    outputRouteDiscoveryStop = Runnable { stopOutputRouteDiscovery() }
    mainHandler.postDelayed(outputRouteDiscoveryStop!!, 12_000)
  }

  private fun stopOutputRouteDiscovery() {
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

  private fun restoreLocalPlaybackPosition(autoplay: Boolean = false) {
    val resolvedPlayer = boundService?.getCurrentPlayer() ?: return
    resolvedPlayer.setPreferredAudioDevice(boundService?.preferredOutputDevice)
    if (currentCastSource?.isLive != true && lastCastPositionMs > 0) {
      try {
        resolvedPlayer.seekTo(lastCastPositionMs)
      } catch (_: Exception) {
        // Best effort; route teardown should not break the Cast session cleanup path.
      }
    }
    if (autoplay) {
      resolvedPlayer.play()
    } else {
      resolvedPlayer.pause()
    }
  }

  private fun loadCastSource(source: SamoCastSource, positionMs: Long, autoplay: Boolean) {
    val remoteMediaClient = getActiveRemoteMediaClient()
      ?: throw IllegalStateException("No active Chromecast session")
    val contentUrl = source.url

    if (!isNetworkUrl(contentUrl)) {
      throw IllegalArgumentException("Chromecast can only play network URLs.")
    }
    if (source.hasHttpHeaders) {
      throw IllegalArgumentException(
        "This source needs private request headers, which the default Chromecast receiver cannot send."
      )
    }

    val metadata = CastMediaMetadata(CastMediaMetadata.MEDIA_TYPE_MUSIC_TRACK).apply {
      putString(CastMediaMetadata.KEY_TITLE, source.title)
      source.subtitle?.let { putString(CastMediaMetadata.KEY_ARTIST, it) }
      source.album?.let { putString(CastMediaMetadata.KEY_ALBUM_TITLE, it) }
      source.artworkUrl?.let { artwork ->
        if (artwork.startsWith("http://") || artwork.startsWith("https://")) {
          addImage(WebImage(Uri.parse(artwork)))
        }
      }
    }
    val streamType = if (source.isLive) {
      CastMediaInfo.STREAM_TYPE_LIVE
    } else {
      CastMediaInfo.STREAM_TYPE_BUFFERED
    }
    val mediaInfoBuilder = CastMediaInfo.Builder(contentUrl)
      .setContentUrl(contentUrl)
      .setContentType(getCastContentType(contentUrl, source.mimeType))
      .setMetadata(metadata)
      .setStreamType(streamType)

    if (!source.isLive && source.durationMs != null && source.durationMs > 0) {
      mediaInfoBuilder.setStreamDuration(source.durationMs)
    }

    val loadRequest = MediaLoadRequestData.Builder()
      .setAutoplay(autoplay)
      .setCurrentTime(positionMs.coerceAtLeast(0L))
      .setMediaInfo(mediaInfoBuilder.build())
      .build()

    remoteMediaClient.load(loadRequest).setResultCallback { result ->
      mainHandler.post {
        val activeCastSource = currentCastSource
        if (activeCastSource == null ||
          activeCastSource.id != source.id ||
          activeCastSource.url != source.url
        ) {
          return@post
        }

        if (!result.status.isSuccess) {
          val event = getCastStatusMap("error")
          val message = result.status.statusMessage
            ?: "Chromecast load failed (${result.status.statusCode})"

          event.putString("message", message)
          emit("SamoAudioPlaybackState", event)
          return@post
        }

        if (autoplay) {
          try {
            remoteMediaClient.play()
            emitCastPlaybackState("buffering")
          } catch (error: Exception) {
            val event = getCastStatusMap("error")
            event.putString("message", error.message ?: "Chromecast playback failed")
            emit("SamoAudioPlaybackState", event)
          }
        } else {
          emitCastPlaybackState()
        }
      }
    }
  }

  private fun emitCastPlaybackState(status: String? = null) {
    if (getActiveRemoteMediaClient() == null || currentCastSource == null) {
      return
    }

    emit("SamoAudioPlaybackState", getCastStatusMap(status))
  }

  private fun getCastStatusMap(status: String? = null): WritableMap {
    val remoteMediaClient = getActiveRemoteMediaClient()
    val map = Arguments.createMap()
    val source = currentSource
    val duration = remoteMediaClient?.streamDuration ?: currentCastSource?.durationMs ?: -1L
    val position = remoteMediaClient?.approximateStreamPosition ?: lastCastPositionMs
    val resolvedStatus = status ?: getCurrentCastPlaybackStatus(remoteMediaClient)
    val castMap = Arguments.createMap()
    val session = castContext?.sessionManager?.currentCastSession

    map.putString("sessionId", currentSessionId)
    map.putString("status", resolvedStatus)
    map.putDouble("positionMs", position.toDouble())
    map.putDouble("durationMs", if (duration > 0) duration.toDouble() else -1.0)
    map.putBoolean("isPlaying", resolvedStatus == "playing" || resolvedStatus == "buffering")
    map.putMap("bitPerfect", getBitPerfectTruthMap(getCastBitPerfectTruth()))

    // Attach a default error message when the cast receiver bailed and the
    // caller didn't override it — JS otherwise has nothing to display.
    if (resolvedStatus == "error") {
      map.putString("message", "The cast device couldn't play this source.")
    }

    castMap.putBoolean("isConnected", session?.isConnected == true)
    castMap.putString("deviceName", session?.castDevice?.friendlyName)
    map.putMap("cast", castMap)

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

  private fun getCurrentCastPlaybackStatus(remoteMediaClient: RemoteMediaClient?): String {
    if (remoteMediaClient == null || !remoteMediaClient.hasMediaSession()) {
      return "idle"
    }

    return when (remoteMediaClient.playerState) {
      MediaStatus.PLAYER_STATE_BUFFERING -> "buffering"
      MediaStatus.PLAYER_STATE_PLAYING -> "playing"
      MediaStatus.PLAYER_STATE_PAUSED -> "paused"
      MediaStatus.PLAYER_STATE_IDLE -> when (remoteMediaClient.idleReason) {
        MediaStatus.IDLE_REASON_FINISHED -> "ended"
        // The cast receiver couldn't play the media — usually means the URL
        // returned 401 (ABS HLS playlists reference segments with relative
        // paths, dropping the ?token=… query string per RFC 3986) or the
        // format isn't supported. Surfacing as "error" lets JS show the
        // user something actionable instead of leaving the UI stuck on
        // "buffering" forever.
        MediaStatus.IDLE_REASON_ERROR -> "error"
        else -> "idle"
      }
      else -> "idle"
    }
  }

  private fun getCastSource(
    source: ReadableMap,
    localUrl: String,
    localMimeType: String?,
    title: String,
    subtitle: String?,
    artworkUrl: String?,
    mediaId: String
  ): SamoCastSource {
    val requestedCastUrl = getOptionalString(source, "castUrl")
    val castUrl = when {
      requestedCastUrl != null && isNetworkUrl(requestedCastUrl) -> requestedCastUrl
      isNetworkUrl(localUrl) -> localUrl
      else -> requestedCastUrl ?: localUrl
    }
    val usesRequestedCastUrl = requestedCastUrl != null && castUrl == requestedCastUrl
    val castMimeType = getMediaItemMimeType(
      castUrl,
      getOptionalString(source, "castMimeType") ?: localMimeType
    )
    val sourceLabel = getOptionalString(source, "source")
    val castHeaders = getHttpHeaders(source, "castHttpHeaders")
    val localHeaders = getHttpHeaders(source)

    return SamoCastSource(
      album = getOptionalString(source, "album"),
      artworkUrl = getOptionalString(source, "castArtworkUrl") ?: artworkUrl,
      durationMs = getOptionalDouble(source, "durationSeconds")?.times(1000)?.toLong(),
      hasHttpHeaders = castHeaders.isNotEmpty() ||
        (!usesRequestedCastUrl && localHeaders.isNotEmpty()),
      id = mediaId,
      isLive = getOptionalBoolean(source, "castIsLive")
        ?: getOptionalBoolean(source, "isLive")
        ?: sourceLabel == "radio",
      mimeType = castMimeType,
      subtitle = getOptionalString(source, "castSubtitle") ?: subtitle,
      title = getOptionalString(source, "castTitle") ?: title,
      url = castUrl
    )
  }

  private fun isNetworkUrl(url: String): Boolean {
    return url.startsWith("http://", ignoreCase = true) ||
      url.startsWith("https://", ignoreCase = true)
  }

  private fun getInitialPositionMs(source: ReadableMap): Long {
    return getOptionalDouble(source, "initialPositionSeconds")?.times(1000)?.toLong() ?: 0L
  }

  private fun getCastContentType(url: String, mimeType: String?): String {
    val normalizedMimeType = mimeType?.lowercase()
    val normalizedUrl = url.lowercase()

    return when {
      normalizedMimeType?.contains("mpegurl") == true ||
        normalizedUrl.contains(".m3u8") -> "application/x-mpegURL"
      !normalizedMimeType.isNullOrBlank() -> mimeType
      normalizedUrl.endsWith(".flac") -> "audio/flac"
      normalizedUrl.endsWith(".aac") -> "audio/aac"
      normalizedUrl.endsWith(".m4a") -> "audio/mp4"
      normalizedUrl.endsWith(".ogg") || normalizedUrl.endsWith(".oga") -> "audio/ogg"
      normalizedUrl.endsWith(".opus") -> "audio/ogg; codecs=opus"
      normalizedUrl.endsWith(".wav") -> "audio/wav"
      else -> "audio/mpeg"
    }
  }

  private fun getCastBitPerfectTruth(): SamoBitPerfectTruth {
    return SamoBitPerfectTruth(
      activeClaim = "unknown",
      evidence = listOf("Playback is routed to Chromecast; Android AudioTrack output is not active.")
    )
  }

  private fun getCastStateMap(state: Int? = null): WritableMap {
    val context = castContext
    val session = context?.sessionManager?.currentCastSession
    val resolvedState = state ?: context?.getCastState() ?: CastState.NO_DEVICES_AVAILABLE
    val map = Arguments.createMap()

    map.putString("status", getCastStateLabel(resolvedState))
    map.putBoolean("isConnected", session?.isConnected == true)
    map.putString("deviceName", session?.castDevice?.friendlyName)

    return map
  }

  private fun getUnavailableCastStateMap(): WritableMap {
    val map = Arguments.createMap()

    map.putString("status", "unavailable")
    map.putBoolean("isConnected", false)
    return map
  }

  private fun getCastStateLabel(state: Int): String {
    return when (state) {
      CastState.CONNECTED -> "connected"
      CastState.CONNECTING -> "connecting"
      CastState.NOT_CONNECTED -> "not-connected"
      CastState.NO_DEVICES_AVAILABLE -> "no-devices"
      else -> "unavailable"
    }
  }

  private fun withService(promise: Promise, block: (SamoPlaybackService) -> Unit) {
    ensureServiceBound(
      onReady = block,
      onError = { error -> promise.reject("SAMO_AUDIO_ERROR", error.message, error) }
    )
  }

  /**
   * Same plumbing as withService but without a Promise — for callers that
   * want to opportunistically warm the local playback service (e.g. preparing
   * a mirror player during Chromecast playback so the disconnect path has
   * something to fall back to). onError is invoked if binding itself fails;
   * the typical caller logs and moves on.
   */
  private fun ensureServiceBound(
    onReady: (SamoPlaybackService) -> Unit,
    onError: ((Throwable) -> Unit)? = null,
    startService: Boolean = true
  ) {
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
          onReady(existing)
        } catch (error: Exception) {
          onError?.invoke(error)
        }
        return@post
      }

      pendingServiceActions.add { service ->
        try {
          onReady(service)
        } catch (error: Exception) {
          onError?.invoke(error)
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
        if (startService) {
          ContextCompat.startForegroundService(reactContext, intent)
        }
        val bound = reactContext.bindService(
          intent,
          serviceConnection,
          Context.BIND_AUTO_CREATE
        )
        if (!bound) {
          isBinding = false
          pendingServiceActions.clear()
          onError?.invoke(IllegalStateException("Could not bind audio playback service"))
        }
      } catch (error: Exception) {
        isBinding = false
        pendingServiceActions.clear()
        onError?.invoke(error)
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
        if (isPlaying) {
          // Stream is alive — give the next failure a fresh retry budget.
          liveReconnectAttempts = 0
          scheduleNoisyHandlingRestore(player, currentSessionId, 750L)
        }
        if (isCastActive()) return
        emitState(if (isPlaying) "playing" else getCurrentStatus(player))
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        if (isCastActive()) return
        emitState(getCurrentStatus(player))
      }

      override fun onPlayerError(error: PlaybackException) {
        if (isCastActive()) {
          // The local mirror prepared during cast can hit its own errors
          // (e.g., an ABS source that needs HLS for the device but not for
          // the cast receiver). Cast is the active route — don't bubble the
          // mirror's failure to the user; the cast leg has its own errors.
          Log.w("SamoAudio", "Local mirror error suppressed while casting: ${error.errorCodeName}")
          return
        }

        if (retryCurrentSourceAsHls(player, error)) {
          return
        }

        if (scheduleAutoReconnect(player, error)) {
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
        if (isCastActive()) return
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
        if (isCastActive()) return
        emitState()
      }
    })
  }

  /**
   * True while a Chromecast session owns the user-facing playback state.
   * Listeners attached to the local mirror player should bail when this is
   * true so the mirror's own state transitions (prepare → buffering → ready
   * → paused) don't get reported back to JS as if they were the live
   * playback. The cast leg has its own status path via emitCastPlaybackState.
   */
  private fun isCastActive(): Boolean =
    getActiveRemoteMediaClient() != null && currentCastSource != null

  private fun emitState(status: String? = null) {
    if (getActiveRemoteMediaClient() != null && currentCastSource != null) {
      emit("SamoAudioPlaybackState", getCastStatusMap(status))
      return
    }

    val resolvedPlayer = boundService?.getCurrentPlayer()
    if (resolvedPlayer != null) {
      emit("SamoAudioPlaybackState", getStatusMap(resolvedPlayer, status))
      return
    }

    // No local player AND no cast — but if we have a sessionId we're in
    // the limbo right after a cast session ended without a prepared local
    // mirror (service binding failed, or this build pre-dates mirror prep).
    // Emit a detached state map that carries the sessionId and a definite
    // status so JS doesn't fall into its idle-coercion branch (which keeps
    // the previous status, leaving the UI showing "playing" forever).
    if (currentSessionId != null) {
      emit("SamoAudioPlaybackState", getDetachedStatusMap(status ?: "paused"))
      return
    }

    emit("SamoAudioPlaybackState", getIdleStatusMap())
  }

  private fun getDetachedStatusMap(status: String): WritableMap {
    val map = Arguments.createMap()
    val source = currentSource
    val duration = currentCastSource?.durationMs ?: -1L

    map.putString("sessionId", currentSessionId)
    map.putString("status", status)
    map.putDouble("positionMs", lastCastPositionMs.toDouble())
    map.putDouble("durationMs", if (duration > 0) duration.toDouble() else -1.0)
    map.putBoolean("isPlaying", false)
    map.putMap("bitPerfect", getBitPerfectTruthMap(SamoBitPerfectTruth.unknown()))

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

  /**
   * Errors that frequently signal "this is actually an HLS stream the
   * default sniffer didn't recognize." Most internet-radio aggregators
   * (and a chunk of ABS-transcoded audiobook output) serve HLS playlists
   * with mislabeled Content-Type headers, or use just enough non-standard
   * container framing to fail the progressive parser. Retrying once as
   * HLS recovers from all of these cheaply.
   */
  private val HLS_FALLBACK_ERROR_CODES = setOf(
    PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
    PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
    PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED,
    PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
    PlaybackException.ERROR_CODE_IO_INVALID_HTTP_CONTENT_TYPE,
  )

  /** Caps how many times we'll bounce a stream back through prepare()
   *  before surfacing the error to the user. Combined with the LoadErrorHandling
   *  policy's 8 inner retries, that's >40 retry attempts across a single
   *  source — enough headroom for a long string of fast Wi-Fi handoffs. */
  private val MAX_LIVE_RECONNECT_ATTEMPTS = 5

  /**
   * Network-class errors that benefit from a full prepare()-with-saved-position
   * retry. Anything outside this set (e.g. codec/format errors) won't recover
   * by retrying — looping prepare on a bad file just masks the underlying issue.
   */
  private val NETWORK_RECONNECT_ERROR_CODES = setOf(
    PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
    PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT,
    PlaybackException.ERROR_CODE_IO_UNSPECIFIED,
    PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS,
    PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE,
    PlaybackException.ERROR_CODE_IO_NO_PERMISSION,
  )

  /**
   * Auto-reconnect on network errors for both live (radio) and non-live
   * (audiobook/podcast/music) sources. Without this, a background podcast
   * dies the moment a single Wi-Fi handoff exceeds the 24s LoadErrorHandling
   * budget — the user discovers it only when they pull the phone out of
   * their pocket to find audio silent. Live streams reconnect to "now"; on-
   * demand tracks reconnect to their saved playhead so the listener doesn't
   * lose their spot.
   */
  private fun scheduleAutoReconnect(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    if (liveReconnectAttempts >= MAX_LIVE_RECONNECT_ATTEMPTS) return false
    val item = currentMediaItem ?: return false
    val source = currentSource?.source

    val isLive = source == "radio"
    if (!isLive && error.errorCode !in NETWORK_RECONNECT_ERROR_CODES) {
      // For on-demand tracks, only retry transient network failures.
      return false
    }

    liveReconnectAttempts += 1
    val attempt = liveReconnectAttempts
    val savedPositionMs = if (isLive) 0L else resolvedPlayer.currentPosition.coerceAtLeast(0L)
    Log.w(
      "SamoAudio",
      "${source ?: "unknown"} stream error (${error.errorCodeName}); reconnect attempt $attempt/$MAX_LIVE_RECONNECT_ATTEMPTS at ${savedPositionMs}ms"
    )

    // First retry fires fast (the typical case: Wi-Fi blip already
    // resolved). Subsequent retries back off so a genuinely unreachable
    // server doesn't get hammered.
    val delayMs = when (attempt) {
      1 -> 500L
      2 -> 1_500L
      3 -> 3_000L
      else -> 5_000L
    }

    pendingLiveReconnect?.let { mainHandler.removeCallbacks(it) }
    val reconnect = Runnable {
      pendingLiveReconnect = null
      // Bail if the source changed while we were waiting.
      if (currentMediaItem !== item) return@Runnable
      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      resolvedPlayer.setMediaItem(item)
      resolvedPlayer.prepare()
      if (savedPositionMs > 0) {
        resolvedPlayer.seekTo(savedPositionMs)
      }
      resolvedPlayer.playWhenReady = true
      emitState("buffering")
    }
    pendingLiveReconnect = reconnect
    mainHandler.postDelayed(reconnect, delayMs)
    emitState("buffering")
    return true
  }

  private fun cancelPendingLiveReconnect() {
    pendingLiveReconnect?.let { mainHandler.removeCallbacks(it) }
    pendingLiveReconnect = null
    liveReconnectAttempts = 0
  }

  private fun shouldSuppressNoisyPauseForTrackLoad(
    service: SamoPlaybackService,
    quality: SamoAudioSourceQuality
  ): Boolean {
    if (service.preferredMixerDevice != null) return true
    val sourceFormat = buildSourcePcmFormat(quality) ?: return false
    return getSupportedBitPerfectUsbMixerAttributes(sourceFormat) != null
  }

  private fun suppressNoisyHandlingForTrackStart(
    resolvedPlayer: ExoPlayer,
    sessionId: String
  ) {
    noisyHandlingRestore?.let { mainHandler.removeCallbacks(it) }
    noisyHandlingRestore = null
    noisyHandlingSuppressedSessionId = sessionId
    resolvedPlayer.setHandleAudioBecomingNoisy(false)
    scheduleNoisyHandlingRestore(resolvedPlayer, sessionId, 2_500L)
  }

  private fun scheduleNoisyHandlingRestore(
    resolvedPlayer: ExoPlayer,
    sessionId: String?,
    delayMs: Long
  ) {
    if (sessionId == null || noisyHandlingSuppressedSessionId != sessionId) {
      return
    }

    noisyHandlingRestore?.let { mainHandler.removeCallbacks(it) }
    val restore = Runnable {
      if (noisyHandlingSuppressedSessionId != sessionId) return@Runnable
      noisyHandlingRestore = null
      noisyHandlingSuppressedSessionId = null
      if (boundService?.getCurrentPlayer() === resolvedPlayer && currentSessionId == sessionId) {
        resolvedPlayer.setHandleAudioBecomingNoisy(true)
      }
    }
    noisyHandlingRestore = restore
    mainHandler.postDelayed(restore, delayMs)
  }

  private fun restoreNoisyHandlingNow(resolvedPlayer: ExoPlayer? = boundService?.getCurrentPlayer()) {
    noisyHandlingRestore?.let { mainHandler.removeCallbacks(it) }
    noisyHandlingRestore = null
    noisyHandlingSuppressedSessionId = null
    resolvedPlayer?.setHandleAudioBecomingNoisy(true)
  }

  private fun retryCurrentSourceAsHls(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    val mediaItem = currentMediaItem ?: return false

    if (currentHlsFallbackAttempted || error.errorCode !in HLS_FALLBACK_ERROR_CODES) {
      return false
    }

    currentHlsFallbackAttempted = true
    currentMediaItem = mediaItem.buildUpon()
      .setMimeType(MimeTypes.APPLICATION_M3U8)
      .build()

    Log.w("SamoAudio", "Retrying current source as HLS after ${error.errorCodeName}.")
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

  private fun getHttpHeaders(source: ReadableMap, key: String = "httpHeaders"): Map<String, String> {
    if (!source.hasKey(key) || source.isNull(key)) {
      return emptyMap()
    }

    val headers = source.getMap(key) ?: return emptyMap()
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

  private fun getOptionalDouble(source: ReadableMap, key: String): Double? {
    if (!source.hasKey(key) || source.isNull(key)) {
      return null
    }

    return source.getDouble(key)
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

  private fun getOutputRoutesMap(context: CastContext?): WritableMap {
    val map = Arguments.createMap()
    val routes = Arguments.createArray()
    val castSession = context?.sessionManager?.currentCastSession
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

    if (context != null) {
      val router = MediaRouter.getInstance(reactContext.applicationContext)
      val selector = context.getMergedSelector() ?: MediaRouteSelector.EMPTY
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
      if (context != null) getCastStateMap(context.getCastState()) else getUnavailableCastStateMap()
    )
    return map
  }

  private fun getLocalOutputRouteMap(
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

  private fun isUserSelectableAudioOutput(device: AudioDeviceInfo): Boolean {
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

  private fun getAudioDeviceTitle(device: AudioDeviceInfo): String {
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

  private fun getAudioDeviceSortRank(type: Int): Int {
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

  private fun selectedSystemRouteMatchesDevice(
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

  private fun getLocalOutputSubtitle(type: String): String {
    return when (type) {
      "speaker" -> "This phone"
      "bluetooth-a2dp", "ble-headset", "ble-speaker", "hearing-aid" -> "Bluetooth"
      "usb-device", "usb-headset" -> "USB audio"
      "wired-headphones", "wired-headset" -> "Wired audio"
      else -> "Local audio"
    }
  }

  private fun getCastRouteSubtitle(route: MediaRouter.RouteInfo): String {
    return when (route.getConnectionState()) {
      MediaRouter.RouteInfo.CONNECTION_STATE_CONNECTED -> "Chromecast · Connected"
      MediaRouter.RouteInfo.CONNECTION_STATE_CONNECTING -> "Chromecast · Connecting"
      else -> route.getDescription()?.takeIf { it.isNotBlank() } ?: "Chromecast"
    }
  }

  private fun getMediaRouteDeviceType(type: Int): String {
    return when (type) {
      MediaRouter.RouteInfo.DEVICE_TYPE_TV -> "cast-tv"
      MediaRouter.RouteInfo.DEVICE_TYPE_SPEAKER,
      MediaRouter.RouteInfo.DEVICE_TYPE_REMOTE_SPEAKER -> "cast-speaker"
      MediaRouter.RouteInfo.DEVICE_TYPE_GROUP -> "cast-group"
      else -> "cast"
    }
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

  private fun getAudioDeviceType(type: Int): String {
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

  internal data class SamoAudioSourceSnapshot(
    val artworkUrl: String?,
    val id: String,
    val source: String?,
    val subtitle: String?,
    val title: String
  )

  internal data class SamoCastSource(
    val album: String?,
    val artworkUrl: String?,
    val durationMs: Long?,
    val hasHttpHeaders: Boolean,
    val id: String,
    val isLive: Boolean,
    val mimeType: String?,
    val subtitle: String?,
    val title: String,
    val url: String
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

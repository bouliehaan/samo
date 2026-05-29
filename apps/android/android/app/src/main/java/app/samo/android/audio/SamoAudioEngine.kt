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
import android.os.SystemClock
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

internal class SamoAudioEngine(
  private val reactContext: ReactApplicationContext,
) : SamoLiveReconnect.Host, SamoAudioCastHost {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val castExecutor = java.util.concurrent.Executors.newSingleThreadExecutor()
  private val binder = SamoServiceBinder(
    reactContext,
    mainHandler,
    object : SamoServiceBinder.Callbacks {
      override fun onServiceConnected(service: SamoPlaybackService) {
        playerListenersInstalledOn = null
      }
      override fun onServiceDisconnected() {
        playerListenersInstalledOn = null
      }
      override fun getPreferredOutputDevice() = getSelectedLocalOutputDevice()
      override fun onNavigationRequest(direction: Int) {
        if (tryNavigateNativeQueue(direction)) {
          return
        }
        val event = Arguments.createMap()
        event.putInt("direction", direction)
        emit("SamoAudioNavigationRequest", event)
      }
      override fun getCastNotificationBridge(): () -> SamoCastNotificationBridge? = {
        if (isCastActive()) castNotificationBridge else null
      }
    },
  )
  private val castNotificationBridge = object : SamoCastNotificationBridge {
    override fun getCastOverlayState(): SamoCastPlaybackOverlay? {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient() ?: return null
      if (!isCastActive()) {
        return null
      }

      val status = castManager.getCurrentCastPlaybackStatus(remoteMediaClient)
      return SamoCastPlaybackOverlay(
        currentPositionMs = remoteMediaClient.approximateStreamPosition,
        durationMs = remoteMediaClient.streamDuration.coerceAtLeast(0L),
        playWhenReady = status == "playing" || status == "buffering",
      )
    }

    override fun handleCastPlay(): Boolean {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient() ?: return false
      if (!isCastActive()) {
        return false
      }

      remoteMediaClient.play()
      castManager.emitCastPlaybackState("playing")
      return true
    }

    override fun handleCastPause(): Boolean {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient() ?: return false
      if (!isCastActive()) {
        return false
      }

      remoteMediaClient.pause()
      castManager.emitCastPlaybackState("paused")
      return true
    }

    override fun handleCastSeek(positionMs: Long): Boolean {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient() ?: return false
      if (!isCastActive()) {
        return false
      }

      val nextPositionMs = positionMs.coerceAtLeast(0L)
      remoteMediaClient.seek(nextPositionMs)
      lastCastPositionMs = nextPositionMs
      castManager.emitCastPlaybackState()
      return true
    }
  }
  private val outputRoutes = SamoOutputRoutes(reactContext, mainHandler)
  private val liveReconnect = SamoLiveReconnect(mainHandler, this)
  private lateinit var castManager: SamoCastSessionManager

  override val boundService: SamoPlaybackService?
    get() = binder.boundService

  init {
    castManager = SamoCastSessionManager(reactContext, mainHandler, castExecutor, this)
  }
  override var currentAudioTrackConfig: AudioSink.AudioTrackConfig? = null
  override var currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
  override var currentCastSource: SamoCastSource? = null
  override var currentHlsFallbackAttempted = false
  override var currentMediaItem: MediaItem? = null
  override var currentQuality: SamoAudioSourceQuality? = null
  override var currentSource: SamoAudioSourceSnapshot? = null
  override var currentSessionId: String? = null
  override var lastCastPositionMs = 0L
  override var lastKnownPlaybackPositionMs = 0L
  private var lastAutoAdvanceSessionId: String? = null
  /** Blocks stale STATE_ENDED callbacks while ExoPlayer is torn down for the next track. */
  private var suppressQueueAdvanceUntilMs = 0L
  /** Queue mirror for advancing on the main thread while JS is suspended in background. */
  private var nativePlaybackQueue: SamoNativePlaybackQueue? = null
  private var playerListenersInstalledOn: ExoPlayer? = null
  override var resumeLocalPlaybackAfterCastDisconnect = false
  private var selectedLocalOutputDeviceId: Int? = null
  private var noisyHandlingRestore: Runnable? = null
  private var noisyHandlingSuppressedSessionId: String? = null
  private var sleepTimerStop: Runnable? = null


  fun addListener(eventName: String) = Unit

  fun removeListeners(count: Int) = Unit

  fun play(source: ReadableMap, promise: Promise) {
    mainHandler.post {
      if (castManager.getActiveRemoteMediaClient() != null) {
        try {
          castManager.playOnCast(source, promise)
        } catch (error: Exception) {
          promise.reject("SAMO_CAST_ERROR", error.message, error)
        }
        return@post
      }

      val url = source.getOptionalString("url")
      if (url != null && SamoNativeStreamUrl.shouldRefresh(url)) {
        val map = SamoBridgeMapCopier.toHashMap(source)
        SamoNativeStreamUrl.refreshQueueItemAsync(map) { refreshedItem ->
          mainHandler.post {
            playLocally(SamoBridgeMapCopier.toWritableMap(refreshedItem), promise)
          }
        }
        return@post
      }

      playLocally(source, promise)
    }
  }

  /**
   * Mirrors the JS Up Next queue into the service process so background auto-
   * advance sees items appended (or reordered) without waiting for the next play().
   */
  fun setPlaybackQueue(queue: ReadableMap, promise: Promise) {
    mainHandler.post {
      nativePlaybackQueue = queue.syncNativePlaybackQueue(null)
      promise.resolve(Arguments.createMap())
    }
  }

  private fun playLocally(source: ReadableMap, promise: Promise) {
    source.syncNativePlaybackQueue(null)?.let { nativePlaybackQueue = it }

    val url = source.getOptionalString("url")
    if (url == null) {
      promise.reject("SAMO_AUDIO_ERROR", "Missing audio URL")
      return
    }
    val sessionId = source.getOptionalString("sessionId") ?: UUID.randomUUID().toString()
    val title = source.getOptionalString("title") ?: "Samo"
    val subtitle = source.getOptionalString("subtitle")
    val artworkUrl = source.getOptionalString("artworkUrl")
    val mediaId = source.getOptionalString("id") ?: sessionId
    val mimeType = getMediaItemMimeType(url, source.getOptionalString("mimeType"))
    val requestHeaders = source.getHttpHeaders()
    val quality = source.getSourceQuality()
    val sourceLabel = source.getOptionalString("source")

    binder.withService(promise) { service ->
      val isLiveStream =
        source.getOptionalBoolean("isLive") == true || sourceLabel == "radio"
      val prefetchOnDemand = !isLiveStream
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
      val resolvedPlayer = service.ensurePlayer(requestHeaders, prefetchOnDemand)
      lastKnownPlaybackPositionMs =
        source.getOptionalDouble("initialPositionSeconds")?.times(1000)?.toLong() ?: 0L
      service.preferredOutputDevice = getSelectedLocalOutputDevice()
      resolvedPlayer.setPreferredAudioDevice(service.preferredOutputDevice)
      installListenersIfNeeded(resolvedPlayer)
      if (shouldSuppressNoisyPauseForTrackLoad(service, quality)) {
        suppressNoisyHandlingForTrackStart(resolvedPlayer, sessionId)
      } else {
        restoreNoisyHandlingNow(resolvedPlayer)
      }

      suppressQueueAdvanceUntilMs = SystemClock.uptimeMillis() + 2500L
      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      SamoBitPerfect.clearPreferredMixerAttributes(reactContext, service)
      liveReconnect.cancelPendingLiveReconnect()
      currentAudioTrackConfig = null
      currentHlsFallbackAttempted = mimeType == MimeTypes.APPLICATION_M3U8
      currentMediaItem = mediaItem
      currentQuality = quality
      currentCastSource = castManager.getCastSource(source, url, mimeType, title, subtitle, artworkUrl, mediaId)
      currentBitPerfectTruth = buildBitPerfectTruth(
        audioTrackConfig = null,
        quality = quality,
        requestPreferredMixer = true,
        service = service,
      )
      currentSource = SamoAudioSourceSnapshot(
        artworkUrl = artworkUrl,
        id = mediaId,
        source = sourceLabel,
        subtitle = subtitle,
        title = title
      )
      currentSessionId = sessionId
      lastAutoAdvanceSessionId = null
      resolvedPlayer.repeatMode = Player.REPEAT_MODE_OFF
      resolvedPlayer.setMediaItem(mediaItem)
      resolvedPlayer.prepare()
      resolvedPlayer.playWhenReady = true
      emitState("buffering")
      promise.resolve(getStatusMap(resolvedPlayer, "buffering"))
    }
  }

  fun pause(promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        remoteMediaClient.pause()
        castManager.emitCastPlaybackState("paused")
        promise.resolve(castManager.getCastStatusMap("paused"))
        return@post
      }

      binder.withService(promise) { service ->
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

  fun resume(promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        remoteMediaClient.play()
        castManager.emitCastPlaybackState("playing")
        promise.resolve(castManager.getCastStatusMap("playing"))
        return@post
      }

      binder.withService(promise) { service ->
        val resolvedPlayer = service.getCurrentPlayer()
        if (resolvedPlayer == null) {
          promise.resolve(getIdleStatusMap())
          return@withService
        }
        installListenersIfNeeded(resolvedPlayer)
        restoreNoisyHandlingNow(resolvedPlayer)
        val playerError = resolvedPlayer.playerError
        if (playerError != null) {
          if (liveReconnect.scheduleAutoReconnect(resolvedPlayer, playerError)) {
            promise.resolve(getStatusMap(resolvedPlayer, "buffering"))
            return@withService
          }
        }
        resolvedPlayer.play()
        emitState("playing")
        promise.resolve(getStatusMap(resolvedPlayer, "playing"))
      }
    }
  }

  fun seekTo(positionMs: Double, promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        val nextPositionMs = positionMs.toLong().coerceAtLeast(0L)
        remoteMediaClient.seek(nextPositionMs)
        lastCastPositionMs = nextPositionMs
        castManager.emitCastPlaybackState()
        promise.resolve(castManager.getCastStatusMap())
        return@post
      }

      binder.withService(promise) { service ->
        val resolvedPlayer = service.getCurrentPlayer()
        if (resolvedPlayer == null) {
          promise.resolve(getIdleStatusMap())
          return@withService
        }
        installListenersIfNeeded(resolvedPlayer)
        // Seeks can briefly surface STATE_ENDED on HLS/long-form audio; suppress
        // queue auto-advance while the player settles on the new position.
        suppressQueueAdvanceUntilMs = SystemClock.uptimeMillis() + 3000L
        resolvedPlayer.seekTo(positionMs.toLong())
        promise.resolve(getStatusMap(resolvedPlayer))
      }
    }
  }

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
        val remoteMediaClient = castManager.getActiveRemoteMediaClient()
        if (remoteMediaClient != null) {
          remoteMediaClient.pause()
          castManager.emitCastPlaybackState("paused")
          return@Runnable
        }

        val service = binder.boundService ?: return@Runnable
        val resolvedPlayer = service.getCurrentPlayer() ?: return@Runnable
        resolvedPlayer.pause()
        emitState("paused")
      }
      sleepTimerStop = runnable
      mainHandler.postDelayed(runnable, delayMs)
      promise.resolve(getLocalStatusMap())
    }
  }

  fun cancelSleepTimer(promise: Promise) {
    mainHandler.post {
      cancelNativeSleepTimer()
      promise.resolve(getLocalStatusMap())
    }
  }

  fun stop(promise: Promise) {
    mainHandler.post {
      cancelNativeSleepTimer()
      val remoteMediaClient = castManager.getActiveRemoteMediaClient()
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

      val service = binder.boundService
      if (service == null) {
        promise.resolve(getIdleStatusMap())
        return@post
      }
      try {
        service.resetPlayerState()
        restoreNoisyHandlingNow(service.getCurrentPlayer())
        SamoBitPerfect.clearPreferredMixerAttributes(reactContext, service)
        liveReconnect.cancelPendingLiveReconnect()
        currentAudioTrackConfig = null
        currentCastSource = null
        currentHlsFallbackAttempted = false
        currentMediaItem = null
        currentQuality = null
        currentBitPerfectTruth = SamoBitPerfectTruth.unknown()
        currentSource = null
        currentSessionId = null
        nativePlaybackQueue = null
        emitState("idle")
        promise.resolve(getIdleStatusMap())
        val intent = Intent(reactContext, SamoPlaybackService::class.java)
        reactContext.stopService(intent)
      } catch (error: Exception) {
        promise.reject("SAMO_AUDIO_ERROR", error.message, error)
      }
    }
  }

  fun getStatus(promise: Promise) {
    mainHandler.post {
      val remoteMediaClient = castManager.getActiveRemoteMediaClient()
      if (remoteMediaClient != null) {
        promise.resolve(castManager.getCastStatusMap())
        return@post
      }

      binder.ensureServiceBound(
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

  fun updateNowPlayingMetadata(metadata: ReadableMap, promise: Promise) {
    mainHandler.post {
      val metadataSessionId = metadata.getOptionalString("sessionId")
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
      val title = metadata.getOptionalString("title") ?: previousSource?.title ?: "Samo"
      val subtitle = metadata.getOptionalString("subtitle") ?: previousSource?.subtitle
      val artworkUrl = metadata.getOptionalString("artworkUrl") ?: previousSource?.artworkUrl
      val mediaId =
        previousSource?.id ?: metadata.getOptionalString("id") ?: activeSessionId ?: metadataSessionId ?: "samo"
      val sourceLabel = previousSource?.source ?: metadata.getOptionalString("source")

      currentSource = SamoAudioSourceSnapshot(
        artworkUrl = artworkUrl,
        id = mediaId,
        source = sourceLabel,
        subtitle = subtitle,
        title = title
      )

      binder.ensureServiceBound(
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

  fun getAudioDeviceInfoMap(): WritableMap = outputRoutes.getAudioDeviceInfoMap()

  fun getOutputRoutes(promise: Promise) {
    castManager.withCastContext(
      onReady = { context ->
        outputRoutes.ensureOutputRouteDiscovery(
          context,
          selectedLocalOutputDeviceId,
          castManager::getCastStateMap,
          castManager::getUnavailableCastStateMap,
        ) { map -> emit("SamoAudioOutputRoutes", map) }
        promise.resolve(outputRoutes.getOutputRoutesMap(context, selectedLocalOutputDeviceId, castManager::getCastStateMap, castManager::getUnavailableCastStateMap))
      },
      onError = { promise.resolve(outputRoutes.getOutputRoutesMap(null, selectedLocalOutputDeviceId, castManager::getCastStateMap, castManager::getUnavailableCastStateMap)) }
    )
  }

  fun selectOutputRoute(route: ReadableMap, promise: Promise) {
    mainHandler.post {
      when (route.getOptionalString("kind")) {
        "cast" -> {
          val routeId = route.getOptionalString("routeId")
          if (routeId.isNullOrBlank()) {
            promise.reject("SAMO_OUTPUT_ERROR", "Missing Cast route id")
            return@post
          }
          castManager.selectCastOutputRoute(routeId, promise)
        }
        "local" -> {
          val deviceId = route.getOptionalInt( "deviceId")
          selectLocalOutputRoute(deviceId, promise)
        }
        else -> promise.reject("SAMO_OUTPUT_ERROR", "Unknown output route")
      }
    }
  }

  private fun getLocalStatusMap(): WritableMap {
    val service = binder.boundService ?: return getIdleStatusMap()
    val resolvedPlayer = service.getCurrentPlayer()
    return if (resolvedPlayer == null) getIdleStatusMap() else getStatusMap(resolvedPlayer)
  }

  private fun cancelNativeSleepTimer() {
    val timer = sleepTimerStop ?: return
    mainHandler.removeCallbacks(timer)
    sleepTimerStop = null
  }

  fun getCastState(promise: Promise) {
    castManager.withCastContext(
      onReady = { context -> promise.resolve(castManager.getCastStateMap(context.getCastState())) },
      onError = { promise.resolve(castManager.getUnavailableCastStateMap()) }
    )
  }

  fun invalidate() {
    mainHandler.post {
      cancelNativeSleepTimer()
      val service = binder.boundService
      if (service != null) {
        try {
          SamoBitPerfect.clearPreferredMixerAttributes(reactContext, service)
        } catch (_: Exception) {
          // Best-effort cleanup; never block teardown on opportunistic mixer state.
        }
      }
      try {
        reactContext.unbindService(binder.serviceConnection)
      } catch (_: Exception) {
        // Service may not be bound; that's fine.
      }
      castManager.invalidate()
      outputRoutes.stopOutputRouteDiscovery()
      liveReconnect.cancelPendingLiveReconnect()
      restoreNoisyHandlingNow(binder.boundService?.getCurrentPlayer())
      binder.clearOnInvalidate()
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



  override fun installListenersIfNeeded(player: ExoPlayer) {
    if (playerListenersInstalledOn === player) {
      return
    }
    playerListenersInstalledOn = player

    player.addListener(object : Player.Listener {
      override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (isPlaying) {
          // Stream is alive — give the next failure a fresh retry budget.
          liveReconnect.resetAttempts()
          scheduleNoisyHandlingRestore(player, currentSessionId, 750L)
        }
        if (isCastActive()) return
        if (!isPlaying && player.playbackState == Player.STATE_ENDED) {
          val durationMs = player.duration
          val positionMs = player.currentPosition
          val nearNaturalEnd =
            durationMs > 0 &&
              positionMs + 1500 >= durationMs
          if (!nearNaturalEnd) {
            Log.d(
              "SamoAudio",
              "ignoring transient isPlaying ended sessionId=$currentSessionId position=$positionMs duration=$durationMs",
            )
            emitState(getCurrentStatus(player))
            return
          }
          Log.d(
            "SamoAudio",
            "playback stopped at end sessionId=$currentSessionId position=$positionMs",
          )
          emitState("ended")
          requestQueueAdvanceFromEnded("isPlayingChanged")
          return
        }
        emitState(if (isPlaying) "playing" else getCurrentStatus(player))
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        if (isCastActive()) return
        if (playbackState == Player.STATE_ENDED) {
          val durationMs = player.duration
          val positionMs = player.currentPosition
          val nearNaturalEnd =
            durationMs > 0 &&
              positionMs + 1500 >= durationMs
          if (!nearNaturalEnd) {
            Log.d(
              "SamoAudio",
              "ignoring transient ended sessionId=$currentSessionId position=$positionMs duration=$durationMs",
            )
            emitState(getCurrentStatus(player))
            return
          }
          Log.d(
            "SamoAudio",
            "playback state ended sessionId=$currentSessionId position=$positionMs",
          )
          emitState("ended")
          requestQueueAdvanceFromEnded("playbackStateChanged")
          return
        }
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

        val positionMs = player.currentPosition.coerceAtLeast(0L)
        if (positionMs > 0) {
          lastKnownPlaybackPositionMs = maxOf(lastKnownPlaybackPositionMs, positionMs)
        }

        if (liveReconnect.retryCurrentSourceAsHls(player, error)) {
          return
        }

        if (liveReconnect.scheduleAutoReconnect(player, error)) {
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
          service = binder.boundService,
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
          service = binder.boundService,
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
  override fun isCastActive(): Boolean =
    castManager.getActiveRemoteMediaClient() != null && currentCastSource != null

  override fun syncCastNotificationState() {
    mainHandler.post {
      val service = boundService ?: return@post
      val forwarding = service.getSessionPlayer() ?: return@post
      forwarding.setCastOverlay(
        if (isCastActive()) castNotificationBridge.getCastOverlayState() else null,
      )
      service.refreshPlaybackNotification()
    }
  }

  override fun emitState(status: String?) {
    if (castManager.getActiveRemoteMediaClient() != null && currentCastSource != null) {
      emit("SamoAudioPlaybackState", castManager.getCastStatusMap(status))
      return
    }

    val resolvedPlayer = binder.boundService?.getCurrentPlayer()
    if (resolvedPlayer != null) {
      val positionMs = resolvedPlayer.currentPosition.coerceAtLeast(0L)
      if (positionMs > 0) {
        lastKnownPlaybackPositionMs = maxOf(lastKnownPlaybackPositionMs, positionMs)
      }
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

  private fun requestQueueAdvanceFromEnded(reason: String) {
    if (SystemClock.uptimeMillis() < suppressQueueAdvanceUntilMs) {
      return
    }
    val sessionId = currentSessionId ?: return
    if (lastAutoAdvanceSessionId == sessionId) {
      return
    }

    lastAutoAdvanceSessionId = sessionId
    if (tryNavigateNativeQueue(1)) {
      Log.i(
        "SamoAudio",
        "native queue advance sessionId=$sessionId reason=$reason index=${nativePlaybackQueue?.index}",
      )
      return
    }

    Log.i(
      "SamoAudio",
      "requesting JS queue advance sessionId=$sessionId reason=$reason",
    )
    val event = Arguments.createMap()
    event.putInt("direction", 1)
    emit("SamoAudioNavigationRequest", event)
  }

  private fun tryNavigateNativeQueue(direction: Int): Boolean {
    if (isCastActive()) {
      return false
    }

    val queue = nativePlaybackQueue ?: return false

    if (direction > 0) {
      if (!queue.hasNext()) {
        return false
      }
      return playQueueItemAt(queue.index + 1)
    }

    if (direction < 0) {
      // Audiobooks/podcasts use book-global chapter navigation in JS; native
      // seek-to-zero only applies to music tracks in a multi-item queue.
      val sourceKind = currentSource?.source
      if (sourceKind == "audiobook" || sourceKind == "podcast") {
        return false
      }

      val resolvedPlayer = binder.boundService?.getCurrentPlayer()
      val positionMs = resolvedPlayer?.currentPosition ?: 0L
      if (positionMs > 3000L) {
        mainHandler.post {
          resolvedPlayer?.seekTo(0)
          emitState("playing")
        }
        return true
      }
      if (!queue.hasPrevious()) {
        return false
      }
      return playQueueItemAt(queue.index - 1)
    }

    return false
  }

  private fun playQueueItemAt(index: Int): Boolean {
    val queue = nativePlaybackQueue ?: return false
    val item = queue.items.getOrNull(index) ?: return false
    queue.index = index

    SamoNativeStreamUrl.refreshQueueItemAsync(item) { refreshedItem ->
      mainHandler.post {
        val activeQueue = nativePlaybackQueue ?: return@post
        if (activeQueue.index != index) {
          return@post
        }

        activeQueue.items[index] = HashMap(refreshedItem)
        val playSource = SamoBridgeMapCopier.toWritableMap(HashMap(refreshedItem))
        playSource.putString("sessionId", currentSessionId ?: UUID.randomUUID().toString())
        playLocally(playSource, SamoNoOpPromise)
      }
    }
    return true
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
    map.putMap("bitPerfect", SamoBitPerfect.getBitPerfectTruthMap(SamoBitPerfectTruth.unknown()))

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

  override fun emit(eventName: String, event: WritableMap) {
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

  /**
   * Auto-reconnect on network errors for both live (radio) and non-live
   * (audiobook/podcast/music) sources. Without this, a background podcast
   * dies the moment a single Wi-Fi handoff exceeds the 24s LoadErrorHandling
   * budget — the user discovers it only when they pull the phone out of
   * their pocket to find audio silent. Live streams reconnect to "now"; on-
   * demand tracks reconnect to their saved playhead so the listener doesn't
   * lose their spot.
   */

  private fun shouldSuppressNoisyPauseForTrackLoad(
    service: SamoPlaybackService,
    quality: SamoAudioSourceQuality
  ): Boolean {
    if (service.preferredMixerDevice != null) return true
    val sourceFormat = SamoBitPerfect.buildSourcePcmFormat(quality) ?: return false
    return SamoBitPerfect.getSupportedBitPerfectUsbMixerAttributes(reactContext, sourceFormat) != null
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
      if (binder.boundService?.getCurrentPlayer() === resolvedPlayer && currentSessionId == sessionId) {
        resolvedPlayer.setHandleAudioBecomingNoisy(true)
      }
    }
    noisyHandlingRestore = restore
    mainHandler.postDelayed(restore, delayMs)
  }

  private fun restoreNoisyHandlingNow(resolvedPlayer: ExoPlayer? = binder.boundService?.getCurrentPlayer()) {
    noisyHandlingRestore?.let { mainHandler.removeCallbacks(it) }
    noisyHandlingRestore = null
    noisyHandlingSuppressedSessionId = null
    resolvedPlayer?.setHandleAudioBecomingNoisy(true)
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
    map.putMap("bitPerfect", SamoBitPerfect.getBitPerfectTruthMap(currentBitPerfectTruth))

    if (source != null) {
      val sourceMap = Arguments.createMap()

      sourceMap.putString("id", source.id)
      sourceMap.putString("source", source.source)
      sourceMap.putString("title", source.title)
      sourceMap.putString("subtitle", source.subtitle)
      sourceMap.putString("artworkUrl", source.artworkUrl)
      map.putMap("source", sourceMap)
    }

    nativePlaybackQueue?.let { queue ->
      map.putInt("queueIndex", queue.index)
      map.putInt("queueLength", queue.items.size)
    }

    return map
  }

  private fun getIdleStatusMap(): WritableMap {
    val map = Arguments.createMap()

    map.putString("status", "idle")
    map.putBoolean("isPlaying", false)
    map.putDouble("positionMs", 0.0)
    map.putDouble("durationMs", -1.0)
    map.putMap("bitPerfect", SamoBitPerfect.getBitPerfectTruthMap(SamoBitPerfectTruth.unknown()))
    return map
  }

  override fun ensureServiceBound(
    onReady: (SamoPlaybackService) -> Unit,
    onError: ((Throwable) -> Unit)?,
    startService: Boolean,
  ) {
    binder.ensureServiceBound(onReady, onError, startService)
  }

  override fun clearPreferredMixerAttributes(service: SamoPlaybackService) {
    SamoBitPerfect.clearPreferredMixerAttributes(reactContext, service)
  }

  override fun buildBitPerfectTruth(
    audioTrackConfig: AudioSink.AudioTrackConfig?,
    quality: SamoAudioSourceQuality?,
    requestPreferredMixer: Boolean,
    service: SamoPlaybackService?,
  ): SamoBitPerfectTruth {
    return SamoBitPerfect.buildBitPerfectTruth(
      reactContext,
      audioTrackConfig = audioTrackConfig,
      quality = quality,
      requestPreferredMixer = requestPreferredMixer,
      service = service,
      previousUsbMixerRequested = currentBitPerfectTruth.usbBitPerfectMixerRequested,
    )
  }

  override fun getOutputRoutesMap(castContext: CastContext?): WritableMap {
    return outputRoutes.getOutputRoutesMap(
      castContext,
      selectedLocalOutputDeviceId,
      castManager::getCastStateMap,
      castManager::getUnavailableCastStateMap,
    )
  }

  override fun ensureOutputRouteDiscovery(context: CastContext) {
    outputRoutes.ensureOutputRouteDiscovery(
      context,
      selectedLocalOutputDeviceId,
      castManager::getCastStateMap,
      castManager::getUnavailableCastStateMap,
    ) { map -> emit("SamoAudioOutputRoutes", map) }
  }

  override fun cancelPendingLiveReconnect() {
    liveReconnect.cancelPendingLiveReconnect()
  }

  override fun handOffLocalPlaybackToCast() {
    castManager.handOffLocalPlaybackToCast()
  }

  override fun prepareLocalMirrorForCast(
    artworkUrl: String?,
    mediaId: String,
    mimeType: String?,
    positionMs: Long,
    requestHeaders: Map<String, String>,
    quality: SamoAudioSourceQuality,
    subtitle: String?,
    title: String,
    url: String,
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
      service = service,
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

  override fun restoreLocalPlaybackPosition(autoplay: Boolean) {
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

  override fun getSelectedLocalOutputDevice(): AudioDeviceInfo? {
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

    val session = castManager.castContext?.sessionManager?.currentCastSession
    val remoteMediaClient = castManager.getActiveRemoteMediaClient()
    if (session?.isConnected == true) {
      resumeLocalPlaybackAfterCastDisconnect =
        remoteMediaClient?.playerState == MediaStatus.PLAYER_STATE_PLAYING ||
          remoteMediaClient?.playerState == MediaStatus.PLAYER_STATE_BUFFERING
      lastCastPositionMs = remoteMediaClient?.approximateStreamPosition ?: lastCastPositionMs
      castManager.castContext?.sessionManager?.endCurrentSession(true)
      promise.resolve(getOutputRoutesMap(castManager.castContext))
      return
    }

    emitState(null)
    promise.resolve(getOutputRoutesMap(castManager.castContext))
  }
}


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
      restoreLocalPlaybackPosition()
      detachRemoteMediaClient()
      emit("SamoAudioCastState", getCastStateMap())
      emitState("paused")
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
      installListenersIfNeeded(resolvedPlayer)

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
  fun stop(promise: Promise) {
    mainHandler.post {
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

  @ReactMethod
  fun getCastState(promise: Promise) {
    withCastContext(
      onReady = { context -> promise.resolve(getCastStateMap(context.getCastState())) },
      onError = { promise.resolve(getUnavailableCastStateMap()) }
    )
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
      castContext?.let { context ->
        if (castListenersInstalled) {
          context.removeCastStateListener(castStateListener)
          context.sessionManager.removeSessionManagerListener(
            castSessionListener,
            CastSession::class.java
          )
        }
      }
      detachRemoteMediaClient()
      cancelPendingLiveReconnect()
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

    val resolvedPlayer = boundService?.getCurrentPlayer()
    val startPositionMs = resolvedPlayer?.currentPosition ?: getInitialPositionMs(source)
    resolvedPlayer?.pause()

    loadCastSource(castSource, startPositionMs, true)
    emitState("buffering")
    promise.resolve(getCastStatusMap("buffering"))
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

  private fun restoreLocalPlaybackPosition() {
    val resolvedPlayer = boundService?.getCurrentPlayer() ?: return
    if (lastCastPositionMs > 0) {
      try {
        resolvedPlayer.seekTo(lastCastPositionMs)
      } catch (_: Exception) {
        // Best effort; route teardown should not break the Cast session cleanup path.
      }
    }
    resolvedPlayer.pause()
  }

  private fun loadCastSource(source: SamoCastSource, positionMs: Long, autoplay: Boolean) {
    val remoteMediaClient = getActiveRemoteMediaClient()
      ?: throw IllegalStateException("No active Chromecast session")
    val contentUrl = source.url

    if (!contentUrl.startsWith("http://") && !contentUrl.startsWith("https://")) {
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

    remoteMediaClient.load(loadRequest)
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
      MediaStatus.PLAYER_STATE_IDLE -> {
        if (remoteMediaClient.idleReason == MediaStatus.IDLE_REASON_FINISHED) "ended" else "idle"
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
    val castUrl = getOptionalString(source, "castUrl") ?: localUrl
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
        (getOptionalString(source, "castUrl") == null && localHeaders.isNotEmpty()),
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
        if (isPlaying) {
          // Stream is alive — give the next failure a fresh retry budget.
          liveReconnectAttempts = 0
        }
        emitState(if (isPlaying) "playing" else getCurrentStatus(player))
      }

      override fun onPlaybackStateChanged(playbackState: Int) {
        emitState(getCurrentStatus(player))
      }

      override fun onPlayerError(error: PlaybackException) {
        if (retryCurrentSourceAsHls(player, error)) {
          return
        }

        if (scheduleLiveReconnect(player, error)) {
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
    if (getActiveRemoteMediaClient() != null && currentCastSource != null) {
      emit("SamoAudioPlaybackState", getCastStatusMap(status))
      return
    }

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

  /** Caps how many times we'll bounce a live stream back through prepare()
   *  before surfacing the error to the user. Combined with the LoadErrorHandling
   *  policy's 8 inner retries, that's >40 retry attempts across a single
   *  source — enough headroom for a long string of fast Wi-Fi handoffs. */
  private val MAX_LIVE_RECONNECT_ATTEMPTS = 5

  private fun scheduleLiveReconnect(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    // Only auto-retry for live sources — for fixed-duration tracks an error
    // usually means the file is bad and looping prepare() would mask it.
    if (currentSource?.source != "radio") return false
    if (liveReconnectAttempts >= MAX_LIVE_RECONNECT_ATTEMPTS) return false
    val item = currentMediaItem ?: return false

    liveReconnectAttempts += 1
    val attempt = liveReconnectAttempts
    Log.w(
      "SamoAudio",
      "Radio stream error (${error.errorCodeName}); reconnect attempt $attempt/$MAX_LIVE_RECONNECT_ATTEMPTS"
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
      if (currentSource?.source != "radio" || currentMediaItem !== item) return@Runnable
      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      resolvedPlayer.setMediaItem(item)
      resolvedPlayer.prepare()
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

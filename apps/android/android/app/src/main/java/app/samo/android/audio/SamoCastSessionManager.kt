package app.samo.android.audio

import android.net.Uri
import android.os.Handler
import android.util.Log
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.mediarouter.media.MediaRouter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
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
import java.util.concurrent.ExecutorService

internal interface SamoAudioCastHost {
  var currentSource: SamoAudioSourceSnapshot?
  var currentSessionId: String?
  var currentCastSource: SamoCastSource?
  var lastCastPositionMs: Long
  var resumeLocalPlaybackAfterCastDisconnect: Boolean
  var currentQuality: SamoAudioSourceQuality?
  var currentMediaItem: MediaItem?
  var currentHlsFallbackAttempted: Boolean
  var currentAudioTrackConfig: androidx.media3.exoplayer.audio.AudioSink.AudioTrackConfig?
  var currentBitPerfectTruth: SamoBitPerfectTruth
  val boundService: SamoPlaybackService?
  fun emit(eventName: String, event: WritableMap)
  fun emitState(status: String?)
  fun ensureServiceBound(onReady: (SamoPlaybackService) -> Unit, onError: ((Throwable) -> Unit)? = null, startService: Boolean = true)
  fun getSelectedLocalOutputDevice(): android.media.AudioDeviceInfo?
  fun clearPreferredMixerAttributes(service: SamoPlaybackService)
  fun buildBitPerfectTruth(
    audioTrackConfig: androidx.media3.exoplayer.audio.AudioSink.AudioTrackConfig?,
    quality: SamoAudioSourceQuality?,
    requestPreferredMixer: Boolean,
    service: SamoPlaybackService?,
  ): SamoBitPerfectTruth
  fun installListenersIfNeeded(player: androidx.media3.exoplayer.ExoPlayer)
  fun prepareLocalMirrorForCast(
    artworkUrl: String?,
    mediaId: String,
    mimeType: String?,
    positionMs: Long,
    requestHeaders: Map<String, String>,
    quality: SamoAudioSourceQuality,
    subtitle: String?,
    title: String,
    url: String,
  )
  fun handOffLocalPlaybackToCast()
  fun restoreLocalPlaybackPosition(autoplay: Boolean = false)
  fun getOutputRoutesMap(castContext: CastContext?): WritableMap
  fun ensureOutputRouteDiscovery(context: CastContext)
  fun cancelPendingLiveReconnect()
  fun isCastActive(): Boolean
  fun syncCastNotificationState()
}

internal class SamoCastSessionManager(
  private val reactContext: ReactApplicationContext,
  private val mainHandler: Handler,
  private val castExecutor: ExecutorService,
  private val host: SamoAudioCastHost,
) {
  var castContext: CastContext? = null
    private set
  private var castContextInitializing = false
  private val pendingCastContextActions =
    mutableListOf<Pair<(CastContext) -> Unit, (Exception) -> Unit>>()
  private var castListenersInstalled = false
  private var currentRemoteMediaClient: RemoteMediaClient? = null

  val castStateListener = CastStateListener { state ->
    host.emit("SamoAudioCastState", getCastStateMap(state))
  }

  val castSessionListener = object : SessionManagerListener<CastSession> {
    override fun onSessionStarting(session: CastSession) {
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionStarted(session: CastSession, sessionId: String) {
      attachRemoteMediaClient(session.remoteMediaClient)
      handOffLocalPlaybackToCast()
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionStartFailed(session: CastSession, error: Int) {
      detachRemoteMediaClient()
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionEnding(session: CastSession) {
      host.lastCastPositionMs = session.remoteMediaClient?.approximateStreamPosition ?: host.lastCastPositionMs
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionEnded(session: CastSession, error: Int) {
      val shouldResumeLocal = host.resumeLocalPlaybackAfterCastDisconnect
      host.resumeLocalPlaybackAfterCastDisconnect = false
      host.restoreLocalPlaybackPosition(shouldResumeLocal)
      detachRemoteMediaClient()
      host.emit("SamoAudioCastState", getCastStateMap())
      host.emitState(if (shouldResumeLocal) "playing" else "paused")
    }

    override fun onSessionResuming(session: CastSession, sessionId: String) {
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
      attachRemoteMediaClient(session.remoteMediaClient)
      host.emit("SamoAudioCastState", getCastStateMap())
      emitCastPlaybackState()
    }

    override fun onSessionResumeFailed(session: CastSession, error: Int) {
      detachRemoteMediaClient()
      host.emit("SamoAudioCastState", getCastStateMap())
    }

    override fun onSessionSuspended(session: CastSession, reason: Int) {
      host.resumeLocalPlaybackAfterCastDisconnect = false
      host.lastCastPositionMs = session.remoteMediaClient?.approximateStreamPosition ?: host.lastCastPositionMs
      detachRemoteMediaClient()
      host.emit("SamoAudioCastState", getCastStateMap())
      host.emitState("paused")
    }
  }

  val remoteMediaClientCallback = object : RemoteMediaClient.Callback() {
    override fun onStatusUpdated() {
      emitCastPlaybackState()
    }

    override fun onMetadataUpdated() {
      emitCastPlaybackState()
    }
  }

  val castProgressListener = RemoteMediaClient.ProgressListener { progressMs, _ ->
    host.lastCastPositionMs = progressMs
    emitCastPlaybackState()
  }

  fun withCastContext(
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

  fun installCastListenersIfNeeded(context: CastContext) {
    if (castListenersInstalled) {
      return
    }

    context.addCastStateListener(castStateListener)
    context.sessionManager.addSessionManagerListener(castSessionListener, CastSession::class.java)
    castListenersInstalled = true
  }

  fun attachRemoteMediaClient(remoteMediaClient: RemoteMediaClient?) {
    if (currentRemoteMediaClient === remoteMediaClient) {
      return
    }

    detachRemoteMediaClient()
    currentRemoteMediaClient = remoteMediaClient
    remoteMediaClient?.registerCallback(remoteMediaClientCallback)
    remoteMediaClient?.addProgressListener(castProgressListener, 1000L)
  }

  fun detachRemoteMediaClient() {
    currentRemoteMediaClient?.removeProgressListener(castProgressListener)
    currentRemoteMediaClient?.unregisterCallback(remoteMediaClientCallback)
    currentRemoteMediaClient = null
    host.syncCastNotificationState()
  }

  fun getActiveRemoteMediaClient(): RemoteMediaClient? {
    val session = castContext?.sessionManager?.currentCastSession
    val remoteMediaClient = session?.remoteMediaClient ?: currentRemoteMediaClient

    return if (session?.isConnected == true && remoteMediaClient != null) {
      attachRemoteMediaClient(remoteMediaClient)
      remoteMediaClient
    } else {
      null
    }
  }

  fun selectCastOutputRoute(routeId: String, promise: Promise) {
    withCastContext(
      onReady = { context ->
        try {
          host.ensureOutputRouteDiscovery(context)
          val router = MediaRouter.getInstance(reactContext.applicationContext)
          val route = router.getRoutes().firstOrNull { it.getId() == routeId }

          if (route == null || !route.isEnabled) {
            promise.reject("SAMO_OUTPUT_ERROR", "Cast route is no longer available")
            return@withCastContext
          }

          router.selectRoute(route)
          promise.resolve(host.getOutputRoutesMap(context))
        } catch (error: Exception) {
          promise.reject("SAMO_OUTPUT_ERROR", error.message, error)
        }
      },
      onError = { error -> promise.reject("SAMO_OUTPUT_ERROR", error.message, error) }
    )
  }

  fun playOnCast(source: ReadableMap, promise: Promise) {
    val url = source.getOptionalString("url")
    if (url == null) {
      promise.reject("SAMO_CAST_ERROR", "Missing audio URL")
      return
    }

    val sessionId = source.getOptionalString("sessionId") ?: UUID.randomUUID().toString()
    val title = source.getOptionalString("title") ?: "Samo"
    val subtitle = source.getOptionalString("subtitle")
    val artworkUrl = source.getOptionalString("artworkUrl")
    val mediaId = source.getOptionalString("id") ?: sessionId
    val mimeType = getMediaItemMimeType(url, source.getOptionalString("mimeType"))
    val sourceLabel = source.getOptionalString("source")
    val castSource = getCastSource(source, url, mimeType, title, subtitle, artworkUrl, mediaId)
    val startPositionMs = getInitialPositionMs(source)

    host.currentSource = SamoAudioSourceSnapshot(
      artworkUrl = artworkUrl,
      id = mediaId,
      source = sourceLabel,
      subtitle = subtitle,
      title = title
    )
    host.currentSessionId = sessionId
    host.currentCastSource = castSource
    host.cancelPendingLiveReconnect()
    host.lastCastPositionMs = startPositionMs

    // Always bind the playback service while casting so the local mirror is
    // ready to take over on disconnect. Without this, a user who connects
    // Cast before any local play, then disconnects mid-track, lands in a
    // limbo state: native has no local player to restore, emits a bare idle
    // map without a sessionId, and JS keeps the previous status forever.
    //
    // Extract everything we need from the ReadableMap up front — RN may
    // recycle the bridge object once playOnCast returns, so the async
    // onReady closure has to work from snapshots, not the raw map.
    val mirrorHeaders = source.getHttpHeaders()
    val mirrorQuality = source.getSourceQuality()
    host.ensureServiceBound(
      onReady = ready@{
        // Skip if the cast target changed (or ended) while we were waiting
        // for the service to bind. Without these guards, a late-arriving
        // prep would either set up the wrong media (cast moved on) or
        // trigger state-change listeners after cast disconnected (cast is
        // no longer active, so the listener's isCastActive() suppression
        // doesn't fire and the mirror's prepare → buffering noise leaks
        // out as the user-facing playback state).
        if (host.currentCastSource?.id != mediaId) return@ready
        if (!isCastActive()) return@ready
        host.prepareLocalMirrorForCast(
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
    host.emitState("buffering")
    promise.resolve(getCastStatusMap("buffering"))
  }

  fun handOffLocalPlaybackToCast() {
    val castSource = host.currentCastSource ?: return
    val resolvedPlayer = host.boundService?.getCurrentPlayer()
    val startPositionMs = resolvedPlayer?.currentPosition ?: host.lastCastPositionMs
    val autoplay = resolvedPlayer?.isPlaying ?: true

    resolvedPlayer?.pause()
    try {
      loadCastSource(castSource, startPositionMs, autoplay)
      host.emitState("buffering")
    } catch (error: Exception) {
      val event = getCastStatusMap("error")
      event.putString("message", error.message ?: "Chromecast playback failed")
      host.emit("SamoAudioPlaybackState", event)
    }
  }

  fun loadCastSource(source: SamoCastSource, positionMs: Long, autoplay: Boolean) {
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
        val activeCastSource = host.currentCastSource
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
          host.emit("SamoAudioPlaybackState", event)
          return@post
        }

        if (autoplay) {
          try {
            remoteMediaClient.play()
            emitCastPlaybackState("buffering")
          } catch (error: Exception) {
            val event = getCastStatusMap("error")
            event.putString("message", error.message ?: "Chromecast playback failed")
            host.emit("SamoAudioPlaybackState", event)
          }
        } else {
          emitCastPlaybackState()
        }
      }
    }
  }

  fun emitCastPlaybackState(status: String? = null) {
    if (getActiveRemoteMediaClient() == null || host.currentCastSource == null) {
      host.syncCastNotificationState()
      return
    }

    host.emit("SamoAudioPlaybackState", getCastStatusMap(status))
    host.syncCastNotificationState()
  }

  fun getCastStatusMap(status: String? = null): WritableMap {
    val remoteMediaClient = getActiveRemoteMediaClient()
    val map = Arguments.createMap()
    val source = host.currentSource
    val duration = remoteMediaClient?.streamDuration ?: host.currentCastSource?.durationMs ?: -1L
    val position = remoteMediaClient?.approximateStreamPosition ?: host.lastCastPositionMs
    val resolvedStatus = status ?: getCurrentCastPlaybackStatus(remoteMediaClient)
    val castMap = Arguments.createMap()
    val session = castContext?.sessionManager?.currentCastSession

    map.putString("sessionId", host.currentSessionId)
    map.putString("status", resolvedStatus)
    map.putDouble("positionMs", position.toDouble())
    map.putDouble("durationMs", if (duration > 0) duration.toDouble() else -1.0)
    map.putBoolean("isPlaying", resolvedStatus == "playing" || resolvedStatus == "buffering")
    map.putMap("bitPerfect", SamoBitPerfect.getBitPerfectTruthMap(getCastBitPerfectTruth()))

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

  fun getCurrentCastPlaybackStatus(remoteMediaClient: RemoteMediaClient?): String {
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

  fun getCastSource(
    source: ReadableMap,
    localUrl: String,
    localMimeType: String?,
    title: String,
    subtitle: String?,
    artworkUrl: String?,
    mediaId: String
  ): SamoCastSource {
    val requestedCastUrl = source.getOptionalString("castUrl")
    val castUrl = when {
      requestedCastUrl != null && isNetworkUrl(requestedCastUrl) -> requestedCastUrl
      isNetworkUrl(localUrl) -> localUrl
      else -> requestedCastUrl ?: localUrl
    }
    val usesRequestedCastUrl = requestedCastUrl != null && castUrl == requestedCastUrl
    val castMimeType = getMediaItemMimeType(
      castUrl,
      source.getOptionalString("castMimeType") ?: localMimeType
    )
    val sourceLabel = source.getOptionalString("source")
    val castHeaders = source.getHttpHeaders("castHttpHeaders")
    val localHeaders = source.getHttpHeaders()

    return SamoCastSource(
      album = source.getOptionalString("album"),
      artworkUrl = source.getOptionalString("castArtworkUrl") ?: artworkUrl,
      durationMs = source.getOptionalDouble("durationSeconds")?.times(1000)?.toLong(),
      hasHttpHeaders = castHeaders.isNotEmpty() ||
        (!usesRequestedCastUrl && localHeaders.isNotEmpty()),
      id = mediaId,
      isLive = source.getOptionalBoolean("castIsLive")
        ?: source.getOptionalBoolean("isLive")
        ?: sourceLabel == "radio",
      mimeType = castMimeType,
      subtitle = source.getOptionalString("castSubtitle") ?: subtitle,
      title = source.getOptionalString("castTitle") ?: title,
      url = castUrl
    )
  }

  fun isNetworkUrl(url: String): Boolean {
    return url.startsWith("http://", ignoreCase = true) ||
      url.startsWith("https://", ignoreCase = true)
  }

  fun getInitialPositionMs(source: ReadableMap): Long {
    return source.getOptionalDouble("initialPositionSeconds")?.times(1000)?.toLong() ?: 0L
  }

  fun getCastContentType(url: String, mimeType: String?): String {
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

  fun getCastStateMap(state: Int? = null): WritableMap {
    val context = castContext
    val session = context?.sessionManager?.currentCastSession
    val resolvedState = state ?: context?.getCastState() ?: CastState.NO_DEVICES_AVAILABLE
    val map = Arguments.createMap()

    map.putString("status", getCastStateLabel(resolvedState))
    map.putBoolean("isConnected", session?.isConnected == true)
    map.putString("deviceName", session?.castDevice?.friendlyName)

    return map
  }

  fun getUnavailableCastStateMap(): WritableMap {
    val map = Arguments.createMap()

    map.putString("status", "unavailable")
    map.putBoolean("isConnected", false)
    return map
  }

  fun invalidate() {
    castContext?.let { context ->
      if (castListenersInstalled) {
        context.removeCastStateListener(castStateListener)
        context.sessionManager.removeSessionManagerListener(
          castSessionListener,
          CastSession::class.java,
        )
      }
    }
    detachRemoteMediaClient()
    castContext = null
    castContextInitializing = false
    castListenersInstalled = false
    pendingCastContextActions.clear()
  }

  private fun isCastActive(): Boolean =
    getActiveRemoteMediaClient() != null && host.currentCastSource != null

  fun getCastStateLabel(state: Int): String {
    return when (state) {
      CastState.CONNECTED -> "connected"
      CastState.CONNECTING -> "connecting"
      CastState.NOT_CONNECTED -> "not-connected"
      CastState.NO_DEVICES_AVAILABLE -> "no-devices"
      else -> "unavailable"
    }
  }
}

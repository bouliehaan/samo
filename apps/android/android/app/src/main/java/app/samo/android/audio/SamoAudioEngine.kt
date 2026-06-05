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
) : SamoPlaybackRecovery.Host, SamoAudioCastHost {
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
  private val networkMonitor = SamoNetworkMonitor(reactContext, mainHandler)
  private val recovery = SamoPlaybackRecovery(mainHandler, networkMonitor, this)
  private lateinit var castManager: SamoCastSessionManager

  override val boundService: SamoPlaybackService?
    get() = binder.boundService

  init {
    castManager = SamoCastSessionManager(reactContext, mainHandler, castExecutor, this)
    networkMonitor.start()
    // Bind position + duration suppliers ONCE at engine construction; the
    // closures resolve the current player every tick through the binder so
    // they keep working across service re-binds. SamoProgressSync drives its
    // own polling loop from these inside the foreground service process,
    // which is what makes "I closed the app and it forgot my spot" stop
    // happening — the JS 20s poll is irrelevant when JS is Doze-frozen.
    SamoProgressSync.bindPlayerSuppliers(
      position = { binder.boundService?.getCurrentPlayer()?.currentPosition ?: 0L },
      duration = { binder.boundService?.getCurrentPlayer()?.duration ?: -1L },
    )
    // Eagerly open the second reader on samo-catalog.db so the first Phase 2
    // PROPER / Phase 5 query doesn't pay the open cost. No-op when the JS-side
    // catalog hasn't created the file yet (fresh install with no Samo source).
    SamoCatalogDb.warm(reactContext)
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
  override var currentServerUrl: String? = null
  override var currentBearerToken: String? = null
  /** Engine-level recovery state. Overrides the player's ExoPlayer-derived
   *  status when set to anything other than Normal — that's how new states
   *  like "waiting_for_network" / "stale_auth" reach JS without polluting the
   *  player's own state machine. */
  private var engineMode: SamoPlaybackRecovery.Mode = SamoPlaybackRecovery.Mode.Normal
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
      val kind = source.getOptionalString("samoProgressKind")
      // Phase 2 PROPER: refresh through the kind/target path when the item
      // carries kind+targetId, even if the URL field is missing or stale.
      // Pre-Phase-2-PROPER queues (and radio) still take the URL-only path.
      if ((url != null && SamoNativeStreamUrl.isSamoStreamUrl(url)) || kind != null) {
        val map = SamoBridgeMapCopier.toHashMap(source)
        SamoNativeStreamUrl.refreshQueueItemAsync(reactContext, map) { result ->
          mainHandler.post {
            // For initial play we optimistically fall through to the original
            // URL on a mint failure — the existing JS-minted token may still
            // be valid. If it isn't, the player will surface a 401 and the
            // recovery layer takes over with a fresh mint + retry, or parks
            // the playback as WAITING_FOR_NETWORK if connectivity is gone.
            val itemToPlay = when (result) {
              is SamoNativeStreamUrl.RefreshResult.Ready -> result.item
              is SamoNativeStreamUrl.RefreshResult.MintFailed -> {
                Log.w(
                  "SamoAudio",
                  "play() mint failed (${result.reason}); using original URL",
                )
                result.originalItem
              }
              is SamoNativeStreamUrl.RefreshResult.NotApplicable -> result.item
            }
            playLocally(SamoBridgeMapCopier.toWritableMap(itemToPlay), promise)
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
      val updated = queue.syncNativePlaybackQueue(null)
      nativePlaybackQueue = updated
      reconcileExoPlaylistToQueue(updated)
      promise.resolve(Arguments.createMap())
    }
  }

  /**
   * Bring ExoPlayer's loaded playlist in line with an edited Up Next queue
   * (reorder / add-to-queue / play-next / remove) WITHOUT interrupting the
   * track that's currently playing. Only acts while a multi-item music/podcast
   * playlist is live — on a new play the player still holds the previous
   * content so the current id won't match the new queue, and we no-op.
   */
  private fun reconcileExoPlaylistToQueue(newQueue: SamoNativePlaybackQueue?) {
    if (isCastActive()) return
    val player = binder.boundService?.getCurrentPlayer() ?: return
    if (player.mediaItemCount <= 1) return
    if (newQueue == null || newQueue.items.size < 2) return
    if (!newQueue.items.all { val s = it["source"] as? String; s == "music" || s == "podcast" }) {
      return
    }

    val currentId = player.currentMediaItem?.mediaId ?: return
    val newCurrentIndex = newQueue.items.indexOfFirst { (it["id"] as? String) == currentId }
    if (newCurrentIndex < 0) {
      // The playing track is no longer in the queue (it was removed). Leave it
      // playing rather than hard-cutting; the next natural advance lands on
      // whatever follows in the player's existing list.
      return
    }

    val playerIndex = player.currentMediaItemIndex
    // Replace the "up next" tail first so items at/below the current index are
    // untouched while we do it; the currently-playing item is never replaced.
    val afterItems = newQueue.items.drop(newCurrentIndex + 1).map { buildMusicMediaItem(it) }
    player.replaceMediaItems(playerIndex + 1, player.mediaItemCount, afterItems)
    // Then reconcile the "history" head before the current item.
    val beforeItems = newQueue.items.take(newCurrentIndex).map { buildMusicMediaItem(it) }
    if (playerIndex > 0) {
      player.replaceMediaItems(0, playerIndex, beforeItems)
    } else if (beforeItems.isNotEmpty()) {
      player.addMediaItems(0, beforeItems)
    }

    newQueue.index = player.currentMediaItemIndex
    Log.i(
      "SamoAudio",
      "playlist reconciled size=${newQueue.items.size} current=${newQueue.index}",
    )
  }

  /**
   * Build a Media3 [MediaItem] from a mirrored native queue item (a HashMap
   * copied from the JS payload). Used to load the ENTIRE music queue at once so
   * ExoPlayer advances through it natively. The stream token baked into the
   * item's URL may be stale — [SamoResolvingDataSource] re-mints it when
   * ExoPlayer opens the source — so what matters here is the path/id, the
   * notification metadata, and the mime type.
   */
  private fun buildMusicMediaItem(item: HashMap<String, Any?>): MediaItem {
    val url = (item["url"] as? String).orEmpty()
    val mediaId = (item["id"] as? String) ?: url
    val title = (item["title"] as? String) ?: "Samo"
    val subtitle = item["subtitle"] as? String
    val artworkUrl = item["artworkUrl"] as? String
    val mimeType = getMediaItemMimeType(url, item["mimeType"] as? String)
    val metadataBuilder = MediaMetadata.Builder()
      .setTitle(title)
      .setArtist(subtitle)
    if (!artworkUrl.isNullOrBlank()) {
      metadataBuilder.setArtworkUri(Uri.parse(artworkUrl))
    }
    return MediaItem.Builder()
      .setMediaId(mediaId)
      .setMediaMetadata(metadataBuilder.build())
      .setMimeType(mimeType)
      .setUri(Uri.parse(url))
      .build()
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
      recovery.cancelPendingRetry()
      engineMode = SamoPlaybackRecovery.Mode.Normal
      currentServerUrl = source.getOptionalString("serverUrl")
      currentBearerToken = source.getOptionalString("serverBearerToken")
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
      // Music plays as a FULL native playlist: load every queue item so
      // ExoPlayer walks the whole queue itself — advancing track-to-track via
      // onMediaItemTransition with zero JS in the loop, so a locked phone keeps
      // playing for hours. SamoResolvingDataSource re-mints each track's token
      // at load. Audiobook / podcast / radio keep the single-item path.
      val trackPlaylist = nativePlaybackQueue?.takeIf { queue ->
        !isLiveStream &&
          (sourceLabel == "music" || sourceLabel == "podcast") &&
          queue.items.size > 1 &&
          queue.index in queue.items.indices &&
          // Discrete-file sources only (music + podcast episodes). Audiobook
          // (HLS / chapter seek) and radio keep the single-item path; their
          // tokens aren't re-minted by the music/podcast-scoped resolver.
          queue.items.all { val s = it["source"] as? String; s == "music" || s == "podcast" }
      }
      if (trackPlaylist != null) {
        val mediaItems = trackPlaylist.items.map { buildMusicMediaItem(it) }
        resolvedPlayer.setMediaItems(mediaItems, trackPlaylist.index, lastKnownPlaybackPositionMs)
        Log.i(
          "SamoAudio",
          "native playlist loaded count=${mediaItems.size} startIndex=${trackPlaylist.index}",
        )
      } else {
        resolvedPlayer.setMediaItem(mediaItem)
      }
      resolvedPlayer.prepare()
      resolvedPlayer.playWhenReady = true
      // Hand the new item to the native progress writer. Detach for the
      // outgoing item (if any) happens inside attach() — fires a "switch"
      // write for it before adopting the new context, so position is saved
      // before the auto-advance even starts loading the next URL.
      if (!isLiveStream) {
        SamoProgressSync.attach(source, sessionId, lastKnownPlaybackPositionMs)
      }
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
          if (recovery.handlePlayerError(resolvedPlayer, playerError)) {
            promise.resolve(getStatusMap(resolvedPlayer, "buffering"))
            return@withService
          }
        }
        // The user is asking to resume — if we were parked in waiting/stale
        // states, this is the cue to drop the override and follow the player.
        if (engineMode != SamoPlaybackRecovery.Mode.Normal) {
          recovery.cancelPendingRetry()
          engineMode = SamoPlaybackRecovery.Mode.Normal
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
        // Capture the seek point in the server-side progress immediately. Without
        // this, an audiobook listener who scrubs back 30s then immediately backgrounds
        // the app would have their seek reverted on next launch (the next poll write
        // wouldn't fire for up to 20s).
        SamoProgressSync.flushNow("seek")
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
        // Save the playhead before tearing down. completed=false because a
        // user-initiated stop is not the same as a track ending naturally.
        SamoProgressSync.detach(completed = false, reason = "stop")
        service.resetPlayerState()
        restoreNoisyHandlingNow(service.getCurrentPlayer())
        SamoBitPerfect.clearPreferredMixerAttributes(reactContext, service)
        recovery.cancelPendingRetry()
        engineMode = SamoPlaybackRecovery.Mode.Normal
        currentServerUrl = null
        currentBearerToken = null
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
      recovery.release()
      networkMonitor.stop()
      engineMode = SamoPlaybackRecovery.Mode.Normal
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
        // Propagate to the progress writer before any local state churn — the
        // false transition flushes the latest position so a hardware-button
        // pause + immediate kill never loses the playhead.
        if (!isCastActive()) {
          SamoProgressSync.setPlaying(isPlaying)
        }
        if (isPlaying) {
          // Stream is alive — give the next failure a fresh retry budget,
          // and drop any sticky recovery override (waiting_for_network etc.).
          recovery.onPlaybackHealthy()
          if (engineMode != SamoPlaybackRecovery.Mode.Normal) {
            engineMode = SamoPlaybackRecovery.Mode.Normal
          }
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
          // Fires the "submitted" write for the outgoing track BEFORE
          // requestQueueAdvanceFromEnded triggers attach() for the next one.
          // Music: increments play count. Audiobook/podcast: marks completed.
          SamoProgressSync.detach(completed = true, reason = "ended")
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
          SamoProgressSync.detach(completed = true, reason = "ended")
          emitState("ended")
          requestQueueAdvanceFromEnded("playbackStateChanged")
          return
        }
        emitState(getCurrentStatus(player))
      }

      override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        if (isCastActive()) return
        // setMediaItems() at play() time fires PLAYLIST_CHANGED — playLocally
        // already adopted the start track, so there's nothing to advance here.
        if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_PLAYLIST_CHANGED) return

        val queue = nativePlaybackQueue ?: return
        val newIndex = player.currentMediaItemIndex
        if (newIndex !in queue.items.indices) return

        // The OUTGOING track just finished. AUTO = natural end → submit the play
        // (music play-count / long-form completed). SEEK = user skip → no submit.
        val completed = reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO
        SamoProgressSync.detach(completed = completed, reason = if (completed) "ended" else "skip")

        // Adopt the new current track natively — no JS needed. getStatusMap
        // carries source.id + queueIndex, which JS reconciles when it next wakes
        // (shouldAcceptPlaybackEvent / syncPlaybackFromNativeEvent).
        queue.index = newIndex
        val newItem = queue.items[newIndex]
        currentServerUrl = newItem["serverUrl"] as? String
        currentBearerToken = newItem["serverBearerToken"] as? String
        currentMediaItem = mediaItem
        currentSource = SamoAudioSourceSnapshot(
          artworkUrl = newItem["artworkUrl"] as? String,
          id = (newItem["id"] as? String) ?: (currentSessionId ?: ""),
          source = newItem["source"] as? String,
          subtitle = newItem["subtitle"] as? String,
          title = (newItem["title"] as? String) ?: "Samo",
        )
        lastKnownPlaybackPositionMs = 0L
        lastAutoAdvanceSessionId = null

        // Re-negotiate bit-perfect for the new track's format. The
        // onAudioTrackInitialized listener recomputes the truth, but the actual
        // USB bit-perfect mixer REQUEST only happens here — so a mixed-sample-
        // rate queue stays lossless track-to-track instead of locking to the
        // first track's format. (No-op for same-format tracks / non-USB output.)
        val mixerService = binder.boundService
        currentQuality = SamoBridgeMapCopier.toWritableMap(HashMap(newItem)).getSourceQuality()
        if (mixerService != null) {
          SamoBitPerfect.clearPreferredMixerAttributes(reactContext, mixerService)
          currentBitPerfectTruth = buildBitPerfectTruth(
            audioTrackConfig = null,
            quality = currentQuality,
            requestPreferredMixer = true,
            service = mixerService,
          )
        }

        val sessionId = currentSessionId ?: UUID.randomUUID().toString().also {
          currentSessionId = it
        }
        // Started write for the new track. SamoProgressSync's position/duration
        // suppliers read the live player, so scrobbles land whether JS is awake
        // or Doze-frozen.
        // Podcast episodes resume where the listener left off; music tracks
        // start at 0. The resume offset rides in the queue payload, so seek the
        // new item to it (no-op for music — offset 0).
        val resumeMs = ((newItem["initialPositionSeconds"] as? Number)?.toLong()
          ?: (newItem["progressOffsetSeconds"] as? Number)?.toLong()
          ?: 0L).coerceAtLeast(0L) * 1000L
        if (resumeMs > 0L) {
          player.seekTo(resumeMs)
        }
        SamoProgressSync.attach(
          SamoBridgeMapCopier.toWritableMap(HashMap(newItem)),
          sessionId,
          resumeMs,
        )
        Log.i(
          "SamoAudio",
          "media transition index=$newIndex reason=$reason completed=$completed id=${newItem["id"]}",
        )
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

        // The recovery layer decides between auth-refresh, fast retry, HLS
        // relabel, parking for network, or surfacing as stale auth. It also
        // owns moving the engine into [Mode.WaitingForNetwork] etc., which
        // [applyRecoveryMode] sets as the sticky engineMode.
        if (recovery.handlePlayerError(player, error)) {
          return
        }

        // Recovery declined — this is an unrecoverable error. Pin the engine
        // mode so the next emitState() (e.g. a JS poll) keeps reporting error
        // until the user takes action (play again, reconnect, etc.).
        engineMode = SamoPlaybackRecovery.Mode.Error
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
    // status defaults via the SamoAudioCastHost interface; the override
    // restates the parameter explicitly so callers from outside the engine
    // (e.g. SamoCastSessionManager) keep working unchanged.
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

    SamoNativeStreamUrl.refreshQueueItemAsync(reactContext, item) { result ->
      mainHandler.post {
        val activeQueue = nativePlaybackQueue ?: return@post
        if (activeQueue.index != index) {
          return@post
        }

        // Native auto-advance: pick the freshest URL we have. A Network/Server
        // mint failure falls through to the original URL — the existing token
        // may still be valid. If it isn't, the player error path will route
        // through SamoPlaybackRecovery, which knows how to park for network
        // rather than burn retries on a stale URL.
        val refreshedItem = when (result) {
          is SamoNativeStreamUrl.RefreshResult.Ready -> result.item
          is SamoNativeStreamUrl.RefreshResult.MintFailed -> {
            Log.w(
              "SamoAudio",
              "auto-advance mint failed (${result.reason}); using original URL",
            )
            result.originalItem
          }
          is SamoNativeStreamUrl.RefreshResult.NotApplicable -> result.item
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
    // Sticky recovery-driven states override the ExoPlayer-derived one. While
    // the engine is parked WAITING_FOR_NETWORK / STALE_AUTH, that's what JS
    // needs to see — the player itself might be in STATE_IDLE or STATE_READY,
    // but neither of those tells the user *why* nothing is playing.
    when (engineMode) {
      SamoPlaybackRecovery.Mode.WaitingForNetwork -> return "waiting_for_network"
      SamoPlaybackRecovery.Mode.StaleAuth -> return "stale_auth"
      SamoPlaybackRecovery.Mode.Recovering -> return "buffering"
      SamoPlaybackRecovery.Mode.Error -> return "error"
      SamoPlaybackRecovery.Mode.Normal -> {} // fall through to player state
    }
    return when (resolvedPlayer.playbackState) {
      Player.STATE_BUFFERING -> "buffering"
      Player.STATE_ENDED -> "ended"
      Player.STATE_IDLE -> "idle"
      Player.STATE_READY -> if (resolvedPlayer.isPlaying) "playing" else "paused"
      else -> "idle"
    }
  }

  override fun applyRecoveryMode(mode: SamoPlaybackRecovery.Mode) {
    engineMode = mode
    // Push the new sticky status to JS right away — emitState picks up the
    // override via getCurrentStatus() when no explicit status is supplied.
    emitState(null)
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
    recovery.cancelPendingRetry()
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


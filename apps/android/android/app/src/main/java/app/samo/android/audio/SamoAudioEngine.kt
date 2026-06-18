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
import androidx.media3.common.TrackSelectionParameters
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
        // Session-stamped so JS can drop requests born under a session the
        // user has already navigated away from (see requestQueueAdvanceFromEnded).
        currentSessionId?.let { event.putString("sessionId", it) }
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

  // ---------------------------------------------------------------------------
  // UI position ticker. While the LOCAL player is playing and the app is in
  // the foreground, push a status event every second so the seek bar advances
  // off the same event stream as every other state change. This replaces the
  // JS-side 1-2s getStatusMap POLL — native is the source of truth, so native
  // pushes; JS never asks. (Cast emits its own progress via the Cast SDK's
  // ProgressListener; the background needs no ticks — nothing is looking.)
  // ---------------------------------------------------------------------------
  private val positionTickIntervalMs = 1000L
  private var positionTickerWanted = false
  private var hostInForeground = true
  private val positionTickerRunnable = object : Runnable {
    override fun run() {
      if (!positionTickerWanted || !hostInForeground) return
      emitState(null)
      mainHandler.postDelayed(this, positionTickIntervalMs)
    }
  }

  private fun rescheduleTicker() {
    mainHandler.removeCallbacks(positionTickerRunnable)
    if (positionTickerWanted && hostInForeground) {
      mainHandler.postDelayed(positionTickerRunnable, positionTickIntervalMs)
    }
  }

  private fun setPositionTickerWanted(wanted: Boolean) {
    if (positionTickerWanted == wanted) return
    positionTickerWanted = wanted
    rescheduleTicker()
  }

  fun onHostForegroundChanged(foreground: Boolean) {
    if (hostInForeground == foreground) return
    hostInForeground = foreground
    rescheduleTicker()
  }

  // ---------------------------------------------------------------------------
  // Long-session artwork freshness. The notification/AOD artwork URI carries
  // the stream token it was BUILT with; a single item longer than the token
  // TTL (any audiobook file, most podcast episodes) never crosses a track
  // transition, so the transition-time token freshen never runs and the OS's
  // next artwork re-fetch 401s — art goes grey mid-episode. While the LOCAL
  // player is playing, re-ensure the token every 10 minutes (well inside the
  // ~30-min TTL) and push the freshened URI into the current MediaItem's
  // metadata. Runs regardless of screen state — the lock screen is exactly
  // where this matters — via the same main-handler pattern as the progress
  // writer.
  // ---------------------------------------------------------------------------
  private val artworkFreshenIntervalMs = 10 * 60_000L
  private var artworkFreshenActive = false
  private val artworkFreshenRunnable = object : Runnable {
    override fun run() {
      if (!artworkFreshenActive) return
      val serverUrl = currentServerUrl
      val bearer = currentBearerToken
      if (!serverUrl.isNullOrBlank() && !bearer.isNullOrBlank() && !isCastActive()) {
        SamoNativeStreamUrl.ensureFreshTokenAsync(serverUrl, bearer) { ok ->
          if (ok) {
            mainHandler.post { freshenCurrentArtworkFromCache() }
          }
        }
      }
      mainHandler.postDelayed(this, artworkFreshenIntervalMs)
    }
  }

  private fun setArtworkFreshenActive(active: Boolean) {
    if (artworkFreshenActive == active) return
    artworkFreshenActive = active
    mainHandler.removeCallbacks(artworkFreshenRunnable)
    if (active) {
      mainHandler.postDelayed(artworkFreshenRunnable, artworkFreshenIntervalMs)
    }
  }

  /** Substitute a live token into the CURRENT item's artwork URI and republish
   *  its metadata — the same replaceMediaItem pattern the transition handler
   *  uses, applied periodically for items that outlive the token TTL. */
  private fun freshenCurrentArtworkFromCache() {
    val player = binder.boundService?.getCurrentPlayer() ?: return
    val mediaItem = player.currentMediaItem ?: return
    val staleArtworkUrl =
      currentSource?.artworkUrl
        ?: mediaItem.mediaMetadata.artworkUri?.toString()
        ?: return
    val freshened = SamoNativeStreamUrl.freshenUrlTokenFromCache(
      staleArtworkUrl,
      currentServerUrl,
      currentBearerToken,
    ) ?: return

    currentSource = currentSource?.copy(artworkUrl = freshened)
    val queue = nativePlaybackQueue
    if (queue != null && queue.index in queue.items.indices) {
      queue.items[queue.index]["artworkUrl"] = freshened
    }
    val updatedItem = mediaItem
      .buildUpon()
      .setMediaMetadata(
        mediaItem.mediaMetadata
          .buildUpon()
          .setArtworkUri(Uri.parse(freshened))
          .build(),
      )
      .build()
    currentMediaItem = updatedItem
    val index = player.currentMediaItemIndex
    if (index in 0 until player.mediaItemCount) {
      player.replaceMediaItem(index, updatedItem)
      Log.i("SamoAudio", "artwork token freshened mid-item index=$index")
    }
  }

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
      position = { binder.boundService?.getCurrentPlayer()?.currentPosition },
      duration = { binder.boundService?.getCurrentPlayer()?.duration },
    )
    SamoProgressSync.onPlaybackStalled = {
      mainHandler.post {
        val player = binder.boundService?.getCurrentPlayer()
        if (player != null) {
          val currentParams = player.trackSelectionParameters
          if (currentParams.audioOffloadPreferences.audioOffloadMode == TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_ENABLED) {
            Log.w("SamoAudio", "Watchdog tripped: Disabling audio offload to recover from stall.")
            player.trackSelectionParameters = currentParams.buildUpon()
              .setAudioOffloadPreferences(
                currentParams.audioOffloadPreferences.buildUpon()
                  .setAudioOffloadMode(TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_DISABLED)
                  .build()
              )
              .build()
            player.seekTo(player.currentPosition)
          }
        }
      }
    }
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

  /** True while playLocally is mid-teardown/load — see rememberPlaybackPosition. */
  private var playerLoadInFlight = false
  override var lastKnownPlaybackMediaId: String? = null
  override var currentServerUrl: String? = null
  override var currentBearerToken: String? = null
  /** Engine-level recovery state. Overrides the player's ExoPlayer-derived
   *  status when set to anything other than Normal — that's how new states
   *  like "waiting_for_network" / "stale_auth" reach JS without polluting the
   *  player's own state machine. */
  private var engineMode: SamoPlaybackRecovery.Mode = SamoPlaybackRecovery.Mode.Normal
  private var lastAutoAdvanceSessionId: String? = null
  /**
   * Monotonic stamp for playback commands (play / stop / queue nav). Async
   * URL-refresh callbacks capture the stamp at request time and only issue
   * their playLocally when it is still the NEWEST command — otherwise a slow
   * token mint for an abandoned tap would stomp the track the user actually
   * chose afterwards. Without this, every tap made while the server was slow
   * queued up behind the single-thread refresh executor and then REPLAYED in
   * order once it recovered ("everything I tried flashes through the screen").
   */
  private var playCommandSequence = 0L
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
      val commandId = ++playCommandSequence
      // A play() from JS defines a NEW playback context. When its payload
      // carries no queue (radio, single items), the PREVIOUS context's queue
      // mirror must die with it — synchronously, at command time. Keeping it
      // alive handed Next/auto-advance a list from a context the user already
      // left: play music → switch to radio → the stale MUSIC mirror lingered,
      // and any skip-shaped command then advanced into it (tap a podcast,
      // hear an old song while the UI shows the episode). Mirror-internal
      // plays (playQueueItemAt) call playLocally directly, not this entry
      // point, so native queue advance is unaffected.
      if (!source.hasKey("queueItems") || source.isNull("queueItems")) {
        nativePlaybackQueue = null
      }
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
            if (commandId != playCommandSequence) {
              // A newer play/stop/nav superseded this tap while its URL was
              // being refreshed. Dropping it is what keeps abandoned taps
              // from replaying late and stomping the user's actual choice.
              Log.i("SamoAudio", "dropping superseded play() command")
              promise.resolve(getLocalStatusMap())
              return@post
            }
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
    if (newQueue.index != newCurrentIndex) {
      // The incoming queue does NOT consider the currently-playing item its
      // current one — this is a context switch (a play() for a different
      // track is in flight), not an Up-Next edit. Editing the live playlist
      // and adopting the player's index here would race the pending play()
      // and could shift which track the new playlist starts on. Leave the
      // player alone; play() rebuilds everything atomically.
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
      // The intended start position lives in a LOCAL. stop()/clearMediaItems()
      // below flush their listener events SYNCHRONOUSLY (Media3 ListenerSet
      // runs inline when called from the application thread), and those
      // handlers run emitState → rememberPlaybackPosition — which saw the
      // OUTGOING item still current and overwrote lastKnownPlaybackPositionMs
      // with ITS playhead. That clobbered field was then passed to
      // setMediaItems as the new playlist's start position: shuffle a playlist
      // 14s into a song and song 1 starts at 0:14; come from 84 minutes of a
      // podcast and song 1 starts PAST ITS END — instant auto-advance, the
      // "always skips the first song" bug. The local can't be clobbered.
      val startPositionMs =
        source.getOptionalDouble("initialPositionSeconds")?.times(1000)?.toLong() ?: 0L
      playerLoadInFlight = true
      lastKnownPlaybackPositionMs = startPositionMs
      lastKnownPlaybackMediaId = mediaId
      service.preferredOutputDevice = getSelectedLocalOutputDevice()
      resolvedPlayer.setPreferredAudioDevice(service.preferredOutputDevice)
      installListenersIfNeeded(resolvedPlayer)
      if (shouldSuppressNoisyPauseForTrackLoad(service, quality)) {
        suppressNoisyHandlingForTrackStart(resolvedPlayer, sessionId)
      } else {
        restoreNoisyHandlingNow(resolvedPlayer)
      }

      // Detach the old session BEFORE we clear the player, otherwise its final
      // progress write will capture the cleared 0L position.
      SamoProgressSync.detach(completed = false, reason = "switch")

      suppressQueueAdvanceUntilMs = SystemClock.uptimeMillis() + 2500L

      val offloadMode = if (sourceLabel == "music") {
        TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_ENABLED
      } else {
        TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_DISABLED
      }
      resolvedPlayer.trackSelectionParameters = resolvedPlayer.trackSelectionParameters
        .buildUpon()
        .setAudioOffloadPreferences(
          TrackSelectionParameters.AudioOffloadPreferences.Builder()
            .setAudioOffloadMode(offloadMode)
            .setIsGaplessSupportRequired(sourceLabel == "music")
            .setIsSpeedChangeSupportRequired(false)
            .build()
        )
        .build()

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
      // Re-assert the start AFTER the teardown above — the synchronous event
      // flush may have clobbered the fields through rememberPlaybackPosition.
      lastKnownPlaybackPositionMs = startPositionMs
      lastKnownPlaybackMediaId = mediaId
      if (trackPlaylist != null) {
        val mediaItems = trackPlaylist.items.map { buildMusicMediaItem(it) }
        resolvedPlayer.setMediaItems(mediaItems, trackPlaylist.index, startPositionMs)
        Log.i(
          "SamoAudio",
          "native playlist loaded count=${mediaItems.size} " +
            "startIndex=${trackPlaylist.index} startPositionMs=$startPositionMs",
        )
      } else {
        resolvedPlayer.setMediaItem(mediaItem)
      }
      resolvedPlayer.prepare()
      resolvedPlayer.playWhenReady = true
      playerLoadInFlight = false
      // Hand the new item to the native progress writer. Detach for the
      // outgoing item (if any) happens inside attach() — fires a "switch"
      // write for it before adopting the new context, so position is saved
      // before the auto-advance even starts loading the next URL.
      if (!isLiveStream) {
        SamoProgressSync.attach(source, sessionId, startPositionMs)
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
      // Invalidate any play command still minting its URL — audio must never
      // resurrect after an explicit stop.
      playCommandSequence += 1
      setPositionTickerWanted(false)
      setArtworkFreshenActive(false)
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

      // Item-id gate. The session id is NOT enough: one session spans many
      // tracks (native queue advance reuses it), so during a transition a
      // metadata push computed from JS's not-yet-reconciled state passes the
      // session check while describing the PREVIOUS track. Applying it would
      // overwrite the new track's identity (`currentSource` + the MediaItem
      // metadata), native events would then re-emit the old id as truth, and
      // JS would reconcile backward — a circular state echo. The player's own
      // mediaId is the authority on "what is playing"; a push about any other
      // item is stale by definition and is dropped whole.
      val metadataItemId = metadata.getOptionalString("id")
      val playerMediaId =
        binder.boundService?.getCurrentPlayer()?.currentMediaItem?.mediaId
      if (
        !metadataItemId.isNullOrBlank() &&
        !playerMediaId.isNullOrBlank() &&
        metadataItemId != playerMediaId
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
        // Drive the foreground UI ticker off the real playback edge.
        setPositionTickerWanted(isPlaying && !isCastActive())
        // Artwork token upkeep for items that outlive the token TTL —
        // screen-state-independent (the lock screen is the point).
        setArtworkFreshenActive(isPlaying && !isCastActive())
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
        Log.i(
          "SamoAudio",
          "transition reason=$reason index=${player.currentMediaItemIndex} " +
            "pos=${player.currentPosition} id=${mediaItem?.mediaId}",
        )
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

        // Notification artwork freshness. The artwork URL on the queue item
        // (and on the playlist MediaItem) carries the stream token it was
        // BUILT with; a listening session longer than the token TTL (~30 min)
        // hands the notification an expired URL — the "album art goes grey
        // after a while" bug. The incoming track's stream open just minted via
        // SamoResolvingDataSource, so the token cache is warm: substitute the
        // fresh token synchronously (no network) and push it into the
        // MediaItem metadata the notification provider reads.
        val freshArtworkUrl = SamoNativeStreamUrl.freshenUrlTokenFromCache(
          newItem["artworkUrl"] as? String,
          currentServerUrl,
          currentBearerToken,
        )
        if (freshArtworkUrl != null) {
          newItem["artworkUrl"] = freshArtworkUrl
          if (mediaItem != null) {
            val updatedItem = mediaItem
              .buildUpon()
              .setMediaMetadata(
                mediaItem.mediaMetadata
                  .buildUpon()
                  .setArtworkUri(Uri.parse(freshArtworkUrl))
                  .build(),
              )
              .build()
            currentMediaItem = updatedItem
            // Metadata-only replace of the current item; same URI, so Media3
            // keeps playback rolling (the established updateNowPlayingMetadata
            // pattern). The follow-up PLAYLIST_CHANGED transition is ignored
            // by the early-return at the top of this handler.
            player.replaceMediaItem(newIndex, updatedItem)
          }
        }

        currentSource = SamoAudioSourceSnapshot(
          artworkUrl = freshArtworkUrl ?: (newItem["artworkUrl"] as? String),
          id = (newItem["id"] as? String) ?: (currentSessionId ?: ""),
          source = newItem["source"] as? String,
          subtitle = newItem["subtitle"] as? String,
          title = (newItem["title"] as? String) ?: "Samo",
        )
        lastKnownPlaybackPositionMs = 0L
        lastKnownPlaybackMediaId = mediaItem?.mediaId
        lastAutoAdvanceSessionId = null

        val incomingSource = newItem["source"] as? String
        val offloadMode = if (incomingSource == "music") {
          TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_ENABLED
        } else {
          TrackSelectionParameters.AudioOffloadPreferences.AUDIO_OFFLOAD_MODE_DISABLED
        }
        val currentParams = player.trackSelectionParameters
        if (currentParams.audioOffloadPreferences.audioOffloadMode != offloadMode) {
          player.trackSelectionParameters = currentParams.buildUpon()
            .setAudioOffloadPreferences(
              TrackSelectionParameters.AudioOffloadPreferences.Builder()
                .setAudioOffloadMode(offloadMode)
                .setIsGaplessSupportRequired(incomingSource == "music")
                .setIsSpeedChangeSupportRequired(false)
                .build()
            )
            .build()
        }

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
        // Podcast episodes resume where the listener left off — the resume
        // rides in the queue payload. A MUSIC track entering via transition
        // starts at 0 unconditionally: queue slots can carry a leftover
        // `initialPositionSeconds` from an earlier same-item recovery restart,
        // and honoring it here is how a skipped song's progress leaked into the
        // next track's start position.
        val resumeMs = if ((newItem["source"] as? String) == "podcast") {
          ((newItem["initialPositionSeconds"] as? Number)?.toLong()
            ?: (newItem["progressOffsetSeconds"] as? Number)?.toLong()
            ?: 0L).coerceAtLeast(0L) * 1000L
        } else {
          0L
        }
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

        rememberPlaybackPosition(player)

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
      rememberPlaybackPosition(resolvedPlayer)
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
    // Session-stamped: this request means "session X's queue can't advance
    // natively". If the user starts a NEW context before JS consumes it, the
    // request must die with its session — un-stamped requests were consumed
    // against the FRESH queue and advanced it off its first track (the
    // "shuffle always skips song 1 right after something ended" bug; a slow
    // token mint widened the race to ~30s).
    event.putString("sessionId", sessionId)
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

  /**
   * Play the queue entry at [index] — THE navigation primitive every entry
   * point shares (full-screen player Next/Prev, Up Next tap, and via
   * [SamoForwardingPlayer] the lock screen / Bluetooth buttons, which step the
   * same playlist directly).
   *
   * When ExoPlayer holds the real multi-item playlist this is an atomic
   * `seekTo(index, 0)` on the live player: gapless, instant, no teardown, no
   * second session — `onMediaItemTransition` does all bookkeeping exactly as it
   * does for a lock-screen skip. When the player is in single-item mode
   * (multi-file audiobooks, queues with a book in them), it falls back to the
   * mirror-queue advance ([playQueueItemAt] → token refresh → playLocally).
   *
   * Resolves a status map plus `handled: false` when this engine can't take the
   * command (casting, no queue, index out of range) so JS can fall back to its
   * own restart path.
   *
   * [expectedMediaId] guards against a momentarily stale JS index: when
   * provided, the target is located by media id if the indexed slot doesn't
   * match — the id is the authority, the index is a hint.
   */
  fun playQueueIndex(index: Int, expectedMediaId: String?, promise: Promise) {
    mainHandler.post {
      if (castManager.getActiveRemoteMediaClient() != null) {
        val map = castManager.getCastStatusMap()
        map.putBoolean("handled", false)
        promise.resolve(map)
        return@post
      }

      val resolvedPlayer = binder.boundService?.getCurrentPlayer()
      val queue = nativePlaybackQueue

      if (resolvedPlayer != null && resolvedPlayer.mediaItemCount > 1) {
        var target = index
        if (
          target !in 0 until resolvedPlayer.mediaItemCount ||
          (expectedMediaId != null &&
            resolvedPlayer.getMediaItemAt(target).mediaId != expectedMediaId)
        ) {
          target = if (expectedMediaId == null) {
            -1
          } else {
            (0 until resolvedPlayer.mediaItemCount).firstOrNull {
              resolvedPlayer.getMediaItemAt(it).mediaId == expectedMediaId
            } ?: -1
          }
        }
        if (target in 0 until resolvedPlayer.mediaItemCount) {
          // This nav is the newest command; invalidate any older play() still
          // minting so it can't replay over the user's navigation.
          playCommandSequence += 1
          installListenersIfNeeded(resolvedPlayer)
          resolvedPlayer.seekTo(target, 0L)
          // After an unrecoverable error the player parks in IDLE with the
          // playlist intact; prepare() revives it on the new index.
          if (resolvedPlayer.playbackState == Player.STATE_IDLE) {
            resolvedPlayer.prepare()
          }
          resolvedPlayer.playWhenReady = true
          queue?.index = target
          Log.i("SamoAudio", "queue nav (playlist) index=$target id=$expectedMediaId")
          val map = getStatusMap(resolvedPlayer)
          map.putBoolean("handled", true)
          promise.resolve(map)
          return@post
        }
      }

      // Single-item player with a mirrored multi-item queue: the heavy path
      // (refresh URL → playLocally) is still one native owner, same as a
      // background auto-advance.
      val mirrorIndex = when {
        queue == null -> -1
        expectedMediaId != null -> {
          val byId = queue.items.indexOfFirst { (it["id"] as? String) == expectedMediaId }
          if (byId >= 0) byId else if (index in queue.items.indices) index else -1
        }
        index in queue.items.indices -> index
        else -> -1
      }
      val handled = mirrorIndex >= 0 && playQueueItemAt(mirrorIndex)
      if (handled) {
        Log.i("SamoAudio", "queue nav (mirror) index=$mirrorIndex id=$expectedMediaId")
      }
      val map = if (resolvedPlayer != null) getStatusMap(resolvedPlayer) else getIdleStatusMap()
      map.putBoolean("handled", handled)
      promise.resolve(map)
    }
  }

  private fun playQueueItemAt(index: Int): Boolean {
    val queue = nativePlaybackQueue ?: return false
    val item = queue.items.getOrNull(index) ?: return false
    queue.index = index
    val commandId = ++playCommandSequence

    SamoNativeStreamUrl.refreshQueueItemAsync(reactContext, item) { result ->
      mainHandler.post {
        if (commandId != playCommandSequence) {
          // A newer play/stop/nav arrived while this advance was minting.
          return@post
        }
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

  /**
   * Remember the live playhead for recovery, scoped to the item it belongs to.
   * Within one item the value is monotonic (a stale low echo can't shrink it);
   * across items it RESETS. The previous unscoped `maxOf` was a stale-position
   * carrier: track A's 52s could survive into track B's recovery resume.
   */
  private fun rememberPlaybackPosition(resolvedPlayer: ExoPlayer) {
    // While playLocally is tearing down/loading, the player's (mediaId,
    // position) pair transiently describes the OUTGOING item — remembering it
    // would poison the recovery position for the INCOMING one (and, before
    // the startPositionMs local existed, poisoned the playlist start itself).
    if (playerLoadInFlight) return
    val mediaId = resolvedPlayer.currentMediaItem?.mediaId ?: return
    val positionMs = resolvedPlayer.currentPosition.coerceAtLeast(0L)
    if (mediaId != lastKnownPlaybackMediaId) {
      lastKnownPlaybackMediaId = mediaId
      lastKnownPlaybackPositionMs = positionMs
    } else if (positionMs > 0) {
      lastKnownPlaybackPositionMs = maxOf(lastKnownPlaybackPositionMs, positionMs)
    }
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
    binder.boundService?.setRecoveryActive(mode == SamoPlaybackRecovery.Mode.Recovering)
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
    // ATOMIC IDENTITY: read what's playing and where it is from the SAME
    // object — the player — in one synchronous main-thread pass. The engine's
    // own `currentSource`/`currentSessionId` vars are mutated at command time
    // and by listener callbacks, so during a transition they can lag (or lead)
    // the player's real timeline; pairing them with a live `currentPosition`
    // read used to produce events that named track A with track B's playhead.
    // Every downstream JS heuristic (foreign-event guard, track-start anchor,
    // backward guard) existed to survive that mislabeling. Deriving the source
    // from `currentMediaItem.mediaId` makes the (id, position) pair consistent
    // by construction; `currentSource` remains the fallback for items that
    // aren't in the mirrored queue (radio, cast hand-off, recovered sessions).
    val playerItem = resolvedPlayer.currentMediaItem
    val playerMediaId = playerItem?.mediaId
    val snapshot = currentSource
    val source =
      if (playerMediaId != null && snapshot?.id != playerMediaId) {
        nativePlaybackQueue?.items
          ?.firstOrNull { (it["id"] as? String) == playerMediaId }
          ?.let { item ->
            SamoAudioSourceSnapshot(
              artworkUrl = item["artworkUrl"] as? String,
              id = playerMediaId,
              source = item["source"] as? String,
              subtitle = item["subtitle"] as? String,
              title = (item["title"] as? String) ?: "Samo",
            )
          } ?: snapshot
      } else {
        snapshot
      }
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
      // Same atomicity rule for the index: when the player holds the real
      // playlist, its own index is the truth at this instant; the mirror's
      // index is only updated by the (async-dispatched) transition callback.
      val queueIndex =
        if (resolvedPlayer.mediaItemCount > 1) resolvedPlayer.currentMediaItemIndex else queue.index
      map.putInt("queueIndex", queueIndex)
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


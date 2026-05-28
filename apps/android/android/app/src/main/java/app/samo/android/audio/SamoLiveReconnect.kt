package app.samo.android.audio

import android.os.Handler
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.exoplayer.ExoPlayer

internal class SamoLiveReconnect(
  private val mainHandler: Handler,
  private val host: Host,
) {
  interface Host {
    var currentMediaItem: MediaItem?
    var currentHlsFallbackAttempted: Boolean
    val currentSource: SamoAudioSourceSnapshot?
    var lastKnownPlaybackPositionMs: Long
    fun emitState(status: String? = null)
  }

  private var liveReconnectAttempts = 0
  private var pendingLiveReconnect: Runnable? = null

  val hlsFallbackErrorCodes = setOf(
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
  private val maxLiveReconnectAttempts = 5

  /**
   * Network-class errors that benefit from a full prepare()-with-saved-position
   * retry. Anything outside this set (e.g. codec/format errors) won't recover
   * by retrying — looping prepare on a bad file just masks the underlying issue.
   */
  private val networkReconnectErrorCodes = setOf(
    PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
    PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT,
    PlaybackException.ERROR_CODE_IO_UNSPECIFIED,
    PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS,
    PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE,
    PlaybackException.ERROR_CODE_IO_NO_PERMISSION,
    PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW,
    PlaybackException.ERROR_CODE_REMOTE_ERROR,
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
  fun scheduleAutoReconnect(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    if (liveReconnectAttempts >= maxLiveReconnectAttempts) return false
    val item = host.currentMediaItem ?: return false
    val source = host.currentSource?.source

    val isLive = source == "radio"
    if (!isLive && error.errorCode !in networkReconnectErrorCodes) {
      // For on-demand tracks, only retry transient network failures.
      return false
    }

    liveReconnectAttempts += 1
    val attempt = liveReconnectAttempts
    val savedPositionMs = if (isLive) {
      0L
    } else {
      val fromPlayer = resolvedPlayer.currentPosition.coerceAtLeast(0L)
      maxOf(fromPlayer, host.lastKnownPlaybackPositionMs)
    }
    Log.w(
      "SamoAudio",
      "${source ?: "unknown"} stream error (${error.errorCodeName}); reconnect attempt $attempt/$maxLiveReconnectAttempts at ${savedPositionMs}ms"
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
      if (host.currentMediaItem !== item) return@Runnable
      resolvedPlayer.stop()
      resolvedPlayer.clearMediaItems()
      resolvedPlayer.setMediaItem(item)
      resolvedPlayer.prepare()
      if (savedPositionMs > 0) {
        resolvedPlayer.seekTo(savedPositionMs)
      }
      resolvedPlayer.playWhenReady = true
      if (savedPositionMs > 0) {
        host.lastKnownPlaybackPositionMs = savedPositionMs
      }
      host.emitState("buffering")
    }
    pendingLiveReconnect = reconnect
    mainHandler.postDelayed(reconnect, delayMs)
    host.emitState("buffering")
    return true
  }

  fun hasPendingReconnect(): Boolean = pendingLiveReconnect != null

  fun cancelPendingLiveReconnect() {
    pendingLiveReconnect?.let { mainHandler.removeCallbacks(it) }
    pendingLiveReconnect = null
    liveReconnectAttempts = 0
  }

  fun resetAttempts() {
    liveReconnectAttempts = 0
  }

  /**
   * Errors that frequently signal "this is actually an HLS stream the
   * default sniffer didn't recognize." Most internet-radio aggregators
   * (and a chunk of ABS-transcoded audiobook output) serve HLS playlists
   * with mislabeled Content-Type headers, or use just enough non-standard
   * container framing to fail the progressive parser. Retrying once as
   * HLS recovers from all of these cheaply.
   */
  fun retryCurrentSourceAsHls(
    resolvedPlayer: ExoPlayer,
    error: PlaybackException
  ): Boolean {
    val mediaItem = host.currentMediaItem ?: return false

    if (host.currentHlsFallbackAttempted || error.errorCode !in hlsFallbackErrorCodes) {
      return false
    }

    host.currentHlsFallbackAttempted = true
    host.currentMediaItem = mediaItem.buildUpon()
      .setMimeType(MimeTypes.APPLICATION_M3U8)
      .build()

    Log.w("SamoAudio", "Retrying current source as HLS after ${error.errorCodeName}.")
    resolvedPlayer.stop()
    resolvedPlayer.clearMediaItems()
    resolvedPlayer.setMediaItem(host.currentMediaItem!!)
    resolvedPlayer.prepare()
    resolvedPlayer.playWhenReady = true
    host.emitState("buffering")
    return true
  }
}

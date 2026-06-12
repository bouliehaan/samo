package app.samo.android.audio

import android.net.Uri
import android.os.Handler
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.ExoPlayer

/**
 * Owns recovery from ExoPlayer errors. Knows the difference between four kinds
 * of failure and reacts to each at the source — the player no longer just
 * "retries five times then gives up", which was the band-aid behind every
 * "podcast died screen-off" / "queue stalled after a few tracks" report.
 *
 * Failure taxonomy:
 *
 *  - **Auth (401/403)** — the stream token expired mid-track. Mint a new one
 *    via [SamoNativeStreamUrl], rewrite the URL, re-prepare from the saved
 *    position. ONE auth-retry per source — if mint still fails after that,
 *    the bearer is genuinely dead and we surface as [Mode.StaleAuth].
 *
 *  - **Network with the network up** — transient blip (Wi-Fi handoff, brief
 *    interference). Quick exponential retry up to a small budget; the player
 *    usually wins on retry #1 once the radio stabilizes.
 *
 *  - **Network with the network DOWN** — pocketed podcast, dead spot. Don't
 *    burn any retries. Park as [Mode.WaitingForNetwork] and wait for
 *    [SamoNetworkMonitor] to fire `onAvailable`. Resume from the saved
 *    position the instant it does.
 *
 *  - **Container / parse errors** — the response was not what we expected.
 *    Try the HLS-relabel rescue once; if that also fails, bubble to the user.
 *    Retrying a malformed body doesn't fix anything.
 *
 * The recovery layer owns no state visible to JS. It decides what to do and
 * calls back into the [Host] to apply the decision. The engine is what JS
 * sees.
 */
internal class SamoPlaybackRecovery(
    private val mainHandler: Handler,
    private val networkMonitor: SamoNetworkMonitor,
    private val host: Host,
) {
    enum class Mode {
        /** Normal playback; the player owns the visible state. */
        Normal,

        /** A retry is scheduled or in flight (auth refresh, fast network retry,
         *  HLS relabel). The engine should show "buffering" to JS. */
        Recovering,

        /** Network is gone; parked until it comes back. */
        WaitingForNetwork,

        /** Bearer token was rejected by the server; cannot recover natively. */
        StaleAuth,

        /** Unrecoverable error. Bubble to JS. */
        Error,
    }

    interface Host {
        var currentMediaItem: MediaItem?
        var currentHlsFallbackAttempted: Boolean
        val currentSource: SamoAudioSourceSnapshot?
        var lastKnownPlaybackPositionMs: Long

        /** Which media item [lastKnownPlaybackPositionMs] belongs to. A saved
         *  position is only meaningful for the item it was observed on —
         *  honoring it across items is how one track's playhead leaked into
         *  another's recovery resume. */
        var lastKnownPlaybackMediaId: String?

        /** Credentials needed to mint a fresh stream token for the current item. */
        val currentServerUrl: String?
        val currentBearerToken: String?

        /** Apply a recovery mode transition to the engine. The engine routes
         *  this through its own state machine and pushes the right status
         *  string to JS. */
        fun applyRecoveryMode(mode: Mode)
    }

    private val hlsFallbackErrorCodes = setOf(
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED,
        PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED,
        PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED,
        PlaybackException.ERROR_CODE_IO_INVALID_HTTP_CONTENT_TYPE,
    )

    private val networkClassErrorCodes = setOf(
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
        PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT,
        PlaybackException.ERROR_CODE_IO_UNSPECIFIED,
        PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE,
        PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW,
        PlaybackException.ERROR_CODE_REMOTE_ERROR,
    )

    private val maxFastReconnectAttempts = 5
    private var fastReconnectAttempts = 0
    private var pendingRetry: Runnable? = null
    private var authRefreshInFlight = false
    private var authRetryUsedForMediaItem: MediaItem? = null

    /** True when the engine asked us to park because the network is gone. */
    private var parkedWaitingForNetwork = false

    private val networkListener = SamoNetworkMonitor.Listener {
        if (!parkedWaitingForNetwork) return@Listener
        val player = pendingPlayerRef ?: return@Listener
        Log.i("SamoAudio", "network restored — resuming parked playback")
        parkedWaitingForNetwork = false
        retryFromSavedPosition(player)
    }

    /** Tracks the player ExoPlayer instance for the network-monitor wake-up. */
    private var pendingPlayerRef: ExoPlayer? = null

    init {
        networkMonitor.addListener(networkListener)
    }

    /**
     * Called by the engine from its `onPlayerError` listener. Returns true if
     * recovery took the error; the engine should not surface it. Returns false
     * if recovery declines (parse error after HLS rescue already tried, etc.);
     * the engine should bubble the error to JS.
     */
    fun handlePlayerError(
        resolvedPlayer: ExoPlayer,
        error: PlaybackException,
    ): Boolean {
        val item = host.currentMediaItem ?: return false
        pendingPlayerRef = resolvedPlayer

        // 1) HLS-relabel rescue. Some live/HLS streams arrive with the wrong
        //    Content-Type; ExoPlayer's default sniffer rejects them. Re-prepare
        //    as HLS once. If the relabel was already tried for this source,
        //    fall through to the other classifiers.
        if (
            error.errorCode in hlsFallbackErrorCodes &&
            !host.currentHlsFallbackAttempted
        ) {
            host.currentHlsFallbackAttempted = true
            val relabeled = item.buildUpon()
                .setMimeType(MimeTypes.APPLICATION_M3U8)
                .build()
            host.currentMediaItem = relabeled
            Log.w("SamoAudio", "HLS relabel retry for ${error.errorCodeName}")
            cancelPendingRetry()
            host.applyRecoveryMode(Mode.Recovering)
            prepareFromSavedPosition(resolvedPlayer, relabeled, 0L)
            return true
        }

        // 2) Auth (401/403) — refresh token, retry once with the new URL.
        if (isAuthFailure(error)) {
            return handleAuthFailure(resolvedPlayer, item)
        }

        // 3) Network class — branch on whether the network is actually up.
        if (error.errorCode in networkClassErrorCodes || isProbablyNetworkClass(error)) {
            if (!networkMonitor.isOnline()) {
                Log.i(
                    "SamoAudio",
                    "playback parked: waiting for network (${error.errorCodeName})",
                )
                parkRecovery(Mode.WaitingForNetwork)
                return true
            }
            return scheduleFastRetry(resolvedPlayer, error)
        }

        return false
    }

    /** A successful play-through resets the budget; the next failure gets a
     *  fresh full set of attempts. */
    fun onPlaybackHealthy() {
        fastReconnectAttempts = 0
        authRetryUsedForMediaItem = null
        if (parkedWaitingForNetwork) {
            // Player started playing without going through our retry path —
            // a JS-initiated play() probably re-prepared the item. Drop the
            // park flag so future error handling starts fresh.
            parkedWaitingForNetwork = false
        }
    }

    fun cancelPendingRetry() {
        pendingRetry?.let { mainHandler.removeCallbacks(it) }
        pendingRetry = null
        fastReconnectAttempts = 0
        // A user-driven action (play, resume, stop) is asking us to drop any
        // parked state. The network-restored listener will be a no-op until
        // [parkRecovery] sets the flag again on the next failure.
        parkedWaitingForNetwork = false
    }

    fun release() {
        cancelPendingRetry()
        networkMonitor.removeListener(networkListener)
        pendingPlayerRef = null
        parkedWaitingForNetwork = false
    }

    /** True while a retry runnable is scheduled. */
    fun hasPendingRetry(): Boolean = pendingRetry != null

    private fun handleAuthFailure(
        resolvedPlayer: ExoPlayer,
        item: MediaItem,
    ): Boolean {
        if (authRetryUsedForMediaItem === item) {
            // We already minted a fresh token for this item once and it STILL
            // came back 401. The bearer is dead — surface to JS instead of
            // hammering the auth endpoint.
            Log.w("SamoAudio", "auth retry already used for current item; surfacing")
            parkRecovery(Mode.StaleAuth)
            return true
        }
        if (authRefreshInFlight) {
            // Another auth refresh is in flight; the recovery from that one
            // will set everything straight. Don't pile on.
            return true
        }
        val sourceUrl = item.localConfiguration?.uri?.toString() ?: return false
        val serverUrl = host.currentServerUrl
        val bearer = host.currentBearerToken
        if (serverUrl.isNullOrBlank() || bearer.isNullOrBlank()) {
            // No bearer in the descriptor — we can't mint here. Surface so JS
            // can refresh and reissue play().
            parkRecovery(Mode.StaleAuth)
            return true
        }

        authRefreshInFlight = true
        host.applyRecoveryMode(Mode.Recovering)
        SamoNativeStreamUrl.refreshUrlAuthAsync(sourceUrl, serverUrl, bearer) { result ->
            mainHandler.post {
                authRefreshInFlight = false
                if (host.currentMediaItem !== item) {
                    // Source switched out from under us while we were minting;
                    // discard, the new prepare path owns it.
                    return@post
                }
                when (result) {
                    is SamoNativeStreamUrl.RefreshResult.Ready -> {
                        val newUrl = result.item["url"] as? String
                        if (newUrl.isNullOrBlank()) {
                            parkRecovery(Mode.Error)
                            return@post
                        }
                        authRetryUsedForMediaItem = item
                        val refreshedItem = item.buildUpon()
                            .setUri(Uri.parse(newUrl))
                            .build()
                        host.currentMediaItem = refreshedItem
                        val savedPositionMs =
                            computeSavedPositionMs(resolvedPlayer, refreshedItem)
                        prepareFromSavedPosition(
                            resolvedPlayer,
                            refreshedItem,
                            savedPositionMs,
                        )
                    }
                    is SamoNativeStreamUrl.RefreshResult.MintFailed -> {
                        when (result.reason) {
                            SamoNativeStreamUrl.MintFailureReason.Network -> {
                                Log.i(
                                    "SamoAudio",
                                    "auth refresh hit network error; parking for network",
                                )
                                parkRecovery(Mode.WaitingForNetwork)
                            }
                            SamoNativeStreamUrl.MintFailureReason.Auth -> {
                                Log.w("SamoAudio", "bearer rejected during auth refresh")
                                parkRecovery(Mode.StaleAuth)
                            }
                            SamoNativeStreamUrl.MintFailureReason.Server,
                            SamoNativeStreamUrl.MintFailureReason.MissingCredentials,
                            -> {
                                parkRecovery(Mode.Error)
                            }
                        }
                    }
                    is SamoNativeStreamUrl.RefreshResult.NotApplicable -> {
                        // Auth error on a non-Samo URL — nothing we can do
                        // natively. Bubble up.
                        parkRecovery(Mode.Error)
                    }
                }
            }
        }
        return true
    }

    private fun scheduleFastRetry(
        resolvedPlayer: ExoPlayer,
        error: PlaybackException,
    ): Boolean {
        val item = host.currentMediaItem ?: return false
        if (fastReconnectAttempts >= maxFastReconnectAttempts) {
            if (networkMonitor.isOnline() && isProbablyNetworkClass(error)) {
                // The device's network is UP and the server keeps answering
                // with an HTTP error (5xx from the Samo proxy — e.g. it can't
                // reach the podcast CDN). Waiting for a network event would
                // never resolve that; parking as "waiting for network" showed
                // the user an infinite silent spinner while their connection
                // was fine. Surface a real error instead.
                Log.w(
                    "SamoAudio",
                    "server error persisted after retries (${error.errorCodeName}); surfacing",
                )
                parkRecovery(Mode.Error)
                return true
            }
            // Connection-class failure with the network nominally "online" —
            // could be a captive-portal-style false positive. Park as
            // waiting-for-network; we'll retry the moment any new network
            // event arrives, instead of looping noisily.
            Log.i(
                "SamoAudio",
                "fast reconnect budget exhausted (${error.errorCodeName}); parking",
            )
            parkRecovery(Mode.WaitingForNetwork)
            return true
        }

        fastReconnectAttempts += 1
        val attempt = fastReconnectAttempts
        val savedPositionMs = computeSavedPositionMs(resolvedPlayer, item)
        Log.w(
            "SamoAudio",
            "network retry $attempt/$maxFastReconnectAttempts (${error.errorCodeName}) at ${savedPositionMs}ms",
        )

        val delayMs = when (attempt) {
            1 -> 500L
            2 -> 1_500L
            3 -> 3_000L
            else -> 5_000L
        }

        cancelPendingRetry()
        host.applyRecoveryMode(Mode.Recovering)
        val retry = Runnable {
            pendingRetry = null
            if (host.currentMediaItem !== item) return@Runnable
            prepareFromSavedPosition(resolvedPlayer, item, savedPositionMs)
        }
        pendingRetry = retry
        mainHandler.postDelayed(retry, delayMs)
        return true
    }

    private fun parkRecovery(mode: Mode) {
        cancelPendingRetry()
        parkedWaitingForNetwork = mode == Mode.WaitingForNetwork
        host.applyRecoveryMode(mode)
    }

    private fun retryFromSavedPosition(resolvedPlayer: ExoPlayer) {
        val item = host.currentMediaItem ?: return
        val savedPositionMs = computeSavedPositionMs(resolvedPlayer, item)
        Log.i(
            "SamoAudio",
            "network restored — resuming ${host.currentSource?.source} at ${savedPositionMs}ms",
        )
        host.applyRecoveryMode(Mode.Recovering)
        prepareFromSavedPosition(resolvedPlayer, item, savedPositionMs)
    }

    private fun prepareFromSavedPosition(
        resolvedPlayer: ExoPlayer,
        item: MediaItem,
        savedPositionMs: Long,
    ) {
        val currentIndex = resolvedPlayer.currentMediaItemIndex
        if (
            resolvedPlayer.mediaItemCount > 1 &&
            currentIndex >= 0 &&
            currentIndex < resolvedPlayer.mediaItemCount
        ) {
            // The player holds the real multi-item playlist (music/podcast
            // queue). stop()+clearMediaItems() here would silently collapse it
            // to single-item mode for the rest of the session — every later
            // Next degrades from an atomic playlist step to a full
            // mint+teardown+rebuild, and gapless prebuffering is lost. That
            // collapse compounding over hours was a big part of "playback gets
            // worse the longer the app is open." Swap the (possibly URL-
            // refreshed) item in place and re-prepare with the playlist intact.
            resolvedPlayer.replaceMediaItem(currentIndex, item)
            resolvedPlayer.seekTo(currentIndex, savedPositionMs.coerceAtLeast(0L))
            resolvedPlayer.prepare()
            resolvedPlayer.playWhenReady = true
        } else {
            resolvedPlayer.stop()
            resolvedPlayer.clearMediaItems()
            resolvedPlayer.setMediaItem(item)
            resolvedPlayer.prepare()
            if (savedPositionMs > 0) {
                resolvedPlayer.seekTo(savedPositionMs)
            }
            resolvedPlayer.playWhenReady = true
        }
        if (savedPositionMs > 0) {
            host.lastKnownPlaybackPositionMs = savedPositionMs
            host.lastKnownPlaybackMediaId = item.mediaId
        }
    }

    private fun computeSavedPositionMs(player: ExoPlayer, item: MediaItem): Long {
        val isLive = host.currentSource?.source == "radio"
        if (isLive) return 0L
        val fromPlayer = player.currentPosition.coerceAtLeast(0L)
        // Only honor the remembered position when it was observed on THIS item;
        // a cross-item max would resume the new track at the old track's time.
        val remembered =
            if (host.lastKnownPlaybackMediaId == item.mediaId) {
                host.lastKnownPlaybackPositionMs
            } else {
                0L
            }
        return maxOf(fromPlayer, remembered)
    }

    private fun isAuthFailure(error: PlaybackException): Boolean {
        if (error.errorCode == PlaybackException.ERROR_CODE_IO_NO_PERMISSION) {
            return true
        }
        if (error.errorCode != PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS) {
            return false
        }
        val httpCause = collectCauses(error)
            .filterIsInstance<HttpDataSource.InvalidResponseCodeException>()
            .firstOrNull()
            ?: return false
        return httpCause.responseCode == 401 || httpCause.responseCode == 403
    }

    private fun isProbablyNetworkClass(error: PlaybackException): Boolean {
        // ERROR_CODE_IO_BAD_HTTP_STATUS that isn't 401/403 — treat as transient
        // network/server (502/503 from a flaky reverse proxy is the canonical
        // case). The fast-retry budget covers it without burning the auth path.
        if (error.errorCode == PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS) return true
        return false
    }

    private fun collectCauses(error: Throwable): Sequence<Throwable> = sequence {
        var cursor: Throwable? = error
        val seen = mutableSetOf<Throwable>()
        while (cursor != null && cursor !in seen) {
            seen.add(cursor)
            yield(cursor)
            cursor = cursor.cause
        }
    }
}

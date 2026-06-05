package app.samo.android.audio

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import java.util.concurrent.Executors

/**
 * Native playback progress writer. Replaces the JS-side `samo-playback-sync.ts`
 * + `abs-progress.ts` 20s interval. Runs on the playback foreground service's
 * main looper, so it keeps polling and writing while the JS runtime is
 * Doze-frozen — which is when "I closed the app and it forgot my spot" used to
 * happen.
 *
 * Lifecycle from [SamoAudioEngine]:
 *  - [attach] when a new MediaItem starts loading. Carries source-id parsing
 *    JS already did, so this side never has to learn the playback-id grammar.
 *  - [setPlaying] from the Player.Listener when isPlaying flips. Starts/stops
 *    the polling Runnable.
 *  - [flushNow] on pause / seek / explicit user action.
 *  - [detach] when the item ends (natural end OR replaced by a new attach).
 *    Completed=true flips touchLastPositionAt+incrementPlayCount on the final
 *    write (and `completed: true` on audiobook/podcast, mirroring abs-progress).
 *
 * No persistence layer yet — pending writes live in memory until the process
 * dies. The throttle interval is short enough (20s) that the loss window is
 * narrow, and the foreground service runs while playback is active, so a hard
 * kill mid-playback is the only way to lose data. If on-device verify shows
 * this is a problem, add a filesDir JSON cache in a follow-up.
 */
internal object SamoProgressSync {
    private const val TAG = "SamoProgressSync"
    private const val POLL_INTERVAL_MS = 5_000L
    private const val THROTTLE_MS = 20_000L
    /** Mark audiobook/podcast as "completed" when this far through. */
    private const val COMPLETION_THRESHOLD = 0.96

    private val mainHandler = Handler(Looper.getMainLooper())
    private val writeExecutor = Executors.newSingleThreadExecutor()

    private data class TrackContext(
        val kind: String,
        val targetId: String,
        val serverUrl: String,
        val bearer: String,
        val playlistId: String?,
        /** Per-book progress offset for multi-file audiobooks; 0 otherwise. */
        val progressOffsetSeconds: Long,
    )

    private data class ActiveItem(
        val sessionId: String,
        val context: TrackContext,
        var lastWriteMs: Long = 0L,
        var lastPositionMs: Long = 0L,
        var lastDurationMs: Long = -1L,
        var startedWritten: Boolean = false,
    )

    private var active: ActiveItem? = null
    private var positionSupplier: (() -> Long)? = null
    private var durationSupplier: (() -> Long)? = null
    private var isPlaying = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            val item = active
            val supplier = positionSupplier
            val durationFn = durationSupplier
            if (item != null && isPlaying && supplier != null) {
                val positionMs = supplier()
                val durationMs = durationFn?.invoke() ?: -1L
                item.lastPositionMs = positionMs
                if (durationMs > 0) {
                    item.lastDurationMs = durationMs
                }
                maybeWriteThrottled(item, positionMs, durationMs)
            }
            if (isPlaying) {
                mainHandler.postDelayed(this, POLL_INTERVAL_MS)
            }
        }
    }

    /**
     * Bind position + duration suppliers once (engine binds when the
     * PlaybackService comes up). Caller is responsible for null-guarding if
     * the service is later unbound.
     */
    fun bindPlayerSuppliers(position: () -> Long, duration: () -> Long) {
        positionSupplier = position
        durationSupplier = duration
    }

    fun attach(item: ReadableMap, sessionId: String, startPositionMs: Long) {
        mainHandler.post { attachLocked(item, sessionId, startPositionMs) }
    }

    private fun attachLocked(item: ReadableMap, sessionId: String, startPositionMs: Long) {
        // Detach previous (writes a final state for the outgoing track) before
        // adopting the new context. Doing this in-line on the main looper keeps
        // the write order deterministic.
        active?.let { previous ->
            val previousPositionMs = positionSupplier?.invoke() ?: previous.lastPositionMs
            writeForActive(
                previous,
                previousPositionMs,
                previous.lastDurationMs,
                force = true,
                touchLastPlayed = false,
                completed = false,
                incrementPlayCount = false,
                reason = "switch",
            )
        }

        val context = buildContext(item)
        if (context == null) {
            active = null
            stopPolling()
            return
        }

        active = ActiveItem(
            sessionId = sessionId,
            context = context,
            lastPositionMs = startPositionMs.coerceAtLeast(0L),
        )

        // Started write — same as JS syncSamoMusicPlaybackStarted /
        // syncAbsProgressImmediate(touchLastPlayedAt). Fires immediately so the
        // server sees "user is listening" without waiting for the first 20s
        // throttle window to elapse.
        writeForActive(
            active!!,
            startPositionMs,
            durationMs = -1L,
            force = true,
            touchLastPlayed = true,
            completed = false,
            incrementPlayCount = false,
            reason = "started",
        )
        active!!.startedWritten = true

        // Per-playlist scrobble started — fires once per playlist session.
        context.playlistId?.let { playlistId ->
            if (context.kind == "music-track") {
                writeRaw(
                    context.serverUrl,
                    context.bearer,
                    "music-playlist",
                    playlistId,
                    SamoServerClient.PlaybackPatch(touchLastPlayedAt = true),
                    reason = "playlist-started",
                )
            }
        }

        if (isPlaying) {
            startPolling()
        }
    }

    fun setPlaying(playing: Boolean) {
        mainHandler.post {
            val wasPlaying = isPlaying
            isPlaying = playing
            if (playing && !wasPlaying) {
                startPolling()
            } else if (!playing && wasPlaying) {
                stopPolling()
                val item = active
                if (item != null) {
                    val positionMs = positionSupplier?.invoke() ?: item.lastPositionMs
                    writeForActive(
                        item,
                        positionMs,
                        durationSupplier?.invoke() ?: item.lastDurationMs,
                        force = true,
                        touchLastPlayed = false,
                        completed = false,
                        incrementPlayCount = false,
                        reason = "pause",
                    )
                }
            }
        }
    }

    fun flushNow(reason: String) {
        mainHandler.post {
            val item = active ?: return@post
            val positionMs = positionSupplier?.invoke() ?: item.lastPositionMs
            val durationMs = durationSupplier?.invoke() ?: item.lastDurationMs
            writeForActive(
                item,
                positionMs,
                durationMs,
                force = true,
                touchLastPlayed = false,
                completed = false,
                incrementPlayCount = false,
                reason = reason,
            )
        }
    }

    /**
     * Item ended (natural end OR explicit stop). [completed] should be true
     * for natural end of track — fires the "submission" write that increments
     * play count (music) or marks completed (audiobook/podcast).
     */
    fun detach(completed: Boolean, reason: String) {
        mainHandler.post {
            val item = active ?: return@post
            val positionMs = positionSupplier?.invoke() ?: item.lastPositionMs
            val durationMs = durationSupplier?.invoke() ?: item.lastDurationMs
            writeForActive(
                item,
                positionMs,
                durationMs,
                force = true,
                touchLastPlayed = completed,
                completed = completed,
                incrementPlayCount = completed && item.context.kind == "music-track",
                reason = reason,
            )
            // Per-playlist scrobble submission — fires once on natural end of
            // a music-track playing in a playlist context.
            if (completed && item.context.kind == "music-track") {
                item.context.playlistId?.let { playlistId ->
                    writeRaw(
                        item.context.serverUrl,
                        item.context.bearer,
                        "music-playlist",
                        playlistId,
                        SamoServerClient.PlaybackPatch(
                            touchLastPlayedAt = true,
                            incrementPlayCount = true,
                        ),
                        reason = "playlist-submitted",
                    )
                }
            }
            active = null
            stopPolling()
        }
    }

    private fun buildContext(item: ReadableMap): TrackContext? {
        val kind = item.getOptionalString("samoProgressKind")
        val targetId = item.getOptionalString("samoProgressTargetId")
        val serverUrl = item.getOptionalString("serverUrl")
        val bearer = item.getOptionalString("serverBearerToken")
        if (kind.isNullOrBlank() || targetId.isNullOrBlank() ||
            serverUrl.isNullOrBlank() || bearer.isNullOrBlank()
        ) {
            return null
        }
        val offsetSeconds =
            item.getOptionalDouble("progressOffsetSeconds")?.toLong() ?: 0L
        return TrackContext(
            kind = kind,
            targetId = targetId,
            serverUrl = serverUrl,
            bearer = bearer,
            playlistId = item.getOptionalString("samoPlaylistId"),
            progressOffsetSeconds = offsetSeconds.coerceAtLeast(0L),
        )
    }

    private fun maybeWriteThrottled(item: ActiveItem, positionMs: Long, durationMs: Long) {
        val now = SystemClock.uptimeMillis()
        if (now - item.lastWriteMs < THROTTLE_MS) {
            return
        }
        writeForActive(
            item,
            positionMs,
            durationMs,
            force = false,
            touchLastPlayed = false,
            completed = false,
            incrementPlayCount = false,
            reason = "poll",
        )
    }

    private fun writeForActive(
        item: ActiveItem,
        positionMs: Long,
        durationMs: Long,
        force: Boolean,
        touchLastPlayed: Boolean,
        completed: Boolean,
        incrementPlayCount: Boolean,
        reason: String,
    ) {
        val context = item.context
        val nativePositionSeconds = positionMs.coerceAtLeast(0L) / 1000L
        val bookPositionSeconds = nativePositionSeconds + context.progressOffsetSeconds

        val completedFlag: Boolean? = when {
            context.kind == "music-track" -> null
            completed -> true
            durationMs > 0 ->
                (bookPositionSeconds.toDouble() * 1000.0 / durationMs.toDouble()) >=
                    COMPLETION_THRESHOLD
            else -> null
        }

        val patch = SamoServerClient.PlaybackPatch(
            progressSeconds = bookPositionSeconds,
            completed = completedFlag,
            touchLastPlayedAt = touchLastPlayed,
            touchLastPositionAt = true,
            incrementPlayCount = incrementPlayCount,
        )

        item.lastWriteMs = SystemClock.uptimeMillis()
        if (!force && !touchLastPlayed && completedFlag != true) {
            // Plain position tick — just defer to the throttle window. Already
            // gated by [maybeWriteThrottled]; this is here for the lifecycle
            // path that might invoke writeForActive directly.
        }

        writeRaw(
            context.serverUrl,
            context.bearer,
            context.kind,
            context.targetId,
            patch,
            reason = reason,
        )
    }

    private fun writeRaw(
        serverUrl: String,
        bearer: String,
        kind: String,
        targetId: String,
        patch: SamoServerClient.PlaybackPatch,
        reason: String,
    ) {
        writeExecutor.execute {
            val result =
                SamoServerClient.patchPlayback(serverUrl, bearer, kind, targetId, patch)
            if (result is SamoServerClient.PatchResult.Failed) {
                Log.w(
                    TAG,
                    "PATCH /api/v1/playback/$kind/$targetId failed " +
                        "(${result.reason}) reason=$reason",
                )
            } else {
                Log.d(
                    TAG,
                    "PATCH /api/v1/playback/$kind/$targetId ok reason=$reason " +
                        "progressSeconds=${patch.progressSeconds}",
                )
            }
        }
    }

    private fun startPolling() {
        mainHandler.removeCallbacks(pollRunnable)
        mainHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS)
    }

    private fun stopPolling() {
        mainHandler.removeCallbacks(pollRunnable)
    }
}

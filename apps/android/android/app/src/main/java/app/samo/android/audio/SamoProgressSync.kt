package app.samo.android.audio

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.ReadableMap
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

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
 * Durability ([SamoProgressJournal], bound via [bindPersistence]):
 *  - every write is journaled before its network attempt and replayed on next
 *    launch if a hard kill lands before the ack;
 *  - the latest position per item is retained as a RESUME CACHE, so on a flaky
 *    LAN a failed live resume read falls back to the local value instead of
 *    restarting the book at 0 (see [getResumeSeconds]).
 */
internal object SamoProgressSync {
    private const val TAG = "SamoProgressSync"
    private const val POLL_INTERVAL_MS = 1_000L
    private const val THROTTLE_MS = 20_000L
    /** Bounded retry for transient network failures on a write (esp. the final
     *  pause/end write, whose loss is what "forgot my spot" feels like). The
     *  backoff is SCHEDULED, never slept, so it can't back up the write queue. */
    private const val MAX_WRITE_RETRIES = 3
    private const val RETRY_BACKOFF_MS = 1_500L

    private val mainHandler = Handler(Looper.getMainLooper())
    private val writeExecutor: ScheduledExecutorService =
        Executors.newSingleThreadScheduledExecutor()

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
    private var positionSupplier: (() -> Long?)? = null
    private var durationSupplier: (() -> Long?)? = null
    private var isPlaying = false
    private var stallCheckCount = 0
    var onPlaybackStalled: (() -> Unit)? = null

    /** Durable last-position-per-item store; null until [bindPersistence]. */
    private var journal: SamoProgressJournal? = null

    private val pollRunnable = object : Runnable {
        override fun run() {
            val item = active
            val supplier = positionSupplier
            val durationFn = durationSupplier
            if (item != null && isPlaying && supplier != null) {
                val positionMs = supplier() ?: item.lastPositionMs
                val durationMs = durationFn?.invoke() ?: item.lastDurationMs

                if (positionMs == item.lastPositionMs && positionMs != item.lastDurationMs) {
                    stallCheckCount++
                    if (stallCheckCount >= 3) {
                        Log.w(TAG, "Hardware offload watchdog tripped: playhead stalled at ${positionMs}ms")
                        onPlaybackStalled?.invoke()
                        stallCheckCount = 0
                    }
                } else {
                    stallCheckCount = 0
                }

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
    fun bindPlayerSuppliers(position: () -> Long?, duration: () -> Long?) {
        positionSupplier = position
        durationSupplier = duration
    }

    /**
     * Point the durable journal at the app's private files dir and immediately
     * replay anything a previous process left unsent — i.e. a write that was
     * journaled but whose ack never arrived before a hard kill. Called once at
     * engine construction; the work is enqueued on [writeExecutor] so it
     * serializes with (and precedes) live writes.
     */
    fun bindPersistence(filesDir: File) {
        writeExecutor.execute {
            if (journal == null) {
                journal = SamoProgressJournal(File(filesDir, "samo_progress_pending.json"))
            }
            replayPending()
        }
    }

    fun attach(item: ReadableMap, sessionId: String, startPositionMs: Long) {
        mainHandler.post { attachLocked(item, sessionId, startPositionMs) }
    }

    private fun attachLocked(item: ReadableMap, sessionId: String, startPositionMs: Long) {
        // Detach previous (writes a final state for the outgoing track) before
        // adopting the new context. Doing this in-line on the main looper keeps
        // the write order deterministic.
        active?.let { previous ->
            // Use the OUTGOING item's tracked position, NEVER a live read: by now
            // the player may already hold the incoming item, so positionSupplier
            // would return its (≈0) position and clobber the real one with 0.
            writeForActive(
                previous,
                previous.lastPositionMs,
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
            if (isPlaying == playing) return@post
            isPlaying = playing
            stallCheckCount = 0
            if (playing) {
                startPolling()
            } else {
                stopPolling()
                val item = active
                if (item != null) {
                    // Live read is correct here (the active item is still current);
                    // record it so a later detach/switch has the fresh position.
                    val positionMs = positionSupplier?.invoke() ?: item.lastPositionMs
                    item.lastPositionMs = positionMs
                    val durationMs = durationSupplier?.invoke() ?: item.lastDurationMs
                    if (durationMs > 0) item.lastDurationMs = durationMs
                    writeForActive(
                        item,
                        positionMs,
                        durationMs,
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
            // Live read is correct here (seek of the active item); record it so a
            // later detach/switch has the fresh position.
            val positionMs = positionSupplier?.invoke() ?: item.lastPositionMs
            item.lastPositionMs = positionMs
            val durationMs = durationSupplier?.invoke() ?: item.lastDurationMs
            if (durationMs > 0) item.lastDurationMs = durationMs
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
            // Use the OUTGOING item's tracked position, NOT a live read: by the
            // time detach runs the player may already have loaded the next item
            // (e.g. switching to radio), so positionSupplier returns its ≈0
            // position and would clobber the real one. lastPositionMs is kept
            // fresh by the poll loop + pause/seek writes.
            val positionMs = item.lastPositionMs
            val durationMs = item.lastDurationMs
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

        // `completed` is asserted EXPLICITLY: true only on natural end of the book
        // (detach completed=true). Every other write (started/poll/pause/switch)
        // sends false. This both (a) avoids the old ratio that divided the
        // BOOK position by the current FILE's duration — which tripped >=96%
        // the instant a multi-file book advanced past its first file, wrongly
        // marking the whole book finished — and (b) self-heals any book already
        // corrupted to completed=true, because the first write on the next
        // listen now clears it. Music tracks never carry a completed flag.
        val completedFlag: Boolean? = if (context.kind == "music-track") null else completed

        val patch = SamoServerClient.PlaybackPatch(
            progressSeconds = bookPositionSeconds,
            completed = completedFlag,
            touchLastPlayedAt = touchLastPlayed,
            touchLastPositionAt = true,
            incrementPlayCount = incrementPlayCount,
        )

        item.lastWriteMs = SystemClock.uptimeMillis()

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
        val stampMs = System.currentTimeMillis()
        writeExecutor.execute {
            // Journal BEFORE the attempt: a process-kill mid-write leaves the
            // position on disk for next-launch replay. The entry is KEPT after
            // the ack (flagged sent) so it doubles as the resume cache.
            journal?.upsert(
                SamoProgressJournal.PendingWrite(
                    serverUrl = serverUrl,
                    bearer = bearer,
                    kind = kind,
                    targetId = targetId,
                    progressSeconds = patch.progressSeconds ?: 0L,
                    completed = patch.completed,
                    touchLastPlayedAt = patch.touchLastPlayedAt,
                    touchLastPositionAt = patch.touchLastPositionAt,
                    incrementPlayCount = patch.incrementPlayCount,
                    updatedAtMs = stampMs,
                ),
            )
            attemptOnce(serverUrl, bearer, kind, targetId, patch, reason, attempt = 0, stampMs = stampMs)
        }
    }

    /**
     * One PATCH attempt, run on [writeExecutor]. On a network failure it
     * RE-SCHEDULES itself with a growing backoff via [writeExecutor.schedule]
     * rather than sleeping the thread, so a flaky write can't stall the writes
     * queued behind it. A retry first checks it hasn't been SUPERSEDED by a newer
     * write for the same item (compares the journal entry's stamp) — otherwise a
     * stale retry could overwrite a newer position. Only network failures retry;
     * Auth/Server are deterministic. On success the journal entry is flagged sent
     * (kept as the resume value); on terminal failure it stays unsent for replay.
     */
    private fun attemptOnce(
        serverUrl: String,
        bearer: String,
        kind: String,
        targetId: String,
        patch: SamoServerClient.PlaybackPatch,
        reason: String,
        attempt: Int,
        stampMs: Long,
    ) {
        if (attempt > 0) {
            val current = journal?.resumeFor(kind, targetId)
            if (current != null && current.updatedAtMs != stampMs) {
                // A newer write owns this item now; drop the stale retry.
                return
            }
        }
        val result = SamoServerClient.patchPlayback(serverUrl, bearer, kind, targetId, patch)
        if (result is SamoServerClient.PatchResult.Success) {
            journal?.markSent(kind, targetId)
            Log.d(
                TAG,
                "PATCH /api/v1/playback/$kind/$targetId ok reason=$reason " +
                    "progressSeconds=${patch.progressSeconds}" +
                    if (attempt > 0) " (after $attempt retr${if (attempt == 1) "y" else "ies"})" else "",
            )
            return
        }
        val failure = (result as SamoServerClient.PatchResult.Failed).reason
        if (failure == SamoServerClient.PatchFailure.Network && attempt < MAX_WRITE_RETRIES) {
            writeExecutor.schedule(
                {
                    attemptOnce(
                        serverUrl, bearer, kind, targetId, patch, reason,
                        attempt = attempt + 1, stampMs = stampMs,
                    )
                },
                RETRY_BACKOFF_MS * (attempt + 1),
                TimeUnit.MILLISECONDS,
            )
            return
        }
        Log.w(
            TAG,
            "PATCH /api/v1/playback/$kind/$targetId failed " +
                "($failure) reason=$reason attempts=${attempt + 1} (kept for replay)",
        )
    }

    /**
     * Replay journaled writes left unsent by a previous process. Runs on
     * [writeExecutor] via [bindPersistence], before any live write. Play-count
     * increments are NEVER replayed: patchPlayback isn't idempotent for them and
     * the crashed write may already have been applied server-side. Position and
     * completed ARE idempotent (last-writer-wins), so replaying them is safe.
     */
    private fun replayPending() {
        val j = journal ?: return
        val pendings = j.pending()
        if (pendings.isEmpty()) return
        Log.i(TAG, "Replaying ${pendings.size} pending progress write(s) from a previous session")
        for (p in pendings) {
            val patch = SamoServerClient.PlaybackPatch(
                progressSeconds = p.progressSeconds,
                completed = p.completed,
                touchLastPlayedAt = p.touchLastPlayedAt,
                touchLastPositionAt = p.touchLastPositionAt,
                incrementPlayCount = false,
            )
            attemptOnce(p.serverUrl, p.bearer, p.kind, p.targetId, patch, "replay", attempt = 0, stampMs = p.updatedAtMs)
        }
    }

    /**
     * Resume fallback for a flaky LAN: hands back the latest LOCALLY-known book
     * position for an item so JS can resume there when the live server read
     * fails, instead of restarting the book at 0 (and then overwriting the good
     * server position). Reads the journal on [writeExecutor] (its only safe
     * thread); [callback] gets null seconds when nothing is cached.
     */
    fun getResumeSeconds(kind: String, targetId: String, callback: (Long?, Boolean) -> Unit) {
        writeExecutor.execute {
            val entry = journal?.resumeFor(kind, targetId)
            Log.d(
                TAG,
                "resume cache read $kind/$targetId -> " +
                    (entry?.let { "${it.progressSeconds}s completed=${it.completed == true}" } ?: "none"),
            )
            callback(entry?.progressSeconds, entry?.completed == true)
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

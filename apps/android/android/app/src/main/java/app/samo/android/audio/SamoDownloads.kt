package app.samo.android.audio

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequest
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.sync.Semaphore
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * Authoritative store for offline downloads on Android. JS used to own the
 * queue, registry, and lifecycle of every entry; the bytes always moved
 * natively but JS told them when. That coupling is the reason a download could
 * say "queued" forever after the JS process was killed by memory pressure: the
 * native byte-transfer was gone with the process, and JS — when it came back
 * — had no foreground service or worker to revive it.
 *
 * This object owns everything that has to survive that. The registry is loaded
 * from filesDir on first access, mutated under a single-thread executor (so
 * we never need to reason about reentrant mutations from worker callbacks),
 * persisted back to disk with a small debounce, and queued via WorkManager.
 * WorkManager uses `keepUnique` work names per entry id so re-enqueueing the
 * same entry while it's running is a no-op, and OS-killed work resumes on its
 * own via the system scheduler.
 *
 * Listener notifications fan out to JS as a single `SamoDownloadsChanged`
 * event with the full registry. JS subscribes to that and stops trying to
 * derive lifecycle state on its own.
 */
internal object SamoDownloads {
    private const val TAG = "SamoDownloads"

    // The registry file lives alongside the engine's other state. The path is
    // *internal* (filesDir) — never the SAF location — because the registry is
    // the source of truth for what's downloaded, and we can't trust SAF
    // permissions to still be granted at the moment we need to read it.
    private const val REGISTRY_FILE = "samo-downloads-registry.json"
    private const val REGISTRY_PERSIST_DEBOUNCE_MS = 750L
    // 256 KB / 1% are the same thresholds the JS owner used; keep them so the
    // downloads UI doesn't change visible behavior (the bar moves at the same
    // rate, the row doesn't re-render 50/sec on a fast Wi-Fi transfer).
    private const val PROGRESS_BYTES_THRESHOLD = 256L * 1024L
    private const val PROGRESS_RATIO_THRESHOLD = 0.01
    private const val LISTENER_NOTIFY_THROTTLE_MS = 150L
    // Native worker unique name prefix; one WorkManager unique-work chain per
    // entry id keeps re-enqueues idempotent.
    private const val WORK_NAME_PREFIX = "samo-download-"

    // At most this many transfers stream at once. CoroutineWorkers don't
    // occupy WorkManager's executor threads, so WITHOUT this gate every
    // enqueued entry transfers simultaneously — a 1k-track playlist meant
    // 1k parallel HTTP streams hammering the server, the radio, and the
    // disk. Excess workers suspend on the semaphore (zero threads held)
    // with their entries still honestly Queued.
    private const val MAX_CONCURRENT_TRANSFERS = 3
    internal val transferSlots = Semaphore(MAX_CONCURRENT_TRANSFERS)

    // Rows the automatic sweep will re-queue in one pass. A user who tapped
    // "Retry all failed" gets everything at once because they asked for it and
    // are watching; a sweep that fires unattended should not turn a thousand
    // dead rows into a thousand WorkManager records and a thousand transfers
    // queued behind a three-slot gate. The overflow is not lost — it is the
    // front of the next sweep's queue, half an hour later.
    private const val MAX_REQUEUES_PER_SWEEP = 50

    // Throttle for the byte transfer. Set by JS at the playback-state edges
    // (active → throttled, inactive → unthrottled) so a download can't starve
    // the audio output. Reads happen inside the worker on every chunk.
    private const val PLAYBACK_DOWNLOAD_THROTTLE_BYTES_PER_SECOND = 512L * 1024L
    @Volatile private var throttleBytesPerSecond = 0L

    // The IO executor runs registry mutations + the persist debouncer.
    // SingleThread guarantees no concurrent mutation, so individual entries
    // never have to be thread-safe themselves. The persist + notify flushers
    // post back onto this same executor — no other thread touches the cache.
    private val ioExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "samo-downloads-io")
    }

    enum class Status {
        Queued,
        Downloading,
        Completed,
        Failed,
        Canceled;

        fun toWire(): String = name.lowercase()

        companion object {
            fun fromWire(raw: String?): Status =
                values().firstOrNull { it.toWire() == raw?.lowercase() } ?: Queued
        }
    }

    data class Collection(
        val id: String,
        val sourceId: String,
        val title: String,
        val type: String,
        val subtitle: String? = null,
        val artworkUrl: String? = null,
        val artworkImageId: String? = null,
    ) {
        fun toJson(): JSONObject = JSONObject()
            .put("id", id)
            .put("sourceId", sourceId)
            .put("title", title)
            .put("type", type)
            .also { obj ->
                subtitle?.let { obj.put("subtitle", it) }
                artworkUrl?.let { obj.put("artworkUrl", it) }
                artworkImageId?.let { obj.put("artworkImageId", it) }
            }

        fun toMap(): WritableMap = Arguments.createMap().apply {
            putString("id", id)
            putString("sourceId", sourceId)
            putString("title", title)
            putString("type", type)
            subtitle?.let { putString("subtitle", it) }
            artworkUrl?.let { putString("artworkUrl", it) }
            artworkImageId?.let { putString("artworkImageId", it) }
        }

        companion object {
            fun fromJson(json: JSONObject): Collection = Collection(
                id = json.getString("id"),
                sourceId = json.getString("sourceId"),
                title = json.getString("title"),
                type = json.getString("type"),
                subtitle = json.optStringOrNull("subtitle"),
                artworkUrl = json.optStringOrNull("artworkUrl"),
                artworkImageId = json.optStringOrNull("artworkImageId"),
            )
        }
    }

    data class AudiobookSegment(
        val index: Int,
        val startOffsetSeconds: Double,
        val durationSeconds: Double? = null,
    ) {
        fun toJson(): JSONObject = JSONObject()
            .put("index", index)
            .put("startOffsetSeconds", startOffsetSeconds)
            .also { obj -> durationSeconds?.let { obj.put("durationSeconds", it) } }

        fun toMap(): WritableMap = Arguments.createMap().apply {
            putInt("index", index)
            putDouble("startOffsetSeconds", startOffsetSeconds)
            durationSeconds?.let { putDouble("durationSeconds", it) }
        }

        companion object {
            fun fromJson(json: JSONObject): AudiobookSegment = AudiobookSegment(
                index = json.optInt("index", 0),
                startOffsetSeconds = json.optDouble("startOffsetSeconds", 0.0),
                durationSeconds = json.optDoubleOrNull("durationSeconds"),
            )
        }
    }

    data class Entry(
        val id: String,
        val trackId: String,
        val title: String,
        val sourceUrl: String,
        val collection: Collection,
        val status: Status,
        val enqueuedAt: Long,
        val trackSubtitle: String? = null,
        val audiobookSegment: AudiobookSegment? = null,
        val localUri: String? = null,
        val bytesDownloaded: Long? = null,
        val totalBytes: Long? = null,
        val progress: Double? = null,
        val completedAt: Long? = null,
        val errorMessage: String? = null,
        // Auth context for token freshness: a queued entry can outlive its
        // sourceUrl's stream token by hours, so the WORKER re-freshens the
        // token at transfer time (and once more on a 401) — exactly like the
        // player's data source does. Without these, every download enqueued
        // from mirror-hydrated URLs after a long session 401'd forever.
        val serverUrl: String? = null,
        val serverBearer: String? = null,
        // Who retired this row. Only the user's own cancel sets it, so the
        // recovery sweep can tell "I don't want this" from the cancellations
        // errors used to produce — see [SamoDownloadRecovery].
        val canceledByUser: Boolean = false,
        // What the transfer concluded about the failure it ended on: false
        // only for the HTTP answers that can never become a success. Failures
        // the sweep must not chase are the ones that make it a nuisance.
        val failureRecoverable: Boolean = true,
        // Automatic attempts the sweep has already spent, and when this row
        // last broke. Together they are the backoff: without the counter a
        // dead server is retried every half hour forever, and without the
        // stamp the first retry lands before the cause has had any chance to
        // clear. Reset on completion and on a retry the user asked for.
        val recoveryAttempts: Int = 0,
        val lastFailureAt: Long? = null,
    ) {
        fun toJson(): JSONObject = JSONObject()
            .put("id", id)
            .put("trackId", trackId)
            .put("title", title)
            .put("sourceUrl", sourceUrl)
            .put("collection", collection.toJson())
            .put("status", status.toWire())
            .put("enqueuedAt", enqueuedAt)
            .also { obj ->
                trackSubtitle?.let { obj.put("trackSubtitle", it) }
                audiobookSegment?.let { obj.put("audiobookSegment", it.toJson()) }
                localUri?.let { obj.put("localUri", it) }
                bytesDownloaded?.let { obj.put("bytesDownloaded", it) }
                totalBytes?.let { obj.put("totalBytes", it) }
                progress?.let { obj.put("progress", it) }
                completedAt?.let { obj.put("completedAt", it) }
                errorMessage?.let { obj.put("errorMessage", it) }
                serverUrl?.let { obj.put("serverUrl", it) }
                serverBearer?.let { obj.put("serverBearer", it) }
                if (canceledByUser) obj.put("canceledByUser", true)
                if (!failureRecoverable) obj.put("failureRecoverable", false)
                if (recoveryAttempts > 0) obj.put("recoveryAttempts", recoveryAttempts)
                lastFailureAt?.let { obj.put("lastFailureAt", it) }
            }

        fun toMap(): WritableMap = Arguments.createMap().apply {
            putString("id", id)
            putString("trackId", trackId)
            putString("title", title)
            putString("sourceUrl", sourceUrl)
            putMap("collection", collection.toMap())
            putString("status", status.toWire())
            putDouble("enqueuedAt", enqueuedAt.toDouble())
            trackSubtitle?.let { putString("trackSubtitle", it) }
            audiobookSegment?.let { putMap("audiobookSegment", it.toMap()) }
            localUri?.let { putString("localUri", it) }
            bytesDownloaded?.let { putDouble("bytesDownloaded", it.toDouble()) }
            totalBytes?.let { putDouble("totalBytes", it.toDouble()) }
            progress?.let { putDouble("progress", it) }
            completedAt?.let { putDouble("completedAt", it.toDouble()) }
            errorMessage?.let { putString("errorMessage", it) }
        }

        companion object {
            fun fromJson(json: JSONObject): Entry = Entry(
                id = json.getString("id"),
                trackId = json.getString("trackId"),
                title = json.getString("title"),
                sourceUrl = json.getString("sourceUrl"),
                collection = Collection.fromJson(json.getJSONObject("collection")),
                status = Status.fromWire(json.optStringOrNull("status")),
                enqueuedAt = json.optLong("enqueuedAt", System.currentTimeMillis()),
                trackSubtitle = json.optStringOrNull("trackSubtitle"),
                audiobookSegment = json.optJSONObject("audiobookSegment")?.let(AudiobookSegment::fromJson),
                localUri = json.optStringOrNull("localUri"),
                bytesDownloaded = json.optLongOrNull("bytesDownloaded"),
                totalBytes = json.optLongOrNull("totalBytes"),
                progress = json.optDoubleOrNull("progress"),
                completedAt = json.optLongOrNull("completedAt"),
                errorMessage = json.optStringOrNull("errorMessage"),
                serverUrl = json.optStringOrNull("serverUrl"),
                serverBearer = json.optStringOrNull("serverBearer"),
                // Absent on every registry written before the sweep existed.
                // Reading that as "not the user's doing" is deliberate: those
                // are the stranded rows this whole mechanism is for, including
                // the ones a system stop recorded as a cancellation back when
                // the two were indistinguishable.
                canceledByUser = json.optBoolean("canceledByUser", false),
                failureRecoverable = json.optBoolean("failureRecoverable", true),
                recoveryAttempts = json.optInt("recoveryAttempts", 0),
                lastFailureAt = json.optLongOrNull("lastFailureAt"),
            )
        }
    }

    /**
     * Ids the USER retired — cancel, remove, clear-all. A worker that finds
     * itself stopped mid-transfer consults this to tell "the user is done with
     * this download" from "the system reclaimed its execution window": the two
     * are indistinguishable from inside the transfer loop, and only the first
     * may throw the downloaded bytes away. The registry row carries the same
     * answer, but it is written on the registry's IO thread and read on the
     * worker's with no lock between them; a concurrent set is the happens-before
     * edge that makes the answer reliable rather than merely likely.
     */
    private val userRetired: MutableSet<String> = ConcurrentHashMap.newKeySet()

    private var registry: MutableList<Entry> = mutableListOf()
    // Read from arbitrary threads (every list()/snapshot() caller), written
    // only from the IO executor. Volatile gives us the happens-before edge so
    // a caller that observes loaded=true is also guaranteed to see the fully
    // populated registry.
    @Volatile private var loaded = false

    @Volatile private var persistRunnable: Runnable? = null
    @Volatile private var notifyRunnable: Runnable? = null
    private val notifySequence = AtomicLong(0L)

    private val progressGate = mutableMapOf<String, ProgressMark>()
    private data class ProgressMark(var bytes: Long, var ratio: Double)

    fun interface Listener {
        fun onChanged(entries: List<Entry>)
    }
    private val listeners = mutableSetOf<Listener>()

    fun init(context: Context) {
        val appContext = context.applicationContext
        ioExecutor.execute {
            ensureLoaded(appContext)
            // On launch, anything stuck mid-download is now orphaned (the
            // worker that owned it died with the previous process). Reset it
            // to queued so the next pump retries — matches the JS owner's
            // launch behavior.
            var orphanedAny = false
            for (i in registry.indices) {
                val entry = registry[i]
                if (entry.status == Status.Downloading) {
                    registry[i] = entry.copy(
                        status = Status.Queued,
                        progress = null,
                        bytesDownloaded = null,
                    )
                    orphanedAny = true
                }
            }
            if (orphanedAny) {
                schedulePersist(appContext)
                scheduleNotify()
            }
            pumpQueueInternal(appContext)
            // Heal what broke while we were gone, then keep healing on the
            // clock. Inline rather than as a one-shot work request because we
            // are already on the IO thread with the registry loaded, and the
            // launch pass is the one that clears out rows stranded by an older
            // build — those carry no failure stamp, so they are due at once.
            try {
                sweepRecoverableInternal(appContext)
            } catch (error: Exception) {
                Log.w(TAG, "launch download sweep failed: ${error.message}")
            }
            SamoDownloadRecoveryWorker.schedule(appContext)
        }
    }

    fun enqueue(context: Context, input: Entry): Entry {
        val appContext = context.applicationContext
        var resolved = input
        runOnIo {
            ensureLoaded(appContext)
            val existing = registry.firstOrNull { candidate ->
                candidate.trackId == input.trackId &&
                    candidate.collection.sourceId == input.collection.sourceId &&
                    candidate.collection.id == input.collection.id &&
                    candidate.status in ACTIVE_OR_COMPLETED
            }
            if (existing != null) {
                resolved = existing
                return@runOnIo
            }
            val entry = input.copy(
                id = input.id.ifBlank { buildEntryId() },
                status = Status.Queued,
                enqueuedAt = if (input.enqueuedAt > 0) input.enqueuedAt else System.currentTimeMillis(),
                canceledByUser = false,
                failureRecoverable = true,
                recoveryAttempts = 0,
                lastFailureAt = null,
            )
            userRetired.remove(entry.id)
            registry.add(entry)
            schedulePersist(appContext)
            scheduleNotify()
            resolved = entry
            scheduleWork(appContext, entry.id)
        }
        return resolved
    }

    fun cancel(context: Context, id: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            // Stamp the row FIRST, then cancel the work. The worker reads this
            // row to decide whether the stop it just observed was the user
            // retiring the entry (terminal, throw the partial away) or the
            // system reclaiming its execution window (resume from the bytes we
            // have). Cancelling first left that read racing the stamp, and a
            // cancel misread as a system stop would resurrect the entry.
            val current = registry[index]
            if (current.status != Status.Completed) {
                userRetired.add(id)
                // The sweep reads this to leave the row alone. Everything else
                // that lands on Canceled is something going wrong, and going
                // wrong is exactly what it is supposed to fix.
                registry[index] = current.copy(
                    status = Status.Canceled,
                    progress = null,
                    canceledByUser = true,
                )
                progressGate.remove(id)
                deletePartialFor(appContext, current)
                schedulePersist(appContext)
                scheduleNotify()
            }
            WorkManager.getInstance(appContext).cancelUniqueWork(workName(id))
        }
    }

    fun remove(context: Context, id: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            val target = registry[index]
            // Row first, work second — see cancel(). A worker that wakes to find
            // its entry gone treats the stop as terminal.
            userRetired.add(id)
            registry.removeAt(index)
            progressGate.remove(id)
            WorkManager.getInstance(appContext).cancelUniqueWork(workName(id))
            target.localUri?.let { deleteLocalFile(it) }
            deletePartialFor(appContext, target)
            schedulePersist(appContext)
            scheduleNotify()
        }
    }

    fun clearAll(context: Context) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val snapshot = registry.toList()
            val workManager = WorkManager.getInstance(appContext)
            // Rows first, work second — see cancel().
            userRetired.addAll(snapshot.map { it.id })
            registry.clear()
            progressGate.clear()
            for (entry in snapshot) {
                workManager.cancelUniqueWork(workName(entry.id))
                entry.localUri?.let { deleteLocalFile(it) }
                deletePartialFor(appContext, entry)
            }
            schedulePersist(appContext)
            scheduleNotify()
        }
    }

    fun retry(context: Context, id: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            userRetired.remove(id)
            // A retry the user asked for resets the backoff outright. They can
            // see something we can't — the server is back up, the Wi-Fi is
            // fixed — so making them wait out a ladder the sweep built is both
            // wrong and infuriating.
            registry[index] = registry[index].copy(
                status = Status.Queued,
                progress = null,
                errorMessage = null,
                canceledByUser = false,
                failureRecoverable = true,
                recoveryAttempts = 0,
                lastFailureAt = null,
            )
            schedulePersist(appContext)
            scheduleNotify()
            pumpQueueInternal(appContext)
            scheduleWork(appContext, id)
        }
    }

    /** Re-queue every Failed entry in one shot — the recovery path for a batch
     *  that 401'd on stale tokens or died to a flaky network. */
    fun retryAllFailed(context: Context) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            var changed = false
            for (i in registry.indices) {
                val entry = registry[i]
                if (entry.status == Status.Failed) {
                    userRetired.remove(entry.id)
                    registry[i] = entry.copy(
                        status = Status.Queued,
                        progress = null,
                        errorMessage = null,
                        canceledByUser = false,
                        failureRecoverable = true,
                        recoveryAttempts = 0,
                        lastFailureAt = null,
                    )
                    changed = true
                    scheduleWork(appContext, entry.id)
                }
            }
            if (changed) {
                schedulePersist(appContext)
                scheduleNotify()
            }
        }
    }

    internal data class SweepResult(
        val requeued: Int = 0,
        val deferred: Int = 0,
        val unrecoverable: Int = 0,
        val heldBack: Int = 0,
    )

    /**
     * Hands every broken-but-fixable download back to the queue. Driven by
     * [SamoDownloadRecoveryWorker] on a schedule, and once inline at launch.
     *
     * This is the retry surface a failed transfer never had. [SamoDownloadWorker]
     * correctly stops after three strikes — an unbounded backoff inside a job is
     * how this stack grew zombie downloads — but stopping left the entry parked
     * behind a button on a screen nobody opens, and the reasons it stopped are
     * usually gone within the hour. Which rows qualify and when is
     * [SamoDownloadRecovery]'s call; this performs it under the registry's own
     * IO thread so it serializes against every other mutation.
     *
     * Blocking is deliberate: the only callers are background workers, and the
     * count they get back is what they log.
     */
    internal fun sweepRecoverable(context: Context): SweepResult {
        val appContext = context.applicationContext
        val outcome = java.util.concurrent.atomic.AtomicReference(SweepResult())
        val latch = java.util.concurrent.CountDownLatch(1)
        ioExecutor.execute {
            try {
                outcome.set(sweepRecoverableInternal(appContext))
            } catch (error: Exception) {
                Log.w(TAG, "download sweep failed: ${error.message}")
            } finally {
                latch.countDown()
            }
        }
        // Bounded, unlike list()'s wait: the persist and notify debouncers sleep
        // on this same executor, so the queue ahead of us is never instant, and
        // a worker has a hard execution budget it may not spend on a latch. A
        // timeout only costs us the counters — the sweep still runs.
        latch.await(30, java.util.concurrent.TimeUnit.SECONDS)
        return outcome.get()
    }

    private fun sweepRecoverableInternal(appContext: Context): SweepResult {
        ensureLoaded(appContext)
        val now = System.currentTimeMillis()
        var deferred = 0
        var unrecoverable = 0
        val due = mutableListOf<Int>()
        for (i in registry.indices) {
            val entry = registry[i]
            when (
                SamoDownloadRecovery.decide(
                    status = entry.status,
                    canceledByUser = entry.canceledByUser,
                    failureRecoverable = entry.failureRecoverable,
                    recoveryAttempts = entry.recoveryAttempts,
                    lastFailureAt = entry.lastFailureAt,
                    now = now,
                )
            ) {
                is SamoDownloadRecovery.Decision.Requeue -> due.add(i)
                is SamoDownloadRecovery.Decision.Wait -> deferred++
                is SamoDownloadRecovery.Decision.Unrecoverable -> unrecoverable++
                is SamoDownloadRecovery.Decision.Settled -> Unit
            }
        }
        if (due.isEmpty()) {
            return SweepResult(deferred = deferred, unrecoverable = unrecoverable)
        }

        // Longest-broken first, so the cap delays the rows that broke most
        // recently rather than the ones that have already waited a day.
        due.sortBy { registry[it].lastFailureAt ?: 0L }
        val batch = due.take(MAX_REQUEUES_PER_SWEEP)
        for (index in batch) {
            val entry = registry[index]
            userRetired.remove(entry.id)
            registry[index] = entry.copy(
                status = Status.Queued,
                progress = null,
                errorMessage = null,
                // Stamped as of this attempt, not the original break: the next
                // rung of the ladder is measured from when we last tried, which
                // is the only thing that says anything about the next try.
                recoveryAttempts = entry.recoveryAttempts + 1,
                lastFailureAt = now,
            )
            scheduleWork(appContext, entry.id)
        }
        schedulePersist(appContext)
        scheduleNotify()
        Log.i(
            TAG,
            "download sweep re-queued ${batch.size} entr${if (batch.size == 1) "y" else "ies"}" +
                (if (due.size > batch.size) " (${due.size - batch.size} held for the next pass)" else ""),
        )
        return SweepResult(
            requeued = batch.size,
            deferred = deferred,
            unrecoverable = unrecoverable,
            heldBack = due.size - batch.size,
        )
    }

    fun setPlaybackThrottle(active: Boolean) {
        throttleBytesPerSecond = if (active) PLAYBACK_DOWNLOAD_THROTTLE_BYTES_PER_SECOND else 0L
    }

    fun currentThrottleBytesPerSecond(): Long = throttleBytesPerSecond

    fun list(context: Context): List<Entry> {
        val appContext = context.applicationContext
        // Wait synchronously for a single tick of the IO executor so the first
        // caller (often the JS subscriber on mount) gets a real snapshot
        // instead of an empty list.
        if (!loaded) {
            val latch = java.util.concurrent.CountDownLatch(1)
            ioExecutor.execute {
                ensureLoaded(appContext)
                latch.countDown()
            }
            latch.await()
        }
        return synchronized(registry) { registry.toList() }
    }

    fun snapshot(): List<Entry> = synchronized(registry) { registry.toList() }

    fun subscribe(listener: Listener): () -> Unit {
        synchronized(listeners) { listeners.add(listener) }
        listener.onChanged(snapshot())
        return {
            synchronized(listeners) { listeners.remove(listener) }
        }
    }

    fun toWritableArray(entries: List<Entry>): WritableArray {
        val array = Arguments.createArray()
        for (entry in entries) {
            array.pushMap(entry.toMap())
        }
        return array
    }

    fun localUriForTrack(context: Context, trackId: String, sourceId: String): String? {
        return list(context.applicationContext).firstOrNull { entry ->
            entry.trackId == trackId &&
                entry.collection.sourceId == sourceId &&
                entry.status == Status.Completed &&
                !entry.localUri.isNullOrBlank()
        }?.localUri
    }

    // ---------------- Worker callbacks (entry lifecycle) ----------------

    internal fun beginTransfer(context: Context, id: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            registry[index] = registry[index].copy(
                status = Status.Downloading,
                errorMessage = null,
            )
            val active = registry.count { it.status == Status.Downloading }
            Log.i(TAG, "transfer start id=$id active=$active")
            schedulePersist(appContext)
            scheduleNotify()
        }
    }

    internal fun reportProgress(context: Context, id: String, written: Long, total: Long?) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            val ratio = if (total != null && total > 0) written.toDouble() / total else 0.0
            val mark = progressGate.getOrPut(id) { ProgressMark(0L, 0.0) }
            val bytesDelta = written - mark.bytes
            val ratioDelta = kotlin.math.abs(ratio - mark.ratio)
            val isComplete = total != null && total > 0 && written >= total
            if (!isComplete && bytesDelta < PROGRESS_BYTES_THRESHOLD && ratioDelta < PROGRESS_RATIO_THRESHOLD) {
                return@runOnIo
            }
            mark.bytes = written
            mark.ratio = ratio
            registry[index] = registry[index].copy(
                status = Status.Downloading,
                bytesDownloaded = written,
                totalBytes = if (total != null && total > 0) total else registry[index].totalBytes,
                progress = if (total != null && total > 0) ratio else null,
            )
            // Progress is in-memory only — the JS owner used to skip disk
            // writes on progress ticks for the same reason: a 50/sec progress
            // callback would otherwise serialize the whole registry on every
            // packet. Status transitions ARE persisted.
            scheduleNotify()
        }
    }

    internal fun markCompleted(
        context: Context,
        id: String,
        localUri: String,
        bytesWritten: Long,
        totalBytes: Long,
    ) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            val total = if (totalBytes > 0) totalBytes else bytesWritten
            registry[index] = registry[index].copy(
                status = Status.Completed,
                bytesDownloaded = bytesWritten,
                totalBytes = total,
                progress = 1.0,
                localUri = localUri,
                completedAt = System.currentTimeMillis(),
                errorMessage = null,
                // It worked. Whatever it took to get here must not be charged
                // against the next time this row breaks.
                failureRecoverable = true,
                recoveryAttempts = 0,
                lastFailureAt = null,
            )
            progressGate.remove(id)
            schedulePersist(appContext)
            scheduleNotify()
            pumpQueueInternal(appContext)
        }
    }

    /**
     * @param recoverable false only when the transfer proved this can never
     *   succeed by being repeated (the 4xx answers that are the server saying
     *   the resource is not there). Those keep their Retry button and are left
     *   out of the automatic sweep; everything else — a dropped connection, a
     *   sleeping server, a 5xx — is exactly what the sweep is for.
     */
    internal fun markFailed(context: Context, id: String, message: String, recoverable: Boolean = true) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            registry[index] = registry[index].copy(
                status = Status.Failed,
                errorMessage = message,
                failureRecoverable = recoverable,
                lastFailureAt = System.currentTimeMillis(),
            )
            progressGate.remove(id)
            schedulePersist(appContext)
            scheduleNotify()
            pumpQueueInternal(appContext)
        }
    }

    internal fun markCanceled(context: Context, id: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            if (registry[index].status != Status.Completed) {
                // Reached only when the worker found the stop it observed was
                // the user's — cancel/remove both stamp the row before they
                // cancel the work, and a system stop routes to markInterrupted.
                registry[index] = registry[index].copy(
                    status = Status.Canceled,
                    progress = null,
                    canceledByUser = true,
                )
                deletePartialFor(appContext, registry[index])
                schedulePersist(appContext)
                scheduleNotify()
            }
            progressGate.remove(id)
            pumpQueueInternal(appContext)
        }
    }

    /**
     * Hands a stopped-but-not-canceled transfer back to the queue with its
     * resume point intact.
     *
     * Every worker runs inside a JobScheduler job, and JobScheduler stops a job
     * after roughly ten minutes regardless of what it is doing. Nothing about
     * that stop is a failure and nothing about it is the user's doing, so the
     * entry must keep both its `.part` file and its byte count and simply pick
     * up where it left off — the only way a download bigger than one execution
     * window ever completes. Unlike routine progress ticks this DOES hit disk:
     * the resume point has to outlive the process, not just the worker.
     */
    internal fun markInterrupted(context: Context, id: String, written: Long, total: Long?) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            val current = registry[index]
            // A cancel that landed while the worker was unwinding wins outright.
            // Never resurrect a row the user just retired.
            if (current.status != Status.Downloading) return@runOnIo
            val resolvedTotal = total?.takeIf { it > 0 } ?: current.totalBytes
            registry[index] = current.copy(
                status = Status.Queued,
                bytesDownloaded = written,
                totalBytes = resolvedTotal,
                progress = if (resolvedTotal != null && resolvedTotal > 0) {
                    written.toDouble() / resolvedTotal
                } else {
                    current.progress
                },
                errorMessage = null,
            )
            progressGate.remove(id)
            Log.i(TAG, "transfer interrupted id=$id resumeAt=$written total=${resolvedTotal ?: -1}")
            schedulePersist(appContext)
            scheduleNotify()
            // WorkManager reschedules an interrupted worker on its own; this is
            // the belt for the paths where it doesn't (a retry the system
            // dropped), and is a no-op while a work request already exists.
            pumpQueueInternal(appContext)
        }
    }

    /** See [userRetired]. True when the user retired this entry, so a stopped
     *  worker must treat its interruption as terminal. */
    internal fun isUserRetired(id: String): Boolean = userRetired.contains(id)

    internal fun findById(id: String): Entry? =
        synchronized(registry) { registry.firstOrNull { it.id == id } }

    /**
     * Updates the on-disk URI for a completed entry. Used by the JS shim
     * after a successful SAF copy moves the file off internal storage onto
     * the user's SD card — the registry still has to point at the new
     * `content://` URI so playback resolves the local file.
     */
    fun patchLocalUri(context: Context, id: String, localUri: String) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            val index = registry.indexOfFirst { it.id == id }
            if (index < 0) return@runOnIo
            registry[index] = registry[index].copy(localUri = localUri)
            schedulePersist(appContext)
            scheduleNotify()
        }
    }

    /**
     * Replaces the entire registry with the supplied entries. Only used by
     * the JS-side SAF discovery pass that scans the SD card for orphaned
     * .audio files after a reinstall, since that logic still lives in JS
     * (the SAF permission flow is JS-driven). Native won't reconcile on its
     * own — there's nothing to reconcile against unless someone tells it
     * what's on the SAF tree.
     */
    fun replaceAll(context: Context, entries: List<Entry>) {
        val appContext = context.applicationContext
        runOnIo {
            ensureLoaded(appContext)
            registry.clear()
            registry.addAll(entries)
            schedulePersist(appContext)
            scheduleNotify()
            pumpQueueInternal(appContext)
        }
    }

    internal fun localFileForEntry(context: Context, entry: Entry): File {
        val root = downloadsRoot(context.applicationContext)
        val collectionDir = File(
            File(root, sanitizeForPath(entry.collection.sourceId)),
            sanitizeForPath(entry.collection.id),
        )
        collectionDir.mkdirs()
        return File(collectionDir, sanitizeForPath(entry.trackId) + ".audio")
    }

    fun downloadsRootUri(context: Context): String {
        val root = downloadsRoot(context.applicationContext)
        return "file://${root.absolutePath}/"
    }

    // ---------------- Internals ----------------

    private fun runOnIo(block: () -> Unit) {
        ioExecutor.execute {
            try {
                block()
            } catch (error: Exception) {
                Log.w(TAG, "registry mutation failed", error)
            }
        }
    }

    private fun ensureLoaded(context: Context) {
        if (loaded) return
        val file = registryFile(context)
        if (file.exists()) {
            try {
                val raw = file.readText(Charsets.UTF_8)
                val array = JSONArray(raw)
                val parsed = mutableListOf<Entry>()
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i) ?: continue
                    runCatching { parsed.add(Entry.fromJson(obj)) }
                        .onFailure { Log.w(TAG, "skipping malformed entry: ${it.message}") }
                }
                registry = parsed
            } catch (error: Exception) {
                Log.w(TAG, "could not load registry: ${error.message}")
                registry = mutableListOf()
            }
        }
        loaded = true
    }

    private fun schedulePersist(context: Context) {
        val appContext = context.applicationContext
        if (persistRunnable != null) return
        val runnable = Runnable {
            persistRunnable = null
            try {
                val snapshot = JSONArray()
                for (entry in registry) {
                    snapshot.put(entry.toJson())
                }
                val file = registryFile(appContext)
                file.parentFile?.mkdirs()
                file.writeText(snapshot.toString(), Charsets.UTF_8)
            } catch (error: Exception) {
                Log.w(TAG, "could not persist registry", error)
            }
        }
        persistRunnable = runnable
        // Re-post onto the same executor with a small debounce so a burst of
        // mutations (enqueueing a whole album) coalesces into a single write.
        ioExecutor.execute {
            Thread.sleep(REGISTRY_PERSIST_DEBOUNCE_MS)
            ioExecutor.execute(runnable)
        }
    }

    private fun scheduleNotify() {
        if (notifyRunnable != null) return
        val seq = notifySequence.incrementAndGet()
        val runnable = Runnable {
            // If a later scheduleNotify already won, drop this one — the
            // newer fan-out picks up the same final state.
            if (seq != notifySequence.get()) return@Runnable
            notifyRunnable = null
            val snapshot = synchronized(registry) { registry.toList() }
            val current = synchronized(listeners) { listeners.toList() }
            for (listener in current) {
                try {
                    listener.onChanged(snapshot)
                } catch (error: Exception) {
                    Log.w(TAG, "listener failed", error)
                }
            }
        }
        notifyRunnable = runnable
        ioExecutor.execute {
            Thread.sleep(LISTENER_NOTIFY_THROTTLE_MS)
            ioExecutor.execute(runnable)
        }
    }

    private fun pumpQueueInternal(context: Context) {
        val appContext = context.applicationContext
        // The workers themselves keep the foreground service alive, and
        // WorkManager handles the actual serial scheduling via the unique
        // work name shared per entry. All we need here is to make sure every
        // queued entry has a work request pending.
        for (entry in registry) {
            if (entry.status == Status.Queued) {
                scheduleWork(appContext, entry.id)
            }
        }
    }

    private fun scheduleWork(context: Context, id: String) {
        val appContext = context.applicationContext
        val request = OneTimeWorkRequestBuilder<SamoDownloadWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, java.util.concurrent.TimeUnit.SECONDS)
            .setInputData(
                Data.Builder()
                    .putString(SamoDownloadWorker.KEY_ENTRY_ID, id)
                    .build(),
            )
            .build()
        WorkManager.getInstance(appContext).enqueueUniqueWork(
            workName(id),
            ExistingWorkPolicy.KEEP,
            request,
        )
    }

    private fun workName(id: String): String = WORK_NAME_PREFIX + id

    private fun buildEntryId(): String =
        "dl-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}"

    private fun registryFile(context: Context): File =
        File(context.filesDir, REGISTRY_FILE)

    private fun downloadsRoot(context: Context): File =
        File(context.filesDir, "samo-downloads").also { it.mkdirs() }

    /** Drops the resumable `.part` scratch file for an entry. Terminal paths
     *  only — an interrupted transfer's partial is exactly what lets it
     *  finish. */
    private fun deletePartialFor(context: Context, entry: Entry) {
        try {
            val partial = File(localFileForEntry(context, entry).absolutePath + ".part")
            if (partial.exists()) partial.delete()
        } catch (error: Exception) {
            Log.w(TAG, "could not delete partial: ${error.message}")
        }
    }

    private fun deleteLocalFile(uri: String) {
        if (uri.isBlank()) return
        try {
            if (uri.startsWith("file://")) {
                val file = File(uri.removePrefix("file://"))
                if (file.exists()) file.delete()
            }
            // SAF (content://) URIs are not deleted here — the JS shim still
            // owns SAF cleanup so we don't have to thread the ContentResolver
            // through every removal path.
        } catch (error: Exception) {
            Log.w(TAG, "could not delete local file: ${error.message}")
        }
    }

    private val ACTIVE_OR_COMPLETED = setOf(Status.Queued, Status.Downloading, Status.Completed)

    private fun sanitizeForPath(value: String): String =
        value.replace(Regex("[^a-zA-Z0-9._-]+"), "_").take(80).ifBlank { "item" }
}

private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val value = optString(key)
    return value.ifBlank { null }
}

private fun JSONObject.optLongOrNull(key: String): Long? {
    if (!has(key) || isNull(key)) return null
    return optLong(key)
}

private fun JSONObject.optDoubleOrNull(key: String): Double? {
    if (!has(key) || isNull(key)) return null
    val value = optDouble(key, Double.NaN)
    return if (value.isNaN()) null else value
}

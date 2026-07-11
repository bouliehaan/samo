package app.samo.android.audio

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * THE catalog sync engine. Kotlin is the single owner of the on-device mirror:
 * items, tracks, detail payloads, the FTS index, deletion reconcile, the delta
 * cursor, and mirror-completeness healing all live here, driven by WorkManager
 * (periodic + sync-now) so the library stays fresh through Doze and screen
 * sleep with zero JS involvement.
 *
 * The JS side READS the mirror (catalog-repository / catalog-reads) and maps
 * raw detail payloads to view models at read time — the canonical
 * server-JSON→view-model mapping stays in TypeScript (shared with the network
 * path and desktop), which is why detail rows store the RAW server responses
 * in a `$samoRawDetail` envelope instead of pre-mapped view models. One sync
 * owner, one mapping implementation.
 *
 * History note: this replaces the v0 coexistence design where a JS engine and
 * this one shared the cursor and split the tables — the split-brain that
 * needed an FTS healer and a completeness backfill to limp along. Both
 * healers' jobs are now structural: a single writer can't diverge from
 * itself, and the completeness check (ported below) only guards against
 * transient partial enumerations.
 */
internal object SamoCatalogSync {
    private const val TAG = "SamoCatalogSync"

    // v4: track payloads are raw `$samoRawTrack` envelopes (hydrated through
    // the canonical JS mapper, so they carry full playback). v3 wrote slim
    // track payloads without playback; the version bump forces one full
    // re-enumerate that rewrites every row under the new scheme.
    private const val SYNC_LOGIC_VERSION = 4

    /** Concurrent detail fetches per batch (network-bound; writes stay serial). */
    private const val DETAIL_FETCH_CONCURRENCY = 4

    /**
     * PRAGMA user_version latch for detail-bundle shape migrations. Version 1:
     * playlist tracks + podcast episodes are paginated to exhaustion (bundles
     * written earlier are truncated at 500 and get one forced re-crawl).
     */
    private const val DETAIL_BUNDLE_SCHEMA_VERSION = 1

    /**
     * Concurrent page fetches for the /music/tracks walk — the single
     * largest sequential leg of a sync (14k+ rows / 200 per page = 70+
     * round trips for a big library). See
     * SamoCatalogServerClient.fetchAllPagesConcurrent for why this matters
     * once the server is reached over a real internet connection instead of
     * a LAN.
     */
    private const val TRACK_FETCH_CONCURRENCY = 4

    private val COLLECTION_VARIANTS = listOf(
        Variant("album", "albums", "/music/albums"),
        Variant("artist", "artists", "/music/artists"),
        Variant("audiobook", "audiobooks", "/audiobooks"),
        Variant("playlist", "playlists", "/music/playlists"),
        Variant("podcast", "podcasts", "/podcasts"),
    )

    private data class Variant(
        /** Catalog `type` column value. */
        val catalogType: String,
        /** Manifest ids field name (plural). */
        val manifestKey: String,
        /** List endpoint path. */
        val path: String,
    )

    data class SourceResult(
        val sourceId: String,
        val items: Long,
        val tracks: Long,
        val details: Long,
        val errors: List<String>,
    )

    data class Summary(val results: List<SourceResult>)

    private val isRunning = AtomicBoolean(false)

    /**
     * Run the sync for the active Samo connection.
     */
    fun runAll(context: Context, connection: SamoAuthMirror.Connection): Summary {
        if (!isRunning.compareAndSet(false, true)) {
            Log.w(TAG, "catalog sync aborted: another sync is already in progress")
            return Summary(emptyList())
        }

        try {
            val result = runOne(context, connection)
            return Summary(listOf(result))
        } catch (error: Throwable) {
            Log.w(TAG, "source ${connectionKey(connection)} failed", error)
            val sourceId = connectionKey(connection)
            SamoCatalogSyncEvents.emit(sourceId, "error", 0, 0, 0, error.message)
            return Summary(
                listOf(SourceResult(sourceId, 0L, 0L, 0L, listOf(error.message ?: error::class.java.simpleName)))
            )
        } finally {
            isRunning.set(false)
        }
    }

    private fun runOne(context: Context, conn: SamoAuthMirror.Connection): SourceResult {
        val sourceId = connectionKey(conn)
        try {
            return runOneInner(context, conn, sourceId)
        } catch (error: Throwable) {
            // ANY uncaught throw must still land in the sync-state row —
            // otherwise the panel shows "syncing" forever and the error only
            // exists in logcat. Best-effort: the failure may itself be a DB
            // problem, in which case the emit below still reaches the UI.
            runCatching {
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.markSyncFailed(
                        db,
                        sourceId,
                        error.message ?: error::class.java.simpleName,
                    )
                }
            }
            throw error
        }
    }

    private fun runOneInner(
        context: Context,
        conn: SamoAuthMirror.Connection,
        sourceId: String,
    ): SourceResult {
        val syncedAt = System.currentTimeMillis()
        val errors = mutableListOf<String>()

        // Read state BEFORE marking started. (markSyncStarted now preserves
        // the cursor, but reading first keeps the order obviously correct —
        // the original code read after a cursor-clobbering write and silently
        // ran a FULL re-enumerate every 30 minutes.)
        val priorState = SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.getSyncState(db, sourceId)
        }
        val parsedCursor = parseCursor(priorState?.cursor)
        val priorWatermark = parsedCursor?.optString("deltaServerTime").nullIfBlankLocal()
        val versionOk = parsedCursor?.optInt("syncVersion") == SYNC_LOGIC_VERSION
        val priorReconciled = parsedCursor?.optLong("reconciledItemCount") ?: 0L
        val priorEpisodeCount = parsedCursor?.optLong("episodeCount") ?: -1L

        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.markSyncStarted(db, sourceId)
        }
        SamoCatalogSyncEvents.emit(sourceId, "syncing", 0, 0, 0, null)

        val streamToken = SamoCatalogServerClient.mintStreamToken(conn)
        if (streamToken == null) {
            // We can still sync — artwork URLs degrade to un-tokenized form.
            errors.add("stream-token mint failed; artwork URLs will be un-tokenized")
        }

        val source = buildSourceJson(conn)

        val manifest = try {
            SamoCatalogServerClient.fetchManifest(conn)
        } catch (error: SamoCatalogServerClient.FetchException) {
            if (error.kind == SamoCatalogServerClient.FailureKind.Network || error.kind == SamoCatalogServerClient.FailureKind.Auth) {
                throw error
            }
            errors.add("manifest fetch failed: ${error.message ?: error::class.java.simpleName}")
            null
        } catch (error: Throwable) {
            errors.add("manifest fetch failed: ${error.message ?: error::class.java.simpleName}")
            null
        }
        val manifestItems = manifest?.let { manifestItemCount(it) } ?: 0L
        val manifestEpisodeCount =
            manifest?.optJSONObject("ids")?.optJSONArray("episodes")?.length()?.toLong() ?: -1L

        val isDelta = manifest != null && priorWatermark != null && versionOk

        var counts: Counts
        var ranFull = false
        if (isDelta) {
            counts = runDelta(
                context, conn, source, streamToken, syncedAt, priorWatermark!!, manifest!!,
                crawlAllPodcasts = manifestEpisodeCount != priorEpisodeCount,
            )
            errors.addAll(counts.errors)

            // Completeness backfill (ported decision logic, JUnit-locked): a
            // delta can never resurrect unchanged rows lost to an interrupted
            // enumerate, so when the mirror is short of the manifest's
            // authoritative item count — and the server has grown past the
            // size we last reconciled at — run one full pass to converge.
            val localItems = SamoCatalogWriter.withTransactionImmediate(context) { db ->
                SamoCatalogWriter.getSourceCounts(db, sourceId).first
            }
            if (shouldBackfillMirror(localItems, manifestItems, priorReconciled)) {
                Log.i(TAG, "mirror short ($localItems < $manifestItems); running backfill full sync")
                val full = runFull(context, conn, source, streamToken, syncedAt)
                errors.addAll(full.errors)
                counts = full
                ranFull = true
            }
        } else {
            counts = runFull(context, conn, source, streamToken, syncedAt)
            errors.addAll(counts.errors)
            ranFull = true
        }

        // Prune is only safe after a CLEAN full walk: a variant whose fetch
        // failed never re-touched its rows, and pruning would silently delete
        // a whole slice of the library (the old engine did exactly that).
        // Extra guard: a clean walk that found ZERO items against a mirror
        // that HAS rows is treated as a contract failure, not a deletion of
        // everything — exactly the failure mode the data/items pagination-key
        // mismatch produced.
        if (ranFull && errors.none { !it.startsWith("stream-token") }) {
            val priorItems = SamoCatalogWriter.withTransactionImmediate(context) { db ->
                SamoCatalogWriter.getSourceCounts(db, sourceId).first
            }
            if (counts.items == 0L && priorItems > 0L) {
                errors.add("full walk returned 0 items against a populated mirror; prune skipped")
            } else {
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.pruneSource(db, sourceId, syncedAt)
                }
            }
        }

        // The cursor advances ONLY on a clean run. A run with errors keeps the
        // prior watermark so the next delta re-pulls the same window — upserts
        // are idempotent, so replays are safe and nothing is silently skipped.
        val hadRealErrors = errors.any { !it.startsWith("stream-token") }
        val nextCursor = if (manifest != null && !hadRealErrors) {
            JSONObject()
                .put("deltaServerTime", manifest.optString("serverTime"))
                .put("syncVersion", SYNC_LOGIC_VERSION)
                .put(
                    "reconciledItemCount",
                    nextReconciledItemCount(hadRealErrors, manifestItems, priorReconciled),
                )
                .put("episodeCount", manifestEpisodeCount)
                .toString()
        } else {
            priorState?.cursor
        }

        // Reconcile the Kotlin-owned FTS index from the rows this pass wrote,
        // BEFORE the 'synced' event — so search freshness lands with the same
        // event that re-derives Home/Library. Fail-soft internally: an FTS
        // hiccup never fails the sync.
        SamoCatalogSearch.reconcile(context, sourceId)

        val finalCounts = SamoCatalogWriter.withTransactionImmediate(context) { db ->
            val sourceCounts = SamoCatalogWriter.getSourceCounts(db, sourceId)
            if (!hadRealErrors || counts.items > 0 || counts.tracks > 0) {
                SamoCatalogWriter.markSyncSucceeded(db, sourceId, sourceCounts, nextCursor)
            } else {
                SamoCatalogWriter.markSyncFailed(db, sourceId, errors.joinToString("; ").take(500))
            }
            sourceCounts
        }

        // Close the writer between syncs: frees the connection's page cache
        // for 30 idle minutes and lets SQLite checkpoint the WAL. Nothing on
        // the JS side holds handles to this file anymore, so this close is
        // purely local hygiene (the old POSIX lock-release choreography with
        // expo-sqlite is gone).
        SamoCatalogWriter.close()

        SamoCatalogSyncEvents.emit(
            sourceId,
            if (!hadRealErrors || counts.items > 0 || counts.tracks > 0) "synced" else "error",
            finalCounts.first,
            finalCounts.second,
            finalCounts.third,
            if (hadRealErrors) errors.joinToString("; ").take(500) else null,
        )

        return SourceResult(sourceId, counts.items, counts.tracks, counts.details, errors)
    }

    private data class Counts(
        val items: Long,
        val tracks: Long,
        val details: Long,
        val errors: List<String>,
    )

    /**
     * Full re-enumerate: every variant, the whole track table, every detail
     * crawl, and a from-scratch FTS rebuild.
     */
    private fun runFull(
        context: Context,
        conn: SamoAuthMirror.Connection,
        source: JSONObject,
        streamToken: String?,
        syncedAt: Long,
    ): Counts {
        val sourceId = source.optString("id")
        val errors = mutableListOf<String>()
        var totalItems = 0L
        var totalTracks = 0L

        // 1. Items per variant — streamed page-by-page (memory O(page)).
        val itemIdsByType = HashMap<String, MutableList<String>>()
        for (variant in COLLECTION_VARIANTS) {
            try {
                SamoCatalogServerClient.fetchPagesStreaming(conn, variant.path) { records ->
                    val rows = records.mapNotNull { record ->
                        convertToItem(variant.catalogType, sourceId, conn.url, streamToken, source, record, syncedAt)
                    }
                    SamoCatalogWriter.withTransactionImmediate(context) { db ->
                        SamoCatalogWriter.upsertItems(db, rows)
                    }
                    itemIdsByType.getOrPut(variant.catalogType) { mutableListOf() }
                        .addAll(rows.map { it.id })
                    totalItems += rows.size.toLong()
                    progress(context, sourceId, totalItems, totalTracks, 0)
                }
            } catch (error: SamoCatalogServerClient.FetchException) {
                if (error.kind == SamoCatalogServerClient.FailureKind.Network || error.kind == SamoCatalogServerClient.FailureKind.Auth) {
                    throw error
                }
                errors.add("${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            } catch (error: Throwable) {
                errors.add("${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            }
        }
        progress(context, sourceId, totalItems, 0, 0)

        // 2. Track table — STREAMED page-by-page. Accumulating all 14k+ raw
        //    track JSONs (now full envelopes) alongside the live app blew the
        //    256MB heap on-device. No grouping needed: each row's `position`
        //    is the (disc, track) formula, independent of its siblings.
        try {
            SamoCatalogServerClient.fetchAllPagesConcurrent(
                conn,
                "/music/tracks",
                TRACK_FETCH_CONCURRENCY,
            ) { records ->
                val rows = records.mapNotNull { record ->
                    SamoCatalogConverters.musicTrackToAlbumTrack(
                        sourceId = sourceId,
                        serverUrl = conn.url,
                        streamToken = streamToken,
                        source = source,
                        track = record,
                        syncedAt = syncedAt,
                    )
                }
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertTracks(db, rows)
                }
                totalTracks += rows.size.toLong()
                progress(context, sourceId, totalItems, totalTracks, 0)
            }
        } catch (error: SamoCatalogServerClient.FetchException) {
            if (error.kind == SamoCatalogServerClient.FailureKind.Network || error.kind == SamoCatalogServerClient.FailureKind.Auth) {
                throw error
            }
            errors.add("tracks: ${error.message ?: error::class.java.simpleName}")
        } catch (error: Throwable) {
            errors.add("tracks: ${error.message ?: error::class.java.simpleName}")
        }
        progress(context, sourceId, totalItems, totalTracks, 0)

        // (No FTS writes here: catalog_search is JS-owned — the platform
        // SQLite this connection runs on has no fts5 module. The JS indexer
        // derives search rows from the item/track tables after each sync.)

        // 3. Detail crawls for every container entity.
        val crawlTargets = mutableListOf<DetailTarget>()
        for (kind in listOf("artist", "playlist", "audiobook", "podcast")) {
            for (id in itemIdsByType[kind] ?: emptyList()) {
                crawlTargets.add(DetailTarget(kind, id))
            }
        }
        val details = crawlDetails(context, conn, sourceId, syncedAt, crawlTargets, errors) {
            progress(context, sourceId, totalItems, totalTracks, it)
        }

        // A clean full pass rewrote every bundle exhaustively — the truncated-
        // bundle backfill (see runDelta) has nothing left to do.
        if (errors.isEmpty()) {
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                db.version = DETAIL_BUNDLE_SCHEMA_VERSION
            }
        }

        return Counts(totalItems, totalTracks, details, errors)
    }

    /**
     * Incremental delta: per-variant filtered by `updatedSince`, targeted
     * detail re-crawls, FTS refresh for changed rows, then manifest-based
     * deletion reconcile across items, tracks, details, and search.
     */
    private fun runDelta(
        context: Context,
        conn: SamoAuthMirror.Connection,
        source: JSONObject,
        streamToken: String?,
        syncedAt: Long,
        watermark: String,
        manifest: JSONObject,
        crawlAllPodcasts: Boolean,
    ): Counts {
        val sourceId = source.optString("id")
        val errors = mutableListOf<String>()
        var totalItems = 0L
        var totalTracks = 0L

        val justUpsertedByVariant = HashMap<String, HashSet<String>>()

        for (variant in COLLECTION_VARIANTS) {
            try {
                SamoCatalogServerClient.fetchPagesStreaming(
                    conn,
                    variant.path,
                    updatedSince = watermark,
                ) { records ->
                    val rows = records.mapNotNull { record ->
                        convertToItem(variant.catalogType, sourceId, conn.url, streamToken, source, record, syncedAt)
                    }
                    SamoCatalogWriter.withTransactionImmediate(context) { db ->
                        SamoCatalogWriter.upsertItems(db, rows)
                    }
                    justUpsertedByVariant.getOrPut(variant.catalogType) { HashSet() }
                        .addAll(rows.map { it.id })
                    totalItems += rows.size.toLong()
                    progress(context, sourceId, totalItems, totalTracks, 0)
                }
            } catch (error: SamoCatalogServerClient.FetchException) {
                if (error.kind == SamoCatalogServerClient.FailureKind.Network || error.kind == SamoCatalogServerClient.FailureKind.Auth) {
                    throw error
                }
                errors.add("delta ${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            } catch (error: Throwable) {
                errors.add("delta ${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            }
        }

        // Changed tracks (updatedSince), streamed.
        val justUpsertedTrackIds = HashSet<String>()
        val changedTrackArtistIds = HashSet<String>()
        try {
            SamoCatalogServerClient.fetchAllPagesConcurrent(
                conn,
                "/music/tracks",
                TRACK_FETCH_CONCURRENCY,
                updatedSince = watermark,
            ) { records ->
                val rows = records.mapNotNull { record ->
                    SamoCatalogConverters.musicTrackToAlbumTrack(
                        sourceId, conn.url, streamToken, source, record, syncedAt,
                    )
                }
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertTracks(db, rows)
                }
                for (row in rows) {
                    justUpsertedTrackIds.add(row.trackId)
                    row.artistId?.let { changedTrackArtistIds.add(it) }
                }
                totalTracks += rows.size.toLong()
                progress(context, sourceId, totalItems, totalTracks, 0)
            }
        } catch (error: SamoCatalogServerClient.FetchException) {
            if (error.kind == SamoCatalogServerClient.FailureKind.Network || error.kind == SamoCatalogServerClient.FailureKind.Auth) {
                throw error
            }
            errors.add("delta tracks: ${error.message ?: error::class.java.simpleName}")
        } catch (error: Throwable) {
            errors.add("delta tracks: ${error.message ?: error::class.java.simpleName}")
        }
        progress(context, sourceId, totalItems, totalTracks, 0)

        // Targeted detail re-crawls:
        //  - artists whose row changed OR that own a changed track (top-tracks
        //    style children are artist-detail data);
        //  - playlists / audiobooks whose row changed (edits bump the row);
        //  - podcasts whose row changed, plus ALL podcasts when the manifest's
        //    episode count moved (a new episode does not necessarily bump the
        //    show row — the old engine re-crawled every show on every delta).
        val crawlTargets = mutableListOf<DetailTarget>()
        val artistTargets = HashSet(justUpsertedByVariant["artist"] ?: emptySet())
        artistTargets.addAll(changedTrackArtistIds)
        artistTargets.forEach { crawlTargets.add(DetailTarget("artist", it)) }
        (justUpsertedByVariant["playlist"] ?: emptySet()).forEach {
            crawlTargets.add(DetailTarget("playlist", it))
        }
        (justUpsertedByVariant["audiobook"] ?: emptySet()).forEach {
            crawlTargets.add(DetailTarget("audiobook", it))
        }
        val podcastTargets = HashSet(justUpsertedByVariant["podcast"] ?: emptySet())
        if (crawlAllPodcasts) {
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                podcastTargets.addAll(SamoCatalogWriter.getItemIdsByType(db, sourceId, "podcast"))
            }
        }
        podcastTargets.forEach { crawlTargets.add(DetailTarget("podcast", it)) }

        // One-time exhaustive-detail backfill (latched via PRAGMA user_version):
        // bundles stored before the pagination fix are TRUNCATED at 500 playlist
        // tracks / podcast episodes, and a delta only re-crawls entities whose
        // row changed — a big playlist that never changes again would stay
        // truncated forever. Re-crawl them all once; the latch is only advanced
        // after an error-free pass so an interrupted backfill retries.
        var detailBackfillPending = false
        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            if (db.version < DETAIL_BUNDLE_SCHEMA_VERSION) {
                detailBackfillPending = true
                for (kind in listOf("playlist", "podcast")) {
                    SamoCatalogWriter.getItemIdsByType(db, sourceId, kind).forEach {
                        crawlTargets.add(DetailTarget(kind, it))
                    }
                }
            }
        }

        val details = crawlDetails(
            context, conn, sourceId, syncedAt, crawlTargets.distinct(), errors,
        ) {
            progress(context, sourceId, totalItems, totalTracks, it)
        }
        if (detailBackfillPending && errors.isEmpty()) {
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                db.version = DETAIL_BUNDLE_SCHEMA_VERSION
            }
        }

        // Manifest-based deletion reconcile across every table.
        val manifestIds = manifest.optJSONObject("ids") ?: JSONObject()
        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            for (variant in COLLECTION_VARIANTS) {
                val serverSet = jsonStringArrayToSet(manifestIds.optJSONArray(variant.manifestKey))
                val justUpserted = justUpsertedByVariant[variant.catalogType] ?: emptySet()
                val localIds = SamoCatalogWriter.getItemIdsByType(db, sourceId, variant.catalogType)
                // Type-wipe guard (sibling of the prune guard): a manifest that
                // lists ZERO ids for a type the mirror has plenty of is far more
                // likely a server-side hiccup (partial reload, broken sub-table)
                // than a real mass deletion — and on 2026-06-12 exactly that
                // silently erased every podcast from the device. Skip the type,
                // record an error (parks the cursor for retry); when the server
                // recovers, the completeness backfill restores the mirror.
                if (serverSet.isEmpty() && localIds.isNotEmpty()) {
                    errors.add(
                        "manifest lists 0 ${variant.catalogType} but mirror has ${localIds.size}; reconcile skipped",
                    )
                    continue
                }
                val removed = localIds.filter { it !in serverSet && it !in justUpserted }
                if (removed.isNotEmpty()) {
                    SamoCatalogWriter.deleteItemsByIds(db, sourceId, variant.catalogType, removed)
                    if (variant.catalogType == "album") {
                        SamoCatalogWriter.deleteTracksByTrackIds(db, sourceId, removed, listOf("album"))
                    } else {
                        SamoCatalogWriter.deleteDetailsByEntityIds(db, sourceId, variant.catalogType, removed)
                    }
                }
            }

            val musicContainers = listOf("album")
            val serverTracks = jsonStringArrayToSet(manifestIds.optJSONArray("tracks"))
            val localTrackIds = SamoCatalogWriter.getDistinctTrackIds(db, sourceId, musicContainers)
            if (serverTracks.isEmpty() && localTrackIds.isNotEmpty()) {
                errors.add("manifest lists 0 tracks but mirror has ${localTrackIds.size}; reconcile skipped")
            } else {
                val removedTracks = localTrackIds.filter { it !in serverTracks && it !in justUpsertedTrackIds }
                if (removedTracks.isNotEmpty()) {
                    SamoCatalogWriter.deleteTracksByTrackIds(db, sourceId, removedTracks, musicContainers)
                }
            }
        }

        return Counts(totalItems, totalTracks, details, errors)
    }

    // -----------------------------------------------------------------------
    // Detail crawls
    // -----------------------------------------------------------------------

    private data class DetailTarget(val kind: String, val id: String)

    /**
     * Fetch raw detail bundles with bounded concurrency and store them under
     * the `$samoRawDetail` envelope the JS read-time mapper understands.
     * Writes are serialized per batch so transactions never overlap.
     */
    private fun crawlDetails(
        context: Context,
        conn: SamoAuthMirror.Connection,
        sourceId: String,
        syncedAt: Long,
        targets: List<DetailTarget>,
        errors: MutableList<String>,
        onProgress: (Long) -> Unit,
    ): Long {
        if (targets.isEmpty()) return 0L
        val pool = Executors.newFixedThreadPool(DETAIL_FETCH_CONCURRENCY)
        var stored = 0L
        try {
            for (batch in targets.chunked(DETAIL_FETCH_CONCURRENCY * 4)) {
                val tasks = batch.map { target ->
                    Callable<Pair<DetailTarget, JSONObject?>> {
                        try {
                            target to fetchDetailBundle(conn, target)
                        } catch (error: Throwable) {
                            synchronized(errors) {
                                errors.add("detail ${target.kind} ${target.id}: ${error.message ?: error::class.java.simpleName}")
                            }
                            target to null
                        }
                    }
                }
                val fetched = pool.invokeAll(tasks).mapNotNull { future ->
                    val (target, bundle) = future.get()
                    bundle?.let {
                        SamoCatalogWriter.DetailBinding(
                            sourceId = sourceId,
                            type = target.kind,
                            entityId = target.id,
                            payload = it.toString(),
                            syncedAt = syncedAt,
                        )
                    }
                }
                if (fetched.isNotEmpty()) {
                    SamoCatalogWriter.withTransactionImmediate(context) { db ->
                        SamoCatalogWriter.upsertDetails(db, fetched)
                    }
                    stored += fetched.size.toLong()
                    onProgress(stored)
                }
            }
        } finally {
            pool.shutdown()
        }
        return stored
    }

    /** Endpoint shapes mirror the TS network loaders (loadSamo*Detail). */
    private fun fetchDetailBundle(conn: SamoAuthMirror.Connection, target: DetailTarget): JSONObject {
        val children = JSONObject()
        val entity: JSONObject
        when (target.kind) {
            "artist" -> {
                val encoded = SamoNativeStreamUrl.encodeSamoId(target.id)
                // The artist entity carries biography + similarArtists (server
                // hydrates them); albums are required. Top tracks + appears-on
                // are enrichment rails — best-effort so an older server (or a
                // transient error) still yields a usable mirrored artist page.
                entity = SamoCatalogServerClient.fetchObject(conn, "/music/artists/$encoded")
                children.put(
                    "albums",
                    SamoCatalogServerClient.fetchRaw(conn, "/music/artists/$encoded/albums", mapOf("limit" to "200")),
                )
                runCatching {
                    children.put(
                        "topTracks",
                        SamoCatalogServerClient.fetchRaw(conn, "/music/artists/$encoded/top-tracks", mapOf("limit" to "5")),
                    )
                }
                runCatching {
                    children.put(
                        "appearsOn",
                        SamoCatalogServerClient.fetchRaw(conn, "/music/artists/$encoded/appears-on", mapOf("limit" to "20")),
                    )
                }
            }
            "playlist" -> {
                entity = SamoCatalogServerClient.fetchObject(conn, "/music/playlists/${target.id}")
                // Paginate to exhaustion — a single limit=500 page silently
                // TRUNCATED any larger playlist in the mirror, so a
                // 1,200-track playlist could never render complete from the
                // local catalog no matter what the read path did.
                children.put(
                    "tracks",
                    JSONArray(SamoCatalogServerClient.fetchAllPages(conn, "/music/playlists/${target.id}/tracks")),
                )
            }
            "audiobook" -> {
                entity = SamoCatalogServerClient.fetchObject(conn, "/audiobooks/${target.id}")
                // Bookmarks + sessions are user niceties — fetch best-effort,
                // exactly like the TS loader's .catch(() => undefined).
                runCatching {
                    children.put("bookmarks", SamoCatalogServerClient.fetchRaw(conn, "/audiobooks/${target.id}/bookmarks", emptyMap()))
                }
                runCatching {
                    children.put("sessions", SamoCatalogServerClient.fetchRaw(conn, "/audiobooks/${target.id}/sessions", mapOf("limit" to "25")))
                }
            }
            "podcast" -> {
                entity = SamoCatalogServerClient.fetchObject(conn, "/podcasts/shows/${target.id}")
                // Same exhaustive walk as playlists: daily shows pass 500
                // episodes quickly, and a capped page hid everything older.
                children.put(
                    "episodes",
                    JSONArray(SamoCatalogServerClient.fetchAllPages(conn, "/podcasts/shows/${target.id}/episodes")),
                )
            }
            else -> throw IllegalArgumentException("unknown detail kind ${target.kind}")
        }
        return JSONObject()
            .put("\$samoRawDetail", 1)
            .put("kind", target.kind)
            .put("entity", entity)
            .put("children", children)
    }

    // -----------------------------------------------------------------------
    // Completeness decision logic (ported from catalog-sync-completeness.ts;
    // JUnit-locked in SamoCatalogSyncDecisionTest).
    // -----------------------------------------------------------------------

    fun manifestItemCount(manifest: JSONObject): Long {
        val ids = manifest.optJSONObject("ids") ?: return 0L
        var total = 0L
        for (key in listOf("albums", "artists", "audiobooks", "playlists", "podcasts")) {
            total += ids.optJSONArray(key)?.length()?.toLong() ?: 0L
        }
        return total
    }

    fun shouldBackfillMirror(localItems: Long, manifestItems: Long, reconciledItems: Long): Boolean =
        localItems < manifestItems && manifestItems > reconciledItems

    fun nextReconciledItemCount(hadErrors: Boolean, manifestItems: Long, priorReconciled: Long): Long =
        if (hadErrors) priorReconciled else manifestItems

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private fun progress(context: Context, sourceId: String, items: Long, tracks: Long, details: Long) {
        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.setSyncProgress(db, sourceId, Triple(items, tracks, details))
        }
        SamoCatalogSyncEvents.emit(sourceId, "syncing", items, tracks, details, null)
    }

    private fun convertToItem(
        type: String,
        sourceId: String,
        serverUrl: String,
        streamToken: String?,
        source: JSONObject,
        record: JSONObject,
        syncedAt: Long,
    ): SamoCatalogConverters.ItemBinding? =
        when (type) {
            "album" -> SamoCatalogConverters.albumToItem(sourceId, serverUrl, streamToken, source, record, syncedAt)
            "artist" -> SamoCatalogConverters.artistToItem(sourceId, serverUrl, streamToken, source, record, syncedAt)
            "audiobook" -> SamoCatalogConverters.audiobookToItem(sourceId, serverUrl, streamToken, source, record, syncedAt)
            "playlist" -> SamoCatalogConverters.playlistToItem(sourceId, serverUrl, streamToken, source, record, syncedAt)
            "podcast" -> SamoCatalogConverters.podcastToItem(sourceId, serverUrl, streamToken, source, record, syncedAt)
            else -> null
        }

    private fun buildSourceJson(conn: SamoAuthMirror.Connection): JSONObject =
        JSONObject()
            .put("id", connectionKey(conn))
            .put("type", conn.type)
            .put("url", conn.url)

    /** Matches `getServerConnectionKey` in core/server-session.ts. */
    private fun connectionKey(conn: SamoAuthMirror.Connection): String =
        "${conn.type}:${conn.url.trimEnd('/')}"

    private fun parseCursor(raw: String?): JSONObject? {
        if (raw.isNullOrBlank()) return null
        return try {
            JSONObject(raw)
        } catch (_: Throwable) {
            null
        }
    }

    private fun jsonStringArrayToSet(array: JSONArray?): Set<String> {
        if (array == null) return emptySet()
        val out = HashSet<String>(array.length())
        for (i in 0 until array.length()) {
            val s = array.optString(i)
            if (s.isNotBlank()) out.add(s)
        }
        return out
    }
}

/**
 * Best-effort progress fan-out to JS. The module registers an emitter while a
 * React context is alive; the background worker runs without one and simply
 * logs — JS re-hydrates sync state from the table on the next foreground.
 */
internal object SamoCatalogSyncEvents {
    @Volatile var emitter: ((sourceId: String, status: String, items: Long, tracks: Long, details: Long, error: String?) -> Unit)? = null

    fun emit(sourceId: String, status: String, items: Long, tracks: Long, details: Long, error: String?) {
        try {
            emitter?.invoke(sourceId, status, items, tracks, details, error)
        } catch (e: Throwable) {
            Log.d("SamoCatalogSync", "progress emit dropped: ${e.message}")
        }
    }
}

private fun String?.nullIfBlankLocal(): String? =
    if (this.isNullOrBlank() || this == "null") null else this

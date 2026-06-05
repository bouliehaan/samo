package app.samo.android.audio

import android.content.Context
import android.util.Log
import org.json.JSONObject

/**
 * Phase 5 PROPER orchestrator: drives the full + delta sync paths for every
 * Samo connection in the auth mirror. Mirrors `services/catalog/catalog-sync.ts`
 * structurally — full sync on a fresh install or version bump, delta sync
 * elsewhere, manifest-based deletion reconcile on delta runs — but stays
 * entirely native so it survives Doze + screen sleep.
 *
 * v0 SCOPE:
 *   - catalog_item upserts for ALBUM / ARTIST / AUDIOBOOK / PLAYLIST / PODCAST
 *   - catalog_track upserts (album container only, from `/music/tracks`)
 *   - manifest reconcile (delete items + tracks absent from the manifest)
 *   - synced_at watermark + pruneSource on full runs
 *   - cursor advancement (server clock as the next updatedSince)
 *
 * OUT OF SCOPE (still owned by the JS foreground `syncSamoCatalog`):
 *   - catalog_detail (per-entity crawls: artist top-tracks, audiobook
 *     chapters, playlist tracks, podcast episodes)
 *   - catalog_search FTS5 indexing (rows still searchable via foreground sync)
 *   - tracks under non-album containers (artist/playlist/podcast)
 *
 * Bumped whenever the on-device sync writes data in a way an older delta
 * can't safely extend. Mirrors SYNC_LOGIC_VERSION in catalog-sync.ts so a
 * persisted cursor from the JS-only era stays valid here.
 */
internal object SamoCatalogSync {
    private const val TAG = "SamoCatalogSync"
    private const val SYNC_LOGIC_VERSION = 2

    private val COLLECTION_VARIANTS = listOf(
        Variant("album", "album", "/music/albums"),
        Variant("artist", "artist", "/music/artists"),
        Variant("audiobook", "audiobook", "/audiobooks"),
        Variant("playlist", "playlist", "/music/playlists"),
        Variant("podcast", "podcast", "/podcasts"),
    )

    private data class Variant(
        /** Catalog `type` column value. */
        val catalogType: String,
        /** Manifest field name (singular form), e.g. "album" → manifest.ids.albums. */
        val manifestKey: String,
        /** List endpoint path. */
        val path: String,
    )

    data class SourceResult(
        val sourceId: String,
        val items: Long,
        val tracks: Long,
        val errors: List<String>,
    )

    data class Summary(val results: List<SourceResult>)

    /**
     * Run the sync for every Samo connection in the mirror. Sources are
     * processed sequentially because they share the catalog DB writer
     * connection.
     */
    fun runAll(context: Context, connections: List<SamoAuthMirror.Connection>): Summary {
        val results = mutableListOf<SourceResult>()
        for (conn in connections) {
            try {
                results.add(runOne(context, conn))
            } catch (error: Throwable) {
                Log.w(TAG, "source ${connectionKey(conn)} failed", error)
                results.add(
                    SourceResult(
                        sourceId = connectionKey(conn),
                        items = 0L,
                        tracks = 0L,
                        errors = listOf(error.message ?: error::class.java.simpleName),
                    ),
                )
            }
        }
        return Summary(results)
    }

    private fun runOne(context: Context, conn: SamoAuthMirror.Connection): SourceResult {
        val sourceId = connectionKey(conn)
        val syncedAt = System.currentTimeMillis()
        val errors = mutableListOf<String>()

        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.markSyncStarted(db, sourceId)
        }

        val streamToken = SamoCatalogServerClient.mintStreamToken(conn)
        if (streamToken == null) {
            // We can still sync — artwork URLs degrade to un-tokenized form
            // (still serve until tokens come back). Note in errors so the
            // Settings panel reflects the partial outcome.
            errors.add("stream-token mint failed; artwork URLs will be un-tokenized")
        }

        val source = buildSourceJson(conn)

        // Read existing state to decide full vs delta. The cursor is the
        // server's serverTime from the prior manifest fetch — playing it back
        // as updatedSince produces only rows that changed since that moment.
        val priorState = SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.getSyncState(db, sourceId)
        }
        val parsedCursor = parseCursor(priorState?.cursor)
        val priorWatermark = parsedCursor?.optString("deltaServerTime").nullIfBlankLocal()
        val versionOk = parsedCursor?.optInt("syncVersion") == SYNC_LOGIC_VERSION

        // Manifest is needed both ways: as the watermark seed for the NEXT
        // sync (its serverTime) and for delta-run deletion reconcile.
        val manifest = try {
            SamoCatalogServerClient.fetchManifest(conn)
        } catch (error: SamoCatalogServerClient.FetchException) {
            // Without the manifest, a delta run can't reconcile deletions —
            // fall back to a full sync so the synced_at prune handles them.
            errors.add("manifest fetch failed: ${error.message}")
            null
        }

        val isDelta = manifest != null && priorWatermark != null && versionOk

        val newItemsCount: Long
        val newTracksCount: Long
        if (isDelta) {
            val delta = runDelta(context, conn, source, streamToken, syncedAt, priorWatermark!!, manifest!!)
            newItemsCount = delta.items
            newTracksCount = delta.tracks
            errors.addAll(delta.errors)
        } else {
            val full = runFull(context, conn, source, streamToken, syncedAt, manifest)
            newItemsCount = full.items
            newTracksCount = full.tracks
            errors.addAll(full.errors)
        }

        // Persist the new cursor + counts on success. The cursor advances
        // only on success so a failed sync keeps replaying from the prior
        // watermark.
        val nextCursor = manifest?.let { mf ->
            JSONObject()
                .put("deltaServerTime", mf.optString("serverTime"))
                .put("syncVersion", SYNC_LOGIC_VERSION)
                .toString()
        } ?: priorState?.cursor

        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            val counts = SamoCatalogWriter.getSourceCounts(db, sourceId)
            if (errors.isEmpty() || newItemsCount > 0 || newTracksCount > 0) {
                SamoCatalogWriter.markSyncSucceeded(db, sourceId, counts, nextCursor)
            } else {
                SamoCatalogWriter.markSyncFailed(
                    db,
                    sourceId,
                    errors.joinToString("; ").take(500),
                )
            }
        }

        return SourceResult(
            sourceId = sourceId,
            items = newItemsCount,
            tracks = newTracksCount,
            errors = errors,
        )
    }

    private data class Counts(val items: Long, val tracks: Long, val errors: List<String>)

    /**
     * Full re-enumerate: every variant + the whole track table. Combined with
     * `pruneSource` at the end this rebuilds a source from scratch.
     */
    private fun runFull(
        context: Context,
        conn: SamoAuthMirror.Connection,
        source: JSONObject,
        streamToken: String?,
        syncedAt: Long,
        manifest: JSONObject?,
    ): Counts {
        val sourceId = source.optString("id")
        val errors = mutableListOf<String>()
        var totalItems = 0L
        var totalTracks = 0L

        // 1. Items per variant.
        for (variant in COLLECTION_VARIANTS) {
            try {
                val records = SamoCatalogServerClient.fetchAllPages(conn, variant.path)
                val rows = records.mapNotNull { record ->
                    convertToItem(variant.catalogType, sourceId, conn.url, streamToken, source, record, syncedAt)
                }
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertItems(db, rows)
                }
                totalItems += rows.size.toLong()
            } catch (error: Throwable) {
                errors.add("${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            }
        }

        // 2. Track table → grouped under album container.
        try {
            val records = SamoCatalogServerClient.fetchAllPages(conn, "/music/tracks")
            val grouped = HashMap<String, MutableList<SamoCatalogConverters.TrackBinding>>()
            for (record in records) {
                val binding = SamoCatalogConverters.musicTrackToAlbumTrack(
                    sourceId = sourceId,
                    serverUrl = conn.url,
                    streamToken = streamToken,
                    source = source,
                    track = record,
                    syncedAt = syncedAt,
                ) ?: continue
                grouped.getOrPut(binding.containerId) { mutableListOf() }.add(binding)
            }
            var count = 0L
            for ((_, tracks) in grouped) {
                val sorted = tracks.sortedWith(
                    compareBy({ it.discNo ?: 1L }, { it.trackNo ?: 0L }),
                )
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertTracks(db, sorted)
                }
                count += sorted.size.toLong()
            }
            totalTracks = count
        } catch (error: Throwable) {
            errors.add("tracks: ${error.message ?: error::class.java.simpleName}")
        }

        // 3. Prune anything that wasn't touched this pass. SAFE in the full
        // path because every server-side row was just walked above.
        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            SamoCatalogWriter.pruneSource(db, sourceId, syncedAt)
        }

        return Counts(totalItems, totalTracks, errors)
    }

    /**
     * Incremental delta: per-variant filtered by `updatedSince`, then
     * manifest-based deletion reconcile. Same shape as the JS runDeltaSamoSync
     * but with no detail-crawl side-trip.
     */
    private fun runDelta(
        context: Context,
        conn: SamoAuthMirror.Connection,
        source: JSONObject,
        streamToken: String?,
        syncedAt: Long,
        watermark: String,
        manifest: JSONObject,
    ): Counts {
        val sourceId = source.optString("id")
        val errors = mutableListOf<String>()
        var totalItems = 0L
        var totalTracks = 0L

        // Track which IDs we upserted this pass so we don't reconcile them
        // away (the manifest is a snapshot taken AT MOST as recently as our
        // delta call, so a mid-sync upsert could be absent from it).
        val justUpsertedByVariant = HashMap<String, HashSet<String>>()

        for (variant in COLLECTION_VARIANTS) {
            try {
                val records = SamoCatalogServerClient.fetchAllPages(
                    conn,
                    variant.path,
                    updatedSince = watermark,
                )
                val rows = records.mapNotNull { record ->
                    convertToItem(variant.catalogType, sourceId, conn.url, streamToken, source, record, syncedAt)
                }
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertItems(db, rows)
                }
                justUpsertedByVariant.getOrPut(variant.catalogType) { HashSet() }
                    .addAll(rows.map { it.id })
                totalItems += rows.size.toLong()
            } catch (error: Throwable) {
                errors.add("delta ${variant.catalogType}: ${error.message ?: error::class.java.simpleName}")
            }
        }

        // Changed tracks (updatedSince).
        val justUpsertedTrackIds = HashSet<String>()
        try {
            val records = SamoCatalogServerClient.fetchAllPages(
                conn,
                "/music/tracks",
                updatedSince = watermark,
            )
            val grouped = HashMap<String, MutableList<SamoCatalogConverters.TrackBinding>>()
            for (record in records) {
                val binding = SamoCatalogConverters.musicTrackToAlbumTrack(
                    sourceId, conn.url, streamToken, source, record, syncedAt,
                ) ?: continue
                grouped.getOrPut(binding.containerId) { mutableListOf() }.add(binding)
                justUpsertedTrackIds.add(binding.trackId)
            }
            var count = 0L
            for ((_, tracks) in grouped) {
                val sorted = tracks.sortedWith(
                    compareBy({ it.discNo ?: 1L }, { it.trackNo ?: 0L }),
                )
                SamoCatalogWriter.withTransactionImmediate(context) { db ->
                    SamoCatalogWriter.upsertTracks(db, sorted)
                }
                count += sorted.size.toLong()
            }
            totalTracks = count
        } catch (error: Throwable) {
            errors.add("delta tracks: ${error.message ?: error::class.java.simpleName}")
        }

        // Manifest-based deletion reconcile.
        val manifestIds = manifest.optJSONObject("ids") ?: JSONObject()
        SamoCatalogWriter.withTransactionImmediate(context) { db ->
            for (variant in COLLECTION_VARIANTS) {
                val serverSet = jsonStringArrayToSet(manifestIds.optJSONArray(pluralOf(variant.manifestKey)))
                val justUpserted = justUpsertedByVariant[variant.catalogType] ?: emptySet()
                val localIds = SamoCatalogWriter.getItemIdsByType(db, sourceId, variant.catalogType)
                val removed = localIds.filter { it !in serverSet && it !in justUpserted }
                if (removed.isNotEmpty()) {
                    SamoCatalogWriter.deleteItemsByIds(db, sourceId, variant.catalogType, removed)
                    if (variant.catalogType == "album") {
                        // Album owns its tracks — drop them along with the
                        // album rows so a re-add of the same ID later gets a
                        // clean track list.
                        SamoCatalogWriter.deleteTracksByTrackIds(
                            db, sourceId, removed, listOf("album"),
                        )
                    }
                }
            }

            // Deleted music tracks (in catalog but not in manifest).
            val musicContainers = listOf("album")
            val serverTracks = jsonStringArrayToSet(manifestIds.optJSONArray("tracks"))
            val localTrackIds = SamoCatalogWriter.getDistinctTrackIds(db, sourceId, musicContainers)
            val removedTracks = localTrackIds.filter { it !in serverTracks && it !in justUpsertedTrackIds }
            if (removedTracks.isNotEmpty()) {
                SamoCatalogWriter.deleteTracksByTrackIds(db, sourceId, removedTracks, musicContainers)
            }
        }

        return Counts(totalItems, totalTracks, errors)
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

    /** album → albums, podcast → podcasts, etc. Matches the manifest's plural keys. */
    private fun pluralOf(singular: String): String = when (singular) {
        "audiobook" -> "audiobooks"
        else -> "${singular}s"
    }

    private fun jsonStringArrayToSet(array: org.json.JSONArray?): Set<String> {
        if (array == null) return emptySet()
        val out = HashSet<String>(array.length())
        for (i in 0 until array.length()) {
            val s = array.optString(i)
            if (s.isNotBlank()) out.add(s)
        }
        return out
    }
}

private fun String?.nullIfBlankLocal(): String? =
    if (this.isNullOrBlank() || this == "null") null else this

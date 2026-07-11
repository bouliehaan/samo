package app.samo.android.audio

import android.content.Context
// BUNDLED SQLITE ONLY — see SamoCatalogWriter's header: the platform SQLite
// must never open samo-catalog.db.
import io.requery.android.database.sqlite.SQLiteDatabase
import android.util.Log
import java.io.File
import org.json.JSONException
import org.json.JSONObject

/**
 * THE reader for the on-device Samo catalog (`samo-catalog.db`). Kotlin owns
 * the file outright (writes: SamoCatalogWriter; search index:
 * SamoCatalogSearch); this connection only ever runs SELECTs. It serves both
 * the native paths (artwork URL minting, queue payload lookups) and — via the
 * SamoCatalogQuery bridge module — every JS mirror read. Under WAL it reads a
 * consistent snapshot concurrently with a mid-flight sync, so a query never
 * waits on the writer.
 *
 * The connection is lazily opened on first use because the DB file does not
 * exist until the first sync creates it — a fresh install with no Samo
 * servers connected will see every query return null/empty until onboarding
 * finishes. Subsequent process restarts find the file already on disk and the
 * reader opens in microseconds.
 */
internal object SamoCatalogDb {
    private const val TAG = "SamoCatalogDb"
    private const val DB_NAME = "samo-catalog.db"

    @Volatile private var reader: SQLiteDatabase? = null
    @Volatile private var lastOpenAttemptFailed = false
    private val openLock = Any()

    /**
     * Probe the DB file and surface basic counts. Useful as a logcat sanity
     * check during bring-up — if this returns null the JS catalog hasn't been
     * created yet (fresh install, no Samo source connected), so any Phase 2
     * PROPER / Phase 5 path that depends on the catalog must fall back to its
     * JS-payload behavior.
     */
    data class CatalogStats(
        val itemCount: Int,
        val trackCount: Int,
        val detailCount: Int,
    )

    fun getStats(context: Context): CatalogStats? {
        val db = ensureReader(context) ?: return null
        return try {
            CatalogStats(
                itemCount = queryCount(db, "SELECT COUNT(*) FROM catalog_item"),
                trackCount = queryCount(db, "SELECT COUNT(*) FROM catalog_track"),
                detailCount = queryCount(db, "SELECT COUNT(*) FROM catalog_detail"),
            )
        } catch (error: Exception) {
            Log.w(TAG, "stats query failed", error)
            null
        }
    }

    /**
     * Album id (== cover-art container id) for a track row, or null when the
     * track isn't mirrored locally yet. Used by the artwork URL builder so a
     * music-track queue item can produce a fresh album-cover URL without the
     * payload having to carry one.
     */
    fun findAlbumIdForTrack(context: Context, sourceId: String, trackId: String): String? =
        queryOptionalString(
            context,
            """
            SELECT album_id
            FROM catalog_track
            WHERE source_id = ?
              AND track_id = ?
              AND album_id IS NOT NULL
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, trackId),
        )

    /**
     * `image_*` metadata-image id stored on the track row (embedded cover for
     * an unalbummed track / per-track scan artwork). Falls back to null when
     * the track has no embedded image or isn't mirrored.
     */
    fun findArtworkImageIdForTrack(
        context: Context,
        sourceId: String,
        trackId: String,
    ): String? =
        queryOptionalString(
            context,
            """
            SELECT artwork_image_id
            FROM catalog_track
            WHERE source_id = ?
              AND track_id = ?
              AND artwork_image_id IS NOT NULL
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, trackId),
        )

    /**
     * Container id (e.g. show id for a podcast episode, book id for an
     * audiobook chapter) for the given track row. The podcast cover URL is
     * minted against the show id, not the episode id.
     */
    fun findContainerIdForTrack(
        context: Context,
        sourceId: String,
        containerType: String,
        trackId: String,
    ): String? =
        queryOptionalString(
            context,
            """
            SELECT container_id
            FROM catalog_track
            WHERE source_id = ?
              AND container_type = ?
              AND track_id = ?
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, containerType, trackId),
        )

    /**
     * `artwork_image_id` on a catalog_item row (album / artist / audiobook /
     * playlist / podcast). When non-null this points at a metadata image the
     * server scanned; the artwork URL builder prefers it over the entity cover
     * route because metadata images are higher fidelity (full-resolution scans
     * vs the entity cover's downscaled blob).
     */
    fun findArtworkImageIdForItem(
        context: Context,
        sourceId: String,
        type: String,
        id: String,
    ): String? =
        queryOptionalString(
            context,
            """
            SELECT artwork_image_id
            FROM catalog_item
            WHERE source_id = ?
              AND type = ?
              AND id = ?
              AND artwork_image_id IS NOT NULL
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, type, id),
        )

    /**
     * Raw stored artwork URL on a catalog_item row. The server may have
     * supplied an absolute URL (e.g. for podcasts with remote covers); the URL
     * builder uses it verbatim instead of constructing an api/v1/.../cover
     * route. Returns null when the item has no stored URL or isn't mirrored.
     */
    fun findArtworkUrlForItem(
        context: Context,
        sourceId: String,
        type: String,
        id: String,
    ): String? =
        queryOptionalString(
            context,
            """
            SELECT artwork_url
            FROM catalog_item
            WHERE source_id = ?
              AND type = ?
              AND id = ?
              AND artwork_url IS NOT NULL
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, type, id),
        )

    /**
     * Parsed `payload` JSON for a catalog_item row, or null when not mirrored.
     * Schema stores the exact MobileHomeItem the JS screens consume — Phase 5
     * will read this to reconcile delta deletions and Phase 2 PROPER will read
     * it to pull `audiobookFiles` (the per-file id manifest) without a network
     * round-trip when minting a queue from a saved item.
     */
    fun loadItemPayload(
        context: Context,
        sourceId: String,
        type: String,
        id: String,
    ): JSONObject? {
        val raw = queryOptionalString(
            context,
            """
            SELECT payload
            FROM catalog_item
            WHERE source_id = ?
              AND type = ?
              AND id = ?
            LIMIT 1
            """.trimIndent(),
            arrayOf(sourceId, type, id),
        ) ?: return null
        return try {
            JSONObject(raw)
        } catch (error: JSONException) {
            Log.w(TAG, "payload JSON for $type:$id is malformed", error)
            null
        }
    }

    /**
     * Eagerly open the reader without running a query — call this from a safe
     * lifecycle point (e.g. SamoAudioEngine init) so the first hot-path query
     * doesn't pay the open cost. Also logs a one-line stats line on success so
     * on-device bring-up is observable in logcat without a UI hook.
     */
    fun warm(context: Context) {
        val db = ensureReader(context)
        if (db != null) {
            // One-time DELETE→WAL transition for installs whose file predates
            // Kotlin ownership. Idempotent (already-WAL answers instantly) and
            // fail-soft (BUSY just means the writer flips it at the next
            // sync). journal_mode is a file property, so whichever connection
            // wins persists it.
            try {
                db.rawQuery("PRAGMA journal_mode = WAL", null).use { c ->
                    if (c.moveToFirst()) {
                        Log.i(TAG, "catalog journal_mode=${c.getString(0)}")
                    }
                }
            } catch (_: Exception) {
                // reader keeps working in whatever mode the file is in
            }
            val stats = getStats(context)
            if (stats != null) {
                Log.i(
                    TAG,
                    "catalog reader online — items=${stats.itemCount} " +
                        "tracks=${stats.trackCount} details=${stats.detailCount} " +
                        "path=${java.io.File(java.io.File(context.filesDir, "SQLite"), DB_NAME).canonicalPath}",
                )
            }
        }
    }

    /**
     * Close the reader if it's open. Tests use this to make their in-memory DB
     * re-openable. Production callers don't need to call it — the connection
     * lives for the process lifetime.
     */
    fun closeForTest() {
        synchronized(openLock) {
            reader?.takeIf { it.isOpen }?.close()
            reader = null
            lastOpenAttemptFailed = false
        }
    }

    private fun ensureReader(context: Context): SQLiteDatabase? {
        reader?.takeIf { it.isOpen }?.let { return it }
        synchronized(openLock) {
            reader?.takeIf { it.isOpen }?.let { return it }
            val dbFile = File(File(context.filesDir, "SQLite"), DB_NAME)
            if (!dbFile.exists()) {
                // Not an error: first-launch / fresh install. Avoid logging on
                // every miss so logcat doesn't drown in noise.
                return null
            }
            return try {
                // OPEN_READWRITE (not READONLY) so SQLite can take the required
                // locks for rollback journal concurrency. Readers never issue
                // UPDATE/INSERT so the writer is unaffected.
                val db = SQLiteDatabase.openDatabase(
                    dbFile.absolutePath,
                    null,
                    SQLiteDatabase.OPEN_READWRITE,
                    SamoNoDeleteDatabaseErrorHandler,
                )
                // Short queue instead of an instant SQLITE_BUSY if a read
                // lands exactly on a checkpoint (WAL) or, pre-flip, on a
                // write batch (DELETE). These reads run on background
                // threads, so waiting here never freezes the UI or JS.
                db.rawQuery("PRAGMA busy_timeout = 2000", null).use { c -> c.moveToFirst() }
                reader = db
                lastOpenAttemptFailed = false
                db
            } catch (error: Exception) {
                if (!lastOpenAttemptFailed) {
                    Log.w(TAG, "failed to open catalog reader at $dbFile", error)
                    lastOpenAttemptFailed = true
                }
                null
            }
        }
    }

    // -----------------------------------------------------------------------
    // Bridge query surface (SamoCatalogQueryModule) — the reads that used to
    // run as synchronous expo-sqlite statements ON the JS thread. Each returns
    // raw `payload` JSON strings; the JS side hydrates them through the same
    // core mappers as before. All run on the module's background executor.
    // -----------------------------------------------------------------------

    /** Mirror of the JS SORT_COLUMNS map — the query API speaks the JS sort
     *  names so the bridge wrapper stays a pass-through. */
    private val SORT_COLUMNS = mapOf(
        "title" to "sort_name",
        "added" to "added_at",
        "lastPlayed" to "last_played_at",
        "playCount" to "play_count",
    )

    fun queryItemsByType(
        context: Context,
        sourceId: String,
        type: String,
        sort: String?,
        direction: String?,
        limit: Int,
        offset: Int,
    ): List<String> {
        val sortColumn = SORT_COLUMNS[sort ?: "title"] ?: "sort_name"
        val dir = if (direction.equals("desc", ignoreCase = true)) "DESC" else "ASC"
        // Plain ORDER BY on the (source_id, type, col) index — no NULL-guard
        // expression (see the JS predecessor's non-sargable-scan incident).
        // `id` tiebreaker keeps paged walks deterministic when sort values tie.
        return queryStringList(
            context,
            """
            SELECT payload FROM catalog_item
            WHERE source_id = ? AND type = ?
            ORDER BY $sortColumn $dir, id ASC
            LIMIT ? OFFSET ?
            """.trimIndent(),
            arrayOf(sourceId, type, limit.toString(), offset.toString()),
        )
    }

    fun queryItemById(context: Context, sourceId: String, type: String, id: String): String? =
        queryOptionalString(
            context,
            "SELECT payload FROM catalog_item WHERE source_id = ? AND type = ? AND id = ? LIMIT 1",
            arrayOf(sourceId, type, id),
        )

    fun queryDetail(context: Context, sourceId: String, cacheKey: String): String? =
        queryOptionalString(
            context,
            "SELECT payload FROM catalog_detail WHERE source_id = ? AND cache_key = ? LIMIT 1",
            arrayOf(sourceId, cacheKey),
        )

    fun queryTracks(
        context: Context,
        sourceId: String,
        containerType: String,
        containerId: String,
        limit: Int,
    ): List<String> =
        queryStringList(
            context,
            """
            SELECT payload FROM catalog_track
            WHERE source_id = ? AND container_type = ? AND container_id = ?
            ORDER BY position ASC
            LIMIT ?
            """.trimIndent(),
            // SQLite treats LIMIT -1 as "no limit", matching the JS API's
            // optional bound.
            arrayOf(sourceId, containerType, containerId, limit.toString()),
        )

    fun querySearch(
        context: Context,
        rawQuery: String,
        sourceId: String?,
        limit: Int,
    ): List<SamoCatalogSearch.Hit> {
        val db = ensureReader(context) ?: return emptyList()
        return SamoCatalogSearch.search(db, rawQuery, sourceId, limit)
    }

    data class SyncStateRow(
        val sourceId: String,
        val status: String,
        val lastSyncedAt: Long?,
        val lastAttemptAt: Long?,
        val error: String?,
        val itemCount: Long,
        val trackCount: Long,
        val detailCount: Long,
        val updatedAt: Long,
    )

    fun querySyncStates(context: Context): List<SyncStateRow> {
        val db = ensureReader(context) ?: return emptyList()
        return try {
            val rows = ArrayList<SyncStateRow>()
            db.rawQuery(
                """
                SELECT source_id, status, last_synced_at, last_attempt_at, error,
                       item_count, track_count, detail_count, updated_at
                FROM catalog_sync_state
                """.trimIndent(),
                null,
            ).use { c ->
                while (c.moveToNext()) {
                    rows.add(
                        SyncStateRow(
                            sourceId = c.getString(0),
                            status = c.getString(1),
                            lastSyncedAt = if (c.isNull(2)) null else c.getLong(2),
                            lastAttemptAt = if (c.isNull(3)) null else c.getLong(3),
                            error = if (c.isNull(4)) null else c.getString(4),
                            itemCount = c.getLong(5),
                            trackCount = c.getLong(6),
                            detailCount = c.getLong(7),
                            updatedAt = c.getLong(8),
                        ),
                    )
                }
            }
            rows
        } catch (error: Exception) {
            Log.w(TAG, "sync-state query failed", error)
            emptyList()
        }
    }

    private fun queryStringList(
        context: Context,
        sql: String,
        args: Array<String>,
    ): List<String> {
        val db = ensureReader(context) ?: return emptyList()
        return try {
            val rows = ArrayList<String>()
            db.rawQuery(sql, args).use { cursor ->
                while (cursor.moveToNext()) {
                    if (!cursor.isNull(0)) {
                        rows.add(cursor.getString(0))
                    }
                }
            }
            rows
        } catch (error: Exception) {
            Log.w(TAG, "query failed: ${sql.take(80)}…", error)
            emptyList()
        }
    }

    private fun queryOptionalString(
        context: Context,
        sql: String,
        args: Array<String>,
    ): String? {
        val db = ensureReader(context) ?: return null
        return try {
            db.rawQuery(sql, args).use { cursor ->
                if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getString(0) else null
            }
        } catch (error: Exception) {
            Log.w(TAG, "query failed: ${sql.take(80)}…", error)
            null
        }
    }

    private fun queryCount(db: SQLiteDatabase, sql: String): Int =
        db.rawQuery(sql, null).use { cursor ->
            if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
}

/**
 * Android's DefaultDatabaseErrorHandler responds to a corruption verdict by
 * DELETING the database file. Two different SQLite builds share this file
 * (expo-sqlite's bundled library + io.requery); a process kill
 * during a transaction can leave the file in a state that the OTHER build's
 * next open misjudges as corruption — and the default handler then erased
 * the user's entire mirror. NEVER delete: log, close, retry later;
 * SQLite's own rollback journal handles genuinely torn states.
 */
internal object SamoNoDeleteDatabaseErrorHandler : io.requery.android.database.DatabaseErrorHandler {
    override fun onCorruption(dbObj: SQLiteDatabase) {
        android.util.Log.e(
            "SamoCatalogDb",
            "SQLite reported corruption on ${dbObj.path} — NOT deleting; closing for retry",
        )
        try {
            if (dbObj.isOpen) dbObj.close()
        } catch (_: Throwable) {
        }
    }
}

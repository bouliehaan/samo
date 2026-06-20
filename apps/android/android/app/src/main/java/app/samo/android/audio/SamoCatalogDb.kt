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
 * Native reader for the on-device Samo catalog (`samo-catalog.db`). The DB is
 * owned by JS through `services/catalog/database.ts` (expo-sqlite); this file
 * opens the SAME file in DELETE mode and only ever runs SELECTs.
 * We rely on POSIX file locks to safely interleave reads with the JS writer's
 * sync transactions.
 *
 * The connection is lazily opened on first use because the DB file does not
 * exist until the JS catalog warms — a fresh install with no Samo servers
 * connected will see [findArtworkImageIdForTrack] etc. return null until the
 * user finishes onboarding. Subsequent process restarts find the file already
 * on disk and the reader opens in microseconds.
 *
 * Writes (Phase 5) will route through a separate writer connection: this object
 * is the read-only seam, so query callers stay clear of transaction ordering.
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

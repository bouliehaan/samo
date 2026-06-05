package app.samo.android.audio

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import android.util.Log
import java.io.File

/**
 * Writer connection on the shared `samo-catalog.db`. The JS side (expo-sqlite,
 * `services/catalog/database.ts`) is the OTHER writer; both use WAL +
 * `busy_timeout`, so SQLite serializes them at the page level — one writer's
 * `BEGIN IMMEDIATE` blocks the other on `SQLITE_BUSY` until the busy_timeout
 * elapses or the lock is released.
 *
 * This file owns the schema bootstrap (idempotent CREATE TABLE IF NOT EXISTS
 * mirroring the JS-side MIGRATION_V1 in `schema.ts`) so a fresh install where
 * the JS catalog hasn't run yet still gets a usable DB. PRAGMA user_version
 * is NOT touched here — that's the JS migration runner's domain. Our writes
 * are forward-compatible with whatever version the JS side has stamped, since
 * MIGRATION_V1 is the only migration and v1 columns are stable.
 *
 * The writer is a singleton with a lazy-init guard. Mutations route through
 * `withTransactionImmediate { ... }` which uses `BEGIN IMMEDIATE` — the only
 * lock mode that's safe under WAL with a second writer process. Inside the
 * lambda the caller has exclusive write access; on lambda return the txn
 * commits, on a throw it rolls back.
 */
internal object SamoCatalogWriter {
    private const val TAG = "SamoCatalogWriter"
    private const val DB_NAME = "samo-catalog.db"
    private const val BUSY_TIMEOUT_MS = 5_000L

    @Volatile private var writer: SQLiteDatabase? = null
    private val openLock = Any()

    /**
     * Ensure the writer + schema exist; call once from the WorkManager worker
     * before any other write. Idempotent: subsequent calls return immediately.
     */
    fun ensureOpen(context: Context): SQLiteDatabase {
        writer?.takeIf { it.isOpen }?.let { return it }
        synchronized(openLock) {
            writer?.takeIf { it.isOpen }?.let { return it }
            val dir = File(context.filesDir, "SQLite")
            if (!dir.exists()) dir.mkdirs()
            val dbFile = File(dir, DB_NAME)
            val db = SQLiteDatabase.openOrCreateDatabase(dbFile, null)
            try {
                // WAL + busy_timeout: both writers (JS expo-sqlite + this one)
                // queue on BEGIN IMMEDIATE rather than racing. journal_mode
                // must be set OUTSIDE a transaction, hence rawQuery + cursor
                // close (execSQL("PRAGMA …") doesn't return the actual mode).
                db.rawQuery("PRAGMA journal_mode = WAL", null).use { c ->
                    if (c.moveToFirst()) {
                        val mode = c.getString(0)
                        if (!mode.equals("wal", ignoreCase = true)) {
                            Log.w(TAG, "expected WAL, got $mode")
                        }
                    }
                }
                db.execSQL("PRAGMA busy_timeout = $BUSY_TIMEOUT_MS")
                // Mirror the JS writer's safety profile: NORMAL is the WAL-
                // recommended sync level — durable across power loss for
                // committed transactions, faster than FULL.
                db.execSQL("PRAGMA synchronous = NORMAL")
                db.execSQL("PRAGMA foreign_keys = ON")
                bootstrapSchema(db)
            } catch (error: Throwable) {
                db.close()
                throw error
            }
            writer = db
            return db
        }
    }

    /**
     * Run [block] inside `BEGIN IMMEDIATE … COMMIT` against the writer. The
     * RESERVED lock is held for the duration of [block]; the JS writer's
     * `BEGIN IMMEDIATE` blocks while we're inside.
     */
    inline fun <T> withTransactionImmediate(context: Context, block: (SQLiteDatabase) -> T): T {
        val db = ensureOpen(context)
        // SQLiteDatabase.beginTransactionNonExclusive() emits BEGIN IMMEDIATE
        // under WAL, which is what we want for cross-writer safety. The
        // legacy beginTransaction() takes EXCLUSIVE, which would defeat WAL's
        // concurrent-readers guarantee.
        db.beginTransactionNonExclusive()
        try {
            val result = block(db)
            db.setTransactionSuccessful()
            return result
        } finally {
            db.endTransaction()
        }
    }

    fun closeForTest() {
        synchronized(openLock) {
            writer?.takeIf { it.isOpen }?.close()
            writer = null
        }
    }

    /**
     * CREATE TABLE IF NOT EXISTS for every table the JS MIGRATION_V1 owns.
     * Idempotent — runs on every ensureOpen. The CREATE statements MUST stay
     * byte-equivalent to the JS migration text or `user_version` drift will
     * make the JS runner refuse to upgrade.
     */
    private fun bootstrapSchema(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS catalog_item (
                source_id        TEXT    NOT NULL,
                type             TEXT    NOT NULL,
                id               TEXT    NOT NULL,
                title            TEXT    NOT NULL,
                subtitle         TEXT,
                sort_name        TEXT    NOT NULL,
                added_at         INTEGER,
                last_played_at   INTEGER,
                play_count       INTEGER,
                duration_seconds INTEGER,
                container_id     TEXT,
                artwork_url      TEXT,
                artwork_image_id TEXT,
                quality_profile  TEXT,
                is_hi_res        INTEGER NOT NULL DEFAULT 0,
                payload          TEXT    NOT NULL,
                synced_at        INTEGER NOT NULL,
                PRIMARY KEY (source_id, type, id)
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_type_sort " +
                "ON catalog_item (source_id, type, sort_name)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_type_added " +
                "ON catalog_item (source_id, type, added_at)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_last_played " +
                "ON catalog_item (source_id, last_played_at)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_play_count " +
                "ON catalog_item (source_id, play_count)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_container " +
                "ON catalog_item (source_id, container_id)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_item_synced " +
                "ON catalog_item (source_id, synced_at)",
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS catalog_track (
                source_id        TEXT    NOT NULL,
                container_type   TEXT    NOT NULL,
                container_id     TEXT    NOT NULL,
                track_id         TEXT    NOT NULL,
                position         INTEGER NOT NULL,
                disc_no          INTEGER,
                track_no         INTEGER,
                title            TEXT    NOT NULL,
                subtitle         TEXT,
                artist           TEXT,
                artist_id        TEXT,
                album            TEXT,
                album_id         TEXT,
                duration_seconds INTEGER,
                artwork_image_id TEXT,
                payload          TEXT    NOT NULL,
                synced_at        INTEGER NOT NULL,
                PRIMARY KEY (source_id, container_type, container_id, track_id)
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_track_container " +
                "ON catalog_track (source_id, container_type, container_id, position)",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_track_synced " +
                "ON catalog_track (source_id, synced_at)",
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS catalog_detail (
                source_id  TEXT    NOT NULL,
                cache_key  TEXT    NOT NULL,
                type       TEXT    NOT NULL,
                entity_id  TEXT    NOT NULL,
                payload    TEXT    NOT NULL,
                synced_at  INTEGER NOT NULL,
                PRIMARY KEY (source_id, cache_key)
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS idx_catalog_detail_synced " +
                "ON catalog_detail (source_id, synced_at)",
        )
        db.execSQL(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS catalog_search USING fts5 (
                title,
                subtitle,
                artist,
                album,
                source_id UNINDEXED,
                type UNINDEXED,
                entity_id UNINDEXED,
                payload UNINDEXED,
                synced_at UNINDEXED,
                tokenize = 'unicode61 remove_diacritics 2'
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS catalog_sync_state (
                source_id       TEXT    NOT NULL PRIMARY KEY,
                status          TEXT    NOT NULL,
                last_synced_at  INTEGER,
                last_attempt_at INTEGER,
                error           TEXT,
                item_count      INTEGER NOT NULL DEFAULT 0,
                track_count     INTEGER NOT NULL DEFAULT 0,
                detail_count    INTEGER NOT NULL DEFAULT 0,
                cursor          TEXT,
                updated_at      INTEGER NOT NULL
            )
            """.trimIndent(),
        )
    }

    // -----------------------------------------------------------------------
    // SQL templates (copies of the JS UPSERT_* / INSERT_* strings).
    // -----------------------------------------------------------------------

    const val UPSERT_ITEM_SQL = """
        INSERT INTO catalog_item (
            source_id, type, id, title, subtitle, sort_name, added_at, last_played_at,
            play_count, duration_seconds, container_id, artwork_url, artwork_image_id,
            quality_profile, is_hi_res, payload, synced_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        ON CONFLICT(source_id, type, id) DO UPDATE SET
            title = excluded.title,
            subtitle = excluded.subtitle,
            sort_name = excluded.sort_name,
            added_at = excluded.added_at,
            last_played_at = excluded.last_played_at,
            play_count = excluded.play_count,
            duration_seconds = excluded.duration_seconds,
            container_id = excluded.container_id,
            artwork_url = excluded.artwork_url,
            artwork_image_id = excluded.artwork_image_id,
            quality_profile = excluded.quality_profile,
            is_hi_res = excluded.is_hi_res,
            payload = excluded.payload,
            synced_at = excluded.synced_at
    """

    const val UPSERT_TRACK_SQL = """
        INSERT INTO catalog_track (
            source_id, container_type, container_id, track_id, position, disc_no, track_no,
            title, subtitle, artist, artist_id, album, album_id, duration_seconds,
            artwork_image_id, payload, synced_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?
        )
        ON CONFLICT(source_id, container_type, container_id, track_id) DO UPDATE SET
            position = excluded.position,
            disc_no = excluded.disc_no,
            track_no = excluded.track_no,
            title = excluded.title,
            subtitle = excluded.subtitle,
            artist = excluded.artist,
            artist_id = excluded.artist_id,
            album = excluded.album,
            album_id = excluded.album_id,
            duration_seconds = excluded.duration_seconds,
            artwork_image_id = excluded.artwork_image_id,
            payload = excluded.payload,
            synced_at = excluded.synced_at
    """

    const val UPSERT_DETAIL_SQL = """
        INSERT INTO catalog_detail (source_id, cache_key, type, entity_id, payload, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, cache_key) DO UPDATE SET
            type = excluded.type,
            entity_id = excluded.entity_id,
            payload = excluded.payload,
            synced_at = excluded.synced_at
    """

    const val INSERT_SEARCH_SQL = """
        INSERT INTO catalog_search (
            title, subtitle, artist, album, source_id, type, entity_id, payload, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    const val UPSERT_SYNC_STATE_SQL = """
        INSERT INTO catalog_sync_state (
            source_id, status, last_synced_at, last_attempt_at, error,
            item_count, track_count, detail_count, cursor, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id) DO UPDATE SET
            status = excluded.status,
            last_synced_at = excluded.last_synced_at,
            last_attempt_at = excluded.last_attempt_at,
            error = excluded.error,
            item_count = excluded.item_count,
            track_count = excluded.track_count,
            detail_count = excluded.detail_count,
            cursor = excluded.cursor,
            updated_at = excluded.updated_at
    """

    // -----------------------------------------------------------------------
    // Batched upserts. Each takes the writer connection (caller's
    // `withTransactionImmediate` has already opened the txn) so multi-batch
    // operations stay atomic.
    // -----------------------------------------------------------------------

    fun upsertItems(
        db: SQLiteDatabase,
        rows: List<SamoCatalogConverters.ItemBinding>,
    ) {
        if (rows.isEmpty()) return
        val statement = db.compileStatement(UPSERT_ITEM_SQL)
        try {
            for (row in rows) {
                statement.clearBindings()
                statement.bindString(1, row.sourceId)
                statement.bindString(2, row.type)
                statement.bindString(3, row.id)
                statement.bindString(4, row.title)
                bindOptionalString(statement, 5, row.subtitle)
                statement.bindString(6, row.sortName)
                bindOptionalLong(statement, 7, row.addedAt)
                bindOptionalLong(statement, 8, row.lastPlayedAt)
                bindOptionalLong(statement, 9, row.playCount)
                bindOptionalLong(statement, 10, row.durationSeconds)
                bindOptionalString(statement, 11, row.containerId)
                bindOptionalString(statement, 12, row.artworkUrl)
                bindOptionalString(statement, 13, row.artworkImageId)
                bindOptionalString(statement, 14, row.qualityProfile)
                statement.bindLong(15, row.isHiRes)
                statement.bindString(16, row.payload)
                statement.bindLong(17, row.syncedAt)
                statement.executeInsert()
            }
        } finally {
            statement.close()
        }
    }

    fun upsertTracks(
        db: SQLiteDatabase,
        rows: List<SamoCatalogConverters.TrackBinding>,
    ) {
        if (rows.isEmpty()) return
        val statement = db.compileStatement(UPSERT_TRACK_SQL)
        try {
            for (row in rows) {
                statement.clearBindings()
                statement.bindString(1, row.sourceId)
                statement.bindString(2, row.containerType)
                statement.bindString(3, row.containerId)
                statement.bindString(4, row.trackId)
                statement.bindLong(5, row.position)
                bindOptionalLong(statement, 6, row.discNo)
                bindOptionalLong(statement, 7, row.trackNo)
                statement.bindString(8, row.title)
                bindOptionalString(statement, 9, row.subtitle)
                bindOptionalString(statement, 10, row.artist)
                bindOptionalString(statement, 11, row.artistId)
                bindOptionalString(statement, 12, row.album)
                bindOptionalString(statement, 13, row.albumId)
                bindOptionalLong(statement, 14, row.durationSeconds)
                bindOptionalString(statement, 15, row.artworkImageId)
                statement.bindString(16, row.payload)
                statement.bindLong(17, row.syncedAt)
                statement.executeInsert()
            }
        } finally {
            statement.close()
        }
    }

    // -----------------------------------------------------------------------
    // Reconciliation reads + deletes (mirror catalog-repository.ts).
    // -----------------------------------------------------------------------

    private const val DELETE_CHUNK = 400

    fun getItemIdsByType(db: SQLiteDatabase, sourceId: String, type: String): List<String> {
        val ids = mutableListOf<String>()
        db.rawQuery(
            "SELECT id FROM catalog_item WHERE source_id = ? AND type = ?",
            arrayOf(sourceId, type),
        ).use { c ->
            while (c.moveToNext()) ids.add(c.getString(0))
        }
        return ids
    }

    fun getDistinctTrackIds(
        db: SQLiteDatabase,
        sourceId: String,
        containerTypes: List<String>,
    ): List<String> {
        if (containerTypes.isEmpty()) return emptyList()
        val placeholders = containerTypes.joinToString(",") { "?" }
        val args = arrayOf(sourceId, *containerTypes.toTypedArray())
        val ids = mutableListOf<String>()
        db.rawQuery(
            "SELECT DISTINCT track_id FROM catalog_track " +
                "WHERE source_id = ? AND container_type IN ($placeholders)",
            args,
        ).use { c ->
            while (c.moveToNext()) ids.add(c.getString(0))
        }
        return ids
    }

    fun deleteItemsByIds(
        db: SQLiteDatabase,
        sourceId: String,
        type: String,
        ids: List<String>,
    ) {
        if (ids.isEmpty()) return
        for (batch in ids.chunked(DELETE_CHUNK)) {
            val placeholders = batch.joinToString(",") { "?" }
            db.execSQL(
                "DELETE FROM catalog_item " +
                    "WHERE source_id = ? AND type = ? AND id IN ($placeholders)",
                arrayOf(sourceId, type, *batch.toTypedArray()),
            )
        }
    }

    fun deleteTracksByTrackIds(
        db: SQLiteDatabase,
        sourceId: String,
        trackIds: List<String>,
        containerTypes: List<String>,
    ) {
        if (trackIds.isEmpty() || containerTypes.isEmpty()) return
        val containerPlaceholders = containerTypes.joinToString(",") { "?" }
        for (batch in trackIds.chunked(DELETE_CHUNK)) {
            val idPlaceholders = batch.joinToString(",") { "?" }
            db.execSQL(
                "DELETE FROM catalog_track " +
                    "WHERE source_id = ? AND container_type IN ($containerPlaceholders) " +
                    "AND track_id IN ($idPlaceholders)",
                arrayOf(sourceId, *containerTypes.toTypedArray(), *batch.toTypedArray()),
            )
        }
    }

    fun pruneSource(db: SQLiteDatabase, sourceId: String, syncedAt: Long) {
        val args = arrayOf<Any>(sourceId, syncedAt)
        db.execSQL("DELETE FROM catalog_item WHERE source_id = ? AND synced_at < ?", args)
        db.execSQL("DELETE FROM catalog_track WHERE source_id = ? AND synced_at < ?", args)
    }

    // -----------------------------------------------------------------------
    // Sync state. Mirrors catalog-sync-state.ts but writes directly — no
    // in-memory cache (the worker is short-lived; cache would be wasted).
    // -----------------------------------------------------------------------

    data class SyncState(
        val sourceId: String,
        val cursor: String?,
        val status: String,
        val lastSyncedAt: Long?,
    )

    fun getSyncState(db: SQLiteDatabase, sourceId: String): SyncState? {
        db.rawQuery(
            "SELECT cursor, status, last_synced_at FROM catalog_sync_state WHERE source_id = ?",
            arrayOf(sourceId),
        ).use { c ->
            if (!c.moveToFirst()) return null
            return SyncState(
                sourceId = sourceId,
                cursor = if (c.isNull(0)) null else c.getString(0),
                status = if (c.isNull(1)) "idle" else c.getString(1),
                lastSyncedAt = if (c.isNull(2)) null else c.getLong(2),
            )
        }
    }

    fun markSyncStarted(db: SQLiteDatabase, sourceId: String) {
        val now = System.currentTimeMillis()
        val statement = db.compileStatement(UPSERT_SYNC_STATE_SQL)
        try {
            statement.bindString(1, sourceId)
            statement.bindString(2, "syncing")
            // last_synced_at preserved (NULL on first run)
            statement.bindNull(3)
            statement.bindLong(4, now)
            statement.bindNull(5) // error cleared
            statement.bindLong(6, 0)
            statement.bindLong(7, 0)
            statement.bindLong(8, 0)
            statement.bindNull(9)
            statement.bindLong(10, now)
            statement.executeInsert()
        } finally {
            statement.close()
        }
    }

    fun markSyncSucceeded(
        db: SQLiteDatabase,
        sourceId: String,
        counts: Triple<Long, Long, Long>,
        cursor: String?,
    ) {
        val now = System.currentTimeMillis()
        val statement = db.compileStatement(UPSERT_SYNC_STATE_SQL)
        try {
            statement.bindString(1, sourceId)
            statement.bindString(2, "synced")
            statement.bindLong(3, now)
            statement.bindLong(4, now)
            statement.bindNull(5)
            statement.bindLong(6, counts.first)
            statement.bindLong(7, counts.second)
            statement.bindLong(8, counts.third)
            if (cursor != null) statement.bindString(9, cursor) else statement.bindNull(9)
            statement.bindLong(10, now)
            statement.executeInsert()
        } finally {
            statement.close()
        }
    }

    fun markSyncFailed(db: SQLiteDatabase, sourceId: String, message: String) {
        val now = System.currentTimeMillis()
        val statement = db.compileStatement(UPSERT_SYNC_STATE_SQL)
        try {
            statement.bindString(1, sourceId)
            statement.bindString(2, "error")
            statement.bindNull(3)
            statement.bindLong(4, now)
            statement.bindString(5, message.take(500))
            statement.bindLong(6, 0)
            statement.bindLong(7, 0)
            statement.bindLong(8, 0)
            statement.bindNull(9)
            statement.bindLong(10, now)
            statement.executeInsert()
        } finally {
            statement.close()
        }
    }

    fun getSourceCounts(db: SQLiteDatabase, sourceId: String): Triple<Long, Long, Long> {
        var items = 0L
        var tracks = 0L
        var details = 0L
        db.rawQuery(
            "SELECT " +
                "(SELECT COUNT(*) FROM catalog_item WHERE source_id = ?), " +
                "(SELECT COUNT(*) FROM catalog_track WHERE source_id = ?), " +
                "(SELECT COUNT(*) FROM catalog_detail WHERE source_id = ?)",
            arrayOf(sourceId, sourceId, sourceId),
        ).use { c ->
            if (c.moveToFirst()) {
                items = c.getLong(0)
                tracks = c.getLong(1)
                details = c.getLong(2)
            }
        }
        return Triple(items, tracks, details)
    }

    private fun bindOptionalString(stmt: android.database.sqlite.SQLiteStatement, index: Int, value: String?) {
        if (value == null) stmt.bindNull(index) else stmt.bindString(index, value)
    }

    private fun bindOptionalLong(stmt: android.database.sqlite.SQLiteStatement, index: Int, value: Long?) {
        if (value == null) stmt.bindNull(index) else stmt.bindLong(index, value)
    }
}

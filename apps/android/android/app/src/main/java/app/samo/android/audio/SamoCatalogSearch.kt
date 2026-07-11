package app.samo.android.audio

import android.util.Log
import io.requery.android.database.sqlite.SQLiteDatabase

/**
 * THE owner of `catalog_search` (FTS5) — moved here from the JS indexer
 * (`services/catalog/catalog-search-index.ts`) when Kotlin took sole ownership
 * of `samo-catalog.db`. The bundled requery SQLite ships the fts5 module, so
 * the old platform-SQLite "no such module: fts5" constraint that forced the
 * table to live JS-side no longer exists.
 *
 * The index is DERIVED data: every searchable text column (title / subtitle /
 * artist / album) already exists as a plain column on `catalog_item` /
 * `catalog_track`, so maintenance is pure SQL — no payload JSON is parsed
 * here, and no core-mapper logic is duplicated. Search results return the raw
 * mirror payloads; the JS side hydrates them through the same core mappers the
 * browse surfaces use.
 *
 * Maintenance mirrors the JS indexer's semantics exactly:
 *  1. Non-song rows: full per-source rebuild from `catalog_item` (bounded by
 *     item count, so unconditional rebuild keeps "what you can browse" ==
 *     "what you can search").
 *  2. Song rows: incremental — only album-container tracks whose `synced_at`
 *     is past the per-source cursor (playlist containers would duplicate
 *     tracks; albums hold each track once).
 *  3. Deletion reconcile: drop song rows whose track left the mirror.
 *
 * Every entry point is fail-soft: search must never break a sync or a query —
 * a missing fts5 module (or a mid-flight schema surprise) logs loudly, flags
 * the index unavailable, and callers degrade to live server search.
 */
internal object SamoCatalogSearch {
    private const val TAG = "SamoCatalogSearch"

    /** Item types with search rows; strings match MobileHomeItemType ==
     *  MobileSearchItemType values (verified identical in core). Songs derive
     *  from catalog_track; podcast episodes have no search surface. */
    private const val SEARCHABLE_ITEM_TYPES = "('album','artist','audiobook','playlist','podcast','radio')"

    @Volatile private var bootstrapFailed = false

    /**
     * Idempotent schema bootstrap, called from SamoCatalogWriter alongside the
     * mirror tables. The column list is INSERT/SELECT-compatible with the
     * legacy JS-created table (which carried extra UNINDEXED `payload` — FTS5
     * columns are all nullable, so writes that omit it still land); upgraded
     * installs converge to payload-NULL rows as the reconcile passes rewrite
     * them, and fresh installs get this lean shape from day one.
     */
    fun bootstrap(db: SQLiteDatabase) {
        try {
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
                CREATE TABLE IF NOT EXISTS catalog_search_state (
                    source_id TEXT NOT NULL PRIMARY KEY,
                    cursor    INTEGER NOT NULL DEFAULT 0
                )
                """.trimIndent(),
            )
            bootstrapFailed = false
        } catch (error: Exception) {
            // Almost certainly "no such module: fts5" from an unexpected
            // SQLite build. Local search degrades to live server results.
            if (!bootstrapFailed) {
                Log.e(TAG, "catalog_search bootstrap FAILED — local search disabled", error)
            }
            bootstrapFailed = true
        }
    }

    /**
     * Post-sync index reconcile for one source. Runs on the sync worker
     * thread through the writer; each step is its own transaction so a
     * mid-flight failure never strands a half-rebuilt non-song set inside an
     * aborted song pass.
     */
    fun reconcile(context: android.content.Context, sourceId: String) {
        if (bootstrapFailed) {
            return
        }
        try {
            // 1) Non-song rows: rebuild from the authoritative item table.
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                db.execSQL(
                    "DELETE FROM catalog_search WHERE source_id = ? AND type != 'song'",
                    arrayOf(sourceId),
                )
                db.execSQL(
                    """
                    INSERT INTO catalog_search (title, subtitle, artist, album, source_id, type, entity_id, synced_at)
                    SELECT title, subtitle, NULL, NULL, source_id, type, id, synced_at
                    FROM catalog_item
                    WHERE source_id = ? AND type IN $SEARCHABLE_ITEM_TYPES
                    """.trimIndent(),
                    arrayOf(sourceId),
                )
            }

            // 2) Song rows: incremental by synced_at cursor over album tracks.
            var cursor = 0L
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                db.rawQuery(
                    "SELECT cursor FROM catalog_search_state WHERE source_id = ?",
                    arrayOf(sourceId),
                ).use { c -> if (c.moveToFirst()) cursor = c.getLong(0) }

                db.execSQL(
                    """
                    DELETE FROM catalog_search
                    WHERE source_id = ?1 AND type = 'song' AND entity_id IN (
                        SELECT DISTINCT track_id FROM catalog_track
                        WHERE source_id = ?1 AND container_type = 'album' AND synced_at > ?2
                    )
                    """.trimIndent(),
                    arrayOf<Any>(sourceId, cursor),
                )
                // GROUP BY dedupes a track that somehow appears in two album
                // containers; SQLite's bare-column-with-MAX rule picks the
                // freshest row's text fields.
                db.execSQL(
                    """
                    INSERT INTO catalog_search (title, subtitle, artist, album, source_id, type, entity_id, synced_at)
                    SELECT title, subtitle, artist, album, source_id, 'song', track_id, MAX(synced_at)
                    FROM catalog_track
                    WHERE source_id = ?1 AND container_type = 'album' AND synced_at > ?2
                    GROUP BY track_id
                    """.trimIndent(),
                    arrayOf<Any>(sourceId, cursor),
                )

                var maxSyncedAt = cursor
                db.rawQuery(
                    "SELECT MAX(synced_at) FROM catalog_track WHERE source_id = ? AND container_type = 'album'",
                    arrayOf(sourceId),
                ).use { c -> if (c.moveToFirst() && !c.isNull(0)) maxSyncedAt = maxOf(maxSyncedAt, c.getLong(0)) }
                db.execSQL(
                    """
                    INSERT INTO catalog_search_state (source_id, cursor) VALUES (?, ?)
                    ON CONFLICT(source_id) DO UPDATE SET cursor = excluded.cursor
                    """.trimIndent(),
                    arrayOf<Any>(sourceId, maxSyncedAt),
                )
            }

            // 3) Deletion reconcile: drop song rows whose track left the mirror.
            SamoCatalogWriter.withTransactionImmediate(context) { db ->
                db.execSQL(
                    """
                    DELETE FROM catalog_search
                    WHERE source_id = ?1 AND type = 'song' AND entity_id NOT IN (
                        SELECT DISTINCT track_id FROM catalog_track WHERE source_id = ?1
                    )
                    """.trimIndent(),
                    arrayOf(sourceId),
                )
            }
        } catch (error: Exception) {
            // Never fail the sync over the derived index — the next sync
            // retries from the same cursor.
            Log.w(TAG, "search reconcile failed for $sourceId", error)
        }
    }

    /**
     * Raw user text → FTS5 MATCH expression: each whitespace token becomes a
     * quoted prefix term. Port of the JS `toFtsMatchQuery` (byte-identical
     * output) so ranking/matching behavior is unchanged by the ownership move.
     */
    fun buildMatchQuery(raw: String): String =
        raw.trim()
            .split(Regex("\\s+"))
            .filter { it.isNotEmpty() }
            .joinToString(" ") { token -> "\"${token.replace("\"", "\"\"")}\"*" }

    /** One search hit: the entity's search type + its raw mirror payload. */
    data class Hit(val type: String, val payload: String)

    /**
     * bm25-ranked lookup against the index, hydrated to raw mirror payloads by
     * per-row primary-key lookups (≤ limit point queries — sub-ms each). Runs
     * on the reader connection; returns empty on any failure so callers
     * degrade to live server search.
     */
    fun search(db: SQLiteDatabase, rawQuery: String, sourceId: String?, limit: Int): List<Hit> {
        val match = buildMatchQuery(rawQuery)
        if (match.isEmpty()) {
            return emptyList()
        }
        return try {
            val refs = ArrayList<Triple<String, String, String>>(limit)
            val sql = StringBuilder(
                "SELECT type, entity_id, source_id FROM catalog_search WHERE catalog_search MATCH ?",
            )
            val args = ArrayList<String>(3).apply { add(match) }
            if (sourceId != null) {
                sql.append(" AND source_id = ?")
                args.add(sourceId)
            }
            sql.append(" ORDER BY rank LIMIT ?")
            args.add(limit.toString())
            db.rawQuery(sql.toString(), args.toTypedArray()).use { c ->
                while (c.moveToNext()) {
                    refs.add(Triple(c.getString(0), c.getString(1), c.getString(2)))
                }
            }

            val hits = ArrayList<Hit>(refs.size)
            for ((type, entityId, src) in refs) {
                val payload = if (type == "song") {
                    queryString(
                        db,
                        """
                        SELECT payload FROM catalog_track
                        WHERE source_id = ? AND container_type = 'album' AND track_id = ?
                        LIMIT 1
                        """.trimIndent(),
                        arrayOf(src, entityId),
                    )
                } else {
                    queryString(
                        db,
                        "SELECT payload FROM catalog_item WHERE source_id = ? AND type = ? AND id = ? LIMIT 1",
                        arrayOf(src, type, entityId),
                    )
                }
                if (payload != null) {
                    hits.add(Hit(type, payload))
                }
            }
            hits
        } catch (error: Exception) {
            Log.w(TAG, "search failed for ${rawQuery.take(40)}", error)
            emptyList()
        }
    }

    private fun queryString(db: SQLiteDatabase, sql: String, args: Array<String>): String? =
        db.rawQuery(sql, args).use { c ->
            if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null
        }
}

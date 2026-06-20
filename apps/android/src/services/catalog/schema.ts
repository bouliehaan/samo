// SQLite schema for the on-device Samo library mirror.
//
// The Android app caches the entire Samo catalog locally so that every
// browsing screen reads this database instead of the network — the server is
// only contacted to stream media and to fetch cover art on a cache miss. Each
// row keeps a small set of queryable columns (for sorting / filtering) plus a
// full JSON `payload` so reads are lossless: the columns drive the query, the
// payload reconstructs the exact mobile type the screens already consume.
//
// Only Samo sources are mirrored.
//
// Migrations are an append-only list. `MIGRATIONS[i]` upgrades the database
// from `user_version` i to i+1; the runner in database.ts stamps the version
// inside the same transaction. Every statement is idempotent (IF NOT EXISTS)
// so a crash between migrations is safe to re-run.

const MIGRATION_V1 = `
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
);

CREATE INDEX IF NOT EXISTS idx_catalog_item_type_sort
    ON catalog_item (source_id, type, sort_name);
CREATE INDEX IF NOT EXISTS idx_catalog_item_type_added
    ON catalog_item (source_id, type, added_at);
CREATE INDEX IF NOT EXISTS idx_catalog_item_last_played
    ON catalog_item (source_id, last_played_at);
CREATE INDEX IF NOT EXISTS idx_catalog_item_play_count
    ON catalog_item (source_id, play_count);
CREATE INDEX IF NOT EXISTS idx_catalog_item_container
    ON catalog_item (source_id, container_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_synced
    ON catalog_item (source_id, synced_at);

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
);

CREATE INDEX IF NOT EXISTS idx_catalog_track_container
    ON catalog_track (source_id, container_type, container_id, position);
CREATE INDEX IF NOT EXISTS idx_catalog_track_synced
    ON catalog_track (source_id, synced_at);

CREATE TABLE IF NOT EXISTS catalog_detail (
    source_id  TEXT    NOT NULL,
    cache_key  TEXT    NOT NULL,
    type       TEXT    NOT NULL,
    entity_id  TEXT    NOT NULL,
    payload    TEXT    NOT NULL,
    synced_at  INTEGER NOT NULL,
    PRIMARY KEY (source_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_catalog_detail_synced
    ON catalog_detail (source_id, synced_at);

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
);

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
);
`;

/**
 * Append-only migration list. The index is the source `user_version`; running
 * `MIGRATIONS[i]` advances the database to version i+1. Never edit a released
 * migration — add a new one.
 */
export const MIGRATIONS: readonly string[] = [MIGRATION_V1];

/** Row shape for the `payload`-only reads (item / track / detail / search). */
export interface CatalogPayloadRow {
    payload: string;
}

/** Aggregate row counts for one source. */
export interface CatalogCountsRow {
    items: number;
    tracks: number;
    details: number;
}

/** Raw `catalog_sync_state` row as returned by SQLite (snake_case columns). */
export interface CatalogSyncStateRow {
    source_id: string;
    status: string;
    last_synced_at: number | null;
    last_attempt_at: number | null;
    error: string | null;
    item_count: number;
    track_count: number;
    detail_count: number;
    cursor: string | null;
    updated_at: number;
}

import { type SQLiteBindParams, type SQLiteBindValue } from 'expo-sqlite';

import { getQualityBadgeKey } from '@samo/core/audio-quality';
import {
    type MobileHomeItem,
    type MobileHomeItemType,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';

import { getCatalogDatabase, getCatalogReaderSync } from './database';
import {
    type CatalogCountsRow,
    type CatalogPayloadRow,
} from './schema';

// Data-access layer for the local Samo library mirror. Reads return the exact
// mobile types the screens already consume (rebuilt from each row's JSON
// `payload`); the queryable columns exist only to sort and filter. Writes use
// upserts stamped with a per-sync `syncedAt` watermark, and `pruneSource`
// deletes anything older than the latest sync — so a full re-enumerate can
// rebuild a source without ever exposing a half-empty catalog to readers.
//
// Every method manages its own transaction. expo-sqlite serializes statements
// on the single shared connection, so callers must await operations
// sequentially rather than firing several writes concurrently.

/** Container kinds that own ordered tracks / chapters / episodes. */
export type CatalogContainerType = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast';

/** Sort key for a browse query, mapped to a real column by {@link SORT_COLUMNS}. */
export type CatalogItemSort = 'title' | 'added' | 'lastPlayed' | 'playCount';

export interface CatalogItemQuery {
    sort?: CatalogItemSort;
    direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/** One row to index for local full-text search. */
export interface CatalogSearchEntry {
    title: string;
    subtitle?: string;
    artist?: string;
    album?: string;
    type: string;
    entityId: string;
    payload: MobileSearchItem;
}

export interface CatalogSearchQuery {
    sourceId?: string;
    limit?: number;
}

const SORT_COLUMNS: Record<CatalogItemSort, string> = {
    title: 'sort_name',
    added: 'added_at',
    lastPlayed: 'last_played_at',
    playCount: 'play_count',
};

const nullable = (value: string | number | undefined | null): SQLiteBindValue =>
    value === undefined || value === null ? null : value;

const toSortName = (title: string): string => title.trim().toLowerCase();

/**
 * Turns raw user input into a safe FTS5 MATCH expression: each whitespace token
 * becomes a double-quoted prefix term (`"foo"*`), which makes FTS treat any
 * embedded operator characters literally. Returns '' when there is nothing to
 * match, so callers can short-circuit to an empty result.
 */
const toFtsMatchQuery = (raw: string): string =>
    raw
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0)
        .map((token) => `"${token.replace(/"/g, '""')}"*`)
        .join(' ');

const UPSERT_ITEM_SQL = `
INSERT INTO catalog_item (
    source_id, type, id, title, subtitle, sort_name, added_at, last_played_at,
    play_count, duration_seconds, container_id, artwork_url, artwork_image_id,
    quality_profile, is_hi_res, payload, synced_at
) VALUES (
    $source_id, $type, $id, $title, $subtitle, $sort_name, $added_at, $last_played_at,
    $play_count, $duration_seconds, $container_id, $artwork_url, $artwork_image_id,
    $quality_profile, $is_hi_res, $payload, $synced_at
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
`;

const UPSERT_TRACK_SQL = `
INSERT INTO catalog_track (
    source_id, container_type, container_id, track_id, position, disc_no, track_no,
    title, subtitle, artist, artist_id, album, album_id, duration_seconds,
    artwork_image_id, payload, synced_at
) VALUES (
    $source_id, $container_type, $container_id, $track_id, $position, $disc_no, $track_no,
    $title, $subtitle, $artist, $artist_id, $album, $album_id, $duration_seconds,
    $artwork_image_id, $payload, $synced_at
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
`;

const UPSERT_DETAIL_SQL = `
INSERT INTO catalog_detail (source_id, cache_key, type, entity_id, payload, synced_at)
VALUES ($source_id, $cache_key, $type, $entity_id, $payload, $synced_at)
ON CONFLICT(source_id, cache_key) DO UPDATE SET
    type = excluded.type,
    entity_id = excluded.entity_id,
    payload = excluded.payload,
    synced_at = excluded.synced_at
`;

const INSERT_SEARCH_SQL = `
INSERT INTO catalog_search (
    title, subtitle, artist, album, source_id, type, entity_id, payload, synced_at
) VALUES (
    $title, $subtitle, $artist, $album, $source_id, $type, $entity_id, $payload, $synced_at
)
`;

const bindItem = (
    sourceId: string,
    item: MobileHomeItem,
    syncedAt: number,
): SQLiteBindParams => ({
    $source_id: sourceId,
    $type: item.type,
    $id: item.id,
    $title: item.title,
    $subtitle: nullable(item.subtitle),
    $sort_name: toSortName(item.title),
    $added_at: nullable(item.addedAt),
    $last_played_at: nullable(item.lastPlayedAt),
    $play_count: nullable(item.playCount),
    $duration_seconds: nullable(item.durationSeconds),
    $container_id: nullable(item.containerId),
    $artwork_url: nullable(item.artworkUrl),
    $artwork_image_id: nullable(item.artworkImageId),
    $quality_profile: getQualityBadgeKey(item.qualityProfile),
    $is_hi_res: item.isHiRes ? 1 : 0,
    $payload: JSON.stringify(item),
    $synced_at: syncedAt,
});

const bindTrack = (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
    track: MobileMediaTrack,
    position: number,
    syncedAt: number,
): SQLiteBindParams => ({
    $source_id: sourceId,
    $container_type: containerType,
    $container_id: containerId,
    $track_id: track.id,
    $position: position,
    $disc_no: nullable(track.discNumber),
    $track_no: nullable(track.trackNumber),
    $title: track.title,
    $subtitle: nullable(track.subtitle),
    $artist: nullable(track.artist),
    $artist_id: nullable(track.artistId),
    $album: nullable(track.album),
    $album_id: nullable(track.albumId),
    $duration_seconds: nullable(track.durationSeconds),
    $artwork_image_id: nullable(track.artworkImageId),
    $payload: JSON.stringify(track),
    $synced_at: syncedAt,
});

const parsePayload = <T>(row: CatalogPayloadRow): T | null => {
    try {
        return JSON.parse(row.payload) as T;
    } catch {
        return null;
    }
};

export const upsertItems = async (
    sourceId: string,
    items: MobileHomeItem[],
    syncedAt: number,
): Promise<void> => {
    if (items.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        const statement = await db.prepareAsync(UPSERT_ITEM_SQL);
        try {
            for (const item of items) {
                await statement.executeAsync(bindItem(sourceId, item, syncedAt));
            }
        } finally {
            await statement.finalizeAsync();
        }
    });
};

/**
 * Stable album track ordering: derived from (disc, track) rather than array
 * index, so an incremental sync can upsert just the changed tracks of an album
 * without renumbering — and therefore reordering — the rest. The full and delta
 * paths must agree, so both pass this for `container_type = 'album'`. Containers
 * with an authored order (playlists, artist top-tracks, podcast episodes) keep
 * array-index positions, which only the full-list crawl ever writes.
 */
export const albumTrackPosition = (track: MobileMediaTrack): number =>
    (track.discNumber ?? 1) * 100_000 + (track.trackNumber ?? 0);

export const upsertTracks = async (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
    tracks: MobileMediaTrack[],
    syncedAt: number,
    positionOf?: (track: MobileMediaTrack, index: number) => number,
): Promise<void> => {
    if (tracks.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        const statement = await db.prepareAsync(UPSERT_TRACK_SQL);
        try {
            for (let index = 0; index < tracks.length; index += 1) {
                const position = positionOf ? positionOf(tracks[index], index) : index;
                await statement.executeAsync(
                    bindTrack(sourceId, containerType, containerId, tracks[index], position, syncedAt),
                );
            }
        } finally {
            await statement.finalizeAsync();
        }
    });
};

export const upsertDetail = async (
    sourceId: string,
    type: string,
    entityId: string,
    detail: MobileMediaDetail,
    syncedAt: number,
): Promise<void> => {
    const db = await getCatalogDatabase();
    await db.runAsync(UPSERT_DETAIL_SQL, {
        $source_id: sourceId,
        $cache_key: `${type}:${entityId}`,
        $type: type,
        $entity_id: entityId,
        $payload: JSON.stringify(detail),
        $synced_at: syncedAt,
    });
};

export const indexSearchEntries = async (
    sourceId: string,
    entries: CatalogSearchEntry[],
    syncedAt: number,
): Promise<void> => {
    if (entries.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        const statement = await db.prepareAsync(INSERT_SEARCH_SQL);
        try {
            for (const entry of entries) {
                await statement.executeAsync({
                    $title: entry.title,
                    $subtitle: nullable(entry.subtitle),
                    $artist: nullable(entry.artist),
                    $album: nullable(entry.album),
                    $source_id: sourceId,
                    $type: entry.type,
                    $entity_id: entry.entityId,
                    $payload: JSON.stringify(entry.payload),
                    $synced_at: syncedAt,
                });
            }
        } finally {
            await statement.finalizeAsync();
        }
    });
};

export const getItemsByType = async (
    sourceId: string,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): Promise<MobileHomeItem[]> => {
    const db = await getCatalogDatabase();
    const sortColumn = SORT_COLUMNS[query.sort ?? 'title'];
    const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
    const limit = query.limit ?? -1;
    const offset = query.offset ?? 0;
    const rows = await db.getAllAsync<CatalogPayloadRow>(
        `SELECT payload FROM catalog_item
         WHERE source_id = ? AND type = ?
         ORDER BY (${sortColumn} IS NULL) ASC, ${sortColumn} ${direction}
         LIMIT ? OFFSET ?`,
        sourceId,
        type,
        limit,
        offset,
    );
    return rows
        .map((row) => parsePayload<MobileHomeItem>(row))
        .filter((item): item is MobileHomeItem => item !== null);
};

export const getItemById = async (
    sourceId: string,
    type: MobileHomeItemType,
    id: string,
): Promise<MobileHomeItem | null> => {
    const db = await getCatalogDatabase();
    const row = await db.getFirstAsync<CatalogPayloadRow>(
        'SELECT payload FROM catalog_item WHERE source_id = ? AND type = ? AND id = ?',
        sourceId,
        type,
        id,
    );
    return row ? parsePayload<MobileHomeItem>(row) : null;
};

export const getTracks = async (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
): Promise<MobileMediaTrack[]> => {
    const db = await getCatalogDatabase();
    const rows = await db.getAllAsync<CatalogPayloadRow>(
        `SELECT payload FROM catalog_track
         WHERE source_id = ? AND container_type = ? AND container_id = ?
         ORDER BY position ASC`,
        sourceId,
        containerType,
        containerId,
    );
    return rows
        .map((row) => parsePayload<MobileMediaTrack>(row))
        .filter((track): track is MobileMediaTrack => track !== null);
};

export const getDetail = async (
    sourceId: string,
    type: string,
    entityId: string,
): Promise<MobileMediaDetail | null> => {
    const db = await getCatalogDatabase();
    const row = await db.getFirstAsync<CatalogPayloadRow>(
        'SELECT payload FROM catalog_detail WHERE source_id = ? AND cache_key = ?',
        sourceId,
        `${type}:${entityId}`,
    );
    return row ? parsePayload<MobileMediaDetail>(row) : null;
};

export const searchLocal = async (
    rawQuery: string,
    query: CatalogSearchQuery = {},
): Promise<MobileSearchItem[]> => {
    const match = toFtsMatchQuery(rawQuery);
    if (!match) {
        return [];
    }
    const db = await getCatalogDatabase();
    const limit = query.limit ?? 50;
    const rows = query.sourceId
        ? await db.getAllAsync<CatalogPayloadRow>(
              `SELECT payload FROM catalog_search
               WHERE catalog_search MATCH ? AND source_id = ?
               ORDER BY rank LIMIT ?`,
              match,
              query.sourceId,
              limit,
          )
        : await db.getAllAsync<CatalogPayloadRow>(
              `SELECT payload FROM catalog_search
               WHERE catalog_search MATCH ?
               ORDER BY rank LIMIT ?`,
              match,
              limit,
          );
    return rows
        .map((row) => parsePayload<MobileSearchItem>(row))
        .filter((item): item is MobileSearchItem => item !== null);
};

// ---------------------------------------------------------------------------
// Synchronous reads (render path).
//
// Run on the JS thread via the WAL reader connection so browse screens resolve
// catalog data DURING render — no await, so a loading state never mounts. Use
// for BOUNDED queries (one detail's tracks, a single grid page); large scans
// belong on the async API. Each returns empty/null if the reader isn't ready
// yet, so callers can fall back to the async path.
// ---------------------------------------------------------------------------

export const getDetailSync = (
    sourceId: string,
    type: string,
    entityId: string,
): MobileMediaDetail | null => {
    const db = getCatalogReaderSync();
    if (!db) {
        return null;
    }
    try {
        const row = db.getFirstSync<CatalogPayloadRow>(
            'SELECT payload FROM catalog_detail WHERE source_id = ? AND cache_key = ?',
            sourceId,
            `${type}:${entityId}`,
        );
        return row ? parsePayload<MobileMediaDetail>(row) : null;
    } catch {
        return null;
    }
};

export const getTracksSync = (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
): MobileMediaTrack[] => {
    const db = getCatalogReaderSync();
    if (!db) {
        return [];
    }
    try {
        const rows = db.getAllSync<CatalogPayloadRow>(
            `SELECT payload FROM catalog_track
             WHERE source_id = ? AND container_type = ? AND container_id = ?
             ORDER BY position ASC`,
            sourceId,
            containerType,
            containerId,
        );
        return rows
            .map((row) => parsePayload<MobileMediaTrack>(row))
            .filter((track): track is MobileMediaTrack => track !== null);
    } catch {
        return [];
    }
};

export const getItemByIdSync = (
    sourceId: string,
    type: MobileHomeItemType,
    id: string,
): MobileHomeItem | null => {
    const db = getCatalogReaderSync();
    if (!db) {
        return null;
    }
    try {
        const row = db.getFirstSync<CatalogPayloadRow>(
            'SELECT payload FROM catalog_item WHERE source_id = ? AND type = ? AND id = ?',
            sourceId,
            type,
            id,
        );
        return row ? parsePayload<MobileHomeItem>(row) : null;
    } catch {
        return null;
    }
};

export const getItemsByTypeSync = (
    sourceId: string,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): MobileHomeItem[] => {
    const db = getCatalogReaderSync();
    if (!db) {
        return [];
    }
    try {
        const sortColumn = SORT_COLUMNS[query.sort ?? 'title'];
        const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
        const limit = query.limit ?? -1;
        const offset = query.offset ?? 0;
        const rows = db.getAllSync<CatalogPayloadRow>(
            `SELECT payload FROM catalog_item
             WHERE source_id = ? AND type = ?
             ORDER BY (${sortColumn} IS NULL) ASC, ${sortColumn} ${direction}
             LIMIT ? OFFSET ?`,
            sourceId,
            type,
            limit,
            offset,
        );
        return rows
            .map((row) => parsePayload<MobileHomeItem>(row))
            .filter((item): item is MobileHomeItem => item !== null);
    } catch {
        return [];
    }
};

export const searchLocalSync = (
    rawQuery: string,
    query: CatalogSearchQuery = {},
): MobileSearchItem[] => {
    const match = toFtsMatchQuery(rawQuery);
    if (!match) {
        return [];
    }
    const db = getCatalogReaderSync();
    if (!db) {
        return [];
    }
    try {
        const limit = query.limit ?? 50;
        const rows = query.sourceId
            ? db.getAllSync<CatalogPayloadRow>(
                  `SELECT payload FROM catalog_search
                   WHERE catalog_search MATCH ? AND source_id = ?
                   ORDER BY rank LIMIT ?`,
                  match,
                  query.sourceId,
                  limit,
              )
            : db.getAllSync<CatalogPayloadRow>(
                  `SELECT payload FROM catalog_search
                   WHERE catalog_search MATCH ?
                   ORDER BY rank LIMIT ?`,
                  match,
                  limit,
              );
        return rows
            .map((row) => parsePayload<MobileSearchItem>(row))
            .filter((item): item is MobileSearchItem => item !== null);
    } catch {
        return [];
    }
};

export const getSourceCounts = async (
    sourceId: string,
): Promise<{ items: number; tracks: number; details: number }> => {
    const db = await getCatalogDatabase();
    const row = await db.getFirstAsync<CatalogCountsRow>(
        `SELECT
            (SELECT COUNT(*) FROM catalog_item WHERE source_id = $source) AS items,
            (SELECT COUNT(*) FROM catalog_track WHERE source_id = $source) AS tracks,
            (SELECT COUNT(*) FROM catalog_detail WHERE source_id = $source) AS details`,
        { $source: sourceId },
    );
    return {
        items: row?.items ?? 0,
        tracks: row?.tracks ?? 0,
        details: row?.details ?? 0,
    };
};

/**
 * Deletes every row for a source whose `synced_at` predates the given
 * watermark — i.e. anything the latest full sync did not re-touch. Run once at
 * the end of a sync to drop catalog entries that no longer exist on the server.
 */
export const pruneSource = async (sourceId: string, syncedAt: number): Promise<void> => {
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'DELETE FROM catalog_item WHERE source_id = ? AND synced_at < ?',
            sourceId,
            syncedAt,
        );
        await db.runAsync(
            'DELETE FROM catalog_track WHERE source_id = ? AND synced_at < ?',
            sourceId,
            syncedAt,
        );
        await db.runAsync(
            'DELETE FROM catalog_detail WHERE source_id = ? AND synced_at < ?',
            sourceId,
            syncedAt,
        );
        await db.runAsync(
            'DELETE FROM catalog_search WHERE source_id = ? AND synced_at < ?',
            sourceId,
            syncedAt,
        );
    });
};

// ---------------------------------------------------------------------------
// Incremental ("delta") sync reconciliation.
//
// A delta sync upserts only changed rows, so it can't lean on the
// synced_at-watermark prune to drop deletions. Instead the caller diffs the
// server's full id manifest against these local id reads and deletes the
// (typically small) difference by id. Deletes are chunked to stay under
// SQLite's bound-parameter limit.
// ---------------------------------------------------------------------------

const DELETE_CHUNK = 400;

const chunk = <T>(values: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < values.length; i += size) {
        chunks.push(values.slice(i, i + size));
    }
    return chunks;
};

const placeholders = (count: number): string => new Array(count).fill('?').join(', ');

export const getItemIdsByType = async (
    sourceId: string,
    type: MobileHomeItemType,
): Promise<string[]> => {
    const db = await getCatalogDatabase();
    const rows = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM catalog_item WHERE source_id = ? AND type = ?',
        sourceId,
        type,
    );
    return rows.map((row) => row.id);
};

/** Distinct track ids stored under the given container types (e.g. the music
 * containers, whose ids share the music-track namespace). */
export const getDistinctTrackIds = async (
    sourceId: string,
    containerTypes: CatalogContainerType[],
): Promise<string[]> => {
    if (containerTypes.length === 0) {
        return [];
    }
    const db = await getCatalogDatabase();
    const rows = await db.getAllAsync<{ track_id: string }>(
        `SELECT DISTINCT track_id FROM catalog_track
         WHERE source_id = ? AND container_type IN (${placeholders(containerTypes.length)})`,
        sourceId,
        ...containerTypes,
    );
    return rows.map((row) => row.track_id);
};

export const getDetailEntityIds = async (
    sourceId: string,
    type: string,
): Promise<string[]> => {
    const db = await getCatalogDatabase();
    const rows = await db.getAllAsync<{ entity_id: string }>(
        'SELECT entity_id FROM catalog_detail WHERE source_id = ? AND type = ?',
        sourceId,
        type,
    );
    return rows.map((row) => row.entity_id);
};

export const getSearchEntityIds = async (sourceId: string): Promise<string[]> => {
    const db = await getCatalogDatabase();
    const rows = await db.getAllAsync<{ entity_id: string }>(
        'SELECT DISTINCT entity_id FROM catalog_search WHERE source_id = ?',
        sourceId,
    );
    return rows.map((row) => row.entity_id);
};

export const deleteItemsByIds = async (
    sourceId: string,
    type: MobileHomeItemType,
    ids: string[],
): Promise<void> => {
    if (ids.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        for (const batch of chunk(ids, DELETE_CHUNK)) {
            await db.runAsync(
                `DELETE FROM catalog_item WHERE source_id = ? AND type = ? AND id IN (${placeholders(batch.length)})`,
                sourceId,
                type,
                ...batch,
            );
        }
    });
};

/** Removes the given track ids from the named container types (used to purge
 * deleted music tracks from every music container at once). */
export const deleteTracksByTrackIds = async (
    sourceId: string,
    trackIds: string[],
    containerTypes: CatalogContainerType[],
): Promise<void> => {
    if (trackIds.length === 0 || containerTypes.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    const containerClause = placeholders(containerTypes.length);
    await db.withTransactionAsync(async () => {
        for (const batch of chunk(trackIds, DELETE_CHUNK)) {
            await db.runAsync(
                `DELETE FROM catalog_track
                 WHERE source_id = ? AND container_type IN (${containerClause})
                   AND track_id IN (${placeholders(batch.length)})`,
                sourceId,
                ...containerTypes,
                ...batch,
            );
        }
    });
};

/** Drops every track row for one container — used before re-inserting a
 * re-crawled container's authored track list so removed entries don't linger. */
export const deleteContainerTracks = async (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
): Promise<void> => {
    const db = await getCatalogDatabase();
    await db.runAsync(
        'DELETE FROM catalog_track WHERE source_id = ? AND container_type = ? AND container_id = ?',
        sourceId,
        containerType,
        containerId,
    );
};

export const deleteDetailsByEntityIds = async (
    sourceId: string,
    type: string,
    entityIds: string[],
): Promise<void> => {
    if (entityIds.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        for (const batch of chunk(entityIds, DELETE_CHUNK)) {
            await db.runAsync(
                `DELETE FROM catalog_detail WHERE source_id = ? AND type = ? AND entity_id IN (${placeholders(batch.length)})`,
                sourceId,
                type,
                ...batch,
            );
        }
    });
};

export const deleteSearchByEntityIds = async (
    sourceId: string,
    entityIds: string[],
): Promise<void> => {
    if (entityIds.length === 0) {
        return;
    }
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        for (const batch of chunk(entityIds, DELETE_CHUNK)) {
            await db.runAsync(
                `DELETE FROM catalog_search WHERE source_id = ? AND entity_id IN (${placeholders(batch.length)})`,
                sourceId,
                ...batch,
            );
        }
    });
};

/** Drops the entire mirror for a source (e.g. when its server is removed). */
export const clearSource = async (sourceId: string): Promise<void> => {
    const db = await getCatalogDatabase();
    await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM catalog_item WHERE source_id = ?', sourceId);
        await db.runAsync('DELETE FROM catalog_track WHERE source_id = ?', sourceId);
        await db.runAsync('DELETE FROM catalog_detail WHERE source_id = ?', sourceId);
        await db.runAsync('DELETE FROM catalog_search WHERE source_id = ?', sourceId);
    });
};

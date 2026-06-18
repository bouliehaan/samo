import {
    getMobileContentSource,
    MobileHomeItemType,
    MobileSearchItemType,
    type MobileContentSource,
    type MobileHomeItem,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { fsGetItem, fsSetItem } from '../fs-storage';
import {
    deleteNonSongSearch,
    deleteOrphanSongSearch,
    deleteSearchByEntityIds,
    getAlbumTracksSyncedSince,
    getAllItems,
    indexSearchEntries,
    type CatalogSearchEntry,
} from './catalog-repository';
import { hydrateCatalogTrack } from './catalog-reads';

// THE owner of `catalog_search`. The FTS5 module only exists in expo-sqlite's
// bundled sqlite3 — Android's platform SQLite (which the Kotlin sync engine
// runs on) throws "no such module: fts5" for ANY statement referencing the
// table. So ownership is partitioned by table: Kotlin owns the mirror
// (items / tracks / details / sync state), and this module DERIVES the search
// index from those tables after each sync. That stays one-owner-per-table,
// and it's sound because the index is UI-side data — nothing needs it fresh
// while the app is closed, and search already merges live server results, so
// a not-yet-indexed row is reachable mid-rebuild.

const SEARCH_CURSOR_KEY_PREFIX = 'samo.catalog.search-index.cursor.v1.';
const SONG_INDEX_BATCH = 1_000;

const HOME_TO_SEARCH_TYPE: Partial<Record<MobileHomeItemType, MobileSearchItemType>> = {
    [MobileHomeItemType.ALBUM]: MobileSearchItemType.ALBUM,
    [MobileHomeItemType.ARTIST]: MobileSearchItemType.ARTIST,
    [MobileHomeItemType.AUDIOBOOK]: MobileSearchItemType.AUDIOBOOK,
    [MobileHomeItemType.PLAYLIST]: MobileSearchItemType.PLAYLIST,
    [MobileHomeItemType.PODCAST]: MobileSearchItemType.PODCAST,
    [MobileHomeItemType.RADIO]: MobileSearchItemType.RADIO,
};

const homeItemToSearchItem = (
    item: MobileHomeItem,
    type: MobileSearchItemType,
): MobileSearchItem => ({
    artworkImageId: item.artworkImageId,
    artworkUrl: item.artworkUrl,
    id: item.id,
    isHiRes: item.isHiRes,
    lastPlayedAt: item.lastPlayedAt,
    playCount: item.playCount,
    qualityProfile: item.qualityProfile,
    source: item.source,
    subtitle: item.subtitle,
    title: item.title,
    type,
});

const itemSearchEntries = (items: MobileHomeItem[]): CatalogSearchEntry[] => {
    const entries: CatalogSearchEntry[] = [];
    for (const item of items) {
        const type = HOME_TO_SEARCH_TYPE[item.type];
        if (!type) {
            continue;
        }
        entries.push({
            title: item.title,
            subtitle: item.subtitle,
            type,
            entityId: item.id,
            payload: homeItemToSearchItem(item, type),
        });
    }
    return entries;
};

const trackToSearchEntry = (
    track: MobileMediaTrack,
    source: MobileContentSource,
): CatalogSearchEntry => ({
    title: track.title,
    subtitle: track.subtitle,
    artist: track.artist,
    album: track.album,
    type: MobileSearchItemType.SONG,
    entityId: track.id,
    payload: {
        album: track.album,
        albumId: track.albumId,
        artist: track.artist,
        artistId: track.artistId,
        artworkUrl: track.artworkUrl,
        artworkImageId: track.artworkImageId,
        id: track.id,
        playback: track.playback,
        source,
        subtitle: track.subtitle,
        title: track.title,
        type: MobileSearchItemType.SONG,
    },
});

const cursorKey = (sourceId: string) => `${SEARCH_CURSOR_KEY_PREFIX}${sourceId}`;

const loadCursor = async (sourceId: string): Promise<number> => {
    try {
        const raw = await fsGetItem(cursorKey(sourceId));
        const parsed = raw ? Number(raw) : 0;
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
        return 0;
    }
};

const saveCursor = async (sourceId: string, value: number): Promise<void> => {
    try {
        await fsSetItem(cursorKey(sourceId), String(value));
    } catch {
        // best-effort — worst case the next pass re-indexes the same rows
    }
};

const reindexSource = async (authentication: ServerAuthenticationResult): Promise<void> => {
    const source = getMobileContentSource(authentication);
    const sourceId = source.id;
    const syncedAt = Date.now();

    // 1. Non-song rows: full re-derive from the authoritative item table.
    //    Bounded by item count (hundreds), so a rebuild every pass is cheap
    //    and unconditionally keeps "what you can browse" == "what you can
    //    search".
    const items = await getAllItems(sourceId);
    if (items.length > 0) {
        await deleteNonSongSearch(sourceId);
        await indexSearchEntries(sourceId, itemSearchEntries(items), syncedAt);
    }

    // 2. Songs: incremental — only track rows the sync touched since our
    //    cursor. Paginate the reads to bound memory usage (a fresh install
    //    can have 50k+ tracks; fetching them all crashes the JS VM).
    const cursor = await loadCursor(sourceId);
    let maxSyncedAt = cursor;
    let offset = 0;

    while (true) {
        const { maxSyncedAt: batchMax, tracks: rawTracks } = await getAlbumTracksSyncedSince(
            sourceId,
            cursor,
            SONG_INDEX_BATCH,
            offset,
        );

        if (rawTracks.length === 0) {
            break;
        }

        if (batchMax > maxSyncedAt) {
            maxSyncedAt = batchMax;
        }

        const tracks = rawTracks
            .map((payload) => hydrateCatalogTrack(payload, authentication))
            .filter((track): track is MobileMediaTrack => track !== null);

        await deleteSearchByEntityIds(
            sourceId,
            tracks.map((track) => track.id),
        );
        await indexSearchEntries(
            sourceId,
            tracks.map((track) => trackToSearchEntry(track, source)),
            syncedAt,
        );

        if (rawTracks.length < SONG_INDEX_BATCH) {
            break;
        }
        offset += SONG_INDEX_BATCH;
    }

    // 3. Deletion reconcile: drop song rows whose track left the mirror.
    await deleteOrphanSongSearch(sourceId);

    if (maxSyncedAt > cursor) {
        await saveCursor(sourceId, maxSyncedAt);
    }
};

let inFlight: Promise<void> | null = null;
let rerunRequested = false;

/**
 * Re-derive the search index for every connected Samo source. Single-flight;
 * a request that arrives mid-run schedules exactly one follow-up pass (the
 * sync that triggered it may have written rows after our reads).
 */
export const reindexCatalogSearch = (
    authentication: ServerAuthenticationResult | null,
): Promise<void> => {
    if (!authentication) {
        return Promise.resolve();
    }
    if (inFlight) {
        rerunRequested = true;
        return inFlight;
    }
    inFlight = (async () => {
        try {
            do {
                rerunRequested = false;
                try {
                    await reindexSource(authentication);
                    } catch {
                        // Search indexing must never break the app; the next
                        // sync-completed event retries from the same cursor.
                }
            } while (rerunRequested);
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
};

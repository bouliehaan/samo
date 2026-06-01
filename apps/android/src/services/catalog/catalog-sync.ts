import {
    getMobileContentSource,
    loadMobileFullCollection,
    loadMobileMediaDetail,
    loadSamoLibraryTracks,
    MobileHomeItemType,
    MobileMediaDetailType,
    MobileSearchItemType,
    type MobileContentSource,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import {
    type CatalogContainerType,
    type CatalogSearchEntry,
    getSourceCounts,
    indexSearchEntries,
    pruneSource,
    upsertDetail,
    upsertItems,
    upsertTracks,
} from './catalog-repository';
import {
    markSyncFailed,
    markSyncStarted,
    markSyncSucceeded,
    setSyncProgress,
} from './catalog-sync-state';

// Mirrors an entire Samo library into the local SQLite catalog. One pass per
// source: enumerate every collection (albums/artists/audiobooks/playlists/
// podcasts) plus the global track table, then crawl the containers whose
// ordered children the flat track table can't reconstruct. Everything is
// stamped with a single `syncedAt` watermark and the source is pruned at the
// end, so a full re-enumerate never exposes a half-empty catalog to readers.
//
// CRITICAL: expo-sqlite serializes statements on the one shared connection, so
// two write transactions must never overlap. Concurrency here is therefore used
// ONLY to prefetch detail payloads over the network; every catalog write is
// awaited sequentially.

const COLLECTION_VARIANTS: MobileFullCollectionVariant[] = [
    'album',
    'artist',
    'audiobook',
    'playlist',
    'podcast',
];

// Album track lists are derived locally by grouping the global track table on
// `albumId`, so albums are NOT crawled. The rest carry ordered children
// (top tracks, playlist order, chapters, episodes) that only the detail
// endpoint returns, so each one needs a per-entity fetch.
const HOME_TO_DETAIL_TYPE: Partial<Record<MobileHomeItemType, MobileMediaDetailType>> = {
    [MobileHomeItemType.ARTIST]: MobileMediaDetailType.ARTIST,
    [MobileHomeItemType.AUDIOBOOK]: MobileMediaDetailType.AUDIOBOOK,
    [MobileHomeItemType.PLAYLIST]: MobileMediaDetailType.PLAYLIST,
    [MobileHomeItemType.PODCAST]: MobileMediaDetailType.PODCAST,
};

const HOME_TO_SEARCH_TYPE: Partial<Record<MobileHomeItemType, MobileSearchItemType>> = {
    [MobileHomeItemType.ALBUM]: MobileSearchItemType.ALBUM,
    [MobileHomeItemType.ARTIST]: MobileSearchItemType.ARTIST,
    [MobileHomeItemType.AUDIOBOOK]: MobileSearchItemType.AUDIOBOOK,
    [MobileHomeItemType.PLAYLIST]: MobileSearchItemType.PLAYLIST,
    [MobileHomeItemType.PODCAST]: MobileSearchItemType.PODCAST,
    [MobileHomeItemType.RADIO]: MobileSearchItemType.RADIO,
};

// Samo derives album quality inline from the album payload, so the per-album
// quality scan (a Subsonic concern) is disabled — matches the live full-
// collection loader the browse grids already use.
const QUALITY_SCAN_LIMIT = 0;

// How many detail payloads to fetch concurrently before flushing the batch to
// the database sequentially. Bounds both in-flight network load and peak
// memory while never overlapping write transactions.
const DETAIL_FETCH_CONCURRENCY = 8;

// Song search rows are indexed in batches so a library with tens of thousands
// of tracks never materializes one giant array of search entries.
const SONG_INDEX_BATCH = 1_000;

export interface CatalogSyncResult {
    sourceId: string;
    items: number;
    tracks: number;
    details: number;
    errors: string[];
}

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const groupTracksByAlbum = (
    tracks: MobileMediaTrack[],
): Map<string, MobileMediaTrack[]> => {
    const groups = new Map<string, MobileMediaTrack[]>();
    for (const track of tracks) {
        if (!track.albumId) {
            continue;
        }
        const existing = groups.get(track.albumId);
        if (existing) {
            existing.push(track);
        } else {
            groups.set(track.albumId, [track]);
        }
    }
    return groups;
};

// Orders a single album's tracks the way the album screen expects. The global
// track endpoint returns rows in arbitrary order, so disc/track ordering has to
// be reconstructed here before the row `position` is assigned by upsertTracks.
const sortAlbumTracks = (tracks: MobileMediaTrack[]): MobileMediaTrack[] =>
    [...tracks].sort((left, right) => {
        const leftDisc = left.discNumber ?? 1;
        const rightDisc = right.discNumber ?? 1;
        if (leftDisc !== rightDisc) {
            return leftDisc - rightDisc;
        }
        return (left.trackNumber ?? 0) - (right.trackNumber ?? 0);
    });

const homeItemToSearchItem = (
    item: MobileHomeItem,
    type: MobileSearchItemType,
): MobileSearchItem => ({
    artworkUrl: item.artworkUrl,
    artworkImageId: item.artworkImageId,
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

// Dedupes concurrent syncs of the same source. A full sync fires from both the
// connect flow and the manual Sync button, and two overlapping runs for one
// source would interleave write transactions on the shared connection and let
// one run's prune delete the other's in-progress rows. A second request while a
// sync is in flight therefore joins the existing run instead of starting a new
// one.
const inFlight = new Map<string, Promise<CatalogSyncResult>>();

const runSamoSourceSync = async (
    authentication: ServerAuthenticationResult,
    source: MobileContentSource,
): Promise<CatalogSyncResult> => {
    const sourceId = source.id;
    const syncedAt = Date.now();
    const errors: string[] = [];

    await markSyncStarted(sourceId);

    try {
        // 1. Every collection item across all five browse variants.
        const items: MobileHomeItem[] = [];
        for (const variant of COLLECTION_VARIANTS) {
            const result = await loadMobileFullCollection({
                authentications: [authentication],
                qualityScanLimit: QUALITY_SCAN_LIMIT,
                variant,
            });
            items.push(...result.items);
            errors.push(...result.errors);
        }
        await upsertItems(sourceId, items, syncedAt);
        await indexSearchEntries(sourceId, itemSearchEntries(items), syncedAt);
        await setSyncProgress(sourceId, { items: items.length, tracks: 0, details: 0 });

        // 2. The whole track table, grouped into albums on-device. Each album's
        //    tracks are written in their own transaction, in disc/track order.
        const tracks = await loadSamoLibraryTracks(authentication);
        const albums = groupTracksByAlbum(tracks);
        for (const [albumId, albumTracks] of albums) {
            await upsertTracks(sourceId, 'album', albumId, sortAlbumTracks(albumTracks), syncedAt);
        }
        for (let start = 0; start < tracks.length; start += SONG_INDEX_BATCH) {
            const batch = tracks
                .slice(start, start + SONG_INDEX_BATCH)
                .map((track) => trackToSearchEntry(track, source));
            await indexSearchEntries(sourceId, batch, syncedAt);
        }
        await setSyncProgress(sourceId, { items: items.length, tracks: tracks.length, details: 0 });

        // 3. Crawl containers whose ordered children the flat track table can't
        //    rebuild. Fetch a batch concurrently (network), then write it
        //    sequentially so transactions never overlap.
        const crawlItems = items.filter((item) => HOME_TO_DETAIL_TYPE[item.type] !== undefined);
        let details = 0;
        for (let start = 0; start < crawlItems.length; start += DETAIL_FETCH_CONCURRENCY) {
            const batch = crawlItems.slice(start, start + DETAIL_FETCH_CONCURRENCY);
            const fetched = await Promise.all(
                batch.map(async (item) => {
                    const type = HOME_TO_DETAIL_TYPE[item.type];
                    if (!type) {
                        return null;
                    }
                    try {
                        const detail = await loadMobileMediaDetail({
                            authentication,
                            id: item.id,
                            type,
                        });
                        return { item, type, detail };
                    } catch (error) {
                        errors.push(`Failed to sync ${item.type} "${item.title}": ${errorMessage(error)}`);
                        return null;
                    }
                }),
            );

            for (const entry of fetched) {
                if (!entry) {
                    continue;
                }
                const containerType = entry.type as CatalogContainerType;
                await upsertDetail(sourceId, entry.type, entry.item.id, entry.detail, syncedAt);
                if (entry.detail.tracks.length > 0) {
                    // Detail tracks are already in their authored order
                    // (playlist order, chapter/episode order, artist top tracks),
                    // so they are persisted as-is.
                    await upsertTracks(
                        sourceId,
                        containerType,
                        entry.item.id,
                        entry.detail.tracks,
                        syncedAt,
                    );
                }
                details += 1;
            }
            await setSyncProgress(sourceId, {
                items: items.length,
                tracks: tracks.length,
                details,
            });
        }

        // 4. Drop anything the latest pass didn't re-touch, then publish counts.
        await pruneSource(sourceId, syncedAt);
        const counts = await getSourceCounts(sourceId);
        await markSyncSucceeded(sourceId, counts);

        return { sourceId, ...counts, errors };
    } catch (error) {
        const message = errorMessage(error);
        await markSyncFailed(sourceId, message);
        return { sourceId, items: 0, tracks: 0, details: 0, errors: [...errors, message] };
    }
};

/**
 * Mirror a single Samo source into the local catalog. Always resolves: a
 * fatal error marks the source `error` and returns it in `errors` rather than
 * throwing, so one bad source never aborts a multi-source sync. Per-entity
 * detail failures are collected as non-fatal warnings. Concurrent calls for the
 * same source join the in-flight run rather than starting a second one.
 */
export const syncSamoSource = (
    authentication: ServerAuthenticationResult,
): Promise<CatalogSyncResult> => {
    const source = getMobileContentSource(authentication);
    const existing = inFlight.get(source.id);
    if (existing) {
        return existing;
    }
    const run = runSamoSourceSync(authentication, source).finally(() => {
        inFlight.delete(source.id);
    });
    inFlight.set(source.id, run);
    return run;
};

/**
 * Mirror every connected Samo source. Non-Samo servers (Subsonic / Navidrome /
 * Audiobookshelf) keep their live-network path and are skipped. Sources sync
 * sequentially because they share the one SQLite connection.
 */
export const syncSamoCatalog = async (
    authentications: ServerAuthenticationResult[],
): Promise<CatalogSyncResult[]> => {
    const results: CatalogSyncResult[] = [];
    for (const authentication of authentications) {
        if (authentication.type !== ServerType.SAMO) {
            continue;
        }
        results.push(await syncSamoSource(authentication));
    }
    return results;
};

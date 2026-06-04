import {
    getMobileContentSource,
    loadMobileFullCollection,
    loadMobileMediaDetail,
    loadSamoLibraryTracks,
    loadSamoSyncManifest,
    MobileHomeItemType,
    MobileMediaDetailType,
    MobileSearchItemType,
    type MobileContentSource,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { ServerType, type SamoSyncManifest, type ServerAuthenticationResult } from '@samo/core/server';

import {
    albumTrackPosition,
    deleteContainerTracks,
    deleteDetailsByEntityIds,
    deleteItemsByIds,
    deleteSearchByEntityIds,
    deleteTracksByTrackIds,
    getDistinctTrackIds,
    getItemIdsByType,
    getSourceCounts,
    indexSearchEntries,
    pruneSource,
    upsertDetail,
    upsertItems,
    upsertTracks,
    type CatalogContainerType,
    type CatalogSearchEntry,
} from './catalog-repository';
import {
    getCatalogSyncState,
    markSyncFailed,
    markSyncStarted,
    markSyncSucceeded,
    setSyncProgress,
} from './catalog-sync-state';

// Mirrors a Samo library into the local SQLite catalog. The FIRST sync (no
// delta cursor) does a full re-enumerate: walk every collection variant +
// the global track table, crawl the containers whose ordered children the flat
// track table can't reconstruct, then prune by the per-sync `syncedAt`
// watermark. EVERY LATER sync is incremental: it asks the server (via
// updatedSince) only for what changed since the last run, upserts that, and
// reconciles deletions by diffing the server's id manifest against the local
// mirror. A no-op sync (nothing changed server-side) therefore costs a manifest
// fetch plus a handful of empty list calls — near-instant.
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

// Bumped whenever the on-device sync writes data in a way an older delta can't
// safely extend (e.g. the album track `position` scheme). A persisted cursor
// from a different version is ignored, forcing one full re-enumerate that
// rewrites every row under the current scheme.
const SYNC_LOGIC_VERSION = 2;

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

// The crawlable containers and the local table their ordered children land in.
const VARIANT_TO_DETAIL: Partial<
    Record<MobileFullCollectionVariant, { detail: MobileMediaDetailType; container: CatalogContainerType }>
> = {
    artist: { detail: MobileMediaDetailType.ARTIST, container: 'artist' },
    audiobook: { detail: MobileMediaDetailType.AUDIOBOOK, container: 'audiobook' },
    playlist: { detail: MobileMediaDetailType.PLAYLIST, container: 'playlist' },
    podcast: { detail: MobileMediaDetailType.PODCAST, container: 'podcast' },
};

const VARIANT_TO_HOME_TYPE: Record<MobileFullCollectionVariant, MobileHomeItemType> = {
    album: MobileHomeItemType.ALBUM,
    artist: MobileHomeItemType.ARTIST,
    audiobook: MobileHomeItemType.AUDIOBOOK,
    playlist: MobileHomeItemType.PLAYLIST,
    podcast: MobileHomeItemType.PODCAST,
};

const manifestIdsForVariant = (
    manifest: SamoSyncManifest,
    variant: MobileFullCollectionVariant,
): string[] => {
    switch (variant) {
        case 'album':
            return manifest.ids.albums;
        case 'artist':
            return manifest.ids.artists;
        case 'audiobook':
            return manifest.ids.audiobooks;
        case 'playlist':
            return manifest.ids.playlists;
        case 'podcast':
            return manifest.ids.podcasts;
    }
};

// ---------------------------------------------------------------------------
// Full re-enumerate (first sync, or a forced rebuild after a version bump).
// ---------------------------------------------------------------------------

const runFullSamoSync = async (
    authentication: ServerAuthenticationResult,
    source: MobileContentSource,
    syncedAt: number,
): Promise<string[]> => {
    const sourceId = source.id;
    const errors: string[] = [];

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
    //    tracks are written in their own transaction, with stable (disc, track)
    //    positions so a later delta can upsert one changed track without
    //    reordering the rest.
    const tracks = await loadSamoLibraryTracks(authentication);
    const albums = groupTracksByAlbum(tracks);
    for (const [albumId, albumTracks] of albums) {
        await upsertTracks(sourceId, 'album', albumId, sortAlbumTracks(albumTracks), syncedAt, albumTrackPosition);
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
                await upsertTracks(sourceId, containerType, entry.item.id, entry.detail.tracks, syncedAt);
            }
            details += 1;
        }
        await setSyncProgress(sourceId, {
            items: items.length,
            tracks: tracks.length,
            details,
        });
    }

    // 4. Drop anything this full pass didn't re-touch.
    await pruneSource(sourceId, syncedAt);
    return errors;
};

// ---------------------------------------------------------------------------
// Incremental delta sync (every sync after the first).
// ---------------------------------------------------------------------------

const runDeltaSamoSync = async (
    authentication: ServerAuthenticationResult,
    source: MobileContentSource,
    syncedAt: number,
    watermark: string,
    manifest: SamoSyncManifest,
): Promise<string[]> => {
    const sourceId = source.id;
    const errors: string[] = [];

    // 1. Changed collection items per variant + changed tracks. These are
    //    independent server reads, so fetch them concurrently — a no-op refresh
    //    otherwise pays one network round-trip PER variant, in series, before
    //    the spinner can clear.
    const changedByVariant = new Map<MobileFullCollectionVariant, MobileHomeItem[]>();
    const changedItems: MobileHomeItem[] = [];
    const [variantResults, changedTracks] = await Promise.all([
        Promise.all(
            COLLECTION_VARIANTS.map((variant) =>
                loadMobileFullCollection({
                    authentications: [authentication],
                    qualityScanLimit: QUALITY_SCAN_LIMIT,
                    updatedSince: watermark,
                    variant,
                }).then((result) => ({ result, variant })),
            ),
        ),
        loadSamoLibraryTracks(authentication, undefined, watermark),
    ]);
    for (const { result, variant } of variantResults) {
        changedByVariant.set(variant, result.items);
        changedItems.push(...result.items);
        errors.push(...result.errors);
    }
    await upsertItems(sourceId, changedItems, syncedAt);

    // 2. Changed tracks → album container (canonical, stable position).
    const changedAlbums = groupTracksByAlbum(changedTracks);
    for (const [albumId, albumTracks] of changedAlbums) {
        await upsertTracks(sourceId, 'album', albumId, sortAlbumTracks(albumTracks), syncedAt, albumTrackPosition);
    }

    // 3. Search: refresh rows for changed items + songs (delete-then-insert,
    //    since catalog_search has no upsert key and would otherwise duplicate).
    const changedSearchIds = [
        ...changedItems.map((item) => item.id),
        ...changedTracks.map((track) => track.id),
    ];
    await deleteSearchByEntityIds(sourceId, changedSearchIds);
    await indexSearchEntries(sourceId, itemSearchEntries(changedItems), syncedAt);
    for (let start = 0; start < changedTracks.length; start += SONG_INDEX_BATCH) {
        const batch = changedTracks
            .slice(start, start + SONG_INDEX_BATCH)
            .map((track) => trackToSearchEntry(track, source));
        await indexSearchEntries(sourceId, batch, syncedAt);
    }
    await setSyncProgress(sourceId, {
        items: changedItems.length,
        tracks: changedTracks.length,
        details: 0,
    });

    // 4. Re-crawl the containers whose ordered children may have changed:
    //    - artists whose row changed OR that own a changed track (top tracks);
    //    - audiobooks / playlists whose row changed (chapters / playlist edits
    //      bump the row);
    //    - ALL podcasts, because a new episode does not necessarily bump the
    //      show row, and shows are few so a full re-crawl stays cheap.
    const artistIds = new Set((changedByVariant.get('artist') ?? []).map((item) => item.id));
    for (const track of changedTracks) {
        if (track.artistId) {
            artistIds.add(track.artistId);
        }
    }
    const crawlTargets: { id: string; detail: MobileMediaDetailType; container: CatalogContainerType }[] = [];
    const pushTargets = (ids: Iterable<string>, variant: MobileFullCollectionVariant): void => {
        const mapping = VARIANT_TO_DETAIL[variant];
        if (!mapping) {
            return;
        }
        for (const id of ids) {
            crawlTargets.push({ id, detail: mapping.detail, container: mapping.container });
        }
    };
    pushTargets(artistIds, 'artist');
    pushTargets((changedByVariant.get('audiobook') ?? []).map((item) => item.id), 'audiobook');
    pushTargets((changedByVariant.get('playlist') ?? []).map((item) => item.id), 'playlist');
    pushTargets(manifest.ids.podcasts, 'podcast');

    let details = 0;
    for (let start = 0; start < crawlTargets.length; start += DETAIL_FETCH_CONCURRENCY) {
        const batch = crawlTargets.slice(start, start + DETAIL_FETCH_CONCURRENCY);
        const fetched = await Promise.all(
            batch.map(async (target) => {
                try {
                    const payload = await loadMobileMediaDetail({
                        authentication,
                        id: target.id,
                        type: target.detail,
                    });
                    return { target, payload };
                } catch (error) {
                    errors.push(`Failed to sync ${target.detail} "${target.id}": ${errorMessage(error)}`);
                    return null;
                }
            }),
        );
        for (const entry of fetched) {
            if (!entry) {
                continue;
            }
            await upsertDetail(sourceId, entry.target.detail, entry.target.id, entry.payload, syncedAt);
            await deleteContainerTracks(sourceId, entry.target.container, entry.target.id);
            if (entry.payload.tracks.length > 0) {
                await upsertTracks(sourceId, entry.target.container, entry.target.id, entry.payload.tracks, syncedAt);
            }
            details += 1;
        }
    }

    // 5. Reconcile deletions: drop any locally-mirrored row whose id is absent
    //    from the server manifest. Diffs are computed in JS (typically tiny) and
    //    deleted by id, so there is never a huge IN clause.
    //
    //    The manifest is a snapshot taken at the start of the sync; an item
    //    created server-side mid-sync can be returned by the delta query (and
    //    upserted) yet be absent from that snapshot. Excluding ids upserted this
    //    pass keeps reconciliation from deleting what we just added — the next
    //    sync's manifest will include it.
    for (const variant of COLLECTION_VARIANTS) {
        const homeType = VARIANT_TO_HOME_TYPE[variant];
        const serverSet = new Set(manifestIdsForVariant(manifest, variant));
        const justUpserted = new Set((changedByVariant.get(variant) ?? []).map((item) => item.id));
        const localIds = await getItemIdsByType(sourceId, homeType);
        const removed = localIds.filter((id) => !serverSet.has(id) && !justUpserted.has(id));
        if (removed.length === 0) {
            continue;
        }
        await deleteItemsByIds(sourceId, homeType, removed);
        await deleteSearchByEntityIds(sourceId, removed);
        const mapping = VARIANT_TO_DETAIL[variant];
        if (mapping) {
            await deleteDetailsByEntityIds(sourceId, mapping.detail, removed);
            for (const id of removed) {
                await deleteContainerTracks(sourceId, mapping.container, id);
            }
        } else {
            // Albums own tracks but no detail row.
            for (const id of removed) {
                await deleteContainerTracks(sourceId, 'album', id);
            }
        }
    }

    // Deleted music tracks (present locally, gone from the manifest) are purged
    // from every music container at once; album order survives the position gap.
    // Tracks upserted this pass are excluded for the same mid-sync-snapshot
    // reason as items above.
    const musicContainers: CatalogContainerType[] = ['album', 'artist', 'playlist'];
    const serverTrackSet = new Set(manifest.ids.tracks);
    const justUpsertedTracks = new Set(changedTracks.map((track) => track.id));
    const localTrackIds = await getDistinctTrackIds(sourceId, musicContainers);
    const removedTracks = localTrackIds.filter(
        (id) => !serverTrackSet.has(id) && !justUpsertedTracks.has(id),
    );
    if (removedTracks.length > 0) {
        await deleteTracksByTrackIds(sourceId, removedTracks, musicContainers);
        await deleteSearchByEntityIds(sourceId, removedTracks);
    }

    return errors;
};

const runSamoSourceSync = async (
    authentication: ServerAuthenticationResult,
    source: MobileContentSource,
): Promise<CatalogSyncResult> => {
    const sourceId = source.id;
    const syncedAt = Date.now();

    await markSyncStarted(sourceId);

    try {
        // The manifest both supplies the new watermark (its serverTime, captured
        // up front so changes during the sync are re-pulled next time) and the
        // id sets used to reconcile deletions. If it can't be fetched we fall
        // back to a full sync and leave the cursor untouched so the next attempt
        // retries.
        let manifest: SamoSyncManifest | undefined;
        try {
            manifest = await loadSamoSyncManifest(authentication);
        } catch (error) {
            manifest = undefined;
            // non-fatal: a full sync still reconciles via prune.
        }

        const state = await getCatalogSyncState(sourceId);
        const cursor = state?.cursor;
        const storedWatermark = cursor?.deltaServerTime;
        const versionOk = cursor?.syncVersion === SYNC_LOGIC_VERSION;
        const priorWatermark = typeof storedWatermark === 'string' ? storedWatermark : undefined;

        const errors =
            manifest && priorWatermark && versionOk
                ? await runDeltaSamoSync(authentication, source, syncedAt, priorWatermark, manifest)
                : await runFullSamoSync(authentication, source, syncedAt);

        const counts = await getSourceCounts(sourceId);
        await markSyncSucceeded(
            sourceId,
            counts,
            manifest ? { deltaServerTime: manifest.serverTime, syncVersion: SYNC_LOGIC_VERSION } : undefined,
        );

        return { sourceId, ...counts, errors };
    } catch (error) {
        const message = errorMessage(error);
        await markSyncFailed(sourceId, message);
        return { sourceId, items: 0, tracks: 0, details: 0, errors: [message] };
    }
};

// Dedupes concurrent syncs of the same source. A sync fires from both the
// connect flow and the manual Sync button, and two overlapping runs for one
// source would interleave write transactions on the shared connection and let
// one run's prune/reconcile delete the other's in-progress rows. A second
// request while a sync is in flight therefore joins the existing run instead of
// starting a new one.
const inFlight = new Map<string, Promise<CatalogSyncResult>>();

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

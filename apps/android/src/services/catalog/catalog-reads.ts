import {
    getMobileContentSource,
    isSamoRawDetailBundle,
    isSamoRawTrackEnvelope,
    mapSamoMediaDetailFromRawBundle,
    mapSamoMediaTrackFromRaw,
    MobileHomeItemType,
    MobileHomeSectionId,
    MobileMediaDetailType,
    type MobileHomeContent,
    type MobileHomeItem,
    type MobileHomeSection,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    getSamoMusicTrackStreamUrl,
    getServerConnectionKey,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { traceSync } from '../jank-trace';
import { type AndroidRecentContentSourceItem } from '../recent-content';
import {
    getDetail,
    getDetailSync,
    getItemById,
    getItemsByType,
    getItemsByTypeSync,
    getTracks,
    getTracksSync,
    type CatalogItemQuery,
    type CatalogItemSort,
} from './catalog-repository';

const HOME_SECTION_ITEM_LIMIT = 24;

/**
 * Local-first reads against the on-device SQLite catalog. The whole Samo library
 * is mirrored on-device (Phases 1-2), so these let every browse/detail/search
 * surface render instantly for Samo sources. Each helper returns null/empty for
 * non-Samo sources and swallows DB errors so callers fall through to the network cleanly.
 */

/** Maps a home/search item type to the catalog detail type, or undefined when
 *  the type has no detail surface (songs play directly, radio has no detail).
 *  Home and search enums share the same string values, so one key set covers
 *  both; songs (search) and podcast-episodes (home) fall through to undefined. */
const DETAIL_TYPE_BY_ITEM_TYPE: Record<string, MobileMediaDetailType | undefined> = {
    [MobileHomeItemType.ALBUM]: MobileMediaDetailType.ALBUM,
    [MobileHomeItemType.ARTIST]: MobileMediaDetailType.ARTIST,
    [MobileHomeItemType.AUDIOBOOK]: MobileMediaDetailType.AUDIOBOOK,
    [MobileHomeItemType.PLAYLIST]: MobileMediaDetailType.PLAYLIST,
    [MobileHomeItemType.PODCAST]: MobileMediaDetailType.PODCAST,
};

const isSamoSource = (source: { type?: any } | undefined): boolean =>
    Boolean(source);

/**
 * Stored detail payload → view model. Kotlin-synced rows hold the RAW server
 * responses (`$samoRawDetail` envelope) and hydrate through the same core
 * mapper the network path uses; legacy rows (pre-Kotlin-ownership) are
 * already-mapped MobileMediaDetail and pass through untouched. The cached
 * stream token is best-effort — URLs built with a stale token are
 * re-finalized by the play path before they reach the player.
 */
const hydrateDetailPayload = (
    payload: unknown,
    source: { id: string; type?: any; url?: string },
    serverConnection: ServerAuthenticationResult | null,
): MobileMediaDetail | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    if (isSamoRawDetailBundle(payload)) {
        const auth = findServerAuthenticationForSource(serverConnection, source);
        if (!auth) {
            return null;
        }
        return mapSamoMediaDetailFromRawBundle(auth, getCachedSamoStreamToken(auth), payload);
    }
    return payload as MobileMediaDetail;
};

/**
 * Best-effort playback synthesis for LEGACY mirror track rows (written before
 * the raw-track envelope, without a `playback` object). Without one, a music
 * tap used to fall through to the legacy ABS fallback — a POST the Samo
 * server answers with 405. Quality is honest-unknown here; rows regain full
 * fidelity (real container/mime from the file metadata) when the v4 sync
 * rewrites them as raw envelopes.
 */
const synthesizeMusicPlayback = (
    authentication: ServerAuthenticationResult,
    track: MobileMediaTrack,
): MobilePlayableAudio => ({
    album: track.album,
    albumId: track.albumId,
    artist: track.artist,
    artworkImageId: track.artworkImageId,
    artworkUrl: track.artworkUrl,
    contentSourceId: getServerConnectionKey(authentication),
    durationSeconds: track.durationSeconds,
    id: `${authentication.type}:${authentication.url}:music:${track.id}`,
    quality: {
        container: null,
        deliveryKind: 'unknown',
        losslessRequired: false,
        serverTranscodeRequested: false,
    },
    source: 'music',
    subtitle: track.subtitle,
    title: track.title,
    url: getSamoMusicTrackStreamUrl(authentication, track.id, {
        streamToken: getCachedSamoStreamToken(authentication),
    }),
});

/**
 * Stored catalog_track payload → MobileMediaTrack with a usable `playback`.
 * Three eras of rows coexist: `$samoRawTrack` envelopes (Kotlin v4+) hydrate
 * through the canonical core mapper; legacy rows that already carry playback
 * pass through; legacy rows without playback get a synthesized one.
 */
export const hydrateCatalogTrack = (
    payload: unknown,
    authentication: ServerAuthenticationResult,
): MobileMediaTrack | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    if (isSamoRawTrackEnvelope(payload)) {
        return mapSamoMediaTrackFromRaw(
            authentication,
            getCachedSamoStreamToken(authentication),
            payload,
        );
    }
    const track = payload as MobileMediaTrack;
    if (!track.id || !track.title) {
        return null;
    }
    if (track.playback?.url && track.playback.quality) {
        return track;
    }
    return { ...track, playback: synthesizeMusicPlayback(authentication, track) };
};

const hydrateCatalogTracks = (
    payloads: unknown[],
    authentication: ServerAuthenticationResult,
): MobileMediaTrack[] =>
    payloads
        .map((payload) => hydrateCatalogTrack(payload, authentication))
        .filter((track): track is MobileMediaTrack => track !== null);

/**
 * Instant detail for a Samo item straight from the catalog. Albums are
 * reconstructed from the tapped item's metadata + the stored album track rows
 * (sync stores album *tracks* under getTracks but no album *detail* row); every
 * other type returns its stored MobileMediaDetail payload. Returns null for
 * non-Samo sources, unknown types, or a cold/empty catalog so the caller can
 * fall back to the fs cache + network.
 */
export const loadCatalogMediaDetail = async (
    item: AndroidRecentContentSourceItem,
    serverConnection: ServerAuthenticationResult | null,
): Promise<MobileMediaDetail | null> => {
    const source = item.source;
    if (!isSamoSource(source) || !source) {
        return null;
    }
    const detailType = DETAIL_TYPE_BY_ITEM_TYPE[item.type];
    if (!detailType) {
        return null;
    }

    try {
        if (detailType === MobileMediaDetailType.ALBUM) {
            const auth = findServerAuthenticationForSource(serverConnection, source);
            if (!auth) {
                return null;
            }
            const tracks = hydrateCatalogTracks(
                await getTracks(source.id, 'album', item.id),
                auth,
            );
            if (tracks.length === 0) {
                return null;
            }
            return {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                id: item.id,
                qualityProfile: item.qualityProfile,
                source,
                subtitle: item.subtitle,
                title: item.title,
                tracks,
                type: MobileMediaDetailType.ALBUM,
            };
        }

        return hydrateDetailPayload(
            await getDetail(source.id, detailType, item.id),
            source,
            serverConnection,
        );
    } catch {
        return null;
    }
};

/**
 * Synchronous twin of {@link loadCatalogMediaDetail} for the render path: lets a
 * detail screen mount with full content on the first frame (no loading view).
 * Returns null for non-Samo / unknown types / a cold reader.
 */
export const loadCatalogMediaDetailSync = (
    item: AndroidRecentContentSourceItem,
    serverConnection: ServerAuthenticationResult | null,
): MobileMediaDetail | null => {
    const startedAt = Date.now();
    try {
        return loadCatalogMediaDetailSyncInner(item, serverConnection);
    } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed > 200) {
            // eslint-disable-next-line no-console
            console.warn(`[perf] sync detail read took ${elapsed}ms (${item.title})`);
        }
    }
};

/**
 * Max tracks hydrated synchronously for a big list's instant first frame; the
 * async full load fills the rest. Sized to cover a typical playlist fully while
 * capping the per-track hydration cost when a 1000-track playlist is tapped.
 */
const PLAYLIST_SYNC_WINDOW = 120;

const loadCatalogMediaDetailSyncInner = (
    item: AndroidRecentContentSourceItem,
    serverConnection: ServerAuthenticationResult | null,
): MobileMediaDetail | null => {
    const source = item.source;
    if (!isSamoSource(source) || !source) {
        return null;
    }
    const detailType = DETAIL_TYPE_BY_ITEM_TYPE[item.type];
    if (!detailType) {
        return null;
    }

    if (detailType === MobileMediaDetailType.ALBUM) {
        const auth = findServerAuthenticationForSource(serverConnection, source);
        if (!auth) {
            return null;
        }
        const tracks = hydrateCatalogTracks(getTracksSync(source.id, 'album', item.id), auth);
        if (tracks.length === 0) {
            return null;
        }
        return {
            artworkImageId: item.artworkImageId,
            artworkUrl: item.artworkUrl,
            id: item.id,
            qualityProfile: item.qualityProfile,
            source,
            subtitle: item.subtitle,
            title: item.title,
            tracks,
            type: MobileMediaDetailType.ALBUM,
        };
    }

    if (detailType === MobileMediaDetailType.PLAYLIST) {
        const auth = findServerAuthenticationForSource(serverConnection, source);
        if (!auth) {
            return null;
        }
        // Windowed first frame: hydrate at most PLAYLIST_SYNC_WINDOW tracks so a
        // big playlist opens instantly instead of freezing the tap frame on
        // hundreds of per-track hydrations. Marked `partial` so loadDetailWithCache
        // replaces it with the full track list + playlist metadata right after.
        const tracks = hydrateCatalogTracks(
            getTracksSync(source.id, 'playlist', item.id, PLAYLIST_SYNC_WINDOW),
            auth,
        );
        if (tracks.length === 0) {
            return null;
        }
        return {
            artworkImageId: item.artworkImageId,
            artworkUrl: item.artworkUrl,
            id: item.id,
            partial: true,
            source,
            subtitle: item.subtitle,
            title: item.title,
            tracks,
            type: MobileMediaDetailType.PLAYLIST,
        };
    }

    return hydrateDetailPayload(
        getDetailSync(source.id, detailType, item.id),
        source,
        serverConnection,
    );
};

/** Synchronous twin of {@link loadCatalogCollection} for instant grid render. */
export const loadCatalogCollectionSync = (
    authentication: ServerAuthenticationResult,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): MobileHomeItem[] => {
    if (!authentication) {
        return [];
    }
    try {
        return getItemsByTypeSync(getMobileContentSource(authentication).id, type, query);
    } catch {
        return [];
    }
};

/**
 * Instant full-collection items for a Samo source from the catalog, or null when
 * the source isn't Samo / the catalog has no rows for that type yet.
 */
export const loadCatalogCollection = async (
    authentication: ServerAuthenticationResult,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): Promise<MobileHomeItem[] | null> => {
    if (!authentication) {
        return null;
    }
    try {
        const sourceId = getMobileContentSource(authentication).id;
        const items = await getItemsByType(sourceId, type, query);
        return items.length > 0 ? items : null;
    } catch {
        return null;
    }
};

/** Re-exported so callers can enrich an album header from the stored item. */
export const loadCatalogAlbumItem = async (
    sourceId: string,
    albumId: string,
): Promise<MobileHomeItem | null> => {
    try {
        return await getItemById(sourceId, MobileHomeItemType.ALBUM, albumId);
    } catch {
        return null;
    }
};

interface CatalogHomeSectionSpec {
    direction: 'asc' | 'desc';
    id: MobileHomeSectionId;
    sort: CatalogItemSort;
    title: string;
    type: MobileHomeItemType;
}

/** Mirror-backed Home sections. Radio, Discover and the Podcast Feed are
 *  server-curated / not mirrored — callers fetch those live and pass them to
 *  the assembler, which interleaves everything in the canonical order. */
const CATALOG_HOME_SECTIONS: CatalogHomeSectionSpec[] = [
    {
        direction: 'desc',
        id: MobileHomeSectionId.FAVORITE_ALBUMS,
        sort: 'playCount',
        title: 'Favorite Albums',
        type: MobileHomeItemType.ALBUM,
    },
    {
        direction: 'desc',
        id: MobileHomeSectionId.FAVORITE_ARTISTS,
        sort: 'playCount',
        title: 'Favorite Artists',
        type: MobileHomeItemType.ARTIST,
    },
    {
        direction: 'desc',
        id: MobileHomeSectionId.AUDIOBOOKS,
        sort: 'added',
        title: 'Audiobooks',
        type: MobileHomeItemType.AUDIOBOOK,
    },
    {
        direction: 'asc',
        id: MobileHomeSectionId.PODCASTS,
        sort: 'title',
        title: 'Podcasts',
        type: MobileHomeItemType.PODCAST,
    },
    {
        direction: 'asc',
        id: MobileHomeSectionId.PLAYLISTS,
        sort: 'title',
        title: 'Playlists',
        type: MobileHomeItemType.PLAYLIST,
    },
];

/** Server-curated sections fetched live and interleaved by the assembler. */
export interface HomeLiveSections {
    discover: MobileHomeItem[];
    podcastFeed: MobileHomeItem[];
    radio: MobileHomeItem[];
}

/** Cross-type Recently Added (albums + audiobooks + podcasts by addedAt),
 *  matching what the old network fan-out's recently-added endpoint served. */
const recentlyAddedFromMirror = (
    authentication: ServerAuthenticationResult,
): MobileHomeItem[] => {
    const pool = [
        ...loadCatalogCollectionSync(authentication, MobileHomeItemType.ALBUM, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: 'added',
        }),
        ...loadCatalogCollectionSync(authentication, MobileHomeItemType.AUDIOBOOK, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: 'added',
        }),
        ...loadCatalogCollectionSync(authentication, MobileHomeItemType.PODCAST, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: 'added',
        }),
    ];
    return pool
        .sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0))
        .slice(0, HOME_SECTION_ITEM_LIMIT);
};

/**
 * THE Home builder: every library-backed section reads the on-device mirror
 * synchronously (the mirror IS the source of truth — freshness is the sync
 * engine's job), and the server-curated live sections the caller fetched are
 * interleaved in the canonical order. Returns null when no Samo source has
 * local rows yet (fresh install before the first sync lands).
 */
export const buildCatalogHomeContent = (
    authentication: ServerAuthenticationResult | null,
    live?: HomeLiveSections | null,
): MobileHomeContent | null =>
    // Named in the [jank] log so a slow Home derive (the per-shelf reads + the JS
    // assembly) is distinguishable from a slow React render of the result.
    traceSync('home.derive', () => buildCatalogHomeContentInner(authentication, live));

const buildCatalogHomeContentInner = (
    authentication: ServerAuthenticationResult | null,
    live?: HomeLiveSections | null,
): MobileHomeContent | null => {
    if (!authentication) {
        return null;
    }

    const mirrorSections = new Map<MobileHomeSectionId, MobileHomeSection>();
    for (const spec of CATALOG_HOME_SECTIONS) {
        const items = loadCatalogCollectionSync(authentication, spec.type, {
            direction: spec.direction,
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: spec.sort,
        });

        if (items.length > 0) {
            mirrorSections.set(spec.id, { id: spec.id, items, title: spec.title });
        }
    }
    const recentlyAdded = recentlyAddedFromMirror(authentication);

    const sections: MobileHomeSection[] = [];
    const pushLive = (id: MobileHomeSectionId, title: string, items?: MobileHomeItem[]) => {
        if (items && items.length > 0) {
            sections.push({ id, items, title });
        }
    };
    const pushMirror = (id: MobileHomeSectionId) => {
        const section = mirrorSections.get(id);
        if (section) {
            sections.push(section);
        }
    };

    pushLive(MobileHomeSectionId.RECENTLY_ADDED, 'Recently Added', recentlyAdded);
    pushMirror(MobileHomeSectionId.FAVORITE_ALBUMS);
    pushMirror(MobileHomeSectionId.FAVORITE_ARTISTS);
    pushLive(MobileHomeSectionId.DISCOVER, 'Discover', live?.discover);
    pushLive(MobileHomeSectionId.PODCAST_FEED, 'Podcast Feed', live?.podcastFeed);
    pushMirror(MobileHomeSectionId.AUDIOBOOKS);
    pushMirror(MobileHomeSectionId.PODCASTS);
    pushMirror(MobileHomeSectionId.PLAYLISTS);
    pushLive(MobileHomeSectionId.RADIO, 'Radio', live?.radio);

    if (sections.length === 0) {
        return null;
    }

    return {
        errors: [],
        loadedAt: Date.now(),
        sections,
        serverTitle: getMobileContentSource(authentication).title,
    };
};

/**
 * Mirror-derived Library "relevant" pool: the union the old network path
 * assembled from eleven requests (recently added / recently played / most
 * played albums+artists, playlists, audiobooks, podcasts), deduped by
 * type:id. Radio is intentionally absent — it isn't mirrored and the Library
 * surfaces don't depend on it.
 */
export const loadCatalogLibraryRelevantItems = (
    authentication: ServerAuthenticationResult | null,
): MobileHomeItem[] => {
    if (!authentication) {
        return [];
    }

    const seen = new Set<string>();
    const items: MobileHomeItem[] = [];
    const push = (item: MobileHomeItem) => {
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) {
            return;
        }
        seen.add(key);
        items.push(item);
    };

    const RELEVANT_LIMIT = 80;
    const buckets: Array<[MobileHomeItemType, CatalogItemSort, 'asc' | 'desc']> = [
        [MobileHomeItemType.ALBUM, 'added', 'desc'],
        [MobileHomeItemType.ARTIST, 'added', 'desc'],
        [MobileHomeItemType.ALBUM, 'lastPlayed', 'desc'],
        [MobileHomeItemType.ARTIST, 'lastPlayed', 'desc'],
        [MobileHomeItemType.ALBUM, 'playCount', 'desc'],
        [MobileHomeItemType.ARTIST, 'playCount', 'desc'],
        [MobileHomeItemType.PLAYLIST, 'title', 'asc'],
        [MobileHomeItemType.AUDIOBOOK, 'added', 'desc'],
        [MobileHomeItemType.PODCAST, 'title', 'asc'],
    ];
    for (const [type, sort, direction] of buckets) {
        for (const item of loadCatalogCollectionSync(authentication, type, {
            direction,
            limit: RELEVANT_LIMIT,
            sort,
        })) {
            push(item);
        }
    }
    return items;
};

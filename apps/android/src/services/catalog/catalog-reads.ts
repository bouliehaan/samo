import {
    buildAlbumMetadataLines,
    getMobileContentSource,
    isSamoRawDetailBundle,
    isSamoRawTrackEnvelope,
    mapSamoMediaDetailFromRawBundle,
    mapSamoMediaTrackFromRaw,
    MobileHomeItemType,
    MobileHomeSectionId,
    MobileMediaDetailType,
    MobileSearchItemType,
    type MobileHomeContent,
    type MobileHomeItem,
    type MobileHomeSection,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
    type MobileSearchItem,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    getSamoMusicTrackStreamUrl,
    getServerConnectionKey,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { type AndroidRecentContentSourceItem } from '../recent-content';
import {
    getDetail,
    getItemById,
    getItemsByType,
    getTracks,
    searchCatalogRaw,
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
    artistId: track.artistId,
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
        // Playlists and podcasts read their tracks the way albums do: one
        // `catalog_track` row per entry, hydrated individually. They used to
        // have no mirror path at all and fell through to the network, which is
        // why a big playlist took a minute to open while an album was instant.
        //
        // An empty result deliberately falls through rather than rendering an
        // empty page: it means the sync has not written rows for this container
        // yet, and the network is the correct answer until it has.
        if (
            detailType === MobileMediaDetailType.PLAYLIST ||
            detailType === MobileMediaDetailType.PODCAST
        ) {
            const auth = findServerAuthenticationForSource(serverConnection, source);
            if (!auth) {
                return null;
            }
            const containerType =
                detailType === MobileMediaDetailType.PLAYLIST ? 'playlist' : 'podcast';
            const tracks = hydrateCatalogTracks(
                await getTracks(source.id, containerType, item.id),
                auth,
            );
            if (tracks.length === 0) {
                return null;
            }
            return {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                id: item.id,
                source,
                subtitle: item.subtitle,
                title: item.title,
                tracks,
                type: detailType,
            };
        }

        if (detailType === MobileMediaDetailType.ALBUM) {
            const auth = findServerAuthenticationForSource(serverConnection, source);
            if (!auth) {
                return null;
            }
            // Header metadata (year, genres, label) is read from the stored
            // album ROW rather than the tapped tile, because a tile is not a
            // dependable carrier of it: search hits and persisted recents
            // narrow their item down to id/title/subtitle/artwork, so an album
            // reached from search would lose what the same album shows when
            // reached from a shelf. Issued alongside the track query, not after
            // it — both run on the native executor, so the row costs no extra
            // wall-clock — with the tile as the fallback for a cold row.
            const [trackRows, albumRow] = await Promise.all([
                getTracks(source.id, 'album', item.id),
                loadCatalogAlbumItem(source.id, item.id),
            ]);
            const tracks = hydrateCatalogTracks(trackRows, auth);
            if (tracks.length === 0) {
                return null;
            }
            const album = albumRow ?? (item as MobileHomeItem);
            // Identity fields stay with the tile on purpose: it holds the very
            // artwork the user is looking at, so taking those from the row
            // would risk swapping the image mid-transition for no gain.
            return {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                id: item.id,
                metadataLines: buildAlbumMetadataLines(album.genres, album.recordLabel),
                qualityProfile: item.qualityProfile,
                source,
                subtitle: item.subtitle,
                title: item.title,
                tracks,
                type: MobileMediaDetailType.ALBUM,
                year: album.year,
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
    explo: MobileHomeItem[];
    podcastFeed: MobileHomeItem[];
    radio: MobileHomeItem[];
}

/** Internal collection read that coalesces failures/empties to []. */
const readCollection = async (
    authentication: ServerAuthenticationResult,
    type: MobileHomeItemType,
    query: CatalogItemQuery,
): Promise<MobileHomeItem[]> => {
    try {
        return await getItemsByType(getMobileContentSource(authentication).id, type, query);
    } catch {
        return [];
    }
};

/** Cross-type Recently Added (albums + audiobooks + podcasts by addedAt),
 *  matching what the old network fan-out's recently-added endpoint served. */
const recentlyAddedFromMirror = async (
    authentication: ServerAuthenticationResult,
): Promise<MobileHomeItem[]> => {
    // Explo-sourced albums are excluded from the server's own /recently-added
    // endpoints (catalog.ListRecentlyAdded / MusicBrowseRecentlyAdded), but
    // this shelf reads the on-device mirror directly instead of calling
    // those endpoints, so it has to apply the same exclusion itself using
    // the `hiddenFromRecentlyAdded` flag carried in the mirrored payload
    // (see SamoCatalogConverters.albumToItem). Over-fetch albums so filtering
    // some out still leaves enough to fill the shelf.
    const [rawAlbums, audiobooks, podcasts] = await Promise.all([
        readCollection(authentication, MobileHomeItemType.ALBUM, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT * 2,
            sort: 'added',
        }),
        readCollection(authentication, MobileHomeItemType.AUDIOBOOK, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: 'added',
        }),
        readCollection(authentication, MobileHomeItemType.PODCAST, {
            direction: 'desc',
            limit: HOME_SECTION_ITEM_LIMIT,
            sort: 'added',
        }),
    ]);
    const pool = [
        ...rawAlbums.filter((item) => !item.hiddenFromRecentlyAdded),
        ...audiobooks,
        ...podcasts,
    ];
    return pool
        .sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0))
        .slice(0, HOME_SECTION_ITEM_LIMIT);
};

/**
 * THE Home builder: every library-backed section reads the on-device mirror
 * (the mirror IS the source of truth — freshness is the sync engine's job),
 * and the server-curated live sections the caller fetched are interleaved in
 * the canonical order. All shelf queries fan out in parallel on the native
 * reader's background thread — the JS thread only assembles the results.
 * Returns null when no Samo source has local rows yet (fresh install before
 * the first sync lands).
 */
export const buildCatalogHomeContent = async (
    authentication: ServerAuthenticationResult | null,
    live?: HomeLiveSections | null,
): Promise<MobileHomeContent | null> => {
    if (!authentication) {
        return null;
    }

    const [shelves, recentlyAdded] = await Promise.all([
        Promise.all(
            CATALOG_HOME_SECTIONS.map(async (spec) => ({
                items: await readCollection(authentication, spec.type, {
                    direction: spec.direction,
                    limit: HOME_SECTION_ITEM_LIMIT,
                    sort: spec.sort,
                }),
                spec,
            })),
        ),
        recentlyAddedFromMirror(authentication),
    ]);

    const mirrorSections = new Map<MobileHomeSectionId, MobileHomeSection>();
    for (const { items, spec } of shelves) {
        if (items.length > 0) {
            mirrorSections.set(spec.id, { id: spec.id, items, title: spec.title });
        }
    }

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
    pushLive(MobileHomeSectionId.EXPLO, 'New from Explore', live?.explo);
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
export const loadCatalogLibraryRelevantItems = async (
    authentication: ServerAuthenticationResult | null,
): Promise<MobileHomeItem[]> => {
    if (!authentication) {
        return [];
    }

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
    // Parallel reads; the dedupe below walks results in bucket order, so the
    // relevance ordering (first bucket wins the duplicate) is unchanged.
    const results = await Promise.all(
        buckets.map(([type, sort, direction]) =>
            readCollection(authentication, type, { direction, limit: RELEVANT_LIMIT, sort }),
        ),
    );

    const seen = new Set<string>();
    const items: MobileHomeItem[] = [];
    for (const bucket of results) {
        for (const item of bucket) {
            const key = `${item.type}:${item.id}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            items.push(item);
        }
    }
    return items;
};

/**
 * Ranked local search, hydrated. Song hits carry raw catalog_track payloads
 * and hydrate through the shared core track mapper (stream URLs need the auth
 * context); item hits are stored MobileHomeItems reshaped to search items.
 * The FTS index itself lives in Kotlin (SamoCatalogSearch) — this is the only
 * JS-side mapping step.
 */
export const searchLocal = async (
    authentication: ServerAuthenticationResult,
    rawQuery: string,
    options: { limit?: number } = {},
): Promise<MobileSearchItem[]> => {
    const hits = await searchCatalogRaw(rawQuery, {
        limit: options.limit,
        sourceId: getMobileContentSource(authentication).id,
    });
    const items: MobileSearchItem[] = [];
    for (const hit of hits) {
        if (hit.type === MobileSearchItemType.SONG) {
            const track = hydrateCatalogTrack(hit.payload, authentication);
            if (track) {
                items.push({
                    album: track.album,
                    albumId: track.albumId,
                    artist: track.artist,
                    artistId: track.artistId,
                    artworkImageId: track.artworkImageId,
                    artworkUrl: track.artworkUrl,
                    id: track.id,
                    playback: track.playback,
                    source: getMobileContentSource(authentication),
                    subtitle: track.subtitle,
                    title: track.title,
                    type: MobileSearchItemType.SONG,
                });
            }
            continue;
        }
        const item = hit.payload as MobileHomeItem;
        if (!item || typeof item !== 'object' || !item.id || !item.title) {
            continue;
        }
        items.push({
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
            type: hit.type as MobileSearchItemType,
        });
    }
    return items;
};

/**
 * Fast local-catalog lookup for a single artist home item by id. Used by the
 * full-screen player to resolve the artist's photo (artworkUrl/artworkImageId)
 * without a network round-trip. Returns null for non-Samo sources or a cache
 * miss (artist not yet synced).
 */
export const loadArtistHomeItemById = async (
    sourceId: string,
    artistId: string,
): Promise<MobileHomeItem | null> => {
    try {
        return await getItemById(sourceId, MobileHomeItemType.ARTIST, artistId);
    } catch {
        return null;
    }
};

/**
 * Artist lookup by display name for playables with no `artistId` — queue items
 * restored from the native persisted queue and mirror rows written before the
 * id was threaded through the track mappers. Exact (case-insensitive) title
 * match against local FTS artist hits; the first credited name is also tried
 * because `artist` is a display string ("A, B"). Null on any miss — the player
 * falls back to the plain collapse caret.
 */
export const loadArtistHomeItemByName = async (
    sourceId: string,
    artistName: string,
): Promise<MobileHomeItem | null> => {
    const candidates = [artistName.trim(), artistName.split(',')[0]!.trim()].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const hits = await searchCatalogRaw(candidate, { limit: 8, sourceId });
            for (const hit of hits) {
                if (hit.type !== MobileSearchItemType.ARTIST) {
                    continue;
                }
                const item = hit.payload as MobileHomeItem;
                if (item?.id && item.title?.toLowerCase() === candidate.toLowerCase()) {
                    return item;
                }
            }
        } catch {
            return null;
        }
    }
    return null;
};

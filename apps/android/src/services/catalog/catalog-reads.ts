import {
    getMobileContentSource,
    MobileHomeItemType,
    MobileHomeSectionId,
    MobileMediaDetailType,
    type MobileHomeContent,
    type MobileHomeItem,
    type MobileHomeSection,
    type MobileMediaDetail,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

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
 * non-Samo sources (Subsonic/Navidrome/Audiobookshelf keep the live-network
 * path) and swallows DB errors so callers fall through to the network cleanly.
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

const isSamoSource = (source: { type: ServerType } | undefined): boolean =>
    source?.type === ServerType.SAMO;

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
            const tracks = await getTracks(source.id, 'album', item.id);
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

        return await getDetail(source.id, detailType, item.id);
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
        const tracks = getTracksSync(source.id, 'album', item.id);
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

    return getDetailSync(source.id, detailType, item.id);
};

/** Synchronous twin of {@link loadCatalogCollection} for instant grid render. */
export const loadCatalogCollectionSync = (
    authentication: ServerAuthenticationResult,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): MobileHomeItem[] => {
    if (authentication.type !== ServerType.SAMO) {
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
    if (authentication.type !== ServerType.SAMO) {
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

/** Convenience: a single album's track rows from the catalog (empty on miss). */
export const loadCatalogAlbumTracks = async (
    sourceId: string,
    albumId: string,
): Promise<MobileMediaTrack[]> => {
    try {
        return await getTracks(sourceId, 'album', albumId);
    } catch {
        return [];
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

/** Catalog-backed Home sections, in the order the Home screen reads them. Radio,
 *  Discover and the Podcast Feed are server-curated / not mirrored, so they're
 *  omitted here and filled in by the network refresh. */
const CATALOG_HOME_SECTIONS: CatalogHomeSectionSpec[] = [
    {
        direction: 'desc',
        id: MobileHomeSectionId.RECENTLY_ADDED,
        sort: 'added',
        title: 'Recently Added',
        type: MobileHomeItemType.ALBUM,
    },
    {
        direction: 'desc',
        id: MobileHomeSectionId.FAVORITE_ALBUMS,
        sort: 'playCount',
        title: 'Albums',
        type: MobileHomeItemType.ALBUM,
    },
    {
        direction: 'desc',
        id: MobileHomeSectionId.FAVORITE_ARTISTS,
        sort: 'playCount',
        title: 'Artists',
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

/**
 * Instant Home content assembled from the on-device catalog so a cold launch
 * renders immediately instead of waiting on the network. Returns null when no
 * connected Samo source has any local rows yet. The caller shows this as a seed
 * and lets the authoritative network load (favorites, discover, podcast feed)
 * replace it moments later.
 */
export const loadCatalogHomeContent = async (
    authentications: ServerAuthenticationResult[],
): Promise<MobileHomeContent | null> => {
    const samoAuthentications = authentications.filter(
        (authentication) => authentication.type === ServerType.SAMO,
    );
    if (samoAuthentications.length === 0) {
        return null;
    }

    const sectionItems = await Promise.all(
        CATALOG_HOME_SECTIONS.map(async (spec) => {
            const lists = await Promise.all(
                samoAuthentications.map((authentication) =>
                    loadCatalogCollection(authentication, spec.type, {
                        direction: spec.direction,
                        limit: HOME_SECTION_ITEM_LIMIT,
                        sort: spec.sort,
                    }),
                ),
            );
            return lists.flatMap((list) => list ?? []);
        }),
    );

    const sections: MobileHomeSection[] = CATALOG_HOME_SECTIONS.map((spec, index) => ({
        id: spec.id,
        items: sectionItems[index] ?? [],
        title: spec.title,
    })).filter((section) => section.items.length > 0);

    if (sections.length === 0) {
        return null;
    }

    return {
        errors: [],
        loadedAt: Date.now(),
        sections,
        serverTitle: getMobileContentSource(samoAuthentications[0]!).title,
    };
};

/**
 * Synchronous twin of {@link loadCatalogHomeContent} so a cold launch can paint
 * Home on the first frame. Each section is a small bounded read, so the on-thread
 * cost is negligible. Returns null when no Samo source has local rows yet.
 */
export const loadCatalogHomeContentSync = (
    authentications: ServerAuthenticationResult[],
): MobileHomeContent | null => {
    const samoAuthentications = authentications.filter(
        (authentication) => authentication.type === ServerType.SAMO,
    );
    if (samoAuthentications.length === 0) {
        return null;
    }

    const sections: MobileHomeSection[] = CATALOG_HOME_SECTIONS.map((spec) => ({
        id: spec.id,
        items: samoAuthentications.flatMap((authentication) =>
            loadCatalogCollectionSync(authentication, spec.type, {
                direction: spec.direction,
                limit: HOME_SECTION_ITEM_LIMIT,
                sort: spec.sort,
            }),
        ),
        title: spec.title,
    })).filter((section) => section.items.length > 0);

    if (sections.length === 0) {
        return null;
    }

    return {
        errors: [],
        loadedAt: Date.now(),
        sections,
        serverTitle: getMobileContentSource(samoAuthentications[0]!).title,
    };
};

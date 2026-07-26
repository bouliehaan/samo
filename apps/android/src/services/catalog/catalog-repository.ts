import { type MobileHomeItem, type MobileHomeItemType } from '@samo/core/mobile';

import { safeParseJson } from '../../utils/json';
import { traceSync } from '../jank-trace';
import {
    nativeGetDetail,
    nativeGetItemById,
    nativeGetItemsByType,
    nativeGetTracks,
    nativeSearch,
} from './catalog-native';

// Read API for the local Samo library mirror. The database itself is owned
// end-to-end by Kotlin (sync writes, FTS index, the reader connection); this
// layer forwards queries over the SamoCatalogQuery bridge and parses the raw
// row payloads back into the exact mobile types the screens consume. There is
// deliberately NO write surface and NO SQLite here — one owner per file.

/** Container kinds that own ordered tracks / chapters / episodes. */
export type CatalogContainerType = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast';

/** Sort key for a browse query, mapped to a real column by the Kotlin reader. */
export type CatalogItemSort = 'added' | 'lastPlayed' | 'playCount' | 'title';

export interface CatalogItemQuery {
    direction?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    sort?: CatalogItemSort;
}

/** Just the ordering half of a browse query — what a caller paging a WHOLE
 *  collection specifies (the reader always tiebreaks on `id`, so a paged walk
 *  stays deterministic). Defaults to `sort_name` ASC when omitted. */
export type CatalogItemOrdering = Pick<CatalogItemQuery, 'direction' | 'sort'>;

export interface CatalogSearchQuery {
    limit?: number;
    sourceId?: string;
}

/** One ranked search hit: the row's search type + its raw mirror payload
 *  (item rows: MobileHomeItem JSON; song rows: a catalog_track payload that
 *  catalog-reads hydrates through the shared core track mapper). */
export interface CatalogSearchHit {
    payload: unknown;
    type: string;
}

const parsePayload = <T>(payload: string): T | null => safeParseJson<T>(payload);

export const getItemsByType = async (
    sourceId: string,
    type: MobileHomeItemType,
    query: CatalogItemQuery = {},
): Promise<MobileHomeItem[]> => {
    const rows = await nativeGetItemsByType(sourceId, type, {
        direction: query.direction,
        limit: query.limit ?? -1,
        offset: query.offset ?? 0,
        sort: query.sort,
    });
    return traceSync(`catalog.parseRows:${type}:${rows.length}`, () =>
        rows
            .map((row) => parsePayload<MobileHomeItem>(row))
            .filter((item): item is MobileHomeItem => item !== null),
    );
};

export const getItemById = async (
    sourceId: string,
    type: MobileHomeItemType,
    id: string,
): Promise<MobileHomeItem | null> => {
    const row = await nativeGetItemById(sourceId, type, id);
    return row ? parsePayload<MobileHomeItem>(row) : null;
};

/** Raw parsed track payloads, position-ordered. Rows span eras (raw-track
 *  envelopes vs legacy MobileMediaTrack JSON) — callers hydrate through
 *  catalog-reads' hydrateCatalogTrack, which needs the auth context this
 *  layer doesn't have. */
export const getTracks = async (
    sourceId: string,
    containerType: CatalogContainerType,
    containerId: string,
    limit?: number,
): Promise<unknown[]> => {
    const rows = await nativeGetTracks(sourceId, containerType, containerId, limit);
    return rows
        .map((row) => parsePayload<object>(row))
        .filter((payload): payload is object => payload !== null);
};

/**
 * Stored detail payloads come in two shapes: legacy rows hold a pre-mapped
 * MobileMediaDetail; Kotlin-synced rows hold a `$samoRawDetail` envelope of
 * raw server responses. This returns the parsed JSON verbatim — catalog-reads
 * decides which shape it has and maps raw bundles through the core mapper.
 */
export const getDetail = async (
    sourceId: string,
    type: string,
    entityId: string,
): Promise<unknown> => {
    const row = await nativeGetDetail(sourceId, `${type}:${entityId}`);
    return row ? parsePayload<unknown>(row) : null;
};

/**
 * bm25-ranked local search hits, raw. catalog-reads' searchLocal hydrates
 * these into MobileSearchItems (the mapping needs auth context for stream
 * URLs, which this layer doesn't have).
 */
export const searchCatalogRaw = async (
    rawQuery: string,
    query: CatalogSearchQuery = {},
): Promise<CatalogSearchHit[]> => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
        return [];
    }
    const hits = await nativeSearch(trimmed, query.sourceId ?? null, query.limit ?? 50);
    const parsed: CatalogSearchHit[] = [];
    for (const hit of hits) {
        const payload = parsePayload<unknown>(hit.payload);
        if (payload !== null) {
            parsed.push({ payload, type: hit.type });
        }
    }
    return parsed;
};

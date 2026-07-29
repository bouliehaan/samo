import {
    buildMobileSearchResultsFromItems,
    getMobileContentSource,
    getMobileSearchErrorMessage,
    type MobileSearchItem,
    type MobileSearchResults,
    searchMobileContentAcrossServers,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { searchLocal } from './catalog/catalog-reads';
import { isOfflineNow } from '../state/network-state';

export type AndroidSearchState =
    | { message: string; query: string; status: 'error' }
    | { query: string; results: MobileSearchResults; status: 'loaded' }
    | { query: string; status: 'loading' }
    | { status: 'idle' };

const ANDROID_LOCAL_SEARCH_LIMIT = 40;

export const loadAndroidSearchResults = async (
    authentication: ServerAuthenticationResult | null,
    query: string,
    userRecents?: Map<string, number>,
): Promise<AndroidSearchState> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !authentication) {
        return { status: 'idle' };
    }

    try {
        return {
            query: trimmedQuery,
            results: await searchMobileContentAcrossServers({
                authentication,
                query: trimmedQuery,
                userRecents,
            }),
            status: 'loaded',
        };
    } catch (error) {
        return {
            message: getMobileSearchErrorMessage(error),
            query: trimmedQuery,
            status: 'error',
        };
    }
};

/** Every hit across every section, used to re-rank a merged result set as a whole. */
const allSearchItems = (results: MobileSearchResults): MobileSearchItem[] =>
    results.sections.flatMap((section) => section.items);

const searchCatalogResults = async (
    authentication: ServerAuthenticationResult,
    query: string,
    userRecents: Map<string, number> | undefined,
): Promise<MobileSearchResults | null> => {
    try {
        const items = await searchLocal(authentication, query, {
            limit: ANDROID_LOCAL_SEARCH_LIMIT,
        });
        return items.length > 0
            ? buildMobileSearchResultsFromItems(query, items, { userRecents })
            : null;
    } catch {
        return null;
    }
};

/**
 * Combines instant on-device hits with the authoritative server results, then
 * re-ranks the union as one set so section order and the "Best matches"
 * highlight reflect the full picture (the catalog ranker can't see network
 * hits, and vice versa). Deduplication, grouping, and ordering all happen in
 * the shared core builder. Server items are listed FIRST so that on a duplicate
 * id the fresher server copy wins the dedupe over a possibly-stale local row.
 */
const mergeSearchResults = (
    local: MobileSearchResults | null,
    network: MobileSearchResults | null,
    query: string,
    userRecents: Map<string, number> | undefined,
): MobileSearchResults => {
    if (!local) {
        return network ?? { errors: [], query, searchedAt: Date.now(), sections: [] };
    }
    if (!network) {
        return local;
    }
    const merged = buildMobileSearchResultsFromItems(
        query,
        [...allSearchItems(network), ...allSearchItems(local)],
        { userRecents },
    );
    return { ...merged, errors: network.errors ?? [] };
};

/**
 * Local-first, server-authoritative search.
 *
 * The on-device catalog (FTS5) paints INSTANT results, but it is only a cache:
 * the background sync can lag or under-mirror the library (delta-only runs skew
 * it toward recently-touched items), so it must NOT be treated as the complete
 * picture. We therefore always follow the instant local paint with the server
 * search — which queries the full catalog, exactly like the desktop app — and
 * merge the two. That guarantees the entire library is searchable (you can't
 * have a Beatles collection the search can't find just because those rows
 * weren't recently synced) while still feeling instant and degrading to
 * local-only when the server is unreachable (offline).
 *
 * `onResult` may fire twice: once with instant local hits, then once with the
 * complete merged set.
 */
export const runAndroidSearch = async (
    authentication: ServerAuthenticationResult | null,
    query: string,
    userRecents: Map<string, number> | undefined,
    onResult: (state: AndroidSearchState) => void,
): Promise<void> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !authentication) {
        onResult({ status: 'idle' });
        return;
    }

    // 1. Instant on-device results from the local catalog (Samo sources only).
    let local: MobileSearchResults | null = null;
    if (authentication) {
        local = await searchCatalogResults(authentication, trimmedQuery, userRecents);
        if (local) {
            onResult({ query: trimmedQuery, results: local, status: 'loaded' });
        }
    }

    // Offline: the local index is the whole answer. Asking anyway would make
    // every keystroke's search wait out a request that cannot succeed, and then
    // report "search failed" over results that were already on screen.
    if (isOfflineNow()) {
        if (!local) {
            onResult({
                message: 'Search is limited to this device while offline.',
                query: trimmedQuery,
                status: 'error',
            });
        }
        return;
    }

    // 2. Authoritative search across EVERY server (Samo + any others). Samo's
    //    /music/search covers the whole library, so this fills in everything the
    //    local mirror is missing. Merging dedupes by id and re-ranks the union.
    const serverState = await loadAndroidSearchResults(
        authentication,
        trimmedQuery,
        userRecents,
    );

    if (serverState.status === 'error') {
        // Server unreachable. Keep the instant local results if we have them;
        // only surface the error when there's nothing to show.
        if (!local) {
            onResult(serverState);
        }
        return;
    }

    const serverResults = serverState.status === 'loaded' ? serverState.results : null;
    onResult({
        query: trimmedQuery,
        results: mergeSearchResults(local, serverResults, trimmedQuery, userRecents),
        status: 'loaded',
    });
};

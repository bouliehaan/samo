import {
    getMobileContentSource,
    getMobileSearchErrorMessage,
    MobileSearchItemType,
    MobileSearchSectionId,
    type MobileSearchItem,
    type MobileSearchResults,
    type MobileSearchSection,
    searchMobileContentAcrossServers,
} from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { searchLocal } from './catalog/catalog-repository';

export type AndroidSearchState =
    | { message: string; query: string; status: 'error' }
    | { query: string; results: MobileSearchResults; status: 'loaded' }
    | { query: string; status: 'loading' }
    | { status: 'idle' };

const ANDROID_SEARCH_QUALITY_SCAN_LIMIT = 8;
const ANDROID_LOCAL_SEARCH_LIMIT = 40;

export const loadAndroidSearchResults = async (
    authentications: ServerAuthenticationResult[],
    query: string,
    userRecents?: Map<string, number>,
): Promise<AndroidSearchState> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        return {
            query: trimmedQuery,
            results: await searchMobileContentAcrossServers({
                authentications,
                qualityScanLimit: ANDROID_SEARCH_QUALITY_SCAN_LIMIT,
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

const SECTION_BY_ITEM_TYPE: Record<
    string,
    { id: MobileSearchSectionId; title: string } | undefined
> = {
    [MobileSearchItemType.SONG]: { id: MobileSearchSectionId.SONGS, title: 'Songs' },
    [MobileSearchItemType.ALBUM]: { id: MobileSearchSectionId.ALBUMS, title: 'Albums' },
    [MobileSearchItemType.ARTIST]: { id: MobileSearchSectionId.ARTISTS, title: 'Artists' },
    [MobileSearchItemType.AUDIOBOOK]: { id: MobileSearchSectionId.AUDIOBOOKS, title: 'Audiobooks' },
    [MobileSearchItemType.PODCAST]: { id: MobileSearchSectionId.PODCASTS, title: 'Podcasts' },
    [MobileSearchItemType.PLAYLIST]: { id: MobileSearchSectionId.PLAYLISTS, title: 'Playlists' },
    [MobileSearchItemType.RADIO]: { id: MobileSearchSectionId.RADIO, title: 'Radio' },
};

/** Display order matching the network search layout. */
const SECTION_ORDER: MobileSearchSectionId[] = [
    MobileSearchSectionId.SONGS,
    MobileSearchSectionId.ALBUMS,
    MobileSearchSectionId.ARTISTS,
    MobileSearchSectionId.AUDIOBOOKS,
    MobileSearchSectionId.PODCASTS,
    MobileSearchSectionId.PLAYLISTS,
    MobileSearchSectionId.RADIO,
];

/** Groups a flat list of catalog search hits into ordered display sections. */
export const buildSearchResultsFromItems = (
    items: MobileSearchItem[],
    query: string,
): MobileSearchResults => {
    const bySection = new Map<MobileSearchSectionId, MobileSearchSection>();
    for (const item of items) {
        const section = SECTION_BY_ITEM_TYPE[item.type];
        if (!section) {
            continue;
        }
        const existing = bySection.get(section.id);
        if (existing) {
            existing.items.push(item);
        } else {
            bySection.set(section.id, { id: section.id, items: [item], title: section.title });
        }
    }
    const sections = SECTION_ORDER.map((id) => bySection.get(id)).filter(
        (section): section is MobileSearchSection => section !== undefined,
    );
    return { errors: [], query, searchedAt: Date.now(), sections };
};

const searchCatalogResults = async (
    samoAuthentications: ServerAuthenticationResult[],
    query: string,
): Promise<MobileSearchResults | null> => {
    try {
        const lists = await Promise.all(
            samoAuthentications.map((authentication) =>
                searchLocal(query, {
                    limit: ANDROID_LOCAL_SEARCH_LIMIT,
                    sourceId: getMobileContentSource(authentication).id,
                }),
            ),
        );
        const items = lists.flat();
        return items.length > 0 ? buildSearchResultsFromItems(items, query) : null;
    } catch {
        return null;
    }
};

const mergeSearchResults = (
    local: MobileSearchResults | null,
    network: MobileSearchResults | null,
    query: string,
): MobileSearchResults => {
    if (!local) {
        return network ?? { errors: [], query, searchedAt: Date.now(), sections: [] };
    }
    if (!network) {
        return local;
    }
    const byId = new Map<MobileSearchSectionId, MobileSearchSection>();
    for (const section of local.sections) {
        byId.set(section.id, { ...section, items: [...section.items] });
    }
    for (const section of network.sections) {
        const existing = byId.get(section.id);
        if (existing) {
            const seen = new Set(existing.items.map((item) => item.id));
            existing.items.push(...section.items.filter((item) => !seen.has(item.id)));
        } else {
            byId.set(section.id, { ...section, items: [...section.items] });
        }
    }
    const sections = SECTION_ORDER.map((id) => byId.get(id)).filter(
        (section): section is MobileSearchSection => section !== undefined,
    );
    return { errors: network.errors ?? [], query, searchedAt: Date.now(), sections };
};

/**
 * Local-first search. Samo sources resolve instantly from the on-device catalog
 * (FTS5); non-Samo sources stay on the network. `onResult` may fire twice in the
 * mixed-server case: once with instant local hits, then once with the merged set.
 */
export const runAndroidSearch = async (
    authentications: ServerAuthenticationResult[],
    query: string,
    userRecents: Map<string, number> | undefined,
    onResult: (state: AndroidSearchState) => void,
): Promise<void> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || authentications.length === 0) {
        onResult({ status: 'idle' });
        return;
    }

    const samoAuthentications = authentications.filter(
        (authentication) => authentication.type === ServerType.SAMO,
    );
    const networkAuthentications = authentications.filter(
        (authentication) => authentication.type !== ServerType.SAMO,
    );

    let local: MobileSearchResults | null = null;
    if (samoAuthentications.length > 0) {
        local = await searchCatalogResults(samoAuthentications, trimmedQuery);
        // Paint instant local hits while the network fills in non-Samo results.
        if (local && networkAuthentications.length > 0) {
            onResult({ query: trimmedQuery, results: local, status: 'loaded' });
        }
    }

    if (networkAuthentications.length === 0) {
        if (local) {
            onResult({ query: trimmedQuery, results: local, status: 'loaded' });
            return;
        }
        // Samo-only but the catalog had no hit (cold cache) — fall back to network.
        onResult(await loadAndroidSearchResults(samoAuthentications, trimmedQuery, userRecents));
        return;
    }

    const networkState = await loadAndroidSearchResults(
        networkAuthentications,
        trimmedQuery,
        userRecents,
    );
    if (!local && networkState.status === 'error') {
        onResult(networkState);
        return;
    }
    const networkResults = networkState.status === 'loaded' ? networkState.results : null;
    onResult({
        query: trimmedQuery,
        results: mergeSearchResults(local, networkResults, trimmedQuery),
        status: 'loaded',
    });
};

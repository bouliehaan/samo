import { type MobileFullCollectionVariant } from '@samo/core/mobile';

import {
    getAppNavigation,
    setLibraryFullCollections,
    setLibraryRelevantState,
    setMediaTypeCollections,
} from '../state/app-navigation';
import { getAuthSession } from '../state/auth-session';
import { getDownloadsSnapshot } from '../state/downloads-state';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    EMPTY_LIBRARY_RELEVANT_STATE,
    EMPTY_MEDIA_TYPE_COLLECTIONS,
    MEDIA_TYPE_COLLECTION_KEYS,
    type MediaTypeCollectionKey,
} from '../types/library-tab';
import { type CatalogItemOrdering } from './catalog/catalog-repository';
import {
    loadAndroidFullCollection,
    loadAndroidFullCollectionLocalFirstPage,
} from './full-collection';
import { loadAndroidLibraryRelevantContent } from './library-content';
import { traceAsync } from './jank-trace';

// Race guards: a slow read that lands after a newer request (or a reset on
// disconnect) is dropped instead of clobbering fresher state.
let libraryRelevantFetchToken = 0;
let libraryFullCollectionFetchToken = 0;
const mediaTypeCollectionFetchTokens: Record<MediaTypeCollectionKey, number> = {
    audiobooks: 0,
    podcasts: 0,
};

const MEDIA_TYPE_COLLECTION_VARIANT: Record<
    MediaTypeCollectionKey,
    MobileFullCollectionVariant
> = {
    audiobooks: 'audiobook',
    podcasts: 'podcast',
};

/** The order each tab's grid opens in — deliberately the SAME ordering the
 *  type's Home shelf uses (books newest-first, shows A–Z by sort_name), so the
 *  grid reads as that shelf continued rather than a reshuffle of it. */
const MEDIA_TYPE_COLLECTION_ORDERING: Record<MediaTypeCollectionKey, CatalogItemOrdering> = {
    audiobooks: { direction: 'desc', sort: 'added' },
    podcasts: { direction: 'asc', sort: 'title' },
};

export const startLibraryRelevantLoad = (): void => {
    const serverConnection = getAuthSession().serverConnection;
    if (getDownloadsSnapshot().isOfflineMode || !serverConnection) {
        return;
    }

    setLibraryRelevantState((current) =>
        current.status === 'loaded' ? current : { status: 'loading' },
    );
    const requestId = (libraryRelevantFetchToken += 1);
    void (async () => {
        const next = await loadAndroidLibraryRelevantContent(serverConnection);
        if (libraryRelevantFetchToken !== requestId) {
            return;
        }
        setLibraryRelevantState(next);
    })();
};

export const startLibraryFullCollectionLoad = (): void => {
    const serverConnection = getAuthSession().serverConnection;
    if (
        getDownloadsSnapshot().isOfflineMode ||
        !serverConnection ||
        getAppNavigation().homeContentState.status !== 'loaded'
    ) {
        return;
    }

    // Guard: don't restart a load that's already running or complete. Read the
    // current state once (module store), bail if in-flight/loaded.
    const current = getAppNavigation().libraryFullCollections;
    if (
        current.albums.status === 'loading' ||
        current.artists.status === 'loading' ||
        (current.albums.status === 'loaded' && current.artists.status === 'loaded')
    ) {
        return;
    }

    const requestId = (libraryFullCollectionFetchToken += 1);
    setLibraryFullCollections({ albums: { status: 'loading' }, artists: { status: 'loading' } });

    void (async () => {
        // Stage 1: a fast capped first page so the grids mount with content
        // almost immediately (reads off the JS thread — no blocked nav frame,
        // which the old synchronous first-paint read caused).
        const [firstAlbums, firstArtists] = await Promise.all([
            loadAndroidFullCollectionLocalFirstPage(serverConnection, 'album'),
            loadAndroidFullCollectionLocalFirstPage(serverConnection, 'artist'),
        ]);
        if (libraryFullCollectionFetchToken !== requestId) {
            return;
        }
        if (firstAlbums.length > 0 || firstArtists.length > 0) {
            setLibraryFullCollections({
                albums:
                    firstAlbums.length > 0
                        ? { items: firstAlbums, status: 'loaded' }
                        : { status: 'loading' },
                artists:
                    firstArtists.length > 0
                        ? { items: firstArtists, status: 'loaded' }
                        : { status: 'loading' },
            });
        }

        // Stage 2: the complete paged lists swap in whole. The mirror IS the
        // source of truth — freshness arrives via refreshLibraryFromMirror
        // when the sync engine reports completion.
        const [albums, artists] = await Promise.all([
            loadAndroidFullCollection(serverConnection, 'album'),
            loadAndroidFullCollection(serverConnection, 'artist'),
        ]);
        if (libraryFullCollectionFetchToken !== requestId) {
            return;
        }
        setLibraryFullCollections({ albums, artists });
    })();
};

/**
 * The COMPLETE mirror collection behind an Audiobooks / Podcasts tab grid.
 * Those grids used to be derived from the Home shelves, which are capped at
 * HOME_SECTION_ITEM_LIMIT (24) — so the tabs could never list more than 24
 * books/shows however big the library was. The tab is a browse surface: it
 * reads the whole type, like View All does.
 */
export const startMediaTypeCollectionLoad = (mediaType: MediaTypeCollectionKey): void => {
    const serverConnection = getAuthSession().serverConnection;
    if (getDownloadsSnapshot().isOfflineMode || !serverConnection) {
        return;
    }

    // Leaving 'idle' is what marks the tab as opened, so post-sync refreshes
    // keep it fresh. The grid keeps painting from the Home shelf slice while
    // this lands — the read widens the grid, it never empties it.
    setMediaTypeCollections((current) =>
        current[mediaType].status === 'loaded'
            ? current
            : { ...current, [mediaType]: { status: 'loading' } },
    );

    const requestId = (mediaTypeCollectionFetchTokens[mediaType] += 1);
    void (async () => {
        const next = await loadAndroidFullCollection(
            serverConnection,
            MEDIA_TYPE_COLLECTION_VARIANT[mediaType],
            MEDIA_TYPE_COLLECTION_ORDERING[mediaType],
        );
        if (mediaTypeCollectionFetchTokens[mediaType] !== requestId) {
            return;
        }
        setMediaTypeCollections((current) => ({ ...current, [mediaType]: next }));
    })();
};

/** Post-sync re-derive for the media-type tabs the user has actually opened
 *  (anything past 'idle'); a never-visited tab stays cold. 'loading' counts —
 *  that's a tab opened while its mirror rows hadn't landed yet. */
const refreshMediaTypeCollectionsFromMirror = (): void => {
    const collections = getAppNavigation().mediaTypeCollections;
    for (const mediaType of MEDIA_TYPE_COLLECTION_KEYS) {
        if (collections[mediaType].status !== 'idle') {
            startMediaTypeCollectionLoad(mediaType);
        }
    }
};

/** Re-derive the Library surfaces from the mirror after a sync — only the
 *  ones the user has already opened (state present), never a cold mount. */
export const refreshLibraryFromMirror = (): void => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return;
    }
    startLibraryRelevantLoad();
    // Before the albums/artists gate below: the media-type tabs have their own
    // opened-ness test and must not be skipped just because Library never was.
    refreshMediaTypeCollectionsFromMirror();

    // "Only the ones the user has already opened" — checked BEFORE the read,
    // not after it. This same test used to sit inside the state update at the
    // end, so every sync completion paged the ENTIRE album + artist collection
    // out of the mirror (thousands of rows, marshalled and JSON-parsed in
    // 500-row bursts) and then threw the result away whenever Library had
    // never been opened — which, on a cold boot spent on Home, is always.
    const current = getAppNavigation().libraryFullCollections;
    if (current.albums.status !== 'loaded' && current.artists.status !== 'loaded') {
        return;
    }

    void (async () => {
        const [albums, artists] = await traceAsync('library.deriveFromMirror', () =>
            Promise.all([
                loadAndroidFullCollection(serverConnection, 'album'),
                loadAndroidFullCollection(serverConnection, 'artist'),
            ]),
        );
        setLibraryFullCollections((current) => {
            // Re-checked: the surfaces could have been reset while the read ran.
            if (current.albums.status !== 'loaded' && current.artists.status !== 'loaded') {
                return current;
            }
            return { albums, artists };
        });
    })();
};

/** Offline mode or no server: clear the Library surfaces and invalidate any
 *  in-flight loads so a late response can't repopulate them. */
export const resetLibraryContent = (): void => {
    libraryRelevantFetchToken += 1;
    setLibraryRelevantState(EMPTY_LIBRARY_RELEVANT_STATE);
    libraryFullCollectionFetchToken += 1;
    setLibraryFullCollections(EMPTY_LIBRARY_FULL_COLLECTIONS);
    for (const mediaType of MEDIA_TYPE_COLLECTION_KEYS) {
        mediaTypeCollectionFetchTokens[mediaType] += 1;
    }
    setMediaTypeCollections(EMPTY_MEDIA_TYPE_COLLECTIONS);
};

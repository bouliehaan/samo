import {
    getAppNavigation,
    setLibraryFullCollections,
    setLibraryRelevantState,
} from '../state/app-navigation';
import { getAuthSession } from '../state/auth-session';
import { getDownloadsSnapshot } from '../state/downloads-state';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    EMPTY_LIBRARY_RELEVANT_STATE,
} from '../types/library-tab';
import {
    loadAndroidFullCollection,
    loadAndroidFullCollectionLocalFirstPage,
} from './full-collection';
import { loadAndroidLibraryRelevantContent } from './library-content';

// Race guards: a slow read that lands after a newer request (or a reset on
// disconnect) is dropped instead of clobbering fresher state.
let libraryRelevantFetchToken = 0;
let libraryFullCollectionFetchToken = 0;

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

/** Re-derive the Library surfaces from the mirror after a sync — only the
 *  ones the user has already opened (state present), never a cold mount. */
export const refreshLibraryFromMirror = (): void => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return;
    }
    startLibraryRelevantLoad();
    void (async () => {
        const [albums, artists] = await Promise.all([
            loadAndroidFullCollection(serverConnection, 'album'),
            loadAndroidFullCollection(serverConnection, 'artist'),
        ]);
        setLibraryFullCollections((current) => {
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
};

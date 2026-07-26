import { runAndroidSearch } from '../services/search-content';
import { setSearchOverlayQuery, setSearchState } from '../state/app-navigation';
import { getAppSession } from '../state/app-session';
import { getAuthSession } from '../state/auth-session';
import { searchRequestId } from './handler-state';

export const handleSearch = async (query: string): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return;
    }

    const trimmedQuery = query.trim();
    const requestId = (searchRequestId.current += 1);

    if (!trimmedQuery) {
        setSearchState({ status: 'idle' });
        return;
    }

    setSearchState({ query: trimmedQuery, status: 'loading' });
    const userRecents = new Map(
        getAppSession().recentContentItems.map((entry) => [entry.key, entry.selectedAt]),
    );
    await runAndroidSearch(serverConnection, trimmedQuery, userRecents, (state) => {
        if (requestId === searchRequestId.current) {
            setSearchState(state);
        }
    });
};

// The search field fires onChangeText per keystroke; without a debounce that is a
// full music+audiobook+podcast fan-out on EVERY character, which saturates the JS
// thread and stutters playback. The input itself stays instant
// (setSearchOverlayQuery is synchronous); only the heavy network search defers.
let overlaySearchTimer: null | ReturnType<typeof setTimeout> = null;

const runOverlaySearchDebounced = (rawQuery: string): void => {
    if (overlaySearchTimer) {
        clearTimeout(overlaySearchTimer);
        overlaySearchTimer = null;
    }
    const trimmed = rawQuery.trim();
    if (!trimmed) {
        // Clearing must feel instant — no point deferring an empty query.
        void handleSearch('');
        return;
    }
    overlaySearchTimer = setTimeout(() => {
        overlaySearchTimer = null;
        void handleSearch(trimmed);
    }, 280);
};

/** Lives here rather than on a host component because the search FIELD now lives
 *  on the pull surface (see SearchPullSurface) while the results live on the
 *  overlay — both need the same handler. */
export const handleSearchOverlayQuery = (query: string): void => {
    setSearchOverlayQuery(query);
    runOverlaySearchDebounced(query);
};

import { type MobileHomeItem, type MobileSearchItem } from '@samo/core/mobile';
import { memo } from 'react';

import { useSearchPullContext } from './search-pull/SearchPullContext';
import { handleSelectMediaItem } from '../handlers/media-detail-handlers';
import { handleSearch } from '../handlers/search-handlers';
import { SearchOverlay } from '../screens/SearchScreen';
import {
    setIsSearchOverlayOpen,
    setSearchOverlayQuery,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { useAuthSessionSelector } from '../state/auth-session';

// The quick-search OVERLAY fires onChangeText per keystroke; without a
// debounce that was a full music+audiobook+podcast search fan-out on EVERY
// character, which saturated the JS thread and stuttered playback. The main
// Search tab already debounces 280ms; mirror it here so a burst of typing
// runs ONE search. The input itself stays instant (setSearchOverlayQuery
// updates the value synchronously at the call site); only the heavy network
// search is deferred.
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

const handleSearchOverlayQuery = (query: string): void => {
    setSearchOverlayQuery(query);
    runOverlaySearchDebounced(query);
};

const handleSearchOverlaySelect = (item: MobileHomeItem | MobileSearchItem): void => {
    setIsSearchOverlayOpen(false);
    setSearchOverlayQuery('');
    void handleSelectMediaItem(item);
};

/**
 * The quick-search overlay. Subscribes to the navigation store itself, so a
 * search keystroke re-renders this host (and the overlay) — not App.
 */
export const SearchOverlayHost = memo(function SearchOverlayHost() {
    const isSearchOverlayOpen = useAppNavigationSelector((state) => state.isSearchOverlayOpen);
    const searchOverlayQuery = useAppNavigationSelector((state) => state.searchOverlayQuery);
    const searchState = useAppNavigationSelector((state) => state.searchState);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const { isSearchMounted } = useSearchPullContext();

    // Mounted EARLY — as soon as the pull is meaningfully underway — so the
    // overlay can be dragged into view rather than appearing after the fact.
    // Getting the render out of the way during the slack of stage one also keeps
    // it off the frame where stage two begins, which is the one moment the
    // motion has to be perfectly smooth.
    if (!isSearchMounted && !isSearchOverlayOpen) {
        return null;
    }

    return (
        <SearchOverlay
            isCommitted={isSearchOverlayOpen}
            onSearch={handleSearchOverlayQuery}
            onSelectItem={handleSearchOverlaySelect}
            query={searchOverlayQuery}
            searchState={searchState}
            serverConnection={serverConnection}
        />
    );
});

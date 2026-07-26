import { beforeEach, describe, expect, it } from 'vitest';

import {
    closeMediaDetail,
    getAppNavigation,
    openMediaDetail,
    pressTab,
    setActiveTab,
    setActiveUtilityScreen,
    setIsSearchOverlayOpen,
} from './app-navigation';

/**
 * `pressTab` is the whole contract of the bottom bar: "land on the tab with
 * every overlay dismissed". The search overlay was missing from that list,
 * which did NOT look like a missing dismissal on device — it looked like a
 * dead navbar. The bar is a later sibling of the overlay's container, so the
 * press genuinely reached pressTab and genuinely switched tabs; the overlay
 * just stayed painted over the result, so nothing appeared to happen and the
 * button had to be pressed again (after something else closed the overlay).
 * Any future overlay added above the scenes needs a case here.
 */
const resetNavigation = () => {
    setIsSearchOverlayOpen(false);
    setActiveUtilityScreen(null);
    closeMediaDetail();
    setActiveTab('home');
};

describe('pressTab', () => {
    beforeEach(resetNavigation);

    it('dismisses the search overlay so the tab it selects is actually visible', () => {
        setActiveTab('home');
        setIsSearchOverlayOpen(true);

        pressTab('radio');

        expect(getAppNavigation().isSearchOverlayOpen).toBe(false);
        expect(getAppNavigation().activeTab).toBe('radio');
    });

    it('dismisses the search overlay even when re-pressing the tab already active', () => {
        setActiveTab('playlists');
        setIsSearchOverlayOpen(true);

        pressTab('playlists');

        expect(getAppNavigation().isSearchOverlayOpen).toBe(false);
        expect(getAppNavigation().activeTab).toBe('playlists');
    });

    it('clears every other overlay layer too', () => {
        setActiveUtilityScreen('settings');
        openMediaDetail('item-key', { itemTitle: 'Some Album', status: 'loading' });
        setIsSearchOverlayOpen(true);

        pressTab('podcasts');

        const state = getAppNavigation();
        expect(state.activeUtilityScreen).toBeNull();
        expect(state.mediaDetailState.status).toBe('idle');
        expect(state.isSearchOverlayOpen).toBe(false);
        expect(state.activeTab).toBe('podcasts');
    });
});

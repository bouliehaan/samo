import { type SamoMobileTabId } from '@samo/core/navigation';

import { type AppNavigationState } from '../state/app-navigation';
import { type TvZone } from './tv-focus';

/**
 * The TV's destinations: the phone's five tabs, plus Search and Settings,
 * which on a phone are a pull-down and a utility screen and on a TV are simply
 * places in the rail. Everything is read from the same navigation store the
 * phone uses, so the shared handlers (open a detail, view all, search for an
 * artist) drive the TV without knowing it is one.
 */
export type TvPage = SamoMobileTabId | 'search' | 'settings';

export const TV_RAIL_PAGES: ReadonlyArray<{ id: TvPage; label: string }> = [
    { id: 'search', label: 'Search' },
    { id: 'home', label: 'Home' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'radio', label: 'Radio' },
];

export const selectTvPage = (state: AppNavigationState): TvPage =>
    state.isSearchOverlayOpen
        ? 'search'
        : state.activeUtilityScreen === 'settings'
          ? 'settings'
          : state.activeTab;

export type TvBackAction =
    | 'close-menu'
    | 'close-player'
    | 'close-view-all'
    | 'exit'
    | 'focus-rail'
    | 'go-home'
    | 'pop-detail';

/**
 * Back closes the deepest thing first. From the page itself it goes to the
 * rail, where a second Back goes Home, and a third leaves the app — so Back
 * never throws away more than one step of where you were.
 */
export const getTvBackAction = ({
    detailOpen,
    menuOpen,
    page,
    playerOpen,
    viewAllOpen,
    zone,
}: {
    detailOpen: boolean;
    menuOpen: boolean;
    page: TvPage;
    playerOpen: boolean;
    viewAllOpen: boolean;
    zone: TvZone | null;
}): TvBackAction => {
    if (menuOpen) return 'close-menu';
    if (playerOpen) return 'close-player';
    if (zone === 'rail') {
        return detailOpen || viewAllOpen || page !== 'home' ? 'go-home' : 'exit';
    }
    // A detail opened from View All sits above it.
    if (detailOpen) return 'pop-detail';
    if (viewAllOpen) return 'close-view-all';
    return 'focus-rail';
};

export const resolveTvFocus = (
    available: readonly string[],
    remembered: string | null,
    fallback: string,
): string | undefined =>
    (remembered && available.includes(remembered) ? remembered : undefined) ??
    (available.includes(fallback) ? fallback : available[0]);

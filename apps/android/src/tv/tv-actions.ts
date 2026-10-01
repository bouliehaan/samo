import { type MobileHomeItem, MobileHomeItemType, type MobileSearchItem } from '@samo/core/mobile';

import { handleSelectMediaItem } from '../handlers/media-detail-handlers';
import {
    closeMediaDetail,
    closeViewAll,
    getAppNavigation,
    pressTab,
    setActiveUtilityScreen,
    setIsFullPlayerOpen,
    setIsSearchOverlayOpen,
} from '../state/app-navigation';
import { useStoreSelector } from '../state/use-store-selector';
import { enterTvScope, focusTvControl } from './TvControls';
import { setTvPlacementZone, shouldTvZoneTakeFocus } from './tv-focus';
import { selectTvPage, type TvPage } from './tv-navigation';

/**
 * What a press on the TV does beyond the shared handlers: it says so. A phone
 * always shows the mini player, so starting something is visible the instant
 * it happens; a TV shows nothing unless it opens something. So anything that
 * starts playback opens Now Playing — which is also where pause lives — and a
 * failure is said out loud instead of swallowed.
 */

type TvToast = { id: number; message: string } | null;

let toast: TvToast = null;
let toastTimer: null | ReturnType<typeof setTimeout> = null;
const toastListeners = new Set<() => void>();

const TOAST_MS = 3200;

const publishToast = (next: TvToast): void => {
    toast = next;
    toastListeners.forEach((listener) => listener());
};

export const showTvToast = (message: string): void => {
    if (toastTimer) clearTimeout(toastTimer);
    publishToast({ id: (toast?.id ?? 0) + 1, message });
    toastTimer = setTimeout(() => {
        toastTimer = null;
        publishToast(null);
    }, TOAST_MS);
};

const subscribeToast = (listener: () => void): (() => void) => {
    toastListeners.add(listener);
    return () => {
        toastListeners.delete(listener);
    };
};

const getToast = (): TvToast => toast;
const selectToast = (state: TvToast): TvToast => state;

export const useTvToast = (): TvToast => useStoreSelector(subscribeToast, getToast, selectToast);

/** Run a handler; a failure becomes a toast rather than a silent nothing. */
export const runTvAction = (action: () => unknown): void => {
    void Promise.resolve()
        .then(action)
        .catch((reason: unknown) => {
            showTvToast(
                reason instanceof Error && reason.message
                    ? reason.message
                    : 'Something went wrong. Please try again.',
            );
        });
};

export const openTvPlayer = (): void => setIsFullPlayerOpen(true);

export const closeTvPlayer = (): void => {
    setTvPlacementZone(shouldTvZoneTakeFocus('rail') ? 'rail' : 'content');
    setIsFullPlayerOpen(false);
};

/** Start playback and show it: the TV's every play button. */
export const playOnTv = (action: () => unknown): void => {
    runTvAction(action);
    openTvPlayer();
};

/**
 * OK on a tile. Stations, episodes, songs and books play (and open Now
 * Playing); albums, playlists, artists and shows open their page — exactly
 * what the same tap does on the phone.
 */
export const selectTvItem = (item: MobileHomeItem | MobileSearchItem): void => {
    setTvPlacementZone('content');
    if (item.playback || item.type === MobileHomeItemType.AUDIOBOOK) {
        playOnTv(() => handleSelectMediaItem(item));
        return;
    }
    runTvAction(() => handleSelectMediaItem(item));
};

export const tvPageScope = (page: TvPage): string => `page:${page}`;

/** The scope focus should enter on the content side: whatever is on top. */
export const getTvContentScope = (): string => {
    const navigation = getAppNavigation();
    if (navigation.mediaDetailState.status !== 'idle') return 'detail';
    if (navigation.activeUtilityScreen === 'view-all') return 'view-all';
    return tvPageScope(selectTvPage(navigation));
};

const closeTvViewAll = (): void => {
    const navigation = getAppNavigation();
    if (navigation.activeUtilityScreen === 'view-all' || navigation.viewAllRoute !== null) {
        closeViewAll();
    }
};

/**
 * OK on a rail destination: show that page, with every overlay on it
 * dismissed, and send focus into it — to where the person last was there, or
 * its first control on a first visit.
 */
export const openTvPage = (page: TvPage): void => {
    setTvPlacementZone('content');
    closeTvViewAll();
    if (page === 'search' || page === 'settings') {
        if (getAppNavigation().mediaDetailState.status !== 'idle') closeMediaDetail();
        setIsSearchOverlayOpen(page === 'search');
        setActiveUtilityScreen(page === 'settings' ? 'settings' : null);
    } else {
        // The phone's tab press: lands on the tab with every overlay dismissed.
        pressTab(page);
    }
    // A page already on screen is not shown again, so nothing else would move
    // focus into it; one being uncovered or mounted places focus by itself.
    enterTvScope(tvPageScope(page));
};

/** Back from a page, or Left off its first column: to the rail, on the
 *  destination being shown. */
export const focusTvRail = (): void => {
    setTvPlacementZone('rail');
    focusTvControl('rail', `rail:${selectTvPage(getAppNavigation())}`);
};

/** Back from the rail: Home, with focus left on the rail. */
export const goTvHome = (): void => {
    setTvPlacementZone('rail');
    closeTvViewAll();
    pressTab('home');
    focusTvControl('rail', 'rail:home');
};

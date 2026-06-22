import { startTransition, useSyncExternalStore, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';

import { type AndroidUtilityScreen } from '../types/app-navigation';
import { type ViewAllRoute } from '../types/view-all';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    type LibraryFullCollectionsState,
} from '../types/library-tab';
import { type AndroidFullCollectionState } from '../services/full-collection';
import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidMediaDetailState } from '../services/media-detail';
import { type AndroidSearchState } from '../services/search-content';

/**
 * One entry in the media-detail back-stack. The detail surface is rendered from
 * a single live slot (`mediaDetailState`); this stack holds the history BELOW
 * the current detail so "back" returns to the artist/album/playlist you came
 * from instead of collapsing the whole overlay to the active tab (Home).
 * `key` is the opened item's cache key (`getRecentContentItemKey`) — it lets the
 * open action tell "navigate to a new entity" (push) from "update the current
 * entity" (replace the top, e.g. loading → loaded) and de-dupes re-opens.
 */
export type MediaDetailFrame = {
    key: string;
    state: AndroidMediaDetailState;
};

export type AppNavigationState = {
    activeTab: SamoMobileTabId;
    activeUtilityScreen: AndroidUtilityScreen | null;
    homeContentState: AndroidHomeContentState;
    isFullPlayerOpen: boolean;
    isSearchOverlayOpen: boolean;
    libraryFullCollections: LibraryFullCollectionsState;
    mediaDetailKey: string | null;
    mediaDetailStack: MediaDetailFrame[];
    mediaDetailState: AndroidMediaDetailState;
    searchOverlayQuery: string;
    searchState: AndroidSearchState;
    viewAllFullState: AndroidFullCollectionState;
    viewAllRoute: null | ViewAllRoute;
};

export const initialAppNavigationState: AppNavigationState = {
    activeTab: 'home',
    activeUtilityScreen: null,
    homeContentState: { status: 'idle' },
    isFullPlayerOpen: false,
    isSearchOverlayOpen: false,
    libraryFullCollections: EMPTY_LIBRARY_FULL_COLLECTIONS,
    mediaDetailKey: null,
    mediaDetailStack: [],
    mediaDetailState: { status: 'idle' },
    searchOverlayQuery: '',
    searchState: { status: 'idle' },
    viewAllFullState: { status: 'idle' },
    viewAllRoute: null,
};

export type AppNavigationAction =
    | { type: 'patch'; patch: Partial<AppNavigationState> }
    | {
          type: 'set-active-tab';
          value: SamoMobileTabId | ((current: SamoMobileTabId) => SamoMobileTabId);
      }
    | {
          type: 'set-active-utility';
          value:
              | AndroidUtilityScreen
              | null
              | ((current: AndroidUtilityScreen | null) => AndroidUtilityScreen | null);
      }
    | {
          type: 'set-home-content';
          homeContentState:
              | AndroidHomeContentState
              | ((current: AndroidHomeContentState) => AndroidHomeContentState);
      }
    | { type: 'set-full-player-open'; isFullPlayerOpen: boolean }
    | { type: 'set-search-overlay-open'; isSearchOverlayOpen: boolean }
    | {
          type: 'set-library-full-collections';
          libraryFullCollections:
              | LibraryFullCollectionsState
              | ((current: LibraryFullCollectionsState) => LibraryFullCollectionsState);
      }
    | {
          type: 'set-media-detail';
          mediaDetailState:
              | AndroidMediaDetailState
              | ((current: AndroidMediaDetailState) => AndroidMediaDetailState);
      }
    | { type: 'open-media-detail'; key: string; mediaDetailState: AndroidMediaDetailState }
    | { type: 'pop-media-detail' }
    | { type: 'reset-media-detail' }
    | { type: 'set-search-overlay-query'; searchOverlayQuery: string }
    | {
          type: 'set-search-state';
          searchState: AndroidSearchState | ((current: AndroidSearchState) => AndroidSearchState);
      }
    | {
          type: 'set-view-all-full';
          viewAllFullState:
              | AndroidFullCollectionState
              | ((current: AndroidFullCollectionState) => AndroidFullCollectionState);
      }
    | { type: 'set-view-all-route'; viewAllRoute: null | ViewAllRoute }
    | { type: 'close-view-all' };

export const appNavigationReducer = (
    state: AppNavigationState,
    action: AppNavigationAction,
): AppNavigationState => {
    switch (action.type) {
        case 'patch':
            return { ...state, ...action.patch };
        case 'set-active-tab': {
            const activeTab =
                typeof action.value === 'function' ? action.value(state.activeTab) : action.value;
            return { ...state, activeTab };
        }
        case 'set-active-utility': {
            const activeUtilityScreen =
                typeof action.value === 'function'
                    ? action.value(state.activeUtilityScreen)
                    : action.value;
            return { ...state, activeUtilityScreen };
        }
        case 'set-home-content':
            return {
                ...state,
                homeContentState:
                    typeof action.homeContentState === 'function'
                        ? action.homeContentState(state.homeContentState)
                        : action.homeContentState,
            };
        case 'set-full-player-open':
            return { ...state, isFullPlayerOpen: action.isFullPlayerOpen };
        case 'set-search-overlay-open':
            return { ...state, isSearchOverlayOpen: action.isSearchOverlayOpen };
        case 'set-library-full-collections':
            return {
                ...state,
                libraryFullCollections:
                    typeof action.libraryFullCollections === 'function'
                        ? action.libraryFullCollections(state.libraryFullCollections)
                        : action.libraryFullCollections,
            };
        case 'set-media-detail':
            return {
                ...state,
                mediaDetailState:
                    typeof action.mediaDetailState === 'function'
                        ? action.mediaDetailState(state.mediaDetailState)
                        : action.mediaDetailState,
            };
        case 'open-media-detail': {
            // Push the current detail onto the back-stack only when it's a fully
            // LOADED detail for a DIFFERENT entity. Pushing a loading/error shell
            // would restore a dead spinner on back (its in-flight request was
            // already superseded); a same-key open is a re-open/refresh, not a
            // navigation, so it replaces in place.
            const shouldPush =
                state.mediaDetailState.status === 'loaded' &&
                state.mediaDetailKey !== null &&
                state.mediaDetailKey !== action.key;
            return {
                ...state,
                mediaDetailKey: action.key,
                mediaDetailStack: shouldPush
                    ? [
                          ...state.mediaDetailStack,
                          { key: state.mediaDetailKey as string, state: state.mediaDetailState },
                      ]
                    : state.mediaDetailStack,
                mediaDetailState: action.mediaDetailState,
            };
        }
        case 'pop-media-detail': {
            if (state.mediaDetailStack.length === 0) {
                if (state.mediaDetailState.status === 'idle' && state.mediaDetailKey === null) {
                    return state;
                }
                return { ...state, mediaDetailKey: null, mediaDetailState: { status: 'idle' } };
            }
            const frame = state.mediaDetailStack[state.mediaDetailStack.length - 1]!;
            return {
                ...state,
                mediaDetailKey: frame.key,
                mediaDetailStack: state.mediaDetailStack.slice(0, -1),
                mediaDetailState: frame.state,
            };
        }
        case 'reset-media-detail':
            if (
                state.mediaDetailState.status === 'idle' &&
                state.mediaDetailStack.length === 0 &&
                state.mediaDetailKey === null
            ) {
                return state;
            }
            return {
                ...state,
                mediaDetailKey: null,
                mediaDetailStack: [],
                mediaDetailState: { status: 'idle' },
            };
        case 'set-search-overlay-query':
            return { ...state, searchOverlayQuery: action.searchOverlayQuery };
        case 'set-search-state':
            return {
                ...state,
                searchState:
                    typeof action.searchState === 'function'
                        ? action.searchState(state.searchState)
                        : action.searchState,
            };
        case 'set-view-all-full':
            return {
                ...state,
                viewAllFullState:
                    typeof action.viewAllFullState === 'function'
                        ? action.viewAllFullState(state.viewAllFullState)
                        : action.viewAllFullState,
            };
        case 'set-view-all-route':
            return { ...state, viewAllRoute: action.viewAllRoute };
        case 'close-view-all':
            return {
                ...state,
                activeUtilityScreen:
                    state.activeUtilityScreen === 'view-all' ? null : state.activeUtilityScreen,
                viewAllFullState: { status: 'idle' },
                viewAllRoute: null,
            };
        default:
            return state;
    }
};

export type UseAppNavigationOptions = {
    onCloseMediaDetailSideEffects?: () => void;
    onCloseViewAllSideEffects?: () => void;
};

let appNavigationState: AppNavigationState = initialAppNavigationState;
const appNavigationListeners = new Set<() => void>();

const dispatchAppNavigation = (action: AppNavigationAction): void => {
    const next = appNavigationReducer(appNavigationState, action);
    if (Object.is(next, appNavigationState)) {
        return;
    }
    appNavigationState = next;
    appNavigationListeners.forEach((listener) => listener());
};

const subscribeAppNavigation = (listener: () => void): (() => void) => {
    appNavigationListeners.add(listener);
    return () => {
        appNavigationListeners.delete(listener);
    };
};

const getAppNavigationState = () => appNavigationState;

let appNavigationOptions: UseAppNavigationOptions = {};

export const setAppNavigationOptions = (options: UseAppNavigationOptions) => {
    appNavigationOptions = options;
};

const setActiveTab = (value: SamoMobileTabId | ((current: SamoMobileTabId) => SamoMobileTabId)) =>
    dispatchAppNavigation({ type: 'set-active-tab', value });

const setActiveUtilityScreen = (
    value:
        | AndroidUtilityScreen
        | null
        | ((current: AndroidUtilityScreen | null) => AndroidUtilityScreen | null),
) => dispatchAppNavigation({ type: 'set-active-utility', value });

const setHomeContentState = (
    homeContentState:
        | AndroidHomeContentState
        | ((current: AndroidHomeContentState) => AndroidHomeContentState),
) => dispatchAppNavigation({ type: 'set-home-content', homeContentState });

const setIsFullPlayerOpen = (isFullPlayerOpen: boolean) =>
    dispatchAppNavigation({ type: 'set-full-player-open', isFullPlayerOpen });

const setIsSearchOverlayOpen = (isSearchOverlayOpen: boolean) =>
    dispatchAppNavigation({ type: 'set-search-overlay-open', isSearchOverlayOpen });

const setSearchOverlayQuery = (searchOverlayQuery: string) =>
    dispatchAppNavigation({ type: 'set-search-overlay-query', searchOverlayQuery });

const setMediaDetailState = (
    mediaDetailState:
        | AndroidMediaDetailState
        | ((current: AndroidMediaDetailState) => AndroidMediaDetailState),
) => dispatchAppNavigation({ type: 'set-media-detail', mediaDetailState });

/**
 * Navigate to a NEW media detail. Pushes the current loaded detail onto the
 * back-stack (so `popMediaDetail` can return to it) and makes the new one the
 * live top. `key` is the opened item's cache key — same-key opens replace in
 * place instead of stacking a duplicate. Updates to the current detail (e.g.
 * loading → loaded) keep using `setMediaDetailState`, which only touches the top.
 */
const openMediaDetail = (key: string, mediaDetailState: AndroidMediaDetailState) =>
    dispatchAppNavigation({ type: 'open-media-detail', key, mediaDetailState });

const setViewAllRoute = (viewAllRoute: null | ViewAllRoute) =>
    dispatchAppNavigation({ type: 'set-view-all-route', viewAllRoute });

const setViewAllFullState = (
    viewAllFullState:
        | AndroidFullCollectionState
        | ((current: AndroidFullCollectionState) => AndroidFullCollectionState),
) => dispatchAppNavigation({ type: 'set-view-all-full', viewAllFullState });

const setLibraryFullCollections = (
    libraryFullCollections:
        | LibraryFullCollectionsState
        | ((current: LibraryFullCollectionsState) => LibraryFullCollectionsState),
) => dispatchAppNavigation({ type: 'set-library-full-collections', libraryFullCollections });

const setSearchState = (
    searchState: AndroidSearchState | ((current: AndroidSearchState) => AndroidSearchState),
) => dispatchAppNavigation({ type: 'set-search-state', searchState });

/**
 * Pop one level off the detail back-stack: back to the previous detail (the
 * artist you opened the album from), or to idle when at the root. This is the
 * "back" gesture — wired to the hardware back button and the detail header's
 * onBack. Runs the close side-effect so any in-flight load for the detail being
 * left is invalidated and can't clobber the restored parent.
 */
const popMediaDetail = () => {
    appNavigationOptions.onCloseMediaDetailSideEffects?.();
    startTransition(() => {
        dispatchAppNavigation({ type: 'pop-media-detail' });
    });
};

/**
 * Fully tear down the detail surface (clears the whole back-stack → idle). Used
 * when leaving the surface entirely — switching tabs, opening a utility screen —
 * where "back" semantics don't apply and the next open should be a fresh root.
 */
const closeMediaDetail = () => {
    appNavigationOptions.onCloseMediaDetailSideEffects?.();
    startTransition(() => {
        dispatchAppNavigation({ type: 'reset-media-detail' });
    });
};

const closeViewAll = () => {
    appNavigationOptions.onCloseViewAllSideEffects?.();
    dispatchAppNavigation({ type: 'close-view-all' });
};

export const useAppNavigationState = (options?: UseAppNavigationOptions) => {
    if (options) {
        setAppNavigationOptions(options);
    }

    const state = useSyncExternalStore(
        subscribeAppNavigation,
        getAppNavigationState,
        getAppNavigationState,
    );

    const libraryFullCollectionFetchTokenRef = useRef(0);
    const homeLoadRequestId = useRef(0);

    useEffect(() => {
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (state.isSearchOverlayOpen) {
                setIsSearchOverlayOpen(false);
                setSearchOverlayQuery('');
                return true;
            }

            if (state.isFullPlayerOpen) {
                setIsFullPlayerOpen(false);
                return true;
            }

            if (state.mediaDetailState.status !== 'idle') {
                popMediaDetail();
                return true;
            }

            if (
                state.activeUtilityScreen === 'add-server' ||
                state.activeUtilityScreen === 'downloads' ||
                state.activeUtilityScreen === 'manage-servers'
            ) {
                setActiveUtilityScreen('settings');
                return true;
            }

            if (state.activeUtilityScreen === 'view-all') {
                closeViewAll();
                return true;
            }

            if (state.activeUtilityScreen === 'settings') {
                setActiveUtilityScreen(null);
                return true;
            }

            return false;
        });

        return () => handler.remove();
    }, [
        state.activeUtilityScreen,
        state.isFullPlayerOpen,
        state.isSearchOverlayOpen,
        state.mediaDetailState.status,
    ]);

    return {
        ...state,
        closeMediaDetail,
        closeViewAll,
        homeLoadRequestId,
        libraryFullCollectionFetchTokenRef,
        openMediaDetail,
        popMediaDetail,
        setActiveTab,
        setActiveUtilityScreen,
        setHomeContentState,
        setIsFullPlayerOpen,
        setIsSearchOverlayOpen,
        setLibraryFullCollections,
        setMediaDetailState,
        setSearchOverlayQuery,
        setSearchState,
        setViewAllFullState,
        setViewAllRoute,
    };
};

export const useAppNavigationSelector = <Selected>(
    selector: (state: AppNavigationState) => Selected,
): Selected =>
    useSyncExternalStore(
        subscribeAppNavigation,
        () => selector(appNavigationState),
        () => selector(appNavigationState),
    );

export { SAMO_MOBILE_TABS };

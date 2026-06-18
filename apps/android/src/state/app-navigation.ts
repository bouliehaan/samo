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

export type AppNavigationState = {
    activeTab: SamoMobileTabId;
    activeUtilityScreen: AndroidUtilityScreen | null;
    homeContentState: AndroidHomeContentState;
    isFullPlayerOpen: boolean;
    isSearchOverlayOpen: boolean;
    libraryFullCollections: LibraryFullCollectionsState;
    mediaDetailState: AndroidMediaDetailState;
    searchOverlayQuery: string;
    searchState: AndroidSearchState;
    viewAllFullState: AndroidFullCollectionState;
    viewAllRoute: null | ViewAllRoute;
};

const initialAppNavigationState: AppNavigationState = {
    activeTab: 'home',
    activeUtilityScreen: null,
    homeContentState: { status: 'idle' },
    isFullPlayerOpen: false,
    isSearchOverlayOpen: false,
    libraryFullCollections: EMPTY_LIBRARY_FULL_COLLECTIONS,
    mediaDetailState: { status: 'idle' },
    searchOverlayQuery: '',
    searchState: { status: 'idle' },
    viewAllFullState: { status: 'idle' },
    viewAllRoute: null,
};

type AppNavigationAction =
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

const appNavigationReducer = (
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

const closeMediaDetail = () => {
    appNavigationOptions.onCloseMediaDetailSideEffects?.();
    startTransition(() => {
        setMediaDetailState((current) =>
            current.status === 'idle' ? current : { status: 'idle' },
        );
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
                closeMediaDetail();
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

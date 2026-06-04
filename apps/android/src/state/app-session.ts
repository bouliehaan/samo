import { useSyncExternalStore } from 'react';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidCastState } from '../services/audio-playback';
import { type AndroidLocalFavoriteItem } from '../services/local-favorites';
import { type AndroidRecentContentItem } from '../services/recent-content';

export type AppSessionState = {
    castState: AndroidCastState;
    favoritedKeys: Set<string>;
    isShuffled: boolean;
    lastPlayedItem: MobilePlayableAudio | null;
    localFavorites: AndroidLocalFavoriteItem[];
    recentContentItems: AndroidRecentContentItem[];
};

const initialAppSessionState: AppSessionState = {
    castState: {
        isConnected: false,
        status: 'unavailable',
    },
    favoritedKeys: new Set(),
    isShuffled: false,
    lastPlayedItem: null,
    localFavorites: [],
    recentContentItems: [],
};

type AppSessionAction =
    | { type: 'patch'; patch: Partial<AppSessionState> }
    | { type: 'set-cast-state'; castState: AndroidCastState | ((current: AndroidCastState) => AndroidCastState) }
    | {
          type: 'set-favorited-keys';
          favoritedKeys: Set<string> | ((current: Set<string>) => Set<string>);
      }
    | { type: 'set-is-shuffled'; isShuffled: boolean | ((current: boolean) => boolean) }
    | {
          type: 'set-last-played';
          lastPlayedItem: MobilePlayableAudio | null | ((current: MobilePlayableAudio | null) => MobilePlayableAudio | null);
      }
    | {
          type: 'set-local-favorites';
          localFavorites:
              | AndroidLocalFavoriteItem[]
              | ((current: AndroidLocalFavoriteItem[]) => AndroidLocalFavoriteItem[]);
      }
    | {
          type: 'set-recent-content';
          recentContentItems:
              | AndroidRecentContentItem[]
              | ((current: AndroidRecentContentItem[]) => AndroidRecentContentItem[]);
      };

const appSessionReducer = (state: AppSessionState, action: AppSessionAction): AppSessionState => {
    switch (action.type) {
        case 'patch':
            return { ...state, ...action.patch };
        case 'set-cast-state':
            return {
                ...state,
                castState:
                    typeof action.castState === 'function'
                        ? action.castState(state.castState)
                        : action.castState,
            };
        case 'set-favorited-keys':
            return {
                ...state,
                favoritedKeys:
                    typeof action.favoritedKeys === 'function'
                        ? action.favoritedKeys(state.favoritedKeys)
                        : action.favoritedKeys,
            };
        case 'set-is-shuffled':
            return {
                ...state,
                isShuffled:
                    typeof action.isShuffled === 'function'
                        ? action.isShuffled(state.isShuffled)
                        : action.isShuffled,
            };
        case 'set-last-played':
            return {
                ...state,
                lastPlayedItem:
                    typeof action.lastPlayedItem === 'function'
                        ? action.lastPlayedItem(state.lastPlayedItem)
                        : action.lastPlayedItem,
            };
        case 'set-local-favorites':
            return {
                ...state,
                localFavorites:
                    typeof action.localFavorites === 'function'
                        ? action.localFavorites(state.localFavorites)
                        : action.localFavorites,
            };
        case 'set-recent-content':
            return {
                ...state,
                recentContentItems:
                    typeof action.recentContentItems === 'function'
                        ? action.recentContentItems(state.recentContentItems)
                        : action.recentContentItems,
            };
        default:
            return state;
    }
};

// Single app-wide session store. This used to be a per-call `useReducer`, but
// the hook is consumed from several independent places (media-handlers,
// native-playback, cast-sync, playback-controls). A local reducer gave each
// caller its OWN divergent copy, so e.g. cast state written by cast-sync was
// invisible to the player UI, and the shuffle toggle never reached the glyph.
// Backing it with a module-level store (mirroring `playback-store.ts`) makes
// every caller read and write the same state while keeping the hook API
// unchanged.
let appSessionState: AppSessionState = initialAppSessionState;
const appSessionListeners = new Set<() => void>();

const dispatchAppSession = (action: AppSessionAction): void => {
    const next = appSessionReducer(appSessionState, action);
    if (Object.is(next, appSessionState)) {
        return;
    }
    appSessionState = next;
    appSessionListeners.forEach((listener) => listener());
};

const subscribeAppSession = (listener: () => void): (() => void) => {
    appSessionListeners.add(listener);
    return () => {
        appSessionListeners.delete(listener);
    };
};

const getAppSessionState = () => appSessionState;

// Setters are module-level singletons so their identity is stable across
// renders (no per-call useCallback needed) and shared by every consumer.
const setCastState = (
    castState: AndroidCastState | ((current: AndroidCastState) => AndroidCastState),
) => dispatchAppSession({ type: 'set-cast-state', castState });

const setLastPlayedItem = (
    lastPlayedItem:
        | MobilePlayableAudio
        | null
        | ((current: MobilePlayableAudio | null) => MobilePlayableAudio | null),
) => dispatchAppSession({ type: 'set-last-played', lastPlayedItem });

const setRecentContentItems = (
    recentContentItems:
        | AndroidRecentContentItem[]
        | ((current: AndroidRecentContentItem[]) => AndroidRecentContentItem[]),
) => dispatchAppSession({ type: 'set-recent-content', recentContentItems });

const setLocalFavorites = (
    localFavorites:
        | AndroidLocalFavoriteItem[]
        | ((current: AndroidLocalFavoriteItem[]) => AndroidLocalFavoriteItem[]),
) => dispatchAppSession({ type: 'set-local-favorites', localFavorites });

const setFavoritedKeys = (
    favoritedKeys: Set<string> | ((current: Set<string>) => Set<string>),
) => dispatchAppSession({ type: 'set-favorited-keys', favoritedKeys });

const setIsShuffled = (isShuffled: boolean | ((current: boolean) => boolean)) =>
    dispatchAppSession({ type: 'set-is-shuffled', isShuffled });

export const useAppSessionState = () => {
    const state = useSyncExternalStore(
        subscribeAppSession,
        getAppSessionState,
        getAppSessionState,
    );

    return {
        ...state,
        setCastState,
        setFavoritedKeys,
        setIsShuffled,
        setLastPlayedItem,
        setLocalFavorites,
        setRecentContentItems,
    };
};

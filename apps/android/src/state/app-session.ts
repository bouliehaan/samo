import { useCallback, useReducer } from 'react';
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
    playbackQueueRevision: number;
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
    playbackQueueRevision: 0,
    recentContentItems: [],
};

type AppSessionAction =
    | { type: 'bump-playback-queue' }
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
        case 'bump-playback-queue':
            return { ...state, playbackQueueRevision: state.playbackQueueRevision + 1 };
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

export const useAppSessionState = () => {
    const [state, dispatch] = useReducer(appSessionReducer, initialAppSessionState);

    const setCastState = useCallback(
        (castState: AndroidCastState | ((current: AndroidCastState) => AndroidCastState)) => {
            dispatch({ type: 'set-cast-state', castState });
        },
        [],
    );

    const setLastPlayedItem = useCallback(
        (
            lastPlayedItem:
                | MobilePlayableAudio
                | null
                | ((current: MobilePlayableAudio | null) => MobilePlayableAudio | null),
        ) => {
            dispatch({ type: 'set-last-played', lastPlayedItem });
        },
        [],
    );

    const setRecentContentItems = useCallback(
        (
            recentContentItems:
                | AndroidRecentContentItem[]
                | ((current: AndroidRecentContentItem[]) => AndroidRecentContentItem[]),
        ) => {
            dispatch({ type: 'set-recent-content', recentContentItems });
        },
        [],
    );

    const setLocalFavorites = useCallback(
        (
            localFavorites:
                | AndroidLocalFavoriteItem[]
                | ((current: AndroidLocalFavoriteItem[]) => AndroidLocalFavoriteItem[]),
        ) => {
            dispatch({ type: 'set-local-favorites', localFavorites });
        },
        [],
    );

    const setFavoritedKeys = useCallback(
        (favoritedKeys: Set<string> | ((current: Set<string>) => Set<string>)) => {
            dispatch({ type: 'set-favorited-keys', favoritedKeys });
        },
        [],
    );

    const setIsShuffled = useCallback(
        (isShuffled: boolean | ((current: boolean) => boolean)) => {
            dispatch({ type: 'set-is-shuffled', isShuffled });
        },
        [],
    );

    const forcePlaybackQueueRender = useCallback(() => {
        dispatch({ type: 'bump-playback-queue' });
    }, []);

    return {
        ...state,
        forcePlaybackQueueRender,
        setCastState,
        setFavoritedKeys,
        setIsShuffled,
        setLastPlayedItem,
        setLocalFavorites,
        setRecentContentItems,
    };
};

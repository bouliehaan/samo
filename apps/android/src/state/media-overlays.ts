import { useCallback, useReducer } from 'react';
import { type MobileMediaTrack } from '@samo/core/mobile';

import { type MediaContextMenuTarget } from '../contexts/media-context-menu';
import { type BookInfoState } from '../types/book-info';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type PlaylistMenuRoot =
    | {
          collectionItem: AndroidRecentContentSourceItem;
          kind: 'collection';
          sourceId: string;
      }
    | {
          kind: 'track';
          sourceId: string;
          track: MobileMediaTrack;
      }
    | null;

export type PlaylistMenuRootState =
    | { message: string; status: 'error' }
    | { message: string; status: 'success' }
    | { playlistId: string; status: 'loading' }
    | { status: 'idle' };

export type MediaOverlaysState = {
    bookInfoState: BookInfoState;
    contextMenuFeedback: string | null;
    contextMenuTarget: MediaContextMenuTarget | null;
    playlistMenuRoot: PlaylistMenuRoot;
    playlistMenuRootState: PlaylistMenuRootState;
    streamInfoItem: AndroidRecentContentSourceItem | null;
};

const initialMediaOverlaysState: MediaOverlaysState = {
    bookInfoState: { status: 'idle' },
    contextMenuFeedback: null,
    contextMenuTarget: null,
    playlistMenuRoot: null,
    playlistMenuRootState: { status: 'idle' },
    streamInfoItem: null,
};

type MediaOverlaysAction =
    | { type: 'patch'; patch: Partial<MediaOverlaysState> }
    | { type: 'set-book-info'; bookInfoState: BookInfoState | ((current: BookInfoState) => BookInfoState) }
    | { type: 'set-context-menu-feedback'; contextMenuFeedback: string | null }
    | { type: 'set-context-menu-target'; contextMenuTarget: MediaContextMenuTarget | null }
    | { type: 'set-playlist-menu-root'; playlistMenuRoot: PlaylistMenuRoot }
    | {
          type: 'set-playlist-menu-root-state';
          playlistMenuRootState:
              | PlaylistMenuRootState
              | ((current: PlaylistMenuRootState) => PlaylistMenuRootState);
      }
    | { type: 'set-stream-info'; streamInfoItem: AndroidRecentContentSourceItem | null };

const mediaOverlaysReducer = (
    state: MediaOverlaysState,
    action: MediaOverlaysAction,
): MediaOverlaysState => {
    switch (action.type) {
        case 'patch':
            return { ...state, ...action.patch };
        case 'set-book-info':
            return {
                ...state,
                bookInfoState:
                    typeof action.bookInfoState === 'function'
                        ? action.bookInfoState(state.bookInfoState)
                        : action.bookInfoState,
            };
        case 'set-context-menu-feedback':
            return { ...state, contextMenuFeedback: action.contextMenuFeedback };
        case 'set-context-menu-target':
            return { ...state, contextMenuTarget: action.contextMenuTarget };
        case 'set-playlist-menu-root':
            return { ...state, playlistMenuRoot: action.playlistMenuRoot };
        case 'set-playlist-menu-root-state':
            return {
                ...state,
                playlistMenuRootState:
                    typeof action.playlistMenuRootState === 'function'
                        ? action.playlistMenuRootState(state.playlistMenuRootState)
                        : action.playlistMenuRootState,
            };
        case 'set-stream-info':
            return { ...state, streamInfoItem: action.streamInfoItem };
        default:
            return state;
    }
};

export type UseMediaOverlaysOptions = {
    onCloseBookInfoSideEffects?: () => void;
};

export const useMediaOverlaysState = (options: UseMediaOverlaysOptions = {}) => {
    const [state, dispatch] = useReducer(mediaOverlaysReducer, initialMediaOverlaysState);

    const setBookInfoState = useCallback(
        (bookInfoState: BookInfoState | ((current: BookInfoState) => BookInfoState)) => {
            dispatch({ type: 'set-book-info', bookInfoState });
        },
        [],
    );

    const closeBookInfo = useCallback(() => {
        options.onCloseBookInfoSideEffects?.();
        dispatch({ type: 'set-book-info', bookInfoState: { status: 'idle' } });
    }, [options.onCloseBookInfoSideEffects]);

    const setContextMenuTarget = useCallback((contextMenuTarget: MediaContextMenuTarget | null) => {
        dispatch({ type: 'set-context-menu-target', contextMenuTarget });
    }, []);

    const setContextMenuFeedback = useCallback((contextMenuFeedback: string | null) => {
        dispatch({ type: 'set-context-menu-feedback', contextMenuFeedback });
    }, []);

    const setStreamInfoItem = useCallback(
        (streamInfoItem: AndroidRecentContentSourceItem | null) => {
            dispatch({ type: 'set-stream-info', streamInfoItem });
        },
        [],
    );

    const setPlaylistMenuRoot = useCallback((playlistMenuRoot: PlaylistMenuRoot) => {
        dispatch({ type: 'set-playlist-menu-root', playlistMenuRoot });
    }, []);

    const setPlaylistMenuRootState = useCallback(
        (
            playlistMenuRootState:
                | PlaylistMenuRootState
                | ((current: PlaylistMenuRootState) => PlaylistMenuRootState),
        ) => {
            dispatch({ type: 'set-playlist-menu-root-state', playlistMenuRootState });
        },
        [],
    );

    return {
        ...state,
        closeBookInfo,
        setBookInfoState,
        setContextMenuFeedback,
        setContextMenuTarget,
        setPlaylistMenuRoot,
        setPlaylistMenuRootState,
        setStreamInfoItem,
    };
};

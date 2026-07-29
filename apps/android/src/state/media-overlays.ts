
import { useStoreSelector } from './use-store-selector';
import { type MobileMediaTrack } from '@samo/core/mobile';

import { type MediaContextMenuTarget } from '../contexts/media-context-menu';
import { type BookInfoState } from '../types/book-info';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type PlaylistMenuRoot =
    | {
          collectionItem: AndroidRecentContentSourceItem;
          kind: 'collection';
          mode?: 'add' | 'create';
          sourceId: string;
      }
    | {
          kind: 'standalone';
          sourceId: string;
      }
    | {
          kind: 'track';
          mode?: 'add' | 'create';
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

// ---------------------------------------------------------------------------
// Module-level singleton store (same pattern as app-session.ts / playback-store.ts).
//
// Previously a per-call useReducer inside `useMediaOverlaysState`, which meant
// every context-menu open, playlist-menu toggle, or book-info display
// dispatched into whichever component hosted the hook — typically App.tsx —
// causing the entire tree to re-render. Lifting to a module-level store lets
// every consumer share one copy AND lets components subscribe to fine-grained
// slices via useMediaOverlaysSelector.
// ---------------------------------------------------------------------------

let mediaOverlaysState: MediaOverlaysState = initialMediaOverlaysState;
const mediaOverlaysListeners = new Set<() => void>();

const dispatchMediaOverlays = (action: MediaOverlaysAction): void => {
    const next = mediaOverlaysReducer(mediaOverlaysState, action);
    if (Object.is(next, mediaOverlaysState)) {
        return;
    }
    mediaOverlaysState = next;
    mediaOverlaysListeners.forEach((listener) => listener());
};

const subscribeMediaOverlays = (listener: () => void): (() => void) => {
    mediaOverlaysListeners.add(listener);
    return () => {
        mediaOverlaysListeners.delete(listener);
    };
};

const getMediaOverlaysState = () => mediaOverlaysState;

// Module-level setters — stable identity, no useCallback needed.
const setBookInfoState = (
    bookInfoState: BookInfoState | ((current: BookInfoState) => BookInfoState),
) => dispatchMediaOverlays({ type: 'set-book-info', bookInfoState });

const setContextMenuTarget = (contextMenuTarget: MediaContextMenuTarget | null) =>
    dispatchMediaOverlays({ type: 'set-context-menu-target', contextMenuTarget });

const setContextMenuFeedback = (contextMenuFeedback: string | null) =>
    dispatchMediaOverlays({ type: 'set-context-menu-feedback', contextMenuFeedback });

const setStreamInfoItem = (streamInfoItem: AndroidRecentContentSourceItem | null) =>
    dispatchMediaOverlays({ type: 'set-stream-info', streamInfoItem });

const setPlaylistMenuRoot = (playlistMenuRoot: PlaylistMenuRoot) =>
    dispatchMediaOverlays({ type: 'set-playlist-menu-root', playlistMenuRoot });

const setPlaylistMenuRootState = (
    playlistMenuRootState:
        | PlaylistMenuRootState
        | ((current: PlaylistMenuRootState) => PlaylistMenuRootState),
) => dispatchMediaOverlays({ type: 'set-playlist-menu-root-state', playlistMenuRootState });

// Module-level exports so event handlers and self-subscribing hosts can
// read/write overlay state without the monolith hook.
export const getMediaOverlays = getMediaOverlaysState;
export {
    setBookInfoState,
    setContextMenuFeedback,
    setContextMenuTarget,
    setPlaylistMenuRoot,
    setPlaylistMenuRootState,
    setStreamInfoItem,
};

/**
 * Subscribe to a single slice of the overlays state. Consumers that only need
 * one field (e.g. context menu target) re-render when THAT field changes
 * instead of on every overlay state update.
 */
export const useMediaOverlaysSelector = <Selected>(
    selector: (state: MediaOverlaysState) => Selected,
): Selected => useStoreSelector(subscribeMediaOverlays, () => mediaOverlaysState, selector);

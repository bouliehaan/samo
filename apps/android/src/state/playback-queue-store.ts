import { type MobilePlayableAudio } from '@samo/core/mobile';

import { useStoreSelector } from './use-store-selector';

export type AndroidPlaybackQueue = {
    index: number;
    items: MobilePlayableAudio[];
    /** Playlist queue: do not mark individual tracks as recently played on the server. */
    omitTrackRecentlyPlayed?: boolean;
    samoPlaylistId?: string;
};

// The single source of truth for the JS-owned playback queue. This used to be a
// React ref (`playbackQueueRef.current`) threaded through three hooks plus a
// manual `forcePlaybackQueueRender()` counter in app-session to nudge the UI
// when the ref mutated — React couldn't observe a ref, so the counter was a
// workaround. Backing the queue with a real external store makes it observable:
// `setPlaybackQueue` notifies subscribers directly, so the force-render hack is
// gone and any component can read the live queue with `usePlaybackQueue()`.

let playbackQueue: AndroidPlaybackQueue | null = null;
const listeners = new Set<() => void>();

export const getPlaybackQueue = (): AndroidPlaybackQueue | null => playbackQueue;

export const setPlaybackQueue = (
    next:
        | AndroidPlaybackQueue
        | null
        | ((current: AndroidPlaybackQueue | null) => AndroidPlaybackQueue | null),
): void => {
    const value = typeof next === 'function' ? next(playbackQueue) : next;
    if (Object.is(value, playbackQueue)) {
        return;
    }
    playbackQueue = value;
    listeners.forEach((listener) => listener());
};

export const subscribePlaybackQueue = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const identity = (state: AndroidPlaybackQueue | null) => state;

/** Subscribe a component to the live playback queue (re-renders on every change). */
export const usePlaybackQueue = (): AndroidPlaybackQueue | null =>
    useStoreSelector(subscribePlaybackQueue, getPlaybackQueue, identity);

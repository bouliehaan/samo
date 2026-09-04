import { type MobilePlayableAudio } from '@samo/core/mobile';

import { useStoreSelector } from './use-store-selector';

/**
 * The playlist a queue was started from, when it is one this user is actually
 * allowed to write.
 *
 * Present ONLY then: the editability question is answered once, from the
 * playlist detail at play time, because the queue outlives the page it was
 * started from and no later surface has a detail to ask. Same reason as
 * `isExploPlaylist` below.
 */
export type AndroidQueuePlaylistOrigin = {
    /** Playlist id, as the membership API addresses it. */
    id: string;
    sourceId: string;
    title: string;
    /**
     * Catalog track ids the playlist held at play time — the id space the
     * removal API speaks, NOT the `<auth>:<url>:music:<id>` playback ids the
     * queue items carry. Recorded because the queue is not the playlist: an
     * Up Next append puts tracks in the queue that were never members, and
     * offering to remove one of those would be a lie.
     */
    trackIds: string[];
};

export type AndroidPlaybackQueue = {
    /** See {@link AndroidQueuePlaylistOrigin}. */
    editablePlaylist?: AndroidQueuePlaylistOrigin;
    index: number;
    items: MobilePlayableAudio[];
    /**
     * The playlist this queue was started from is the server-managed Explore
     * drop, whose files the weekly rotation deletes. Decided once, from the
     * playlist detail at play time, because the surfaces that need it later —
     * the fullscreen player above all — never see that detail.
     */
    isExploPlaylist?: boolean;
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

/**
 * Drop a track from the recorded playlist origin once it has left the playlist.
 *
 * The queue keeps playing it — a removal edits membership, not what is loaded —
 * so without this the still-playing track would keep offering "Remove from
 * Playlist" for a playlist it is no longer in.
 */
export const forgetPlaybackQueuePlaylistTrack = (
    playlistId: string,
    trackId: string,
): void => {
    setPlaybackQueue((current) => {
        const origin = current?.editablePlaylist;
        if (!current || !origin || origin.id !== playlistId) {
            return current;
        }
        const trackIds = origin.trackIds.filter((candidate) => candidate !== trackId);
        return trackIds.length === origin.trackIds.length
            ? current
            : { ...current, editablePlaylist: { ...origin, trackIds } };
    });
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

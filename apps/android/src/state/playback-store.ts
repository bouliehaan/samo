import { useSyncExternalStore } from 'react';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidPlaybackState } from '../types/playback';
import { getActiveTimelineSegment } from '../utils/playback-time';

type PlaybackListener = () => void;
type PlaybackUpdater = (current: AndroidPlaybackState) => AndroidPlaybackState;

let playbackState: AndroidPlaybackState = { status: 'idle' };
const listeners = new Set<PlaybackListener>();

export const getAndroidPlaybackState = () => playbackState;

export const setAndroidPlaybackState = (
    nextStateOrUpdater: AndroidPlaybackState | PlaybackUpdater,
) => {
    const nextState =
        typeof nextStateOrUpdater === 'function'
            ? nextStateOrUpdater(playbackState)
            : nextStateOrUpdater;

    if (Object.is(nextState, playbackState)) {
        return playbackState;
    }

    playbackState = nextState;
    listeners.forEach((listener) => listener());
    return playbackState;
};

export const subscribeAndroidPlaybackState = (listener: PlaybackListener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const selectAndroidPlaybackStatus = (state: AndroidPlaybackState) => state.status;

export const selectAndroidPlaybackMessage = (state: AndroidPlaybackState) =>
    state.status === 'idle' ? undefined : state.message;

export const selectActiveAndroidPlaybackItem = (
    state: AndroidPlaybackState,
): MobilePlayableAudio | null => (state.status === 'idle' ? null : state.item);

export const useAndroidPlaybackState = <Selected = AndroidPlaybackState>(
    selector: (state: AndroidPlaybackState) => Selected = (state) => state as Selected,
) =>
    useSyncExternalStore(
        subscribeAndroidPlaybackState,
        () => selector(playbackState),
        () => selector(playbackState),
    );

const MINI_PLAYER_IDLE_STATE: AndroidPlaybackState = { status: 'idle' };

let miniPlayerSnapshot: AndroidPlaybackState = MINI_PLAYER_IDLE_STATE;
let miniSnapshotChapterStart = -1;

/** Stable snapshot for useSyncExternalStore — must keep referential equality between calls. */
const getMiniPlayerSnapshot = (): AndroidPlaybackState => {
    const state = playbackState;

    if (state.status === 'idle') {
        miniPlayerSnapshot = MINI_PLAYER_IDLE_STATE;
        miniSnapshotChapterStart = -1;
        return miniPlayerSnapshot;
    }

    // Audiobooks show the CURRENT CHAPTER, which is derived from position. Fold
    // the active chapter's start-second into the equality check so the mini
    // re-renders when the book crosses a chapter boundary — but NOT on every 1s
    // position tick within the same chapter. Other sources don't use position in
    // the mini, so chapterStart stays -1 and they keep item+status stability.
    const chapterStart =
        state.item.source === 'audiobook'
            ? (getActiveTimelineSegment(state.item, state.positionMs)?.startSeconds ?? -1)
            : -1;

    if (
        miniPlayerSnapshot.status !== 'idle' &&
        miniPlayerSnapshot.item === state.item &&
        miniPlayerSnapshot.status === state.status &&
        miniPlayerSnapshot.message === state.message &&
        miniPlayerSnapshot.sessionId === state.sessionId &&
        miniSnapshotChapterStart === chapterStart
    ) {
        return miniPlayerSnapshot;
    }

    miniSnapshotChapterStart = chapterStart;
    miniPlayerSnapshot = {
        item: state.item,
        message: state.message,
        // Carry the position so the chapter resolves; the reference only changes
        // on a chapter boundary (above), so this isn't a per-tick re-render.
        positionMs: state.positionMs,
        sessionId: state.sessionId,
        status: state.status,
    };
    return miniPlayerSnapshot;
};

/**
 * Mini player cares about item + play/pause status, plus the current audiobook
 * CHAPTER (which moves with position). Skip re-renders on plain position ticks
 * that don't cross a chapter boundary.
 */
export const useMiniPlayerPlaybackState = () =>
    useSyncExternalStore(
        subscribeAndroidPlaybackState,
        getMiniPlayerSnapshot,
        getMiniPlayerSnapshot,
    );

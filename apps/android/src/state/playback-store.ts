import { useSyncExternalStore } from 'react';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidPlaybackState } from '../types/playback';

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

/** Stable snapshot for useSyncExternalStore — must keep referential equality between calls. */
const getMiniPlayerSnapshot = (): AndroidPlaybackState => {
    const state = playbackState;

    if (state.status === 'idle') {
        miniPlayerSnapshot = MINI_PLAYER_IDLE_STATE;
        return miniPlayerSnapshot;
    }

    if (
        miniPlayerSnapshot.status !== 'idle' &&
        miniPlayerSnapshot.item === state.item &&
        miniPlayerSnapshot.status === state.status &&
        miniPlayerSnapshot.message === state.message &&
        miniPlayerSnapshot.sessionId === state.sessionId
    ) {
        return miniPlayerSnapshot;
    }

    miniPlayerSnapshot = {
        item: state.item,
        message: state.message,
        sessionId: state.sessionId,
        status: state.status,
    };
    return miniPlayerSnapshot;
};

/**
 * Mini player only cares about item + play/pause status. Skip re-renders
 * when the native poll updates position/duration without changing those.
 */
export const useMiniPlayerPlaybackState = () =>
    useSyncExternalStore(
        subscribeAndroidPlaybackState,
        getMiniPlayerSnapshot,
        getMiniPlayerSnapshot,
    );

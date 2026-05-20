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

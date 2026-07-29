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

const CHROME_IDLE_STATE: AndroidPlaybackState = { status: 'idle' };

let chromeSnapshot: AndroidPlaybackState = CHROME_IDLE_STATE;
let chromeSnapshotChapterStart = -1;

/**
 * The snapshot every piece of PLAYER CHROME renders from: everything the UI
 * draws except the per-second playhead.
 *
 * The native engine ticks position at 1Hz, and each tick necessarily produces a
 * new state object. Subscribing player UI to that object means every second the
 * whole tree re-renders — for the full-screen player that is the largest
 * component in the app rebuilding itself once a second, forever, while a song
 * plays. Nothing it draws actually changed: the artwork, the title, the
 * controls and the queue all look identical one tick to the next.
 *
 * So chrome reads THIS instead, and it holds referential identity across plain
 * ticks. Position is still carried — the title/queue need it to resolve which
 * audiobook chapter is current — but the reference only turns over when the
 * chapter actually changes, which is the granularity chrome renders at. Leaves
 * that genuinely draw a moving playhead (the elapsed label, the seek bar) take
 * `useAndroidPlaybackPositionMs` instead and re-render alone.
 *
 * Must keep referential equality between calls: useSyncExternalStore compares
 * with Object.is and would otherwise loop.
 */
const getPlaybackChromeSnapshot = (): AndroidPlaybackState => {
    const state = playbackState;

    if (state.status === 'idle') {
        chromeSnapshot = CHROME_IDLE_STATE;
        chromeSnapshotChapterStart = -1;
        return chromeSnapshot;
    }

    // Audiobooks show the CURRENT CHAPTER, which is derived from position. Fold
    // the active chapter's start-second into the equality check so chrome
    // re-renders when the book crosses a chapter boundary — but NOT on every 1s
    // position tick within the same chapter. Other sources don't derive anything
    // from position here, so chapterStart stays -1 and they keep item+status
    // stability.
    const chapterStart =
        state.item.source === 'audiobook'
            ? (getActiveTimelineSegment(state.item, state.positionMs)?.startSeconds ?? -1)
            : -1;

    if (
        chromeSnapshot.status !== 'idle' &&
        chromeSnapshot.item === state.item &&
        chromeSnapshot.status === state.status &&
        chromeSnapshot.message === state.message &&
        chromeSnapshot.sessionId === state.sessionId &&
        // Compared BY VALUE: the reducer re-stamps durationMs on ticks, but the
        // number is identical within a track, so this doesn't invalidate.
        chromeSnapshot.durationMs === state.durationMs &&
        chromeSnapshot.bitPerfect === state.bitPerfect &&
        chromeSnapshot.deviceInfo === state.deviceInfo &&
        chromeSnapshotChapterStart === chapterStart
    ) {
        return chromeSnapshot;
    }

    chromeSnapshotChapterStart = chapterStart;
    chromeSnapshot = {
        bitPerfect: state.bitPerfect,
        deviceInfo: state.deviceInfo,
        durationMs: state.durationMs,
        item: state.item,
        message: state.message,
        // Carry the position so the chapter resolves; the reference only changes
        // on a chapter boundary (above), so this isn't a per-tick re-render.
        positionMs: state.positionMs,
        sessionId: state.sessionId,
        status: state.status,
    };
    return chromeSnapshot;
};

/**
 * Mini player chrome — item, play/pause, and the current audiobook chapter.
 * Skips re-renders on plain position ticks that don't cross a boundary.
 */
export const useMiniPlayerPlaybackState = () =>
    useSyncExternalStore(
        subscribeAndroidPlaybackState,
        getPlaybackChromeSnapshot,
        getPlaybackChromeSnapshot,
    );

/**
 * Full-screen player chrome. Same snapshot as the mini — the full player draws
 * strictly more of the same state, and none of what it adds (duration, stream
 * truth, output device) moves on a position tick either.
 */
export const useFullPlayerPlaybackState = useMiniPlayerPlaybackState;

const getPlaybackPositionMs = (): number =>
    playbackState.status === 'idle' ? 0 : (playbackState.positionMs ?? 0);

/**
 * The live playhead, on its own, for the few leaves that actually draw it.
 *
 * Returns a NUMBER, so useSyncExternalStore's Object.is check makes this a
 * no-op on every notification that isn't a real position move — and when it
 * does change, only the leaf that asked for it re-renders. This is the escape
 * hatch that lets the chrome snapshot above stay still.
 */
export const useAndroidPlaybackPositionMs = (): number =>
    useSyncExternalStore(
        subscribeAndroidPlaybackState,
        getPlaybackPositionMs,
        getPlaybackPositionMs,
    );

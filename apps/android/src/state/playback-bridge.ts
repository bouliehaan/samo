import { type MutableRefObject } from 'react';
import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AbsProgressContext } from '../services/abs-progress';
import { type AndroidPlayItemOptions } from '../hooks/use-android-native-playback';

/**
 * The playback engine's imperative surface. `useAndroidNativePlayback` and
 * `useAndroidPlaybackControls` run once inside <PlaybackEngine/>; everything
 * else in the app (media handlers, sync, hosts) drives playback through this
 * registry instead of prop-drilling callbacks out of App.tsx. Same pattern as
 * the existing registerNavigatePlayback, widened to the whole engine.
 */
export type PlaybackBridge = {
    absContextRef: MutableRefObject<AbsProgressContext | null>;
    cycleRepeatMode: () => void;
    handlePlayItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    navigatePlayback: (direction: -1 | 1) => Promise<void>;
    playQueueIndexNatively: (targetIndex: number) => Promise<boolean>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    seekPlayback: (positionMs: number) => Promise<void>;
    skipPlayback: (offsetSeconds: number) => Promise<void>;
    togglePlayback: () => Promise<void>;
    toggleShuffle: () => void;
};

let playbackBridge: PlaybackBridge | null = null;

/**
 * Called from <PlaybackEngine/>'s render body (idempotent assignment) so the
 * bridge is live before the first frame can take a tap.
 */
export const registerPlaybackBridge = (bridge: PlaybackBridge): void => {
    playbackBridge = bridge;
};

export const getPlaybackBridge = (): PlaybackBridge => {
    if (!playbackBridge) {
        // Only reachable if a handler fires before the first App render
        // completes, which no user gesture can do.
        throw new Error('Playback engine is not mounted yet');
    }
    return playbackBridge;
};

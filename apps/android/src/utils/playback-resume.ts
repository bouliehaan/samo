import { type MobilePlayableAudio } from '@samo/core/mobile';

import { type AndroidPlaybackState } from '../types/playback';

/** Resume from the live playhead when restarting the same item after a blip. */
export const getResumePositionSeconds = (
    item: MobilePlayableAudio,
    playbackState: AndroidPlaybackState,
): number | undefined => {
    const canReusePlayhead =
        playbackState.status === 'paused' ||
        playbackState.status === 'error' ||
        playbackState.status === 'buffering';

    if (
        canReusePlayhead &&
        playbackState.item.id === item.id &&
        (playbackState.positionMs ?? 0) > 0
    ) {
        return Math.floor((playbackState.positionMs ?? 0) / 1000);
    }

    if (item.initialPositionSeconds && item.initialPositionSeconds > 0) {
        return item.initialPositionSeconds;
    }

    return undefined;
};

export const withResumePosition = (
    item: MobilePlayableAudio,
    positionSeconds: number | undefined,
): MobilePlayableAudio => {
    if (!positionSeconds || positionSeconds <= 0) {
        return item;
    }

    return {
        ...item,
        initialPositionSeconds: positionSeconds,
    };
};

export const shouldAutoRecoverPlayback = (source: MobilePlayableAudio['source'] | undefined) =>
    source === 'podcast' || source === 'audiobook' || source === 'music';

import {
    applySamoPodcastStreamResume,
    isSamoPodcastPlayback,
    type MobilePlayableAudio,
    parsePodcastPlaybackEpisodeId,
    parsePodcastPlaybackShowId,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { loadAbsCurrentProgress } from '../services/abs-progress';
import { type AndroidPlaybackState } from '../types/playback';

import { isSamoAudiobookPlayback } from './samo-audiobook-playback';

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

/** Resume from the live playhead when restarting the same item after a blip. */
export const getResumePositionSeconds = (
    item: MobilePlayableAudio,
    playbackState: AndroidPlaybackState,
): number | undefined => {
    const canReusePlayhead =
        playbackState.status === 'paused' ||
        playbackState.status === 'error' ||
        playbackState.status === 'buffering';

    if (isSamoAudiobookPlayback(item) || isSamoPodcastPlayback(item)) {
        const streamOrigin = item.progressOffsetSeconds ?? 0;
        const currentOrigin =
            playbackState.status !== 'idle'
                ? (playbackState.item.progressOffsetSeconds ?? 0)
                : streamOrigin;

        if (
            canReusePlayhead &&
            playbackState.item.id === item.id &&
            Math.abs(currentOrigin - streamOrigin) < 2 &&
            (playbackState.positionMs ?? 0) > 0
        ) {
            return Math.floor((playbackState.positionMs ?? 0) / 1000);
        }

        return 0;
    }

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

/** Reload Samo/ABS long-form progress before starting a stream URL (URLs do not carry position). */
export const refreshPlayableResumeFromServer = async (
    item: MobilePlayableAudio,
    serverConnections: ServerAuthenticationResult[],
): Promise<MobilePlayableAudio> => {
    if (item.source !== 'podcast' && item.source !== 'audiobook') {
        return item;
    }

    const authentication = findServerAuthenticationForSource(serverConnections, {
        id: item.contentSourceId,
    });
    if (!authentication || authentication.type !== ServerType.SAMO) {
        return item;
    }

    if (item.source === 'podcast') {
        const episodeId = parsePodcastPlaybackEpisodeId(item.id);
        const showId = parsePodcastPlaybackShowId(item.id);
        if (!episodeId || !showId) {
            return item;
        }

        const progress = await loadAbsCurrentProgress(authentication, showId, episodeId);
        if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0 && !progress.isFinished) {
            if (authentication.type === ServerType.SAMO) {
                const streamToken = await ensureSamoStreamToken(authentication, samoFetch).catch(
                    () => undefined,
                );
                return applySamoPodcastStreamResume(
                    item,
                    progress.currentTimeSeconds,
                    authentication,
                    streamToken,
                );
            }
            return withResumePosition(item, progress.currentTimeSeconds);
        }
        return item;
    }

    const audiobookMatch = item.id.match(/:audiobook:([^:]+)$/);
    const itemId = audiobookMatch?.[1];
    if (!itemId) {
        return item;
    }

    const progress = await loadAbsCurrentProgress(authentication, itemId);
    if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0 && !progress.isFinished) {
        return withResumePosition(item, progress.currentTimeSeconds);
    }

    return item;
};

export const shouldAutoRecoverPlayback = (source: MobilePlayableAudio['source'] | undefined) =>
    source === 'podcast' || source === 'audiobook' || source === 'music';

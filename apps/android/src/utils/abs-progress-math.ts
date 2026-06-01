import {
    parsePodcastPlaybackEpisodeId,
    parsePodcastPlaybackShowId,
    parseSamoAudiobookIdFromPlaybackId,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { type AbsProgressContext } from '../services/abs-progress';
import { clamp } from './math';

export const getAbsProgressSeconds = (
    context: AbsProgressContext,
    positionMs: number | undefined,
    item: MobilePlayableAudio | undefined,
): number => {
    const offsetSeconds = item?.progressOffsetSeconds ?? 0;
    const positionSeconds = Math.max(0, (positionMs ?? 0) / 1000);
    const absoluteSeconds = offsetSeconds + positionSeconds;

    return context.durationSeconds > 0
        ? clamp(absoluteSeconds, 0, context.durationSeconds)
        : absoluteSeconds;
};

export const getPlayerPositionMsForAbsProgress = (
    absoluteSeconds: number,
    item: Pick<MobilePlayableAudio, 'progressOffsetSeconds'> | undefined,
): number => Math.max(0, (absoluteSeconds - (item?.progressOffsetSeconds ?? 0)) * 1000);

/** Resume position encoded in the Samo stream URL (podcasts + audiobooks). */
export const getPlayableStreamResumeSeconds = (item: MobilePlayableAudio): number =>
    Math.max(0, Math.floor(item.progressOffsetSeconds ?? item.initialPositionSeconds ?? 0));

/**
 * Progress sync context for any long-form play path (home, detail, mini-player).
 * Detail navigation still sets this explicitly; playQueuedItem uses this as fallback.
 */
export const buildAbsProgressContextFromPlayable = (
    item: MobilePlayableAudio,
    authentications: ServerAuthenticationResult[],
): AbsProgressContext | null => {
    if (item.source !== 'podcast' && item.source !== 'audiobook') {
        return null;
    }

    const authentication = findServerAuthenticationForSource(authentications, {
        id: item.contentSourceId,
    });
    if (
        !authentication ||
        (authentication.type !== ServerType.SAMO &&
            authentication.type !== ServerType.AUDIOBOOKSHELF)
    ) {
        return null;
    }

    if (item.source === 'audiobook' && authentication.type === ServerType.SAMO) {
        const itemId = parseSamoAudiobookIdFromPlaybackId(item.id);
        if (!itemId) {
            return null;
        }
        return {
            authentication,
            durationSeconds: item.durationSeconds ?? 0,
            episodeId: undefined,
            itemId,
        };
    }

    if (item.source === 'podcast' && authentication.type === ServerType.SAMO) {
        const episodeId = parsePodcastPlaybackEpisodeId(item.id);
        const showId = parsePodcastPlaybackShowId(item.id);
        if (!episodeId || !showId) {
            return null;
        }
        return {
            authentication,
            durationSeconds: item.durationSeconds ?? 0,
            episodeId,
            itemId: showId,
        };
    }

    return null;
};

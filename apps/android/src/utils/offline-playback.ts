import {
    mimeFromAudioFileExt,
    parsePodcastPlaybackEpisodeId,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import {
    getLocalUriForTrack,
    type OfflineAudiobookFile,
} from '../services/download-manager';

export type AudiobookFileTimeSegment = {
    durationSeconds?: number;
    ino: string;
    startOffsetSeconds: number;
};

export const pickAudiobookFileIndexForTime = (
    files: readonly AudiobookFileTimeSegment[],
    bookTimeSeconds: number,
): number => {
    if (files.length === 0) {
        return 0;
    }
    let chosen = 0;
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (file.startOffsetSeconds <= bookTimeSeconds) {
            chosen = i;
        } else {
            break;
        }
    }
    return chosen;
};

export const pickAudiobookQueueIndexForBookTime = (
    items: MobilePlayableAudio[],
    bookTimeSeconds: number,
): number => {
    if (items.length === 0) {
        return 0;
    }
    let chosen = 0;
    for (let i = 0; i < items.length; i += 1) {
        const offset = items[i]?.progressOffsetSeconds ?? 0;
        if (offset <= bookTimeSeconds) {
            chosen = i;
        } else {
            break;
        }
    }
    return chosen;
};

const buildAudiobookFilePlayable = (
    detail: MobileMediaDetail,
    file: AudiobookFileTimeSegment & { castUrl?: string; ino: string },
    initialPositionSeconds: number,
    streamUrl: string,
    idSuffix: string,
    timelineDurationSeconds?: number,
): MobilePlayableAudio => ({
    artworkUrl: detail.artworkUrl,
    castMimeType: mimeFromCastUri(streamUrl),
    castUrl: file.castUrl,
    contentSourceId: detail.source.id,
    durationSeconds: file.durationSeconds,
    id: `${detail.source.type}:${detail.source.url}:audiobook:${detail.id}:${idSuffix}:${file.ino}`,
    initialPositionSeconds,
    progressOffsetSeconds: file.startOffsetSeconds,
    quality: {
        container: null,
        deliveryKind: 'unknown',
        losslessRequired: false,
        serverTranscodeRequested: false,
    },
    source: 'audiobook',
    subtitle: detail.subtitle,
    timelineDurationSeconds,
    title: detail.title,
    url: streamUrl,
});

/**
 * Book-global timeline length for a downloaded multi-file book: the end of its
 * last file. Downloaded queue items carry book-global offsets and chapters just
 * like streamed ones, so they need the same whole-book duration or the seek bar
 * collapses to the current file (see MobilePlayableAudio.timelineDurationSeconds).
 */
export const audiobookFilesTimelineDurationSeconds = (
    files: readonly AudiobookFileTimeSegment[],
): number | undefined => {
    const lastFile = files[files.length - 1];
    if (!lastFile) {
        return undefined;
    }
    const end = lastFile.startOffsetSeconds + (lastFile.durationSeconds ?? 0);
    return end > 0 ? end : undefined;
};

export const buildOfflineAudiobookPlayable = (
    detail: MobileMediaDetail,
    file: OfflineAudiobookFile,
    initialPositionSeconds: number,
    authentication?: ServerAuthenticationResult,
    timelineDurationSeconds?: number,
): MobilePlayableAudio => {
    return buildAudiobookFilePlayable(
        detail,
        file,
        initialPositionSeconds,
        file.localUri,
        'offline',
        timelineDurationSeconds,
    );
};

export const buildAudiobookFilePlaybackQueue = <T extends AudiobookFileTimeSegment>(
    detail: MobileMediaDetail,
    files: readonly T[],
    bookTimeSeconds: number,
    buildItem: (file: T, initialPositionSeconds: number) => MobilePlayableAudio,
): { index: number; items: MobilePlayableAudio[] } => {
    const index = pickAudiobookFileIndexForTime(files, bookTimeSeconds);
    const fileStart = files[index]?.startOffsetSeconds ?? 0;
    const initialOffsetSeconds = Math.max(0, bookTimeSeconds - fileStart);
    return {
        index,
        items: files.map((file, fileIndex) =>
            buildItem(file, fileIndex === index ? initialOffsetSeconds : 0),
        ),
    };
};

export const buildOfflinePodcastEpisodePlayable = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    localUri: string,
    sourceUrl?: string,
    authentication?: ServerAuthenticationResult,
): MobilePlayableAudio => {
    const itemId = track.itemId ?? detail.id;
    const episodeId = track.episodeId ?? track.id;
    return {
        artworkUrl: track.artworkUrl ?? detail.artworkUrl,
        castMimeType: mimeFromCastUri(localUri),
        // samo episode source URLs are self-authenticating (stream_token in the
        // query), so the cast leg can use the original URL as-is.
        castUrl: sourceUrl,
        contentSourceId: detail.source.id,
        durationSeconds: track.durationSeconds,
        id: `${detail.source.type}:${detail.source.url}:podcast:${itemId}:${episodeId}`,
        initialPositionSeconds: track.startSeconds,
        publishedAt: track.publishedAt,
        quality: {
            container: null,
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source: 'podcast',
        subtitle: track.subtitle ?? detail.title,
        title: track.title,
        url: localUri,
    };
};

export const mimeFromCastUri = (localUri: string | undefined): string | undefined => {
    if (!localUri) return undefined;
    const match = localUri.match(/\.([a-z0-9]+)(?:$|[?#])/i);
    return mimeFromAudioFileExt(match?.[1]) ?? undefined;
};

export const resolveLocalPlayback = async (
    item: MobilePlayableAudio,
): Promise<MobilePlayableAudio> => {
    const sourceId = item.contentSourceId ?? item.id.match(/^([^:]+:[^:]+):/)?.[1];
    const innerIdMatch = item.id.match(/:(music|audiobook|podcast(?:-episode)?|radio):(.+)$/);
    if (!sourceId || !innerIdMatch) {
        return item;
    }
    const [, sourceKind, innerId] = innerIdMatch;
    const lookupTrackId =
        sourceKind === 'podcast' || sourceKind === 'podcast-episode'
            ? (parsePodcastPlaybackEpisodeId(item.id) ?? innerId.split(':').pop() ?? innerId)
            : innerId;
    try {
        const localUri = await getLocalUriForTrack(lookupTrackId, sourceId);
        if (!localUri) {
            return item;
        }
        return { ...item, httpHeaders: undefined, url: localUri };
    } catch {
        return item;
    }
};

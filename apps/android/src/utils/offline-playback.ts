import {
    appendAudiobookshelfAuthToken,
    mimeFromAudiobookshelfExt,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import {
    getLocalUriForTrack,
    type OfflineAudiobookFile,
} from '../services/download-manager';

export const pickAudiobookFileIndexForTime = (
    files: OfflineAudiobookFile[],
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

export const buildOfflineAudiobookPlayable = (
    detail: MobileMediaDetail,
    file: OfflineAudiobookFile,
    initialPositionSeconds: number,
    authentication?: ServerAuthenticationResult,
): MobilePlayableAudio => {
    return {
        artworkUrl: detail.artworkUrl,
        castMimeType: mimeFromCastUri(file.localUri),
        castUrl: authentication
            ? appendAudiobookshelfAuthToken(file.sourceUrl, authentication.credential)
            : undefined,
        contentSourceId: detail.source.id,
        durationSeconds: file.durationSeconds,
        id: `${detail.source.type}:${detail.source.url}:audiobook:${detail.id}:offline:${file.ino}`,
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
        title: detail.title,
        url: file.localUri,
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
        castUrl:
            sourceUrl && authentication
                ? appendAudiobookshelfAuthToken(sourceUrl, authentication.credential)
                : undefined,
        contentSourceId: detail.source.id,
        durationSeconds: track.durationSeconds,
        id: `${detail.source.type}:${detail.source.url}:podcast:${itemId}:${episodeId}`,
        initialPositionSeconds: track.startSeconds,
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
    return mimeFromAudiobookshelfExt(match?.[1]) ?? undefined;
};

export const resolveLocalPlayback = async (
    item: MobilePlayableAudio,
): Promise<MobilePlayableAudio> => {
    const sourceId = item.contentSourceId ?? item.id.match(/^([^:]+:[^:]+):/)?.[1];
    const innerIdMatch = item.id.match(/:(music|audiobook|podcast|radio):(.+)$/);
    if (!sourceId || !innerIdMatch) {
        return item;
    }
    const [, sourceKind, innerId] = innerIdMatch;
    const lookupTrackId =
        sourceKind === 'podcast' ? (innerId.split(':').pop() ?? innerId) : innerId;
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

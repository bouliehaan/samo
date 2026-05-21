import {
    addMobileTracksToPlaylist,
    getMobileMediaDetailErrorMessage,
    loadAudiobookshelfPlayback,
    loadMobileMediaDetail,
    type MobileHomeItem,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { getPersistedServerAuthKey } from './persisted-server';

export type AndroidMediaDetailState =
    | { detail: MobileMediaDetail; status: 'loaded' }
    | { itemTitle: string; message: string; status: 'error' }
    | {
          itemArtworkUrl?: string;
          itemTitle: string;
          itemType?: MobileHomeItem['type'];
          status: 'loading';
      }
    | { status: 'idle' };

type AndroidSelectableMediaItem = MobileHomeItem | MobileSearchItem;

const findAuthenticationForSource = (
    authentications: ServerAuthenticationResult[],
    sourceId: string | undefined,
) => {
    return authentications.find((candidate) => getPersistedServerAuthKey(candidate) === sourceId);
};

const toDetailType = (type: AndroidSelectableMediaItem['type']) => {
    const normalizedType = String(type);

    if (normalizedType === MobileMediaDetailType.ALBUM) {
        return MobileMediaDetailType.ALBUM;
    }

    if (normalizedType === MobileMediaDetailType.ARTIST) {
        return MobileMediaDetailType.ARTIST;
    }

    if (normalizedType === MobileMediaDetailType.PLAYLIST) {
        return MobileMediaDetailType.PLAYLIST;
    }

    if (normalizedType === MobileMediaDetailType.AUDIOBOOK) {
        return MobileMediaDetailType.AUDIOBOOK;
    }

    if (normalizedType === MobileMediaDetailType.PODCAST) {
        return MobileMediaDetailType.PODCAST;
    }

    return null;
};

const getTimelineEndSeconds = (segments: MobilePlaybackSegment[] | undefined) => {
    return segments?.reduce((end, segment) => {
        const segmentEnd =
            segment.durationSeconds !== undefined
                ? segment.startSeconds + segment.durationSeconds
                : segment.startSeconds;

        return Math.max(end, segmentEnd);
    }, 0);
};

const getTrackTimelineSegments = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
): MobilePlaybackSegment[] | undefined => {
    if (track.timelineSegments && track.timelineSegments.length > 0) {
        return track.timelineSegments;
    }

    if (detail.type !== MobileMediaDetailType.AUDIOBOOK) {
        return undefined;
    }

    const segments = detail.tracks
        .filter((candidate) => candidate.startSeconds !== undefined)
        .map((candidate, index) => ({
            durationSeconds: candidate.durationSeconds,
            id: candidate.id,
            startSeconds: candidate.startSeconds ?? 0,
            title: candidate.title || `Chapter ${index + 1}`,
        }));

    return segments.length > 1 ? segments : undefined;
};

const getTrackDurationSeconds = (
    track: MobileMediaTrack,
    timelineSegments: MobilePlaybackSegment[] | undefined,
) => {
    return getTimelineEndSeconds(timelineSegments) || track.durationSeconds;
};

const withPlaybackTimeline = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    playback: MobilePlayableAudio,
): MobilePlayableAudio => {
    const timelineSegments = getTrackTimelineSegments(detail, track);

    return {
        ...playback,
        durationSeconds:
            playback.durationSeconds ?? getTrackDurationSeconds(track, timelineSegments),
        timelineSegments: playback.timelineSegments ?? timelineSegments,
    };
};

export const loadAndroidMediaDetail = async (
    authentications: ServerAuthenticationResult[],
    item: AndroidSelectableMediaItem,
): Promise<AndroidMediaDetailState> => {
    const detailType = toDetailType(item.type);

    if (!detailType) {
        return {
            itemTitle: item.title,
            message: 'This item does not have an Android detail view yet.',
            status: 'error',
        };
    }

    const authentication = findAuthenticationForSource(authentications, item.source?.id);

    if (!authentication) {
        return {
            itemTitle: item.title,
            message: 'The server for this item is no longer connected.',
            status: 'error',
        };
    }

    try {
        return {
            detail: await loadMobileMediaDetail({
                authentication,
                id: item.id,
                type: detailType,
            }),
            status: 'loaded',
        };
    } catch (error) {
        return {
            itemTitle: item.title,
            message: getMobileMediaDetailErrorMessage(error),
            status: 'error',
        };
    }
};

export const loadAndroidMediaTrackPlayback = async (
    authentications: ServerAuthenticationResult[],
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
): Promise<MobilePlayableAudio> => {
    if (track.playback) {
        return withPlaybackTimeline(detail, track, track.playback);
    }

    const authentication = findAuthenticationForSource(authentications, detail.source.id);

    if (!authentication) {
        throw new Error('The server for this item is no longer connected.');
    }

    const timelineSegments = getTrackTimelineSegments(detail, track);

    return loadAudiobookshelfPlayback({
        artworkUrl: track.artworkUrl ?? detail.artworkUrl,
        authentication,
        durationSeconds: getTrackDurationSeconds(track, timelineSegments),
        episodeId: track.episodeId,
        itemId: track.itemId ?? detail.id,
        startSeconds: track.startSeconds,
        subtitle: track.subtitle ?? detail.title,
        timelineSegments,
        title: track.title,
    });
};

export const addAndroidMediaTrackToPlaylist = async (
    authentications: ServerAuthenticationResult[],
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    playlist: MobileHomeItem,
): Promise<void> => {
    if (track.playback?.source !== 'music') {
        throw new Error('Only music tracks can be added to playlists from Android right now.');
    }

    if (detail.source.id !== playlist.source?.id) {
        throw new Error('Choose a playlist from the same music server.');
    }

    const authentication = findAuthenticationForSource(authentications, detail.source.id);

    if (!authentication) {
        throw new Error('The server for this track is no longer connected.');
    }

    await addMobileTracksToPlaylist({
        authentication,
        playlistId: playlist.id,
        songIds: [track.id],
    });
};

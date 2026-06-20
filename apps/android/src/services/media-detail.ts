import {
    addMobileTracksToPlaylist,
    buildSamoAudiobookQueueFromFiles,
    buildSamoPodcastEpisodePlayback,
    getMobileMediaDetailErrorMessage,
    loadMobileMediaDetail,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
    MobileSearchItemType,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';

export type AndroidMediaDetailState =
    | { detail: MobileMediaDetail; status: 'loaded' }
    | { itemTitle: string; message: string; status: 'error' }
    | {
          itemArtworkImageId?: string;
          itemArtworkUrl?: string;
          itemSource?: MobileHomeItem['source'];
          itemTitle: string;
          itemType?: MobileHomeItem['type'] | MobileSearchItem['type'];
          status: 'loading';
      }
    | { status: 'idle' };

type AndroidSelectableMediaItem = MobileHomeItem | MobileSearchItem;

const findAuthenticationForSource = (
    authentication: ServerAuthenticationResult | null,
    sourceId: string | undefined,
    source?: { id?: string; type?: ServerAuthenticationResult['type']; url?: string },
) => {
    return findServerAuthenticationForSource(authentication, {
        id: sourceId ?? source?.id,
        type: source?.type,
        url: source?.url,
    });
};

const toDetailType = (type: AndroidSelectableMediaItem['type']) => {
    const normalizedType = String(type);

    if (
        normalizedType === MobileMediaDetailType.ALBUM ||
        normalizedType === MobileHomeItemType.ALBUM ||
        normalizedType === MobileSearchItemType.ALBUM ||
        normalizedType === MobileSearchItemType.SONG
    ) {
        return MobileMediaDetailType.ALBUM;
    }

    if (
        normalizedType === MobileMediaDetailType.ARTIST ||
        normalizedType === MobileHomeItemType.ARTIST ||
        normalizedType === MobileSearchItemType.ARTIST
    ) {
        return MobileMediaDetailType.ARTIST;
    }

    if (
        normalizedType === MobileMediaDetailType.PLAYLIST ||
        normalizedType === MobileHomeItemType.PLAYLIST ||
        normalizedType === MobileSearchItemType.PLAYLIST
    ) {
        return MobileMediaDetailType.PLAYLIST;
    }

    if (
        normalizedType === MobileMediaDetailType.AUDIOBOOK ||
        normalizedType === MobileHomeItemType.AUDIOBOOK ||
        normalizedType === MobileSearchItemType.AUDIOBOOK
    ) {
        return MobileMediaDetailType.AUDIOBOOK;
    }

    if (
        normalizedType === MobileMediaDetailType.PODCAST ||
        normalizedType === MobileHomeItemType.PODCAST ||
        normalizedType === MobileHomeItemType.PODCAST_EPISODE ||
        normalizedType === MobileSearchItemType.PODCAST
    ) {
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

export const getTrackTimelineSegments = (
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
    const podcastSubtitle =
        playback.source === 'podcast' ? (detail.title || playback.subtitle) : undefined;

    return {
        ...playback,
        durationSeconds:
            playback.durationSeconds ?? getTrackDurationSeconds(track, timelineSegments),
        ...(podcastSubtitle ? { subtitle: podcastSubtitle } : {}),
        publishedAt: playback.publishedAt ?? track.publishedAt,
        timelineSegments: playback.timelineSegments ?? timelineSegments,
    };
};

export const isValidTrackPlayback = (
    playback: MobileMediaTrack['playback'],
): playback is MobilePlayableAudio =>
    Boolean(
        playback?.id &&
            playback.title &&
            playback.url &&
            playback.quality &&
            playback.source,
    );

const rebuildSamoPodcastTrackPlayback = async (
    authentication: ServerAuthenticationResult,
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
): Promise<MobilePlayableAudio> => {
    const episodeId = track.episodeId ?? track.id;
    if (!episodeId) {
        throw new Error('This episode is missing an id.');
    }

    const streamToken = await ensureSamoStreamToken(authentication).catch(() => undefined);

    const playback = buildSamoPodcastEpisodePlayback(
        authentication,
        {
            duration: track.durationSeconds,
            id: episodeId,
            name: track.title,
            podcastId: track.itemId ?? detail.id,
            title: track.title,
        },
        track.itemId ?? detail.id,
        track.artworkUrl ?? detail.artworkUrl,
        streamToken,
    );

    if (!playback) {
        throw new Error('This episode cannot be played.');
    }

    return withPlaybackTimeline(detail, track, playback);
};

export const loadAndroidMediaDetail = async (
    serverConnection: ServerAuthenticationResult | null,
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

    const authentication = findAuthenticationForSource(
        serverConnection,
        item.source?.id,
        item.source,
    );

    if (!authentication) {
        return {
            itemTitle: item.title,
            message: 'The server for this item is no longer connected.',
            status: 'error',
        };
    }

    try {
        await ensureSamoStreamToken(authentication);

        const detailId =
            item.type === MobileHomeItemType.PODCAST_EPISODE && item.containerId
                ? item.containerId
                : item.id;

        return {
            detail: await loadMobileMediaDetail({
                authentication,
                id: detailId,
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
    serverConnection: ServerAuthenticationResult | null,
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
): Promise<MobilePlayableAudio> => {
    const authentication = findAuthenticationForSource(serverConnection, detail.source.id);

    if (isValidTrackPlayback(track.playback)) {
        let playable = withPlaybackTimeline(detail, track, track.playback);

        if (
            authentication &&
            detail.type === MobileMediaDetailType.AUDIOBOOK &&
            detail.audiobookFiles?.length
        ) {
            const streamToken = await ensureSamoStreamToken(authentication).catch(() => undefined);
            const bookStart = track.startSeconds ?? playable.progressOffsetSeconds ?? 0;
            // Whole-file/local-seek model: pick the file that contains this book
            // position and play it from the in-file remainder. The caller
            // (use-android-media-handlers) builds the full multi-file queue; this
            // single-item path covers callers that only need one playable.
            const queue = buildSamoAudiobookQueueFromFiles(authentication, {
                artworkUrl: detail.artworkUrl,
                audiobookId: detail.id,
                bookStartSeconds: bookStart,
                files: detail.audiobookFiles,
                streamToken,
                subtitle: detail.authorsSummary ?? detail.subtitle,
                timelineSegments: getTrackTimelineSegments(detail, track),
                title: detail.title,
            });
            const active = queue?.items[queue.index];
            if (active) {
                playable = active;
            }
        }

        return playable;
    }

    if (!authentication) {
        throw new Error('The server for this item is no longer connected.');
    }

    if (detail.type === MobileMediaDetailType.PODCAST) {
        return rebuildSamoPodcastTrackPlayback(authentication, detail, track);
    }

    // Music tracks always arrive with a valid `track.playback` (built by the
    // Samo mappers / synthesizeMusicPlayback), audiobooks-with-files are served
    // by the queue path above, and podcasts are handled just above — so a Samo
    // track that reaches here has no playable representation.
    throw new Error('This track cannot be played.');
};

export const addAndroidMediaTrackToPlaylist = async (
    serverConnection: ServerAuthenticationResult | null,
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

    const authentication = findAuthenticationForSource(serverConnection, detail.source.id);

    if (!authentication) {
        throw new Error('The server for this track is no longer connected.');
    }

    await addMobileTracksToPlaylist({
        authentication,
        playlistId: playlist.id,
        songIds: [track.id],
    });
};

import {
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    MobileHomeSectionId,
} from '@samo/core/mobile';

import { type AndroidHomeContentState } from '../services/home-content';
import { SCREEN_HEIGHT } from '../theme/layout';
import { looksLikeUrl } from './playback-time';

export const getDetailTypeLabel = (type: MobileMediaDetailType) => {
    if (type === MobileMediaDetailType.AUDIOBOOK) return 'Audiobook';
    if (type === MobileMediaDetailType.PODCAST) return 'Podcast';
    if (type === MobileMediaDetailType.PLAYLIST) return 'Playlist';
    if (type === MobileMediaDetailType.ARTIST) return 'Artist';
    return 'Album';
};

export const getPlaylistTargetsForDetail = (
    homeContentState: AndroidHomeContentState,
    detail: MobileMediaDetail,
) => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    return homeContentState.content.sections
        .filter((section) => section.id === MobileHomeSectionId.PLAYLISTS)
        .flatMap((section) => section.items)
        .filter(
            (item) =>
                item.type === MobileHomeItemType.PLAYLIST && item.source?.id === detail.source.id,
        );
};

export type PlaylistTrackFilter = 'all' | 'hifi';
export type PlaylistTrackSort = 'artist' | 'order' | 'title';
export const PLAYLIST_TRACK_DRAW_DISTANCE = Math.round(SCREEN_HEIGHT * 1.6);
export const getPlaylistTrackItemType = () => 'playlist-track';

export const getPlaylistTrackSearchText = (track: MobileMediaTrack): string =>
    [
        track.title,
        track.artist,
        track.album,
        track.subtitle,
        track.playback?.title,
        track.playback?.artist,
        track.playback?.album,
    ]
        .filter((value): value is string => Boolean(value))
        .join('\n')
        .toLocaleLowerCase();

import { MobileMediaDetailType, type MobileMediaTrack } from '@samo/core/mobile';

import { SCREEN_HEIGHT } from '../theme/layout';

export const getDetailTypeLabel = (type: MobileMediaDetailType) => {
    if (type === MobileMediaDetailType.AUDIOBOOK) return 'Audiobook';
    if (type === MobileMediaDetailType.PODCAST) return 'Podcast';
    if (type === MobileMediaDetailType.PLAYLIST) return 'Playlist';
    if (type === MobileMediaDetailType.ARTIST) return 'Artist';
    return 'Album';
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

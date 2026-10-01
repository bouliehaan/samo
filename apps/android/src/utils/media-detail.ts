import { type MobileMediaDetail, MobileMediaDetailType, type MobileMediaTrack } from '@samo/core/mobile';

import { SCREEN_HEIGHT } from '../theme/layout';

export const getDetailTypeLabel = (type: MobileMediaDetailType) => {
    if (type === MobileMediaDetailType.AUDIOBOOK) return 'Audiobook';
    if (type === MobileMediaDetailType.PODCAST) return 'Podcast';
    if (type === MobileMediaDetailType.PLAYLIST) return 'Playlist';
    if (type === MobileMediaDetailType.ARTIST) return 'Artist';
    return 'Album';
};

/**
 * A detail's tracks in the order its page shows them before anyone touches a
 * sort. Server playlists arrive oldest-entry-first, and a playlist opens (and
 * plays) newest entry first, so the tracks just added are the ones you land
 * on. Everything else keeps its authored order.
 */
export const getDefaultDetailTrackOrder = (detail: MobileMediaDetail): MobileMediaTrack[] =>
    detail.type === MobileMediaDetailType.PLAYLIST ? [...detail.tracks].reverse() : detail.tracks;

export type PlaylistTrackFilter = 'all' | 'hifi';
export type PlaylistTrackSort = 'artist' | 'order' | 'title';
/**
 * How far beyond the viewport FlashList keeps track rows rendered.
 *
 * This is a FRAME-COST dial, not just a memory one. Every rendered row mounts
 * three Reanimated animated views (the row's press sink, its press highlight,
 * and the ⋮ button's sink), and Reanimated re-applies EVERY mounted animated
 * prop into the shadow tree on EVERY React commit — so the per-commit cost
 * scales with rows RENDERED, not rows moving. A virtualized list commits on
 * almost every frame while recycling, so the two multiply.
 *
 * At 1.6 screens (~3940px here; FlashList's own default is 250px) a 100-track
 * playlist rendered ~58 rows, and a hard fling measured on a V60 release build
 * at 59.7% janky / p50 42ms with UPDATE_PROPS batches of ~298 instructions.
 * Rows are the only term in that we control cheaply.
 */
export const PLAYLIST_TRACK_DRAW_DISTANCE = Math.round(SCREEN_HEIGHT * 0.7);
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

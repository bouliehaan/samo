import {
    type MobileMediaTrack,
    type MobileSearchItem,
    MobileSearchItemType,
} from '@samo/core/mobile';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export const isSongSearchItem = (
    item: AndroidRecentContentSourceItem,
): item is MobileSearchItem & { type: MobileSearchItemType.SONG } =>
    (item as MobileSearchItem).type === MobileSearchItemType.SONG;

export const synthesizeTrackFromSongItem = (item: MobileSearchItem): MobileMediaTrack => ({
    album: item.album,
    albumId: item.albumId,
    artist: item.artist,
    artistId: item.artistId,
    artworkUrl: item.artworkUrl,
    id: item.id,
    playback: item.playback,
    subtitle: item.subtitle,
    title: item.title,
});

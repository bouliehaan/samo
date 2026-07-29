import {
    type MobileHomeItem,
    MobileHomeItemType,
    MobileMediaDetailType,
    type MobileMediaDetail,
    type MobileMediaTrack,
} from '@samo/core/mobile';

import { type MediaContextMenuKind } from '../contexts/media-context-menu';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export const inferContextMenuKindFromItem = (
    item: AndroidRecentContentSourceItem,
): Exclude<MediaContextMenuKind, 'song'> | null => {
    switch (item.type) {
        case MobileHomeItemType.ALBUM:
            return 'album';
        case MobileHomeItemType.ARTIST:
            return 'artist';
        case MobileHomeItemType.AUDIOBOOK:
            return 'audiobook';
        case MobileHomeItemType.PLAYLIST:
            return 'playlist';
        case MobileHomeItemType.PODCAST:
            return 'podcast';
        case MobileHomeItemType.RADIO:
            return 'radio';
        default:
            return null;
    }
};

export const isPodcastEpisodeHomeItem = (
    item: AndroidRecentContentSourceItem,
): item is MobileHomeItem & { type: MobileHomeItemType.PODCAST_EPISODE } =>
    (item as MobileHomeItem).type === MobileHomeItemType.PODCAST_EPISODE;

/** Podcast Feed tile → the same episode "song" target the show's detail rows
 *  use, so one menu (Favorites + Download episode) serves both surfaces. */
export const synthesizeTrackFromPodcastEpisodeItem = (
    item: MobileHomeItem,
): MobileMediaTrack => ({
    artworkImageId: item.artworkImageId,
    artworkUrl: item.artworkUrl,
    // The show notes and the publish date are the whole point of Episode
    // Information. Leaving them off the synthesized track is why the sheet
    // opened from a Podcast Feed tile came up with the title and nothing else,
    // while the very same sheet opened from a show's own row was complete.
    description: item.description,
    durationSeconds: item.durationSeconds,
    episodeId: item.id,
    publishedAt: item.publishedAt,
    id: item.id,
    itemId: item.containerId,
    playback: item.playback,
    subtitle: item.subtitle,
    title: item.title,
});

/** Minimal show detail for an episode tile — enough for the download path to
 *  group the entry under the show. The feed builds episode subtitles as
 *  "Show · release date", so everything before the final separator is the
 *  show title; the episode's artwork is the show's artwork for all practical
 *  feeds. */
export const synthesizePodcastDetailFromEpisodeItem = (
    item: MobileHomeItem,
): MobileMediaDetail | null => {
    if (!item.source) {
        return null;
    }
    const parts = item.subtitle?.split(' · ') ?? [];
    const showTitle =
        (parts.length > 1 ? parts.slice(0, -1).join(' · ') : parts[0]) || item.title;
    return {
        artworkImageId: item.artworkImageId,
        artworkUrl: item.artworkUrl,
        id: item.containerId ?? item.id,
        source: item.source,
        title: showTitle,
        tracks: [],
        type: MobileMediaDetailType.PODCAST,
    };
};

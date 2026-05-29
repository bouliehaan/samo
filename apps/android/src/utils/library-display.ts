import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getDisplaySubtitle } from './playback-time';
import {
    type LibraryDisplayItem,
    type LibraryMediaType,
} from '../types/library-display';

export const getLibraryMediaType = (
    item: AndroidRecentContentSourceItem,
): LibraryMediaType | undefined => {
    if (item.type === 'album') return 'albums';
    if (item.type === 'artist') return 'artists';
    if (item.type === 'audiobook') return 'audiobooks';
    if (item.type === 'playlist') return 'playlists';
    if (item.type === 'podcast' || item.type === 'podcast-episode') return 'podcasts';
    if (item.type === 'radio') return 'radio';
    if (item.type === 'song') return 'songs';

    return undefined;
};

export const getLibraryMediaTypeLabel = (mediaType: LibraryMediaType) => {
    if (mediaType === 'albums') return 'Album';
    if (mediaType === 'artists') return 'Artist';
    if (mediaType === 'audiobooks') return 'Audiobook';
    if (mediaType === 'playlists') return 'Playlist';
    if (mediaType === 'podcasts') return 'Podcast';
    if (mediaType === 'radio') return 'Radio';
    return 'Song';
};

export const getLibraryItemSubtitle = (
    item: AndroidRecentContentSourceItem,
    mediaType: LibraryMediaType,
) => {
    if (mediaType === 'radio') {
        return 'Radio';
    }

    return [getLibraryMediaTypeLabel(mediaType), getDisplaySubtitle(item.subtitle)]
        .filter(Boolean)
        .join(' - ');
};

export const toLibraryDisplayItem = (
    item: AndroidRecentContentSourceItem,
    selectedAt = 0,
): LibraryDisplayItem | undefined => {
    const mediaType = getLibraryMediaType(item);

    if (!mediaType) {
        return undefined;
    }

    return {
        item,
        key: getRecentContentItemKey(item),
        mediaType,
        selectedAt,
    };
};

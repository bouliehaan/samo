import { MobileHomeItemType } from '@samo/core/mobile';

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

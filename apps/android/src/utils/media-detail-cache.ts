import { type MobileMediaDetail } from '@samo/core/mobile';

import {
    MEDIA_DETAIL_MEMORY_CACHE_LIMIT,
    MEDIA_DETAIL_MEMORY_TRACK_LIMIT,
} from './app-constants';

export const rememberMediaDetail = (
    cache: Map<string, MobileMediaDetail>,
    key: string,
    detail: MobileMediaDetail,
) => {
    if (detail.tracks.length > MEDIA_DETAIL_MEMORY_TRACK_LIMIT) {
        cache.delete(key);
        return;
    }
    if (cache.has(key)) {
        cache.delete(key);
    }
    cache.set(key, detail);

    while (cache.size > MEDIA_DETAIL_MEMORY_CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        if (!oldestKey) break;
        cache.delete(oldestKey);
    }
};

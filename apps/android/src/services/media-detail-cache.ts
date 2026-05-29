import { type MobileMediaDetail } from '@samo/core/mobile';

import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';

// Persists each opened media detail (album / playlist / audiobook / podcast)
// to disk so the next open is instant and works offline. Without this, an
// album you downloaded but haven't opened since launch would refuse to open
// in airplane mode because loadMobileMediaDetail throws a network error.
//
// Detail blobs can be hundreds of KB for big playlists; storing them under
// fs-storage instead of SecureStore avoids the 2KB warning and keeps writes
// cheap.

// v2 invalidates old cached playback payloads that may contain expired
// server-signed stream URLs (especially ABS `?token=...` links).
const KEY_PREFIX = 'samo.android.detail-cache.v2.';
const CACHE_WRITE_DELAY_MS = 250;
const MAX_CACHED_TRACKS = 250;
const MAX_CACHED_RELATED_ITEMS = 40;
const MAX_CACHED_TOP_TRACKS = 40;
const MAX_CACHED_BIOGRAPHY_CHARS = 4_000;
const MAX_CACHED_DETAIL_CHARS = 700_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isValidDetail = (value: unknown): value is MobileMediaDetail => {
    if (!isRecord(value)) return false;
    if (typeof value.id !== 'string') return false;
    if (typeof value.title !== 'string') return false;
    if (typeof value.type !== 'string') return false;
    if (!isRecord(value.source)) return false;
    if (!Array.isArray(value.tracks)) return false;
    return true;
};

const deferCacheWrite = (): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, CACHE_WRITE_DELAY_MS);
    });

const trimText = (value: string | undefined, maxChars: number): string | undefined => {
    if (!value || value.length <= maxChars) {
        return value;
    }
    return value.slice(0, maxChars);
};

const getCacheableDetail = (detail: MobileMediaDetail): MobileMediaDetail | null => {
    // Huge playlists/podcast feeds are exactly where JSON.stringify becomes
    // user-visible on Android. Do not persist them; the network result is
    // already in state, and cache must never make navigation or playback pay.
    if (detail.tracks.length > MAX_CACHED_TRACKS) {
        return null;
    }

    return {
        ...detail,
        appearsOnItems: detail.appearsOnItems?.slice(0, MAX_CACHED_RELATED_ITEMS),
        biography: trimText(detail.biography, MAX_CACHED_BIOGRAPHY_CHARS),
        items: detail.items?.slice(0, MAX_CACHED_RELATED_ITEMS),
        relatedArtists: detail.relatedArtists?.slice(0, MAX_CACHED_RELATED_ITEMS),
        topTracks: detail.topTracks?.slice(0, MAX_CACHED_TOP_TRACKS),
    };
};

export const loadCachedMediaDetail = async (
    cacheKey: string,
): Promise<MobileMediaDetail | null> => {
    try {
        const raw = await fsGetItem(KEY_PREFIX + cacheKey);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as unknown;
        return isValidDetail(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const saveCachedMediaDetail = async (
    cacheKey: string,
    detail: MobileMediaDetail,
): Promise<void> => {
    try {
        await deferCacheWrite();
        const cacheable = getCacheableDetail(detail);
        const key = KEY_PREFIX + cacheKey;

        if (!cacheable) {
            await fsDeleteItem(key);
            return;
        }

        const payload = JSON.stringify(cacheable);
        if (payload.length > MAX_CACHED_DETAIL_CHARS) {
            await fsDeleteItem(key);
            return;
        }

        await fsSetItem(key, payload);
    } catch {
        // best-effort
    }
};

export const deleteCachedMediaDetail = async (cacheKey: string): Promise<void> => {
    await fsDeleteItem(KEY_PREFIX + cacheKey);
};

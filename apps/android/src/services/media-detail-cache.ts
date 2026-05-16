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

const KEY_PREFIX = 'samo.android.detail-cache.';

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
        await fsSetItem(KEY_PREFIX + cacheKey, JSON.stringify(detail));
    } catch {
        // best-effort
    }
};

export const deleteCachedMediaDetail = async (cacheKey: string): Promise<void> => {
    await fsDeleteItem(KEY_PREFIX + cacheKey);
};

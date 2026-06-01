import { DEFAULT_ARTWORK_CACHE_LIMIT_BYTES } from './artwork-cache';
import { fsGetItem, fsSetItem } from './fs-storage';

const KEY = 'samo.android.artwork-cache-limit-bytes.v1';

export const loadArtworkCacheLimitBytes = async (): Promise<number> => {
    try {
        const raw = await fsGetItem(KEY);
        if (!raw) {
            return DEFAULT_ARTWORK_CACHE_LIMIT_BYTES;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) && parsed > 0
            ? parsed
            : DEFAULT_ARTWORK_CACHE_LIMIT_BYTES;
    } catch {
        return DEFAULT_ARTWORK_CACHE_LIMIT_BYTES;
    }
};

export const saveArtworkCacheLimitBytes = async (bytes: number): Promise<void> => {
    try {
        await fsSetItem(KEY, String(Math.max(0, Math.round(bytes))));
    } catch {
        // best-effort
    }
};

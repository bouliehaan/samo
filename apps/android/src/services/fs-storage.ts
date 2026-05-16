// Filesystem-backed key/value storage for things that are too big or too
// frequently-written for SecureStore. SecureStore is encrypted and is the
// right home for secrets (server credentials), but it warns aggressively
// when values cross 2KB and is slow to write. Cache-style data — the home
// content snapshot, the downloads registry, the recents list — lives here
// instead, in JSON files under the app's document directory.

import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR_NAME = 'samo-cache';

const getCacheDir = () => `${FileSystem.documentDirectory ?? ''}${CACHE_DIR_NAME}/`;

const ensureCacheDir = async () => {
    const dir = getCacheDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
};

const sanitizeKey = (key: string): string => key.replace(/[^a-zA-Z0-9._-]+/g, '_');

const uriFor = (key: string): string => `${getCacheDir()}${sanitizeKey(key)}.json`;

export const fsGetItem = async (key: string): Promise<string | null> => {
    try {
        const uri = uriFor(key);
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
            return null;
        }
        return await FileSystem.readAsStringAsync(uri);
    } catch {
        return null;
    }
};

export const fsSetItem = async (key: string, value: string): Promise<void> => {
    try {
        await ensureCacheDir();
        const uri = uriFor(key);
        await FileSystem.writeAsStringAsync(uri, value);
    } catch {
        // Cache writes are best-effort. The app still works without
        // persistence — content just won't survive launches.
    }
};

export const fsDeleteItem = async (key: string): Promise<void> => {
    try {
        await FileSystem.deleteAsync(uriFor(key), { idempotent: true });
    } catch {
        // ignore
    }
};

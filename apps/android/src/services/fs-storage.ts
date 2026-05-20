// Filesystem-backed key/value storage for things that are too big or too
// frequently-written for SecureStore. SecureStore is encrypted and is the
// right home for secrets (server credentials), but it warns aggressively
// when values cross 2KB and is slow to write. Cache-style data — the home
// content snapshot, the downloads registry, the recents list — lives here
// instead, in JSON files under the app's document directory.

import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR_NAME = 'samo-cache';
const CACHE_CLEANUP_INTERVAL_MS = 10 * 60_000;
const CACHE_CLEANUP_DELAY_MS = 2_500;
const CACHE_CLEANUP_YIELD_EVERY = 24;
const MAX_CACHE_BYTES = 48 * 1024 * 1024;
const MAX_CACHE_FILES = 180;

let cleanupInFlight = false;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let lastCleanupAt = 0;

type CacheEntry = { modifiedAt: number; size: number; uri: string };

const getCacheDir = () => `${FileSystem.documentDirectory ?? ''}${CACHE_DIR_NAME}/`;

const ensureCacheDir = async () => {
    const dir = getCacheDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
};

const legacySanitizeKey = (key: string): string => key.replace(/[^a-zA-Z0-9._-]+/g, '_');

const sanitizeKey = (key: string): string => legacySanitizeKey(key).slice(0, 48) || 'key';

const hashKey = (key: string): string => {
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;

    for (let index = 0; index < key.length; index += 1) {
        const code = key.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193) >>> 0;
        second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
    }

    return `${first.toString(36)}${second.toString(36)}${key.length.toString(36)}`;
};

const uriFor = (key: string): string =>
    `${getCacheDir()}${sanitizeKey(key)}.${hashKey(key)}.json`;

const tempUriFor = (key: string): string =>
    `${getCacheDir()}${sanitizeKey(key)}.${hashKey(key)}.tmp`;

const legacyUriFor = (key: string): string => `${getCacheDir()}${legacySanitizeKey(key)}.json`;

const yieldToEventLoop = (): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

const pruneCacheDir = async (): Promise<void> => {
    if (cleanupInFlight) {
        return;
    }
    cleanupInFlight = true;
    try {
        const dir = await ensureCacheDir();
        const names = await FileSystem.readDirectoryAsync(dir);
        const entries: CacheEntry[] = [];

        for (let index = 0; index < names.length; index += 1) {
            if (index > 0 && index % CACHE_CLEANUP_YIELD_EVERY === 0) {
                await yieldToEventLoop();
            }

            const name = names[index];
            if (!name) {
                continue;
            }

            const uri = `${dir}${name}`;
            const info = await FileSystem.getInfoAsync(uri);

            if (!info.exists || info.isDirectory) {
                continue;
            }

            if (name.endsWith('.tmp')) {
                await FileSystem.deleteAsync(uri, { idempotent: true });
                continue;
            }

            if (!name.endsWith('.json')) {
                continue;
            }

            entries.push({
                modifiedAt: info.modificationTime ?? 0,
                size: info.size ?? 0,
                uri,
            });
        }

        const jsonEntries = entries
            .sort((left, right) => left.modifiedAt - right.modifiedAt);
        let totalBytes = jsonEntries.reduce((sum, entry) => sum + entry.size, 0);
        let fileCount = jsonEntries.length;
        let deletedCount = 0;

        for (const entry of jsonEntries) {
            if (fileCount <= MAX_CACHE_FILES && totalBytes <= MAX_CACHE_BYTES) {
                break;
            }
            await FileSystem.deleteAsync(entry.uri, { idempotent: true });
            totalBytes -= entry.size;
            fileCount -= 1;
            deletedCount += 1;

            if (deletedCount % CACHE_CLEANUP_YIELD_EVERY === 0) {
                await yieldToEventLoop();
            }
        }
    } catch {
        // Cache pruning is opportunistic. A failed cleanup should never make
        // cache reads or writes fail.
    } finally {
        cleanupInFlight = false;
    }
};

const scheduleCacheCleanup = () => {
    const now = Date.now();
    if (cleanupTimer !== null || now - lastCleanupAt < CACHE_CLEANUP_INTERVAL_MS) {
        return;
    }
    lastCleanupAt = now;
    cleanupTimer = setTimeout(() => {
        cleanupTimer = null;
        void pruneCacheDir();
    }, CACHE_CLEANUP_DELAY_MS);
};

export const fsGetItem = async (key: string): Promise<string | null> => {
    try {
        const uri = uriFor(key);
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
            return await FileSystem.readAsStringAsync(uri);
        }

        const legacyUri = legacyUriFor(key);
        const legacyInfo = await FileSystem.getInfoAsync(legacyUri);
        if (!legacyInfo.exists) {
            return null;
        }
        return await FileSystem.readAsStringAsync(legacyUri);
    } catch {
        return null;
    }
};

export const fsSetItem = async (key: string, value: string): Promise<void> => {
    try {
        await ensureCacheDir();
        const uri = uriFor(key);
        const tempUri = tempUriFor(key);
        await FileSystem.writeAsStringAsync(tempUri, value);
        await FileSystem.deleteAsync(uri, { idempotent: true });
        await FileSystem.moveAsync({ from: tempUri, to: uri });
        scheduleCacheCleanup();
    } catch {
        // Cache writes are best-effort. The app still works without
        // persistence — content just won't survive launches.
    }
};

export const fsDeleteItem = async (key: string): Promise<void> => {
    await Promise.allSettled([
        FileSystem.deleteAsync(uriFor(key), { idempotent: true }),
        FileSystem.deleteAsync(tempUriFor(key), { idempotent: true }),
        FileSystem.deleteAsync(legacyUriFor(key), { idempotent: true }),
    ]);
};

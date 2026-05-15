import { type MobileHomeContent } from '@samo/core/mobile';
import * as SecureStore from 'expo-secure-store';

// Stale-while-revalidate cache for the Home tab so cold-open feels instant
// instead of staring at a spinner for several seconds while every server
// re-fetches. We persist the most recent successful payload and hydrate it on
// next launch, then kick off the live fetch in the background and replace.
const HOME_CACHE_KEY = 'samo.android.home-cache.v1';

// SecureStore writes are slow at large sizes. Hard-cap stored items per
// section so the cache stays well under any platform-specific blob limit and
// the write doesn't stall app launch. The user will get the fresh data once
// the network call returns anyway.
const MAX_ITEMS_PER_SECTION = 32;

export interface AndroidCachedHomeContent {
    cachedAt: number;
    content: MobileHomeContent;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isValidContent = (value: unknown): value is MobileHomeContent => {
    if (!isRecord(value)) return false;
    if (!Array.isArray(value.sections)) return false;
    if (typeof value.serverTitle !== 'string') return false;
    if (typeof value.loadedAt !== 'number') return false;
    return true;
};

export const loadCachedHomeContent = async (): Promise<AndroidCachedHomeContent | null> => {
    try {
        const raw = await SecureStore.getItemAsync(HOME_CACHE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!isRecord(parsed)) {
            return null;
        }
        const content = parsed.content;
        const cachedAt = parsed.cachedAt;
        if (!isValidContent(content) || typeof cachedAt !== 'number') {
            return null;
        }
        return { cachedAt, content };
    } catch {
        return null;
    }
};

export const saveCachedHomeContent = async (content: MobileHomeContent): Promise<void> => {
    try {
        const trimmed: MobileHomeContent = {
            ...content,
            sections: content.sections.map((section) => ({
                ...section,
                items: section.items.slice(0, MAX_ITEMS_PER_SECTION),
            })),
        };
        const payload: AndroidCachedHomeContent = {
            cachedAt: Date.now(),
            content: trimmed,
        };
        await SecureStore.setItemAsync(HOME_CACHE_KEY, JSON.stringify(payload));
    } catch {
        // Caching is best-effort. Never block launch on a write failure.
    }
};

export const clearCachedHomeContent = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(HOME_CACHE_KEY);
    } catch {
        // ignore
    }
};

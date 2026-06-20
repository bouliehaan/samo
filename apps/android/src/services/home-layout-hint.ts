// A tiny persisted hint about which network-gated Home shelves had content last
// launch, so a cold boot can RESERVE their slots (sized skeletons) before the
// live fetch lands — the real content then fills in place instead of inserting
// mid-page and shoving everything down. Sync in-memory cache (read during
// render) backed by best-effort async persistence, styled after recent-content.

import { fsGetItem, fsSetItem } from './fs-storage';

export interface HomeLayoutHint {
    /** Item count the Podcast Feed shelf had last launch (0 = had none). */
    podcastFeed: number;
    /** Item count the Discover/Rediscover shelf had last launch. */
    rediscover: number;
}

const HOME_LAYOUT_HINT_KEY = 'home-layout-hint-v1';

let cached: HomeLayoutHint | null = null;

/** Synchronous read for the render path. Null until loaded (or first saved). */
export const getHomeLayoutHint = (): HomeLayoutHint | null => cached;

/** Warm the in-memory cache from disk once on boot. */
export const loadHomeLayoutHint = async (): Promise<HomeLayoutHint | null> => {
    const raw = await fsGetItem(HOME_LAYOUT_HINT_KEY);
    // A save that beat this read to the cache is fresher than disk — never
    // clobber it.
    if (cached !== null || !raw) {
        return cached;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<HomeLayoutHint>;
        if (
            parsed &&
            typeof parsed.podcastFeed === 'number' &&
            typeof parsed.rediscover === 'number'
        ) {
            cached = { podcastFeed: parsed.podcastFeed, rediscover: parsed.rediscover };
        }
    } catch {
        // ignore — a corrupt hint just means we fall back to the mirror signal
    }
    return cached;
};

/** Update the cache synchronously (so the next render sees it) and persist. */
export const saveHomeLayoutHint = (hint: HomeLayoutHint): void => {
    cached = hint;
    void fsSetItem(HOME_LAYOUT_HINT_KEY, JSON.stringify(hint));
};

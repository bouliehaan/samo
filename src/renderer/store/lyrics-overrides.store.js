import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';
import { identityPersistMigrate, PERSIST_VERSION_INITIAL, } from '/@/renderer/store/persist-migrate';
const MAX_ENTRIES = 500;
const evictIfOverCap = (entries) => {
    const keys = Object.keys(entries);
    if (keys.length <= MAX_ENTRIES)
        return;
    const sorted = keys.sort((a, b) => (entries[a].updatedAt ?? 0) - (entries[b].updatedAt ?? 0));
    const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
    for (const key of toRemove)
        delete entries[key];
};
const upsert = (entries, key, patch) => {
    entries[key] = {
        ...(entries[key] ?? { updatedAt: 0 }),
        ...patch,
        updatedAt: Date.now(),
    };
    evictIfOverCap(entries);
};
const dropEmpty = (entries, key) => {
    const entry = entries[key];
    if (!entry)
        return;
    if (entry.offsetMs === undefined &&
        entry.override === undefined &&
        entry.structuredIndex === undefined &&
        !entry.suppressed) {
        delete entries[key];
    }
};
export const useLyricsOverridesStore = createWithEqualityFn()(persist(subscribeWithSelector(devtools(immer((set) => ({
    actions: {
        clearOffset: (key) => set((state) => {
            if (!state.entries[key])
                return;
            delete state.entries[key].offsetMs;
            state.entries[key].updatedAt = Date.now();
            dropEmpty(state.entries, key);
        }),
        clearOverride: (key) => set((state) => {
            if (!state.entries[key])
                return;
            delete state.entries[key].override;
            state.entries[key].updatedAt = Date.now();
            dropEmpty(state.entries, key);
        }),
        clearSuppressed: (key) => set((state) => {
            if (!state.entries[key])
                return;
            delete state.entries[key].suppressed;
            state.entries[key].updatedAt = Date.now();
            dropEmpty(state.entries, key);
        }),
        setOffset: (key, offsetMs) => set((state) => {
            upsert(state.entries, key, { offsetMs });
        }),
        setOverride: (key, override) => set((state) => {
            upsert(state.entries, key, {
                override,
                suppressed: false,
            });
        }),
        setStructuredIndex: (key, structuredIndex) => set((state) => {
            upsert(state.entries, key, { structuredIndex });
        }),
        suppress: (key) => set((state) => {
            upsert(state.entries, key, { suppressed: true });
        }),
    },
    entries: {},
})), { name: 'store_lyrics_overrides' })), {
    migrate: (identityPersistMigrate),
    name: 'store_lyrics_overrides',
    partialize: (state) => ({ entries: state.entries }),
    version: PERSIST_VERSION_INITIAL,
}));
export const lyricsKey = (serverId, songId) => serverId && songId ? `${serverId}:${songId}` : null;
export const useLyricsOverrideEntry = (key) => useLyricsOverridesStore((state) => (key ? state.entries[key] : undefined));
export const useLyricsOverridesActions = () => useLyricsOverridesStore((state) => state.actions);

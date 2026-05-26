import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createWithEqualityFn } from 'zustand/traditional';

import { identityPersistMigrate, PERSIST_VERSION_INITIAL } from '/@/renderer/store/persist-migrate';
import { LyricsOverride } from '/@/shared/types/domain-types';

export type LyricsOverrideEntry = {
    offsetMs?: number;
    override?: LyricsOverride;
    structuredIndex?: number;
    suppressed?: boolean;
    updatedAt: number;
};

interface LyricsOverridesState {
    actions: {
        clearOffset: (key: string) => void;
        clearOverride: (key: string) => void;
        clearSuppressed: (key: string) => void;
        setOffset: (key: string, offsetMs: number) => void;
        setOverride: (key: string, override: LyricsOverride) => void;
        setStructuredIndex: (key: string, index: number) => void;
        suppress: (key: string) => void;
    };
    entries: Record<string, LyricsOverrideEntry>;
}

const MAX_ENTRIES = 500;

const evictIfOverCap = (entries: Record<string, LyricsOverrideEntry>) => {
    const keys = Object.keys(entries);
    if (keys.length <= MAX_ENTRIES) return;
    const sorted = keys.sort((a, b) => (entries[a].updatedAt ?? 0) - (entries[b].updatedAt ?? 0));
    const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
    for (const key of toRemove) delete entries[key];
};

const upsert = (
    entries: Record<string, LyricsOverrideEntry>,
    key: string,
    patch: Partial<LyricsOverrideEntry>,
) => {
    entries[key] = {
        ...(entries[key] ?? { updatedAt: 0 }),
        ...patch,
        updatedAt: Date.now(),
    };
    evictIfOverCap(entries);
};

const dropEmpty = (entries: Record<string, LyricsOverrideEntry>, key: string) => {
    const entry = entries[key];
    if (!entry) return;
    if (
        entry.offsetMs === undefined &&
        entry.override === undefined &&
        entry.structuredIndex === undefined &&
        !entry.suppressed
    ) {
        delete entries[key];
    }
};

export const useLyricsOverridesStore = createWithEqualityFn<LyricsOverridesState>()(
    persist(
        subscribeWithSelector(
            devtools(
                immer((set) => ({
                    actions: {
                        clearOffset: (key) =>
                            set((state) => {
                                if (!state.entries[key]) return;
                                delete state.entries[key].offsetMs;
                                state.entries[key].updatedAt = Date.now();
                                dropEmpty(state.entries, key);
                            }),
                        clearOverride: (key) =>
                            set((state) => {
                                if (!state.entries[key]) return;
                                delete state.entries[key].override;
                                state.entries[key].updatedAt = Date.now();
                                dropEmpty(state.entries, key);
                            }),
                        clearSuppressed: (key) =>
                            set((state) => {
                                if (!state.entries[key]) return;
                                delete state.entries[key].suppressed;
                                state.entries[key].updatedAt = Date.now();
                                dropEmpty(state.entries, key);
                            }),
                        setOffset: (key, offsetMs) =>
                            set((state) => {
                                upsert(state.entries, key, { offsetMs });
                            }),
                        setOverride: (key, override) =>
                            set((state) => {
                                upsert(state.entries, key, {
                                    override,
                                    suppressed: false,
                                });
                            }),
                        setStructuredIndex: (key, structuredIndex) =>
                            set((state) => {
                                upsert(state.entries, key, { structuredIndex });
                            }),
                        suppress: (key) =>
                            set((state) => {
                                upsert(state.entries, key, { suppressed: true });
                            }),
                    },
                    entries: {},
                })),
                { name: 'store_lyrics_overrides' },
            ),
        ),
        {
            migrate: identityPersistMigrate<Pick<LyricsOverridesState, 'entries'>>,
            name: 'store_lyrics_overrides',
            partialize: (state) => ({ entries: state.entries }),
            version: PERSIST_VERSION_INITIAL,
        },
    ),
);

export const lyricsKey = (serverId: string | undefined, songId: string | undefined) =>
    serverId && songId ? `${serverId}:${songId}` : null;

export const useLyricsOverrideEntry = (key: null | string): LyricsOverrideEntry | undefined =>
    useLyricsOverridesStore((state) => (key ? state.entries[key] : undefined));

export const useLyricsOverridesActions = () => useLyricsOverridesStore((state) => state.actions);

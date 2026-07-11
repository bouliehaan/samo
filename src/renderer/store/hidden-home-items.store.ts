import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { identityPersistMigrate, PERSIST_VERSION_INITIAL } from '/@/renderer/store/persist-migrate';

/**
 * Per-device list of items the user has explicitly hidden from the Home screen.
 *
 * Home is assembled from live queries (favorites / recently-added / discover),
 * so there's no list to delete from — "Remove from home screen" instead records
 * the item here and every Home shelf filters against it. This is purely a
 * display filter: the item stays in the library, in favorites, and everywhere
 * else untouched. It mirrors the non-destructive "Remove from recents" action.
 */
export type HiddenHomeItemType =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast'
    | 'radio'
    | 'song';

export const hiddenHomeItemKey = ({
    id,
    serverId,
    type,
}: {
    id: string;
    serverId?: null | string;
    type: HiddenHomeItemType;
}) => `${type}:${serverId ?? ''}:${id}`;

interface HiddenHomeItemsState {
    actions: {
        clear: () => void;
        hide: (key: string) => void;
        unhide: (key: string) => void;
    };
    keys: string[];
}

export const useHiddenHomeItemsStore = create<HiddenHomeItemsState>()(
    persist(
        (set) => ({
            actions: {
                clear: () => set({ keys: [] }),
                hide: (key) =>
                    set((state) =>
                        state.keys.includes(key) ? state : { keys: [...state.keys, key] },
                    ),
                unhide: (key) => set((state) => ({ keys: state.keys.filter((k) => k !== key) })),
            },
            keys: [],
        }),
        {
            migrate: identityPersistMigrate<Pick<HiddenHomeItemsState, 'keys'>>,
            name: 'hidden-home-items-store',
            partialize: (state) => ({ keys: state.keys }),
            version: PERSIST_VERSION_INITIAL,
        },
    ),
);

/** Reactive Set of hidden keys for filtering Home shelves. */
export const useHiddenHomeKeys = (): ReadonlySet<string> => {
    const keys = useHiddenHomeItemsStore((state) => state.keys);
    return useMemo(() => new Set(keys), [keys]);
};

/**
 * Hidden item ids for a single type, regardless of server — for shelves that
 * filter by bare id (e.g. the album carousel's `excludeIds`).
 */
export const useHiddenHomeIdsByType = (type: HiddenHomeItemType): string[] => {
    const keys = useHiddenHomeItemsStore((state) => state.keys);
    return useMemo(() => {
        const prefix = `${type}:`;
        return keys.flatMap((key) => {
            if (!key.startsWith(prefix)) return [];
            // key = `${type}:${serverId}:${id}` — the id is everything past the
            // serverId segment.
            const rest = key.slice(prefix.length);
            const separator = rest.indexOf(':');
            return [separator >= 0 ? rest.slice(separator + 1) : rest];
        });
    }, [keys, type]);
};

export const useHideFromHome = () => useHiddenHomeItemsStore((state) => state.actions.hide);

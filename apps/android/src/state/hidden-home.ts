import { useMemo } from 'react';

import { fsGetItem, fsSetItem } from '../services/fs-storage';
import { useStoreSelector } from './use-store-selector';

// Per-device list of content keys the user has hidden from the Home feed.
// Home is assembled from the on-device mirror + live server sections, so there's
// no list to delete from — "Remove from Home" records the item's content key
// here and the Home screen filters every shelf against it. Purely a display
// filter: the item stays in the library, favorites, and everywhere else. Mirrors
// the desktop `hidden-home-items` store and the non-destructive recents removal.

const STORAGE_KEY = 'samo.android.hidden-home.v1';

let hiddenKeys = new Set<string>();
// Stable array snapshot for useSyncExternalStore — only reassigned on change.
let snapshot: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => {
    snapshot = [...hiddenKeys];
    listeners.forEach((listener) => listener());
};

const persist = () => {
    void fsSetItem(STORAGE_KEY, JSON.stringify([...hiddenKeys])).catch(() => {});
};

/**
 * Load persisted hidden keys once at boot. Until this resolves the set is empty,
 * so call it as early as possible (App boot) to avoid a hidden tile flashing in
 * on a cold start before hydration lands.
 */
export const hydrateHiddenHome = async (): Promise<void> => {
    if (hydrated) {
        return;
    }
    hydrated = true;
    try {
        const raw = await fsGetItem(STORAGE_KEY);
        if (!raw) {
            return;
        }
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const next = parsed.filter((value): value is string => typeof value === 'string');
            if (next.length > 0) {
                hiddenKeys = new Set(next);
                emit();
            }
        }
    } catch {
        // Corrupt payload — start clean.
    }
};

export const hideFromHome = (key: string): void => {
    if (hiddenKeys.has(key)) {
        return;
    }
    hiddenKeys = new Set(hiddenKeys);
    hiddenKeys.add(key);
    persist();
    emit();
};

export const unhideFromHome = (key: string): void => {
    if (!hiddenKeys.has(key)) {
        return;
    }
    hiddenKeys = new Set(hiddenKeys);
    hiddenKeys.delete(key);
    persist();
    emit();
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = () => snapshot;
const identity = (state: string[]) => state;

/** Reactive Set of hidden content keys for filtering Home shelves. */
export const useHiddenHomeKeys = (): ReadonlySet<string> => {
    // The Set is derived in the component, not in the selector: building it in
    // the selector would return a fresh reference on every notification and
    // re-render every Home shelf on unrelated store writes.
    const keys = useStoreSelector(subscribe, getSnapshot, identity);
    return useMemo(() => new Set(keys), [keys]);
};

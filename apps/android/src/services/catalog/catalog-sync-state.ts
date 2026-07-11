import { nativeGetSyncStates } from './catalog-native';

// Tracks the sync status of each Samo source's local mirror and exposes it
// reactively so the Settings "Local library" panel can render live progress.
// Kotlin OWNS the `catalog_sync_state` table (SamoCatalogSync writes it); this
// store is a read-only in-memory mirror hydrated from the native bridge on
// first access and kept live by the sync engine's progress events. Subscribers
// receive a snapshot of all sources on every change, matching the subscribe
// pattern used elsewhere in services (e.g. download-manager).

export type CatalogSyncStatus = 'error' | 'idle' | 'synced' | 'syncing';

export interface CatalogSyncCounts {
    details: number;
    items: number;
    tracks: number;
}

export interface CatalogSyncState {
    detailCount: number;
    error?: string;
    itemCount: number;
    lastAttemptAt?: number;
    lastSyncedAt?: number;
    sourceId: string;
    status: CatalogSyncStatus;
    trackCount: number;
    updatedAt: number;
}

const cache = new Map<string, CatalogSyncState>();
const listeners = new Set<(states: CatalogSyncState[]) => void>();
let hydration: Promise<void> | null = null;

const isCatalogSyncStatus = (value: string): value is CatalogSyncStatus =>
    value === 'idle' || value === 'syncing' || value === 'synced' || value === 'error';

const defaultState = (sourceId: string): CatalogSyncState => ({
    detailCount: 0,
    itemCount: 0,
    sourceId,
    status: 'idle',
    trackCount: 0,
    updatedAt: 0,
});

const rowToState = (row: {
    detailCount: number;
    error?: string;
    itemCount: number;
    lastAttemptAt?: number;
    lastSyncedAt?: number;
    sourceId: string;
    status: string;
    trackCount: number;
    updatedAt: number;
}): CatalogSyncState => ({
    detailCount: row.detailCount,
    error: row.error,
    itemCount: row.itemCount,
    lastAttemptAt: row.lastAttemptAt,
    lastSyncedAt: row.lastSyncedAt,
    sourceId: row.sourceId,
    status: isCatalogSyncStatus(row.status) ? row.status : 'idle',
    trackCount: row.trackCount,
    updatedAt: row.updatedAt,
});

const snapshot = (): CatalogSyncState[] => [...cache.values()];

const notifyListeners = (): void => {
    const states = snapshot();
    listeners.forEach((listener) => {
        try {
            listener(states);
        } catch {
            // never let a UI listener crash the sync-state store
        }
    });
};

const loadFromNative = async (): Promise<void> => {
    const rows = await nativeGetSyncStates();
    for (const row of rows) {
        cache.set(row.sourceId, rowToState(row));
    }
};

const ensureHydrated = (): Promise<void> => {
    if (!hydration) {
        hydration = loadFromNative().catch((error) => {
            hydration = null;
            // eslint-disable-next-line no-console
            console.error('[sync-state] hydration FAILED', error);
            throw error;
        });
    }
    return hydration;
};

export const subscribeCatalogSyncState = (
    listener: (states: CatalogSyncState[]) => void,
): (() => void) => {
    listeners.add(listener);
    void ensureHydrated().then(() => listener(snapshot()));
    return () => {
        listeners.delete(listener);
    };
};

// ---------------------------------------------------------------------------
// Kotlin-owned sync. The engine (SamoCatalogSync.kt) writes the table itself;
// JS only mirrors its progress into the in-memory cache for the UI. Events
// arrive live while the app is in front; background runs (no React context)
// just write the table, so a foreground refresh re-reads it via the bridge.
// ---------------------------------------------------------------------------

export interface NativeCatalogSyncEvent {
    details: number;
    error?: string;
    items: number;
    sourceId: string;
    status: string;
    tracks: number;
}

/** Apply a native progress event to the in-memory cache (no persistence —
 *  Kotlin already wrote the row). */
export const applyNativeCatalogSyncEvent = (event: NativeCatalogSyncEvent): void => {
    const current = cache.get(event.sourceId) ?? defaultState(event.sourceId);
    const status: CatalogSyncStatus = isCatalogSyncStatus(event.status)
        ? event.status
        : 'syncing';
    cache.set(event.sourceId, {
        ...current,
        detailCount: event.details,
        error: event.error,
        itemCount: event.items,
        status,
        trackCount: event.tracks,
        ...(status === 'synced' ? { lastSyncedAt: Date.now() } : {}),
        updatedAt: Date.now(),
    });
    notifyListeners();
};

/** Re-read the table via the native bridge (e.g. on foreground, after a
 *  background worker ran with no React context to emit into). */
export const refreshCatalogSyncStateFromDb = async (): Promise<void> => {
    try {
        await loadFromNative();
        notifyListeners();
    } catch {
        // Best-effort refresh; live events still keep the cache moving.
    }
};

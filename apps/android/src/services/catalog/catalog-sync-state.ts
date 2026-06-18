import { getCatalogDatabase } from './database';
import { type CatalogSyncStateRow } from './schema';
import { safeParseJson } from '../../utils/json';

// Tracks the sync status of each Samo source's local mirror and exposes it
// reactively so the Settings "Local library" panel can render live progress.
// State is persisted in `catalog_sync_state` and mirrored in an in-memory cache
// that is hydrated once on first access; subscribers receive a snapshot of all
// sources on every change, matching the subscribe pattern used elsewhere in
// services (e.g. download-manager).

export type CatalogSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface CatalogSyncCounts {
    items: number;
    tracks: number;
    details: number;
}

export interface CatalogSyncState {
    sourceId: string;
    status: CatalogSyncStatus;
    lastSyncedAt?: number;
    lastAttemptAt?: number;
    error?: string;
    itemCount: number;
    trackCount: number;
    detailCount: number;
    cursor?: Record<string, unknown>;
    updatedAt: number;
}

type CatalogSyncStatePatch = Partial<Omit<CatalogSyncState, 'sourceId' | 'updatedAt'>>;

const cache = new Map<string, CatalogSyncState>();
const listeners = new Set<(states: CatalogSyncState[]) => void>();
let hydration: Promise<void> | null = null;

const UPSERT_SYNC_STATE_SQL = `
INSERT INTO catalog_sync_state (
    source_id, status, last_synced_at, last_attempt_at, error,
    item_count, track_count, detail_count, cursor, updated_at
) VALUES (
    $source_id, $status, $last_synced_at, $last_attempt_at, $error,
    $item_count, $track_count, $detail_count, $cursor, $updated_at
)
ON CONFLICT(source_id) DO UPDATE SET
    status = excluded.status,
    last_synced_at = excluded.last_synced_at,
    last_attempt_at = excluded.last_attempt_at,
    error = excluded.error,
    item_count = excluded.item_count,
    track_count = excluded.track_count,
    detail_count = excluded.detail_count,
    cursor = excluded.cursor,
    updated_at = excluded.updated_at
`;

const isCatalogSyncStatus = (value: string): value is CatalogSyncStatus =>
    value === 'idle' || value === 'syncing' || value === 'synced' || value === 'error';

const parseCursor = (raw: string | null): Record<string, unknown> | undefined => {
    if (!raw) {
        return undefined;
    }
    const parsed = safeParseJson<unknown>(raw);
    return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : undefined;
};

const rowToState = (row: CatalogSyncStateRow): CatalogSyncState => ({
    sourceId: row.source_id,
    status: isCatalogSyncStatus(row.status) ? row.status : 'idle',
    lastSyncedAt: row.last_synced_at ?? undefined,
    lastAttemptAt: row.last_attempt_at ?? undefined,
    error: row.error ?? undefined,
    itemCount: row.item_count,
    trackCount: row.track_count,
    detailCount: row.detail_count,
    cursor: parseCursor(row.cursor),
    updatedAt: row.updated_at,
});

const defaultState = (sourceId: string): CatalogSyncState => ({
    sourceId,
    status: 'idle',
    itemCount: 0,
    trackCount: 0,
    detailCount: 0,
    updatedAt: 0,
});

const ensureHydrated = (): Promise<void> => {
    if (!hydration) {
        hydration = (async () => {
            const db = await getCatalogDatabase();
            const rows = await db.getAllAsync<CatalogSyncStateRow>(
                'SELECT * FROM catalog_sync_state',
            );
            // eslint-disable-next-line no-console -- hydration health probe
            console.log(
                '[sync-state] hydrated',
                rows.map((row) => `${row.source_id}=${row.status}`).join(' ') || 'NO ROWS',
            );
            for (const row of rows) {
                cache.set(row.source_id, rowToState(row));
            }
        })().catch((error) => {
            hydration = null;
            // eslint-disable-next-line no-console
            console.error('[sync-state] hydration FAILED', error);
            throw error;
        });
    }
    return hydration;
};

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

const persist = async (state: CatalogSyncState): Promise<void> => {
    const db = await getCatalogDatabase();
    await db.runAsync(UPSERT_SYNC_STATE_SQL, {
        $source_id: state.sourceId,
        $status: state.status,
        $last_synced_at: state.lastSyncedAt ?? null,
        $last_attempt_at: state.lastAttemptAt ?? null,
        $error: state.error ?? null,
        $item_count: state.itemCount,
        $track_count: state.trackCount,
        $detail_count: state.detailCount,
        $cursor: state.cursor ? JSON.stringify(state.cursor) : null,
        $updated_at: state.updatedAt,
    });
};

export const getCatalogSyncState = async (
    sourceId: string,
): Promise<CatalogSyncState | null> => {
    await ensureHydrated();
    return cache.get(sourceId) ?? null;
};

export const getAllCatalogSyncStates = async (): Promise<CatalogSyncState[]> => {
    await ensureHydrated();
    return snapshot();
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

export const updateCatalogSyncState = async (
    sourceId: string,
    patch: CatalogSyncStatePatch,
): Promise<CatalogSyncState> => {
    await ensureHydrated();
    const current = cache.get(sourceId) ?? defaultState(sourceId);
    const next: CatalogSyncState = {
        ...current,
        ...patch,
        sourceId,
        updatedAt: Date.now(),
    };
    cache.set(sourceId, next);
    await persist(next);
    notifyListeners();
    return next;
};

export const markSyncStarted = (sourceId: string): Promise<CatalogSyncState> =>
    updateCatalogSyncState(sourceId, {
        status: 'syncing',
        lastAttemptAt: Date.now(),
        error: undefined,
    });

export const setSyncProgress = (
    sourceId: string,
    counts: CatalogSyncCounts,
): Promise<CatalogSyncState> =>
    // Note: deliberately does NOT touch `cursor` — it holds the delta-sync
    // watermark, which must survive in-progress updates and mid-sync failures
    // so a retry can resume incrementally rather than falling back to a full
    // re-enumerate.
    updateCatalogSyncState(sourceId, {
        status: 'syncing',
        itemCount: counts.items,
        trackCount: counts.tracks,
        detailCount: counts.details,
    });

export const markSyncSucceeded = (
    sourceId: string,
    counts: CatalogSyncCounts,
    // The delta-sync cursor to persist (server clock + sync-logic version).
    // Replayed by the next sync; only advanced on success, so a failed sync
    // keeps retrying from the prior cursor.
    cursor?: Record<string, unknown>,
): Promise<CatalogSyncState> =>
    updateCatalogSyncState(sourceId, {
        status: 'synced',
        lastSyncedAt: Date.now(),
        error: undefined,
        itemCount: counts.items,
        trackCount: counts.tracks,
        detailCount: counts.details,
        cursor,
    });

export const markSyncFailed = (
    sourceId: string,
    message: string,
): Promise<CatalogSyncState> =>
    updateCatalogSyncState(sourceId, { status: 'error', error: message });

export const clearCatalogSyncState = async (sourceId: string): Promise<void> => {
    await ensureHydrated();
    const db = await getCatalogDatabase();
    await db.runAsync('DELETE FROM catalog_sync_state WHERE source_id = ?', sourceId);
    cache.delete(sourceId);
    notifyListeners();
};

// ---------------------------------------------------------------------------
// Kotlin-owned sync. The engine (SamoCatalogSync.kt) writes the table itself;
// JS only mirrors its progress into the in-memory cache for the UI. Events
// arrive live while the app is in front; background runs (no React context)
// just write the table, so a foreground refresh re-reads it.
// ---------------------------------------------------------------------------

export interface NativeCatalogSyncEvent {
    sourceId: string;
    status: string;
    items: number;
    tracks: number;
    details: number;
    error?: string;
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
        status,
        error: event.error,
        itemCount: event.items,
        trackCount: event.tracks,
        detailCount: event.details,
        ...(status === 'synced' ? { lastSyncedAt: Date.now() } : {}),
        updatedAt: Date.now(),
    });
    notifyListeners();
};

/** Re-read the table (e.g. on foreground, after a background worker ran). */
export const refreshCatalogSyncStateFromDb = async (): Promise<void> => {
    try {
        const db = await getCatalogDatabase();
        const rows = await db.getAllAsync<CatalogSyncStateRow>(
            'SELECT * FROM catalog_sync_state',
        );
        for (const row of rows) {
            cache.set(row.source_id, rowToState(row));
        }
        notifyListeners();
    } catch {
        // Best-effort refresh; live events still keep the cache moving.
    }
};

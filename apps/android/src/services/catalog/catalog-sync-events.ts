import { AppState, DeviceEventEmitter } from 'react-native';

import { getCatalogDatabase, recycleCatalogConnections } from './database';
import {
    applyNativeCatalogSyncEvent,
    refreshCatalogSyncStateFromDb,
    type NativeCatalogSyncEvent,
} from './catalog-sync-state';

/**
 * Orphaned-inode detection: the sync engine just reported [eventItems] rows,
 * so a JS read of zero means our connections are bound to a stale/deleted
 * file (see recycleCatalogConnections). Returns true when a heal happened.
 */
const healStaleConnectionsIfNeeded = async (eventItems: number): Promise<boolean> => {
    if (eventItems <= 0) {
        return false;
    }
    let visible = 0;
    try {
        const db = await getCatalogDatabase();
        const row = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) AS count FROM catalog_item',
        );
        visible = row?.count ?? 0;
    } catch {
        visible = 0;
    }
    if (visible > 0) {
        return false;
    }
    // eslint-disable-next-line no-console
    console.warn(
        `[catalog] sync reported ${eventItems} items but JS sees 0 — recycling stale connections`,
    );
    await recycleCatalogConnections();
    return true;
};

// Glue between the Kotlin sync engine and the JS world. One install per app
// lifetime (App.tsx effect): forwards SamoCatalogSyncState device events into
// the sync-state store for the Settings panel, refreshes that store from the
// table on every foreground (covering background worker runs that had no
// React context to emit into), and fans out a "source finished syncing"
// callback that post-sync hooks (artwork prefetch, Home re-derive) subscribe
// to — so those behaviors live in ONE place instead of trailing every caller
// that used to await the old JS sync engine.

type SyncCompletedListener = (sourceId: string) => void;

const completedListeners = new Set<SyncCompletedListener>();
let installed = false;

export const subscribeCatalogSyncCompleted = (
    listener: SyncCompletedListener,
): (() => void) => {
    completedListeners.add(listener);
    return () => {
        completedListeners.delete(listener);
    };
};

export const installCatalogSyncEventBridge = (): (() => void) => {
    if (installed) {
        return () => undefined;
    }
    installed = true;

    const eventSubscription = DeviceEventEmitter.addListener(
        'SamoCatalogSyncState',
        (event: NativeCatalogSyncEvent) => {
            applyNativeCatalogSyncEvent(event);
            // BOTH terminal states fan out: an errored run may still have
            // committed plenty (items land per-variant), and the mirror-backed
            // surfaces should render whatever exists rather than wait for a
            // perfect pass. The stale-connection heal runs FIRST so the
            // listeners' re-derives read the real file, not an orphaned inode.
            if (event.status === 'synced' || event.status === 'error') {
                void healStaleConnectionsIfNeeded(event.items).finally(() => {
                    completedListeners.forEach((listener) => {
                        try {
                            listener(event.sourceId);
                        } catch {
                            // a post-sync hook must never break the bridge
                        }
                    });
                });
            }
        },
    );

    const appStateSubscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
            void refreshCatalogSyncStateFromDb();
        }
    });

    return () => {
        installed = false;
        eventSubscription.remove();
        appStateSubscription.remove();
    };
};

import { AppState, DeviceEventEmitter } from 'react-native';

import {
    applyNativeCatalogSyncEvent,
    refreshCatalogSyncStateFromDb,
    type NativeCatalogSyncEvent,
} from './catalog-sync-state';
import { consolidateCatalogAfterSync, recycleCatalogConnections } from './database';

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
            // perfect pass.
            if (event.status === 'synced' || event.status === 'error') {
                // Recycle FIRST, synchronously, before any listener runs. The
                // Kotlin engine just closed its native writer, which released
                // this process's POSIX locks on the catalog DB and (intended to)
                // checkpoint the WAL into the main file. Our cached JS
                // connections are now bound to dropped locks / a stale snapshot
                // and would read 0 rows — dropping (and CLOSING the sync
                // reader so its .shm lock actually goes away) means the fresh
                // open below sees the freshly-synced catalog. Without this,
                // the first sync leaves Library/Playlists blank until restart.
                recycleCatalogConnections();
                // Then consolidate: open the writer fresh, run a PASSIVE
                // wal_checkpoint, and probe the row count. This guards the
                // (known-real) case where Kotlin's TRUNCATE checkpoint hit
                // SQLITE_BUSY against our old reader and silently left data
                // stranded in the WAL — by the time we run here the reader is
                // closed, so PASSIVE has a clean window. Listeners fan out only
                // AFTER this completes, so refreshHomeFromMirror reads the
                // post-consolidate state.
                void (async () => {
                    await consolidateCatalogAfterSync();
                    completedListeners.forEach((listener) => {
                        try {
                            listener(event.sourceId);
                        } catch {
                            // a post-sync hook must never break the bridge
                        }
                    });
                })();
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

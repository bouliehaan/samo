import { AppState, DeviceEventEmitter } from 'react-native';

import {
    applyNativeCatalogSyncEvent,
    refreshCatalogSyncStateFromDb,
    type NativeCatalogSyncEvent,
} from './catalog-sync-state';

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
                // Kotlin owns the DB end-to-end now: the reader is a single
                // long-lived native connection under WAL, so there are no JS
                // SQLite connections to recycle and no cross-engine POSIX-lock
                // choreography to run. The freshly-committed rows are visible
                // to the next bridge read immediately — just fan out.
                completedListeners.forEach((listener) => {
                    try {
                        listener(event.sourceId);
                    } catch {
                        // a post-sync hook must never break the bridge
                    }
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

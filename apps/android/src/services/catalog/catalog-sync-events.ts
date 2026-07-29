import { AppState, DeviceEventEmitter } from 'react-native';

import { safeParseJson } from '../../utils/json';
import { fsGetItem, fsSetItem } from '../fs-storage';
import {
    applyNativeCatalogSyncEvent,
    refreshCatalogSyncStateFromDb,
    type CatalogSyncState,
    type NativeCatalogSyncEvent,
} from './catalog-sync-state';

// Glue between the Kotlin sync engine and the JS world. One install per app
// lifetime (App.tsx effect): forwards SamoCatalogSyncState device events into
// the sync-state store for the Settings panel, reconciles that store against
// the table on launch and on every foreground, and fans out a "source finished
// syncing" callback that post-sync hooks (artwork prefetch, Home re-derive)
// subscribe to — so those behaviors live in ONE place instead of trailing every
// caller that used to await the old JS sync engine.

type SyncCompletedListener = (sourceId: string) => void;

const completedListeners = new Set<SyncCompletedListener>();
let installed = false;

/*
 * THE COMPLETION WATERMARK.
 *
 * The device event is a BEST-EFFORT notification, not the record of a sync. It
 * is emitted only while a React instance is alive to receive it
 * (SamoCatalogSyncModule gates on `hasActiveReactInstance`) — and the entire
 * point of moving the sync into a Kotlin WorkManager job was that it runs while
 * the app is backgrounded or dead. So the ordinary case, the periodic
 * 30-minute refresh, emitted into nothing and every post-sync hook simply never
 * ran: cover art was never warmed in bulk, and Home and Library never
 * re-derived from the rows that had just landed. The foreground refresh looked
 * like it covered this, but it only fed the Settings panel — it never reached
 * these listeners.
 *
 * Kotlin already writes the durable version of the fact into
 * `catalog_sync_state`. This watermark reads it. Persisting the last COMPLETION
 * we have already acted on turns "did a sync finish?" into a question that
 * survives process death, so a run that completed while the app was not running
 * is picked up on the next launch instead of being lost.
 *
 * Keyed on the ATTEMPT stamp rather than `lastSyncedAt`, deliberately: an
 * errored run may still have committed plenty (items land per-variant) and the
 * live path has always fanned out for both terminal states. `markSyncFailed`
 * leaves `lastSyncedAt` at its prior value and only advances `lastAttemptAt`,
 * so the attempt stamp is the one that moves for both — and on a terminal row
 * it IS the completion time.
 */
const WATERMARK_STORAGE_KEY = 'samo.catalog.sync.derived-watermark.v1';

type WatermarkMap = Record<string, number>;

let watermark: WatermarkMap = {};
let watermarkLoaded: null | Promise<void> = null;

const loadWatermark = (): Promise<void> => {
    if (!watermarkLoaded) {
        watermarkLoaded = (async () => {
            const raw = await fsGetItem(WATERMARK_STORAGE_KEY).catch(() => null);
            const parsed = raw ? safeParseJson<unknown>(raw) : null;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const next: WatermarkMap = {};
                for (const [sourceId, value] of Object.entries(parsed as WatermarkMap)) {
                    if (typeof value === 'number' && Number.isFinite(value)) {
                        next[sourceId] = value;
                    }
                }
                watermark = next;
            }
        })();
    }
    return watermarkLoaded;
};

const persistWatermark = (): void => {
    void fsSetItem(WATERMARK_STORAGE_KEY, JSON.stringify(watermark)).catch(() => undefined);
};

/** The completion instant of a TERMINAL sync row, or 0 while a run is still in
 *  flight. `markSyncStarted` and `setSyncProgress` stamp `lastAttemptAt` too,
 *  and deriving Home from a half-written mirror is the cold-boot
 *  deload-then-reload flash this app has already paid for once. */
const terminalCompletionStamp = (state: CatalogSyncState): number => {
    if (state.status !== 'synced' && state.status !== 'error') {
        return 0;
    }
    return Math.max(state.lastAttemptAt ?? 0, state.lastSyncedAt ?? 0);
};

const fanOut = (sourceId: string): void => {
    completedListeners.forEach((listener) => {
        try {
            listener(sourceId);
        } catch {
            // a post-sync hook must never break the bridge
        }
    });
};

/** Record that this source's completion has been acted on, so the live path and
 *  the durable path never both fire for the same run. */
const advanceWatermark = (sourceId: string, stamp: number): void => {
    if (stamp <= 0 || watermark[sourceId] === stamp) {
        return;
    }
    watermark[sourceId] = stamp;
    persistWatermark();
};

export const subscribeCatalogSyncCompleted = (
    listener: SyncCompletedListener,
): (() => void) => {
    completedListeners.add(listener);
    return () => {
        completedListeners.delete(listener);
    };
};

/**
 * Re-read the sync table and fan out for any source whose completion has not
 * been acted on yet.
 *
 * This is the DURABLE path, and it is what makes a background sync visible.
 * Called on launch and on every foreground, it CONVERGES with the live event
 * path rather than duplicating it: whichever notices a given run first advances
 * the watermark, and the other then finds nothing to do.
 */
export const reconcileCatalogSyncCompletion = async (): Promise<void> => {
    await loadWatermark();
    const states = await refreshCatalogSyncStateFromDb();
    for (const state of states) {
        const stamp = terminalCompletionStamp(state);
        if (stamp > 0 && watermark[state.sourceId] !== stamp) {
            advanceWatermark(state.sourceId, stamp);
            fanOut(state.sourceId);
        }
    }
};

export const installCatalogSyncEventBridge = (): (() => void) => {
    if (installed) {
        return () => undefined;
    }
    installed = true;

    // Pick up anything that completed while this process was not running. The
    // periodic worker fires every ~30 minutes whether or not the app is alive,
    // so on an ordinary cold launch there is usually a completed run that
    // nothing has ever derived from — which is why a warm library still fetched
    // every cover over the network on startup.
    void reconcileCatalogSyncCompletion();

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
                fanOut(event.sourceId);
                // The event itself carries no timestamp, so claim the watermark
                // from the table the same way the durable path reads it. Without
                // this the next foreground would see an un-acted-on completion
                // and derive the whole thing a second time.
                void loadWatermark()
                    .then(() => refreshCatalogSyncStateFromDb())
                    .then((states) => {
                        const state = states.find(
                            (candidate) => candidate.sourceId === event.sourceId,
                        );
                        if (state) {
                            advanceWatermark(state.sourceId, terminalCompletionStamp(state));
                        }
                    })
                    .catch(() => undefined);
            }
        },
    );

    const appStateSubscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
            void reconcileCatalogSyncCompletion();
        }
    });

    return () => {
        installed = false;
        eventSubscription.remove();
        appStateSubscription.remove();
    };
};

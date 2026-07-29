import { NativeModules } from 'react-native';

import {
    getServerConnectionKey,
    type ServerAuthenticationResult,
} from '@samo/core/server';

/**
 * Phase 5 PROPER: the catalog sync runs entirely in Kotlin under WorkManager —
 * no React headless context, no JS context boot from a backgrounded process.
 * This module is just the JS-side handle to the native scheduler + auth mirror.
 *
 * The Kotlin worker reads connections from `SamoAuthMirror` (a plaintext JSON
 * file under filesDir), so JS pushes the mirror whenever the SecureStore-
 * backed connection list changes. That's all JS does for sync now: schedule
 * the periodic work, push the mirror on auth change, optionally fire a
 * one-shot sync from the sync-now button.
 */

interface SamoCatalogSyncBridge {
    schedule(): Promise<void>;
    triggerNow(): Promise<void>;
    cancel(): Promise<void>;
}

interface SamoAuthMirrorBridge {
    save(
        connections: Array<{
            type: string;
            url: string;
            credential: string;
            connectionKey?: string;
            ndCredential?: string;
        }>,
    ): Promise<void>;
    clear(): Promise<void>;
}

const getCatalogSyncBridge = (): SamoCatalogSyncBridge | undefined =>
    NativeModules.SamoCatalogSync as SamoCatalogSyncBridge | undefined;

const getAuthMirrorBridge = (): SamoAuthMirrorBridge | undefined =>
    NativeModules.SamoAuthMirror as SamoAuthMirrorBridge | undefined;

/**
 * Install (or re-join) the periodic WorkManager schedule. KEEP policy on the
 * native side means subsequent app launches don't reset the interval timer.
 */
export const schedulePeriodicCatalogSync = async (): Promise<void> => {
    const bridge = getCatalogSyncBridge();
    if (!bridge) return;
    try {
        await bridge.schedule();
    } catch {
        // Schedule install is best-effort. If WorkManager can't install for
        // some reason, the user can still sync via the foreground button.
    }
};

/**
 * Fire a one-shot catalog sync on top of the periodic schedule. Routes
 * through the same WorkManager + Kotlin sync path so the sync-now button
 * and the periodic refresh exercise identical code.
 */
export const triggerCatalogSyncNow = async (): Promise<void> => {
    const bridge = getCatalogSyncBridge();
    if (!bridge) return;
    try {
        await bridge.triggerNow();
    } catch {
        // ignore — the JS-side syncSamoCatalog still runs as a foreground
        // fallback for now.
    }
};

/**
 * Cancel both the periodic + any in-flight one-shot. Used by sign-out flows.
 */
export const cancelCatalogSyncSchedule = async (): Promise<void> => {
    const bridge = getCatalogSyncBridge();
    if (!bridge) return;
    try {
        await bridge.cancel();
    } catch {
        // ignore
    }
};

/**
 * Push the current Samo connections to the Kotlin auth mirror so the
 * background Worker has credentials to mint stream tokens + hit list
 * endpoints. Call after every successful save to SecureStore.
 *
 * Only Samo connections are mirrored (the other server types still use the
 * live-network path; Kotlin doesn't sync them).
 */
export const syncCatalogAuthMirror = async (
    connections: ServerAuthenticationResult[],
): Promise<void> => {
    const bridge = getAuthMirrorBridge();
    if (!bridge) return;
    const samo = connections
        .filter((auth) => auth)
        .map((auth) => ({
            type: auth.type as string,
            url: auth.url,
            credential: auth.credential,
            // The key the Kotlin sync files every mirrored row under. It has to
            // travel with the connection: the worker cannot derive it from the
            // address any more, because the address is now whichever of the
            // server's endpoints we happen to be reaching it on.
            connectionKey: getServerConnectionKey(auth),
        }));
    try {
        await bridge.save(samo);
    } catch {
        // mirror push is best-effort; the next save will retry. The worker
        // can still operate from a stale mirror in the worst case.
    }
};

/**
 * Drop the auth mirror — used by sign-out / clear-data flows so a stale set
 * of credentials can't outlive the user's SecureStore wipe.
 */
export const clearCatalogAuthMirror = async (): Promise<void> => {
    const bridge = getAuthMirrorBridge();
    if (!bridge) return;
    try {
        await bridge.clear();
    } catch {
        // ignore
    }
};

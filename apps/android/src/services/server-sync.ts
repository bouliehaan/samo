import { Image as ExpoImage } from 'expo-image';

import { getAuthSession } from '../state/auth-session';
import { getPlaybackBridge } from '../state/playback-bridge';
import { getAndroidPlaybackState } from '../state/playback-store';
import {
    getAbsProgressSeconds,
    getPlayerPositionMsForAbsProgress,
} from '../utils/abs-progress-math';
import { loadAbsCurrentProgress } from './abs-progress';
import { triggerCatalogSyncNow } from './headless-catalog-sync';
import { loadHomeForConnection } from './home-flow';

/** The Settings "Sync with server" action. */
export const syncWithServer = async (): Promise<{ message?: string; ok: boolean }> => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return { message: 'No servers connected', ok: false };
    }
    try {
        // Three coordinated calls per sync. Loading home content first so
        // the rest of the app's view of the libraries is fresh, then
        // re-mirroring the Samo catalog. Audiobook/podcast progress writes
        // are owned by the native Kotlin sync (SamoProgressSync), so JS no
        // longer pushes them here.
        //
        // Memory cache for artwork gets flushed too — disk cache stays
        // since covers don't change unless the user re-uploads them, but
        // the in-memory LRU might be holding decoded bitmaps for items
        // whose URL changed (server moved coverArt to a different id).
        // This is the only point in the app where we deliberately
        // invalidate; everything else trusts the cache.
        await ExpoImage.clearMemoryCache();
        // Explicit user sync — force Home to re-render with the fresh result.
        await loadHomeForConnection(serverConnection);
        // Refresh the on-device mirror. The sync engine is Kotlin
        // (SamoCatalogSync via WorkManager) — this just enqueues a one-shot
        // run; live progress streams into the Settings "Local library"
        // panel via SamoCatalogSyncState events, and the post-sync artwork
        // prefetch fires from the sync-completed bridge.
        void triggerCatalogSyncNow();
        // If there's a currently-active audiobook context, re-read its
        // progress from the server in case another client moved ahead.
        const bridge = getPlaybackBridge();
        const absCtx = bridge.absContextRef.current;
        if (absCtx) {
            const playbackState = getAndroidPlaybackState();
            const fresh = await loadAbsCurrentProgress(
                absCtx.authentication,
                absCtx.itemId,
                absCtx.episodeId,
            );
            const currentPosMs =
                playbackState.status !== 'idle'
                    ? getAbsProgressSeconds(absCtx, playbackState.positionMs, playbackState.item) *
                      1000
                    : 0;
            if (fresh && fresh.currentTimeSeconds * 1000 > currentPosMs + 5_000) {
                // Only seek forward and only if the gap is meaningful; a
                // 5-second buffer keeps us from interrupting playback when
                // local and server values trivially differ.
                await bridge.seekPlayback(
                    getPlayerPositionMsForAbsProgress(
                        fresh.currentTimeSeconds,
                        playbackState.status !== 'idle' ? playbackState.item : undefined,
                    ),
                );
            }
        }
        return { ok: true };
    } catch (error) {
        return {
            message: error instanceof Error ? error.message : 'Sync failed',
            ok: false,
        };
    }
};

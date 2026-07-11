import { memo, useEffect, useRef } from 'react';

import { useAndroidCastSync } from '../hooks/use-android-cast-sync';
import { useAndroidNativePlayback } from '../hooks/use-android-native-playback';
import { useAndroidPlaybackControls } from '../hooks/use-android-playback-controls';
import { useAndroidRadioMetadataSync } from '../hooks/use-android-radio-metadata-sync';
import {
    loadPersistedLastPlayedItem,
    savePersistedLastPlayedItem,
} from '../services/last-played-item';
import { setLastPlayedItem, useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { registerPlaybackBridge } from '../state/playback-bridge';
import {
    selectActiveAndroidPlaybackItem,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { getLastPlayedPersistenceKey } from '../utils/last-played';
import { refreshPlayableResumeFromServer } from '../utils/playback-resume';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';

/**
 * Headless owner of the playback machinery: the native audio bridge, the
 * transport controls, cast + radio-metadata sync, and everything
 * lastPlayedItem. It renders null, so the playback-state churn these hooks
 * subscribe to (position/status events, cast events, session writes)
 * re-renders this component — never App. Everything imperative is published
 * through the playback bridge for handlers and hosts to call.
 */
export const PlaybackEngine = memo(function PlaybackEngine() {
    const lastPlayedItem = useAppSessionSelector((state) => state.lastPlayedItem);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);

    const {
        absContextRef,
        handlePlayItem,
        playbackSnapshotRef,
        playQueuedItem,
        playQueueIndexNatively,
        registerNavigatePlayback,
    } = useAndroidNativePlayback({ lastPlayedItem, serverConnection });

    const {
        handleCycleRepeatMode,
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    } = useAndroidPlaybackControls({
        lastPlayedItem,
        playbackSnapshotRef,
        playQueueIndexNatively,
        playQueuedItem,
        serverConnection,
    });

    useAndroidRadioMetadataSync(serverConnection);
    useAndroidCastSync();

    // Publish the engine's imperative surface. Assigned during render (an
    // idempotent module write) so the bridge is live before the first frame
    // can take a tap; re-assigned as the underlying callbacks refresh.
    registerPlaybackBridge({
        absContextRef,
        cycleRepeatMode: handleCycleRepeatMode,
        handlePlayItem,
        navigatePlayback: handleNavigatePlayback,
        playbackSnapshotRef,
        playQueuedItem,
        playQueueIndexNatively,
        seekPlayback: handleSeekPlayback,
        skipPlayback: handleSkipPlayback,
        togglePlayback: handleTogglePlayback,
        toggleShuffle: handleToggleShuffle,
    });

    useEffect(() => {
        registerNavigatePlayback(handleNavigatePlayback);
    }, [handleNavigatePlayback, registerNavigatePlayback]);

    // ------------------------------------------------------------------
    // lastPlayedItem lifecycle (was App.tsx's): restore at boot, follow the
    // active item, keep artwork + resume position fresh.
    // ------------------------------------------------------------------
    const lastPlayedPersistenceKeyRef = useRef<null | string>(null);

    useEffect(() => {
        let isMounted = true;

        void loadPersistedLastPlayedItem().then(async (item) => {
            if (!isMounted || !item) {
                return;
            }
            const refreshed =
                item.source === 'podcast' || item.source === 'audiobook'
                    ? await refreshPlayableResumeFromServer(item, serverConnection)
                    : item;
            lastPlayedPersistenceKeyRef.current = getLastPlayedPersistenceKey(refreshed);
            setLastPlayedItem(refreshed);
            const resumeSeconds = Math.max(
                refreshed.progressOffsetSeconds ?? 0,
                refreshed.initialPositionSeconds ?? 0,
            );
            if (resumeSeconds > 0) {
                void savePersistedLastPlayedItem(refreshed);
            }
        });

        return () => {
            isMounted = false;
        };
        // Boot restore runs once; serverConnection is almost always still null
        // when it fires (restore precedes connect) — matching the old App.tsx
        // mount-effect timing exactly.
         
    }, []);

    useEffect(() => {
        if (!activePlaybackItem) {
            return;
        }
        const item = activePlaybackItem;
        const persistenceKey = getLastPlayedPersistenceKey(item);
        if (lastPlayedPersistenceKeyRef.current === persistenceKey) {
            setLastPlayedItem((current) => current ?? item);
            return;
        }
        lastPlayedPersistenceKeyRef.current = persistenceKey;
        setLastPlayedItem(item);
        void savePersistedLastPlayedItem(item);
    }, [activePlaybackItem]);

    useEffect(() => {
        if (!serverConnection || !lastPlayedItem) {
            return;
        }

        let cancelled = false;
        void preparePlaybackItemForNative(lastPlayedItem, serverConnection).then((patched) => {
            if (
                cancelled ||
                (patched.artworkUrl === lastPlayedItem.artworkUrl &&
                    patched.artworkImageId === lastPlayedItem.artworkImageId)
            ) {
                return;
            }
            setLastPlayedItem(patched);
        });

        return () => {
            cancelled = true;
        };
        // Keyed on identity + artwork fields only — a fresh object with the
        // same artwork must not loop this effect.
         
    }, [lastPlayedItem?.id, lastPlayedItem?.artworkImageId, serverConnection]);

    useEffect(() => {
        if (!serverConnection || !lastPlayedItem) {
            return;
        }
        if (lastPlayedItem.source !== 'podcast' && lastPlayedItem.source !== 'audiobook') {
            return;
        }
        const streamResume =
            lastPlayedItem.progressOffsetSeconds ?? lastPlayedItem.initialPositionSeconds ?? 0;
        if (streamResume > 0) {
            return;
        }

        let cancelled = false;
        void refreshPlayableResumeFromServer(lastPlayedItem, serverConnection).then(
            (refreshed) => {
                if (cancelled) {
                    return;
                }
                const positionSeconds = Math.max(
                    refreshed.progressOffsetSeconds ?? 0,
                    refreshed.initialPositionSeconds ?? 0,
                );
                if (positionSeconds <= 0) {
                    return;
                }
                setLastPlayedItem(refreshed);
                void savePersistedLastPlayedItem(refreshed);
            },
        );

        return () => {
            cancelled = true;
        };
        // Same keying rationale as the artwork backfill above.
         
    }, [
        lastPlayedItem?.id,
        lastPlayedItem?.initialPositionSeconds,
        lastPlayedItem?.progressOffsetSeconds,
        lastPlayedItem?.source,
        serverConnection,
    ]);

    return null;
});

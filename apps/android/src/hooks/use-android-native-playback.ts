import type { MobilePlayableAudio } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { AppState } from 'react-native';

import { setDownloadsPlaybackActive } from '../services/download-manager';
import type { PlaybackProgressContext } from '../services/playback-progress';
import { useAppSessionSelector } from '../state/app-session';
import { type AndroidPlaybackQueue } from '../state/playback-queue-store';
import { selectAndroidPlaybackStatus, useAndroidPlaybackState } from '../state/playback-store';
import {
    createNativePlaybackContext,
    type AndroidPlayItemOptions,
    type NativePlaybackContext,
} from './native-playback/context';
import { attachNativeAudioEventSubscription } from './native-playback/event-sync';
import { hydrateNativePlaybackState } from './native-playback/hydrate';
import { playQueuedItem } from './native-playback/play-item';
import {
    attachNavigationRequestSubscription,
    catchUpQueueAfterForeground,
    playQueueIndexNatively,
} from './native-playback/queue-navigation';

export type { AndroidPlaybackQueue };
export type { AndroidPlayItemOptions };

export interface AndroidNativePlaybackController {
    progressContextRef: MutableRefObject<PlaybackProgressContext | null>;
    handlePlayItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    hydrateNativePlaybackState: () => Promise<void>;
    playbackSnapshotRef: MutableRefObject<null | {
        item: MobilePlayableAudio;
        sessionId: string;
    }>;
    /**
     * Step playback to another queue entry through the native queue primitive
     * (the same one the lock screen uses). Returns false when native can't
     * take it — the caller then falls back to a full playQueuedItem restart.
     */
    playQueueIndexNatively: (targetIndex: number) => Promise<boolean>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    registerNavigatePlayback: (handler: (direction: -1 | 1) => Promise<void>) => void;
}

/**
 * The JS side of the native playback bridge. All behavior lives in
 * ./native-playback/* as module functions over one mutable session context
 * (see NativePlaybackContext); this hook creates that context, mirrors the
 * few live inputs into it, wires the native subscriptions, and exposes the
 * stable controller. Keeping the functions module-level (not per-render
 * closures) is what makes every callback referentially stable for the life
 * of the hook — a recreated playQueuedItem used to cascade into audio-event
 * resubscribes with a window where native events were dropped.
 */
export function useAndroidNativePlayback(options: {
    lastPlayedItem: MobilePlayableAudio | null;
    serverConnection: ServerAuthenticationResult | null;
}): AndroidNativePlaybackController {
    const { lastPlayedItem, serverConnection } = options;
    // Slice subscription: this hook only cares whether cast owns playback. The
    // full session store changes on every recents/favorites write, which used
    // to re-render this hook (and recreate its callbacks) constantly.
    const castConnected = useAppSessionSelector((state) => state.castState.isConnected);
    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);

    const ctxRef = useRef<NativePlaybackContext | null>(null);
    if (ctxRef.current === null) {
        const created = createNativePlaybackContext();
        created.castConnectedRef.current = castConnected;
        created.lastPlayedItemRef.current = lastPlayedItem;
        created.serverConnectionsRef.current = serverConnection;
        ctxRef.current = created;
    }
    const ctx = ctxRef.current;

    // Live handles for values the playback functions need without being
    // recreated on every auth/cast change (see NativePlaybackContext).
    useEffect(() => {
        ctx.serverConnectionsRef.current = serverConnection;
    }, [ctx, serverConnection]);
    useEffect(() => {
        ctx.castConnectedRef.current = castConnected;
    }, [castConnected, ctx]);
    useEffect(() => {
        ctx.lastPlayedItemRef.current = lastPlayedItem;
    }, [ctx, lastPlayedItem]);

    useEffect(() => attachNativeAudioEventSubscription(ctx), [ctx]);
    useEffect(() => attachNavigationRequestSubscription(ctx), [ctx]);

    useEffect(() => {
        setDownloadsPlaybackActive(playbackStatus !== 'idle');
    }, [playbackStatus]);

    // Re-hydrates when the persisted last-played item finishes loading, so a
    // recovered idle-native session gets the richest fallback item available.
    useEffect(() => {
        void hydrateNativePlaybackState(ctx);
    }, [ctx, lastPlayedItem]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                // Native auto-advance may have run during sleep; reconcile UI
                // state + retry advance if native failed (out-of-pocket mint
                // failure etc). Progress writes survive Doze inside the native
                // foreground service (SamoProgressSync), so nothing is flushed
                // from here.
                void hydrateNativePlaybackState(ctx).then(() => catchUpQueueAfterForeground(ctx));
            }
        });

        return () => subscription.remove();
    }, [ctx]);

    const playQueuedItemStable = useCallback(
        (
            item: MobilePlayableAudio,
            queueItems?: MobilePlayableAudio[],
            queueIndex?: number,
            playOptions?: AndroidPlayItemOptions,
        ) => playQueuedItem(ctx, item, queueItems, queueIndex, playOptions),
        [ctx],
    );

    const playQueueIndexNativelyStable = useCallback(
        (targetIndex: number) => playQueueIndexNatively(ctx, targetIndex),
        [ctx],
    );

    const hydrateStable = useCallback(() => hydrateNativePlaybackState(ctx), [ctx]);

    const registerNavigatePlayback = useCallback(
        (handler: (direction: -1 | 1) => Promise<void>) => {
            ctx.navigateRef.current = handler;
        },
        [ctx],
    );

    return {
        progressContextRef: ctx.progressContextRef,
        handlePlayItem: playQueuedItemStable,
        hydrateNativePlaybackState: hydrateStable,
        playbackSnapshotRef: ctx.playbackSnapshotRef,
        playQueueIndexNatively: playQueueIndexNativelyStable,
        playQueuedItem: playQueuedItemStable,
        registerNavigatePlayback,
    };
}

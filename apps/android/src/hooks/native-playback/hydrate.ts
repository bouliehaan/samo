import {
    getAndroidPlaybackStatus,
    isAndroidNativePlaybackAvailable,
} from '../../services/audio-playback';
import { setAppSessionRepeatMode } from '../../state/app-session';
import { getPlaybackQueue } from '../../state/playback-queue-store';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../../state/playback-store';
import { buildRecoveredPlaybackItem } from '../../utils/playback-recovery';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    resolvePlaybackProgressFromEvent,
} from '../../utils/playback-time';
import { type NativePlaybackContext } from './context';
import { syncPlaybackFromNativeEvent } from './event-sync';

/**
 * Adopt whatever the native playback service is doing right now — on JS boot
 * (the service survives a JS restart) and on returning to the foreground
 * (native may have auto-advanced while JS was Doze-frozen).
 */
export const hydrateNativePlaybackState = async (ctx: NativePlaybackContext): Promise<void> => {
    if (!isAndroidNativePlaybackAvailable()) {
        return;
    }

    try {
        const event = await getAndroidPlaybackStatus();
        // Native owns the repeat SETTING (it survives a JS restart while the
        // playback service keeps the process). Adopt it even when idle so
        // the button doesn't silently disagree with the engine.
        if (event.repeatMode) {
            setAppSessionRepeatMode(event.repeatMode);
        }
        if (event.status === 'idle') {
            return;
        }

        syncPlaybackFromNativeEvent(ctx, event);

        const currentPlaybackState = getAndroidPlaybackState();
        if (currentPlaybackState.status !== 'idle') {
            const sessionMatches =
                !event.sessionId || event.sessionId === currentPlaybackState.sessionId;
            const queueSourceMatches = Boolean(
                event.source?.id &&
                    getPlaybackQueue()?.items.some((item) => item.id === event.source?.id),
            );
            if (!sessionMatches && !queueSourceMatches) {
                return;
            }
        }

        const item =
            ctx.playbackSnapshotRef.current?.item ??
            (currentPlaybackState.status !== 'idle'
                ? currentPlaybackState.item
                : buildRecoveredPlaybackItem(
                      event,
                      ctx.playbackSnapshotRef.current?.item ?? ctx.lastPlayedItemRef.current,
                  ));
        if (!item) {
            return;
        }

        const sessionId =
            ctx.playbackSnapshotRef.current?.sessionId ??
            (currentPlaybackState.status !== 'idle'
                ? currentPlaybackState.sessionId
                : (event.sessionId ?? `recovered:${item.id}`));
        ctx.playbackSnapshotRef.current = { item, sessionId };
        setAndroidPlaybackState((current) => {
            if (current.status !== 'idle' && current.sessionId !== sessionId) {
                return current;
            }

            const activeItem =
                current.status !== 'idle' && current.sessionId === sessionId
                    ? current.item
                    : item;
            const progress =
                current.status === 'idle'
                    ? {
                          durationMs: getPlaybackEventDurationMs(event, activeItem),
                          positionMs: event.positionMs,
                      }
                    : resolvePlaybackProgressFromEvent(event, current, activeItem);

            return {
                bitPerfect:
                    event.bitPerfect ??
                    (current.status === 'idle' ? undefined : current.bitPerfect),
                durationMs: progress.durationMs,
                item: activeItem,
                message:
                    event.message ?? (current.status === 'idle' ? undefined : current.message),
                positionMs: progress.positionMs,
                sessionId,
                status: getActivePlaybackStatus(
                    event.status,
                    current.status === 'idle' ? 'paused' : current.status,
                ),
            };
        });
    } catch {
        // Best-effort recovery; live subscription still owns updates.
    }
};

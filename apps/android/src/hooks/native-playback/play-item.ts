import type { MobilePlayableAudio } from '@samo/core/mobile';
import { createPlaybackSession } from '@samo/core/playback';

import {
    getAndroidAudioDeviceInfo,
    isAndroidNativePlaybackAvailable,
    playAndroidAudio,
    seekAndroidAudio,
    shouldMirrorPlaybackQueueToNative,
} from '../../services/audio-playback';
import { getPlaybackQueue, setPlaybackQueue } from '../../state/playback-queue-store';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../../state/playback-store';
import { setAppSessionIsShuffled } from '../../state/app-session';
import { isOfflineNow } from '../../state/network-state';
import { buildPlaybackProgressContextFromPlayable } from '../../utils/playback-progress-math';
import { resolveLocalPlayback } from '../../utils/offline-playback';
import {
    getResumePositionSeconds,
    mergePreparedQueueItem,
    refreshPlayableResumeFromServerBounded,
    withResumePosition,
} from '../../utils/playback-resume';
import {
    getActivePlaybackStatus,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS,
} from '../../utils/playback-time';
import { preparePlaybackItemForNative } from '../../utils/samo-artwork-url';
import { shouldServerSeekAudiobookMp3 } from '../../utils/samo-audiobook-playback';
import { streamUrlHasEmbeddedResume } from '../../utils/stream-resume-url';
import { type AndroidPlayItemOptions, type NativePlaybackContext } from './context';

/**
 * The cue shown on the optimistic mini-player during the start-up window
 * (token mint + stream resolve + first buffer), so a tap reads as "starting"
 * not "stuck". Music starts fast enough to need none.
 */
const getPlaybackStartMessage = (item: MobilePlayableAudio): string | undefined => {
    switch (item.source) {
        case 'radio':
            return 'Tuning in…';
        case 'podcast':
            return 'Loading episode…';
        case 'audiobook':
            return 'Loading audiobook…';
        default:
            return undefined;
    }
};

export const playQueuedItem = async (
    ctx: NativePlaybackContext,
    item: MobilePlayableAudio,
    queueItems: MobilePlayableAudio[] = [item],
    queueIndex?: number,
    playOptions?: AndroidPlayItemOptions,
): Promise<void> => {
    if (!isAndroidNativePlaybackAvailable()) {
        setAndroidPlaybackState({
            item,
            message: 'Native Android audio engine is not available in this build.',
            sessionId: 'unavailable',
            status: 'error',
        });
        return;
    }

    const playableQueueItems = queueItems.length > 0 ? queueItems : [item];
    const requestedQueueIndex =
        queueIndex ??
        Math.max(
            0,
            playableQueueItems.findIndex((candidate) => candidate.id === item.id),
        );
    const nextQueueIndex = Math.min(
        Math.max(0, requestedQueueIndex),
        Math.max(0, playableQueueItems.length - 1),
    );
    const playbackState = getAndroidPlaybackState();
    const explicitBookStart = playOptions?.bookStartSeconds;
    const skipResumeRefresh = playOptions?.skipResumeRefresh === true;

    // ── Synchronous commit phase — NO awaits above the loading write. ──
    //
    // The tap must paint NOW. This block (session, snapshot, lock,
    // queue, loading state) runs before any network wait, which buys
    // two structural guarantees:
    //  1. A tap always responds instantly, even when the server is
    //     slow — the old order awaited a server progress read FIRST,
    //     so a sick server made taps look completely dead.
    //  2. The snapshot commit IS the request-generation guard: a newer
    //     tap overwrites it synchronously, and every await below is
    //     followed by an isCurrentPlaybackSession() check — a stale
    //     tap's continuation aborts instead of stomping the user's
    //     latest choice. Without this, every tap made during a slow
    //     spell queued up and then REPLAYED in completion order (the
    //     "everything I tried flashes through the screen" pile-up).
    //
    // The provisional start position is the item's own resume; the
    // server overlay below may move it (same session) before play().
    // Music tracks never resume from initialPositionSeconds — see the
    // matching guard in getResumePositionSeconds and Kotlin's
    // SamoAudioEngine (resumeMs = 0L for music transitions).
    const itemInitialPosition =
        item.source === 'music' ? undefined : item.initialPositionSeconds;
    const provisionalResumeSeconds =
        explicitBookStart !== undefined
            ? 0
            : (itemInitialPosition ??
              (skipResumeRefresh
                  ? 0
                  : (getResumePositionSeconds(item, playbackState) ?? 0)));
    const provisionalPositionMs =
        provisionalResumeSeconds > 0 ? provisionalResumeSeconds * 1000 : 0;

    const session = createPlaybackSession({
        engine: 'android-native',
        mediaKey: item.id,
        sequence: (ctx.playbackSequenceRef.current += 1),
        source: item.source,
    });
    if (playOptions?.shuffled !== undefined) {
        setAppSessionIsShuffled(playOptions.shuffled);
    }

    // Where the queue CAME FROM is a fact about the queue, not about one play
    // call — but it used to be re-derived from `playOptions` on every play, so
    // every entry point that merely steps the queue it is already on (a tap in
    // Up Next, the JS Next fallback, a reconnect or Doze restart) silently
    // erased it: the playlist scrobble stopped and the Explore actions vanished
    // mid-listen. Handing back the live queue's own items array IS the "same
    // queue" signal — a genuinely new context builds a new array and states its
    // own origin.
    const liveQueue = getPlaybackQueue();
    const queueOrigin =
        liveQueue && liveQueue.items === playableQueueItems
            ? {
                  editablePlaylist: liveQueue.editablePlaylist,
                  isExploPlaylist: liveQueue.isExploPlaylist,
                  omitTrackRecentlyPlayed: liveQueue.omitTrackRecentlyPlayed,
                  samoPlaylistId: liveQueue.samoPlaylistId,
              }
            : {
                  editablePlaylist: playOptions?.editablePlaylist,
                  isExploPlaylist: playOptions?.isExploPlaylist,
                  omitTrackRecentlyPlayed: playOptions?.omitTrackRecentlyPlayed,
                  samoPlaylistId: playOptions?.samoPlaylistId,
              };

    setPlaybackQueue({
        ...queueOrigin,
        index: nextQueueIndex,
        items: playableQueueItems,
    });
    // Deliberately NO syncAndroidNativePlaybackQueue here: the play()
    // payload below carries the full queue atomically. A pre-play sync
    // made the native side reconcile the NEW queue against the OLD
    // still-playing playlist (rewriting the live player and mutating
    // the mirror's index) milliseconds before play() rebuilt
    // everything anyway — a second writer racing the play command for
    // zero benefit. Up-Next EDITS (enqueue/reorder/shuffle-toggle)
    // still sync explicitly from their own handlers.
    const supersededSessionId = ctx.playbackSnapshotRef.current?.sessionId;
    if (supersededSessionId && supersededSessionId !== session.id) {
        const retired = ctx.retiredSessionsRef.current;
        retired.add(supersededSessionId);
        while (retired.size > 8) {
            const oldest = retired.values().next().value;
            if (oldest === undefined) break;
            retired.delete(oldest);
        }
    }
    ctx.playbackSnapshotRef.current = { item, sessionId: session.id };
    ctx.pendingItemSessionRef.current = session.id;
    ctx.playbackRecoveryAttemptRef.current = 0;
    ctx.playbackStartedAtRef.current = Date.now();
    setAndroidPlaybackState({
        durationMs: getPlaybackItemDurationMs(item),
        item,
        // A source-appropriate cue so the optimistic mini-player reads as
        // "starting" rather than "stuck" during the unavoidable token
        // mint + stream resolve + first buffer (radio/podcast can take a
        // few seconds). Cleared by the native event's own `event.message`
        // the instant playback actually begins.
        message: getPlaybackStartMessage(item),
        // Anchor the new session to its intended start. The reducer's
        // pending-seek grace then HOLDS the playhead here and rejects
        // any sample that lands far from it until native confirms the
        // new track is actually playing near the start. This is what
        // stops a trailing position tick from the OUTGOING track (e.g.
        // 0:52 of the song you just skipped) from poisoning the new
        // track's playhead during the Next/Prev transition window — the
        // "hit Next, bar snaps back to the previous song's time and
        // sticks" bug. Identity-agnostic: catches the poison whether the
        // stale tick carries the old source id, the new one, or none.
        pendingSeekAtMs: Date.now(),
        pendingSeekTargetMs: provisionalPositionMs,
        positionMs: provisionalPositionMs,
        sessionId: session.id,
        status: 'loading',
    });
    ctx.progressContextRef.current = buildPlaybackProgressContextFromPlayable(
        item,
        ctx.serverConnectionsRef.current,
    );
    const isCommittedPlaybackSession = () =>
        ctx.playbackSnapshotRef.current?.sessionId === session.id;

    // ── Async phase — every await is followed by a session check. ──
    const baseItem =
        explicitBookStart !== undefined && item.source === 'audiobook'
            ? item
            : skipResumeRefresh
              ? item
              : item.source === 'podcast' || item.source === 'audiobook'
                ? await refreshPlayableResumeFromServerBounded(
                      item,
                      ctx.serverConnectionsRef.current,
                  )
                : item;
    if (!isCommittedPlaybackSession()) return;
    const resumeSeconds =
        explicitBookStart !== undefined
            ? 0
            : skipResumeRefresh
              ? (item.source === 'music' ? 0 : (item.initialPositionSeconds ?? 0))
              : (getResumePositionSeconds(baseItem, playbackState) ?? 0);
    // For an MP3 audiobook, open the stream PRE-POSITIONED at the resume second
    // via the server's frame-accurate seek instead of a native seek. ExoPlayer's
    // Xing seek lands tens of seconds off on a long VBR file, and a deep native
    // seek can stall the load for minutes; opening the byte-positioned stream is
    // instant and exact. progressOffsetSeconds becomes the book-time at the
    // stream's start and there is no native seek (initialPositionMs = 0).
    const prePositionResume =
        resumeSeconds > 0 &&
        explicitBookStart === undefined &&
        shouldServerSeekAudiobookMp3(baseItem);
    const itemToPlay = prePositionResume
        ? { ...baseItem, initialPositionSeconds: undefined, progressOffsetSeconds: resumeSeconds }
        : withResumePosition(baseItem, resumeSeconds);
    const initialPositionMs =
        prePositionResume || !resumeSeconds || resumeSeconds <= 0 ? 0 : resumeSeconds * 1000;
    ctx.progressContextRef.current = buildPlaybackProgressContextFromPlayable(
        itemToPlay,
        ctx.serverConnectionsRef.current,
    );

    const nativeItem = await preparePlaybackItemForNative(
        itemToPlay,
        ctx.serverConnectionsRef.current,
    );
    if (!isCommittedPlaybackSession()) return;
    const currentQueueItem = playableQueueItems[nextQueueIndex];
    // The refreshed slot keeps its ORIGINAL resume semantics — the
    // session's transient start position must not become the slot's
    // permanent one (see mergePreparedQueueItem).
    const queueItemsForSession =
        currentQueueItem &&
        (currentQueueItem.url !== nativeItem.url ||
            currentQueueItem.castUrl !== nativeItem.castUrl ||
            currentQueueItem.artworkUrl !== nativeItem.artworkUrl)
            ? playableQueueItems.map((queueItem, index) =>
                  index === nextQueueIndex
                      ? mergePreparedQueueItem(currentQueueItem, nativeItem)
                      : queueItem,
              )
            : playableQueueItems;
    if (queueItemsForSession !== playableQueueItems) {
        setPlaybackQueue({
            ...queueOrigin,
            index: nextQueueIndex,
            items: queueItemsForSession,
        });
    }

    // Re-commit with the prepared item + the final (possibly server-
    // refreshed) start position. Same session — the loading write
    // above already owns the surface; this just settles the details.
    ctx.playbackSnapshotRef.current = { item: nativeItem, sessionId: session.id };
    setAndroidPlaybackState((current) =>
        current.status === 'idle' || current.sessionId !== session.id
            ? current
            : {
                  ...current,
                  durationMs: getPlaybackItemDurationMs(nativeItem) ?? current.durationMs,
                  item: nativeItem,
                  ...(initialPositionMs !== provisionalPositionMs
                      ? {
                            pendingSeekAtMs: Date.now(),
                            pendingSeekTargetMs: initialPositionMs,
                            positionMs: initialPositionMs,
                        }
                      : {}),
                  status: 'loading',
              },
    );

    const nativeQueue =
        itemToPlay.source !== 'radio' &&
        shouldMirrorPlaybackQueueToNative({
            index: nextQueueIndex,
            items: queueItemsForSession,
        })
            ? {
                  index: nextQueueIndex,
                  items: queueItemsForSession,
                  samoPlaylistId: queueOrigin.samoPlaylistId,
              }
            : undefined;

    try {
        const isCurrentPlaybackSession = () =>
            ctx.playbackSnapshotRef.current?.sessionId === session.id;
        const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
        const playable = ctx.castConnectedRef.current
            ? nativeItem
            : await resolveLocalPlayback(nativeItem);
        if (!isCurrentPlaybackSession()) return;

        // Offline, `resolveLocalPlayback` has just given the authoritative
        // answer to "is this on the device?" — so a URL that is still remote is
        // a track that cannot play, and starting it would buffer until the
        // recovery layer parked it with no explanation. Say so instead. This
        // sits AFTER the resolve deliberately: the synchronous registry peek
        // used elsewhere answers null while the registry is cold, and refusing
        // to play something the user did download is far worse than a slow no.
        if (isOfflineNow() && /^https?:/i.test(playable.url)) {
            setAndroidPlaybackState({
                durationMs: getPlaybackItemDurationMs(nativeItem),
                item: nativeItem,
                message: 'Not available offline.',
                positionMs: 0,
                sessionId: session.id,
                status: 'error',
            });
            return;
        }

        let event = await playAndroidAudio(
            playable,
            session.id,
            nativeItem,
            nativeQueue,
            ctx.serverConnectionsRef.current,
        );
        if (!isCurrentPlaybackSession()) return;

        const embeddedStreamResume =
            streamUrlHasEmbeddedResume(nativeItem.url) &&
            (nativeItem.progressOffsetSeconds ?? 0) > 0;
        const shouldSeekAfterPlay =
            initialPositionMs > 0 &&
            !(embeddedStreamResume && !itemToPlay.initialPositionSeconds);
        if (shouldSeekAfterPlay) {
            event = await seekAndroidAudio(initialPositionMs);
            if (!isCurrentPlaybackSession()) return;
        }

        const deviceInfo = await deviceInfoPromise;
        if (!isCurrentPlaybackSession()) return;

        setAndroidPlaybackState((current) => {
            // Do NOT re-stamp the playhead from event.positionMs here. By
            // the time play()/seek() resolves, that captured value is
            // unreliable: it can echo the OUTGOING track's old position
            // (writing it freezes the bar there — the backward guard then
            // rejects the new track's real, lower ticks until you
            // pause/play) OR the play-start 0 (which drags the bar back
            // after a live tick already advanced it: the "Next → 0 → 1 → 0"
            // blip). The loading write above already set the playhead to
            // the intended start — 0 for music, the resume point for a
            // podcast/audiobook — and the live poll/event stream owns it
            // from there. So keep the playhead this session already has;
            // only seed it for a brand-new/foreign session.
            const keptPositionMs =
                current.status !== 'idle' && current.sessionId === session.id
                    ? (current.positionMs ?? initialPositionMs)
                    : initialPositionMs;

            // Poison backstop: a trailing tick from the OUTGOING track
            // can land between the loading write and here and shove the
            // playhead far past the intended start (e.g. the 0:52 you
            // skipped from). If the kept playhead isn't plausibly near
            // where this session is meant to begin, discard it and snap
            // back to the start. Re-arm the anchor from THIS moment
            // (playback has actually begun now) so the reducer keeps
            // holding the start until native reports a real near-start
            // sample — robust even if the play()/seek() await outran the
            // loading write's grace window. A legitimately-advanced
            // playhead is within tolerance of the start at buffering
            // time, so this never yanks real progress backward.
            const poisoned =
                Math.abs(keptPositionMs - initialPositionMs) >
                PLAYBACK_PENDING_SEEK_TARGET_TOLERANCE_MS;
            const stillAnchoring =
                current.status !== 'idle' &&
                current.sessionId === session.id &&
                current.pendingSeekTargetMs !== undefined;

            return {
                bitPerfect: event.bitPerfect,
                deviceInfo,
                durationMs: getPlaybackEventDurationMs(event, nativeItem),
                item: nativeItem,
                message: event.message,
                pendingSeekAtMs: poisoned || stillAnchoring ? Date.now() : undefined,
                pendingSeekTargetMs: poisoned || stillAnchoring ? initialPositionMs : undefined,
                positionMs: poisoned ? initialPositionMs : keptPositionMs,
                sessionId: session.id,
                status: getActivePlaybackStatus(event.status, 'buffering'),
            };
        });

        // Advance-time freshness is native's job — SamoResolvingDataSource
        // re-mints music/podcast tokens as ExoPlayer opens each source, and
        // the mirror-queue advance path refreshes per item via
        // SamoNativeStreamUrl.refreshQueueItemAsync.
    } catch (error) {
        if (ctx.playbackSnapshotRef.current?.sessionId !== session.id) return;
        setAndroidPlaybackState({
            durationMs: getPlaybackItemDurationMs(nativeItem),
            item: nativeItem,
            message: error instanceof Error ? error.message : 'Playback failed',
            positionMs: initialPositionMs,
            sessionId: session.id,
            status: 'error',
        });
    }
};

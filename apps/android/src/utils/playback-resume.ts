import {
    applySamoPodcastStreamResume,
    type MobilePlayableAudio,
    parsePodcastPlaybackEpisodeId,
    parsePodcastPlaybackShowId,
    parseSamoAudiobookIdFromPlaybackId,
} from '@samo/core/mobile';
import { resolveLongFormResumeSeconds } from '@samo/core/playback';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { loadCurrentPlaybackProgress } from '../services/playback-progress';
import { type AndroidPlaybackState } from '../types/playback';

import { getNativeResumeProgress } from './native-resume';
import { isSamoAudiobookPlayback } from './samo-audiobook-playback';

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

/** Resume from the live playhead when restarting the same item after a blip. */
export const getResumePositionSeconds = (
    item: MobilePlayableAudio,
    playbackState: AndroidPlaybackState,
): number | undefined => {
    const canReusePlayhead =
        playbackState.status === 'paused' ||
        playbackState.status === 'error' ||
        playbackState.status === 'buffering';

    // Audiobooks keep the per-file origin guard: a multi-file book carries a
    // book-global progressOffsetSeconds per file, so a playhead may only be
    // reused when the origin matches (same file). Podcasts no longer do this —
    // they stream whole now (progressOffsetSeconds 0) and fall through to the
    // generic playhead reuse below, exactly like music.
    if (isSamoAudiobookPlayback(item)) {
        const streamOrigin = item.progressOffsetSeconds ?? 0;
        const currentOrigin =
            playbackState.status !== 'idle'
                ? (playbackState.item.progressOffsetSeconds ?? 0)
                : streamOrigin;

        if (
            canReusePlayhead &&
            playbackState.item.id === item.id &&
            Math.abs(currentOrigin - streamOrigin) < 2 &&
            (playbackState.positionMs ?? 0) > 0
        ) {
            return Math.floor((playbackState.positionMs ?? 0) / 1000);
        }

        // Not reusing the LIVE playhead (e.g. returning to the book from radio, or
        // a fresh open): honor the resume position baked into the item by the queue
        // build / refreshPlayableResumeFromServer, exactly like the music path
        // below. Returning 0 here was THE bug — the recovered position reached the
        // progress writer (the "started" write logged the right seconds) but never
        // became an actual seek, so the book played from 0 and then overwrote the
        // saved position with ~0.
        if (item.initialPositionSeconds && item.initialPositionSeconds > 0) {
            return item.initialPositionSeconds;
        }

        return 0;
    }

    if (
        canReusePlayhead &&
        playbackState.item.id === item.id &&
        (playbackState.positionMs ?? 0) > 0
    ) {
        return Math.floor((playbackState.positionMs ?? 0) / 1000);
    }

    // Music tracks always start at 0 — never honor a stale
    // initialPositionSeconds that leaked in via error recovery or queue
    // merging.  This matches the Kotlin side (SamoAudioEngine) which
    // enforces resumeMs = 0L for music on every native transition.
    // Long-form content (podcast/audiobook) is handled by the
    // isSamoAudiobookPlayback branch above and by
    // refreshPlayableResumeFromServer, so this path is only reached by
    // music and radio.
    if (
        item.source !== 'music' &&
        item.source !== 'radio' &&
        item.initialPositionSeconds &&
        item.initialPositionSeconds > 0
    ) {
        return item.initialPositionSeconds;
    }

    return undefined;
};

export const withResumePosition = (
    item: MobilePlayableAudio,
    positionSeconds: number | undefined,
): MobilePlayableAudio => {
    if (!positionSeconds || positionSeconds <= 0) {
        return item;
    }

    return {
        ...item,
        initialPositionSeconds: positionSeconds,
    };
};

/**
 * Drop a resume position the item was BUILT with, for when a fresher source
 * says there is nothing to resume to.
 *
 * `withResumePosition(item, 0)` cannot express this — it returns the item
 * untouched, because "no position to apply" and "start from the top" are the
 * same argument to it. That ambiguity is what let a finished episode keep its
 * end-of-file start position: nothing downstream ever looked at the resume
 * again, it just honored `initialPositionSeconds`.
 */
export const withoutResumePosition = (item: MobilePlayableAudio): MobilePlayableAudio => {
    if (item.initialPositionSeconds === undefined) {
        return item;
    }
    const { initialPositionSeconds: _finished, ...rest } = item;
    return rest;
};

/**
 * Merge a session-prepared playable back into its durable queue slot WITHOUT
 * the session's transient start position.
 *
 * playQueuedItem prepares the played item (fresh stream/artwork URLs — those
 * SHOULD flow back into the queue so native auto-advance gets current tokens)
 * but it also stamps `initialPositionSeconds` via withResumePosition when the
 * session resumes mid-track (error recovery, foreground catch-up, toggle
 * restart). Writing that transient value into the queue turned a one-off
 * resume into the slot's permanent start position: every later entry into the
 * slot — native auto-advance, lock-screen skip, Prev — started the track at
 * the stale timestamp. The queue keeps the resume semantics it was BUILT with
 * (podcast/audiobook build-time resume points stay); the session start
 * position travels only in the play() payload.
 */
export const mergePreparedQueueItem = (
    original: MobilePlayableAudio,
    prepared: MobilePlayableAudio,
): MobilePlayableAudio => {
    if (prepared.initialPositionSeconds === original.initialPositionSeconds) {
        return prepared;
    }

    const { initialPositionSeconds: _transient, ...rest } = prepared;
    return original.initialPositionSeconds !== undefined
        ? { ...rest, initialPositionSeconds: original.initialPositionSeconds }
        : rest;
};

/** Reload Samo/ABS long-form progress before starting a stream URL (URLs do not carry position). */
export const refreshPlayableResumeFromServer = async (
    item: MobilePlayableAudio,
    serverConnection: ServerAuthenticationResult | null,
): Promise<MobilePlayableAudio> => {
    if (item.source !== 'podcast' && item.source !== 'audiobook') {
        return item;
    }

    const authentication = findServerAuthenticationForSource(serverConnection, {
        id: item.contentSourceId,
    });
    if (!authentication) {
        return item;
    }

    if (item.source === 'podcast') {
        const episodeId = parsePodcastPlaybackEpisodeId(item.id);
        const showId = parsePodcastPlaybackShowId(item.id);
        if (!episodeId || !showId) {
            return item;
        }

        const progress = await loadCurrentPlaybackProgress(authentication, showId, episodeId);
        if (progress) {
            const resumeSeconds = resolveLongFormResumeSeconds({
                completed: progress.isFinished,
                durationSeconds: progress.durationSeconds ?? item.durationSeconds,
                progressSeconds: progress.currentTimeSeconds,
            });
            if (resumeSeconds > 0) {
                const streamToken = await ensureSamoStreamToken(authentication, samoFetch).catch(
                    () => undefined,
                );
                return applySamoPodcastStreamResume(
                    item,
                    resumeSeconds,
                    authentication,
                    streamToken,
                );
            }
            // The server says there is nothing to resume to — most often
            // because the episode is FINISHED. Clearing is the point: this
            // used to fall through and return the item untouched, which left
            // whatever build-time resume the episode was constructed with in
            // place (a mirror row synced before the listen ended still carries
            // the outro position), so a finished episode replayed at its end.
            return withoutResumePosition(item);
        }
        // Server read failed (null) — fall back to the native local resume cache
        // so a transient LAN outage can't restart the episode at 0.
        const cached = await getNativeResumeProgress('podcast-episode', episodeId);
        const cachedResumeSeconds = cached
            ? resolveLongFormResumeSeconds({
                  completed: cached.completed,
                  durationSeconds: item.durationSeconds,
                  progressSeconds: cached.progressSeconds,
              })
            : 0;
        if (cachedResumeSeconds > 0) {
            const streamToken = await ensureSamoStreamToken(authentication, samoFetch).catch(
                () => undefined,
            );
            return applySamoPodcastStreamResume(
                item,
                cachedResumeSeconds,
                authentication,
                streamToken,
            );
        }
        // A cache entry that says "finished" is as authoritative as the server
        // saying it; no entry at all is silence, and silence must not throw
        // away a resume the item already carries.
        return cached ? withoutResumePosition(item) : item;
    }

    // Audiobook queue ids are the per-file form `…:audiobook:<bookId>:file:<mediaFileId>`
    // (see samoAudiobookFilePlaybackId). A bare `/:audiobook:([^:]+)$/` never
    // matched that, so this returned early and the server resume position was
    // NEVER loaded — every audiobook started at 0 even though the native writer
    // had saved progress. Use the shared parser that handles BOTH id shapes.
    const itemId = parseSamoAudiobookIdFromPlaybackId(item.id);
    if (!itemId) {
        return item;
    }

    // A book's saved position is BOOK-GLOBAL, so the near-end test has to
    // measure it against the whole timeline. `durationSeconds` on a multi-file
    // queue item is only the CURRENT FILE's length — comparing an 18-hour
    // position against a 40-minute file would read as "past the end" and
    // restart the entire book. See MobilePlayableAudio.timelineDurationSeconds.
    const bookDurationSeconds = item.timelineDurationSeconds ?? item.durationSeconds;

    const progress = await loadCurrentPlaybackProgress(authentication, itemId);
    if (progress) {
        const resumeSeconds = resolveLongFormResumeSeconds({
            completed: progress.isFinished,
            durationSeconds: progress.durationSeconds ?? bookDurationSeconds,
            progressSeconds: progress.currentTimeSeconds,
        });
        return resumeSeconds > 0
            ? withResumePosition(item, resumeSeconds)
            : withoutResumePosition(item);
    }
    // Server read failed (null) — fall back to the native local resume cache so a
    // transient LAN outage can't restart the book at 0 (which then overwrote the
    // good server position).
    const cached = await getNativeResumeProgress('audiobook', itemId);
    const cachedResumeSeconds = cached
        ? resolveLongFormResumeSeconds({
              completed: cached.completed,
              durationSeconds: bookDurationSeconds,
              progressSeconds: cached.progressSeconds,
          })
        : 0;
    if (cachedResumeSeconds > 0) {
        return withResumePosition(item, cachedResumeSeconds);
    }
    // Same asymmetry as the episode path above: a cache entry that says
    // "finished" clears a stale resume, but no entry at all is silence and must
    // leave the item's own resume alone.
    return cached ? withoutResumePosition(item) : item;
};

export const shouldAutoRecoverPlayback = (source: MobilePlayableAudio['source'] | undefined) =>
    source === 'podcast' || source === 'audiobook' || source === 'music';

/**
 * How long a tap may wait on the server-progress overlay before playing
 * without it. The overlay is a nicety (cross-device resume); the tap is the
 * job. An unbounded wait here is what made episode taps look completely dead
 * while the server was slow — and the queued-up dead taps then replayed in a
 * burst once it recovered. 4s was tuned assuming a LAN box; a Samo Server
 * reached over the internet (Cloudflare Tunnel) can legitimately take longer
 * than that to answer, which silently dropped the resume position far more
 * often than a slow-but-healthy server should. 8s matches the interactive
 * budget already used for login (`AUTH_REQUEST_TIMEOUT_MS`) — still bounded,
 * just no longer tuned for LAN-only latency.
 */
export const RESUME_REFRESH_TIMEOUT_MS = 8000;

/** [refreshPlayableResumeFromServer] with a hard time budget — resolves the
 *  item unchanged when the server can't answer in time. */
export const refreshPlayableResumeFromServerBounded = async (
    item: MobilePlayableAudio,
    serverConnection: ServerAuthenticationResult | null,
    timeoutMs: number = RESUME_REFRESH_TIMEOUT_MS,
): Promise<MobilePlayableAudio> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            refreshPlayableResumeFromServer(item, serverConnection),
            new Promise<MobilePlayableAudio>((resolve) => {
                timer = setTimeout(() => resolve(item), timeoutMs);
            }),
        ]);
    } catch {
        return item;
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
};

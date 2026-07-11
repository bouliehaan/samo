import {
    applySamoPodcastStreamResume,
    type MobilePlayableAudio,
    parsePodcastPlaybackEpisodeId,
    parsePodcastPlaybackShowId,
    parseSamoAudiobookIdFromPlaybackId,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { loadAbsCurrentProgress } from '../services/abs-progress';
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

    if (item.initialPositionSeconds && item.initialPositionSeconds > 0) {
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

        const progress = await loadAbsCurrentProgress(authentication, showId, episodeId);
        if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0 && !progress.isFinished) {
            const streamToken = await ensureSamoStreamToken(authentication, samoFetch).catch(
                () => undefined,
            );
            return applySamoPodcastStreamResume(
                item,
                progress.currentTimeSeconds,
                authentication,
                streamToken,
            );
        }
        // Server read failed (null) — fall back to the native local resume cache
        // so a transient LAN outage can't restart the episode at 0.
        if (!progress) {
            const cached = await getNativeResumeProgress('podcast-episode', episodeId);
            if (cached && cached.progressSeconds > 0 && !cached.completed) {
                const streamToken = await ensureSamoStreamToken(authentication, samoFetch).catch(
                    () => undefined,
                );
                return applySamoPodcastStreamResume(
                    item,
                    Math.floor(cached.progressSeconds),
                    authentication,
                    streamToken,
                );
            }
        }
        return item;
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

    const progress = await loadAbsCurrentProgress(authentication, itemId);
    if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0 && !progress.isFinished) {
        return withResumePosition(item, progress.currentTimeSeconds);
    }
    // Server read failed (null) — fall back to the native local resume cache so a
    // transient LAN outage can't restart the book at 0 (which then overwrote the
    // good server position). A genuinely-finished book returns a non-null
    // progress with isFinished, so it stays at 0 and never hits this fallback.
    if (!progress) {
        const cached = await getNativeResumeProgress('audiobook', itemId);
        if (cached && cached.progressSeconds > 0 && !cached.completed) {
            return withResumePosition(item, Math.floor(cached.progressSeconds));
        }
    }

    return item;
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

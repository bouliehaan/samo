import {
    applySamoPodcastStreamResume,
    type MobilePlayableAudio,
    parsePodcastPlaybackEpisodeId,
    parsePodcastPlaybackShowId,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { loadAbsCurrentProgress } from '../services/abs-progress';
import { type AndroidPlaybackState } from '../types/playback';

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
    serverConnections: ServerAuthenticationResult[],
): Promise<MobilePlayableAudio> => {
    if (item.source !== 'podcast' && item.source !== 'audiobook') {
        return item;
    }

    const authentication = findServerAuthenticationForSource(serverConnections, {
        id: item.contentSourceId,
    });
    if (!authentication || authentication.type !== ServerType.SAMO) {
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
            if (authentication.type === ServerType.SAMO) {
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
            return withResumePosition(item, progress.currentTimeSeconds);
        }
        return item;
    }

    const audiobookMatch = item.id.match(/:audiobook:([^:]+)$/);
    const itemId = audiobookMatch?.[1];
    if (!itemId) {
        return item;
    }

    const progress = await loadAbsCurrentProgress(authentication, itemId);
    if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0 && !progress.isFinished) {
        return withResumePosition(item, progress.currentTimeSeconds);
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
 * burst once it recovered.
 */
export const RESUME_REFRESH_TIMEOUT_MS = 4000;

/** [refreshPlayableResumeFromServer] with a hard time budget — resolves the
 *  item unchanged when the server can't answer in time. */
export const refreshPlayableResumeFromServerBounded = async (
    item: MobilePlayableAudio,
    serverConnections: ServerAuthenticationResult[],
    timeoutMs: number = RESUME_REFRESH_TIMEOUT_MS,
): Promise<MobilePlayableAudio> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            refreshPlayableResumeFromServer(item, serverConnections),
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

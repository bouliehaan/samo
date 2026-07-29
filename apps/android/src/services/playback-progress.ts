import {
    getSamoPlayback,
    type SamoPlaybackTargetKind,
    type ServerAuthenticationResult,
} from '@samo/core/server';

export interface PlaybackProgressContext {
    authentication: ServerAuthenticationResult;
    durationSeconds: number;
    episodeId?: string;
    itemId: string;
}

export interface LoadedPlaybackProgress {
    currentTimeSeconds: number;
    durationSeconds?: number;
    isFinished: boolean;
}

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

const samoTargetForContext = (
    ctx: Pick<PlaybackProgressContext, 'episodeId' | 'itemId'>,
): { id: string; kind: SamoPlaybackTargetKind } =>
    ctx.episodeId
        ? { id: ctx.episodeId, kind: 'podcast-episode' }
        : { id: ctx.itemId, kind: 'audiobook' };

const isFinishedProgress = (progress: LoadedPlaybackProgress): boolean =>
    progress.isFinished ||
    (progress.durationSeconds
        ? progress.currentTimeSeconds / progress.durationSeconds >= 0.96
        : false);

/**
 * Read the server's current progress for an audiobook or podcast episode.
 * Used to seed the resume position when playback starts and to reconcile
 * cross-device drift on pull-to-refresh. The WRITE side lives in Kotlin
 * (`SamoProgressSync.kt`) and runs through Doze; this read-side stays in JS
 * because it only fires on user-driven foreground actions.
 */
export const loadCurrentPlaybackProgress = async (
    authentication: ServerAuthenticationResult,
    itemId: string,
    episodeId?: string,
): Promise<LoadedPlaybackProgress | null> => {
    const { id, kind } = samoTargetForContext({ episodeId, itemId });

    try {
        const state = await getSamoPlayback(samoFetch, authentication, kind, id);
        const currentTimeSeconds = Math.max(0, Math.round(state.progressSeconds ?? 0));

        if (currentTimeSeconds === 0 && !state.completed) {
            return null;
        }

        return {
            currentTimeSeconds: state.completed ? 0 : currentTimeSeconds,
            durationSeconds: undefined,
            isFinished: Boolean(state.completed),
        };
    } catch {
        return null;
    }
};

/**
 * Bounded variant for tap-to-play paths: a user is waiting, so a sick server
 * gets [timeoutMs] to answer and then playback proceeds without the overlay
 * (same fallback the unbounded read already used on error). Mirrors the
 * budget `refreshPlayableResumeFromServerBounded` gives the same read inside
 * playQueuedItem (`RESUME_REFRESH_TIMEOUT_MS`) — kept in sync with it.
 */
export const loadCurrentPlaybackProgressBounded = (
    authentication: ServerAuthenticationResult,
    itemId: string,
    episodeId?: string,
    timeoutMs = 8_000,
): Promise<LoadedPlaybackProgress | null> =>
    Promise.race([
        loadCurrentPlaybackProgress(authentication, itemId, episodeId),
        new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), timeoutMs);
        }),
    ]);

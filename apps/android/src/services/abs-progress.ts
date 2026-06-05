import {
    getSamoPlayback,
    type SamoPlaybackTargetKind,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';

export interface AbsProgressContext {
    authentication: ServerAuthenticationResult;
    durationSeconds: number;
    episodeId?: string;
    itemId: string;
}

export interface AbsLoadedProgress {
    currentTimeSeconds: number;
    durationSeconds?: number;
    isFinished: boolean;
}

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

const samoTargetForContext = (
    ctx: Pick<AbsProgressContext, 'episodeId' | 'itemId'>,
): { id: string; kind: SamoPlaybackTargetKind } =>
    ctx.episodeId
        ? { id: ctx.episodeId, kind: 'podcast-episode' }
        : { id: ctx.itemId, kind: 'audiobook' };

const isFinishedProgress = (progress: AbsLoadedProgress): boolean =>
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
export const loadAbsCurrentProgress = async (
    authentication: ServerAuthenticationResult,
    itemId: string,
    episodeId?: string,
): Promise<AbsLoadedProgress | null> => {
    if (authentication.type === ServerType.SAMO) {
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
    }

    const path = episodeId
        ? `/api/me/progress/${itemId}/${episodeId}`
        : `/api/me/progress/${itemId}`;

    try {
        const response = await fetch(`${authentication.url}${path}`, {
            headers: { Authorization: `Bearer ${authentication.credential}` },
            method: 'GET',
        });

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as {
            currentTime?: number;
            duration?: number;
            isFinished?: boolean;
            progress?: number;
        };

        const currentTimeSeconds =
            typeof body.currentTime === 'number' && body.currentTime > 0
                ? body.currentTime
                : 0;

        if (currentTimeSeconds === 0 && !body.isFinished) {
            return null;
        }

        const loaded: AbsLoadedProgress = {
            currentTimeSeconds,
            durationSeconds: body.duration,
            isFinished: Boolean(body.isFinished),
        };

        return isFinishedProgress(loaded)
            ? { ...loaded, currentTimeSeconds: 0 }
            : loaded;
    } catch {
        return null;
    }
};

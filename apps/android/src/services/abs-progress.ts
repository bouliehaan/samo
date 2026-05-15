import { type ServerAuthenticationResult } from '@samo/core/server';

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

const isFinishedProgress = (
    progress: AbsLoadedProgress,
): boolean => progress.isFinished || (progress.durationSeconds
    ? progress.currentTimeSeconds / progress.durationSeconds >= 0.96
    : false);

export const loadAbsCurrentProgress = async (
    authentication: ServerAuthenticationResult,
    itemId: string,
    episodeId?: string,
): Promise<AbsLoadedProgress | null> => {
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
            typeof body.currentTime === 'number' && body.currentTime > 0 ? body.currentTime : 0;

        if (currentTimeSeconds === 0 && !body.isFinished) {
            return null;
        }

        const loaded: AbsLoadedProgress = {
            currentTimeSeconds,
            durationSeconds: body.duration,
            isFinished: Boolean(body.isFinished),
        };

        return isFinishedProgress(loaded) ? { ...loaded, currentTimeSeconds: 0 } : loaded;
    } catch {
        return null;
    }
};

const syncToServer = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
): Promise<void> => {
    const { authentication, durationSeconds, episodeId, itemId } = context;
    const path = episodeId
        ? `/api/me/progress/${itemId}/${episodeId}`
        : `/api/me/progress/${itemId}`;
    const progress =
        durationSeconds > 0 ? Math.min(1, currentTimeSeconds / durationSeconds) : 0;

    await fetch(`${authentication.url}${path}`, {
        body: JSON.stringify({
            currentTime: currentTimeSeconds,
            duration: durationSeconds,
            isFinished: progress >= 0.96,
            lastUpdate: Date.now(),
            progress,
        }),
        headers: {
            Authorization: `Bearer ${authentication.credential}`,
            'Content-Type': 'application/json',
        },
        method: 'PATCH',
    });
};

let lastSyncMs = 0;
const THROTTLE_MS = 20_000;

export const syncAbsProgressThrottled = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
): Promise<void> => {
    const now = Date.now();

    if (now - lastSyncMs < THROTTLE_MS) {
        return;
    }

    lastSyncMs = now;

    try {
        await syncToServer(context, currentTimeSeconds);
    } catch {
        // graceful offline/failure
    }
};

export const syncAbsProgressImmediate = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
): Promise<void> => {
    lastSyncMs = Date.now();

    try {
        await syncToServer(context, currentTimeSeconds);
    } catch {
        // graceful offline/failure
    }
};

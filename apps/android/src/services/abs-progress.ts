import {
    getSamoPlayback,
    patchSamoPlayback,
    type SamoPlaybackTargetKind,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';
// expo-file-system 19 split the API; the legacy export still exposes
// documentDirectory + the simple read/write helpers we need here.
import * as FileSystem from 'expo-file-system/legacy';

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

interface PersistedEntry {
    currentTimeSeconds: number;
    durationSeconds: number;
    episodeId?: string;
    itemId: string;
    serverKey: string;
    syncedAt: number;
    updatedAt: number;
}

const STORAGE_FILE = `${FileSystem.documentDirectory ?? ''}abs-progress-pending.json`;
const THROTTLE_MS = 20_000;

let memCache: PersistedEntry[] = [];
const lastAttemptByKey = new Map<string, number>();
let writeInFlight: null | Promise<void> = null;
let writeQueued = false;
let initialized = false;
let initInFlight: null | Promise<void> = null;

const isFinishedProgress = (progress: AbsLoadedProgress): boolean =>
    progress.isFinished ||
    (progress.durationSeconds
        ? progress.currentTimeSeconds / progress.durationSeconds >= 0.96
        : false);

const serverKeyOf = (auth: ServerAuthenticationResult): string =>
    `${auth.type}:${auth.url}`;

const contextKeyOf = (ctx: { episodeId?: string; itemId: string }): string =>
    `${ctx.itemId}:${ctx.episodeId ?? ''}`;

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

const samoTargetForContext = (
    ctx: Pick<AbsProgressContext, 'episodeId' | 'itemId'>,
): { id: string; kind: SamoPlaybackTargetKind } =>
    ctx.episodeId
        ? { id: ctx.episodeId, kind: 'podcast-episode' }
        : { id: ctx.itemId, kind: 'audiobook' };

const findEntry = (
    itemId: string,
    episodeId?: string,
): PersistedEntry | undefined =>
    memCache.find((e) => e.itemId === itemId && e.episodeId === episodeId);

const upsertEntry = (entry: PersistedEntry): void => {
    const idx = memCache.findIndex(
        (e) => e.itemId === entry.itemId && e.episodeId === entry.episodeId,
    );
    if (idx >= 0) {
        memCache[idx] = entry;
    } else {
        memCache.push(entry);
    }
};

const isValidEntry = (raw: unknown): raw is PersistedEntry =>
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as PersistedEntry).itemId === 'string' &&
    typeof (raw as PersistedEntry).serverKey === 'string' &&
    typeof (raw as PersistedEntry).currentTimeSeconds === 'number' &&
    typeof (raw as PersistedEntry).durationSeconds === 'number' &&
    typeof (raw as PersistedEntry).syncedAt === 'number' &&
    typeof (raw as PersistedEntry).updatedAt === 'number';

// Coalesce writes so a burst of upserts only produces one file write.
const flushMemCacheToDisk = async (): Promise<void> => {
    if (writeInFlight) {
        writeQueued = true;
        return writeInFlight;
    }
    writeInFlight = (async () => {
        try {
            await FileSystem.writeAsStringAsync(
                STORAGE_FILE,
                JSON.stringify(memCache),
            );
        } catch {
            // Disk full / IO error — best-effort. Memory copy still wins on
            // subsequent flush attempts.
        } finally {
            writeInFlight = null;
            if (writeQueued) {
                writeQueued = false;
                void flushMemCacheToDisk();
            }
        }
    })();
    return writeInFlight;
};

/**
 * Read any pending entries from disk into the in-memory cache. Idempotent;
 * subsequent calls are no-ops once the store has been read.
 */
export const initAbsProgressStore = async (): Promise<void> => {
    if (initialized) return;
    if (initInFlight) return initInFlight;

    initInFlight = (async () => {
        try {
            const info = await FileSystem.getInfoAsync(STORAGE_FILE);
            if (!info.exists) {
                initialized = true;
                return;
            }
            const text = await FileSystem.readAsStringAsync(STORAGE_FILE);
            const parsed: unknown = JSON.parse(text);
            if (Array.isArray(parsed)) {
                memCache = parsed.filter(isValidEntry);
            } else {
                memCache = [];
            }
            initialized = true;
        } catch {
            // Corrupted file or IO trouble — clear the disk copy if possible. If
            // that cleanup also fails, leave initialization retryable.
            memCache = [];
            try {
                await FileSystem.deleteAsync(STORAGE_FILE, { idempotent: true });
                initialized = true;
            } catch {
                initialized = false;
            }
        } finally {
            initInFlight = null;
        }
    })();

    return initInFlight;
};

export const loadAbsCurrentProgress = async (
    authentication: ServerAuthenticationResult,
    itemId: string,
    episodeId?: string,
): Promise<AbsLoadedProgress | null> => {
    if (!initialized) {
        await initAbsProgressStore();
    }

    if (authentication.type === ServerType.SAMO) {
        const { id, kind } = samoTargetForContext({ episodeId, itemId });

        try {
            const state = await getSamoPlayback(samoFetch, authentication, kind, id);
            const currentTimeSeconds = Math.max(0, Math.round(state.progressSeconds ?? 0));

            if (currentTimeSeconds === 0 && !state.completed) {
                const pending = findEntry(itemId, episodeId);
                if (pending && pending.currentTimeSeconds > 0) {
                    return {
                        currentTimeSeconds: pending.currentTimeSeconds,
                        durationSeconds: pending.durationSeconds,
                        isFinished: false,
                    };
                }
                return null;
            }

            const loaded: AbsLoadedProgress = {
                currentTimeSeconds: state.completed ? 0 : currentTimeSeconds,
                durationSeconds: undefined,
                isFinished: Boolean(state.completed),
            };

            const pending = findEntry(itemId, episodeId);
            if (pending && pending.currentTimeSeconds > loaded.currentTimeSeconds) {
                loaded.currentTimeSeconds = pending.currentTimeSeconds;
                loaded.isFinished = false;
            }

            return loaded;
        } catch {
            const pending = findEntry(itemId, episodeId);
            if (pending) {
                return {
                    currentTimeSeconds: pending.currentTimeSeconds,
                    durationSeconds: pending.durationSeconds,
                    isFinished: false,
                };
            }
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

        // Reconcile with any unsynced local progress that hasn't reached the
        // server yet — without this, a foreground after a network outage would
        // overwrite the user's actual furthest-listened position with the older
        // server value.
        const pending = findEntry(itemId, episodeId);
        if (pending && pending.currentTimeSeconds > loaded.currentTimeSeconds) {
            loaded.currentTimeSeconds = pending.currentTimeSeconds;
        }

        return isFinishedProgress(loaded)
            ? { ...loaded, currentTimeSeconds: 0 }
            : loaded;
    } catch {
        // Network error: fall back to the latest local progress if we have it.
        const pending = findEntry(itemId, episodeId);
        if (pending) {
            return {
                currentTimeSeconds: pending.currentTimeSeconds,
                durationSeconds: pending.durationSeconds,
                isFinished: false,
            };
        }
        return null;
    }
};

// Mark a context as locally updated. Caller still attempts the wire write;
// this just keeps the on-disk copy fresh so a crash or background-kill can be
// recovered on next launch.
const recordLocalProgress = (
    ctx: AbsProgressContext,
    currentTimeSeconds: number,
    synced: boolean,
): void => {
    const existing = findEntry(ctx.itemId, ctx.episodeId);
    const now = Date.now();
    upsertEntry({
        currentTimeSeconds,
        durationSeconds: ctx.durationSeconds,
        episodeId: ctx.episodeId,
        itemId: ctx.itemId,
        serverKey: serverKeyOf(ctx.authentication),
        syncedAt: synced ? now : (existing?.syncedAt ?? 0),
        updatedAt: now,
    });
    void flushMemCacheToDisk();
};

const writeProgressToServer = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
    options?: { touchLastPlayedAt?: boolean },
): Promise<boolean> => {
    const { authentication, durationSeconds, episodeId, itemId } = context;
    const progress =
        durationSeconds > 0 ? Math.min(1, currentTimeSeconds / durationSeconds) : 0;
    const isFinished = progress >= 0.96;

    if (authentication.type === ServerType.SAMO) {
        const { id, kind } = samoTargetForContext({ episodeId, itemId });

        try {
            await patchSamoPlayback(samoFetch, authentication, kind, id, {
                completed: isFinished,
                progressSeconds: Math.max(0, Math.round(currentTimeSeconds)),
                touchLastPlayedAt: options?.touchLastPlayedAt ?? false,
                touchLastPositionAt: true,
            });
            return true;
        } catch {
            return false;
        }
    }

    const path = episodeId
        ? `/api/me/progress/${itemId}/${episodeId}`
        : `/api/me/progress/${itemId}`;

    try {
        const response = await fetch(`${authentication.url}${path}`, {
            body: JSON.stringify({
                currentTime: currentTimeSeconds,
                duration: durationSeconds,
                isFinished,
                lastUpdate: Date.now(),
                progress,
            }),
            headers: {
                Authorization: `Bearer ${authentication.credential}`,
                'Content-Type': 'application/json',
            },
            method: 'PATCH',
        });
        return response.ok;
    } catch {
        return false;
    }
};

export const syncAbsProgressThrottled = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
): Promise<void> => {
    const key = contextKeyOf(context);
    const now = Date.now();

    if (now - (lastAttemptByKey.get(key) ?? 0) < THROTTLE_MS) {
        // Inside the throttle window: still record locally so AppState
        // background-handlers / boot-replay can pick up the latest position.
        recordLocalProgress(context, currentTimeSeconds, false);
        return;
    }

    lastAttemptByKey.set(key, now);
    const synced = await writeProgressToServer(context, currentTimeSeconds);
    recordLocalProgress(context, currentTimeSeconds, synced);
};

export const syncAbsProgressImmediate = async (
    context: AbsProgressContext,
    currentTimeSeconds: number,
): Promise<void> => {
    const key = contextKeyOf(context);
    lastAttemptByKey.set(key, Date.now());
    const synced = await writeProgressToServer(context, currentTimeSeconds, {
        touchLastPlayedAt: true,
    });
    recordLocalProgress(context, currentTimeSeconds, synced);
};

/**
 * Push every pending (updatedAt > syncedAt) entry to its server. Called on
 * AppState background and on app boot — the two moments where unsent progress
 * is most likely to be lost otherwise.
 */
export const flushPendingAbsProgress = async (
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    if (!initialized) {
        await initAbsProgressStore();
    }
    const authByKey = new Map(
        authentications.map((auth) => [serverKeyOf(auth), auth]),
    );
    const pending = memCache.filter((entry) => entry.updatedAt > entry.syncedAt);
    for (const entry of pending) {
        const auth = authByKey.get(entry.serverKey);
        if (!auth) continue;
        const ok = await writeProgressToServer(
            {
                authentication: auth,
                durationSeconds: entry.durationSeconds,
                episodeId: entry.episodeId,
                itemId: entry.itemId,
            },
            entry.currentTimeSeconds,
            { touchLastPlayedAt: true },
        );
        if (ok) {
            entry.syncedAt = Date.now();
        }
    }
    void flushMemCacheToDisk();
};

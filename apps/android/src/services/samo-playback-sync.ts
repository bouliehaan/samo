import { type MobilePlayableAudio } from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    patchSamoPlayback,
    type SamoPlaybackPatch,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_FILE = `${FileSystem.documentDirectory ?? ''}samo-playback-pending.json`;
const THROTTLE_MS = 20_000;

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

export interface SamoMusicPlaybackContext {
    authentication: ServerAuthenticationResult;
    trackId: string;
}

export interface SamoPlaylistPlaybackContext {
    authentication: ServerAuthenticationResult;
    playlistId: string;
}

export type SamoMusicPlaybackWriteOptions = {
    /** When false, keep play counts/progress but do not surface the track in recently-played. */
    touchLastPlayedAt?: boolean;
};

interface PendingPatch {
    body: SamoPlaybackPatch;
    serverKey: string;
    trackId: string;
    updatedAt: number;
}

let memCache: PendingPatch[] = [];
const lastAttemptByKey = new Map<string, number>();
let writeInFlight: null | Promise<void> = null;
let writeQueued = false;
let initialized = false;
let initInFlight: null | Promise<void> = null;

export const parseSamoMusicTrackIdFromPlaybackId = (playbackId: string): string | undefined => {
    const match = playbackId.match(/:music:([^:]+)$/);
    return match?.[1];
};

export const resolveSamoMusicPlaybackContext = (
    item: MobilePlayableAudio,
    authentications: ServerAuthenticationResult[],
): SamoMusicPlaybackContext | null => {
    if (item.source !== 'music') {
        return null;
    }

    const trackId = parseSamoMusicTrackIdFromPlaybackId(item.id);
    if (!trackId) {
        return null;
    }

    const authentication = findServerAuthenticationForSource(authentications, {
        id: item.contentSourceId,
    });

    if (!authentication || authentication.type !== ServerType.SAMO) {
        return null;
    }

    return { authentication, trackId };
};

const serverKeyOf = (auth: ServerAuthenticationResult): string =>
    `${auth.type}:${auth.url}`;

const contextKeyOf = (ctx: SamoMusicPlaybackContext): string =>
    `${serverKeyOf(ctx.authentication)}:${ctx.trackId}`;

const isValidEntry = (raw: unknown): raw is PendingPatch =>
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as PendingPatch).trackId === 'string' &&
    typeof (raw as PendingPatch).serverKey === 'string' &&
    typeof (raw as PendingPatch).updatedAt === 'number' &&
    typeof (raw as PendingPatch).body === 'object';

const flushMemCacheToDisk = async (): Promise<void> => {
    if (writeInFlight) {
        writeQueued = true;
        return writeInFlight;
    }

    writeInFlight = (async () => {
        try {
            if (memCache.length === 0) {
                await FileSystem.deleteAsync(STORAGE_FILE, { idempotent: true });
            } else {
                await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(memCache));
            }
        } catch {
            // Best-effort persistence.
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

export const initSamoPlaybackSyncStore = async (): Promise<void> => {
    if (initialized) {
        return;
    }
    if (initInFlight) {
        return initInFlight;
    }

    initInFlight = (async () => {
        try {
            const info = await FileSystem.getInfoAsync(STORAGE_FILE);
            if (info.exists) {
                const raw = await FileSystem.readAsStringAsync(STORAGE_FILE);
                const parsed = JSON.parse(raw) as unknown;
                if (Array.isArray(parsed)) {
                    memCache = parsed.filter(isValidEntry);
                }
            }
        } catch {
            memCache = [];
        } finally {
            initialized = true;
            initInFlight = null;
        }
    })();

    return initInFlight;
};

const findPending = (serverKey: string, trackId: string): PendingPatch | undefined =>
    memCache.find((entry) => entry.serverKey === serverKey && entry.trackId === trackId);

const upsertPending = (entry: PendingPatch): void => {
    const idx = memCache.findIndex(
        (candidate) => candidate.serverKey === entry.serverKey && candidate.trackId === entry.trackId,
    );
    if (idx >= 0) {
        memCache[idx] = entry;
    } else {
        memCache.push(entry);
    }
    void flushMemCacheToDisk();
};

const removePending = (serverKey: string, trackId: string): void => {
    const before = memCache.length;
    memCache = memCache.filter(
        (entry) => !(entry.serverKey === serverKey && entry.trackId === trackId),
    );
    if (memCache.length !== before) {
        void flushMemCacheToDisk();
    }
};

const mergePatchBodies = (
    existing: SamoPlaybackPatch | undefined,
    next: SamoPlaybackPatch,
): SamoPlaybackPatch => ({
    ...existing,
    ...next,
    incrementPlayCount: existing?.incrementPlayCount || next.incrementPlayCount,
    touchLastPlayedAt: existing?.touchLastPlayedAt || next.touchLastPlayedAt,
    touchLastPositionAt: existing?.touchLastPositionAt || next.touchLastPositionAt,
});

const writePatchToServer = async (
    context: SamoMusicPlaybackContext,
    body: SamoPlaybackPatch,
): Promise<boolean> => {
    try {
        await patchSamoPlayback(
            samoFetch,
            context.authentication,
            'music-track',
            context.trackId,
            body,
        );
        return true;
    } catch {
        return false;
    }
};

const recordPending = (context: SamoMusicPlaybackContext, body: SamoPlaybackPatch): void => {
    const serverKey = serverKeyOf(context.authentication);
    const existing = findPending(serverKey, context.trackId);
    upsertPending({
        body: mergePatchBodies(existing?.body, body),
        serverKey,
        trackId: context.trackId,
        updatedAt: Date.now(),
    });
};

const applyPatch = async (
    context: SamoMusicPlaybackContext,
    body: SamoPlaybackPatch,
    options?: { force?: boolean },
): Promise<void> => {
    const key = contextKeyOf(context);
    const now = Date.now();

    if (!options?.force && now - (lastAttemptByKey.get(key) ?? 0) < THROTTLE_MS) {
        recordPending(context, body);
        return;
    }

    lastAttemptByKey.set(key, now);
    const synced = await writePatchToServer(context, body);
    if (synced) {
        removePending(serverKeyOf(context.authentication), context.trackId);
        return;
    }

    recordPending(context, body);
};

const withOptionalLastPlayedTouch = (
    body: SamoPlaybackPatch,
    options?: SamoMusicPlaybackWriteOptions,
): SamoPlaybackPatch =>
    options?.touchLastPlayedAt === false ? body : { ...body, touchLastPlayedAt: true };

export const syncSamoMusicPlaybackThrottled = async (
    context: SamoMusicPlaybackContext,
    progressSeconds: number,
    options?: SamoMusicPlaybackWriteOptions,
): Promise<void> => {
    await applyPatch(
        context,
        withOptionalLastPlayedTouch(
            {
                progressSeconds: Math.max(0, Math.round(progressSeconds)),
                touchLastPositionAt: true,
            },
            options,
        ),
    );
};

export const syncSamoMusicPlaybackImmediate = async (
    context: SamoMusicPlaybackContext,
    progressSeconds: number,
    options?: SamoMusicPlaybackWriteOptions,
): Promise<void> => {
    await applyPatch(
        context,
        withOptionalLastPlayedTouch(
            {
                progressSeconds: Math.max(0, Math.round(progressSeconds)),
                touchLastPositionAt: true,
            },
            options,
        ),
        { force: true },
    );
};

export const syncSamoMusicPlaybackStarted = async (
    context: SamoMusicPlaybackContext,
    progressSeconds: number,
    options?: SamoMusicPlaybackWriteOptions,
): Promise<void> => {
    await applyPatch(
        context,
        withOptionalLastPlayedTouch(
            {
                progressSeconds: Math.max(0, Math.round(progressSeconds)),
                touchLastPositionAt: true,
            },
            options,
        ),
        { force: true },
    );
};

export const syncSamoMusicPlaybackSubmission = async (
    context: SamoMusicPlaybackContext,
    progressSeconds: number,
    options?: SamoMusicPlaybackWriteOptions,
): Promise<void> => {
    await applyPatch(
        context,
        withOptionalLastPlayedTouch(
            {
                incrementPlayCount: true,
                progressSeconds: Math.max(0, Math.round(progressSeconds)),
                touchLastPositionAt: true,
            },
            options,
        ),
        { force: true },
    );
};

const writePlaylistPatchToServer = async (
    context: SamoPlaylistPlaybackContext,
    body: SamoPlaybackPatch,
): Promise<boolean> => {
    try {
        await patchSamoPlayback(
            samoFetch,
            context.authentication,
            'music-playlist',
            context.playlistId,
            body,
        );
        return true;
    } catch {
        return false;
    }
};

export const syncSamoPlaylistPlaybackStarted = async (
    context: SamoPlaylistPlaybackContext,
): Promise<void> => {
    await writePlaylistPatchToServer(context, { touchLastPlayedAt: true });
};

export const syncSamoPlaylistPlaybackSubmission = async (
    context: SamoPlaylistPlaybackContext,
): Promise<void> => {
    await writePlaylistPatchToServer(context, {
        incrementPlayCount: true,
        touchLastPlayedAt: true,
    });
};

export const flushPendingSamoPlayback = async (
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    if (!initialized) {
        await initSamoPlaybackSyncStore();
    }

    const samoByKey = new Map(
        authentications
            .filter((authentication) => authentication.type === ServerType.SAMO)
            .map((authentication) => [serverKeyOf(authentication), authentication]),
    );

    if (samoByKey.size === 0 || memCache.length === 0) {
        return;
    }

    const pending = [...memCache];
    for (const entry of pending) {
        const authentication = samoByKey.get(entry.serverKey);
        if (!authentication) {
            continue;
        }

        const context: SamoMusicPlaybackContext = {
            authentication,
            trackId: entry.trackId,
        };
        const synced = await writePatchToServer(context, entry.body);
        if (synced) {
            removePending(entry.serverKey, entry.trackId);
        }
    }
};

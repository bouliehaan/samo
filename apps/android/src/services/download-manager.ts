import {
    loadAudiobookshelfDownloadFiles,
    loadAudiobookshelfPodcastEpisodeFiles,
    type MobileHomeItem,
    type MobileMediaDetail,
    MobileMediaDetailType,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    getSamoPodcastEpisodeStreamUrl,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';
import * as FileSystem from 'expo-file-system/legacy';
import { DeviceEventEmitter, NativeModules } from 'react-native';

import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';
import {
    isNativeSafCopyAvailable,
    listSafDownloadAudioFiles,
    readSafTextDocument,
    streamCopyToSaf,
    writeSafTextDocument,
} from './saf-copy';

// Persistent storage *preference* still lives in JS — the SAF permission flow
// requires JS to drive an Activity result, and the sidecar/discovery passes
// that depend on it are likewise easier to express in JS where the expo-file-
// system bridge is available. Everything *runtime* about a download (queue
// state, lifecycle, byte transfer, throttle, persistence of the registry
// itself) now lives in native via `SamoDownloads` so it survives Doze, screen
// sleep, and process death.

const STORAGE_LOCATION_KEY = 'samo.android.downloads.storage-location.v1';
const REGISTRY_SIDECAR_FILENAME = 'samo-download-registry.json';
const SAF_COPY_MAX_BYTES = 200 * 1024 * 1024;

export interface DownloadCollectionInfo {
    artworkImageId?: string;
    artworkUrl?: string;
    id: string;
    sourceId: string;
    subtitle?: string;
    title: string;
    type: 'album' | 'playlist' | 'audiobook' | 'podcast';
}

export type DownloadStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'canceled';

/**
 * For audiobooks split into multiple files. Captures where this file sits in
 * the overall book (in seconds) so we can map "book time → file + local
 * offset" at playback time and stream the right file from disk.
 */
export interface AudiobookFileSegment {
    durationSeconds?: number;
    index: number;
    startOffsetSeconds: number;
}

export interface DownloadEntry {
    audiobookSegment?: AudiobookFileSegment;
    bytesDownloaded?: number;
    collection: DownloadCollectionInfo;
    completedAt?: number;
    enqueuedAt: number;
    errorMessage?: string;
    id: string;
    localUri?: string;
    progress?: number;
    sourceUrl: string;
    status: DownloadStatus;
    title: string;
    totalBytes?: number;
    trackId: string;
    trackSubtitle?: string;
}

// ---------- Native bridge ----------

interface SamoDownloadsNative {
    cancel(id: string): Promise<void>;
    clearAll(): Promise<void>;
    enqueue(entry: Partial<DownloadEntry>): Promise<DownloadEntry>;
    getDownloadsRootUri(): Promise<string>;
    list(): Promise<DownloadEntry[]>;
    localUriForTrack(trackId: string, sourceId: string): Promise<string | null>;
    patchLocalUri(id: string, localUri: string): Promise<void>;
    remove(id: string): Promise<void>;
    replaceAll(entries: DownloadEntry[]): Promise<void>;
    retry(id: string): Promise<void>;
    setPlaybackActive(active: boolean): Promise<void>;
}

const native: SamoDownloadsNative | undefined =
    (NativeModules as Record<string, unknown>).SamoDownloads as
        | SamoDownloadsNative
        | undefined;

const assertNative = (): SamoDownloadsNative => {
    if (!native) {
        throw new Error('SamoDownloads native module is not available; rebuild the dev client.');
    }
    return native;
};

// Mirror the most recent native snapshot in-process so synchronous reads
// (downloaded-collections snapshot signature, has-this-track-been-downloaded
// checks) don't have to bounce to native every call. The mirror is populated
// by the changed-event listener and overwritten on every native push.
let cachedRegistry: DownloadEntry[] | null = null;
const listeners = new Set<(entries: DownloadEntry[]) => void>();
let nativeSubscriptionInstalled = false;
let downloadsPlaybackActive = false;

const installNativeSubscriptionIfNeeded = () => {
    if (nativeSubscriptionInstalled) return;
    nativeSubscriptionInstalled = true;
    DeviceEventEmitter.addListener(
        'SamoDownloadsChanged',
        (event: { entries?: DownloadEntry[] } | undefined) => {
            const next = Array.isArray(event?.entries) ? event!.entries! : [];
            cachedRegistry = next;
            for (const listener of listeners) {
                try {
                    listener(next);
                } catch {
                    // never let a UI listener kill the bridge
                }
            }
        },
    );
    // Prime the cache off the native source so the first synchronous reader
    // (e.g., the downloads-state useEffect) doesn't get an empty array.
    void native?.list().then((entries) => {
        cachedRegistry = entries;
        for (const listener of listeners) {
            try {
                listener(entries);
            } catch {
                // ignore
            }
        }
    });
};

export const subscribeDownloads = (
    listener: (entries: DownloadEntry[]) => void,
): (() => void) => {
    listeners.add(listener);
    installNativeSubscriptionIfNeeded();
    if (cachedRegistry !== null) {
        listener(cachedRegistry);
    }
    return () => {
        listeners.delete(listener);
    };
};

export const listDownloads = async (): Promise<DownloadEntry[]> => {
    if (!native) return cachedRegistry ?? [];
    const entries = await native.list();
    cachedRegistry = entries;
    return entries;
};

export const setDownloadsPlaybackActive = (active: boolean) => {
    if (downloadsPlaybackActive === active) {
        return;
    }
    downloadsPlaybackActive = active;
    void native?.setPlaybackActive(active);
};

// ---------- Enqueue helpers (orchestration only — native owns the queue) ----------

export interface EnqueueTrackInput {
    audiobookSegment?: AudiobookFileSegment;
    collection: DownloadCollectionInfo;
    sourceUrl: string;
    title: string;
    trackId: string;
    trackSubtitle?: string;
}

export const enqueueDownload = async (
    input: EnqueueTrackInput,
    _authentications: ServerAuthenticationResult[],
): Promise<DownloadEntry> => {
    const entry = await assertNative().enqueue({
        audiobookSegment: input.audiobookSegment,
        collection: input.collection,
        sourceUrl: input.sourceUrl,
        title: input.title,
        trackId: input.trackId,
        trackSubtitle: input.trackSubtitle,
    });
    // SAF copy is handled by the post-completion side effect installed on
    // first use (see `installSafCopyDriver`). The native owner doesn't need
    // to know about SAF at all — the JS side just patches the entry's
    // localUri once the copy finishes.
    installSafCopyDriver();
    return entry;
};

export const enqueueCollectionDownload = async (
    detail: MobileMediaDetail,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: number; reason?: string; skipped: number }> => {
    if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
        return enqueueAudiobookDownload(detail, authentications);
    }
    if (detail.type === MobileMediaDetailType.PODCAST) {
        return enqueuePodcastDownload(detail, authentications);
    }
    return enqueueMusicCollectionDownload(detail, authentications);
};

const enqueueMusicCollectionDownload = async (
    detail: MobileMediaDetail,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: number; reason?: string; skipped: number }> => {
    const downloadable = detail.tracks.filter((track) => track.playback?.url);
    if (downloadable.length === 0) {
        return { enqueued: 0, skipped: 0 };
    }

    const collection: DownloadCollectionInfo = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        sourceId: detail.source.id,
        subtitle: detail.subtitle,
        title: detail.title,
        type: collectionTypeForDetail(detail.type),
    };

    let enqueued = 0;
    let skipped = 0;
    for (const track of downloadable) {
        const url = track.playback?.url;
        if (!url) {
            skipped += 1;
            continue;
        }
        const entry = await enqueueDownload(
            {
                collection,
                sourceUrl: url,
                title: track.title,
                trackId: track.id,
                trackSubtitle: track.subtitle,
            },
            authentications,
        );
        if (entry.status === 'completed') {
            skipped += 1;
        } else {
            enqueued += 1;
        }
    }
    return { enqueued, skipped };
};

const findAudiobookshelfAuth = (
    authentications: ServerAuthenticationResult[],
    sourceId: string,
): ServerAuthenticationResult | undefined => {
    return authentications.find(
        (candidate) =>
            `${candidate.type}:${candidate.url}` === sourceId &&
            candidate.type === ServerType.AUDIOBOOKSHELF,
    );
};

const findSamoAuth = (
    authentications: ServerAuthenticationResult[],
    sourceId: string,
): ServerAuthenticationResult | undefined => {
    return authentications.find(
        (candidate) =>
            `${candidate.type}:${candidate.url}` === sourceId &&
            candidate.type === ServerType.SAMO,
    );
};

const buildPodcastCollection = (detail: MobileMediaDetail): DownloadCollectionInfo => ({
    artworkImageId: detail.artworkImageId,
    artworkUrl: detail.artworkUrl,
    id: detail.id,
    sourceId: detail.source.id,
    subtitle: detail.subtitle,
    title: detail.title,
    type: 'podcast',
});

const enqueueSamoPodcastDownload = async (
    detail: MobileMediaDetail,
    samoAuth: ServerAuthenticationResult,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: number; reason?: string; skipped: number }> => {
    const streamToken = await ensureSamoStreamToken(samoAuth).catch(() => undefined);
    const collection = buildPodcastCollection(detail);
    let enqueued = 0;
    let skipped = 0;
    for (const episode of detail.tracks) {
        const episodeId = episode.episodeId ?? episode.id;
        if (!episodeId) {
            continue;
        }
        const entry = await enqueueDownload(
            {
                collection,
                sourceUrl: getSamoPodcastEpisodeStreamUrl(
                    samoAuth,
                    episodeId,
                    streamToken ? { streamToken } : undefined,
                ),
                title: episode.title,
                trackId: episodeId,
                trackSubtitle: episode.subtitle,
            },
            authentications,
        );
        if (entry.status === 'completed') {
            skipped += 1;
        } else {
            enqueued += 1;
        }
    }
    if (enqueued === 0 && skipped === 0) {
        return { enqueued: 0, reason: 'No episodes were found for this podcast.', skipped: 0 };
    }
    return { enqueued, skipped };
};

const enqueueSamoSinglePodcastEpisode = async (
    detail: MobileMediaDetail,
    episodeId: string,
    title: string,
    subtitle: string | undefined,
    samoAuth: ServerAuthenticationResult,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: boolean; reason?: string }> => {
    const streamToken = await ensureSamoStreamToken(samoAuth).catch(() => undefined);
    const entry = await enqueueDownload(
        {
            collection: buildPodcastCollection(detail),
            sourceUrl: getSamoPodcastEpisodeStreamUrl(
                samoAuth,
                episodeId,
                streamToken ? { streamToken } : undefined,
            ),
            title,
            trackId: episodeId,
            trackSubtitle: subtitle,
        },
        authentications,
    );
    return { enqueued: entry.status !== 'completed' };
};

const enqueueAudiobookDownload = async (
    detail: MobileMediaDetail,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: number; reason?: string; skipped: number }> => {
    const auth = findAudiobookshelfAuth(authentications, detail.source.id);
    if (!auth) {
        return {
            enqueued: 0,
            reason: 'The Audiobookshelf server for this book is no longer connected.',
            skipped: 0,
        };
    }

    let files;
    try {
        files = await loadAudiobookshelfDownloadFiles({
            authentication: auth,
            itemId: detail.id,
        });
    } catch (error) {
        return {
            enqueued: 0,
            reason:
                error instanceof Error
                    ? `Could not list audio files: ${error.message}`
                    : 'Could not list audio files for this book.',
            skipped: 0,
        };
    }

    if (files.length === 0) {
        return {
            enqueued: 0,
            reason: 'No audio files were reported for this book by the server.',
            skipped: 0,
        };
    }

    const collection: DownloadCollectionInfo = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        sourceId: detail.source.id,
        subtitle: detail.subtitle,
        title: detail.title,
        type: 'audiobook',
    };

    let enqueued = 0;
    let skipped = 0;
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const trackId = files.length === 1 ? detail.id : `${detail.id}:${file.ino}`;
        const entry = await enqueueDownload(
            {
                audiobookSegment:
                    files.length > 1
                        ? {
                              durationSeconds: file.durationSeconds,
                              index: file.index ?? i,
                              startOffsetSeconds: file.startOffsetSeconds ?? 0,
                          }
                        : undefined,
                collection,
                sourceUrl: file.downloadUrl,
                title: files.length === 1 ? detail.title : (file.title ?? file.filename),
                trackId,
                trackSubtitle:
                    files.length === 1
                        ? detail.subtitle
                        : `${detail.title} · ${file.filename}`,
            },
            authentications,
        );
        if (entry.status === 'completed') {
            skipped += 1;
        } else {
            enqueued += 1;
        }
    }
    return { enqueued, skipped };
};

const enqueuePodcastDownload = async (
    detail: MobileMediaDetail,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: number; reason?: string; skipped: number }> => {
    const auth = findAudiobookshelfAuth(authentications, detail.source.id);
    if (!auth) {
        const samoAuth = findSamoAuth(authentications, detail.source.id);
        if (samoAuth) {
            return enqueueSamoPodcastDownload(detail, samoAuth, authentications);
        }
        return {
            enqueued: 0,
            reason: 'The server for this podcast is no longer connected.',
            skipped: 0,
        };
    }

    let episodeFiles;
    try {
        episodeFiles = await loadAudiobookshelfPodcastEpisodeFiles({
            authentication: auth,
            itemId: detail.id,
        });
    } catch (error) {
        return {
            enqueued: 0,
            reason:
                error instanceof Error
                    ? `Could not list episode files: ${error.message}`
                    : 'Could not list episode files for this podcast.',
            skipped: 0,
        };
    }

    if (episodeFiles.length === 0) {
        return {
            enqueued: 0,
            reason: 'No episode files were reported for this podcast by the server.',
            skipped: 0,
        };
    }

    const collection: DownloadCollectionInfo = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        sourceId: detail.source.id,
        subtitle: detail.subtitle,
        title: detail.title,
        type: 'podcast',
    };

    let enqueued = 0;
    let skipped = 0;
    for (const file of episodeFiles) {
        const entry = await enqueueDownload(
            {
                collection,
                sourceUrl: file.fileDownloadUrl,
                title: file.title,
                trackId: file.episodeId,
                trackSubtitle: detail.title,
            },
            authentications,
        );
        if (entry.status === 'completed') {
            skipped += 1;
        } else {
            enqueued += 1;
        }
    }
    return { enqueued, skipped };
};

export const enqueueSingleMusicTrackDownload = async (
    track: {
        album?: string;
        albumId?: string;
        artist?: string;
        id: string;
        playback?: { url?: string; source?: string };
        subtitle?: string;
        title: string;
    },
    source: { id: string; title?: string },
    artworkUrl: string | undefined,
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: boolean; reason?: string }> => {
    const url = track.playback?.url;
    if (!url || track.playback?.source !== 'music') {
        return {
            enqueued: false,
            reason: 'This track can’t be downloaded — only music tracks with a direct stream URL.',
        };
    }
    const collection: DownloadCollectionInfo = {
        artworkUrl,
        id: track.albumId ?? track.id,
        sourceId: source.id,
        subtitle: track.artist,
        title: track.album ?? track.title,
        type: 'album',
    };
    const entry = await enqueueDownload(
        {
            collection,
            sourceUrl: url,
            title: track.title,
            trackId: track.id,
            trackSubtitle: track.subtitle ?? track.artist,
        },
        authentications,
    );
    return { enqueued: entry.status !== 'completed' };
};

export const enqueueSinglePodcastEpisodeDownload = async (
    detail: MobileMediaDetail,
    episodeTrack: {
        episodeId?: string;
        id: string;
        itemId?: string;
        publishedAt?: number;
        subtitle?: string;
        title: string;
    },
    authentications: ServerAuthenticationResult[],
): Promise<{ enqueued: boolean; reason?: string }> => {
    const auth = findAudiobookshelfAuth(authentications, detail.source.id);
    if (!auth || !episodeTrack.episodeId || !episodeTrack.itemId) {
        const samoAuth = findSamoAuth(authentications, detail.source.id);
        const samoEpisodeId = episodeTrack.episodeId ?? episodeTrack.id;
        if (samoAuth && samoEpisodeId) {
            return enqueueSamoSinglePodcastEpisode(
                detail,
                samoEpisodeId,
                episodeTrack.title,
                episodeTrack.subtitle,
                samoAuth,
                authentications,
            );
        }
        return {
            enqueued: false,
            reason: 'The server for this podcast is no longer connected.',
        };
    }

    try {
        const episodeFiles = await loadAudiobookshelfPodcastEpisodeFiles({
            authentication: auth,
            itemId: episodeTrack.itemId,
        });
        const file = episodeFiles.find(
            (candidate) => candidate.episodeId === episodeTrack.episodeId,
        );
        if (!file) {
            return {
                enqueued: false,
                reason:
                    'The server didn’t report a downloadable audio file for this episode.',
            };
        }
        const collection: DownloadCollectionInfo = {
            artworkImageId: detail.artworkImageId,
            artworkUrl: detail.artworkUrl,
            id: detail.id,
            sourceId: detail.source.id,
            subtitle: detail.subtitle,
            title: detail.title,
            type: 'podcast',
        };
        const entry = await enqueueDownload(
            {
                collection,
                sourceUrl: file.fileDownloadUrl,
                title: episodeTrack.title,
                trackId: episodeTrack.id,
                trackSubtitle: episodeTrack.subtitle,
            },
            authentications,
        );
        return { enqueued: entry.status !== 'completed' };
    } catch (error) {
        return {
            enqueued: false,
            reason:
                error instanceof Error
                    ? `Could not resolve audio URL: ${error.message}`
                    : 'Could not resolve the audio URL for this episode.',
        };
    }
};

export const enqueueHomeItemDownload = async (
    item: MobileHomeItem,
    authentications: ServerAuthenticationResult[],
): Promise<DownloadEntry | null> => {
    const url = item.playback?.url;
    const sourceId = item.source?.id;
    if (!url || !sourceId) {
        return null;
    }
    const collection: DownloadCollectionInfo = {
        artworkUrl: item.artworkUrl,
        id: item.id,
        sourceId,
        subtitle: item.subtitle,
        title: item.title,
        type: collectionTypeForHomeItem(item),
    };
    return enqueueDownload(
        {
            collection,
            sourceUrl: url,
            title: item.title,
            trackId: item.id,
            trackSubtitle: item.subtitle,
        },
        authentications,
    );
};

// ---------- Single-entry lifecycle (thin native passthroughs) ----------

export const cancelDownload = async (id: string): Promise<void> => {
    await assertNative().cancel(id);
};

export const removeDownload = async (id: string): Promise<void> => {
    await assertNative().remove(id);
};

export const clearAllDownloads = async (): Promise<void> => {
    await assertNative().clearAll();
};

export const retryDownload = async (
    id: string,
    _authentications: ServerAuthenticationResult[],
): Promise<void> => {
    await assertNative().retry(id);
};

export const resumeDownloadsOnForeground = async (
    _authentications: ServerAuthenticationResult[],
): Promise<void> => {
    // Native + WorkManager keep the queue moving without JS involvement, so
    // foregrounding is now a no-op for the queue. Kept as an exported symbol
    // because the playback hook still calls it on AppState 'active'; making
    // it a no-op rather than removing the call site avoids churn in a hook
    // we'd rather leave alone right now.
    void assertNative().list().then((entries) => {
        cachedRegistry = entries;
    });
};

// ---------- Lookups (synchronous-on-cache, async refresh) ----------

export const getLocalUriForTrack = async (
    trackId: string,
    sourceId: string,
): Promise<string | null> => {
    if (!native) return null;
    return native.localUriForTrack(trackId, sourceId);
};

export const getLocalDownloadForTrack = async (
    trackId: string,
    sourceId: string,
): Promise<{ localUri: string; sourceUrl: string } | null> => {
    if (!native) return null;
    const entries = cachedRegistry ?? (await native.list());
    cachedRegistry = entries;
    const match = entries.find(
        (entry) =>
            entry.trackId === trackId &&
            entry.collection.sourceId === sourceId &&
            entry.status === 'completed' &&
            entry.localUri,
    );
    if (!match?.localUri) return null;
    return { localUri: match.localUri, sourceUrl: match.sourceUrl };
};

export interface OfflineAudiobookFile {
    durationSeconds?: number;
    index: number;
    ino: string;
    localUri: string;
    sourceUrl: string;
    startOffsetSeconds: number;
}

export const getOfflineAudiobookFiles = async (
    bookId: string,
    sourceId: string,
): Promise<OfflineAudiobookFile[]> => {
    if (!native) return [];
    const entries = cachedRegistry ?? (await native.list());
    cachedRegistry = entries;
    const matches = entries.filter(
        (entry) =>
            entry.status === 'completed' &&
            entry.localUri &&
            entry.collection.sourceId === sourceId &&
            entry.collection.id === bookId &&
            entry.collection.type === 'audiobook',
    );
    if (matches.length === 0) return [];
    if (matches.length === 1) {
        const only = matches[0];
        return [
            {
                durationSeconds: only.audiobookSegment?.durationSeconds,
                index: 0,
                ino: only.trackId.includes(':')
                    ? (only.trackId.split(':').pop() ?? only.trackId)
                    : only.trackId,
                localUri: only.localUri!,
                sourceUrl: only.sourceUrl,
                startOffsetSeconds: 0,
            },
        ];
    }
    return matches
        .map((entry) => {
            const inoFromKey = entry.trackId.includes(':')
                ? (entry.trackId.split(':').pop() ?? entry.trackId)
                : entry.trackId;
            return {
                durationSeconds: entry.audiobookSegment?.durationSeconds,
                index: entry.audiobookSegment?.index ?? Number.MAX_SAFE_INTEGER,
                ino: inoFromKey,
                localUri: entry.localUri!,
                sourceUrl: entry.sourceUrl,
                startOffsetSeconds: entry.audiobookSegment?.startOffsetSeconds ?? 0,
            };
        })
        .sort(
            (left, right) =>
                left.startOffsetSeconds - right.startOffsetSeconds ||
                left.index - right.index,
        );
};

let cachedDownloadsRoot: string | null = null;
export const getDownloadsRootUri = (): string => {
    // Synchronous getter for legacy call sites. Returns the last known root
    // (refreshed below) or a sensible default while the native call is in
    // flight on launch.
    if (cachedDownloadsRoot) return cachedDownloadsRoot;
    void native?.getDownloadsRootUri().then((uri) => {
        cachedDownloadsRoot = uri;
    });
    return `${FileSystem.documentDirectory ?? ''}samo-downloads/`;
};

// ---------- Storage location (internal vs SD card via SAF) ----------

export interface StorageLocationPreference {
    label: string;
    treeUri?: string;
}

let storageLocationCache: StorageLocationPreference | null = null;
const storageLocationListeners = new Set<(pref: StorageLocationPreference) => void>();

const DEFAULT_STORAGE_LOCATION: StorageLocationPreference = {
    label: 'Internal storage',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const notifyStorageListeners = () => {
    const snapshot = storageLocationCache ?? DEFAULT_STORAGE_LOCATION;
    storageLocationListeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch {
            // ignore
        }
    });
};

export const getStorageLocation = async (): Promise<StorageLocationPreference> => {
    if (storageLocationCache !== null) {
        return storageLocationCache;
    }
    try {
        const raw = await fsGetItem(STORAGE_LOCATION_KEY);
        if (!raw) {
            storageLocationCache = DEFAULT_STORAGE_LOCATION;
            return storageLocationCache;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (isRecord(parsed) && typeof parsed.treeUri === 'string') {
            storageLocationCache = {
                label:
                    typeof parsed.label === 'string' && parsed.label.length > 0
                        ? parsed.label
                        : 'SD card',
                treeUri: parsed.treeUri,
            };
            return storageLocationCache;
        }
    } catch {
        // fall through
    }
    storageLocationCache = DEFAULT_STORAGE_LOCATION;
    return storageLocationCache;
};

export const subscribeStorageLocation = (
    listener: (pref: StorageLocationPreference) => void,
): (() => void) => {
    storageLocationListeners.add(listener);
    if (storageLocationCache !== null) {
        listener(storageLocationCache);
    } else {
        void getStorageLocation().then((pref) => listener(pref));
    }
    return () => {
        storageLocationListeners.delete(listener);
    };
};

const persistStorageLocation = async (
    pref: StorageLocationPreference,
): Promise<void> => {
    storageLocationCache = pref;
    notifyStorageListeners();
    try {
        if (!pref.treeUri) {
            await fsDeleteItem(STORAGE_LOCATION_KEY);
            return;
        }
        await fsSetItem(STORAGE_LOCATION_KEY, JSON.stringify(pref));
        const entries = cachedRegistry ?? (native ? await native.list() : []);
        cachedRegistry = entries;
        if (entries.length > 0) {
            void exportRegistrySidecar(entries);
        }
    } catch {
        // best-effort
    }
};

export const pickSdCardStorageLocation = async (): Promise<
    StorageLocationPreference | null
> => {
    try {
        const permission =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted || !permission.directoryUri) {
            return null;
        }
        const decoded = decodeURIComponent(permission.directoryUri);
        const tailMatch = decoded.match(/[:/]([^:/]+)$/);
        const friendly = tailMatch?.[1] ?? 'SD card';
        const pref: StorageLocationPreference = {
            label: `SD card · ${friendly}`,
            treeUri: permission.directoryUri,
        };
        await persistStorageLocation(pref);
        await discoverDownloadsOnDisk();
        return pref;
    } catch {
        return null;
    }
};

export const resetStorageLocation = async (): Promise<void> => {
    await persistStorageLocation(DEFAULT_STORAGE_LOCATION);
};

// ---------- SAF post-copy (entries finish on internal, then optionally move) ----------

const safCopyAttempted = new Set<string>();
let safCopyDriverInstalled = false;

const installSafCopyDriver = () => {
    if (safCopyDriverInstalled) return;
    safCopyDriverInstalled = true;
    subscribeDownloads((entries) => {
        for (const entry of entries) {
            if (
                entry.status === 'completed' &&
                entry.localUri &&
                !entry.localUri.startsWith('content://') &&
                !safCopyAttempted.has(entry.id)
            ) {
                safCopyAttempted.add(entry.id);
                void tryMoveCompletedFileToSaf(entry);
            }
        }
    });
};

const mimeTypeForFileName = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'm4a' || ext === 'aac') return 'audio/mp4';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'ogg' || ext === 'opus') return 'audio/ogg';
    if (ext === 'wav') return 'audio/wav';
    return 'audio/*';
};

const sanitizeForPath = (value: string): string =>
    value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'item';

const tryMoveCompletedFileToSaf = async (
    entry: DownloadEntry,
): Promise<void> => {
    if (!entry.localUri || entry.status !== 'completed') return;
    const pref = await getStorageLocation();
    if (!pref.treeUri) return;
    if (entry.localUri.startsWith('content://')) return;

    let info: FileSystem.FileInfo;
    try {
        info = await FileSystem.getInfoAsync(entry.localUri);
    } catch {
        return;
    }
    if (!info.exists) return;

    const trackFileName = sanitizeForPath(entry.trackId) + '.audio';
    const mimeType = mimeTypeForFileName(trackFileName);

    if (isNativeSafCopyAvailable()) {
        const safUri = await streamCopyToSaf(
            entry.localUri,
            pref.treeUri,
            trackFileName,
            mimeType,
        );
        if (safUri) {
            try {
                await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
            } catch {
                // best-effort
            }
            await native?.patchLocalUri(entry.id, safUri);
            return;
        }
    }

    const size = info.size ?? 0;
    if (size > SAF_COPY_MAX_BYTES) {
        return;
    }
    try {
        const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            pref.treeUri,
            trackFileName,
            mimeType,
        );
        const base64 = await FileSystem.readAsStringAsync(entry.localUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(safFileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
        try {
            await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        } catch {
            // best-effort
        }
        await native?.patchLocalUri(entry.id, safFileUri);
    } catch {
        // best-effort
    }
};

export const migrateCompletedDownloadsToStorage = async (): Promise<{
    failed: number;
    migrated: number;
    reason?: string;
    skipped: number;
}> => {
    const pref = await getStorageLocation();
    if (!pref.treeUri) {
        return {
            failed: 0,
            migrated: 0,
            reason: 'Pick an SD card folder before migrating downloads.',
            skipped: 0,
        };
    }

    const entries = native ? await native.list() : cachedRegistry ?? [];
    cachedRegistry = entries;
    let failed = 0;
    let migrated = 0;
    let skipped = 0;

    for (const entry of entries) {
        if (entry.status !== 'completed' || !entry.localUri) {
            skipped += 1;
            continue;
        }
        if (entry.localUri.startsWith('content://')) {
            skipped += 1;
            continue;
        }
        try {
            safCopyAttempted.delete(entry.id);
            await tryMoveCompletedFileToSaf(entry);
            migrated += 1;
        } catch {
            failed += 1;
        }
    }

    return { failed, migrated, skipped };
};

// ---------- Sidecar + discovery (best-effort reconciliation) ----------

const exportRegistrySidecar = async (entries: DownloadEntry[]): Promise<void> => {
    try {
        const root = await ensureDownloadsDirectory();
        await FileSystem.writeAsStringAsync(
            `${root}${REGISTRY_SIDECAR_FILENAME}`,
            JSON.stringify(entries),
        );
    } catch {
        // best-effort
    }
    try {
        const storage = await getStorageLocation();
        if (storage.treeUri) {
            await writeSafTextDocument(
                storage.treeUri,
                REGISTRY_SIDECAR_FILENAME,
                JSON.stringify(entries),
            );
        }
    } catch {
        // best-effort
    }
};

const ensureDownloadsDirectory = async () => {
    const root = `${FileSystem.documentDirectory ?? ''}samo-downloads/`;
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    }
    return root;
};

const parseSidecarPayload = (raw: string): DownloadEntry[] => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((entry): entry is DownloadEntry => {
            if (!isRecord(entry)) return false;
            return (
                typeof entry.id === 'string' &&
                typeof entry.title === 'string' &&
                typeof entry.sourceUrl === 'string' &&
                typeof entry.trackId === 'string' &&
                typeof entry.enqueuedAt === 'number' &&
                isRecord(entry.collection)
            );
        });
    } catch {
        return [];
    }
};

let discoveryInFlight: Promise<void> | null = null;

/**
 * Reconcile the native registry against orphaned `.audio` files found on
 * internal storage or on the user's SAF tree. Called on a fresh launch (after
 * a reinstall, the registry might be empty but the files are still on the SD
 * card) and after the user picks a new SAF location. Best-effort — failures
 * fall back to the registry as-is.
 */
export const discoverDownloadsOnDisk = async (): Promise<void> => {
    if (discoveryInFlight) {
        await discoveryInFlight;
        return;
    }

    discoveryInFlight = (async () => {
        const current = native ? await native.list() : [];
        cachedRegistry = current;
        const storage = await getStorageLocation();

        // Pull in any sidecar registry rows that aren't already represented
        // natively — gives the discovery pass a starting point for
        // "this orphaned file belonged to album X" before we resort to
        // synthetic placeholder entries.
        const sidecarEntries: DownloadEntry[] = [];
        try {
            const internalRoot = await ensureDownloadsDirectory();
            const internalSidecar = `${internalRoot}${REGISTRY_SIDECAR_FILENAME}`;
            const info = await FileSystem.getInfoAsync(internalSidecar);
            if (info.exists) {
                sidecarEntries.push(
                    ...parseSidecarPayload(
                        await FileSystem.readAsStringAsync(internalSidecar),
                    ),
                );
            }
        } catch {
            // best-effort
        }
        if (storage.treeUri) {
            try {
                const listed = await listSafDownloadAudioFiles(storage.treeUri);
                const sidecar = listed.find((doc) => doc.name === REGISTRY_SIDECAR_FILENAME);
                if (sidecar) {
                    const raw = await readSafTextDocument(sidecar.uri);
                    if (raw) sidecarEntries.push(...parseSidecarPayload(raw));
                }
            } catch {
                // best-effort
            }
        }

        const byId = new Map(current.map((entry) => [entry.id, entry]));
        for (const candidate of sidecarEntries) {
            if (!byId.has(candidate.id)) {
                byId.set(candidate.id, candidate);
            }
        }
        const merged = [...byId.values()];

        if (merged.length !== current.length) {
            await native?.replaceAll(merged);
        }
    })().finally(() => {
        discoveryInFlight = null;
    });

    await discoveryInFlight;
};
const collectionTypeForDetail = (
    detailType: MobileMediaDetail['type'],
): DownloadCollectionInfo['type'] => {
    switch (detailType) {
        case MobileMediaDetailType.PLAYLIST:
            return 'playlist';
        case MobileMediaDetailType.AUDIOBOOK:
            return 'audiobook';
        case MobileMediaDetailType.PODCAST:
            return 'podcast';
        default:
            return 'album';
    }
};

const collectionTypeForHomeItem = (
    item: MobileHomeItem,
): DownloadCollectionInfo['type'] => {
    switch (item.type) {
        case ('playlist' as MobileHomeItem['type']):
            return 'playlist';
        case ('audiobook' as MobileHomeItem['type']):
            return 'audiobook';
        case ('podcast' as MobileHomeItem['type']):
            return 'podcast';
        default:
            return 'album';
    }
};

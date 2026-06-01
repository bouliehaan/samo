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
// expo-file-system 19+ split into a new "file API" and a legacy API. The
// legacy API still exposes documentDirectory, createDownloadResumable, etc.,
// which is what we need for the download manager. The new API is async-iterator
// based and would require a much larger rewrite to use cleanly.
import * as FileSystem from 'expo-file-system/legacy';

import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';
import {
    cancelNativeDownload,
    downloadFileNative,
    isNativeDownloadAvailable,
    isNativeSafCopyAvailable,
    listSafDownloadAudioFiles,
    readSafTextDocument,
    setNativeDownloadThrottle,
    streamCopyToSaf,
    subscribeNativeDownloadProgress,
    writeSafTextDocument,
} from './saf-copy';

// Persistent registry of offline downloads. Each entry tracks a single
// downloadable file (a song, an audiobook file, or a podcast episode).

const REGISTRY_KEY = 'samo.android.downloads.v1';
const STORAGE_LOCATION_KEY = 'samo.android.downloads.storage-location.v1';
const DOWNLOADS_DIR_NAME = 'samo-downloads';
const REGISTRY_SIDECAR_FILENAME = 'samo-download-registry.json';
// Keep downloads deliberately serialized. A single large LAN transfer can
// already compete with ExoPlayer for Wi-Fi, server, and flash I/O; parallel
// downloads made streaming playback glitch while an album was being saved.
const MAX_CONCURRENT_DOWNLOADS = 1;
// Throttle progress updates aggressively so a 50/sec progress callback
// doesn't turn into a 50/sec re-render storm in the UI.
const PROGRESS_BYTES_THRESHOLD = 256 * 1024;
const PROGRESS_RATIO_THRESHOLD = 0.01; // 1%
const LISTENER_NOTIFY_THROTTLE_MS = 150;
const REGISTRY_PERSIST_DEBOUNCE_MS = 750;
const PLAYBACK_DOWNLOAD_THROTTLE_BYTES_PER_SECOND = 512 * 1024;
// Files larger than this stay on internal storage even when an SD card SAF
// location is configured — copying via SAF moves bytes through a single JS
// base64 buffer, which OOMs on multi-hundred-MB audiobooks. We can lift this
// once we have a native streaming-copy module.
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

const buildDownloadsRootUri = () =>
    `${FileSystem.documentDirectory ?? ''}${DOWNLOADS_DIR_NAME}/`;

const sanitizeForPath = (value: string): string =>
    value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'item';

const ensureDownloadsDirectory = async () => {
    const root = buildDownloadsRootUri();
    const info = await FileSystem.getInfoAsync(root);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(root, { intermediates: true });
    }
    return root;
};

const buildLocalUri = async (entry: Pick<DownloadEntry, 'collection' | 'trackId'>) => {
    const root = await ensureDownloadsDirectory();
    const collectionDir = `${root}${sanitizeForPath(entry.collection.sourceId)}/${sanitizeForPath(entry.collection.id)}/`;
    const dirInfo = await FileSystem.getInfoAsync(collectionDir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(collectionDir, { intermediates: true });
    }
    return `${collectionDir}${sanitizeForPath(entry.trackId)}.audio`;
};

// In-process registry. fs-storage is the source of truth across launches.
let registryCache: DownloadEntry[] | null = null;
let registryMutationQueue: Promise<void> = Promise.resolve();
let pendingRegistryPersist: DownloadEntry[] | null = null;
let registryPersistTimer: ReturnType<typeof setTimeout> | null = null;
let registryPersistInFlight = false;
const listeners = new Set<(entries: DownloadEntry[]) => void>();
const activeDownloads = new Map<string, { cancel: () => void }>();
const lastProgressReport = new Map<string, { bytes: number; ratio: number }>();
let downloadsPlaybackActive = false;

export const setDownloadsPlaybackActive = (active: boolean) => {
    if (downloadsPlaybackActive === active) {
        return;
    }
    downloadsPlaybackActive = active;
    void setNativeDownloadThrottle(active ? PLAYBACK_DOWNLOAD_THROTTLE_BYTES_PER_SECOND : 0);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const parseEntry = (value: unknown): DownloadEntry | null => {
    if (!isRecord(value)) {
        return null;
    }
    if (
        typeof value.id !== 'string' ||
        typeof value.title !== 'string' ||
        typeof value.sourceUrl !== 'string' ||
        typeof value.trackId !== 'string' ||
        typeof value.enqueuedAt !== 'number' ||
        !isRecord(value.collection)
    ) {
        return null;
    }
    const c = value.collection;
    if (
        typeof c.id !== 'string' ||
        typeof c.sourceId !== 'string' ||
        typeof c.title !== 'string' ||
        typeof c.type !== 'string'
    ) {
        return null;
    }
    return value as unknown as DownloadEntry;
};

const parseRegistryPayload = (raw: string): DownloadEntry[] => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map(parseEntry)
            .filter((entry): entry is DownloadEntry => entry !== null);
    } catch {
        return [];
    }
};

const loadRegistryFromDisk = async (): Promise<DownloadEntry[]> => {
    try {
        const raw = await fsGetItem(REGISTRY_KEY);
        if (!raw) {
            return [];
        }
        return parseRegistryPayload(raw);
    } catch {
        return [];
    }
};

type DiscoveredDownloadFile = {
    collectionId: string;
    localUri: string;
    sourceId: string;
    trackId: string;
};

const buildDownloadTrackKey = (sourceId: string, collectionId: string, trackId: string) =>
    `${sourceId}:${collectionId}:${trackId}`;

const exportRegistrySidecar = async (entries: DownloadEntry[]): Promise<void> => {
    const payload = JSON.stringify(entries);
    try {
        const root = await ensureDownloadsDirectory();
        await FileSystem.writeAsStringAsync(`${root}${REGISTRY_SIDECAR_FILENAME}`, payload);
    } catch {
        // best-effort
    }
    try {
        const storage = await getStorageLocation();
        if (storage.treeUri) {
            await writeSafTextDocument(
                storage.treeUri,
                REGISTRY_SIDECAR_FILENAME,
                payload,
            );
        }
    } catch {
        // best-effort
    }
};

const loadInternalRegistrySidecar = async (): Promise<DownloadEntry[]> => {
    try {
        const root = buildDownloadsRootUri();
        const path = `${root}${REGISTRY_SIDECAR_FILENAME}`;
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) {
            return [];
        }
        return parseRegistryPayload(await FileSystem.readAsStringAsync(path));
    } catch {
        return [];
    }
};

const loadSafRegistrySidecar = async (treeUri: string): Promise<DownloadEntry[]> => {
    const listed = await listSafDownloadAudioFiles(treeUri);
    const registryDoc = listed.find((item) => item.name === REGISTRY_SIDECAR_FILENAME);
    if (!registryDoc) {
        return [];
    }
    const raw = await readSafTextDocument(registryDoc.uri);
    if (!raw) {
        return [];
    }
    return parseRegistryPayload(raw);
};

const scanInternalDownloadFiles = async (): Promise<DiscoveredDownloadFile[]> => {
    const root = buildDownloadsRootUri();
    const rootInfo = await FileSystem.getInfoAsync(root);
    if (!rootInfo.exists) {
        return [];
    }

    const discovered: DiscoveredDownloadFile[] = [];
    const sourceIds = await FileSystem.readDirectoryAsync(root);
    for (const sourceId of sourceIds) {
        if (sourceId === REGISTRY_SIDECAR_FILENAME) {
            continue;
        }
        const sourcePath = `${root}${sourceId}/`;
        const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
        if (!sourceInfo.exists || !sourceInfo.isDirectory) {
            continue;
        }

        const collectionIds = await FileSystem.readDirectoryAsync(sourcePath);
        for (const collectionId of collectionIds) {
            const collectionPath = `${sourcePath}${collectionId}/`;
            const collectionInfo = await FileSystem.getInfoAsync(collectionPath);
            if (!collectionInfo.exists || !collectionInfo.isDirectory) {
                continue;
            }

            const fileNames = await FileSystem.readDirectoryAsync(collectionPath);
            for (const fileName of fileNames) {
                if (!fileName.endsWith('.audio')) {
                    continue;
                }
                discovered.push({
                    collectionId,
                    localUri: `${collectionPath}${fileName}`,
                    sourceId,
                    trackId: fileName.replace(/\.audio$/i, ''),
                });
            }
        }
    }
    return discovered;
};

const scanSafDownloadFiles = async (
    treeUri: string | undefined,
): Promise<DiscoveredDownloadFile[]> => {
    if (!treeUri) {
        return [];
    }

    const listed = await listSafDownloadAudioFiles(treeUri);
    return listed
        .filter((item) => item.name.endsWith('.audio'))
        .map((item) => ({
            collectionId: 'sd-card',
            localUri: item.uri,
            sourceId: 'recovered',
            trackId: item.name.replace(/\.audio$/i, ''),
        }));
};

const mergeRegistryEntries = (
    primary: DownloadEntry[],
    secondary: DownloadEntry[],
): DownloadEntry[] => {
    const byKey = new Map(primary.map((entry) => [entry.id, entry]));
    for (const entry of secondary) {
        if (!byKey.has(entry.id)) {
            byKey.set(entry.id, entry);
        }
    }
    return [...byKey.values()];
};

const findExistingForDiscovered = (
    entries: DownloadEntry[],
    file: DiscoveredDownloadFile,
): DownloadEntry | undefined => {
    const byUri = pickBestRecoveryCandidate(
        entries.filter((entry) => entry.localUri === file.localUri),
    );
    if (byUri) {
        return byUri;
    }

    const trackKey = buildDownloadTrackKey(file.sourceId, file.collectionId, file.trackId);
    const byPathKey = pickBestRecoveryCandidate(
        entries.filter(
            (entry) =>
                buildDownloadTrackKey(
                    entry.collection.sourceId,
                    entry.collection.id,
                    entry.trackId,
                ) === trackKey,
        ),
    );
    if (byPathKey) {
        return byPathKey;
    }

    return pickBestRecoveryCandidate(
        entries.filter(
            (entry) =>
                (entry.trackId === file.trackId ||
                    sanitizeForPath(entry.trackId) === file.trackId) &&
                entry.status === 'completed',
        ),
    );
};

const recoveryMetadataScore = (entry: DownloadEntry): number => {
    let score = 0;
    if (!entry.id.startsWith('discovered-')) score += 1;
    if (entry.collection.sourceId !== 'recovered') score += 4;
    if (entry.collection.id !== 'sd-card') score += 2;
    if (entry.collection.title !== entry.collection.id) score += 1;
    if (entry.title !== entry.trackId) score += 1;
    if (entry.collection.artworkUrl) score += 1;
    return score;
};

const pickBestRecoveryCandidate = (
    candidates: DownloadEntry[],
): DownloadEntry | undefined => {
    return candidates.reduce<DownloadEntry | undefined>((best, candidate) => {
        if (!best || recoveryMetadataScore(candidate) > recoveryMetadataScore(best)) {
            return candidate;
        }
        return best;
    }, undefined);
};

const dedupeRecoveredRegistryEntries = (entries: DownloadEntry[]): DownloadEntry[] => {
    const byIdentity = new Map<string, DownloadEntry>();
    const passthrough: DownloadEntry[] = [];

    for (const entry of entries) {
        const identity =
            entry.status === 'completed' && entry.localUri
                ? `uri:${entry.localUri}`
                : entry.id;
        const existing = byIdentity.get(identity);
        if (!existing) {
            byIdentity.set(identity, entry);
            continue;
        }
        if (recoveryMetadataScore(entry) > recoveryMetadataScore(existing)) {
            byIdentity.set(identity, entry);
        }
    }

    for (const entry of entries) {
        const identity =
            entry.status === 'completed' && entry.localUri
                ? `uri:${entry.localUri}`
                : entry.id;
        if (byIdentity.get(identity) === entry) {
            passthrough.push(entry);
        }
    }

    return passthrough;
};

const createEntryFromDiscovered = (
    file: DiscoveredDownloadFile,
    existing?: DownloadEntry,
): DownloadEntry => {
    const now = Date.now();
    const collection =
        existing?.collection ??
        ({
            id: file.collectionId,
            sourceId: file.sourceId,
            title: file.collectionId,
            type: 'album',
        } satisfies DownloadCollectionInfo);

    return {
        audiobookSegment: existing?.audiobookSegment,
        collection,
        completedAt: existing?.completedAt ?? now,
        enqueuedAt: existing?.enqueuedAt ?? now,
        id:
            existing?.id ??
            `discovered-${sanitizeForPath(file.sourceId)}-${sanitizeForPath(file.collectionId)}-${sanitizeForPath(file.trackId)}`,
        localUri: file.localUri,
        sourceUrl: existing?.sourceUrl ?? file.localUri,
        status: 'completed',
        title: existing?.title ?? file.trackId,
        trackId: existing?.trackId ?? file.trackId,
        trackSubtitle: existing?.trackSubtitle,
    };
};

const reconcileDownloadRegistry = async (current: DownloadEntry[]): Promise<DownloadEntry[]> => {
    const storage = await getStorageLocation();
    const sidecarEntries = mergeRegistryEntries(
        await loadInternalRegistrySidecar(),
        storage.treeUri ? await loadSafRegistrySidecar(storage.treeUri) : [],
    );

    const merged = mergeRegistryEntries(current, sidecarEntries);
    const discoveredFiles = [
        ...(await scanInternalDownloadFiles()),
        ...(storage.treeUri ? await scanSafDownloadFiles(storage.treeUri) : []),
    ];

    if (discoveredFiles.length === 0 && sidecarEntries.length === 0) {
        return current;
    }

    let changed = merged.length !== current.length || sidecarEntries.length > 0;
    const next = [...merged];

    for (const file of discoveredFiles) {
        const existing = findExistingForDiscovered(next, file);
        if (!existing) {
            const created = createEntryFromDiscovered(file);
            next.push(created);
            changed = true;
            continue;
        }

        if (existing.localUri !== file.localUri || existing.status !== 'completed') {
            const index = next.findIndex((entry) => entry.id === existing.id);
            if (index >= 0) {
                next[index] = createEntryFromDiscovered(file, existing);
                changed = true;
            }
        }
    }

    const compacted = dedupeRecoveredRegistryEntries(next);
    if (compacted.length !== next.length) {
        changed = true;
    }

    return changed ? compacted : current;
};

let discoveryInFlight: Promise<void> | null = null;

const scheduleRegistryPersist = () => {
    if (registryPersistTimer !== null) {
        return;
    }
    registryPersistTimer = setTimeout(() => {
        registryPersistTimer = null;
        void flushRegistryPersist();
    }, REGISTRY_PERSIST_DEBOUNCE_MS);
};

const flushRegistryPersist = async (): Promise<void> => {
    if (registryPersistInFlight) {
        scheduleRegistryPersist();
        return;
    }

    const entries = pendingRegistryPersist;
    if (!entries) {
        return;
    }

    pendingRegistryPersist = null;
    registryPersistInFlight = true;
    try {
        const payload = JSON.stringify(entries);
        await fsSetItem(REGISTRY_KEY, payload);
        await exportRegistrySidecar(entries);
    } catch {
        // best-effort
    } finally {
        registryPersistInFlight = false;
        if (pendingRegistryPersist) {
            scheduleRegistryPersist();
        }
    }
};

const saveRegistryToDisk = async (entries: DownloadEntry[]): Promise<void> => {
    // Best-effort persistence; failures don't break the running session.
    // Coalesce writes so enqueueing/downloading large books does not serialize
    // the entire registry repeatedly on the JS thread.
    pendingRegistryPersist = entries;
    scheduleRegistryPersist();
};

const getRegistry = async (): Promise<DownloadEntry[]> => {
    if (registryCache === null) {
        registryCache = await loadRegistryFromDisk();
        // On launch, anything that was mid-download is now orphaned; mark it
        // queued so the next pump tries again.
        registryCache = registryCache.map((entry) =>
            entry.status === 'downloading'
                ? { ...entry, progress: undefined, status: 'queued' as const }
                : entry,
        );
        registryCache = await reconcileDownloadRegistry(registryCache);
        if (registryCache.length > 0) {
            void saveRegistryToDisk(registryCache);
        }
    }
    return registryCache;
};

export const discoverDownloadsOnDisk = async (): Promise<void> => {
    if (discoveryInFlight) {
        await discoveryInFlight;
        return;
    }

    discoveryInFlight = (async () => {
        await registryMutationQueue;
        if (registryCache === null) {
            registryCache = await loadRegistryFromDisk();
        }
        const reconciled = await reconcileDownloadRegistry(registryCache);
        if (reconciled !== registryCache) {
            setRegistry(reconciled, true);
        }
    })().finally(() => {
        discoveryInFlight = null;
    });

    await discoveryInFlight;
};

// "persist" controls whether we also write the registry to disk. Progress
// updates (50+/sec from createDownloadResumable) skip the write — only status
// transitions hit disk. Without this, persisting every progress tick made the
// downloads list visibly glitch as the UI rerendered against an in-flight
// JSON serialization storm.
const setRegistry = (entries: DownloadEntry[], persist: boolean) => {
    registryCache = entries;
    if (persist) {
        void saveRegistryToDisk(entries);
    }
    notifyListeners();
};

const withRegistryMutation = async <T>(
    mutate: (current: DownloadEntry[]) => {
        entries?: DownloadEntry[];
        persist?: boolean;
        result: T;
    },
): Promise<T> => {
    let result: T | undefined;
    const run = async () => {
        const current = await getRegistry();
        const mutation = mutate(current);
        result = mutation.result;
        if (mutation.entries) {
            setRegistry(mutation.entries, mutation.persist !== false);
        }
    };

    registryMutationQueue = registryMutationQueue.then(run, run);
    await registryMutationQueue;
    return result as T;
};

let pendingNotifyTimer: ReturnType<typeof setTimeout> | null = null;
const notifyListeners = () => {
    if (pendingNotifyTimer !== null) {
        return;
    }
    pendingNotifyTimer = setTimeout(() => {
        pendingNotifyTimer = null;
        const snapshot = registryCache ?? [];
        listeners.forEach((listener) => {
            try {
                listener(snapshot);
            } catch {
                // ignore listener errors — never let a UI listener crash break the manager
            }
        });
    }, LISTENER_NOTIFY_THROTTLE_MS);
};

export const subscribeDownloads = (
    listener: (entries: DownloadEntry[]) => void,
): (() => void) => {
    listeners.add(listener);
    if (registryCache !== null) {
        listener(registryCache);
    } else {
        void getRegistry().then(() => listener(registryCache ?? []));
    }
    return () => {
        listeners.delete(listener);
    };
};

export const listDownloads = async (): Promise<DownloadEntry[]> => {
    return getRegistry();
};

const updateEntry = async (
    id: string,
    patch: Partial<DownloadEntry>,
    options?: { persist?: boolean },
): Promise<DownloadEntry | null> => {
    return withRegistryMutation((current) => {
        let updated: DownloadEntry | null = null;
        const next = current.map((entry) => {
            if (entry.id === id) {
                updated = { ...entry, ...patch };
                return updated;
            }
            return entry;
        });
        return {
            entries: updated ? next : undefined,
            persist: options?.persist !== false,
            result: updated,
        };
    });
};

const reportDownloadProgress = (
    entryId: string,
    written: number,
    total: number | undefined,
) => {
    const ratio = total && total > 0 ? written / total : 0;
    const last = lastProgressReport.get(entryId) ?? { bytes: 0, ratio: 0 };
    const bytesDelta = written - last.bytes;
    const ratioDelta = Math.abs(ratio - last.ratio);
    const isComplete = Boolean(total && total > 0 && written >= total);
    if (
        !isComplete &&
        bytesDelta < PROGRESS_BYTES_THRESHOLD &&
        ratioDelta < PROGRESS_RATIO_THRESHOLD
    ) {
        return;
    }
    lastProgressReport.set(entryId, { bytes: written, ratio });
    void updateEntry(
        entryId,
        {
            bytesDownloaded: written,
            progress: total && total > 0 ? ratio : undefined,
            status: 'downloading',
            totalBytes: total && total > 0 ? total : undefined,
        },
        { persist: false },
    );
};

const startSingleDownload = async (
    entryId: string,
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    const registry = await getRegistry();
    const entry = registry.find((candidate) => candidate.id === entryId);
    if (!entry) {
        return;
    }

    const auth = authentications.find(
        (candidate) =>
            `${candidate.type}:${candidate.url}` === entry.collection.sourceId,
    );

    const headers: Record<string, string> = {};
    if (auth && auth.type === ServerType.AUDIOBOOKSHELF) {
        headers.Authorization = `Bearer ${auth.credential}`;
    }

    try {
        const localUri = await buildLocalUri(entry);
        // Pre-record so the first onProgress fires don't all get through the
        // 1% / 256KB threshold and update state 10 times for the first packet.
        lastProgressReport.set(entry.id, { bytes: 0, ratio: 0 });
        if (isNativeDownloadAvailable()) {
            const unsubscribe = subscribeNativeDownloadProgress((event) => {
                if (event.id !== entry.id) {
                    return;
                }
                reportDownloadProgress(
                    entry.id,
                    event.bytesWritten ?? 0,
                    event.totalBytes && event.totalBytes > 0 ? event.totalBytes : undefined,
                );
            });
            activeDownloads.set(entry.id, {
                cancel: () => {
                    void cancelNativeDownload(entry.id).catch(() => undefined);
                },
            });
            await setNativeDownloadThrottle(
                downloadsPlaybackActive ? PLAYBACK_DOWNLOAD_THROTTLE_BYTES_PER_SECOND : 0,
            );
            await updateEntry(entry.id, { status: 'downloading' });
            try {
                const result = await downloadFileNative(
                    entry.id,
                    entry.sourceUrl,
                    localUri,
                    headers,
                );
                lastProgressReport.delete(entry.id);
                if (!result) {
                    throw new Error('Native Android download engine is not available');
                }
                const completed = await updateEntry(entry.id, {
                    bytesDownloaded: result.bytesWritten,
                    completedAt: Date.now(),
                    localUri: result.uri,
                    progress: 1,
                    status: 'completed',
                    totalBytes:
                        result.totalBytes && result.totalBytes > 0
                            ? result.totalBytes
                            : result.bytesWritten,
                });
                if (completed) {
                    await tryMoveCompletedFileToSaf(completed);
                }
            } finally {
                unsubscribe();
            }
            return;
        }

        const resumable = FileSystem.createDownloadResumable(
            entry.sourceUrl,
            localUri,
            { headers },
            (progress) => {
                const total = progress.totalBytesExpectedToWrite;
                const written = progress.totalBytesWritten;
                // Don't persist on every progress tick — only status changes
                // get written to disk. If the app dies mid-download, the
                // entry comes back as 'queued' and retries from scratch.
                reportDownloadProgress(entry.id, written, total > 0 ? total : undefined);
            },
        );
        activeDownloads.set(entry.id, {
            cancel: () => {
                void resumable.cancelAsync().catch(() => undefined);
            },
        });
        await updateEntry(entry.id, { status: 'downloading' });

        const result = await resumable.downloadAsync();
        lastProgressReport.delete(entry.id);
        if (!result) {
            await updateEntry(entry.id, { status: 'canceled' });
        } else {
            const completed = await updateEntry(entry.id, {
                completedAt: Date.now(),
                localUri: result.uri,
                progress: 1,
                status: 'completed',
            });
            // Move to SD card if the user picked a SAF location. Falls back
            // silently to internal storage on huge files / revoked permission.
            if (completed) {
                await tryMoveCompletedFileToSaf(completed);
            }
        }
    } catch (error) {
        lastProgressReport.delete(entry.id);
        const message = error instanceof Error ? error.message : 'Download failed';
        if (/cancel/i.test(message)) {
            await updateEntry(entry.id, { status: 'canceled' });
            return;
        }
        await updateEntry(entry.id, {
            errorMessage: message,
            status: 'failed',
        });
    } finally {
        activeDownloads.delete(entry.id);
        // Tail-call: keep draining the queue from the freshly-freed slot.
        void pumpQueue(authentications);
    }
};

const pumpQueue = async (
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    if (activeDownloads.size >= MAX_CONCURRENT_DOWNLOADS) {
        return;
    }
    const registry = await getRegistry();
    // Pick the next queued entry that isn't already active. We keep starting
    // entries until we hit the concurrency cap.
    while (activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
        const next = registry.find(
            (entry) => entry.status === 'queued' && !activeDownloads.has(entry.id),
        );
        if (!next) {
            return;
        }
        // Mark as active immediately so the next loop iteration doesn't pick
        // the same one again. startSingleDownload re-reads from the registry
        // when it actually begins, so this is just a placeholder.
        activeDownloads.set(next.id, { cancel: () => undefined });
        void startSingleDownload(next.id, authentications);
    }
};

/**
 * Resume the queue when the app returns to the foreground. Anything stuck in
 * 'downloading' with no live handle (the process was suspended/killed while
 * backgrounded) is re-queued so it retries from scratch; genuinely-active
 * transfers are left alone. Fixes downloads that "show queued and never resume."
 */
export const resumeDownloadsOnForeground = async (
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    const registry = await getRegistry();
    for (const entry of registry) {
        if (entry.status === 'downloading' && !activeDownloads.has(entry.id)) {
            await updateEntry(entry.id, { progress: undefined, status: 'queued' });
        }
    }
    void pumpQueue(authentications);
};

const buildEntryId = (): string =>
    `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface EnqueueTrackInput {
    /** Optional per-file metadata for multi-file audiobooks. */
    audiobookSegment?: AudiobookFileSegment;
    collection: DownloadCollectionInfo;
    sourceUrl: string;
    title: string;
    trackId: string;
    trackSubtitle?: string;
}

export const enqueueDownload = async (
    input: EnqueueTrackInput,
    authentications: ServerAuthenticationResult[],
): Promise<DownloadEntry> => {
    const entry = await withRegistryMutation<DownloadEntry>((registry) => {
        const existing = registry.find(
            (candidate) =>
                candidate.trackId === input.trackId &&
                candidate.collection.sourceId === input.collection.sourceId &&
                candidate.collection.id === input.collection.id &&
                (candidate.status === 'completed' ||
                    candidate.status === 'queued' ||
                    candidate.status === 'downloading'),
        );
        if (existing) {
            return { result: existing };
        }

        const nextEntry: DownloadEntry = {
            audiobookSegment: input.audiobookSegment,
            collection: input.collection,
            enqueuedAt: Date.now(),
            id: buildEntryId(),
            sourceUrl: input.sourceUrl,
            status: 'queued',
            title: input.title,
            trackId: input.trackId,
            trackSubtitle: input.trackSubtitle,
        };
        return {
            entries: [...registry, nextEntry],
            result: nextEntry,
        };
    });
    void pumpQueue(authentications);
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
        if (entry.enqueuedAt && entry.status !== 'completed') {
            enqueued += 1;
        } else {
            skipped += 1;
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

/**
 * Download every episode of a Samo podcast. Each episode is fetched from a
 * FRESH from-zero stream URL — the playback URL embeds the listener's resume
 * offset (server-samo `offsetSeconds`), so reusing it would download a partial
 * file. The stream token self-authenticates the URL (no Authorization header).
 */
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

/** Single Samo podcast episode — same from-zero stream URL as the bulk path. */
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

    // Resolve the raw audio files via /api/items/:id/file/:ino instead of
    // /play. The /play endpoint can hand back a server-transcoded HLS stream
    // which we can't save as a usable offline file; the /file/:ino endpoint
    // always returns the original-quality source file. This is also how
    // Audiobookshelf's own offline download flow works.
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
        // Key each file by the book id when single-file, or by `<bookId>:<ino>`
        // for multi-file. Multi-file books store an audiobookSegment so the
        // offline playback resolver can map "book time" back to the right
        // file + local offset and seamlessly chain them in a queue.
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

    // Pull every episode's underlying audio file via the ABS file endpoint.
    // /api/items/:id/file/:ino always returns the raw source MP3/M4A
    // regardless of whether the server's /play endpoint would have wrapped
    // it in HLS for streaming.
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
                // Key by episodeId — matches what playback's resolveLocalPlayback
                // extracts from `<authType>:<authUrl>:podcast:<itemId>:<episodeId>`.
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

/**
 * Enqueue a single music track. Used by the long-press / context-menu
 * Download action on individual songs so users can save a single track
 * without downloading the whole album/playlist.
 */
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
    // Group single-track downloads under a synthetic collection so the
    // Downloads list keeps them organized by album when present.
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

/**
 * Enqueue a single podcast episode. Uses the ABS /api/items/:itemId/file/:ino
 * endpoint to fetch the raw audio file (bypassing HLS) so downloads work
 * regardless of the server's streaming-format setting.
 */
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
        // Look up the episode's underlying audio file. We need the file's ino
        // to hit /api/items/:id/file/:ino — that's what makes downloads work
        // even when the server's streaming layer would have returned HLS.
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

export const cancelDownload = async (id: string): Promise<void> => {
    const registry = await getRegistry();
    const target = registry.find((entry) => entry.id === id);
    if (!target) {
        return;
    }
    const active = activeDownloads.get(id);
    if (active) {
        active.cancel();
        // startSingleDownload's finally block updates the entry to canceled.
        return;
    }
    await updateEntry(id, { status: 'canceled' });
};

export const removeDownload = async (id: string): Promise<void> => {
    const registry = await getRegistry();
    const target = registry.find((entry) => entry.id === id);
    if (!target) {
        return;
    }
    if (target.localUri) {
        try {
            await FileSystem.deleteAsync(target.localUri, { idempotent: true });
        } catch {
            // best-effort
        }
    }
    const active = activeDownloads.get(id);
    if (active) {
        active.cancel();
        activeDownloads.delete(id);
    }
    await withRegistryMutation((current) => ({
        entries: current.filter((entry) => entry.id !== id),
        result: undefined,
    }));
};

export const retryDownload = async (
    id: string,
    authentications: ServerAuthenticationResult[],
): Promise<void> => {
    await updateEntry(id, {
        errorMessage: undefined,
        progress: undefined,
        status: 'queued',
    });
    void pumpQueue(authentications);
};

export const getLocalUriForTrack = async (
    trackId: string,
    sourceId: string,
): Promise<string | null> => {
    const registry = await getRegistry();
    const match = registry.find(
        (entry) =>
            entry.trackId === trackId &&
            entry.collection.sourceId === sourceId &&
            entry.status === 'completed' &&
            entry.localUri,
    );
    return match?.localUri ?? null;
};

export const getLocalDownloadForTrack = async (
    trackId: string,
    sourceId: string,
): Promise<{ localUri: string; sourceUrl: string } | null> => {
    const registry = await getRegistry();
    const match = registry.find(
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
    /** The ABS URL this file was downloaded from — kept so cast can stream
     *  it from the server when the phone-local file path is unreachable. */
    sourceUrl: string;
    startOffsetSeconds: number;
}

/**
 * Returns all completed download files for an Audiobookshelf book, sorted by
 * their position in the book. For single-file books returns one entry; for
 * multi-file books returns the full ordered list so the playback layer can
 * concatenate them as a queue.
 */
export const getOfflineAudiobookFiles = async (
    bookId: string,
    sourceId: string,
): Promise<OfflineAudiobookFile[]> => {
    const registry = await getRegistry();
    const matches = registry.filter(
        (entry) =>
            entry.status === 'completed' &&
            entry.localUri &&
            entry.collection.sourceId === sourceId &&
            entry.collection.id === bookId &&
            entry.collection.type === 'audiobook',
    );
    if (matches.length === 0) {
        return [];
    }
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

export const getDownloadsRootUri = (): string => buildDownloadsRootUri();

// ---------- Storage location (internal vs SD card via SAF) ----------

export interface StorageLocationPreference {
    // Display name shown in UI (e.g., "SD card" or "Internal storage")
    label: string;
    // The location is a SAF content:// tree URI when set, undefined for default internal
    treeUri?: string;
}

let storageLocationCache: StorageLocationPreference | null = null;
const storageLocationListeners = new Set<(pref: StorageLocationPreference) => void>();

const DEFAULT_STORAGE_LOCATION: StorageLocationPreference = {
    label: 'Internal storage',
};

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
        if (registryCache && registryCache.length > 0) {
            void exportRegistrySidecar(registryCache);
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
        // Try to surface a friendly tail of the path so the user can recognise
        // their pick — SAF URIs like content://com.android.externalstorage.documents/tree/...
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

// ---------- SAF copy after download completes ----------

const mimeTypeForFileName = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    if (ext === 'mp3') return 'audio/mpeg';
    if (ext === 'm4a' || ext === 'aac') return 'audio/mp4';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'ogg' || ext === 'opus') return 'audio/ogg';
    if (ext === 'wav') return 'audio/wav';
    return 'audio/*';
};

const tryMoveCompletedFileToSaf = async (
    entry: DownloadEntry,
): Promise<DownloadEntry> => {
    if (!entry.localUri || entry.status !== 'completed') {
        return entry;
    }
    const pref = await getStorageLocation();
    if (!pref.treeUri) {
        return entry;
    }
    // Skip already-SAF URIs (idempotent on re-runs).
    if (entry.localUri.startsWith('content://')) {
        return entry;
    }

    let info: FileSystem.FileInfo;
    try {
        info = await FileSystem.getInfoAsync(entry.localUri);
    } catch {
        return entry;
    }
    if (!info.exists) {
        return entry;
    }

    const trackFileName = sanitizeForPath(entry.trackId) + '.audio';
    const mimeType = mimeTypeForFileName(trackFileName);

    // Prefer the native streaming copy. It uses ContentResolver under the
    // hood with a 64KB buffer, so a 5 GB audiobook moves in O(1) memory.
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
            const updated =
                updateEntryDirect(entry.id, { localUri: safUri }) ?? {
                    ...entry,
                    localUri: safUri,
                };
            await flushRegistryPersist();
            return updated;
        }
        // Native bridge returned null (e.g., permission revoked). Fall back
        // to the JS bridge below for files small enough to make it through.
    }

    // Fallback: legacy expo-file-system SAF write via base64. Caps out
    // around 200MB before the in-memory base64 buffer becomes a problem.
    const size = info.size ?? 0;
    if (size > SAF_COPY_MAX_BYTES) {
        return updateEntryDirect(entry.id, {
            errorMessage:
                'File too large to copy to SD card without the native bridge. Staying on internal storage — rebuild the app to get streaming SAF copy.',
        }) ?? entry;
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
        const updated =
            updateEntryDirect(entry.id, { localUri: safFileUri }) ?? {
                ...entry,
                localUri: safFileUri,
            };
        await flushRegistryPersist();
        return updated;
    } catch {
        return entry;
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

    const entries = await getRegistry();
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
            const beforeUri = entry.localUri;
            const moved = await tryMoveCompletedFileToSaf(entry);
            if (moved.localUri && moved.localUri !== beforeUri) {
                migrated += 1;
            } else {
                skipped += 1;
            }
        } catch {
            failed += 1;
        }
    }

    return { failed, migrated, skipped };
};

const updateEntryDirect = (
    id: string,
    patch: Partial<DownloadEntry>,
): DownloadEntry | null => {
    if (!registryCache) return null;
    let updated: DownloadEntry | null = null;
    const next = registryCache.map((entry) => {
        if (entry.id === id) {
            updated = { ...entry, ...patch };
            return updated;
        }
        return entry;
    });
    if (updated) {
        setRegistry(next, true);
    }
    return updated;
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

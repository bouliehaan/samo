import { type ServerAuthenticationResult } from '@samo/core/server';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    Alert,
    Pressable,
    Text,
    View,
} from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { getContentSourceFromDownloadCollection } from '../utils/content-source';

import {
    cancelDownload,
    clearAllDownloads,
    discoverDownloadsOnDisk,
    type DownloadEntry,
    type DownloadStatus,
    getDownloadsRootUri,
    getStorageLocation,
    migrateCompletedDownloadsToStorage,
    pickSdCardStorageLocation,
    removeDownload,
    resetStorageLocation,
    retryDownload,
    type StorageLocationPreference,
    subscribeDownloads,
    subscribeStorageLocation,
} from '../services/download-manager';
import { styles } from '../theme/styles';

const formatBytes = (bytes: number | undefined): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getDownloadStatusLabel = (entry: DownloadEntry): string => {
    if (entry.status === 'downloading') {
        const pct = entry.progress !== undefined ? Math.round(entry.progress * 100) : null;
        return pct !== null ? `Downloading ${pct}%` : 'Downloading…';
    }
    if (entry.status === 'completed') {
        return formatBytes(entry.totalBytes ?? entry.bytesDownloaded) || 'Saved';
    }
    if (entry.status === 'queued') return 'Queued';
    if (entry.status === 'canceled') return 'Canceled';
    return entry.errorMessage ? `Failed: ${entry.errorMessage}` : 'Failed';
};

const DOWNLOAD_STATUS_ORDER: DownloadStatus[] = [
    'downloading',
    'queued',
    'failed',
    'completed',
    'canceled',
];

interface DownloadsScreenProps {
    serverConnections: ServerAuthenticationResult[];
}

export const DownloadsScreen = ({
    serverConnections,
}: DownloadsScreenProps) => {
    const [entries, setEntries] = useState<DownloadEntry[]>([]);
    const [storage, setStorage] = useState<StorageLocationPreference>({
        label: 'Internal storage',
    });
    const [isPickingStorage, setIsPickingStorage] = useState(false);
    const [isMigratingStorage, setIsMigratingStorage] = useState(false);
    const [isClearingAll, setIsClearingAll] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeDownloads(setEntries);
        void discoverDownloadsOnDisk();
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeStorageLocation(setStorage);
        void getStorageLocation().then(setStorage);
        return () => {
            unsubscribe();
        };
    }, []);

    const handlePickSdCard = async () => {
        if (isPickingStorage) return;
        setIsPickingStorage(true);
        try {
            const result = await pickSdCardStorageLocation();
            if (!result) {
                Alert.alert(
                    'SD card not set',
                    'Picking a folder was canceled or your device doesn’t expose an SD card via the system file picker.',
                );
            }
        } finally {
            setIsPickingStorage(false);
        }
    };

    const handleResetStorage = async () => {
        await resetStorageLocation();
    };

    const handleClearAll = () => {
        if (isClearingAll || entries.length === 0) return;
        Alert.alert(
            'Delete all downloads?',
            'This cancels any in-progress downloads and deletes every downloaded file from this device. Your library on the server is not affected.',
            [
                { style: 'cancel', text: 'Cancel' },
                {
                    style: 'destructive',
                    text: 'Delete all',
                    onPress: () => {
                        setIsClearingAll(true);
                        void clearAllDownloads().finally(() => setIsClearingAll(false));
                    },
                },
            ],
        );
    };

    const handleMigrateStorage = async () => {
        if (isMigratingStorage) return;
        setIsMigratingStorage(true);
        try {
            const result = await migrateCompletedDownloadsToStorage();
            if (result.reason) {
                Alert.alert('Migration not started', result.reason);
                return;
            }
            Alert.alert(
                'Migration complete',
                `${result.migrated} moved · ${result.skipped} already there or skipped${
                    result.failed > 0 ? ` · ${result.failed} failed` : ''
                }`,
            );
        } finally {
            setIsMigratingStorage(false);
        }
    };

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            const orderA = DOWNLOAD_STATUS_ORDER.indexOf(a.status);
            const orderB = DOWNLOAD_STATUS_ORDER.indexOf(b.status);
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return b.enqueuedAt - a.enqueuedAt;
        });
    }, [entries]);

    const grouped = useMemo(() => {
        const map = new Map<
            string,
            { collection: DownloadEntry['collection']; entries: DownloadEntry[] }
        >();
        for (const entry of sortedEntries) {
            const key = `${entry.collection.sourceId}:${entry.collection.id}`;
            const existing = map.get(key);
            if (existing) {
                existing.entries.push(entry);
            } else {
                map.set(key, { collection: entry.collection, entries: [entry] });
            }
        }
        return Array.from(map.values());
    }, [sortedEntries]);

    const totalBytes = useMemo(
        () =>
            sortedEntries.reduce(
                (sum, entry) =>
                    sum +
                    (entry.status === 'completed'
                        ? (entry.totalBytes ?? entry.bytesDownloaded ?? 0)
                        : 0),
                0,
            ),
        [sortedEntries],
    );

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Downloads</Text>
            <Text style={styles.downloadsSummary}>
                {sortedEntries.length === 0
                    ? 'No downloads yet. Tap the download icon on an album, playlist, audiobook, or podcast to save it for offline listening.'
                    : `${sortedEntries.length} ${sortedEntries.length === 1 ? 'item' : 'items'} · ${formatBytes(totalBytes) || '0 MB on disk'}`}
            </Text>
            {sortedEntries.length > 0 ? (
                <Pressable
                    accessibilityRole="button"
                    disabled={isClearingAll}
                    onPress={handleClearAll}
                    style={[
                        styles.downloadsClearAllButton,
                        isClearingAll && styles.disabledButton,
                    ]}
                >
                    <Text
                        style={[
                            styles.downloadsStorageButtonLabel,
                            styles.downloadActionDestructive,
                        ]}
                    >
                        {isClearingAll ? 'Deleting…' : 'Delete all downloads'}
                    </Text>
                </Pressable>
            ) : null}
            <View style={styles.downloadsStorageRow}>
                <Text style={styles.downloadsStorageLabel}>Storage location</Text>
                <Text numberOfLines={2} style={styles.downloadsStorageValue}>
                    {storage.treeUri
                        ? storage.label
                        : `Internal · ${getDownloadsRootUri().replace(/^file:\/\//, '')}`}
                </Text>
                <Text style={styles.downloadsStorageNote}>
                    {storage.treeUri
                        ? 'New downloads move here when they finish. Use Migrate downloads to move existing internal files too.'
                        : 'Default: app-private internal storage. Pick a folder on your SD card if you want downloads to live there instead.'}
                </Text>
                <View style={styles.downloadsStorageActions}>
                    <Pressable
                        accessibilityRole="button"
                        disabled={isPickingStorage}
                        onPress={() => void handlePickSdCard()}
                        style={[
                            styles.downloadsStorageButton,
                            isPickingStorage && styles.disabledButton,
                        ]}
                    >
                        <Text style={styles.downloadsStorageButtonLabel}>
                            {storage.treeUri ? 'Change folder…' : 'Pick SD card folder…'}
                        </Text>
                    </Pressable>
                    {storage.treeUri ? (
                        <Pressable
                            accessibilityRole="button"
                            disabled={isMigratingStorage}
                            onPress={() => void handleMigrateStorage()}
                            style={[
                                styles.downloadsStorageButton,
                                isMigratingStorage && styles.disabledButton,
                            ]}
                        >
                            <Text style={styles.downloadsStorageButtonLabel}>
                                {isMigratingStorage ? 'Migrating…' : 'Migrate downloads'}
                            </Text>
                        </Pressable>
                    ) : null}
                    {storage.treeUri ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleResetStorage()}
                            style={styles.downloadsStorageButton}
                        >
                            <Text style={styles.downloadsStorageButtonLabel}>
                                Use internal
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
            {grouped.map((group) => (
                <View
                    key={`${group.collection.sourceId}:${group.collection.id}`}
                    style={styles.downloadGroup}
                >
                    <View style={styles.downloadGroupHeader}>
                        {group.collection.artworkUrl || group.collection.artworkImageId ? (
                            <ArtworkImage
                                artworkImageId={group.collection.artworkImageId}
                                contentSource={getContentSourceFromDownloadCollection(
                                    group.collection,
                                    serverConnections,
                                )}
                                fallbackStyle={[
                                    styles.downloadGroupArtwork,
                                    styles.downloadGroupArtworkFallback,
                                ]}
                                letter={group.collection.title.slice(0, 1)}
                                serverConnections={serverConnections}
                                style={styles.downloadGroupArtwork}
                                uri={group.collection.artworkUrl}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.downloadGroupArtwork,
                                    styles.downloadGroupArtworkFallback,
                                ]}
                            />
                        )}
                        <View style={styles.downloadGroupText}>
                            <Text numberOfLines={1} style={styles.downloadGroupTitle}>
                                {group.collection.title}
                            </Text>
                            <Text style={styles.downloadGroupSubtitle}>
                                {group.entries.length}{' '}
                                {group.entries.length === 1 ? 'track' : 'tracks'} ·{' '}
                                {group.collection.type}
                            </Text>
                        </View>
                    </View>
                    {group.entries.map((entry) => (
                        <View key={entry.id} style={styles.downloadRow}>
                            <View style={styles.downloadRowText}>
                                <Text numberOfLines={1} style={styles.downloadRowTitle}>
                                    {entry.title}
                                </Text>
                                <Text numberOfLines={1} style={styles.downloadRowStatus}>
                                    {getDownloadStatusLabel(entry)}
                                </Text>
                                {entry.status === 'downloading' &&
                                entry.progress !== undefined ? (
                                    <View style={styles.downloadProgressTrack}>
                                        <View
                                            style={[
                                                styles.downloadProgressFill,
                                                {
                                                    width: `${Math.round(
                                                        (entry.progress ?? 0) * 100,
                                                    )}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.downloadRowActions}>
                                {entry.status === 'failed' ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() =>
                                            void retryDownload(entry.id, serverConnections)
                                        }
                                        style={styles.downloadActionButton}
                                    >
                                        <Text style={styles.downloadActionLabel}>Retry</Text>
                                    </Pressable>
                                ) : null}
                                {entry.status === 'queued' ||
                                entry.status === 'downloading' ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => void cancelDownload(entry.id)}
                                        style={styles.downloadActionButton}
                                    >
                                        <Text style={styles.downloadActionLabel}>Cancel</Text>
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void removeDownload(entry.id)}
                                    style={styles.downloadActionButton}
                                >
                                    <Text
                                        style={[
                                            styles.downloadActionLabel,
                                            styles.downloadActionDestructive,
                                        ]}
                                    >
                                        Remove
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};

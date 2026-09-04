import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from 'react-native';

import {
    CheckGlyph,
    ClearGlyph,
    DiscGlyph,
    DownloadGlyph,
    PersonGlyph,
    RadioWaveGlyph,
} from '../components/Glyphs';
import { clearArtworkCache, getArtworkCacheSizeBytes } from '../services/artwork-cache';
import {
    type CatalogSyncState,
    subscribeCatalogSyncState,
} from '../services/catalog/catalog-sync-state';
import {
    clearAllPodcastCache,
    loadPodcastCacheState,
    type PodcastCacheState,
    updatePodcastCacheLimit,
    updatePodcastPrewarmCount,
} from '../services/podcast-cache-settings';
import { useAuthSessionSelector } from '../state/auth-session';
import { useNetworkSelector } from '../state/network-state';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

type SyncStatus =
    | { kind: 'error'; message: string }
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'success' };

/** A samo source whose on-device mirror is surfaced in the Local library panel. */
export interface CatalogSourceSummary {
    id: string;
    title: string;
}

interface SettingsScreenProps {
    artworkCacheLimitBytes: number;
    catalogSources: CatalogSourceSummary[];
    onOpenDownloads: () => void;
    onOpenManageServers: () => void;
    onOpenNetwork: () => void;
    onSetArtworkCacheLimit: (bytes: number) => void;
    onSyncWithServer: () => Promise<{ message?: string; ok: boolean }>;
    serverCount: number;
}

const GIBIBYTE = 1024 * 1024 * 1024;
const ARTWORK_CACHE_PRESETS_BYTES = [1, 2, 5, 10, 20].map((gb) => gb * GIBIBYTE);
const PODCAST_PREWARM_PRESETS = [0, 1, 3, 5, 10];
const PODCAST_CACHE_PRESETS_BYTES = [1, 2, 5, 10, 20, 50].map((gb) => gb * GIBIBYTE);

const nextPreset = <T extends number>(presets: T[], current: number): T => {
    const index = presets.findIndex((preset) => preset >= current);
    return presets[(index + 1) % presets.length]!;
};

const formatBytes = (bytes: number): string => {
    if (bytes >= GIBIBYTE) {
        return `${(bytes / GIBIBYTE).toFixed(bytes >= 10 * GIBIBYTE ? 0 : 1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
};

const formatGbLimit = (bytes: number): string => `${Math.round(bytes / GIBIBYTE)} GB`;

const formatCount = (value: number, noun: string): string =>
    `${value.toLocaleString()} ${noun}${value === 1 ? '' : 's'}`;

const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60_000) {
        return 'just now';
    }
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 60) {
        return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} h ago`;
    }
    return `${Math.floor(hours / 24)} d ago`;
};

const SILLY_PHRASES = [
    'Aligning chakras…',
    'Reticulating splines…',
    'Dusting off shelves…',
    'Tuning the radio…',
    'Organizing the archive…',
    'Feeding the hamsters…',
    'Warming up the tubes…',
];

const CatalogSyncIcon = ({ state }: { state: CatalogSyncState | undefined }) => {
    const [elapsedMs, setElapsedMs] = useState(() =>
        state?.status === 'syncing' ? Date.now() - (state.lastAttemptAt ?? Date.now()) : 0,
    );

    useEffect(() => {
        if (!state || state.status !== 'syncing') {
            return;
        }
        const interval = setInterval(() => {
            setElapsedMs(Date.now() - (state.lastAttemptAt ?? Date.now()));
        }, 100);
        return () => clearInterval(interval);
    }, [state?.status, state?.lastAttemptAt]);

    if (state?.status === 'syncing') {
        if (elapsedMs < 1000) {
            return <View style={{ width: 20, height: 20 }} />;
        }
        return <ActivityIndicator color={colors.text} size="small" />;
    }

    return (
        <CheckGlyph
            color={state?.status === 'synced' ? colors.accent : colors.muted}
            size={16}
        />
    );
};

const CatalogSyncProgress = ({ state }: { state: CatalogSyncState | undefined }) => {
    const [elapsedMs, setElapsedMs] = useState(() =>
        state?.status === 'syncing' ? Date.now() - (state.lastAttemptAt ?? Date.now()) : 0,
    );

    useEffect(() => {
        if (!state || state.status !== 'syncing') {
            return;
        }
        const interval = setInterval(() => {
            setElapsedMs(Date.now() - (state.lastAttemptAt ?? Date.now()));
        }, 100);
        return () => clearInterval(interval);
    }, [state?.status, state?.lastAttemptAt]);

    if (!state || state.status === 'idle') {
        return <Text style={styles.settingsRowSubtitle}>Not synced yet</Text>;
    }
    if (state.status === 'error') {
        return <Text style={styles.settingsRowSubtitle}>{state.error ?? 'Sync failed'}</Text>;
    }
    if (state.status === 'synced') {
        const finalCounts = `${formatCount(state.itemCount, 'item')} · ${formatCount(state.trackCount, 'track')}`;
        return (
            <Text style={styles.settingsRowSubtitle}>
                {state.lastSyncedAt ? `${finalCounts} · ${formatRelativeTime(state.lastSyncedAt)}` : finalCounts}
            </Text>
        );
    }

    const counts = `${formatCount(state.itemCount, 'item')} · ${formatCount(state.trackCount, 'track')}`;
    const seconds = elapsedMs / 1000;

    let text = `Mirroring… ${counts}`;
    if (seconds >= 5 && seconds < 10) {
        const phraseIndex = Math.floor(seconds / 2) % SILLY_PHRASES.length;
        text = `${SILLY_PHRASES[phraseIndex]} ${counts}`;
    } else if (seconds >= 10) {
        let step = 'Step 1: Fetching metadata…';
        if (state.detailCount > 0) {
            step = 'Step 3: Extracting deep details…';
        } else if (state.trackCount > 0) {
            step = 'Step 2: Syncing audio tracks…';
        }
        text = `${step} ${counts}`;
    }

    return <Text style={styles.settingsRowSubtitle}>{text}</Text>;
};

export const SettingsScreen = ({
    artworkCacheLimitBytes,
    catalogSources,
    onOpenDownloads,
    onOpenManageServers,
    onOpenNetwork,
    onSetArtworkCacheLimit,
    onSyncWithServer,
    serverCount,
}: SettingsScreenProps) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'idle' });
    const [catalogStates, setCatalogStates] = useState<CatalogSyncState[]>([]);
    const [artworkCacheSize, setArtworkCacheSize] = useState<number | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeCatalogSyncState(setCatalogStates);
        return unsubscribe;
    }, []);

    const refreshArtworkCacheSize = useCallback(async () => {
        setArtworkCacheSize(await getArtworkCacheSizeBytes());
    }, []);

    useEffect(() => {
        let active = true;
        void getArtworkCacheSizeBytes().then((size) => {
            if (active) {
                setArtworkCacheSize(size);
            }
        });
        return () => {
            active = false;
        };
    }, [artworkCacheLimitBytes]);

    const handleCycleArtworkCacheLimit = () => {
        const currentIndex = ARTWORK_CACHE_PRESETS_BYTES.findIndex(
            (preset) => preset >= artworkCacheLimitBytes,
        );
        const nextIndex = (currentIndex + 1) % ARTWORK_CACHE_PRESETS_BYTES.length;
        onSetArtworkCacheLimit(ARTWORK_CACHE_PRESETS_BYTES[nextIndex]!);
    };

    const handleClearArtworkCache = () => {
        void clearArtworkCache().then(refreshArtworkCacheSize);
    };

    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isOffline = useNetworkSelector((state) => state.isOffline);
    const offlinePreference = useNetworkSelector((state) => state.offlinePreference);
    const activeEndpointOrigin = useNetworkSelector((state) => state.activeEndpointOrigin);
    const networkSubtitle = isOffline
        ? offlinePreference === 'forced'
            ? 'Offline mode is on'
            : 'Offline — playing from this device'
        : activeEndpointOrigin === 'remote'
          ? 'Connected on the public address'
          : 'Connected on the local address';
    const [podcastCache, setPodcastCache] = useState<PodcastCacheState | null>(null);

    const refreshPodcastCache = useCallback(async () => {
        if (!serverConnection) {
            setPodcastCache(null);
            return;
        }
        try {
            setPodcastCache(await loadPodcastCacheState(serverConnection));
        } catch {
            // Leave the last known state; a transient error shouldn't blank the UI.
        }
    }, [serverConnection]);

    useEffect(() => {
        void refreshPodcastCache();
    }, [refreshPodcastCache]);

    // Optimistic cycle: update locally for instant feedback, persist, then
    // reconcile with the server's authoritative value (success or failure).
    const handleCyclePodcastPrewarm = () => {
        if (!serverConnection || !podcastCache) return;
        const next = nextPreset(PODCAST_PREWARM_PRESETS, podcastCache.prewarmCount);
        setPodcastCache({ ...podcastCache, prewarmCount: next });
        void updatePodcastPrewarmCount(serverConnection, next).finally(refreshPodcastCache);
    };

    const handleCyclePodcastCacheLimit = () => {
        if (!serverConnection || !podcastCache) return;
        const next = nextPreset(PODCAST_CACHE_PRESETS_BYTES, podcastCache.maxBytes);
        setPodcastCache({ ...podcastCache, maxBytes: next });
        void updatePodcastCacheLimit(serverConnection, next).finally(refreshPodcastCache);
    };

    const handleClearPodcastCache = () => {
        if (!serverConnection) return;
        void clearAllPodcastCache(serverConnection).finally(refreshPodcastCache);
    };

    const catalogStateById = new Map(catalogStates.map((state) => [state.sourceId, state]));
    const handleSyncPress = async () => {
        if (syncStatus.kind === 'running') return;
        setSyncStatus({ kind: 'running' });
        const result = await onSyncWithServer();
        setSyncStatus(
            result.ok
                ? { kind: 'success' }
                : { kind: 'error', message: result.message ?? 'Sync failed' },
        );
    };

    return (
        <View style={styles.settingsRoot}>
            <Text style={styles.settingsRootTitle}>Settings</Text>
            <Pressable
                accessibilityRole="button"
                onPress={onOpenManageServers}
                style={styles.settingsRow}
            >
                <PersonGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>
                        {serverCount === 1 ? 'Manage Server' : 'Manage Servers'}
                    </Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {serverCount === 0
                            ? 'Connect a samo server or radio source'
                            : `${serverCount} connected`}
                    </Text>
                </View>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                disabled={syncStatus.kind === 'running' || serverCount === 0}
                onPress={() => void handleSyncPress()}
                style={styles.settingsRow}
            >
                {syncStatus.kind === 'running' ? (
                    <ActivityIndicator color={colors.text} size="small" />
                ) : (
                    <RadioWaveGlyph color={colors.text} />
                )}
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Sync with Server</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {syncStatus.kind === 'running'
                            ? 'Refreshing libraries and pushing pending progress…'
                            : syncStatus.kind === 'success'
                              ? 'Up to date'
                              : syncStatus.kind === 'error'
                                ? syncStatus.message
                                : 'Refresh libraries and reconcile playback progress'}
                    </Text>
                </View>
            </Pressable>
            {catalogSources.length > 0 ? (
                <>
                    <Text style={styles.settingsSectionLabel}>Local library</Text>
                    {catalogSources.map((source) => {
                        const state = catalogStateById.get(source.id);
                        return (
                            <View key={source.id} style={styles.settingsRow}>
                                <CatalogSyncIcon state={state} />
                                <View style={styles.settingsRowText}>
                                    <Text style={styles.settingsRowTitle}>{source.title}</Text>
                                    <CatalogSyncProgress state={state} />
                                </View>
                            </View>
                        );
                    })}
                </>
            ) : null}
            <Text style={styles.settingsSectionLabel}>Cover art cache</Text>
            <Pressable
                accessibilityRole="button"
                onPress={handleCycleArtworkCacheLimit}
                style={styles.settingsRow}
            >
                <DiscGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Cache size limit</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {artworkCacheSize === null
                            ? `Up to ${formatGbLimit(artworkCacheLimitBytes)} · tap to change`
                            : `${formatBytes(artworkCacheSize)} of ${formatGbLimit(
                                  artworkCacheLimitBytes,
                              )} used · tap to change`}
                    </Text>
                </View>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                disabled={!artworkCacheSize}
                onPress={handleClearArtworkCache}
                style={styles.settingsRow}
            >
                <ClearGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Clear cover art cache</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {artworkCacheSize
                            ? `Free up ${formatBytes(artworkCacheSize)}`
                            : 'Cache is empty'}
                    </Text>
                </View>
            </Pressable>
            {serverConnection && podcastCache ? (
                <>
                    <Text style={styles.settingsSectionLabel}>Podcast cache</Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={handleCyclePodcastPrewarm}
                        style={styles.settingsRow}
                    >
                        <RadioWaveGlyph color={colors.text} />
                        <View style={styles.settingsRowText}>
                            <Text style={styles.settingsRowTitle}>Keep newest episodes ready</Text>
                            <Text style={styles.settingsRowSubtitle}>
                                {podcastCache.prewarmCount === 0
                                    ? 'Off · tap to change'
                                    : `${podcastCache.prewarmCount} newest per show · tap to change`}
                            </Text>
                        </View>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        onPress={handleCyclePodcastCacheLimit}
                        style={styles.settingsRow}
                    >
                        <DiscGlyph color={colors.text} />
                        <View style={styles.settingsRowText}>
                            <Text style={styles.settingsRowTitle}>Cache size limit</Text>
                            <Text style={styles.settingsRowSubtitle}>
                                {`${formatBytes(podcastCache.totalBytes)} of ${formatGbLimit(
                                    podcastCache.maxBytes,
                                )} · ${formatCount(podcastCache.episodeCount, 'episode')} · tap to change`}
                            </Text>
                        </View>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        disabled={podcastCache.episodeCount === 0}
                        onPress={handleClearPodcastCache}
                        style={styles.settingsRow}
                    >
                        <ClearGlyph color={colors.text} />
                        <View style={styles.settingsRowText}>
                            <Text style={styles.settingsRowTitle}>Clear podcast cache</Text>
                            <Text style={styles.settingsRowSubtitle}>
                                {podcastCache.episodeCount
                                    ? `Free up ${formatBytes(podcastCache.totalBytes)}`
                                    : 'Cache is empty'}
                            </Text>
                        </View>
                    </Pressable>
                </>
            ) : null}
            <Pressable
                accessibilityRole="button"
                onPress={onOpenDownloads}
                style={styles.settingsRow}
            >
                <DownloadGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Downloads</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        Manage offline content
                    </Text>
                </View>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                onPress={onOpenNetwork}
                style={styles.settingsRow}
            >
                <RadioWaveGlyph color={isOffline ? colors.muted : colors.accent} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Network</Text>
                    <Text style={styles.settingsRowSubtitle}>{networkSubtitle}</Text>
                </View>
            </Pressable>
        </View>
    );
};

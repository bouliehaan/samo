import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Switch,
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
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

type SyncStatus =
    | { kind: 'error'; message: string }
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'success' };

/** A Samo source whose on-device mirror is surfaced in the Local library panel. */
export interface CatalogSourceSummary {
    id: string;
    title: string;
}

interface SettingsScreenProps {
    artworkCacheLimitBytes: number;
    catalogSources: CatalogSourceSummary[];
    isOfflineMode: boolean;
    onOpenDownloads: () => void;
    onOpenManageServers: () => void;
    onSetArtworkCacheLimit: (bytes: number) => void;
    onSyncWithServer: () => Promise<{ message?: string; ok: boolean }>;
    onToggleOfflineMode: (next: boolean) => void;
    serverCount: number;
}

const GIBIBYTE = 1024 * 1024 * 1024;
const ARTWORK_CACHE_PRESETS_BYTES = [1, 2, 5, 10, 20].map((gb) => gb * GIBIBYTE);

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

const describeCatalogState = (state: CatalogSyncState | undefined): string => {
    if (!state || state.status === 'idle') {
        return 'Not synced yet';
    }
    if (state.status === 'syncing') {
        return `Mirroring… ${formatCount(state.itemCount, 'item')}, ${formatCount(state.trackCount, 'track')}`;
    }
    if (state.status === 'error') {
        return state.error ?? 'Sync failed';
    }
    const counts = `${formatCount(state.itemCount, 'item')} · ${formatCount(state.trackCount, 'track')}`;
    return state.lastSyncedAt
        ? `${counts} · ${formatRelativeTime(state.lastSyncedAt)}`
        : counts;
};

export const SettingsScreen = ({
    artworkCacheLimitBytes,
    catalogSources,
    isOfflineMode,
    onOpenDownloads,
    onOpenManageServers,
    onSetArtworkCacheLimit,
    onSyncWithServer,
    onToggleOfflineMode,
    serverCount,
}: SettingsScreenProps) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'idle' });
    const [catalogStates, setCatalogStates] = useState<CatalogSyncState[]>([]);
    const [artworkCacheSize, setArtworkCacheSize] = useState<number | null>(null);

    useEffect(() => subscribeCatalogSyncState(setCatalogStates), []);

    const refreshArtworkCacheSize = useCallback(() => {
        void getArtworkCacheSizeBytes().then(setArtworkCacheSize);
    }, []);

    useEffect(() => {
        refreshArtworkCacheSize();
    }, [refreshArtworkCacheSize, artworkCacheLimitBytes]);

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
                            ? 'Connect a music server, Audiobookshelf, or radio source'
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
                                {state?.status === 'syncing' ? (
                                    <ActivityIndicator color={colors.text} size="small" />
                                ) : (
                                    <CheckGlyph
                                        color={
                                            state?.status === 'synced'
                                                ? colors.accent
                                                : colors.muted
                                        }
                                        size={16}
                                    />
                                )}
                                <View style={styles.settingsRowText}>
                                    <Text style={styles.settingsRowTitle}>{source.title}</Text>
                                    <Text style={styles.settingsRowSubtitle}>
                                        {describeCatalogState(state)}
                                    </Text>
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
            <View style={styles.settingsRow}>
                <CheckGlyph color={isOfflineMode ? colors.accent : colors.text} size={16} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Offline mode</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {isOfflineMode
                            ? 'Only downloaded items are shown'
                            : 'Show everything available'}
                    </Text>
                </View>
                <Switch
                    onValueChange={onToggleOfflineMode}
                    thumbColor={isOfflineMode ? colors.accent : '#ffffff'}
                    trackColor={{
                        false: 'rgba(255, 255, 255, 0.18)',
                        true: 'rgba(202, 160, 79, 0.45)',
                    }}
                    value={isOfflineMode}
                />
            </View>
        </View>
    );
};

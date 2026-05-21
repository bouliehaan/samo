import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Switch,
    Text,
    View,
} from 'react-native';

import {
    CheckGlyph,
    DownloadGlyph,
    PersonGlyph,
    RadioWaveGlyph,
} from '../components/Glyphs';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

type SyncStatus =
    | { kind: 'error'; message: string }
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'success' };

interface SettingsScreenProps {
    isOfflineMode: boolean;
    onOpenDownloads: () => void;
    onOpenManageServers: () => void;
    onSyncWithServer: () => Promise<{ message?: string; ok: boolean }>;
    onToggleOfflineMode: (next: boolean) => void;
    serverCount: number;
}

export const SettingsScreen = ({
    isOfflineMode,
    onOpenDownloads,
    onOpenManageServers,
    onSyncWithServer,
    onToggleOfflineMode,
    serverCount,
}: SettingsScreenProps) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'idle' });
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

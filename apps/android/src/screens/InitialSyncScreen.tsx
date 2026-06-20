import { type ServerAuthenticationResult } from '@samo/core/server';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from 'react-native';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { subscribeCatalogSyncState, type CatalogSyncState } from '../services/catalog/catalog-sync-state';
import { getMobileContentSource } from '@samo/core/mobile';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { CheckGlyph } from '../components/Glyphs';

interface InitialSyncScreenProps {
    onComplete: () => void;
    serverConnection: ServerAuthenticationResult | null;
}

export const InitialSyncScreen = ({
    onComplete,
    serverConnection,
}: InitialSyncScreenProps) => {
    const [syncState, setSyncState] = useState<CatalogSyncState | null>(null);

    // Keep the screen on while this sync screen is showing.
    useKeepAwake('samo-initial-sync');

    useEffect(() => {
        if (!serverConnection) return;
        
        return subscribeCatalogSyncState((states) => {
            const sourceId = getMobileContentSource(serverConnection).id;
            const current = states.find((s) => s.sourceId === sourceId);
            if (current) {
                setSyncState(current);
            }
        });
    }, [serverConnection]);

    const isDone = syncState?.status === 'synced' || syncState?.status === 'error';
    const hasProgress = syncState && (syncState.itemCount > 0 || syncState.trackCount > 0);

    // Live, specific detail beats a static "Syncing…": name what's actually
    // streaming in and let the counts tick up so the wait reads as motion.
    const syncDetailText = (() => {
        if (!syncState) {
            return 'Connecting to your server…';
        }
        if (syncState.trackCount > 0) {
            return `Syncing music — ${syncState.itemCount.toLocaleString()} albums · ${syncState.trackCount.toLocaleString()} tracks`;
        }
        if (syncState.itemCount > 0) {
            return `Building your library — ${syncState.itemCount.toLocaleString()} items`;
        }
        return 'Fetching your catalog…';
    })();

    const progressValue = useSharedValue(0);

    useEffect(() => {
        if (isDone) {
            progressValue.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
        } else if (hasProgress) {
            // Fake progress animation that approaches 90% while syncing
            progressValue.value = withTiming(0.9, { duration: 8000, easing: Easing.out(Easing.cubic) });
        }
    }, [isDone, hasProgress, progressValue]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressValue.value * 100}%`,
    }));

    return (
        <View style={[styles.section, { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
            <View style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 24,
                padding: 32,
                width: '100%',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
            }}>
                <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: isDone ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255,255,255,0.08)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 24,
                }}>
                    {isDone ? (
                        <CheckGlyph color="#2ed573" />
                    ) : (
                        <ActivityIndicator size="large" color={colors.accent} />
                    )}
                </View>

                <Text style={{
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: '800',
                    marginBottom: 8,
                    textAlign: 'center',
                }}>
                    {isDone ? 'Ready to Go!' : 'Setting up home page'}
                </Text>

                <Text style={{
                    color: colors.muted,
                    fontSize: 15,
                    lineHeight: 22,
                    textAlign: 'center',
                    marginBottom: 32,
                }}>
                    {isDone 
                        ? 'Your catalog has been synced successfully.' 
                        : 'We are downloading the initial catalog information to make the app fast and responsive.'}
                </Text>

                {!isDone && (
                    <View style={{ width: '100%', marginBottom: 32 }}>
                        <View style={{
                            height: 6,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 3,
                            overflow: 'hidden',
                            width: '100%',
                        }}>
                            <Reanimated.View style={[
                                { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
                                progressStyle
                            ]} />
                        </View>
                        <Text style={{
                            color: colors.muted,
                            fontSize: 13,
                            marginTop: 12,
                            textAlign: 'center',
                            fontWeight: '600',
                        }}>
                            {syncDetailText}
                        </Text>
                    </View>
                )}

                <Pressable
                    accessibilityRole="button"
                    disabled={!isDone && !hasProgress}
                    onPress={onComplete}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        {
                            width: '100%',
                            opacity: (!isDone && !hasProgress) ? 0.5 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                >
                    <Text style={styles.primaryButtonText}>
                        {isDone ? 'Take me home' : 'Skip and explore'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

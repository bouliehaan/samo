import { type ServerAuthenticationResult } from '@samo/core/server';
import { useKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
import { SuccessSeal } from './onboarding/SuccessSeal';

interface InitialSyncScreenProps {
    onComplete: () => void;
    serverConnection: ServerAuthenticationResult | null;
}

// Mirror the onboarding flow: no manual escape, so never strand the user behind a
// sync that never reports a terminal state.
const SYNC_STRAND_GUARD_MS = 90_000;

export const InitialSyncScreen = ({
    onComplete,
    serverConnection,
}: InitialSyncScreenProps) => {
    const [syncState, setSyncState] = useState<CatalogSyncState | null>(null);
    const [stranded, setStranded] = useState(false);

    // Keep the screen on while this sync screen is showing.
    useKeepAwake('samo-initial-sync');

    const handleComplete = () => {
        deactivateKeepAwake('samo-initial-sync');
        onComplete();
    };

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
    const showSuccess = isDone || stranded;

    useEffect(() => {
        if (showSuccess) {
            return undefined;
        }
        const timer = setTimeout(() => setStranded(true), SYNC_STRAND_GUARD_MS);
        return () => clearTimeout(timer);
    }, [showSuccess]);

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
        if (hasProgress) {
            // Fake progress animation that approaches 90% while syncing
            progressValue.value = withTiming(0.9, { duration: 8000, easing: Easing.out(Easing.cubic) });
        }
    }, [hasProgress, progressValue]);

    // scaleX rather than a percentage width: this bar animates for a solid
    // eight seconds, and a percentage width re-runs Yoga against the parent on
    // every frame of it — ~480 layout passes on the exact screen where the JS
    // thread is already busy pulling the initial catalog down. See motion.ts
    // rule 1; the fill is full-width and anchored left in the style below.
    const progressStyle = useAnimatedStyle(() => ({
        transform: [{ scaleX: progressValue.value }],
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
                {showSuccess ? (
                    // The seal morphs in, says "Done", shimmers away, and carries
                    // the user into the app on its own — no button.
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                        <SuccessSeal onDone={handleComplete} />
                    </View>
                ) : (
                    <>
                        <View style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 24,
                        }}>
                            <ActivityIndicator size="large" color={colors.accent} />
                        </View>

                        <Text style={{
                            color: colors.text,
                            fontSize: 22,
                            fontWeight: '800',
                            marginBottom: 8,
                            textAlign: 'center',
                        }}>
                            Setting up home page
                        </Text>

                        <Text style={{
                            color: colors.muted,
                            fontSize: 15,
                            lineHeight: 22,
                            textAlign: 'center',
                            marginBottom: 32,
                        }}>
                            We are downloading the initial catalog information to make the app fast and responsive.
                        </Text>

                        <View style={{ width: '100%' }}>
                            <View style={{
                                height: 6,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderRadius: 3,
                                overflow: 'hidden',
                                width: '100%',
                            }}>
                                <Reanimated.View style={[
                                    {
                                        backgroundColor: colors.accent,
                                        borderRadius: 3,
                                        height: '100%',
                                        transformOrigin: 'left center',
                                        width: '100%',
                                    },
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
                    </>
                )}
            </View>
        </View>
    );
};

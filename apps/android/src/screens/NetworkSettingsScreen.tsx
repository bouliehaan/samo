import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { type ServerAuthenticationResult } from '@samo/core/server';

import { CheckGlyph, RadioWaveGlyph } from '../components/Glyphs';
import {
    readServerEndpointSettings,
    refreshActiveEndpoint,
    saveServerEndpointSettings,
} from '../services/endpoint-selection';
import { canReadWifiName, requestWifiNameAccess } from '../services/network-status';
import { type ServerEndpointProfile } from '../services/server-endpoints';
import {
    nextOfflinePreference,
    setOfflinePreference,
    useNetworkSelector,
    type OfflinePreference,
} from '../state/network-state';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { addDefaultHttpScheme } from '../utils/auth-url';

const OFFLINE_PREFERENCE_LABEL: Record<OfflinePreference, string> = {
    auto: 'Automatic',
    forced: 'Always on',
    never: 'Never',
};

const OFFLINE_PREFERENCE_DETAIL: Record<OfflinePreference, string> = {
    auto: 'Goes offline when your server can’t be reached, and back online when it can',
    forced: 'Stays offline — nothing is fetched over the network',
    never: 'Always uses the network, even when reachability checks fail',
};

/**
 * Where the server lives, and what to do when it can't be found.
 *
 * Two addresses, because one is never enough for a server that lives at home:
 * the LAN address is fast and free but only exists on your own network, and the
 * public one works everywhere but goes out over the internet even when the
 * server is in the next room. The app picks between them by probing both at
 * once and taking the preferred one that answers, so this screen never has to
 * be edited when you leave the house.
 *
 * The Wi-Fi name is optional and only makes that choice instant instead of
 * fast. It is the only thing here that costs a permission, which is why it
 * asks for one at the moment it is used and works fine without.
 */
export const NetworkSettingsScreen = ({
    onBack,
    serverConnection,
}: {
    onBack: () => void;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const isOffline = useNetworkSelector((state) => state.isOffline);
    const offlinePreference = useNetworkSelector((state) => state.offlinePreference);
    const activeEndpointOrigin = useNetworkSelector((state) => state.activeEndpointOrigin);
    const isDeviceOnline = useNetworkSelector((state) => state.isDeviceOnline);
    const transport = useNetworkSelector((state) => state.transport);
    const currentSsid = useNetworkSelector((state) => state.ssid);

    const [profile, setProfile] = useState<ServerEndpointProfile | null>(null);
    const [localDraft, setLocalDraft] = useState('');
    const [remoteDraft, setRemoteDraft] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [pinError, setPinError] = useState<null | string>(null);

    useEffect(() => {
        let active = true;
        if (!serverConnection) {
            setProfile({});
            return;
        }
        void readServerEndpointSettings(serverConnection).then((loaded) => {
            if (!active) {
                return;
            }
            setProfile(loaded);
            setLocalDraft(loaded.localUrl ?? '');
            setRemoteDraft(loaded.remoteUrl ?? '');
        });
        return () => {
            active = false;
        };
    }, [serverConnection]);

    const commit = useCallback(
        async (patch: Partial<ServerEndpointProfile>) => {
            if (!serverConnection) {
                return;
            }
            setIsChecking(true);
            try {
                setProfile(await saveServerEndpointSettings(serverConnection, patch));
            } finally {
                setIsChecking(false);
            }
        },
        [serverConnection],
    );

    // Committed on blur rather than per keystroke: every commit re-probes, and
    // re-probing halfway through someone typing an IP address is both useless
    // and noisy.
    const commitAddress = (field: 'localUrl' | 'remoteUrl', draft: string) => {
        const trimmed = draft.trim();
        const normalized = trimmed ? addDefaultHttpScheme(trimmed) : '';
        if (field === 'localUrl') {
            setLocalDraft(normalized);
        } else {
            setRemoteDraft(normalized);
        }
        if ((profile?.[field] ?? '') === normalized) {
            return;
        }
        void commit({ [field]: normalized });
    };

    const handlePinWifi = async () => {
        if (!serverConnection) {
            return;
        }
        if (profile?.homeSsid) {
            setPinError(null);
            void commit({ homeSsid: '' });
            return;
        }
        const ssid = await requestWifiNameAccess();
        if (ssid) {
            setPinError(null);
            void commit({ homeSsid: ssid });
            return;
        }
        // A tap that quietly does nothing is the worst outcome here: the user
        // cannot tell a declined permission from a broken button. Say which.
        setPinError(
            (await canReadWifiName())
                ? 'Android didn’t share this network’s name. Both addresses will be checked instead.'
                : 'Location access is off, so the Wi-Fi name can’t be read.',
        );
    };

    const statusLabel = (() => {
        if (!isDeviceOnline) {
            return 'No network';
        }
        if (offlinePreference === 'forced') {
            return 'Offline mode is on';
        }
        if (isOffline) {
            return 'Server unreachable';
        }
        return activeEndpointOrigin === 'remote'
            ? 'Connected on the public address'
            : 'Connected on the local address';
    })();

    const wifiLabel = (() => {
        if (profile?.homeSsid) {
            return `Home Wi-Fi: ${profile.homeSsid} · tap to clear`;
        }
        if (pinError) {
            return pinError;
        }
        if (transport !== 'wifi') {
            return 'Join your home Wi-Fi, then tap to pin it';
        }
        return currentSsid
            ? `Tap to pin “${currentSsid}” as home`
            : 'Tap to pin this Wi-Fi as home';
    })();

    return (
        <View style={styles.settingsRoot}>
            <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={[styles.secondaryButton, { alignSelf: 'flex-start' }]}
            >
                <Text style={styles.secondaryButtonText}>Back to Settings</Text>
            </Pressable>
            <Text style={[styles.settingsRootTitle, { marginTop: 24 }]}>Network</Text>

            <View style={styles.settingsRow}>
                {isChecking ? (
                    <ActivityIndicator color={colors.text} size="small" />
                ) : (
                    <View
                        style={[
                            styles.settingsStatusDot,
                            { backgroundColor: isOffline ? colors.muted : colors.accent },
                        ]}
                    />
                )}
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>{statusLabel}</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {serverConnection?.url ?? 'No server connected'}
                    </Text>
                </View>
                <Pressable
                    accessibilityLabel="Check connection now"
                    accessibilityRole="button"
                    disabled={isChecking}
                    onPress={() => {
                        setIsChecking(true);
                        void refreshActiveEndpoint({ force: true }).finally(() =>
                            setIsChecking(false),
                        );
                    }}
                >
                    <RadioWaveGlyph color={colors.text} />
                </Pressable>
            </View>

            <Text style={styles.settingsSectionLabel}>Server addresses</Text>
            <View style={styles.settingsFieldRow}>
                <Text style={styles.settingsFieldLabel}>Local address</Text>
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={Boolean(serverConnection)}
                    inputMode="url"
                    onBlur={() => commitAddress('localUrl', localDraft)}
                    onChangeText={setLocalDraft}
                    placeholder="http://192.168.1.5:4000"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    style={styles.settingsFieldInput}
                    value={localDraft}
                />
            </View>
            <View style={styles.settingsFieldRow}>
                <Text style={styles.settingsFieldLabel}>Public address</Text>
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={Boolean(serverConnection)}
                    inputMode="url"
                    onBlur={() => commitAddress('remoteUrl', remoteDraft)}
                    onChangeText={setRemoteDraft}
                    placeholder="https://music.example.com"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    style={styles.settingsFieldInput}
                    value={remoteDraft}
                />
            </View>
            <Text style={styles.settingsHelpText}>
                Both are tried at once and the first that answers wins, so the local
                address is used at home and the public one everywhere else. One is
                enough — leave the other blank if you don’t have it.
            </Text>

            <Pressable
                accessibilityRole="button"
                disabled={!serverConnection}
                onPress={() => void handlePinWifi()}
                style={styles.settingsRow}
            >
                <CheckGlyph
                    color={profile?.homeSsid ? colors.accent : colors.text}
                    size={16}
                />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Home Wi-Fi</Text>
                    <Text style={styles.settingsRowSubtitle}>{wifiLabel}</Text>
                </View>
            </Pressable>
            <Text style={styles.settingsHelpText}>
                Optional. Pinning your home network skips the check entirely and goes
                straight to the local address. Android only reveals Wi-Fi names to apps
                with location access, so this asks for it — decline and everything still
                works, just a moment slower off your home network.
            </Text>

            <Text style={styles.settingsSectionLabel}>Offline mode</Text>
            <Pressable
                accessibilityRole="button"
                onPress={() => setOfflinePreference(nextOfflinePreference(offlinePreference))}
                style={styles.settingsRow}
            >
                <CheckGlyph
                    color={offlinePreference === 'auto' ? colors.text : colors.accent}
                    size={16}
                />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>
                        {OFFLINE_PREFERENCE_LABEL[offlinePreference]} · tap to change
                    </Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {OFFLINE_PREFERENCE_DETAIL[offlinePreference]}
                    </Text>
                </View>
            </Pressable>
            <Text style={styles.settingsHelpText}>
                Offline keeps your whole library browsable from this device’s copy of
                the catalogue — downloads move to the top of Home, and anything you
                haven’t downloaded stays visible but won’t play.
            </Text>
        </View>
    );
};

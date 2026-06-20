import { getMobileContentSource } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { useKeepAwake } from 'expo-keep-awake';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { CheckGlyph, EyeGlyph } from '../../components/Glyphs';
import { useServerDiscovery, type DiscoveredServer } from '../../hooks/use-server-discovery';
import {
    subscribeCatalogSyncState,
    type CatalogSyncState,
} from '../../services/catalog/catalog-sync-state';
import { type AndroidAuthState } from '../../services/server-auth';
import { colors, radii, spacing } from '../../theme/tokens';
import { ScanPulse } from './ScanPulse';
import { WaveDotsField } from './WaveDotsField';

type OnboardingStep = 'welcome' | 'discover' | 'connect' | 'syncing';

export interface OnboardingFlowProps {
    authState: AndroidAuthState;
    canConnect: boolean;
    onConnect: () => void;
    onFinish: () => void;
    password: string;
    serverConnection: ServerAuthenticationResult | null;
    serverUrl: string;
    setAuthState: (value: AndroidAuthState) => void;
    setPassword: (value: string) => void;
    setServerUrl: (value: string) => void;
    setUsername: (value: string) => void;
    username: string;
}

export const OnboardingFlow = (props: OnboardingFlowProps) => {
    const {
        authState,
        canConnect,
        onConnect,
        onFinish,
        password,
        serverConnection,
        serverUrl,
        setAuthState,
        setPassword,
        setServerUrl,
        setUsername,
        username,
    } = props;

    // Hold the screen on for the whole first-run flow — the initial catalog sync
    // can run for a while and a screen-off mid-sync looks like a hang (and on
    // some devices throttles the JS thread). Released when onboarding unmounts.
    useKeepAwake('samo-onboarding');

    const { width, height } = useWindowDimensions();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    // Name of a server picked from discovery (locks the URL field on connect).
    const [pickedServerName, setPickedServerName] = useState<string | null>(null);

    const goTo = useCallback(
        (next: OnboardingStep) => {
            setAuthState({ status: 'idle' });
            setStep(next);
        },
        [setAuthState],
    );

    // Connect succeeded → glide into the sync celebration.
    useEffect(() => {
        if (step === 'connect' && authState.status === 'connected') {
            setStep('syncing');
        }
    }, [authState.status, step]);

    // Trap hardware back inside the flow: step back rather than dumping the user
    // onto a half-set-up app (or exiting from the middle of setup).
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (step === 'connect') {
                goTo('discover');
                return true;
            }
            if (step === 'discover') {
                goTo('welcome');
                return true;
            }
            if (step === 'syncing') {
                // Mid-sync: don't let back strand a connected-but-unsynced app.
                return true;
            }
            // Welcome: allow the default (exit app).
            return false;
        });
        return () => sub.remove();
    }, [goTo, step]);

    const handlePickDiscovered = useCallback(
        (server: DiscoveredServer) => {
            setServerUrl(server.Address);
            setPickedServerName(server.Name);
            goTo('connect');
        },
        [goTo, setServerUrl],
    );

    const handleManualEntry = useCallback(() => {
        setServerUrl('');
        setPickedServerName(null);
        goTo('connect');
    }, [goTo, setServerUrl]);

    return (
        <View style={{ backgroundColor: colors.background, flex: 1 }}>
            <WaveDotsField
                focusY={step === 'welcome' ? 0.4 : 0.22}
                height={height}
                intensity={step === 'welcome' ? 1 : 0.5}
                width={width}
            />
            <LinearGradient
                colors={['rgba(15,15,18,0)', 'rgba(15,15,18,0.75)', 'rgba(15,15,18,0.98)']}
                pointerEvents="none"
                style={{ bottom: 0, height: height * 0.55, left: 0, position: 'absolute', right: 0 }}
            />

            {step === 'welcome' ? (
                <WelcomeStep key="welcome" onStart={() => goTo('discover')} />
            ) : step === 'discover' ? (
                <DiscoverStep
                    key="discover"
                    onBack={() => goTo('welcome')}
                    onManual={handleManualEntry}
                    onPick={handlePickDiscovered}
                />
            ) : step === 'connect' ? (
                <ConnectStep
                    key="connect"
                    authState={authState}
                    canConnect={canConnect}
                    onBack={() => goTo('discover')}
                    onConnect={onConnect}
                    password={password}
                    pickedServerName={pickedServerName}
                    serverUrl={serverUrl}
                    setPassword={setPassword}
                    setServerUrl={setServerUrl}
                    setUsername={setUsername}
                    username={username}
                />
            ) : (
                <SyncingStep
                    key="syncing"
                    onFinish={onFinish}
                    serverConnection={serverConnection}
                />
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const StepShell = ({ children }: { children: ReactNode }) => (
    <Reanimated.View
        entering={FadeIn.duration(320)}
        exiting={FadeOut.duration(160)}
        style={{ flex: 1 }}
    >
        <ScrollView
            contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: 48,
                paddingHorizontal: 28,
                paddingTop: 72,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    </Reanimated.View>
);

const GoldButton = ({
    label,
    loading = false,
    disabled = false,
    onPress,
}: {
    label: string;
    loading?: boolean;
    disabled?: boolean;
    onPress: () => void;
}) => (
    <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => ({
            alignItems: 'center',
            // Solid worn-gold — no gradient/bevel (those read cheap). A hairline
            // top highlight gives it just enough of a minted, tactile edge.
            backgroundColor: disabled ? 'rgba(212,192,138,0.28)' : pressed ? '#c9b27a' : colors.accent,
            borderRadius: 16,
            borderTopColor: 'rgba(255,255,255,0.35)',
            borderTopWidth: disabled ? 0 : 1,
            justifyContent: 'center',
            paddingVertical: 18,
            transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        })}
    >
        {loading ? (
            <ActivityIndicator color="#1f1809" />
        ) : (
            <Text
                style={{
                    color: disabled ? 'rgba(31,24,9,0.5)' : '#1f1809',
                    fontSize: 17,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                }}
            >
                {label}
            </Text>
        )}
    </Pressable>
);

const GhostButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
            alignItems: 'center',
            opacity: pressed ? 0.6 : 1,
            paddingVertical: 14,
        })}
    >
        <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
);

const onboardInputStyle = {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
} as const;

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------

const WelcomeStep = ({ onStart }: { onStart: () => void }) => (
    <StepShell>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Reanimated.View entering={FadeInDown.delay(120).duration(700)}>
                <Text
                    style={{
                        color: colors.accent,
                        fontSize: 13,
                        fontWeight: '800',
                        letterSpacing: 3,
                        marginBottom: 18,
                        textTransform: 'uppercase',
                    }}
                >
                    Welcome to
                </Text>
                <Text
                    style={{
                        color: colors.text,
                        fontFamily: 'YoungSerif-Bold',
                        fontSize: 64,
                        letterSpacing: -1,
                        lineHeight: 66,
                    }}
                >
                    Samo
                </Text>
                <Text
                    style={{
                        color: colors.muted,
                        fontSize: 18,
                        lineHeight: 27,
                        marginTop: 18,
                        maxWidth: 320,
                    }}
                >
                    Your music, audiobooks, and podcasts — streaming straight from
                    your own server. Let&apos;s get you connected.
                </Text>
            </Reanimated.View>
            <Reanimated.View entering={FadeInDown.delay(360).duration(700)} style={{ marginTop: 40 }}>
                <GoldButton label="Get Started" onPress={onStart} />
            </Reanimated.View>
        </View>
    </StepShell>
);

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

const DiscoverStep = ({
    onBack,
    onManual,
    onPick,
}: {
    onBack: () => void;
    onManual: () => void;
    onPick: (server: DiscoveredServer) => void;
}) => {
    const { discoveredServers, isDiscovering, rescan } = useServerDiscovery();
    const hasResults = discoveredServers.length > 0;

    return (
        <StepShell>
            <BackLink onPress={onBack} />
            <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 8 }}>
                <ScanPulse active={!hasResults} />
            </View>
            <Text style={headingStyle}>
                {hasResults ? 'Found your server' : 'Looking for your server'}
            </Text>
            <Text style={subheadingStyle}>
                {hasResults
                    ? 'Tap a server below to connect, or enter an address by hand.'
                    : 'Make sure this device is on the same Wi‑Fi network as your Samo server.'}
            </Text>

            <View style={{ gap: 12, marginTop: 28 }}>
                {discoveredServers.map((server, index) => (
                    <Reanimated.View
                        entering={FadeInDown.delay(index * 80).duration(420)}
                        key={server.Address}
                    >
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => onPick(server)}
                            style={({ pressed }) => ({
                                alignItems: 'center',
                                backgroundColor: pressed
                                    ? 'rgba(212,192,138,0.10)'
                                    : 'rgba(255,255,255,0.04)',
                                borderColor: pressed ? colors.accentLine : colors.border,
                                borderRadius: radii.lg,
                                borderWidth: 1,
                                flexDirection: 'row',
                                gap: 14,
                                padding: 18,
                            })}
                        >
                            <View
                                style={{
                                    alignItems: 'center',
                                    backgroundColor: colors.accentSoft,
                                    borderRadius: radii.sm,
                                    height: 44,
                                    justifyContent: 'center',
                                    width: 44,
                                }}
                            >
                                <ServerGlyph color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text
                                    numberOfLines={1}
                                    style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}
                                >
                                    {server.Name}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: colors.muted,
                                        fontFamily: 'OfficeCodePro-Regular',
                                        fontSize: 13,
                                        marginTop: 3,
                                    }}
                                >
                                    {server.Address}
                                </Text>
                            </View>
                            <Text style={{ color: colors.accent, fontSize: 20, fontWeight: '900' }}>
                                ›
                            </Text>
                        </Pressable>
                    </Reanimated.View>
                ))}

                {!hasResults ? (
                    <View
                        style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            gap: 10,
                            justifyContent: 'center',
                            paddingVertical: 8,
                        }}
                    >
                        {isDiscovering ? <ActivityIndicator color={colors.muted} /> : null}
                        <Text style={{ color: colors.faint, fontSize: 14, fontWeight: '600' }}>
                            {isDiscovering ? 'Scanning your network…' : 'No servers found yet'}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={{ marginTop: 32 }}>
                <Pressable
                    accessibilityRole="button"
                    onPress={onManual}
                    style={({ pressed }) => ({
                        alignItems: 'center',
                        backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                        borderRadius: radii.md,
                        paddingVertical: 17,
                    })}
                >
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                        Enter address manually
                    </Text>
                </Pressable>
                <GhostButton label="Scan again" onPress={rescan} />
            </View>
        </StepShell>
    );
};

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

const ConnectStep = ({
    authState,
    canConnect,
    onBack,
    onConnect,
    password,
    pickedServerName,
    serverUrl,
    setPassword,
    setServerUrl,
    setUsername,
    username,
}: {
    authState: AndroidAuthState;
    canConnect: boolean;
    onBack: () => void;
    onConnect: () => void;
    password: string;
    pickedServerName: string | null;
    serverUrl: string;
    setPassword: (value: string) => void;
    setServerUrl: (value: string) => void;
    setUsername: (value: string) => void;
    username: string;
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isLoading = authState.status === 'loading';

    return (
        <StepShell>
            <BackLink onPress={onBack} />
            <Text style={headingStyle}>Sign in</Text>
            <Text style={subheadingStyle}>
                {pickedServerName
                    ? `Enter your credentials for ${pickedServerName}.`
                    : 'Enter your server address and credentials.'}
            </Text>

            {pickedServerName ? (
                <View
                    style={{
                        alignItems: 'center',
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accentLine,
                        borderRadius: radii.md,
                        borderWidth: 1,
                        flexDirection: 'row',
                        gap: 12,
                        marginTop: 24,
                        padding: 16,
                    }}
                >
                    <ServerGlyph color={colors.accent} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                            {pickedServerName}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={{
                                color: colors.muted,
                                fontFamily: 'OfficeCodePro-Regular',
                                fontSize: 12,
                                marginTop: 2,
                            }}
                        >
                            {serverUrl}
                        </Text>
                    </View>
                </View>
            ) : null}

            <View style={{ gap: 14, marginTop: 24 }}>
                {pickedServerName ? null : (
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        inputMode="url"
                        onChangeText={setServerUrl}
                        placeholder="Server address (e.g. 192.168.1.5:6969)"
                        placeholderTextColor={colors.faint}
                        style={onboardInputStyle}
                        value={serverUrl}
                    />
                )}
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor={colors.faint}
                    style={onboardInputStyle}
                    value={username}
                />
                <View style={{ justifyContent: 'center' }}>
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setPassword}
                        onSubmitEditing={() => canConnect && !isLoading && onConnect()}
                        placeholder="Password"
                        placeholderTextColor={colors.faint}
                        secureTextEntry={!showPassword}
                        style={[onboardInputStyle, { paddingRight: 56 }]}
                        value={password}
                    />
                    <Pressable
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        accessibilityRole="button"
                        onPress={() => setShowPassword((v) => !v)}
                        style={{
                            bottom: 0,
                            justifyContent: 'center',
                            paddingHorizontal: 18,
                            position: 'absolute',
                            right: 0,
                            top: 0,
                        }}
                    >
                        <EyeGlyph closed={!showPassword} color={colors.muted} />
                    </Pressable>
                </View>
            </View>

            {authState.status === 'error' ? (
                <View
                    style={{
                        backgroundColor: 'rgba(255,107,107,0.10)',
                        borderColor: 'rgba(255,107,107,0.30)',
                        borderRadius: radii.sm,
                        borderWidth: 1,
                        marginTop: 18,
                        padding: 14,
                    }}
                >
                    <Text
                        style={{
                            color: '#ff8484',
                            fontSize: 14,
                            fontWeight: '600',
                            textAlign: 'center',
                        }}
                    >
                        {authState.message}
                    </Text>
                </View>
            ) : null}

            {isLoading && authState.status === 'loading' && authState.message ? (
                <Text
                    style={{
                        color: colors.muted,
                        fontSize: 13,
                        marginTop: 14,
                        textAlign: 'center',
                    }}
                >
                    {authState.message}
                </Text>
            ) : null}

            <View style={{ marginTop: 24 }}>
                <GoldButton
                    disabled={!canConnect}
                    label="Connect"
                    loading={isLoading}
                    onPress={onConnect}
                />
            </View>
        </StepShell>
    );
};

// ---------------------------------------------------------------------------
// Syncing
// ---------------------------------------------------------------------------

const SyncingStep = ({
    onFinish,
    serverConnection,
}: {
    onFinish: () => void;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const [syncState, setSyncState] = useState<CatalogSyncState | null>(null);

    useEffect(() => {
        if (!serverConnection) {
            return;
        }
        const sourceId = getMobileContentSource(serverConnection).id;
        return subscribeCatalogSyncState((states) => {
            const current = states.find((s) => s.sourceId === sourceId);
            if (current) {
                setSyncState(current);
            }
        });
    }, [serverConnection]);

    const isError = syncState?.status === 'error';
    const isDone = syncState?.status === 'synced' || isError;
    const hasProgress = Boolean(
        syncState && (syncState.itemCount > 0 || syncState.trackCount > 0),
    );

    const heading = isError
        ? 'Connected'
        : isDone
          ? "You're all set"
          : 'Setting up your library';

    const detail = (() => {
        if (isError) {
            return 'Your library is still syncing in the background — feel free to explore.';
        }
        if (isDone) {
            return 'Everything is ready.';
        }
        if (!syncState) {
            return 'Connecting to your server…';
        }
        if (syncState.trackCount > 0) {
            return `${syncState.itemCount.toLocaleString()} albums · ${syncState.trackCount.toLocaleString()} tracks`;
        }
        if (syncState.itemCount > 0) {
            return `Building your library — ${syncState.itemCount.toLocaleString()} items`;
        }
        return 'Fetching your catalog…';
    })();

    return (
        <StepShell>
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                {isDone ? (
                    <Reanimated.View
                        entering={FadeIn.duration(400)}
                        style={{
                            alignItems: 'center',
                            backgroundColor: 'rgba(46,213,115,0.14)',
                            borderRadius: 48,
                            height: 96,
                            justifyContent: 'center',
                            marginBottom: 28,
                            width: 96,
                        }}
                    >
                        <CheckGlyph color="#2ed573" size={40} />
                    </Reanimated.View>
                ) : (
                    <View style={{ marginBottom: 28 }}>
                        <Breather />
                    </View>
                )}

                <Text style={[headingStyle, { textAlign: 'center' }]}>{heading}</Text>
                <Text style={[subheadingStyle, { textAlign: 'center' }]}>{detail}</Text>

                {!isDone ? <ProgressBar active={hasProgress} /> : null}
            </View>

            <View style={{ paddingBottom: 8 }}>
                <GoldButton
                    disabled={!isDone && !hasProgress}
                    label={isDone ? 'Enter Samo' : 'Skip for now'}
                    onPress={onFinish}
                />
            </View>
        </StepShell>
    );
};

const ProgressBar = ({ active }: { active: boolean }) => {
    const progress = useSharedValue(0.04);

    useEffect(() => {
        if (active) {
            progress.value = withTiming(0.92, {
                duration: 9000,
                easing: Easing.out(Easing.cubic),
            });
        }
    }, [active, progress]);

    const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

    return (
        <View
            style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderRadius: 3,
                height: 6,
                marginTop: 32,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <Reanimated.View
                style={[{ backgroundColor: colors.accent, borderRadius: 3, height: '100%' }, style]}
            />
        </View>
    );
};

// A gently breathing gold orb for the indeterminate sync state.
const Breather = () => {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.18, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            -1,
            true,
        );
    }, [scale]);

    const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <View style={{ alignItems: 'center', height: 96, justifyContent: 'center', width: 96 }}>
            <Reanimated.View
                style={[
                    {
                        backgroundColor: colors.accentSoft,
                        borderRadius: 48,
                        height: 96,
                        position: 'absolute',
                        width: 96,
                    },
                    style,
                ]}
            />
            <View
                style={{
                    backgroundColor: colors.accent,
                    borderRadius: 22,
                    height: 44,
                    width: 44,
                }}
            />
        </View>
    );
};

// ---------------------------------------------------------------------------
// Small shared UI
// ---------------------------------------------------------------------------

const BackLink = ({ onPress }: { onPress: () => void }) => (
    <Pressable
        accessibilityRole="button"
        hitSlop={12}
        onPress={onPress}
        style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginBottom: spacing.lg,
            opacity: pressed ? 0.5 : 1,
        })}
    >
        <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '700' }}>‹ Back</Text>
    </Pressable>
);

const ServerGlyph = ({ color }: { color: string }) => (
    <View style={{ alignItems: 'center', gap: 3, justifyContent: 'center' }}>
        <View
            style={{
                backgroundColor: 'transparent',
                borderColor: color,
                borderRadius: 4,
                borderWidth: 1.6,
                height: 9,
                width: 22,
            }}
        />
        <View
            style={{
                backgroundColor: 'transparent',
                borderColor: color,
                borderRadius: 4,
                borderWidth: 1.6,
                height: 9,
                width: 22,
            }}
        />
    </View>
);

const headingStyle = {
    color: colors.text,
    fontFamily: 'YoungSerif-Bold',
    fontSize: 30,
    letterSpacing: -0.5,
} as const;

const subheadingStyle = {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
} as const;

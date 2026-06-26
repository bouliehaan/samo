import { getMobileContentSource } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { useKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { DownCaretGlyph, EyeGlyph } from '../../components/Glyphs';
import { useServerDiscovery, type DiscoveredServer } from '../../hooks/use-server-discovery';
import {
    subscribeCatalogSyncState,
    type CatalogSyncState,
} from '../../services/catalog/catalog-sync-state';
import { triggerImpact } from '../../services/haptics';
import { type AndroidAuthState } from '../../services/server-auth';
import { colors, radii, spacing } from '../../theme/tokens';
import { Orb } from './Orb';
import { SuccessSeal } from './SuccessSeal';
import { WaveDotsField } from './WaveDotsField';

// If the catalog sync never emits a terminal event (a hard network hang during
// the very first sync), don't trap the user behind a button-less screen — let the
// seal play and carry them in anyway. Generous on purpose: a normal sync finishes
// in seconds and trips the real completion long before this.
const SYNC_STRAND_GUARD_MS = 90_000;

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

    const handleFinish = useCallback(() => {
        deactivateKeepAwake('samo-onboarding');
        onFinish();
    }, [onFinish]);

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
                    onFinish={handleFinish}
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

const PrimaryButton = ({
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
            // Clean warm-ivory solid — no gold slab, no gradient, no bevel. Reads
            // as a crisp premium CTA against the dark surfaces; the gold stays a
            // whisper elsewhere (accent text/lines), not a gaudy button fill.
            backgroundColor: disabled
                ? 'rgba(246,246,248,0.16)'
                : pressed
                  ? '#dcdce2'
                  : colors.text,
            borderRadius: 16,
            justifyContent: 'center',
            paddingVertical: 18,
            transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        })}
    >
        {loading ? (
            <ActivityIndicator color={colors.background} />
        ) : (
            <Text
                style={{
                    color: disabled ? 'rgba(15,15,18,0.45)' : colors.background,
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

// Distance (px) / fling velocity past which an upward swipe commits to the next
// step instead of springing back.
const WELCOME_SWIPE_THRESHOLD = -90;
const WELCOME_FLING_VELOCITY = -650;
// How far up the panel travels before it's fully gone (then we advance).
const EXIT_DISTANCE = 700;

// Rotating status lines for the library sync. Real progress lives in the live
// item/track counts below; these are the "it's actually doing something"
// personality so the long detail-crawl tail never sits frozen on one string.
const SYNC_MESSAGES = [
    'Combobulating the data…',
    'Sorting your albums…',
    'Polishing the cover art…',
    'Caching artist details…',
    'Untangling the genres…',
    'Reticulating splines…',
    'Lining up the deep cuts…',
    'Teaching the server your taste…',
    'Buffing the hi-hats…',
    'Tuning the airwaves…',
    'Almost there…',
];

const useRotatingMessage = (messages: string[], intervalMs: number, active: boolean) => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
        return () => clearInterval(id);
    }, [active, intervalMs, messages.length]);
    return messages[index % messages.length];
};

const WelcomeStep = ({ onStart }: { onStart: () => void }) => {
    // Guard so the swipe-up and the tap fallback can never both advance.
    const startedRef = useRef(false);
    const start = useCallback(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        onStart();
    }, [onStart]);

    const dragY = useSharedValue(0); // <= 0; tracks the upward drag
    const hintY = useSharedValue(0); // the gently bobbing chevron
    const passedThreshold = useSharedValue(false); // one-shot latch for the detent haptic

    useEffect(() => {
        hintY.value = withRepeat(
            withTiming(-12, { duration: 950, easing: Easing.inOut(Easing.quad) }),
            -1,
            true,
        );
    }, [hintY]);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            dragY.value = Math.min(0, event.translationY);
            // One soft detent tick the instant you've pulled far enough to
            // commit, so the threshold is something you feel.
            const past = event.translationY < WELCOME_SWIPE_THRESHOLD;
            if (past && !passedThreshold.value) {
                passedThreshold.value = true;
                runOnJS(triggerImpact)('light');
            } else if (!past && passedThreshold.value) {
                passedThreshold.value = false;
            }
        })
        .onEnd((event) => {
            passedThreshold.value = false;
            const commit =
                event.translationY < WELCOME_SWIPE_THRESHOLD ||
                event.velocityY < WELCOME_FLING_VELOCITY;
            if (commit) {
                runOnJS(triggerImpact)('medium');
                // Carry the fling velocity into the exit so the panel leaves
                // with real momentum instead of a fixed-duration slide.
                dragY.value = withSpring(
                    -EXIT_DISTANCE,
                    {
                        damping: 38,
                        overshootClamping: true,
                        stiffness: 210,
                        velocity: event.velocityY,
                    },
                    (finished) => {
                        if (finished) {
                            runOnJS(start)();
                        }
                    },
                );
            } else {
                // Spring back under its own momentum, not a linear snap.
                dragY.value = withSpring(0, {
                    damping: 16,
                    stiffness: 170,
                    velocity: event.velocityY,
                });
            }
        });

    // Tap fallback (also keeps the screen operable for assistive tech).
    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(triggerImpact)('medium');
        dragY.value = withSpring(
            -EXIT_DISTANCE,
            { damping: 42, overshootClamping: true, stiffness: 220 },
            (finished) => {
                if (finished) {
                    runOnJS(start)();
                }
            },
        );
    });

    const gesture = Gesture.Race(panGesture, tapGesture);

    const panelStyle = useAnimatedStyle(() => {
        const progress = Math.min(1, Math.max(0, -dragY.value / 360));
        return {
            opacity: 1 - progress * 0.85,
            transform: [{ translateY: dragY.value }],
        };
    });
    const hintStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: hintY.value }],
    }));

    return (
        <StepShell>
            <GestureDetector gesture={gesture}>
                <Reanimated.View style={[{ flex: 1, justifyContent: 'flex-end' }, panelStyle]}>
                    <Reanimated.View entering={FadeInDown.delay(120).duration(700)}>
                        <Text
                            style={{
                                color: colors.accent,
                                fontFamily: 'OfficeCodePro-Regular',
                                fontSize: 12,
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
                                fontFamily: 'OfficeCodePro-Regular',
                                fontSize: 15,
                                lineHeight: 24,
                                marginTop: 18,
                                maxWidth: 330,
                            }}
                        >
                            Your music, audiobooks, and podcasts — streaming straight from
                            your own server. Let&apos;s get you connected.
                        </Text>
                    </Reanimated.View>
                    <Reanimated.View
                        accessibilityHint="Swipe up to get started"
                        accessibilityRole="button"
                        entering={FadeInDown.delay(360).duration(700)}
                        style={{ alignItems: 'center', marginTop: 48, paddingVertical: 12 }}
                    >
                        <Reanimated.View style={[{ marginBottom: 12 }, hintStyle]}>
                            <View style={{ transform: [{ rotate: '180deg' }] }}>
                                <DownCaretGlyph color={colors.accent} />
                            </View>
                        </Reanimated.View>
                        <Text
                            style={{
                                color: colors.muted,
                                fontFamily: 'OfficeCodePro-Regular',
                                fontSize: 13,
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}
                        >
                            Swipe up to begin
                        </Text>
                    </Reanimated.View>
                </Reanimated.View>
            </GestureDetector>
        </StepShell>
    );
};

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
                <Orb active={!hasResults} size={152} />
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
                                    // Truncate the MIDDLE, not the tail: two
                                    // servers on a LAN differ by their last IP
                                    // octet / port at the END of the address, so
                                    // tail-ellipsis cut off exactly the part that
                                    // tells them apart and the buttons looked
                                    // identical. head…tail keeps the distinguisher.
                                    ellipsizeMode="middle"
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
                <PrimaryButton
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
    const [stranded, setStranded] = useState(false);

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
    // No manual escape any more, so guarantee we're never trapped on a sync that
    // never reports a terminal state.
    const showSuccess = isDone || stranded;
    const headline = useRotatingMessage(SYNC_MESSAGES, 2600, !showSuccess);

    useEffect(() => {
        if (showSuccess) {
            return undefined;
        }
        const timer = setTimeout(() => setStranded(true), SYNC_STRAND_GUARD_MS);
        return () => clearTimeout(timer);
    }, [showSuccess]);

    const detail = (() => {
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

    // On completion the seal takes over the whole stage: orb → check → "Done" →
    // shimmer away → onFinish (which drops the onboarding overlay onto a Home that
    // the post-sync re-derive has already filled in). No button — it carries the
    // user in on its own.
    if (showSuccess) {
        return (
            <StepShell>
                <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                    <SuccessSeal onDone={onFinish} />
                </View>
            </StepShell>
        );
    }

    return (
        <StepShell>
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                <View style={{ marginBottom: 32 }}>
                    <Orb size={180} />
                </View>

                <Reanimated.Text
                    entering={FadeIn.duration(420)}
                    exiting={FadeOut.duration(220)}
                    key={headline}
                    style={[headingStyle, { textAlign: 'center' }]}
                >
                    {headline}
                </Reanimated.Text>
                <Text style={[subheadingStyle, { textAlign: 'center' }]}>{detail}</Text>

                <ProgressBar active={hasProgress} />
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
    fontFamily: 'OfficeCodePro-Regular',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
} as const;

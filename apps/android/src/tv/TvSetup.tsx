import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { normalizeBaseUrl } from '@samo/core/server';

import { useServerDiscovery, type DiscoveredServer } from '../hooks/use-server-discovery';
import {
    cancelDevicePairing,
    retryDevicePairing,
    startDevicePairing,
} from '../services/device-pairing';
import { canConnectWith, connectServer, disconnectServer } from '../services/server-session';
import {
    getAuthSession,
    setPassword,
    setServerUrl,
    setUsername,
    useAuthSessionSelector,
} from '../state/auth-session';
import {
    getDevicePairing,
    useDevicePairingSelector,
    type DevicePairingFailure,
    type DevicePairingState,
} from '../state/device-pairing';
import { addDefaultHttpScheme, hasServerUrlTarget } from '../utils/auth-url';
import { TvButton, TvFocusScope, TvTextInput } from './TvControls';
import { type TvRunAction } from './TvBrowse';
import { TvQrCode } from './TvQrCode';
import { tvStyles as s } from './tv-styles';

type SignInStep = 'servers' | 'address' | 'password';
type ActivePairing = Exclude<DevicePairingState, { status: 'idle' }>;

/** Sign-in for a remote. Pick the server discovery found, then approve this TV
 *  from a phone or computer; typing an address or a password with a D-pad is
 *  there for when that cannot work, never the first thing asked. */
function TvSignIn({ run }: { run: TvRunAction }) {
    const pairing = useDevicePairingSelector((state) => state);
    const [step, setStep] = useState<SignInStep>('servers');
    // The pairing belongs to this screen: leaving it, for a session landing
    // or anything else, stops the polling.
    useEffect(() => cancelDevicePairing, []);
    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            if (getDevicePairing().status !== 'idle') {
                cancelDevicePairing();
                return true;
            }
            if (step !== 'servers') {
                setStep('servers');
                return true;
            }
            return false;
        });
        return () => subscription.remove();
    }, [step]);

    const switchToPassword = () => {
        cancelDevicePairing();
        setStep('password');
    };
    const switchToCode = () => {
        const { serverUrl } = getAuthSession();
        if (hasServerUrlTarget(serverUrl)) {
            void startDevicePairing(addDefaultHttpScheme(serverUrl));
        } else {
            setStep('servers');
        }
    };

    if (pairing.status !== 'idle') {
        return <TvPairingCode pairing={pairing} onPassword={switchToPassword} />;
    }
    if (step === 'password') {
        return <TvPasswordSignIn run={run} onCode={switchToCode} />;
    }
    if (step === 'address') {
        return <TvAddressEntry onPassword={() => setStep('password')} />;
    }
    return <TvServerChoice onAddress={() => setStep('address')} />;
}

const serverFocusId = (server: DiscoveredServer) => `server:${server.Address}`;

function TvServerChoice({ onAddress }: { onAddress: () => void }) {
    const { discoveredServers } = useServerDiscovery();
    // Why the last session ended (it expired, say), for a TV that was
    // signed in and is being asked to sign in again.
    const notice = useAuthSessionSelector((state) =>
        state.authState.status === 'error' ? state.authState.message : null,
    );
    const first = discoveredServers[0];
    return (
        <TvFocusScope defaultFocus={first ? serverFocusId(first) : 'enter-address'}>
            {notice ? <Text style={s.error}>{notice}</Text> : null}
            <Text style={s.sectionTitle}>
                {first ? 'Choose your server' : 'Looking for your samo server…'}
            </Text>
            {discoveredServers.map((server) => (
                <TvButton
                    key={server.Address}
                    id={serverFocusId(server)}
                    label={`Connect to ${server.Name} at ${server.Address}`}
                    onPress={() => {
                        setServerUrl(server.Address);
                        void startDevicePairing(server.Address);
                    }}
                >
                    {(focused) => (
                        <>
                            <Text style={[s.text, focused && s.buttonTextFocused]}>
                                {server.Name}
                            </Text>
                            <Text style={[s.muted, focused && s.buttonTextFocused]}>
                                {displayAddress(server.Address)}
                            </Text>
                        </>
                    )}
                </TvButton>
            ))}
            <Text style={s.muted}>
                {first
                    ? 'You’ll approve this TV from your phone or computer. No password to type.'
                    : 'Make sure this TV is on the same network as your server, or enter its address.'}
            </Text>
            <View style={s.row}>
                <TvButton id="enter-address" label="Enter an address" onPress={onAddress} />
            </View>
        </TvFocusScope>
    );
}

function TvAddressEntry({ onPassword }: { onPassword: () => void }) {
    const serverUrl = useAuthSessionSelector((state) => state.serverUrl);
    const canConnect = hasServerUrlTarget(serverUrl);
    const connect = () => {
        const url = addDefaultHttpScheme(serverUrl);
        setServerUrl(url);
        void startDevicePairing(url);
    };
    return (
        <TvFocusScope defaultFocus="server-url">
            <Text style={s.sectionTitle}>Your server’s address</Text>
            <TvTextInput
                id="server-url"
                label="For example 192.168.1.20:6969"
                value={serverUrl}
                onChangeText={setServerUrl}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={() => {
                    if (canConnect) connect();
                }}
            />
            <View style={s.row}>
                <TvButton
                    id="connect-code"
                    label="Connect with a code"
                    disabled={!canConnect}
                    onPress={connect}
                />
                <TvButton id="use-password" label="Sign in with a password" onPress={onPassword} />
            </View>
        </TvFocusScope>
    );
}

function TvPasswordSignIn({ run, onCode }: { run: TvRunAction; onCode: () => void }) {
    const serverUrl = useAuthSessionSelector((state) => state.serverUrl);
    const username = useAuthSessionSelector((state) => state.username);
    const password = useAuthSessionSelector((state) => state.password);
    const authState = useAuthSessionSelector((state) => state.authState);
    const busy = authState.status === 'loading';
    const canConnect = !busy && canConnectWith({ password, serverUrl, username });
    return (
        <TvFocusScope defaultFocus={hasServerUrlTarget(serverUrl) ? 'username' : 'server-url'}>
            <Text style={s.sectionTitle}>Sign in with a password</Text>
            <TvTextInput
                id="server-url"
                label="Server address"
                value={serverUrl}
                onChangeText={setServerUrl}
                keyboardType="url"
                editable={!busy}
                next="username"
            />
            <TvTextInput
                id="username"
                label="Username"
                value={username}
                onChangeText={setUsername}
                editable={!busy}
                next="password"
            />
            <TvTextInput
                id="password"
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={() => {
                    if (canConnect) run(connectServer);
                }}
            />
            {authState.status === 'error' || busy ? (
                <Text style={busy ? s.muted : s.error}>{authState.message}</Text>
            ) : null}
            <View style={s.row}>
                <TvButton
                    id="password-connect"
                    label={busy ? 'Connecting…' : 'Connect'}
                    disabled={!canConnect}
                    onPress={() => run(connectServer)}
                />
                <TvButton id="use-code" label="Use a code instead" onPress={onCode} />
            </View>
        </TvFocusScope>
    );
}

function TvPairingCode({
    pairing,
    onPassword,
}: {
    pairing: ActivePairing;
    onPassword: () => void;
}) {
    if (pairing.status === 'connecting') {
        return <Text style={s.text}>Approved. Opening your library…</Text>;
    }
    const failure = pairing.status === 'failed' ? pairing.reason : null;
    return (
        <TvFocusScope defaultFocus={failure ? 'pairing-next' : 'pairing-back'}>
            {pairing.status === 'requesting' ? (
                <Text style={s.muted}>
                    Getting a code from {displayAddress(pairing.serverUrl)}…
                </Text>
            ) : null}
            {pairing.status === 'waiting' ? (
                <View style={s.pairing}>
                    <TvQrCode value={pairing.request.verificationUrlComplete} maxSize={168} />
                    <View style={s.pairingCopy}>
                        <Text style={s.sectionTitle}>Approve this TV</Text>
                        <Text style={s.text}>
                            Scan with your phone’s camera, sign in if asked, and approve.
                        </Text>
                        <Text style={s.muted}>
                            Or open{' '}
                            <Text style={s.pairingUrl}>{pairing.request.verificationUrl}</Text> and
                            enter
                        </Text>
                        <Text style={s.pairingCode}>{pairing.request.userCode}</Text>
                        <Text style={pairing.unreachable ? s.error : s.muted}>
                            {pairing.unreachable
                                ? `Can’t reach ${displayAddress(pairing.serverUrl)}. Still trying…`
                                : 'Waiting for approval…'}
                        </Text>
                    </View>
                </View>
            ) : null}
            {pairing.status === 'failed' ? (
                <Text style={s.error}>{describeFailure(pairing.reason, pairing.serverUrl)}</Text>
            ) : null}
            <View style={s.row}>
                {failure === 'unsupported' ? (
                    <TvButton
                        id="pairing-next"
                        label="Sign in with a password"
                        onPress={onPassword}
                    />
                ) : failure ? (
                    <TvButton
                        id="pairing-next"
                        label={retryLabel(failure)}
                        onPress={retryDevicePairing}
                    />
                ) : null}
                <TvButton id="pairing-back" label="Back" onPress={cancelDevicePairing} />
                {failure === 'unsupported' ? null : (
                    <TvButton
                        id="pairing-password"
                        label="Use a password instead"
                        onPress={onPassword}
                    />
                )}
            </View>
        </TvFocusScope>
    );
}

/** An address as a person would say it: no scheme, no trailing slash. */
const displayAddress = (url: string) =>
    normalizeBaseUrl(url).replace(/^[a-z][a-z\d+\-.]*:\/\//i, '');

const retryLabel = (reason: DevicePairingFailure) =>
    reason === 'expired' || reason === 'declined' || reason === 'failed'
        ? 'Get a new code'
        : 'Try again';

const describeFailure = (reason: DevicePairingFailure, serverUrl: string): string => {
    const address = displayAddress(serverUrl);
    switch (reason) {
        case 'expired':
            return 'That code expired before it was approved.';
        case 'declined':
            return 'The code was declined.';
        case 'unreachable':
            return `Can’t reach ${address}. Check that the server is running and on this network.`;
        case 'not-set-up':
            return `${address} hasn’t finished setting up. Finish setup at ${normalizeBaseUrl(serverUrl)}/setup, then try again.`;
        case 'unsupported':
            return `${address} needs a newer samo server to approve TVs with a code. You can sign in with a password meanwhile.`;
        case 'busy':
            return 'Too many codes were requested just now. Wait a minute, then try again.';
        case 'failed':
            return 'Signing in didn’t finish. Get a new code to try again.';
    }
};

export function TvSetup({ run }: { run: TvRunAction }) {
    const bootResolved = useAuthSessionSelector((state) => state.bootResolved);
    return (
        <View style={s.setup}>
            <View style={s.setupIntro}>
                <Text style={s.brand}>samo</Text>
                <Text style={s.heading}>{'Your library,\non the big screen.'}</Text>
            </View>
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.setupContent}
                style={s.setupPanel}
            >
                {bootResolved ? (
                    <TvSignIn run={run} />
                ) : (
                    <Text style={s.muted}>Restoring your session…</Text>
                )}
            </ScrollView>
        </View>
    );
}

export function TvSettings({ run }: { run: TvRunAction }) {
    const connection = useAuthSessionSelector((state) => state.serverConnection);
    return (
        <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.heading}>Settings</Text>
            <Text style={s.text}>Connected to your samo server</Text>
            <Text style={s.muted}>
                Use the directional buttons to move, the center button to select, and Back to
                return. Playback continues when you leave a page.
            </Text>
            <View style={s.row}>
                <TvButton
                    id="sign-out"
                    label="Disconnect server"
                    onPress={() =>
                        run(async () => {
                            if (connection) await disconnectServer(connection);
                        })
                    }
                />
            </View>
        </ScrollView>
    );
}

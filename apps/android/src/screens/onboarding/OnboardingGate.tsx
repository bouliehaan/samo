import { memo } from 'react';
import { View } from 'react-native';

import { canConnectWith, connectServer } from '../../services/server-session';
import { setActiveUtilityScreen } from '../../state/app-navigation';
import {
    setAuthState,
    setOnboardingActive,
    setPassword,
    setServerUrl,
    setUsername,
    useAuthSessionSelector,
} from '../../state/auth-session';
import { styles } from '../../theme/styles';
import { OnboardingFlow } from './OnboardingFlow';
import { OnboardingSplash } from './OnboardingSplash';

const handleConnect = () => void connectServer();
const handleFinishOnboarding = () => {
    setOnboardingActive(false);
    setActiveUtilityScreen(null);
};

/**
 * First-run / no-server gate. Sits above every surface so the user can never
 * reach Home without a live, authenticated connection. Subscribes to the auth
 * store itself — login-form keystrokes re-render this gate, not App.
 */
export const OnboardingGate = memo(function OnboardingGate() {
    const bootResolved = useAuthSessionSelector((state) => state.bootResolved);
    const onboardingActive = useAuthSessionSelector((state) => state.onboardingActive);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const authState = useAuthSessionSelector((state) => state.authState);
    const serverUrl = useAuthSessionSelector((state) => state.serverUrl);
    const username = useAuthSessionSelector((state) => state.username);
    const password = useAuthSessionSelector((state) => state.password);

    if (!bootResolved) {
        return (
            <View style={styles.onboardingOverlay}>
                <OnboardingSplash />
            </View>
        );
    }

    if (!onboardingActive && serverConnection) {
        return null;
    }

    return (
        <View style={styles.onboardingOverlay}>
            <OnboardingFlow
                authState={authState}
                canConnect={canConnectWith({ password, serverUrl, username })}
                onConnect={handleConnect}
                onFinish={handleFinishOnboarding}
                password={password}
                serverConnection={serverConnection}
                serverUrl={serverUrl}
                setAuthState={setAuthState}
                setPassword={setPassword}
                setServerUrl={setServerUrl}
                setUsername={setUsername}
                username={username}
            />
        </View>
    );
});

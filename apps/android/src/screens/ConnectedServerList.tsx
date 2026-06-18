import {
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
} from '@samo/core/server';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import { type AndroidServerHealthMap } from '../services/server-health';
import { type AndroidAuthState } from '../services/server-auth';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { styles } from '../theme/styles';

interface ConnectedServerListProps {
    authState: AndroidAuthState;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    serverConnection: ServerAuthenticationResult | null;
    serverHealthByKey: AndroidServerHealthMap;
}

export const ConnectedServerList = ({
    authState,
    onDisconnect,
    serverConnection,
    serverHealthByKey,
}: ConnectedServerListProps) => {
    const hasMessage = authState.status === 'error' || authState.status === 'loading';

    if (!serverConnection) {
        return (
            <>
                {hasMessage ? (
                    <Text
                        style={authState.status === 'error' ? styles.errorText : styles.mutedText}
                    >
                        {authState.message}
                    </Text>
                ) : null}
                <Text style={styles.mutedText}>No server connected.</Text>
            </>
        );
    }

    return (
        <>
            {hasMessage ? (
                <Text style={authState.status === 'error' ? styles.errorText : styles.mutedText}>
                    {authState.message}
                </Text>
            ) : null}
            <View style={styles.connectedServers}>
                {[serverConnection].map((connection) => {
                    const connectionKey = getPersistedServerAuthKey(connection);
                    const healthStatus = serverHealthByKey[connectionKey];
                    const isHealthy = healthStatus?.status === ServerConnectionHealthStatus.HEALTHY;
                    const statusMessage = healthStatus?.message ?? 'Session saved.';

                    return (
                        <View key={connectionKey} style={styles.statusPanel}>
                            <Text style={styles.statusTitle}>{connection.title}</Text>
                            <Text
                                style={[
                                    styles.mutedText,
                                    healthStatus && !isHealthy && styles.warningText,
                                ]}
                            >
                                {statusMessage}
                            </Text>
                            <Text style={styles.mutedText}>{connection.url}</Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => onDisconnect(connection)}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>Disconnect</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>
        </>
    );
};

import { type ServerAuthenticationResult } from '@samo/core/server';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import { type AndroidAuthState } from '../services/server-auth';
import { type AndroidServerHealthMap } from '../services/server-health';
import { styles } from '../theme/styles';
import { ConnectedServerList } from './ConnectedServerList';

interface ManageServersScreenProps {
    authState: AndroidAuthState;
    onAddServer: () => void;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    serverConnection: ServerAuthenticationResult | null;
    serverHealthByKey: AndroidServerHealthMap;
}

export const ManageServersScreen = ({
    authState,
    onAddServer,
    onDisconnect,
    serverConnection,
    serverHealthByKey,
}: ManageServersScreenProps) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
                {serverConnection ? 'Manage Server' : 'Manage Servers'}
            </Text>
            <ConnectedServerList
                authState={authState}
                onDisconnect={onDisconnect}
                serverConnection={serverConnection}
                serverHealthByKey={serverHealthByKey}
            />
            <Pressable
                accessibilityRole="button"
                onPress={onAddServer}
                style={styles.primaryButton}
            >
                <Text style={styles.primaryButtonText}>Add Server</Text>
            </Pressable>
        </View>
    );
};

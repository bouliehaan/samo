import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';

import { EyeGlyph } from '../components/Glyphs';
import { useServerDiscovery } from '../hooks/use-server-discovery';
import { type AndroidAuthState } from '../services/server-auth';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

interface AddServerScreenProps {
    authState: AndroidAuthState;
    canConnect: boolean;
    hasServerConnection?: boolean;
    onBack: () => void;
    onConnect: () => void;
    onPasswordChange: (value: string) => void;
    onServerUrlBlur: () => void;
    onServerUrlChange: (value: string) => void;
    onUsernameChange: (value: string) => void;
    password: string;
    serverUrl: string;
    username: string;
}

export const AddServerScreen = ({
    authState,
    canConnect,
    hasServerConnection = true,
    onBack,
    onConnect,
    onPasswordChange,
    onServerUrlBlur,
    onServerUrlChange,
    onUsernameChange,
    password,
    serverUrl,
    username,
}: AddServerScreenProps) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const { discoveredServers, isDiscovering } = useServerDiscovery();

    return (
        <View style={[styles.section, { flex: 1, paddingTop: 40 }]}>
            {hasServerConnection && (
                <Pressable accessibilityRole="button" onPress={onBack} style={[styles.secondaryButton, { alignSelf: 'flex-start', marginBottom: 24 }]}>
                    <Text style={styles.secondaryButtonText}>Back to Servers</Text>
                </Pressable>
            )}
            <View style={{ marginBottom: 32 }}>
                <Text style={{
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: '900',
                    letterSpacing: -0.5,
                    marginBottom: 8,
                }}>
                    Connect a Server
                </Text>
                <Text style={{
                    color: colors.muted,
                    fontSize: 16,
                    lineHeight: 24,
                }}>
                    Discover local Samo servers or manually enter your server's credentials below.
                </Text>
            </View>

            {discoveredServers.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                    <Text style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: '800',
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        marginBottom: 16,
                    }}>
                        Local Servers Found
                    </Text>
                    {discoveredServers.map((server) => (
                        <Pressable
                            key={server.Address}
                            onPress={() => onServerUrlChange(server.Address)}
                            style={({ pressed }) => ({
                                backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                borderRadius: 16,
                                padding: 20,
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.08)',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            })}
                        >
                            <View>
                                <Text style={{
                                    color: colors.text,
                                    fontSize: 18,
                                    fontWeight: '800',
                                    marginBottom: 4,
                                }}>
                                    {server.Name}
                                </Text>
                                <Text style={{
                                    color: colors.muted,
                                    fontSize: 14,
                                    fontWeight: '500',
                                }}>
                                    {server.Address}
                                </Text>
                            </View>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Text style={{ color: colors.text, fontWeight: '900' }}>→</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={{ gap: 16 }}>
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputMode="url"
                    onBlur={onServerUrlBlur}
                    onChangeText={onServerUrlChange}
                    placeholder="Server URL (e.g. http://192.168.1.5:4000)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 14,
                        borderWidth: 1,
                        color: colors.text,
                        fontSize: 16,
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                    }}
                    value={serverUrl}
                />
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onUsernameChange}
                    placeholder="Username"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 14,
                        borderWidth: 1,
                        color: colors.text,
                        fontSize: 16,
                        paddingHorizontal: 20,
                        paddingVertical: 18,
                    }}
                    value={username}
                />
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={onPasswordChange}
                        placeholder="Password"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        secureTextEntry={!isPasswordVisible}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 14,
                            borderWidth: 1,
                            color: colors.text,
                            fontSize: 16,
                            paddingHorizontal: 20,
                            paddingVertical: 18,
                            paddingRight: 60,
                        }}
                        value={password}
                    />
                    <Pressable
                        accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                        accessibilityRole="button"
                        onPress={() => setIsPasswordVisible((current) => !current)}
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            paddingHorizontal: 20,
                        }}
                    >
                        <EyeGlyph closed={!isPasswordVisible} color="rgba(255,255,255,0.5)" />
                    </Pressable>
                </View>

                <Pressable
                    accessibilityRole="button"
                    disabled={!canConnect || authState.status === 'loading'}
                    onPress={onConnect}
                    style={({ pressed }) => [
                        {
                            backgroundColor: colors.accent,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 18,
                            marginTop: 16,
                            opacity: (!canConnect || authState.status === 'loading') ? 0.5 : (pressed ? 0.9 : 1),
                            transform: [{ scale: pressed && canConnect ? 0.98 : 1 }]
                        }
                    ]}
                >
                    {authState.status === 'loading' ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={{ color: colors.background, fontSize: 17, fontWeight: '800' }}>
                            Connect to Server
                        </Text>
                    )}
                </Pressable>

                {authState.status === 'error' && (
                    <View style={{
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderColor: 'rgba(255, 107, 107, 0.3)',
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 8,
                    }}>
                        <Text style={{ color: '#ff6b6b', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                            {authState.message}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

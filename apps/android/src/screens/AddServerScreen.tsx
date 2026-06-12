import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';

import { EyeGlyph } from '../components/Glyphs';
import { type AndroidAuthState } from '../services/server-auth';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

interface AddServerScreenProps {
    authState: AndroidAuthState;
    canConnect: boolean;
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

    return (
        <View style={styles.section}>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Back to Servers</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>Add Samo Server</Text>
            <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="url"
                onBlur={onServerUrlBlur}
                onChangeText={onServerUrlChange}
                placeholder="Server URL"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={serverUrl}
            />
            <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onUsernameChange}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={username}
            />
            <View style={styles.inputWithAction}>
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onPasswordChange}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!isPasswordVisible}
                    style={[styles.input, styles.inputWithActionField]}
                    value={password}
                />
                <Pressable
                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                    onPress={() => setIsPasswordVisible((current) => !current)}
                    style={styles.inputActionButton}
                >
                    <EyeGlyph closed={!isPasswordVisible} color={colors.muted} />
                </Pressable>
            </View>
            <Pressable
                accessibilityRole="button"
                disabled={!canConnect || authState.status === 'loading'}
                onPress={onConnect}
                style={[
                    styles.primaryButton,
                    (!canConnect || authState.status === 'loading') && styles.disabledButton,
                ]}
            >
                {authState.status === 'loading' ? (
                    <ActivityIndicator color={colors.background} />
                ) : (
                    <Text style={styles.primaryButtonText}>Connect</Text>
                )}
            </Pressable>
            {authState.status === 'error' || authState.status === 'loading' ? (
                <Text style={authState.status === 'error' ? styles.errorText : styles.mutedText}>
                    {authState.message}
                </Text>
            ) : null}
        </View>
    );
};

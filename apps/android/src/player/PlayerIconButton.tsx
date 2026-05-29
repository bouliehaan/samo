import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { styles } from '../theme/styles';

export const PlayerIconButton = ({
    accessibilityLabel,
    children,
    compact,
    onPress,
    primary,
    tint,
}: {
    accessibilityLabel: string;
    children: ReactNode;
    compact?: boolean;
    onPress: () => void;
    primary?: boolean;
    tint?: string;
}) => {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            onPress={onPress}
            style={[
                styles.playerControlButton,
                compact && styles.playerControlButtonCompact,
                primary && styles.playerControlButtonPrimary,
                primary && tint ? { backgroundColor: tint } : null,
            ]}
        >
            {children}
        </Pressable>
    );
};

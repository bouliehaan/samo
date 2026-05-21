import { type ReactNode } from 'react';
import { Pressable } from 'react-native';
import { styles } from '../theme/styles';

export const PlayerIconButton = ({
    accessibilityLabel,
    children,
    onPress,
    primary,
    tint,
}: {
    accessibilityLabel: string;
    children: ReactNode;
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
                primary && styles.playerControlButtonPrimary,
                primary && tint ? { backgroundColor: tint } : null,
            ]}
        >
            {children}
        </Pressable>
    );
};

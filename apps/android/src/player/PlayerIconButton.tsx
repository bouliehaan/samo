import { type ReactNode } from 'react';

import { PressableScale } from '../components/PressableScale';
import { presses } from '../theme/motion';
import { styles } from '../theme/styles';

/**
 * A player transport control that answers the finger.
 *
 * `chrome` because the transport sits on fixed furniture that never scrolls
 * under the thumb: there is no scroll for a touch to turn into, so the control
 * skips the scroll-safety window entirely and starts sinking on the very frame
 * the finger lands. Play/pause is the most-pressed control in the app, and it
 * is the one place where even a couple of frames of dead air reads as the app
 * being cheap.
 */
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
}) => (
    <PressableScale
        {...presses.control}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        chrome
        onPress={onPress}
        style={[
            styles.playerControlButton,
            compact && styles.playerControlButtonCompact,
            primary && styles.playerControlButtonPrimary,
            primary && tint ? { backgroundColor: tint } : null,
        ]}
    >
        {children}
    </PressableScale>
);

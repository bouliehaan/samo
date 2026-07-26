import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MotionSheet } from '../components/MotionSheet';
import { SwipeDismissSheet } from '../components/SwipeDismissSheet';
import { styles } from '../theme/styles';

const SLEEP_OPTIONS: { label: string; seconds: number; wide?: boolean }[] = [
    { label: '15m', seconds: 15 * 60 },
    { label: '30m', seconds: 30 * 60 },
    { label: '45m', seconds: 45 * 60 },
    { label: '1h', seconds: 60 * 60 },
    { label: '1h 30m', seconds: 90 * 60 },
    { label: '2h', seconds: 120 * 60 },
    { label: 'End of track', seconds: -1, wide: true },
];

/** The sleep-timer picker sheet. `secondsLeft` highlights the running option
 *  (-1 = "End of track" mode). */
export const SleepTimerSheet = memo(
    ({
        onClose,
        onSelect,
        secondsLeft,
        visible,
    }: {
        onClose: () => void;
        onSelect: (seconds: number) => void;
        secondsLeft: null | number;
        visible: boolean;
    }) => (
        <MotionSheet
            backdropStyle={styles.modalBackdrop}
            onRequestClose={onClose}
            variant="bottom"
            visible={visible}
        >
            <SwipeDismissSheet onDismiss={onClose} style={styles.actionSheet}>
                <View style={styles.actionSheetHandle} />
                <Text style={styles.actionSheetTitle}>Sleep Timer</Text>
                <View style={styles.sleepPillGrid}>
                    {SLEEP_OPTIONS.map((opt) => {
                        const isActive =
                            secondsLeft !== null &&
                            ((opt.seconds === -1 && secondsLeft === -1) ||
                                (opt.seconds !== -1 &&
                                    secondsLeft > 0 &&
                                    Math.abs(opt.seconds - secondsLeft) <= 1));
                        return (
                            <Pressable
                                key={opt.label}
                                onPress={() => {
                                    onSelect(opt.seconds);
                                    onClose();
                                }}
                                style={[
                                    styles.sleepPill,
                                    opt.wide ? styles.sleepPillWide : null,
                                    isActive ? styles.sleepPillActive : null,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.sleepPillText,
                                        isActive ? styles.sleepPillTextActive : null,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </SwipeDismissSheet>
        </MotionSheet>
    ),
);

SleepTimerSheet.displayName = 'SleepTimerSheet';

import { memo, type ReactNode, useEffect, useState } from 'react';
import { Freeze } from 'react-freeze';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { styles } from '../theme/styles';

const ENTER_MS = 170;
const EXIT_MS = 130;
/** Incoming scene rises this far as it fades in (and the outgoing sinks). */
const ENTER_RISE_PX = 6;
/** Slack after the exit dissolve before the scene freezes, so the rest timer
 *  never lands before the UI-thread animation reaches its last frame. */
const REST_SLACK_MS = 30;

/**
 * One tab scene layer: a GPU-cheap dissolve (opacity + a few px of rise) on tab
 * switches.
 *
 * Scenes mount once and then rest FROZEN (react-freeze) while hidden: React
 * suspends the subtree, so background tabs pay nothing on store updates, their
 * native views are hidden by Suspense, and all state survives — revisiting a
 * tab is an instant thaw, never a remount.
 *
 * Two rules guard old bugs:
 * - Resting is driven by a JS timeout cancelled on re-activation, never by an
 *   animation-completion callback. `runOnJS` lands on the JS queue
 *   asynchronously, so a completion callback can apply a stale "rest" AFTER
 *   the scene re-activated — blanking the visible tab.
 * - The wrapper holds pointerEvents:'none' whenever inactive: the outgoing
 *   scene stays visible through its brief fade-out, and an opacity-0
 *   ScrollView on Android lets taps fall through to its children (the
 *   historical "Home tap plays radio" bug).
 */
export const TabSceneContainer = memo(
    ({
        children,
        isActive,
        reducedMotion,
    }: {
        children: ReactNode;
        isActive: boolean;
        reducedMotion: boolean;
    }) => {
        const [resting, setResting] = useState(!isActive);
        const progress = useSharedValue(isActive ? 1 : 0);

        useEffect(() => {
            if (isActive) {
                setResting(false);
                progress.value = reducedMotion
                    ? 1
                    : withTiming(1, {
                          duration: ENTER_MS,
                          easing: Easing.out(Easing.cubic),
                      });
                return;
            }
            if (reducedMotion) {
                progress.value = 0;
                setResting(true);
                return;
            }
            progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
            const restTimer = setTimeout(() => setResting(true), EXIT_MS + REST_SLACK_MS);
            return () => clearTimeout(restTimer);
        }, [isActive, progress, reducedMotion]);

        const animatedStyle = useAnimatedStyle(() => ({
            opacity: progress.value,
            transform: [{ translateY: (1 - progress.value) * ENTER_RISE_PX }],
        }));

        return (
            <Reanimated.View
                pointerEvents={isActive ? 'auto' : 'none'}
                style={[
                    styles.tabScene,
                    isActive ? styles.tabSceneOnTop : null,
                    animatedStyle,
                ]}
            >
                <Freeze freeze={resting}>{children}</Freeze>
            </Reanimated.View>
        );
    },
);

TabSceneContainer.displayName = 'TabSceneContainer';

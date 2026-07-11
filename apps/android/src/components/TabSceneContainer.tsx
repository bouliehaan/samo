import { memo, type ReactNode, useEffect, useState } from 'react';
import Reanimated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { styles } from '../theme/styles';

const ENTER_MS = 170;
const EXIT_MS = 130;
/** Incoming scene rises this far as it fades in (and the outgoing sinks). */
const ENTER_RISE_PX = 6;

/**
 * One tab scene layer: a GPU-cheap dissolve (opacity + a few px of rise) on tab
 * switches, instead of the old hard cut.
 *
 * Touch + layout rules preserved from the static styles this replaces:
 * - At REST a hidden scene is `display:'none'` — fully out of layout and the
 *   touch hierarchy (an opacity-0 ScrollView on Android still lets taps fall
 *   through to its children — the historical "Home tap plays radio" bug).
 * - During the brief fade-out window the outgoing scene is visible but wrapped
 *   in this plain View with `pointerEvents:'none'`, which reliably blocks its
 *   whole subtree (the fall-through bug was ScrollView-specific).
 * - The active scene sits on top (zIndex) so the dissolve layers correctly.
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
        const [detached, setDetached] = useState(!isActive);
        const progress = useSharedValue(isActive ? 1 : 0);

        useEffect(() => {
            if (isActive) {
                setDetached(false);
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
                setDetached(true);
                return;
            }
            progress.value = withTiming(
                0,
                { duration: EXIT_MS, easing: Easing.in(Easing.quad) },
                (finished) => {
                    'worklet';
                    if (finished) {
                        runOnJS(setDetached)(true);
                    }
                },
            );
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
                    detached ? styles.tabSceneDetached : null,
                    animatedStyle,
                ]}
            >
                {children}
            </Reanimated.View>
        );
    },
);

TabSceneContainer.displayName = 'TabSceneContainer';

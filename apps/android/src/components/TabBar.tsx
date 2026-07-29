import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';
import { memo, useEffect, useMemo, useState } from 'react';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { pressTab, useAppNavigationSelector } from '../state/app-navigation';
import { springs } from '../theme/motion';
import { styles } from '../theme/styles';
import { TabIcon } from './Glyphs';
import { PressableScale } from './PressableScale';

/** Pressed-state icon scale — small, because the icon is only 24dp. */
const PRESS_SCALE = 0.86;
/** Inactive icons rest fractionally smaller, so selecting one reads as a lift. */
const INACTIVE_SCALE = 0.92;
const INACTIVE_OPACITY = 0.75;

/**
 * One tab button. The icon glyphs are hand-built Views and SVG whose active
 * colour is a hard swap; rather than thread animated props through all five
 * (every glyph would need its own `createAnimatedComponent` paths), the
 * WRAPPER carries the motion — scale and opacity only, both GPU-composited.
 *
 * That buys two transitions the bar never had: a press response under the
 * finger, and an active-state change where the selected icon rises and brightens
 * instead of a colour appearing out of nowhere.
 */
const TabBarButton = memo(function TabBarButton({
    id,
    isActive,
    label,
    reducedMotion,
}: {
    id: SamoMobileTabId;
    isActive: boolean;
    label: string;
    reducedMotion: boolean;
}) {
    const pressed = useSharedValue(0);
    const active = useSharedValue(isActive ? 1 : 0);
    const selectedState = useMemo(() => ({ selected: isActive }), [isActive]);

    useEffect(() => {
        active.value = reducedMotion
            ? isActive
                ? 1
                : 0
            : withSpring(isActive ? 1 : 0, springs.settle);
    }, [active, isActive, reducedMotion]);

    const iconStyle = useAnimatedStyle(() => {
        // Rest scale is the active lift; the press then multiplies INTO it, so
        // pressing the already-active tab still gives a response instead of
        // fighting the state animation for the same property.
        const restScale = INACTIVE_SCALE + active.value * (1 - INACTIVE_SCALE);
        const pressScale = 1 - pressed.value * (1 - PRESS_SCALE);
        return {
            opacity: INACTIVE_OPACITY + active.value * (1 - INACTIVE_OPACITY),
            transform: [{ scale: restScale * pressScale }],
        };
    });

    return (
        <PressableScale
            // Icon-only bar: the label lives on for screen readers.
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={selectedState}
            // The bar is fixed chrome, so the sink starts on touch-down with no
            // scroll-safety window in front of it.
            chrome
            // The wrapper renders no response of its own — the icon below folds
            // this same progress into the active-state lift, so both live in one
            // transform instead of fighting over scale.
            dimTo={1}
            // onPressIn (touch-down) for the snappiest possible switch;
            // onPress would dispatch the same navigation a second time on
            // release.
            onPressIn={() => pressTab(id)}
            pressProgress={pressed}
            scaleTo={1}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
        >
            <Reanimated.View style={iconStyle}>
                <TabIcon active={isActive} id={id} />
            </Reanimated.View>
        </PressableScale>
    );
});

/**
 * Bottom tab bar. Subscribes to the one field it renders from (active tab) so
 * tab switches re-render this bar — not App. The sink style is driven off the
 * shared player-progress value on the UI thread.
 */
export const TabBar = memo(function TabBar({
    playerProgress,
    sinkStyle,
}: {
    playerProgress: SharedValue<number>;
    sinkStyle: ReturnType<typeof useAnimatedStyle>;
}) {
    const activeTab = useAppNavigationSelector((state) => state.activeTab);
    const reducedMotion = useReducedMotionPreference();

    // Hit-testability must track what is ON SCREEN, not navigation state.
    // `isFullPlayerOpen` deliberately lags the close spring (the gesture
    // dismiss flips it from the spring's onFinish, and an interrupted spring
    // never flips it at all), so a bar gated on that state stays
    // pointerEvents:'none' for hundreds of ms — or forever — after it LOOKS
    // tappable again. Taps then sail through the glass into whatever is
    // scrolled beneath the dock (the "tapping Home selected the radio card
    // under it" bug). Gate on the live animated progress instead: dead the
    // moment the player card starts rising, alive the moment the dock is
    // visually at rest — and self-healing if the open state ever sticks.
    const [isSunk, setIsSunk] = useState(false);
    useAnimatedReaction(
        () => playerProgress.value > 0.02,
        (sunk, previous) => {
            if (sunk !== previous) {
                runOnJS(setIsSunk)(sunk);
            }
        },
    );

    return (
        <Reanimated.View
            pointerEvents={isSunk ? 'none' : 'auto'}
            style={[styles.tabBar, sinkStyle]}
        >
            {SAMO_MOBILE_TABS.map((tab) => (
                <TabBarButton
                    id={tab.id}
                    isActive={tab.id === activeTab}
                    key={tab.id}
                    label={tab.label}
                    reducedMotion={reducedMotion}
                />
            ))}
        </Reanimated.View>
    );
});

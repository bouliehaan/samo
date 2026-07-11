import { SAMO_MOBILE_TABS } from '@samo/core/navigation';
import { memo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    type useAnimatedStyle,
} from 'react-native-reanimated';

import { pressTab, useAppNavigationSelector } from '../state/app-navigation';
import { styles } from '../theme/styles';
import { TabIcon } from './Glyphs';

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
            {SAMO_MOBILE_TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <Pressable
                        accessibilityRole="button"
                        key={tab.id}
                        // onPressIn (touch-down) for the snappiest possible
                        // switch; onPress would dispatch the same navigation a
                        // second time on release.
                        onPressIn={() => pressTab(tab.id)}
                        style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    >
                        <TabIcon active={isActive} id={tab.id} />
                        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </Reanimated.View>
    );
});

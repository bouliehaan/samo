import { useCallback, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import {
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

import { chromeGlassScrollProps } from '../state/chrome-glass';
import { spacing } from '../theme/tokens';

/**
 * The detail screen's collapsing top bar: tracks the list's scroll offset on
 * the UI thread and derives the backdrop/content fade styles plus a JS-side
 * interactivity flag. The reveal point follows the hero action bar's measured
 * position so the bar appears exactly as the hero controls scroll away.
 *
 * It also carries `scrollMotionProps`, because this hook is the one thing every
 * detail list (playlist, album, audiobook, podcast, artist) has in common —
 * they do NOT go through `useSearchPull`, which is where every tab page picks
 * the same props up. Spread it alongside `scrollHandler` or the chrome glass
 * keeps re-sampling the whole view tree through the scroll (state/chrome-glass).
 */
export const useCollapsedDetailHeader = () => {
    const detailScrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            detailScrollY.value = event.contentOffset.y;
        },
    });
    const [collapsedHeaderTriggerY, setCollapsedHeaderTriggerY] = useState(220);
    const [isInteractive, setIsInteractive] = useState(false);
    const revealStartY = Math.max(0, collapsedHeaderTriggerY - 28);
    const revealEndY = collapsedHeaderTriggerY + 12;

    const onHeroActionsBarLayout = useCallback((event: LayoutChangeEvent) => {
        const nextTriggerY = Math.max(180, event.nativeEvent.layout.y + spacing.lg);

        setCollapsedHeaderTriggerY((current) =>
            Math.abs(current - nextTriggerY) < 1 ? current : nextTriggerY,
        );
    }, []);

    useAnimatedReaction(
        () => detailScrollY.value >= revealStartY,
        (isVisible, wasVisible) => {
            if (isVisible !== wasVisible) {
                runOnJS(setIsInteractive)(isVisible);
            }
        },
    );

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(detailScrollY.value, [revealStartY, revealEndY], [0, 1], 'clamp'),
    }));
    const contentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(detailScrollY.value, [revealStartY, revealEndY], [0, 1], 'clamp'),
        transform: [
            {
                translateY: interpolate(
                    detailScrollY.value,
                    [revealStartY, revealEndY],
                    [8, 0],
                    'clamp',
                ),
            },
        ],
    }));

    return {
        backdropStyle,
        contentStyle,
        isInteractive,
        onHeroActionsBarLayout,
        scrollHandler,
        scrollMotionProps: chromeGlassScrollProps,
    };
};

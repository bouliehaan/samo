import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { usePresenceTransition } from '../hooks/use-presence-transition';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import { HOME_REFRESH_SEGMENT_WIDTH, SCREEN_WIDTH } from '../theme/layout';
import { durations } from '../theme/motion';
import { styles } from '../theme/styles';

/** One sweep, edge to edge. Slow enough to look calm, fast enough that the
 *  minimum-visible window (see HomeTabScene) always contains a full pass. */
const SWEEP_MS = 900;

/**
 * The ONLY feedback that a Home press refreshed the feed.
 *
 * Home's refresh has no gesture — the pull-down at the top belongs to search —
 * so pressing the Home tab while already at the top is the whole affordance
 * (see `pressTab`). That press has to answer for itself, because a successful
 * refresh usually changes nothing visible: the same shelves come back in the
 * same order, and without an indicator the action is indistinguishable from a
 * dead button.
 *
 * IT REPLACES A `RefreshControl`, AND THAT WIDGET IS WHY THE FEATURE READ AS
 * BROKEN. Home's RefreshControl was `enabled={false}` — display-only, since its
 * gesture would fight the search pull — and Android's `SwipeRefreshLayout` draws
 * its circle UNDERNEATH the scroll content at a fixed `progressViewOffset`. That
 * offset lands exactly on Home's filter-pill row, so the spinner came up behind
 * the "Podcasts" pill: a bare grey arc, no disc, eating half a word. Traced on
 * device it is on screen for the fetch and nothing longer, so a healthy server
 * made it a sub-100ms flicker under a pill. The refresh was firing correctly
 * every single time; there was simply nothing legible to see.
 *
 * A LINE UNDER THE STATUS BAR, NOT A DISC, and the placement is the point. The
 * first attempt at this fix was a floating disc — correct z-order, real surface,
 * held on screen — and it failed the same way, because anything centred at the
 * top of Home lands on the pills row, and a chip sitting on "Podcasts" reads as
 * damage to the pills rather than as a status. This lives in the 8px gutter
 * between the status bar and the first row (PAGE_TOP_INSET), which is empty on
 * every Home state, so it can never occlude anything — and a full-width sweep is
 * far harder to miss than a 34dp circle.
 *
 * Mounted only while it is visible: an idle `useAnimatedStyle` is not free —
 * Reanimated re-applies every live animated prop on every Fabric commit, so a
 * permanently-mounted indicator would tax every commit Home makes for a surface
 * that is on screen a second at a time.
 */
export const HomeRefreshIndicator = memo(function HomeRefreshIndicator({
    active,
}: {
    active: boolean;
}) {
    const reducedMotion = useReducedMotionPreference();
    const { isMounted, progress } = usePresenceTransition(active, {
        enterMs: durations.state,
        exitMs: durations.screenExit,
    });

    // 0 → 1 across one sweep. Started in an effect rather than inline so it
    // begins only once the bar has actually mounted and committed — the same
    // ordering rule usePresenceTransition enforces for the fade (see
    // theme/motion rule 4), and the reason a repeat started during render can
    // appear to skip its first pass.
    const sweep = useSharedValue(0);
    useEffect(() => {
        if (!isMounted || reducedMotion) {
            return;
        }
        sweep.value = 0;
        sweep.value = withRepeat(
            withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }),
            -1,
            false,
        );
    }, [isMounted, reducedMotion, sweep]);

    const barStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
    const segmentStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX:
                    -HOME_REFRESH_SEGMENT_WIDTH +
                    sweep.value * (SCREEN_WIDTH + HOME_REFRESH_SEGMENT_WIDTH),
            },
        ],
    }));

    if (!isMounted) {
        return null;
    }

    return (
        // Never interactive. It sits in a gutter nothing else occupies, but the
        // layer spans the width and an accidental tap target across the top of
        // Home would be worse than the bug this fixes.
        <Reanimated.View pointerEvents="none" style={[styles.homeRefreshBar, barStyle]}>
            {reducedMotion ? (
                // No travel, so the bar itself carries the signal: reduced
                // motion means no animation, not no feedback.
                <View style={styles.homeRefreshBarStatic} />
            ) : (
                <Reanimated.View style={[styles.homeRefreshBarSegment, segmentStyle]} />
            )}
        </Reanimated.View>
    );
});

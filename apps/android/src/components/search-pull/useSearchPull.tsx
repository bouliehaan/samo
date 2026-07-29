import { type SamoMobileTabId } from '@samo/core/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type ScrollViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { useScrollEdgeHaptics } from '../../hooks/use-scroll-edge-haptics';
import { subscribeTabReselected } from '../../state/tab-reselect';
import { useSearchPullContext } from './SearchPullContext';
import { registerPullScroller } from './search-pull-registry';

type DrawerScrollable = {
    scrollTo?: (options: { animated?: boolean; y: number }) => void;
    scrollToOffset?: (options: { animated?: boolean; offset: number }) => void;
};

/**
 * The PAGE HALF of the pull-down search surface: a scroll host's own native
 * gesture and its scroll offset, published to the app-level pan.
 *
 * THE PAN USED TO LIVE HERE, AND THAT IS WHAT MADE THE GESTURE DIE.
 *
 * Every visited tab stays mounted behind `<Freeze>` (see TabSceneContainer),
 * which suspends the subtree — and a suspended subtree has its effects torn
 * down. RNGH builds a gesture's native handler in a `useLayoutEffect` and
 * registers the listener that REPAIRS cross-gesture relations in a `useEffect`
 * (see GestureDetector/useMountReactions). Layout effects run first, so a
 * detector whose mount listener has been torn down cannot hear a related
 * gesture remount. With the pan and the scroller's `Gesture.Native()` both
 * inside the frozen page, freezing dropped BOTH ends of their
 * `blocksExternalGesture` relation and thawing re-created them with fresh
 * handler tags and nothing left alive to re-link them. Measured on device: the
 * pan reached ACTIVATE and the orchestrator cancelled it ~2ms later —
 * `onFinalize(success=false)` with no `onChange` and no `onEnd`. Each tab's
 * pull worked exactly once, on its first mount, and was dead after the first
 * tab switch.
 *
 * So the pan moved to the shell (see SearchPullGestureHost), where nothing
 * freezes it, and only the two genuinely page-owned halves stayed here. Because
 * the shell detector is never suspended, its mount listener is alive to hear a
 * page's native gesture remount and re-send the relation — which is exactly
 * what it could not do when both ends were frozen together.
 *
 * `tabId` identifies this page in the registry, and is also the re-tap target:
 * a press on the already-active tab glides THIS list back to the top (search
 * retract on re-tap is handled once, centrally, in the provider).
 */
export const useSearchPull = (tabId: SamoMobileTabId) => {
    const { activePullTab, activeScrollY } = useSearchPullContext();

    const scrollableRef = useRef<DrawerScrollable | null>(null);
    // Scroll offset, written on the UI thread. The app-level pan reads it (via
    // the registry) to know whether a drag began at the top — the only place a
    // pull may reveal search.
    const scrollY = useSharedValue(0);

    // The list's own scroll gesture, made explicit so the shell pan can declare
    // `blocksExternalGesture` against it.
    const nativeGesture = useMemo(() => Gesture.Native(), []);

    // Publish this page's two halves. The shell rebuilds its pan when a new
    // native gesture appears, so the relation is re-declared on every thaw.
    useEffect(
        () => registerPullScroller(tabId, { nativeGesture, scrollY }),
        [nativeGesture, scrollY, tabId],
    );

    const setScrollable = useCallback(
        (node: DrawerScrollable | null) => {
            scrollableRef.current = node;
            if (node) {
                /*
                 * A freshly attached scrollable is at the top BY DEFINITION, and
                 * it will not emit a scroll event to say so — `onScroll` only
                 * fires once something moves.
                 *
                 * Without this, the offset cached from before the scene was torn
                 * down (opening a media detail page, for instance) survives the
                 * remount. The pan then judges "did this drag start at the top?"
                 * against a stale number, fails itself on every touch, and the
                 * pull is dead everywhere until the user happens to scroll and
                 * refresh the value by hand.
                 */
                scrollY.value = 0;
                if (activePullTab.value === tabId) {
                    activeScrollY.value = 0;
                }
            }
        },
        [activePullTab, activeScrollY, scrollY, tabId],
    );

    const scrollToTop = useCallback(() => {
        const scrollable = scrollableRef.current;
        scrollable?.scrollToOffset?.({ animated: true, offset: 0 });
        scrollable?.scrollTo?.({ animated: true, y: 0 });
    }, []);

    const reportScrollEdge = useScrollEdgeHaptics();
    const scrollHandler = useAnimatedScrollHandler(
        {
            onScroll: (event) => {
                scrollY.value = event.contentOffset.y;
                /*
                 * Only the VISIBLE page may move the offset the pan judges
                 * against. A frozen page can still emit a stray scroll event —
                 * a momentum frame landing after the switch, a
                 * `maintainVisibleContentPosition` adjustment — and letting that
                 * through would tell the pan the user is mid-list on a page they
                 * are not even looking at, which reads as "search refuses to
                 * come down" with nothing on screen to explain it.
                 */
                if (activePullTab.value === tabId) {
                    activeScrollY.value = event.contentOffset.y;
                }
                // Every tab's scroll runs through here, so the top/bottom detent
                // is wired once for all of them rather than per page.
                reportScrollEdge(
                    event.contentOffset.y,
                    event.contentSize.height,
                    event.layoutMeasurement.height,
                );
            },
        },
        [activePullTab, activeScrollY, reportScrollEdge, tabId],
    );

    // FlashList hosts hand this to `renderScrollComponent` so the native gesture
    // binds to the ACTUAL inner scroll view (FlashList's real scroller is not
    // reachable by wrapping the FlashList itself).
    //
    // It MUST be `Reanimated.ScrollView`, never a plain react-native `ScrollView`.
    // `scrollProps.onScroll` is a worklet from `useAnimatedScrollHandler`, and a
    // worklet handler only binds to an ANIMATED scroll component — on a plain one
    // it is accepted as a prop and then silently never fires. That failure is
    // invisible and total: the offset stays pinned at 0 forever, so every drag
    // anywhere in the list reads as starting at the top and summons search
    // instead of scrolling, and once the reveal passes SURFACE_OPEN_AT the scrim
    // turns interactive and swallows the page — leaving the list stranded
    // wherever it was.
    const renderScrollComponent = useCallback(
        (props: ScrollViewProps) => (
            <GestureDetector gesture={nativeGesture}>
                <Reanimated.ScrollView {...props} />
            </GestureDetector>
        ),
        [nativeGesture],
    );

    // Re-tap the active tab → glide this list back to the top.
    useEffect(
        () =>
            subscribeTabReselected((reselectedTabId) => {
                if (reselectedTabId === tabId) {
                    scrollToTop();
                }
            }),
        [scrollToTop, tabId],
    );

    return useMemo(
        () => ({
            nativeGesture,
            renderScrollComponent,
            scrollProps: {
                onScroll: scrollHandler,
                // Kill the Android stretch glow so only OUR surface answers an
                // over-pull at the top.
                overScrollMode: 'never' as const,
                ref: setScrollable,
                scrollEventThrottle: 16,
            },
        }),
        [nativeGesture, renderScrollComponent, scrollHandler, setScrollable],
    );
};

export type SearchPullScrollProps = ReturnType<typeof useSearchPull>['scrollProps'];

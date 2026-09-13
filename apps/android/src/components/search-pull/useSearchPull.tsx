import { type SamoMobileTabId } from '@samo/core/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type ScrollViewProps } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { useScrollEdgeHaptics } from '../../hooks/use-scroll-edge-haptics';
import { useTabReselect } from '../../state/tab-reselect';
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
    /** The scrollable this hook last held, kept through a detach — so a reveal
     *  handing the SAME one back can be told from a fresh one. See setScrollable. */
    const knownScrollableRef = useRef<DrawerScrollable | null>(null);

    /** A scroll-to-top asked for before the list existed. See scrollToTop. */

    const pendingScrollToTopRef = useRef(false);
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
                 * THE SAME SCROLLABLE COMES BACK ON EVERY THAW, STILL SCROLLED.
                 *
                 * This ref callback does not only run for a fresh list. React
                 * detaches every ref inside a Suspense boundary when the
                 * boundary hides its content and re-attaches them when it
                 * shows it again — which is what `<Freeze>` does to a tab on
                 * every switch away and back. The native scroll view is not
                 * remade for that: Fabric keeps it and Android keeps its
                 * offset, so the page comes back exactly where it was left,
                 * and `scrollY` — written by the UI thread on every scroll,
                 * never by anything else — still says so.
                 *
                 * Resetting to zero here treated that reveal as a new list at
                 * the top. Traced on the emulator: leave Radio scrolled to 135,
                 * come back through two other tabs, and the reveal reset
                 * `scrollY` to 0 while the view still sat at 135. The page
                 * shows its card cut off, the pan reads "at the top", and the
                 * pull that should scroll it back up brings search down over it
                 * instead — until a scroll event happens to put the real number
                 * back. That is the whole of "it doesn't stop at the top and I
                 * can't scroll up".
                 *
                 * So zero is written ONLY for a scrollable this hook has never
                 * held. A genuinely new native list is at the top and will not
                 * emit a scroll event to say so (`onScroll` only fires once
                 * something moves), and the value cached from its predecessor
                 * — a list torn down and remounted around a loading state —
                 * would otherwise survive into it. The one it has held before
                 * needs nothing: native is the source of truth for the offset,
                 * every change to it arrives as a scroll event, and a JS-side
                 * write is the only way the two can disagree.
                 */
                if (node !== knownScrollableRef.current) {
                    knownScrollableRef.current = node;
                    scrollY.value = 0;
                    if (activePullTab.value === tabId) {
                        activeScrollY.value = 0;
                    }
                }

                // Flush a scroll-to-top that arrived while there was nothing to
                // scroll. Not animated: this is a page the user is arriving at,
                // so it should already BE at the top rather than be seen
                // travelling there.
                if (pendingScrollToTopRef.current) {
                    pendingScrollToTopRef.current = false;
                    node.scrollToOffset?.({ animated: false, offset: 0 });
                    node.scrollTo?.({ animated: false, y: 0 });
                }
            } else {
                // Detaching cancels nothing: the request belongs to the page, and
                // the next list to attach is the one that should answer it. Nor
                // does it forget the list — a detach is what a freeze looks like
                // from here, and the thaw hands the same list straight back.
            }
        },
        [activePullTab, activeScrollY, scrollY, tabId],
    );

    /**
     * Glide this page's list back to the top.
     *
     * DEFERRED WHEN THERE IS NO LIST YET, which is the normal case for the press
     * that matters. Pressing a tab emits the signal synchronously inside
     * `pressTab`, before React has re-rendered — so a page arriving from the
     * background has not re-attached its scrollable at that instant, and this
     * used to silently no-op through the optional chaining. That is why pressing
     * Home from another tab left you wherever you had been scrolled.
     *
     * The ref callback below is the exact moment the list becomes addressable,
     * so a pending request is flushed there instead.
     */
    const scrollToTop = useCallback(() => {
        const scrollable = scrollableRef.current;
        if (!scrollable) {
            pendingScrollToTopRef.current = true;
            return;
        }
        scrollable.scrollToOffset?.({ animated: true, offset: 0 });
        scrollable.scrollTo?.({ animated: true, y: 0 });
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

    // Reselecting this tab → glide its list back to the top. Via the catch-up
    // hook, so a press that landed while this page was frozen is answered on
    // thaw rather than lost — see state/tab-reselect.
    useTabReselect(tabId, scrollToTop);

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

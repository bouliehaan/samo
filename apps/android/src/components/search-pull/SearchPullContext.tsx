import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    type SharedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { useReducedMotionPreference } from '../../hooks/use-reduced-motion-preference';
import {
    setIsSearchOverlayOpen,
    setSearchOverlayQuery,
    useAppNavigationSelector,
} from '../../state/app-navigation';
import { subscribeTabReselected } from '../../state/tab-reselect';
import { getPullScrollY } from './search-pull-registry';
import { REDUCED_MOTION_SPRING } from '../../theme/layout';
import {
    SEARCH_PULL_OPEN_SPRING,
    SEARCH_PULL_SETTLE_SPRING,
} from './search-pull-constants';

/**
 * The single source of truth for the pull-down search surface, hoisted to the
 * app shell so it is ONE thing every tab summons — not the five independent,
 * scroll-coupled copies the old drawer was, each stuck open with its own
 * offset. `pull` is written on the UI thread by whichever tab's pan is active
 * (see `useSearchPull`) and read by the app-level `SearchPullSurface`; nothing
 * per-frame ever crosses to JS.
 */
interface SearchPullContextValue {
    /**
     * The two-stage reveal (see `pullReveal`): 0 parked, 1 the bar seated at its
     * rest line, 2 full search open. Stage two is a real position on this scale,
     * not a separate mode — which is what lets a finger drag search in, back it
     * out, and drag it in again without anything switching underneath.
     */
    pull: SharedValue<number>;
    /** The ACTIVE page's scroll offset, written by whichever page is showing (see
     *  `useSearchPull`) and read by the one app-level pan at touch-down. The pan
     *  lives above the tab scenes now, so it cannot reach into a page for this —
     *  and must not, since every page but one is frozen. */
    activeScrollY: SharedValue<number>;
    /** Which page owns `activeScrollY` right now, so a frozen page's stray scroll
     *  event can't overwrite the visible page's offset. */
    activePullTab: SharedValue<string>;
    /**
     * True while a PAN currently holds an IME control session.
     *
     * Exists so the surface's keyboard teardown can tell "the keyboard is no
     * longer wanted" from "a finger is actively dragging it back down". They look
     * identical from JS — both are `isKeyboardWanted === false` — and treating
     * them the same is what killed the keyboard mid-gesture: the effect called
     * `finishImeControl` the moment a drag dipped under the seat, destroying the
     * session the still-running pan owned, and the pan had no way to know it was
     * now driving a dead controller.
     *
     * A shared value rather than React state ON PURPOSE. It is written from a
     * gesture worklet, and the reader only ever needs its value at the instant an
     * effect runs — a synchronous `.value` read from JS. Routing it through
     * `setState` would put a render and a Fabric commit in the middle of the
     * gesture to communicate something no one renders.
     */
    isPanDrivingIme: SharedValue<boolean>;
    reducedMotion: boolean;
    /** Whether the full-search overlay is MOUNTED. Latched true once at idle after
     *  boot and never cleared, so no pull ever pays to build the tree; the
     *  overlay's visibility is driven off `pull`. See the provider for the frame
     *  measurements behind that. */
    isSearchMounted: boolean;
    /** Open search from a TAP on the resting bar — animates `pull` the rest of
     *  the way itself, since no finger is driving it. */
    openFullSearch: () => void;
    /** Open search from the PULL, which is already animating `pull` to 2. Only
     *  raises focus; taking the animation here too would mean two springs on one
     *  value, which is the double-bounce this had before.
     *
     *  `skippedPeek` is true when a fling carried the release through WITHOUT the
     *  drag ever entering stage two — so no IME control session was opened and
     *  the keyboard has to be raised the ordinary way. */
    commitFullSearch: (skippedPeek: boolean) => void;
    /** True when the current commit arrived via a fling that skipped stage two. */
    didSkipPeek: boolean;
    /** Spring the surface away. The one dismissal path everything funnels
     *  through — a tap on the scrim, a fling-up, a navigation — so "going away"
     *  is always the same animated retract, never a hard reset. */
    retract: () => void;
    /** The STATE half of a dismissal, without the spring — the mirror of
     *  `commitFullSearch`.
     *
     *  For a gesture that is already throwing the surface off with its own
     *  velocity on the UI thread. `retract` would land a second spring on top
     *  once its `runOnJS` hop arrived, restarting the motion from wherever it had
     *  got to at zero velocity and flattening the throw — and if the JS thread
     *  were busy at that moment (search results rendering, say) the surface would
     *  visibly stall mid-flight first. The two halves of the state still go away
     *  together; only the animation is the caller's. */
    dismissSearchState: () => void;
}

const SearchPullContext = createContext<SearchPullContextValue | null>(null);

export const useSearchPullContext = (): SearchPullContextValue => {
    const value = useContext(SearchPullContext);
    if (!value) {
        throw new Error('useSearchPullContext must be used within a SearchPullProvider');
    }
    return value;
};

export const SearchPullProvider = ({ children }: { children: ReactNode }) => {
    const pull = useSharedValue(0);
    const activeScrollY = useSharedValue(0);
    const activePullTab = useSharedValue<string>('home');
    const isPanDrivingIme = useSharedValue(false);
    const reducedMotion = useReducedMotionPreference();
    const [isSearchMounted, setIsSearchMounted] = useState(false);

    /*
     * THE OVERLAY IS MOUNTED ONCE, AT IDLE, AND NEVER UNMOUNTED.
     *
     * It used to mount from a `pull > SEARCH_PULL_MOUNT_AT` reaction — "early in
     * the drag, during the slack of stage one, so the render lands while the bar
     * is still sliding". The render was never the problem. REANIMATED SETTING UP
     * THE NEW TREE'S ANIMATED STYLES WAS: measured on the V60, the frame four
     * after that threshold spends **30.81ms in the Choreographer animation phase**
     * against a 0.3ms baseline, with another 5.98ms recording the new draw, and
     * the frame behind it then starts 24.23ms late. Two dropped frames, right in
     * the middle of the gesture, every single pull.
     *
     * This is why it was worst on the FIRST pull and came back "if you're
     * persistent": the worklets are coldest the first time, and unmounting on the
     * way back to 0 meant every pull re-paid a fresh setup.
     *
     * It was previously "ruled out" by moving the mount to the pan's touch-down
     * and seeing no change in p50 or janky-percent. Both are the wrong
     * instruments — a single 30ms frame cannot move a median, and it is the only
     * frame that matters here. Look at the frame SERIES.
     *
     * Idle rather than eager so it never lands on the boot path, and monotonic so
     * a pull can never re-pay it.
     */
    useEffect(() => {
        const handle = requestIdleCallback(() => setIsSearchMounted(true), { timeout: 4000 });
        return () => cancelIdleCallback(handle);
    }, []);

    /*
     * The state half of going away. `pull` and `isSearchOverlayOpen` are two
     * halves of one state and must be put away together.
     *
     * `retract` used to spring `pull` alone, which left every non-BACK dismissal —
     * the scrim tap, a tab re-tap — with an invisible but still OPEN search: the
     * overlay stayed mounted, `isCommitted` stayed true, and the field stayed
     * focused and editable behind a surface the user had just put away. The next
     * pull then started from that half-live state.
     */
    const dismissSearchState = useCallback(() => {
        setIsSearchOverlayOpen(false);
        setSearchOverlayQuery('');
    }, []);

    /** The COMPLETE dismissal: state cleared and the surface sprung away. */
    const retract = useCallback(() => {
        dismissSearchState();
        pull.value = withSpring(
            0,
            reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_SETTLE_SPRING,
        );
    }, [dismissSearchState, pull, reducedMotion]);

    const [didSkipPeek, setDidSkipPeek] = useState(false);
    const commitFullSearch = useCallback((skippedPeek: boolean) => {
        setDidSkipPeek(skippedPeek);
        setIsSearchOverlayOpen(true);
    }, []);

    const openFullSearch = useCallback(() => {
        // A tap never drives the IME by hand either.
        setDidSkipPeek(true);
        // The tap path. Nothing is driving `pull`, so this owns the motion: it
        // runs the same 1 → 2 the drag would have, so tapping the bar and pulling
        // through to it end in exactly the same place by exactly the same route.
        // The haptic rides the landing, not the tap — the tap already had its own
        // physical feedback in the press itself.
        // The landing tick is fired once, centrally, off the reveal crossing —
        // see SearchPullSurface. Hanging it on this spring's completion callback
        // meant it waited for numerical rest, long after the motion had visibly
        // ended.
        pull.value = withSpring(2, reducedMotion ? REDUCED_MOTION_SPRING : SEARCH_PULL_OPEN_SPRING);
        setIsSearchOverlayOpen(true);
    }, [pull, reducedMotion]);

    // "Knows when to go away." Any navigation away from the current bare page
    // retracts the surface. Coarse nav slices only, so this fires on real
    // navigations, not per-render — and it is an animated spring, the thing Jake
    // asked for instead of a snap reset.
    const activeTab = useAppNavigationSelector((state) => state.activeTab);
    const detailStatus = useAppNavigationSelector((state) => state.mediaDetailState.status);
    const utilityScreen = useAppNavigationSelector((state) => state.activeUtilityScreen);
    const isFullPlayerOpen = useAppNavigationSelector((state) => state.isFullPlayerOpen);
    const isSearchOverlayOpen = useAppNavigationSelector((state) => state.isSearchOverlayOpen);
    const viewAllRoute = useAppNavigationSelector((state) => state.viewAllRoute);

    /*
     * Hand the pan the newly-visible page's offset on a tab switch.
     *
     * A page that has been frozen emits no scroll event to announce where it is,
     * so without this the pan would keep judging "am I at the top?" against the
     * page the user just left — and a tab whose list happened to be scrolled
     * would either summon search mid-list or refuse to summon it at all.
     * Reading `.value` off the UI thread is a plain synchronous read from JS.
     */
    useEffect(() => {
        activePullTab.value = activeTab;
        activeScrollY.value = getPullScrollY(activeTab)?.value ?? 0;
    }, [activeTab, activePullTab, activeScrollY]);

    const isFirstRun = useRef(true);
    const wasSearchOpen = useRef(false);
    useEffect(() => {
        const justOpenedSearch = isSearchOverlayOpen && !wasSearchOpen.current;
        wasSearchOpen.current = isSearchOverlayOpen;
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (justOpenedSearch) {
            // The OPENING transition only. Search being open is `pull === 2` — a
            // position on the same scale, already reached by whatever opened it —
            // so there is nothing to animate and nothing to hand off.
            return;
        }
        if (isSearchOverlayOpen) {
            // Navigating AWAY while search is open: settings, a detail page, the
            // player. Search has to actually close, not just un-animate. Testing
            // `isSearchOverlayOpen` alone here (rather than the transition) meant
            // every one of these bailed out early, so tapping the samo-S opened
            // settings underneath a search page that never went anywhere.
            setIsSearchOverlayOpen(false);
            return;
        }
        retract();
    }, [
        activeTab,
        detailStatus,
        utilityScreen,
        isFullPlayerOpen,
        isSearchOverlayOpen,
        pull,
        viewAllRoute,
        retract,
    ]);

    // Re-tapping the active tab (which does not change activeTab) also retracts.
    useEffect(() => subscribeTabReselected(() => retract()), [retract]);

    const value = useMemo<SearchPullContextValue>(
        () => ({
            activePullTab,
            activeScrollY,
            commitFullSearch,
            didSkipPeek,
            dismissSearchState,
            isPanDrivingIme,
            isSearchMounted,
            openFullSearch,
            pull,
            reducedMotion,
            retract,
        }),
        [
            activePullTab,
            activeScrollY,
            commitFullSearch,
            didSkipPeek,
            dismissSearchState,
            isPanDrivingIme,
            isSearchMounted,
            openFullSearch,
            pull,
            reducedMotion,
            retract,
        ],
    );

    return <SearchPullContext.Provider value={value}>{children}</SearchPullContext.Provider>;
};

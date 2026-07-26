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
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
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
import { REDUCED_MOTION_SPRING } from '../../theme/layout';
import {
    SEARCH_PULL_MOUNT_AT,
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
    reducedMotion: boolean;
    /** Whether the full-search overlay should be MOUNTED yet. Flips true early in
     *  the pull so its one render lands during the slack of stage one rather than
     *  at the threshold; the overlay's visibility is driven off `pull`. */
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
    const reducedMotion = useReducedMotionPreference();
    const [isSearchMounted, setIsSearchMounted] = useState(false);

    // Mount the overlay early and unmount it once the surface is fully parked, so
    // the render never happens at a moment the finger can feel.
    useAnimatedReaction(
        () => pull.value > SEARCH_PULL_MOUNT_AT,
        (mounted, previous) => {
            if (mounted !== previous) {
                runOnJS(setIsSearchMounted)(mounted);
            }
        },
    );

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
            commitFullSearch,
            didSkipPeek,
            dismissSearchState,
            isSearchMounted,
            openFullSearch,
            pull,
            reducedMotion,
            retract,
        }),
        [
            commitFullSearch,
            didSkipPeek,
            dismissSearchState,
            isSearchMounted,
            openFullSearch,
            pull,
            reducedMotion,
            retract,
        ],
    );

    return <SearchPullContext.Provider value={value}>{children}</SearchPullContext.Provider>;
};

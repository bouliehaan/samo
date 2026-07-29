import { type SamoMobileTabId } from '@samo/core/navigation';
import { type GestureType } from 'react-native-gesture-handler';
import { type SharedValue } from 'react-native-reanimated';

/**
 * Where the app-level pull pan finds the CURRENT pages' scrollers.
 *
 * The pan used to be built per tab, inside each screen — which is what made it
 * die. Every visited tab stays mounted behind `<Freeze>` (see TabSceneContainer),
 * and suspending a subtree tears down its effects: RNGH drops the pan and the
 * scroll view's native handler together and re-creates them on thaw with fresh
 * handler tags. The `blocksExternalGesture` relation between them does NOT
 * survive that round trip, because the listener that repairs such relations
 * (GestureDetector/useMountReactions) was frozen alongside the thing it was
 * meant to hear. Measured on device as `ACTIVATE` followed by
 * `onFinalize(success=false)` with no `onChange` and no `onEnd`. The result:
 * every tab's pull worked exactly ONCE, on its first mount, and was dead
 * forever after the first tab switch.
 *
 * So the pan moved to the shell, where nothing freezes it, and only the
 * per-page halves stayed in the page: its `Gesture.Native()` and its scroll
 * offset. Those two are registered here. RNGH's own repair path then works as
 * designed — the shell detector's mount listener is alive to hear a page's
 * native gesture remount and re-send the relation, which is exactly what it
 * could not do when both ends were frozen in the same subtree.
 */

interface RegisteredScroller {
    nativeGesture: GestureType;
    scrollY: SharedValue<number>;
}

const scrollers = new Map<SamoMobileTabId, RegisteredScroller>();

let onRegistryChanged: (() => void) | null = null;

/** The shell subscribes so it can rebuild the pan's relations when a page
 *  mounts or unmounts. Pages mount once per app session and thaw a handful of
 *  times, so this fires rarely. */
export const setPullRegistryListener = (listener: (() => void) | null): void => {
    onRegistryChanged = listener;
};

export const registerPullScroller = (
    tabId: SamoMobileTabId,
    entry: RegisteredScroller,
): (() => void) => {
    scrollers.set(tabId, entry);
    /*
     * ALWAYS notify. This used to compare the incoming `nativeGesture` against
     * the stored one and skip the rebuild when the object was the same — but
     * object identity is not the thing the relation is built from. RNGH's
     * `Gesture.initialize()` assigns a FRESH `handlerTag` on every attach, and
     * `blocksExternalGesture` is serialized to native as a list of tags. So a
     * page that thaws hands back the very same gesture OBJECT carrying a brand
     * new tag, the check said "nothing changed", and the shell pan went on
     * blocking a handler tag that no longer exists — the exact failure this
     * registry was built to fix, reintroduced by the optimisation meant to make
     * it cheap.
     *
     * The rebuild itself is a `useMemo` over a handful of gestures, a few times
     * per app session. There was nothing here worth optimising.
     */
    onRegistryChanged?.();
    return () => {
        // Only retract our own entry: a remount can register the new one before
        // the old one's cleanup runs, and clobbering that would leave the tab
        // with no scroller at all.
        if (scrollers.get(tabId) === entry) {
            scrollers.delete(tabId);
            onRegistryChanged?.();
        }
    };
};

/** Every registered page scroller, for the pan's `blocksExternalGesture`. */
export const getPullNativeGestures = (): GestureType[] =>
    Array.from(scrollers.values(), (entry) => entry.nativeGesture);

/** The scroll offset shared value for a page, read when that page becomes the
 *  visible one so the pan judges "am I at the top?" against the right list.
 *  Undefined until that page mounts. */
export const getPullScrollY = (tabId: SamoMobileTabId): SharedValue<number> | undefined =>
    scrollers.get(tabId)?.scrollY;

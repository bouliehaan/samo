import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * WHEN THE APP'S GLASS IS ALLOWED TO RE-SAMPLE.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM, precisely.
 * ---------------------------------------------------------------------------
 *
 * Two BlurViews are mounted permanently and unconditionally: the bottom dock
 * (BottomChromeBackdrop) and the pull-down search tray (SearchPullSurface).
 * Both use expo-blur's `dimezisBlurView` method, which is
 * `com.github.Dimezis:BlurView:version-2.0.6`. That library works like this,
 * verified from its bytecode:
 *
 *     PreDrawBlurController$1.onPreDraw()          // EVERY window draw pass
 *       -> updateBlur()
 *            internalBitmap.eraseColor(...)
 *            frameClearDrawable.draw(internalCanvas)
 *            setupInternalCanvasMatrix()
 *            rootView.draw(internalCanvas)         // <-- the whole hierarchy
 *            blurAndSave()
 *
 * `internalCanvas` is a `BlurViewCanvas`, which is `new Canvas(bitmap)` — a
 * SOFTWARE canvas. Because `Canvas.isHardwareAccelerated()` is false there,
 * `View.draw(Canvas, ViewGroup, long)` resolves `drawingWithRenderNode` to
 * false, so no view replays its cached RenderNode: every view under the blur
 * root re-runs `onDraw`/`dispatchDraw` on the CPU.
 *
 * The root used to be the whole app: the old `findOptimalBlurRoot()` looked for
 * a `com.swmansion.rnscreens.Screen` ancestor and otherwise fell back to
 * `android.R.id.content`, and this app has no react-native-screens, so it
 * always took the fallback. That is no longer how it resolves — SDK 57's
 * expo-blur takes an explicit `blurTarget` ref naming a `BlurTargetView`, and
 * both panes pass one (see theme/chrome-blur-targets), so each samples only its
 * nominated subtree. The scaling argument below still holds, but it is now
 * bounded by the target rather than by the whole window.
 *
 * So the per-frame cost is proportional to the TOTAL MOUNTED VIEW COUNT, it is
 * paid twice (once per BlurView), it is paid on the UI thread inside the
 * callback that gates the frame, and it is paid whether or not anything behind
 * the glass moved. It is the only thing in the app whose cost scales with how
 * much UI exists rather than with what is animating — which is why a long
 * playlist scrolls worse than a short one, and why the search pull, the detail
 * entrance and list scrolling all land in the same 10–15fps band despite
 * having nothing else in common. The library's own 3.0 migration notes say it
 * outright: "the software drawing itself is usually much slower than hardware
 * rendering. All this is added to the time that views spend in the regular
 * hardware pass."
 *
 * ---------------------------------------------------------------------------
 * THE RULE.
 * ---------------------------------------------------------------------------
 *
 * A live backdrop blur is affordable when the world is STILL and unaffordable
 * when it is MOVING — which is exactly backwards from how it was wired. So the
 * glass re-samples only while nothing is in motion. During a scroll, a pull, or
 * a page entrance the BlurView keeps drawing its last blurred snapshot (the
 * bitmap and its RenderEffect are untouched — see the `blurAutoUpdate` prop
 * added in patches/expo-blur@57.0.2.patch) and its OnPreDrawListener is
 * detached, so those frames cost nothing at all. Motion ends, the listener
 * comes back, and the pane refreshes.
 *
 * What that trades away: during motion the glass shows content from a moment
 * ago rather than from this frame. Through `brightness: 0.35` inside the blur,
 * 26% black smoke and the finish PNG on top, at 1/6 snapshot scale, that is
 * about as legible as it sounds — and it is only ever visible while the thing
 * behind it is travelling too fast to read anyway.
 *
 * ---------------------------------------------------------------------------
 * WHY KEYS AND NOT A COUNTER.
 * ---------------------------------------------------------------------------
 *
 * A ref-counted hold has to be perfectly balanced or it either leaks (glass
 * frozen forever) or underflows (glass live during motion). Scroll lifecycles
 * are not balanced: `onScrollEndDrag` may or may not be followed by
 * `onMomentumScrollBegin`, and a gesture can be cancelled at any point. Keys
 * are idempotent instead — `begin` twice is `begin`, `end` on an unknown key is
 * a no-op — so no call site can corrupt the state, and every one of them is
 * individually recoverable.
 *
 * The settle delay on `end` is what makes the scroll lifecycle work: the gap
 * between `onScrollEndDrag` and `onMomentumScrollBegin` is shorter than it, so
 * a fling never briefly un-freezes between the finger leaving and the momentum
 * starting.
 */

/**
 * Whether this device gets the HARDWARE blur path, and therefore needs none of
 * the machinery below.
 *
 * RenderEffect and RenderNode snapshotting both need API 31. Above it the panes
 * name a `BlurTarget` and the software redraw described above never happens at
 * all — so the glass stays live through every gesture, with no stale frame and
 * nothing to schedule. Below it the target is inert and the BlurView keeps the
 * software path, where freezing during motion is the difference between a
 * usable scroll and a slideshow.
 *
 * So this is the one switch: modern devices get correctness, old devices get
 * frames, and neither pays for the other's compromise.
 */
export const CHROME_GLASS_IS_HARDWARE =
    Platform.OS === 'android' && Number(Platform.Version) >= 31;

/** How long after motion ends before the glass may re-sample. */
const SETTLE_MS = 220;

/**
 * Backstop for a `begin` whose `end` never arrives — a gesture the system
 * swallowed, a component unmounted mid-transition. Without it a single missed
 * release would leave the glass frozen for the rest of the session, which is a
 * silent, permanent visual regression rather than an obvious bug.
 */
const MAX_HOLD_MS = 8000;

const active = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<(live: boolean) => void>();

let isLive = true;

const publish = () => {
    const next = active.size === 0;
    if (next === isLive) {
        return;
    }
    isLive = next;
    listeners.forEach((listener) => listener(next));
};

const clearTimer = (key: string) => {
    const timer = timers.get(key);
    if (timer) {
        clearTimeout(timer);
        timers.delete(key);
    }
};

const drop = (key: string) => {
    clearTimer(key);
    active.delete(key);
    publish();
};

/** Something is moving. Freezes the glass until the matching `end` settles. */
export const beginChromeGlassMotion = (key: string) => {
    if (CHROME_GLASS_IS_HARDWARE) {
        return;
    }
    clearTimer(key);
    active.add(key);
    timers.set(
        key,
        setTimeout(() => drop(key), MAX_HOLD_MS),
    );
    publish();
};

/**
 * That something stopped. The glass goes live again once nothing else holds it.
 *
 * `settleMs` exists for holds whose motion OUTLIVES the event that ends them —
 * a released pan still has a spring to run, and thawing at the release would
 * un-freeze the glass in the middle of the throw. Callers pass the tail of
 * their own motion; everything else takes the default.
 */
export const endChromeGlassMotion = (key: string, settleMs: number = SETTLE_MS) => {
    if (!active.has(key)) {
        return;
    }
    clearTimer(key);
    timers.set(
        key,
        setTimeout(() => drop(key), settleMs),
    );
};

/**
 * Scroll-view props that report motion. Spread onto every scrollable — these
 * are one-shot lifecycle callbacks, NOT per-frame work: four JS calls per
 * gesture, against the per-frame full-hierarchy redraw they switch off.
 *
 * A module constant so the object identity is stable and spreading it can never
 * invalidate a memoized list.
 */
export const chromeGlassScrollProps = {
    onMomentumScrollBegin: () => beginChromeGlassMotion('scroll'),
    onMomentumScrollEnd: () => endChromeGlassMotion('scroll'),
    onScrollBeginDrag: () => beginChromeGlassMotion('scroll'),
    onScrollEndDrag: () => endChromeGlassMotion('scroll'),
} as const;

/** Whether the glass may re-sample right now. */
export const useChromeGlassLive = (): boolean => {
    const [live, setLive] = useState(isLive);
    useEffect(() => {
        // Re-read on subscribe: motion can have started between the initial
        // render and this effect.
        setLive(isLive);
        listeners.add(setLive);
        return () => {
            listeners.delete(setLive);
        };
    }, []);
    return live;
};

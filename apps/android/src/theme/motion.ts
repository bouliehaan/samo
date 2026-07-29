import { Easing } from 'react-native-reanimated';

/**
 * Samo motion tokens — the ONE place a duration, spring, or easing is spelled
 * out, exactly as tokens.ts is the one place a typeface is.
 *
 * The app already learned this lesson with type (three literal sweeps to swap a
 * face). Motion is worse: a magic `withTiming(180)` in twelve files is twelve
 * chances for two adjacent surfaces to disagree, and disagreeing motion is the
 * thing a user actually feels as "cheap" — the detail page arriving at one
 * speed and the sheet over it at another reads as two apps stapled together.
 *
 * THE 60FPS CONTRACT — every animation in this app must satisfy all four:
 *
 * 1. Animate ONLY `opacity` and `transform`. Both are GPU-composited on
 *    Android: the view's texture is already uploaded, and the frame is a
 *    matrix/alpha change on it. Animating width/height/margin/padding/top
 *    instead re-runs Yoga layout on the shadow tree EVERY frame — that is the
 *    single most reliable way to drop this app below 60.
 * 2. Drive it from a Reanimated shared value read inside `useAnimatedStyle`.
 *    That runs the interpolation on the UI thread, so an animation in flight
 *    is immune to whatever the JS thread is doing (a catalog sync derive, an
 *    artwork prefetch, a FlashList windowing pass). This is why the app can
 *    animate freely DURING the heavy work it already does.
 * 3. Never `runOnJS` per frame, and never `setState` per frame. Cross-thread
 *    hops are for edges only (rest, commit, dismiss) — see the
 *    `useAnimatedReaction` in TabBar for the shape: it fires on a BOOLEAN
 *    flip, not on every value change.
 * 4. Pay mount cost BEFORE the animation, never during. A surface that mounts
 *    its subtree on the same frame the entrance starts spends that frame in
 *    React commit + Yoga, and the entrance visibly starts late. Hosts that
 *    mount-and-animate keep their content mounted across the transition (see
 *    use-presence-transition) so the animation only ever moves views that are
 *    already laid out.
 *
 * Rule of thumb for the durations below: an interaction the user CAUSED
 * (a tap they are waiting on) resolves fast enough to feel instant — under
 * ~220ms — while a surface leaving resolves faster still, because nobody
 * waits to watch something they just dismissed.
 */

/**
 * Springs. Reanimated's physical model — use these for anything a finger can
 * grab, interrupt, or fling, because a spring retargets from its CURRENT
 * velocity and a timing curve restarts from zero (that restart is the "rubber
 * band snapping" feel on a fast double-tap).
 */
export const springs = {
    /**
     * Chrome that settles under its own weight — icons, chips, small controls.
     * Critically damped-ish: arrives, does not wobble. Wobble on a 24dp icon
     * reads as jelly, not as quality.
     */
    settle: { damping: 20, mass: 0.5, stiffness: 340 } as const,
    /**
     * Sheets and menus arriving. A touch of overshoot so the surface reads as
     * having mass and momentum rather than being teleported into place.
     */
    sheet: { damping: 22, mass: 0.8, stiffness: 240 } as const,
    /**
     * A control snapping back after the finger leaves. Faster than `settle`
     * because release should feel like the object was under tension.
     */
    release: { damping: 15, mass: 0.5, stiffness: 320 } as const,
} as const;

/**
 * Durations, in ms, named by ROLE. Never reach past these into a literal.
 *
 * The enter/exit asymmetry is deliberate and load-bearing: the user is waiting
 * on the thing arriving (so it must confirm their tap immediately) and has
 * already moved on from the thing leaving (so it must get out of the way).
 * Symmetric durations are what make an app feel sluggish on the back button.
 */
export const durations = {
    /** Press feedback in. Any slower and the control lags the finger. */
    press: 90,
    /** A full-screen surface arriving (detail, utility screen, view-all). */
    screenEnter: 200,
    /** The same surface leaving. Roughly half — nobody watches an exit. */
    screenExit: 120,
    /**
     * A sibling scene dissolving in (tab switch). The single most-repeated
     * transition in the app, so it sits at the fast end of the budget above:
     * the switch also has to pay for React thawing the incoming scene before
     * this can start, and enter + thaw together must still land inside the
     * ~220ms a caused interaction gets.
     */
    sceneEnter: 140,
    /**
     * A sibling scene leaving. Only for a scene that is genuinely UNCOVERED as
     * it goes — a tab switch does NOT use this, because the outgoing tab is
     * covered by the incoming one and fading it as well is what put a dark
     * flash in the middle of every switch (see TabSceneContainer).
     */
    sceneExit: 130,
    /** A sheet/menu backdrop fading up. */
    scrim: 140,
    /** Small in-place state changes: icon tint, chip fill, caret rotation. */
    state: 160,
} as const;

/**
 * Easings.
 *
 * `emphasized` is ease-OUT — fast off the mark, gently arriving. Everything
 * the user is WAITING for uses it, because the first few frames are where a
 * tap gets confirmed; an ease-in entrance spends its opening frames nearly
 * motionless and reads as lag no matter how short the duration is.
 *
 * `exit` is ease-IN for the mirror reason: a surface leaving should commit to
 * leaving, and the frames near the end are the ones nobody needs to see.
 */
export const easings = {
    emphasized: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.quad),
    /** Symmetric — only for continuous/looping motion, never for enter/exit. */
    standard: Easing.inOut(Easing.quad),
} as const;

/**
 * Travel distances, in dp. Small on purpose.
 *
 * Long slides are the most common way a hand-rolled app feels amateur: the
 * distance reads as the surface having to CATCH UP to the tap. A short
 * displacement paired with an opacity ramp gives the eye a direction to follow
 * without ever making the user wait for a journey.
 */
export const travel = {
    /** A scene dissolving in/out of its sibling. */
    scene: 6,
    /** A full-screen surface arriving over the page beneath it. */
    screen: 16,
    /** A sheet rising from the bottom edge. */
    sheet: 28,
} as const;

/**
 * How far a surface sinks and dims under a finger, by the KIND of surface.
 *
 * Same argument as the durations above: press depth is the most-repeated
 * animation in the app, so a literal `0.96` copied into each tile file is the
 * fastest way to end up with two adjacent tiles answering the finger by
 * different amounts. Spread one of these into a `PressableScale`.
 *
 * The depths are not interchangeable — they are calibrated to size. A 0.96
 * sink is a card being pushed into the page; the same 0.96 on a 44dp round
 * control is a wobble, and on a full-bleed hero it is the whole screen lurching.
 */
export const presses = {
    /** Small round chrome: transport controls, icon buttons. */
    control: { dimTo: 0.88, scaleTo: 0.9 } as const,
    /** Full-width heroes — same weight of answer, a fraction of the travel. */
    hero: { dimTo: 0.88, scaleTo: 0.985 } as const,
    /** List rows. No sink at all: a row is part of a column, and scaling one
     *  breaks the column's edge. The highlight fill carries the whole response. */
    row: { dimTo: 1, scaleTo: 1 } as const,
    /** Catalog tiles — a card you could pick up, so it takes the deepest sink. */
    tile: { dimTo: 0.82, scaleTo: 0.96 } as const,
} as const;

/**
 * Standard timing configs, pre-composed so call sites read as intent
 * (`withTiming(1, timings.screenEnter)`) rather than as a config literal.
 */
export const timings = {
    screenEnter: { duration: durations.screenEnter, easing: easings.emphasized },
    screenExit: { duration: durations.screenExit, easing: easings.exit },
    sceneEnter: { duration: durations.sceneEnter, easing: easings.emphasized },
    sceneExit: { duration: durations.sceneExit, easing: easings.exit },
    scrim: { duration: durations.scrim, easing: easings.emphasized },
    state: { duration: durations.state, easing: easings.emphasized },
    press: { duration: durations.press, easing: easings.emphasized },
} as const;

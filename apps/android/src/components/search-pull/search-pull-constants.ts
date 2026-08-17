import { type WithSpringConfig } from 'react-native-reanimated';

import {
    HOME_SCENE_TOP_INSET,
    HOME_SEARCH_DRAWER_PADDING,
    HOME_SEARCH_FIELD_HEIGHT,
} from '../../theme/layout';

/**
 * Tuning for the pull-down search surface. Distances are RAW finger travel in
 * px (not the rubber-banded reveal), because the thresholds should map to how
 * far the hand actually moves, which is what the user is calibrating against.
 */

/**
 * Finger travel that seats the bar at its rest line (reveal reaches 1).
 *
 * A real stroke, not a twitch. At 96 this was short enough that an ordinary
 * downward swipe blew straight through the seat, so the resting bar was
 * something you overshot rather than something you arrived at.
 */
export const SEARCH_PULL_PEEK_DISTANCE = 140;
/**
 * Further finger travel, PAST the seated bar, across which the full search
 * screen arrives (reveal 1 → 2). Long enough that stage two is a deliberate
 * continuation rather than something you fall into, short enough to stay one
 * thumb stroke.
 */
export const SEARCH_PULL_COMMIT_SPAN = 150;
/** Reveal at or past which a release completes into full search. Half-way
 *  through stage two: by then search is visibly half-arrived, so finishing it is
 *  what the screen already promised. */
export const SEARCH_PULL_COMMIT_AT = 1.62;
/** Reveal at or past which a release leaves the bar resting open. Deliberately
 *  loose: resting at the bar is the common outcome, so it should be the easy one
 *  to hit and committing should be the one you have to mean. */
export const SEARCH_PULL_PEEK_AT = 0.28;
/** Downward velocity (px/s) that carries a release on to the next stage, so a
 *  quick flick lands rather than snapping back. */
export const SEARCH_PULL_FLING_VELOCITY = 1200;
/**
 * Downward velocity (dp/s) that counts as a deliberate FLING and skips the peek,
 * carrying straight through to full search. Above `SEARCH_PULL_FLING_VELOCITY`
 * on purpose: at 1200 an ordinary drag qualified, which made resting at the bar
 * impossible. This has to be a flick you meant — but not an unreachable one:
 * 3200 was above what a real thumb flick produces, so the skip never fired.
 *
 * The velocity was never the main reason the skip missed, so this has been
 * nudged rather than rewritten. It missed because the release was resolved
 * against `pull` — an animated value that only advances when a coalesced update
 * event lands, i.e. at most once a frame — while the finger's true release
 * position came in on the UP event. At flick speeds that gap is a whole frame of
 * travel, some 40dp, so the FASTER the throw the further the reveal it was
 * judged on fell behind, and past a point it dropped under the gate entirely and
 * the throw registered as nothing at all. A threshold that fails harder the
 * harder you try is not a threshold problem. `useSearchPull` resolves on the
 * release's own translation now; 2000 just brings this in off the very top of
 * the range a thumb can reach.
 */
export const SEARCH_PULL_SKIP_VELOCITY = 2000;
/**
 * Reveal a fling must ALREADY have reached before its speed may skip the peek.
 * Half of stage one — a real stroke, not a twitch.
 *
 * The skip used to share `SEARCH_PULL_PEEK_AT` (0.28, some 39px of travel), so a
 * fast flick that had barely moved the bar could throw you into full search
 * while a slightly slower one rested. Lowering the velocity without raising this
 * would have made that worse; they move together or not at all.
 */
export const SEARCH_PULL_SKIP_AT = 0.5;
/**
 * UPWARD speed (px/s, as a positive magnitude) that throws the surface away
 * from wherever it had reached.
 *
 * Comfortably above the few hundred px/s of drift a hand leaves on an ordinary
 * release — so backing the surface out slowly still resolves on position, the
 * way it should — and well under what a deliberate flick produces. It does not
 * need the altitude of `SEARCH_PULL_SKIP_VELOCITY`, because that one is
 * guarding against handing the user a screen they did not ask for, and this one
 * is only ever taking something away that they asked to be rid of. Getting a
 * dismissal slightly too eagerly costs a re-pull; missing one strands the bar.
 */
export const SEARCH_PULL_DISMISS_VELOCITY = 900;
/**
 * Smallest change in IME fraction (0–1) worth crossing threads for.
 *
 * The pan drives the keyboard by posting a fraction from a UI-thread worklet to
 * JS, which then calls back into a native module — two thread handoffs, and the
 * only per-frame `runOnJS` left in the app. Sending a value the IME will round
 * to the same pixel buys nothing and costs that round trip inside the gesture's
 * own frame.
 *
 * 0.002 is about one pixel of a full-height keyboard, so nothing droppable here
 * is visible. It also collapses the whole of stage one — where the fraction is
 * pinned at a constant 0 — from sixty posts a second to exactly one.
 */
export const IME_FRACTION_EPSILON = 0.002;
/** The pan only starts driving the reveal after this much downward travel, so a
 *  flat tap or a horizontal swipe on a carousel never nudges it open. */
export const SEARCH_PULL_ACTIVATE_DY = 6;
/** Sideways travel past which a mostly-horizontal drag is handed back — home
 *  carousels and edge gestures must never be stolen by the pull. */
export const SEARCH_PULL_FAIL_DX = 12;
/**
 * Travel before the SCRIM's own pan claims a touch (see SearchPullSurface).
 *
 * Deliberately larger than `SEARCH_PULL_ACTIVATE_DY`, which would be actively
 * wrong here: the scrim's primary job is a full-screen tap that dismisses, and 6
 * sits UNDER Android's ~8dp touch slop — so an ordinary tap with a little finger
 * drift would activate the pan, cancel the press, and settle straight back where
 * it started, i.e. do nothing at all. The page's pull has no such conflict (it
 * competes with a scroller, not a tap) and stays as tight as it can be.
 */
export const SEARCH_PULL_SCRIM_ACTIVATE_DY = 14;

/**
 * How far the surface (tray + field) is held ABOVE its resting position while
 * parked — far enough to clear the status bar plus a margin, so nothing peeks at
 * rest. Reaches 0 at a full peek. Same idea as the old drawer's hide-translate,
 * but now it's the offset of a real overlay layer, not a scroll park.
 */
export const SEARCH_PULL_HIDE_TRANSLATE = -(
    HOME_SCENE_TOP_INSET +
    HOME_SEARCH_DRAWER_PADDING +
    HOME_SEARCH_FIELD_HEIGHT +
    24
);

/**
 * How much further the seated bar drifts while stage two is being dragged in.
 * Small on purpose: once the bar is seated it has arrived, and the travel from
 * there belongs to the search screen coming in behind it — not to the bar
 * sliding further down the display.
 */
export const SEARCH_PULL_OVERSHOOT_DIP = 6;

/**
 * The open/peek spring. Critically damped (ζ = 1: damping = 2·√(stiffness·mass))
 * — the fastest a spring can land WITHOUT oscillating. No bounce, no wobble, no
 * "boing": the bar arrives and stops.
 *
 * ω₀ = √240 = 15.5 rad/s BEFORE, which is where the mush came from. A critically
 * damped spring approaches asymptotically, so 1% of travel takes ~6.6/ω₀ — 430ms,
 * of which the last ~150ms is invisible sub-pixel crawl that still charges a full
 * blur + composite to every frame it occupies. Every release in the whole surface
 * ran on that. ω₀ = √520 = 22.8 puts the same landing at ~290ms, which is where
 * Android's own shade settles.
 *
 * `overshootClamping` IS WHAT LETS THE RELEASE KEEP ITS VELOCITY. The old comment
 * here said velocity must not be injected because it would carry the surface past
 * the rest line and back — true of a bare critically damped spring, and the
 * reason the call sites threw the finger's momentum away and re-accelerated from
 * a dead stop. That discontinuity at the instant of release is the single
 * loudest "this is not a native surface" tell there is. Clamping resolves it
 * properly: the spring takes the momentum, travels continuously, and STOPS at the
 * target instead of passing it. Landing hard on a detent is what a detent does.
 */
export const SEARCH_PULL_OPEN_SPRING: WithSpringConfig = {
    damping: 45.6,
    mass: 1,
    overshootClamping: true,
    stiffness: 520,
};

/**
 * Reveal past which the full-search overlay is MOUNTED (still invisible). It
 * mounts early, during the slack of stage one, so the one render it costs lands
 * while the bar is still sliding rather than at the moment stage two begins —
 * a mid-gesture mount at the threshold would hitch exactly where the motion has
 * to be smoothest. From there its opacity is pure UI-thread interpolation.
 */
export const SEARCH_PULL_MOUNT_AT = 0.35;

/**
 * Reveal below which a live IME control session is HANDED BACK mid-gesture, so
 * the next crossing back down starts a fresh one.
 *
 * Below `SEARCH_PULL_MOUNT_AT`, and the gap between them is the point: it is a
 * hysteresis band, so a thumb hovering around the arming threshold cannot
 * finish/request/finish the session once a frame. The system takes 135–265ms to
 * grant control; thrashing it guarantees a gesture drives a controller that no
 * longer exists.
 *
 * Without a release at all — which is how this started — `hasRequestedIme`
 * latched for the whole gesture. Drag down past the seat, back up, and down
 * again and the second descent silently drove a dead controller: the flag said a
 * session was held, so nothing re-requested, and every `setFraction` went
 * nowhere. The keyboard simply stopped answering from the second crossing on.
 */
export const SEARCH_PULL_IME_RELEASE_AT = 0.2;

/**
 * The retract spring: critically damped too, so putting search away is quick and
 * quiet. This one takes the release velocity and is deliberately NOT clamped — it
 * targets 0, which sits off the top of the screen, so any overshoot happens out
 * of sight and clamping would only cut the throw short where nobody can see it.
 */
export const SEARCH_PULL_SETTLE_SPRING: WithSpringConfig = {
    damping: 47.3,
    mass: 1,
    stiffness: 560,
};

/**
 * How far the full-search panel settles DOWN into place across stage two.
 *
 * A SETTLE, NOT A DRAG, and the difference is the whole tuning of this value.
 *
 * This was briefly `SEARCH_PULL_COMMIT_SPAN` — 150, so the panel tracked the
 * thumb at exactly 1:1 and the hand-off at the seat was continuous in the
 * arithmetic sense: stage one moves the tray at ~0.97:1, stage two picked the
 * motion straight up at 1.0:1, and something was moving at finger speed from the
 * first pixel of the drag to the last.
 *
 * IT LOOKED WRONG ANYWAY, and the reason is worth keeping. What travels in stage
 * two is a list of rows, and a list of rows moving 150px vertically is
 * indistinguishable from a scroll — because that is what a scroll IS. Continuity
 * of velocity was the wrong thing to optimise: it bought a smooth derivative and
 * paid for it with a false affordance, which reads as the content having been
 * dragged rather than the screen having arrived. The eye does not measure
 * velocity; it recognises gestures.
 *
 * At this distance the same motion reads as the panel seating itself. Set it to 0
 * for a pure dissolve with no travel at all — nothing else depends on it being
 * non-zero.
 */
export const SEARCH_PULL_ARRIVAL_TRAVEL = 0;

/**
 * Reveal by which the arriving panel has finished fading and is fully opaque.
 *
 * Short, and short for two reasons. The panel is a real translucent slab that
 * SLIDES in now, so the fade is only there to keep its edge from popping into
 * existence at the seat — the motion is what sells the arrival, not the
 * dissolve. And a full-screen view at fractional alpha forces Android to
 * composite the whole thing through an offscreen layer on every frame it is not
 * at 0 or 1; ending the fade here leaves ~70% of stage two at alpha 1, where that
 * layer is not allocated at all.
 */
export const SEARCH_PULL_ARRIVAL_OPAQUE_AT = 1.35;

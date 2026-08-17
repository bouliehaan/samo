/**
 * The search pull-down's feel, as pure arithmetic — no React, no Reanimated, no
 * RN imports, so it runs unchanged on the UI thread (each function is a worklet)
 * AND in the vitest suite. This is where the two-threshold hybrid lives: a
 * gentle over-pull peeks a resting bar, a longer/faster pull commits straight
 * into full search.
 *
 * Extracted for the same reason the old drawer's settle was: the values that
 * decide how the gesture feels are the ones most worth pinning down in tests,
 * and the ONE thing this must never do is fight a scroller — it doesn't touch
 * the scroll at all, it only maps finger travel to a spring target. (The old
 * `search-drawer-settle.ts` existed to dodge an ANR from re-entrant
 * `scrollTo`s; nothing here issues a programmatic scroll, so that whole class
 * of bug is gone by construction.)
 */

/** iOS-style rubber band: the further you pull, the less it gives. `distance`
 *  and the returned eased distance are in the same units; `dimension` sets the
 *  scale at which resistance ramps. */
export const rubberBand = (distance: number, dimension: number, constant = 0.55): number => {
    'worklet';
    if (distance <= 0 || dimension <= 0) {
        return 0;
    }
    return (1 - 1 / ((distance * constant) / dimension + 1)) * dimension;
};

/**
 * Finger travel → reveal, on a TWO-STAGE scale:
 *
 *   0     parked
 *   0→1   the bar slides down and seats at its rest line
 *   1→2   the full search screen arrives, driven by the same continuing drag
 *   2     search fully open
 *
 * The second stage is the whole point. Previously the pull only ever drove the
 * bar, and whether you also got the keyboard was decided silently at release
 * from how far you happened to have travelled — so the outcome was invisible
 * until your finger was already off the glass, and there was no way to change
 * your mind. Mapping stage two onto continued travel makes it a thing you WATCH
 * happen and can reverse: drag further and search keeps arriving, drag back and
 * it recedes, and where you let go is what you already saw.
 *
 * Past 2 the rubber band gives a token amount so the end of travel isn't a wall.
 */
export const pullReveal = (
    translationY: number,
    peekDistance: number,
    commitSpan: number,
    overshootCap = 0.1,
): number => {
    'worklet';
    if (translationY <= 0 || peekDistance <= 0) {
        return 0;
    }
    if (translationY <= peekDistance) {
        return translationY / peekDistance;
    }
    if (commitSpan <= 0) {
        return 1;
    }
    const past = translationY - peekDistance;
    if (past <= commitSpan) {
        return 1 + past / commitSpan;
    }
    const extra = rubberBand(past - commitSpan, commitSpan) / commitSpan;
    return 2 + Math.min(extra, overshootCap);
};

/**
 * Reveal → finger travel: the exact inverse of `pullReveal` across the two
 * linear stages (the rubber-banded overshoot past 2 has no inverse and clamps).
 *
 * This is what lets a drag START from a settled surface instead of always from
 * parked. The seated bar is a resting position users pull FURTHER from — and
 * back out of — so a pan that begins there has to convert where the surface
 * already is into the travel that would have put it there, add its own
 * translation, and run the result back through `pullReveal`. Doing it that way
 * rather than with a second mapping is what keeps one continuous drag and a
 * drag resumed after a release feeling like the same motion at the same rate.
 */
export const revealTravel = (reveal: number, peekDistance: number, commitSpan: number): number => {
    'worklet';
    if (reveal <= 0) {
        return 0;
    }
    if (reveal <= 1) {
        return reveal * peekDistance;
    }
    return peekDistance + Math.min(reveal - 1, 1) * commitSpan;
};

/**
 * Release velocity in px/s → the same velocity on the REVEAL scale, ready to hand
 * to a spring that animates `pull`.
 *
 * Needed because the two stages have different gearing: one reveal unit is
 * `peekDistance` px of finger in stage one and `commitSpan` px in stage two, so a
 * single divisor would misreport the throw by that ratio on one side of the seat
 * or the other. Every release site used to divide by `peekDistance` unconditionally
 * — including the ones resolving from deep inside stage two.
 *
 * This exists at all because a spring that starts from ZERO velocity when the
 * finger was still moving is the thing that makes a surface feel simulated rather
 * than physical. The hand lets go at 900px/s and the object it was pushing stops
 * dead and then re-accelerates; no real object does that, and no native surface
 * does either.
 */
export const revealVelocity = (
    velocityY: number,
    reveal: number,
    peekDistance: number,
    commitSpan: number,
): number => {
    'worklet';
    const scale = reveal >= 1 ? commitSpan : peekDistance;
    if (scale <= 0) {
        return 0;
    }
    return velocityY / scale;
};

export type PullRelease = 'commit' | 'peek' | 'retract';

export interface PullReleaseInput {
    /** Current reveal on the two-stage scale (see `pullReveal`). */
    reveal: number;
    /** Vertical release velocity in px/s (down is positive). */
    velocityY: number;
    /** Reveal at or past which the release completes into full search. */
    commitAt: number;
    /** Reveal at or past which the release leaves the bar resting open. */
    peekAt: number;
    /** Downward velocity (px/s) of a deliberate FLING, which skips the peek and
     *  carries straight through to full search from anywhere past `skipAt`. */
    skipVelocity: number;
    /** Reveal the fling must ALREADY have reached before its velocity is allowed
     *  to skip the peek. Its own gate, well clear of `peekAt`: a fast twitch that
     *  has barely moved the bar is not a gesture that meant full search. */
    skipAt: number;
    /** Downward velocity that carries the release on to the next stage. */
    flingVelocity: number;
    /**
     * UPWARD speed (a positive magnitude; compared against a negative
     * `velocityY`) at or past which the release throws the surface away from
     * wherever it had got to.
     *
     * Velocity is barred from deciding COMMIT for a good reason — see below —
     * and it is tempting to apply that symmetrically. It would be wrong.
     * Committing on speed hands you a screen you never asked for, so it needs a
     * position you actually saw. Throwing something UP and off the top of the
     * display is not ambiguous and cannot mean anything else, so it is allowed
     * to win from any position, including from most of the way into search.
     */
    dismissVelocity: number;
}

/**
 * Where a release lands: retract, rest at the bar, or complete into full search.
 *
 * Decided on REVEAL, not raw finger travel, because reveal is what the user was
 * looking at. Whatever state the screen had reached under their thumb is the
 * state they get — the release resolves what they can already see rather than
 * re-deriving an outcome from a distance they were never shown. Anything else
 * is a hidden threshold, and a hidden threshold is why this needed a buzz to
 * announce itself.
 */
export const resolvePullRelease = ({
    reveal,
    velocityY,
    commitAt,
    peekAt,
    flingVelocity,
    skipAt,
    skipVelocity,
    dismissVelocity,
}: PullReleaseInput): PullRelease => {
    'worklet';
    if (reveal <= 0) {
        return 'retract';
    }
    /*
     * A THROW UPWARD WINS FROM ANYWHERE, and it is checked first.
     *
     * Every other rule here reads only DOWNWARD velocity, so there was no rule
     * at all for putting the surface away with a flick — an upward throw fell
     * all the way through to `reveal >= peekAt` below, and peekAt is 0.28. So
     * half-opening the surface and then swiping it briskly away left the bar
     * SEATED: the gesture that most obviously means "get rid of this" was read
     * as "rest it here", and the harder it was thrown the more certainly,
     * because the finger never got near reveal 0 before release.
     *
     * Position cannot answer this on its own. Where the surface happens to be
     * at the instant of release is a poor description of a throw — the whole
     * character of the gesture is in its direction and speed, and the user has
     * already stopped looking at the position by then.
     */
    if (velocityY <= -dismissVelocity) {
        return 'retract';
    }
    /*
     * Commit is decided by POSITION ALONE. Velocity gets no vote here, ever.
     *
     * This previously also committed on `reveal > 1 && velocityY >= flingVelocity`,
     * and flingVelocity is 1200px/s — an utterly ordinary drag speed. So merely
     * crossing the seat while still moving threw you into full search, which made
     * the peek impossible to land on: the bar you were trying to rest at was the
     * thing you had to stop exactly on top of.
     *
     * A velocity term is a hidden input by definition — you cannot see how fast
     * you are moving, only where you are. Where the screen got to under your
     * thumb is the only thing you were shown, so it is the only thing allowed to
     * decide what you get.
     */
    if (reveal >= commitAt) {
        return 'commit';
    }
    /*
     * Velocity's ONE job: a deliberate FLING skips the peek and carries straight
     * through. `skipVelocity` sits above any incidental drag speed, which is the
     * whole difference from the old rule — that used `flingVelocity` (1200, an
     * ordinary drag), so merely crossing the seat while still moving threw you
     * into full search and made the resting bar impossible to land on.
     *
     * Gated on `skipAt`, NOT on `peekAt`. Sharing the peek's gate meant a flick
     * that had moved the bar 39px — a twitch, over in under two frames — could
     * commit, while the same flick a hair slower rested. Two different outcomes
     * from gestures the hand cannot tell apart is the definition of unreliable,
     * and it is why this fired when it wasn't wanted and missed when it was.
     */
    if (velocityY >= skipVelocity && reveal >= skipAt) {
        return 'commit';
    }
    // Enough of the bar showing, or a gentle downward flick, leaves it resting.
    if (reveal >= peekAt || velocityY >= flingVelocity * 0.4) {
        return 'peek';
    }
    return 'retract';
};

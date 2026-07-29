import { describe, expect, it } from 'vitest';

import { pullReveal, resolvePullRelease, revealTravel, rubberBand } from './search-pull-physics';

// Mirrors of the shipped values in `search-pull-constants.ts`. They are copied
// rather than imported ON PURPOSE: that module reaches into `theme/layout` for
// the hide-translate, which pulls in React Native, whose Flow syntax vitest
// cannot parse. Keeping this module RN-free is what lets the same code run on
// the UI thread as a worklet AND under test. Keep these in sync by hand.
const PEEK = 140;
const SPAN = 150;
const COMMIT_AT = 1.62;
const PEEK_AT = 0.28;
const FLING = 1200;
const SKIP = 2000;
const SKIP_AT = 0.5;
const DISMISS = 900;

const reveal = (translationY: number) => pullReveal(translationY, PEEK, SPAN);
const travel = (revealValue: number) => revealTravel(revealValue, PEEK, SPAN);

const release = (revealValue: number, velocityY = 0) =>
    resolvePullRelease({
        commitAt: COMMIT_AT,
        dismissVelocity: DISMISS,
        flingVelocity: FLING,
        peekAt: PEEK_AT,
        reveal: revealValue,
        skipAt: SKIP_AT,
        skipVelocity: SKIP,
        velocityY,
    });

describe('rubberBand', () => {
    it('gives nothing at or below zero', () => {
        expect(rubberBand(0, PEEK)).toBe(0);
        expect(rubberBand(-40, PEEK)).toBe(0);
    });

    it('is monotonic but sub-linear — further pulls give diminishing travel', () => {
        const near = rubberBand(20, PEEK);
        const far = rubberBand(200, PEEK);
        expect(far).toBeGreaterThan(near);
        // Ten times the pull yields far less than ten times the give.
        expect(rubberBand(200, PEEK)).toBeLessThan(rubberBand(20, PEEK) * 10);
    });
});

describe('pullReveal', () => {
    it('is parked with no pull', () => {
        expect(reveal(0)).toBe(0);
        expect(reveal(-30)).toBe(0);
    });

    it('stage one: tracks the finger until the bar seats at 1', () => {
        expect(reveal(PEEK / 2)).toBeCloseTo(0.5, 5);
        expect(reveal(PEEK)).toBeCloseTo(1, 5);
    });

    it('stage two: keeps tracking the finger from the seat to full search', () => {
        expect(reveal(PEEK + SPAN / 2)).toBeCloseTo(1.5, 5);
        expect(reveal(PEEK + SPAN)).toBeCloseTo(2, 5);
    });

    it('is strictly monotonic across BOTH stages — no dead zone anywhere', () => {
        // Every step of the pull must move the screen. A stretch where the finger
        // travels and nothing changes is what forces a threshold to announce
        // itself with a buzz instead of just being visible.
        let previous = -1;
        for (let travel = 0; travel <= PEEK + SPAN; travel += 6) {
            const current = reveal(travel);
            expect(current).toBeGreaterThan(previous);
            previous = current;
        }
    });

    it('resists past full search and never runs away', () => {
        const over = reveal((PEEK + SPAN) * 3);
        expect(over).toBeGreaterThan(2);
        expect(over).toBeLessThanOrEqual(2.1 + 1e-9);
    });
});

describe('resolvePullRelease', () => {
    it('retracts a pull that never really started', () => {
        expect(release(0)).toBe('retract');
        expect(release(0.2)).toBe('retract');
    });

    it('rests the bar for a stage-one release', () => {
        expect(release(1)).toBe('peek');
        expect(release(PEEK_AT)).toBe('peek');
    });

    it('throws the surface away on an upward fling, from ANY position', () => {
        // The reported bug: half-open it, then swipe it briskly away, and the
        // bar stayed seated. Every rule read downward velocity only, so an
        // upward throw fell through to `reveal >= peekAt` (0.28) and rested.
        expect(release(0.6, -DISMISS)).toBe('retract');
        expect(release(1.4, -2500)).toBe('retract');
        // Including from most of the way into search: a throw is not ambiguous,
        // so it outranks even the commit position.
        expect(release(1.9, -2500)).toBe('retract');
        expect(release(2, -DISMISS)).toBe('retract');
    });

    it('still resolves a SLOW back-out on position, not on direction', () => {
        // Drifting upward as the finger leaves is not a throw. Below the
        // dismissal speed the position rules stand, so backing the surface out
        // gently still rests it where the user could see it.
        expect(release(1.2, -300)).toBe('peek');
        expect(release(0.9, -(DISMISS - 1))).toBe('peek');
    });

    it('rests the bar on a gentle downward flick even below the bar', () => {
        expect(release(0.2, FLING * 0.5)).toBe('peek');
    });

    it('completes into search once stage two is half done', () => {
        expect(release(COMMIT_AT)).toBe('commit');
        expect(release(2)).toBe('commit');
    });

    it('does not let an ORDINARY drag speed commit', () => {
        // The old rule committed at flingVelocity (1200) — an everyday drag —
        // so the resting bar was impossible to land on.
        expect(release(1.2, FLING)).toBe('peek');
        expect(release(1.49, FLING * 1.5)).toBe('peek');
    });

    it('lets a deliberate FLING skip the peek entirely', () => {
        expect(release(0.6, SKIP)).toBe('commit');
        expect(release(1.2, SKIP)).toBe('commit');
    });

    it('will not let a fling commit from a pull that barely moved', () => {
        expect(release(0.1, SKIP * 3)).toBe('peek');
        // The skip has its OWN position gate, well clear of the peek's. Sharing
        // `peekAt` (0.28) let a twitch of some 39px throw you into full search if
        // it happened to be fast, while the same twitch a shade slower rested —
        // two outcomes the hand cannot tell apart.
        expect(release(PEEK_AT, SKIP * 2)).toBe('peek');
        expect(release(SKIP_AT - 0.01, SKIP * 2)).toBe('peek');
        expect(release(SKIP_AT, SKIP)).toBe('commit');
    });

    it('skips at a velocity a thumb can actually produce', () => {
        // Has to clear an ordinary drag (the 1.5x-FLING case above rests) and
        // still sit inside what a real flick reaches — 3200 did not, and the
        // skip simply never fired.
        expect(SKIP).toBeGreaterThan(FLING * 1.5);
        expect(SKIP).toBeLessThan(3200);
    });

    it('backs out to the bar when stage two is barely begun', () => {
        expect(release(1.1)).toBe('peek');
    });

    it('never commits on an upward release, however fast', () => {
        expect(release(0, -5000)).toBe('retract');
    });

    it('retracts a drag the finger backed out of, rather than seating it', () => {
        /*
         * The regression this pins down. The release used to be resolved against
         * the animated `pull` value — which, for a drag backed out past its own
         * origin, was a spring already in flight toward 0. Sampling it mid-flight
         * reported ~1.3 for a search screen the user had just dragged completely
         * away, resolved `peek`, and slammed the bar back onto its seat: the
         * "dismissing search only dismisses it to the peek" report.
         *
         * Composed the way the gesture composes it — `pullReveal` on the
         * RELEASE'S own translation — a backed-out drag is 0 travel, and 0 is the
         * one input that can only ever retract, at any velocity.
         */
        expect(release(reveal(-40), -900)).toBe('retract');
        expect(release(reveal(0), 900)).toBe('retract');
    });

    it('only ever resolves to one of the three known outcomes', () => {
        const cases: Array<[number, number]> = [
            [0, 0],
            [2.1, 5000],
            [1, 0],
            [0.05, -2000],
            [1.49, 0],
        ];
        for (const [value, velocity] of cases) {
            expect(['commit', 'peek', 'retract']).toContain(release(value, velocity));
        }
    });
});

/**
 * `revealTravel` is what lets a drag resume from a settled surface instead of
 * always from parked, so its ONE contract is that it round-trips `pullReveal`
 * exactly: pick the surface up where it rests, add no travel, and nothing may
 * move.
 */
describe('revealTravel', () => {
    it('round-trips pullReveal across both stages', () => {
        for (const value of [0, 0.28, 0.5, 1, 1.3, 1.62, 2]) {
            expect(reveal(travel(value))).toBeCloseTo(value, 5);
        }
    });

    it('resuming a drag from rest starts exactly where the surface is', () => {
        // The first frame of a scrim drag: zero translation must be a no-op, or
        // grabbing the seated bar would jump it before it moved.
        for (const base of [1, 2]) {
            expect(reveal(travel(base) + 0)).toBeCloseTo(base, 5);
        }
    });

    it('carries a resumed drag at the same rate as the original', () => {
        // Half of stage two, whether you got there in one gesture or two.
        expect(reveal(travel(1) + SPAN / 2)).toBeCloseTo(reveal(PEEK + SPAN / 2), 5);
    });

    it('walks a settled surface back off the top', () => {
        expect(reveal(travel(2) - SPAN)).toBeCloseTo(1, 5);
        expect(reveal(travel(2) - SPAN - PEEK)).toBe(0);
        expect(reveal(travel(1) - PEEK)).toBe(0);
    });

    it('clamps rather than inverting the rubber-banded overshoot', () => {
        // Past 2 the reveal is eased, so there is no travel that produced it;
        // the inverse must stop at the end of the real span instead of running on.
        expect(travel(2.1)).toBe(travel(2));
        expect(travel(-1)).toBe(0);
    });
});

/**
 * The tuning values are only correct in RELATION to each other, and the release
 * thresholds have to sit inside the range the drag can actually reach.
 */
describe('tuning relationships', () => {
    it('puts every release threshold somewhere the finger can actually land', () => {
        expect(PEEK_AT).toBeGreaterThan(0);
        expect(PEEK_AT).toBeLessThan(1);
        expect(COMMIT_AT).toBeGreaterThan(1);
        expect(COMMIT_AT).toBeLessThan(2);
    });

    it('keeps the fling skip clear of the peek at BOTH of its gates', () => {
        // Velocity and position together are what make the skip a gesture you
        // meant. Let either collapse onto the peek's own threshold and the two
        // outcomes become indistinguishable to the hand.
        expect(SKIP_AT).toBeGreaterThan(PEEK_AT);
        expect(SKIP_AT).toBeLessThan(1);
        expect(SKIP).toBeGreaterThan(FLING);
    });

    it('reaches full search within one thumb stroke', () => {
        // Total travel to a completing release, in px. Deliberately a real
        // stroke: stage two is visible the whole way, so length here reads as
        // deliberate rather than as distance to guess at.
        const travelToCommit = PEEK + SPAN * (COMMIT_AT - 1);
        expect(travelToCommit).toBeLessThanOrEqual(240);
    });
});

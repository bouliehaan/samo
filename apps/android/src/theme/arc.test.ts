import { describe, expect, it } from 'vitest';

import { ARC_LEAD_SPRING, ARC_TRAIL_SPRING, arcSprings } from './arc';

describe('arcSprings', () => {
    it('gives the lead spring to the axis with further to travel', () => {
        const wide = arcSprings(200, 40);
        expect(wide.x).toBe(ARC_LEAD_SPRING);
        expect(wide.y).toBe(ARC_TRAIL_SPRING);

        const tall = arcSprings(40, 200);
        expect(tall.x).toBe(ARC_TRAIL_SPRING);
        expect(tall.y).toBe(ARC_LEAD_SPRING);
    });

    it('decides on magnitude, not direction', () => {
        // A throw up-and-left must arc the same way as the same throw
        // down-and-right, or opposite corners feel like different physics.
        for (const [dx, dy] of [
            [200, 40],
            [-200, 40],
            [200, -40],
            [-200, -40],
        ] as const) {
            expect(arcSprings(dx, dy).x).toBe(ARC_LEAD_SPRING);
        }
    });

    it('breaks a 45-degree tie toward x, deterministically', () => {
        // No dominant axis. Any consistent answer beats a float coin flip.
        expect(arcSprings(120, 120).x).toBe(ARC_LEAD_SPRING);
        expect(arcSprings(120, 120).y).toBe(ARC_TRAIL_SPRING);
        expect(arcSprings(-90, 90).x).toBe(ARC_LEAD_SPRING);
    });

    it('never puts the same spring on both axes', () => {
        // Identical springs on both axes IS the straight diagonal this exists
        // to remove, so it must be unreachable for any input.
        for (const [dx, dy] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [5, 5],
            [-300, 12],
            [0.0001, 0.0002],
        ] as const) {
            const { x, y } = arcSprings(dx, dy);
            expect(x).not.toBe(y);
        }
    });

    it('holds a single-axis move to a straight line by giving it the lead', () => {
        // Pure vertical/horizontal must not bow — the trailing axis has zero
        // distance, so which spring it gets is unobservable, but the axis that
        // actually moves has to be the one that leads or the move feels slack.
        expect(arcSprings(0, 300).y).toBe(ARC_LEAD_SPRING);
        expect(arcSprings(300, 0).x).toBe(ARC_LEAD_SPRING);
    });

    it('keeps the two springs close enough to read as one object', () => {
        // Far apart and it stops being an arc and becomes two things landing
        // near each other. Stiffness ratio is the knob; keep it under 2x.
        const ratio = ARC_LEAD_SPRING.stiffness / ARC_TRAIL_SPRING.stiffness;
        expect(ratio).toBeGreaterThan(1);
        expect(ratio).toBeLessThan(2);
        // The trail must not be underdamped relative to the lead, or it wobbles
        // in after arriving and the curve turns into a bounce.
        expect(ARC_TRAIL_SPRING.damping).toBeGreaterThanOrEqual(ARC_LEAD_SPRING.damping);
    });
});

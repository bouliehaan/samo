/**
 * Arc — Disney's seventh principle. See docs/MOTION_PRINCIPLES.md.
 *
 * "Living things move on curved paths. Only machinery travels in straight lines."
 *
 * THE PROBLEM THIS EXISTS TO SOLVE
 *
 * Everywhere in this app that a surface moves on ONE axis, a straight line is
 * correct — a sheet rising from the bottom edge has no business curving, and
 * bending it would read as drift, not life.
 *
 * The moment it stops being correct is a DIAGONAL. When something travels in
 * both x and y at once and both axes run the same curve, the result is a
 * perfectly straight diagonal, which is the one path nothing in the physical
 * world takes. Throw something across a room and it does not travel on a ruler.
 *
 * AN ARC IS TWO EASED CHANNELS, NOT A PATH
 *
 * This matters because of the 60fps contract in motion.ts: we may only animate
 * `transform` and `opacity`. Following a real parametric curve would mean
 * recomputing a position every frame off a path function — fine on the UI
 * thread, but unnecessary. Give the two axes DIFFERENT curves and the bow falls
 * out for free: while x is most of the way home and y has barely started, the
 * point is off the straight line between start and end. That displacement is
 * the arc.
 *
 * WHICH AXIS LEADS
 *
 * The axis with further to travel leads. That is how a thrown object behaves —
 * it commits to the direction it was thrown and the smaller component resolves
 * late — and it means the bow always opens the same way relative to the motion,
 * so two dismissals from opposite corners feel like the same physics rather
 * than two unrelated animations.
 *
 * Ties go to x. A perfectly 45° throw has no dominant axis, and picking either
 * consistently beats picking one at random on a floating-point coin flip.
 */

/**
 * The axis with further to go. Reaches its target early and decelerates hard,
 * so it is already resolving while the other axis is still winding up.
 */
export const ARC_LEAD_SPRING = { damping: 26, mass: 1, stiffness: 300 } as const;

/**
 * The trailing axis. Softer and slower — it arrives late, and the gap between
 * the two arrival times is what the eye reads as a curve.
 *
 * Kept close to the lead on purpose. Push them far apart and the motion stops
 * reading as one object on a curved path and starts reading as two independent
 * things that happen to finish near each other.
 */
export const ARC_TRAIL_SPRING = { damping: 30, mass: 1, stiffness: 210 } as const;

export type ArcSpring = typeof ARC_LEAD_SPRING | typeof ARC_TRAIL_SPRING;

/**
 * Assign the lead and trail springs to x and y for a move of (dx, dy).
 *
 * `dx`/`dy` are the DISTANCES REMAINING, in any consistent unit — sign is
 * irrelevant, only magnitude decides which axis leads.
 */
export function arcSprings(dx: number, dy: number): { x: ArcSpring; y: ArcSpring } {
    'worklet';
    const xLeads = Math.abs(dx) >= Math.abs(dy);
    return {
        x: xLeads ? ARC_LEAD_SPRING : ARC_TRAIL_SPRING,
        y: xLeads ? ARC_TRAIL_SPRING : ARC_LEAD_SPRING,
    };
}

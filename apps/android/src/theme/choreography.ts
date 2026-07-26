import { Easing, Extrapolation, interpolate } from 'react-native-reanimated';

/**
 * Choreography — overlapping action for surfaces made of more than one part.
 *
 * THE PROBLEM THIS EXISTS TO SOLVE
 *
 * Every entrance in this app was a rigid slab: one opacity and one translateY
 * on the root view, so a detail page's cover, its title, its buttons and its
 * fifty track rows all started moving on the same frame, travelled the same
 * distance at the same speed, and stopped together. Nothing in the physical
 * world moves like that. It is the single reason a transition can be perfectly
 * smooth — never drop a frame — and still read as cheap: the eye has no
 * hierarchy to follow, so the whole screen arrives as one flat card rather than
 * as an object with parts.
 *
 * The fix is Disney's fifth principle, follow-through and overlapping action:
 * the heavy thing leads, and the light things attached to it lag, then catch
 * up. A hand moves before the fingers; the cloth arrives last. Applied to a
 * screen: the cover art is the mass, so it leads and travels LEAST; the title
 * is lighter, so it starts later and travels further; the rows are lightest and
 * cascade in behind everything.
 *
 * HOW THIS STAYS AT 60FPS
 *
 * The naive way to stagger is one animation per part with `withDelay`. Twelve
 * parts means twelve animation drivers, twelve springs being integrated every
 * frame, and twelve chances for them to drift out of phase if the JS thread
 * hitches while they are being scheduled.
 *
 * Instead there is exactly ONE animated value per surface — a linear clock
 * running 0→1 — and each part derives its own local progress from it with
 * `stage()`, a pure worklet doing one clamp and one interpolate. Twelve parts
 * cost one animation and twelve trivial arithmetic worklets, all on the UI
 * thread. Adding parts is free; nothing can drift, because there is only one
 * source of time.
 *
 * The clock is deliberately LINEAR. Easing belongs to each stage, applied to
 * its own local 0→1 — ease the master clock instead and every later stage
 * inherits a distorted velocity profile, so parts that should arrive gently
 * slam in at whatever speed the master happened to be travelling when their
 * window opened.
 */

/**
 * Total wall-clock of a choreographed entrance.
 *
 * Longer than a plain screen transition because the LAST part has to land
 * inside it — but the part that confirms the tap (the lead) is fully home at
 * `LEAD` × this, ≈200ms, which is the same moment a rigid entrance finished.
 * The user's sense of "it responded" is unchanged; only the richness after it
 * is new. This is the trade the whole module rests on, so do not lengthen it
 * casually: past ~400ms the assembly stops reading as physics and starts
 * reading as waiting.
 */
export const CHOREOGRAPHY_MS = 320;

/**
 * Stage windows, as normalized [start, end] slices of the master clock.
 *
 * They OVERLAP on purpose — that overlap IS the overlapping action. Sequential,
 * non-overlapping windows produce a mechanical one-two-three march; parts whose
 * windows overlap read as one connected body whose pieces have different mass.
 */
export const stages = {
    /** The heavy element — cover art, hero image. Leads, and travels least. */
    lead: [0, 0.62] as const,
    /** Titles and metadata hanging off the lead. */
    follow: [0.12, 0.78] as const,
    /** Buttons, chips, controls — lightest of the fixed parts. */
    trail: [0.22, 0.88] as const,
    /** Where a list cascade begins, once the fixed parts are underway. */
    cascade: 0.3,
} as const;

/**
 * Travel distances per stage, in dp.
 *
 * They INCREASE down the hierarchy, which is the counter-intuitive half of the
 * physics: the heavy part is the one being driven, so it barely displaces,
 * while the light parts trailing off it whip further. Give every part the same
 * displacement and the mass hierarchy disappears no matter how you time it.
 */
export const stageTravel = {
    lead: 10,
    follow: 18,
    trail: 24,
    cascade: 20,
} as const;

/**
 * A single stage's own eased 0→1, carved out of the master clock.
 *
 * Before its window it is 0 (parked, invisible); after, 1 (at rest). Inside, it
 * runs its own ease-out — fast off the mark, gently arriving — so each part has
 * a complete, well-shaped motion of its own rather than a slice of someone
 * else's curve.
 */
export function stage(clock: number, window: readonly [number, number]): number {
    'worklet';
    const local = interpolate(clock, [window[0], window[1]], [0, 1], Extrapolation.CLAMP);
    // Cubic ease-out, inlined: this runs per part per frame on the UI thread,
    // and Easing.out(Easing.cubic) allocates a factory call to do the same
    // arithmetic. `1-(1-t)³`.
    const inv = 1 - local;
    return 1 - inv * inv * inv;
}

/**
 * The nth list item's window in the cascade.
 *
 * CAPPED, and that cap is load-bearing. An uncapped cascade over a 400-track
 * album puts row 300 eighteen seconds into the future — it would still be
 * fading in long after the user started scrolling, and every one of those rows
 * would hold a pending animation. Past `CASCADE_MAX` every row shares the last
 * window and simply arrives with it. Nobody sees the difference, because those
 * rows are far below the fold; what it buys is a cascade whose cost is bounded
 * no matter how long the list is.
 */
export const CASCADE_MAX = 8;
/** Gap between consecutive rows, as a fraction of the master clock. */
const CASCADE_STEP = 0.055;
/** How much of the clock a single row's own motion occupies. */
const CASCADE_SPAN = 0.34;

export function cascadeWindow(index: number): readonly [number, number] {
    'worklet';
    const capped = index < CASCADE_MAX ? index : CASCADE_MAX;
    const start = stages.cascade + capped * CASCADE_STEP;
    // Clamped to 1 so the last rows still finish inside the clock rather than
    // freezing part-way when it stops.
    const end = start + CASCADE_SPAN;
    return [start, end > 1 ? 1 : end] as const;
}

/** The master clock's easing — linear, deliberately. See the module note. */
export const CHOREOGRAPHY_EASING = Easing.linear;

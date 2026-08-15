/**
 * Where a long-form item — a podcast episode or an audiobook — should START
 * when the listener plays it again.
 *
 * Resume is the whole point of long-form playback, right up until the item is
 * over. An episode you listened all the way through is not "paused 8 seconds
 * from the end"; it is finished, and pressing play on it means play it. People
 * re-listen to favourites constantly (the same episode every night to fall
 * asleep), and dropping them at the outro every time makes a finished episode
 * effectively unplayable without scrubbing back by hand.
 *
 * Two signals say "over", and both are needed:
 *
 *  - `completed`, which the progress writer asserts on a natural end. Exact
 *    when it lands.
 *  - Near the end, for when it doesn't: the app was killed during the last
 *    minute, the listen finished on a client that never set the flag, or the
 *    stored position predates the flag entirely. Without this, those rows
 *    resume at the outro forever.
 *
 * The near-end window scales with length — a fixed one is either too coarse for
 * a five-minute episode or too fine for a twelve-hour book — and is clamped at
 * both ends so it stays sane for extremes.
 */

const NEAR_END_MINIMUM_SECONDS = 30;
const NEAR_END_MAXIMUM_SECONDS = 120;

/** The trailing window of `durationSeconds` that counts as "at the end". */
export const longFormNearEndWindowSeconds = (durationSeconds: number): number =>
    Math.min(
        NEAR_END_MAXIMUM_SECONDS,
        Math.max(NEAR_END_MINIMUM_SECONDS, durationSeconds * 0.02),
    );

export interface LongFormResumeInput {
    /** The progress writer's explicit end-of-item assertion, when known. */
    completed?: boolean;
    durationSeconds?: number;
    progressSeconds?: number;
}

/**
 * The start position for the next play, in whole seconds. `0` means "from the
 * top" — which is the answer for an unplayed item and a FINISHED one alike.
 *
 * A duration is optional: without one the near-end test can't run and only the
 * `completed` flag applies. Callers that have a duration should pass it.
 */
export const resolveLongFormResumeSeconds = ({
    completed,
    durationSeconds,
    progressSeconds,
}: LongFormResumeInput): number => {
    if (completed) {
        return 0;
    }

    const position = Math.floor(progressSeconds ?? 0);
    if (!Number.isFinite(position) || position <= 0) {
        return 0;
    }

    if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return position;
    }

    // Past the end (a duration that shrank after a re-scan, a position written
    // against a different encode) reads as finished, not as a seek off the end.
    if (position >= durationSeconds) {
        return 0;
    }

    return durationSeconds - position <= longFormNearEndWindowSeconds(durationSeconds)
        ? 0
        : position;
};

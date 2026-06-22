/**
 * Pure state machine deciding whether the player's play/pause control should
 * show a loading spinner. Extracted from the player components so the timing
 * behaviour is verifiable without a device (see playback-busy.test.ts).
 *
 * Why this isn't just `status === 'loading' || 'buffering'`:
 *
 * A live/radio stream — and a freshly server-warmed podcast — does not buffer
 * once and then play. ExoPlayer's start-up bounces STATE_BUFFERING <-> READY
 * several times in the first 1-2 seconds, so the engine status strobes
 * buffering -> playing -> buffering -> playing. Driving the spinner straight off
 * that produced the two reported bugs: the podcast control flickered (spinner
 * blinking on/off) and the radio control showed NO spinner at all (each
 * buffering burst was too short to ever clear a naive arm delay before a
 * transient 'playing' reset it).
 *
 * The fix keeps a single "start attempt" alive across those transient 'playing'
 * blips:
 *   - ARM: show only after `armMs` of (accumulated) start-up so a genuinely
 *     instant cached start doesn't flash a spinner for one frame.
 *   - BRIDGE: a transient 'playing' does NOT end the attempt — we wait `bridgeMs`
 *     for buffering to resume. If it does, the spinner stays up (one steady
 *     "starting…"); if playback sustains past `bridgeMs`, the attempt settles and
 *     the spinner releases.
 * Any user/terminal status (paused/idle/ended/error/waiting) ends the attempt at
 * once — a paused stream is not "loading".
 *
 * The machine is clock-driven: every step returns the next deadline (`timeoutMs`)
 * at which the host must re-invoke `stepPlaybackBusy` with the same status and an
 * advanced clock, so arming/bridging still resolve when no new status arrives.
 */

export interface PlaybackBusyTimings {
    /** Continuous start-up time before the spinner shows (anti-flash). */
    armMs: number;
    /** How long a transient 'playing' is tolerated before the attempt settles. */
    bridgeMs: number;
}

export const DEFAULT_PLAYBACK_BUSY_TIMINGS: PlaybackBusyTimings = {
    armMs: 120,
    bridgeMs: 400,
};

export interface PlaybackBusyState {
    shown: boolean;
    /** Wall-clock ms the current start attempt began; null when settled/idle. */
    startedAt: number | null;
    /** Wall-clock ms a bridged 'playing' will settle at; null when not bridging. */
    releaseAt: number | null;
}

export const INITIAL_PLAYBACK_BUSY_STATE: PlaybackBusyState = {
    shown: false,
    startedAt: null,
    releaseAt: null,
};

export interface PlaybackBusyStep {
    state: PlaybackBusyState;
    shown: boolean;
    /** ms until the host must call step again, or null when nothing is pending. */
    timeoutMs: number | null;
}

const isWorkingStatus = (status: string): boolean =>
    status === 'loading' || status === 'buffering';

const settled = (shown: boolean): PlaybackBusyStep => ({
    state: INITIAL_PLAYBACK_BUSY_STATE,
    shown,
    timeoutMs: null,
});

export function stepPlaybackBusy(
    prev: PlaybackBusyState,
    status: string,
    now: number,
    timings: PlaybackBusyTimings = DEFAULT_PLAYBACK_BUSY_TIMINGS,
): PlaybackBusyStep {
    if (isWorkingStatus(status)) {
        // Loading/buffering: this is (or continues) a start attempt. Buffering
        // cancels any pending bridge-release. Preserve startedAt across a flicker
        // so accumulated start-up — not the latest burst — clears the arm.
        const startedAt = prev.startedAt ?? now;
        if (prev.shown || now - startedAt >= timings.armMs) {
            return {
                state: { shown: true, startedAt, releaseAt: null },
                shown: true,
                timeoutMs: null,
            };
        }
        return {
            state: { shown: false, startedAt, releaseAt: null },
            shown: false,
            timeoutMs: timings.armMs - (now - startedAt),
        };
    }

    if (status === 'playing') {
        if (prev.startedAt === null) {
            // Already-settled playback (no attempt in flight) — stay off.
            return settled(false);
        }
        // Mid-attempt: bridge this 'playing' in case buffering resumes.
        const releaseAt = prev.releaseAt ?? now + timings.bridgeMs;
        const remaining = releaseAt - now;
        if (remaining <= 0) {
            // Playback sustained through the bridge — settle.
            return settled(false);
        }
        return {
            state: { shown: prev.shown, startedAt: prev.startedAt, releaseAt },
            shown: prev.shown,
            timeoutMs: remaining,
        };
    }

    // paused / idle / ended / error / waiting_for_network / stale_auth.
    return settled(false);
}

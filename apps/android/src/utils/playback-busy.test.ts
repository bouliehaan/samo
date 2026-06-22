import { describe, expect, it } from 'vitest';

import {
    DEFAULT_PLAYBACK_BUSY_TIMINGS,
    INITIAL_PLAYBACK_BUSY_STATE,
    type PlaybackBusyState,
    stepPlaybackBusy,
} from './playback-busy';

const T = DEFAULT_PLAYBACK_BUSY_TIMINGS;

/**
 * Drives the pure machine the way the hook does: each entry is a status applied
 * at a wall-clock `at`. Between entries, any pending `timeoutMs` deadline that
 * falls before the next entry is fired with the SAME status (a timer tick).
 * Returns the spinner-shown value after the final settle.
 */
const run = (
    events: { at: number; status: string }[],
    timings = T,
): { shown: boolean; state: PlaybackBusyState } => {
    let state = INITIAL_PLAYBACK_BUSY_STATE;
    let shown = false;
    let pendingAt: number | null = null;

    const apply = (status: string, now: number) => {
        const result = stepPlaybackBusy(state, status, now, timings);
        state = result.state;
        shown = result.shown;
        pendingAt = result.timeoutMs === null ? null : now + result.timeoutMs;
    };

    for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        const nextAt = events[i + 1]?.at ?? Infinity;
        // Fire any timer deadlines that land before the next status event.
        while (pendingAt !== null && pendingAt <= Math.min(event.at, nextAt) && pendingAt <= event.at) {
            apply(event.status, pendingAt);
            break;
        }
        apply(event.status, event.at);
        // Resolve trailing deadlines up to the next event (e.g. bridge release).
        while (pendingAt !== null && pendingAt < nextAt) {
            apply(event.status, pendingAt);
        }
    }
    return { shown, state };
};

describe('stepPlaybackBusy', () => {
    it('arms the spinner after sustained buffering', () => {
        // Buffering at t0; a timer tick at t0+armMs should show it.
        const first = stepPlaybackBusy(INITIAL_PLAYBACK_BUSY_STATE, 'buffering', 0);
        expect(first.shown).toBe(false);
        expect(first.timeoutMs).toBe(T.armMs);

        const armed = stepPlaybackBusy(first.state, 'buffering', T.armMs);
        expect(armed.shown).toBe(true);
        expect(armed.timeoutMs).toBeNull();
    });

    it('never flashes a spinner for an instant cached start', () => {
        // Brief buffering, then playback sustains — the attempt settles silently.
        const { shown } = run([
            { at: 0, status: 'buffering' },
            { at: 40, status: 'playing' },
            { at: 2000, status: 'playing' },
        ]);
        expect(shown).toBe(false);
    });

    it('shows a steady spinner through a flickery radio start (sub-arm bursts)', () => {
        // Each buffering burst is shorter than armMs, but the accumulated start
        // time is not — a naive arm-delay would never fire; this must.
        const { shown } = run([
            { at: 0, status: 'buffering' }, // burst 1 (80ms)
            { at: 80, status: 'playing' },
            { at: 150, status: 'buffering' }, // burst 2 — accumulated 150ms >= armMs
            { at: 220, status: 'playing' },
            { at: 300, status: 'buffering' },
        ]);
        expect(shown).toBe(true);
    });

    it('keeps the spinner up across a transient playing blip, then releases when settled', () => {
        // Arm during a real buffer, blip to playing, buffer again (stay shown),
        // then sustained playing past the bridge → release.
        const shownDuringBlip = run([
            { at: 0, status: 'buffering' },
            { at: T.armMs, status: 'buffering' }, // armed -> shown
            { at: 500, status: 'playing' }, // transient
            { at: 520, status: 'buffering' }, // resumes within bridge
        ]);
        expect(shownDuringBlip.shown).toBe(true);

        const released = run([
            { at: 0, status: 'buffering' },
            { at: T.armMs, status: 'buffering' },
            { at: 500, status: 'playing' },
            { at: 500 + T.bridgeMs + 50, status: 'playing' }, // sustained past bridge
        ]);
        expect(released.shown).toBe(false);
    });

    it('releases immediately when the user pauses mid-buffer', () => {
        const { shown, state } = run([
            { at: 0, status: 'buffering' },
            { at: T.armMs, status: 'buffering' }, // shown
            { at: 600, status: 'paused' },
        ]);
        expect(shown).toBe(false);
        expect(state.startedAt).toBeNull();
    });

    it('treats terminal states (idle/error/ended) as not busy', () => {
        for (const status of ['idle', 'error', 'ended', 'waiting_for_network', 'stale_auth']) {
            const result = stepPlaybackBusy(
                { shown: true, startedAt: 0, releaseAt: null },
                status,
                100,
            );
            expect(result.shown, status).toBe(false);
            expect(result.timeoutMs, status).toBeNull();
        }
    });
});

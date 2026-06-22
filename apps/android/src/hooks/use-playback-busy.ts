import { useEffect, useRef, useState } from 'react';

import {
    DEFAULT_PLAYBACK_BUSY_TIMINGS,
    INITIAL_PLAYBACK_BUSY_STATE,
    type PlaybackBusyState,
    type PlaybackBusyTimings,
    stepPlaybackBusy,
} from '../utils/playback-busy';

/**
 * Whether the player's play/pause control should show a loading spinner for the
 * current `status`. Thin React wrapper over the pure `stepPlaybackBusy` machine:
 * re-runs it on every status change and on the arm/bridge deadlines the machine
 * asks for, so the spinner stays correct even when no new status arrives. See
 * utils/playback-busy.ts for why this is more than `status === 'buffering'`.
 */
export function usePlaybackBusy(
    status: string,
    timings: PlaybackBusyTimings = DEFAULT_PLAYBACK_BUSY_TIMINGS,
): boolean {
    const [shown, setShown] = useState(false);
    const stateRef = useRef<PlaybackBusyState>(INITIAL_PLAYBACK_BUSY_STATE);
    const statusRef = useRef(status);
    statusRef.current = status;
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const { armMs, bridgeMs } = timings;

    useEffect(() => {
        const clear = () => {
            if (timerRef.current !== undefined) {
                clearTimeout(timerRef.current);
                timerRef.current = undefined;
            }
        };
        const run = () => {
            const result = stepPlaybackBusy(stateRef.current, statusRef.current, Date.now(), {
                armMs,
                bridgeMs,
            });
            stateRef.current = result.state;
            setShown(result.shown);
            clear();
            if (result.timeoutMs !== null) {
                timerRef.current = setTimeout(run, result.timeoutMs);
            }
        };
        run();
        return clear;
    }, [status, armMs, bridgeMs]);

    return shown;
}

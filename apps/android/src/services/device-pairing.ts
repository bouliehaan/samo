import { AppState } from 'react-native';
import {
    adaptNativeFetch,
    getFetch,
    getSamoSetupStatus,
    isRetryableTransportError,
    pollSamoDevicePairing,
    SamoHttpError,
    startSamoDevicePairing,
    type SamoDevicePairing,
    type SamoDevicePairingPoll,
    type SamoFetch,
} from '@samo/core/server';

import {
    getDevicePairing,
    IDLE_DEVICE_PAIRING,
    setDevicePairing,
    type DevicePairingFailure,
} from '../state/device-pairing';
import { acceptServerAuthentication } from './server-session';

/**
 * Signing this device in with a code instead of a password typed on a remote.
 *
 * The TV shows a short code; someone already signed in on a phone or computer
 * approves it on the server's /pair page; this flow notices by polling and
 * adopts the session through acceptServerAuthentication — the same ending a
 * password login has. The protocol is samo-server's
 * internal/api/device_pairing.go.
 *
 * Owned by this module rather than a component, like every flow here: a poll
 * loop that runs for minutes must not die quietly with a remount. The setup
 * screen cancels it on the way out.
 */

/** Ceiling for the backoff while polls are not reaching the server. */
const UNREACHABLE_BACKOFF_CEILING_MS = 30_000;

// Bumped by every start and cancel. An await that comes back to a different
// number belongs to a pairing nobody is waiting on any more.
let generation = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const stopPolling = (): void => {
    if (pollTimer !== null) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }
};

export const cancelDevicePairing = (): void => {
    generation += 1;
    stopPolling();
    setDevicePairing(IDLE_DEVICE_PAIRING);
};

export const startDevicePairing = async (serverUrl: string): Promise<void> => {
    cancelDevicePairing();
    const run = generation;
    const isCurrent = () => run === generation;
    const fetcher = adaptNativeFetch(fetch);

    setDevicePairing({ status: 'requesting', serverUrl });
    let request: SamoDevicePairing;
    try {
        request = await startSamoDevicePairing(serverUrl, fetcher);
    } catch (error) {
        const reason = await classifyStartFailure(serverUrl, error, fetcher);
        if (isCurrent()) {
            setDevicePairing({ status: 'failed', serverUrl, reason });
        }
        return;
    }
    if (!isCurrent()) {
        return;
    }

    const fail = (reason: DevicePairingFailure) =>
        setDevicePairing({ status: 'failed', serverUrl, reason });
    const wait = (unreachable: boolean) => {
        const state = getDevicePairing();
        // An ordinary pending poll changes nothing on screen, so it notifies
        // nobody.
        if (
            state.status === 'waiting' &&
            state.request === request &&
            state.unreachable === unreachable
        ) {
            return;
        }
        setDevicePairing({ status: 'waiting', serverUrl, request, unreachable });
    };

    let intervalMs = request.intervalMs;
    const schedule = () => {
        pollTimer = setTimeout(() => {
            pollTimer = null;
            void poll();
        }, intervalMs);
    };
    const poll = async (): Promise<void> => {
        if (!isCurrent()) {
            return;
        }
        if (Date.now() >= request.expiresAt) {
            fail('expired');
            return;
        }
        // Nobody is watching a backgrounded app; hold the code without polling.
        if (AppState.currentState !== 'active') {
            schedule();
            return;
        }
        let result: SamoDevicePairingPoll;
        try {
            result = await pollSamoDevicePairing(serverUrl, request.deviceCode, fetcher);
        } catch (error) {
            if (!isCurrent()) {
                return;
            }
            if (!isTransientPollFailure(error)) {
                fail('failed');
                return;
            }
            // The code is still good: keep it on screen and back off.
            intervalMs = Math.min(UNREACHABLE_BACKOFF_CEILING_MS, intervalMs * 2);
            wait(true);
            schedule();
            return;
        }
        if (!isCurrent()) {
            return;
        }
        switch (result.status) {
            case 'approved':
                setDevicePairing({ status: 'connecting', serverUrl });
                try {
                    await acceptServerAuthentication(result.authentication);
                } catch {
                    if (isCurrent()) {
                        fail('failed');
                    }
                    return;
                }
                if (isCurrent()) {
                    setDevicePairing(IDLE_DEVICE_PAIRING);
                }
                return;
            case 'access_denied':
                fail('declined');
                return;
            case 'expired_token':
                fail('expired');
                return;
            default:
                // Pending or slow_down. The server's interval sets the pace,
                // including after a run of failures pushed ours out.
                intervalMs = result.intervalMs;
                wait(false);
                schedule();
        }
    };

    setDevicePairing({ status: 'waiting', serverUrl, request, unreachable: false });
    schedule();
};

/** Ask the same server for a fresh code after a pairing failed. */
export const retryDevicePairing = (): void => {
    const state = getDevicePairing();
    if (state.status === 'failed') {
        void startDevicePairing(state.serverUrl);
    }
};

const classifyStartFailure = async (
    serverUrl: string,
    error: unknown,
    fetcher: SamoFetch,
): Promise<DevicePairingFailure> => {
    if (!(error instanceof SamoHttpError)) {
        return isRetryableTransportError(error) ? 'unreachable' : 'failed';
    }
    // A server from before pairing matches the path against its `GET /` page
    // and refuses the method (405); anything else unaware of it says 404.
    if (error.status === 404 || error.status === 405) {
        return 'unsupported';
    }
    if (error.status === 429) {
        return 'busy';
    }
    // A server with no accounts yet answers 503, and so does a proxy in front of
    // one that is down. Ask, as password login does, only now that it failed.
    const setup = await getSamoSetupStatus(getFetch(fetcher), serverUrl).catch(() => undefined);
    if (setup?.needsSetup) {
        return 'not-set-up';
    }
    return error.status >= 500 ? 'unreachable' : 'failed';
};

/** A poll that may well land next time: no answer at all, or a server error
 *  (a restart behind a proxy answers 502 until it is back). */
const isTransientPollFailure = (error: unknown): boolean =>
    isRetryableTransportError(error) || (error instanceof SamoHttpError && error.status >= 500);

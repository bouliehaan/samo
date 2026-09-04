import { useEffect } from 'react';

import {
    fetchConnectedSamoRadioDevices,
    fetchSamoRadioDeviceState,
    fetchSamoRadioStations,
    getSamoRadioServer,
} from '/@/renderer/features/samo-radio/api/samo-radio-api';
import { getLongFormMediaServer, useAuthStore } from '/@/renderer/store/auth.store';
import {
    getSamoRadioDevices,
    patchSamoRadioDeviceState,
    setSamoRadioDevices,
    setSamoRadioStations,
} from '/@/renderer/store/samo-radio.store';

/**
 * One poller for every samo-radio surface.
 *
 * Devices report a moving play position, so the only way to show what the
 * stereo is doing is to ask repeatedly. Two things make that cheap enough to
 * leave running:
 *
 * - **Two cadences.** A surface that is actually being looked at (the Radio
 *   panel, the open playerbar remote) asks every few seconds. Everything else
 *   only needs to know *whether a device exists at all* — that is what decides
 *   if the playerbar even grows a radio button — and a slow sweep answers it.
 * - **Nothing runs behind a hidden window.** A minimised app polling a stereo
 *   every five seconds is pure waste; the first tick on re-show catches up.
 *
 * Callers refcount into it with `useSamoRadioPolling`; the interval is
 * recomputed whenever that count changes.
 */

const ACTIVE_INTERVAL_MS = 5000;
const IDLE_INTERVAL_MS = 30000;
/**
 * Where the poll settles on a server that keeps saying no.
 *
 * Most samo servers have samo-radio switched off, and that answer arrives as an
 * error rather than an empty list — so without this the app would ask a server
 * that has never had a device, twice a minute, forever.
 */
const BACKOFF_INTERVAL_MS = 300000;
const FAILURES_BEFORE_BACKOFF = 3;

let mountedCount = 0;
let activeCount = 0;
let timer: null | ReturnType<typeof setInterval> = null;
let inFlight = false;
let stationsServerId: null | string = null;
let consecutiveFailures = 0;

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/**
 * Re-read the server's devices.
 *
 * A failed request is NOT an empty device list. The desktop reaches samo over
 * whatever network it is on — and over a tunnel from outside the house — so one
 * timed-out poll would otherwise blank the panel and strip "play on the stereo"
 * out of every menu mid-listen. The last good snapshot stands until a request
 * actually succeeds.
 */
const refreshDevices = async (): Promise<void> => {
    if (inFlight) {
        return;
    }

    inFlight = true;
    try {
        setSamoRadioDevices(await fetchConnectedSamoRadioDevices());
        // Opening a control surface after a spell of failures should feel
        // instant again, so a single success clears the backoff.
        if (consecutiveFailures > 0) {
            consecutiveFailures = 0;
            reschedule();
        }
    } catch {
        // Keep what we had; the next tick corrects it.
        consecutiveFailures += 1;
        if (consecutiveFailures === FAILURES_BEFORE_BACKOFF) {
            reschedule();
        }
    } finally {
        inFlight = false;
    }
};

/**
 * Stations change when someone adds one, which is rare — so they are read once
 * per server rather than on the device cadence.
 */
const refreshStations = async (serverId: string): Promise<void> => {
    if (stationsServerId === serverId) {
        return;
    }

    stationsServerId = serverId;
    try {
        setSamoRadioStations(await fetchSamoRadioStations());
    } catch {
        stationsServerId = null;
    }
};

const tick = (): void => {
    if (isHidden()) {
        return;
    }

    const server = getSamoRadioServer();
    if (!server) {
        // Disconnected, or connected to a backend that has no samo-radio.
        stationsServerId = null;
        if (getSamoRadioDevices().length > 0) {
            setSamoRadioDevices([]);
        }
        return;
    }

    void refreshDevices();
    void refreshStations(server.id);
};

/**
 * A surface someone is actually looking at always gets the fast cadence, even
 * while backing off: if you have opened the panel, you want to know what the
 * device is doing now, and your click is a better reason to ask than the
 * poller's own schedule.
 */
const intervalMs = (): number => {
    if (activeCount > 0) {
        return ACTIVE_INTERVAL_MS;
    }
    return consecutiveFailures >= FAILURES_BEFORE_BACKOFF ? BACKOFF_INTERVAL_MS : IDLE_INTERVAL_MS;
};

const reschedule = (): void => {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }

    if (mountedCount === 0 || isHidden()) {
        return;
    }

    timer = setInterval(tick, intervalMs());
};

const handleVisibilityChange = (): void => {
    if (!isHidden()) {
        tick();
    }
    reschedule();
};

/**
 * Keep the device list fresh for as long as this component is mounted.
 *
 * `active` means "a person is looking at live controls right now" and buys the
 * fast cadence. Leave it false for surfaces that only need to know whether a
 * device exists.
 */
export const useSamoRadioPolling = ({ active = false }: { active?: boolean } = {}): void => {
    // Re-run when the server changes so switching accounts re-reads devices and
    // stations immediately rather than at the next tick.
    const serverId = useAuthStore((state) => getLongFormMediaServer(state)?.id ?? null);

    useEffect(() => {
        mountedCount += 1;
        if (mountedCount === 1) {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
        tick();
        reschedule();

        return () => {
            mountedCount -= 1;
            if (mountedCount === 0) {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            reschedule();
        };
    }, [serverId]);

    useEffect(() => {
        if (!active) {
            return;
        }

        activeCount += 1;
        reschedule();
        // Opening a control surface should show the truth, not a reading up to
        // 30 seconds stale.
        tick();

        return () => {
            activeCount -= 1;
            reschedule();
        };
    }, [active]);
};

export const refreshSamoRadioDevices = refreshDevices;

/**
 * Re-read ONE device's state, outside the poll.
 *
 * For the case where a command's own response is not yet the answer: a channel
 * skip is forwarded to the station, and the station reports what is now airing
 * a moment later. Failure is silent on purpose — this only refreshes a readout
 * the next poll would correct anyway.
 */
export const refreshSamoRadioDeviceState = async (deviceId: string): Promise<void> => {
    try {
        patchSamoRadioDeviceState(deviceId, await fetchSamoRadioDeviceState(deviceId));
    } catch {
        // Left to the next poll.
    }
};

import {
    type SamoRadioDevice,
    type SamoRadioState,
    type SamoRadioStationRef,
} from '@samo/core/server';

import { useStoreSelector } from './use-store-selector';

/**
 * What this device knows about the server's own audio outputs.
 *
 * Three surfaces need the same answer — the Radio tab's control panel, the
 * output picker, and the long-press menu on every piece of media — and they ask
 * at completely different moments. A per-surface fetch would mean the context
 * menu either opened with no samo-radio entry and grew one a beat later, or
 * fired a request on every long press. One store, refreshed by whoever is
 * awake, lets all three render from what is already known.
 *
 * Only CONNECTED devices are ever stored (see `refreshSamoRadioDevices`), so a
 * non-empty `devices` means "the server has a samo-radio you can play to right
 * now" — no surface has to re-derive that.
 */

/** Just enough of a device to offer it as a "send this there" target. */
export interface SamoRadioTarget {
    id: string;
    name: string;
}

/**
 * Whether this phone can currently talk to the server's radio at all.
 *
 * Every radio surface is live-only — there is no mirror behind stations or
 * devices — so all of them go blank together the moment the server is out of
 * reach, and an empty list on its own cannot say why. Without this the Radio
 * tab reported a dead network as "no stations" and dropped the control panel
 * with no message, which reads as the feature being broken rather than the
 * connection. (A LAN-addressed server behind a full-tunnel VPN is the way this
 * happens in practice: Wi-Fi is up and validated, so nothing else in the app
 * considers itself offline.)
 *
 * `unknown` until something has actually tried — a fresh launch has no
 * evidence either way and must not accuse the network of anything.
 */
export type SamoRadioReach =
    | { message: string; status: 'unreachable' }
    | { status: 'ok' }
    | { status: 'unknown' };

export type SamoRadioDevicesState = {
    devices: SamoRadioDevice[];
    /** Whether the last attempt to reach this server's radio got through. */
    reach: SamoRadioReach;
    stations: SamoRadioStationRef[];
    /**
     * `devices` reduced to identity, and only replaced when that identity
     * changes.
     *
     * The device list is re-fetched every few seconds while the Radio tab is
     * open, and each poll brings a new object graph carrying a moving play
     * position. Menus don't care: they need the id and the name. Keeping the
     * previous array when nothing but the playhead moved is what stops a poll
     * behind the Radio tab from re-rendering the context-menu host — and from
     * rebuilding its action list — five times a minute.
     */
    targets: SamoRadioTarget[];
};

const EMPTY_DEVICES: SamoRadioDevice[] = [];
const EMPTY_STATIONS: SamoRadioStationRef[] = [];
const EMPTY_TARGETS: SamoRadioTarget[] = [];
// Shared singletons for the two verdicts that carry no payload, so the
// every-5s poll re-confirming "still fine" is reference-equal and publishes
// nothing.
const REACH_OK: SamoRadioReach = { status: 'ok' };
const REACH_UNKNOWN: SamoRadioReach = { status: 'unknown' };

let samoRadioState: SamoRadioDevicesState = {
    devices: EMPTY_DEVICES,
    reach: REACH_UNKNOWN,
    stations: EMPTY_STATIONS,
    targets: EMPTY_TARGETS,
};

const listeners = new Set<() => void>();

const publish = (next: SamoRadioDevicesState): void => {
    if (
        next.devices === samoRadioState.devices &&
        next.reach === samoRadioState.reach &&
        next.stations === samoRadioState.stations &&
        next.targets === samoRadioState.targets
    ) {
        return;
    }
    samoRadioState = next;
    listeners.forEach((listener) => listener());
};

const subscribeSamoRadio = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const deriveTargets = (
    devices: SamoRadioDevice[],
    previous: SamoRadioTarget[],
): SamoRadioTarget[] => {
    if (devices.length === 0) {
        return previous.length === 0 ? previous : EMPTY_TARGETS;
    }
    const next = devices.map((device) => ({ id: device.id, name: device.name }));
    const unchanged =
        next.length === previous.length &&
        next.every(
            (target, index) =>
                target.id === previous[index].id && target.name === previous[index].name,
        );
    return unchanged ? previous : next;
};

/**
 * Replace the known devices. Callers pass CONNECTED devices only — the store
 * does not filter, so that the policy lives in one place (the service) rather
 * than being half-applied here and half at each call site.
 */
export const setSamoRadioDevices = (devices: SamoRadioDevice[]): void => {
    const nextDevices = devices.length === 0 ? EMPTY_DEVICES : devices;
    if (nextDevices === samoRadioState.devices) {
        return;
    }
    publish({
        ...samoRadioState,
        devices: nextDevices,
        targets: deriveTargets(nextDevices, samoRadioState.targets),
    });
};

/**
 * Fold a command's own response into the list.
 *
 * Every samo-radio command answers with the device's full new state, so the
 * panel can show the result of a tap immediately instead of holding the old
 * readout until the next poll.
 */
export const patchSamoRadioDeviceState = (deviceId: string, state: SamoRadioState): void => {
    const index = samoRadioState.devices.findIndex((device) => device.id === deviceId);
    if (index < 0) {
        return;
    }
    const devices = samoRadioState.devices.slice();
    devices[index] = { ...devices[index], state };
    // Identity is untouched by a state change, so `targets` is carried over as
    // is and menu consumers don't re-render.
    publish({ ...samoRadioState, devices });
};

export const setSamoRadioStations = (stations: SamoRadioStationRef[]): void => {
    publish({
        ...samoRadioState,
        stations: stations.length === 0 ? EMPTY_STATIONS : stations,
    });
};

/**
 * Record whether the server answered.
 *
 * Written by every path that actually issues a radio request — the device
 * poll and the station load — because either one getting through is proof the
 * server is there, and both are equally good witnesses to it not being.
 *
 * Re-reporting the same verdict is a no-op: the two payload-free verdicts are
 * shared singletons, and an unchanged message rewrites nothing. That matters
 * because the device poll asserts this every 5 seconds while the Radio tab is
 * open, and each publish would otherwise re-render the whole tab.
 */
export const setSamoRadioReach = (reach: SamoRadioReach): void => {
    const current = samoRadioState.reach;
    if (reach.status === current.status) {
        if (reach.status !== 'unreachable') {
            return;
        }
        if (reach.message === (current as { message: string }).message) {
            return;
        }
    }
    // Normalized here rather than at each call site, so a caller can hand over
    // a plain literal and still land on the shared instance.
    publish({ ...samoRadioState, reach: reach.status === 'unknown' ? REACH_UNKNOWN : reach });
};

/** `ok` / `unknown` normalized to their singletons so callers can pass a
 *  boolean outcome without hand-rolling the objects. */
export const samoRadioReachFor = (reachable: boolean, message?: string): SamoRadioReach =>
    reachable ? REACH_OK : { message: message ?? 'The server did not respond.', status: 'unreachable' };

/** Read at call time from handlers and services; components use the selector. */
export const getSamoRadioDevices = (): SamoRadioDevice[] => samoRadioState.devices;

export const getSamoRadioReach = (): SamoRadioReach => samoRadioState.reach;

/** Selector identity for `useSamoRadioSelector` — module-scope so it is not a
 *  fresh function on every render. */
export const selectSamoRadioReach = (state: SamoRadioDevicesState): SamoRadioReach => state.reach;

export const useSamoRadioSelector = <Selected>(
    selector: (state: SamoRadioDevicesState) => Selected,
): Selected => useStoreSelector(subscribeSamoRadio, () => samoRadioState, selector);

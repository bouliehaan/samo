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

export type SamoRadioDevicesState = {
    devices: SamoRadioDevice[];
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

let samoRadioState: SamoRadioDevicesState = {
    devices: EMPTY_DEVICES,
    stations: EMPTY_STATIONS,
    targets: EMPTY_TARGETS,
};

const listeners = new Set<() => void>();

const publish = (next: SamoRadioDevicesState): void => {
    if (
        next.devices === samoRadioState.devices &&
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

/** Read at call time from handlers and services; components use the selector. */
export const getSamoRadioDevices = (): SamoRadioDevice[] => samoRadioState.devices;

export const useSamoRadioSelector = <Selected>(
    selector: (state: SamoRadioDevicesState) => Selected,
): Selected => useStoreSelector(subscribeSamoRadio, () => samoRadioState, selector);

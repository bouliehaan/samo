import {
    type SamoRadioDevice,
    type SamoRadioState,
    type SamoRadioStationRef,
} from '@samo/core/server';
import { create } from 'zustand';

/**
 * What this app knows about samo's own audio outputs.
 *
 * Three surfaces need the same answer — the Radio page's panel, the playerbar
 * remote, and the "play on…" entry in every context menu — and they ask at
 * completely different moments. A per-surface fetch would mean the context menu
 * either opened with no samo-radio entry and grew one a beat later, or fired a
 * request on every right click. One store, refreshed by whoever is awake, lets
 * all three render from what is already known.
 *
 * Only CONNECTED devices are ever stored, so a non-empty `devices` means "there
 * is a samo-radio you can play to right now" — no surface has to re-derive that.
 */

/** Just enough of a device to offer it as a "send this there" target. */
export interface SamoRadioTarget {
    id: string;
    name: string;
}

interface SamoRadioStore {
    devices: SamoRadioDevice[];
    /** False until the first fetch settles, so surfaces don't flash empty. */
    hasLoaded: boolean;
    patchDeviceState: (deviceId: string, state: SamoRadioState) => void;
    setDevices: (devices: SamoRadioDevice[]) => void;
    setStations: (stations: SamoRadioStationRef[]) => void;
    stations: SamoRadioStationRef[];
    /**
     * `devices` reduced to identity, and only replaced when that identity
     * changes.
     *
     * The device list is re-fetched every few seconds while a control surface
     * is open, and each poll brings a new object graph carrying a moving play
     * position. Menus and the playerbar icon don't care: they need the id and
     * the name. Keeping the previous array when nothing but the playhead moved
     * is what stops a poll from re-rendering — and rebuilding the action list
     * of — every context menu twelve times a minute.
     */
    targets: SamoRadioTarget[];
}

const EMPTY_DEVICES: SamoRadioDevice[] = [];
const EMPTY_STATIONS: SamoRadioStationRef[] = [];
const EMPTY_TARGETS: SamoRadioTarget[] = [];

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

export const useSamoRadioStore = create<SamoRadioStore>((set) => ({
    devices: EMPTY_DEVICES,
    hasLoaded: false,

    /**
     * Fold a command's own response into the list.
     *
     * Every samo-radio command answers with the device's full new state, so a
     * click shows its result immediately instead of holding the old readout
     * until the next poll.
     */
    patchDeviceState: (deviceId, state) =>
        set((current) => {
            const index = current.devices.findIndex((device) => device.id === deviceId);
            if (index < 0) {
                return current;
            }

            const devices = current.devices.slice();
            devices[index] = { ...devices[index], state };
            // Identity is untouched by a state change, so `targets` carries
            // over as is and menu consumers don't re-render.
            return { ...current, devices };
        }),

    /**
     * Replace the known devices. Callers pass CONNECTED devices only — the
     * store does not filter, so that policy lives in one place (the poller)
     * rather than half here and half at each call site.
     */
    setDevices: (devices) =>
        set((current) => {
            const nextDevices = devices.length === 0 ? EMPTY_DEVICES : devices;
            return {
                ...current,
                devices: nextDevices,
                hasLoaded: true,
                targets: deriveTargets(nextDevices, current.targets),
            };
        }),

    setStations: (stations) =>
        set((current) => ({
            ...current,
            stations: stations.length === 0 ? EMPTY_STATIONS : stations,
        })),

    stations: EMPTY_STATIONS,
    targets: EMPTY_TARGETS,
}));

export const useSamoRadioDevices = () => useSamoRadioStore((state) => state.devices);

export const useSamoRadioStations = () => useSamoRadioStore((state) => state.stations);

/** Identity-only device list, for surfaces that only offer them as targets. */
export const useSamoRadioTargets = () => useSamoRadioStore((state) => state.targets);

/**
 * Whether samo-radio exists at all right now.
 *
 * The single gate for whether a surface is offered: the playerbar icon mounts
 * on this, so a server with no device (or a non-samo backend) never grows a
 * control that could only fail on click.
 */
export const useHasSamoRadioDevice = () => useSamoRadioStore((state) => state.devices.length > 0);

export const getSamoRadioDevices = () => useSamoRadioStore.getState().devices;

export const setSamoRadioDevices = (devices: SamoRadioDevice[]) =>
    useSamoRadioStore.getState().setDevices(devices);

export const setSamoRadioStations = (stations: SamoRadioStationRef[]) =>
    useSamoRadioStore.getState().setStations(stations);

export const patchSamoRadioDeviceState = (deviceId: string, state: SamoRadioState) =>
    useSamoRadioStore.getState().patchDeviceState(deviceId, state);

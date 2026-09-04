// samo-radio: samo's own audio outputs.
//
// A samo-radio device is a headless player wired into a physical socket on the
// machine running the server — normally its line-out. Clients never talk to one
// directly: every call here goes to samo, which forwards it to the device over
// its local control API. That is what makes "play it on the stereo" work from a
// phone that is not even on the same network.

import { type ServerAuthenticationResult } from './server-auth';
import { type SamoFetch } from './server-http';
import { samoGet, samoSend } from './server-samo';

export type SamoRadioStatus = 'buffering' | 'error' | 'idle' | 'paused' | 'playing';
export type SamoRadioMode = 'channel' | 'idle' | 'queue';

/** One thing playing (or queued) on a device. */
export interface SamoRadioItem {
    artworkUrl?: string;
    durationSeconds?: number;
    kind?: string;
    live?: boolean;
    ref: string;
    streamUrl: string;
    subtitle?: string;
    title: string;
}

/** The tuned channel, plus whatever it is airing right now. */
export interface SamoRadioChannelState {
    artist?: string;
    id: string;
    /** Which kind of station is tuned; absent on older devices. */
    kind?: SamoRadioStationKind;
    listenerCount?: number;
    name?: string;
    sourceLabel?: string;
    title?: string;
}

export interface SamoRadioOutputState {
    backend: string;
    channels: number;
    device?: string;
    lastError?: string;
    open: boolean;
    restarts?: number;
    sampleRate: number;
}

/**
 * A device's full status. Every response carries a complete snapshot rather
 * than a delta, so a client that has been in a pocket for an hour is correct
 * again after one fetch.
 */
export interface SamoRadioState {
    channel?: SamoRadioChannelState;
    defaultStation?: SamoRadioStationRef;
    deviceName: string;
    durationSeconds?: number;
    error?: string;
    item?: SamoRadioItem;
    mode: SamoRadioMode;
    output: SamoRadioOutputState;
    positionSeconds: number;
    queue?: SamoRadioItem[];
    queueIndex: number;
    server: { baseUrl?: string; name?: string; paired: boolean };
    status: SamoRadioStatus;
    updatedAt: string;
    version: number;
    /** Output level, 0–1. Applied in software on the device. */
    volume: number;
}

export interface SamoRadioDevice {
    baseUrl: string;
    enabled: boolean;
    id: string;
    lastError?: string;
    lastSeenAt?: string;
    name: string;
    /** False until samo has given the device a token; it can play nothing. */
    paired: boolean;
    /** Absent when samo could not reach the device — see lastError. */
    state?: SamoRadioState;
    streamBaseUrl?: string;
}

/**
 * What to send a device. Clients name catalog items by id and let the server
 * build the URLs: the mapping from an id to a stream URL exists once, on the
 * server, and a client cannot point the device at an arbitrary address.
 */
export type SamoRadioItemType =
    | 'audiobook'
    | 'episode'
    | 'file'
    | 'radio'
    | 'station'
    | 'track';

export interface SamoRadioItemRef {
    id: string;
    type: SamoRadioItemType;
}

/**
 * `next-kind` steps off the whole medium — "not talk right now, put music on".
 * It only means anything on a programmed channel, where there is a schedule to
 * move within; see `samoRadioTransportKind`.
 */
export type SamoRadioCommand =
    | 'next'
    | 'next-kind'
    | 'pause'
    | 'previous'
    | 'resume'
    | 'standby'
    | 'stop';

/** A channel or an internet radio station — the two things a device can sit on. */
export type SamoRadioStationKind = 'channel' | 'station';

export interface SamoRadioStationRef {
    id: string;
    kind: SamoRadioStationKind;
    name?: string;
}

type Auth = Pick<ServerAuthenticationResult, 'credential' | 'url'>;

const devicePath = (deviceId: string, suffix = ''): string =>
    `/samo-radio/devices/${encodeURIComponent(deviceId)}${suffix}`;

/**
 * List the devices this server can play to.
 *
 * samo asks every device for its live state as part of answering, so this is
 * the one call a client needs to render an output picker.
 */
export const listSamoRadioDevices = async (
    fetcher: SamoFetch,
    authentication: Auth,
    options?: { signal?: AbortSignal },
): Promise<SamoRadioDevice[]> => {
    const response = await samoGet<{ items?: SamoRadioDevice[] }>(
        fetcher,
        authentication,
        '/samo-radio/devices',
        { signal: options?.signal },
    );

    return response?.items ?? [];
};

export const getSamoRadioDeviceState = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    options?: { signal?: AbortSignal },
): Promise<SamoRadioState> => {
    return samoGet<SamoRadioState>(fetcher, authentication, devicePath(deviceId, '/state'), {
        signal: options?.signal,
    });
};

/**
 * Send a queue to a device.
 *
 * `append` is what makes two sends in a row build a queue instead of the second
 * one cutting off the first.
 */
export const playToSamoRadioDevice = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    body: {
        append?: boolean;
        items: SamoRadioItemRef[];
        startIndex?: number;
    },
): Promise<SamoRadioState> => {
    return samoSend<SamoRadioState>(fetcher, authentication, 'POST', devicePath(deviceId, '/play'), {
        append: body.append ?? false,
        items: body.items,
        mode: 'queue',
        startIndex: body.startIndex ?? 0,
    });
};

/**
 * Tune a device to a station — its resting state.
 *
 * A station is either a samo channel or an internet radio station from the
 * catalog. They are the same thing from the device's side: an endless live
 * source it sits on until asked for something else. Only the id space differs,
 * which is why the kind travels with the id.
 */
export const tuneSamoRadioDevice = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    station: SamoRadioStationRef,
): Promise<SamoRadioState> => {
    const body =
        station.kind === 'station'
            ? { mode: 'station', stationId: station.id, stationName: station.name }
            : { mode: 'channel', channelId: station.id, channelName: station.name };
    return samoSend<SamoRadioState>(fetcher, authentication, 'POST', devicePath(deviceId, '/play'), body);
};

/** Change what a device falls back to when a queue runs out (and at boot). */
export const setSamoRadioDefaultStation = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    station: SamoRadioStationRef | null,
    tuneNow = true,
): Promise<SamoRadioState> => {
    return samoSend<SamoRadioState>(
        fetcher,
        authentication,
        'PATCH',
        devicePath(deviceId, '/settings'),
        { defaultStation: station ?? { id: '', kind: 'channel' }, tuneNow },
    );
};

/**
 * Run a transport command.
 *
 * `stop` hands the device back to its default station; `standby` is the real
 * off switch. Both exist because "stop this podcast" and "silence the room" are
 * different intentions on a device whose job is to always be on air.
 */
export const commandSamoRadioDevice = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    command: SamoRadioCommand,
): Promise<SamoRadioState> => {
    return samoSend<SamoRadioState>(
        fetcher,
        authentication,
        'POST',
        devicePath(deviceId, `/${command}`),
    );
};

export const seekSamoRadioDevice = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    positionSeconds: number,
): Promise<SamoRadioState> => {
    return samoSend<SamoRadioState>(fetcher, authentication, 'POST', devicePath(deviceId, '/seek'), {
        positionSeconds,
    });
};

export const setSamoRadioDeviceVolume = async (
    fetcher: SamoFetch,
    authentication: Auth,
    deviceId: string,
    volume: number,
): Promise<SamoRadioState> => {
    return samoSend<SamoRadioState>(
        fetcher,
        authentication,
        'POST',
        devicePath(deviceId, '/volume'),
        { volume: Math.min(1, Math.max(0, volume)) },
    );
};

/** A device that is registered, switched on, and holds a token can be played to. */
export const isSamoRadioDeviceUsable = (device: SamoRadioDevice): boolean =>
    Boolean(device.enabled && device.paired);

/** True when samo could actually reach the device just now. */
export const isSamoRadioDeviceOnline = (device: SamoRadioDevice): boolean =>
    Boolean(device.state);

/**
 * A device that can be played to right now — registered, switched on, holding a
 * token, AND answering (samo attaches a state snapshot only for devices it just
 * reached).
 *
 * This is the single gate for whether a client offers samo-radio at all. A
 * registered-but-unpaired or unreachable device is not an output the user
 * actually has: every surface built on it — a control panel, a picker row, a
 * "send this there" menu entry — could only fail on tap. Pairing and
 * troubleshooting live in samo's own web UI, which is where a device in that
 * state is fixed.
 */
export const isSamoRadioDeviceConnected = (device: SamoRadioDevice): boolean =>
    isSamoRadioDeviceUsable(device) && isSamoRadioDeviceOnline(device);

/**
 * What "next" and "previous" would do to whatever the device is playing.
 *
 * Three genuinely different situations, and a client that treats them as two
 * gets it wrong:
 *
 * - `queue`  — the device advances its own queue.
 * - `channel`— there is no queue to advance; the commands ask the STATION to
 *   move its programming on, which every listener hears. Only a programmed
 *   channel has programming: skipping is a scheduling decision samo makes.
 * - `none`   — an internet station is somebody else's stream with nothing to
 *   skip to (the device refuses), or nothing is playing at all.
 *
 * A missing `kind` reads as a channel rather than a station: it is only absent
 * on devices predating the field, and those are samo channels — the same
 * reading the web panel takes.
 */
export type SamoRadioTransportKind = 'channel' | 'none' | 'queue';

export const samoRadioTransportKind = (state: SamoRadioState): SamoRadioTransportKind => {
    if (state.mode === 'queue') {
        return 'queue';
    }
    if (state.mode === 'channel' && state.channel && state.channel.kind !== 'station') {
        return 'channel';
    }
    return 'none';
};

/**
 * One line describing what a device is doing, for a picker row.
 *
 * Reachability is checked before playback state: a device samo cannot talk to
 * has no state at all, and showing the last thing it played would be a lie.
 */
export const describeSamoRadioDevice = (device: SamoRadioDevice): string => {
    if (!device.enabled) {
        return 'Disabled';
    }
    if (!device.paired) {
        return 'Not paired yet';
    }
    if (!device.state) {
        return 'Offline';
    }

    const { channel, item, mode, status } = device.state;
    if (status === 'error') {
        return device.state.output?.lastError ?? 'Audio output error';
    }
    if (!item) {
        return 'Standby';
    }
    if (mode === 'channel' && channel) {
        const airing = channel.title ?? '';
        return airing ? `${channel.name ?? 'Channel'} · ${airing}` : (channel.name ?? 'Channel');
    }
    return status === 'paused' ? `Paused · ${item.title}` : item.title;
};

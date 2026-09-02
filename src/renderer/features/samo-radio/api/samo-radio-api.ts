// samo-radio from the desktop's side.
//
// A samo-radio device is a headless player wired into a physical socket — the
// server's own line-out, or a Pi in another room. The desktop never talks to one
// directly: every call here goes to Samo, which forwards it over the device's
// local control API. That is what makes "put it on the stereo" work from a
// laptop that is not even on the same network.
//
// The functions read the active server at call time rather than taking it as an
// argument, because they are called from event handlers that would otherwise
// have to thread auth through three components — the same shape the Android
// service uses.

import {
    commandSamoRadioDevice,
    getSamoChannelNowPlaying,
    getSamoRadioDeviceState,
    isSamoRadioDeviceConnected,
    keepSamoExploTracks,
    listSamoChannels,
    listSamoInternetRadioStations,
    listSamoRadioDevices,
    playToSamoRadioDevice,
    type SamoExploKeepResponse,
    type SamoRadioCommand,
    type SamoRadioDevice,
    type SamoRadioItemRef,
    type SamoRadioState,
    type SamoRadioStationRef,
    seekSamoRadioDevice,
    ServerType,
    setSamoRadioDeviceVolume,
    tuneSamoRadioDevice,
} from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { getLongFormMediaServer, useAuthStore } from '/@/renderer/store/auth.store';

/**
 * The connected Samo server, or null.
 *
 * samo-radio needs a long-form Samo server. With none connected, every surface
 * built on this simply finds no devices rather than erroring.
 */
export const getSamoRadioServer = () => getLongFormMediaServer(useAuthStore.getState());

const authFor = (server: { credential: string; url: string }) => ({
    credential: server.credential,
    type: ServerType.SAMO as const,
    url: server.url,
});

const connection = () => {
    const server = getSamoRadioServer();
    return server ? authFor(server) : null;
};

const requireConnection = () => {
    const authentication = connection();
    if (!authentication) {
        throw new Error('Connect to a Samo server first.');
    }
    return authentication;
};

/**
 * Every device Samo can actually reach right now.
 *
 * Only CONNECTED devices come back. Every surface built on this list is an
 * actionable one, and a device that is unpaired or unreachable can do nothing
 * but fail on click; pairing is fixed in Samo's own web UI, not here.
 */
export const fetchConnectedSamoRadioDevices = async (
    signal?: AbortSignal,
): Promise<SamoRadioDevice[]> => {
    const authentication = connection();
    if (!authentication) {
        return [];
    }

    const devices = await listSamoRadioDevices(samoFetch, authentication, { signal });
    return devices.filter(isSamoRadioDeviceConnected);
};

/**
 * The airing track on a channel, if it is an explo drop worth keeping.
 *
 * A channel programmed from the Explore queue plays files out of a folder the
 * weekly run empties, so hearing something you want on it is a deadline. Every
 * other station — one whose music comes from the ordinary library, a Christmas
 * rotation swapped in for the season, a talk stream — has nothing to save,
 * which is why the server answers this per airing instead of the panel
 * guessing from what it can see. Null covers every "no" there is, the listener
 * not being an admin included.
 */
export const fetchSamoRadioKeepableTrackId = async (
    channelId: string,
    signal?: AbortSignal,
): Promise<null | string> => {
    const authentication = connection();
    if (!authentication) {
        return null;
    }

    try {
        const now = await getSamoChannelNowPlaying(samoFetch, authentication, channelId, {
            signal,
        });
        return now.keepableTrackId ?? null;
    } catch {
        // No answer is the same as no offer: a failed read here must never put
        // a control on screen that the keep behind it would then refuse.
        return null;
    }
};

/**
 * Copies the airing drop into the music library proper.
 *
 * The server owns the files: it remuxes samo's identified tags and cover art
 * into the copy and leaves the original in Explore for rotation to collect.
 */
export const keepSamoRadioAiringTrack = async (trackId: string): Promise<SamoExploKeepResponse> => {
    return keepSamoExploTracks(samoFetch, requireConnection(), [trackId]);
};

/**
 * Everything a device can be tuned to: programmed channels and internet radio
 * stations, in one list.
 *
 * Both are endless live sources the device sits on, so they are offered
 * together rather than making you know which kind a station is before you can
 * find it. Each carries its kind, because the two id spaces are separate.
 */
export const fetchSamoRadioStations = async (
    signal?: AbortSignal,
): Promise<SamoRadioStationRef[]> => {
    const authentication = connection();
    if (!authentication) {
        return [];
    }

    const [channels, stations] = await Promise.all([
        listSamoChannels(samoFetch, authentication, { signal }).catch(() => []),
        listSamoInternetRadioStations(samoFetch, authentication, { signal })
            .then((page) => page?.items ?? [])
            .catch(() => []),
    ]);

    return [
        ...channels.map((channel) => ({
            id: channel.id,
            kind: 'channel' as const,
            name: channel.name,
        })),
        ...stations
            .filter((station) => station.enabled !== false)
            .map((station) => ({
                id: station.id,
                kind: 'station' as const,
                name: station.name,
            })),
    ];
};

export const fetchSamoRadioDeviceState = async (deviceId: string): Promise<SamoRadioState> =>
    getSamoRadioDeviceState(samoFetch, requireConnection(), deviceId);

/**
 * Hand a list of catalog items to a device.
 *
 * Ids only — the server resolves them to stream URLs. That keeps one copy of
 * that mapping and means a client cannot ask the device to fetch an arbitrary
 * address. Types are per item, so a mixed queue (a track, then an episode)
 * survives the trip.
 */
export const sendToSamoRadioDevice = async (input: {
    append?: boolean;
    deviceId: string;
    items: SamoRadioItemRef[];
    startIndex?: number;
}): Promise<SamoRadioState> => {
    if (input.items.length === 0) {
        throw new Error('Nothing to send.');
    }

    return playToSamoRadioDevice(samoFetch, requireConnection(), input.deviceId, {
        append: input.append,
        items: input.items,
        startIndex: input.startIndex,
    });
};

export const tuneSamoRadio = async (
    deviceId: string,
    station: SamoRadioStationRef,
): Promise<SamoRadioState> =>
    tuneSamoRadioDevice(samoFetch, requireConnection(), deviceId, station);

export const commandSamoRadio = async (
    deviceId: string,
    command: SamoRadioCommand,
): Promise<SamoRadioState> =>
    commandSamoRadioDevice(samoFetch, requireConnection(), deviceId, command);

export const setSamoRadioVolume = async (
    deviceId: string,
    volume: number,
): Promise<SamoRadioState> =>
    setSamoRadioDeviceVolume(samoFetch, requireConnection(), deviceId, volume);

export const seekSamoRadio = async (
    deviceId: string,
    positionSeconds: number,
): Promise<SamoRadioState> =>
    seekSamoRadioDevice(samoFetch, requireConnection(), deviceId, positionSeconds);

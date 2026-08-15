import { type MobileContentSource, type MobilePlayableAudio } from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    type SamoRadioCommand,
    type SamoRadioDevice,
    type SamoRadioItemRef,
    type SamoRadioItemType,
    type SamoRadioStationRef,
    type SamoRadioState,
    ServerType,
    commandSamoRadioDevice,
    getSamoRadioDeviceState,
    isSamoRadioDeviceConnected,
    listSamoChannels,
    listSamoInternetRadioStations,
    listSamoRadioDevices,
    playToSamoRadioDevice,
    setSamoRadioDeviceVolume,
    tuneSamoRadioDevice,
} from '@samo/core/server';

import { getAuthSession } from '../state/auth-session';
import { isOfflineNow } from '../state/network-state';
import {
    getSamoRadioDevices,
    patchSamoRadioDeviceState,
    setSamoRadioDevices,
    setSamoRadioStations,
} from '../state/samo-radio';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { samoRadioQueueForSend } from '../utils/samo-radio-queue';

/**
 * samo-radio from the phone's side.
 *
 * Every call goes to Samo, which forwards it to the device — so this works over
 * the tunnel from anywhere, and the phone never needs to be on the same network
 * as the stereo. The functions read the active server connection at call time
 * rather than taking it as an argument, because they are called from event
 * handlers that would otherwise have to thread auth through three components.
 */

const connection = () => {
    const { serverConnection } = getAuthSession();
    // Only Samo servers have samo-radio. On any other backend the picker simply
    // shows no devices rather than erroring.
    if (!serverConnection || serverConnection.type !== ServerType.SAMO) {
        return null;
    }
    return serverConnection;
};

/**
 * Re-read the server's devices into the store.
 *
 * Only CONNECTED devices are kept. Every surface built on this list is an
 * actionable one, and a device Samo cannot reach — or has never paired with —
 * can do nothing but fail on tap; pairing is fixed in Samo's web UI, not here.
 *
 * A failed request is NOT an empty device list. The phone talks to Samo over
 * whatever network it happens to be on, so one timed-out poll would otherwise
 * blank the control panel and strip "Send to samo-radio" out of every menu
 * mid-listen. The last good snapshot stands until a request actually succeeds.
 */
export const refreshSamoRadioDevices = async (
    signal?: AbortSignal,
): Promise<SamoRadioDevice[]> => {
    const authentication = connection();
    // Offline is the same answer as "no samo-radio here", and arrived at
    // without a request: every command, and every send, goes through the
    // server. Surfaces disappear rather than offering controls that cannot
    // reach anything.
    if (!authentication || isOfflineNow()) {
        setSamoRadioDevices([]);
        return [];
    }
    try {
        const devices = await listSamoRadioDevices(fetch, authentication, { signal });
        if (signal?.aborted) {
            return getSamoRadioDevices();
        }
        const connected = devices.filter(isSamoRadioDeviceConnected);
        setSamoRadioDevices(connected);
        return connected;
    } catch {
        return getSamoRadioDevices();
    }
};

/**
 * Re-read ONE device's state.
 *
 * For the case where a command's own response is not yet the answer: a channel
 * skip is forwarded to the station, and the station reports what is now airing
 * a moment later. Failure is silent on purpose — this only ever refreshes a
 * readout the poll would correct anyway.
 */
export const refreshSamoRadioDeviceState = async (deviceId: string): Promise<void> => {
    const authentication = connection();
    if (!authentication || isOfflineNow()) {
        return;
    }
    try {
        patchSamoRadioDeviceState(
            deviceId,
            await getSamoRadioDeviceState(fetch, authentication, deviceId),
        );
    } catch {
        // Left to the next poll.
    }
};

/**
 * Everything a device can be tuned to: programmed channels and internet radio
 * stations, in one list.
 *
 * Both are endless live sources the device sits on, so the phone offers them
 * together rather than making you know which kind a station is before you can
 * find it. Each carries its kind, because the two id spaces are separate.
 *
 * Read straight from Samo rather than through the device: the phone is already
 * talking to the server, and one round trip answers for every device.
 */
export const refreshSamoRadioStations = async (
    signal?: AbortSignal,
): Promise<SamoRadioStationRef[]> => {
    const authentication = connection();
    if (!authentication) {
        setSamoRadioStations([]);
        return [];
    }
    const [channels, stations] = await Promise.all([
        listSamoChannels(fetch, authentication, { signal }).catch(() => []),
        listSamoInternetRadioStations(fetch, authentication, { signal })
            .then((page) => page?.items ?? [])
            .catch(() => []),
    ]);
    const tunable: SamoRadioStationRef[] = [
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
    if (signal?.aborted) {
        return [];
    }
    setSamoRadioStations(tunable);
    return tunable;
};

const requireConnection = () => {
    const authentication = connection();
    if (!authentication) {
        throw new Error('Connect to a Samo server first.');
    }
    return authentication;
};

/**
 * Hand a list of catalog items to a device.
 *
 * Ids only — the server resolves them to stream URLs. That keeps one copy of
 * that mapping and means the phone cannot ask the device to fetch an arbitrary
 * address. Types are per item, so a mixed queue (a track, then an episode)
 * survives the trip.
 */
export const sendToSamoRadio = async (input: {
    append?: boolean;
    deviceId: string;
    items: SamoRadioItemRef[];
    startIndex?: number;
}): Promise<SamoRadioState> => {
    const authentication = requireConnection();
    if (input.items.length === 0) {
        throw new Error('Nothing to send.');
    }
    return playToSamoRadioDevice(fetch, authentication, input.deviceId, {
        append: input.append,
        items: input.items,
        startIndex: input.startIndex,
    });
};

/**
 * The queue as it should be sent to a device, scoped to the server that owns
 * the device.
 *
 * A catalog id only means something on the server that issued it. A queue can
 * outlive a server switch — playback keeps going while the user connects
 * somewhere else — and shipping the old server's ids to the new one's aux port
 * would ask it to play tracks it has never heard of. This is the same
 * ownership check `attachNativeStreamCredentials` makes before handing an item
 * server credentials.
 */
export const samoRadioSendPayloadForQueue = (
    queue: { index?: number; items: MobilePlayableAudio[] } | null | undefined,
): { items: SamoRadioItemRef[]; startIndex: number } => {
    const authentication = connection();
    if (!authentication || !queue) {
        return { items: [], startIndex: 0 };
    }
    return samoRadioQueueForSend(
        queue.items,
        Math.max(0, queue.index ?? 0),
        (item) =>
            Boolean(
                findServerAuthenticationForSource(
                    authentication,
                    getContentSourceFromPlaybackItem(item as MobilePlayableAudio, authentication),
                ),
            ),
    );
};

/**
 * One playable's reference, or null if this server cannot resolve it.
 *
 * The single-item twin of the queue mapping above, and it exists for the same
 * reason: a long-pressed track from a server the phone is no longer connected
 * to must not be offered to the stereo. Cheap and synchronous, so menu code can
 * call it while deciding whether to show the action at all.
 */
export const samoRadioRefForPlayable = (
    playable: MobilePlayableAudio | undefined,
): SamoRadioItemRef | null => {
    if (!playable) {
        return null;
    }
    return samoRadioSendPayloadForQueue({ index: 0, items: [playable] }).items[0] ?? null;
};

/**
 * True when the connected Samo server is the one that issued this item.
 *
 * The ownership gate for anything named by a bare catalog id. Ids are only
 * meaningful on the server that minted them, so an item from a server the phone
 * has since left must never be offered to this one's stereo — it would resolve
 * to nothing, or to something else entirely.
 */
export const isSamoRadioResolvableSource = (
    source: MobileContentSource | undefined,
): boolean => {
    const authentication = connection();
    return Boolean(authentication && findServerAuthenticationForSource(authentication, source));
};

/**
 * A catalog item's own reference, for the kinds samo-radio resolves by id.
 *
 * An audiobook is a single id the server expands on its side — the phone
 * neither knows nor needs to know which files a book is made of. Albums and
 * playlists have no such type: they are sent as their tracks.
 */
export const samoRadioRefForCatalogItem = (
    item: { id: string; source?: MobileContentSource },
    type: SamoRadioItemType,
): SamoRadioItemRef | null =>
    item.id && isSamoRadioResolvableSource(item.source) ? { id: item.id, type } : null;

export const tuneSamoRadio = async (
    deviceId: string,
    station: SamoRadioStationRef,
): Promise<SamoRadioState> => tuneSamoRadioDevice(fetch, requireConnection(), deviceId, station);

export const controlSamoRadio = async (
    deviceId: string,
    command: SamoRadioCommand,
): Promise<SamoRadioState> =>
    commandSamoRadioDevice(fetch, requireConnection(), deviceId, command);

export const setSamoRadioVolume = async (
    deviceId: string,
    volume: number,
): Promise<SamoRadioState> =>
    setSamoRadioDeviceVolume(fetch, requireConnection(), deviceId, volume);

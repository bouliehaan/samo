import {
    keepMobileExploTracks,
    type MobileContentSource,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getSamoChannelNowPlaying,
    type SamoExploKeepResponse,
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
    samoRadioReachFor,
    setSamoRadioDevices,
    setSamoRadioReach,
    setSamoRadioStations,
} from '../state/samo-radio';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import {
    samoRadioQueueForSend,
    samoRadioStationRefFromPlayable,
} from '../utils/samo-radio-queue';

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
 * mid-listen. The last good snapshot stands until a request actually succeeds
 * — and the failure is RECORDED (`setSamoRadioReach`) rather than swallowed,
 * so the surfaces that end up with nothing to draw can say why instead of
 * looking like a feature that does not exist.
 */
export const refreshSamoRadioDevices = async (
    signal?: AbortSignal,
): Promise<SamoRadioDevice[]> => {
    const authentication = connection();
    const offline = isOfflineNow();
    // Offline is the same answer as "no samo-radio here", and arrived at
    // without a request: every command, and every send, goes through the
    // server. Surfaces disappear rather than offering controls that cannot
    // reach anything.
    if (!authentication || offline) {
        setSamoRadioDevices([]);
        // Offline is a known reason to have nothing; a server that has no
        // samo-radio to begin with is not a failure at all, and saying so
        // would put an error on a tab that is simply not equipped.
        setSamoRadioReach(
            offline
                ? samoRadioReachFor(false, 'This device is offline.')
                : { status: 'unknown' },
        );
        return [];
    }
    try {
        const devices = await listSamoRadioDevices(fetch, authentication, { signal });
        if (signal?.aborted) {
            return getSamoRadioDevices();
        }
        const connected = devices.filter(isSamoRadioDeviceConnected);
        setSamoRadioDevices(connected);
        setSamoRadioReach(samoRadioReachFor(true));
        return connected;
    } catch (error) {
        // An abort is this app changing its mind (tab switch, unmount), not
        // the server failing to answer — it proves nothing either way.
        if (!signal?.aborted) {
            setSamoRadioReach(samoRadioReachFor(false, describeReachFailure(error)));
        }
        return getSamoRadioDevices();
    }
};

/**
 * A fetch failure, in words that name the actual problem.
 *
 * React Native's fetch reports every transport failure — DNS, refused, routed
 * into a tunnel that cannot see the LAN — as the same bare "Network request
 * failed", which tells the reader nothing they did not already know from the
 * blank screen. Where the message is that empty, it is replaced with the one
 * fact that is always true and always actionable: this phone, on this network,
 * could not open a connection to the address the server is configured at.
 */
export const describeReachFailure = (error: unknown): string => {
    const raw = (
        error instanceof Error ? error.message : typeof error === 'string' ? error : ''
    ).trim();
    if (!raw || /network request failed/i.test(raw) || /\btimeout\b/i.test(raw)) {
        return "This phone can't open a connection to the server's address from the network it's on.";
    }
    return raw;
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
 * The airing track on a channel, if it is an explo drop worth keeping.
 *
 * A channel programmed from the Explore queue is playing files out of a folder
 * the weekly run empties, so hearing something you want is a deadline. Every
 * other station — one whose music is the ordinary library, a Christmas
 * rotation, a talk stream — has nothing to save, which is why the server
 * answers this per airing rather than the panel guessing from what it can see.
 *
 * Deliberately not part of the device poll. The device reports what the channel
 * TOLD it is on; whether that track sits in a drop folder is a question only
 * Samo can answer, and it only changes when the song does.
 */
export const fetchSamoRadioKeepableTrackId = async (
    channelId: string,
    signal?: AbortSignal,
): Promise<null | string> => {
    const authentication = connection();
    if (!authentication || isOfflineNow()) {
        return null;
    }
    try {
        const now = await getSamoChannelNowPlaying(fetch, authentication, channelId, { signal });
        return now.keepableTrackId ?? null;
    } catch {
        // No answer is the same as no offer. A failed read here must never
        // put a menu entry on screen that the keep would then refuse.
        return null;
    }
};

/**
 * Copies the airing drop into the music library proper.
 *
 * The server owns the files: it remuxes samo's identified tags and cover art
 * into the copy and leaves the original in Explore for rotation to collect.
 */
export const keepSamoRadioAiringTrack = async (
    trackId: string,
): Promise<SamoExploKeepResponse> => {
    const authentication = connection();
    if (!authentication) {
        throw new Error('Connect to a Samo server first.');
    }
    return keepMobileExploTracks({ authentication, trackIds: [trackId] });
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
 * The station a playable says the device should be tuned to, if it is one.
 *
 * Same ownership gate as {@link samoRadioRefForPlayable}, for the same reason:
 * a channel id from a server the phone has since left names nothing here.
 */
export const samoRadioStationRefForPlayable = (
    playable: MobilePlayableAudio | undefined,
): SamoRadioStationRef | null => {
    const authentication = connection();
    if (!playable || !authentication) {
        return null;
    }
    if (
        !findServerAuthenticationForSource(
            authentication,
            getContentSourceFromPlaybackItem(playable, authentication),
        )
    ) {
        return null;
    }
    return samoRadioStationRefFromPlayable(playable);
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

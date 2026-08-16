import { type SamoRadioItemRef } from '@samo/core/server';

/**
 * Turning what the desktop is playing into something samo-radio can be asked to
 * play.
 *
 * A pure module: this is the logic worth unit-testing, and a test should not
 * have to stand up four zustand stores to reach it. The store-reading wrappers
 * live in the surfaces that call them.
 *
 * Everything here is ids only. The server resolves each id to a stream URL, so
 * that mapping exists in exactly one place and a client cannot point the device
 * at an arbitrary address.
 */

/** The minimum of a queue entry this mapping needs. */
export interface SamoRadioSendableSong {
    _serverId: string;
    id: string;
}

/**
 * One track's reference, or null if this server cannot resolve it.
 *
 * `serverId` is the ownership gate. A catalog id only means something on the
 * server that issued it, and a queue can outlive a server switch — playback
 * keeps going while you connect somewhere else — so shipping the old server's
 * ids to the new one's aux port would ask it to play tracks it has never heard
 * of.
 */
export const samoRadioRefForSong = (
    song: SamoRadioSendableSong | undefined,
    serverId: null | string | undefined,
): null | SamoRadioItemRef => {
    if (!song?.id || !serverId || song._serverId !== serverId) {
        return null;
    }

    return { id: song.id, type: 'track' };
};

/**
 * Map a whole queue for sending, keeping the start index pointing at the same
 * track.
 *
 * Dropping an entry renumbers everything after it, so the caller's index into
 * the original queue is not an index into this one. Returning both together is
 * what stops "play on the stereo" starting several tracks early. When the
 * current item is itself dropped, the device starts at the next surviving item
 * rather than at the top of the queue.
 */
export const samoRadioQueueForSend = (
    songs: readonly SamoRadioSendableSong[],
    index: number,
    serverId: null | string | undefined,
): { items: SamoRadioItemRef[]; startIndex: number } => {
    const items: SamoRadioItemRef[] = [];
    const from = Math.max(0, index);
    let startIndex = 0;
    let currentFound = false;

    songs.forEach((song, position) => {
        const ref = samoRadioRefForSong(song, serverId);
        if (!ref) {
            return;
        }

        if (!currentFound && position >= from) {
            startIndex = items.length;
            currentFound = true;
        }

        items.push(ref);
    });

    return { items, startIndex };
};

/**
 * A catalog item's own reference, for the kinds samo-radio resolves by id.
 *
 * An audiobook is a single id the server expands on its side — the desktop
 * neither knows nor needs to know which files a book is made of. Albums and
 * playlists have no such type: they are sent as their tracks, which is why they
 * go through `samoRadioQueueForSend` after a fetch instead of through here.
 */
export const samoRadioRefForItem = (
    item: null | undefined | { id?: null | string },
    type: SamoRadioItemRef['type'],
    isOwnedByServer: boolean,
): null | SamoRadioItemRef => (item?.id && isOwnedByServer ? { id: item.id, type } : null);

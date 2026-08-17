import { type MobileMediaTrack } from '@samo/core/mobile';
import { type SamoRadioItemRef, type SamoRadioStationRef } from '@samo/core/server';

import {
    isSamoRadioResolvableSource,
    samoRadioRefForCatalogItem,
    samoRadioRefForPlayable,
    samoRadioSendPayloadForQueue,
    samoRadioStationRefForPlayable,
    sendToSamoRadio,
    tuneSamoRadio,
} from '../services/samo-radio';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import { type MediaContextMenuKind } from '../contexts/media-context-menu';
import { setContextMenuFeedback } from '../state/media-overlays';
import { patchSamoRadioDeviceState, type SamoRadioTarget } from '../state/samo-radio';
import { loadDetailForContextAction } from './queue-handlers';

/**
 * "Play this over there" from a long-press menu.
 *
 * The output picker hands over the CURRENT queue and pauses the phone, because
 * that is a change of output for what you are already listening to. This is the
 * other half: any piece of media, from any surface, straight onto the stereo
 * without disturbing playback here. Nothing is paused for the same reason
 * nothing is queued — the user pointed at something else.
 */

/**
 * Which catalog kinds can be sent.
 *
 * Artists and podcast shows are absent for the same reason they have no Add to
 * Queue: "the whole feed" is not a thing anyone means by a single tap.
 */
export type SamoRadioSendableKind = Extract<
    MediaContextMenuKind,
    'album' | 'audiobook' | 'playlist' | 'radio'
>;

/**
 * Whether to offer the action at all — cheap and synchronous, so the menu can
 * decide while it is being built rather than growing a row a beat later.
 *
 * These answer the same question the send itself asks, from the same helpers,
 * so an offered action is one that can actually run.
 */
export const canSendTrackToSamoRadio = (track: MobileMediaTrack): boolean =>
    samoRadioRefForPlayable(track.playback) !== null;

export const canSendItemToSamoRadio = (
    item: AndroidRecentContentSourceItem,
    kind: SamoRadioSendableKind,
): boolean =>
    kind === 'radio'
        ? samoRadioRefForPlayable(item.playback) !== null ||
          samoRadioStationRefForPlayable(item.playback) !== null
        : isSamoRadioResolvableSource(item.source);

const deviceLabel = (device: SamoRadioTarget): string => device.name || 'samo-radio';

const dispatchToDevice = async (
    refs: SamoRadioItemRef[],
    device: SamoRadioTarget,
): Promise<void> => {
    if (refs.length === 0) {
        setContextMenuFeedback('Nothing here samo-radio can play.');
        return;
    }
    try {
        const state = await sendToSamoRadio({ deviceId: device.id, items: refs });
        // The response IS the device's new state — folding it in means the
        // Radio tab's panel is already correct when the user gets there,
        // instead of showing the previous programme until the next poll.
        patchSamoRadioDeviceState(device.id, state);
        setContextMenuFeedback(`Playing on ${deviceLabel(device)}`);
    } catch (error) {
        setContextMenuFeedback(
            error instanceof Error ? error.message : `Could not reach ${deviceLabel(device)}.`,
        );
    }
};

/**
 * Tune the device to a station instead of handing it a queue.
 *
 * A Samo channel has no copy to send and no position to start from: the device
 * joins the broadcast where it already is. Same feedback as a send, because
 * from the user's side it is the same gesture and the same outcome — that thing
 * is now playing over there.
 */
const tuneDeviceToStation = async (
    station: SamoRadioStationRef,
    device: SamoRadioTarget,
): Promise<void> => {
    try {
        const state = await tuneSamoRadio(device.id, station);
        patchSamoRadioDeviceState(device.id, state);
        setContextMenuFeedback(`Playing on ${deviceLabel(device)}`);
    } catch (error) {
        setContextMenuFeedback(
            error instanceof Error ? error.message : `Could not reach ${deviceLabel(device)}.`,
        );
    }
};

export const handleSendTrackToSamoRadio = async (
    track: MobileMediaTrack,
    device: SamoRadioTarget,
): Promise<void> => {
    const ref = samoRadioRefForPlayable(track.playback);
    if (!ref) {
        setContextMenuFeedback('Nothing here samo-radio can play.');
        return;
    }
    setContextMenuFeedback(`Sending to ${deviceLabel(device)}…`);
    await dispatchToDevice([ref], device);
};

export const handleSendItemToSamoRadio = async (
    item: AndroidRecentContentSourceItem,
    kind: SamoRadioSendableKind,
    device: SamoRadioTarget,
): Promise<void> => {
    setContextMenuFeedback(`Sending to ${deviceLabel(device)}…`);

    if (kind === 'audiobook') {
        // One id the server expands into the book's files itself — the phone
        // neither knows nor needs to know what a book is made of, so no detail
        // fetch here.
        const ref = samoRadioRefForCatalogItem(item, 'audiobook');
        await dispatchToDevice(ref ? [ref] : [], device);
        return;
    }

    if (kind === 'radio') {
        // Strictly from the tile's own playback: internet, programmed and
        // channel stations are separate catalogs with freely-colliding ids, and
        // only the playback id says which one this is. Guessing would tune the
        // stereo to a different station.
        const station = samoRadioStationRefForPlayable(item.playback);
        if (station) {
            await tuneDeviceToStation(station, device);
            return;
        }
        const ref = samoRadioRefForPlayable(item.playback);
        await dispatchToDevice(ref ? [ref] : [], device);
        return;
    }

    // Albums and playlists go as their tracks. The detail read is mirror-first,
    // so this is normally local — the same path Add to Queue takes.
    const detail = await loadDetailForContextAction(item);
    if (!detail) {
        setContextMenuFeedback('Could not load tracks for this item.');
        return;
    }
    const playables = detail.tracks.flatMap((track) => (track.playback ? [track.playback] : []));
    // Mapped as a queue rather than one by one: it applies the same ownership
    // gate and drops what this server cannot resolve, in one pass.
    const { items } = samoRadioSendPayloadForQueue({ index: 0, items: playables });
    await dispatchToDevice(items, device);
};

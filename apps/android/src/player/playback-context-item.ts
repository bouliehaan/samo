import {
    getMobileContentSource,
    MobileHomeItemType,
    MobileSearchItemType,
    parsePodcastPlaybackShowId,
    parseSamoAudiobookIdFromPlaybackId,
    type MobileHomeItem,
    type MobilePlayableAudio,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type MediaContextMenuApi } from '../contexts/media-context-menu';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { getPlaybackQueue } from '../state/playback-queue-store';

/**
 * Map the currently-playing audio back to a catalog item the media context
 * menu can act on (so "Go to Album" etc. hit real underlying ids).
 *
 * contentSourceId is set on newly-built playback objects, but a track
 * persisted as lastPlayedItem before this build won't have it — so also fall
 * back to extracting the prefix from the well-known playback id format
 * `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
 */
export const buildPlaybackContextItem = (
    item: MobilePlayableAudio,
    serverConnection: ServerAuthenticationResult | null,
): MobileHomeItem | MobileSearchItem | null => {
    const idPrefixMatch = item.id.match(
        /^([^:]+:[^:]+):(?:music|audiobook|podcast(?:-episode)?|radio):/,
    );
    const sourceId = item.contentSourceId ?? idPrefixMatch?.[1];
    const auth =
        sourceId && serverConnection && getPersistedServerAuthKey(serverConnection) === sourceId
            ? serverConnection
            : undefined;
    const contentSource = auth ? getMobileContentSource(auth) : undefined;
    // Strip the playback-id prefix so menu actions address the inner entity id.
    const idMatch = item.id.match(/:(?:music|audiobook|podcast(?:-episode)?|radio):(.+)$/);
    const innerId = idMatch ? idMatch[1] : item.id;

    if (item.source === 'music') {
        const songItem: MobileSearchItem = {
            album: item.album,
            albumId: item.albumId,
            artist: item.artist,
            artistId: item.artistId,
            artworkImageId: item.artworkImageId,
            artworkUrl: item.artworkUrl,
            id: innerId,
            playback: item,
            source: contentSource,
            subtitle: item.subtitle,
            title: item.title,
            type: MobileSearchItemType.SONG,
        };
        return songItem;
    }

    if (item.source === 'radio') {
        const radioItem: MobileHomeItem = {
            artworkUrl: item.artworkUrl,
            id: innerId,
            playback: item,
            source: contentSource,
            subtitle: item.subtitle,
            title: item.title,
            type: MobileHomeItemType.RADIO,
        };
        return radioItem;
    }

    if (item.source === 'audiobook' || item.source === 'podcast') {
        // A book plays one file at a time, so the queue's id is
        // `…:audiobook:<bookId>:file:<mediaFileId>` — and every action this
        // menu offers (favourite, book info, chapters, send it to the stereo)
        // addresses the BOOK. Keeping the trailing file segment made the item
        // an id the server has never heard of.
        const ownerId =
            parsePodcastPlaybackShowId(item.id) ??
            (item.source === 'podcast'
                ? innerId.split(':')[0]
                : (parseSamoAudiobookIdFromPlaybackId(item.id) ?? innerId));
        const homeItem: MobileHomeItem = {
            artworkUrl: item.artworkUrl,
            id: ownerId,
            source: contentSource,
            subtitle: item.subtitle,
            title: item.title,
            type:
                item.source === 'audiobook'
                    ? MobileHomeItemType.AUDIOBOOK
                    : MobileHomeItemType.PODCAST,
        };
        return homeItem;
    }

    return null;
};

/**
 * The long-press menu for what is playing — the full player's "more" button,
 * on the phone and the TV alike.
 *
 * The queue stands in for the detail page the player doesn't have, so
 * Explore's Keep in Library (and its copy-first playlist add) are still offered
 * for the track you are actually listening to. Read at open time, not
 * subscribed — the menu is built from this one snapshot.
 */
export const openPlaybackContextMenu = (
    openForItem: MediaContextMenuApi['openForItem'],
    item: MobilePlayableAudio | null,
    serverConnection: ServerAuthenticationResult | null,
): void => {
    if (!item) {
        return;
    }
    const menuItem = buildPlaybackContextItem(item, serverConnection);
    if (!menuItem) {
        return;
    }
    const queue = getPlaybackQueue();
    // Remove from Playlist needs all three to hold, and asking here is the only
    // place they can all be asked: the queue was started from a playlist this
    // user may write (stamped at play time, since the player never sees a
    // detail), this is a music track, and the track is one of that playlist's
    // own rather than something appended to Up Next while it played.
    // `menuItem.id` is the catalog track id — the same id space the playlist's
    // membership is listed in.
    const editablePlaylist = queue?.editablePlaylist;
    const queuePlaylist =
        editablePlaylist &&
        item.source === 'music' &&
        editablePlaylist.trackIds.includes(menuItem.id)
            ? editablePlaylist
            : undefined;
    openForItem(menuItem, {
        fromExplo: queue?.isExploPlaylist === true,
        queuePlaylist,
        suppressQueueAction: true,
    });
};

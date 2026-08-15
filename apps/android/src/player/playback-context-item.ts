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

import { getPersistedServerAuthKey } from '../services/persisted-server';

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

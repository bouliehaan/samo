import { loadMobileMediaDetail, MobileMediaDetailType } from '@samo/core/mobile';
import { findServerAuthenticationForSource } from '@samo/core/server';

import { getAuthSession } from '../state/auth-session';
import { isOfflineNow } from '../state/network-state';
import { androidLog } from '../utils/log';
import { pickDownloadedPlaylistCollections } from '../utils/downloaded-collections';
import { enqueueCollectionDownload, listDownloads } from './download-manager';

export interface TopUpDownloadedPlaylistsResult {
    enqueued: number;
    playlists: number;
}

const NOTHING: TopUpDownloadedPlaylistsResult = { enqueued: 0, playlists: 0 };

/**
 * Download whatever a downloaded playlist has gained since it was downloaded.
 *
 * A playlist download is a snapshot of the tracks it held at the moment it was
 * downloaded, and nothing ever revisited that: a song added afterwards — here,
 * on the desktop, by anyone else with write access — was simply absent offline,
 * and the only cure was to delete the download and take it again.
 *
 * So re-offer each downloaded playlist's CURRENT contents to the queue. The
 * native owner dedupes on (trackId, sourceId, collectionId) for every entry
 * that is queued, downloading or completed, so this enqueues exactly the tracks
 * that are new — and, because a failed row is not in that set, it also retries
 * the ones that never landed the first time.
 *
 * Scope it with `playlistId` when the caller knows which playlist just changed;
 * without it, every downloaded playlist is checked.
 */
export const topUpDownloadedPlaylists = async (options?: {
    playlistId?: string;
    sourceId?: string;
}): Promise<TopUpDownloadedPlaylistsResult> => {
    // Reading membership needs the server. Offline, there is nothing to learn
    // and the transfers could not run anyway.
    if (isOfflineNow()) {
        return NOTHING;
    }

    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return NOTHING;
    }

    const collections = pickDownloadedPlaylistCollections(await listDownloads(), options);
    if (collections.length === 0) {
        return NOTHING;
    }

    let enqueued = 0;

    for (const collection of collections) {
        const authentication = findServerAuthenticationForSource(serverConnection, {
            id: collection.sourceId,
        });
        if (!authentication) {
            continue;
        }

        try {
            // From the server rather than the on-device mirror. The edit that
            // prompted this has usually not been mirrored yet — the catalog
            // sync that would carry it is enqueued at the same moment — and a
            // remote edit may not have been either.
            const detail = await loadMobileMediaDetail({
                authentication,
                id: collection.id,
                type: MobileMediaDetailType.PLAYLIST,
            });
            const result = await enqueueCollectionDownload(detail, serverConnection);
            enqueued += result.enqueued;
        } catch (error) {
            // A playlist that has since been deleted, or a server that went
            // away mid-pass, must not stop the rest of them being topped up.
            androidLog.warn(`downloads: playlist top-up failed for ${collection.id}`, error);
        }
    }

    return { enqueued, playlists: collections.length };
};

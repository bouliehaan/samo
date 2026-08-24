import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, type SamoFetch } from '../server/server-http';
import {
    deleteSamoMusicPlaylist,
    keepSamoExploTracks,
    listSamoMusicPlaylistTracks,
    type SamoExploKeepResponse,
    updateSamoMusicPlaylist,
    uploadSamoMusicPlaylistCover,
} from '../server/server-samo';
import { collectSamoPages } from '../server/server-samo-pagination';
import { ServerType } from '../server/server-types';
import type { MobileMediaDetail } from './mobile-media-detail';
import { MobileMediaDetailType } from './mobile-media-detail';

export interface MobilePlaylistMeta {
    description?: string;
    editable: boolean;
    ownerId?: string;
    public?: boolean;
    system?: boolean;
}

export const isMobilePlaylistDetailEditable = (detail: MobileMediaDetail): boolean =>
    detail.type === MobileMediaDetailType.PLAYLIST && detail.playlistMeta?.editable === true;

// Single definition lives next to the detail loader that applies it; this file
// only re-exports so both halves of the playlist surface cannot drift apart.
export { isPlaylistOwnedByUser } from './mobile-media-detail';

export interface UpdateMobilePlaylistMetadataInput {
    authentication: ServerAuthenticationResult;
    description?: string;
    fetch?: SamoFetch;
    name?: string;
    playlistId: string;
    public?: boolean;
}

export const updateMobilePlaylistMetadata = async ({
    authentication,
    description,
    fetch: fetcher,
    name,
    playlistId,
    public: isPublic,
}: UpdateMobilePlaylistMetadataInput): Promise<void> => {
    const trimmedName = name?.trim();
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        await updateSamoMusicPlaylist(request, authentication, playlistId, {
            ...(trimmedName ? { name: trimmedName } : {}),
            ...(description !== undefined ? { description: description.trim() } : {}),
            ...(isPublic !== undefined ? { public: isPublic } : {}),
        });
        return;
    }

    throw new Error('Editing playlists is only available for Samo servers.');
};

export interface ReplaceMobilePlaylistTracksInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
    trackIds: string[];
}

export const replaceMobilePlaylistTracks = async ({
    authentication,
    fetch: fetcher,
    playlistId,
    trackIds,
}: ReplaceMobilePlaylistTracksInput): Promise<void> => {
    const filtered = trackIds.filter(Boolean);
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        await updateSamoMusicPlaylist(request, authentication, playlistId, {
            trackIds: filtered,
        });
        return;
    }

    throw new Error('Editing playlists is only available for Samo servers.');
};

export interface UploadMobilePlaylistCoverInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    file: Blob;
    filename?: string;
    playlistId: string;
}

export const uploadMobilePlaylistCover = async ({
    authentication,
    fetch: fetcher,
    file,
    filename,
    playlistId,
}: UploadMobilePlaylistCoverInput): Promise<void> => {
    if (authentication.type !== ServerType.SAMO) {
        throw new Error('Playlist cover upload is only supported on Samo servers.');
    }

    await uploadSamoMusicPlaylistCover(
        getFetch(fetcher),
        authentication,
        playlistId,
        file,
        filename,
    );
};

export interface DeleteMobilePlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
}

export const deleteMobilePlaylist = async ({
    authentication,
    fetch: fetcher,
    playlistId,
}: DeleteMobilePlaylistInput): Promise<void> => {
    const request = getFetch(fetcher);

    if (authentication.type === ServerType.SAMO) {
        await deleteSamoMusicPlaylist(request, authentication, playlistId);
        return;
    }

    throw new Error('Deleting playlists is only available for Samo servers.');
};

/**
 * The playlist's CURRENT track ids, in playlist order, straight from the
 * server.
 *
 * Every membership edit is a read-modify-write, because Samo's playlist API
 * takes the whole `trackIds` list rather than a delta. That makes the list this
 * returns the base of a destructive write, so it has to be both complete and
 * fresh:
 *
 *  - Complete: a single limit=500 page silently truncated anything larger, and
 *    PATCHing that back is not a read of 500 tracks — it is a DELETE of every
 *    track past 500. Paginated to exhaustion, same as the detail loader.
 *  - Fresh: the caller's own track list may be the on-device mirror, which is
 *    only as current as the last sync. Rebuilding the playlist from a stale
 *    snapshot would silently undo whatever was added elsewhere in the meantime.
 */
export const listMobilePlaylistTrackIds = async (
    authentication: ServerAuthenticationResult,
    playlistId: string,
    fetch?: SamoFetch,
): Promise<string[]> => {
    if (authentication.type !== ServerType.SAMO) {
        return [];
    }

    const request = getFetch(fetch);
    const tracks = await collectSamoPages(500, 50_000, (offset) =>
        listSamoMusicPlaylistTracks(request, authentication, playlistId, { limit: 500, offset }),
    );
    return tracks.map((track) => track.id).filter(Boolean) as string[];
};

export interface RemoveMobileTracksFromPlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
    songIds: string[];
}

/**
 * Drop tracks from a playlist, leaving the rest in their existing order.
 *
 * Reads the server's current membership first rather than subtracting from a
 * list the caller already holds — see {@link listMobilePlaylistTrackIds} for
 * why that distinction is the difference between an edit and a data loss.
 *
 * Matching by track id is exact here, not a heuristic: the server dedupes
 * `trackIds` on every write, so a playlist cannot hold the same track twice and
 * an id identifies at most one entry.
 *
 * Removing something that is already gone is a no-op, not an error — the
 * requested end state is the state the playlist is already in, and the write is
 * skipped entirely.
 */
export const removeMobileTracksFromPlaylist = async ({
    authentication,
    fetch: fetcher,
    playlistId,
    songIds,
}: RemoveMobileTracksFromPlaylistInput): Promise<void> => {
    const removals = new Set(songIds.filter(Boolean));

    if (removals.size === 0) {
        throw new Error('No tracks were selected.');
    }

    if (authentication.type !== ServerType.SAMO) {
        throw new Error('Editing playlists is only available for Samo servers.');
    }

    const request = getFetch(fetcher);
    const current = await listMobilePlaylistTrackIds(authentication, playlistId, request);
    const remaining = current.filter((id) => !removals.has(id));

    if (remaining.length === current.length) {
        return;
    }

    await updateSamoMusicPlaylist(request, authentication, playlistId, {
        trackIds: remaining,
    });
};

/**
 * True for the server-managed explo "Explore" queue.
 *
 * Its tracks live in a drop folder that the weekly run empties, so they are
 * the only tracks in the app that vanish on their own — which is what makes
 * "Keep in Library" meaningful here and pointless everywhere else.
 */
export const isMobileExploPlaylistDetail = (detail: MobileMediaDetail): boolean =>
    detail.type === MobileMediaDetailType.PLAYLIST && detail.playlistMeta?.system === true;

/**
 * Copies explo drops into the music library proper. The server owns the files,
 * writes samo's identified metadata into each copy, and leaves the original in
 * Explore for the weekly rotation to collect.
 */
export const keepMobileExploTracks = async (input: {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    trackIds: string[];
}): Promise<SamoExploKeepResponse> => {
    return keepSamoExploTracks(getFetch(input.fetch), input.authentication, input.trackIds);
};

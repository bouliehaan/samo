import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, type SamoFetch } from '../server/server-http';
import {
    deleteSamoMusicPlaylist,
    listSamoMusicPlaylistTracks,
    samoItemsOf,
    updateSamoMusicPlaylist,
    uploadSamoMusicPlaylistCover,
} from '../server/server-samo';
import { ServerType } from '../server/server-types';
import type { MobileMediaDetail } from './mobile-media-detail';
import { MobileMediaDetailType } from './mobile-media-detail';

export interface MobilePlaylistMeta {
    description?: string;
    editable: boolean;
    ownerId?: string;
    public?: boolean;
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

/** Loads current Samo track ids when the caller only has a partial track list. */
export const listMobilePlaylistTrackIds = async (
    authentication: ServerAuthenticationResult,
    playlistId: string,
    fetch?: SamoFetch,
): Promise<string[]> => {
    if (authentication.type !== ServerType.SAMO) {
        return [];
    }

    const request = getFetch(fetch);
    const page = await listSamoMusicPlaylistTracks(request, authentication, playlistId, {
        limit: 500,
    });
    return samoItemsOf(page)
        .map((track) => track.id)
        .filter(Boolean) as string[];
};

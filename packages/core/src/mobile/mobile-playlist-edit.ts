import { type ServerAuthenticationResult } from '../server/server-auth';
import { getFetch, requestJson, type SamoFetch } from '../server/server-http';
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

type SubsonicError = { message?: string };

const subsonicUrl = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, boolean | number | string> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        params.set(key, String(value));
    }

    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};

const subsonicUrlWithMultiValueQuery = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, number | string | string[]> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        if (Array.isArray(value)) {
            value.forEach((entry) => params.append(key, entry));
            continue;
        }

        params.set(key, String(value));
    }

    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};

const assertSubsonicOk = (
    response: undefined | { error?: SubsonicError; status?: string },
    fallback: string,
) => {
    if (response?.status === 'ok') {
        return;
    }

    throw new Error(response?.error?.message ?? fallback);
};

export interface MobilePlaylistMeta {
    description?: string;
    editable: boolean;
    ownerId?: string;
    public?: boolean;
}

export const isMobilePlaylistDetailEditable = (detail: MobileMediaDetail): boolean =>
    detail.type === MobileMediaDetailType.PLAYLIST && detail.playlistMeta?.editable === true;

export const isPlaylistOwnedByUser = (
    authentication: ServerAuthenticationResult,
    ownerId?: string,
    ownerName?: string,
): boolean => {
    const userId = authentication.userId?.trim();
    if (authentication.type === ServerType.SAMO) {
        if (!ownerId) return true;
        return Boolean(userId && ownerId === userId);
    }
    if (
        authentication.type === ServerType.NAVIDROME ||
        authentication.type === ServerType.SUBSONIC
    ) {
        const owner = ownerName?.trim();
        if (!owner) return true;
        return Boolean(userId && owner === userId);
    }
    return false;
};

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

    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Editing playlists is only available for music servers.');
    }

    const body = await requestJson<{ 'subsonic-response'?: { status?: string } }>(
        request,
        subsonicUrl(authentication, 'updatePlaylist.view', {
            ...(trimmedName ? { name: trimmedName } : {}),
            ...(description !== undefined ? { comment: description.trim() } : {}),
            ...(isPublic !== undefined ? { public: isPublic } : {}),
            playlistId,
        }),
    );
    assertSubsonicOk(body['subsonic-response'], 'Failed to update playlist');
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

    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Editing playlists is only available for music servers.');
    }

    const detailBody = await requestJson<{
        'subsonic-response'?: {
            error?: SubsonicError;
            playlist?: { entry?: Array<{ id?: string | number }> | { id?: string | number } };
            status?: string;
        };
    }>(request, subsonicUrl(authentication, 'getPlaylist.view', { id: playlistId }));
    assertSubsonicOk(detailBody['subsonic-response'], 'Failed to load playlist');
    const entry = detailBody['subsonic-response']?.playlist?.entry;
    const entries = Array.isArray(entry) ? entry : entry ? [entry] : [];
    const existingIds = entries
        .map((song) => (song.id != null ? String(song.id) : ''))
        .filter(Boolean);

    if (existingIds.length > 0) {
        const indicesToRemove = existingIds.map((_, index) => String(index)).reverse();
        const removeBody = await requestJson<{ 'subsonic-response'?: { status?: string } }>(
            request,
            subsonicUrlWithMultiValueQuery(authentication, 'updatePlaylist.view', {
                playlistId,
                songIndexToRemove: indicesToRemove,
            }),
        );
        assertSubsonicOk(removeBody['subsonic-response'], 'Failed to update playlist tracks');
    }

    if (filtered.length === 0) {
        return;
    }

    const addBody = await requestJson<{ 'subsonic-response'?: { status?: string } }>(
        request,
        subsonicUrlWithMultiValueQuery(authentication, 'updatePlaylist.view', {
            playlistId,
            songIdToAdd: filtered,
        }),
    );
    assertSubsonicOk(addBody['subsonic-response'], 'Failed to update playlist tracks');
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

    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Deleting playlists is only available for music servers.');
    }

    const body = await requestJson<{ 'subsonic-response'?: { status?: string } }>(
        request,
        subsonicUrl(authentication, 'deletePlaylist.view', { id: playlistId }),
    );
    assertSubsonicOk(body['subsonic-response'], 'Failed to delete playlist');
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

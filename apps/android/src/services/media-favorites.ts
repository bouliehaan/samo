import {
    patchSamoPlayback,
    type SamoPlaybackTargetKind,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

const subsonicStarUrl = (
    authentication: ServerAuthenticationResult,
    endpoint: string,
    id: string,
    idParam: string,
): string => {
    const params = new URLSearchParams({
        [idParam]: id,
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    return `${authentication.url}/rest/${endpoint}?${params.toString()}&${authentication.credential}`;
};

const callStarEndpoint = async (
    authentication: ServerAuthenticationResult,
    endpoint: 'star.view' | 'unstar.view',
    id: string,
): Promise<void> => {
    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Favorites are only available on music servers.');
    }

    const url = subsonicStarUrl(authentication, endpoint, id, 'id');
    const response = await fetch(url);
    const body = (await response.json()) as { 'subsonic-response'?: { status?: string } };

    if (body['subsonic-response']?.status !== 'ok') {
        throw new Error(endpoint === 'star.view' ? 'Failed to star item' : 'Failed to unstar item');
    }
};

export const starSubsonicTrack = async (
    authentication: ServerAuthenticationResult,
    trackId: string,
): Promise<void> => {
    await callStarEndpoint(authentication, 'star.view', trackId);
};

export const unstarSubsonicTrack = async (
    authentication: ServerAuthenticationResult,
    trackId: string,
): Promise<void> => {
    await callStarEndpoint(authentication, 'unstar.view', trackId);
};

const callStarEndpointWithParam = async (
    authentication: ServerAuthenticationResult,
    endpoint: 'star.view' | 'unstar.view',
    idParam: 'albumId' | 'artistId',
    id: string,
): Promise<void> => {
    if (
        authentication.type !== ServerType.NAVIDROME &&
        authentication.type !== ServerType.SUBSONIC
    ) {
        throw new Error('Favorites are only available on music servers.');
    }

    const url = subsonicStarUrl(authentication, endpoint, id, idParam);
    const response = await fetch(url);
    const body = (await response.json()) as { 'subsonic-response'?: { status?: string } };

    if (body['subsonic-response']?.status !== 'ok') {
        throw new Error(endpoint === 'star.view' ? 'Failed to star item' : 'Failed to unstar item');
    }
};

export const starSubsonicAlbum = async (
    authentication: ServerAuthenticationResult,
    albumId: string,
): Promise<void> => {
    await callStarEndpointWithParam(authentication, 'star.view', 'albumId', albumId);
};

export const unstarSubsonicAlbum = async (
    authentication: ServerAuthenticationResult,
    albumId: string,
): Promise<void> => {
    await callStarEndpointWithParam(authentication, 'unstar.view', 'albumId', albumId);
};

export const starSubsonicArtist = async (
    authentication: ServerAuthenticationResult,
    artistId: string,
): Promise<void> => {
    await callStarEndpointWithParam(authentication, 'star.view', 'artistId', artistId);
};

export const unstarSubsonicArtist = async (
    authentication: ServerAuthenticationResult,
    artistId: string,
): Promise<void> => {
    await callStarEndpointWithParam(authentication, 'unstar.view', 'artistId', artistId);
};

export const setSamoMusicFavorite = async (
    authentication: ServerAuthenticationResult,
    kind: Extract<SamoPlaybackTargetKind, 'music-album' | 'music-artist' | 'music-track'>,
    id: string,
    favorite: boolean,
): Promise<void> => {
    if (authentication.type !== ServerType.SAMO) {
        throw new Error('Samo favorites require a Samo server.');
    }

    await patchSamoPlayback(samoFetch, authentication, kind, id, { favorite });
};

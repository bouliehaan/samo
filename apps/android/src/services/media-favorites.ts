import {
    patchSamoPlayback,
    type SamoPlaybackTargetKind,
    type ServerAuthenticationResult,
    ServerType,
} from '@samo/core/server';

const samoFetch: typeof fetch = (url, init) => fetch(url, init);

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

// Recents: what the signed-in user last played, as the server recorded it.
//
// Clients keep their own Recents list too, but only on the device: clearing
// a browser's site data or signing in somewhere new left it empty although
// every play was on record. This is that record read back at the level a
// person picks things — an album rather than its tracks, a show rather than
// its episodes — newest first, with the entity attached so an entry can be
// drawn without a second request.

import { type ServerAuthenticationResult } from './server-auth';
import { type SamoFetch } from './server-http';
import {
    type SamoAudiobook,
    type SamoMusicAlbum,
    type SamoMusicPlaylist,
    type SamoMusicTrack,
    type SamoPodcast,
    samoGet,
} from './server-samo';

/**
 * The values are the clients' own recent-item types. Artists are not among
 * them: every track play stamps its artists, so they say nothing an album
 * entry does not.
 */
export type SamoRecentKind = 'album' | 'audiobook' | 'playlist' | 'podcast' | 'song';

/** Exactly one entity field is set, matching `kind`. */
export interface SamoRecentItem {
    album?: SamoMusicAlbum;
    audiobook?: SamoAudiobook;
    id: string;
    kind: SamoRecentKind;
    playedAt: string;
    playlist?: SamoMusicPlaylist;
    podcast?: SamoPodcast;
    track?: SamoMusicTrack;
}

export interface SamoRecentsResponse {
    items: SamoRecentItem[];
}

export const listSamoRecents = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    options?: { limit?: number; signal?: AbortSignal },
): Promise<SamoRecentsResponse> => {
    return samoGet<SamoRecentsResponse>(fetcher, authentication, '/users/me/recents', {
        query: { limit: options?.limit },
        signal: options?.signal,
    });
};

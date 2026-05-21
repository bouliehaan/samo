import { z } from 'zod';
import { ssType } from '/@/shared/api/subsonic/subsonic-types';
import { Album, AlbumArtist, Folder, Genre, InternetRadioStation, Playlist, ServerListItemWithCredential, Song } from '/@/shared/types/domain-types';
export declare const ssNormalize: {
    album: (item: z.infer<typeof ssType._response.album> | z.infer<typeof ssType._response.albumListEntry>, server?: null | ServerListItemWithCredential, pathReplace?: string, pathReplaceWith?: string) => Album;
    albumArtist: (item: (z.infer<typeof ssType._response.albumArtist> & {
        similarArtists?: z.infer<typeof ssType._response.artistInfo>["artistInfo"]["similarArtist"];
    }) | (z.infer<typeof ssType._response.artistListEntry> & {
        similarArtists?: z.infer<typeof ssType._response.artistInfo>["artistInfo"]["similarArtist"];
    }), server?: null | ServerListItemWithCredential) => AlbumArtist;
    folder: (item: z.infer<typeof ssType._response.directory>, server?: null | ServerListItemWithCredential, pathReplace?: string, pathReplaceWith?: string) => Folder;
    genre: (item: z.infer<typeof ssType._response.genre>, server: null | ServerListItemWithCredential) => Genre;
    internetRadioStation: (item: z.infer<typeof ssType._response.internetRadioStation>) => InternetRadioStation;
    playlist: (item: z.infer<typeof ssType._response.playlist> | z.infer<typeof ssType._response.playlistListEntry>, server?: null | ServerListItemWithCredential) => Playlist;
    song: (item: z.infer<typeof ssType._response.song>, server?: null | ServerListItemWithCredential, pathReplace?: string, pathReplaceWith?: string, playlistIndex?: number, discTitleMap?: Map<number, string>) => Song;
};

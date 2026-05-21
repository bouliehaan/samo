import z from 'zod';
import { ndType } from '/@/shared/api/navidrome/navidrome-types';
import { ssType } from '/@/shared/api/subsonic/subsonic-types';
import { Album, AlbumArtist, Genre, InternetRadioStation, Playlist, Song, User } from '/@/shared/types/domain-types';
import { ServerListItem } from '/@/shared/types/types';
export declare const ndNormalize: {
    album: (item: z.infer<typeof ndType._response.album> & {
        songs?: z.infer<typeof ndType._response.songList>;
    }, server?: null | ServerListItem, pathReplace?: string, pathReplaceWith?: string) => Album;
    albumArtist: (item: z.infer<typeof ndType._response.albumArtist> & {
        similarArtists?: z.infer<typeof ssType._response.artistInfo>["artistInfo"]["similarArtist"];
    }, server?: null | ServerListItem) => AlbumArtist;
    genre: (item: z.infer<typeof ndType._response.genre> & {
        albumCount?: number;
        songCount?: number;
    }, server: null | ServerListItem) => Genre;
    internetRadioStation: (item: z.infer<typeof ndType._response.radioStation>) => InternetRadioStation;
    playlist: (item: z.infer<typeof ndType._response.playlist>, server?: null | ServerListItem) => Playlist;
    song: (item: z.infer<typeof ndType._response.playlistSong> | z.infer<typeof ndType._response.song>, server?: null | ServerListItem, pathReplace?: string, pathReplaceWith?: string) => Song;
    user: (item: z.infer<typeof ndType._response.user>) => User;
};

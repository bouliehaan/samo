import { z } from 'zod';
import { jfType } from '/@/shared/api/jellyfin/jellyfin-types';
import { Album, AlbumArtist, Folder, Genre, MusicFolder, Playlist, Song } from '/@/shared/types/domain-types';
import { ServerListItem } from '/@/shared/types/types';
export declare const jfNormalize: {
    album: (item: z.infer<typeof jfType._response.album>, server: null | ServerListItem, pathReplace?: string, pathReplaceWith?: string) => Album;
    albumArtist: (item: z.infer<typeof jfType._response.albumArtist> & {
        similarArtists?: z.infer<typeof jfType._response.albumArtistList>;
    }, server: null | ServerListItem) => AlbumArtist;
    folder: (item: z.infer<typeof jfType._response.folder>, server: null | ServerListItem) => Folder;
    genre: (item: z.infer<typeof jfType._response.genre>, server: null | ServerListItem) => Genre;
    musicFolder: (item: z.infer<typeof jfType._response.musicFolder>) => MusicFolder;
    playlist: (item: z.infer<typeof jfType._response.playlist>, server: null | ServerListItem) => Playlist;
    song: (item: z.infer<typeof jfType._response.song>, server: null | ServerListItem, pathReplace?: string, pathReplaceWith?: string) => Song;
};

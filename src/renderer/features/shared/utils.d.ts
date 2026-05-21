import Fuse from 'fuse.js';
import z from 'zod';
import { Album, AlbumArtist, Artist, Genre, InternetRadioStation, LibraryItem, Playlist, QueueSong, Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
export declare const PLAY_TYPES: {
    label: string;
    play: Play;
}[];
export declare const customFiltersSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
declare enum AlbumFilterKeys {
    _CUSTOM = "_custom",
    ARTIST_IDS = "artistIds",
    COMPILATION = "compilation",
    FAVORITE = "favorite",
    GENRE_ID = "genreIds",
    HAS_RATING = "hasRating",
    MAX_YEAR = "maxYear",
    MIN_YEAR = "minYear",
    RECENTLY_PLAYED = "isRecentlyPlayed"
}
declare enum ArtistFilterKeys {
    ROLE = "role"
}
declare enum SharedFilterKeys {
    MUSIC_FOLDER_ID = "musicFolderId",
    SEARCH_TERM = "searchTerm",
    SORT_BY = "sortBy",
    SORT_ORDER = "sortOrder"
}
declare enum SongFilterKeys {
    _CUSTOM = "_custom",
    ALBUM_ARTIST_IDS = "albumArtistIds",
    ALBUM_ARTIST_IDS_MODE = "albumArtistIdsMode",
    ARTIST_IDS = "artistIds",
    ARTIST_IDS_MODE = "artistIdsMode",
    FAVORITE = "favorite",
    GENRE_ID = "genreIds",
    GENRE_ID_MODE = "genreIdsMode",
    HAS_RATING = "hasRating",
    MAX_YEAR = "maxYear",
    MIN_YEAR = "minYear"
}
declare enum FolderFilterKeys {
    FOLDER_PATH = "folderPath"
}
declare enum PlaylistFilterKeys {
    CUSTOM = "_custom"
}
export declare const FILTER_KEYS: {
    ALBUM: typeof AlbumFilterKeys;
    ARTIST: typeof ArtistFilterKeys;
    FOLDER: typeof FolderFilterKeys;
    PAGINATION: {
        CURRENT_PAGE: string;
        SCROLL_OFFSET: string;
    };
    PLAYLIST: typeof PlaylistFilterKeys;
    SHARED: typeof SharedFilterKeys;
    SONG: typeof SongFilterKeys;
};
interface CreateFuseOptions {
    fieldNormWeight?: number;
    ignoreLocation?: boolean;
    threshold?: number;
}
type FuseSearchableItem = Album | AlbumArtist | Artist | Genre | InternetRadioStation | Playlist | QueueSong | Song;
export declare const createFuseForLibraryItem: <T extends FuseSearchableItem>(items: T[], itemType: LibraryItem, options?: CreateFuseOptions) => Fuse<T>;
export declare const searchLibraryItems: <T extends FuseSearchableItem>(items: T[], searchTerm: string | undefined, itemType: LibraryItem, options?: CreateFuseOptions) => T[];
export {};

import { Play, PlayerQueueType, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerType } from '@samo/core/playback';
import { ServerType } from '@samo/core/server';
import { AppRoute } from '@ts-rest/core';
import { TFunction } from 'i18next';
import { ReactNode } from 'react';
import { Album, AlbumArtist, Artist, LibraryItem, Playlist, QueueSong, Song } from '/@/shared/types/domain-types';
import { ServerFeatures } from '/@/shared/types/features-types';
export { Play, PlayerQueueType, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerType };
export { ServerType } from '@samo/core/server';
export declare enum ItemListKey {
    ALBUM = "album",
    ALBUM_ARTIST = "albumArtist",
    ALBUM_ARTIST_ALBUM = "albumArtistAlbum",
    ALBUM_ARTIST_SONG = "albumArtistSong",
    ALBUM_DETAIL = "albumDetail",
    ARTIST = "artist",
    FOLDER = "folder",
    FULL_SCREEN = "fullScreen",
    GENRE = "genre",
    GENRE_ALBUM = "genreAlbum",
    GENRE_SONG = "genreSong",
    PLAYLIST = "playlist",
    PLAYLIST_ALBUM = "playlistAlbum",
    PLAYLIST_SONG = "playlistSong",
    QUEUE_SONG = "queueSong",
    RADIO = "radio",
    SIDE_QUEUE = "sideQueue",
    SONG = "song"
}
export declare enum ListDisplayType {
    DETAIL = "detail",
    GRID = "poster",
    LIST = "list",
    TABLE = "table"
}
export declare enum ListPaginationType {
    INFINITE = "infinite",
    PAGINATED = "paginated"
}
export declare enum Platform {
    LINUX = "linux",
    MACOS = "macos",
    WEB = "web",
    WINDOWS = "windows"
}
export type CardRoute = {
    route: AppRoute | string;
    slugs?: RouteSlug[];
};
export type CardRow<T> = {
    arrayProperty?: string;
    format?: (value: T, t: TFunction) => ReactNode;
    property: keyof T;
    route?: CardRoute;
};
export type ListPagination = {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
};
export type RouteSlug = {
    idProperty: string;
    slugProperty: string;
};
export declare const toServerType: (value?: string) => null | ServerType;
export declare enum AuthState {
    INVALID = "invalid",
    LOADING = "loading",
    VALID = "valid"
}
export declare enum CrossfadeStyle {
    CONSTANT_POWER = "constantPower",
    CONSTANT_POWER_SLOW_CUT = "constantPowerSlowCut",
    CONSTANT_POWER_SLOW_FADE = "constantPowerSlowFade",
    DIPPED = "dipped",
    EQUAL_POWER = "equalPower",
    EXPONENTIAL = "exponential",
    LINEAR = "linear",
    S_CURVE = "sCurve"
}
export declare enum FontType {
    BUILT_IN = "builtIn",
    CUSTOM = "custom",
    SYSTEM = "system"
}
export declare enum PlayerStyle {
    CROSSFADE = "crossfade",
    GAPLESS = "gapless"
}
export declare enum TableColumn {
    ACTIONS = "actions",
    ALBUM = "album",
    ALBUM_ARTIST = "albumArtists",
    ALBUM_COUNT = "albumCount",
    ALBUM_GROUP = "albumGroup",
    ARTIST = "artists",
    BIOGRAPHY = "biography",
    BIT_DEPTH = "bitDepth",
    BIT_RATE = "bitRate",
    BPM = "bpm",
    CHANNELS = "channels",
    CODEC = "container",
    COMMENT = "comment",
    COMPOSER = "composer",
    DATE_ADDED = "createdAt",
    DISC_NUMBER = "discNumber",
    DURATION = "duration",
    GENRE = "genres",
    GENRE_BADGE = "genreBadge",
    ID = "id",
    IMAGE = "imageUrl",
    LAST_PLAYED = "lastPlayedAt",
    LAYOUT_FILL = "__layoutFill",
    OWNER = "username",
    PATH = "path",
    PLAY_COUNT = "playCount",
    PLAYLIST_REORDER = "playlistReorder",
    RELEASE_DATE = "releaseDate",
    ROW_INDEX = "rowIndex",
    SAMPLE_RATE = "sampleRate",
    SIZE = "size",
    SKIP = "skip",
    SONG_COUNT = "songCount",
    TITLE = "name",
    TITLE_ARTIST = "titleArtist",
    TITLE_COMBINED = "titleCombined",
    TRACK_NUMBER = "trackNumber",
    USER_FAVORITE = "userFavorite",
    USER_RATING = "userRating",
    YEAR = "releaseYear"
}
export type DiscoveredServerItem = {
    name: string;
    type: ServerType;
    url: string;
};
export type GridCardData = {
    cardControls: any;
    cardRows: CardRow<Album | AlbumArtist | Artist | Playlist | Song>[];
    columnCount: number;
    display: ListDisplayType;
    handleFavorite: (options: {
        id: string[];
        isFavorite: boolean;
        itemType: LibraryItem;
    }) => void;
    handlePlayQueueAdd: (options: PlayQueueAddOptions) => void;
    itemCount: number;
    itemData: any[];
    itemGap: number;
    itemHeight: number;
    itemType: LibraryItem;
    itemWidth: number;
    playButtonBehavior: Play;
    resetInfiniteLoaderCache: () => void;
    route: CardRoute;
};
export type PlayQueueAddOptions = {
    byData?: QueueSong[];
    byItemType?: {
        id: string[];
        type: LibraryItem;
    };
    initialIndex?: number;
    initialSongId?: string;
    playType: Play;
    query?: Record<string, any>;
};
export type QueryBuilderGroup = {
    group: QueryBuilderGroup[];
    rules: QueryBuilderRule[];
    type: 'all' | 'any';
    uniqueId: string;
};
export type QueryBuilderRule = {
    field?: null | string;
    operator?: null | string;
    uniqueId: string;
    value?: any | Date | null | number | string | undefined;
};
export type ServerListItem = {
    credential: string;
    features?: ServerFeatures;
    id: string;
    name: string;
    ndCredential?: string;
    preferRemoteUrl?: boolean;
    remoteUrl?: string;
    savePassword?: boolean;
    type: ServerType;
    url: string;
    userId: null | string;
    username: string;
    version?: string;
};
export type SongState = {
    position?: number;
    repeat?: PlayerRepeat;
    shuffle?: boolean;
    song?: QueueSong;
    status?: PlayerStatus;
    /** This volume is in range 0-100 */
    volume?: number;
};
export type TitleTheme = 'dark' | 'light' | 'system';
export interface UniqueId {
    uniqueId: string;
}
export type WebAudio = {
    context: AudioContext;
    gains: GainNode[];
    visualizerInputs?: AudioNode[];
};

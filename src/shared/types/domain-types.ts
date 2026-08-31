import type { QualityBadgeProfile } from '@samo/core/audio-quality';

import { ExplicitStatus, LibraryItem } from '@samo/core/library';
import { type ServerListItemCore, type ServerListItemWithCredentialCore } from '@samo/core/server';

import { PlayerStatus } from '/@/shared/types/types';

export { ExplicitStatus, LibraryItem } from '@samo/core/library';
export { ServerType } from '@samo/core/server';

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export type AnyLibraryItem = Album | AlbumArtist | Artist | Playlist | QueueSong | Song;

export type AnyLibraryItems =
    | Album[]
    | AlbumArtist[]
    | Artist[]
    | Playlist[]
    | QueueSong[]
    | Song[];

export interface PlayerData {
    currentSong: QueueSong | undefined;
    index: number;
    nextSong: QueueSong | undefined;
    num: 1 | 2;
    player1: QueueSong | undefined;
    player2: QueueSong | undefined;
    previousSong: QueueSong | undefined;
    queueLength: number;
    status: PlayerStatus;
}

export interface QueueData {
    /** The play order. Shuffle reorders this list rather than being applied on read. */
    default: string[];
    /** Bumped when song records change without reordering; drives playback snapshot refresh. */
    revision?: number;
    songs: Record<string, QueueSong>;
    /**
     * The order `default` held before shuffle was switched on, so switching it off
     * puts the queue back. Null whenever shuffle is off.
     */
    unshuffled: null | string[];
}

export type QueueSong = Song & {
    _uniqueId: string;
};

export interface SavedCollection {
    filterQueryString: string;
    id: string;
    name: string;
    type: LibraryItem.ALBUM | LibraryItem.SONG;
}

export type ServerListItem = ServerListItemCore;

export type ServerListItemWithCredential = ServerListItemWithCredentialCore;

export type User = {
    createdAt: null | string;
    email: null | string;
    id: string;
    isAdmin: boolean | null;
    lastLoginAt: null | string;
    name: string;
    updatedAt: null | string;
};

type SortOrderMap = Record<string, never>;

export const sortOrderMap: SortOrderMap = {};

export enum ExternalSource {
    LASTFM = 'LASTFM',
    MUSICBRAINZ = 'MUSICBRAINZ',
    SPOTIFY = 'SPOTIFY',
    THEAUDIODB = 'THEAUDIODB',
}

export enum ExternalType {
    ID = 'ID',
    LINK = 'LINK',
}

export enum GenreListSort {
    NAME = 'name',
}

export enum ImageType {
    BACKDROP = 'BACKDROP',
    LOGO = 'LOGO',
    PRIMARY = 'PRIMARY',
    SCREENSHOT = 'SCREENSHOT',
}

export enum TagListSort {
    NAME = 'name',
}

export type Album = {
    _itemType: LibraryItem.ALBUM;
    _serverId: string;
    albumArtistName: string;
    albumArtists: RelatedArtist[];
    artists: RelatedArtist[];
    comment: null | string;
    createdAt: string;
    duration: null | number;
    explicitStatus: ExplicitStatus | null;
    genres: Genre[];
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    isCompilation: boolean | null;
    lastPlayedAt: null | string;
    mbzId: null | string;
    mbzReleaseGroupId: null | string;
    name: string;
    originalDate: null | PartialIsoDateString;
    originalYear: number;
    participants: null | Record<string, RelatedArtist[]>;
    playCount: null | number;
    /** Populated for Samo albums, for hi-res badges. */
    qualityProfile?: QualityBadgeProfile;
    recordLabels: string[];
    releaseDate: null | PartialIsoDateString;
    releaseType: null | string;
    releaseTypes: string[];
    releaseYear: null | number;
    size: null | number;
    songCount: null | number;
    songs?: Song[];
    sortName: string;
    tags: null | Record<string, string[]>;
    updatedAt: string;
    userFavorite: boolean;
    version: null | string;
} & { songs?: Song[] };

export type AlbumArtist = {
    _itemType: LibraryItem.ALBUM_ARTIST;
    _serverId: string;
    albumCount: null | number;
    biography: null | string;
    duration: null | number;
    genres: Genre[];
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    lastPlayedAt: null | string;
    mbz: null | string;
    name: string;
    playCount: null | number;
    similarArtists: null | RelatedArtist[];
    songCount: null | number;
    uploadedImage?: string;
    userFavorite: boolean;
};

export type Artist = Omit<AlbumArtist, '_itemType'> & {
    _itemType: LibraryItem.ARTIST;
};

export type AuthenticationResponse = {
    credential: string;
    isAdmin?: boolean;
    /** Stable identity issued by the server, when it issues one. Recorded so
     *  the client can confirm an address belongs to this server. */
    serverId?: string;
    userId: null | string;
    username: string;
};

export interface BasePaginatedResponse<T> {
    error?: any | string;
    items: T;
    startIndex: number;
    totalRecordCount: null | number;
}

export interface BaseQuery<T> {
    sortBy: T;
    sortOrder: SortOrder;
}

export type EndpointDetails = {
    server: ServerListItem;
};

export type GainInfo = {
    album?: number;
    track?: number;
};

export type Genre = {
    _itemType: LibraryItem.GENRE;
    _serverId: string;
    albumCount: null | number;
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    name: string;
    songCount: null | number;
};

export type GenreListArgs = BaseEndpointArgs & { query: GenreListQuery };

export interface GenreListQuery extends BaseQuery<GenreListSort> {
    limit?: number;
    musicFolderId?: string | string[];
    searchTerm?: string;
    startIndex: number;
}

// Genre List
export type GenreListResponse = BasePaginatedResponse<Genre[]>;

export type GenresResponse = Genre[];

export type ListSortOrder = 'asc' | 'desc';

export type MusicFolder = {
    id: string;
    name: string;
};

export type MusicFoldersResponse = MusicFolder[];

export type PartialIsoDateString = string;

export type Playlist = {
    _itemType: LibraryItem.PLAYLIST;
    _serverId: string;
    createdAt?: null | string;
    description: null | string;
    duration: null | number;
    genres: Genre[];
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    /** Server-managed playlist (e.g. the Samo explo "Explore" queue): the
     *  server re-derives its name/membership, so clients must not offer
     *  edit/delete/add-to for it (the server refuses with a 403 anyway). */
    isSystem?: boolean;
    lastPlayedAt?: null | string;
    name: string;
    owner: null | string;
    ownerId: null | string;
    playCount?: null | number;
    public: boolean | null;
    size: null | number;
    songCount: null | number;
    sync?: boolean | null;
    updatedAt?: null | string;
    uploadedImage?: string;
};

export type RelatedAlbumArtist = {
    id: string;
    name: string;
};

export type RelatedArtist = {
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    name: string;
    userFavorite: boolean;
};

export type Song = {
    _itemType: LibraryItem.SONG;
    _serverId: string;
    album: null | string;
    albumArtistName: string;
    albumArtists: RelatedArtist[];
    albumId: string;
    artistName: string;
    artists: RelatedArtist[];
    bitDepth: null | number;
    bitRate: number;
    bpm: null | number;
    channels: null | number;
    comment: null | string;
    compilation: boolean | null;
    container: null | string;
    createdAt: string;
    discNumber: number;
    discSubtitle: null | string;
    duration: number;
    explicitStatus: ExplicitStatus | null;
    gain: GainInfo | null;
    genres: Genre[];
    id: string;
    imageId: null | string;
    imageUrl: null | string;
    lastPlayedAt: null | string;
    lyrics: null | string;
    mbzRecordingId: null | string;
    mbzTrackId: null | string;
    name: string;
    participants: null | Record<string, RelatedArtist[]>;
    path: null | string;
    peak: GainInfo | null;
    playCount: number;
    playlistItemId?: string;
    releaseDate: null | PartialIsoDateString;
    releaseYear: null | number;
    sampleRate: null | number;
    size: number;
    sortName: string;
    tags: null | Record<string, string[]>;
    trackNumber: number;
    trackSubtitle: null | string;
    updatedAt: string;
    userFavorite: boolean;
};

type ApiContext = {
    pathReplace?: string;
    pathReplaceWith?: string;
};

type BaseEndpointArgs = {
    apiClientProps: {
        server?: null | ServerListItemWithCredential;
        serverId: string;
        signal?: AbortSignal;
    };
    context?: ApiContext;
};

type GenreListSortMap = {
    samo: Record<GenreListSort, undefined>;
};

export const genreListSortMap: GenreListSortMap = {
    samo: {
        name: undefined,
    },
};

type TagListSortMap = {
    samo: Record<TagListSort, undefined>;
};

export const tagListSortMap: TagListSortMap = {
    samo: {
        name: undefined,
    },
};

export enum AlbumListSort {
    ALBUM_ARTIST = 'albumArtist',
    ARTIST = 'artist',
    DURATION = 'duration',
    EXPLICIT_STATUS = 'explicitStatus',
    FAVORITED = 'favorited',
    ID = 'id',
    NAME = 'name',
    PLAY_COUNT = 'playCount',
    RANDOM = 'random',
    RECENTLY_ADDED = 'recentlyAdded',
    RECENTLY_PLAYED = 'recentlyPlayed',
    RELEASE_DATE = 'releaseDate',
    SONG_COUNT = 'songCount',
    SORT_NAME = 'sortName',
    YEAR = 'year',
}

export type AlbumListArgs = BaseEndpointArgs & { query: AlbumListQuery };

export type AlbumListCountArgs = BaseEndpointArgs & { query: ListCountQuery<AlbumListQuery> };

export interface AlbumListQuery extends BaseQuery<AlbumListSort> {
    _custom?: Record<string, any>;
    artistIds?: string[];
    compilation?: boolean;
    favorite?: boolean;
    genreIds?: string[];
    limit?: number;
    maxYear?: number;
    minYear?: number;
    musicFolderId?: string | string[];
    searchTerm?: string;
    startIndex: number;
}

// Album List
export type AlbumListResponse = BasePaginatedResponse<Album[]>;

export type ListCountQuery<TQuery> = Omit<TQuery, 'startIndex'>;

type AlbumListSortMap = {
    samo: Record<AlbumListSort, undefined>;
};

export const albumListSortMap: AlbumListSortMap = {
    samo: {
        albumArtist: undefined,
        artist: undefined,
        duration: undefined,
        explicitStatus: undefined,
        favorited: undefined,
        id: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        recentlyAdded: undefined,
        recentlyPlayed: undefined,
        releaseDate: undefined,
        songCount: undefined,
        sortName: undefined,
        year: undefined,
    },
};

export enum SongListSort {
    ALBUM = 'album',
    ALBUM_ARTIST = 'albumArtist',
    ARTIST = 'artist',
    BPM = 'bpm',
    CHANNELS = 'channels',
    COMMENT = 'comment',
    DURATION = 'duration',
    EXPLICIT_STATUS = 'explicitStatus',
    FAVORITED = 'favorited',
    GENRE = 'genre',
    ID = 'id',
    NAME = 'name',
    PLAY_COUNT = 'playCount',
    RANDOM = 'random',
    RECENTLY_ADDED = 'recentlyAdded',
    RECENTLY_PLAYED = 'recentlyPlayed',
    RELEASE_DATE = 'releaseDate',
    SORT_NAME = 'sortName',
    YEAR = 'year',
}

export type AlbumDetailArgs = BaseEndpointArgs & { query: AlbumDetailQuery };

export type AlbumDetailQuery = { id: string };

// Album Detail
export type AlbumDetailResponse = Album;

export type AlbumInfo = {
    imageUrl: null | string;
    notes: null | string;
};

export type SongListArgs = BaseEndpointArgs & { query: SongListQuery };

export type SongListCountArgs = BaseEndpointArgs & { query: ListCountQuery<SongListQuery> };

export interface SongListQuery extends BaseQuery<SongListSort> {
    _custom?: Record<string, any>;
    albumArtistIds?: string[];
    albumIds?: string[];
    artistIds?: string[];
    favorite?: boolean;
    genreIds?: string[];
    imageSize?: number;
    limit?: number;
    maxYear?: number;
    minYear?: number;
    musicFolderId?: string | string[];
    searchTerm?: string;
    startIndex: number;
}

// Song List
export type SongListResponse = BasePaginatedResponse<Song[]>;

type SongListSortMap = {
    samo: Record<SongListSort, undefined>;
};

export const songListSortMap: SongListSortMap = {
    samo: {
        album: undefined,
        albumArtist: undefined,
        artist: undefined,
        bpm: undefined,
        channels: undefined,
        comment: undefined,
        duration: undefined,
        explicitStatus: undefined,
        favorited: undefined,
        genre: undefined,
        id: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        recentlyAdded: undefined,
        recentlyPlayed: undefined,
        releaseDate: undefined,
        sortName: undefined,
        year: undefined,
    },
};

export enum AlbumArtistListSort {
    ALBUM = 'album',
    ALBUM_COUNT = 'albumCount',
    DURATION = 'duration',
    FAVORITED = 'favorited',
    NAME = 'name',
    PLAY_COUNT = 'playCount',
    RANDOM = 'random',
    RECENTLY_ADDED = 'recentlyAdded',
    RELEASE_DATE = 'releaseDate',
    SONG_COUNT = 'songCount',
}

export type AlbumArtistListArgs = BaseEndpointArgs & { query: AlbumArtistListQuery };

export type AlbumArtistListCountArgs = BaseEndpointArgs & {
    query: ListCountQuery<AlbumArtistListQuery>;
};

export interface AlbumArtistListQuery extends BaseQuery<AlbumArtistListSort> {
    _custom?: Record<string, any>;
    favorite?: boolean;
    limit?: number;
    musicFolderId?: string | string[];
    searchTerm?: string;
    startIndex: number;
}

// Album Artist List
export type AlbumArtistListResponse = BasePaginatedResponse<AlbumArtist[]>;

export type SongDetailArgs = BaseEndpointArgs & { query: SongDetailQuery };

export type SongDetailQuery = { id: string };

// Song Detail
export type SongDetailResponse = Song;

type AlbumArtistListSortMap = {
    samo: Record<AlbumArtistListSort, undefined>;
};

export const albumArtistListSortMap: AlbumArtistListSortMap = {
    samo: {
        album: undefined,
        albumCount: undefined,
        duration: undefined,
        favorited: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: undefined,
    },
};

// Album Artist Detail

export enum ArtistListSort {
    ALBUM = 'album',
    ALBUM_COUNT = 'albumCount',
    DURATION = 'duration',
    FAVORITED = 'favorited',
    NAME = 'name',
    PLAY_COUNT = 'playCount',
    RANDOM = 'random',
    RECENTLY_ADDED = 'recentlyAdded',
    RELEASE_DATE = 'releaseDate',
    SONG_COUNT = 'songCount',
}

export type AlbumArtistDetailArgs = BaseEndpointArgs & { query: AlbumArtistDetailQuery };

export type AlbumArtistDetailQuery = { id: string };

export type AlbumArtistDetailResponse = AlbumArtist | null;

export type AlbumArtistInfoArgs = BaseEndpointArgs & { query: AlbumArtistInfoQuery };

export type AlbumArtistInfoQuery = { id: string; limit?: number };

export type AlbumArtistInfoResponse = {
    biography?: null | string;
    imageUrl?: null | string;
    similarArtists: null | RelatedArtist[];
};

export type ArtistListArgs = BaseEndpointArgs & { query: ArtistListQuery };

export type ArtistListCountArgs = BaseEndpointArgs & { query: ListCountQuery<ArtistListQuery> };

export interface ArtistListQuery extends BaseQuery<ArtistListSort> {
    _custom?: Record<string, any>;
    favorite?: boolean;
    limit?: number;
    musicFolderId?: string | string[];
    role?: string;
    searchTerm?: string;
    startIndex: number;
}

// Artist List
export type ArtistListResponse = BasePaginatedResponse<AlbumArtist[]>;

type ArtistListSortMap = {
    samo: Record<ArtistListSort, undefined>;
};

export const artistListSortMap: ArtistListSortMap = {
    samo: {
        album: undefined,
        albumCount: undefined,
        duration: undefined,
        favorited: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: undefined,
    },
};

export enum PlaylistListSort {
    DURATION = 'duration',
    LAST_PLAYED_AT = 'lastPlayedAt',
    NAME = 'name',
    OWNER = 'owner',
    PLAY_COUNT = 'playCount',
    PUBLIC = 'public',
    SONG_COUNT = 'songCount',
    UPDATED_AT = 'updatedAt',
}

export enum RadioListSort {
    ID = 'id',
    NAME = 'name',
}

export type AddToPlaylistArgs = BaseEndpointArgs & {
    body: AddToPlaylistBody;
    query: AddToPlaylistQuery;
};

export type AddToPlaylistBody = {
    songId: string[];
};

export type AddToPlaylistQuery = {
    id: string;
};

// Add to playlist
export type AddToPlaylistResponse = null | undefined;

export type CreateInternetRadioStationArgs = BaseEndpointArgs & {
    body: CreateInternetRadioStationBody;
};

export type CreateInternetRadioStationBody = {
    homepageUrl?: string;
    name: string;
    streamUrl: string;
};

export type CreateInternetRadioStationResponse = null | undefined;

export type CreatePlaylistArgs = BaseEndpointArgs & { body: CreatePlaylistBody };

export type CreatePlaylistBody = {
    _custom?: Record<string, any>;
    comment?: string;
    name: string;
    ownerId?: string;
    public?: boolean;
    /** Seed the new playlist with these tracks. */
    songIds?: string[];
    sync?: boolean;
};

// Create Playlist
export type CreatePlaylistResponse = undefined | { id: string };

export type DeleteArtistImageArgs = BaseEndpointArgs & {
    query: DeleteArtistImageQuery;
};

export type DeleteArtistImageQuery = {
    id: string;
};

export type DeleteArtistImageResponse = boolean;

export type DeleteInternetRadioStationArgs = BaseEndpointArgs & {
    query: DeleteInternetRadioStationQuery;
};

export type DeleteInternetRadioStationImageArgs = BaseEndpointArgs & {
    query: DeleteInternetRadioStationImageQuery;
};

export type DeleteInternetRadioStationImageQuery = {
    id: string;
};

export type DeleteInternetRadioStationImageResponse = boolean;

export type DeleteInternetRadioStationQuery = {
    id: string;
};

export type DeleteInternetRadioStationResponse = null | undefined;

export type DeletePlaylistArgs = BaseEndpointArgs & {
    query: DeletePlaylistQuery;
};

export type DeletePlaylistImageArgs = BaseEndpointArgs & {
    query: DeletePlaylistImageQuery;
};

export type DeletePlaylistImageQuery = {
    id: string;
};

export type DeletePlaylistImageResponse = boolean;

export type DeletePlaylistQuery = { id: string };

// Delete Playlist
export type DeletePlaylistResponse = null | undefined;

export type FavoriteArgs = BaseEndpointArgs & { query: FavoriteQuery };

export type FavoriteQuery = {
    id: string[];
    type: LibraryItem;
};

// Favorite
export type FavoriteResponse = null | undefined;

export type GetInternetRadioStationsArgs = BaseEndpointArgs;

export type GetInternetRadioStationsResponse = InternetRadioStation[];

export type InternetRadioStation = {
    /** The station's own blurb — a channel's reason for existing, mostly. */
    description?: null | string;
    homepageUrl: null | string;
    id: string;
    imageId?: null | string;
    imageUrl?: null | string;
    /**
     * Which kind of station this is. `channel` is one of Samo's own 24/7
     * broadcasts; absent or `internet` is a stream from the outside world that
     * Samo only relays.
     *
     * It exists because the two differ in what you can DO with them: a channel
     * has no upstream URL to show, nothing to edit here (it is programmed on
     * the server), and its now-playing comes from Samo rather than from ICY
     * frames in the stream.
     */
    kind?: 'channel' | 'internet';
    name: string;
    /** What the station is airing, when the server reported it with the list. */
    nowPlaying?: null | { artist?: string; title?: string };
    streamUrl: string;
    uploadedImage?: null | string;
};

export type PlaylistListArgs = BaseEndpointArgs & { query: PlaylistListQuery };

export type PlaylistListCountArgs = BaseEndpointArgs & { query: ListCountQuery<PlaylistListQuery> };

export interface PlaylistListQuery extends BaseQuery<PlaylistListSort> {
    _custom?: Record<string, any>;
    excludeSmartPlaylists?: boolean;
    limit?: number;
    searchTerm?: string;
    startIndex: number;
}

// Playlist List
export type PlaylistListResponse = BasePaginatedResponse<Playlist[]>;

export type RemoveFromPlaylistArgs = BaseEndpointArgs & {
    query: RemoveFromPlaylistQuery;
};

export type RemoveFromPlaylistQuery = {
    id: string;
    songId: string[];
};

// Remove from playlist
export type RemoveFromPlaylistResponse = null | undefined;

export type ReplacePlaylistArgs = BaseEndpointArgs & {
    body: ReplacePlaylistBody;
    query: ReplacePlaylistQuery;
};

export type ReplacePlaylistBody = {
    songId: string[];
};

export type ReplacePlaylistQuery = {
    id: string;
};

// Replace playlist
export type ReplacePlaylistResponse = null | undefined;

export type UpdateInternetRadioStationArgs = BaseEndpointArgs & {
    body: UpdateInternetRadioStationBody;
    query: UpdateInternetRadioStationQuery;
};

export type UpdateInternetRadioStationBody = {
    homepageUrl?: string;
    name: string;
    streamUrl: string;
};

export type UpdateInternetRadioStationQuery = {
    id: string;
};

export type UpdateInternetRadioStationResponse = null | undefined;

export type UpdatePlaylistArgs = BaseEndpointArgs & {
    body: UpdatePlaylistBody;
    query: UpdatePlaylistQuery;
};

export type UpdatePlaylistBody = {
    _custom?: Record<string, any>;
    comment?: string;
    name: string;
    ownerId?: string;
    public?: boolean;
    sync?: boolean;
};

export type UpdatePlaylistQuery = {
    id: string;
};

// Update Playlist
export type UpdatePlaylistResponse = null | undefined;

export type UploadArtistImageArgs = BaseEndpointArgs & {
    body: UploadArtistImageBody;
    query: UploadArtistImageQuery;
};

export type UploadArtistImageBody = {
    image: Uint8Array;
};

export type UploadArtistImageQuery = {
    id: string;
};

export type UploadArtistImageResponse = boolean;

export type UploadInternetRadioStationImageArgs = BaseEndpointArgs & {
    body: UploadInternetRadioStationImageBody;
    query: UploadInternetRadioStationImageQuery;
};

export type UploadInternetRadioStationImageBody = {
    image: Uint8Array;
};

export type UploadInternetRadioStationImageQuery = {
    id: string;
};

export type UploadInternetRadioStationImageResponse = boolean;

export type UploadPlaylistImageArgs = BaseEndpointArgs & {
    body: UploadPlaylistImageBody;
    query: UploadPlaylistImageQuery;
};

export type UploadPlaylistImageBody = {
    image: Uint8Array;
};

export type UploadPlaylistImageQuery = {
    id: string;
};

export type UploadPlaylistImageResponse = boolean;

type PlaylistListSortMap = {
    samo: Record<PlaylistListSort, undefined>;
};

export const playlistListSortMap: PlaylistListSortMap = {
    samo: {
        duration: undefined,
        lastPlayedAt: undefined,
        name: undefined,
        owner: undefined,
        playCount: undefined,
        public: undefined,
        songCount: undefined,
        updatedAt: undefined,
    },
};

export enum UserListSort {
    NAME = 'name',
}

export type MusicFolderListArgs = BaseEndpointArgs;

export type MusicFolderListQuery = null;

// Music Folder List
export type MusicFolderListResponse = BasePaginatedResponse<MusicFolder[]>;

export type PlaylistDetailArgs = BaseEndpointArgs & { query: PlaylistDetailQuery };

export type PlaylistDetailQuery = {
    id: string;
};

// Playlist Detail
export type PlaylistDetailResponse = Playlist;

export type PlaylistSongListArgs = BaseEndpointArgs & { query: PlaylistSongListQuery };

export type PlaylistSongListCountArgs = BaseEndpointArgs & {
    query: ListCountQuery<PlaylistSongListQuery>;
};

export type PlaylistSongListQuery = {
    id: string;
};

export type PlaylistSongListQueryClientSide = {
    sortBy?: SongListSort;
    sortOrder?: SortOrder;
};

// Playlist Songs
export type PlaylistSongListResponse = BasePaginatedResponse<Song[]>;

export type UserListArgs = BaseEndpointArgs & { query: UserListQuery };

export interface UserListQuery extends BaseQuery<UserListSort> {
    _custom?: Record<string, any>;
    limit?: number;
    searchTerm?: string;
    startIndex: number;
}

// User list
// Playlist List
export type UserListResponse = BasePaginatedResponse<User[]>;

type UserListSortMap = {
    samo: Record<UserListSort, undefined>;
};

export const userListSortMap: UserListSortMap = {
    samo: {
        name: undefined,
    },
};

export enum Played {
    All = 'all',
    Never = 'never',
    Played = 'played',
}

export type ArtistInfoArgs = BaseEndpointArgs & { query: ArtistInfoQuery };

// Artist Info
export type ArtistInfoQuery = {
    artistId: string;
    limit: number;
    musicFolderId?: string | string[];
};

export type FullLyricsMetadata = Omit<InternetProviderLyricResponse, 'id' | 'lyrics' | 'source'> & {
    lyrics: LyricsResponse;
    offsetMs?: number;
    remote: boolean;
    source: string;
};

export type InternetProviderLyricResponse = {
    artist: string;
    id: string;
    lyrics: string;
    name: string;
    source: LyricSource;
};

export type InternetProviderLyricSearchResponse = {
    artist: string;
    duration?: number;
    id: string;
    isSync: boolean | null;
    lyrics?: string;
    name: string;
    score?: number;
    source: LyricSource;
};

export type LyricOverride = Omit<InternetProviderLyricResponse, 'lyrics'>;

export type LyricsArgs = BaseEndpointArgs & {
    query: LyricsQuery;
};

export type LyricsQuery = {
    songId: string;
};

export type LyricsResponse = string | SynchronizedLyricsArray;

export type RandomSongListArgs = BaseEndpointArgs & {
    query: RandomSongListQuery;
};

export type RandomSongListQuery = {
    genre?: string;
    limit?: number;
    maxYear?: number;
    minYear?: number;
    musicFolderId?: string | string[];
    played: Played;
};

export type RandomSongListResponse = SongListResponse;

export type ScrobbleArgs = BaseEndpointArgs & {
    query: ScrobbleQuery;
};

export type ScrobbleQuery = {
    albumId?: string;
    event?: 'pause' | 'start' | 'timeupdate' | 'unpause';
    id: string;
    position?: number;
    submission: boolean;
    time?: number;
};

// Scrobble
export type ScrobbleResponse = null;

export type SearchAlbumArtistsQuery = {
    albumArtistLimit?: number;
    albumArtistStartIndex?: number;
    musicFolderId?: string | string[];
    query?: string;
};

export type SearchAlbumsQuery = {
    albumLimit?: number;
    albumStartIndex?: number;
    musicFolderId?: string | string[];
    query?: string;
};

export type SearchArgs = BaseEndpointArgs & {
    query: SearchQuery;
};

export type SearchQuery = {
    albumArtistLimit?: number;
    albumArtistStartIndex?: number;
    albumLimit?: number;
    albumStartIndex?: number;
    musicFolderId?: string | string[];
    query?: string;
    songLimit?: number;
    songStartIndex?: number;
};

export type SearchResponse = {
    albumArtists: AlbumArtist[];
    albums: Album[];
    songs: Song[];
};

export type SearchSongsQuery = {
    musicFolderId?: string | string[];
    query?: string;
    songLimit?: number;
    songStartIndex?: number;
};

export type SynchronizedLyricsArray = Array<[number, string]>;

export type TopSongListArgs = BaseEndpointArgs & { query: TopSongListQuery };

export type TopSongListQuery = {
    artist: string;
    artistId: string;
    limit?: number;
    type?: 'community' | 'personal';
};

// Top Songs List
export type TopSongListResponse = BasePaginatedResponse<Song[]>;

export const instanceOfCancellationError = (error: any) => {
    return 'revert' in error;
};

export enum LyricSource {
    GENIUS = 'Genius',
    LRCLIB = 'lrclib.net',
    SIMPMUSIC = 'SimpMusic',
}

export type AlbumRadioArgs = BaseEndpointArgs & {
    query: AlbumRadioQuery;
};

export type AlbumRadioQuery = {
    albumId: string;
    count?: number;
};

export type ArtistRadioArgs = BaseEndpointArgs & {
    query: ArtistRadioQuery;
};

export type ArtistRadioQuery = {
    artistId: string;
    count?: number;
};

export type ControllerEndpoint = {
    addToPlaylist: (args: AddToPlaylistArgs) => Promise<AddToPlaylistResponse>;
    authenticate: (
        url: string,
        body: { legacy?: boolean; password: string; username: string },
    ) => Promise<AuthenticationResponse>;
    createFavorite: (args: FavoriteArgs) => Promise<FavoriteResponse>;
    createInternetRadioStation: (
        args: CreateInternetRadioStationArgs,
    ) => Promise<CreateInternetRadioStationResponse>;
    createPlaylist: (args: CreatePlaylistArgs) => Promise<CreatePlaylistResponse>;
    deleteFavorite: (args: FavoriteArgs) => Promise<FavoriteResponse>;
    deleteInternetRadioStation: (
        args: DeleteInternetRadioStationArgs,
    ) => Promise<DeleteInternetRadioStationResponse>;
    deletePlaylist: (args: DeletePlaylistArgs) => Promise<DeletePlaylistResponse>;
    getAlbumArtistDetail: (args: AlbumArtistDetailArgs) => Promise<AlbumArtistDetailResponse>;
    getAlbumArtistInfo?: (args: AlbumArtistInfoArgs) => Promise<AlbumArtistInfoResponse | null>;
    getAlbumArtistList: (args: AlbumArtistListArgs) => Promise<AlbumArtistListResponse>;
    getAlbumArtistListCount: (args: AlbumArtistListCountArgs) => Promise<number>;
    getAlbumDetail: (args: AlbumDetailArgs) => Promise<AlbumDetailResponse>;
    getAlbumList: (args: AlbumListArgs) => Promise<AlbumListResponse>;
    getAlbumListCount: (args: AlbumListCountArgs) => Promise<number>;
    getAlbumRadio: (args: AlbumRadioArgs) => Promise<Song[]>;
    getArtistList: (args: ArtistListArgs) => Promise<ArtistListResponse>;
    getArtistListCount: (args: ArtistListCountArgs) => Promise<number>;
    getArtistRadio: (args: ArtistRadioArgs) => Promise<Song[]>;
    getDownloadUrl: (args: DownloadArgs) => string;
    getGenreList: (args: GenreListArgs) => Promise<GenreListResponse>;
    getImageRequest: (args: ImageArgs) => ImageRequest | null;
    getImageUrl: (args: ImageArgs) => null | string;
    getInternetRadioStations: (
        args: GetInternetRadioStationsArgs,
    ) => Promise<GetInternetRadioStationsResponse>;
    getMusicFolderList: (args: MusicFolderListArgs) => Promise<MusicFolderListResponse>;
    getPlaylistDetail: (args: PlaylistDetailArgs) => Promise<PlaylistDetailResponse>;
    getPlaylistList: (args: PlaylistListArgs) => Promise<PlaylistListResponse>;
    getPlaylistListCount: (args: PlaylistListCountArgs) => Promise<number>;
    getPlaylistSongList: (args: PlaylistSongListArgs) => Promise<SongListResponse>;
    getRandomSongList: (args: RandomSongListArgs) => Promise<SongListResponse>;
    getRoles: (args: BaseEndpointArgs) => Promise<Array<string | { label: string; value: string }>>;
    getSimilarSongs: (args: SimilarSongsArgs) => Promise<Song[]>;
    getSongDetail: (args: SongDetailArgs) => Promise<SongDetailResponse>;
    getSongList: (args: SongListArgs) => Promise<SongListResponse>;
    getSongListCount: (args: SongListCountArgs) => Promise<number>;
    getStreamUrl: (args: StreamArgs) => Promise<string>;
    getTopSongs: (args: TopSongListArgs) => Promise<TopSongListResponse>;
    getUserInfo: (args: UserInfoArgs) => Promise<UserInfoResponse>;
    removeFromPlaylist: (args: RemoveFromPlaylistArgs) => Promise<RemoveFromPlaylistResponse>;
    replacePlaylist: (args: ReplacePlaylistArgs) => Promise<ReplacePlaylistResponse>;
    scrobble: (args: ScrobbleArgs) => Promise<ScrobbleResponse>;
    search: (args: SearchArgs) => Promise<SearchResponse>;
    setPlaylistSongs: (args: SetPlaylistSongsArgs) => Promise<SetPlaylistSongsResponse>;
    updateInternetRadioStation: (
        args: UpdateInternetRadioStationArgs,
    ) => Promise<UpdateInternetRadioStationResponse>;
    updatePlaylist: (args: UpdatePlaylistArgs) => Promise<UpdatePlaylistResponse>;
};

export type DownloadArgs = BaseEndpointArgs & {
    query: DownloadQuery;
};

export type DownloadQuery = {
    id: string;
};

// This type from https://wicg.github.io/local-font-access/#fontdata
// NOTE: it is still experimental, so this should be updates as appropriate
export type FontData = {
    family: string;
    fullName: string;
    postscriptName: string;
    style: string;
};

export type GetQueueArgs = BaseEndpointArgs;

export interface GetQueueQuery {}

export type GetQueueResponse = {
    changed: string;
    changedBy: string;
    currentIndex: number;
    entry: Song[];
    positionMs: number;
    username: string;
};

export type ImageArgs = BaseEndpointArgs & {
    baseUrl?: string;
    query: ImageQuery;
};

export type ImageQuery = {
    id: string;
    itemType: LibraryItem;
    size?: number;
};

export type ImageRequest = {
    cacheKey: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    url: string;
};

export type InternalControllerEndpoint = {
    addToPlaylist: (
        args: ReplaceApiClientProps<AddToPlaylistArgs>,
    ) => Promise<AddToPlaylistResponse>;
    authenticate: (
        url: string,
        body: { legacy?: boolean; password: string; username: string },
    ) => Promise<AuthenticationResponse>;
    createFavorite: (args: ReplaceApiClientProps<FavoriteArgs>) => Promise<FavoriteResponse>;
    createInternetRadioStation: (
        args: ReplaceApiClientProps<CreateInternetRadioStationArgs>,
    ) => Promise<CreateInternetRadioStationResponse>;
    createPlaylist: (
        args: ReplaceApiClientProps<CreatePlaylistArgs>,
    ) => Promise<CreatePlaylistResponse>;
    deleteFavorite: (args: ReplaceApiClientProps<FavoriteArgs>) => Promise<FavoriteResponse>;
    deleteInternetRadioStation: (
        args: ReplaceApiClientProps<DeleteInternetRadioStationArgs>,
    ) => Promise<DeleteInternetRadioStationResponse>;
    deletePlaylist: (
        args: ReplaceApiClientProps<DeletePlaylistArgs>,
    ) => Promise<DeletePlaylistResponse>;
    getAlbumArtistDetail: (
        args: ReplaceApiClientProps<AlbumArtistDetailArgs>,
    ) => Promise<AlbumArtistDetailResponse>;
    getAlbumArtistInfo?: (
        args: ReplaceApiClientProps<AlbumArtistInfoArgs>,
    ) => Promise<AlbumArtistInfoResponse | null>;
    getAlbumArtistList: (
        args: ReplaceApiClientProps<AlbumArtistListArgs>,
    ) => Promise<AlbumArtistListResponse>;
    getAlbumArtistListCount: (
        args: ReplaceApiClientProps<AlbumArtistListCountArgs>,
    ) => Promise<number>;
    getAlbumDetail: (args: ReplaceApiClientProps<AlbumDetailArgs>) => Promise<AlbumDetailResponse>;
    getAlbumList: (args: ReplaceApiClientProps<AlbumListArgs>) => Promise<AlbumListResponse>;
    getAlbumListCount: (args: ReplaceApiClientProps<AlbumListCountArgs>) => Promise<number>;
    getAlbumRadio: (args: ReplaceApiClientProps<AlbumRadioArgs>) => Promise<Song[]>;
    // getArtistInfo?: (args: any) => void;
    getArtistList: (args: ReplaceApiClientProps<ArtistListArgs>) => Promise<ArtistListResponse>;
    getArtistListCount: (args: ReplaceApiClientProps<ArtistListCountArgs>) => Promise<number>;
    getArtistRadio: (args: ReplaceApiClientProps<ArtistRadioArgs>) => Promise<Song[]>;
    getDownloadUrl: (args: ReplaceApiClientProps<DownloadArgs>) => string;
    getGenreList: (args: ReplaceApiClientProps<GenreListArgs>) => Promise<GenreListResponse>;
    getImageRequest: (args: ReplaceApiClientProps<ImageArgs>) => ImageRequest | null;
    getImageUrl: (args: ReplaceApiClientProps<ImageArgs>) => null | string;
    getInternetRadioStations: (
        args: ReplaceApiClientProps<GetInternetRadioStationsArgs>,
    ) => Promise<GetInternetRadioStationsResponse>;
    getMusicFolderList: (
        args: ReplaceApiClientProps<MusicFolderListArgs>,
    ) => Promise<MusicFolderListResponse>;
    getPlaylistDetail: (
        args: ReplaceApiClientProps<PlaylistDetailArgs>,
    ) => Promise<PlaylistDetailResponse>;
    getPlaylistList: (
        args: ReplaceApiClientProps<PlaylistListArgs>,
    ) => Promise<PlaylistListResponse>;
    getPlaylistListCount: (args: ReplaceApiClientProps<PlaylistListCountArgs>) => Promise<number>;
    getPlaylistSongList: (
        args: ReplaceApiClientProps<PlaylistSongListArgs>,
    ) => Promise<SongListResponse>;
    getRandomSongList: (
        args: ReplaceApiClientProps<RandomSongListArgs>,
    ) => Promise<SongListResponse>;
    getRoles: (
        args: ReplaceApiClientProps<BaseEndpointArgs>,
    ) => Promise<Array<string | { label: string; value: string }>>;
    getSimilarSongs: (args: ReplaceApiClientProps<SimilarSongsArgs>) => Promise<Song[]>;
    getSongDetail: (args: ReplaceApiClientProps<SongDetailArgs>) => Promise<SongDetailResponse>;
    getSongList: (args: ReplaceApiClientProps<SongListArgs>) => Promise<SongListResponse>;
    getSongListCount: (args: ReplaceApiClientProps<SongListCountArgs>) => Promise<number>;
    getStreamUrl: (args: ReplaceApiClientProps<StreamArgs>) => Promise<string>;
    getTopSongs: (args: ReplaceApiClientProps<TopSongListArgs>) => Promise<TopSongListResponse>;
    getUserInfo: (args: ReplaceApiClientProps<UserInfoArgs>) => Promise<UserInfoResponse>;
    removeFromPlaylist: (
        args: ReplaceApiClientProps<RemoveFromPlaylistArgs>,
    ) => Promise<RemoveFromPlaylistResponse>;
    replacePlaylist: (
        args: ReplaceApiClientProps<ReplacePlaylistArgs>,
    ) => Promise<ReplacePlaylistResponse>;
    scrobble: (args: ReplaceApiClientProps<ScrobbleArgs>) => Promise<ScrobbleResponse>;
    search: (args: ReplaceApiClientProps<SearchArgs>) => Promise<SearchResponse>;
    setPlaylistSongs: (
        args: ReplaceApiClientProps<SetPlaylistSongsArgs>,
    ) => Promise<SetPlaylistSongsResponse>;
    updateInternetRadioStation: (
        args: ReplaceApiClientProps<UpdateInternetRadioStationArgs>,
    ) => Promise<UpdateInternetRadioStationResponse>;
    updatePlaylist: (
        args: ReplaceApiClientProps<UpdatePlaylistArgs>,
    ) => Promise<UpdatePlaylistResponse>;
};

export type LyricGetQuery = {
    remoteSongId: string;
    remoteSource: LyricSource;
    song: Song;
};

export type LyricSearchQuery = {
    album?: string;
    artist?: string;
    duration?: number;
    name?: string;
};

export type LyricsOverride = Omit<FullLyricsMetadata, 'lyrics'> & { id: string };

export type MoveItemArgs = BaseEndpointArgs & {
    query: MoveItemQuery;
};

export type MoveItemQuery = {
    endingIndex: number;
    playlistId: string;
    startingIndex: number;
    trackId: string;
};

export type ReplaceApiClientProps<T> = BaseEndpointArgsWithServer & Omit<T, 'apiClientProps'>;

export type SaveQueueArgs = BaseEndpointArgs & {
    query: SaveQueueQuery;
};

export type SaveQueueQuery = {
    currentIndex?: number;
    positionMs?: number;
    songs: string[];
};

export type SetPlaylistSongsArgs = BaseEndpointArgs & { body: SetPlaylistSongsQuery };

export type SetPlaylistSongsQuery = {
    id: string;
    songIds: string[];
};

export type SetPlaylistSongsResponse = null;

export type SimilarSongsArgs = BaseEndpointArgs & {
    query: SimilarSongsQuery;
};

export type SimilarSongsQuery = {
    count?: number;
    musicFolderId?: string | string[];
    songId: string;
};

export type StreamArgs = BaseEndpointArgs & {
    query: StreamQuery;
};

export type StreamQuery = {
    bitrate?: number;
    format?: string;
    id: string;
    mediaType?: 'podcast' | 'song';
    offset?: number;
    skipAutoTranscode?: boolean;
    transcode: boolean;
};

export type StructuredLyric = (StructuredSyncedLyric | StructuredUnsyncedLyric) & {
    lang: string;
};

export type StructuredLyricsArgs = BaseEndpointArgs & {
    query: LyricsQuery;
};

export type StructuredSyncedLyric = Omit<FullLyricsMetadata, 'lyrics'> & {
    lyrics: SynchronizedLyricsArray;
    synced: true;
};

export type StructuredUnsyncedLyric = Omit<FullLyricsMetadata, 'lyrics'> & {
    lyrics: string;
    synced: false;
};

export type Tag = {
    name: string;
    options: { id: string; name: string }[];
};

export type TagListArgs = BaseEndpointArgs & {
    query: TagListQuery;
};

export type TagListQuery = {
    folder?: string;
    tagName?: string;
    type: LibraryItem.ALBUM | LibraryItem.SONG;
};

export type TagListResponse = {
    excluded: {
        album: string[];
        song: string[];
    };
    tags?: Tag[];
};

export type TranscodeDecisionArgs = BaseEndpointArgs & {
    body?: TranscodeDecisionRequestBody;
    query: TranscodeDecisionQuery;
};

export type TranscodeDecisionQuery = {
    id: string;
    type: 'song';
};

export type TranscodeDecisionRequestBody = {
    codecProfiles?: Array<{
        limitations?: Array<{
            comparison: string;
            name: string;
            required?: boolean;
            values: string[];
        }>;
        name: string;
        type: string;
    }>;
    directPlayProfiles?: Array<{
        audioCodecs: string[];
        containers: string[];
        maxAudioChannels?: number;
        protocols: string[];
    }>;
    maxAudioBitrate?: number;
    maxTranscodingAudioBitrate?: number;
    name: string;
    platform: string;
    transcodingProfiles?: Array<{
        audioCodec: string;
        container: string;
        maxAudioChannels?: number;
        protocol: string;
    }>;
};

export type TranscodeDecisionResponse = {
    decision: 'direct' | 'transcode';
    transcodeParams?: string;
};

export type UserInfoArgs = BaseEndpointArgs & { query: UserInfoQuery };

export type UserInfoQuery = {
    id: string;
    username: string;
};

export type UserInfoResponse = {
    id: string;
    isAdmin: boolean;
    name: string;
};

type BaseEndpointArgsWithServer = {
    apiClientProps: {
        server: null | ServerListItemWithCredential;
        serverId: string;
        signal?: AbortSignal;
    };
    context?: ApiContext;
};

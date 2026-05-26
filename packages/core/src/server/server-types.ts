export enum ServerFeature {
    ALBUM_YES_NO_RATING_FILTER = 'albumYesNoRatingFilter',
    ARTIST_IMAGE_UPLOAD = 'artistImageUpload',
    BFR = 'bfr',
    INTERNET_RADIO_IMAGE_UPLOAD = 'internetRadioImageUpload',
    LYRICS_MULTIPLE_STRUCTURED = 'lyricsMultipleStructured',
    LYRICS_SINGLE_STRUCTURED = 'lyricsSingleStructured',
    MUSIC_FOLDER_MULTISELECT = 'musicFolderMultiselect',
    OS_FORM_POST = 'osFormPost',
    OS_TRANSCODE_DECISION = 'osTranscodeDecision',
    PLAYLIST_IMAGE_UPLOAD = 'playlistImageUpload',
    PLAYLISTS_SMART = 'playlistsSmart',
    PUBLIC_PLAYLIST = 'publicPlaylist',
    SERVER_PLAY_QUEUE = 'serverPlayQueue',
    SHARING_ALBUM_SONG = 'sharingAlbumSong',
    SIMILAR_SONGS_MUSIC_FOLDER = 'similarSongsMusicFolder',
    TAGS = 'tags',
    TRACK_ALBUM_ARTIST_SEARCH = 'trackAlbumArtistSearch',
    TRACK_YES_NO_RATING_FILTER = 'trackYesNoRatingFilter',
}

export enum ServerType {
    AUDIOBOOKSHELF = 'audiobookshelf',
    JELLYFIN = 'jellyfin',
    NAVIDROME = 'navidrome',
    SAMO = 'samo',
    SUBSONIC = 'subsonic',
}

export type ServerFeatures = Partial<Record<ServerFeature, number[]>>;

export interface ServerListItemCore {
    features?: ServerFeatures;
    id: string;
    isAdmin?: boolean;
    musicFolderId?: string[];
    name: string;
    preferInstantMix?: boolean;
    preferRemoteUrl?: boolean;
    remoteUrl?: string;
    savePassword?: boolean;
    type: ServerType;
    url: string;
    userId: null | string;
    username: string;
    version?: string;
}

export type ServerListItemWithCredentialCore = ServerListItemCore & {
    credential: string;
    ndCredential?: string;
};

export const toServerType = (value?: string): null | ServerType => {
    switch (value?.toLowerCase()) {
        case ServerType.AUDIOBOOKSHELF:
            return ServerType.AUDIOBOOKSHELF;
        case ServerType.JELLYFIN:
            return ServerType.JELLYFIN;
        case ServerType.NAVIDROME:
            return ServerType.NAVIDROME;
        case ServerType.SAMO:
            return ServerType.SAMO;
        case ServerType.SUBSONIC:
            return ServerType.SUBSONIC;
        default:
            return null;
    }
};

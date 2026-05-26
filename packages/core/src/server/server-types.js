export var ServerFeature;
(function (ServerFeature) {
    ServerFeature["ALBUM_YES_NO_RATING_FILTER"] = "albumYesNoRatingFilter";
    ServerFeature["ARTIST_IMAGE_UPLOAD"] = "artistImageUpload";
    ServerFeature["BFR"] = "bfr";
    ServerFeature["INTERNET_RADIO_IMAGE_UPLOAD"] = "internetRadioImageUpload";
    ServerFeature["LYRICS_MULTIPLE_STRUCTURED"] = "lyricsMultipleStructured";
    ServerFeature["LYRICS_SINGLE_STRUCTURED"] = "lyricsSingleStructured";
    ServerFeature["MUSIC_FOLDER_MULTISELECT"] = "musicFolderMultiselect";
    ServerFeature["OS_FORM_POST"] = "osFormPost";
    ServerFeature["OS_TRANSCODE_DECISION"] = "osTranscodeDecision";
    ServerFeature["PLAYLIST_IMAGE_UPLOAD"] = "playlistImageUpload";
    ServerFeature["PLAYLISTS_SMART"] = "playlistsSmart";
    ServerFeature["PUBLIC_PLAYLIST"] = "publicPlaylist";
    ServerFeature["SERVER_PLAY_QUEUE"] = "serverPlayQueue";
    ServerFeature["SHARING_ALBUM_SONG"] = "sharingAlbumSong";
    ServerFeature["SIMILAR_SONGS_MUSIC_FOLDER"] = "similarSongsMusicFolder";
    ServerFeature["TAGS"] = "tags";
    ServerFeature["TRACK_ALBUM_ARTIST_SEARCH"] = "trackAlbumArtistSearch";
    ServerFeature["TRACK_YES_NO_RATING_FILTER"] = "trackYesNoRatingFilter";
})(ServerFeature || (ServerFeature = {}));
export var ServerType;
(function (ServerType) {
    ServerType["AUDIOBOOKSHELF"] = "audiobookshelf";
    ServerType["JELLYFIN"] = "jellyfin";
    ServerType["NAVIDROME"] = "navidrome";
    ServerType["SAMO"] = "samo";
    ServerType["SUBSONIC"] = "subsonic";
})(ServerType || (ServerType = {}));
export const toServerType = (value) => {
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

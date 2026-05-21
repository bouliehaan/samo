import { JFAlbumArtistListSort, JFAlbumListSort, JFArtistListSort, JFGenreListSort, JFPlaylistListSort, JFSongListSort, JFSortOrder, } from '/@/shared/api/jellyfin/jellyfin-types';
import { NDAlbumArtistListSort, NDAlbumListSort, NDGenreListSort, NDPlaylistListSort, NDSongListSort, NDSortOrder, NDTagListSort, NDUserListSort, } from '/@/shared/api/navidrome/navidrome-types';
export { ExplicitStatus, LibraryItem } from '@samo/core/library';
export { ServerType } from '@samo/core/server';
export var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "ASC";
    SortOrder["DESC"] = "DESC";
})(SortOrder || (SortOrder = {}));
export const sortOrderMap = {
    jellyfin: {
        ASC: JFSortOrder.ASC,
        DESC: JFSortOrder.DESC,
    },
    navidrome: {
        ASC: NDSortOrder.ASC,
        DESC: NDSortOrder.DESC,
    },
    subsonic: {
        ASC: undefined,
        DESC: undefined,
    },
};
export var ExternalSource;
(function (ExternalSource) {
    ExternalSource["LASTFM"] = "LASTFM";
    ExternalSource["MUSICBRAINZ"] = "MUSICBRAINZ";
    ExternalSource["SPOTIFY"] = "SPOTIFY";
    ExternalSource["THEAUDIODB"] = "THEAUDIODB";
})(ExternalSource || (ExternalSource = {}));
export var ExternalType;
(function (ExternalType) {
    ExternalType["ID"] = "ID";
    ExternalType["LINK"] = "LINK";
})(ExternalType || (ExternalType = {}));
export var GenreListSort;
(function (GenreListSort) {
    GenreListSort["NAME"] = "name";
})(GenreListSort || (GenreListSort = {}));
export var ImageType;
(function (ImageType) {
    ImageType["BACKDROP"] = "BACKDROP";
    ImageType["LOGO"] = "LOGO";
    ImageType["PRIMARY"] = "PRIMARY";
    ImageType["SCREENSHOT"] = "SCREENSHOT";
})(ImageType || (ImageType = {}));
export var TagListSort;
(function (TagListSort) {
    TagListSort["NAME"] = "name";
})(TagListSort || (TagListSort = {}));
export const genreListSortMap = {
    jellyfin: {
        name: JFGenreListSort.NAME,
    },
    navidrome: {
        name: NDGenreListSort.NAME,
    },
    subsonic: {
        name: undefined,
    },
};
export const tagListSortMap = {
    jellyfin: {
        name: undefined,
    },
    navidrome: {
        name: NDTagListSort.TAG_VALUE,
    },
    subsonic: {
        name: undefined,
    },
};
export var AlbumListSort;
(function (AlbumListSort) {
    AlbumListSort["ALBUM_ARTIST"] = "albumArtist";
    AlbumListSort["ARTIST"] = "artist";
    AlbumListSort["COMMUNITY_RATING"] = "communityRating";
    AlbumListSort["CRITIC_RATING"] = "criticRating";
    AlbumListSort["DURATION"] = "duration";
    AlbumListSort["EXPLICIT_STATUS"] = "explicitStatus";
    AlbumListSort["FAVORITED"] = "favorited";
    AlbumListSort["ID"] = "id";
    AlbumListSort["NAME"] = "name";
    AlbumListSort["PLAY_COUNT"] = "playCount";
    AlbumListSort["RANDOM"] = "random";
    AlbumListSort["RATING"] = "rating";
    AlbumListSort["RECENTLY_ADDED"] = "recentlyAdded";
    AlbumListSort["RECENTLY_PLAYED"] = "recentlyPlayed";
    AlbumListSort["RELEASE_DATE"] = "releaseDate";
    AlbumListSort["SONG_COUNT"] = "songCount";
    AlbumListSort["SORT_NAME"] = "sortName";
    AlbumListSort["YEAR"] = "year";
})(AlbumListSort || (AlbumListSort = {}));
export const albumListSortMap = {
    jellyfin: {
        albumArtist: JFAlbumListSort.ALBUM_ARTIST,
        artist: undefined,
        communityRating: JFAlbumListSort.COMMUNITY_RATING,
        criticRating: JFAlbumListSort.CRITIC_RATING,
        duration: undefined,
        explicitStatus: undefined,
        favorited: undefined,
        id: undefined,
        name: JFAlbumListSort.NAME,
        playCount: JFAlbumListSort.PLAY_COUNT,
        random: JFAlbumListSort.RANDOM,
        rating: undefined,
        recentlyAdded: JFAlbumListSort.RECENTLY_ADDED,
        recentlyPlayed: undefined,
        releaseDate: JFAlbumListSort.RELEASE_DATE,
        songCount: undefined,
        sortName: JFAlbumListSort.NAME,
        year: undefined,
    },
    navidrome: {
        albumArtist: NDAlbumListSort.ALBUM_ARTIST,
        artist: NDAlbumListSort.ARTIST,
        communityRating: undefined,
        criticRating: undefined,
        duration: NDAlbumListSort.DURATION,
        explicitStatus: NDAlbumListSort.EXPLICIT_STATUS,
        favorited: NDAlbumListSort.STARRED,
        id: undefined,
        name: NDAlbumListSort.NAME,
        playCount: NDAlbumListSort.PLAY_COUNT,
        random: NDAlbumListSort.RANDOM,
        rating: NDAlbumListSort.RATING,
        recentlyAdded: NDAlbumListSort.RECENTLY_ADDED,
        recentlyPlayed: NDAlbumListSort.PLAY_DATE,
        // Recent versions of Navidrome support release date, but fallback to year for now
        releaseDate: NDAlbumListSort.YEAR,
        songCount: NDAlbumListSort.SONG_COUNT,
        sortName: NDAlbumListSort.NAME,
        year: NDAlbumListSort.YEAR,
    },
    subsonic: {
        albumArtist: undefined,
        artist: undefined,
        communityRating: undefined,
        criticRating: undefined,
        duration: undefined,
        explicitStatus: undefined,
        favorited: undefined,
        id: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        rating: undefined,
        recentlyAdded: undefined,
        recentlyPlayed: undefined,
        releaseDate: undefined,
        songCount: undefined,
        sortName: undefined,
        year: undefined,
    },
};
export var SongListSort;
(function (SongListSort) {
    SongListSort["ALBUM"] = "album";
    SongListSort["ALBUM_ARTIST"] = "albumArtist";
    SongListSort["ARTIST"] = "artist";
    SongListSort["BPM"] = "bpm";
    SongListSort["CHANNELS"] = "channels";
    SongListSort["COMMENT"] = "comment";
    SongListSort["DURATION"] = "duration";
    SongListSort["EXPLICIT_STATUS"] = "explicitStatus";
    SongListSort["FAVORITED"] = "favorited";
    SongListSort["GENRE"] = "genre";
    SongListSort["ID"] = "id";
    SongListSort["NAME"] = "name";
    SongListSort["PLAY_COUNT"] = "playCount";
    SongListSort["RANDOM"] = "random";
    SongListSort["RATING"] = "rating";
    SongListSort["RECENTLY_ADDED"] = "recentlyAdded";
    SongListSort["RECENTLY_PLAYED"] = "recentlyPlayed";
    SongListSort["RELEASE_DATE"] = "releaseDate";
    SongListSort["SORT_NAME"] = "sortName";
    SongListSort["YEAR"] = "year";
})(SongListSort || (SongListSort = {}));
export const songListSortMap = {
    jellyfin: {
        album: JFSongListSort.ALBUM,
        albumArtist: JFSongListSort.ALBUM_ARTIST,
        artist: JFSongListSort.ARTIST,
        bpm: undefined,
        channels: undefined,
        comment: undefined,
        duration: JFSongListSort.DURATION,
        explicitStatus: undefined,
        favorited: undefined,
        genre: undefined,
        id: undefined,
        name: JFSongListSort.NAME,
        playCount: JFSongListSort.PLAY_COUNT,
        random: JFSongListSort.RANDOM,
        rating: undefined,
        recentlyAdded: JFSongListSort.RECENTLY_ADDED,
        recentlyPlayed: JFSongListSort.RECENTLY_PLAYED,
        releaseDate: JFSongListSort.RELEASE_DATE,
        sortName: JFSongListSort.NAME,
        year: undefined,
    },
    navidrome: {
        album: NDSongListSort.ALBUM_SONGS,
        albumArtist: NDSongListSort.ALBUM_ARTIST,
        artist: NDSongListSort.ARTIST,
        bpm: NDSongListSort.BPM,
        channels: NDSongListSort.CHANNELS,
        comment: NDSongListSort.COMMENT,
        duration: NDSongListSort.DURATION,
        explicitStatus: NDSongListSort.EXPLICIT_STATUS,
        favorited: NDSongListSort.FAVORITED,
        genre: NDSongListSort.GENRE,
        id: NDSongListSort.ID,
        name: NDSongListSort.TITLE,
        playCount: NDSongListSort.PLAY_COUNT,
        random: NDSongListSort.RANDOM,
        rating: NDSongListSort.RATING,
        recentlyAdded: NDSongListSort.RECENTLY_ADDED,
        recentlyPlayed: NDSongListSort.PLAY_DATE,
        releaseDate: undefined,
        sortName: NDSongListSort.TITLE,
        year: NDSongListSort.YEAR,
    },
    subsonic: {
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
        rating: undefined,
        recentlyAdded: undefined,
        recentlyPlayed: undefined,
        releaseDate: undefined,
        sortName: undefined,
        year: undefined,
    },
};
export var AlbumArtistListSort;
(function (AlbumArtistListSort) {
    AlbumArtistListSort["ALBUM"] = "album";
    AlbumArtistListSort["ALBUM_COUNT"] = "albumCount";
    AlbumArtistListSort["DURATION"] = "duration";
    AlbumArtistListSort["FAVORITED"] = "favorited";
    AlbumArtistListSort["NAME"] = "name";
    AlbumArtistListSort["PLAY_COUNT"] = "playCount";
    AlbumArtistListSort["RANDOM"] = "random";
    AlbumArtistListSort["RATING"] = "rating";
    AlbumArtistListSort["RECENTLY_ADDED"] = "recentlyAdded";
    AlbumArtistListSort["RELEASE_DATE"] = "releaseDate";
    AlbumArtistListSort["SONG_COUNT"] = "songCount";
})(AlbumArtistListSort || (AlbumArtistListSort = {}));
export const albumArtistListSortMap = {
    jellyfin: {
        album: JFAlbumArtistListSort.ALBUM,
        albumCount: undefined,
        duration: JFAlbumArtistListSort.DURATION,
        favorited: undefined,
        name: JFAlbumArtistListSort.NAME,
        playCount: undefined,
        random: JFAlbumArtistListSort.RANDOM,
        rating: undefined,
        recentlyAdded: JFAlbumArtistListSort.RECENTLY_ADDED,
        releaseDate: undefined,
        songCount: undefined,
    },
    navidrome: {
        album: undefined,
        albumCount: NDAlbumArtistListSort.ALBUM_COUNT,
        duration: undefined,
        favorited: NDAlbumArtistListSort.FAVORITED,
        name: NDAlbumArtistListSort.NAME,
        playCount: NDAlbumArtistListSort.PLAY_COUNT,
        random: undefined,
        rating: NDAlbumArtistListSort.RATING,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: NDAlbumArtistListSort.SONG_COUNT,
    },
    subsonic: {
        album: undefined,
        albumCount: undefined,
        duration: undefined,
        favorited: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        rating: undefined,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: undefined,
    },
};
// Album Artist Detail
export var ArtistListSort;
(function (ArtistListSort) {
    ArtistListSort["ALBUM"] = "album";
    ArtistListSort["ALBUM_COUNT"] = "albumCount";
    ArtistListSort["DURATION"] = "duration";
    ArtistListSort["FAVORITED"] = "favorited";
    ArtistListSort["NAME"] = "name";
    ArtistListSort["PLAY_COUNT"] = "playCount";
    ArtistListSort["RANDOM"] = "random";
    ArtistListSort["RATING"] = "rating";
    ArtistListSort["RECENTLY_ADDED"] = "recentlyAdded";
    ArtistListSort["RELEASE_DATE"] = "releaseDate";
    ArtistListSort["SONG_COUNT"] = "songCount";
})(ArtistListSort || (ArtistListSort = {}));
export const artistListSortMap = {
    jellyfin: {
        album: JFArtistListSort.ALBUM,
        albumCount: undefined,
        duration: JFArtistListSort.DURATION,
        favorited: undefined,
        name: JFArtistListSort.NAME,
        playCount: undefined,
        random: JFArtistListSort.RANDOM,
        rating: undefined,
        recentlyAdded: JFArtistListSort.RECENTLY_ADDED,
        releaseDate: undefined,
        songCount: undefined,
    },
    navidrome: {
        album: undefined,
        albumCount: undefined,
        duration: undefined,
        favorited: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        rating: undefined,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: undefined,
    },
    subsonic: {
        album: undefined,
        albumCount: undefined,
        duration: undefined,
        favorited: undefined,
        name: undefined,
        playCount: undefined,
        random: undefined,
        rating: undefined,
        recentlyAdded: undefined,
        releaseDate: undefined,
        songCount: undefined,
    },
};
export var PlaylistListSort;
(function (PlaylistListSort) {
    PlaylistListSort["DURATION"] = "duration";
    PlaylistListSort["NAME"] = "name";
    PlaylistListSort["OWNER"] = "owner";
    PlaylistListSort["PUBLIC"] = "public";
    PlaylistListSort["SONG_COUNT"] = "songCount";
    PlaylistListSort["UPDATED_AT"] = "updatedAt";
})(PlaylistListSort || (PlaylistListSort = {}));
export var RadioListSort;
(function (RadioListSort) {
    RadioListSort["ID"] = "id";
    RadioListSort["NAME"] = "name";
})(RadioListSort || (RadioListSort = {}));
export const playlistListSortMap = {
    jellyfin: {
        duration: JFPlaylistListSort.DURATION,
        name: JFPlaylistListSort.NAME,
        owner: undefined,
        public: undefined,
        songCount: JFPlaylistListSort.SONG_COUNT,
        updatedAt: undefined,
    },
    navidrome: {
        duration: NDPlaylistListSort.DURATION,
        name: NDPlaylistListSort.NAME,
        owner: NDPlaylistListSort.OWNER,
        public: NDPlaylistListSort.PUBLIC,
        songCount: NDPlaylistListSort.SONG_COUNT,
        updatedAt: NDPlaylistListSort.UPDATED_AT,
    },
    subsonic: {
        duration: undefined,
        name: undefined,
        owner: undefined,
        public: undefined,
        songCount: undefined,
        updatedAt: undefined,
    },
};
export var UserListSort;
(function (UserListSort) {
    UserListSort["NAME"] = "name";
})(UserListSort || (UserListSort = {}));
export const userListSortMap = {
    jellyfin: {
        name: undefined,
    },
    navidrome: {
        name: NDUserListSort.NAME,
    },
    subsonic: {
        name: undefined,
    },
};
export var Played;
(function (Played) {
    Played["All"] = "all";
    Played["Never"] = "never";
    Played["Played"] = "played";
})(Played || (Played = {}));
export const instanceOfCancellationError = (error) => {
    return 'revert' in error;
};
export var LyricSource;
(function (LyricSource) {
    LyricSource["GENIUS"] = "Genius";
    LyricSource["LRCLIB"] = "lrclib.net";
    LyricSource["SIMPMUSIC"] = "SimpMusic";
})(LyricSource || (LyricSource = {}));

import { Play, PlayerQueueType, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerType, } from '@samo/core/playback';
import { ServerType } from '@samo/core/server';
import { LibraryItem, } from '/@/shared/types/domain-types';
export { Play, PlayerQueueType, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerType };
export { ServerType } from '@samo/core/server';
export var ItemListKey;
(function (ItemListKey) {
    ItemListKey["ALBUM"] = "album";
    ItemListKey["ALBUM_ARTIST"] = "albumArtist";
    ItemListKey["ALBUM_ARTIST_ALBUM"] = "albumArtistAlbum";
    ItemListKey["ALBUM_ARTIST_SONG"] = "albumArtistSong";
    ItemListKey["ALBUM_DETAIL"] = "albumDetail";
    ItemListKey["ARTIST"] = "artist";
    ItemListKey["FOLDER"] = "folder";
    ItemListKey["FULL_SCREEN"] = "fullScreen";
    ItemListKey["GENRE"] = "genre";
    ItemListKey["GENRE_ALBUM"] = "genreAlbum";
    ItemListKey["GENRE_SONG"] = "genreSong";
    ItemListKey["PLAYLIST"] = "playlist";
    ItemListKey["PLAYLIST_ALBUM"] = "playlistAlbum";
    ItemListKey["PLAYLIST_SONG"] = "playlistSong";
    ItemListKey["QUEUE_SONG"] = "queueSong";
    ItemListKey["RADIO"] = "radio";
    ItemListKey["SIDE_QUEUE"] = "sideQueue";
    ItemListKey["SONG"] = "song";
})(ItemListKey || (ItemListKey = {}));
export var ListDisplayType;
(function (ListDisplayType) {
    ListDisplayType["DETAIL"] = "detail";
    ListDisplayType["GRID"] = "poster";
    ListDisplayType["LIST"] = "list";
    ListDisplayType["TABLE"] = "table";
})(ListDisplayType || (ListDisplayType = {}));
export var ListPaginationType;
(function (ListPaginationType) {
    ListPaginationType["INFINITE"] = "infinite";
    ListPaginationType["PAGINATED"] = "paginated";
})(ListPaginationType || (ListPaginationType = {}));
export var Platform;
(function (Platform) {
    Platform["LINUX"] = "linux";
    Platform["MACOS"] = "macos";
    Platform["WEB"] = "web";
    Platform["WINDOWS"] = "windows";
})(Platform || (Platform = {}));
export const toServerType = (value) => {
    switch (value?.toLowerCase()) {
        case ServerType.JELLYFIN:
            return ServerType.JELLYFIN;
        case ServerType.NAVIDROME:
            return ServerType.NAVIDROME;
        case ServerType.SUBSONIC:
            return ServerType.SUBSONIC;
        default:
            return null;
    }
};
export var AuthState;
(function (AuthState) {
    AuthState["INVALID"] = "invalid";
    AuthState["LOADING"] = "loading";
    AuthState["VALID"] = "valid";
})(AuthState || (AuthState = {}));
export var CrossfadeStyle;
(function (CrossfadeStyle) {
    CrossfadeStyle["CONSTANT_POWER"] = "constantPower";
    CrossfadeStyle["CONSTANT_POWER_SLOW_CUT"] = "constantPowerSlowCut";
    CrossfadeStyle["CONSTANT_POWER_SLOW_FADE"] = "constantPowerSlowFade";
    CrossfadeStyle["DIPPED"] = "dipped";
    CrossfadeStyle["EQUAL_POWER"] = "equalPower";
    CrossfadeStyle["EXPONENTIAL"] = "exponential";
    CrossfadeStyle["LINEAR"] = "linear";
    CrossfadeStyle["S_CURVE"] = "sCurve";
})(CrossfadeStyle || (CrossfadeStyle = {}));
export var FontType;
(function (FontType) {
    FontType["BUILT_IN"] = "builtIn";
    FontType["CUSTOM"] = "custom";
    FontType["SYSTEM"] = "system";
})(FontType || (FontType = {}));
export var PlayerStyle;
(function (PlayerStyle) {
    PlayerStyle["CROSSFADE"] = "crossfade";
    PlayerStyle["GAPLESS"] = "gapless";
})(PlayerStyle || (PlayerStyle = {}));
export var TableColumn;
(function (TableColumn) {
    TableColumn["ACTIONS"] = "actions";
    TableColumn["ALBUM"] = "album";
    TableColumn["ALBUM_ARTIST"] = "albumArtists";
    TableColumn["ALBUM_COUNT"] = "albumCount";
    TableColumn["ALBUM_GROUP"] = "albumGroup";
    TableColumn["ARTIST"] = "artists";
    TableColumn["BIOGRAPHY"] = "biography";
    TableColumn["BIT_DEPTH"] = "bitDepth";
    TableColumn["BIT_RATE"] = "bitRate";
    TableColumn["BPM"] = "bpm";
    TableColumn["CHANNELS"] = "channels";
    TableColumn["CODEC"] = "container";
    TableColumn["COMMENT"] = "comment";
    TableColumn["COMPOSER"] = "composer";
    TableColumn["DATE_ADDED"] = "createdAt";
    TableColumn["DISC_NUMBER"] = "discNumber";
    TableColumn["DURATION"] = "duration";
    TableColumn["GENRE"] = "genres";
    TableColumn["GENRE_BADGE"] = "genreBadge";
    TableColumn["ID"] = "id";
    TableColumn["IMAGE"] = "imageUrl";
    TableColumn["LAST_PLAYED"] = "lastPlayedAt";
    TableColumn["LAYOUT_FILL"] = "__layoutFill";
    TableColumn["OWNER"] = "username";
    TableColumn["PATH"] = "path";
    TableColumn["PLAY_COUNT"] = "playCount";
    TableColumn["PLAYLIST_REORDER"] = "playlistReorder";
    TableColumn["RELEASE_DATE"] = "releaseDate";
    TableColumn["ROW_INDEX"] = "rowIndex";
    TableColumn["SAMPLE_RATE"] = "sampleRate";
    TableColumn["SIZE"] = "size";
    TableColumn["SKIP"] = "skip";
    TableColumn["SONG_COUNT"] = "songCount";
    TableColumn["TITLE"] = "name";
    TableColumn["TITLE_ARTIST"] = "titleArtist";
    TableColumn["TITLE_COMBINED"] = "titleCombined";
    TableColumn["TRACK_NUMBER"] = "trackNumber";
    TableColumn["USER_FAVORITE"] = "userFavorite";
    TableColumn["USER_RATING"] = "userRating";
    TableColumn["YEAR"] = "releaseYear";
})(TableColumn || (TableColumn = {}));

import Fuse from 'fuse.js';
import z from 'zod';
import i18n from '/@/i18n/i18n';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
export const PLAY_TYPES = [
    {
        label: i18n.t('player.play', { postProcess: 'sentenceCase' }),
        play: Play.NOW,
    },
    {
        label: i18n.t('player.shuffle', { postProcess: 'sentenceCase' }),
        play: Play.SHUFFLE,
    },
    {
        label: i18n.t('player.addLast', { postProcess: 'sentenceCase' }),
        play: Play.LAST,
    },
    {
        label: i18n.t('player.addNext', { postProcess: 'sentenceCase' }),
        play: Play.NEXT,
    },
];
export const customFiltersSchema = z.record(z.string(), z.any());
var AlbumFilterKeys;
(function (AlbumFilterKeys) {
    AlbumFilterKeys["_CUSTOM"] = "_custom";
    AlbumFilterKeys["ARTIST_IDS"] = "artistIds";
    AlbumFilterKeys["COMPILATION"] = "compilation";
    AlbumFilterKeys["FAVORITE"] = "favorite";
    AlbumFilterKeys["GENRE_ID"] = "genreIds";
    AlbumFilterKeys["HAS_RATING"] = "hasRating";
    AlbumFilterKeys["MAX_YEAR"] = "maxYear";
    AlbumFilterKeys["MIN_YEAR"] = "minYear";
    AlbumFilterKeys["RECENTLY_PLAYED"] = "isRecentlyPlayed";
})(AlbumFilterKeys || (AlbumFilterKeys = {}));
var ArtistFilterKeys;
(function (ArtistFilterKeys) {
    ArtistFilterKeys["ROLE"] = "role";
})(ArtistFilterKeys || (ArtistFilterKeys = {}));
var SharedFilterKeys;
(function (SharedFilterKeys) {
    SharedFilterKeys["MUSIC_FOLDER_ID"] = "musicFolderId";
    SharedFilterKeys["SEARCH_TERM"] = "searchTerm";
    SharedFilterKeys["SORT_BY"] = "sortBy";
    SharedFilterKeys["SORT_ORDER"] = "sortOrder";
})(SharedFilterKeys || (SharedFilterKeys = {}));
var SongFilterKeys;
(function (SongFilterKeys) {
    SongFilterKeys["_CUSTOM"] = "_custom";
    SongFilterKeys["ALBUM_ARTIST_IDS"] = "albumArtistIds";
    SongFilterKeys["ALBUM_ARTIST_IDS_MODE"] = "albumArtistIdsMode";
    SongFilterKeys["ARTIST_IDS"] = "artistIds";
    SongFilterKeys["ARTIST_IDS_MODE"] = "artistIdsMode";
    SongFilterKeys["FAVORITE"] = "favorite";
    SongFilterKeys["GENRE_ID"] = "genreIds";
    SongFilterKeys["GENRE_ID_MODE"] = "genreIdsMode";
    SongFilterKeys["HAS_RATING"] = "hasRating";
    SongFilterKeys["MAX_YEAR"] = "maxYear";
    SongFilterKeys["MIN_YEAR"] = "minYear";
})(SongFilterKeys || (SongFilterKeys = {}));
const PaginationFilterKeys = {
    CURRENT_PAGE: 'currentPage',
    SCROLL_OFFSET: 'scrollOffset',
};
var FolderFilterKeys;
(function (FolderFilterKeys) {
    FolderFilterKeys["FOLDER_PATH"] = "folderPath";
})(FolderFilterKeys || (FolderFilterKeys = {}));
var PlaylistFilterKeys;
(function (PlaylistFilterKeys) {
    PlaylistFilterKeys["CUSTOM"] = "_custom";
})(PlaylistFilterKeys || (PlaylistFilterKeys = {}));
export const FILTER_KEYS = {
    ALBUM: AlbumFilterKeys,
    ARTIST: ArtistFilterKeys,
    FOLDER: FolderFilterKeys,
    PAGINATION: PaginationFilterKeys,
    PLAYLIST: PlaylistFilterKeys,
    SHARED: SharedFilterKeys,
    SONG: SongFilterKeys,
};
export const createFuseForLibraryItem = (items, itemType, options = {}) => {
    const { fieldNormWeight = 1, ignoreLocation = true, threshold = 0.3 } = options;
    if (items.length === 0) {
        return new Fuse(items, {
            fieldNormWeight,
            ignoreLocation,
            keys: [],
            threshold,
        });
    }
    const stringKeys = [];
    const nestedKeys = [];
    switch (itemType) {
        case LibraryItem.ALBUM: {
            stringKeys.push('name', 'releaseType');
            nestedKeys.push({
                getFn: (item) => {
                    const a = item;
                    return a.artists?.map((artist) => artist.name).join(' ') || '';
                },
                name: 'artists',
            }, {
                getFn: (item) => {
                    const a = item;
                    return a.albumArtists?.map((artist) => artist.name).join(' ') || '';
                },
                name: 'albumArtists',
            }, {
                getFn: (item) => {
                    const a = item;
                    return a.genres?.map((genre) => genre.name).join(' ') || '';
                },
                name: 'genres',
            });
            break;
        }
        case LibraryItem.ALBUM_ARTIST: {
            stringKeys.push('name');
            nestedKeys.push({
                getFn: (item) => {
                    const aa = item;
                    return aa.genres?.map((genre) => genre.name).join(' ') || '';
                },
                name: 'genres',
            });
            break;
        }
        case LibraryItem.ARTIST:
        case LibraryItem.GENRE:
        case LibraryItem.RADIO_STATION:
            stringKeys.push('name');
            break;
        case LibraryItem.PLAYLIST: {
            stringKeys.push('name');
            nestedKeys.push({
                getFn: (item) => {
                    const p = item;
                    return p.genres?.map((genre) => genre.name).join(' ') || '';
                },
                name: 'genres',
            });
            break;
        }
        case LibraryItem.PLAYLIST_SONG:
        case LibraryItem.QUEUE_SONG:
        case LibraryItem.SONG:
            stringKeys.push('album', 'name');
            nestedKeys.push({
                getFn: (item) => {
                    const s = item;
                    return s.artists?.map((artist) => artist.name).join(' ') || '';
                },
                name: 'artists',
            }, {
                getFn: (item) => {
                    const s = item;
                    return s.albumArtists?.map((artist) => artist.name).join(' ') || '';
                },
                name: 'albumArtists',
            });
            break;
    }
    return new Fuse(items, {
        fieldNormWeight,
        ignoreLocation,
        keys: [...stringKeys, ...nestedKeys],
        threshold,
    });
};
export const searchLibraryItems = (items, searchTerm, itemType, options) => {
    if (!searchTerm?.trim()) {
        return items;
    }
    const fuse = createFuseForLibraryItem(items, itemType, options);
    return fuse.search(searchTerm).map((result) => result.item);
};

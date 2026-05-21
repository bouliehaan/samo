import { SongListSort, SortOrder } from '/@/shared/types/domain-types';
export declare const usePlaylistSongListFilters: () => {
    clear: () => void;
    query: {
        searchTerm: string | undefined;
        sortBy: SongListSort;
        sortOrder: SortOrder;
        _custom: Record<string, any> | undefined;
        albumArtistIds: string[] | undefined;
        albumArtistIdsMode: "and" | "or";
        artistIds: string[] | undefined;
        artistIdsMode: "and" | "or";
        favorite: boolean | undefined;
        genreIds: string[] | undefined;
        genreIdsMode: "and" | "or";
        hasRating: boolean | undefined;
        maxYear: number | undefined;
        minYear: number | undefined;
    };
    setAlbumArtistIds: (value: null | string[]) => void;
    setAlbumArtistIdsMode: (value: "and" | "or") => void;
    setArtistIds: (value: null | string[]) => void;
    setArtistIdsMode: (value: "and" | "or") => void;
    setCustom: (value: null | Record<string, any>) => void;
    setFavorite: (value: boolean | null) => void;
    setGenreId: (value: null | string[]) => void;
    setGenreIdsMode: (value: "and" | "or") => void;
    setHasRating: (value: boolean | null) => void;
    setMaxYear: (value: null | number) => void;
    setMinYear: (value: null | number) => void;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

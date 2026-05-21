import { SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export declare const useSongListFilters: (listKey?: ItemListKey) => {
    clear: () => void;
    query: {
        searchTerm: string | undefined;
        sortBy: SongListSort;
        sortOrder: SortOrder;
        _custom: Record<string, any> | undefined;
        artistIds: string[] | undefined;
        favorite: boolean | undefined;
        genreIds: string[] | undefined;
        hasRating: boolean | undefined;
        maxYear: number | undefined;
        minYear: number | undefined;
    };
    setArtistIds: (value: null | string[]) => void;
    setCustom: (value: ((prev: null | Record<string, any>) => null | Record<string, any>) | null | Record<string, any>) => void;
    setFavorite: (value: boolean | null) => void;
    setGenreId: (value: null | string[]) => void;
    setHasRating: (value: boolean | null) => void;
    setMaxYear: (value: null | number) => void;
    setMinYear: (value: null | number) => void;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

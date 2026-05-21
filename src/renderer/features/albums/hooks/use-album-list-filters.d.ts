import { AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export declare const useAlbumListFilters: (listKey?: ItemListKey) => {
    clear: () => void;
    query: {
        _custom: Record<string, any> | undefined;
        artistIds: string[] | undefined;
        compilation: boolean | undefined;
        favorite: boolean | undefined;
        genreIds: string[] | undefined;
        hasRating: boolean | undefined;
        maxYear: number | undefined;
        minYear: number | undefined;
        isRecentlyPlayed: boolean | undefined;
        searchTerm: string | undefined;
        sortBy: AlbumListSort;
        sortOrder: SortOrder;
    };
    setAlbumArtist: (value: null | string[]) => void;
    setCompilation: (value: boolean | null) => void;
    setCustom: (value: null | Record<string, any>) => void;
    setFavorite: (value: boolean | null) => void;
    setGenreId: (value: null | string[]) => void;
    setHasRating: (value: boolean | null) => void;
    setMaxYear: (value: null | number) => void;
    setMinYear: (value: null | number) => void;
    setRecentlyPlayed: (value: boolean | null) => void;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

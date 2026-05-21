import { GenreListSort } from '/@/shared/types/domain-types';
export declare const useGenreListFilters: () => {
    query: {
        searchTerm: string | undefined;
        sortBy: GenreListSort;
        sortOrder: import("/@/shared/types/domain-types").SortOrder;
    };
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

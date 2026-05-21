import { ArtistListSort } from '/@/shared/types/domain-types';
export declare const useArtistListFilters: () => {
    query: {
        role: string | undefined;
        searchTerm: string | undefined;
        sortBy: ArtistListSort;
        sortOrder: import("/@/shared/types/domain-types").SortOrder;
    };
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

import { AlbumArtistListSort } from '/@/shared/types/domain-types';
export declare const useAlbumArtistListFilters: () => {
    clear: () => void;
    query: {
        searchTerm: string | undefined;
        sortBy: AlbumArtistListSort;
        sortOrder: import("/@/shared/types/domain-types").SortOrder;
    };
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

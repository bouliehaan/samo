import { PlaylistListSort } from '/@/shared/types/domain-types';
export declare const usePlaylistListFilters: () => {
    query: {
        _custom: Record<string, any> | undefined;
        searchTerm: string | undefined;
        sortBy: PlaylistListSort;
        sortOrder: import("/@/shared/types/domain-types").SortOrder;
    };
    setCustom: (value: null | Record<string, any>) => void;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

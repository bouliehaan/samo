import { SongListSort, SortOrder } from '/@/shared/types/domain-types';
export type FolderPathItem = {
    id: string;
    name: string;
};
export declare const useFolderListFilters: () => {
    currentFolderId: string;
    folderPath: FolderPathItem[];
    navigateToFolder: (folderId: string, folderName: string) => void;
    navigateToPathIndex: (index: number) => void;
    query: {
        searchTerm: string | undefined;
        sortBy: SongListSort;
        sortOrder: SortOrder;
    };
    setFolderPath: (path: FolderPathItem[]) => void;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};

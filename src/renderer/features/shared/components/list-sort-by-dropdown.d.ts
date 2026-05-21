import { Dispatch, SetStateAction } from 'react';
import { AlbumListSort, LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
interface ListSortByDropdownProps {
    defaultSortByValue: string;
    disabled?: boolean;
    includeId?: boolean;
    itemType: LibraryItem;
    listKey: ItemListKey;
    onChange?: (value: string) => void;
    target?: React.ReactNode;
}
export declare const ListSortByDropdown: ({ defaultSortByValue, disabled, itemType, listKey, onChange, target, }: ListSortByDropdownProps) => import("react/jsx-runtime").JSX.Element;
interface ListSortByDropdownControlledProps {
    disabled?: boolean;
    filters?: Array<{
        defaultOrder: SortOrder;
        name: string;
        value: string;
    }>;
    itemType: LibraryItem;
    setSortBy: Dispatch<SetStateAction<string>>;
    sortBy: string;
    target?: React.ReactNode;
}
export declare const ListSortByDropdownControlled: ({ disabled, filters, itemType, setSortBy, sortBy, target, }: ListSortByDropdownControlledProps) => import("react/jsx-runtime").JSX.Element;
export declare const CLIENT_SIDE_SONG_FILTERS: {
    defaultOrder: SortOrder;
    name: string;
    value: SongListSort;
}[];
export declare const CLIENT_SIDE_ALBUM_FILTERS: {
    defaultOrder: SortOrder;
    name: string;
    value: AlbumListSort;
}[];
export {};

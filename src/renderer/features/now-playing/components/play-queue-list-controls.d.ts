import { RefObject } from 'react';
import { ItemListHandle } from '/@/renderer/components/item-list/types';
import { ItemListKey } from '/@/shared/types/types';
interface PlayQueueListOptionsProps {
    handleSearch: (value: string) => void;
    searchTerm?: string;
    tableRef: RefObject<ItemListHandle | null>;
    type: ItemListKey;
}
export declare const PlayQueueListControls: ({ handleSearch, searchTerm, tableRef, type, }: PlayQueueListOptionsProps) => import("react/jsx-runtime").JSX.Element;
export {};

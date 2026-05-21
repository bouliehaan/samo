import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { Song } from '/@/shared/types/domain-types';
import { ItemListKey, TableColumn } from '/@/shared/types/types';
interface ItemDetailListProps {
    currentPage?: number;
    data?: unknown[];
    enableHeader?: boolean;
    getItem?: (index: number) => unknown;
    internalState?: ItemListStateActions;
    itemCount?: number;
    items?: unknown[];
    listKey?: ItemListKey;
    onColumnReordered?: (columnIdFrom: TableColumn, columnIdTo: TableColumn, edge: 'bottom' | 'left' | 'right' | 'top' | null) => void;
    onColumnResized?: (columnId: TableColumn, width: number) => void;
    onRangeChanged?: (range: {
        startIndex: number;
        stopIndex: number;
    }) => Promise<void> | void;
    onScrollEnd?: (rowIndex: number) => void;
    onSongRowDoubleClick?: (params: {
        index: number;
        internalState: ItemListStateActions;
        item: Song;
    }) => void;
    overrideControls?: Partial<ItemControls>;
    rowHeight?: number;
    scrollOffset?: number;
    songsByAlbumId?: Record<string, Song[]>;
    tableId?: string;
}
export declare const ItemDetailList: ({ currentPage, data, enableHeader, getItem, itemCount: externalItemCount, items, listKey, onColumnReordered, onColumnResized, onRangeChanged, onScrollEnd, onSongRowDoubleClick, overrideControls, songsByAlbumId, tableId, }: ItemDetailListProps) => import("react/jsx-runtime").JSX.Element;
export {};

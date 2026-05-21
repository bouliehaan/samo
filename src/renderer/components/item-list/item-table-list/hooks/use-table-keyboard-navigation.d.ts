import { ItemListStateActions, ItemListStateItemWithRequiredProperties } from '/@/renderer/components/item-list/helpers/item-list-state';
import { TableItemProps } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { PlayerContext } from '/@/renderer/features/player/context/player-context';
import { LibraryItem } from '/@/shared/types/domain-types';
interface UseTableKeyboardNavigationProps {
    calculateScrollTopForIndex: (index: number) => number;
    cellPadding: TableItemProps['cellPadding'];
    data: unknown[];
    DEFAULT_ROW_HEIGHT: number;
    enableHeader: boolean;
    enableSelection: boolean;
    extractRowId: (item: unknown) => string | undefined;
    getItem?: (index: number) => undefined | unknown;
    getItemIndex?: (rowId: string) => number | undefined;
    getStateItem: (item: any) => ItemListStateItemWithRequiredProperties | null;
    hasRequiredStateItemProperties: (item: unknown) => item is ItemListStateItemWithRequiredProperties;
    internalState: ItemListStateActions;
    itemCount?: number;
    itemType: LibraryItem;
    parsedColumns: TableItemProps['columns'];
    pinnedRightColumnCount: number;
    pinnedRightColumnRef: React.RefObject<HTMLDivElement | null>;
    playerContext: PlayerContext;
    rowHeight: ((index: number, cellProps: TableItemProps) => number) | number | undefined;
    rowRef: React.RefObject<HTMLDivElement | null>;
    scrollToTableIndex: (index: number, options?: {
        align?: 'bottom' | 'center' | 'top';
    }) => void;
    size: TableItemProps['size'];
    tableId: string;
}
/**
 * Hook to handle keyboard navigation (ArrowUp/ArrowDown) for table row selection and scrolling.
 */
export declare const useTableKeyboardNavigation: ({ calculateScrollTopForIndex, cellPadding, data, DEFAULT_ROW_HEIGHT, enableHeader, enableSelection, extractRowId, getItem, getItemIndex, getStateItem, hasRequiredStateItemProperties, internalState, itemCount, itemType, parsedColumns, pinnedRightColumnCount, pinnedRightColumnRef, playerContext, rowHeight, rowRef, scrollToTableIndex, size, tableId, }: UseTableKeyboardNavigationProps) => {
    handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
};
export {};

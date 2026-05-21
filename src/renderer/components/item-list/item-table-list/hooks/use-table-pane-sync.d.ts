import type { TableScrollShadowStore } from '/@/renderer/components/item-list/item-table-list/table-scroll-shadow-store';
import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
export declare const useTablePaneSync: ({ enableDrag, enableDragScroll, enableHeader, handleRef, onScrollEndRef, pinnedLeftColumnCount, pinnedLeftColumnRef, pinnedRightColumnCount, pinnedRightColumnRef, pinnedRowRef, rowRef, scrollContainerRef, scrollShadowStore, }: {
    enableDrag: boolean | undefined;
    enableDragScroll: boolean | undefined;
    enableHeader: boolean;
    handleRef: React.RefObject<null | {
        internalState: ItemListStateActions;
    }>;
    onScrollEndRef: React.RefObject<((offset: number, internalState: ItemListStateActions) => void) | undefined>;
    pinnedLeftColumnCount: number;
    pinnedLeftColumnRef: React.RefObject<HTMLDivElement | null>;
    pinnedRightColumnCount: number;
    pinnedRightColumnRef: React.RefObject<HTMLDivElement | null>;
    pinnedRowRef: React.RefObject<HTMLDivElement | null>;
    rowRef: React.RefObject<HTMLDivElement | null>;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    scrollShadowStore: TableScrollShadowStore;
}) => void;

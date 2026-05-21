import { TableItemProps } from '../item-table-list';
import { PlayerContext } from '/@/renderer/features/player/context/player-context';
import { LibraryItem } from '/@/shared/types/domain-types';
export declare const useTableScrollToIndex: ({ cellPadding, columns, data, enableAlternateRowColors, enableExpansion, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemType, pinnedLeftColumnRef, pinnedRightColumnRef, playerContext, rowHeight, rowRef, size, tableId, }: {
    cellPadding: "lg" | "md" | "sm" | "xl" | "xs";
    columns: TableItemProps["columns"];
    data: unknown[];
    enableAlternateRowColors: boolean;
    enableExpansion: boolean;
    enableHeader: boolean;
    enableHorizontalBorders: boolean;
    enableRowHoverHighlight: boolean;
    enableSelection: boolean;
    enableVerticalBorders: boolean;
    itemType: LibraryItem;
    pinnedLeftColumnRef: React.RefObject<HTMLDivElement | null>;
    pinnedRightColumnRef: React.RefObject<HTMLDivElement | null>;
    playerContext: PlayerContext;
    rowHeight: ((index: number, cellProps: TableItemProps) => number) | number | undefined;
    rowRef: React.RefObject<HTMLDivElement | null>;
    size: "compact" | "default" | "large";
    tableId: string;
}) => {
    calculateScrollTopForIndex: (index: number) => number;
    DEFAULT_ROW_HEIGHT: number;
    scrollToTableIndex: (index: number, options?: {
        align?: "bottom" | "center" | "top";
    }) => void;
    scrollToTableOffset: (offset: number) => void;
};

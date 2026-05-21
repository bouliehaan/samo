import { ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';
export declare const useTableColumnModel: ({ autoFitColumns, centerContainerWidth, columns, totalContainerWidth, }: {
    autoFitColumns: boolean;
    centerContainerWidth: number;
    columns: ItemTableListColumnConfig[];
    totalContainerWidth: number;
}) => {
    calculatedColumnWidths: number[];
    columnCount: number;
    parsedColumns: ItemTableListColumnConfig[];
    pinnedLeftColumnCount: number;
    pinnedRightColumnCount: number;
    totalColumnCount: number;
};

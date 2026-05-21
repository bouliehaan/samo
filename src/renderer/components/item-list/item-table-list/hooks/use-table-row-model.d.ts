import { TableGroupHeader } from '/@/renderer/components/item-list/item-table-list/item-table-list';
export declare const useTableRowModel: ({ data, enableHeader, groups, }: {
    data: unknown[];
    enableHeader: boolean;
    groups?: TableGroupHeader[];
}) => {
    dataWithGroups: unknown[];
    groupHeaderRowCount: number;
};

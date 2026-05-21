import { ItemListKey, TableColumn } from '/@/shared/types/types';
interface UseItemListColumnResizeProps {
    itemListKey: ItemListKey;
    tableKey?: 'detail' | 'main';
}
export declare const useItemListColumnResize: ({ itemListKey, tableKey, }: UseItemListColumnResizeProps) => {
    handleColumnResized: (columnId: TableColumn, width: number) => void;
};
export {};

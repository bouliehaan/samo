import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { ItemListKey, TableColumn } from '/@/shared/types/types';
interface UseItemListColumnReorderProps {
    itemListKey: ItemListKey;
    tableKey?: 'detail' | 'main';
}
export declare const useItemListColumnReorder: ({ itemListKey, tableKey, }: UseItemListColumnReorderProps) => {
    handleColumnReordered: (columnIdFrom: TableColumn, columnIdTo: TableColumn, edge: Edge | null) => void;
};
export {};

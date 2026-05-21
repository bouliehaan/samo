import { ItemControls } from '/@/renderer/components/item-list/types';
import { TableColumn } from '/@/shared/types/types';
interface UseDefaultItemListControlsArgs {
    enableMultiSelect?: boolean;
    onColumnReordered?: (columnIdFrom: TableColumn, columnIdTo: TableColumn, edge: 'bottom' | 'left' | 'right' | 'top' | null) => void;
    onColumnResized?: (columnId: TableColumn, width: number) => void;
    overrides?: Partial<ItemControls>;
}
export declare const useDefaultItemListControls: (args?: UseDefaultItemListControlsArgs) => ItemControls;
export {};

import { SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
interface ListSortOrderToggleButtonProps {
    defaultSortOrder: SortOrder;
    disabled?: boolean;
    listKey: ItemListKey;
}
export declare const ListSortOrderToggleButton: ({ defaultSortOrder, disabled, listKey, }: ListSortOrderToggleButtonProps) => import("react/jsx-runtime").JSX.Element;
interface ListSortOrderToggleButtonControlledProps {
    disabled?: boolean;
    setSortOrder: (sortOrder: SortOrder) => void;
    sortOrder: SortOrder;
}
export declare const ListSortOrderToggleButtonControlled: ({ disabled, setSortOrder, sortOrder, }: ListSortOrderToggleButtonControlledProps) => import("react/jsx-runtime").JSX.Element;
export {};

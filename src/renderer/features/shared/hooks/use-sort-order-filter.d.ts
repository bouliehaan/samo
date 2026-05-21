import { SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export declare const useSortOrderFilter: (defaultValue: null | string, listKey: ItemListKey) => {
    setSortOrder: (sortOrder: SortOrder) => void;
    sortOrder: SortOrder;
};

import { ItemListKey } from '/@/shared/types/types';
export declare const useSortByFilter: <TSortBy>(defaultValue: null | string, listKey: ItemListKey) => {
    setSortBy: (sortBy: string) => void;
    sortBy: TSortBy;
};

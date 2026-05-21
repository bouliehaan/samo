import { ItemListKey } from '/@/shared/types/types';
export declare const useSelectFilter: (filterKey: string, defaultValue: null | string, listKey: ItemListKey) => {
    [x: string]: string | ((newValue: string) => void) | undefined;
    setValue: (newValue: string) => void;
    value: string | undefined;
};

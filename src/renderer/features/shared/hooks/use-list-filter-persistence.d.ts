import { ItemListKey } from '/@/shared/types/types';
export interface ListFilterPersistence {
    [listKey: string]: {
        [filterKey: string]: string | undefined;
    };
}
export declare const useListFilterPersistence: (serverId: string, listKey: ItemListKey) => {
    getFilter: (filterKey: string) => string | undefined;
    setFilter: (filterKey: string, value: string) => void;
};

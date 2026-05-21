import { ItemListKey } from '/@/shared/types/types';
export type SelectOption = string | {
    label: string;
    value: string;
};
interface ListSelectFilterProps {
    data?: Array<SelectOption>;
    filterKey: string;
    listKey: ItemListKey;
}
export declare const ListSelectFilter: ({ data, filterKey, listKey }: ListSelectFilterProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { ItemListKey } from '/@/shared/types/types';
interface ListRefreshButtonProps {
    disabled?: boolean;
    listKey: ItemListKey;
}
export declare const ListRefreshButton: ({ disabled, listKey }: ListRefreshButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const LIST_REFRESH_MUTATION_KEY = "item-list-refresh";
export declare const getListRefreshMutationKey: (listKey: string) => readonly ["item-list-refresh", string];
export {};

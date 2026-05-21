import { LibraryItem } from '/@/shared/types/domain-types';
interface ListFiltersProps {
    isActive?: boolean;
    itemType: LibraryItem;
}
export declare const isFilterValueSet: (value: unknown) => boolean;
export declare const ListFiltersModal: ({ isActive, itemType }: ListFiltersProps) => import("react/jsx-runtime").JSX.Element;
export declare const ListFilters: ({ itemType }: ListFiltersProps) => import("react/jsx-runtime").JSX.Element;
interface ListFiltersTitleProps {
    itemType: LibraryItem;
}
export declare const ListFiltersTitle: ({ itemType }: ListFiltersTitleProps) => import("react/jsx-runtime").JSX.Element;
export {};

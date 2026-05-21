import { ItemListSettings } from '/@/renderer/store';
import { GenreListQuery } from '/@/shared/types/domain-types';
export declare const GenreListContent: () => import("react/jsx-runtime").JSX.Element;
export declare const GenreListView: ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    overrideQuery?: Omit<GenreListQuery, "limit" | "startIndex">;
}) => import("react/jsx-runtime").JSX.Element | null;

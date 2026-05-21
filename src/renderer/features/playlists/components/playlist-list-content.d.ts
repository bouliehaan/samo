import { ItemListSettings } from '/@/renderer/store';
import { PlaylistListQuery } from '/@/shared/types/domain-types';
export declare const PlaylistListContent: () => import("react/jsx-runtime").JSX.Element;
export declare const PlaylistListView: ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    overrideQuery?: Omit<PlaylistListQuery, "limit" | "startIndex">;
}) => import("react/jsx-runtime").JSX.Element | null;

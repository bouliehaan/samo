import { ItemListSettings } from '/@/renderer/store';
import { AlbumListQuery } from '/@/shared/types/domain-types';
export declare const AlbumListContent: () => import("react/jsx-runtime").JSX.Element;
export type OverrideAlbumListQuery = Omit<Partial<AlbumListQuery>, 'limit' | 'startIndex'>;
export declare const AlbumListView: ({ detail, display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    detail?: ItemListSettings["detail"];
    overrideQuery?: OverrideAlbumListQuery;
}) => import("react/jsx-runtime").JSX.Element | null;

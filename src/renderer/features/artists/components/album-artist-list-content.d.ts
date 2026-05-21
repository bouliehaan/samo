import { ItemListSettings } from '/@/renderer/store';
import { AlbumArtistListQuery } from '/@/shared/types/domain-types';
export declare const AlbumArtistListContent: () => import("react/jsx-runtime").JSX.Element;
export type OverrideAlbumArtistListQuery = Omit<AlbumArtistListQuery, 'limit' | 'startIndex'>;
export declare const AlbumArtistListView: ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    overrideQuery?: OverrideAlbumArtistListQuery;
}) => import("react/jsx-runtime").JSX.Element | null;

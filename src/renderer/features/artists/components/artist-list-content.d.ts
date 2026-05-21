import { ItemListSettings } from '/@/renderer/store';
import { ArtistListQuery } from '/@/shared/types/domain-types';
export declare const ArtistListContent: () => import("react/jsx-runtime").JSX.Element;
export type OverrideArtistListQuery = Omit<ArtistListQuery, 'limit' | 'startIndex'>;
export declare const ArtistListView: ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    overrideQuery?: OverrideArtistListQuery;
}) => import("react/jsx-runtime").JSX.Element | null;

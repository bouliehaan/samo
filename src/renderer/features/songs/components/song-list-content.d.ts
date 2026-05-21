import { ItemListSettings } from '/@/renderer/store';
import { SongListQuery } from '/@/shared/types/domain-types';
export declare const SongListContent: () => import("react/jsx-runtime").JSX.Element;
export type OverrideSongListQuery = Omit<Partial<SongListQuery>, 'limit' | 'startIndex'>;
export declare const SongListView: ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }: ItemListSettings & {
    overrideQuery?: OverrideSongListQuery;
}) => import("react/jsx-runtime").JSX.Element | null;

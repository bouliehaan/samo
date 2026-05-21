import { ItemListComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListPaginatedDetailProps extends ItemListComponentProps<AlbumListQuery> {
    enableHeader?: boolean;
}
export declare const AlbumListPaginatedDetail: ({ enableHeader, itemsPerPage, query, serverId, }: AlbumListPaginatedDetailProps) => import("react/jsx-runtime").JSX.Element;
export {};

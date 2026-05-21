import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListPaginatedGridProps extends ItemListGridComponentProps<AlbumListQuery> {
}
export declare const AlbumListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: AlbumListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

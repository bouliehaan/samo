import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListInfiniteGridProps extends ItemListGridComponentProps<AlbumListQuery> {
}
export declare const AlbumListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: AlbumListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

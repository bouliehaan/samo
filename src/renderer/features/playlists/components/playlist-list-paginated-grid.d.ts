import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistListQuery } from '/@/shared/types/domain-types';
interface PlaylistListPaginatedGridProps extends ItemListGridComponentProps<PlaylistListQuery> {
}
export declare const PlaylistListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: PlaylistListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

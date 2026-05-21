import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistListQuery } from '/@/shared/types/domain-types';
interface PlaylistListInfiniteGridProps extends ItemListGridComponentProps<PlaylistListQuery> {
}
export declare const PlaylistListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: PlaylistListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

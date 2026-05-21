import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { SongListQuery } from '/@/shared/types/domain-types';
interface SongListInfiniteGridProps extends ItemListGridComponentProps<SongListQuery> {
}
export declare const SongListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: SongListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

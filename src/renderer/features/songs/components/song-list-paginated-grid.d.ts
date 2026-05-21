import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { SongListQuery } from '/@/shared/types/domain-types';
interface SongListPaginatedGridProps extends ItemListGridComponentProps<SongListQuery> {
}
export declare const SongListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, serverId, size, }: SongListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

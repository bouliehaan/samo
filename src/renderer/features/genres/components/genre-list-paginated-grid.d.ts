import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { GenreListQuery } from '/@/shared/types/domain-types';
interface GenreListPaginatedGridProps extends ItemListGridComponentProps<GenreListQuery> {
}
export declare const GenreListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: GenreListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { GenreListQuery } from '/@/shared/types/domain-types';
interface GenreListInfiniteGridProps extends ItemListGridComponentProps<GenreListQuery> {
}
export declare const GenreListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: GenreListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

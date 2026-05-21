import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { GenreListQuery } from '/@/shared/types/domain-types';
interface GenreListInfiniteTableProps extends ItemListTableComponentProps<GenreListQuery> {
}
export declare const GenreListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: GenreListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { GenreListQuery } from '/@/shared/types/domain-types';
interface GenreListPaginatedTableProps extends ItemListTableComponentProps<GenreListQuery> {
}
export declare const GenreListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: GenreListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

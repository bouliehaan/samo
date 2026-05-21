import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListPaginatedTableProps extends ItemListTableComponentProps<AlbumListQuery> {
}
export declare const AlbumListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: AlbumListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

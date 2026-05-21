import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { SongListQuery } from '/@/shared/types/domain-types';
interface SongListPaginatedTableProps extends ItemListTableComponentProps<SongListQuery> {
}
export declare const SongListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: SongListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

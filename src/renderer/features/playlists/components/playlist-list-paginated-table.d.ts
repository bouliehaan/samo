import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistListQuery } from '/@/shared/types/domain-types';
interface PlaylistListPaginatedTableProps extends ItemListTableComponentProps<PlaylistListQuery> {
}
export declare const PlaylistListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: PlaylistListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

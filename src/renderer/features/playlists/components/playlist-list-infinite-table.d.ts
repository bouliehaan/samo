import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistListQuery } from '/@/shared/types/domain-types';
interface PlaylistListInfiniteTableProps extends ItemListTableComponentProps<PlaylistListQuery> {
}
export declare const PlaylistListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: PlaylistListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

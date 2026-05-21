import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListInfiniteTableProps extends ItemListTableComponentProps<AlbumListQuery> {
}
export declare const AlbumListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: AlbumListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

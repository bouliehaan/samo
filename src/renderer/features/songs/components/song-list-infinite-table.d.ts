import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { SongListQuery } from '/@/shared/types/domain-types';
interface SongListInfiniteTableProps extends ItemListTableComponentProps<SongListQuery> {
}
export declare const SongListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: SongListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

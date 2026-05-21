import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { ArtistListQuery } from '/@/shared/types/domain-types';
interface ArtistListInfiniteTableProps extends ItemListTableComponentProps<ArtistListQuery> {
}
export declare const ArtistListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: ArtistListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

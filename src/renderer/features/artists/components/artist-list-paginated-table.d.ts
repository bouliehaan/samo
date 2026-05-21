import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { ArtistListQuery } from '/@/shared/types/domain-types';
interface ArtistListPaginatedTableProps extends ItemListTableComponentProps<ArtistListQuery> {
}
export declare const ArtistListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: ArtistListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumArtistListQuery } from '/@/shared/types/domain-types';
interface AlbumArtistListPaginatedTableProps extends ItemListTableComponentProps<AlbumArtistListQuery> {
}
export declare const AlbumArtistListPaginatedTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: AlbumArtistListPaginatedTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

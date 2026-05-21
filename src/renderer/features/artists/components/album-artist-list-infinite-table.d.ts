import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumArtistListQuery } from '/@/shared/types/domain-types';
interface AlbumArtistListInfiniteTableProps extends ItemListTableComponentProps<AlbumArtistListQuery> {
}
export declare const AlbumArtistListInfiniteTable: ({ autoFitColumns, columns, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, itemsPerPage, query, saveScrollOffset, serverId, size, }: AlbumArtistListInfiniteTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

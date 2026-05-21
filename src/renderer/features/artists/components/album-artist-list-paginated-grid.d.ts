import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumArtistListQuery } from '/@/shared/types/domain-types';
interface AlbumArtistListPaginatedGridProps extends ItemListGridComponentProps<AlbumArtistListQuery> {
}
export declare const AlbumArtistListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: AlbumArtistListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

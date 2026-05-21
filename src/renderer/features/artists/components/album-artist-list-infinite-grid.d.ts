import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumArtistListQuery } from '/@/shared/types/domain-types';
interface AlbumArtistListInfiniteGridProps extends ItemListGridComponentProps<AlbumArtistListQuery> {
}
export declare const AlbumArtistListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: AlbumArtistListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

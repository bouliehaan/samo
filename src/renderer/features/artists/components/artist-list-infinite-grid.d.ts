import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { ArtistListQuery } from '/@/shared/types/domain-types';
interface ArtistListInfiniteGridProps extends ItemListGridComponentProps<ArtistListQuery> {
}
export declare const ArtistListInfiniteGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: ArtistListInfiniteGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

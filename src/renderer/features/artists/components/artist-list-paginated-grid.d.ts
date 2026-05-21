import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { ArtistListQuery } from '/@/shared/types/domain-types';
interface ArtistListPaginatedGridProps extends ItemListGridComponentProps<ArtistListQuery> {
}
export declare const ArtistListPaginatedGrid: ({ gap, itemsPerPage, itemsPerRow, query, saveScrollOffset, serverId, size, }: ArtistListPaginatedGridProps) => import("react/jsx-runtime").JSX.Element;
export {};

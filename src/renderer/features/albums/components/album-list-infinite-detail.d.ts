import { ItemListComponentProps } from '/@/renderer/components/item-list/types';
import { AlbumListQuery } from '/@/shared/types/domain-types';
interface AlbumListInfiniteDetailProps extends ItemListComponentProps<AlbumListQuery> {
    enableHeader?: boolean;
}
export declare const AlbumListInfiniteDetail: ({ enableHeader, itemsPerPage, query, serverId, }: AlbumListInfiniteDetailProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { ItemListTableComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistSongListQuery, PlaylistSongListResponse, Song } from '/@/shared/types/domain-types';
interface PlaylistDetailSongListTableProps extends Omit<ItemListTableComponentProps<PlaylistSongListQuery>, 'query'> {
    currentPage?: number;
    data: PlaylistSongListResponse;
    items?: Song[];
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
}
export declare const PlaylistDetailSongListTable: import("react").ForwardRefExoticComponent<PlaylistDetailSongListTableProps & import("react").RefAttributes<any>>;
export declare const PlaylistDetailSongListEditTable: import("react").ForwardRefExoticComponent<PlaylistDetailSongListTableProps & import("react").RefAttributes<any>>;
export {};

import { ItemListGridComponentProps } from '/@/renderer/components/item-list/types';
import { PlaylistSongListQuery, PlaylistSongListResponse, Song } from '/@/shared/types/domain-types';
interface PlaylistDetailSongListGridProps extends Omit<ItemListGridComponentProps<PlaylistSongListQuery>, 'query'> {
    currentPage?: number;
    data: PlaylistSongListResponse;
    items?: Song[];
    itemsPerPage?: number;
    onPageChange?: (page: number) => void;
}
export declare const PlaylistDetailSongListGrid: import("react").ForwardRefExoticComponent<PlaylistDetailSongListGridProps & import("react").RefAttributes<any>>;
export {};

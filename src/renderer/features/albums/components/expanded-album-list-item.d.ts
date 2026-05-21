import { ItemListStateItem } from '/@/renderer/components/item-list/helpers/item-list-state';
import { RelatedArtist, Song } from '/@/shared/types/domain-types';
export interface ExpandedAlbumData {
    _serverId: string;
    albumArtists: RelatedArtist[];
    id: string;
    imageId: null | string;
    name: string;
    songs?: null | Song[];
}
export interface ExpandedAlbumListItemProps {
    album?: ExpandedAlbumData;
    item?: ItemListStateItem;
}
export declare const ExpandedAlbumListItem: (props: ExpandedAlbumListItemProps) => import("react/jsx-runtime").JSX.Element | null;

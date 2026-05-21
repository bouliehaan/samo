import { Album, AlbumArtist, Artist, Playlist, Song } from '/@/shared/types/domain-types';
export type ItemDetailsModalProps = {
    item?: Album | AlbumArtist | Artist | Playlist | Song;
    items?: (Album | AlbumArtist | Artist | Playlist | Song)[];
};
export declare const ItemDetailsModal: ({ item, items }: ItemDetailsModalProps) => import("react/jsx-runtime").JSX.Element | null;

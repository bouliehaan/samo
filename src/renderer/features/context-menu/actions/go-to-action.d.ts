import { Album, AlbumArtist, Artist, QueueSong, Song } from '/@/shared/types/domain-types';
interface GoToActionProps {
    items: Album[] | AlbumArtist[] | Artist[] | QueueSong[] | Song[];
}
export declare const GoToAction: ({ items }: GoToActionProps) => import("react/jsx-runtime").JSX.Element;
export {};

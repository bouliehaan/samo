import { AlbumArtist, Artist } from '/@/shared/types/domain-types';
interface PlayArtistRadioActionProps {
    artist: AlbumArtist | Artist;
    disabled?: boolean;
}
export declare const PlayArtistRadioAction: ({ artist, disabled }: PlayArtistRadioActionProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { TextProps } from '/@/shared/components/text/text';
import { AlbumArtist, RelatedAlbumArtist, RelatedArtist } from '/@/shared/types/domain-types';
export declare const JOINED_ARTISTS_MUTED_PROPS: {
    readonly linkProps: {
        readonly fw: 400;
        readonly isMuted: true;
    };
    readonly rootTextProps: {
        readonly fw: 400;
        readonly isMuted: true;
        readonly size: "sm";
    };
};
interface JoinedArtistsProps {
    artistName: string;
    artists: AlbumArtist[] | RelatedAlbumArtist[] | RelatedArtist[];
    linkProps?: Partial<Omit<TextProps, 'children' | 'component' | 'to'>>;
    readOnly?: boolean;
    rootTextProps?: Partial<Omit<TextProps, 'children' | 'component'>>;
}
export declare const JoinedArtists: import("react").MemoExoticComponent<({ artistName, artists, linkProps, readOnly, rootTextProps, }: JoinedArtistsProps) => import("react/jsx-runtime").JSX.Element>;
export {};

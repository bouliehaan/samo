import { ReactNode } from 'react';
import { ExplicitStatus, LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
interface LibraryHeaderProps {
    children?: ReactNode;
    compact?: boolean;
    containerClassName?: string;
    imageOverlay?: ReactNode;
    imagePlaceholderUrl?: null | string;
    imageUrl?: null | string;
    item: {
        children?: ReactNode;
        explicitStatus?: ExplicitStatus | null;
        imageId?: null | string;
        imageUrl?: null | string;
        route: string;
        type?: LibraryItem;
    };
    loading?: boolean;
    onImageFileDrop?: (file: File) => Promise<void> | void;
    title: string;
    topRight?: ReactNode;
}
export declare const LibraryHeader: import("react").ForwardRefExoticComponent<LibraryHeaderProps & import("react").RefAttributes<HTMLDivElement>>;
export declare const isAsianCharacter: (char: string) => boolean;
export declare const calculateWeightedLength: (str: string) => number;
export declare const calculateTitleSize: (title: string) => string;
interface LibraryHeaderMenuProps {
    favorite?: boolean;
    onAlbumRadio?: () => void;
    onArtistRadio?: () => void;
    onFavorite?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMore?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onPlay?: (type: Play) => void;
    onShuffle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
export declare const LibraryHeaderMenu: ({ favorite, onAlbumRadio, onArtistRadio, onFavorite, onMore, onPlay, onShuffle, }: LibraryHeaderMenuProps) => import("react/jsx-runtime").JSX.Element;
export {};

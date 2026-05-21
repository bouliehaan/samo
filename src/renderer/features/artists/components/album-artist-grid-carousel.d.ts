import { AlbumArtist } from '/@/shared/types/domain-types';
interface AlbumArtistGridCarouselProps {
    data: AlbumArtist[];
    excludeIds?: string[];
    isLoading?: boolean;
    rowCount?: number;
    title: React.ReactNode | string;
}
export declare function AlbumArtistGridCarousel(props: AlbumArtistGridCarouselProps): import("react/jsx-runtime").JSX.Element | null;
export {};

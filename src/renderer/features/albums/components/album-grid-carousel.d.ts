import { Album } from '/@/shared/types/domain-types';
interface AlbumGridCarouselProps {
    data: Album[];
    excludeIds?: string[];
    rowCount?: number;
    title: React.ReactNode | string;
}
export declare function AlbumGridCarousel(props: AlbumGridCarouselProps): import("react/jsx-runtime").JSX.Element | null;
export {};

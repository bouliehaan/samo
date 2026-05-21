import { QueryFunctionContext } from '@tanstack/react-query';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { AlbumArtistListQuery, AlbumArtistListSort, SortOrder } from '/@/shared/types/domain-types';
interface AlbumArtistCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    excludeIds?: string[];
    query?: Partial<Omit<AlbumArtistListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: AlbumArtistListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}
export declare const AlbumArtistInfiniteCarousel: (props: AlbumArtistCarouselProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { QueryFunctionContext } from '@tanstack/react-query';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { AlbumListQuery, AlbumListSort, SortOrder } from '/@/shared/types/domain-types';
interface AlbumCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    excludeIds?: string[];
    query?: Partial<Omit<AlbumListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: AlbumListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}
export declare const AlbumInfiniteCarousel: (props: AlbumCarouselProps) => import("react/jsx-runtime").JSX.Element;
export {};

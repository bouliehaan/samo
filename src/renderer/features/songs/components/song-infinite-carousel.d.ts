import { QueryFunctionContext } from '@tanstack/react-query';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { SongListQuery, SongListSort, SortOrder } from '/@/shared/types/domain-types';
interface SongCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    excludeIds?: string[];
    query?: Partial<Omit<SongListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: SongListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}
export declare const SongInfiniteCarousel: (props: SongCarouselProps) => import("react/jsx-runtime").JSX.Element;
export {};

import { QueryFunctionContext } from '@tanstack/react-query';
import { useGridCarouselContainerQuery } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { PlaylistListQuery, PlaylistListSort, SortOrder } from '/@/shared/types/domain-types';
interface PlaylistCarouselProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    query?: Partial<Omit<PlaylistListQuery, 'startIndex'>>;
    queryKey?: QueryFunctionContext['queryKey'];
    rowCount?: number;
    sortBy: PlaylistListSort;
    sortOrder: SortOrder;
    title: React.ReactNode | string;
}
export declare const PlaylistInfiniteCarousel: (props: PlaylistCarouselProps) => import("react/jsx-runtime").JSX.Element;
export {};

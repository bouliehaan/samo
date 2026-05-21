import type { ReactNode } from 'react';
import { DataRow } from '/@/renderer/components/item-card/item-card';
import { LibraryItem } from '/@/shared/types/domain-types';
export declare const useGridCarouselContainerQuery: () => {
    height: number;
    is2xl: boolean;
    is3xl: boolean;
    is4xl: boolean;
    is5xl: boolean;
    isCalculated: boolean;
    isLg: boolean;
    isMd: boolean;
    isSm: boolean;
    isXl: boolean;
    isXs: boolean;
    ref: import("react").RefObject<any>;
    width: number;
};
interface Card {
    content: ReactNode;
    id: string;
}
interface GridCarouselProps {
    cards: Card[];
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    loadNextPage?: () => void;
    onNextPage: (page: number) => void;
    onPrevPage: (page: number) => void;
    onRefresh?: () => void;
    placeholderItemType?: LibraryItem;
    placeholderRows?: DataRow[];
    rowCount?: number;
    title?: ReactNode | string;
}
declare function BaseGridCarousel(props: GridCarouselProps): import("react/jsx-runtime").JSX.Element;
export declare const GridCarousel: import("react").MemoExoticComponent<typeof BaseGridCarousel>;
interface GridCarouselSkeletonProps {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
    enableRefresh?: boolean;
    placeholderItemType: LibraryItem;
    placeholderRound?: boolean;
    placeholderRows: DataRow[];
    rowCount?: number;
    title?: ReactNode | string;
}
export declare const GridCarouselSkeletonFallback: import("react").MemoExoticComponent<(props: GridCarouselSkeletonProps) => import("react/jsx-runtime").JSX.Element>;
export {};

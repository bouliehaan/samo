import { RefObject } from 'react';
export declare const useStickyTableHeader: ({ containerRef, enabled, headerRef, mainGridRef, pinnedLeftColumnRef, pinnedRightColumnRef, stickyHeaderMainRef, }: {
    containerRef: RefObject<HTMLDivElement | null>;
    enabled: boolean;
    headerRef: RefObject<HTMLDivElement | null>;
    mainGridRef?: RefObject<HTMLDivElement | null>;
    pinnedLeftColumnRef?: RefObject<HTMLDivElement | null>;
    pinnedRightColumnRef?: RefObject<HTMLDivElement | null>;
    stickyHeaderMainRef?: RefObject<HTMLDivElement | null>;
}) => {
    shouldShowStickyHeader: boolean;
    stickyTop: number;
};

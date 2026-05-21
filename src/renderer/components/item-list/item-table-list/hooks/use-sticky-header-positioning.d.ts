interface UseStickyHeaderPositioningProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    shouldShowStickyHeader: boolean;
    stickyHeaderRef: React.RefObject<HTMLDivElement | null>;
}
/**
 * Hook to update the position and width of the sticky header based on container position.
 * Scroll synchronization is handled separately in useStickyTableHeader.
 */
export declare const useStickyHeaderPositioning: ({ containerRef, shouldShowStickyHeader, stickyHeaderRef, }: UseStickyHeaderPositioningProps) => void;
export {};

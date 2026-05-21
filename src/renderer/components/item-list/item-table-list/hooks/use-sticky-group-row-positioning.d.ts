interface UseStickyGroupRowPositioningProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    shouldRenderStickyGroupRow: boolean;
    stickyGroupRowRef: React.RefObject<HTMLDivElement | null>;
}
/**
 * Hook to update the position and width of the sticky group row based on container position.
 */
export declare const useStickyGroupRowPositioning: ({ containerRef, shouldRenderStickyGroupRow, stickyGroupRowRef, }: UseStickyGroupRowPositioningProps) => void;
export {};

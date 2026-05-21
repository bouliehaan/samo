interface UseContainerWidthTrackingProps {
    autoFitColumns: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    rowRef: React.RefObject<HTMLDivElement | null>;
    setCenterContainerWidth: (width: number) => void;
    setTotalContainerWidth: (width: number) => void;
}
/**
 * Hook to track container widths using ResizeObserver for column width calculations.
 */
export declare const useContainerWidthTracking: ({ autoFitColumns, containerRef, rowRef, setCenterContainerWidth, setTotalContainerWidth, }: UseContainerWidthTrackingProps) => void;
export {};

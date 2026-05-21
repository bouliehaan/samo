interface UseRowInteractionDelegateProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    enableRowHoverHighlight: boolean;
}
/**
 * Hook to handle row hover and drag-over styling via delegated event listeners.
 * This is intentionally imperative to avoid React re-rendering the entire visible grid on hover.
 */
export declare const useRowInteractionDelegate: ({ containerRef, enableRowHoverHighlight, }: UseRowInteractionDelegateProps) => void;
export {};

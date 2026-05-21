interface UseTableInitialScrollProps {
    initialTop?: {
        behavior?: 'auto' | 'smooth';
        to: number;
        type: 'index' | 'offset';
    };
    scrollToTableIndex: (index: number, options?: {
        align?: 'bottom' | 'center' | 'top';
    }) => void;
    scrollToTableOffset: (offset: number) => void;
    startRowIndex?: number;
}
/**
 * Hook to handle initial scroll position and scrolling to top when startRowIndex changes.
 */
export declare const useTableInitialScroll: ({ initialTop, scrollToTableIndex, scrollToTableOffset, startRowIndex, }: UseTableInitialScrollProps) => void;
export {};

import { useEffect, useRef } from 'react';
/**
 * Hook to handle initial scroll position and scrolling to top when startRowIndex changes.
 */
export const useTableInitialScroll = ({ initialTop, scrollToTableIndex, scrollToTableOffset, startRowIndex, }) => {
    const isInitialScrollPositionSet = useRef(false);
    useEffect(() => {
        if (!initialTop || isInitialScrollPositionSet.current)
            return;
        isInitialScrollPositionSet.current = true;
        if (initialTop.type === 'offset') {
            scrollToTableOffset(initialTop.to);
        }
        else {
            scrollToTableIndex(initialTop.to);
        }
    }, [initialTop, scrollToTableIndex, scrollToTableOffset]);
    // Scroll to top when startRowIndex changes
    useEffect(() => {
        if (startRowIndex !== undefined) {
            scrollToTableOffset(0);
        }
    }, [startRowIndex, scrollToTableOffset]);
};

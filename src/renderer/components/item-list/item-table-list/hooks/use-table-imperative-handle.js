import { useEffect, useImperativeHandle, useMemo } from 'react';
/**
 * Hook to set up the imperative handle for ItemTableList, providing scroll methods and internal state.
 */
export const useTableImperativeHandle = ({ enableHeader, handleRef, internalState, ref, scrollToTableIndex, scrollToTableOffset, }) => {
    const imperativeHandle = useMemo(() => ({
        internalState,
        scrollToIndex: (index, options) => {
            scrollToTableIndex(enableHeader ? index + 1 : index, options);
        },
        scrollToOffset: (offset) => {
            scrollToTableOffset(offset);
        },
    }), [enableHeader, internalState, scrollToTableIndex, scrollToTableOffset]);
    useImperativeHandle(ref, () => imperativeHandle);
    useEffect(() => {
        handleRef.current = imperativeHandle;
    }, [handleRef, imperativeHandle]);
};

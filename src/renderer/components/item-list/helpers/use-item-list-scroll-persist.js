import { useCallback, useMemo } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import { useScrollStore } from '/@/renderer/store/scroll.store';
export const useItemListScrollPersist = ({ enabled }) => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const setOffset = useScrollStore((s) => s.setOffset);
    const getOffset = useScrollStore((s) => s.getOffset);
    const scrollOffset = useMemo(() => {
        if (navigationType !== 'POP')
            return undefined;
        return getOffset(location.key);
    }, [getOffset, location.key, navigationType]);
    const handleOnScrollEnd = useCallback((offset) => {
        if (!enabled)
            return;
        setOffset(location.key, offset);
    }, [enabled, location.key, setOffset]);
    return { handleOnScrollEnd, scrollOffset };
};

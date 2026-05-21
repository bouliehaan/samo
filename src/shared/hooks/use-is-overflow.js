import { useLayoutEffect, useState } from 'react';
export const useIsOverflow = (ref) => {
    const [isOverflow, setIsOverflow] = useState(undefined);
    useLayoutEffect(() => {
        const { current } = ref;
        const trigger = () => {
            const hasOverflow = (current?.scrollHeight || 0) > (current?.clientHeight || 0);
            setIsOverflow(hasOverflow);
        };
        if (current) {
            trigger();
        }
    }, [ref]);
    return isOverflow;
};

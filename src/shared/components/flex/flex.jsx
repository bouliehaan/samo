import { Flex as MantineFlex } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Flex = forwardRef(({ children, classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (<MantineFlex classNames={memoizedClassNames} ref={ref} style={memoizedStyle} {...props}>
                {children}
            </MantineFlex>);
});
_Flex.displayName = 'Flex';
export const Flex = memo(_Flex);

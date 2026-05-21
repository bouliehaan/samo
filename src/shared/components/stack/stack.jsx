import { Stack as MantineStack } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Stack = forwardRef(({ children, classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (<MantineStack classNames={memoizedClassNames} ref={ref} style={memoizedStyle} {...props}>
                {children}
            </MantineStack>);
});
_Stack.displayName = 'Stack';
export const Stack = memo(_Stack);

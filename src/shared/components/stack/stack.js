import { jsx as _jsx } from "react/jsx-runtime";
import { Stack as MantineStack } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Stack = forwardRef(({ children, classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (_jsx(MantineStack, { classNames: memoizedClassNames, ref: ref, style: memoizedStyle, ...props, children: children }));
});
_Stack.displayName = 'Stack';
export const Stack = memo(_Stack);

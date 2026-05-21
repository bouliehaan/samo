import { jsx as _jsx } from "react/jsx-runtime";
import { Flex as MantineFlex } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Flex = forwardRef(({ children, classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (_jsx(MantineFlex, { classNames: memoizedClassNames, ref: ref, style: memoizedStyle, ...props, children: children }));
});
_Flex.displayName = 'Flex';
export const Flex = memo(_Flex);

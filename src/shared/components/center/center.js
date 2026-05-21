import { jsx as _jsx } from "react/jsx-runtime";
import { Center as MantineCenter } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Center = forwardRef(({ children, classNames, onClick, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (_jsx(MantineCenter, { classNames: memoizedClassNames, onClick: onClick, ref: ref, style: memoizedStyle, ...props, children: children }));
});
_Center.displayName = 'Center';
export const Center = memo(_Center);

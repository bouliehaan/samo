import { jsx as _jsx } from "react/jsx-runtime";
import { Group as MantineGroup } from '@mantine/core';
import { forwardRef, memo, useMemo } from 'react';
const _Group = forwardRef(({ children, classNames, style, ...props }, ref) => {
    const memoizedClassNames = useMemo(() => ({ ...classNames }), [classNames]);
    const memoizedStyle = useMemo(() => ({ ...style }), [style]);
    return (_jsx(MantineGroup, { classNames: memoizedClassNames, ref: ref, style: memoizedStyle, ...props, children: children }));
});
_Group.displayName = 'Group';
export const Group = memo(_Group);

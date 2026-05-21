import { jsx as _jsx } from "react/jsx-runtime";
import { ActionIcon as MantineActionIcon, } from '@mantine/core';
import { forwardRef, useMemo } from 'react';
import styles from './action-icon.module.css';
import { Icon } from '/@/shared/components/icon/icon';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
const COMPACT_SIZES = ['compact-xs', 'compact-sm', 'compact-md'];
const isCompactSize = (size) => {
    return typeof size === 'string' && COMPACT_SIZES.includes(size);
};
const _ActionIcon = forwardRef(({ children, classNames, icon, iconProps, onClick, size = 'sm', stopsPropagation, tooltip, variant = 'default', ...props }, ref) => {
    const handleClick = (e) => {
        if (stopsPropagation)
            e.stopPropagation();
        if (onClick)
            onClick(e);
    };
    const memoizedClassNames = useMemo(() => ({
        root: styles.root,
        ...classNames,
    }), [classNames]);
    const mantineSize = isCompactSize(size) ? 'sm' : size;
    const compactSize = isCompactSize(size) ? size : undefined;
    const actionIconProps = {
        classNames: memoizedClassNames,
        size: mantineSize,
        variant,
        ...props,
        onClick: handleClick,
        ...(compactSize && { 'data-size': compactSize }),
    };
    if (tooltip && icon) {
        return (_jsx(Tooltip, { withinPortal: true, ...tooltip, children: _jsx(MantineActionIcon, { ref: ref, ...actionIconProps, children: _jsx(Icon, { icon: icon, size: actionIconProps.size, ...iconProps }) }) }));
    }
    if (icon) {
        return (_jsx(MantineActionIcon, { ref: ref, ...actionIconProps, children: _jsx(Icon, { icon: icon, size: actionIconProps.size, ...iconProps }) }));
    }
    if (tooltip) {
        return (_jsx(Tooltip, { withinPortal: true, ...tooltip, children: _jsx(MantineActionIcon, { ref: ref, ...actionIconProps, children: children }) }));
    }
    return (_jsx(MantineActionIcon, { ref: ref, ...actionIconProps, children: children }));
});
export const ActionIcon = createPolymorphicComponent(_ActionIcon);
export const ActionIconGroup = MantineActionIcon.Group;
export const ActionIconSection = MantineActionIcon.GroupSection;

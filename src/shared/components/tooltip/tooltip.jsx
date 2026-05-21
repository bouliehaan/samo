import { Tooltip as MantineTooltip } from '@mantine/core';
import clsx from 'clsx';
import { memo, useMemo } from 'react';
import styles from './tooltip.module.css';
const DEFAULT_TRANSITION_PROPS = {
    duration: 250,
    transition: 'fade',
};
const TooltipComponent = memo(({ children, classNames, openDelay = 500, transitionProps = DEFAULT_TRANSITION_PROPS, withinPortal = true, ...props }) => {
    const memoizedClassNames = useMemo(() => ({
        ...classNames,
        tooltip: clsx(styles.tooltip, classNames?.['tooltip']),
    }), [classNames]);
    const memoizedTransitionProps = useMemo(() => transitionProps ?? DEFAULT_TRANSITION_PROPS, [transitionProps]);
    return (<MantineTooltip arrowSize={10} classNames={memoizedClassNames} multiline openDelay={openDelay} transitionProps={memoizedTransitionProps} withArrow withinPortal={withinPortal} {...props}>
                {children}
            </MantineTooltip>);
});
TooltipComponent.displayName = 'Tooltip';
export const Tooltip = TooltipComponent;
Tooltip.Group = MantineTooltip.Group;
Tooltip.Group = MantineTooltip.Group;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { forwardRef } from 'react';
import { useMatch } from 'react-router';
import styles from './collapsed-sidebar-item.module.css';
import { Flex } from '/@/shared/components/flex/flex';
import { Text } from '/@/shared/components/text/text';
import { createPolymorphicComponent } from '/@/shared/utils/create-polymorphic-component';
const _CollapsedSidebarItem = forwardRef(({ activeIcon, disabled, icon, label, route, ...props }, ref) => {
    const match = useMatch(route || '/null');
    const isMatch = Boolean(match);
    return (_jsxs(Flex, { align: "center", className: clsx({
            [styles.active]: isMatch,
            [styles.container]: true,
            [styles.disabled]: disabled,
        }), direction: "column", ref: ref, tabIndex: 0, ...props, children: [isMatch ? _jsx("div", { className: styles.activeTabIndicator }) : null, isMatch ? activeIcon : icon, _jsx(Text, { className: clsx({
                    [styles.active]: isMatch,
                    [styles.textWrapper]: true,
                }), fw: "600", isMuted: !isMatch, size: "xs", children: label })] }));
});
export const CollapsedSidebarItem = createPolymorphicComponent(_CollapsedSidebarItem);

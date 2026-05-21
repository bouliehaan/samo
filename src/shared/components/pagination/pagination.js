import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pagination as MantinePagination, } from '@mantine/core';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import styles from './pagination.module.css';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Popover } from '/@/shared/components/popover/popover';
import { Separator } from '/@/shared/components/separator/separator';
import { Text } from '/@/shared/components/text/text';
import { useContainerQuery } from '/@/shared/hooks/use-container-query';
export const Pagination = ({ classNames, containerClassName, itemsPerPage, style, totalItemCount, ...props }) => {
    const { ref: containerRef, ...containerQuery } = useContainerQuery();
    const paginationRef = useRef(null);
    // !IMPORTANT: Mantine Pagination is 1-indexed
    const currentPageIndex = props.value || 0;
    const currentPageValue = currentPageIndex + 1;
    const handleChange = (e) => {
        props.onChange?.(e - 1);
    };
    const currentPageStartIndex = itemsPerPage * currentPageIndex + 1;
    const currentPageEndIndex = Math.min(currentPageValue * itemsPerPage, totalItemCount);
    const [goToPage, setGoToPage] = useState(currentPageValue);
    const handleGoToPage = () => {
        handleChange(Math.max(1, Math.min(goToPage, props.total)));
    };
    const handleGoToKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleGoToPage();
        }
    };
    return (_jsxs("div", { className: clsx(styles.container, containerClassName), ref: containerRef, children: [_jsxs(Group, { gap: "xs", children: [_jsx(MantinePagination, { boundaries: 1, classNames: {
                            control: styles.control,
                            root: styles.root,
                            ...classNames,
                        }, nextIcon: () => _jsx(Icon, { icon: "arrowRightS" }), previousIcon: () => _jsx(Icon, { icon: "arrowLeftS" }), radius: "md", ref: paginationRef, siblings: containerQuery.isXl ? 3 : containerQuery.isMd ? 2 : 1, size: "md", style: {
                            ...style,
                        }, ...props, onChange: handleChange, value: currentPageValue }), _jsxs(Popover, { position: "top", children: [_jsx(Popover.Target, { children: _jsx(ActionIcon, { className: styles.control, icon: "ellipsisHorizontal", size: "xs", style: {
                                        height: 'calc(2rem * 1)',
                                        minWidth: 'calc(2rem * 1)',
                                    } }) }), _jsx(Popover.Dropdown, { children: _jsxs(Group, { gap: 0, children: [_jsx(NumberInput, { autoFocus: true, hideControls: false, max: props.total, min: 1, onChange: (e) => setGoToPage(Number(e)), onKeyDown: handleGoToKeyDown, value: currentPageValue, width: 120 }), _jsx(ActionIcon, { icon: "arrowRight", onClick: handleGoToPage, variant: "default" })] }) })] })] }), containerQuery.isSm && totalItemCount && (_jsxs(Text, { isNoSelect: true, weight: 500, children: [currentPageStartIndex, " - ", currentPageEndIndex, " ", _jsx(Separator, {}), " ", totalItemCount] }))] }));
};

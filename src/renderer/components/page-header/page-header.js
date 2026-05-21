import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { useInView } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useRef } from 'react';
import styles from './page-header.module.css';
import { LibraryBackgroundOverlay } from '/@/renderer/features/shared/components/library-background-overlay';
import { useShouldPadTitlebar } from '/@/renderer/hooks';
import { useWindowSettings } from '/@/renderer/store/settings.store';
import { Flex } from '/@/shared/components/flex/flex';
import { Platform } from '/@/shared/types/types';
const variants = {
    animate: {
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: 'easeIn',
        },
    },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
};
const BasePageHeader = ({ animated, backgroundColor, children, height, isHidden, position, scrollContainerRef, target, ...props }) => {
    const ref = useRef(null);
    const padRight = useShouldPadTitlebar();
    const { windowBarStyle } = useWindowSettings();
    const isInView = useInView({
        current: target?.current || null,
    });
    useEffect(() => {
        const headerElement = ref.current;
        const scrollContainer = scrollContainerRef?.current;
        if (!scrollContainerRef) {
            if (headerElement) {
                headerElement.setAttribute('data-visible', isHidden ? 'false' : 'true');
            }
            return undefined;
        }
        if (!scrollContainer || !headerElement) {
            if (headerElement) {
                headerElement.setAttribute('data-visible', 'false');
            }
            return undefined;
        }
        const updateVisibility = () => {
            const dataScrolled = scrollContainer.getAttribute('data-scrolled');
            const isScrolled = dataScrolled === 'true';
            const shouldShow = isScrolled && !isInView;
            if (shouldShow) {
                headerElement.setAttribute('data-visible', 'true');
            }
            else {
                headerElement.setAttribute('data-visible', 'false');
            }
        };
        updateVisibility();
        const observer = new MutationObserver(updateVisibility);
        observer.observe(scrollContainer, {
            attributeFilter: ['data-scrolled'],
            attributes: true,
        });
        return () => observer.disconnect();
    }, [isInView, scrollContainerRef, isHidden]);
    return (_jsx(_Fragment, { children: _jsxs(Flex, { className: styles.container, "data-visible": "false", ref: ref, style: { height, position: position }, ...props, children: [_jsx("div", { className: clsx(styles.header, {
                        [styles.hidden]: isHidden,
                        [styles.isDraggable]: windowBarStyle !== Platform.WEB,
                        [styles.padRight]: padRight,
                    }), children: _jsx(AnimatePresence, { initial: animated ?? false, children: _jsx(motion.div, { animate: "animate", className: styles.titleWrapper, exit: "exit", initial: "initial", variants: variants, children: children }) }) }), backgroundColor && (_jsx(LibraryBackgroundOverlay, { backgroundColor: backgroundColor, headerRef: ref }))] }) }));
};
export const PageHeader = memo(BasePageHeader);
PageHeader.displayName = 'PageHeader';

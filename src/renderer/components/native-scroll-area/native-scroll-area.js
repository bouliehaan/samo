import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import { forwardRef, memo, useEffect, useRef } from 'react';
import styles from './native-scroll-area.module.css';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useWindowSettings } from '/@/renderer/store/settings.store';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { useThrottledCallback } from '/@/shared/hooks/use-throttled-callback';
import { Platform } from '/@/shared/types/types';
const BaseNativeScrollArea = forwardRef(({ children, noHeader, pageHeaderProps, scrollHideDelay, ...props }, ref) => {
    const { windowBarStyle } = useWindowSettings();
    const containerRef = useRef(null);
    const scrollHandler = useThrottledCallback((e) => {
        if (noHeader || !pageHeaderProps) {
            return;
        }
        const scrollElement = e?.target;
        if (!scrollElement || !containerRef.current) {
            return;
        }
        const offset = pageHeaderProps.offset || 0;
        const scrollTop = scrollElement.scrollTop;
        if (scrollTop > offset) {
            containerRef.current.setAttribute('data-scrolled', 'true');
        }
        else {
            containerRef.current.setAttribute('data-scrolled', 'false');
        }
    }, 100);
    const [initialize] = useOverlayScrollbars({
        defer: false,
        events: {
            scroll: (_instance, e) => {
                scrollHandler(e);
            },
        },
        options: {
            overflow: { x: 'hidden', y: 'scroll' },
            scrollbars: {
                autoHide: 'scroll',
                autoHideDelay: scrollHideDelay || 500,
                pointers: ['mouse', 'pen', 'touch'],
                theme: 'samo-os-scrollbar',
            },
        },
    });
    useEffect(() => {
        if (containerRef.current) {
            initialize(containerRef.current);
            if (!noHeader && pageHeaderProps) {
                containerRef.current.setAttribute('data-scrolled', 'false');
            }
        }
    }, [initialize, noHeader, pageHeaderProps]);
    const mergedRef = useMergedRef(ref, containerRef);
    return (_jsxs(_Fragment, { children: [windowBarStyle === Platform.WEB && _jsx("div", { className: styles.dragContainer }), !noHeader && pageHeaderProps && (_jsx(PageHeader, { animated: true, position: "absolute", scrollContainerRef: containerRef, ...pageHeaderProps })), _jsx("div", { className: styles.scrollArea, ref: mergedRef, ...props, children: children })] }));
});
export const NativeScrollArea = memo(BaseNativeScrollArea);
NativeScrollArea.displayName = 'NativeScrollArea';

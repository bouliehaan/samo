import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import clsx from 'clsx';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import styles from './scroll-area.module.css';
import './scroll-area.css';
import { useMergedRef } from '/@/shared/hooks/use-merged-ref';
import { DragTarget } from '/@/shared/types/drag-and-drop';
export const ScrollArea = forwardRef((props, ref) => {
    const { allowDragScroll, children, className, scrollHideDelay, scrollX = false, scrollY = true, ...htmlProps } = props;
    const containerRef = useRef(null);
    const [scroller, setScroller] = useState(null);
    const [initialize, osInstance] = useOverlayScrollbars({
        defer: false,
        options: {
            overflow: { x: scrollX ? 'scroll' : 'hidden', y: scrollY ? 'scroll' : 'hidden' },
            scrollbars: {
                autoHide: 'leave',
                autoHideDelay: scrollHideDelay || 500,
                pointers: ['mouse', 'pen', 'touch'],
                theme: 'samo-os-scrollbar',
                visibility: 'visible',
            },
        },
    });
    useEffect(() => {
        const { current: root } = containerRef;
        let autoScrollCleanup = null;
        if (scroller && root) {
            initialize({
                elements: { viewport: scroller },
                target: root,
            });
            if (allowDragScroll) {
                autoScrollCleanup = autoScrollForElements({
                    canScroll: (args) => {
                        const data = args.source.data;
                        if (data.type === DragTarget.TABLE_COLUMN)
                            return false;
                        return true;
                    },
                    element: scroller,
                    getAllowedAxis: () => 'vertical',
                    getConfiguration: () => ({ maxScrollSpeed: 'standard' }),
                });
            }
        }
        return () => {
            if (autoScrollCleanup) {
                autoScrollCleanup();
            }
            osInstance()?.destroy();
        };
    }, [allowDragScroll, initialize, osInstance, scroller]);
    const mergedRef = useMergedRef(ref, containerRef);
    const handleRef = useCallback((el) => {
        if (el) {
            setScroller((currentScroller) => {
                if (currentScroller === el)
                    return currentScroller;
                return el;
            });
        }
        mergedRef(el);
    }, [mergedRef]);
    return (<div className={clsx(styles.scrollArea, className)} ref={handleRef} {...htmlProps}>
            {children}
        </div>);
});

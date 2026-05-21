import { useEffect } from 'react';
/**
 * Hook to handle row hover and drag-over styling via delegated event listeners.
 * This is intentionally imperative to avoid React re-rendering the entire visible grid on hover.
 */
export const useRowInteractionDelegate = ({ containerRef, enableRowHoverHighlight, }) => {
    // Row hover highlight: do one delegated listener per table rather than per cell
    useEffect(() => {
        if (!enableRowHoverHighlight)
            return;
        const root = containerRef.current;
        if (!root)
            return;
        let hoveredKey = null;
        let rafId = null;
        const getRowKey = (target) => {
            const el = target instanceof Element ? target : null;
            const rowEl = el?.closest?.('[data-row-index]');
            return rowEl?.getAttribute('data-row-index') ?? null;
        };
        const apply = (prev, next) => {
            if (rafId !== null)
                cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (prev) {
                    root.querySelectorAll(`[data-row-index="${prev}"]`).forEach((node) => {
                        node.removeAttribute('data-row-hovered');
                    });
                }
                if (next) {
                    root.querySelectorAll(`[data-row-index="${next}"]`).forEach((node) => {
                        node.setAttribute('data-row-hovered', 'true');
                    });
                }
            });
        };
        const setHovered = (next) => {
            if (next === hoveredKey)
                return;
            const prev = hoveredKey;
            hoveredKey = next;
            apply(prev, next);
        };
        const onPointerOver = (e) => {
            setHovered(getRowKey(e.target));
        };
        const onPointerOut = (e) => {
            // If moving within the same row, keep it hovered
            const relatedKey = getRowKey(e.relatedTarget);
            if (relatedKey === hoveredKey)
                return;
            setHovered(relatedKey);
        };
        root.addEventListener('pointerover', onPointerOver);
        root.addEventListener('pointerout', onPointerOut);
        return () => {
            root.removeEventListener('pointerover', onPointerOver);
            root.removeEventListener('pointerout', onPointerOut);
            if (rafId !== null)
                cancelAnimationFrame(rafId);
            // Ensure we don't leave stale attributes behind
            if (hoveredKey)
                apply(hoveredKey, null);
        };
    }, [containerRef, enableRowHoverHighlight]);
    // Dragged-over row border styling delegation
    useEffect(() => {
        const root = containerRef.current;
        if (!root)
            return;
        let current = null;
        let pending = null;
        let rafId = null;
        const clearRow = (rowKey) => {
            root.querySelectorAll(`[data-row-index="${rowKey}"]`).forEach((node) => {
                const el = node;
                el.removeAttribute('data-row-dragged-over');
                el.removeAttribute('data-row-dragged-over-first');
            });
        };
        const applyRow = (rowKey, edge) => {
            const nodes = root.querySelectorAll(`[data-row-index="${rowKey}"]`);
            nodes.forEach((node, idx) => {
                const el = node;
                el.setAttribute('data-row-dragged-over', edge);
                if (idx === 0) {
                    el.setAttribute('data-row-dragged-over-first', 'true');
                }
                else {
                    el.removeAttribute('data-row-dragged-over-first');
                }
            });
        };
        const flush = () => {
            rafId = null;
            const next = pending;
            pending = null;
            if (!next)
                return;
            // Clear previous row if we're moving rows or clearing.
            if (current && current.rowKey !== next.rowKey) {
                clearRow(current.rowKey);
                current = null;
            }
            if (!next.edge) {
                if (current) {
                    clearRow(current.rowKey);
                    current = null;
                }
                return;
            }
            // If same row + edge, no-op.
            if (current && current.rowKey === next.rowKey && current.edge === next.edge)
                return;
            if (current)
                clearRow(current.rowKey);
            applyRow(next.rowKey, next.edge);
            current = { edge: next.edge, rowKey: next.rowKey };
        };
        const scheduleFlush = () => {
            if (rafId !== null)
                return;
            rafId = requestAnimationFrame(flush);
        };
        const onRowDragOver = (e) => {
            const ev = e;
            const rowKey = ev.detail?.rowKey;
            const edge = ev.detail?.edge ?? null;
            if (!rowKey)
                return;
            pending = { edge, rowKey };
            scheduleFlush();
        };
        root.addEventListener('itl:row-drag-over', onRowDragOver);
        return () => {
            root.removeEventListener('itl:row-drag-over', onRowDragOver);
            if (rafId !== null)
                cancelAnimationFrame(rafId);
            if (current)
                clearRow(current.rowKey);
        };
    }, [containerRef]);
};

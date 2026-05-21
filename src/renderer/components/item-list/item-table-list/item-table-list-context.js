import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { useSyncExternalStore } from 'react';
const ItemTableListConfigContext = createContext(null);
export const ItemTableListConfigProvider = ({ children, value, }) => {
    // Keep reference stable when the input reference is stable.
    const memoValue = useMemo(() => value, [value]);
    return (_jsx(ItemTableListConfigContext.Provider, { value: memoValue, children: children }));
};
export const useItemTableListConfig = () => {
    return useContext(ItemTableListConfigContext);
};
const ItemTableListColumnResizeLiveContext = createContext(null);
export const ItemTableListColumnResizeLiveProvider = ({ children, value, }) => {
    return (_jsx(ItemTableListColumnResizeLiveContext.Provider, { value: value, children: children }));
};
export const useItemTableListColumnResizeLive = () => {
    return useContext(ItemTableListColumnResizeLiveContext);
};
export const useItemTableListColumnResizeLiveState = () => {
    const [columnResizePreview, setColumnResizePreview] = useState(null);
    const previewRafRef = useRef(null);
    const pendingPreviewRef = useRef(null);
    const scheduleColumnResizePreview = useCallback((columnIndex, width) => {
        pendingPreviewRef.current = { columnIndex, width };
        if (previewRafRef.current !== null)
            return;
        previewRafRef.current = requestAnimationFrame(() => {
            previewRafRef.current = null;
            const pending = pendingPreviewRef.current;
            if (pending) {
                setColumnResizePreview(pending);
            }
        });
    }, []);
    const clearColumnResizePreview = useCallback(() => {
        if (previewRafRef.current !== null) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
        }
        pendingPreviewRef.current = null;
        setColumnResizePreview(null);
    }, []);
    return {
        clearColumnResizePreview,
        columnResizePreview,
        scheduleColumnResizePreview,
    };
};
class ActiveRowStore {
    activeRowId = null;
    listeners = new Set();
    getActiveRowId() {
        return this.activeRowId;
    }
    setActiveRowId(next) {
        const normalized = next ?? null;
        if (this.activeRowId === normalized)
            return;
        this.activeRowId = normalized;
        this.listeners.forEach((l) => l());
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
}
const ItemTableListStoreContext = createContext(null);
export const ItemTableListStoreProvider = ({ activeRowId, children, }) => {
    const storeRef = useRef(null);
    if (!storeRef.current) {
        storeRef.current = new ActiveRowStore();
    }
    const store = storeRef.current;
    useEffect(() => {
        store.setActiveRowId(activeRowId);
    }, [activeRowId, store]);
    const value = useMemo(() => ({ activeRowStore: store }), [store]);
    return (_jsx(ItemTableListStoreContext.Provider, { value: value, children: children }));
};
export const useItemTableListStore = () => {
    return useContext(ItemTableListStoreContext);
};
export const useActiveRowSubscription = (selector) => {
    const store = useItemTableListStore()?.activeRowStore ?? null;
    return useSyncExternalStore(store?.subscribe.bind(store) || (() => () => { }), () => selector(store?.getActiveRowId() ?? null));
};
export const useIsActiveRow = (...rowIds) => {
    return useActiveRowSubscription((activeRowId) => rowIds.some((id) => !!id && id === activeRowId));
};

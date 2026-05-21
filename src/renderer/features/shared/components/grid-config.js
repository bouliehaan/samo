import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { attachClosestEdge, extractClosestEdge, } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import clsx from 'clsx';
import Fuse from 'fuse.js';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './table-config.module.css';
import { ListConfigTable } from '/@/renderer/features/shared/components/list-config-menu';
import { useSettingsStore, useSettingsStoreActions, } from '/@/renderer/store';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Slider } from '/@/shared/components/slider/slider';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { useDebouncedState } from '/@/shared/hooks/use-debounced-state';
import { dndUtils, DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
import { ListPaginationType } from '/@/shared/types/types';
export const GridConfig = ({ extraOptions, gridRowsData, listKey, optionsConfig, }) => {
    const { t } = useTranslation();
    const list = useSettingsStore((state) => state.lists[listKey]);
    const grid = list.grid;
    const { setList } = useSettingsStoreActions();
    const options = useMemo(() => {
        const allOptions = [
            {
                component: (_jsx(SegmentedControl, { data: [
                        {
                            label: t('table.config.general.pagination_infinite', {
                                postProcess: 'sentenceCase',
                            }),
                            value: ListPaginationType.INFINITE,
                        },
                        {
                            label: t('table.config.general.pagination_paginate', {
                                postProcess: 'sentenceCase',
                            }),
                            value: ListPaginationType.PAGINATED,
                        },
                    ], onChange: (value) => setList(listKey, {
                        ...list,
                        pagination: value,
                    }), size: "sm", value: list.pagination, w: "100%" })),
                id: 'pagination',
                label: t('table.config.general.pagination', { postProcess: 'sentenceCase' }),
                size: 'sm',
            },
            {
                component: (_jsx(Slider, { defaultValue: list.itemsPerPage, marks: [
                        { value: 25 },
                        { value: 50 },
                        { value: 100 },
                        { value: 150 },
                        { value: 200 },
                        { value: 250 },
                        { value: 300 },
                        { value: 400 },
                        { value: 500 },
                    ], max: 500, min: 25, onChangeEnd: (value) => setList(listKey, { ...list, itemsPerPage: value }), restrictToMarks: true, w: "100%" })),
                id: 'itemsPerPage',
                label: (_jsxs(Group, { children: [t('table.config.general.pagination_itemsPerPage', {
                            postProcess: 'sentenceCase',
                        }), _jsx(Badge, { children: list.itemsPerPage })] })),
            },
            {
                component: (_jsxs(Group, { gap: "xs", grow: true, w: "100%", children: [_jsx(ActionIcon, { disabled: grid.itemGap === 'xl', icon: "arrowUp", iconProps: { size: 'lg' }, onClick: () => {
                                if (grid.itemGap === 'xl')
                                    return;
                                if (grid.itemGap === 'lg') {
                                    return setList(listKey, { grid: { itemGap: 'xl' } });
                                }
                                if (grid.itemGap === 'md') {
                                    return setList(listKey, { grid: { itemGap: 'lg' } });
                                }
                                if (grid.itemGap === 'sm') {
                                    return setList(listKey, { grid: { itemGap: 'md' } });
                                }
                                return setList(listKey, { grid: { itemGap: 'sm' } });
                            }, size: "xs" }), _jsx(ActionIcon, { disabled: grid.itemGap === 'xs', icon: "arrowDown", iconProps: { size: 'lg' }, onClick: () => {
                                if (grid.itemGap === 'xs')
                                    return;
                                if (grid.itemGap === 'sm') {
                                    return setList(listKey, { grid: { itemGap: 'xs' } });
                                }
                                if (grid.itemGap === 'md') {
                                    return setList(listKey, { grid: { itemGap: 'sm' } });
                                }
                                if (grid.itemGap === 'lg') {
                                    return setList(listKey, { grid: { itemGap: 'md' } });
                                }
                                return setList(listKey, { grid: { itemGap: 'lg' } });
                            }, size: "xs" })] })),
                id: 'itemGap',
                label: (_jsxs(Group, { children: [t('table.config.general.gap', { postProcess: 'sentenceCase' }), _jsx(Badge, { children: grid.itemGap })] })),
            },
            {
                component: (_jsx(Slider, { defaultValue: grid.itemsPerRow, max: 20, min: 2, onChangeEnd: (value) => setList(listKey, { grid: { itemsPerRow: value } }), w: "100%" })),
                id: 'itemsPerRow',
                label: (_jsxs(Group, { justify: "space-between", w: "100%", wrap: "nowrap", children: [_jsxs(Group, { children: [t('table.config.general.itemsPerRow', { postProcess: 'sentenceCase' }), _jsx(Badge, { children: grid.itemsPerRow })] }), _jsx(Checkbox, { checked: grid.itemsPerRowEnabled, label: t('common.enable', { postProcess: 'titleCase' }), onChange: (e) => setList(listKey, {
                                grid: { itemsPerRowEnabled: e.target.checked },
                            }), pr: "md", size: "xs" })] })),
            },
            {
                component: (_jsx(SegmentedControl, { data: [
                        {
                            label: t('table.config.general.size_compact', {
                                postProcess: 'titleCase',
                            }),
                            value: 'compact',
                        },
                        {
                            label: t('table.config.general.size_default', {
                                postProcess: 'titleCase',
                            }),
                            value: 'default',
                        },
                        {
                            label: t('table.config.general.size_large', {
                                postProcess: 'titleCase',
                            }),
                            value: 'large',
                        },
                    ], onChange: (value) => setList(listKey, {
                        grid: { size: value },
                    }), size: "sm", value: grid.size || 'default', w: "100%" })),
                id: 'size',
                label: t('table.config.general.size', { postProcess: 'sentenceCase' }),
                size: 'sm',
            },
            ...(extraOptions || []),
        ];
        // Filter and apply config (hidden/disabled)
        return allOptions
            .map((option) => {
            const config = optionsConfig?.[option.id];
            if (config?.hidden) {
                return null;
            }
            return {
                ...option,
                disabled: config?.disabled || false,
            };
        })
            .filter((option) => option !== null);
    }, [list, t, grid, extraOptions, optionsConfig, setList, listKey]);
    return (_jsxs(_Fragment, { children: [_jsx(ListConfigTable, { options: options }), _jsx(Divider, {}), _jsx(GridRowConfig, { data: gridRowsData, onChange: (rows) => setList(listKey, { grid: { rows } }), value: grid.rows })] }));
};
const GridRowConfig = ({ data, onChange, value, }) => {
    const { t } = useTranslation();
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    useLayoutEffect(() => {
        valueRef.current = value;
        onChangeRef.current = onChange;
    });
    const labelMap = useMemo(() => {
        return data.reduce((acc, item) => {
            acc[item.value] = item.label;
            return acc;
        }, {});
    }, [data]);
    const handleChangeEnabled = useCallback((item, checked) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        const newValues = [...currentValue];
        newValues[index] = { ...newValues[index], isEnabled: checked };
        onChangeRef.current(newValues);
    }, []);
    const handleMoveUp = useCallback((item) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        if (index === 0)
            return;
        const newValues = [...currentValue];
        [newValues[index], newValues[index - 1]] = [newValues[index - 1], newValues[index]];
        onChangeRef.current(newValues);
    }, []);
    const handleMoveDown = useCallback((item) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        if (index === currentValue.length - 1)
            return;
        const newValues = [...currentValue];
        [newValues[index], newValues[index + 1]] = [newValues[index + 1], newValues[index]];
        onChangeRef.current(newValues);
    }, []);
    const handleAlignLeft = useCallback((item) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        const newValues = [...currentValue];
        newValues[index] = { ...newValues[index], align: 'start' };
        onChangeRef.current(newValues);
    }, []);
    const handleAlignCenter = useCallback((item) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        const newValues = [...currentValue];
        newValues[index] = { ...newValues[index], align: 'center' };
        onChangeRef.current(newValues);
    }, []);
    const handleAlignRight = useCallback((item) => {
        const currentValue = valueRef.current;
        const index = currentValue.findIndex((v) => v.id === item.id);
        const newValues = [...currentValue];
        newValues[index] = { ...newValues[index], align: 'end' };
        onChangeRef.current(newValues);
    }, []);
    const [searchRows, setSearchRows] = useDebouncedState('', 300);
    const fuse = useMemo(() => {
        return new Fuse(value, {
            getFn: (obj) => {
                return labelMap[obj.id] || '';
            },
            includeMatches: true,
            includeScore: true,
            keys: ['id', 'label'],
            threshold: 0.3,
        });
    }, [value, labelMap]);
    const filteredRows = useMemo(() => {
        if (!searchRows.trim()) {
            return value.map((item) => ({ item, matches: null }));
        }
        const results = fuse.search(searchRows);
        const resultMap = new Map(results.map((result) => [result.item.id, result.matches]));
        return value.map((item) => ({
            item,
            matches: resultMap.get(item.id) || null,
        }));
    }, [value, searchRows, fuse]);
    const handleReorder = useCallback((idFrom, idTo, edge) => {
        const currentValue = valueRef.current;
        const idList = currentValue.map((item) => item.id);
        const newIdOrder = dndUtils.reorderById({
            edge,
            idFrom,
            idTo,
            list: idList,
        });
        // Map the new ID order back to full items
        const newOrder = newIdOrder.map((id) => currentValue.find((item) => item.id === id));
        onChangeRef.current(newOrder);
    }, []);
    return (_jsxs(Stack, { gap: "xs", children: [_jsxs(Group, { justify: "space-between", mb: "md", children: [_jsx(Text, { size: "sm", children: t('common.gridRows', { postProcess: 'sentenceCase' }) }), _jsx(TextInput, { onChange: (e) => setSearchRows(e.currentTarget.value), placeholder: t('common.search', {
                            postProcess: 'sentenceCase',
                        }), size: "xs" })] }), _jsx("div", { style: { userSelect: 'none' }, children: filteredRows.map(({ item, matches }) => (_jsx(GridRowItem, { handleAlignCenter: handleAlignCenter, handleAlignLeft: handleAlignLeft, handleAlignRight: handleAlignRight, handleChangeEnabled: handleChangeEnabled, handleMoveDown: handleMoveDown, handleMoveUp: handleMoveUp, handleReorder: handleReorder, item: item, label: labelMap[item.id], matches: matches }, item.id))) })] }));
};
const DragHandle = ({ dragHandleRef, }) => {
    return (_jsx(ActionIcon, { icon: "dragVertical", iconProps: {
            size: 'md',
        }, ref: dragHandleRef, size: "xs", variant: "default" }));
};
const GridRowItem = memo(({ handleAlignCenter, handleAlignLeft, handleAlignRight, handleChangeEnabled, handleMoveDown, handleMoveUp, handleReorder, item, label, matches, }) => {
    const { t } = useTranslation();
    const ref = useRef(null);
    const dragHandleRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggedOver, setIsDraggedOver] = useState(null);
    useEffect(() => {
        if (!ref.current || !dragHandleRef.current) {
            return;
        }
        return combine(draggable({
            element: dragHandleRef.current,
            getInitialData: () => {
                const data = dndUtils.generateDragData({
                    id: [item.id],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.GRID_ROW,
                });
                return data;
            },
            onDragStart: () => {
                setIsDragging(true);
            },
            onDrop: () => {
                setIsDragging(false);
            },
            onGenerateDragPreview: (data) => {
                disableNativeDragPreview({ nativeSetDragImage: data.nativeSetDragImage });
            },
        }), dropTargetForElements({
            canDrop: (args) => {
                const data = args.source.data;
                const isSelf = args.source.data.id[0] === item.id;
                return dndUtils.isDropTarget(data.type, [DragTarget.GRID_ROW]) && !isSelf;
            },
            element: ref.current,
            getData: ({ element, input }) => {
                const data = dndUtils.generateDragData({
                    id: [item.id],
                    operation: [DragOperation.REORDER],
                    type: DragTarget.GRID_ROW,
                });
                return attachClosestEdge(data, {
                    allowedEdges: ['top', 'bottom'],
                    element,
                    input,
                });
            },
            onDrag: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                setIsDraggedOver(closestEdgeOfTarget);
            },
            onDragLeave: () => {
                setIsDraggedOver(null);
            },
            onDrop: (args) => {
                const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                const from = args.source.data.id;
                const to = args.self.data.id;
                handleReorder(from[0], to[0], closestEdgeOfTarget);
                setIsDraggedOver(null);
            },
        }));
    }, [item.id, handleReorder]);
    return (_jsxs("div", { className: clsx(styles.item, {
            [styles.draggedOverBottom]: isDraggedOver === 'bottom',
            [styles.draggedOverTop]: isDraggedOver === 'top',
            [styles.dragging]: isDragging,
            [styles.matched]: matches && matches.length > 0,
        }), ref: ref, children: [_jsxs(Group, { wrap: "nowrap", children: [_jsx(DragHandle, { dragHandleRef: dragHandleRef }), _jsx(Checkbox, { checked: item.isEnabled, id: item.id, label: label, onChange: (e) => handleChangeEnabled(item, e.currentTarget.checked), size: "sm" })] }), _jsxs(Group, { wrap: "nowrap", children: [_jsxs(ActionIconGroup, { className: styles.group, children: [_jsx(ActionIcon, { icon: "arrowUp", iconProps: { size: 'md' }, onClick: () => handleMoveUp(item), size: "xs", tooltip: {
                                    label: t('table.config.general.moveUp', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, variant: "subtle" }), _jsx(ActionIcon, { icon: "arrowDown", iconProps: { size: 'md' }, onClick: () => handleMoveDown(item), size: "xs", tooltip: {
                                    label: t('table.config.general.moveDown', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, variant: "subtle" })] }), _jsxs(ActionIconGroup, { className: styles.group, children: [_jsx(ActionIcon, { icon: "alignLeft", iconProps: { size: 'md' }, onClick: () => handleAlignLeft(item), size: "xs", tooltip: {
                                    label: t('table.config.general.alignLeft', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, variant: item.align === 'start' ? 'filled' : 'subtle' }), _jsx(ActionIcon, { icon: "alignCenter", iconProps: { size: 'md' }, onClick: () => handleAlignCenter(item), size: "xs", tooltip: {
                                    label: t('table.config.general.alignCenter', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, variant: item.align === 'center' ? 'filled' : 'subtle' }), _jsx(ActionIcon, { icon: "alignRight", iconProps: { size: 'md' }, onClick: () => handleAlignRight(item), size: "xs", tooltip: {
                                    label: t('table.config.general.alignRight', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, variant: item.align === 'end' ? 'filled' : 'subtle' })] })] })] }));
}, (prevProps, nextProps) => {
    return (prevProps.item.id === nextProps.item.id &&
        prevProps.item.isEnabled === nextProps.item.isEnabled &&
        prevProps.item.align === nextProps.item.align &&
        prevProps.label === nextProps.label &&
        prevProps.matches === nextProps.matches);
});

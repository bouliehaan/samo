import { jsx as _jsx } from "react/jsx-runtime";
import { attachClosestEdge, extractClosestEdge, } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DragPreview } from '/@/renderer/components/drag-preview/drag-preview';
import { dndUtils } from '/@/shared/types/drag-and-drop';
export const useDragDrop = ({ drag, drop, isEnabled, }) => {
    const ref = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDraggedOver, setIsDraggedOver] = useState(null);
    useEffect(() => {
        if (!ref.current || !isEnabled)
            return;
        const functions = [];
        if (drag) {
            functions.push(draggable({
                element: ref.current,
                getInitialData: () => {
                    const id = drag.getId();
                    const item = drag.getItem();
                    const data = dndUtils.generateDragData({
                        id,
                        item,
                        itemType: drag.itemType,
                        operation: drag.operation,
                        type: drag.target,
                    }, drag.metadata);
                    return data;
                },
                onDragStart: () => {
                    setIsDragging(true);
                    drag.onDragStart?.();
                },
                onDrop: () => {
                    setIsDragging(false);
                    drag.onDrop?.();
                },
                onGenerateDragPreview: (data) => {
                    if (drag.onGenerateDragPreview) {
                        return drag.onGenerateDragPreview(data);
                    }
                    const dragData = dndUtils.generateDragData({
                        id: drag.getId(),
                        item: drag.getItem(),
                        itemType: drag.itemType,
                        operation: drag.operation,
                        type: drag.target,
                    }, drag.metadata);
                    disableNativeDragPreview({ nativeSetDragImage: data.nativeSetDragImage });
                    setCustomNativeDragPreview({
                        nativeSetDragImage: data.nativeSetDragImage,
                        render: ({ container }) => {
                            const root = createRoot(container);
                            root.render(_jsx(DragPreview, { data: dragData }));
                        },
                    });
                },
            }));
        }
        if (drop) {
            functions.push(dropTargetForElements({
                canDrop: (args) => {
                    return (drop.canDrop?.({ source: args.source.data }) ||
                        false);
                },
                element: ref.current,
                getData: (args) => {
                    const dropData = drop.getData();
                    const data = dndUtils.generateDragData(dropData);
                    return attachClosestEdge(data, {
                        allowedEdges: ['top', 'bottom'],
                        element: args.element,
                        input: args.input,
                    });
                },
                onDrag: (args) => {
                    const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                    drop.onDrag?.({ edge: closestEdgeOfTarget });
                    setIsDraggedOver(closestEdgeOfTarget);
                },
                onDragLeave: () => {
                    setIsDraggedOver(null);
                },
                onDrop: (args) => {
                    const closestEdgeOfTarget = extractClosestEdge(args.self.data);
                    drop.onDrop?.({
                        edge: closestEdgeOfTarget,
                        self: args.self.data,
                        source: args.source.data,
                    });
                    setIsDraggedOver(null);
                },
            }));
        }
        return combine(...functions);
    }, [drag, drop, isDragging, isDraggedOver, isEnabled]);
    return {
        isDraggedOver,
        isDragging,
        ref,
    };
};

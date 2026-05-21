import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { BaseEventPayload, ElementDragType } from '@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types';
import { LibraryItem } from '/@/shared/types/domain-types';
import { DragData, DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
interface UseDraggableProps {
    drag?: {
        getId: () => string[];
        getItem: () => unknown[];
        itemType?: LibraryItem;
        metadata?: Record<string, unknown>;
        onDragStart?: () => void;
        onDrop?: () => void;
        onGenerateDragPreview?: (data: BaseEventPayload<ElementDragType>) => void;
        operation: DragOperation[];
        target: DragTarget | string;
    };
    drop?: {
        canDrop: (args: {
            source: DragData;
        }) => boolean;
        getData: () => DragData;
        onDrag: (args: {
            edge: Edge | null;
        }) => void;
        onDragLeave: () => void;
        onDrop: (args: {
            edge: Edge | null;
            self: DragData;
            source: DragData;
        }) => void;
    };
    isEnabled: boolean;
}
export declare const useDragDrop: <TElement extends HTMLElement>({ drag, drop, isEnabled, }: UseDraggableProps) => {
    isDraggedOver: import("@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types").Edge | null;
    isDragging: boolean;
    ref: import("react").RefObject<TElement | null>;
};
export {};

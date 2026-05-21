import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { PlayerContext } from '/@/renderer/features/player/context/player-context';
import { LibraryItem } from '/@/shared/types/domain-types';
interface DragDropState<TElement extends HTMLElement = HTMLDivElement> {
    dragRef: null | React.Ref<TElement>;
    isDraggedOver: 'bottom' | 'top' | null;
    isDragging: boolean;
}
interface UseItemDragDropStateProps {
    enableDrag: boolean;
    internalState: ItemListStateActions;
    isDataRow: boolean;
    item: unknown;
    itemType: LibraryItem;
    playerContext: PlayerContext;
    playlistId?: string;
}
export declare const useItemDragDropState: <TElement extends HTMLElement = HTMLDivElement>({ enableDrag, internalState, isDataRow, item, itemType, playerContext, playlistId, }: UseItemDragDropStateProps) => DragDropState<TElement>;
export {};

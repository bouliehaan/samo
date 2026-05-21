import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { LibraryItem } from '/@/shared/types/domain-types';
export declare const useListHotkeys: ({ controls, focused, internalState, itemType, }: {
    controls: ItemControls;
    focused: boolean;
    internalState: ItemListStateActions;
    itemType: LibraryItem;
}) => void;

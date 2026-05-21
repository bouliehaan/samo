import { ItemListHandle } from '/@/renderer/components/item-list/types';
import { ItemListKey } from '/@/shared/types/types';
type QueueProps = {
    enableScrollShadow?: boolean;
    listKey: ItemListKey;
    searchTerm: string | undefined;
    tableSize?: 'compact' | 'default' | 'large';
};
export declare const PlayQueue: import("react").ForwardRefExoticComponent<QueueProps & import("react").RefAttributes<ItemListHandle>>;
export {};

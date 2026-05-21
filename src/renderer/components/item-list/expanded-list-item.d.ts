import { ItemListStateItem } from '/@/renderer/components/item-list/helpers/item-list-state';
import { LibraryItem } from '/@/shared/types/domain-types';
interface ExpandedListItemProps {
    item?: ItemListStateItem;
    itemType: LibraryItem;
}
export declare const ExpandedListItem: ({ item, itemType }: ExpandedListItemProps) => import("react/jsx-runtime").JSX.Element | null;
export {};

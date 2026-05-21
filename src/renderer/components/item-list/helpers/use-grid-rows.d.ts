import { type DataRow } from '/@/renderer/components/item-card/item-card';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export declare const useGridRows: (itemType: LibraryItem, listKey?: ItemListKey, size?: "compact" | "default" | "large") => DataRow[];

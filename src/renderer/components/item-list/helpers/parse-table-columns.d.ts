import { ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';
/**
 * Sorts table columns by their pinned position and filters out disabled columns:
 * - Left pinned columns come first (maintaining their original order)
 * - Unpinned columns come next (maintaining their original order)
 * - Right pinned columns come last (maintaining their original order)
 * - Columns with isEnabled: false are removed
 */
export declare const parseTableColumns: (columns: ItemTableListColumnConfig[]) => ItemTableListColumnConfig[];

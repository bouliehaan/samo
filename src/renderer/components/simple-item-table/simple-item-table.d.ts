import { ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';
import { LibraryItem } from '/@/shared/types/domain-types';
interface SimpleItemTableProps {
    cellPadding?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
    columns: ItemTableListColumnConfig[];
    data: unknown[];
    enableAlternateRowColors?: boolean;
    enableHeader?: boolean;
    enableHorizontalBorders?: boolean;
    enableRowHoverHighlight?: boolean;
    enableSelection?: boolean;
    enableVerticalBorders?: boolean;
    getRowId?: ((item: unknown) => string) | string;
    itemType: LibraryItem;
    size?: 'compact' | 'default' | 'large';
}
export declare const SimpleItemTable: ({ cellPadding, columns, data, enableAlternateRowColors, enableHeader, enableHorizontalBorders, enableRowHoverHighlight, enableSelection, enableVerticalBorders, getRowId, itemType, size, }: SimpleItemTableProps) => import("react/jsx-runtime").JSX.Element;
export {};

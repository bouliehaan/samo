import { TableColumn } from '/@/shared/types/types';
export declare function getTrackColumnFixed(columnId: TableColumn): {
    fixedWidth: number;
    isFixedColumn: boolean;
};
export declare function isNoHorizontalPaddingColumn(columnId: TableColumn): boolean;
export declare function isTrackColumnHoverOnly(columnId: TableColumn): boolean;
export declare function shouldShowHoverOnlyColumnContent(columnId: TableColumn, isRowHovered: boolean, song: {
    userFavorite?: boolean | null;
    userRating?: null | number;
}): boolean;

export interface GroupRowInfo {
    groupIndex: number;
    rowIndex: number;
}
export declare const useStickyTableGroupRows: ({ containerRef, enabled, getRowHeight, groups, headerHeight, mainGridRef, shouldShowStickyHeader, stickyHeaderTop, }: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    enabled: boolean;
    getRowHeight: (index: number) => number;
    groups?: Array<{
        itemCount: number;
    }>;
    headerHeight: number;
    mainGridRef: React.RefObject<HTMLDivElement | null>;
    shouldShowStickyHeader?: boolean;
    stickyHeaderTop?: number;
}) => {
    shouldShowStickyGroupRow: boolean;
    stickyGroupIndex: number | null;
    stickyTop: number;
};

export interface TableScrollShadowSnapshot {
    showLeftShadow: boolean;
    showRightShadow: boolean;
    showTopShadow: boolean;
}
export type TableScrollShadowStore = ReturnType<typeof createTableScrollShadowStore>;
export declare function createTableScrollShadowStore(): {
    getSnapshot: () => TableScrollShadowSnapshot;
    setSnapshot: (patch: Partial<TableScrollShadowSnapshot>) => void;
    subscribe: (listener: () => void) => () => boolean;
};

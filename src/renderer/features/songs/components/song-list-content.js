import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useMemo } from 'react';
import { useListContext } from '/@/renderer/context/list-context';
import { ListFilters, ListFiltersTitle } from '/@/renderer/features/shared/components/list-filters';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { SaveAsCollectionButton } from '/@/renderer/features/shared/components/save-as-collection-button';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { useCurrentServer, useListSettings } from '/@/renderer/store';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType, ListPaginationType } from '/@/shared/types/types';
const SongListInfiniteGrid = lazy(() => import('/@/renderer/features/songs/components/song-list-infinite-grid').then((module) => ({
    default: module.SongListInfiniteGrid,
})));
const SongListPaginatedGrid = lazy(() => import('/@/renderer/features/songs/components/song-list-paginated-grid').then((module) => ({
    default: module.SongListPaginatedGrid,
})));
const SongListInfiniteTable = lazy(() => import('/@/renderer/features/songs/components/song-list-infinite-table').then((module) => ({
    default: module.SongListInfiniteTable,
})));
const SongListPaginatedTable = lazy(() => import('/@/renderer/features/songs/components/song-list-paginated-table').then((module) => ({
    default: module.SongListPaginatedTable,
})));
export const SongListContent = () => {
    return (_jsxs(_Fragment, { children: [_jsx(SongListFilters, {}), _jsx(SongListSuspenseContainer, {})] }));
};
const SongListFilters = () => {
    return (_jsx(ListWithSidebarContainer.SidebarPortal, { children: _jsxs(Stack, { h: "100%", style: { minHeight: 0 }, children: [_jsx(ListFiltersTitle, { itemType: LibraryItem.SONG }), _jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(ListFilters, { itemType: LibraryItem.SONG }) }), _jsx(Stack, { p: "sm", children: _jsx(SaveAsCollectionButton, { fullWidth: true, itemType: LibraryItem.SONG }) })] }) }));
};
const SongListSuspenseContainer = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.SONG);
    const { customFilters } = useListContext();
    return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(SongListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: customFilters, pagination: pagination, table: table }) }));
};
export const SongListView = ({ display, grid, itemsPerPage, overrideQuery, pagination, table, }) => {
    const server = useCurrentServer();
    const { pageKey } = useListContext();
    const { query } = useSongListFilters(pageKey);
    const mergedQuery = useMemo(() => {
        if (!overrideQuery) {
            return query;
        }
        return {
            ...query,
            ...overrideQuery,
            sortBy: overrideQuery.sortBy || query.sortBy,
            sortOrder: overrideQuery.sortOrder || query.sortOrder,
        };
    }, [query, overrideQuery]);
    switch (display) {
        case ListDisplayType.GRID: {
            switch (pagination) {
                case ListPaginationType.INFINITE:
                    return (_jsx(SongListInfiniteGrid, { gap: grid.itemGap, itemsPerPage: itemsPerPage, itemsPerRow: grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined, query: mergedQuery, serverId: server.id, size: grid.size }));
                case ListPaginationType.PAGINATED:
                    return (_jsx(SongListPaginatedGrid, { gap: grid.itemGap, itemsPerPage: itemsPerPage, itemsPerRow: grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined, query: mergedQuery, serverId: server.id, size: grid.size }));
                default:
                    return null;
            }
        }
        case ListDisplayType.TABLE: {
            switch (pagination) {
                case ListPaginationType.INFINITE:
                    return (_jsx(SongListInfiniteTable, { autoFitColumns: table.autoFitColumns, columns: table.columns, enableAlternateRowColors: table.enableAlternateRowColors, enableHeader: table.enableHeader, enableHorizontalBorders: table.enableHorizontalBorders, enableRowHoverHighlight: table.enableRowHoverHighlight, enableVerticalBorders: table.enableVerticalBorders, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id, size: table.size }));
                case ListPaginationType.PAGINATED:
                    return (_jsx(SongListPaginatedTable, { autoFitColumns: table.autoFitColumns, columns: table.columns, enableAlternateRowColors: table.enableAlternateRowColors, enableHeader: table.enableHeader, enableHorizontalBorders: table.enableHorizontalBorders, enableRowHoverHighlight: table.enableRowHoverHighlight, enableVerticalBorders: table.enableVerticalBorders, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id, size: table.size }));
                default:
                    return null;
            }
        }
    }
    return null;
};

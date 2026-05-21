import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { lazy, Suspense, useMemo } from 'react';
import { useListContext } from '/@/renderer/context/list-context';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { ListFilters, ListFiltersTitle } from '/@/renderer/features/shared/components/list-filters';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { SaveAsCollectionButton } from '/@/renderer/features/shared/components/save-as-collection-button';
import { useCurrentServer, useListSettings } from '/@/renderer/store';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType, ListPaginationType } from '/@/shared/types/types';
const AlbumListInfiniteGrid = lazy(() => import('/@/renderer/features/albums/components/album-list-infinite-grid').then((module) => ({
    default: module.AlbumListInfiniteGrid,
})));
const AlbumListPaginatedGrid = lazy(() => import('/@/renderer/features/albums/components/album-list-paginated-grid').then((module) => ({
    default: module.AlbumListPaginatedGrid,
})));
const AlbumListInfiniteTable = lazy(() => import('/@/renderer/features/albums/components/album-list-infinite-table').then((module) => ({
    default: module.AlbumListInfiniteTable,
})));
const AlbumListPaginatedTable = lazy(() => import('/@/renderer/features/albums/components/album-list-paginated-table').then((module) => ({
    default: module.AlbumListPaginatedTable,
})));
const AlbumListInfiniteDetail = lazy(() => import('/@/renderer/features/albums/components/album-list-infinite-detail').then((module) => ({
    default: module.AlbumListInfiniteDetail,
})));
const AlbumListPaginatedDetail = lazy(() => import('/@/renderer/features/albums/components/album-list-paginated-detail').then((module) => ({
    default: module.AlbumListPaginatedDetail,
})));
const AlbumListFilters = () => {
    return (_jsx(ListWithSidebarContainer.SidebarPortal, { children: _jsxs(Stack, { h: "100%", style: { minHeight: 0 }, children: [_jsx(ListFiltersTitle, { itemType: LibraryItem.ALBUM }), _jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(ListFilters, { itemType: LibraryItem.ALBUM }) }), _jsx(Stack, { p: "sm", children: _jsx(SaveAsCollectionButton, { fullWidth: true, itemType: LibraryItem.ALBUM }) })] }) }));
};
export const AlbumListContent = () => {
    return (_jsxs(_Fragment, { children: [_jsx(AlbumListFilters, {}), _jsx(AlbumListSuspenseContainer, {})] }));
};
const AlbumListSuspenseContainer = () => {
    const { detail, display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ALBUM);
    const { customFilters } = useListContext();
    return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(AlbumListView, { detail: detail, display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: customFilters, pagination: pagination, table: table }) }));
};
export const AlbumListView = ({ detail, display, grid, itemsPerPage, overrideQuery, pagination, table, }) => {
    const server = useCurrentServer();
    const { pageKey } = useListContext();
    const { query } = useAlbumListFilters(pageKey);
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
                case ListPaginationType.INFINITE: {
                    return (_jsx(AlbumListInfiniteGrid, { gap: grid.itemGap, itemsPerPage: itemsPerPage, itemsPerRow: grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined, query: mergedQuery, serverId: server.id, size: grid.size }));
                }
                case ListPaginationType.PAGINATED: {
                    return (_jsx(AlbumListPaginatedGrid, { gap: grid.itemGap, itemsPerPage: itemsPerPage, itemsPerRow: grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined, query: mergedQuery, serverId: server.id, size: grid.size }));
                }
                default:
                    return null;
            }
        }
        case ListDisplayType.TABLE: {
            switch (pagination) {
                case ListPaginationType.INFINITE: {
                    return (_jsx(AlbumListInfiniteTable, { autoFitColumns: table.autoFitColumns, columns: table.columns, enableAlternateRowColors: table.enableAlternateRowColors, enableHeader: table.enableHeader, enableHorizontalBorders: table.enableHorizontalBorders, enableRowHoverHighlight: table.enableRowHoverHighlight, enableVerticalBorders: table.enableVerticalBorders, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id, size: table.size }));
                }
                case ListPaginationType.PAGINATED: {
                    return (_jsx(AlbumListPaginatedTable, { autoFitColumns: table.autoFitColumns, columns: table.columns, enableAlternateRowColors: table.enableAlternateRowColors, enableHeader: table.enableHeader, enableHorizontalBorders: table.enableHorizontalBorders, enableRowHoverHighlight: table.enableRowHoverHighlight, enableVerticalBorders: table.enableVerticalBorders, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id, size: table.size }));
                }
                default:
                    return null;
            }
        }
        case ListDisplayType.DETAIL: {
            switch (pagination) {
                case ListPaginationType.INFINITE: {
                    return (_jsx(AlbumListInfiniteDetail, { enableHeader: detail?.enableHeader, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id }));
                }
                case ListPaginationType.PAGINATED: {
                    return (_jsx(AlbumListPaginatedDetail, { enableHeader: detail?.enableHeader, itemsPerPage: itemsPerPage, query: mergedQuery, serverId: server.id }));
                }
                default:
                    return null;
            }
        }
    }
    return null;
};

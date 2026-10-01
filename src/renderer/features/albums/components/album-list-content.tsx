import { lazy, Suspense, useMemo } from 'react';

import { useListContext } from '/@/renderer/context/list-context';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { GridPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { ItemListSettings, useCurrentServer, useListSettings } from '/@/renderer/store';
import { AlbumListQuery } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType, ListPaginationType } from '/@/shared/types/types';

const AlbumListInfiniteGrid = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-infinite-grid').then((module) => ({
        default: module.AlbumListInfiniteGrid,
    })),
);

const AlbumListPaginatedGrid = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-paginated-grid').then((module) => ({
        default: module.AlbumListPaginatedGrid,
    })),
);

const AlbumListInfiniteTable = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-infinite-table').then((module) => ({
        default: module.AlbumListInfiniteTable,
    })),
);

const AlbumListPaginatedTable = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-paginated-table').then((module) => ({
        default: module.AlbumListPaginatedTable,
    })),
);

const AlbumListInfiniteDetail = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-infinite-detail').then((module) => ({
        default: module.AlbumListInfiniteDetail,
    })),
);

const AlbumListPaginatedDetail = lazy(() =>
    import('/@/renderer/features/albums/components/album-list-paginated-detail').then((module) => ({
        default: module.AlbumListPaginatedDetail,
    })),
);

export const AlbumListContent = () => {
    return <AlbumListSuspenseContainer />;
};

const AlbumListSuspenseContainer = () => {
    const { detail, display, grid, itemsPerPage, pagination, table } = useListSettings(
        ItemListKey.ALBUM,
    );

    const { customFilters } = useListContext();

    return (
        <Suspense fallback={<GridPageSkeleton />}>
            <AlbumListView
                detail={detail}
                display={display}
                grid={grid}
                itemsPerPage={itemsPerPage}
                overrideQuery={customFilters}
                pagination={pagination}
                table={table}
            />
        </Suspense>
    );
};

export type OverrideAlbumListQuery = Omit<Partial<AlbumListQuery>, 'limit' | 'startIndex'>;

export const AlbumListView = ({
    detail,
    display,
    grid,
    itemsPerPage,
    overrideQuery,
    pagination,
    table,
}: ItemListSettings & {
    detail?: ItemListSettings['detail'];
    overrideQuery?: OverrideAlbumListQuery;
}) => {
    const server = useCurrentServer();
    const { pageKey } = useListContext();

    const { query } = useAlbumListFilters(pageKey as ItemListKey);

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
                    return (
                        <AlbumListInfiniteGrid
                            gap={grid.itemGap}
                            itemsPerPage={itemsPerPage}
                            itemsPerRow={grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined}
                            query={mergedQuery}
                            serverId={server.id}
                            size={grid.size}
                        />
                    );
                }
                case ListPaginationType.PAGINATED: {
                    return (
                        <AlbumListPaginatedGrid
                            gap={grid.itemGap}
                            itemsPerPage={itemsPerPage}
                            itemsPerRow={grid.itemsPerRowEnabled ? grid.itemsPerRow : undefined}
                            query={mergedQuery}
                            serverId={server.id}
                            size={grid.size}
                        />
                    );
                }
                default:
                    return null;
            }
        }
        case ListDisplayType.TABLE: {
            switch (pagination) {
                case ListPaginationType.INFINITE: {
                    return (
                        <AlbumListInfiniteTable
                            autoFitColumns={table.autoFitColumns}
                            columns={table.columns}
                            enableAlternateRowColors={table.enableAlternateRowColors}
                            enableHeader={table.enableHeader}
                            enableHorizontalBorders={table.enableHorizontalBorders}
                            enableRowHoverHighlight={table.enableRowHoverHighlight}
                            enableVerticalBorders={table.enableVerticalBorders}
                            itemsPerPage={itemsPerPage}
                            query={mergedQuery}
                            serverId={server.id}
                            size={table.size}
                        />
                    );
                }
                case ListPaginationType.PAGINATED: {
                    return (
                        <AlbumListPaginatedTable
                            autoFitColumns={table.autoFitColumns}
                            columns={table.columns}
                            enableAlternateRowColors={table.enableAlternateRowColors}
                            enableHeader={table.enableHeader}
                            enableHorizontalBorders={table.enableHorizontalBorders}
                            enableRowHoverHighlight={table.enableRowHoverHighlight}
                            enableVerticalBorders={table.enableVerticalBorders}
                            itemsPerPage={itemsPerPage}
                            query={mergedQuery}
                            serverId={server.id}
                            size={table.size}
                        />
                    );
                }
                default:
                    return null;
            }
        }
        case ListDisplayType.DETAIL: {
            switch (pagination) {
                case ListPaginationType.INFINITE: {
                    return (
                        <AlbumListInfiniteDetail
                            enableHeader={detail?.enableHeader}
                            itemsPerPage={itemsPerPage}
                            query={mergedQuery}
                            serverId={server.id}
                        />
                    );
                }
                case ListPaginationType.PAGINATED: {
                    return (
                        <AlbumListPaginatedDetail
                            enableHeader={detail?.enableHeader}
                            itemsPerPage={itemsPerPage}
                            query={mergedQuery}
                            serverId={server.id}
                        />
                    );
                }
                default:
                    return null;
            }
        }
    }

    return null;
};

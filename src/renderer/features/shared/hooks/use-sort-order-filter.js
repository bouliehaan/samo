import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useListFilterPersistence } from '/@/renderer/features/shared/hooks/use-list-filter-persistence';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { parseStringParam, setSearchParam } from '/@/renderer/utils/query-params';
import { runInUrlTransition } from '/@/renderer/utils/url-transition';
export const useSortOrderFilter = (defaultValue, listKey) => {
    const server = useCurrentServer();
    const { getFilter, setFilter } = useListFilterPersistence(server.id, listKey);
    const [searchParams, setSearchParams] = useSearchParams();
    const persisted = getFilter(FILTER_KEYS.SHARED.SORT_ORDER);
    const sortOrder = useMemo(() => {
        const value = parseStringParam(searchParams, FILTER_KEYS.SHARED.SORT_ORDER);
        return (value ?? persisted ?? defaultValue ?? undefined);
    }, [searchParams, persisted, defaultValue]);
    const handleSetSortOrder = (sortOrder) => {
        runInUrlTransition(() => {
            setSearchParams((prev) => {
                const newParams = setSearchParam(prev, FILTER_KEYS.SHARED.SORT_ORDER, sortOrder);
                return newParams;
            }, { replace: true });
            setFilter(FILTER_KEYS.SHARED.SORT_ORDER, sortOrder);
        });
    };
    return {
        setSortOrder: handleSetSortOrder,
        sortOrder,
    };
};

import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
const getPersistenceKey = (serverId) => {
    return `${serverId}-filters`;
};
export const useListFilterPersistence = (serverId, listKey) => {
    const [persistedFilters, setPersistedFilters] = useLocalStorage({
        defaultValue: {},
        key: getPersistenceKey(serverId),
    });
    const getFilter = (filterKey) => {
        return persistedFilters?.[listKey]?.[filterKey];
    };
    const setFilter = (filterKey, value) => {
        setPersistedFilters((prev) => ({
            ...prev,
            [listKey]: {
                ...prev[listKey],
                [filterKey]: value,
            },
        }));
    };
    return {
        getFilter,
        setFilter,
    };
};

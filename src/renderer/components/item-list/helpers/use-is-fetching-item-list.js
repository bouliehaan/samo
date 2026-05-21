import { useIsFetching } from '@tanstack/react-query';
import { queryKeys } from '/@/renderer/api/query-keys';
import { getListQueryKeyName } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { useCurrentServerId } from '/@/renderer/store';
export const useIsFetchingItemListCount = ({ itemType }) => {
    const serverId = useCurrentServerId();
    const isFetching = useIsFetching({
        queryKey: queryKeys[getListQueryKeyName(itemType)].count(serverId),
    });
    return isFetching > 0;
};
export const useIsFetchingItemList = ({ itemType }) => {
    const serverId = useCurrentServerId();
    const isFetching = useIsFetching({
        queryKey: queryKeys[getListQueryKeyName(itemType)].list(serverId),
    });
    return isFetching > 0;
};

import { getServerById } from '/@/renderer/store';
import { ServerType } from '/@/shared/types/domain-types';
export const getOptimizedListCount = async ({ client, listQueryFn, listQueryKeyFn, query, serverId, signal, }) => {
    const server = getServerById(serverId);
    if (server?.type !== ServerType.NAVIDROME && server?.type !== ServerType.JELLYFIN) {
        return null;
    }
    const limit = typeof query === 'object' &&
        query !== null &&
        'limit' in query &&
        typeof query.limit === 'number' &&
        query.limit > 0
        ? query.limit
        : 100;
    // In most cases, the list count is called when entering the first page, so we fetch from the first page
    // This optimization will only help in this case, otherwise we still need 2 requests to get both the count and the data
    const pageQuery = {
        ...query,
        limit,
        startIndex: 0,
    };
    const pageQueryKey = listQueryKeyFn(serverId, pageQuery);
    const cachedPage = client.getQueryData(pageQueryKey);
    if (cachedPage && typeof cachedPage === 'object' && 'totalRecordCount' in cachedPage) {
        return cachedPage.totalRecordCount ?? 0;
    }
    const pageResult = await listQueryFn({
        apiClientProps: { serverId, signal },
        query: pageQuery,
    });
    const keyContainsRandom = JSON.stringify(pageQueryKey).toLowerCase().includes('random');
    if (!keyContainsRandom) {
        client.setQueryData(pageQueryKey, pageResult);
    }
    return pageResult.totalRecordCount ?? 0;
};

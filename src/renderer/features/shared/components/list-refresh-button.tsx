import { useIsMutating } from '@tanstack/react-query';
import { useCallback } from 'react';

import { eventEmitter } from '/@/renderer/events/event-emitter';
import { RefreshButton } from '/@/renderer/features/shared/components/refresh-button';
import { ItemListKey } from '/@/shared/types/types';

interface ListRefreshButtonProps {
    disabled?: boolean;
    listKey: ItemListKey;
}

export const ListRefreshButton = ({ disabled, listKey }: ListRefreshButtonProps) => {
    const isRefreshing = useIsMutating({ mutationKey: getListRefreshMutationKey(listKey) }) > 0;

    const handleRefresh = useCallback(() => {
        eventEmitter.emit('ITEM_LIST_REFRESH', { key: listKey });
    }, [listKey]);

    return <RefreshButton disabled={disabled} loading={isRefreshing} onClick={handleRefresh} />;
};

/**
 * Tell every mounted list to reload from the server.
 *
 * The list loaders also watch the query cache and reload when their own queries
 * are invalidated, but react-query only announces an invalidation the FIRST
 * time — a query that is already marked invalidated, because an earlier refetch
 * never landed, is invalidated again in silence. That would leave a list that
 * failed to refresh once unable to hear about it again. This path does not
 * depend on that bookkeeping, so "sync with server" always means something.
 */
export const emitAllItemListRefresh = () => {
    for (const listKey of Object.values(ItemListKey)) {
        eventEmitter.emit('ITEM_LIST_REFRESH', { key: listKey });
    }
};

export const LIST_REFRESH_MUTATION_KEY = 'item-list-refresh';

export const getListRefreshMutationKey = (listKey: string) =>
    [LIST_REFRESH_MUTATION_KEY, listKey] as const;

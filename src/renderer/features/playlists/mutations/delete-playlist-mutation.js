import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { infiniteLoaderDataQueryKey } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { applyDeletePlaylistOptimisticUpdates, restorePlaylistQueryData, } from '/@/renderer/features/playlists/mutations/playlist-optimistic-updates';
import { LibraryItem, } from '/@/shared/types/domain-types';
export const useDeletePlaylist = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args) => {
            return api.controller.deletePlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onError: (_error, _variables, context) => {
            if (context) {
                restorePlaylistQueryData(queryClient, context);
            }
        },
        onMutate: (variables) => {
            queryClient.cancelQueries({
                queryKey: queryKeys.playlists.list(variables.apiClientProps.serverId),
            });
            return applyDeletePlaylistOptimisticUpdates(queryClient, variables);
        },
        ...options,
        onSuccess: (data, variables, context) => {
            const { serverId } = variables.apiClientProps;
            queryClient.invalidateQueries({
                exact: false,
                queryKey: queryKeys.playlists.root(serverId),
            });
            queryClient.invalidateQueries({
                exact: false,
                queryKey: infiniteLoaderDataQueryKey(serverId, LibraryItem.PLAYLIST),
            });
            options?.onSuccess?.(data, variables, context);
        },
    });
};

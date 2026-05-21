import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
export const useRemoveFromPlaylist = (options) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args) => {
            return api.controller.removeFromPlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables) => {
            const { apiClientProps } = variables;
            const serverId = apiClientProps.serverId;
            if (!serverId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.list(serverId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.detail(serverId, variables.query.id),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.songList(serverId, variables.query.id),
            });
        },
        ...options,
    });
};

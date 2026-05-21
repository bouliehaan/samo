import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
export const useUpdatePlaylistTracks = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args) => api.controller.setPlaylistSongs({
            ...args,
            apiClientProps: { serverId: args.apiClientProps.serverId },
        }),
        onSuccess: (_data, variables) => {
            const { apiClientProps, body } = variables;
            const serverId = apiClientProps.serverId;
            if (!serverId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.list(serverId),
            });
            if (body?.id) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.playlists.detail(serverId, body.id),
                });
                queryClient.invalidateQueries({
                    queryKey: queryKeys.playlists.songList(serverId, body.id),
                });
            }
        },
        ...options,
    });
};

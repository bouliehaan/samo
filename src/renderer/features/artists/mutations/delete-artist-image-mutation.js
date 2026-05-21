import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
export const useDeleteArtistImage = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args) => {
            return api.controller.deleteArtistImage({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables) => {
            const { apiClientProps, query } = variables;
            const serverId = apiClientProps.serverId;
            if (!serverId)
                return;
            queryClient.invalidateQueries({
                queryKey: queryKeys.albumArtists.list(serverId),
            });
            if (query?.id) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.detail(serverId, { id: query.id }),
                });
                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.info(serverId, { id: query.id }),
                });
            }
        },
        ...options,
    });
};

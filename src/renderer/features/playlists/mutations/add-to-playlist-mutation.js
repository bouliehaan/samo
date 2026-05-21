import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useRecentPlaylists } from '/@/renderer/features/playlists/hooks/use-recent-playlists';
import { useCurrentServerId } from '/@/renderer/store';
export const useAddToPlaylist = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    const serverId = useCurrentServerId();
    const { addRecentPlaylist } = useRecentPlaylists(serverId);
    return useMutation({
        mutationFn: (args) => {
            return api.controller.addToPlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables, context) => {
            const { apiClientProps } = variables;
            const serverId = apiClientProps.serverId;
            if (!serverId)
                return;
            queryClient.invalidateQueries({
                exact: false,
                queryKey: queryKeys.playlists.list(serverId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.detail(serverId, variables.query.id),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.playlists.songList(serverId, variables.query.id),
            });
            addRecentPlaylist(variables.query.id);
            options?.onSuccess?.(_data, variables, context);
        },
        ...options,
    });
};

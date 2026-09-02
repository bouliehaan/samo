import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { invalidatePlaylistQueries } from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { MutationOptions } from '/@/renderer/lib/react-query';
import { RemoveFromPlaylistArgs, RemoveFromPlaylistResponse } from '/@/shared/types/domain-types';

export const useRemoveFromPlaylist = (options?: MutationOptions) => {
    const queryClient = useQueryClient();

    return useMutation<RemoveFromPlaylistResponse, Error, RemoveFromPlaylistArgs, null>({
        mutationFn: (args) => {
            return api.controller.removeFromPlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables) => {
            const { apiClientProps } = variables;
            const serverId = apiClientProps.serverId;

            if (!serverId) return;

            invalidatePlaylistQueries(queryClient, serverId, variables.query.id);
        },
        ...options,
    });
};

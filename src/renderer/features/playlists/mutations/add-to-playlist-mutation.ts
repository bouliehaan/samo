import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { useRecentPlaylists } from '/@/renderer/features/playlists/hooks/use-recent-playlists';
import { invalidatePlaylistQueries } from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { useCurrentServerId } from '/@/renderer/store';
import { AddToPlaylistArgs, AddToPlaylistResponse } from '/@/shared/types/domain-types';

export const useAddToPlaylist = (args: MutationHookArgs) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    const serverId = useCurrentServerId();

    const { addRecentPlaylist } = useRecentPlaylists(serverId);

    return useMutation<AddToPlaylistResponse, Error, AddToPlaylistArgs, null>({
        mutationFn: (args) => {
            return api.controller.addToPlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables, context) => {
            const { apiClientProps } = variables;
            const serverId = apiClientProps.serverId;

            if (!serverId) return;

            invalidatePlaylistQueries(queryClient, serverId, variables.query.id);

            addRecentPlaylist(variables.query.id);

            options?.onSuccess?.(_data, variables, context);
        },
        ...options,
    });
};

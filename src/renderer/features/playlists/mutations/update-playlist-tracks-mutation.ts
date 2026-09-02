import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { invalidatePlaylistQueries } from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { SetPlaylistSongsArgs } from '/@/shared/types/domain-types';

export const useUpdatePlaylistTracks = (args: MutationHookArgs) => {
    const { options } = args || {};
    const queryClient = useQueryClient();

    return useMutation<null, Error, SetPlaylistSongsArgs, null>({
        mutationFn: (args) =>
            api.controller.setPlaylistSongs({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            }),
        onSuccess: (_data, variables) => {
            const { apiClientProps, body } = variables;
            const serverId = apiClientProps.serverId;

            if (!serverId) return;

            invalidatePlaylistQueries(queryClient, serverId, body?.id);
        },
        ...options,
    });
};

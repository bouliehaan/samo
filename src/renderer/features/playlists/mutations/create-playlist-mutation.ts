import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { invalidatePlaylistQueries } from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { CreatePlaylistArgs, CreatePlaylistResponse } from '/@/shared/types/domain-types';

export const useCreatePlaylist = (args: MutationHookArgs) => {
    const { options } = args || {};
    const queryClient = useQueryClient();

    return useMutation<CreatePlaylistResponse, Error, CreatePlaylistArgs, null>({
        mutationFn: (args) => {
            return api.controller.createPlaylist({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        ...options,
        onSuccess: (data, variables, context) => {
            const { serverId } = variables.apiClientProps;
            invalidatePlaylistQueries(queryClient, serverId);
            options?.onSuccess?.(data, variables, context);
        },
    });
};

import { queryOptions } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { MusicFolderListQuery } from '/@/shared/types/domain-types';

export const sharedQueries = {
    musicFolders: (args: QueryHookArgs<MusicFolderListQuery>) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getMusicFolderList({
                    apiClientProps: { serverId: args.serverId, signal },
                });
            },
            queryKey: queryKeys.musicFolders.list(args.serverId),
            ...args.options,
        });
    },
    roles: (args: QueryHookArgs<object>) => {
        return queryOptions({
            queryFn: ({ signal }) => {
                return api.controller.getRoles({
                    apiClientProps: { serverId: args.serverId, signal },
                });
            },
            queryKey: queryKeys.roles.list(args.serverId || ''),
            ...args.options,
        });
    },
};

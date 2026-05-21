import { queryOptions } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
export const radioQueries = {
    list: (args) => {
        return queryOptions({
            gcTime: 1000 * 60 * 60,
            queryFn: ({ signal }) => {
                return api.controller.getInternetRadioStations({
                    apiClientProps: { serverId: args.serverId, signal },
                });
            },
            queryKey: queryKeys.radio.list(args.serverId || ''),
            ...args.options,
        });
    },
};

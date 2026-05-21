import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
export const useDeleteRadioStation = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (args) => {
            return api.controller.deleteInternetRadioStation({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_args, variables) => {
            queryClient.invalidateQueries({
                exact: false,
                queryKey: queryKeys.radio.list(variables.apiClientProps.serverId),
            });
        },
        ...options,
    });
};

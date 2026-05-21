import { useMutation } from '@tanstack/react-query';
import { api } from '/@/renderer/api';
export const useShareItem = (args) => {
    const { options } = args || {};
    return useMutation({
        mutationFn: (args) => {
            return api.controller.shareItem({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        retry: false,
        ...options,
    });
};

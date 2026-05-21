import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { applyFavoriteOptimisticUpdates, restoreFavoriteQueryData, } from '/@/renderer/features/shared/mutations/favorite-optimistic-updates';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
const remote = isElectron() ? window.api.remote : null;
const deleteFavoriteMutationKey = ['set-favorite', false];
export const useDeleteFavorite = (args) => {
    const { options } = args || {};
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    return useMutation({
        mutationFn: (args) => {
            return api.controller.deleteFavorite({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        mutationKey: deleteFavoriteMutationKey,
        onError: (_error, _variables, context) => {
            if (context) {
                restoreFavoriteQueryData(queryClient, context);
            }
            toast.show({
                message: _error.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
                type: 'error',
            });
            eventEmitter.emit('USER_FAVORITE', {
                favorite: true,
                id: _variables.query.id,
                itemType: _variables.query.type,
                serverId: _variables.apiClientProps.serverId,
            });
        },
        onMutate: (variables) => {
            eventEmitter.emit('USER_FAVORITE', {
                favorite: false,
                id: variables.query.id,
                itemType: variables.query.type,
                serverId: variables.apiClientProps.serverId,
            });
            return applyFavoriteOptimisticUpdates(queryClient, variables, false);
        },
        onSuccess: (_data, variables) => {
            if (variables.query.type === LibraryItem.SONG) {
                remote?.updateFavorite(false, variables.apiClientProps.serverId, variables.query.id);
            }
            if (variables.query.type === LibraryItem.SONG ||
                variables.query.type === LibraryItem.PLAYLIST_SONG ||
                variables.query.type === LibraryItem.QUEUE_SONG) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.favoriteSongs(variables.apiClientProps.serverId),
                });
            }
        },
        ...options,
    });
};
export const useIsMutatingDeleteFavorite = () => {
    const mutatingCount = useIsMutating({ mutationKey: deleteFavoriteMutationKey });
    return mutatingCount > 0;
};

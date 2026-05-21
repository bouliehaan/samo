import { useCallback, useRef } from 'react';
import { useCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
export const useSetFavorite = () => {
    const createFavoriteMutation = useCreateFavorite({});
    const deleteFavoriteMutation = useDeleteFavorite({});
    const createFavoriteMutationRef = useRef(createFavoriteMutation);
    const deleteFavoriteMutationRef = useRef(deleteFavoriteMutation);
    createFavoriteMutationRef.current = createFavoriteMutation;
    deleteFavoriteMutationRef.current = deleteFavoriteMutation;
    const setFavorite = useCallback((serverId, id, itemType, isFavorite) => {
        if (isFavorite) {
            createFavoriteMutationRef.current.mutate({
                apiClientProps: { serverId },
                query: { id, type: itemType },
            });
        }
        else {
            deleteFavoriteMutationRef.current.mutate({
                apiClientProps: { serverId },
                query: { id, type: itemType },
            });
        }
    }, []);
    return setFavorite;
};

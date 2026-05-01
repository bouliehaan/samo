import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { useCurrentServerId } from '/@/renderer/store';
import { useLibraryFavoritesActions, useFavoritePlaylistIds } from '/@/renderer/store/library-favorites.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';

interface SetFavoriteActionProps {
    ids: string[];
    itemType: LibraryItem;
    items?: Array<{ id: string; userFavorite?: boolean }>;
}

export const SetFavoriteAction = ({ ids, itemType, items }: SetFavoriteActionProps) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const favoritePlaylistIds = useFavoritePlaylistIds(serverId);

    const createFavoriteMutation = useCreateFavorite({});
    const deleteFavoriteMutation = useDeleteFavorite({});
    const { toggle: toggleClientFavorite } = useLibraryFavoritesActions();

    const isFavorite = useMemo(() => {
        if (!items || items.length === 0) return false;

        if (itemType === LibraryItem.PLAYLIST) {
            return items.every((item) => favoritePlaylistIds.has(item.id));
        }

        return items.every((item) => item.userFavorite);
    }, [items, itemType, favoritePlaylistIds]);

    const handleAddToFavorites = useCallback(() => {
        if (ids.length === 0 || !serverId) return;

        if (itemType === LibraryItem.PLAYLIST) {
            ids.forEach((id) => toggleClientFavorite('playlist', serverId, id));
        } else {
            createFavoriteMutation.mutate({
                apiClientProps: { serverId },
                query: {
                    id: ids,
                    type: itemType,
                },
            });
        }
    }, [createFavoriteMutation, ids, itemType, serverId, toggleClientFavorite]);

    const handleRemoveFromFavorites = useCallback(() => {
        if (ids.length === 0 || !serverId) return;

        if (itemType === LibraryItem.PLAYLIST) {
            ids.forEach((id) => toggleClientFavorite('playlist', serverId, id));
        } else {
            deleteFavoriteMutation.mutate({
                apiClientProps: { serverId },
                query: {
                    id: ids,
                    type: itemType,
                },
            });
        }
    }, [deleteFavoriteMutation, ids, itemType, serverId, toggleClientFavorite]);

    return (
        <>
            {!isFavorite && (
                <ContextMenu.Item leftIcon="favorite" onSelect={handleAddToFavorites}>
                    {t('action.addToFavorites', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
            )}
            {isFavorite && (
                <ContextMenu.Item leftIcon="unfavorite" onSelect={handleRemoveFromFavorites}>
                    {t('action.removeFromFavorites', { postProcess: 'sentenceCase' })}
                </ContextMenu.Item>
            )}
        </>
    );
};

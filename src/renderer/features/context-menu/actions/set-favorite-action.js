import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { useCurrentServerId } from '/@/renderer/store';
import { useFavoritePlaylistIds, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
export const SetFavoriteAction = ({ ids, items, itemType }) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const favoritePlaylistIds = useFavoritePlaylistIds(serverId);
    const createFavoriteMutation = useCreateFavorite({});
    const deleteFavoriteMutation = useDeleteFavorite({});
    const { toggle: toggleClientFavorite } = useLibraryFavoritesActions();
    const isFavorite = useMemo(() => {
        if (!items || items.length === 0)
            return false;
        if (itemType === LibraryItem.PLAYLIST) {
            return items.every((item) => favoritePlaylistIds.has(item.id));
        }
        return items.every((item) => item.userFavorite);
    }, [items, itemType, favoritePlaylistIds]);
    const handleAddToFavorites = useCallback(() => {
        if (ids.length === 0 || !serverId)
            return;
        if (itemType === LibraryItem.PLAYLIST) {
            ids.forEach((id) => toggleClientFavorite('playlist', serverId, id));
        }
        else {
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
        if (ids.length === 0 || !serverId)
            return;
        if (itemType === LibraryItem.PLAYLIST) {
            ids.forEach((id) => toggleClientFavorite('playlist', serverId, id));
        }
        else {
            deleteFavoriteMutation.mutate({
                apiClientProps: { serverId },
                query: {
                    id: ids,
                    type: itemType,
                },
            });
        }
    }, [deleteFavoriteMutation, ids, itemType, serverId, toggleClientFavorite]);
    return (_jsxs(_Fragment, { children: [!isFavorite && (_jsx(ContextMenu.Item, { leftIcon: "favorite", onSelect: handleAddToFavorites, children: t('action.addToFavorites', { postProcess: 'sentenceCase' }) })), isFavorite && (_jsx(ContextMenu.Item, { leftIcon: "unfavorite", onSelect: handleRemoveFromFavorites, children: t('action.removeFromFavorites', { postProcess: 'sentenceCase' }) }))] }));
};

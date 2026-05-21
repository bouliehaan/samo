import { jsx as _jsx } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useDeletePlaylist } from '/@/renderer/features/playlists/mutations/delete-playlist-mutation';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServerId } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
export const DeletePlaylistAction = ({ disabled, items }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const serverId = useCurrentServerId();
    const deletePlaylistMutation = useDeletePlaylist({});
    const handleDeletePlaylist = useCallback(async () => {
        if (items.length === 0 || !serverId)
            return;
        try {
            await Promise.all(items.map((playlist) => deletePlaylistMutation.mutateAsync({
                apiClientProps: { serverId },
                query: { id: playlist.id },
            })));
            navigate(AppRoute.PLAYLISTS, { replace: true });
            toast.success({
                message: t('action.deletePlaylist', { postProcess: 'sentenceCase' }),
            });
        }
        catch (err) {
            toast.error({
                message: err.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
        closeAllModals();
    }, [deletePlaylistMutation, items, navigate, serverId, t]);
    const openDeletePlaylistModal = useCallback(() => {
        if (items.length === 0)
            return;
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: handleDeletePlaylist, children: _jsx(Text, { children: t('common.areYouSure', { postProcess: 'sentenceCase' }) }) })),
            title: t('form.deletePlaylist.title', { postProcess: 'sentenceCase' }),
        });
    }, [handleDeletePlaylist, items.length, t]);
    if (items.length === 0)
        return null;
    return (_jsx(ContextMenu.Item, { disabled: disabled, leftIcon: "remove", onSelect: openDeletePlaylistModal, children: t('action.deletePlaylist', { postProcess: 'sentenceCase' }) }));
};

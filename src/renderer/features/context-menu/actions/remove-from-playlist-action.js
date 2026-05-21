import { jsx as _jsx } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { useRemoveFromPlaylist } from '/@/renderer/features/playlists/mutations/remove-from-playlist-mutation';
import { useCurrentServerId } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
export const RemoveFromPlaylistAction = ({ items }) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const { playlistId } = useParams();
    const removeFromPlaylistMutation = useRemoveFromPlaylist();
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.playlistItemId).filter((id) => id !== undefined);
        return { ids };
    }, [items]);
    const handleRemoveFromPlaylist = useCallback(async () => {
        if (ids.length === 0 || !serverId || !playlistId)
            return;
        try {
            await removeFromPlaylistMutation.mutateAsync({
                apiClientProps: { serverId },
                query: {
                    id: playlistId,
                    songId: ids,
                },
            });
            toast.success({
                message: t('action.removeFromPlaylist', { postProcess: 'sentenceCase' }),
            });
        }
        catch (err) {
            toast.error({
                message: err.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
        closeAllModals();
    }, [ids, playlistId, removeFromPlaylistMutation, serverId, t]);
    const openRemoveFromPlaylistModal = useCallback(() => {
        if (ids.length === 0 || !playlistId)
            return;
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: handleRemoveFromPlaylist, children: _jsx(Text, { children: t('common.areYouSure', { postProcess: 'sentenceCase' }) }) })),
            title: t('action.removeFromPlaylist', { postProcess: 'sentenceCase' }),
        });
    }, [handleRemoveFromPlaylist, ids, playlistId, t]);
    if (ids.length === 0 || !playlistId)
        return null;
    return (_jsx(ContextMenu.Item, { leftIcon: "remove", onSelect: openRemoveFromPlaylistModal, children: t('action.removeFromPlaylist', { postProcess: 'sentenceCase' }) }));
};

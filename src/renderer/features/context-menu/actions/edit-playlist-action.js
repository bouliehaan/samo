import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { openUpdatePlaylistModal } from '/@/renderer/features/playlists/components/update-playlist-modal';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const EditPlaylistAction = ({ disabled, items }) => {
    const { t } = useTranslation();
    const handleEditPlaylist = useCallback(async () => {
        if (items.length === 0)
            return;
        const playlist = items[0];
        openUpdatePlaylistModal({
            playlist,
        });
    }, [items]);
    if (items.length === 0 || items.length > 1)
        return null;
    return (_jsx(ContextMenu.Item, { disabled: disabled, leftIcon: "edit", onSelect: handleEditPlaylist, children: t('action.editPlaylist', { postProcess: 'sentenceCase' }) }));
};

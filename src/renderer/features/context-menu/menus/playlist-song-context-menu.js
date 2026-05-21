import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayTrackRadioAction } from '/@/renderer/features/context-menu/actions/play-track-radio-action';
import { RemoveFromPlaylistAction } from '/@/renderer/features/context-menu/actions/remove-from-playlist-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { SetRatingAction } from '/@/renderer/features/context-menu/actions/set-rating-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ShowInFileExplorerAction } from '/@/renderer/features/context-menu/actions/show-in-file-explorer-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
export const PlaylistSongContextMenu = ({ items, type }) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);
    return (_jsxs(ContextMenu.Content, { bottomStickyContent: _jsx(ContextMenuPreview, { items: items, itemType: type }), children: [_jsx(PlayAction, { ids: ids, itemType: type, songs: items }), _jsx(PlayTrackRadioAction, { disabled: items.length > 1, song: items[0] }), _jsx(ContextMenu.Divider, {}), _jsx(RemoveFromPlaylistAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(AddToPlaylistAction, { items: ids, itemType: type }), _jsx(ContextMenu.Divider, {}), _jsx(SetFavoriteAction, { ids: ids, items: items, itemType: type }), _jsx(SetRatingAction, { ids: ids, itemType: type }), _jsx(ContextMenu.Divider, {}), _jsx(DownloadAction, { ids: ids }), _jsx(ShareAction, { ids: ids, itemType: type }), _jsx(ContextMenu.Divider, {}), _jsx(GoToAction, { items: items }), _jsx(ShowInFileExplorerAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(GetInfoAction, { disabled: items.length === 0, items: items })] }));
};

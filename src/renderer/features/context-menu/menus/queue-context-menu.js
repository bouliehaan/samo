import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { MoveQueueItemsAction } from '/@/renderer/features/context-menu/actions/move-queue-items-action';
import { PlayTrackRadioAction } from '/@/renderer/features/context-menu/actions/play-track-radio-action';
import { RemoveFromQueueAction } from '/@/renderer/features/context-menu/actions/remove-from-queue-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { SetRatingAction } from '/@/renderer/features/context-menu/actions/set-rating-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ShowInFileExplorerAction } from '/@/renderer/features/context-menu/actions/show-in-file-explorer-action';
import { ShuffleItemsAction } from '/@/renderer/features/context-menu/actions/shuffle-items-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
export const QueueContextMenu = ({ items }) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);
    return (_jsxs(ContextMenu.Content, { bottomStickyContent: _jsx(ContextMenuPreview, { items: items, itemType: LibraryItem.SONG }), children: [_jsx(RemoveFromQueueAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(MoveQueueItemsAction, { items: items }), _jsx(ShuffleItemsAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(PlayTrackRadioAction, { disabled: items.length > 1, song: items[0] }), _jsx(ContextMenu.Divider, {}), _jsx(AddToPlaylistAction, { items: ids, itemType: LibraryItem.SONG }), _jsx(ContextMenu.Divider, {}), _jsx(SetFavoriteAction, { ids: ids, itemType: LibraryItem.SONG }), _jsx(SetRatingAction, { ids: ids, itemType: LibraryItem.SONG }), _jsx(ContextMenu.Divider, {}), _jsx(DownloadAction, { ids: ids }), _jsx(ShareAction, { ids: ids, itemType: LibraryItem.SONG }), _jsx(ContextMenu.Divider, {}), _jsx(GoToAction, { items: items }), _jsx(ShowInFileExplorerAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(GetInfoAction, { disabled: items.length === 0, items: items })] }));
};

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
export const FolderContextMenu = ({ items, type }) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);
    return (_jsxs(ContextMenu.Content, { bottomStickyContent: _jsx(ContextMenuPreview, { items: items, itemType: type }), children: [_jsx(PlayAction, { ids: ids, itemType: LibraryItem.FOLDER }), _jsx(ContextMenu.Divider, {}), _jsx(AddToPlaylistAction, { items: ids, itemType: LibraryItem.FOLDER }), _jsx(ContextMenu.Divider, {}), _jsx(DownloadAction, { ids: ids }), _jsx(ShareAction, { ids: ids, itemType: LibraryItem.FOLDER })] }));
};

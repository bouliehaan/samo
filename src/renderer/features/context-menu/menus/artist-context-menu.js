import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayArtistRadioAction } from '/@/renderer/features/context-menu/actions/play-artist-radio-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { SetRatingAction } from '/@/renderer/features/context-menu/actions/set-rating-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { recordRecentArtist } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ArtistContextMenu = ({ items, type }) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);
    return (_jsxs(ContextMenu.Content, { bottomStickyContent: _jsx(ContextMenuPreview, { items: items, itemType: type }), children: [_jsx(PlayAction, { ids: ids, itemType: LibraryItem.ARTIST, onPlay: () => items.forEach((a) => recordRecentArtist(a)) }), _jsx(PlayArtistRadioAction, { artist: items[0], disabled: items.length > 1 }), _jsx(ContextMenu.Divider, {}), _jsx(AddToPlaylistAction, { items: ids, itemType: LibraryItem.ARTIST }), _jsx(ContextMenu.Divider, {}), _jsx(SetFavoriteAction, { ids: ids, items: items, itemType: LibraryItem.ARTIST }), _jsx(SetRatingAction, { ids: ids, itemType: LibraryItem.ARTIST }), _jsx(ContextMenu.Divider, {}), _jsx(DownloadAction, { ids: ids }), _jsx(ShareAction, { ids: ids, itemType: LibraryItem.ARTIST }), _jsx(ContextMenu.Divider, {}), _jsx(GoToAction, { items: items }), _jsx(ContextMenu.Divider, {}), _jsx(GetInfoAction, { disabled: items.length === 0, items: items })] }));
};

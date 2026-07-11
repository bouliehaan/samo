import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayAlbumRadioAction } from '/@/renderer/features/context-menu/actions/play-album-radio-action';
import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { SetRatingAction } from '/@/renderer/features/context-menu/actions/set-rating-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { recordRecentAlbum } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Album, LibraryItem } from '/@/shared/types/domain-types';

interface AlbumContextMenuProps {
    homeItemKey?: string;
    items: Album[];
    type: LibraryItem.ALBUM;
}

export const AlbumContextMenu = ({ homeItemKey, items, type }: AlbumContextMenuProps) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);

    return (
        <ContextMenu.Content
            bottomStickyContent={<ContextMenuPreview items={items} itemType={type} />}
        >
            <PlayAction
                allowShuffle={false}
                ids={ids}
                itemType={LibraryItem.ALBUM}
                onPlay={() => items.forEach(recordRecentAlbum)}
            />
            <PlayAlbumRadioAction album={items[0]} disabled={items.length > 1} />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.ALBUM} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} items={items} itemType={LibraryItem.ALBUM} />
            <SetRatingAction ids={ids} itemType={LibraryItem.ALBUM} />
            <ContextMenu.Divider />
            <DownloadAction ids={ids} />
            <ShareAction ids={ids} itemType={LibraryItem.ALBUM} />
            <ContextMenu.Divider />
            <GoToAction items={items} />
            <ContextMenu.Divider />
            <GetInfoAction disabled={items.length === 0} items={items} />
            {homeItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromHomeAction homeItemKey={homeItemKey} />
                </>
            ) : null}
        </ContextMenu.Content>
    );
};

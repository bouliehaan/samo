import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayTrackRadioAction } from '/@/renderer/features/context-menu/actions/play-track-radio-action';
import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { RemoveFromRecentsAction } from '/@/renderer/features/context-menu/actions/remove-from-recents-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { SetRatingAction } from '/@/renderer/features/context-menu/actions/set-rating-action';
import { ShareAction } from '/@/renderer/features/context-menu/actions/share-action';
import { ShowInFileExplorerAction } from '/@/renderer/features/context-menu/actions/show-in-file-explorer-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem, Song } from '/@/shared/types/domain-types';

interface SongContextMenuProps {
    homeItemKey?: string;
    items: Song[];
    recentItemKey?: string;
    type: LibraryItem.SONG;
}

export const SongContextMenu = ({
    homeItemKey,
    items,
    recentItemKey,
    type,
}: SongContextMenuProps) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);

    return (
        <ContextMenu.Content
            bottomStickyContent={<ContextMenuPreview items={items} itemType={type} />}
        >
            <PlayAction allowShuffle={false} ids={ids} itemType={LibraryItem.SONG} songs={items} />
            <PlayTrackRadioAction disabled={items.length > 1} song={items[0]} />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.SONG} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} items={items} itemType={LibraryItem.SONG} />
            <SetRatingAction ids={ids} itemType={LibraryItem.SONG} />
            <ContextMenu.Divider />
            <DownloadAction ids={ids} />
            <ShareAction ids={ids} itemType={LibraryItem.SONG} />
            <ContextMenu.Divider />
            <GoToAction items={items} />
            <ShowInFileExplorerAction items={items} />
            <ContextMenu.Divider />
            <GetInfoAction disabled={items.length === 0} items={items} />
            {recentItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromRecentsAction recentItemKey={recentItemKey} />
                </>
            ) : null}
            {homeItemKey ? (
                <>
                    <ContextMenu.Divider />
                    <RemoveFromHomeAction homeItemKey={homeItemKey} />
                </>
            ) : null}
        </ContextMenu.Content>
    );
};

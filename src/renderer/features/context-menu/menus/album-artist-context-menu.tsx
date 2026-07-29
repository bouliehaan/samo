import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayArtistRadioAction } from '/@/renderer/features/context-menu/actions/play-artist-radio-action';
import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { recordRecentArtist } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { AlbumArtist, LibraryItem } from '/@/shared/types/domain-types';

interface AlbumArtistContextMenuProps {
    homeItemKey?: string;
    items: AlbumArtist[];
    type: LibraryItem.ALBUM_ARTIST;
}

export const AlbumArtistContextMenu = ({
    homeItemKey,
    items,
    type,
}: AlbumArtistContextMenuProps) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);

    return (
        <ContextMenu.Content
            bottomStickyContent={<ContextMenuPreview items={items} itemType={type} />}
        >
            <PlayAction
                ids={ids}
                itemType={LibraryItem.ALBUM_ARTIST}
                onPlay={() => items.forEach((a) => recordRecentArtist(a))}
            />
            <PlayArtistRadioAction artist={items[0]} disabled={items.length > 1} />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.ALBUM_ARTIST} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} itemType={LibraryItem.ALBUM_ARTIST} />
            <ContextMenu.Divider />
            <DownloadAction ids={ids} />
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

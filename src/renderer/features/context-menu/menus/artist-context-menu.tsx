import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { AddToQueueAction } from '/@/renderer/features/context-menu/actions/add-to-queue-action';
import { DownloadAction } from '/@/renderer/features/context-menu/actions/download-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { GoToAction } from '/@/renderer/features/context-menu/actions/go-to-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayArtistRadioAction } from '/@/renderer/features/context-menu/actions/play-artist-radio-action';
import { PlayOnSamoRadioAction } from '/@/renderer/features/context-menu/actions/play-on-samo-radio-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { recordRecentArtist } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { AlbumArtist, Artist, LibraryItem } from '/@/shared/types/domain-types';

interface ArtistContextMenuProps {
    items: Artist[];
    type: LibraryItem.ARTIST;
}

export const ArtistContextMenu = ({ items, type }: ArtistContextMenuProps) => {
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
                itemType={LibraryItem.ARTIST}
                onPlay={() => items.forEach((a) => recordRecentArtist(a as unknown as AlbumArtist))}
            />
            <AddToQueueAction ids={ids} itemType={LibraryItem.ARTIST} />
            <PlayArtistRadioAction artist={items[0]} disabled={items.length > 1} />
            <PlayOnSamoRadioAction ids={ids} itemType={LibraryItem.ARTIST} />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.ARTIST} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} items={items} itemType={LibraryItem.ARTIST} />
            <ContextMenu.Divider />
            <DownloadAction ids={ids} />
            <ContextMenu.Divider />
            <GoToAction items={items} />
            <ContextMenu.Divider />
            <GetInfoAction disabled={items.length === 0} items={items} />
        </ContextMenu.Content>
    );
};

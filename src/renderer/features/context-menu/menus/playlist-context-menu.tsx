import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DeletePlaylistAction } from '/@/renderer/features/context-menu/actions/delete-playlist-action';
import { EditPlaylistAction } from '/@/renderer/features/context-menu/actions/edit-playlist-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { PlayOnSamoRadioAction } from '/@/renderer/features/context-menu/actions/play-on-samo-radio-action';
import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { useCanModifyPlaylists } from '/@/renderer/features/playlists/hooks/use-playlist-permissions';
import { recordRecentPlaylist } from '/@/renderer/store/play-history.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem, Playlist } from '/@/shared/types/domain-types';

interface PlaylistContextMenuProps {
    homeItemKey?: string;
    items: Playlist[];
    type: LibraryItem.PLAYLIST;
}

export const PlaylistContextMenu = ({ homeItemKey, items, type }: PlaylistContextMenuProps) => {
    const { ids } = useMemo(() => {
        const ids = items.map((item) => item.id);
        return { ids };
    }, [items]);

    const canModifyPlaylist = useCanModifyPlaylists(items);

    return (
        <ContextMenu.Content
            bottomStickyContent={<ContextMenuPreview items={items} itemType={type} />}
        >
            <PlayAction
                ids={ids}
                itemType={LibraryItem.PLAYLIST}
                onPlay={() => items.forEach(recordRecentPlaylist)}
            />
            <PlayOnSamoRadioAction ids={ids} itemType={LibraryItem.PLAYLIST} />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.PLAYLIST} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} items={items} itemType={LibraryItem.PLAYLIST} />
            <ContextMenu.Divider />
            <EditPlaylistAction disabled={!canModifyPlaylist} items={items} />
            <DeletePlaylistAction disabled={!canModifyPlaylist} items={items} />
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

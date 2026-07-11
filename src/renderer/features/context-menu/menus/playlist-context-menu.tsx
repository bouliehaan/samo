import { useMemo } from 'react';

import { AddToPlaylistAction } from '/@/renderer/features/context-menu/actions/add-to-playlist-action';
import { DeletePlaylistAction } from '/@/renderer/features/context-menu/actions/delete-playlist-action';
import { EditPlaylistAction } from '/@/renderer/features/context-menu/actions/edit-playlist-action';
import { GetInfoAction } from '/@/renderer/features/context-menu/actions/get-info-action';
import { PlayAction } from '/@/renderer/features/context-menu/actions/play-action';
import { RemoveFromHomeAction } from '/@/renderer/features/context-menu/actions/remove-from-home-action';
import { SetFavoriteAction } from '/@/renderer/features/context-menu/actions/set-favorite-action';
import { ContextMenuPreview } from '/@/renderer/features/context-menu/components/context-menu-preview';
import { usePermissions } from '/@/renderer/store';
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

    const { userId, ...permissions } = usePermissions();

    const canEditPublic = permissions.playlists.editPublic;

    const includesNonOwnedPublic = items.some((item) => item.public && item.ownerId !== userId);
    // Server-managed playlists (the Samo "Explore" queue) are re-derived by
    // the server every reconcile pass — edits/deletes are refused with a 403,
    // so don't offer them.
    const includesSystem = items.some((item) => item.isSystem);

    const canEditPlaylist = !includesSystem && (canEditPublic || !includesNonOwnedPublic);
    const canDeletePlaylist = !includesSystem && (canEditPublic || !includesNonOwnedPublic);

    return (
        <ContextMenu.Content
            bottomStickyContent={<ContextMenuPreview items={items} itemType={type} />}
        >
            <PlayAction
                ids={ids}
                itemType={LibraryItem.PLAYLIST}
                onPlay={() => items.forEach(recordRecentPlaylist)}
            />
            <ContextMenu.Divider />
            <AddToPlaylistAction items={ids} itemType={LibraryItem.PLAYLIST} />
            <ContextMenu.Divider />
            <SetFavoriteAction ids={ids} items={items} itemType={LibraryItem.PLAYLIST} />
            <ContextMenu.Divider />
            <EditPlaylistAction disabled={!canEditPlaylist} items={items} />
            <DeletePlaylistAction disabled={!canDeletePlaylist} items={items} />
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

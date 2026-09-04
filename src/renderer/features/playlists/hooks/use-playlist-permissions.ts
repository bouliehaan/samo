import { usePermissions } from '/@/renderer/store';
import { Playlist } from '/@/shared/types/domain-types';

/**
 * Whether this client may write to every one of these playlists.
 *
 * Two rules, both of which have to hold. A public playlist somebody else owns
 * needs the editPublic permission. A server-managed playlist (the samo
 * "Explore" queue) is off limits to everyone: the server re-derives its name
 * and membership on every reconcile pass, so an edit could not stick — it
 * refuses with a 403 rather than accept a write it is about to revert.
 *
 * Note that a bootstrap-owned playlist — an m3u import, a migrated row — is
 * NOT system, and admins can write to it. Those two get conflated easily; only
 * the explo queue sets the flag.
 *
 * This lives in one place because it used to live in three, and two of them had
 * drifted: both playlist-detail headers were missing the system rule and kept
 * offering an "Edit Playlist" button whose only possible outcome was a 403.
 * Entries that are null/undefined (a detail query still in flight) are ignored,
 * so a surface gets its answer once the data arrives rather than a flicker.
 */
export const useCanModifyPlaylists = (playlists: Array<null | Playlist | undefined>): boolean => {
    const { userId, ...permissions } = usePermissions();

    const items = playlists.filter((playlist): playlist is Playlist => Boolean(playlist));
    const includesSystem = items.some((item) => item.isSystem);
    const includesNonOwnedPublic = items.some((item) => item.public && item.ownerId !== userId);

    return !includesSystem && (permissions.playlists.editPublic || !includesNonOwnedPublic);
};

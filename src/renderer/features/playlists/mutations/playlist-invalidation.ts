import { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '/@/renderer/api/query-keys';
import { infiniteLoaderDataQueryKey } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { LibraryItem } from '/@/shared/types/domain-types';

/**
 * Forget every cached read that a playlist edit can have changed.
 *
 * This exists because the four playlist mutations each carried their own
 * hand-written list of keys, and the lists disagreed. `createPlaylist`
 * invalidated the infinite-loader entry — the one the playlist grid and table
 * pages actually render from — while `addToPlaylist`, `removeFromPlaylist` and
 * `setPlaylistSongs` did not, so a playlist's track count and duration stayed
 * at their pre-edit values on those pages. Nobody wrote the wrong list; the
 * infinite loader arrived after three of the four were written, and only one
 * got updated. A list maintained in four places will diverge again, so there
 * is one now.
 *
 * `playlists.root` covers detail, songList, list and count in a single prefix
 * — every playlist key is built under it — which also means a key added later
 * is covered here for free.
 */
export const invalidatePlaylistQueries = (
    queryClient: QueryClient,
    serverId: string | undefined,
    playlistId?: string,
): void => {
    if (!serverId) return;

    queryClient.invalidateQueries({
        exact: false,
        queryKey: queryKeys.playlists.root(serverId),
    });

    // Item-list pages keep their rows in a separate loader entry keyed by
    // library item type, outside the `playlists` namespace entirely.
    queryClient.invalidateQueries({
        exact: false,
        queryKey: infiniteLoaderDataQueryKey(serverId, LibraryItem.PLAYLIST),
    });

    if (playlistId) {
        queryClient.invalidateQueries({
            exact: false,
            queryKey: infiniteLoaderDataQueryKey(serverId, LibraryItem.PLAYLIST_SONG),
        });
    }
};

/**
 * Forget every cached read of the music library itself.
 *
 * Used by the paths that put a NEW track into the library rather than moving an
 * existing one around — today that is "keep in library", which copies a track
 * out of the Explore drop folder. The copy lands in an album, under an artist,
 * in the song list, and in the counts on all three; the ids of those containers
 * are not known here, and the server is the only thing that knows what the scan
 * produced, so the honest scope is the library roots rather than a guess at
 * which rows moved.
 */
export const invalidateLibraryQueries = (
    queryClient: QueryClient,
    serverId: string | undefined,
): void => {
    if (!serverId) return;

    for (const root of [
        queryKeys.albums.root(serverId),
        queryKeys.albumArtists.root(serverId),
        queryKeys.artists.root(serverId),
        queryKeys.songs.root(serverId),
    ]) {
        queryClient.invalidateQueries({ exact: false, queryKey: root });
    }

    for (const item of [LibraryItem.ALBUM, LibraryItem.ALBUM_ARTIST, LibraryItem.SONG]) {
        queryClient.invalidateQueries({
            exact: false,
            queryKey: infiniteLoaderDataQueryKey(serverId, item),
        });
    }
};

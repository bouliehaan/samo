import { patchSamoPlayback } from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { queryClient } from '/@/renderer/lib/react-query';
import { getServerById } from '/@/renderer/store';
import { Playlist } from '/@/shared/types/domain-types';

export const touchSamoPlaylistLastPlayed = (playlist: Playlist): void => {
    if (!playlist._serverId) {
        return;
    }

    const server = getServerById(playlist._serverId);
    if (!server) {
        return;
    }

    void patchSamoPlayback(samoFetch, server, 'music-playlist', playlist.id, {
        touchLastPlayedAt: true,
    })
        .then(() => {
            queryClient.invalidateQueries({ queryKey: ['home', 'playlists'] });
        })
        .catch(() => {
            // Best-effort; local play history still drives home sort.
        });
};

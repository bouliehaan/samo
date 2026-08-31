import { useCallback } from 'react';

import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCurrentServerId } from '/@/renderer/store';
import { LibraryItem, Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

export interface QueuePlayProps {
    /** Album and single-song menus hide the shuffled variants — one track has no order to shuffle. */
    allowShuffle?: boolean;
    ids: string[];
    itemType: LibraryItem;
    onPlay?: () => void;
    songs?: Song[];
}

/**
 * Shared by the Play and Add-to-queue menus: song-shaped items are already loaded so
 * they go straight into the queue, everything else is fetched by id first.
 */
export const useQueuePlay = ({ ids, itemType, onPlay, songs }: QueuePlayProps) => {
    const player = usePlayer();
    const serverId = useCurrentServerId();

    return useCallback(
        (playType: Play) => {
            if (ids.length === 0 || !serverId) return;

            onPlay?.();

            if (
                itemType === LibraryItem.SONG ||
                itemType === LibraryItem.PLAYLIST_SONG ||
                itemType === LibraryItem.QUEUE_SONG
            ) {
                player.addToQueueByData(songs || [], playType);
            } else {
                player.addToQueueByFetch(serverId, ids, itemType, playType);
            }
        },
        [ids, itemType, onPlay, player, serverId, songs],
    );
};

import isElectron from 'is-electron';
import { useEffect } from 'react';

import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    isDesktopCastConnected,
    loadDesktopCastMedia,
} from '/@/renderer/services/chromecast/desktop-cast-service';
import {
    usePlaybackSettings,
    usePlaybackSource,
    usePlayerSong,
    usePlayerStatus,
} from '/@/renderer/store';
import { useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { LibraryItem } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

/**
 * When a Chromecast session is active, mirror the current music queue item to the
 * TV and keep local playback paused.
 */
export function useCastPlaybackSync(): void {
    const currentSong = usePlayerSong();
    const { transcode } = usePlaybackSettings();
    const playbackSource = usePlaybackSource();
    const status = usePlayerStatus();
    const player = usePlayer();
    const mediaPause = player?.mediaPause;
    const artworkUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        serverId: currentSong?._serverId,
        type: 'fullScreenPlayer',
    });

    useEffect(() => {
        if (!isElectron() || (playbackSource !== 'music' && playbackSource !== null)) {
            return;
        }
        if (!isDesktopCastConnected() || !currentSong) {
            return;
        }

        const positionMs = useTimestampStoreBase.getState().timestamp * 1000;

        if (status === PlayerStatus.PLAYING && mediaPause) {
            mediaPause();
        }

        void loadDesktopCastMedia({
            artworkUrl,
            positionMs,
            song: currentSong,
            transcode,
        }).catch(() => undefined);
    }, [
        artworkUrl,
        currentSong?._uniqueId,
        mediaPause,
        playbackSource,
        status,
        transcode.bitrate,
        transcode.enabled,
        transcode.format,
    ]);
}

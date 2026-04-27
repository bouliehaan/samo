import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import {
    useRadioPlayer,
    useRadioStore,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import {
    usePlaybackOwnerStore,
    usePlaybackSource,
    type PlaybackSource,
} from '/@/renderer/store/playback-owner.store';
import { usePlayerSong, usePlayerStoreBase } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';

export type NowPlaying = {
    // Absolute URL suitable for MediaMetadata artwork / MPRIS. Undefined when not available.
    artwork: string | undefined;
    artist: string;
    canSeek: boolean;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
    source: PlaybackSource | null;
    // Album for music, station name for radio, chapter title for audiobook.
    subtitle: string;
    title: string;
};

// Reads current now-playing state directly from store snapshots.
// Safe to call outside React (Zustand subscriptions, event handlers).
export function getNowPlayingSnapshot(): NowPlaying {
    const source = usePlaybackOwnerStore.getState().source;

    if (source === 'radio') {
        const radio = useRadioStore.getState();
        return {
            artwork: undefined,
            artist: radio.metadata?.artist || radio.stationName || '',
            canSeek: false,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'radio',
            subtitle: radio.stationName || '',
            title: radio.metadata?.title || radio.stationName || 'Radio',
        };
    }

    // 'audiobook' and 'podcast' will be handled here in Phase 2.
    // For now they fall through to the music path, which returns empty metadata
    // until their stores are wired in.

    const song = usePlayerStoreBase.getState().getCurrentSong();
    const artwork = song
        ? getItemImageUrl({
              id: song.imageId || undefined,
              imageUrl: song.imageUrl,
              itemType: LibraryItem.SONG,
              type: 'itemCard',
          })
        : undefined;

    return {
        artwork,
        artist: song?.artistName ?? '',
        canSeek: true,
        canSkipNext: true,
        canSkipPrevious: true,
        source: source ?? 'music',
        subtitle: song?.album ?? '',
        title: song?.name ?? '',
    };
}

// React hook — subscribes to state and re-renders on change.
export function useNowPlaying(): NowPlaying {
    const source = usePlaybackSource();
    const song = usePlayerSong();
    const { isPlaying: isRadioPlaying, metadata: radioMetadata, stationName } = useRadioPlayer();

    if (source === 'radio' && isRadioPlaying) {
        return {
            artwork: undefined,
            artist: radioMetadata?.artist || stationName || '',
            canSeek: false,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'radio',
            subtitle: stationName || '',
            title: radioMetadata?.title || stationName || 'Radio',
        };
    }

    const artwork = song
        ? getItemImageUrl({
              id: song.imageId || undefined,
              imageUrl: song.imageUrl,
              itemType: LibraryItem.SONG,
              type: 'itemCard',
          })
        : undefined;

    return {
        artwork,
        artist: song?.artistName ?? '',
        canSeek: true,
        canSkipNext: true,
        canSkipPrevious: true,
        source: source ?? 'music',
        subtitle: song?.album ?? '',
        title: song?.name ?? '',
    };
}

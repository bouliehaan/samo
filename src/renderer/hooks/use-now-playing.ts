import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { useRadioPlayer, useRadioStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { usePlayerSong, usePlayerStoreBase } from '/@/renderer/store';
import {
    useAudiobookItem,
    useAudiobookServer,
    useAudiobookStore,
} from '/@/renderer/store/audiobook.store';
import {
    type PlaybackSource,
    usePlaybackOwnerStore,
    usePlaybackSource,
} from '/@/renderer/store/playback-owner.store';
import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { LibraryItem } from '/@/shared/types/domain-types';

export type NowPlaying = {
    artist: string;
    // Absolute URL suitable for MediaMetadata artwork / MPRIS. Undefined when not available.
    artwork: string | undefined;
    canSeek: boolean;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
    source: null | PlaybackSource;
    // Album for music, station name for radio, narrator/series for audiobook.
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
            artist: radio.metadata?.artist || radio.stationName || '',
            artwork: undefined,
            canSeek: false,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'radio',
            subtitle: radio.stationName || '',
            title: radio.metadata?.title || radio.stationName || 'Radio',
        };
    }

    if (source === 'audiobook') {
        const ab = useAudiobookStore.getState();
        const { item, server } = ab;
        return {
            artist: item ? audiobookAuthor(item) : '',
            artwork: item && server ? audiobookArtworkUrl(server, item) : undefined,
            canSeek: true,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'audiobook',
            subtitle: 'Audiobook',
            title: item ? audiobookTitle(item) : 'Audiobook',
        };
    }

    // 'podcast' falls through here in Phase 3.

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
        artist: song?.artistName ?? '',
        artwork,
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
    const audiobookItem = useAudiobookItem();
    const audiobookServer = useAudiobookServer();

    if (source === 'radio' && isRadioPlaying) {
        return {
            artist: radioMetadata?.artist || stationName || '',
            artwork: undefined,
            canSeek: false,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'radio',
            subtitle: stationName || '',
            title: radioMetadata?.title || stationName || 'Radio',
        };
    }

    if (source === 'audiobook' && audiobookItem) {
        return {
            artist: audiobookAuthor(audiobookItem),
            artwork:
                audiobookItem && audiobookServer
                    ? audiobookArtworkUrl(audiobookServer, audiobookItem)
                    : undefined,
            canSeek: true,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'audiobook',
            subtitle: 'Audiobook',
            title: audiobookTitle(audiobookItem),
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
        artist: song?.artistName ?? '',
        artwork,
        canSeek: true,
        canSkipNext: true,
        canSkipPrevious: true,
        source: source ?? 'music',
        subtitle: song?.album ?? '',
        title: song?.name ?? '',
    };
}

// Builds a direct cover URL for ABS items using the token query param.
// ABS supports /api/items/:id/cover?token=<token> for browser-side art fetching.
function audiobookArtworkUrl(
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
): string | undefined {
    if (!item.id || !server.url || !server.credential) return undefined;
    const base = server.url.replace(/\/+$/, '');
    return `${base}/api/items/${item.id}/cover?token=${encodeURIComponent(server.credential)}`;
}

function audiobookAuthor(item: AudiobookshelfLibraryItem): string {
    const meta = item.media?.metadata;

    return (
        meta?.authorName ||
        meta?.narratorName ||
        meta?.author ||
        meta?.authors?.map((a) => a.name).join(', ') ||
        ''
    );
}

function audiobookTitle(item: AudiobookshelfLibraryItem): string {
    return item.media?.metadata?.title || item.name || 'Untitled audiobook';
}

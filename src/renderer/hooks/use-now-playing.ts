import { getItemImageUrl } from '/@/renderer/components/item-image/item-image';
import {
    type RadioCurrentStationArt,
    useRadioPlayer,
    useRadioStore,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { getCurrentSong, usePlayerSong } from '/@/renderer/store';
import {
    getCurrentChapterIndex,
    useAudiobookChapters,
    useAudiobookDuration,
    useAudiobookItem,
    useAudiobookPosition,
    useAudiobookServer,
    useAudiobookStore,
} from '/@/renderer/store/audiobook.store';
import {
    type PlaybackSource,
    usePlaybackOwnerStore,
    usePlaybackSource,
} from '/@/renderer/store/playback-owner.store';
import {
    usePodcastEpisode,
    usePodcastItem,
    usePodcastServer,
    usePodcastStore,
} from '/@/renderer/store/podcast.store';
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
            artwork: radioArtworkUrl(radio.currentStationArt),
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
        const { chapters, duration, item, position, server } = ab;
        const chapterIndex = getCurrentChapterIndex(chapters, position, duration);
        const chapterTitle = chapterIndex >= 0 ? chapters[chapterIndex].title || '' : '';
        return {
            artist: item ? audiobookAuthor(item) : '',
            artwork: item && server ? audiobookArtworkUrl(server, item) : undefined,
            canSeek: true,
            canSkipNext: chapters.length > 0,
            canSkipPrevious: chapters.length > 0,
            source: 'audiobook',
            subtitle: chapterTitle || 'Audiobook',
            title: item ? audiobookTitle(item) : 'Audiobook',
        };
    }

    if (source === 'podcast') {
        const pc = usePodcastStore.getState();
        const { episode, item, server } = pc;
        return {
            // Show the podcast/show title as the artist line — it's what users
            // recognise (e.g. "The Daily") on the macOS Now Playing widget.
            artist: item ? podcastShowTitle(item) : '',
            artwork: item && server ? podcastArtworkUrl(server, item) : undefined,
            canSeek: true,
            // No queue UI yet → no episode-level skip controls.
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'podcast',
            subtitle: item ? podcastAuthor(item) : '',
            title: episode?.title || item?.name || 'Podcast',
        };
    }

    const song = getCurrentSong();
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
    const {
        currentStationArt,
        currentStreamUrl: radioStreamUrl,
        isPlaying: isRadioPlaying,
        metadata: radioMetadata,
        stationName,
    } = useRadioPlayer();
    const audiobookItem = useAudiobookItem();
    const audiobookPosition = useAudiobookPosition();
    const audiobookChapters = useAudiobookChapters();
    const audiobookDuration = useAudiobookDuration();
    const audiobookServer = useAudiobookServer();
    const podcastItem = usePodcastItem();
    const podcastEpisode = usePodcastEpisode();
    const podcastServer = usePodcastServer();

    if (source === 'radio' && (isRadioPlaying || radioStreamUrl || stationName)) {
        return {
            artist: radioMetadata?.artist || stationName || '',
            artwork: radioArtworkUrl(currentStationArt),
            canSeek: false,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'radio',
            subtitle: stationName || '',
            title: radioMetadata?.title || stationName || 'Radio',
        };
    }

    if (source === 'audiobook' && audiobookItem) {
        const chapterIndex = getCurrentChapterIndex(
            audiobookChapters,
            audiobookPosition,
            audiobookDuration,
        );
        const currentChapterTitle =
            chapterIndex >= 0 ? audiobookChapters[chapterIndex].title || '' : '';
        return {
            artist: audiobookAuthor(audiobookItem),
            artwork:
                audiobookItem && audiobookServer
                    ? audiobookArtworkUrl(audiobookServer, audiobookItem)
                    : undefined,
            canSeek: true,
            canSkipNext: audiobookChapters.length > 0,
            canSkipPrevious: audiobookChapters.length > 0,
            source: 'audiobook',
            subtitle: currentChapterTitle || 'Audiobook',
            title: audiobookTitle(audiobookItem),
        };
    }

    if (source === 'podcast' && podcastItem) {
        return {
            artist: podcastShowTitle(podcastItem),
            artwork: podcastServer ? podcastArtworkUrl(podcastServer, podcastItem) : undefined,
            canSeek: true,
            canSkipNext: false,
            canSkipPrevious: false,
            source: 'podcast',
            subtitle: podcastAuthor(podcastItem),
            title: podcastEpisode?.title || podcastItem.name || 'Podcast',
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

function podcastArtworkUrl(
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
): string | undefined {
    return item.media?.metadata?.imageUrl || audiobookArtworkUrl(server, item);
}

function podcastAuthor(item: AudiobookshelfLibraryItem): string {
    const meta = item.media?.metadata;
    return meta?.author || meta?.authorName || meta?.authors?.map((a) => a.name).join(', ') || '';
}

// Podcast show name (e.g. "The Daily"). Distinct from audiobookAuthor because
// for podcasts, what feels like "title" to a user is the episode, not the show.
function podcastShowTitle(item: AudiobookshelfLibraryItem): string {
    return item.media?.metadata?.title || item.name || 'Podcast';
}

function radioArtworkUrl(stationArt: null | RadioCurrentStationArt): string | undefined {
    if (!stationArt) return undefined;

    return getItemImageUrl({
        id: stationArt.imageId || undefined,
        imageUrl: stationArt.imageUrl,
        itemType: LibraryItem.RADIO_STATION,
        serverId: stationArt.serverId,
        type: 'fullScreenPlayer',
    });
}

import { buildAudioQualityBadgeItems, isHiResAudioQuality } from '@samo/core/audio-quality';
import {
    addMobileTracksToPlaylist,
    buildAudiobookshelfArtworkUrl,
    getMobileContentSource,
    loadMobileMediaDetail,
    loadSongRadioQueue,
    type MobileContentSource,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileHomeSection,
    MobileHomeSectionId,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
    MobileSearchItemType,
    type MobileSearchSection,
    MobileSearchSectionId,
} from '@samo/core/mobile';
import { SAMO_MOBILE_TABS, type SamoMobileTabId } from '@samo/core/navigation';
import { createPlaybackSession } from '@samo/core/playback';
import {
    removeServerAuthentication,
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
    supportsServerTypeOnAndroid,
    upsertServerAuthentication,
} from '@samo/core/server';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { getColors as getImageColors } from 'react-native-image-colors';
import type { ImageColorsResult } from 'react-native-image-colors/build/types';
import {
    Component,
    createContext,
    type ErrorInfo,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    AccessibilityInfo,
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    BackHandler,
    Dimensions,
    FlatList,
    type GestureResponderEvent,
    Image,
    type ImageSourcePropType,
    type ImageStyle,
    KeyboardAvoidingView,
    type LayoutChangeEvent,
    Modal,
    PanResponder,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
    type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

import heartIcon from './assets/icons/heart.png';
import hiResAudioBadge from '../../assets/icons/hi-res-audio-badge.png';
import shuffleIcon from './assets/icons/shuffle.png';
import sleepTimerIcon from './assets/icons/sleep-timer.png';
import samoLogo from './assets/samo-logo.png';
import {
    type AndroidAudioDeviceInfo,
    type AndroidNativePlaybackEvent,
    type AndroidPlaybackTruth,
    getAndroidAudioDeviceInfo,
    isAndroidNativePlaybackAvailable,
    pauseAndroidAudio,
    playAndroidAudio,
    resumeAndroidAudio,
    seekAndroidAudio,
    getAndroidPlaybackStatus,
    subscribeToAndroidAudioEvents,
    subscribeToAndroidNavigationRequests,
} from './src/services/audio-playback';
import {
    cancelDownload,
    type DownloadEntry,
    type DownloadStatus,
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
    getDownloadsRootUri,
    getLocalUriForTrack,
    getOfflineAudiobookFiles,
    getStorageLocation,
    listDownloads,
    type OfflineAudiobookFile,
    pickSdCardStorageLocation,
    removeDownload,
    resetStorageLocation,
    retryDownload,
    type StorageLocationPreference,
    subscribeDownloads,
    subscribeStorageLocation,
} from './src/services/download-manager';
import { triggerImpact } from './src/services/haptics';
import {
    type AndroidFullCollectionState,
    loadAndroidFullCollection,
} from './src/services/full-collection';
import { type AndroidHomeContentState, loadAndroidHomeContent } from './src/services/home-content';
import {
    loadCachedHomeContent,
    saveCachedHomeContent,
} from './src/services/home-content-cache';
import {
    loadCachedMediaDetail,
    saveCachedMediaDetail,
} from './src/services/media-detail-cache';
import {
    loadOfflineModePreference,
    saveOfflineModePreference,
} from './src/services/offline-mode';
import {
    type AndroidMediaDetailState,
    addAndroidMediaTrackToPlaylist,
    loadAndroidMediaDetail,
    loadAndroidMediaTrackPlayback,
} from './src/services/media-detail';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuthsWithMeta,
    savePersistedServerAuths,
} from './src/services/persisted-server';
import {
    type AndroidLocalFavoriteItem,
    getLocalFavoriteKey,
    loadLocalFavorites,
    saveLocalFavorites,
    toggleLocalFavorite,
} from './src/services/local-favorites';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    loadPersistedRecentContentItems,
    savePersistedRecentContentItems,
    upsertRecentContentItem,
} from './src/services/recent-content';
import {
    loadPersistedLastPlayedItem,
    savePersistedLastPlayedItem,
} from './src/services/last-played-item';
import { type AndroidSearchState, loadAndroidSearchResults } from './src/services/search-content';
import { type AndroidAuthState, authenticateServer } from './src/services/server-auth';
import {
    type AndroidServerHealthMap,
    checkAndroidServerConnections,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from './src/services/server-health';
import {
    type AbsProgressContext,
    flushPendingAbsProgress,
    initAbsProgressStore,
    loadAbsCurrentProgress,
    syncAbsProgressImmediate,
    syncAbsProgressThrottled,
} from './src/services/abs-progress';
import {
    starSubsonicAlbum,
    starSubsonicArtist,
    starSubsonicTrack,
    unstarSubsonicAlbum,
    unstarSubsonicArtist,
    unstarSubsonicTrack,
} from './src/services/media-favorites';
import { colors, spacing } from './src/theme/tokens';

const SERVER_TYPES = [ServerType.NAVIDROME, ServerType.SUBSONIC, ServerType.AUDIOBOOKSHELF].filter(
    supportsServerTypeOnAndroid,
);

const getTabTitle = (activeTab: SamoMobileTabId) => {
    return SAMO_MOBILE_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Samo';
};

const getContentItemKey = (item: { id: string; source?: { id: string }; type: string }) => {
    return `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
};

type DownloadedCollectionSummary = {
    collection: DownloadEntry['collection'];
    latestCompletedAt: number;
};

const isPlaybackHiRes = (playback?: MobilePlayableAudio | null): boolean =>
    Boolean(playback && isHiResAudioQuality(playback.quality));

const detailHasHiRes = (detail: MobileMediaDetail): boolean =>
    Boolean(detail.isHiRes || detail.tracks.some((track) => isPlaybackHiRes(track.playback)));

const isContentItemHiRes = (
    item?: null | { isHiRes?: boolean; playback?: MobilePlayableAudio },
): boolean => Boolean(item?.isHiRes || isPlaybackHiRes(item?.playback));

const getSourceFromSourceId = (
    sourceId: string,
    serverConnections: ServerAuthenticationResult[],
): MobileContentSource | undefined => {
    const connected = serverConnections.find(
        (connection) => getPersistedServerAuthKey(connection) === sourceId,
    );
    if (connected) {
        return getMobileContentSource(connected);
    }

    const separator = sourceId.indexOf(':');
    if (separator <= 0) {
        return undefined;
    }

    const type = sourceId.slice(0, separator) as ServerType;
    const url = sourceId.slice(separator + 1);
    if (!Object.values(ServerType).includes(type) || !url) {
        return undefined;
    }

    return {
        id: sourceId,
        title: url.replace(/^https?:\/\//i, ''),
        type,
        url,
    };
};

const buildOfflineHomeContentState = (
    downloadedCollections: DownloadedCollectionSummary[],
    serverConnections: ServerAuthenticationResult[],
): AndroidHomeContentState => {
    const sectionItems = new Map<MobileHomeSectionId, MobileHomeItem[]>();
    const sortedCollections = [...downloadedCollections].sort(
        (left, right) => right.latestCompletedAt - left.latestCompletedAt,
    );

    for (const { collection } of sortedCollections) {
        const source = getSourceFromSourceId(collection.sourceId, serverConnections);
        if (!source) {
            continue;
        }

        const itemType =
            collection.type === 'album'
                ? MobileHomeItemType.ALBUM
                : collection.type === 'playlist'
                  ? MobileHomeItemType.PLAYLIST
                  : collection.type === 'audiobook'
                    ? MobileHomeItemType.AUDIOBOOK
                    : MobileHomeItemType.PODCAST;
        const sectionId =
            collection.type === 'album'
                ? MobileHomeSectionId.RECENTLY_ADDED
                : collection.type === 'playlist'
                  ? MobileHomeSectionId.PLAYLISTS
                  : collection.type === 'audiobook'
                    ? MobileHomeSectionId.AUDIOBOOKS
                    : MobileHomeSectionId.PODCASTS;
        const items = sectionItems.get(sectionId) ?? [];
        items.push({
            artworkUrl: collection.artworkUrl,
            id: collection.id,
            source,
            subtitle: collection.subtitle,
            title: collection.title,
            type: itemType,
        });
        sectionItems.set(sectionId, items);
    }

    const sections: MobileHomeSection[] = [
        {
            id: MobileHomeSectionId.RECENTLY_ADDED,
            items: sectionItems.get(MobileHomeSectionId.RECENTLY_ADDED) ?? [],
            title: 'Downloaded Albums',
        },
        {
            id: MobileHomeSectionId.PLAYLISTS,
            items: sectionItems.get(MobileHomeSectionId.PLAYLISTS) ?? [],
            title: 'Downloaded Playlists',
        },
        {
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: sectionItems.get(MobileHomeSectionId.AUDIOBOOKS) ?? [],
            title: 'Downloaded Audiobooks',
        },
        {
            id: MobileHomeSectionId.PODCASTS,
            items: sectionItems.get(MobileHomeSectionId.PODCASTS) ?? [],
            title: 'Downloaded Podcasts',
        },
    ].filter((section) => section.items.length > 0);

    return {
        content: {
            errors: [],
            loadedAt: Date.now(),
            sections,
            serverTitle: 'Offline Downloads',
        },
        status: 'loaded',
    };
};

const buildDownloadedMusicDetail = async (
    item: AndroidRecentContentSourceItem,
): Promise<MobileMediaDetail | null> => {
    if (
        !item.source ||
        (item.type !== MobileHomeItemType.ALBUM && item.type !== MobileHomeItemType.PLAYLIST)
    ) {
        return null;
    }

    const entries = (await listDownloads())
        .filter(
            (entry) =>
                entry.status === 'completed' &&
                Boolean(entry.localUri) &&
                entry.collection.sourceId === item.source!.id &&
                entry.collection.id === item.id &&
                (entry.collection.type === 'album' || entry.collection.type === 'playlist'),
        )
        .sort((left, right) => left.enqueuedAt - right.enqueuedAt);

    if (entries.length === 0) {
        return null;
    }

    const tracks: MobileMediaTrack[] = entries.map((entry, index) => {
        const playback: MobilePlayableAudio = {
            artworkUrl: item.artworkUrl ?? entry.collection.artworkUrl,
            contentSourceId: item.source!.id,
            id: `${item.source!.id}:music:${entry.trackId}`,
            quality: {
                container: null,
                deliveryKind: 'android-direct',
                losslessRequired: true,
                serverTranscodeRequested: false,
            },
            source: 'music',
            subtitle: entry.trackSubtitle ?? item.title,
            title: entry.title,
            url: entry.localUri!,
        };

        return {
            artworkUrl: item.artworkUrl ?? entry.collection.artworkUrl,
            id: entry.trackId,
            playback,
            subtitle: entry.trackSubtitle ?? item.title,
            title: entry.title,
            trackNumber: index + 1,
        };
    });

    return {
        artworkUrl: item.artworkUrl,
        id: item.id,
        source: item.source,
        subtitle: item.subtitle,
        title: item.title,
        tracks,
        type:
            item.type === MobileHomeItemType.ALBUM
                ? MobileMediaDetailType.ALBUM
                : MobileMediaDetailType.PLAYLIST,
    };
};

/**
 * Artwork tile backed by expo-image so cover art behaves like a native app —
 * persistent across launches, instant on remount, and resilient to one-off
 * network failures.
 *
 * Why expo-image instead of RN's Image:
 *   - cachePolicy='memory-disk' keeps a per-process LRU AND a persistent
 *     disk cache, so navigating away from Home and back doesn't re-fetch
 *     every cover. The Samo metaphor is "I already saw this tile — it should
 *     reappear instantly", not "the renderer just spawned a fresh HTTP
 *     request".
 *   - transition=180 fades cached / decoded bitmaps in over ~3 frames so the
 *     surface doesn't pop. RN Image renders blank → image hard-cut, which
 *     reads as janky compared to native browsers / iOS / Spotify.
 *   - The native decoder is more forgiving of slow / flaky responses than
 *     RN's stock fetcher, which is the root of the "image was there, now
 *     it's gone" reports — RN's was timing out aggressively and not
 *     retrying. expo-image retries via its own pipeline and persists the
 *     decoded bitmap to disk so a flake on session N+1 doesn't matter.
 *
 * The letter-glyph fallback still fires when the URL is genuinely missing
 * (no source-side cover art at all) — onError catches the case where every
 * retry was exhausted, not just the first failure.
 */
const ArtworkImage = ({
    fallbackStyle,
    letter,
    style,
    uri,
}: {
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
    style: StyleProp<ImageStyle>;
    uri?: string;
}) => {
    const [errored, setErrored] = useState(false);
    useEffect(() => {
        setErrored(false);
    }, [uri]);
    if (!uri || errored) {
        return (
            <View
                style={[
                    style as StyleProp<ViewStyle>,
                    styles.artworkImageFallback,
                    fallbackStyle,
                ]}
            >
                <Text style={styles.mediaArtworkLetter}>{letter}</Text>
            </View>
        );
    }
    return (
        <ExpoImage
            cachePolicy="memory-disk"
            onError={() => setErrored(true)}
            source={uri}
            style={style as StyleProp<ImageStyle>}
            transition={180}
        />
    );
};

interface AddServerScreenProps {
    authState: AndroidAuthState;
    canConnect: boolean;
    onBack: () => void;
    onConnect: () => void;
    onPasswordChange: (value: string) => void;
    onServerTypeChange: (value: ServerType) => void;
    onServerUrlChange: (value: string) => void;
    onUsernameChange: (value: string) => void;
    password: string;
    serverType: ServerType;
    serverUrl: string;
    username: string;
}

type AndroidPlaybackState =
    | {
          bitPerfect?: AndroidPlaybackTruth;
          deviceInfo?: AndroidAudioDeviceInfo;
          durationMs?: number;
          item: MobilePlayableAudio;
          message?: string;
          positionMs?: number;
          sessionId: string;
          status: AndroidPlaybackStatus;
      }
    | {
          status: 'idle';
      };

type AndroidPlaybackStatus = 'loading' | Exclude<AndroidNativePlaybackEvent['status'], 'idle'>;

type AndroidUtilityScreen =
    | 'add-server'
    | 'downloads'
    | 'manage-servers'
    | 'settings'
    | 'view-all';

type ViewAllVariant = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast';

interface ViewAllRoute {
    items: MobileHomeItem[];
    title: string;
    variant: ViewAllVariant;
}

interface ContentBackedScreenProps {
    emptyTitle: string;
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionIds: MobileHomeSectionId[];
}

type HomeFilter = 'all' | 'audiobooks' | 'music' | 'podcasts' | 'radio';

interface HomeScreenProps {
    homeContentState: AndroidHomeContentState;
    onManageServers: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll: (section: HomeDisplaySection) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnections: ServerAuthenticationResult[];
}


interface SearchScreenProps {
    hasServerConnections: boolean;
    homeContentState: AndroidHomeContentState;
    onSearch: (query: string) => void;
    onSelectItem: (item: MobileSearchItem) => void;
    onSelectRecentItem: (item: AndroidRecentContentSourceItem) => void;
    recentItems: AndroidRecentContentItem[];
    searchState: AndroidSearchState;
    serverConnections: ServerAuthenticationResult[];
}

interface LibraryScreenProps {
    hasServerConnections: boolean;
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    recentItems: AndroidRecentContentItem[];
}

interface PlaylistsScreenProps {
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: MobileHomeItem) => void;
    onShufflePlay: (items: MobileHomeItem[]) => void;
    recentItems: AndroidRecentContentItem[];
}

interface RadioScreenProps {
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: MobileHomeItem) => void;
    playbackState: AndroidPlaybackState;
    recentItems: AndroidRecentContentItem[];
}

type LibraryFilter =
    | 'albums'
    | 'all'
    | 'artists'
    | 'audiobooks'
    | 'playlists'
    | 'podcasts'
    | 'radio'
    | 'songs';

type LibraryMediaType = Exclude<LibraryFilter, 'all'>;
type SearchScope =
    | 'albums'
    | 'all'
    | 'artists'
    | 'audiobooks'
    | 'music'
    | 'playlists'
    | 'podcasts'
    | 'radio';

interface LibraryDisplayItem {
    item: AndroidRecentContentSourceItem;
    key: string;
    mediaType: LibraryMediaType;
    selectedAt: number;
}

interface HomeDisplaySection {
    key: string;
    items: AndroidRecentContentSourceItem[];
    title: string;
    variant:
        | 'album'
        | 'artist'
        | 'book'
        | 'continue'
        | 'playlist'
        | 'podcast'
        | 'radio'
        | 'recents'
        | 'wide';
}

type MediaContextMenuKind =
    | 'album'
    | 'artist'
    | 'audiobook'
    | 'playlist'
    | 'podcast'
    | 'radio'
    | 'song';

interface MediaContextMenuOpenOptions {
    // True when the menu is opened from the detail page itself, so we should
    // skip the "Open Album/Playlist/Artist" action (you're already there).
    suppressOpenAction?: boolean;
    // True when there's already a visible Download button next to where the
    // menu was opened (e.g. the detail page hero), so the duplicate is clutter.
    suppressDownloadAction?: boolean;
}

type MediaContextMenuTarget =
    | {
          detail?: MobileMediaDetail;
          kind: 'song';
          source?: MobileContentSource;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          track: MobileMediaTrack;
      }
    | {
          item: AndroidRecentContentSourceItem;
          kind: Exclude<MediaContextMenuKind, 'song'>;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
      };

interface MediaContextMenuApi {
    openForItem: (
        item: AndroidRecentContentSourceItem,
        options?: MediaContextMenuOpenOptions,
    ) => void;
    openForTrack: (track: MobileMediaTrack, detail?: MobileMediaDetail) => void;
}

const MediaContextMenuContext = createContext<MediaContextMenuApi>({
    openForItem: () => undefined,
    openForTrack: () => undefined,
});

const useMediaContextMenu = () => useContext(MediaContextMenuContext);

/**
 * Pick which downloaded audiobook file contains a given book-time. Files
 * are sorted by startOffset; we pick the last file whose start is <= the
 * target. Defaults to 0 if nothing matches (shouldn't happen for valid
 * book-time inside the book's duration).
 */
const pickAudiobookFileIndexForTime = (
    files: OfflineAudiobookFile[],
    bookTimeSeconds: number,
): number => {
    if (files.length === 0) {
        return 0;
    }
    let chosen = 0;
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (file.startOffsetSeconds <= bookTimeSeconds) {
            chosen = i;
        } else {
            break;
        }
    }
    return chosen;
};

/**
 * Wrap a single downloaded audiobook file as a MobilePlayableAudio so
 * ExoPlayer can play it through the same queue infrastructure as music
 * tracks. Each file becomes its own queue entry; the playback session
 * id namespaces them under the book so resolveLocalPlayback doesn't try
 * to second-guess us with a streaming swap.
 */
const buildOfflineAudiobookPlayable = (
    detail: MobileMediaDetail,
    file: OfflineAudiobookFile,
    initialPositionSeconds: number,
): MobilePlayableAudio => {
    return {
        artworkUrl: detail.artworkUrl,
        contentSourceId: detail.source.id,
        durationSeconds: file.durationSeconds,
        id: `${detail.source.type}:${detail.source.url}:audiobook:${detail.id}:offline:${file.ino}`,
        initialPositionSeconds,
        quality: {
            container: null,
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source: 'audiobook',
        subtitle: detail.subtitle,
        title: detail.title,
        url: file.localUri,
    };
};

// Podcast episodes don't get a track.playback baked into the detail loader —
// the streaming URL is fetched on demand from the ABS /play endpoint. That
// network call fails offline, so for downloaded episodes we synthesize the
// MobilePlayableAudio directly from the local file. The id keeps the same
// `<authType>:<authUrl>:podcast:<itemId>:<episodeId>` shape playback uses
// elsewhere so MediaSession metadata, progress sync, and resolveLocalPlayback
// all behave consistently.
const buildOfflinePodcastEpisodePlayable = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    localUri: string,
): MobilePlayableAudio => {
    const itemId = track.itemId ?? detail.id;
    const episodeId = track.episodeId ?? track.id;
    return {
        artworkUrl: track.artworkUrl ?? detail.artworkUrl,
        contentSourceId: detail.source.id,
        durationSeconds: track.durationSeconds,
        id: `${detail.source.type}:${detail.source.url}:podcast:${itemId}:${episodeId}`,
        quality: {
            container: null,
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source: 'podcast',
        subtitle: track.subtitle ?? detail.title,
        title: track.title,
        url: localUri,
    };
};

// Map a streaming `MobilePlayableAudio` to a local-file version if the track
// has been downloaded. The download manager keys by the inner track id and
// the server's content-source id; we recover both from playback.id's
// `<authType>:<authUrl>:<source>:<innerId>` shape.
const resolveLocalPlayback = async (
    item: MobilePlayableAudio,
): Promise<MobilePlayableAudio> => {
    const sourceId = item.contentSourceId ?? item.id.match(/^([^:]+:[^:]+):/)?.[1];
    const innerIdMatch = item.id.match(/:(music|audiobook|podcast|radio):(.+)$/);
    if (!sourceId || !innerIdMatch) {
        return item;
    }
    const [, sourceKind, innerId] = innerIdMatch;
    // For podcasts, the inner part is `<itemId>:<episodeId>` — and we keyed
    // the download by episodeId so each episode resolves to its own file.
    const lookupTrackId =
        sourceKind === 'podcast' ? (innerId.split(':').pop() ?? innerId) : innerId;
    try {
        const localUri = await getLocalUriForTrack(lookupTrackId, sourceId);
        if (!localUri) {
            return item;
        }
        // Local file — no auth headers, no need for the streaming URL.
        return { ...item, httpHeaders: undefined, url: localUri };
    } catch {
        return item;
    }
};

const inferContextMenuKindFromItem = (
    item: AndroidRecentContentSourceItem,
): Exclude<MediaContextMenuKind, 'song'> | null => {
    switch (item.type) {
        case MobileHomeItemType.ALBUM:
            return 'album';
        case MobileHomeItemType.ARTIST:
            return 'artist';
        case MobileHomeItemType.AUDIOBOOK:
            return 'audiobook';
        case MobileHomeItemType.PLAYLIST:
            return 'playlist';
        case MobileHomeItemType.PODCAST:
            return 'podcast';
        case MobileHomeItemType.RADIO:
            return 'radio';
        default:
            return null;
    }
};

const isSongSearchItem = (
    item: AndroidRecentContentSourceItem,
): item is MobileSearchItem & { type: MobileSearchItemType.SONG } =>
    (item as MobileSearchItem).type === MobileSearchItemType.SONG;

const synthesizeTrackFromSongItem = (item: MobileSearchItem): MobileMediaTrack => ({
    album: item.album,
    albumId: item.albumId,
    artist: item.artist,
    artistId: item.artistId,
    artworkUrl: item.artworkUrl,
    id: item.id,
    playback: item.playback,
    subtitle: item.subtitle,
    title: item.title,
});

const LIBRARY_FILTERS: Array<{ id: LibraryFilter; label: string; mediaType?: LibraryMediaType }> = [
    { id: 'all', label: 'All' },
    { id: 'playlists', label: 'Playlists', mediaType: 'playlists' },
    { id: 'audiobooks', label: 'Audiobooks', mediaType: 'audiobooks' },
    { id: 'podcasts', label: 'Podcasts', mediaType: 'podcasts' },
    { id: 'albums', label: 'Albums', mediaType: 'albums' },
    { id: 'artists', label: 'Artists', mediaType: 'artists' },
    { id: 'songs', label: 'Songs', mediaType: 'songs' },
    { id: 'radio', label: 'Radio', mediaType: 'radio' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState<SamoMobileTabId>('home');
    const [activeUtilityScreen, setActiveUtilityScreen] = useState<AndroidUtilityScreen | null>(
        null,
    );
    const [authState, setAuthState] = useState<AndroidAuthState>({ status: 'idle' });
    const [homeContentState, setHomeContentState] = useState<AndroidHomeContentState>({
        status: 'idle',
    });
    const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
    const [viewAllRoute, setViewAllRoute] = useState<null | ViewAllRoute>(null);
    const [viewAllFullState, setViewAllFullState] = useState<AndroidFullCollectionState>({
        status: 'idle',
    });
    const viewAllFetchTokenRef = useRef(0);
    // Unified animation source for the MiniPlayer ↔ FullScreenPlayer transition.
    // 0 = miniplayer visible, 1 = fullscreen visible. Both components derive
    // their frame, opacity, and touchability from this single shared value so
    // the motion reads as one physical object expanding or collapsing.
    const playerProgress = useSharedValue(0);
    const reducedMotion = useReducedMotionPreference();
    useEffect(() => {
        const spring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
        if (isFullPlayerOpen) {
            playerProgress.value = withSpring(1, spring);
        } else {
            playerProgress.value = reducedMotion
                ? withTiming(0, { duration: 0 })
                : withSpring(0, spring);
        }
    }, [isFullPlayerOpen, playerProgress, reducedMotion]);
    const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
    const [searchOverlayQuery, setSearchOverlayQuery] = useState('');
    const [mediaDetailState, setMediaDetailState] = useState<AndroidMediaDetailState>({
        status: 'idle',
    });
    const [password, setPassword] = useState('');
    const [playbackState, setPlaybackState] = useState<AndroidPlaybackState>({ status: 'idle' });
    const [lastPlayedItem, setLastPlayedItem] = useState<MobilePlayableAudio | null>(null);
    const [recentContentItems, setRecentContentItems] = useState<AndroidRecentContentItem[]>([]);
    const [serverConnections, setServerConnections] = useState<ServerAuthenticationResult[]>([]);
    const [serverHealthByKey, setServerHealthByKey] = useState<AndroidServerHealthMap>({});
    const [serverType, setServerType] = useState<ServerType>(ServerType.NAVIDROME);
    const [serverUrl, setServerUrl] = useState('');
    const [searchState, setSearchState] = useState<AndroidSearchState>({ status: 'idle' });
    const [username, setUsername] = useState('');
    const [isShuffled, setIsShuffled] = useState(false);
    const [localFavorites, setLocalFavorites] = useState<AndroidLocalFavoriteItem[]>([]);
    const [favoritedKeys, setFavoritedKeys] = useState<Set<string>>(new Set());
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    // Set of `${sourceId}:${collectionId}` keys for items where at least one
    // file is completely downloaded. Used to filter the home/library views
    // when offline mode is on.
    const [downloadedCollectionKeys, setDownloadedCollectionKeys] = useState<Set<string>>(
        new Set(),
    );
    const [downloadedCollections, setDownloadedCollections] = useState<
        DownloadedCollectionSummary[]
    >([]);
    const [contextMenuTarget, setContextMenuTarget] =
        useState<MediaContextMenuTarget | null>(null);
    const [contextMenuFeedback, setContextMenuFeedback] = useState<string | null>(null);
    const [streamInfoItem, setStreamInfoItem] =
        useState<AndroidRecentContentSourceItem | null>(null);
    const [bookInfoState, setBookInfoState] = useState<
        | {
              detail: MobileMediaDetail;
              item: AndroidRecentContentSourceItem;
              status: 'loaded';
              variant: 'audiobook' | 'podcast';
          }
        | {
              item: AndroidRecentContentSourceItem;
              message: string;
              status: 'error';
              variant: 'audiobook' | 'podcast';
          }
        | {
              item: AndroidRecentContentSourceItem;
              status: 'loading';
              variant: 'audiobook' | 'podcast';
          }
        | { status: 'idle' }
    >({ status: 'idle' });
    const [playlistMenuRoot, setPlaylistMenuRoot] = useState<
        | {
              collectionItem: AndroidRecentContentSourceItem;
              kind: 'collection';
              sourceId: string;
          }
        | {
              kind: 'track';
              sourceId: string;
              track: MobileMediaTrack;
          }
        | null
    >(null);
    const [playlistMenuRootState, setPlaylistMenuRootState] = useState<
        | { message: string; status: 'error' }
        | { message: string; status: 'success' }
        | { playlistId: string; status: 'loading' }
        | { status: 'idle' }
    >({ status: 'idle' });
    const absContextRef = useRef<AbsProgressContext | null>(null);
    const homeLoadRequestId = useRef(0);
    const playbackQueueRef = useRef<null | { index: number; items: MobilePlayableAudio[] }>(null);
    const playbackSequenceRef = useRef(0);
    // Stale-while-revalidate cache for media detail pages. First open hits the
    // network; subsequent opens in the same session return instantly while the
    // background refetch updates the data.
    const mediaDetailCacheRef = useRef<Map<string, MobileMediaDetail>>(new Map());
    const playbackSnapshotRef = useRef<null | { item: MobilePlayableAudio; sessionId: string }>(
        null,
    );
    const searchRequestId = useRef(0);

    useEffect(() => {
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isSearchOverlayOpen) {
                setIsSearchOverlayOpen(false);
                setSearchOverlayQuery('');
                return true;
            }

            if (isFullPlayerOpen) {
                setIsFullPlayerOpen(false);
                return true;
            }

            if (mediaDetailState.status !== 'idle') {
                setMediaDetailState({ status: 'idle' });
                return true;
            }

            if (
                activeUtilityScreen === 'add-server' ||
                activeUtilityScreen === 'downloads' ||
                activeUtilityScreen === 'manage-servers'
            ) {
                setActiveUtilityScreen('settings');
                return true;
            }

            if (activeUtilityScreen === 'view-all') {
                setActiveUtilityScreen(null);
                setViewAllRoute(null);
                viewAllFetchTokenRef.current += 1;
                setViewAllFullState({ status: 'idle' });
                return true;
            }

            if (activeUtilityScreen === 'settings') {
                setActiveUtilityScreen(null);
                return true;
            }

            return false;
        });

        return () => handler.remove();
    }, [activeUtilityScreen, isFullPlayerOpen, isSearchOverlayOpen, mediaDetailState.status]);

    const canConnect =
        serverUrl.trim().length > 0 && username.trim().length > 0 && password.length > 0;
    const isHomeSurface =
        activeTab === 'home' && activeUtilityScreen === null && mediaDetailState.status === 'idle';
    const title = useMemo(() => getTabTitle(activeTab), [activeTab]);

    // When offline mode is on, filter home/library content to items that
    // have at least one completed download. Items without a server source
    // are dropped entirely (defensive: shouldn't happen for downloadables).
    const visibleHomeContentState = useMemo(() => {
        if (!isOfflineMode) {
            return homeContentState;
        }
        const offlineContentState = buildOfflineHomeContentState(
            downloadedCollections,
            serverConnections,
        );
        if (homeContentState.status !== 'loaded') {
            return offlineContentState;
        }
        const filteredSections = homeContentState.content.sections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) =>
                    downloadedCollectionKeys.has(`${item.source?.id ?? ''}:${item.id}`),
                ),
            }))
            .filter((section) => section.items.length > 0);
        if (filteredSections.length === 0) {
            return offlineContentState;
        }
        return {
            ...homeContentState,
            content: {
                ...homeContentState.content,
                sections: filteredSections,
            },
        };
    }, [
        downloadedCollectionKeys,
        downloadedCollections,
        homeContentState,
        isOfflineMode,
        serverConnections,
    ]);

    const visibleRecentItems = useMemo(() => {
        const filtered = isOfflineMode
            ? recentContentItems.filter((entry) =>
                  downloadedCollectionKeys.has(
                      `${entry.item.source?.id ?? ''}:${entry.item.id}`,
                  ),
              )
            : recentContentItems;
        // Recents persisted before subsonicCoverArtUrl learned the entity-id
        // fallback were stored without artworkUrl. Backfill at render time so
        // they pick up real covers as soon as the matching server is
        // connected, without rewriting storage.
        return filtered.map((entry) => {
            if (entry.item.artworkUrl) return entry;
            const resolved = resolveItemArtworkUrl(entry.item, serverConnections);
            if (!resolved) return entry;
            return { ...entry, item: { ...entry.item, artworkUrl: resolved } };
        });
    }, [recentContentItems, isOfflineMode, downloadedCollectionKeys, serverConnections]);

    const loadHomeForConnections = useCallback(
        async (authentications: ServerAuthenticationResult[]) => {
            const requestId = (homeLoadRequestId.current += 1);

            if (authentications.length === 0) {
                setHomeContentState({ status: 'idle' });
                return;
            }

            // Only show the spinner if we don't already have something on
            // screen. If we hydrated from the persisted cache or already have a
            // loaded state, keep that visible while we refetch — the user
            // never sees a blank loading screen when we have stale data.
            setHomeContentState((current) => {
                if (current.status === 'loaded') {
                    return current;
                }
                return { status: 'loading' };
            });
            const nextHomeContentState = await loadAndroidHomeContent(authentications);

            if (requestId === homeLoadRequestId.current) {
                setHomeContentState(nextHomeContentState);
                if (nextHomeContentState.status === 'loaded') {
                    void saveCachedHomeContent(nextHomeContentState.content);
                }
            }
        },
        [],
    );

    const playQueuedItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
        ) => {
            if (!isAndroidNativePlaybackAvailable()) {
                setPlaybackState({
                    item,
                    message: 'Native Android audio engine is not available in this build.',
                    sessionId: 'unavailable',
                    status: 'error',
                });
                return;
            }

            const playableQueueItems = queueItems.length > 0 ? queueItems : [item];
            const requestedQueueIndex =
                queueIndex ??
                Math.max(
                    0,
                    playableQueueItems.findIndex((candidate) => candidate.id === item.id),
                );
            const nextQueueIndex = Math.min(
                Math.max(0, requestedQueueIndex),
                Math.max(0, playableQueueItems.length - 1),
            );
            const initialPositionMs =
                item.initialPositionSeconds && item.initialPositionSeconds > 0
                    ? item.initialPositionSeconds * 1000
                    : 0;
            const session = createPlaybackSession({
                engine: 'android-native',
                mediaKey: item.id,
                sequence: (playbackSequenceRef.current += 1),
                source: item.source,
            });

            playbackQueueRef.current = {
                index: nextQueueIndex,
                items: playableQueueItems,
            };
            playbackSnapshotRef.current = { item, sessionId: session.id };
            setPlaybackState({
                durationMs: getPlaybackItemDurationMs(item),
                item,
                positionMs: initialPositionMs,
                sessionId: session.id,
                status: 'loading',
            });

            try {
                const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
                // Prefer a downloaded local file if we have one for this
                // track — that's the whole point of the offline downloader.
                // Falls through to the streaming URL if not downloaded.
                const playable = await resolveLocalPlayback(item);
                let event = await playAndroidAudio(playable, session.id);

                if (initialPositionMs > 0) {
                    event = await seekAndroidAudio(initialPositionMs);
                }

                const deviceInfo = await deviceInfoPromise;

                setPlaybackState({
                    bitPerfect: event.bitPerfect,
                    deviceInfo,
                    durationMs: getPlaybackEventDurationMs(event, item),
                    item,
                    message: event.message,
                    positionMs: event.positionMs ?? initialPositionMs,
                    sessionId: session.id,
                    status: getActivePlaybackStatus(event.status, 'buffering'),
                });
            } catch (error) {
                setPlaybackState({
                    durationMs: getPlaybackItemDurationMs(item),
                    item,
                    message: error instanceof Error ? error.message : 'Playback failed',
                    positionMs: initialPositionMs,
                    sessionId: session.id,
                    status: 'error',
                });
            }
        },
        [],
    );

    const handlePlayItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
        ) => {
            await playQueuedItem(item, queueItems, queueIndex);
        },
        [playQueuedItem],
    );

    useEffect(() => {
        const subscription = subscribeToAndroidAudioEvents((event) => {
            const snapshot = playbackSnapshotRef.current;

            if (!snapshot || (event.sessionId && event.sessionId !== snapshot.sessionId)) {
                return;
            }

            setPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                if (event.status === 'ended') {
                    const queue = playbackQueueRef.current;
                    const nextIndex = queue ? queue.index + 1 : -1;
                    const nextItem = queue?.items[nextIndex];

                    if (nextItem) {
                        void playQueuedItem(nextItem, queue.items, nextIndex);
                        return current;
                    }
                }

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: getPlaybackEventDurationMs(event, current.item),
                    message: event.message,
                    positionMs: event.positionMs ?? current.positionMs,
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
        });

        return () => subscription.remove();
    }, [playQueuedItem]);

    // Notification + Bluetooth media-button previous/next come through here.
    // SamoForwardingPlayer marks these commands as always-available so the
    // notification renders both buttons even though the native player only
    // holds one MediaItem at a time; the actual queue step happens in JS via
    // handleNavigatePlayback. The ref dance lets us subscribe exactly once
    // while still calling the most recent closure (which captures live
    // playback state and queue refs).
    const navigateRef = useRef<((direction: -1 | 1) => Promise<void>) | null>(null);
    useEffect(() => {
        navigateRef.current = handleNavigatePlayback;
    });
    useEffect(() => {
        const subscription = subscribeToAndroidNavigationRequests((event) => {
            const direction = event.direction === -1 ? -1 : 1;
            void navigateRef.current?.(direction);
        });
        return () => subscription.remove();
    }, []);

    // Warm the artwork cache the moment new home content lands. expo-image's
    // memory-disk cache is per-URL, so a Image.prefetch() now means the
    // grid tiles render straight from cache when the user scrolls — no
    // staggered "tiles popping in" once the section data finishes its first
    // server roundtrip.
    useEffect(() => {
        if (homeContentState.status !== 'loaded') return;
        const urls = new Set<string>();
        for (const section of homeContentState.content.sections) {
            for (const item of section.items) {
                if (item.artworkUrl) urls.add(item.artworkUrl);
            }
        }
        if (urls.size > 0) {
            void ExpoImage.prefetch([...urls]);
        }
    }, [homeContentState]);

    useEffect(() => {
        if (playbackState.status === 'idle' || !isAndroidNativePlaybackAvailable()) {
            return;
        }
        // The 1Hz position poll is the single biggest source of re-renders in
        // the app: every tick updates playbackState which cascades through the
        // entire tree. The only consumer that actually needs position to tick
        // continuously is the fullscreen progress bar. When fullscreen is
        // closed (most of the time), poll less aggressively — status changes
        // still flow through subscribeToAndroidAudioEvents in real time, so
        // the MiniPlayer's play/pause icon and "Now Playing" indicators stay
        // correct. ABS progress sync also fires off these polls so we keep
        // a slower beat going for it.
        const intervalMs = isFullPlayerOpen ? 1000 : 5000;
        const interval = setInterval(() => {
            void getAndroidPlaybackStatus()
                .then((event) => {
                    const snapshot = playbackSnapshotRef.current;

                    if (!snapshot || (event.sessionId && event.sessionId !== snapshot.sessionId)) {
                        return;
                    }

                    const positionMs = event.positionMs;
                    const absCtx = absContextRef.current;

                    if (absCtx && positionMs && event.status === 'playing') {
                        void syncAbsProgressThrottled(absCtx, positionMs / 1000);
                    }

                    setPlaybackState((current) => {
                        if (current.status === 'idle') {
                            return current;
                        }

                        const nextPositionMs = event.positionMs ?? current.positionMs;
                        const nextStatus = getActivePlaybackStatus(event.status, current.status);
                        const nextDurationMs = getPlaybackEventDurationMs(event, current.item);
                        const nextMessage = event.message ?? current.message;
                        const nextBitPerfect = event.bitPerfect ?? current.bitPerfect;

                        // Short-circuit if nothing meaningful changed. Returning the same
                        // reference here skips a re-render of the entire app tree, which
                        // happens otherwise once per polling tick (every 1s).
                        if (
                            nextStatus === current.status &&
                            nextDurationMs === current.durationMs &&
                            nextMessage === current.message &&
                            nextBitPerfect === current.bitPerfect &&
                            Math.abs((nextPositionMs ?? 0) - (current.positionMs ?? 0)) < 50
                        ) {
                            return current;
                        }

                        return {
                            ...current,
                            bitPerfect: nextBitPerfect,
                            durationMs: nextDurationMs,
                            message: nextMessage,
                            positionMs: nextPositionMs,
                            status: nextStatus,
                        };
                    });
                })
                .catch(() => undefined);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isFullPlayerOpen, playbackState.status]);

    useEffect(() => {
        let isMounted = true;

        void loadPersistedRecentContentItems().then((items) => {
            if (isMounted) {
                setRecentContentItems(items);
            }
        });

        void loadPersistedLastPlayedItem().then((item) => {
            if (isMounted && item) {
                setLastPlayedItem(item);
            }
        });

        void loadLocalFavorites().then((favorites) => {
            if (isMounted) {
                setLocalFavorites(favorites);
                setFavoritedKeys((current) => {
                    const next = new Set(current);
                    favorites.forEach((favorite) => next.add(favorite.key));
                    return next;
                });
            }
        });

        // Hydrate the Home tab from the persisted cache before the network
        // call finishes so cold launch isn't a 3-second spinner. Only apply
        // if nothing fresher has arrived in the meantime.
        void loadCachedHomeContent().then((cached) => {
            if (!isMounted || !cached) {
                return;
            }
            setHomeContentState((current) => {
                if (current.status === 'loaded') {
                    return current;
                }
                return { content: cached.content, status: 'loaded' };
            });
        });

        void loadOfflineModePreference().then((next) => {
            if (isMounted) {
                setIsOfflineMode(next);
            }
        });

        // In dev mode, Metro serves the brand logo over HTTP. Prefetch it
        // immediately on launch so it lands in Fresco's disk cache — that
        // way the logo still renders if you later flip to airplane mode and
        // Metro becomes unreachable. In release builds the asset is bundled
        // into the APK and this is a no-op fast path.
        try {
            const resolved = Image.resolveAssetSource(samoLogo);
            if (resolved?.uri) {
                void Image.prefetch(resolved.uri).catch(() => undefined);
            }
        } catch {
            // ignore — Image.resolveAssetSource throws in some edge cases
        }

        return () => {
            isMounted = false;
        };
    }, []);

    // Build the set of "collection has at least one completed download" keys
    // by subscribing to the download manager. Used by Home/Library when
    // offline mode is on so we only show items the user can actually play.
    useEffect(() => {
        const unsubscribe = subscribeDownloads((entries) => {
            const keys = new Set<string>();
            const collections = new Map<string, DownloadedCollectionSummary>();
            for (const entry of entries) {
                if (entry.status === 'completed') {
                    const key = `${entry.collection.sourceId}:${entry.collection.id}`;
                    keys.add(key);
                    const existing = collections.get(key);
                    const latestCompletedAt = entry.completedAt ?? entry.enqueuedAt;
                    if (!existing || latestCompletedAt > existing.latestCompletedAt) {
                        collections.set(key, {
                            collection: entry.collection,
                            latestCompletedAt,
                        });
                    }
                }
            }
            setDownloadedCollectionKeys(keys);
            setDownloadedCollections([...collections.values()]);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (playbackState.status === 'idle') {
            return;
        }
        const item = playbackState.item;
        setLastPlayedItem(item);
        void savePersistedLastPlayedItem(item);
    }, [playbackState]);

    useEffect(() => {
        // Close fullscreen only on the navigation EDGE — when the detail starts
        // loading. Watching just the status (not isFullPlayerOpen) means this
        // doesn't fire when the user opens the fullscreen player on a page
        // that's already showing a loaded detail. That was the bug: tapping
        // the MiniPlayer on an album/artist/playlist page set isFullPlayerOpen
        // true → this effect ran → and immediately set it false.
        if (mediaDetailState.status === 'loading') {
            setIsFullPlayerOpen(false);
        }
    }, [mediaDetailState.status]);

    const recordRecentContentItem = useCallback((item: AndroidRecentContentSourceItem) => {
        setRecentContentItems((current) => {
            const nextItems = upsertRecentContentItem(current, item);

            void savePersistedRecentContentItems(nextItems);

            return nextItems;
        });
    }, []);

    useEffect(() => {
        let isMounted = true;

        const restoreServers = async () => {
            const persisted = await loadPersistedServerAuthsWithMeta();
            const persistedAuths = persisted.authentications;

            if (!isMounted) {
                return;
            }

            if (persisted.discardedCount > 0) {
                setAuthState({
                    message:
                        persistedAuths.length > 0
                            ? `Ignored ${persisted.discardedCount} invalid saved server session.`
                            : 'Saved server session was invalid. Please reconnect.',
                    status: 'error',
                });
            }

            if (persisted.discardedCount > 0 || persisted.migratedLegacySingle) {
                await savePersistedServerAuths(persistedAuths);
            }

            if (persistedAuths.length === 0) {
                return;
            }

            setServerConnections(persistedAuths);
            setServerHealthByKey(createCheckingServerHealthMap(persistedAuths));

            const serverHealth = await checkAndroidServerConnections(persistedAuths);

            if (isMounted) {
                const authorizedAuthentications = serverHealth.authentications.filter(
                    (authentication) =>
                        serverHealth.statuses[getPersistedServerAuthKey(authentication)]?.status !==
                        ServerConnectionHealthStatus.UNAUTHORIZED,
                );
                const authorizedHealthStatuses = Object.fromEntries(
                    Object.entries(serverHealth.statuses).filter(
                        ([, status]) => status.status !== ServerConnectionHealthStatus.UNAUTHORIZED,
                    ),
                );
                const unauthorizedCount =
                    serverHealth.authentications.length - authorizedAuthentications.length;

                setServerConnections(authorizedAuthentications);
                setServerHealthByKey(authorizedHealthStatuses);

                const unhealthySessions = Object.values(authorizedHealthStatuses).filter(
                    (status) => status.status !== ServerConnectionHealthStatus.HEALTHY,
                );

                if (unauthorizedCount > 0) {
                    setAuthState({
                        message: `${unauthorizedCount} saved server session expired. Please reconnect.`,
                        status: 'error',
                    });
                } else if (unhealthySessions.length > 0) {
                    setAuthState({
                        message: `${unhealthySessions.length} saved server session needs attention.`,
                        status: 'error',
                    });
                }

                await savePersistedServerAuths(authorizedAuthentications);
                void loadHomeForConnections(authorizedAuthentications);
            }
        };

        void restoreServers();

        return () => {
            isMounted = false;
        };
    }, [loadHomeForConnections]);

    // Android 13+ requires runtime POST_NOTIFICATIONS consent before any
    // notification (including the MediaSession one that drives shade controls
    // and lock-screen artwork) can appear. Without this, the media notification
    // silently never shows up. Request once on boot; declined permissions
    // simply mean no notification.
    useEffect(() => {
        if (Platform.OS !== 'android' || Platform.Version < 33) return;
        void PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ).catch(() => undefined);
    }, []);

    // Boot + foreground replay of any audiobookshelf progress writes that
    // didn't make it to the server on the previous run (process killed during
    // playback, dropped network, etc.). Idempotent — flushPendingAbsProgress
    // only re-attempts entries whose updatedAt > syncedAt.
    useEffect(() => {
        if (serverConnections.length === 0) return;
        void (async () => {
            await initAbsProgressStore();
            await flushPendingAbsProgress(serverConnections);
        })();
    }, [serverConnections]);

    // Flush pending progress whenever the app loses foreground. AppState fires
    // 'background' on Android when the user task-switches away or locks the
    // screen — both moments where the process might be killed before the next
    // throttled write would otherwise fire.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'background' || next === 'inactive') {
                void flushPendingAbsProgress(serverConnections);
            }
        });
        return () => subscription.remove();
    }, [serverConnections]);

    const handleConnect = async () => {
        if (!canConnect || authState.status === 'loading') return;

        setAuthState({ message: 'Connecting to server', status: 'loading' });
        setHomeContentState({ status: 'idle' });

        const nextAuthState = await authenticateServer({
            password,
            type: serverType,
            url: serverUrl,
            username,
        });

        setAuthState(nextAuthState);

        if (nextAuthState.status === 'connected') {
            const nextConnections = upsertServerAuthentication(
                serverConnections,
                nextAuthState.result,
            );
            const nextConnectionKey = getPersistedServerAuthKey(nextAuthState.result);

            setServerConnections(nextConnections);
            setServerHealthByKey((current) => ({
                ...current,
                [nextConnectionKey]: createConnectedServerHealthStatus(nextAuthState.result),
            }));
            setMediaDetailState({ status: 'idle' });
            setPassword('');
            setServerUrl('');
            setUsername('');
            setSearchState({ status: 'idle' });
            setActiveUtilityScreen('manage-servers');
            await savePersistedServerAuths(nextConnections);
            await loadHomeForConnections(nextConnections);
        }
    };

    const handleDisconnect = async (authentication: ServerAuthenticationResult) => {
        const nextConnections = removeServerAuthentication(serverConnections, authentication);
        const removedConnectionKey = getPersistedServerAuthKey(authentication);

        setServerConnections(nextConnections);
        setServerHealthByKey((current) => {
            const nextHealthByKey = { ...current };
            delete nextHealthByKey[removedConnectionKey];
            return nextHealthByKey;
        });
        setMediaDetailState({ status: 'idle' });
        setSearchState({ status: 'idle' });
        setAuthState({ status: 'idle' });
        await savePersistedServerAuths(nextConnections);
        await loadHomeForConnections(nextConnections);
    };

    const handleSearch = useCallback(
        async (query: string) => {
            if (serverConnections.length === 0) {
                return;
            }

            const trimmedQuery = query.trim();
            const requestId = (searchRequestId.current += 1);

            if (!trimmedQuery) {
                setSearchState({ status: 'idle' });
                return;
            }

            setSearchState({ query: trimmedQuery, status: 'loading' });
            const userRecents = new Map(
                recentContentItems.map((entry) => [entry.key, entry.selectedAt]),
            );
            const nextSearchState = await loadAndroidSearchResults(
                serverConnections,
                trimmedQuery,
                userRecents,
            );

            if (requestId === searchRequestId.current) {
                setSearchState(nextSearchState);
            }
        },
        [recentContentItems, serverConnections],
    );

    const loadDetailWithCache = async (
        item: AndroidRecentContentSourceItem,
    ): Promise<{ cached: boolean }> => {
        const cacheKey = getRecentContentItemKey(item);

        // Layer 1: in-memory cache — instant.
        let cached = mediaDetailCacheRef.current.get(cacheKey);

        // Layer 2: persistent fs cache — async, but still much faster than
        // the network and works in airplane mode.
        if (!cached) {
            const fromDisk = await loadCachedMediaDetail(cacheKey);
            if (fromDisk) {
                cached = fromDisk;
                mediaDetailCacheRef.current.set(cacheKey, fromDisk);
            }
        }

        if (!cached && isOfflineMode) {
            const downloadedDetail = await buildDownloadedMusicDetail(item);
            if (downloadedDetail) {
                cached = downloadedDetail;
                mediaDetailCacheRef.current.set(cacheKey, downloadedDetail);
            }
        }

        if (cached) {
            setMediaDetailState({ detail: cached, status: 'loaded' });
        } else {
            setMediaDetailState({ itemTitle: item.title, status: 'loading' });
        }

        if (isOfflineMode && cached) {
            return { cached: true };
        }

        // Refresh from network in the background. Failure is OK if we have
        // stale data — the user sees the cached version, which is the whole
        // point of offline playback.
        const next = await loadAndroidMediaDetail(serverConnections, item);
        if (next.status === 'loaded') {
            mediaDetailCacheRef.current.set(cacheKey, next.detail);
            void saveCachedMediaDetail(cacheKey, next.detail);
            setMediaDetailState(next);
        } else if (!cached) {
            setMediaDetailState(next);
        }
        return { cached: Boolean(cached) };
    };

    const handleOpenViewAll = useCallback(
        (section: HomeDisplaySection) => {
            const variant = getViewAllVariant(section.variant);
            if (!variant) return;
            // Show the cached home-content slice immediately so the screen
            // never opens blank; the full collection fetch below will fill in
            // every remaining item once the server(s) respond.
            const wideItems =
                homeContentState.status === 'loaded'
                    ? gatherViewAllItems(homeContentState.content.sections, variant)
                    : section.items.filter(
                          (item): item is MobileHomeItem => 'type' in item,
                      );
            setViewAllRoute({
                items: wideItems,
                title: section.title,
                variant,
            });
            setActiveUtilityScreen('view-all');
            setMediaDetailState({ status: 'idle' });

            // Kick off the exhaustive fetch. The token guards against a stale
            // response landing after the user has opened a different View All
            // (or closed the screen entirely).
            viewAllFetchTokenRef.current += 1;
            const myToken = viewAllFetchTokenRef.current;
            setViewAllFullState({ status: 'loading' });
            void (async () => {
                const result = await loadAndroidFullCollection(serverConnections, variant);
                if (viewAllFetchTokenRef.current !== myToken) return;
                setViewAllFullState(result);
            })();
        },
        [homeContentState, serverConnections],
    );

    const handleSelectMediaItem = async (item: MobileHomeItem | MobileSearchItem) => {
        recordRecentContentItem(item);

        if (item.playback) {
            await handlePlayItem(item.playback);
            return;
        }

        if (item.type === MobileHomeItemType.AUDIOBOOK) {
            await handleStartAudiobook(item);
            return;
        }

        await loadDetailWithCache(item);
    };

    const handleStartAudiobook = async (item: MobileHomeItem | MobileSearchItem) => {
        setPlaybackState((current) =>
            current.status === 'idle'
                ? current
                : { ...current, message: 'Loading audiobook…' },
        );

        // Try the network first, then fall back to caches (in-memory or fs),
        // and finally synthesize a detail from downloaded files if we have
        // them. This is what makes tap-to-play work offline.
        const cacheKey = getRecentContentItemKey(item);
        const networkResult = await loadAndroidMediaDetail(serverConnections, item);
        let detail: MobileMediaDetail | undefined =
            networkResult.status === 'loaded' ? networkResult.detail : undefined;

        if (!detail) {
            detail =
                mediaDetailCacheRef.current.get(cacheKey) ??
                (await loadCachedMediaDetail(cacheKey)) ??
                undefined;
        }

        if (!detail) {
            // Last resort: build a synthetic detail from the downloaded files.
            // Lets the user play an audiobook entirely offline even if the
            // server's never been reached since launch.
            const offlineFiles = await getOfflineAudiobookFiles(item.id, item.source?.id ?? '');
            if (offlineFiles.length > 0 && item.source) {
                detail = {
                    artworkUrl: item.artworkUrl,
                    id: item.id,
                    source: item.source,
                    subtitle: item.subtitle,
                    title: item.title,
                    tracks: offlineFiles.map((file) => ({
                        artworkUrl: item.artworkUrl,
                        durationSeconds: file.durationSeconds,
                        id: `${item.id}:${file.ino}`,
                        itemId: item.id,
                        startSeconds: file.startOffsetSeconds,
                        subtitle: item.subtitle,
                        title: item.title,
                        trackNumber: file.index + 1,
                    })),
                    type: MobileMediaDetailType.AUDIOBOOK,
                };
            }
        }

        if (!detail) {
            // Genuinely no way to play — surface the network error so the
            // user can recover (e.g. by reconnecting).
            setMediaDetailState(networkResult);
            return;
        }

        // Always refresh the cache when the network succeeded.
        if (networkResult.status === 'loaded') {
            mediaDetailCacheRef.current.set(cacheKey, networkResult.detail);
            void saveCachedMediaDetail(cacheKey, networkResult.detail);
        }
        const auth = serverConnections.find(
            (candidate) => getPersistedServerAuthKey(candidate) === detail.source.id,
        );

        if (!auth || auth.type !== ServerType.AUDIOBOOKSHELF || detail.tracks.length === 0) {
            setMediaDetailState({ detail, status: 'loaded' });
            return;
        }

        const progress = await loadAbsCurrentProgress(auth, detail.id);
        const resumeSeconds = progress?.currentTimeSeconds ?? 0;
        const chapterIndex =
            resumeSeconds > 0
                ? Math.max(
                      0,
                      detail.tracks.findIndex((track, index) => {
                          const start = track.startSeconds ?? 0;
                          const next =
                              detail.tracks[index + 1]?.startSeconds ??
                              start + (track.durationSeconds ?? Number.POSITIVE_INFINITY);
                          return resumeSeconds >= start && resumeSeconds < next;
                      }),
                  )
                : 0;
        const baseTrack = detail.tracks[chapterIndex] ?? detail.tracks[0];

        // For resume, override the chapter's startSeconds with the user's actual
        // position so loadAudiobookshelfPlayback seeds initialPositionSeconds
        // correctly inside playQueuedItem.
        const trackToPlay: MobileMediaTrack =
            resumeSeconds > 0 && baseTrack
                ? { ...baseTrack, startSeconds: resumeSeconds }
                : baseTrack;

        if (!trackToPlay) {
            setMediaDetailState({ detail, status: 'loaded' });
            return;
        }

        await handlePlayMediaTrack(detail, trackToPlay, chapterIndex);
    };

    const handlePlayMediaTrack = async (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
    ) => {
        if (track.playback) {
            const queueItems = detail.tracks.flatMap((candidate) =>
                candidate.playback ? [candidate.playback] : [],
            );
            const queueIndex = Math.max(
                0,
                queueItems.findIndex((candidate) => candidate.id === track.playback?.id),
            );

            await handlePlayItem(track.playback, queueItems, queueIndex);
            return;
        }

        // Podcast offline path: the ABS /play endpoint that normally builds the
        // streaming URL fails offline, so synthesize a MobilePlayableAudio
        // directly from the downloaded file when one exists for this episode.
        if (detail.type === MobileMediaDetailType.PODCAST) {
            const lookupTrackId = track.episodeId ?? track.id;
            const localUri = await getLocalUriForTrack(
                lookupTrackId,
                detail.source.id,
            );
            if (localUri) {
                const playable = buildOfflinePodcastEpisodePlayable(
                    detail,
                    track,
                    localUri,
                );
                const absAuth = serverConnections.find(
                    (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
                );
                if (absAuth && track.itemId) {
                    absContextRef.current = {
                        authentication: absAuth,
                        durationSeconds: track.durationSeconds ?? 0,
                        episodeId: track.episodeId,
                        itemId: track.itemId,
                    };
                } else {
                    absContextRef.current = null;
                }
                await handlePlayItem(playable, [playable], 0);
                return;
            }
        }

        // Multi-file audiobook offline path: when more than one file has been
        // downloaded for this book, build a per-file queue and start at the
        // file that contains the requested chapter / book time. ExoPlayer
        // auto-advances through the queue so playback continues seamlessly
        // across file boundaries.
        if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
            const offlineFiles = await getOfflineAudiobookFiles(
                detail.id,
                detail.source.id,
            );
            if (offlineFiles.length > 1) {
                const targetBookSeconds = track.startSeconds ?? 0;
                const startIndex = pickAudiobookFileIndexForTime(
                    offlineFiles,
                    targetBookSeconds,
                );
                const initialOffsetSeconds = Math.max(
                    0,
                    targetBookSeconds - offlineFiles[startIndex].startOffsetSeconds,
                );
                const queue = offlineFiles.map((file, idx) =>
                    buildOfflineAudiobookPlayable(
                        detail,
                        file,
                        idx === startIndex ? initialOffsetSeconds : 0,
                    ),
                );
                const absAuth = serverConnections.find(
                    (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
                );
                if (absAuth && track.itemId) {
                    const totalDurationSeconds = offlineFiles.reduce(
                        (sum, file) => sum + (file.durationSeconds ?? 0),
                        0,
                    );
                    absContextRef.current = {
                        authentication: absAuth,
                        durationSeconds: totalDurationSeconds,
                        episodeId: undefined,
                        itemId: track.itemId,
                    };
                } else {
                    absContextRef.current = null;
                }
                await handlePlayItem(queue[startIndex], queue, startIndex);
                return;
            }
        }

        try {
            const playable = await loadAndroidMediaTrackPlayback(serverConnections, detail, track);
            const absAuth = serverConnections.find(
                (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
            );

            if (
                absAuth &&
                (playable.source === 'audiobook' || playable.source === 'podcast') &&
                track.itemId
            ) {
                absContextRef.current = {
                    authentication: absAuth,
                    durationSeconds: playable.durationSeconds ?? 0,
                    episodeId: track.episodeId,
                    itemId: track.itemId,
                };
            } else {
                absContextRef.current = null;
            }

            await handlePlayItem(playable, [playable], index);
        } catch (error) {
            setMediaDetailState({
                itemTitle: detail.title,
                message: error instanceof Error ? error.message : 'Playback failed',
                status: 'error',
            });
        }
    };

    const handleShuffleDetailTracks = useCallback(
        async (detail: MobileMediaDetail) => {
            const playableTracks = detail.tracks.flatMap((track) =>
                track.playback ? [track.playback] : [],
            );

            if (playableTracks.length === 0) {
                return;
            }

            const shuffled = [...playableTracks];

            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            await handlePlayItem(shuffled[0], shuffled, 0);
        },
        [handlePlayItem],
    );

    const handleShuffleHomeItems = useCallback(
        async (items: MobileHomeItem[]) => {
            const playableItems = items.flatMap((item) => (item.playback ? [item.playback] : []));

            if (playableItems.length === 0) {
                return;
            }

            const shuffled = [...playableItems];

            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            await handlePlayItem(shuffled[0], shuffled, 0);
        },
        [handlePlayItem],
    );

    const handleAddMediaTrackToPlaylist = async (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => {
        await addAndroidMediaTrackToPlaylist(serverConnections, detail, track, playlist);
        await loadHomeForConnections(serverConnections);
    };

    const getFavoriteKeyForItem = useCallback(
        (item: AndroidRecentContentSourceItem) => getRecentContentItemKey(item),
        [],
    );

    const getFavoriteKeyForTrack = useCallback(
        (track: MobileMediaTrack, sourceId: string | undefined) => {
            return `${sourceId ?? 'server'}:song:${track.id}`;
        },
        [],
    );

    const findAuthForSource = useCallback(
        (sourceId: string | undefined) =>
            serverConnections.find((auth) => getPersistedServerAuthKey(auth) === sourceId),
        [serverConnections],
    );

    const upsertFavoriteKey = (key: string, add: boolean) => {
        setFavoritedKeys((current) => {
            const next = new Set(current);
            if (add) {
                next.add(key);
            } else {
                next.delete(key);
            }
            return next;
        });
    };

    const persistLocalFavoriteToggle = async (
        item: {
            artworkUrl?: string;
            id: string;
            source?: { id: string };
            subtitle?: string;
            title: string;
            type: string;
        },
    ) => {
        let nextFavoritedFlag = false;
        let nextFavorites: AndroidLocalFavoriteItem[] = localFavorites;
        setLocalFavorites((current) => {
            const result = toggleLocalFavorite(current, item);
            nextFavoritedFlag = result.isFavorited;
            nextFavorites = result.favorites;
            return result.favorites;
        });
        upsertFavoriteKey(getLocalFavoriteKey(item), nextFavoritedFlag);
        await saveLocalFavorites(nextFavorites);
        return nextFavoritedFlag;
    };

    const handleToggleFavoriteForTrack = async (
        track: MobileMediaTrack,
        sourceId: string | undefined,
    ) => {
        const key = getFavoriteKeyForTrack(track, sourceId);
        const auth = findAuthForSource(sourceId);

        if (!auth) {
            setContextMenuFeedback('Server for this track is no longer connected.');
            return;
        }

        const isFavoritedNow = favoritedKeys.has(key);

        try {
            if (isFavoritedNow) {
                await unstarSubsonicTrack(auth, track.id);
                upsertFavoriteKey(key, false);
                setContextMenuFeedback('Removed from Favorites');
            } else {
                await starSubsonicTrack(auth, track.id);
                upsertFavoriteKey(key, true);
                setContextMenuFeedback('Added to Favorites');
            }
        } catch (error) {
            setContextMenuFeedback(error instanceof Error ? error.message : 'Favorite failed');
        }
    };

    const handleToggleFavoriteForItem = async (item: AndroidRecentContentSourceItem) => {
        const key = getFavoriteKeyForItem(item);
        const isFavoritedNow = favoritedKeys.has(key);
        const auth = findAuthForSource(item.source?.id);
        const isMusicServer =
            auth?.type === ServerType.NAVIDROME || auth?.type === ServerType.SUBSONIC;
        const useServerStar =
            isMusicServer &&
            auth &&
            (item.type === MobileHomeItemType.ALBUM ||
                item.type === MobileHomeItemType.ARTIST);

        try {
            if (useServerStar && auth) {
                if (item.type === MobileHomeItemType.ALBUM) {
                    if (isFavoritedNow) {
                        await unstarSubsonicAlbum(auth, item.id);
                    } else {
                        await starSubsonicAlbum(auth, item.id);
                    }
                } else {
                    if (isFavoritedNow) {
                        await unstarSubsonicArtist(auth, item.id);
                    } else {
                        await starSubsonicArtist(auth, item.id);
                    }
                }
                upsertFavoriteKey(key, !isFavoritedNow);
                setContextMenuFeedback(
                    !isFavoritedNow ? 'Added to Favorites' : 'Removed from Favorites',
                );
                return;
            }

            const wasFavorited = await persistLocalFavoriteToggle(item);
            setContextMenuFeedback(
                wasFavorited ? 'Added to Favorites' : 'Removed from Favorites',
            );
        } catch (error) {
            setContextMenuFeedback(error instanceof Error ? error.message : 'Favorite failed');
        }
    };

    const handleGoToArtistForTrack = async (
        track: MobileMediaTrack,
        source?: MobileContentSource,
    ) => {
        if (!track.artistId || !source) {
            return;
        }

        const synthetic: MobileHomeItem = {
            id: track.artistId,
            title: track.artist ?? 'Artist',
            type: MobileHomeItemType.ARTIST,
            source,
        };

        setContextMenuTarget(null);
        // The action is reachable from the fullscreen player overflow; without
        // dismissing it first the new detail page would load behind the modal.
        setIsFullPlayerOpen(false);
        await handleSelectMediaItem(synthetic);
    };

    const handleGoToAlbumForTrack = async (
        track: MobileMediaTrack,
        source?: MobileContentSource,
    ) => {
        if (!track.albumId || !source) {
            return;
        }

        const synthetic: MobileHomeItem = {
            id: track.albumId,
            title: track.album ?? 'Album',
            type: MobileHomeItemType.ALBUM,
            source,
        };

        setContextMenuTarget(null);
        setIsFullPlayerOpen(false);
        await handleSelectMediaItem(synthetic);
    };

    const handleStartSongRadio = async (
        track: MobileMediaTrack,
        source: MobileContentSource | undefined,
    ) => {
        if (track.playback?.source !== 'music' || !source) {
            setContextMenuFeedback('Song Radio is only available for music tracks.');
            return;
        }
        const auth = findAuthForSource(source.id);
        if (!auth) {
            setContextMenuFeedback('The server for this song is no longer connected.');
            return;
        }

        setContextMenuTarget(null);

        try {
            const radioQueue = await loadSongRadioQueue({
                authentication: auth,
                seed: {
                    albumId: track.albumId,
                    artist: track.artist,
                    artistId: track.artistId,
                    songId: track.id,
                },
            });

            // Always lead with the seed song so the user hears it first.
            const seedPlayback = track.playback;
            const queue = seedPlayback
                ? [seedPlayback, ...radioQueue.filter((item) => item.id !== seedPlayback.id)]
                : radioQueue;

            if (queue.length === 0) {
                setContextMenuFeedback('No similar songs were returned by the server.');
                return;
            }

            absContextRef.current = null;
            await handlePlayItem(queue[0], queue, 0);
        } catch (error) {
            setContextMenuFeedback(
                error instanceof Error ? error.message : 'Could not start Song Radio.',
            );
        }
    };

    const reportDownloadResult = useCallback(
        (
            result: { enqueued: number; reason?: string; skipped: number },
            _kindWord: string,
        ) => {
            // Only surface hard failures. The Spotify-style circular glyph and
            // the Downloads tab show progress / completion visually now.
            if (result.reason) {
                Alert.alert('Download', result.reason);
            }
        },
        [],
    );

    const handleDownloadCollectionItem = async (
        item: AndroidRecentContentSourceItem,
    ) => {
        setContextMenuTarget(null);
        // Three-layer detail lookup: in-memory → fs cache → network.
        const cacheKey = getRecentContentItemKey(item);
        let detail: MobileMediaDetail | undefined =
            mediaDetailCacheRef.current.get(cacheKey);
        if (!detail) {
            const fromDisk = await loadCachedMediaDetail(cacheKey);
            if (fromDisk) {
                detail = fromDisk;
                mediaDetailCacheRef.current.set(cacheKey, fromDisk);
            }
        }
        if (!detail) {
            const next = await loadAndroidMediaDetail(serverConnections, item);
            if (next.status === 'loaded') {
                mediaDetailCacheRef.current.set(cacheKey, next.detail);
                void saveCachedMediaDetail(cacheKey, next.detail);
                detail = next.detail;
            } else {
                Alert.alert('Download', 'Could not load detail to start the download.');
                return;
            }
        }
        const result = await enqueueCollectionDownload(detail, serverConnections);
        const kindWord =
            detail.type === MobileMediaDetailType.AUDIOBOOK
                ? 'audiobook file'
                : detail.type === MobileMediaDetailType.PLAYLIST
                  ? 'track'
                  : 'track';
        reportDownloadResult(result, kindWord);
    };

    const handleDownloadSongTrack = async (
        track: MobileMediaTrack,
        detail: MobileMediaDetail | undefined,
        source: MobileContentSource | undefined,
    ) => {
        setContextMenuTarget(null);

        // Audiobook chapter long-press → download the whole book. Individual
        // chapter files don't exist as separate downloads.
        if (detail?.type === MobileMediaDetailType.AUDIOBOOK) {
            const result = await enqueueCollectionDownload(detail, serverConnections);
            reportDownloadResult(result, 'audiobook file');
            return;
        }

        // Podcast episode long-press → download just that episode.
        if (detail?.type === MobileMediaDetailType.PODCAST) {
            const outcome = await enqueueSinglePodcastEpisodeDownload(
                detail,
                track,
                serverConnections,
            );
            if (outcome.reason) {
                Alert.alert('Download', outcome.reason);
            }
            return;
        }

        // Music track. Use the source we have.
        if (!source) {
            Alert.alert(
                'Download',
                'Could not figure out which server this track belongs to.',
            );
            return;
        }
        const outcome = await enqueueSingleMusicTrackDownload(
            track,
            source,
            track.artworkUrl ?? detail?.artworkUrl,
            serverConnections,
        );
        if (outcome.reason) {
            Alert.alert('Download', outcome.reason);
        }
    };

    const handleOpenStreamInfo = (item: AndroidRecentContentSourceItem) => {
        setContextMenuTarget(null);
        setStreamInfoItem(item);
    };

    const handleViewDetailForItem = async (item: AndroidRecentContentSourceItem) => {
        setContextMenuTarget(null);
        // Bypass the playback-on-tap shortcut so we always land on the detail page.
        recordRecentContentItem(item);
        await loadDetailWithCache(item);
    };

    const handleOpenBookInfo = async (
        item: AndroidRecentContentSourceItem,
        variant: 'audiobook' | 'podcast',
    ) => {
        setContextMenuTarget(null);
        setBookInfoState({ item, status: 'loading', variant });
        const next = await loadAndroidMediaDetail(serverConnections, item);

        if (next.status === 'loaded') {
            setBookInfoState({ detail: next.detail, item, status: 'loaded', variant });
        } else if (next.status === 'error') {
            setBookInfoState({ item, message: next.message, status: 'error', variant });
        } else {
            setBookInfoState({ status: 'idle' });
        }
    };

    const handleOpenAddToPlaylistForSong = (
        track: MobileMediaTrack,
        sourceId: string | undefined,
    ) => {
        if (!sourceId) {
            setContextMenuFeedback('Could not find the server for this song.');
            return;
        }
        if (track.playback?.source !== 'music') {
            setContextMenuFeedback('Only music tracks can be added to playlists.');
            return;
        }
        setContextMenuTarget(null);
        setPlaylistMenuRoot({ kind: 'track', sourceId, track });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleOpenAddToPlaylistForCollection = (
        collectionItem: AndroidRecentContentSourceItem,
    ) => {
        const sourceId = collectionItem.source?.id;
        if (!sourceId) {
            setContextMenuFeedback('Could not find the server for this item.');
            return;
        }
        const auth = findAuthForSource(sourceId);
        if (
            !auth ||
            (auth.type !== ServerType.NAVIDROME && auth.type !== ServerType.SUBSONIC)
        ) {
            setContextMenuFeedback(
                'Adding to playlists is only available for music server items.',
            );
            return;
        }
        setContextMenuTarget(null);
        setPlaylistMenuRoot({ collectionItem, kind: 'collection', sourceId });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleAddToPlaylistFromRoot = async (playlist: MobileHomeItem) => {
        if (!playlistMenuRoot) {
            return;
        }

        if (playlist.source?.id !== playlistMenuRoot.sourceId) {
            setPlaylistMenuRootState({
                message: 'Choose a playlist from the same music server.',
                status: 'error',
            });
            return;
        }

        const auth = findAuthForSource(playlistMenuRoot.sourceId);

        if (!auth) {
            setPlaylistMenuRootState({
                message: 'The server for this item is no longer connected.',
                status: 'error',
            });
            return;
        }

        setPlaylistMenuRootState({ playlistId: playlist.id, status: 'loading' });
        try {
            let songIds: string[];

            if (playlistMenuRoot.kind === 'track') {
                songIds = [playlistMenuRoot.track.id];
            } else {
                const sourceDetail = await loadMobileMediaDetail({
                    authentication: auth,
                    id: playlistMenuRoot.collectionItem.id,
                    type:
                        playlistMenuRoot.collectionItem.type === MobileHomeItemType.PLAYLIST
                            ? MobileMediaDetailType.PLAYLIST
                            : MobileMediaDetailType.ALBUM,
                });
                songIds = sourceDetail.tracks
                    .filter((track) => track.playback?.source === 'music')
                    .map((track) => track.id);
                if (songIds.length === 0) {
                    setPlaylistMenuRootState({
                        message: 'No music tracks were found to add.',
                        status: 'error',
                    });
                    return;
                }
            }

            await addMobileTracksToPlaylist({
                authentication: auth,
                playlistId: playlist.id,
                songIds,
            });
            await loadHomeForConnections(serverConnections);
            const addedCount = songIds.length;
            setPlaylistMenuRootState({
                message:
                    addedCount === 1
                        ? `Added to ${playlist.title}`
                        : `Added ${addedCount} songs to ${playlist.title}`,
                status: 'success',
            });
        } catch (error) {
            setPlaylistMenuRootState({
                message: error instanceof Error ? error.message : 'Failed to add to playlist',
                status: 'error',
            });
        }
    };

    const mediaContextMenuApi = useMemo<MediaContextMenuApi>(
        () => ({
            openForItem: (item, options) => {
                if (isSongSearchItem(item)) {
                    triggerImpact('medium');
                    setContextMenuFeedback(null);
                    setContextMenuTarget({
                        kind: 'song',
                        source: item.source,
                        suppressDownloadAction: options?.suppressDownloadAction,
                        suppressOpenAction: options?.suppressOpenAction,
                        track: synthesizeTrackFromSongItem(item),
                    });
                    return;
                }
                const kind = inferContextMenuKindFromItem(item);
                if (!kind) {
                    return;
                }
                triggerImpact('medium');
                setContextMenuFeedback(null);
                setContextMenuTarget({
                    item,
                    kind,
                    suppressDownloadAction: options?.suppressDownloadAction,
                    suppressOpenAction: options?.suppressOpenAction,
                });
            },
            openForTrack: (track, detail) => {
                triggerImpact('medium');
                setContextMenuFeedback(null);
                setContextMenuTarget({
                    detail,
                    kind: 'song',
                    source: detail?.source,
                    track,
                });
            },
        }),
        [],
    );

    const handleTogglePlayback = async () => {
        if (playbackState.status === 'idle' || playbackState.status === 'error') {
            // Force a full re-play when the previous session errored out, not
            // just a resume — that goes through ensurePlayer on the native side
            // which detects the stuck playerError and rebuilds the ExoPlayer
            // from scratch. Resume alone would dispatch to a wedged player.
            const fallback =
                playbackState.status === 'error' ? playbackState.item : lastPlayedItem;
            if (fallback) {
                await playQueuedItem(fallback, [fallback], 0);
            }
            return;
        }

        try {
            if (playbackState.status === 'playing' || playbackState.status === 'buffering') {
                await pauseAndroidAudio();
                setPlaybackState({ ...playbackState, status: 'paused' });

                const absCtx = absContextRef.current;

                if (absCtx) {
                    void syncAbsProgressImmediate(
                        absCtx,
                        (playbackState.positionMs ?? 0) / 1000,
                    );
                }

                return;
            }

            await resumeAndroidAudio();
            setPlaybackState({ ...playbackState, status: 'playing' });
        } catch (error) {
            setPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Playback command failed',
                status: 'error',
            });
        }
    };

    const handleSeekPlayback = async (positionMs: number) => {
        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const durationMs = getPlaybackDurationMs(playbackState);
        const nextPositionMs = clamp(positionMs, 0, durationMs ?? Math.max(0, positionMs));

        setPlaybackState((current) =>
            current.status === 'idle' ? current : { ...current, positionMs: nextPositionMs },
        );

        try {
            const event = await seekAndroidAudio(nextPositionMs);
            const absCtx = absContextRef.current;

            if (absCtx) {
                void syncAbsProgressImmediate(absCtx, nextPositionMs / 1000);
            }

            setPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                return {
                    ...current,
                    bitPerfect: event.bitPerfect ?? current.bitPerfect,
                    durationMs: getPlaybackEventDurationMs(event, current.item),
                    message: event.message ?? current.message,
                    positionMs: nextPositionMs,
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
        } catch (error) {
            setPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Seek failed',
                status: 'error',
            });
        }
    };

    const handleSkipPlayback = async (offsetSeconds: number) => {
        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        await handleSeekPlayback((playbackState.positionMs ?? 0) + offsetSeconds * 1000);
    };

    const handleToggleShuffle = useCallback(() => {
        setIsShuffled((current) => {
            const next = !current;
            const queue = playbackQueueRef.current;

            if (next && queue) {
                // Shuffle only the items AFTER the currently-playing index — moving
                // the current track would feel like an unwanted skip.
                const before = queue.items.slice(0, queue.index + 1);
                const after = [...queue.items.slice(queue.index + 1)];
                for (let i = after.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [after[i], after[j]] = [after[j], after[i]];
                }
                playbackQueueRef.current = { index: queue.index, items: [...before, ...after] };
            }

            // Turning shuffle off does not restore the original order (matches Apple
            // Music behavior). Pick the album again to get sequential playback.
            return next;
        });
    }, []);

    const handleNavigatePlayback = async (direction: -1 | 1) => {
        if (playbackState.status === 'idle') {
            return;
        }

        const segmentTargetMs = getAdjacentSegmentTargetMs(
            playbackState.item.timelineSegments,
            playbackState.positionMs ?? 0,
            direction,
        );

        if (segmentTargetMs !== undefined) {
            await handleSeekPlayback(segmentTargetMs);
            return;
        }

        if (direction === -1 && (playbackState.positionMs ?? 0) > 3000) {
            await handleSeekPlayback(0);
            return;
        }

        const queue = playbackQueueRef.current;
        const nextIndex = queue ? queue.index + direction : -1;
        const nextItem = queue?.items[nextIndex];

        if (queue && nextItem) {
            await playQueuedItem(nextItem, queue.items, nextIndex);
        }
    };

    const handleSyncWithServer = useCallback(async (): Promise<{
        message?: string;
        ok: boolean;
    }> => {
        if (serverConnections.length === 0) {
            return { message: 'No servers connected', ok: false };
        }
        try {
            // Three coordinated calls per sync. Loading home content first so
            // the rest of the app's view of the libraries is fresh, then
            // pushing any locally-pending audiobookshelf progress so the
            // server gets caught up on whatever happened offline.
            //
            // Memory cache for artwork gets flushed too — disk cache stays
            // since covers don't change unless the user re-uploads them, but
            // the in-memory LRU might be holding decoded bitmaps for items
            // whose URL changed (server moved coverArt to a different id).
            // This is the only point in the app where we deliberately
            // invalidate; everything else trusts the cache.
            await ExpoImage.clearMemoryCache();
            await loadHomeForConnections(serverConnections);
            await flushPendingAbsProgress(serverConnections);
            // If there's a currently-active audiobook context, re-read its
            // progress from the server in case another client moved ahead.
            const absCtx = absContextRef.current;
            if (absCtx) {
                const fresh = await loadAbsCurrentProgress(
                    absCtx.authentication,
                    absCtx.itemId,
                    absCtx.episodeId,
                );
                const currentPosMs =
                    playbackState.status !== 'idle'
                        ? (playbackState.positionMs ?? 0)
                        : 0;
                if (
                    fresh &&
                    fresh.currentTimeSeconds * 1000 > currentPosMs + 5_000
                ) {
                    // Only seek forward and only if the gap is meaningful; a
                    // 5-second buffer keeps us from interrupting playback when
                    // local and server values trivially differ.
                    await handleSeekPlayback(fresh.currentTimeSeconds * 1000);
                }
            }
            return { ok: true };
        } catch (error) {
            return {
                message:
                    error instanceof Error ? error.message : 'Sync failed',
                ok: false,
            };
        }
    }, [loadHomeForConnections, playbackState, serverConnections]);

    const contextMenuActions = useMemo<MediaContextMenuAction[]>(() => {
        if (!contextMenuTarget) {
            return [];
        }

        const actions: MediaContextMenuAction[] = [];

        if (contextMenuTarget.kind === 'song') {
            const { source, track } = contextMenuTarget;
            const favoriteKey = getFavoriteKeyForTrack(track, source?.id);
            const isFavorited = favoritedKeys.has(favoriteKey);
            actions.push({
                icon: <HeartGlyph color={isFavorited ? colors.accent : colors.text} filled={isFavorited} />,
                id: 'favorite',
                label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
                onPress: () => void handleToggleFavoriteForTrack(track, source?.id),
            });
            if (track.playback?.source === 'music' && source) {
                actions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'playlist',
                    label: 'Add to Playlist',
                    onPress: () => handleOpenAddToPlaylistForSong(track, source.id),
                });
            }
            if (track.artistId && source) {
                actions.push({
                    icon: <PersonGlyph color={colors.text} />,
                    id: 'go-artist',
                    label: 'Go to Artist',
                    onPress: () => void handleGoToArtistForTrack(track, source),
                });
            }
            if (track.albumId && source) {
                actions.push({
                    icon: <DiscGlyph color={colors.text} />,
                    id: 'go-album',
                    label: 'Go to Album',
                    onPress: () => void handleGoToAlbumForTrack(track, source),
                });
            }
            if (track.playback?.source === 'music' && source) {
                actions.push({
                    icon: <RadioWaveGlyph color={colors.text} />,
                    id: 'song-radio',
                    label: 'Start Song Radio',
                    onPress: () => void handleStartSongRadio(track, source),
                });
            }

            // Download label is media-aware: chapter long-press → "Download
            // audiobook" (whole-book file is the only granularity ABS exposes);
            // episode long-press → "Download episode"; everything else →
            // "Download" (single music track).
            const detail = contextMenuTarget.detail;
            const downloadLabel =
                detail?.type === MobileMediaDetailType.AUDIOBOOK
                    ? 'Download audiobook'
                    : detail?.type === MobileMediaDetailType.PODCAST
                      ? 'Download episode'
                      : 'Download';
            const canDownload =
                detail?.type === MobileMediaDetailType.AUDIOBOOK ||
                detail?.type === MobileMediaDetailType.PODCAST ||
                track.playback?.source === 'music';
            if (canDownload && !contextMenuTarget.suppressDownloadAction) {
                actions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label: downloadLabel,
                    onPress: () =>
                        void handleDownloadSongTrack(track, detail, source),
                });
            }

            return actions;
        }

        const item = contextMenuTarget.item;
        const favoriteKey = getFavoriteKeyForItem(item);
        const isFavorited = favoritedKeys.has(favoriteKey);
        actions.push({
            icon: <HeartGlyph color={isFavorited ? colors.accent : colors.text} filled={isFavorited} />,
            id: 'favorite',
            label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
            onPress: () => void handleToggleFavoriteForItem(item),
        });

        const suppressOpen = contextMenuTarget.suppressOpenAction === true;

        const suppressDownload = contextMenuTarget.suppressDownloadAction === true;

        if (contextMenuTarget.kind === 'audiobook') {
            actions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'book-info',
                label: 'Book Information',
                onPress: () => void handleOpenBookInfo(item, 'audiobook'),
            });
            if (!suppressDownload) {
                actions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label: 'Download audiobook',
                    onPress: () => void handleDownloadCollectionItem(item),
                });
            }
            if (!suppressOpen) {
                actions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'view-chapters',
                    label: 'View Chapters',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'podcast') {
            actions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'podcast-info',
                label: 'Podcast Info',
                onPress: () => void handleOpenBookInfo(item, 'podcast'),
            });
            if (!suppressOpen) {
                actions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'view-episodes',
                    label: 'View Episodes',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'radio') {
            actions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'stream-info',
                label: 'Stream Information',
                onPress: () => handleOpenStreamInfo(item),
            });
        } else if (
            contextMenuTarget.kind === 'album' ||
            contextMenuTarget.kind === 'playlist'
        ) {
            const auth = findAuthForSource(item.source?.id);
            if (
                auth &&
                (auth.type === ServerType.NAVIDROME || auth.type === ServerType.SUBSONIC)
            ) {
                actions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'add-collection-to-playlist',
                    label: 'Add to Playlist',
                    onPress: () => handleOpenAddToPlaylistForCollection(item),
                });
            }
            if (!suppressDownload) {
                actions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label:
                        contextMenuTarget.kind === 'album'
                            ? 'Download album'
                            : 'Download playlist',
                    onPress: () => void handleDownloadCollectionItem(item),
                });
            }
            if (!suppressOpen) {
                actions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'open',
                    label: contextMenuTarget.kind === 'album' ? 'Open Album' : 'Open Playlist',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'artist') {
            if (!suppressOpen) {
                actions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'open',
                    label: 'Open Artist',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        }

        return actions;
    }, [
        contextMenuTarget,
        favoritedKeys,
        getFavoriteKeyForItem,
        getFavoriteKeyForTrack,
    ]);

    const contextMenuEyebrow = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? 'Song'
            : contextMenuTarget.kind === 'audiobook'
              ? 'Audiobook'
              : contextMenuTarget.kind.charAt(0).toUpperCase() + contextMenuTarget.kind.slice(1)
        : '';

    const contextMenuArtworkUrl = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.artworkUrl ?? contextMenuTarget.detail?.artworkUrl
            : contextMenuTarget.item.artworkUrl
        : undefined;

    const contextMenuIsCircularArtwork =
        contextMenuTarget?.kind === 'artist';

    const contextMenuTitle = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.title
            : contextMenuTarget.item.title
        : '';

    const contextMenuSubtitle = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.artist ??
              contextMenuTarget.track.subtitle ??
              undefined
            : contextMenuTarget.item.subtitle
        : undefined;

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
        <ErrorBoundary label="App">
        <MediaContextMenuContext.Provider value={mediaContextMenuApi}>
        <View style={styles.safeArea}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <View style={styles.root}>
                    {activeUtilityScreen === 'view-all' && viewAllRoute ? (
                        // ViewAllScreen renders its own FlatList — keep it
                        // outside the surrounding ScrollView so RN doesn't
                        // warn about nested VirtualizedLists with the same
                        // orientation (which also disables windowing).
                        <ErrorBoundary label="ViewAllScreen">
                            <ViewAllScreen
                                fullState={viewAllFullState}
                                onBack={() => {
                                    setActiveUtilityScreen(null);
                                    setViewAllRoute(null);
                                    viewAllFetchTokenRef.current += 1;
                                    setViewAllFullState({ status: 'idle' });
                                }}
                                onSelectItem={(item) => {
                                    // Close the View All screen before kicking
                                    // off media-detail navigation; otherwise
                                    // activeUtilityScreen stays 'view-all' and
                                    // the detail page never gets a render slot.
                                    // That was the "nothing happens" tap bug.
                                    setActiveUtilityScreen(null);
                                    setViewAllRoute(null);
                                    viewAllFetchTokenRef.current += 1;
                                    setViewAllFullState({ status: 'idle' });
                                    void handleSelectMediaItem(item);
                                }}
                                route={viewAllRoute}
                            />
                        </ErrorBoundary>
                    ) : (
                    <ScrollView contentContainerStyle={styles.content}>
                        {activeTab === 'home' &&
                        activeUtilityScreen === null &&
                        mediaDetailState.status === 'idle' &&
                        !isSearchOverlayOpen ? (
                            <View style={styles.header}>
                                <Text style={styles.homeHeaderTitle}>Home</Text>
                                <Pressable
                                    accessibilityLabel="Settings"
                                    accessibilityRole="button"
                                    onPress={() => {
                                        setActiveUtilityScreen('settings');
                                        setMediaDetailState({ status: 'idle' });
                                    }}
                                    style={styles.appIconButton}
                                >
                                    <Image source={samoLogo} style={styles.appIcon} />
                                </Pressable>
                            </View>
                        ) : null}
                        {activeUtilityScreen === 'settings' ? (
                            <SettingsScreen
                                isOfflineMode={isOfflineMode}
                                onOpenDownloads={() => setActiveUtilityScreen('downloads')}
                                onOpenManageServers={() =>
                                    setActiveUtilityScreen('manage-servers')
                                }
                                onSyncWithServer={handleSyncWithServer}
                                onToggleOfflineMode={(next) => {
                                    setIsOfflineMode(next);
                                    void saveOfflineModePreference(next);
                                }}
                                serverCount={serverConnections.length}
                            />
                        ) : activeUtilityScreen === 'manage-servers' ? (
                            <ManageServersScreen
                                authState={authState}
                                onAddServer={() => setActiveUtilityScreen('add-server')}
                                onDisconnect={handleDisconnect}
                                serverConnections={serverConnections}
                                serverHealthByKey={serverHealthByKey}
                            />
                        ) : activeUtilityScreen === 'downloads' ? (
                            <DownloadsScreen serverConnections={serverConnections} />
                        ) : activeUtilityScreen === 'add-server' ? (
                            <AddServerScreen
                                authState={authState}
                                canConnect={canConnect}
                                onBack={() => setActiveUtilityScreen('manage-servers')}
                                onConnect={handleConnect}
                                onPasswordChange={setPassword}
                                onServerTypeChange={setServerType}
                                onServerUrlChange={setServerUrl}
                                onUsernameChange={setUsername}
                                password={password}
                                serverType={serverType}
                                serverUrl={serverUrl}
                                username={username}
                            />
                        ) : mediaDetailState.status !== 'idle' ? (
                            <MediaDetailContent
                                homeContentState={homeContentState}
                                mediaDetailState={mediaDetailState}
                                onAddTrackToPlaylist={handleAddMediaTrackToPlaylist}
                                onBack={() => setMediaDetailState({ status: 'idle' })}
                                onSelectItem={handleSelectMediaItem}
                                onPlayTrack={handlePlayMediaTrack}
                                onShufflePlay={handleShuffleDetailTracks}
                                serverConnections={serverConnections}
                            />
                        ) : activeTab === 'home' ? (
                            <HomeScreen
                                homeContentState={visibleHomeContentState}
                                onManageServers={() => setActiveUtilityScreen('manage-servers')}
                                onSelectItem={handleSelectMediaItem}
                                onViewAll={handleOpenViewAll}
                                recentItems={visibleRecentItems}
                                serverConnections={serverConnections}
                            />
                        ) : activeTab === 'playlists' ? (
                            <PlaylistsScreen
                                homeContentState={visibleHomeContentState}
                                onSelectItem={handleSelectMediaItem}
                                onShufflePlay={handleShuffleHomeItems}
                                recentItems={visibleRecentItems}
                            />
                        ) : activeTab === 'library' ? (
                            <LibraryScreen
                                hasServerConnections={serverConnections.length > 0}
                                homeContentState={visibleHomeContentState}
                                onSelectItem={handleSelectMediaItem}
                                recentItems={visibleRecentItems}
                            />
                        ) : activeTab === 'search' ? (
                            <SearchScreen
                                hasServerConnections={serverConnections.length > 0}
                                homeContentState={visibleHomeContentState}
                                onSearch={handleSearch}
                                onSelectItem={handleSelectMediaItem}
                                onSelectRecentItem={handleSelectMediaItem}
                                recentItems={visibleRecentItems}
                                searchState={searchState}
                                serverConnections={serverConnections}
                            />
                        ) : activeTab === 'radio' ? (
                            <RadioScreen
                                homeContentState={visibleHomeContentState}
                                onSelectItem={handleSelectMediaItem}
                                playbackState={playbackState}
                                recentItems={visibleRecentItems}
                            />
                        ) : (
                            <EmptyServerBackedScreen tabTitle={title} />
                        )}
                    </ScrollView>
                    )}
                    <MiniPlayer
                        lastPlayedItem={lastPlayedItem}
                        onOpenFullPlayer={() => setIsFullPlayerOpen(true)}
                        onTogglePlayback={handleTogglePlayback}
                        playbackState={playbackState}
                        playerProgress={playerProgress}
                        reducedMotion={reducedMotion}
                    />
                    <ErrorBoundary
                        fallback={(error, retry) => (
                            // If the fullscreen player throws, just dismiss it
                            // rather than blocking the whole app. The user can
                            // still see the miniplayer and tap to reopen.
                            <View style={styles.errorBoundaryRoot}>
                                <Text style={styles.errorBoundaryTitle}>Player error</Text>
                                <Text style={styles.errorBoundarySubtitle}>{error.message}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => {
                                        setIsFullPlayerOpen(false);
                                        retry();
                                    }}
                                    style={styles.errorBoundaryButton}
                                >
                                    <Text style={styles.errorBoundaryButtonText}>Dismiss</Text>
                                </Pressable>
                            </View>
                        )}
                        label="FullScreenPlayer"
                    >
                        <FullScreenPlayer
                            isShuffled={isShuffled}
                            lastPlayedItem={lastPlayedItem}
                            onClose={() => setIsFullPlayerOpen(false)}
                            onNext={() => void handleNavigatePlayback(1)}
                            onPrevious={() => void handleNavigatePlayback(-1)}
                            onSeek={(positionMs) => void handleSeekPlayback(positionMs)}
                            onTogglePlayback={handleTogglePlayback}
                            onToggleShuffle={handleToggleShuffle}
                            playerProgress={playerProgress}
                            reducedMotion={reducedMotion}
                            serverConnections={serverConnections}
                            playbackState={playbackState}
                            queue={playbackQueueRef.current}
                            visible={isFullPlayerOpen}
                        />
                    </ErrorBoundary>
                    {isSearchOverlayOpen ? (
                        <SearchOverlay
                            homeContentState={homeContentState}
                            onClose={() => {
                                setIsSearchOverlayOpen(false);
                                setSearchOverlayQuery('');
                            }}
                            onSearch={(q) => {
                                setSearchOverlayQuery(q);
                                void handleSearch(q);
                            }}
                            onSelectItem={(item) => {
                                setIsSearchOverlayOpen(false);
                                setSearchOverlayQuery('');
                                handleSelectMediaItem(item);
                            }}
                            query={searchOverlayQuery}
                            recentItems={recentContentItems}
                            searchState={searchState}
                            serverConnections={serverConnections}
                        />
                    ) : null}
                    <View style={styles.tabBar}>
                        {SAMO_MOBILE_TABS.map((tab) => {
                            const isActive = tab.id === activeTab;
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={tab.id}
                                    onPress={() => {
                                        setActiveUtilityScreen(null);
                                        setMediaDetailState({ status: 'idle' });
                                        setActiveTab(tab.id);
                                    }}
                                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                                >
                                    <TabIcon active={isActive} id={tab.id} />
                                    <Text
                                        style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                                    >
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </KeyboardAvoidingView>
            <MediaContextMenu
                actions={contextMenuActions}
                artworkUrl={contextMenuArtworkUrl}
                eyebrow={contextMenuEyebrow}
                feedback={contextMenuFeedback}
                isCircularArtwork={contextMenuIsCircularArtwork}
                onClose={() => {
                    setContextMenuTarget(null);
                    setContextMenuFeedback(null);
                }}
                subtitle={contextMenuSubtitle}
                target={contextMenuTarget}
                title={contextMenuTitle}
            />
            <StreamInfoModal item={streamInfoItem} onClose={() => setStreamInfoItem(null)} />
            <BookInformationModal
                onClose={() => setBookInfoState({ status: 'idle' })}
                state={bookInfoState}
            />
            <TrackPlaylistMenu
                actionState={playlistMenuRootState}
                onAddToPlaylist={(playlist) => void handleAddToPlaylistFromRoot(playlist)}
                onClose={() => {
                    setPlaylistMenuRoot(null);
                    setPlaylistMenuRootState({ status: 'idle' });
                }}
                playlists={getPlaylistTargetsForRoot(homeContentState, playlistMenuRoot?.sourceId)}
                track={
                    playlistMenuRoot
                        ? playlistMenuRoot.kind === 'track'
                            ? playlistMenuRoot.track
                            : ({
                                  id: playlistMenuRoot.collectionItem.id,
                                  title: playlistMenuRoot.collectionItem.title,
                              } as MobileMediaTrack)
                        : null
                }
            />
        </View>
        </MediaContextMenuContext.Provider>
        </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

const getPlaylistTargetsForRoot = (
    homeContentState: AndroidHomeContentState,
    sourceId: string | undefined,
) => {
    if (!sourceId || homeContentState.status !== 'loaded') {
        return [];
    }
    const playlistSection = homeContentState.content.sections.find(
        (section) => section.id === MobileHomeSectionId.PLAYLISTS,
    );
    return (
        playlistSection?.items.filter(
            (item) => item.type === MobileHomeItemType.PLAYLIST && item.source?.id === sourceId,
        ) ?? []
    );
};

const SearchOverlay = ({
    homeContentState,
    onClose,
    onSearch,
    onSelectItem,
    query,
    recentItems,
    searchState,
    serverConnections,
}: {
    homeContentState: AndroidHomeContentState;
    onClose: () => void;
    onSearch: (q: string) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    query: string;
    recentItems: AndroidRecentContentItem[];
    searchState: AndroidSearchState;
    serverConnections: ServerAuthenticationResult[];
}) => {
    const inputRef = useRef<TextInput>(null);
    const availableScopes = useMemo(
        () => getAvailableSearchScopes(homeContentState, serverConnections, recentItems),
        [homeContentState, recentItems, serverConnections],
    );
    const [activeScope, setActiveScope] = useState<SearchScope>('all');

    useEffect(() => {
        const id = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        if (!availableScopes.some((s) => s.id === activeScope)) setActiveScope('all');
    }, [activeScope, availableScopes]);

    return (
        <View style={styles.searchOverlay}>
            <Pressable
                accessibilityLabel="Close search"
                onPress={onClose}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.searchOverlayPanel}>
                <View style={styles.searchOverlayBar}>
                    <SearchGlyph color={colors.muted} />
                    <TextInput
                        autoCapitalize="none"
                        onChangeText={onSearch}
                        placeholder="Find anything in Samo"
                        placeholderTextColor={colors.muted}
                        ref={inputRef}
                        returnKeyType="search"
                        style={styles.searchOverlayInput}
                        value={query}
                    />
                    {searchState.status === 'loading' ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                    ) : query.length > 0 ? (
                        <Pressable
                            accessibilityLabel="Clear"
                            onPress={() => onSearch('')}
                            style={styles.searchOverlayClear}
                        >
                            <ClearGlyph color={colors.muted} />
                        </Pressable>
                    ) : null}
                </View>
                <SearchScopePills
                    activeScope={activeScope}
                    onScopeChange={setActiveScope}
                    scopes={availableScopes}
                />
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.searchOverlayResults}>
                    {query.trim() ? (
                        <SearchResults
                            activeScope={activeScope}
                            onSelectItem={onSelectItem}
                            searchState={searchState}
                        />
                    ) : (
                        <SearchBrowseContent
                            activeScope={activeScope}
                            availableScopes={availableScopes}
                            onScopeChange={setActiveScope}
                            onSelectItem={onSelectItem}
                            recentItems={recentItems.slice(0, 8)}
                        />
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const HOME_FILTER_DEFINITIONS: Array<{ id: HomeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
    { id: 'radio', label: 'Radio' },
];

const filterHomeDisplaySections = (
    sections: HomeDisplaySection[],
    filter: HomeFilter,
): HomeDisplaySection[] => {
    if (filter === 'all') {
        return sections;
    }

    const musicVariants: HomeDisplaySection['variant'][] = ['album', 'artist', 'playlist', 'wide'];
    const podcastVariants: HomeDisplaySection['variant'][] = ['podcast'];
    const audiobookVariants: HomeDisplaySection['variant'][] = ['book'];
    const radioVariants: HomeDisplaySection['variant'][] = ['radio'];
    const continuableVariants: HomeDisplaySection['variant'][] = ['continue'];

    // Recents is mixed-type — keep the section but drop any items that don't
    // belong in the active filter, so picking "Music" actually scrubs
    // podcasts/audiobooks/radio out of the Recently Played strip.
    const itemBelongsTo = (
        item: AndroidRecentContentSourceItem,
        bucket: HomeFilter,
    ): boolean => {
        const type = item.type;
        switch (bucket) {
            case 'all':
                return true;
            case 'music':
                return (
                    type === MobileHomeItemType.ALBUM ||
                    type === MobileHomeItemType.ARTIST ||
                    type === MobileHomeItemType.PLAYLIST ||
                    type === MobileSearchItemType.ALBUM ||
                    type === MobileSearchItemType.ARTIST ||
                    type === MobileSearchItemType.PLAYLIST ||
                    type === MobileSearchItemType.SONG
                );
            case 'podcasts':
                return (
                    type === MobileHomeItemType.PODCAST ||
                    type === MobileSearchItemType.PODCAST
                );
            case 'audiobooks':
                return (
                    type === MobileHomeItemType.AUDIOBOOK ||
                    type === MobileSearchItemType.AUDIOBOOK
                );
            case 'radio':
                return (
                    type === MobileHomeItemType.RADIO ||
                    type === MobileSearchItemType.RADIO
                );
        }
    };
    const filterRecentsItems = (section: HomeDisplaySection) => {
        if (section.variant !== 'recents') return section;
        const filtered = section.items.filter((item) => itemBelongsTo(item, filter));
        return { ...section, items: filtered };
    };
    const dropEmpty = (section: HomeDisplaySection) => section.items.length > 0;

    if (filter === 'music') {
        return sections
            .filter((s) => musicVariants.includes(s.variant) || s.variant === 'recents')
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'podcasts') {
        return sections
            .filter(
                (s) =>
                    podcastVariants.includes(s.variant) ||
                    continuableVariants.includes(s.variant) ||
                    s.variant === 'recents',
            )
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'audiobooks') {
        return sections
            .filter(
                (s) =>
                    audiobookVariants.includes(s.variant) ||
                    continuableVariants.includes(s.variant) ||
                    s.variant === 'recents',
            )
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    if (filter === 'radio') {
        return sections
            .filter((s) => radioVariants.includes(s.variant) || s.variant === 'recents')
            .map(filterRecentsItems)
            .filter(dropEmpty);
    }

    return sections;
};

const getAvailableHomeFilters = (sections: HomeDisplaySection[]) => {
    const variants = new Set(sections.map((s) => s.variant));
    const hasMusicContent =
        variants.has('album') || variants.has('artist') || variants.has('playlist');
    const hasPodcastContent = variants.has('podcast');
    const hasAudiobookContent = variants.has('book');
    const hasRadioContent = variants.has('radio');

    return HOME_FILTER_DEFINITIONS.filter((f) => {
        if (f.id === 'all') return true;
        if (f.id === 'music') return hasMusicContent;
        if (f.id === 'podcasts') return hasPodcastContent;
        if (f.id === 'audiobooks') return hasAudiobookContent;
        if (f.id === 'radio') return hasRadioContent;
        return false;
    });
};

const HomeScreen = ({
    homeContentState,
    onManageServers,
    onSelectItem,
    onViewAll,
    recentItems,
    serverConnections,
}: HomeScreenProps) => {
    const [homeFilter, setHomeFilter] = useState<HomeFilter>('all');

    if (serverConnections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connect Your Library</Text>
                <Text style={styles.mutedText}>
                    Connect Navidrome, Subsonic, or Audiobookshelf to load your real library.
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={onManageServers}
                    style={styles.primaryButton}
                >
                    <Text style={styles.primaryButtonText}>Manage Servers</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <HomeContentStatus
            activeFilter={homeFilter}
            homeContentState={homeContentState}
            onFilterChange={setHomeFilter}
            onSelectItem={onSelectItem}
            onViewAll={onViewAll}
            recentItems={recentItems}
            serverConnections={serverConnections}
        />
    );
};


const SettingsScreen = ({
    isOfflineMode,
    onOpenDownloads,
    onOpenManageServers,
    onSyncWithServer,
    onToggleOfflineMode,
    serverCount,
}: {
    isOfflineMode: boolean;
    onOpenDownloads: () => void;
    onOpenManageServers: () => void;
    onSyncWithServer: () => Promise<{ message?: string; ok: boolean }>;
    onToggleOfflineMode: (next: boolean) => void;
    serverCount: number;
}) => {
    type SyncStatus =
        | { kind: 'error'; message: string }
        | { kind: 'idle' }
        | { kind: 'running' }
        | { kind: 'success' };
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'idle' });
    const handleSyncPress = async () => {
        if (syncStatus.kind === 'running') return;
        setSyncStatus({ kind: 'running' });
        const result = await onSyncWithServer();
        setSyncStatus(
            result.ok
                ? { kind: 'success' }
                : { kind: 'error', message: result.message ?? 'Sync failed' },
        );
    };

    return (
        <View style={styles.settingsRoot}>
            <Text style={styles.settingsRootTitle}>Settings</Text>
            <Pressable
                accessibilityRole="button"
                onPress={onOpenManageServers}
                style={styles.settingsRow}
            >
                <PersonGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>
                        {serverCount === 1 ? 'Manage Server' : 'Manage Servers'}
                    </Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {serverCount === 0
                            ? 'Connect a music server, Audiobookshelf, or radio source'
                            : `${serverCount} connected`}
                    </Text>
                </View>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                disabled={syncStatus.kind === 'running' || serverCount === 0}
                onPress={() => void handleSyncPress()}
                style={styles.settingsRow}
            >
                {syncStatus.kind === 'running' ? (
                    <ActivityIndicator color={colors.text} size="small" />
                ) : (
                    <RadioWaveGlyph color={colors.text} />
                )}
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Sync with Server</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {syncStatus.kind === 'running'
                            ? 'Refreshing libraries and pushing pending progress…'
                            : syncStatus.kind === 'success'
                              ? 'Up to date'
                              : syncStatus.kind === 'error'
                                ? syncStatus.message
                                : 'Refresh libraries and reconcile playback progress'}
                    </Text>
                </View>
            </Pressable>
            <Pressable
                accessibilityRole="button"
                onPress={onOpenDownloads}
                style={styles.settingsRow}
            >
                <DownloadGlyph color={colors.text} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Downloads</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        Manage offline content
                    </Text>
                </View>
            </Pressable>
            <View style={styles.settingsRow}>
                <CheckGlyph color={isOfflineMode ? colors.accent : colors.text} size={16} />
                <View style={styles.settingsRowText}>
                    <Text style={styles.settingsRowTitle}>Offline mode</Text>
                    <Text style={styles.settingsRowSubtitle}>
                        {isOfflineMode
                            ? 'Only downloaded items are shown'
                            : 'Show everything available'}
                    </Text>
                </View>
                <Switch
                    onValueChange={onToggleOfflineMode}
                    thumbColor={isOfflineMode ? colors.accent : '#ffffff'}
                    trackColor={{
                        false: 'rgba(255, 255, 255, 0.18)',
                        true: 'rgba(202, 160, 79, 0.45)',
                    }}
                    value={isOfflineMode}
                />
            </View>
        </View>
    );
};

const ManageServersScreen = ({
    authState,
    onAddServer,
    onDisconnect,
    serverConnections,
    serverHealthByKey,
}: {
    authState: AndroidAuthState;
    onAddServer: () => void;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    serverConnections: ServerAuthenticationResult[];
    serverHealthByKey: AndroidServerHealthMap;
}) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>
                {serverConnections.length === 1 ? 'Manage Server' : 'Manage Servers'}
            </Text>
            <ConnectedServerList
                authState={authState}
                onDisconnect={onDisconnect}
                serverConnections={serverConnections}
                serverHealthByKey={serverHealthByKey}
            />
            <Pressable
                accessibilityRole="button"
                onPress={onAddServer}
                style={styles.primaryButton}
            >
                <Text style={styles.primaryButtonText}>Add Server</Text>
            </Pressable>
        </View>
    );
};

const formatBytes = (bytes: number | undefined): string => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getDownloadStatusLabel = (entry: DownloadEntry): string => {
    if (entry.status === 'downloading') {
        const pct = entry.progress !== undefined ? Math.round(entry.progress * 100) : null;
        return pct !== null ? `Downloading ${pct}%` : 'Downloading…';
    }
    if (entry.status === 'completed') {
        return formatBytes(entry.totalBytes ?? entry.bytesDownloaded) || 'Saved';
    }
    if (entry.status === 'queued') return 'Queued';
    if (entry.status === 'canceled') return 'Canceled';
    return entry.errorMessage ? `Failed: ${entry.errorMessage}` : 'Failed';
};

const DOWNLOAD_STATUS_ORDER: DownloadStatus[] = [
    'downloading',
    'queued',
    'failed',
    'completed',
    'canceled',
];

const DownloadsScreen = ({
    serverConnections,
}: {
    serverConnections: ServerAuthenticationResult[];
}) => {
    const [entries, setEntries] = useState<DownloadEntry[]>([]);
    const [storage, setStorage] = useState<StorageLocationPreference>({
        label: 'Internal storage',
    });
    const [isPickingStorage, setIsPickingStorage] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeDownloads(setEntries);
        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeStorageLocation(setStorage);
        void getStorageLocation().then(setStorage);
        return () => {
            unsubscribe();
        };
    }, []);

    const handlePickSdCard = async () => {
        if (isPickingStorage) return;
        setIsPickingStorage(true);
        try {
            const result = await pickSdCardStorageLocation();
            if (!result) {
                Alert.alert(
                    'SD card not set',
                    'Picking a folder was canceled or your device doesn’t expose an SD card via the system file picker.',
                );
            }
        } finally {
            setIsPickingStorage(false);
        }
    };

    const handleResetStorage = async () => {
        await resetStorageLocation();
    };

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            const orderA = DOWNLOAD_STATUS_ORDER.indexOf(a.status);
            const orderB = DOWNLOAD_STATUS_ORDER.indexOf(b.status);
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return b.enqueuedAt - a.enqueuedAt;
        });
    }, [entries]);

    const grouped = useMemo(() => {
        const map = new Map<
            string,
            { collection: DownloadEntry['collection']; entries: DownloadEntry[] }
        >();
        for (const entry of sortedEntries) {
            const key = `${entry.collection.sourceId}:${entry.collection.id}`;
            const existing = map.get(key);
            if (existing) {
                existing.entries.push(entry);
            } else {
                map.set(key, { collection: entry.collection, entries: [entry] });
            }
        }
        return Array.from(map.values());
    }, [sortedEntries]);

    const totalBytes = useMemo(
        () =>
            sortedEntries.reduce(
                (sum, entry) =>
                    sum +
                    (entry.status === 'completed'
                        ? (entry.totalBytes ?? entry.bytesDownloaded ?? 0)
                        : 0),
                0,
            ),
        [sortedEntries],
    );

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Downloads</Text>
            <Text style={styles.downloadsSummary}>
                {sortedEntries.length === 0
                    ? 'No downloads yet. Tap the download icon on an album, playlist, audiobook, or podcast to save it for offline listening.'
                    : `${sortedEntries.length} ${sortedEntries.length === 1 ? 'item' : 'items'} · ${formatBytes(totalBytes) || '0 MB on disk'}`}
            </Text>
            <View style={styles.downloadsStorageRow}>
                <Text style={styles.downloadsStorageLabel}>Storage location</Text>
                <Text numberOfLines={2} style={styles.downloadsStorageValue}>
                    {storage.treeUri
                        ? storage.label
                        : `Internal · ${getDownloadsRootUri().replace(/^file:\/\//, '')}`}
                </Text>
                <Text style={styles.downloadsStorageNote}>
                    {storage.treeUri
                        ? 'New downloads will be moved to this folder when they finish — long audiobooks too. Existing downloads stay where they are.'
                        : 'Default: app-private internal storage. Pick a folder on your SD card if you want downloads to live there instead.'}
                </Text>
                <View style={styles.downloadsStorageActions}>
                    <Pressable
                        accessibilityRole="button"
                        disabled={isPickingStorage}
                        onPress={() => void handlePickSdCard()}
                        style={[
                            styles.downloadsStorageButton,
                            isPickingStorage && styles.disabledButton,
                        ]}
                    >
                        <Text style={styles.downloadsStorageButtonLabel}>
                            {storage.treeUri ? 'Change folder…' : 'Pick SD card folder…'}
                        </Text>
                    </Pressable>
                    {storage.treeUri ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleResetStorage()}
                            style={styles.downloadsStorageButton}
                        >
                            <Text style={styles.downloadsStorageButtonLabel}>
                                Use internal
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
            {grouped.map((group) => (
                <View
                    key={`${group.collection.sourceId}:${group.collection.id}`}
                    style={styles.downloadGroup}
                >
                    <View style={styles.downloadGroupHeader}>
                        {group.collection.artworkUrl ? (
                            <Image
                                source={{ uri: group.collection.artworkUrl }}
                                style={styles.downloadGroupArtwork}
                            />
                        ) : (
                            <View
                                style={[
                                    styles.downloadGroupArtwork,
                                    styles.downloadGroupArtworkFallback,
                                ]}
                            />
                        )}
                        <View style={styles.downloadGroupText}>
                            <Text numberOfLines={1} style={styles.downloadGroupTitle}>
                                {group.collection.title}
                            </Text>
                            <Text style={styles.downloadGroupSubtitle}>
                                {group.entries.length}{' '}
                                {group.entries.length === 1 ? 'track' : 'tracks'} ·{' '}
                                {group.collection.type}
                            </Text>
                        </View>
                    </View>
                    {group.entries.map((entry) => (
                        <View key={entry.id} style={styles.downloadRow}>
                            <View style={styles.downloadRowText}>
                                <Text numberOfLines={1} style={styles.downloadRowTitle}>
                                    {entry.title}
                                </Text>
                                <Text numberOfLines={1} style={styles.downloadRowStatus}>
                                    {getDownloadStatusLabel(entry)}
                                </Text>
                                {entry.status === 'downloading' &&
                                entry.progress !== undefined ? (
                                    <View style={styles.downloadProgressTrack}>
                                        <View
                                            style={[
                                                styles.downloadProgressFill,
                                                {
                                                    width: `${Math.round(
                                                        (entry.progress ?? 0) * 100,
                                                    )}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.downloadRowActions}>
                                {entry.status === 'failed' ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() =>
                                            void retryDownload(entry.id, serverConnections)
                                        }
                                        style={styles.downloadActionButton}
                                    >
                                        <Text style={styles.downloadActionLabel}>Retry</Text>
                                    </Pressable>
                                ) : null}
                                {entry.status === 'queued' ||
                                entry.status === 'downloading' ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => void cancelDownload(entry.id)}
                                        style={styles.downloadActionButton}
                                    >
                                        <Text style={styles.downloadActionLabel}>Cancel</Text>
                                    </Pressable>
                                ) : null}
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void removeDownload(entry.id)}
                                    style={styles.downloadActionButton}
                                >
                                    <Text
                                        style={[
                                            styles.downloadActionLabel,
                                            styles.downloadActionDestructive,
                                        ]}
                                    >
                                        Remove
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
};

const AddServerScreen = ({
    authState,
    canConnect,
    onBack,
    onConnect,
    onPasswordChange,
    onServerTypeChange,
    onServerUrlChange,
    onUsernameChange,
    password,
    serverType,
    serverUrl,
    username,
}: AddServerScreenProps) => {
    return (
        <View style={styles.section}>
            <Pressable accessibilityRole="button" onPress={onBack} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Back to Servers</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>Add Server</Text>
            <View style={styles.segmentedControl}>
                {SERVER_TYPES.map((type) => {
                    const isSelected = type === serverType;
                    return (
                        <Pressable
                            accessibilityRole="button"
                            key={type}
                            onPress={() => onServerTypeChange(type)}
                            style={[styles.segment, isSelected && styles.segmentActive]}
                        >
                            <Text
                                style={[
                                    styles.segmentLabel,
                                    isSelected && styles.segmentLabelActive,
                                ]}
                            >
                                {type}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
            <TextInput
                autoCapitalize="none"
                inputMode="url"
                onChangeText={onServerUrlChange}
                placeholder="Server URL"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={serverUrl}
            />
            <TextInput
                autoCapitalize="none"
                onChangeText={onUsernameChange}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={username}
            />
            <TextInput
                onChangeText={onPasswordChange}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={styles.input}
                value={password}
            />
            <Pressable
                accessibilityRole="button"
                disabled={!canConnect || authState.status === 'loading'}
                onPress={onConnect}
                style={[
                    styles.primaryButton,
                    (!canConnect || authState.status === 'loading') && styles.disabledButton,
                ]}
            >
                {authState.status === 'loading' ? (
                    <ActivityIndicator color={colors.background} />
                ) : (
                    <Text style={styles.primaryButtonText}>Connect</Text>
                )}
            </Pressable>
            {authState.status === 'error' || authState.status === 'loading' ? (
                <Text style={authState.status === 'error' ? styles.errorText : styles.mutedText}>
                    {authState.message}
                </Text>
            ) : null}
        </View>
    );
};

const ConnectedServerList = ({
    authState,
    onDisconnect,
    serverConnections,
    serverHealthByKey,
}: {
    authState: AndroidAuthState;
    onDisconnect: (authentication: ServerAuthenticationResult) => void;
    serverConnections: ServerAuthenticationResult[];
    serverHealthByKey: AndroidServerHealthMap;
}) => {
    const hasMessage = authState.status === 'error' || authState.status === 'loading';

    if (serverConnections.length === 0) {
        return (
            <>
                {hasMessage ? (
                    <Text
                        style={authState.status === 'error' ? styles.errorText : styles.mutedText}
                    >
                        {authState.message}
                    </Text>
                ) : null}
                <Text style={styles.mutedText}>No server connected.</Text>
            </>
        );
    }

    return (
        <>
            {hasMessage ? (
                <Text style={authState.status === 'error' ? styles.errorText : styles.mutedText}>
                    {authState.message}
                </Text>
            ) : null}
            <View style={styles.connectedServers}>
                {serverConnections.map((connection) => {
                    const connectionKey = getPersistedServerAuthKey(connection);
                    const healthStatus = serverHealthByKey[connectionKey];
                    const isHealthy = healthStatus?.status === ServerConnectionHealthStatus.HEALTHY;
                    const statusMessage = healthStatus?.message ?? 'Session saved.';

                    return (
                        <View key={connectionKey} style={styles.statusPanel}>
                            <Text style={styles.statusTitle}>{connection.title}</Text>
                            <Text
                                style={[
                                    styles.mutedText,
                                    healthStatus && !isHealthy && styles.warningText,
                                ]}
                            >
                                {statusMessage}
                            </Text>
                            <Text style={styles.mutedText}>{connection.url}</Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => onDisconnect(connection)}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>Disconnect</Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>
        </>
    );
};

const LibraryScreen = ({
    hasServerConnections,
    homeContentState,
    onSelectItem,
    recentItems,
}: LibraryScreenProps) => {
    const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');

    if (!hasServerConnections) {
        return <EmptyServerBackedScreen tabTitle="Library" />;
    }

    if (homeContentState.status === 'idle' || homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const baseItems = getBaseLibraryItems(homeContentState);
    const filters = getAvailableLibraryFilters(baseItems, recentItems);
    const rows = getLibraryRows(baseItems, recentItems, activeFilter, '');
    const activeLabel =
        LIBRARY_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? 'All';

    return (
        <View style={styles.libraryScreen}>
            <View style={styles.libraryHeaderRow}>
                <View style={styles.libraryHeaderText}>
                    <Text style={styles.libraryEyebrow}>Your Library</Text>
                    <Text style={styles.librarySummary} numberOfLines={1}>
                        {rows.length} {rows.length === 1 ? 'item' : 'items'} - {activeLabel}
                    </Text>
                </View>
                <View style={styles.librarySortBadge}>
                    <SortGlyph color={colors.muted} />
                    <Text style={styles.librarySortText}>Recents</Text>
                </View>
            </View>
            <LibraryFilterPills
                activeFilter={activeFilter}
                filters={filters}
                onChange={setActiveFilter}
            />
            <View style={styles.libraryList}>
                {rows.length === 0 ? (
                    <View style={styles.libraryEmptyState}>
                        <Text style={styles.mutedText}>Nothing to show here yet.</Text>
                    </View>
                ) : (
                    rows.map((row) => (
                        <LibraryListRow
                            displayItem={row}
                            key={row.key}
                            onPress={() => onSelectItem(row.item)}
                        />
                    ))
                )}
            </View>
        </View>
    );
};

const PlaylistsScreen = ({
    homeContentState,
    onSelectItem,
    onShufflePlay,
    recentItems,
}: PlaylistsScreenProps) => {
    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Playlists" />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const section = getSectionsById(homeContentState, [MobileHomeSectionId.PLAYLISTS])[0];
    const playlists = sortHomeItemsByRecents(section?.items ?? [], recentItems);

    if (playlists.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                <Text style={styles.mutedText}>No server-backed playlists returned.</Text>
            </View>
        );
    }

    const allPlayableItems = playlists.filter((p) => p.playback);

    return (
        <View style={styles.playlistScreen}>
            <View style={styles.playlistTopPanel}>
                <View>
                    <Text style={styles.libraryEyebrow}>Playlists</Text>
                    <Text style={styles.playlistSummary}>
                        {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
                    </Text>
                </View>
                <View style={styles.playlistHeaderActions}>
                    {allPlayableItems.length > 1 ? (
                        <Pressable
                            accessibilityLabel="Shuffle all playlists"
                            accessibilityRole="button"
                            onPress={() => void onShufflePlay(allPlayableItems)}
                            style={styles.playlistPillButton}
                        >
                            <ShuffleGlyph color={colors.background} />
                            <Text style={styles.playlistPillButtonText}>Shuffle</Text>
                        </Pressable>
                    ) : null}
                </View>
            </View>
            <View style={styles.libraryList}>
                {playlists.map((item) => {
                    const displayItem = toLibraryDisplayItem(item);

                    return displayItem ? (
                        <LibraryListRow
                            displayItem={displayItem}
                            key={displayItem.key}
                            onPress={() => onSelectItem(item)}
                        />
                    ) : null;
                })}
            </View>
        </View>
    );
};

const RadioScreen = ({
    homeContentState,
    onSelectItem,
    playbackState,
    recentItems,
}: RadioScreenProps) => {
    const contextMenu = useMediaContextMenu();
    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle="Radio" />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const section = getSectionsById(homeContentState, [MobileHomeSectionId.RADIO])[0];
    const stations = section?.items ?? [];

    if (stations.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Radio</Text>
                <Text style={styles.mutedText}>No server-backed radio stations returned.</Text>
            </View>
        );
    }

    const recentRadioKeys = new Set(
        recentItems
            .filter((r) => r.item.type === MobileHomeItemType.RADIO)
            .map((r) => getRecentContentItemKey(r.item)),
    );
    const mostRecentRadioKey =
        recentItems
            .filter((r) => r.item.type === MobileHomeItemType.RADIO)
            .sort((a, b) => b.selectedAt - a.selectedAt)[0]?.key ?? null;
    const featuredStation =
        (mostRecentRadioKey
            ? stations.find((s) => getRecentContentItemKey(s) === mostRecentRadioKey)
            : undefined) ?? stations[0];
    const otherStations = stations.filter((s) => s !== featuredStation);
    const nowPlayingId =
        playbackState.status !== 'idle' && playbackState.item.source === 'radio'
            ? playbackState.item.id
            : null;
    const featuredIsPlaying =
        nowPlayingId !== null && featuredStation.playback?.id === nowPlayingId;

    return (
        <View style={styles.radioScreen}>
            <Pressable
                accessibilityRole="button"
                onLongPress={() => contextMenu.openForItem(featuredStation)}
                onPress={() => onSelectItem(featuredStation)}
                style={styles.radioHero}
            >
                <View style={styles.radioHeroArtworkWrap}>
                    <MediaArtwork
                        artworkUrl={featuredStation.artworkUrl}
                        mediaType="radio"
                        size="hero"
                        title={featuredStation.title}
                    />
                </View>
                <View style={styles.radioHeroText}>
                    {recentRadioKeys.has(getRecentContentItemKey(featuredStation)) ? (
                        <Text style={styles.radioHeroEyebrow}>Recently played</Text>
                    ) : null}
                    <Text numberOfLines={2} style={styles.radioHeroTitle}>
                        {featuredStation.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.radioHeroSubtitle}>
                        {featuredIsPlaying ? 'Now playing' : 'Radio'}
                    </Text>
                </View>
                {featuredStation.playback ? (
                    <View style={styles.radioHeroPlay}>
                        <PlayPauseGlyph
                            color={colors.background}
                            isPlaying={featuredIsPlaying}
                            size={22}
                        />
                    </View>
                ) : null}
            </Pressable>
            {otherStations.length > 0 ? (
                <>
                    <View style={styles.radioGridHeader}>
                        <Text style={styles.sectionTitle}>All Stations</Text>
                        <Text style={styles.librarySummary}>
                            {stations.length} {stations.length === 1 ? 'station' : 'stations'}
                        </Text>
                    </View>
                    <View style={styles.radioGrid}>
                        {otherStations.map((station) => {
                            const isPlaying = nowPlayingId !== null && station.playback?.id === nowPlayingId;

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={getContentItemKey(station)}
                                    onLongPress={() => contextMenu.openForItem(station)}
                                    onPress={() => onSelectItem(station)}
                                    style={styles.radioCard}
                                >
                                    <MediaArtwork
                                        artworkUrl={station.artworkUrl}
                                        mediaType="radio"
                                        size="card"
                                        title={station.title}
                                    />
                                    <Text numberOfLines={2} style={styles.radioCardTitle}>
                                        {station.title}
                                    </Text>
                                    {isPlaying ? (
                                        <Text style={styles.radioCardNowPlaying}>Now playing</Text>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </>
            ) : null}
        </View>
    );
};

const SEARCH_SCOPE_DEFINITIONS: Array<{ id: SearchScope; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'radio', label: 'Radio' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
];

const SEARCH_SCOPE_SECTION_IDS: Record<SearchScope, MobileSearchSectionId[]> = {
    albums: [MobileSearchSectionId.ALBUMS],
    all: [],
    artists: [MobileSearchSectionId.ARTISTS],
    audiobooks: [MobileSearchSectionId.AUDIOBOOKS],
    music: [
        MobileSearchSectionId.SONGS,
        MobileSearchSectionId.ALBUMS,
        MobileSearchSectionId.ARTISTS,
    ],
    playlists: [MobileSearchSectionId.PLAYLISTS],
    podcasts: [MobileSearchSectionId.PODCASTS],
    radio: [MobileSearchSectionId.RADIO],
};

const getAvailableSearchScopes = (
    homeContentState: AndroidHomeContentState,
    serverConnections: ServerAuthenticationResult[],
    recentItems: AndroidRecentContentItem[],
) => {
    const scopes = new Set<SearchScope>(['all']);
    const hasMusicServer = serverConnections.some(
        (connection) =>
            connection.type === ServerType.NAVIDROME || connection.type === ServerType.SUBSONIC,
    );
    const hasAudiobookshelf = serverConnections.some(
        (connection) => connection.type === ServerType.AUDIOBOOKSHELF,
    );
    const hasLoadedHome = homeContentState.status === 'loaded';

    if (hasMusicServer) {
        scopes.add('music');
        scopes.add('albums');
        scopes.add('artists');
        if (!hasLoadedHome) {
            scopes.add('playlists');
        }
    }

    if (hasAudiobookshelf && !hasLoadedHome) {
        scopes.add('audiobooks');
        scopes.add('podcasts');
    }

    if (hasLoadedHome) {
        homeContentState.content.sections.forEach((section) => {
            if (section.id === MobileHomeSectionId.AUDIOBOOKS) scopes.add('audiobooks');
            if (section.id === MobileHomeSectionId.PLAYLISTS) scopes.add('playlists');
            if (section.id === MobileHomeSectionId.PODCASTS) scopes.add('podcasts');
            if (section.id === MobileHomeSectionId.RADIO) scopes.add('radio');
            if (section.id === MobileHomeSectionId.RECENTLY_ADDED) {
                scopes.add('music');
                scopes.add('albums');
            }
        });
    }

    recentItems.forEach((recentItem) => {
        const mediaType = getLibraryMediaType(recentItem.item);

        if (mediaType === 'albums') scopes.add('albums');
        if (mediaType === 'artists') scopes.add('artists');
        if (mediaType === 'audiobooks') scopes.add('audiobooks');
        if (mediaType === 'playlists') scopes.add('playlists');
        if (mediaType === 'podcasts') scopes.add('podcasts');
        if (mediaType === 'radio') scopes.add('radio');
        if (mediaType === 'songs') scopes.add('music');
    });

    return SEARCH_SCOPE_DEFINITIONS.filter((scope) => scopes.has(scope.id));
};

const isItemInSearchScope = (item: AndroidRecentContentSourceItem, activeScope: SearchScope) => {
    const mediaType = getLibraryMediaType(item);

    if (activeScope === 'all') return true;
    if (activeScope === 'music')
        return mediaType === 'albums' || mediaType === 'artists' || mediaType === 'songs';

    return mediaType === activeScope;
};

const getSearchSectionsForScope = (sections: MobileSearchSection[], activeScope: SearchScope) => {
    if (activeScope === 'all') {
        return sections;
    }

    const sectionIds = new Set(SEARCH_SCOPE_SECTION_IDS[activeScope]);

    return sections.filter((section) => sectionIds.has(section.id));
};

const SearchScreen = ({
    hasServerConnections,
    homeContentState,
    onSearch,
    onSelectItem,
    onSelectRecentItem,
    recentItems,
    searchState,
    serverConnections,
}: SearchScreenProps) => {
    const [query, setQuery] = useState(searchState.status === 'loaded' ? searchState.query : '');
    const availableScopes = useMemo(
        () => getAvailableSearchScopes(homeContentState, serverConnections, recentItems),
        [homeContentState, recentItems, serverConnections],
    );
    const [activeScope, setActiveScope] = useState<SearchScope>('all');

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            onSearch('');
            return;
        }

        const timeoutId = setTimeout(() => onSearch(trimmedQuery), 280);

        return () => clearTimeout(timeoutId);
    }, [onSearch, query]);

    useEffect(() => {
        if (!availableScopes.some((scope) => scope.id === activeScope)) {
            setActiveScope('all');
        }
    }, [activeScope, availableScopes]);

    if (!hasServerConnections) {
        return <EmptyServerBackedScreen tabTitle="Search" />;
    }

    return (
        <>
            <View style={styles.searchPanel}>
                <InlineSearchBar
                    elevated
                    isLoading={searchState.status === 'loading'}
                    onChange={setQuery}
                    onClear={() => {
                        setQuery('');
                        onSearch('');
                    }}
                    placeholder="Find anything in Samo"
                    value={query}
                />
            </View>
            <SearchScopePills
                activeScope={activeScope}
                onScopeChange={setActiveScope}
                scopes={availableScopes}
            />
            {query.trim() ? null : (
                <SearchBrowseContent
                    activeScope={activeScope}
                    availableScopes={availableScopes}
                    onScopeChange={setActiveScope}
                    onSelectItem={onSelectRecentItem}
                    recentItems={recentItems.slice(0, 6)}
                />
            )}
            <SearchResults
                activeScope={activeScope}
                onSelectItem={onSelectItem}
                searchState={searchState}
            />
        </>
    );
};

const SearchResults = ({
    activeScope,
    onSelectItem,
    searchState,
}: {
    activeScope: SearchScope;
    onSelectItem: (item: MobileSearchItem) => void;
    searchState: AndroidSearchState;
}) => {
    if (searchState.status === 'idle' || searchState.status === 'loading') {
        return null;
    }

    if (searchState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{searchState.message}</Text>
            </View>
        );
    }

    const sections = getSearchSectionsForScope(searchState.results.sections, activeScope);

    if (sections.length === 0) {
        return (
            <>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>No Results</Text>
                    <Text style={styles.mutedText}>
                        No server-backed results for {searchState.query}.
                    </Text>
                </View>
                <WarningList errors={searchState.results.errors} title="Search warnings" />
            </>
        );
    }

    return (
        <>
            <SearchSections onSelectItem={onSelectItem} sections={sections} />
            <WarningList errors={searchState.results.errors} title="Search warnings" />
        </>
    );
};

const SearchSections = ({
    onSelectItem,
    sections,
}: {
    onSelectItem: (item: MobileSearchItem) => void;
    sections: MobileSearchSection[];
}) => {
    return (
        <>
            {sections.map((section) => (
                <View key={section.id} style={styles.searchResultSection}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <View style={styles.libraryList}>
                        {section.items.map((item) => {
                            const displayItem = toLibraryDisplayItem(item);

                            return displayItem ? (
                                <LibraryListRow
                                    displayItem={displayItem}
                                    key={displayItem.key}
                                    onPress={() => onSelectItem(item)}
                                />
                            ) : null;
                        })}
                    </View>
                </View>
            ))}
        </>
    );
};

const SEARCH_SCOPE_COPY: Record<SearchScope, { accent: string; subtitle: string }> = {
    albums: { accent: colors.accent, subtitle: 'Records and releases' },
    all: { accent: colors.accent, subtitle: 'Everything connected' },
    artists: { accent: '#c8aef2', subtitle: 'Performers and creators' },
    audiobooks: { accent: '#b99af0', subtitle: 'Books and chapters' },
    music: { accent: colors.accent, subtitle: 'Songs, albums, artists' },
    playlists: { accent: colors.accent, subtitle: 'Saved listening paths' },
    podcasts: { accent: '#8fb8a1', subtitle: 'Shows and episodes' },
    radio: { accent: '#7fb0d8', subtitle: 'Stations' },
};

const SearchBrowseContent = ({
    activeScope,
    availableScopes,
    onScopeChange,
    onSelectItem,
    recentItems,
}: {
    activeScope: SearchScope;
    availableScopes: Array<{ id: SearchScope; label: string }>;
    onScopeChange: (scope: SearchScope) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    recentItems: AndroidRecentContentItem[];
}) => {
    const rows = recentItems.flatMap((recentItem) => {
        if (!isItemInSearchScope(recentItem.item, activeScope)) {
            return [];
        }

        const displayItem = toLibraryDisplayItem(recentItem.item, recentItem.selectedAt);

        return displayItem ? [displayItem] : [];
    });
    const browseScopes = availableScopes.filter((scope) => scope.id !== 'all');

    return (
        <>
            <View style={styles.searchBrowseSection}>
                <Text style={styles.searchSurfaceTitle}>Search across your library</Text>
                <Text style={styles.searchSurfaceSubtitle}>
                    Music, stations, books, and shows from your connected sources.
                </Text>
            </View>
            {rows.length > 0 ? (
                <View style={styles.searchRecentSection}>
                    <Text style={styles.searchBrowseTitle}>Recent</Text>
                    <View style={styles.libraryList}>
                        {rows.map((row) => (
                            <LibraryListRow
                                displayItem={row}
                                key={row.key}
                                onPress={() => onSelectItem(row.item)}
                            />
                        ))}
                    </View>
                </View>
            ) : null}
            {browseScopes.length > 0 ? (
                <View style={styles.searchRecentSection}>
                    <Text style={styles.searchBrowseTitle}>Available Media</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {browseScopes.map((scope) => {
                            const copy = SEARCH_SCOPE_COPY[scope.id];

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={scope.id}
                                    onPress={() => onScopeChange(scope.id)}
                                    style={styles.searchSourceCard}
                                >
                                    <View
                                        style={[
                                            styles.searchSourceAccent,
                                            { backgroundColor: copy.accent },
                                        ]}
                                    />
                                    <Text numberOfLines={1} style={styles.searchSourceTitle}>
                                        {scope.label}
                                    </Text>
                                    <Text numberOfLines={2} style={styles.searchSourceSubtitle}>
                                        {copy.subtitle}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : null}
        </>
    );
};

const SearchScopePills = ({
    activeScope,
    onScopeChange,
    scopes,
}: {
    activeScope: SearchScope;
    onScopeChange: (scope: SearchScope) => void;
    scopes: Array<{ id: SearchScope; label: string }>;
}) => {
    return (
        <ScrollView
            contentContainerStyle={styles.searchScopePills}
            horizontal
            showsHorizontalScrollIndicator={false}
        >
            {scopes.map((scope) => {
                const isActive = scope.id === activeScope;

                return (
                    <Pressable
                        accessibilityRole="button"
                        key={scope.id}
                        onPress={() => onScopeChange(scope.id)}
                        style={[styles.searchScopePill, isActive && styles.searchScopePillActive]}
                    >
                        <Text
                            style={[
                                styles.searchScopePillText,
                                isActive && styles.searchScopePillTextActive,
                            ]}
                        >
                            {scope.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const LibraryFilterPills = ({
    activeFilter,
    filters,
    onChange,
}: {
    activeFilter: LibraryFilter;
    filters: Array<{ id: LibraryFilter; label: string }>;
    onChange: (filter: LibraryFilter) => void;
}) => {
    return (
        <ScrollView
            contentContainerStyle={styles.libraryFilterPills}
            horizontal
            showsHorizontalScrollIndicator={false}
        >
            {filters.map((filter) => {
                const isActive = filter.id === activeFilter;

                return (
                    <Pressable
                        accessibilityRole="button"
                        key={filter.id}
                        onPress={() => onChange(filter.id)}
                        style={[
                            styles.libraryFilterPill,
                            isActive && styles.libraryFilterPillActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.libraryFilterPillText,
                                isActive && styles.libraryFilterPillTextActive,
                            ]}
                        >
                            {filter.label}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const InlineSearchBar = ({
    elevated,
    isLoading,
    onChange,
    onClear,
    onSubmit,
    placeholder,
    showSubmitButton,
    textTone = 'light',
    value,
}: {
    elevated?: boolean;
    isLoading?: boolean;
    onChange: (value: string) => void;
    onClear: () => void;
    onSubmit?: () => void;
    placeholder: string;
    showSubmitButton?: boolean;
    textTone?: 'dark' | 'light';
    value: string;
}) => {
    const isDarkTone = textTone === 'dark' && !elevated;
    const iconColor = isDarkTone ? '#111111' : colors.muted;
    const textColor = isDarkTone ? '#111111' : colors.text;
    const canSubmit = Boolean(showSubmitButton && onSubmit && value.trim() && !isLoading);

    return (
        <View style={[styles.inlineSearchBar, elevated && styles.inlineSearchBarElevated]}>
            <SearchGlyph color={iconColor} />
            <TextInput
                autoCapitalize="none"
                onChangeText={onChange}
                onSubmitEditing={onSubmit}
                placeholder={placeholder}
                placeholderTextColor={isDarkTone ? '#5f5f5f' : 'rgba(255,255,255,0.4)'}
                returnKeyType={onSubmit ? 'search' : 'default'}
                style={[styles.inlineSearchInput, isDarkTone && styles.inlineSearchInputDark]}
                value={value}
            />
            {isLoading ? (
                <ActivityIndicator color={colors.accent} size="small" />
            ) : value.length > 0 ? (
                <Pressable
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                    onPress={onClear}
                    style={styles.inlineSearchIconButton}
                >
                    <ClearGlyph color={textColor} />
                </Pressable>
            ) : null}
            {canSubmit ? (
                <Pressable
                    accessibilityLabel="Search"
                    accessibilityRole="button"
                    onPress={onSubmit}
                    style={styles.inlineSearchSubmit}
                >
                    <SearchGlyph color={colors.background} />
                </Pressable>
            ) : null}
        </View>
    );
};

const LibraryListRow = ({
    displayItem,
    onPress,
    rightAccessory,
}: {
    displayItem: LibraryDisplayItem;
    onPress: () => void;
    rightAccessory?: ReactNode;
}) => {
    const { item, mediaType } = displayItem;
    const contextMenu = useMediaContextMenu();
    const showHiRes = isContentItemHiRes(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={onPress}
            style={styles.libraryRow}
        >
            <MediaArtwork
                artworkUrl={item.artworkUrl}
                mediaType={mediaType}
                size="row"
                title={item.title}
            />
            <View style={styles.libraryRowText}>
                <View style={styles.rowTitleWithBadge}>
                    <Text numberOfLines={1} style={[styles.libraryRowTitle, styles.rowTitleText]}>
                        {item.title}
                    </Text>
                    {showHiRes ? <HiResBadge compact /> : null}
                </View>
                <Text numberOfLines={1} style={styles.libraryRowSubtitle}>
                    {getLibraryItemSubtitle(item, mediaType)}
                </Text>
            </View>
            {rightAccessory ? (
                <View style={styles.libraryRowAccessory}>{rightAccessory}</View>
            ) : null}
        </Pressable>
    );
};

const MediaArtwork = ({
    artworkUrl,
    mediaType,
    size,
    title,
}: {
    artworkUrl?: string;
    mediaType: LibraryMediaType;
    size: 'card' | 'hero' | 'row';
    title: string;
}) => {
    const artworkStyle =
        size === 'hero'
            ? styles.radioHeroArtwork
            : size === 'card'
              ? styles.radioCardArtwork
              : styles.libraryRowArtwork;
    const fallbackStyle =
        size === 'hero'
            ? styles.radioHeroArtworkFallback
            : size === 'card'
              ? styles.radioCardArtworkFallback
              : styles.libraryRowArtworkFallback;
    const shouldRound = mediaType === 'artists';

    return (
        <ArtworkImage
            fallbackStyle={[fallbackStyle, shouldRound && styles.libraryArtworkRound]}
            letter={title.slice(0, 1)}
            style={[artworkStyle, shouldRound && styles.libraryArtworkRound]}
            uri={artworkUrl}
        />
    );
};

const HomeContentStatus = ({
    activeFilter,
    homeContentState,
    onFilterChange,
    onSelectItem,
    onViewAll,
    recentItems,
    serverConnections,
}: {
    activeFilter: HomeFilter;
    homeContentState: AndroidHomeContentState;
    onFilterChange: (filter: HomeFilter) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnections: ServerAuthenticationResult[];
}) => {
    if (homeContentState.status === 'idle') {
        return null;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    if (homeContentState.content.sections.length === 0) {
        const isOfflineContent = homeContentState.content.serverTitle === 'Offline Downloads';
        return (
            <>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {isOfflineContent ? 'Offline Downloads' : 'Home'}
                    </Text>
                    <Text style={styles.mutedText}>
                        {isOfflineContent
                            ? 'No downloads yet. Download albums, playlists, podcasts, or audiobooks to use offline mode.'
                            : 'No server-backed Home content returned.'}
                    </Text>
                </View>
                <WarningList errors={homeContentState.content.errors} title="Server warnings" />
            </>
        );
    }

    const allSections = getHomeDisplaySections(
        homeContentState.content.sections,
        recentItems,
        serverConnections,
    );
    const availableFilters = getAvailableHomeFilters(allSections);
    const filteredSections = filterHomeDisplaySections(allSections, activeFilter);

    return (
        <>
            {availableFilters.length > 2 ? (
                <ScrollView
                    contentContainerStyle={styles.homeFilterPills}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {availableFilters.map((filter) => {
                        const isActive = filter.id === activeFilter;

                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={filter.id}
                                onPress={() => onFilterChange(filter.id)}
                                style={[
                                    styles.homeFilterPill,
                                    isActive && styles.homeFilterPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.homeFilterPillText,
                                        isActive && styles.homeFilterPillTextActive,
                                    ]}
                                >
                                    {filter.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            ) : null}
            {filteredSections.length === 0 ? (
                <View style={[styles.section, { marginTop: spacing.md }]}>
                    <Text style={styles.mutedText}>
                        No {activeFilter === 'all' ? '' : activeFilter + ' '}content loaded yet.
                    </Text>
                </View>
            ) : activeFilter === 'podcasts' || activeFilter === 'audiobooks' ? (
                <HomeFilterGrid
                    items={filteredSections.flatMap((section) => section.items)}
                    onSelectItem={onSelectItem}
                    variant={activeFilter === 'podcasts' ? 'podcast' : 'book'}
                />
            ) : (
                <ContentSections
                    onSelectItem={onSelectItem}
                    onViewAll={onViewAll}
                    sections={filteredSections}
                />
            )}
            <WarningList errors={homeContentState.content.errors} title="Server warnings" />
        </>
    );
};

const WarningList = ({ errors, title }: { errors: Array<{ message: string }>; title: string }) => {
    if (errors.length === 0) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {errors.map((error, index) => (
                <Text key={`${error.message}-${index}`} style={styles.mutedText}>
                    {error.message}
                </Text>
            ))}
        </View>
    );
};

const getSectionsById = (
    homeContentState: AndroidHomeContentState,
    sectionIds: MobileHomeSectionId[],
) => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    return sectionIds.flatMap((sectionId) => {
        const section = homeContentState.content.sections.find(
            (candidate) => candidate.id === sectionId,
        );
        return section ? [section] : [];
    });
};

const getLibraryMediaType = (
    item: AndroidRecentContentSourceItem,
): LibraryMediaType | undefined => {
    if (item.type === 'album') return 'albums';
    if (item.type === 'artist') return 'artists';
    if (item.type === 'audiobook') return 'audiobooks';
    if (item.type === 'playlist') return 'playlists';
    if (item.type === 'podcast') return 'podcasts';
    if (item.type === 'radio') return 'radio';
    if (item.type === 'song') return 'songs';

    return undefined;
};

const getLibraryMediaTypeLabel = (mediaType: LibraryMediaType) => {
    if (mediaType === 'albums') return 'Album';
    if (mediaType === 'artists') return 'Artist';
    if (mediaType === 'audiobooks') return 'Audiobook';
    if (mediaType === 'playlists') return 'Playlist';
    if (mediaType === 'podcasts') return 'Podcast';
    if (mediaType === 'radio') return 'Radio';
    return 'Song';
};

const getLibraryItemSubtitle = (
    item: AndroidRecentContentSourceItem,
    mediaType: LibraryMediaType,
) => {
    if (mediaType === 'radio') {
        return 'Radio';
    }

    return [getLibraryMediaTypeLabel(mediaType), getDisplaySubtitle(item.subtitle)]
        .filter(Boolean)
        .join(' - ');
};

const toLibraryDisplayItem = (
    item: AndroidRecentContentSourceItem,
    selectedAt = 0,
): LibraryDisplayItem | undefined => {
    const mediaType = getLibraryMediaType(item);

    if (!mediaType) {
        return undefined;
    }

    return {
        item,
        key: getRecentContentItemKey(item),
        mediaType,
        selectedAt,
    };
};

const getBaseLibraryItems = (homeContentState: AndroidHomeContentState): LibraryDisplayItem[] => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    const itemsByKey = new Map<string, LibraryDisplayItem>();

    homeContentState.content.sections.forEach((section) => {
        section.items.forEach((item) => {
            const displayItem = toLibraryDisplayItem(item);

            if (displayItem && !itemsByKey.has(displayItem.key)) {
                itemsByKey.set(displayItem.key, displayItem);
            }
        });
    });

    return [...itemsByKey.values()];
};

const getAvailableLibraryFilters = (
    baseItems: LibraryDisplayItem[],
    recentItems: AndroidRecentContentItem[],
) => {
    const mediaTypes = new Set<LibraryMediaType>();

    baseItems.forEach((item) => mediaTypes.add(item.mediaType));
    recentItems.forEach((recentItem) => {
        const mediaType = getLibraryMediaType(recentItem.item);

        if (mediaType) {
            mediaTypes.add(mediaType);
        }
    });

    return LIBRARY_FILTERS.filter(
        (filter) => filter.id === 'all' || (filter.mediaType && mediaTypes.has(filter.mediaType)),
    );
};

const getLibraryRows = (
    baseItems: LibraryDisplayItem[],
    recentItems: AndroidRecentContentItem[],
    activeFilter: LibraryFilter,
    query: string,
) => {
    const recentItemsByKey = new Map(recentItems.map((item) => [item.key, item]));
    const baseKeys = new Set(baseItems.map((item) => item.key));
    const libraryItems = baseItems.map((item) => ({
        ...item,
        selectedAt: recentItemsByKey.get(item.key)?.selectedAt ?? 0,
    }));
    const orphanRecentItems = recentItems.flatMap((recentItem) => {
        if (baseKeys.has(recentItem.key)) {
            return [];
        }

        const displayItem = toLibraryDisplayItem(recentItem.item, recentItem.selectedAt);

        return displayItem ? [displayItem] : [];
    });
    const trimmedQuery = query.trim().toLowerCase();

    return [...libraryItems, ...orphanRecentItems]
        .filter((item) => activeFilter === 'all' || item.mediaType === activeFilter)
        .filter((item) => {
            if (!trimmedQuery) {
                return true;
            }

            return (
                item.item.title.toLowerCase().includes(trimmedQuery) ||
                (item.item.subtitle?.toLowerCase().includes(trimmedQuery) ?? false) ||
                (item.item.source?.title.toLowerCase().includes(trimmedQuery) ?? false)
            );
        })
        .sort((left, right) => {
            if (left.selectedAt !== right.selectedAt) {
                return right.selectedAt - left.selectedAt;
            }

            return left.item.title.localeCompare(right.item.title);
        });
};

/**
 * Compute an artwork URL for an item that didn't carry one when it was first
 * stored. Persisted recents are the canonical case: they were recorded
 * before subsonicCoverArtUrl learned to fall back to the entity id, so an
 * artist or album you tapped six months ago still has artworkUrl=undefined
 * on disk. Rather than migrating storage on every install, we rebuild the
 * URL at render time from the item's source + id whenever we have a matching
 * server connection. New items already arrive with artworkUrl set; this just
 * fills in the historical gaps. Returns undefined when nothing better than
 * the fallback letter can be produced (no server connection, unknown server
 * type, etc.).
 */
const resolveItemArtworkUrl = (
    item: AndroidRecentContentSourceItem,
    serverConnections: ServerAuthenticationResult[],
): string | undefined => {
    if (item.artworkUrl) return item.artworkUrl;
    const sourceId = item.source?.id;
    if (!sourceId) return undefined;
    const auth = serverConnections.find(
        (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
    );
    if (!auth) return undefined;
    if (
        auth.type === ServerType.NAVIDROME ||
        auth.type === ServerType.SUBSONIC
    ) {
        const params = new URLSearchParams({
            c: 'Samo',
            f: 'json',
            id: item.id,
            size: '320',
            v: '1.13.0',
        });
        return `${auth.url}/rest/getCoverArt.view?${params.toString()}&${auth.credential}`;
    }
    if (auth.type === ServerType.AUDIOBOOKSHELF) {
        return buildAudiobookshelfArtworkUrl(auth, item.id, undefined);
    }
    return undefined;
};

/**
 * Apply resolveItemArtworkUrl across a list of items, returning each item
 * unchanged when it already had artwork. Used to backfill recents (which may
 * have been persisted before the entity-id fallback existed) without
 * mutating the persisted store.
 */
const withResolvedArtwork = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    serverConnections: ServerAuthenticationResult[],
): T[] => {
    return items.map((item) => {
        if (item.artworkUrl) return item;
        const resolved = resolveItemArtworkUrl(item, serverConnections);
        return resolved ? ({ ...item, artworkUrl: resolved } as T) : item;
    });
};

const sortHomeItemsByRecents = <T extends AndroidRecentContentSourceItem>(
    items: T[],
    recentItems: AndroidRecentContentItem[],
): T[] => {
    const recentItemsByKey = new Map(recentItems.map((item) => [item.key, item]));

    return [...items].sort((left, right) => {
        const leftRecentAt = recentItemsByKey.get(getRecentContentItemKey(left))?.selectedAt ?? 0;
        const rightRecentAt = recentItemsByKey.get(getRecentContentItemKey(right))?.selectedAt ?? 0;

        if (leftRecentAt !== rightRecentAt) {
            return rightRecentAt - leftRecentAt;
        }

        return left.title.localeCompare(right.title);
    });
};

const getUniqueHomeItems = (items: AndroidRecentContentSourceItem[]) => {
    const itemsByKey = new Map<string, AndroidRecentContentSourceItem>();

    items.forEach((item) => {
        const key = getRecentContentItemKey(item);

        if (!itemsByKey.has(key)) {
            itemsByKey.set(key, item);
        }
    });

    return [...itemsByKey.values()];
};

const getHomeItemsForSection = (
    sectionsById: Map<MobileHomeSectionId, MobileHomeSection>,
    sectionId: MobileHomeSectionId,
    recentItems: AndroidRecentContentItem[],
) => {
    return sortHomeItemsByRecents(sectionsById.get(sectionId)?.items ?? [], recentItems);
};

const RECENTLY_ADDED_ROW_LIMIT = 18;

const getViewAllVariant = (
    variant: HomeDisplaySection['variant'],
): null | ViewAllVariant => {
    switch (variant) {
        case 'album':
            return 'album';
        case 'artist':
            return 'artist';
        case 'book':
            return 'audiobook';
        case 'playlist':
            return 'playlist';
        case 'podcast':
            return 'podcast';
        // Recents, the "Recently Added" hero, the radio grid, and the wide
        // "continue" row are deliberately ephemeral or live — no View All.
        case 'continue':
        case 'radio':
        case 'recents':
        case 'wide':
            return null;
    }
};

const gatherViewAllItems = (
    sections: MobileHomeSection[],
    variant: ViewAllVariant,
): MobileHomeItem[] => {
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    const byId = (id: MobileHomeSectionId): MobileHomeItem[] =>
        sectionsById.get(id)?.items ?? [];
    switch (variant) {
        case 'album':
            return getUniqueHomeItems([
                ...byId(MobileHomeSectionId.FAVORITE_ALBUMS),
                ...byId(MobileHomeSectionId.RECENTLY_ADDED),
            ]) as MobileHomeItem[];
        case 'artist':
            return byId(MobileHomeSectionId.FAVORITE_ARTISTS);
        case 'audiobook':
            return byId(MobileHomeSectionId.AUDIOBOOKS);
        case 'playlist':
            return byId(MobileHomeSectionId.PLAYLISTS);
        case 'podcast':
            return byId(MobileHomeSectionId.PODCASTS);
    }
};

/**
 * Build the single cross-source "Recently Added" hero row at the top of Home.
 * Pulls candidate items from every section that carries server-reported
 * addedAt timestamps (the Subsonic "Recently Added" album list, plus ABS
 * audiobooks and podcasts which already arrive sorted by addedAt-desc) and
 * sorts the union strictly by addedAt. Items without a timestamp fall to the
 * end so we still show *something* if a server didn't populate created/addedAt
 * — but the typical case is a fully chronological list that reflects what was
 * most recently added to ANY connected server, regardless of media type. If
 * you only added albums recently, the row is all albums; if a podcast episode
 * just landed, it pushes everything older down.
 */
const buildRecentlyAddedHeroRow = (
    sectionsById: Map<MobileHomeSectionId, MobileHomeSection>,
): MobileHomeItem[] => {
    const candidates: MobileHomeItem[] = [
        ...(sectionsById.get(MobileHomeSectionId.RECENTLY_ADDED)?.items ?? []),
        ...(sectionsById.get(MobileHomeSectionId.AUDIOBOOKS)?.items ?? []),
        ...(sectionsById.get(MobileHomeSectionId.PODCASTS)?.items ?? []),
    ];
    const seenKeys = new Set<string>();
    const deduped: MobileHomeItem[] = [];
    for (const item of candidates) {
        const key = getRecentContentItemKey(item);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        deduped.push(item);
    }
    deduped.sort((left, right) => {
        const leftAdded = left.addedAt ?? -Infinity;
        const rightAdded = right.addedAt ?? -Infinity;
        if (leftAdded === rightAdded) {
            return left.title.localeCompare(right.title);
        }
        return rightAdded - leftAdded;
    });
    return deduped.slice(0, RECENTLY_ADDED_ROW_LIMIT);
};

const getContentItemProgress = (item: AndroidRecentContentSourceItem) => {
    const playback = item.playback;

    if (!playback?.durationSeconds || !playback.initialPositionSeconds) {
        return undefined;
    }

    const progress = playback.initialPositionSeconds / playback.durationSeconds;

    if (progress <= 0.02 || progress >= 0.96) {
        return undefined;
    }

    return clamp(progress, 0, 1);
};

const getHomeDisplaySections = (
    sections: MobileHomeSection[],
    recentItems: AndroidRecentContentItem[],
    serverConnections: ServerAuthenticationResult[],
): HomeDisplaySection[] => {
    const displaySections: HomeDisplaySection[] = [];
    const sectionsById = new Map(sections.map((section) => [section.id, section]));
    // Look up fresh home items by recent-key so we can swap in current artwork URLs
    // for recents. Persisted recents can carry stale Audiobookshelf JWT tokens or
    // expired cover-art URLs; using the freshly-loaded equivalent fixes that.
    const freshItemsByKey = new Map<string, MobileHomeItem>();
    for (const section of sections) {
        for (const item of section.items) {
            const key = getRecentContentItemKey(item);
            if (!freshItemsByKey.has(key)) {
                freshItemsByKey.set(key, item);
            }
        }
    }
    const recentDisplayItems = withResolvedArtwork(
        recentItems.flatMap((recentItem) => {
            if (!getLibraryMediaType(recentItem.item)) {
                return [];
            }
            const fresh = freshItemsByKey.get(recentItem.key);
            return [fresh ?? recentItem.item];
        }),
        serverConnections,
    );
    const favoriteAlbumItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.FAVORITE_ALBUMS,
        recentItems,
    );
    const recentlyAddedAlbumItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.RECENTLY_ADDED,
        recentItems,
    );
    const albumItems = getUniqueHomeItems([...favoriteAlbumItems, ...recentlyAddedAlbumItems]);
    const favoriteArtistItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.FAVORITE_ARTISTS,
        recentItems,
    );
    const podcastItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.PODCASTS,
        recentItems,
    );
    const audiobookItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.AUDIOBOOKS,
        recentItems,
    );
    const playlistItems = getHomeItemsForSection(
        sectionsById,
        MobileHomeSectionId.PLAYLISTS,
        recentItems,
    );
    const sortedAllItems = sortHomeItemsByRecents(
        getUniqueHomeItems(sections.flatMap((section) => section.items)),
        recentItems,
    );
    const recentKeys = new Set(recentItems.map((item) => item.key));
    const discoverItems = sortedAllItems.filter(
        (item) =>
            !recentKeys.has(getRecentContentItemKey(item)) &&
            (item.type === MobileHomeItemType.ALBUM || item.type === MobileHomeItemType.PLAYLIST),
    );

    // "Recently added to server" sits above Recents: the newest items each
    // server has, interleaved across categories so albums, audiobooks, and
    // podcasts all get a turn. Each per-category section is already sorted
    // addedAt-desc on the server side, so the first N of each are the newest.
    const recentlyAddedItems = buildRecentlyAddedHeroRow(sectionsById);
    if (recentlyAddedItems.length > 0) {
        displaySections.push({
            items: recentlyAddedItems,
            key: 'recently-added-to-server',
            title: 'Recently Added',
            variant: 'recents',
        });
    }

    if (recentDisplayItems.length > 0) {
        displaySections.push({
            items: recentDisplayItems.slice(0, 18),
            key: 'recents',
            title: 'Recently Played',
            variant: 'recents',
        });
    }

    if (albumItems.length > 0) {
        displaySections.push({
            items: albumItems,
            key: 'albums',
            title: 'Albums',
            variant: 'album',
        });
    }

    if (audiobookItems.length > 0) {
        displaySections.push({
            items: audiobookItems,
            key: MobileHomeSectionId.AUDIOBOOKS,
            title: 'Audiobooks',
            variant: 'book',
        });
    }

    if (podcastItems.length > 0) {
        displaySections.push({
            items: podcastItems,
            key: MobileHomeSectionId.PODCASTS,
            title: 'Podcasts',
            variant: 'podcast',
        });
    }

    if (favoriteArtistItems.length > 0) {
        displaySections.push({
            items: favoriteArtistItems.slice(0, 16),
            key: MobileHomeSectionId.FAVORITE_ARTISTS,
            title: 'Artists',
            variant: 'artist',
        });
    }

    if (playlistItems.length > 0) {
        displaySections.push({
            items: playlistItems.slice(0, 16),
            key: MobileHomeSectionId.PLAYLISTS,
            title: 'Playlists',
            variant: 'playlist',
        });
    }

    if (discoverItems.length >= 4) {
        displaySections.push({
            items: discoverItems.slice(0, 18),
            key: 'rediscover',
            title: 'Rediscover',
            variant: 'wide',
        });
    }

    return displaySections.filter((section) => section.items.length > 0);
};

const ContentBackedScreen = ({
    emptyTitle,
    homeContentState,
    onSelectItem,
    sectionIds,
}: ContentBackedScreenProps) => {
    if (homeContentState.status === 'idle') {
        return <EmptyServerBackedScreen tabTitle={emptyTitle} />;
    }

    if (homeContentState.status === 'loading') {
        return (
            <View style={styles.section}>
                <ActivityIndicator color={colors.accent} />
            </View>
        );
    }

    if (homeContentState.status === 'error') {
        return (
            <View style={styles.section}>
                <Text style={styles.errorText}>{homeContentState.message}</Text>
            </View>
        );
    }

    const sections = getSectionsById(homeContentState, sectionIds);

    if (sections.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{emptyTitle}</Text>
                <Text style={styles.mutedText}>No server-backed content returned.</Text>
            </View>
        );
    }

    return (
        <ContentSections
            onSelectItem={onSelectItem}
            sections={sections.map((section) => ({
                items: section.items,
                key: section.id,
                title: section.title,
                variant: 'album',
            }))}
        />
    );
};

const getHomeItemSubtitle = (
    item: AndroidRecentContentSourceItem,
    variant: HomeDisplaySection['variant'],
) => {
    if (variant === 'radio' || variant === 'recents') {
        return undefined;
    }

    return getDisplaySubtitle(item.subtitle);
};

const getHomeItemTypeLabel = (item: AndroidRecentContentSourceItem) => {
    const mediaType = getLibraryMediaType(item);

    return mediaType ? getLibraryMediaTypeLabel(mediaType) : undefined;
};

const HomeFilterGrid = ({
    items,
    onSelectItem,
    variant,
}: {
    items: AndroidRecentContentSourceItem[];
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    variant: 'book' | 'podcast';
}) => {
    const isPodcast = variant === 'podcast';
    return (
        <View style={styles.homeFilterGrid}>
            {items.map((item) => {
                const subtitle = getHomeItemSubtitle(item, variant);
                return (
                    <Pressable
                        key={getContentItemKey(item)}
                        onPress={() => onSelectItem(item)}
                        style={styles.homeFilterGridTile}
                    >
                        <ArtworkImage
                            fallbackStyle={[
                                styles.homeFilterGridArtworkFallback,
                                isPodcast && styles.homeFilterGridArtworkPodcast,
                            ]}
                            letter={item.title.slice(0, 1)}
                            style={[
                                styles.homeFilterGridArtwork,
                                isPodcast && styles.homeFilterGridArtworkPodcast,
                            ]}
                            uri={item.artworkUrl}
                        />
                        <Text numberOfLines={2} style={styles.mediaTitle}>
                            {item.title}
                        </Text>
                        {subtitle ? (
                            <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
};

const ContentSections = ({
    onSelectItem,
    onViewAll,
    sections,
}: {
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    sections: HomeDisplaySection[];
}) => {
    const contextMenu = useMediaContextMenu();
    return (
        <>
            {sections.map((section) => {
                const isAlbum = section.variant === 'album';
                const isArtist = section.variant === 'artist';
                const isBook = section.variant === 'book';
                const isContinue = section.variant === 'continue';
                const isPlaylist = section.variant === 'playlist';
                const isPodcast = section.variant === 'podcast';
                const isRadioSection = section.variant === 'radio';
                const isRecent = section.variant === 'recents';
                const isWide = section.variant === 'wide' || isContinue;
                // View All is opt-in by variant: recents (incl. the
                // "Recently Added" hero), wide/continue and radio rows are
                // skipped because they're meant to be ephemeral or live.
                const viewAllVariant = getViewAllVariant(section.variant);
                const canViewAll = viewAllVariant !== null && Boolean(onViewAll);

                return (
                    <View key={section.key} style={styles.homeSection}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            {canViewAll ? (
                                <Pressable
                                    accessibilityLabel={`View all ${section.title}`}
                                    accessibilityRole="button"
                                    hitSlop={8}
                                    onPress={() => onViewAll?.(section)}
                                    style={styles.sectionViewAll}
                                >
                                    <Text style={styles.sectionViewAllLabel}>View All</Text>
                                </Pressable>
                            ) : null}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {section.items.map((item) => {
                                const isRadio = item.type === MobileHomeItemType.RADIO;
                                // An artist tile rendered inside a Recents/mixed row must still
                                // be circular — never a square with a letter.
                                const isArtistItem = item.type === MobileHomeItemType.ARTIST;
                                const progress = getContentItemProgress(item);
                                const subtitle = getHomeItemSubtitle(item, section.variant);
                                const showHiRes = isContentItemHiRes(item);
                                const tileStyle = [
                                    styles.mediaTile,
                                    isAlbum && styles.mediaTileAlbum,
                                    isArtist && styles.mediaTileArtist,
                                    isRecent && styles.mediaTileCompact,
                                    isRadioSection && styles.mediaTileGrid,
                                    isWide && styles.mediaTileWide,
                                    isContinue && styles.mediaTileContinue,
                                    isBook && styles.mediaTileBook,
                                    isPlaylist && styles.mediaTilePlaylist,
                                    isPodcast && styles.mediaTilePodcast,
                                ];
                                const artworkStyle = [
                                    styles.mediaArtwork,
                                    isAlbum && styles.mediaArtworkAlbum,
                                    isArtist && styles.mediaArtworkArtist,
                                    isRecent && styles.mediaArtworkCompact,
                                    isRadioSection && styles.mediaArtworkGrid,
                                    isWide && styles.mediaArtworkWide,
                                    isBook && styles.mediaArtworkBook,
                                    isPlaylist && styles.mediaArtworkPlaylist,
                                    isPodcast && styles.mediaArtworkPodcast,
                                    isRadio && styles.mediaArtworkRadio,
                                    isArtistItem && styles.libraryArtworkRound,
                                ];
                                const fallbackStyle = [
                                    styles.mediaArtworkFallback,
                                    isAlbum && styles.mediaArtworkAlbum,
                                    isArtist && styles.mediaArtworkArtist,
                                    isRecent && styles.mediaArtworkCompact,
                                    isRadioSection && styles.mediaArtworkGrid,
                                    isWide && styles.mediaArtworkWide,
                                    isBook && styles.mediaArtworkBook,
                                    isPlaylist && styles.mediaArtworkPlaylist,
                                    isPodcast && styles.mediaArtworkPodcast,
                                    isRadio && styles.mediaArtworkRadio,
                                    isArtistItem && styles.libraryArtworkRound,
                                ];

                                return (
                                    <Pressable
                                        key={getContentItemKey(item)}
                                        onLongPress={() => contextMenu.openForItem(item)}
                                        onPress={() => onSelectItem(item)}
                                        style={tileStyle}
                                    >
                                        <ArtworkImage
                                            fallbackStyle={fallbackStyle}
                                            letter={item.title.slice(0, 1)}
                                            style={artworkStyle}
                                            uri={item.artworkUrl}
                                        />
                                        {showHiRes ? <HiResBadge overlay /> : null}
                                        {isRecent ? (
                                            <View style={styles.mediaTypeBadge}>
                                                <Text style={styles.mediaTypeBadgeText}>
                                                    {getHomeItemTypeLabel(item) ?? 'Media'}
                                                </Text>
                                            </View>
                                        ) : null}
                                        <View
                                            style={[
                                                styles.mediaText,
                                                isWide && styles.mediaTextWide,
                                                isArtist && styles.mediaTextCentered,
                                            ]}
                                        >
                                            <Text
                                                numberOfLines={isWide ? 2 : 2}
                                                style={[
                                                    styles.mediaTitle,
                                                    (isArtist || isRadioSection) &&
                                                        styles.mediaTitleCentered,
                                                    isWide && styles.mediaTitleWide,
                                                ]}
                                            >
                                                {item.title}
                                            </Text>
                                            {showHiRes ? <HiResBadge compact /> : null}
                                            {subtitle ? (
                                                <Text
                                                    numberOfLines={isWide ? 2 : 1}
                                                    style={[
                                                        styles.mediaSubtitle,
                                                        isArtist && styles.mediaSubtitleCentered,
                                                    ]}
                                                >
                                                    {subtitle}
                                                </Text>
                                            ) : null}
                                            {isContinue && progress !== undefined ? (
                                                <View style={styles.continueProgressTrack}>
                                                    <View
                                                        style={[
                                                            styles.continueProgressFill,
                                                            { width: `${progress * 100}%` },
                                                        ]}
                                                    />
                                                </View>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                );
            })}
        </>
    );
};

const getDetailTypeLabel = (type: MobileMediaDetailType) => {
    if (type === MobileMediaDetailType.AUDIOBOOK) return 'Audiobook';
    if (type === MobileMediaDetailType.PODCAST) return 'Podcast';
    if (type === MobileMediaDetailType.PLAYLIST) return 'Playlist';
    if (type === MobileMediaDetailType.ARTIST) return 'Artist';
    return 'Album';
};

const getPlaylistTargetsForDetail = (
    homeContentState: AndroidHomeContentState,
    detail: MobileMediaDetail,
) => {
    if (homeContentState.status !== 'loaded') {
        return [];
    }

    return homeContentState.content.sections
        .filter((section) => section.id === MobileHomeSectionId.PLAYLISTS)
        .flatMap((section) => section.items)
        .filter(
            (item) =>
                item.type === MobileHomeItemType.PLAYLIST && item.source?.id === detail.source.id,
        );
};

const MediaDetailContent = ({
    homeContentState,
    mediaDetailState,
    onAddTrackToPlaylist,
    onBack,
    onPlayTrack,
    onSelectItem,
    onShufflePlay,
    serverConnections,
}: {
    homeContentState: AndroidHomeContentState;
    mediaDetailState: AndroidMediaDetailState;
    onAddTrackToPlaylist: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => Promise<void>;
    onBack: () => void;
    onPlayTrack: (detail: MobileMediaDetail, track: MobileMediaTrack, index: number) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail) => void;
    serverConnections: ServerAuthenticationResult[];
}) => {
    const title =
        mediaDetailState.status === 'loaded'
            ? mediaDetailState.detail.title
            : mediaDetailState.status === 'idle'
              ? 'Media'
              : mediaDetailState.itemTitle;

    return (
        <>
            {mediaDetailState.status === 'loading' ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <ActivityIndicator color={colors.accent} />
                </View>
            ) : mediaDetailState.status === 'error' ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.errorText}>{mediaDetailState.message}</Text>
                </View>
            ) : mediaDetailState.status === 'loaded' ? (
                <MediaDetailLoaded
                    detail={mediaDetailState.detail}
                    onAddTrackToPlaylist={onAddTrackToPlaylist}
                    onPlayTrack={onPlayTrack}
                    onSelectItem={onSelectItem}
                    onShufflePlay={onShufflePlay}
                    playlistTargets={getPlaylistTargetsForDetail(
                        homeContentState,
                        mediaDetailState.detail,
                    )}
                    serverConnections={serverConnections}
                />
            ) : null}
        </>
    );
};

const MediaDetailLoaded = ({
    detail,
    onAddTrackToPlaylist,
    onPlayTrack,
    onSelectItem,
    onShufflePlay,
    playlistTargets,
    serverConnections,
}: {
    detail: MobileMediaDetail;
    onAddTrackToPlaylist: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => Promise<void>;
    onPlayTrack: (detail: MobileMediaDetail, track: MobileMediaTrack, index: number) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail) => void;
    playlistTargets: MobileHomeItem[];
    serverConnections: ServerAuthenticationResult[];
}) => {
    const [playlistMenuTrack, setPlaylistMenuTrack] = useState<MobileMediaTrack | null>(null);
    const [starredTracks, setStarredTracks] = useState<Set<string>>(new Set());
    const [playlistActionState, setPlaylistActionState] = useState<
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' }
    >({ status: 'idle' });
    const firstTrack = detail.tracks[0];
    const contextMenu = useMediaContextMenu();
    const isMusic = detail.type === MobileMediaDetailType.ALBUM || detail.type === MobileMediaDetailType.PLAYLIST;
    const canShuffleDetail = isMusic && detail.tracks.filter((t) => t.playback).length > 1;
    const detailAuth = serverConnections.find(
        (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
    );
    const canFavoriteTrack = Boolean(
        isMusic && detailAuth &&
        (detailAuth.type === ServerType.NAVIDROME || detailAuth.type === ServerType.SUBSONIC),
    );

    const handleToggleStar = async (track: MobileMediaTrack) => {
        if (!detailAuth || !canFavoriteTrack) return;

        const isStarred = starredTracks.has(track.id);

        setStarredTracks((current) => {
            const next = new Set(current);

            if (isStarred) {
                next.delete(track.id);
            } else {
                next.add(track.id);
            }

            return next;
        });

        try {
            if (isStarred) {
                await unstarSubsonicTrack(detailAuth, track.id);
            } else {
                await starSubsonicTrack(detailAuth, track.id);
            }
        } catch {
            setStarredTracks((current) => {
                const next = new Set(current);

                if (isStarred) {
                    next.add(track.id);
                } else {
                    next.delete(track.id);
                }

                return next;
            });
        }
    };

    const sectionTitle =
        detail.type === MobileMediaDetailType.AUDIOBOOK
            ? 'Chapters'
            : detail.type === MobileMediaDetailType.PODCAST
              ? 'Episodes'
              : detail.type === MobileMediaDetailType.ARTIST
                ? 'Albums'
              : 'Tracks';
    const emptyText =
        detail.type === MobileMediaDetailType.AUDIOBOOK
            ? 'No chapters returned by the server.'
            : detail.type === MobileMediaDetailType.PODCAST
              ? 'No episodes returned by the server.'
              : detail.type === MobileMediaDetailType.ARTIST
                ? 'No albums returned by the server.'
              : 'No playable tracks returned by the server.';
    const artistAlbumSections: HomeDisplaySection[] =
        detail.type === MobileMediaDetailType.ARTIST && detail.items && detail.items.length > 0
            ? [
                  {
                      items: detail.items,
                      key: `artist-${detail.id}-albums`,
                      title: sectionTitle,
                      variant: 'album',
                  },
              ]
            : [];
    const handleAddToPlaylist = async (playlist: MobileHomeItem) => {
        if (!playlistMenuTrack) {
            return;
        }

        setPlaylistActionState({ playlistId: playlist.id, status: 'loading' });

        try {
            await onAddTrackToPlaylist(detail, playlistMenuTrack, playlist);
            setPlaylistActionState({
                message: `Added to ${playlist.title}`,
                status: 'success',
            });
        } catch (error) {
            setPlaylistActionState({
                message: error instanceof Error ? error.message : 'Failed to add to playlist',
                status: 'error',
            });
        }
    };
    const openPlaylistMenu = (track: MobileMediaTrack) => {
        setPlaylistActionState({ status: 'idle' });
        setPlaylistMenuTrack(track);
    };

    const isArtistDetail = detail.type === MobileMediaDetailType.ARTIST;
    const showDetailHiRes = detailHasHiRes(detail);
    // Download button shows for everything that has saveable media. Podcasts
    // here download every episode; long-press on a single episode row still
    // works to grab just that one.
    const canDownloadDetail = !isArtistDetail;

    // Subscribe to downloads for this specific collection so the hero
    // glyph can mirror download progress in real time (Spotify-style).
    const [collectionDownloads, setCollectionDownloads] = useState<DownloadEntry[]>([]);
    useEffect(() => {
        const unsubscribe = subscribeDownloads((entries) => {
            setCollectionDownloads(
                entries.filter(
                    (entry) =>
                        entry.collection.sourceId === detail.source.id &&
                        entry.collection.id === detail.id,
                ),
            );
        });
        return () => {
            unsubscribe();
        };
    }, [detail.id, detail.source.id]);

    // Aggregate progress: each entry contributes 1 (completed) / its current
    // progress fraction (downloading) / 0 (queued/failed). Total = entry
    // count. A collection with zero entries shows the "not yet started"
    // glyph; one with all completed shows the check.
    const downloadAggregate = useMemo(() => {
        if (collectionDownloads.length === 0) {
            return { completed: false, progress: 0 };
        }
        const completedCount = collectionDownloads.filter(
            (entry) => entry.status === 'completed',
        ).length;
        const partial = collectionDownloads.reduce((sum, entry) => {
            if (entry.status === 'completed') return sum + 1;
            if (entry.status === 'downloading') return sum + (entry.progress ?? 0);
            return sum;
        }, 0);
        return {
            completed: completedCount === collectionDownloads.length,
            progress: partial / collectionDownloads.length,
        };
    }, [collectionDownloads]);

    const handleOpenDetailContextMenu = () => {
        const kind: Exclude<MediaContextMenuKind, 'song'> | null =
            detail.type === MobileMediaDetailType.ALBUM
                ? 'album'
                : detail.type === MobileMediaDetailType.PLAYLIST
                  ? 'playlist'
                  : detail.type === MobileMediaDetailType.AUDIOBOOK
                    ? 'audiobook'
                    : detail.type === MobileMediaDetailType.PODCAST
                      ? 'podcast'
                      : null;
        if (!kind) {
            return;
        }
        const homeType =
            kind === 'album'
                ? MobileHomeItemType.ALBUM
                : kind === 'playlist'
                  ? MobileHomeItemType.PLAYLIST
                  : kind === 'audiobook'
                    ? MobileHomeItemType.AUDIOBOOK
                    : MobileHomeItemType.PODCAST;
        const syntheticItem: MobileHomeItem = {
            artworkUrl: detail.artworkUrl,
            id: detail.id,
            isHiRes: showDetailHiRes,
            source: detail.source,
            subtitle: detail.subtitle,
            title: detail.title,
            type: homeType,
        };
        contextMenu.openForItem(syntheticItem, {
            // The hero already shows a visible Download button; don't duplicate it here.
            suppressDownloadAction: true,
            suppressOpenAction: true,
        });
    };

    const handleDownloadDetail = async () => {
        // Visual feedback comes from the circular download glyph and the
        // Downloads tab — no need for a popup on click.
        const result = await enqueueCollectionDownload(detail, serverConnections);
        if (result.reason) {
            Alert.alert('Download', result.reason);
        }
    };

    return (
        <>
            {!isArtistDetail ? (
                <View style={styles.albumHero}>
                    <View style={styles.albumHeroArtworkWrap}>
                        {detail.artworkUrl ? (
                            <Image
                                source={{ uri: detail.artworkUrl }}
                                style={styles.albumHeroArtwork}
                            />
                        ) : (
                            <View style={[styles.albumHeroArtwork, styles.albumHeroArtworkFallback]}>
                                <Text style={styles.mediaArtworkLetter}>
                                    {detail.title.slice(0, 1)}
                                </Text>
                            </View>
                        )}
                        {showDetailHiRes ? <HiResBadge overlay /> : null}
                    </View>
                    <View style={styles.albumHeroBadgeRow}>
                        {detail.type === MobileMediaDetailType.AUDIOBOOK ? null : (
                            <Text style={styles.albumHeroEyebrow}>
                                {getDetailTypeLabel(detail.type)}
                            </Text>
                        )}
                        {showDetailHiRes ? <HiResBadge /> : null}
                    </View>
                    <Text numberOfLines={2} style={styles.albumHeroTitle}>
                        {detail.title}
                    </Text>
                    <View style={styles.albumHeroMeta}>
                        {(detail.metadataLines && detail.metadataLines.length > 0
                            ? detail.metadataLines
                            : detail.subtitle
                              ? [detail.subtitle]
                              : []
                        ).map((line, index) => (
                            <Text
                                key={`${line}-${index}`}
                                numberOfLines={1}
                                style={styles.albumHeroMetaLine}
                            >
                                {line}
                            </Text>
                        ))}
                    </View>
                    <View style={styles.albumHeroActionsBar}>
                        <View style={styles.albumHeroLeftActions}>
                            {canDownloadDetail ? (
                                <Pressable
                                    accessibilityLabel={
                                        downloadAggregate.completed
                                            ? 'Downloaded'
                                            : 'Download'
                                    }
                                    accessibilityRole="button"
                                    onPress={handleDownloadDetail}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <CircularDownloadGlyph
                                        completed={downloadAggregate.completed}
                                        progress={downloadAggregate.progress}
                                    />
                                </Pressable>
                            ) : null}
                            <Pressable
                                accessibilityLabel="More options"
                                accessibilityRole="button"
                                onPress={handleOpenDetailContextMenu}
                                style={styles.albumHeroGlyphButton}
                            >
                                <MoreGlyph color={colors.text} />
                            </Pressable>
                        </View>
                        <View style={styles.albumHeroActions}>
                            {canShuffleDetail ? (
                                <Pressable
                                    accessibilityLabel="Shuffle"
                                    accessibilityRole="button"
                                    onPress={() => void onShufflePlay(detail)}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <ShuffleGlyph color={colors.text} size={28} />
                                </Pressable>
                            ) : null}
                            {firstTrack ? (
                                <Pressable
                                    accessibilityLabel="Play"
                                    accessibilityRole="button"
                                    onPress={() => onPlayTrack(detail, firstTrack, 0)}
                                    style={[
                                        styles.albumHeroGlyphButton,
                                        styles.albumHeroPlayButton,
                                    ]}
                                >
                                    <PlayPauseGlyph
                                        color={colors.background}
                                        isPlaying={false}
                                        size={22}
                                    />
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                </View>
            ) : (
                <View style={styles.detailHero}>
                    {detail.artworkUrl ? (
                        <Image
                            source={{ uri: detail.artworkUrl }}
                            style={[styles.detailArtwork, styles.detailArtworkRound]}
                        />
                    ) : (
                        <View
                            style={[styles.detailArtworkFallback, styles.detailArtworkRound]}
                        >
                            <Text style={styles.mediaArtworkLetter}>
                                {detail.title.slice(0, 1)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.detailHeroText}>
                        <Text style={styles.detailType}>{getDetailTypeLabel(detail.type)}</Text>
                        <Text style={styles.detailTitle}>{detail.title}</Text>
                        {detail.subtitle ? (
                            <Text numberOfLines={2} style={styles.mediaSubtitle}>
                                {detail.subtitle}
                            </Text>
                        ) : null}
                    </View>
                </View>
            )}
            {detail.type === MobileMediaDetailType.ARTIST ? (
                <ArtistDetailSections
                    detail={detail}
                    emptyText={emptyText}
                    onPlayTrack={onPlayTrack}
                    onSelectItem={onSelectItem}
                    sectionTitle={sectionTitle}
                />
            ) : (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                    {detail.tracks.length === 0 ? (
                        <Text style={styles.mutedText}>{emptyText}</Text>
                    ) : (
                        detail.tracks.map((track, index) => {
                            const qualityItems =
                                isMusic && track.playback
                                    ? buildAudioQualityBadgeItems({
                                          ...track.playback.quality,
                                          compact: true,
                                          mode: 'playerbar',
                                      })
                                    : [];
                            const meta = [
                                track.subtitle && !looksLikeUrl(track.subtitle)
                                    ? track.subtitle
                                    : undefined,
                                ...qualityItems.map((item) => item.label),
                                isMusic ? formatTrackTimestamp(track.startSeconds) : undefined,
                                formatTrackDuration(track.durationSeconds),
                            ].filter(Boolean);
                            const canAddToPlaylist =
                                track.playback?.source === 'music' && playlistTargets.length > 0;
                            const hasOverflowActions = canAddToPlaylist || canFavoriteTrack;
                            const isStarred = starredTracks.has(track.id);
                            const showTrackHiRes = isPlaybackHiRes(track.playback);

                            const isAlbumDetail = detail.type === MobileMediaDetailType.ALBUM;
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={`${track.id}:${index}`}
                                    onLongPress={() => contextMenu.openForTrack(track, detail)}
                                    onPress={() => onPlayTrack(detail, track, index)}
                                    style={styles.trackRow}
                                >
                                    {isAlbumDetail ? (
                                        <View style={styles.albumTrackNumber}>
                                            <Text style={styles.albumTrackNumberText}>
                                                {index + 1}
                                            </Text>
                                        </View>
                                    ) : track.artworkUrl ?? detail.artworkUrl ? (
                                        <Image
                                            source={{ uri: (track.artworkUrl ?? detail.artworkUrl)! }}
                                            style={styles.trackArtwork}
                                        />
                                    ) : (
                                        <View style={styles.trackArtworkFallback}>
                                            <Text style={styles.trackArtworkLetter}>
                                                {track.title.slice(0, 1).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.searchRowText}>
                                        <View style={styles.rowTitleWithBadge}>
                                            <Text
                                                numberOfLines={1}
                                                style={[styles.searchTitle, styles.rowTitleText]}
                                            >
                                                {track.title}
                                            </Text>
                                            {showTrackHiRes ? <HiResBadge compact /> : null}
                                        </View>
                                        {meta.length > 0 ? (
                                            <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                                {meta.join(' · ')}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {canFavoriteTrack ? (
                                        <Pressable
                                            accessibilityLabel={
                                                isStarred
                                                    ? `Unstar ${track.title}`
                                                    : `Star ${track.title}`
                                            }
                                            accessibilityRole="button"
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                void handleToggleStar(track);
                                            }}
                                            style={styles.trackMenuButton}
                                        >
                                            <StarGlyph
                                                color={
                                                    isStarred ? colors.accent : colors.muted
                                                }
                                                filled={isStarred}
                                            />
                                        </Pressable>
                                    ) : hasOverflowActions ? (
                                        <Pressable
                                            accessibilityLabel={`More options for ${track.title}`}
                                            accessibilityRole="button"
                                            onPress={(event) => {
                                                event.stopPropagation();
                                                contextMenu.openForTrack(track, detail);
                                            }}
                                            style={styles.trackMenuButton}
                                        >
                                            <MoreGlyph color={colors.muted} />
                                        </Pressable>
                                    ) : null}
                                </Pressable>
                            );
                        })
                    )}
                </View>
            )}
            <TrackPlaylistMenu
                actionState={playlistActionState}
                onAddToPlaylist={(playlist) => void handleAddToPlaylist(playlist)}
                onClose={() => {
                    setPlaylistMenuTrack(null);
                    setPlaylistActionState({ status: 'idle' });
                }}
                playlists={playlistTargets}
                track={playlistMenuTrack}
            />
        </>
    );
};

const ArtistDetailSections = ({
    detail,
    emptyText,
    onPlayTrack,
    onSelectItem,
    sectionTitle,
}: {
    detail: MobileMediaDetail;
    emptyText: string;
    onPlayTrack: (detail: MobileMediaDetail, track: MobileMediaTrack, index: number) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionTitle: string;
}) => {
    const [bioExpanded, setBioExpanded] = useState(false);
    const contextMenu = useMediaContextMenu();
    const albums = detail.items ?? [];
    const topTracks = detail.topTracks ?? [];
    const appearsOnItems = detail.appearsOnItems ?? [];
    const relatedArtists = detail.relatedArtists ?? [];
    const biography = detail.biography;

    return (
        <>
            {biography ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text
                        numberOfLines={bioExpanded ? undefined : 4}
                        style={styles.artistBio}
                    >
                        {biography}
                    </Text>
                    {biography.length > 240 ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setBioExpanded((value) => !value)}
                        >
                            <Text style={styles.artistBioToggle}>
                                {bioExpanded ? 'Show less' : 'Read more'}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            {topTracks.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Top Tracks</Text>
                    {topTracks.map((track, index) => {
                        const showTrackHiRes = isPlaybackHiRes(track.playback);
                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={`${track.id}:${index}`}
                                onLongPress={() => contextMenu.openForTrack(track, detail)}
                                onPress={() => onPlayTrack(detail, track, index)}
                                style={styles.trackRow}
                            >
                                {track.artworkUrl ? (
                                    <Image
                                        source={{ uri: track.artworkUrl }}
                                        style={styles.trackArtwork}
                                    />
                                ) : (
                                    <View style={styles.trackArtworkFallback}>
                                        <Text style={styles.trackArtworkLetter}>
                                            {track.title.slice(0, 1).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.searchRowText}>
                                    <View style={styles.rowTitleWithBadge}>
                                        <Text
                                            numberOfLines={1}
                                            style={[styles.searchTitle, styles.rowTitleText]}
                                        >
                                            {track.title}
                                        </Text>
                                        {showTrackHiRes ? <HiResBadge compact /> : null}
                                    </View>
                                    {track.subtitle ? (
                                        <Text numberOfLines={1} style={styles.mediaSubtitle}>
                                            {track.subtitle}
                                        </Text>
                                    ) : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}

            <View style={styles.homeSection}>
                <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                {albums.length === 0 ? (
                    <Text style={styles.mutedText}>{emptyText}</Text>
                ) : (
                    <View style={styles.artistAlbumGrid}>
                        {albums.map((item) => (
                            <ArtistAlbumTile
                                item={item}
                                key={item.id}
                                onSelectItem={onSelectItem}
                            />
                        ))}
                    </View>
                )}
            </View>

            {appearsOnItems.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Appears On</Text>
                    <View style={styles.artistAlbumGrid}>
                        {appearsOnItems.map((item) => (
                            <ArtistAlbumTile
                                item={item}
                                key={item.id}
                                onSelectItem={onSelectItem}
                            />
                        ))}
                    </View>
                </View>
            ) : null}

            {relatedArtists.length > 0 ? (
                <View style={styles.homeSection}>
                    <Text style={styles.sectionTitle}>Similar Artists</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {relatedArtists.map((item) => (
                            <Pressable
                                accessibilityRole="button"
                                key={item.id}
                                onLongPress={() => contextMenu.openForItem(item)}
                                onPress={() => onSelectItem(item)}
                                style={styles.relatedArtistTile}
                            >
                                <ArtworkImage
                                    fallbackStyle={styles.relatedArtistArtworkFallback}
                                    letter={item.title.slice(0, 1)}
                                    style={styles.relatedArtistArtwork}
                                    uri={item.artworkUrl}
                                />
                                <Text numberOfLines={2} style={styles.relatedArtistTitle}>
                                    {item.title}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </>
    );
};

const ArtistAlbumTile = ({
    item,
    onSelectItem,
}: {
    item: MobileHomeItem;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
}) => {
    const contextMenu = useMediaContextMenu();
    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={() => onSelectItem(item)}
            style={styles.artistAlbumGridItem}
        >
            <ArtworkImage
                fallbackStyle={styles.artistAlbumGridFallback}
                letter={item.title.slice(0, 1)}
                style={styles.artistAlbumGridArtwork}
                uri={item.artworkUrl}
            />
            <Text numberOfLines={2} style={styles.artistAlbumGridTitle}>
                {item.title}
            </Text>
            {item.subtitle ? (
                <Text numberOfLines={1} style={styles.mediaSubtitle}>
                    {item.subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
};

const TrackPlaylistMenu = ({
    actionState,
    onAddToPlaylist,
    onClose,
    playlists,
    track,
}: {
    actionState:
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' };
    onAddToPlaylist: (playlist: MobileHomeItem) => void;
    onClose: () => void;
    playlists: MobileHomeItem[];
    track: MobileMediaTrack | null;
}) => {
    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(track)}>
            <Pressable onPress={onClose} style={styles.contextMenuBackdrop}>
                <Pressable onPress={(event) => event.stopPropagation()} style={styles.contextMenu}>
                    <Text numberOfLines={1} style={styles.contextMenuEyebrow}>
                        Add to playlist
                    </Text>
                    <Text numberOfLines={2} style={styles.contextMenuTitle}>
                        {track?.title ?? 'Track'}
                    </Text>
                    <ScrollView style={styles.contextMenuList}>
                        {playlists.length === 0 ? (
                            <Text style={styles.mutedText}>
                                No playlists from this music server yet.
                            </Text>
                        ) : (
                            playlists.map((playlist) => {
                                const isLoading =
                                    actionState.status === 'loading' &&
                                    actionState.playlistId === playlist.id;

                                return (
                                    <Pressable
                                        accessibilityRole="button"
                                        disabled={actionState.status === 'loading'}
                                        key={getContentItemKey(playlist)}
                                        onPress={() => onAddToPlaylist(playlist)}
                                        style={styles.contextMenuRow}
                                    >
                                        <Text numberOfLines={1} style={styles.contextMenuRowText}>
                                            {playlist.title}
                                        </Text>
                                        {isLoading ? (
                                            <ActivityIndicator color={colors.accent} size="small" />
                                        ) : null}
                                    </Pressable>
                                );
                            })
                        )}
                    </ScrollView>
                    {actionState.status === 'error' ? (
                        <Text style={styles.contextMenuError}>{actionState.message}</Text>
                    ) : actionState.status === 'success' ? (
                        <Text style={styles.contextMenuSuccess}>{actionState.message}</Text>
                    ) : null}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

interface MediaContextMenuAction {
    destructive?: boolean;
    icon?: ReactNode;
    id: string;
    label: string;
    onPress: () => void;
}

const MediaContextMenu = ({
    actions,
    artworkUrl,
    eyebrow,
    feedback,
    isCircularArtwork,
    onClose,
    subtitle,
    target,
    title,
}: {
    actions: MediaContextMenuAction[];
    artworkUrl?: string;
    eyebrow: string;
    feedback: string | null;
    isCircularArtwork?: boolean;
    onClose: () => void;
    subtitle?: string;
    target: MediaContextMenuTarget | null;
    title: string;
}) => {
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const translateAnim = useRef(new Animated.Value(24)).current;
    const visible = target !== null;

    useEffect(() => {
        if (!visible) {
            return;
        }

        Animated.parallel([
            Animated.timing(opacityAnim, {
                duration: 140,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                bounciness: 7,
                speed: 22,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.spring(translateAnim, {
                bounciness: 7,
                speed: 22,
                toValue: 0,
                useNativeDriver: true,
            }),
        ]).start();

        return () => {
            opacityAnim.setValue(0);
            scaleAnim.setValue(0.92);
            translateAnim.setValue(24);
        };
    }, [opacityAnim, scaleAnim, translateAnim, visible]);

    return (
        <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
            <Animated.View style={[styles.mediaContextBackdrop, { opacity: opacityAnim }]}>
                <Pressable onPress={onClose} style={styles.mediaContextBackdropPress} />
                <Animated.View
                    style={[
                        styles.mediaContextSheet,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }, { translateY: translateAnim }],
                        },
                    ]}
                >
                    <View style={styles.mediaContextHeaderRow}>
                        <ArtworkImage
                            fallbackStyle={[
                                styles.mediaContextArtworkFallback,
                                isCircularArtwork && styles.mediaContextArtworkRound,
                            ]}
                            letter={title.slice(0, 1)}
                            style={[
                                styles.mediaContextArtwork,
                                isCircularArtwork && styles.mediaContextArtworkRound,
                            ]}
                            uri={artworkUrl}
                        />
                        <View style={styles.mediaContextHeaderText}>
                            <Text style={styles.mediaContextEyebrow}>{eyebrow}</Text>
                            <Text numberOfLines={1} style={styles.mediaContextTitle}>
                                {title}
                            </Text>
                            {subtitle ? (
                                <Text numberOfLines={1} style={styles.mediaContextSubtitle}>
                                    {subtitle}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <View style={styles.mediaContextDivider} />
                    <View style={styles.mediaContextActions}>
                        {actions.length === 0 ? (
                            <Text style={styles.mediaContextEmpty}>No actions available.</Text>
                        ) : (
                            actions.map((action, index) => (
                                <Pressable
                                    accessibilityRole="button"
                                    android_ripple={{
                                        borderless: false,
                                        color: 'rgba(255, 255, 255, 0.06)',
                                    }}
                                    key={action.id}
                                    onPress={() => {
                                        triggerImpact('light');
                                        action.onPress();
                                    }}
                                    style={[
                                        styles.mediaContextActionRow,
                                        index === actions.length - 1 &&
                                            styles.mediaContextActionRowLast,
                                    ]}
                                >
                                    <View style={styles.mediaContextActionIcon}>
                                        {action.icon ?? null}
                                    </View>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.mediaContextActionLabel,
                                            action.destructive && styles.mediaContextActionDestructive,
                                        ]}
                                    >
                                        {action.label}
                                    </Text>
                                </Pressable>
                            ))
                        )}
                    </View>
                    {feedback ? (
                        <Text style={styles.mediaContextFeedback}>{feedback}</Text>
                    ) : null}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

type BookInfoState =
    | {
          detail: MobileMediaDetail;
          item: AndroidRecentContentSourceItem;
          status: 'loaded';
          variant: 'audiobook' | 'podcast';
      }
    | {
          item: AndroidRecentContentSourceItem;
          message: string;
          status: 'error';
          variant: 'audiobook' | 'podcast';
      }
    | {
          item: AndroidRecentContentSourceItem;
          status: 'loading';
          variant: 'audiobook' | 'podcast';
      }
    | { status: 'idle' };

const BookInformationModal = ({
    onClose,
    state,
}: {
    onClose: () => void;
    state: BookInfoState;
}) => {
    if (state.status === 'idle') {
        return null;
    }

    const variant = state.variant;
    const fallbackItem = state.item;
    const detail = state.status === 'loaded' ? state.detail : null;
    const title = detail?.title ?? fallbackItem.title;
    const subtitle = detail?.subtitle ?? fallbackItem.subtitle;
    const artworkUrl = detail?.artworkUrl ?? fallbackItem.artworkUrl;
    const metadataLines = detail?.metadataLines ?? [];
    const description = detail?.biography;
    const eyebrow = variant === 'audiobook' ? 'About the book' : 'About the podcast';

    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible>
            <Pressable onPress={onClose} style={styles.bookInfoBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.bookInfoSheet}
                >
                    <ScrollView
                        bounces={false}
                        contentContainerStyle={styles.bookInfoScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.bookInfoArtworkWrap}>
                            <ArtworkImage
                                fallbackStyle={styles.bookInfoArtworkFallback}
                                letter={title.slice(0, 1)}
                                style={styles.bookInfoArtwork}
                                uri={artworkUrl}
                            />
                        </View>
                        <Text style={styles.bookInfoEyebrow}>{eyebrow}</Text>
                        <Text style={styles.bookInfoTitle}>{title}</Text>
                        {subtitle ? (
                            <Text style={styles.bookInfoAuthor}>{subtitle}</Text>
                        ) : null}
                        {state.status === 'loading' ? (
                            <View style={styles.bookInfoLoading}>
                                <ActivityIndicator color={colors.accent} />
                            </View>
                        ) : state.status === 'error' ? (
                            <Text style={styles.bookInfoError}>{state.message}</Text>
                        ) : (
                            <>
                                {metadataLines.length > 0 ? (
                                    <View style={styles.bookInfoMetadata}>
                                        {metadataLines.map((line, index) => (
                                            <Text
                                                key={`${line}:${index}`}
                                                style={styles.bookInfoMetadataLine}
                                            >
                                                {line}
                                            </Text>
                                        ))}
                                    </View>
                                ) : null}
                                {description ? (
                                    <>
                                        <Text style={styles.bookInfoSectionTitle}>
                                            Description
                                        </Text>
                                        <Text style={styles.bookInfoDescription}>
                                            {description}
                                        </Text>
                                    </>
                                ) : metadataLines.length === 0 ? (
                                    <Text style={styles.bookInfoEmpty}>
                                        No additional information available from the server.
                                    </Text>
                                ) : null}
                            </>
                        )}
                    </ScrollView>
                    <Pressable
                        accessibilityRole="button"
                        onPress={onClose}
                        style={styles.bookInfoCloseButton}
                    >
                        <Text style={styles.bookInfoCloseLabel}>Done</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const StreamInfoModal = ({
    item,
    onClose,
}: {
    item: AndroidRecentContentSourceItem | null;
    onClose: () => void;
}) => {
    if (!item) {
        return null;
    }

    const streamUrl = item.playback?.url;
    const homepage =
        item.playback?.subtitle && /^https?:/i.test(item.playback.subtitle)
            ? item.playback.subtitle
            : undefined;

    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible>
            <Pressable onPress={onClose} style={styles.mediaContextBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.mediaContextSheet}
                >
                    <Text style={styles.contextMenuEyebrow}>Stream Information</Text>
                    <Text numberOfLines={2} style={styles.contextMenuTitle}>
                        {item.title}
                    </Text>
                    {item.subtitle && item.subtitle !== homepage ? (
                        <Text style={styles.mediaContextSubtitle}>{item.subtitle}</Text>
                    ) : null}
                    <View style={styles.mediaContextActions}>
                        {homepage ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Homepage</Text>
                                <Text numberOfLines={2} style={styles.streamInfoValue}>
                                    {homepage}
                                </Text>
                            </View>
                        ) : null}
                        {streamUrl ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Stream URL</Text>
                                <Text numberOfLines={3} style={styles.streamInfoValue}>
                                    {streamUrl}
                                </Text>
                            </View>
                        ) : null}
                        {item.source?.title ? (
                            <View style={styles.streamInfoRow}>
                                <Text style={styles.streamInfoLabel}>Server</Text>
                                <Text numberOfLines={1} style={styles.streamInfoValue}>
                                    {item.source.title}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const formatTrackDuration = (durationSeconds: number | undefined) => {
    if (!durationSeconds) {
        return undefined;
    }

    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60)
        .toString()
        .padStart(2, '0');

    return `${minutes}:${seconds}`;
};

const formatTrackTimestamp = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) {
        return undefined;
    }

    return `Starts ${formatTrackDuration(seconds)}`;
};

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

const darkenColor = (hex: string, factor: number): string => {
    const clean = hex.replace('#', '').replace(/^(..)(..)(..).*/, '$1$2$3');
    if (clean.length !== 6) return '#000000';
    const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
};

const getActivePlaybackStatus = (
    status: AndroidNativePlaybackEvent['status'],
    fallback: AndroidPlaybackStatus,
): AndroidPlaybackStatus => {
    return status === 'idle' ? fallback : status;
};

const getPlaybackItemDurationMs = (item: MobilePlayableAudio) => {
    return item.durationSeconds && item.durationSeconds > 0
        ? item.durationSeconds * 1000
        : undefined;
};

const getPlaybackEventDurationMs = (
    event: AndroidNativePlaybackEvent,
    item: MobilePlayableAudio,
) => {
    return event.durationMs && event.durationMs > 0
        ? event.durationMs
        : getPlaybackItemDurationMs(item);
};

const getPlaybackDurationMs = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return undefined;
    }

    return playbackState.durationMs && playbackState.durationMs > 0
        ? playbackState.durationMs
        : getPlaybackItemDurationMs(playbackState.item);
};

const getActiveTimelineSegment = (item: MobilePlayableAudio, positionMs: number | undefined) => {
    if (!item.timelineSegments || item.timelineSegments.length === 0) {
        return undefined;
    }

    const fallbackPositionMs =
        item.initialPositionSeconds && item.initialPositionSeconds > 0
            ? item.initialPositionSeconds * 1000
            : 0;
    const positionSeconds = (positionMs ?? fallbackPositionMs) / 1000;
    const orderedSegments = [...item.timelineSegments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    let activeSegment: MobilePlaybackSegment | undefined;

    for (const segment of orderedSegments) {
        if (segment.startSeconds <= positionSeconds + 0.5) {
            activeSegment = segment;
        }
    }

    return activeSegment;
};

const getPlaybackDisplayMetadata = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return { subtitle: undefined, title: '' };
    }

    const item = playbackState.item;
    const activeSegment = getActiveTimelineSegment(item, playbackState.positionMs);
    const useSegmentTitle = item.source === 'audiobook' && activeSegment?.title;
    const chapterSubtitle =
        item.source === 'podcast' && activeSegment?.title ? activeSegment.title : undefined;
    const fallbackSubtitle = item.source === 'radio' ? 'Radio' : getSourceLabel(item.source);

    return {
        subtitle: chapterSubtitle ?? getDisplaySubtitle(item.subtitle) ?? fallbackSubtitle,
        title: useSegmentTitle ? (activeSegment.title ?? item.title) : item.title,
    };
};

const isLivePlayback = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return false;
    }

    return playbackState.item.source === 'radio' && playbackState.item.isLive !== false;
};

const getSourceLabel = (source: MobilePlayableAudio['source']) => {
    if (source === 'audiobook') return 'Audiobook';
    if (source === 'podcast') return 'Podcast';
    if (source === 'radio') return 'Radio';

    return 'Music';
};

const looksLikeUrl = (value: string | undefined) => {
    if (!value) {
        return false;
    }

    return /^(https?:\/\/|www\.|[a-z]+:\/\/)/i.test(value.trim());
};

const getDisplaySubtitle = (subtitle: string | undefined) => {
    if (!subtitle || looksLikeUrl(subtitle)) {
        return undefined;
    }

    return subtitle;
};

const formatPlaybackTime = (milliseconds: number | undefined) => {
    if (!milliseconds || milliseconds <= 0) {
        return '0:00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds}`;
    }

    return `${minutes}:${seconds}`;
};

const getDurationLabel = (playbackState: AndroidPlaybackState) => {
    if (playbackState.status === 'idle') {
        return '';
    }

    if (playbackState.item.source === 'radio') {
        return 'RADIO';
    }

    return formatPlaybackTime(getPlaybackDurationMs(playbackState));
};

const getAdjacentSegmentTargetMs = (
    segments: MobilePlaybackSegment[] | undefined,
    positionMs: number,
    direction: -1 | 1,
) => {
    if (!segments || segments.length === 0) {
        return undefined;
    }

    const orderedSegments = [...segments].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const positionSeconds = positionMs / 1000;

    if (direction === 1) {
        const nextSegment = orderedSegments.find(
            (segment) => segment.startSeconds > positionSeconds + 1,
        );

        return nextSegment ? nextSegment.startSeconds * 1000 : undefined;
    }

    let currentIndex = -1;

    for (let index = orderedSegments.length - 1; index >= 0; index -= 1) {
        const segment = orderedSegments[index];

        if (segment && segment.startSeconds <= positionSeconds) {
            currentIndex = index;
            break;
        }
    }
    const currentSegment = orderedSegments[currentIndex];

    if (currentSegment && positionSeconds - currentSegment.startSeconds > 3) {
        return currentSegment.startSeconds * 1000;
    }

    return currentIndex > 0 ? orderedSegments[currentIndex - 1].startSeconds * 1000 : undefined;
};

const getSeekSegments = (
    segments: MobilePlaybackSegment[] | undefined,
    durationMs: number | undefined,
) => {
    const durationSeconds = durationMs ? durationMs / 1000 : 0;
    const orderedSegments = [...(segments ?? [])].sort(
        (left, right) => left.startSeconds - right.startSeconds,
    );
    const timelineSegments = orderedSegments.flatMap((segment, index) => {
        const nextStart = orderedSegments[index + 1]?.startSeconds;
        const segmentEnd =
            segment.durationSeconds !== undefined
                ? segment.startSeconds + segment.durationSeconds
                : nextStart !== undefined
                  ? nextStart
                  : durationSeconds;
        const segmentDuration = Math.max(0, segmentEnd - segment.startSeconds);

        return segmentDuration > 0 ? [{ ...segment, durationSeconds: segmentDuration }] : [];
    });

    if (timelineSegments.length > 1) {
        return timelineSegments;
    }

    return [{ durationSeconds: Math.max(1, durationSeconds), id: 'full', startSeconds: 0 }];
};

const PlayPauseGlyph = ({
    color,
    isPlaying,
    size = 18,
}: {
    color: string;
    isPlaying: boolean;
    size?: number;
}) => {
    if (isPlaying) {
        // Proportional bar sizing so the pause icon looks correct at any size
        // (the previous version used height: '100%' with a fixed 5px width,
        // which made the fullscreen pause icon look like two narrow stripes).
        const barWidth = Math.max(3, Math.round(size * 0.18));
        const barHeight = Math.round(size * 0.7);
        const gap = Math.max(3, Math.round(size * 0.18));
        return (
            <View
                style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap,
                    height: size,
                    justifyContent: 'center',
                    width: size,
                }}
            >
                <View
                    style={{
                        backgroundColor: color,
                        borderRadius: Math.max(1, Math.round(barWidth / 2.5)),
                        height: barHeight,
                        width: barWidth,
                    }}
                />
                <View
                    style={{
                        backgroundColor: color,
                        borderRadius: Math.max(1, Math.round(barWidth / 2.5)),
                        height: barHeight,
                        width: barWidth,
                    }}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.playGlyph,
                {
                    borderBottomWidth: size * 0.38,
                    borderLeftColor: color,
                    borderLeftWidth: size * 0.58,
                    borderTopWidth: size * 0.38,
                },
            ]}
        />
    );
};

const TrackSkipGlyph = ({ color, direction }: { color: string; direction: -1 | 1 }) => {
    const triangleStyle =
        direction === 1
            ? {
                  borderBottomWidth: 7,
                  borderLeftColor: color,
                  borderLeftWidth: 10,
                  borderTopWidth: 7,
              }
            : {
                  borderBottomWidth: 7,
                  borderRightColor: color,
                  borderRightWidth: 10,
                  borderTopWidth: 7,
              };
    const triangles = (
        <View style={styles.skipGlyphTriangles}>
            <View style={[styles.skipGlyphTriangle, triangleStyle]} />
            <View style={[styles.skipGlyphTriangle, triangleStyle]} />
        </View>
    );
    const bar = <View style={[styles.skipGlyphBar, { backgroundColor: color }]} />;

    return (
        <View style={styles.skipGlyph}>
            {direction === -1 ? bar : null}
            {triangles}
            {direction === 1 ? bar : null}
        </View>
    );
};

const EllipsisVerticalGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', gap: 2, justifyContent: 'center' }}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
        </View>
    );
};

const FullPlayerImageGlyph = ({
    active,
    color,
    size,
    source,
}: {
    active?: boolean;
    color: string;
    size: number;
    source: ImageSourcePropType;
}) => {
    return (
        <View style={{ alignItems: 'center', height: 28, justifyContent: 'center', width: 28 }}>
            <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={source}
                style={{ height: size, tintColor: color, width: size }}
            />
            <View style={{
                backgroundColor: active ? colors.accent : 'transparent',
                borderRadius: 2,
                bottom: 0,
                height: 3,
                position: 'absolute',
                width: 3,
            }} />
        </View>
    );
};

const SleepTimerGlyph = ({ active, color }: { active?: boolean; color: string }) => {
    return (
        <FullPlayerImageGlyph active={active} color={color} size={24} source={sleepTimerIcon} />
    );
};

const CastGlyph = ({ color = colors.text }: { color?: string }) => {
    return (
        <View style={[styles.castGlyph, { borderColor: color }]}>
            <View style={[styles.castGlyphDot, { backgroundColor: color }]} />
            <View style={[styles.castGlyphWaveSmall, { borderColor: color }]} />
            <View style={[styles.castGlyphWaveLarge, { borderColor: color }]} />
        </View>
    );
};

const DownCaretGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.downCaretGlyph}>
            <View
                style={[
                    styles.downCaretStroke,
                    styles.downCaretStrokeLeft,
                    { backgroundColor: color },
                ]}
            />
            <View
                style={[
                    styles.downCaretStroke,
                    styles.downCaretStrokeRight,
                    { backgroundColor: color },
                ]}
            />
        </View>
    );
};

const GearGlyph = ({ color }: { color: string }) => {
    return (
        <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.gearGlyphText, { color }]}
        >
            ⚙
        </Text>
    );
};

const SearchGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.searchGlyph}>
            <View style={[styles.searchGlyphCircle, { borderColor: color }]} />
            <View style={[styles.searchGlyphHandle, { backgroundColor: color }]} />
        </View>
    );
};

const ClearGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.clearGlyph}>
            <View
                style={[
                    styles.clearGlyphStroke,
                    { backgroundColor: color, transform: [{ rotate: '45deg' }] },
                ]}
            />
            <View
                style={[
                    styles.clearGlyphStroke,
                    { backgroundColor: color, transform: [{ rotate: '-45deg' }] },
                ]}
            />
        </View>
    );
};

const SortGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.sortGlyph}>
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 14 }]} />
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 10 }]} />
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 6 }]} />
        </View>
    );
};

const MoreGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.moreGlyph}>
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
        </View>
    );
};

const HeartGlyph = ({ color, filled }: { color: string; filled?: boolean }) => {
    return (
        <Image
            accessibilityElementsHidden
            importantForAccessibility="no"
            resizeMode="contain"
            source={heartIcon}
            style={{
                height: 18,
                opacity: filled ? 1 : 0.55,
                tintColor: color,
                width: 18,
            }}
        />
    );
};

const PlaylistAddGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 20 }}>
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 14 }} />
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 10 }} />
            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 6 }} />
                <View style={{ marginLeft: 4, position: 'relative', height: 10, width: 10 }}>
                    <View style={{ backgroundColor: color, height: 2, left: 0, position: 'absolute', top: 4, width: 10 }} />
                    <View style={{ backgroundColor: color, height: 10, left: 4, position: 'absolute', top: 0, width: 2 }} />
                </View>
            </View>
        </View>
    );
};

const QueueAddGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 20 }}>
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 18 }} />
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 18 }} />
            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 8 }} />
                <View style={{ height: 10, position: 'relative', width: 10 }}>
                    <View style={{ backgroundColor: color, height: 2, left: 0, position: 'absolute', top: 4, width: 10 }} />
                    <View style={{ backgroundColor: color, height: 10, left: 4, position: 'absolute', top: 0, width: 2 }} />
                </View>
            </View>
        </View>
    );
};

const PersonGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', height: 18, width: 20 }}>
            <View style={{
                borderColor: color,
                borderRadius: 5,
                borderWidth: 1.6,
                height: 8,
                width: 8,
            }} />
            <View style={{
                borderColor: color,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderTopWidth: 1.6,
                borderLeftWidth: 1.6,
                borderRightWidth: 1.6,
                height: 7,
                marginTop: 1,
                width: 14,
            }} />
        </View>
    );
};

const DiscGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', height: 18, justifyContent: 'center', width: 20 }}>
            <View style={{
                borderColor: color,
                borderRadius: 9,
                borderWidth: 1.6,
                height: 18,
                width: 18,
            }} />
            <View style={{
                backgroundColor: color,
                borderRadius: 2,
                height: 4,
                position: 'absolute',
                width: 4,
            }} />
        </View>
    );
};

const RadioWaveGlyph = ({ color }: { color: string }) => {
    // Concentric arcs evoking a "radio / station" feel.
    return (
        <View style={{ alignItems: 'center', height: 18, justifyContent: 'center', width: 18 }}>
            <View
                style={{
                    borderColor: color,
                    borderRadius: 9,
                    borderWidth: 1.4,
                    height: 18,
                    opacity: 0.45,
                    position: 'absolute',
                    width: 18,
                }}
            />
            <View
                style={{
                    borderColor: color,
                    borderRadius: 6,
                    borderWidth: 1.4,
                    height: 12,
                    position: 'absolute',
                    width: 12,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 2,
                    height: 4,
                    width: 4,
                }}
            />
        </View>
    );
};

const CheckGlyph = ({ color, size = 14 }: { color: string; size?: number }) => {
    // Unicode check rendered as Text — cheap and renders consistently. The
    // tight lineHeight + textAlign keeps it centered inside its box rather
    // than dropping below the baseline like the default Text behavior.
    return (
        <Text
            accessibilityElementsHidden
            allowFontScaling={false}
            importantForAccessibility="no"
            style={{
                color,
                fontSize: size,
                fontWeight: '900',
                includeFontPadding: false,
                lineHeight: size,
                textAlign: 'center',
                textAlignVertical: 'center',
            }}
        >
            {'✓'}
        </Text>
    );
};

/**
 * Circular download progress indicator. A continuous accent-colored arc sweeps
 * clockwise from 12 o'clock over a dim background ring, with a download arrow
 * (or check, when complete) in the middle.
 */
const CircularDownloadGlyph = ({
    completed,
    progress,
}: {
    /** True when everything's saved and the user should see the "done" state. */
    completed: boolean;
    /** 0–1 fraction of how much is downloaded. */
    progress: number;
}) => {
    const SIZE = 30;
    const STROKE = 2;
    const RADIUS = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * RADIUS;
    const fraction = completed ? 1 : Math.min(1, Math.max(0, progress));
    const accent = colors.accent;
    const dim = 'rgba(255, 255, 255, 0.16)';

    return (
        <View
            pointerEvents="none"
            style={{
                alignItems: 'center',
                height: SIZE,
                justifyContent: 'center',
                width: SIZE,
            }}
        >
            <Svg
                height={SIZE}
                style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
                width={SIZE}
            >
                <SvgCircle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    fill="none"
                    r={RADIUS}
                    stroke={dim}
                    strokeWidth={STROKE}
                />
                {fraction > 0 ? (
                    <SvgCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        fill="none"
                        r={RADIUS}
                        stroke={accent}
                        strokeDasharray={`${CIRC * fraction}, ${CIRC}`}
                        strokeLinecap="round"
                        strokeWidth={STROKE}
                    />
                ) : null}
            </Svg>
            {completed ? (
                <CheckGlyph color={accent} size={14} />
            ) : (
                <DownloadGlyph color={progress > 0 ? accent : colors.text} />
            )}
        </View>
    );
};

const DownloadGlyph = ({ color }: { color: string }) => {
    // Downward arrow over a small tray — universal "download" affordance.
    return (
        <View style={{ alignItems: 'center', height: 20, justifyContent: 'center', width: 20 }}>
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 8,
                    width: 2.4,
                }}
            />
            <View
                style={{
                    borderLeftColor: 'transparent',
                    borderLeftWidth: 4,
                    borderRightColor: 'transparent',
                    borderRightWidth: 4,
                    borderTopColor: color,
                    borderTopWidth: 5,
                    height: 0,
                    marginTop: -1,
                    width: 0,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 2,
                    marginTop: 2,
                    width: 14,
                }}
            />
        </View>
    );
};

const BookInfoGlyph = ({ color }: { color: string }) => {
    return (
        <View
            style={{
                alignItems: 'center',
                borderColor: color,
                borderRadius: 9,
                borderWidth: 1.6,
                height: 18,
                justifyContent: 'center',
                width: 18,
            }}
        >
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 2 }} />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 7,
                    marginTop: 2,
                    width: 2,
                }}
            />
        </View>
    );
};

const ChaptersGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 18 }}>
            {[0, 1, 2].map((index) => (
                <View key={index} style={{ alignItems: 'center', flexDirection: 'row' }}>
                    <View
                        style={{
                            backgroundColor: color,
                            borderRadius: 1,
                            height: 2,
                            marginRight: 4,
                            width: 2,
                        }}
                    />
                    <View
                        style={{
                            backgroundColor: color,
                            borderRadius: 1,
                            height: 2,
                            width: 12,
                        }}
                    />
                </View>
            ))}
        </View>
    );
};

const PlayCircleGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.playCircleGlyph}>
            <PlayPauseGlyph color={color} isPlaying={false} size={14} />
        </View>
    );
};

const ShuffleGlyph = ({
    active,
    color,
    size = 24,
}: {
    active?: boolean;
    color: string;
    size?: number;
}) => {
    return (
        <FullPlayerImageGlyph
            active={active}
            color={active ? colors.accent : color}
            size={size}
            source={shuffleIcon}
        />
    );
};

const StarGlyph = ({ color, filled }: { color: string; filled: boolean }) => {
    return (
        <View style={styles.starGlyph}>
            <Text
                style={[styles.starGlyphText, { color }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
            >
                {filled ? '★' : '☆'}
            </Text>
        </View>
    );
};

const TabIcon = ({ active, id }: { active: boolean; id: SamoMobileTabId }) => {
    const color = active ? colors.text : colors.muted;

    if (id === 'home') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabHomeRoofLeft, { backgroundColor: color }]} />
                <View style={[styles.tabHomeRoofRight, { backgroundColor: color }]} />
                <View style={[styles.tabHomeBody, { borderColor: color }]} />
            </View>
        );
    }

    if (id === 'search') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabSearchCircle, { borderColor: color }]} />
                <View style={[styles.tabSearchHandle, { backgroundColor: color }]} />
            </View>
        );
    }

    if (id === 'library') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabLibraryBook, { borderColor: color }]} />
                <View style={[styles.tabLibraryBook, { borderColor: color, opacity: 0.72 }]} />
                <View style={[styles.tabLibraryBook, { borderColor: color, opacity: 0.5 }]} />
            </View>
        );
    }

    if (id === 'playlists') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabPlaylistLine, { backgroundColor: color, top: 5 }]} />
                <View
                    style={[styles.tabPlaylistLine, { backgroundColor: color, top: 11, width: 17 }]}
                />
                <View
                    style={[styles.tabPlaylistLine, { backgroundColor: color, top: 17, width: 12 }]}
                />
                <View style={[styles.tabPlaylistPlay, { borderLeftColor: color }]} />
            </View>
        );
    }

    return (
        <View style={styles.tabIcon}>
            <View style={[styles.tabRadioBody, { borderColor: color }]} />
            <View style={[styles.tabRadioAntenna, { backgroundColor: color }]} />
            <View style={[styles.tabRadioDot, { backgroundColor: color }]} />
            <View style={[styles.tabRadioLine, { backgroundColor: color }]} />
        </View>
    );
};

const PlayerIconButton = ({
    accessibilityLabel,
    children,
    onPress,
    primary,
    tint,
}: {
    accessibilityLabel: string;
    children: ReactNode;
    onPress: () => void;
    primary?: boolean;
    tint?: string;
}) => {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            onPress={onPress}
            style={[
                styles.playerControlButton,
                primary && styles.playerControlButtonPrimary,
                primary && tint ? { backgroundColor: tint } : null,
            ]}
        >
            {children}
        </Pressable>
    );
};

const MiniPlayer = ({
    lastPlayedItem,
    onOpenFullPlayer,
    onTogglePlayback,
    playbackState,
    playerProgress,
    reducedMotion,
}: {
    lastPlayedItem: MobilePlayableAudio | null;
    onOpenFullPlayer: () => void;
    onTogglePlayback: () => void;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    reducedMotion: boolean;
}) => {
    const [isMiniInteractive, setIsMiniInteractive] = useState(true);
    useAnimatedReaction(
        () => playerProgress.value < 0.12,
        (interactive, previous) => {
            if (interactive !== previous) {
                runOnJS(setIsMiniInteractive)(interactive);
            }
        },
    );

    // Keep the miniplayer visible long enough for the expanding fullscreen
    // surface to pick up its exact frame, then let the contents recede into it.
    const miniAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(playerProgress.value, [0, 0.26, 0.55], [1, 1, 0], 'clamp'),
        transform: [
            {
                translateY: interpolate(
                    playerProgress.value,
                    [0, 0.55],
                    [0, -32],
                    'clamp',
                ),
            },
            { scale: interpolate(playerProgress.value, [0, 0.55], [1, 0.985], 'clamp') },
        ],
    }));
    // Drag-up follows the finger by moving progress across the actual distance
    // between the mini player's top edge and the fullscreen top edge. That
    // keeps the expanding surface under the finger instead of behaving like a
    // generic modal sheet.
    //
    // Failure offsets keep horizontal swipes and the play/pause tap from
    // accidentally triggering the open gesture.
    const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
    const miniDragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(-8)
                .failOffsetX([-20, 20])
                .onChange((event) => {
                    'worklet';
                    if (event.translationY >= 0) {
                        playerProgress.value = 0;
                        return;
                    }
                    const next = -event.translationY / PLAYER_EXPANSION_DISTANCE;
                    playerProgress.value = next > 1 ? 1 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    const shouldCommit =
                        event.translationY < -PLAYER_EXPANSION_DISTANCE * 0.24 ||
                        event.velocityY < -760;
                    if (shouldCommit) {
                        runOnJS(onOpenFullPlayer)();
                    } else {
                        playerProgress.value = reducedMotion
                            ? withTiming(0, { duration: 0 })
                            : withSpring(0, {
                                  ...settleSpring,
                                  velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                              });
                    }
                }),
        [onOpenFullPlayer, playerProgress, reducedMotion, settleSpring],
    );

    const isActive = playbackState.status !== 'idle';
    const displayItem: MobilePlayableAudio | null = isActive
        ? playbackState.item
        : lastPlayedItem;
    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'buffering';
    const title = displayItem?.title ?? '';
    const subtitle = isActive
        ? (playbackState.message ?? getPlaybackDisplayMetadata(playbackState).subtitle)
        : (displayItem?.subtitle ?? undefined);
    const artworkUrl = displayItem?.artworkUrl;
    const showQuality = displayItem?.source === 'music';
    const showHiRes = isPlaybackHiRes(displayItem);
    const miniQualityItems = showQuality && displayItem
        ? buildAudioQualityBadgeItems({
              ...displayItem.quality,
              compact: true,
              mode: 'playerbar',
          })
        : [];

    const handlePlayPress = (event: GestureResponderEvent) => {
        event.stopPropagation();
        onTogglePlayback();
    };

    return (
        <GestureDetector gesture={miniDragGesture}>
        <Reanimated.View
            pointerEvents={isMiniInteractive ? 'auto' : 'none'}
            style={[styles.miniPlayer, miniAnimatedStyle]}
        >
            <Pressable
                accessibilityRole="button"
                onPress={onOpenFullPlayer}
                style={styles.miniPlayerTouchable}
            >
                {artworkUrl ? (
                    <ExpoImage
                        cachePolicy="memory-disk"
                        source={artworkUrl}
                        style={styles.miniPlayerArtwork}
                        transition={120}
                    />
                ) : (
                    <View style={styles.miniPlayerArtworkFallback}>
                        {title ? (
                            <Text style={styles.miniPlayerArtworkLetter}>
                                {title.slice(0, 1)}
                            </Text>
                        ) : null}
                    </View>
                )}
                <View style={styles.miniPlayerText}>
                    <View style={styles.miniPlayerTitleRow}>
                        <Text
                            numberOfLines={1}
                            style={[styles.miniPlayerTitle, styles.rowTitleText]}
                        >
                            {title || 'Nothing playing'}
                        </Text>
                        {showHiRes ? <HiResBadge compact /> : null}
                    </View>
                    {subtitle ? (
                        <Text numberOfLines={1} style={styles.miniPlayerSubtitle}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {miniQualityItems.length > 0 ? (
                    <View style={styles.miniPlayerQuality}>
                        {miniQualityItems.slice(0, 3).map((item, index) => (
                            <Text
                                key={`${item.label}-${index}`}
                                numberOfLines={1}
                                style={[
                                    styles.miniPlayerQualityLabel,
                                    item.tone === 'direct' && styles.miniPlayerQualityLabelDirect,
                                ]}
                            >
                                {item.label}
                            </Text>
                        ))}
                    </View>
                ) : null}
                <Pressable
                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                    accessibilityRole="button"
                    disabled={!displayItem}
                    onPress={handlePlayPress}
                    style={styles.miniPlayerPlayButton}
                >
                    <PlayPauseGlyph color={colors.text} isPlaying={isPlaying} size={24} />
                </Pressable>
            </Pressable>
        </Reanimated.View>
        </GestureDetector>
    );
};

const QualityBadgeRow = ({ items }: { items: ReturnType<typeof buildAudioQualityBadgeItems> }) => {
    return (
        <View style={styles.qualityBadgeRow}>
            {items.map((item, index) => (
                <View
                    key={`${item.label}-${index}`}
                    style={[
                        styles.qualityBadge,
                        item.tone === 'direct'
                            ? styles.qualityBadgeDirect
                            : item.tone === 'transcoded'
                              ? styles.qualityBadgeTranscoded
                              : item.tone === 'unknown'
                                ? styles.qualityBadgeUnknown
                                : null,
                    ]}
                >
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.qualityBadgeText,
                            item.tone === 'direct'
                                ? styles.qualityBadgeTextDirect
                                : item.tone === 'transcoded'
                                  ? styles.qualityBadgeTextTranscoded
                                  : item.tone === 'unknown'
                                    ? styles.qualityBadgeTextUnknown
                                    : null,
                        ]}
                    >
                        {item.label}
                    </Text>
                </View>
            ))}
        </View>
    );
};

const HiResBadge = ({
    compact = false,
    overlay = false,
    player = false,
}: {
    compact?: boolean;
    overlay?: boolean;
    player?: boolean;
}) => (
    <Image
        accessibilityLabel="Hi-Res Audio"
        source={hiResAudioBadge}
        style={[
            styles.hiResBadge,
            compact && styles.hiResBadgeCompact,
            overlay && styles.hiResBadgeOverlay,
            player && styles.hiResBadgePlayer,
        ]}
    />
);

const SegmentedSeekBar = ({
    durationMs,
    isLive,
    onSeek,
    positionMs,
    segments,
    tint,
}: {
    durationMs?: number;
    isLive: boolean;
    onSeek: (positionMs: number) => void;
    positionMs?: number;
    segments?: MobilePlaybackSegment[];
    tint: string;
}) => {
    const [trackWidth, setTrackWidth] = useState(0);
    const isSeekable = !isLive && Boolean(durationMs && durationMs > 0 && trackWidth > 0);
    const seekSegments = getSeekSegments(segments, durationMs);
    const seekFromLocation = useCallback(
        (locationX: number) => {
            if (!isSeekable || !durationMs) {
                return;
            }

            const nextProgress = clamp(locationX / trackWidth, 0, 1);

            onSeek(nextProgress * durationMs);
        },
        [durationMs, isSeekable, onSeek, trackWidth],
    );
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: () => isSeekable,
                onPanResponderGrant: (event) => seekFromLocation(event.nativeEvent.locationX),
                onPanResponderMove: (event) => seekFromLocation(event.nativeEvent.locationX),
                onStartShouldSetPanResponder: () => isSeekable,
            }),
        [isSeekable, seekFromLocation],
    );

    const globalProgress =
        !isLive && durationMs && durationMs > 0
            ? clamp((positionMs ?? 0) / durationMs, 0, 1)
            : null;

    return (
        <View
            {...panResponder.panHandlers}
            onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
            style={styles.segmentedSeekTrack}
        >
            {isLive ? (
                <View style={[styles.seekSegment, styles.seekSegmentLive]}>
                    <View style={[styles.seekSegmentLiveFill, { backgroundColor: tint }]} />
                </View>
            ) : (
                seekSegments.map((segment, index) => {
                    const segmentStartMs = segment.startSeconds * 1000;
                    const segmentDurationMs = (segment.durationSeconds ?? 0) * 1000;
                    const segmentProgress =
                        segmentDurationMs > 0
                            ? clamp(((positionMs ?? 0) - segmentStartMs) / segmentDurationMs, 0, 1)
                            : 0;

                    return (
                        <View
                            key={`${segment.id}-${index}`}
                            style={[
                                styles.seekSegment,
                                {
                                    flexGrow: segment.durationSeconds ?? 1,
                                    marginRight: index === seekSegments.length - 1 ? 0 : 4,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.seekSegmentFill,
                                    {
                                        backgroundColor: tint,
                                        width: `${segmentProgress * 100}%`,
                                    },
                                ]}
                            />
                        </View>
                    );
                })
            )}
            {globalProgress !== null && trackWidth > 0 ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.seekThumb,
                        {
                            backgroundColor: tint,
                            left: globalProgress * trackWidth - SEEK_THUMB_WIDTH / 2,
                        },
                    ]}
                />
            ) : null}
        </View>
    );
};

const SEEK_THUMB_WIDTH = 5;

const findActiveChapterIndex = (
    chapters: MobilePlaybackSegment[],
    positionSeconds: number,
): number => {
    let index = -1;
    for (let i = 0; i < chapters.length; i += 1) {
        if (chapters[i].startSeconds <= positionSeconds) {
            index = i;
        } else {
            break;
        }
    }
    return index;
};

const formatChapterRange = (chapter: MobilePlaybackSegment): string => {
    const start = formatPlaybackTime(chapter.startSeconds * 1000);
    if (chapter.durationSeconds === undefined) {
        return start;
    }
    return `${start} · ${formatPlaybackTime(chapter.durationSeconds * 1000)}`;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PLAYER_SAFE_TOP = Platform.OS === 'android' ? 24 : 0;
const MINI_PLAYER_BOTTOM = 75;
const MINI_PLAYER_ARTWORK_SIZE = 58;
const MINI_PLAYER_VERTICAL_PADDING = 10;
const MINI_PLAYER_HEIGHT = MINI_PLAYER_ARTWORK_SIZE + MINI_PLAYER_VERTICAL_PADDING * 2;
const MINI_PLAYER_RADIUS = 28;
const FULL_PLAYER_EXPANDED_TOP = -PLAYER_SAFE_TOP;
const FULL_PLAYER_PADDING_TOP = Platform.OS === 'android' ? 42 : 24;
const FULL_PLAYER_PADDING_BOTTOM = 28;
const MINI_PLAYER_COLLAPSED_TOP =
    SCREEN_HEIGHT - PLAYER_SAFE_TOP - MINI_PLAYER_BOTTOM - MINI_PLAYER_HEIGHT;
const PLAYER_EXPANSION_DISTANCE = MINI_PLAYER_COLLAPSED_TOP - FULL_PLAYER_EXPANDED_TOP;
const FULL_PLAYER_ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.42);

// Tuned for a "weighty but settling" feel — never overshoots more than ~3%, lands
// in under 400 ms. Shared by the fullscreen player open and drag-cancel paths so
// both motions read as the same physical object.
const OPEN_SPRING = { damping: 26, mass: 0.9, stiffness: 220 } as const;
// When the OS-level "reduce motion" setting is on, use an effectively
// over-damped spring so the same code path arrives at the target without any
// overshoot, bounce, or sustained travel. Cheaper than special-casing
// withTiming everywhere and keeps the velocity-aware drag math intact.
const REDUCED_MOTION_SPRING = { damping: 90, mass: 1, stiffness: 400 } as const;

const useReducedMotionPreference = (): boolean => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        let cancelled = false;
        void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
            if (!cancelled) setReduced(value);
        });
        const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            (value) => {
                if (!cancelled) setReduced(value);
            },
        );
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);
    return reduced;
};
// How far the player must be dragged (or how fast it must be flung) before a
// release commits to dismiss instead of springing back.
const DISMISS_DISTANCE = PLAYER_EXPANSION_DISTANCE * 0.28;
const DISMISS_VELOCITY = 900;
// The queue sheet covers the lower 78% of the player when fully open; the
// remaining strip keeps a sliver of artwork visible for context.
const QUEUE_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);
const QUEUE_CLOSE_DISTANCE = 30;
const QUEUE_CLOSE_VELOCITY = 360;

// Two album cards must fit perfectly across the screen with breathing room.
const HOME_EDGE_PADDING = 10;
const HOME_TILE_GAP = 6;
const HOME_PRIMARY_TILE = Math.floor(
    (SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - HOME_TILE_GAP) / 2,
);
const HOME_COMPACT_OFFSET = 30;
const HOME_ROUNDED_OFFSET = 22;

// Parse #rrggbb into an RGB tuple in 0..255. Returns null on bad input.
const parseHex = (hex: string): [number, number, number] | null => {
    const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return null;
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
};

// sRGB↔OKLab conversions. OKLab is perceptually uniform — linear interpolation
// in OKLab produces visibly smooth gradients in their color family with no hue
// shift, which is what makes Tidal's player backdrop feel "in one piece"
// instead of muddied or banded.
//
// Constants are from Björn Ottosson's reference implementation
// (https://bottosson.github.io/posts/oklab/).
const srgbChannelToLinear = (c: number): number => {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
};
const linearChannelToSrgb = (c: number): number => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
};
const rgbToOklab = (
    r: number,
    g: number,
    b: number,
): [number, number, number] => {
    const lr = srgbChannelToLinear(r);
    const lg = srgbChannelToLinear(g);
    const lb = srgbChannelToLinear(b);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    ];
};
const oklabToHex = (L: number, a: number, b: number): string => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const r = linearChannelToSrgb(lr);
    const g = linearChannelToSrgb(lg);
    const bch = linearChannelToSrgb(lb);
    const out = (r << 16) | (g << 8) | bch;
    return `#${out.toString(16).padStart(6, '0')}`;
};

// Pick the album's representative color — whatever the image-colors extractor
// thinks is the most *characteristic* hue of the cover. We try `dominant`
// first (the actual most-frequent color, which is what the eye reads as the
// album's mood), then progressively fall back through the saturated/muted
// buckets. The only thing we reject is near-black, near-white, and near-grey
// — anything else passes straight through. No lightness manipulation, no
// chroma scoring; the gradient builder handles toning for legibility.
const pickAlbumEssenceColor = (result: ImageColorsResult): null | string => {
    const candidates: string[] = [];
    const push = (hex: null | string | undefined): void => {
        if (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex.trim())) {
            candidates.push(hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`);
        }
    };
    if (result.platform === 'android') {
        // Dominant first: it's the literal most-frequent color in the image,
        // which is what reads as "this album's color family". Vibrant /
        // muted variants are fallbacks for when dominant is missing.
        push(result.dominant);
        push(result.vibrant);
        push(result.muted);
        push(result.darkVibrant);
        push(result.darkMuted);
        push(result.average);
    } else if (result.platform === 'ios') {
        push(result.background);
        push(result.primary);
        push(result.secondary);
        push(result.detail);
    } else {
        push(result.dominant);
        push(result.vibrant);
        push(result.muted);
        push(result.darkVibrant);
        push(result.darkMuted);
    }

    for (const hex of candidates) {
        const rgb = parseHex(hex);
        if (!rgb) continue;
        const [L, a, b] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
        const C = Math.sqrt(a * a + b * b);
        // Skip only the genuine outliers: pure black/white covers and the
        // washed-out greys you'd get from a noise-heavy thumbnail.
        if (L < 0.06 || L > 0.96) continue;
        if (C < 0.012) continue;
        return hex;
    }
    return candidates[0] ?? null;
};

// Build the fullscreen player backdrop as a dense OKLab color field. The goal
// is closer to Tidal's "album color fills the room" treatment than a modal
// fading to black: the bottom gets quieter for controls, but it stays in the
// same hue family and never collapses into pure black.
const buildBackdropStops = (essence: null | string): readonly string[] => {
    const fallback: readonly string[] = [
        '#2b241b', '#292219', '#272018', '#251e17', '#231d16', '#211b15',
        '#1f1a14', '#1d1813', '#1b1712', '#191511', '#171410', '#15130f',
        '#14120e', '#13110e', '#12100d', '#110f0d', '#100e0c', '#0f0d0c',
    ];
    if (!essence) return fallback;
    const rgb = parseHex(essence);
    if (!rgb) return fallback;
    const [L0, a, b] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    const chroma = Math.sqrt(a * a + b * b);
    const chromaBoost = chroma < 0.07 ? 1.34 : chroma < 0.12 ? 1.18 : 1.06;
    const topL = Math.max(0.36, Math.min(0.64, L0 + 0.08));
    const midL = Math.max(0.25, Math.min(0.42, L0 * 0.72));
    const bottomL = Math.max(0.17, Math.min(0.30, L0 * 0.5));
    const stopCount = 18;
    const stops: string[] = [];
    for (let i = 0; i < stopCount; i++) {
        const t = i / (stopCount - 1);
        const eased = t * t * (3 - 2 * t);
        const L =
            t < 0.42
                ? topL + (midL - topL) * (t / 0.42)
                : midL + (bottomL - midL) * ((t - 0.42) / 0.58);
        const cScale = chromaBoost * (1 - eased * 0.24);
        stops.push(oklabToHex(L, a * cScale, b * cScale));
    }
    return stops;
};

const SwipeDismissSheet = ({
    children,
    onDismiss,
    style,
}: {
    children: ReactNode;
    onDismiss: () => void;
    style?: ViewStyle | ViewStyle[];
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const responder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gs) =>
                    gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.4,
                onPanResponderGrant: () => {
                    translateY.stopAnimation();
                },
                onPanResponderMove: (_event, gs) => {
                    if (gs.dy > 0) translateY.setValue(gs.dy);
                },
                onPanResponderRelease: (_event, gs) => {
                    if (gs.dy > 90 || (gs.vy > 0.45 && gs.dy > 24)) {
                        Animated.timing(translateY, {
                            duration: 180,
                            toValue: SCREEN_HEIGHT,
                            useNativeDriver: true,
                        }).start(() => {
                            translateY.setValue(0);
                            onDismiss();
                        });
                        return;
                    }
                    Animated.spring(translateY, {
                        friction: 9,
                        tension: 80,
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                },
                onPanResponderTerminationRequest: () => false,
            }),
        [onDismiss, translateY],
    );

    return (
        <Animated.View
            {...responder.panHandlers}
            style={[style, { transform: [{ translateY }] }]}
        >
            {children}
        </Animated.View>
    );
};

const SLEEP_OPTIONS: { label: string; seconds: number; wide?: boolean }[] = [
    { label: '15m', seconds: 15 * 60 },
    { label: '30m', seconds: 30 * 60 },
    { label: '45m', seconds: 45 * 60 },
    { label: '1h', seconds: 60 * 60 },
    { label: '1h 30m', seconds: 90 * 60 },
    { label: '2h', seconds: 120 * 60 },
    { label: 'End of track', seconds: -1, wide: true },
];

const FullScreenPlayer = ({
    isShuffled,
    lastPlayedItem,
    onClose,
    onNext,
    onPrevious,
    onSeek,
    onToggleShuffle,
    onTogglePlayback,
    playbackState,
    playerProgress,
    queue,
    reducedMotion,
    serverConnections,
    visible,
}: {
    isShuffled: boolean;
    lastPlayedItem: MobilePlayableAudio | null;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSeek: (positionMs: number) => void;
    onTogglePlayback: () => void;
    onToggleShuffle: () => void;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    reducedMotion: boolean;
    serverConnections: ServerAuthenticationResult[];
    visible: boolean;
}) => {
    const [sleepMenuVisible, setSleepMenuVisible] = useState(false);
    const [sleepSecondsLeft, setSleepSecondsLeft] = useState<null | number>(null);
    // Queue sheet position: 0 = hidden below the screen, 1 = fully expanded.
    // Driven by the same vertical-drag gesture that handles player dismiss,
    // mode-switched per drag based on direction and current state.
    const queueProgress = useSharedValue(0);
    const dragMode = useSharedValue<'player' | 'queue'>('player');
    const dragStartQueue = useSharedValue(0);
    const contextMenu = useMediaContextMenu();
    const [bgPrev, setBgPrev] = useState<null | string>(null);
    const [bgCurr, setBgCurr] = useState<null | string>(null);
    const bgFade = useRef(new Animated.Value(1)).current;
    const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sleepTickRef = useRef<NodeJS.Timeout | null>(null);
    const activeItem = playbackState.status !== 'idle' ? playbackState.item : null;
    const displayItem: MobilePlayableAudio | null = activeItem ?? lastPlayedItem;
    const isResting = !activeItem && Boolean(displayItem);
    const artworkUrl = displayItem?.artworkUrl;

    useEffect(() => {
        if (!artworkUrl) return;
        let cancelled = false;
        getImageColors(artworkUrl, {
            cache: true,
            fallback: '#101010',
            key: artworkUrl,
            // High-quality extraction picks more swatches and clusters them
            // more carefully, which dramatically improves the OKLab scorer's
            // chance of finding a characteristic muted swatch.
            quality: 'high',
        })
            .then((result) => {
                if (cancelled) return;
                const next = pickAlbumEssenceColor(result);
                if (!next) return;
                setBgCurr((current) => {
                    if (current === next) return current;
                    setBgPrev(current);
                    bgFade.setValue(0);
                    Animated.timing(bgFade, {
                        duration: 520,
                        toValue: 1,
                        useNativeDriver: false,
                    }).start();
                    return next;
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [artworkUrl, bgFade]);

    const startSleepTimer = useCallback((seconds: number) => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (sleepTickRef.current) clearInterval(sleepTickRef.current);
        if (seconds === -1) {
            setSleepSecondsLeft(-1);
            return;
        }
        setSleepSecondsLeft(seconds);
        sleepTimerRef.current = setTimeout(() => {
            onTogglePlayback();
            setSleepSecondsLeft(null);
        }, seconds * 1000);
        sleepTickRef.current = setInterval(() => {
            setSleepSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : null));
        }, 1000);
    }, [onTogglePlayback]);

    const cancelSleepTimer = useCallback(() => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (sleepTickRef.current) clearInterval(sleepTickRef.current);
        setSleepSecondsLeft(null);
    }, []);

    useEffect(() => {
        return () => {
            if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
            if (sleepTickRef.current) clearInterval(sleepTickRef.current);
        };
    }, []);

    const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
    const dismissPlayer = useCallback(() => {
        // Animate playerProgress to 0 and flip the parent's visible state once
        // the motion finishes; visible stays true for the duration of the close
        // so the user can actually see the fullscreen sliding away.
        const onFinish = (finished?: boolean) => {
            'worklet';
            if (finished) {
                runOnJS(onClose)();
            }
        };
        playerProgress.value = reducedMotion
            ? withTiming(0, { duration: 0 }, onFinish)
            : withSpring(0, settleSpring, onFinish);
    }, [playerProgress, onClose, reducedMotion, settleSpring]);

    const openFullscreenContextMenu = useCallback(() => {
        const item = playbackState.status !== 'idle' ? playbackState.item : lastPlayedItem;
        if (!item) {
            return;
        }

        // contentSourceId is set on newly-built playback objects, but a track
        // persisted as lastPlayedItem before this build won't have it — so
        // also fall back to extracting the prefix from the well-known playback
        // id format `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        const idPrefixMatch = item.id.match(/^([^:]+:[^:]+):(?:music|audiobook|podcast|radio):/);
        const sourceId = item.contentSourceId ?? idPrefixMatch?.[1];
        const auth = sourceId
            ? serverConnections.find(
                  (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
              )
            : undefined;
        const contentSource = auth ? getMobileContentSource(auth) : undefined;
        // Playback ids look like `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        // Strip the prefix so menu actions like "Go to Album" hit real Subsonic ids.
        const idMatch = item.id.match(/:(?:music|audiobook|podcast|radio):(.+)$/);
        const innerId = idMatch ? idMatch[1] : item.id;

        if (item.source === 'music') {
            const songItem: MobileSearchItem = {
                album: item.album,
                albumId: item.albumId,
                artist: item.artist,
                artistId: item.artistId,
                artworkUrl: item.artworkUrl,
                id: innerId,
                playback: item,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type: MobileSearchItemType.SONG,
            };
            contextMenu.openForItem(songItem);
            return;
        }

        if (item.source === 'radio') {
            const radioItem: MobileHomeItem = {
                artworkUrl: item.artworkUrl,
                id: innerId,
                playback: item,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type: MobileHomeItemType.RADIO,
            };
            contextMenu.openForItem(radioItem);
            return;
        }

        if (item.source === 'audiobook' || item.source === 'podcast') {
            // For podcasts the inner id is `<itemId>:<episodeId>`; for audiobooks it's
            // just `<itemId>`. Either way we want the library item id for the menu.
            const ownerId = innerId.split(':')[0];
            const homeItem: MobileHomeItem = {
                artworkUrl: item.artworkUrl,
                id: ownerId,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type:
                    item.source === 'audiobook'
                        ? MobileHomeItemType.AUDIOBOOK
                        : MobileHomeItemType.PODCAST,
            };
            contextMenu.openForItem(homeItem);
        }
    }, [contextMenu, lastPlayedItem, playbackState, serverConnections]);

    // One vertical-drag gesture handles three intents based on direction and
    // current state: swipe-down dismisses the player; swipe-up opens the queue
    // sheet (replacing the old queue button); a swipe-down while the queue is
    // open closes the queue instead of dismissing the player. Mode is locked
    // at the moment the first significant drag direction is detected so the
    // motion stays predictable.
    const dragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY([-10, 10])
                .failOffsetX([-30, 30])
                .onStart(() => {
                    'worklet';
                    dragStartQueue.value = queueProgress.value;
                    // Tentative: if the queue is already open, this drag is
                    // about the queue; otherwise wait for direction to decide.
                    dragMode.value = queueProgress.value > 0 ? 'queue' : 'player';
                })
                .onChange((event) => {
                    'worklet';
                    if (
                        dragMode.value === 'player' &&
                        event.translationY < -10
                    ) {
                        // First upward motion: switch to queue-mode.
                        dragMode.value = 'queue';
                    }

                    if (dragMode.value === 'queue') {
                        const fraction =
                            -event.translationY / QUEUE_SHEET_HEIGHT;
                        const next = dragStartQueue.value + fraction;
                        queueProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                        return;
                    }

                    const dragFraction = event.translationY / PLAYER_EXPANSION_DISTANCE;
                    const next = 1 - dragFraction;
                    playerProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    if (dragMode.value === 'queue') {
                        if (
                            dragStartQueue.value > 0.8 &&
                            (event.translationY > QUEUE_CLOSE_DISTANCE ||
                                event.velocityY > QUEUE_CLOSE_VELOCITY)
                        ) {
                            queueProgress.value = withSpring(0, settleSpring);
                            return;
                        }

                        // Snap open or closed based on position + velocity.
                        const opening =
                            queueProgress.value > 0.5 ||
                            event.velocityY < -700;
                        queueProgress.value = withSpring(
                            opening ? 1 : 0,
                            settleSpring,
                        );
                        return;
                    }
                    const shouldDismiss =
                        event.translationY > DISMISS_DISTANCE ||
                        (event.velocityY > DISMISS_VELOCITY &&
                            event.translationY > 40);
                    if (shouldDismiss) {
                        const onFinish = (finished?: boolean) => {
                            'worklet';
                            if (finished) {
                                runOnJS(onClose)();
                            }
                        };
                        playerProgress.value = reducedMotion
                            ? withTiming(0, { duration: 0 }, onFinish)
                            : withSpring(
                                  0,
                                  {
                                      ...settleSpring,
                                      velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                                  },
                                  onFinish,
                              );
                        return;
                    }
                    playerProgress.value = withSpring(1, {
                        ...settleSpring,
                        velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                    });
                }),
        [
            dragMode,
            dragStartQueue,
            onClose,
            playerProgress,
            queueProgress,
            reducedMotion,
            settleSpring,
        ],
    );

    // Animated styles for the queue overlay. The sheet rises from the bottom
    // of the screen; a separate dimming backdrop fades in alongside it so the
    // player content underneath visibly recedes.
    const queueBackdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(queueProgress.value, [0, 1], [0, 0.55], 'clamp'),
    }));
    const queueSheetStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    queueProgress.value,
                    [0, 1],
                    [QUEUE_SHEET_HEIGHT, 0],
                    'clamp',
                ),
            },
        ],
    }));

    // Gate pointerEvents on the backdrop + sheet so the player below stays
    // interactive when the queue is closed (an invisible Pressable at opacity 0
    // would otherwise swallow taps).
    const [isQueueInteractive, setIsQueueInteractive] = useState(false);
    useAnimatedReaction(
        () => queueProgress.value > 0.05,
        (open, previous) => {
            if (open !== previous) {
                runOnJS(setIsQueueInteractive)(open);
            }
        },
    );

    const closeQueue = useCallback(() => {
        queueProgress.value = withSpring(0, settleSpring);
    }, [queueProgress, settleSpring]);

    // Horizontal swipe-to-skip. Separated so it can fail cleanly when the gesture
    // is clearly vertical — composing with Simultaneous lets the user
    // start a swipe in either direction without one stealing the other.
    const skipGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-30, 30])
                .failOffsetY([-30, 30])
                .onEnd((event) => {
                    'worklet';
                    if (event.translationX < -80 || event.velocityX < -700) {
                        runOnJS(onNext)();
                    } else if (event.translationX > 80 || event.velocityX > 700) {
                        runOnJS(onPrevious)();
                    }
                }),
        [onNext, onPrevious],
    );

    const playerGesture = useMemo(
        () => Gesture.Simultaneous(dragGesture, skipGesture),
        [dragGesture, skipGesture],
    );

    // The fullscreen player's actual frame expands out of the miniplayer's
    // frame. The container does the physical motion; its contents wait until
    // the surface has enough room, so the transition reads as one object
    // unfolding instead of a transparent mini player under a bottom sheet.
    const playerAnimatedStyle = useAnimatedStyle(() => {
        const p = playerProgress.value;
        return {
            borderTopLeftRadius: interpolate(p, [0, 1], [MINI_PLAYER_RADIUS, 0], 'clamp'),
            borderTopRightRadius: interpolate(p, [0, 1], [MINI_PLAYER_RADIUS, 0], 'clamp'),
            height: interpolate(p, [0, 1], [MINI_PLAYER_HEIGHT, SCREEN_HEIGHT], 'clamp'),
            opacity: interpolate(p, [0, 0.035], [0, 1], 'clamp'),
            paddingBottom: interpolate(
                p,
                [0, 1],
                [0, FULL_PLAYER_PADDING_BOTTOM],
                'clamp',
            ),
            paddingHorizontal: interpolate(p, [0, 1], [0, spacing.lg], 'clamp'),
            paddingTop: interpolate(p, [0, 1], [0, FULL_PLAYER_PADDING_TOP], 'clamp'),
            top: interpolate(
                p,
                [0, 1],
                [MINI_PLAYER_COLLAPSED_TOP, FULL_PLAYER_EXPANDED_TOP],
                'clamp',
            ),
        };
    });
    const collapsedSurfaceStyle = useAnimatedStyle(() => ({
        opacity: interpolate(playerProgress.value, [0, 0.46], [1, 0], 'clamp'),
    }));
    const playerContentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(playerProgress.value, [0.34, 0.7], [0, 1], 'clamp'),
        transform: [
            {
                translateY: interpolate(
                    playerProgress.value,
                    [0.34, 1],
                    [26, 0],
                    'clamp',
                ),
            },
            { scale: interpolate(playerProgress.value, [0.34, 1], [0.97, 1], 'clamp') },
        ],
    }));

    // Stay mounted whenever there's something to play, so close animations
    // triggered from outside the player (back button, navigation) still get to
    // run. Visibility/interactivity is now derived from playerProgress + visible.
    if (!displayItem) {
        return null;
    }

    const durationMs = activeItem
        ? getPlaybackDurationMs(playbackState)
        : (displayItem.durationSeconds ?? 0) * 1000;
    const isLive = activeItem ? isLivePlayback(playbackState) : Boolean(displayItem.isLive);
    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'buffering';
    const display = activeItem
        ? getPlaybackDisplayMetadata(playbackState)
        : { subtitle: displayItem.subtitle, title: displayItem.title };
    const isMusicSource = displayItem.source === 'music';
    const qualityItems = isMusicSource
        ? buildAudioQualityBadgeItems({
              ...displayItem.quality,
              compact: true,
              mode: 'detail',
          })
        : [];
    const showHiRes = isPlaybackHiRes(displayItem);
    const playerArtworkUrl = displayItem.artworkUrl;
    const positionMs =
        playbackState.status !== 'idle' ? (playbackState.positionMs ?? 0) : 0;
    const timelineSegments = displayItem.timelineSegments;
    return (
        <>
        <GestureDetector gesture={playerGesture}>
        <Reanimated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.fullPlayer,
                playerAnimatedStyle,
            ]}
        >
            {/* OLED base; remains under the gradients so unfilled corners stay black. */}
            <View pointerEvents="none" style={styles.fullPlayerBg} />
            {/* Tidal-style backdrop: a single album-derived color holds the whole screen
                in one family, with a gentle vertical darkening that adds depth without
                breaking into a separate tone. Two stacked native linear gradients
                cross-fade on track change so the new album color rolls in smoothly,
                and stops are perceptually generated in OKLab so the mid-gradient
                stays in the album's color family instead of muddying. */}
            {bgPrev ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            opacity: bgFade.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0],
                            }),
                        },
                    ]}
                >
                    <LinearGradient
                        colors={buildBackdropStops(bgPrev) as unknown as string[]}
                        end={{ x: 0.82, y: 1 }}
                        start={{ x: 0.18, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                </Animated.View>
            ) : null}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        opacity: bgCurr
                            ? bgFade.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 1],
                              })
                            : 1,
                    },
                ]}
            >
                <LinearGradient
                    colors={buildBackdropStops(bgCurr) as unknown as string[]}
                    end={{ x: 0.82, y: 1 }}
                    start={{ x: 0.18, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>
            <Reanimated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    styles.fullPlayerCollapsedSurface,
                    collapsedSurfaceStyle,
                ]}
            />

            <Reanimated.View style={[styles.fullPlayerContent, playerContentAnimatedStyle]}>
            {/* Header: down chevron / spacer / more menu */}
            <View style={styles.fullPlayerHeader}>
                <Pressable
                    accessibilityLabel="Close player"
                    accessibilityRole="button"
                    onPress={dismissPlayer}
                    style={styles.fullPlayerHeaderButton}
                >
                    <DownCaretGlyph color={colors.text} />
                </Pressable>
                <View style={styles.fullPlayerHeaderSpacer} />
                <Pressable
                    accessibilityLabel="More options"
                    accessibilityRole="button"
                    onPress={() => openFullscreenContextMenu()}
                    style={styles.fullPlayerHeaderButton}
                >
                    <EllipsisVerticalGlyph color={colors.text} />
                </Pressable>
            </View>

            {/* Artwork — fixed proportional size so it can never overlap metadata below */}
            <View style={styles.fullPlayerArtworkWrap}>
                <View style={styles.fullPlayerArtworkShadow}>
                    {playerArtworkUrl ? (
                        <ExpoImage
                            cachePolicy="memory-disk"
                            source={playerArtworkUrl}
                            style={styles.fullPlayerArtwork}
                            transition={180}
                        />
                    ) : (
                        <View style={styles.fullPlayerArtworkFallback}>
                            <Text style={styles.fullPlayerArtworkLetter}>
                                {display.title.slice(0, 1)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Bottom stack: each block owns its own row — no overlap. */}
            <View style={styles.fullPlayerBottom}>
                <View style={styles.fullPlayerMetadata}>
                    <View style={styles.fullPlayerTitleRow}>
                        <Text
                            numberOfLines={2}
                            style={[styles.fullPlayerTitle, styles.fullPlayerTitleText]}
                        >
                            {display.title}
                        </Text>
                        {showHiRes ? <HiResBadge player /> : null}
                    </View>
                    {display.subtitle ? (
                        <Text numberOfLines={1} style={styles.fullPlayerSubtitle}>
                            {display.subtitle}
                        </Text>
                    ) : null}
                    {qualityItems.length > 0 ? (
                        <View style={styles.fullPlayerQualityRow}>
                            <QualityBadgeRow items={qualityItems} />
                        </View>
                    ) : null}
                </View>

                <View style={styles.fullPlayerProgress}>
                    <SegmentedSeekBar
                        durationMs={durationMs}
                        isLive={isLive}
                        onSeek={onSeek}
                        positionMs={positionMs}
                        segments={timelineSegments}
                        tint={colors.accent}
                    />
                    <View style={styles.fullPlayerTimeRow}>
                        <Text style={styles.fullPlayerTime}>
                            {isLive ? '' : formatPlaybackTime(positionMs)}
                        </Text>
                        <Text style={[styles.fullPlayerTime, styles.fullPlayerTimeRight]}>
                            {activeItem
                                ? getDurationLabel(playbackState)
                                : displayItem.source === 'radio'
                                  ? 'RADIO'
                                  : formatPlaybackTime(durationMs)}
                        </Text>
                    </View>
                </View>

                <View style={styles.fullPlayerControls}>
                    <PlayerIconButton accessibilityLabel="Shuffle" onPress={onToggleShuffle}>
                        <ShuffleGlyph active={isShuffled} color={colors.text} />
                    </PlayerIconButton>
                    <PlayerIconButton accessibilityLabel="Previous" onPress={onPrevious}>
                        <TrackSkipGlyph color={colors.text} direction={-1} />
                    </PlayerIconButton>
                    <PlayerIconButton
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                        onPress={onTogglePlayback}
                        primary
                    >
                        <PlayPauseGlyph color="#ffffff" isPlaying={isPlaying} size={44} />
                    </PlayerIconButton>
                    <PlayerIconButton accessibilityLabel="Next" onPress={onNext}>
                        <TrackSkipGlyph color={colors.text} direction={1} />
                    </PlayerIconButton>
                    <PlayerIconButton
                        accessibilityLabel="Sleep Timer"
                        onPress={() => sleepSecondsLeft !== null ? cancelSleepTimer() : setSleepMenuVisible(true)}
                    >
                        <SleepTimerGlyph
                            active={sleepSecondsLeft !== null}
                            color={sleepSecondsLeft !== null ? colors.accent : colors.text}
                        />
                    </PlayerIconButton>
                </View>

                {sleepSecondsLeft !== null && sleepSecondsLeft !== -1 && (
                    <Text style={styles.fullPlayerSleepLabel}>
                        Sleeping in {Math.floor(sleepSecondsLeft / 60)}:{String(sleepSecondsLeft % 60).padStart(2, '0')}
                    </Text>
                )}

                {/* Bottom row — cast on left. The queue button used to live here
                    too, but the queue is now opened by swiping up from anywhere
                    on the player. */}
                <View style={styles.fullPlayerBottomBar}>
                    <Pressable
                        accessibilityLabel="Connect to Chromecast"
                        accessibilityRole="button"
                        style={styles.fullPlayerBottomBarButton}
                    >
                        <CastGlyph />
                    </Pressable>
                </View>

                {activeItem && playbackState.status !== 'idle' && playbackState.message ? (
                    <Text numberOfLines={2} style={styles.fullPlayerErrorText}>
                        {playbackState.message}
                    </Text>
                ) : null}
            </View>
            </Reanimated.View>

            <QueueSheetOverlay
                backdropStyle={queueBackdropStyle}
                chapters={
                    displayItem.source === 'audiobook' ? timelineSegments : undefined
                }
                currentPositionMs={positionMs}
                interactive={isQueueInteractive}
                onChapterSeek={onSeek}
                onClose={closeQueue}
                queue={queue}
                sheetStyle={queueSheetStyle}
            />
        </Reanimated.View>
        </GestureDetector>

        {/* Sleep timer picker */}
        <Modal animationType="slide" onRequestClose={() => setSleepMenuVisible(false)} transparent visible={sleepMenuVisible}>
            <Pressable onPress={() => setSleepMenuVisible(false)} style={styles.modalBackdrop}>
                <SwipeDismissSheet
                    onDismiss={() => setSleepMenuVisible(false)}
                    style={styles.actionSheet}
                >
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Sleep Timer</Text>
                    <View style={styles.sleepPillGrid}>
                        {SLEEP_OPTIONS.map((opt) => {
                            const isActive = sleepSecondsLeft !== null
                                && ((opt.seconds === -1 && sleepSecondsLeft === -1)
                                    || (opt.seconds !== -1 && sleepSecondsLeft > 0 && Math.abs(opt.seconds - sleepSecondsLeft) <= 1));
                            return (
                                <Pressable
                                    key={opt.label}
                                    onPress={() => {
                                        startSleepTimer(opt.seconds);
                                        setSleepMenuVisible(false);
                                    }}
                                    style={[
                                        styles.sleepPill,
                                        opt.wide ? styles.sleepPillWide : null,
                                        isActive ? styles.sleepPillActive : null,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.sleepPillText,
                                            isActive ? styles.sleepPillTextActive : null,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </SwipeDismissSheet>
            </Pressable>
        </Modal>

        {/* Universal MediaContextMenu (rendered at App root) handles the "..." menu. */}
        </>
    );
};

/**
 * Inline queue sheet rendered as a child of the fullscreen player. translateY
 * is driven by the shared queueProgress that the outer pan gesture mutates, so
 * the sheet follows the user's finger end-to-end.
 */
const QueueSheetOverlay = ({
    backdropStyle,
    chapters,
    currentPositionMs,
    interactive,
    onChapterSeek,
    onClose,
    queue,
    sheetStyle,
}: {
    backdropStyle: ReturnType<typeof useAnimatedStyle>;
    chapters?: MobilePlaybackSegment[];
    currentPositionMs?: number;
    interactive: boolean;
    onChapterSeek?: (positionMs: number) => void;
    onClose: () => void;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    sheetStyle: ReturnType<typeof useAnimatedStyle>;
}) => {
    const items = queue?.items ?? [];
    const showingChapters = (chapters?.length ?? 0) > 0;
    const positionSeconds = (currentPositionMs ?? 0) / 1000;
    const activeChapterIndex = showingChapters
        ? findActiveChapterIndex(chapters!, positionSeconds)
        : -1;
    const dismissGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(8)
                .failOffsetX([-28, 28])
                .onEnd((event) => {
                    'worklet';
                    if (
                        event.translationY > QUEUE_CLOSE_DISTANCE ||
                        event.velocityY > QUEUE_CLOSE_VELOCITY
                    ) {
                        runOnJS(onClose)();
                    }
                }),
        [onClose],
    );
    return (
        <>
            <Reanimated.View
                pointerEvents={interactive ? 'auto' : 'none'}
                style={[styles.queueSheetBackdrop, backdropStyle]}
            >
                <Pressable
                    accessibilityLabel="Close queue"
                    onPress={onClose}
                    style={StyleSheet.absoluteFillObject}
                />
            </Reanimated.View>
            <GestureDetector gesture={dismissGesture}>
                <Reanimated.View
                    pointerEvents={interactive ? 'auto' : 'none'}
                    style={[styles.queueSheet, sheetStyle]}
                >
                    <View style={styles.queueSheetHandle} />
                    <Text style={styles.queueSheetTitle}>
                        {showingChapters ? 'Chapters' : 'Up Next'}
                    </Text>
                    <ScrollView
                        contentContainerStyle={styles.queueSheetContent}
                        showsVerticalScrollIndicator={false}
                        style={styles.queueSheetScroll}
                    >
                    {showingChapters ? (
                        chapters!.map((chapter, i) => {
                            const isActive = i === activeChapterIndex;
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={`${chapter.id}-${i}`}
                                    onPress={() =>
                                        onChapterSeek?.(chapter.startSeconds * 1000)
                                    }
                                    style={styles.queueRow}
                                >
                                    <View style={styles.queueChapterNumber}>
                                        <Text
                                            style={[
                                                styles.queueChapterNumberText,
                                                isActive && { color: colors.accent },
                                            ]}
                                        >
                                            {i + 1}
                                        </Text>
                                    </View>
                                    <View style={styles.queueRowBody}>
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.queueRowTitle,
                                                isActive && { color: colors.accent },
                                            ]}
                                        >
                                            {chapter.title ?? `Chapter ${i + 1}`}
                                        </Text>
                                        <Text
                                            numberOfLines={1}
                                            style={styles.queueRowSubtitle}
                                        >
                                            {formatChapterRange(chapter)}
                                        </Text>
                                    </View>
                                    {isActive ? (
                                        <View style={styles.queueNowPlayingIndicator}>
                                            <View
                                                style={[
                                                    styles.queueRowPlayingBar,
                                                    styles.queueRowPlayingBarShort,
                                                ]}
                                            />
                                            <View style={styles.queueRowPlayingBar} />
                                            <View
                                                style={[
                                                    styles.queueRowPlayingBar,
                                                    styles.queueRowPlayingBarShort,
                                                ]}
                                            />
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })
                    ) : items.length === 0 ? (
                        <Text style={styles.queueSheetEmpty}>The queue is empty.</Text>
                    ) : (
                        items.map((item, i) => {
                            const isActive = queue?.index === i;
                            const showHiRes = isPlaybackHiRes(item);
                            return (
                                <View key={`${item.id}-${i}`} style={styles.queueRow}>
                                    <ArtworkImage
                                        fallbackStyle={styles.queueRowThumbFallback}
                                        letter={item.title.slice(0, 1).toUpperCase()}
                                        style={styles.queueRowThumb}
                                        uri={item.artworkUrl}
                                    />
                                    <View style={styles.queueRowBody}>
                                        <View style={styles.rowTitleWithBadge}>
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.queueRowTitle,
                                                    styles.rowTitleText,
                                                    isActive && { color: colors.accent },
                                                ]}
                                            >
                                                {item.title}
                                            </Text>
                                            {showHiRes ? <HiResBadge compact /> : null}
                                        </View>
                                        {item.subtitle ? (
                                            <Text
                                                numberOfLines={1}
                                                style={styles.queueRowSubtitle}
                                            >
                                                {item.subtitle}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {isActive ? (
                                        <View style={styles.queueNowPlayingIndicator}>
                                            <View
                                                style={[
                                                    styles.queueRowPlayingBar,
                                                    styles.queueRowPlayingBarShort,
                                                ]}
                                            />
                                            <View style={styles.queueRowPlayingBar} />
                                            <View
                                                style={[
                                                    styles.queueRowPlayingBar,
                                                    styles.queueRowPlayingBarShort,
                                                ]}
                                            />
                                        </View>
                                    ) : null}
                                </View>
                            );
                        })
                    )}
                    </ScrollView>
                </Reanimated.View>
            </GestureDetector>
        </>
    );
};


interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    label: string;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * Catches render-phase errors so a single component throwing doesn't take the
 * whole app to a blank screen. The default fallback gives the user a Try Again
 * button that resets the boundary's state; production builds will otherwise
 * silently re-mount on retry, dev builds still surface the redbox first.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.warn(`[${this.props.label}] caught render error:`, error, info.componentStack);
    }

    private handleRetry = (): void => {
        this.setState({ error: null });
    };

    render(): ReactNode {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleRetry);
            }
            return (
                <View style={styles.errorBoundaryRoot}>
                    <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
                    <Text style={styles.errorBoundarySubtitle}>{this.state.error.message}</Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={this.handleRetry}
                        style={styles.errorBoundaryButton}
                    >
                        <Text style={styles.errorBoundaryButtonText}>Try Again</Text>
                    </Pressable>
                </View>
            );
        }
        return this.props.children;
    }
}

// Letters that anchor the alphabet sidebar. '#' catches anything starting with
// a digit or non-Latin character so every item maps somewhere.
const ALPHABET_SIDEBAR_LETTERS = [
    '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
    'X', 'Y', 'Z',
] as const;

const buildAlphabetLetterIndex = (
    items: MobileHomeItem[],
    indexOffset: number = 0,
): Map<string, number> => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
        const first = item.title.charAt(0).toUpperCase();
        const letter = first >= 'A' && first <= 'Z' ? first : '#';
        if (!map.has(letter)) {
            map.set(letter, indexOffset + index);
        }
    });
    return map;
};

// Number of recency-sorted items shown at the top of a View All grid before
// the rest of the catalog falls into alphabetical order. 30 keeps the recent
// chunk visible (~15 rows in a 2-column layout) without burying the bulk of
// the library too far down the scroll.
const VIEW_ALL_RECENCY_CHUNK = 30;

const ViewAllScreen = ({
    fullState,
    onBack,
    onSelectItem,
    route,
}: {
    fullState: AndroidFullCollectionState;
    onBack: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    route: ViewAllRoute;
}) => {
    const contextMenu = useMediaContextMenu();
    const listRef = useRef<FlatList<MobileHomeItem>>(null);
    const isLoading = fullState.status === 'loading';
    const isError = fullState.status === 'error';
    const { alphabeticalStartIndex, sortedItems } = useMemo(() => {
        // Prefer the exhaustive list once it lands; until then show the
        // home-content slice the route was opened with so the grid isn't
        // empty during the fetch. Merge the cached items either way so a
        // brief stale state can't drop favorites that the full fetch missed.
        const fullItems = fullState.status === 'loaded' ? fullState.items : [];
        const merged: MobileHomeItem[] = [];
        const seen = new Set<string>();
        for (const item of [...route.items, ...fullItems]) {
            // Skip anything that doesn't have the minimum fields the FlatList
            // renderItem expects. Without this guard, a server returning a
            // partial record (eg an album with no id or title) crashed the
            // whole screen at sort time on `.title.localeCompare(undefined)`.
            if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
                continue;
            }
            const key = getRecentContentItemKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
        }
        // "Order it in recency, then once recency is done, just list all the
        // rest of the albums." — slice the newest-added items off the front
        // (by addedAt desc) and follow them with the entire remaining catalog
        // in alphabetical order. The alphabet sidebar jumps into the second
        // chunk so per-letter navigation still feels natural.
        const datedItems = merged
            .filter((item) => typeof item.addedAt === 'number')
            .sort((left, right) => (right.addedAt ?? 0) - (left.addedAt ?? 0));
        const recentChunk = datedItems.slice(0, VIEW_ALL_RECENCY_CHUNK);
        const recentKeys = new Set(recentChunk.map((item) => getRecentContentItemKey(item)));
        const alphabeticalChunk = merged
            .filter((item) => !recentKeys.has(getRecentContentItemKey(item)))
            .sort((left, right) =>
                left.title.localeCompare(right.title, undefined, {
                    sensitivity: 'base',
                }),
            );
        return {
            alphabeticalStartIndex: recentChunk.length,
            sortedItems: [...recentChunk, ...alphabeticalChunk],
        };
    }, [fullState, route.items]);
    const letterIndex = useMemo(
        () => buildAlphabetLetterIndex(sortedItems.slice(alphabeticalStartIndex), alphabeticalStartIndex),
        [alphabeticalStartIndex, sortedItems],
    );

    const handleJumpToLetter = useCallback(
        (letter: string) => {
            const index = letterIndex.get(letter);
            if (typeof index !== 'number') return;
            // Round down to the start of the row in 2-column layouts so the
            // first item of the chosen letter sits on the left. Clamp to the
            // current data length so an out-of-bounds jump can't push the
            // FlatList past its tail and trip native-side index assertions.
            const rowStartIndex = Math.min(
                Math.max(0, index - (index % 2)),
                Math.max(0, sortedItems.length - 1),
            );
            try {
                listRef.current?.scrollToIndex({
                    animated: true,
                    index: rowStartIndex,
                    viewPosition: 0,
                });
            } catch (error) {
                // scrollToIndex throws synchronously on some RN versions when
                // the target row hasn't been measured yet. Don't take the
                // screen down — onScrollToIndexFailed will pick up the slack.
                console.warn('[ViewAllScreen] scrollToIndex threw', error);
            }
        },
        [letterIndex, sortedItems.length],
    );

    const renderItem = useCallback(
        ({ item }: { item: MobileHomeItem }) => {
            const isArtist = item.type === MobileHomeItemType.ARTIST;
            const showHiRes = isContentItemHiRes(item);
            return (
                <Pressable
                    accessibilityRole="button"
                    onLongPress={() => contextMenu.openForItem(item)}
                    onPress={() => onSelectItem(item)}
                    style={styles.viewAllTile}
                >
                    <ArtworkImage
                        fallbackStyle={[
                            styles.viewAllTileArtworkFallback,
                            isArtist && styles.libraryArtworkRound,
                        ]}
                        letter={item.title.slice(0, 1).toUpperCase()}
                        style={[
                            styles.viewAllTileArtwork,
                            isArtist && styles.libraryArtworkRound,
                        ]}
                        uri={item.artworkUrl}
                    />
                    {showHiRes ? <HiResBadge overlay /> : null}
                    <View style={styles.rowTitleWithBadge}>
                        <Text
                            numberOfLines={1}
                            style={[styles.viewAllTileTitle, styles.rowTitleText]}
                        >
                            {item.title}
                        </Text>
                        {showHiRes ? <HiResBadge compact /> : null}
                    </View>
                    {item.subtitle ? (
                        <Text
                            numberOfLines={1}
                            style={styles.viewAllTileSubtitle}
                        >
                            {item.subtitle}
                        </Text>
                    ) : null}
                </Pressable>
            );
        },
        [contextMenu, onSelectItem],
    );

    return (
        <View style={styles.viewAllScreen}>
            <View style={styles.viewAllHeader}>
                <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={onBack}
                    style={styles.viewAllBackButton}
                >
                    <Text style={styles.viewAllBackArrow}>‹</Text>
                </Pressable>
                <Text numberOfLines={1} style={styles.viewAllTitle}>
                    {route.title}
                </Text>
                <View style={styles.viewAllBackButton} />
            </View>
            <View style={styles.viewAllBody}>
                {sortedItems.length === 0 ? (
                    isLoading ? (
                        <ActivityIndicator color={colors.accent} />
                    ) : (
                        <Text style={styles.viewAllEmpty}>
                            {isError ? 'Couldn’t load every item.' : 'Nothing to show here yet.'}
                        </Text>
                    )
                ) : (
                    <FlatList
                        columnWrapperStyle={styles.viewAllColumn}
                        contentContainerStyle={styles.viewAllListContent}
                        data={sortedItems}
                        keyExtractor={(item) => getContentItemKey(item)}
                        numColumns={2}
                        // scrollToIndex can fail when the target row hasn't
                        // been measured yet. Fall back to an offset estimate
                        // only when we have a sane averageItemLength to work
                        // with, and don't retry on a setTimeout — successive
                        // failures were spinning into a redbox-grade crash on
                        // alphabet-letter taps for unmounted rows.
                        onScrollToIndexFailed={(info) => {
                            const avg = info.averageItemLength;
                            if (!Number.isFinite(avg) || avg <= 0) return;
                            const offset = avg * Math.floor(info.index / 2);
                            if (!Number.isFinite(offset) || offset < 0) return;
                            try {
                                listRef.current?.scrollToOffset({
                                    animated: true,
                                    offset,
                                });
                            } catch (error) {
                                console.warn(
                                    '[ViewAllScreen] scrollToOffset threw',
                                    error,
                                );
                            }
                        }}
                        ref={listRef}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                    />
                )}
                <AlphabetSidebar
                    activeLetters={letterIndex}
                    onJumpToLetter={handleJumpToLetter}
                />
            </View>
        </View>
    );
};

const AlphabetSidebar = ({
    activeLetters,
    onJumpToLetter,
}: {
    activeLetters: Map<string, number>;
    onJumpToLetter: (letter: string) => void;
}) => {
    return (
        <View pointerEvents="box-none" style={styles.alphabetSidebar}>
            {ALPHABET_SIDEBAR_LETTERS.map((letter) => {
                const isActive = activeLetters.has(letter);
                return (
                    <Pressable
                        accessibilityLabel={`Jump to ${letter}`}
                        accessibilityRole="button"
                        disabled={!isActive}
                        hitSlop={4}
                        key={letter}
                        onPress={() => onJumpToLetter(letter)}
                        style={styles.alphabetSidebarLetterButton}
                    >
                        <Text
                            style={[
                                styles.alphabetSidebarLetter,
                                isActive && styles.alphabetSidebarLetterActive,
                            ]}
                        >
                            {letter}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

const EmptyServerBackedScreen = ({ tabTitle }: { tabTitle: string }) => {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{tabTitle}</Text>
            <Text style={styles.mutedText}>
                Connect a server to load real {tabTitle.toLowerCase()} content.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    artistAlbumGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: spacing.md,
    },
    artistAlbumGridArtwork: {
        aspectRatio: 1,
        borderRadius: 6,
        width: '100%',
    },
    artistAlbumGridFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 6,
        justifyContent: 'center',
        width: '100%',
    },
    artistAlbumGridItem: {
        width: '30%',
    },
    artistAlbumGridTitle: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 5,
    },
    appIcon: {
        height: 34,
        resizeMode: 'contain',
        width: 34,
    },
    appIconButton: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 8,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    castGlyph: {
        borderRadius: 3,
        borderWidth: 1.8,
        height: 18,
        position: 'relative',
        width: 23,
    },
    castGlyphDot: {
        borderRadius: 2,
        bottom: 2,
        height: 4,
        left: 2,
        position: 'absolute',
        width: 4,
    },
    castGlyphWaveLarge: {
        borderBottomLeftRadius: 13,
        borderBottomWidth: 1.8,
        borderLeftWidth: 1.8,
        bottom: 2,
        height: 13,
        left: 2,
        position: 'absolute',
        width: 13,
    },
    castGlyphWaveSmall: {
        borderBottomLeftRadius: 8,
        borderBottomWidth: 1.8,
        borderLeftWidth: 1.8,
        bottom: 2,
        height: 8,
        left: 2,
        position: 'absolute',
        width: 8,
    },
    clearGlyph: {
        alignItems: 'center',
        height: 18,
        justifyContent: 'center',
        position: 'relative',
        width: 18,
    },
    clearGlyphStroke: {
        borderRadius: 999,
        height: 2,
        position: 'absolute',
        width: 14,
    },
    connectedServers: {
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    contextMenu: {
        backgroundColor: 'rgba(18, 18, 18, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        bottom: 26,
        left: spacing.lg,
        maxHeight: '62%',
        padding: spacing.md,
        position: 'absolute',
        right: spacing.lg,
    },
    contextMenuBackdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    contextMenuError: {
        color: '#ffb1a3',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
        marginTop: spacing.sm,
    },
    contextMenuEyebrow: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    contextMenuList: {
        marginTop: spacing.sm,
    },
    contextMenuRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 48,
        paddingVertical: spacing.sm,
    },
    contextMenuRowText: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 19,
        marginRight: spacing.sm,
    },
    contextMenuSuccess: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 16,
        marginTop: spacing.sm,
    },
    contextMenuTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: '900',
        lineHeight: 24,
    },
    mediaContextActionDestructive: {
        color: '#ff7a6e',
    },
    mediaContextActionIcon: {
        alignItems: 'center',
        height: 22,
        justifyContent: 'center',
        marginRight: 14,
        width: 22,
    },
    mediaContextActionLabel: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.1,
        lineHeight: 18,
    },
    mediaContextActionRow: {
        alignItems: 'center',
        borderBottomColor: 'rgba(255, 255, 255, 0.045)',
        borderBottomWidth: 1,
        flexDirection: 'row',
        height: 50,
        paddingHorizontal: 16,
    },
    mediaContextActionRowLast: {
        borderBottomWidth: 0,
    },
    mediaContextActions: {
        marginTop: 4,
        paddingBottom: 4,
    },
    mediaContextArtwork: {
        backgroundColor: '#2a2a2c',
        borderRadius: 6,
        height: 44,
        width: 44,
    },
    mediaContextArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaContextArtworkRound: {
        borderRadius: 22,
    },
    mediaContextBackdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.62)',
        bottom: 0,
        flex: 1,
        justifyContent: 'flex-end',
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    mediaContextBackdropPress: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    mediaContextDivider: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        height: 1,
        marginTop: 12,
    },
    mediaContextEmpty: {
        color: colors.muted,
        fontSize: 13,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    mediaContextEyebrow: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    mediaContextFeedback: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    mediaContextHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 14,
        paddingTop: 14,
    },
    mediaContextHeaderText: {
        flex: 1,
    },
    mediaContextSheet: {
        backgroundColor: 'rgba(22, 22, 24, 0.985)',
        borderColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 18,
        borderWidth: 0.5,
        elevation: 18,
        marginBottom: 28,
        marginHorizontal: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { height: 12, width: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
    },
    mediaContextSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 16,
    },
    mediaContextTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.1,
        lineHeight: 21,
    },
    bookInfoArtwork: {
        backgroundColor: '#2a2a2c',
        borderRadius: 12,
        height: 188,
        width: 188,
    },
    bookInfoArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookInfoArtworkWrap: {
        alignItems: 'center',
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { height: 12, width: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 22,
    },
    bookInfoAuthor: {
        color: colors.muted,
        fontSize: 15,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    bookInfoBackdrop: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        bottom: 0,
        flex: 1,
        justifyContent: 'center',
        left: 0,
        paddingHorizontal: spacing.lg,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    bookInfoCloseButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.md,
        paddingVertical: 14,
    },
    bookInfoCloseLabel: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    bookInfoDescription: {
        color: '#d8d8d8',
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 21,
    },
    bookInfoEmpty: {
        color: colors.muted,
        fontSize: 13,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    bookInfoError: {
        color: '#ff7a6e',
        fontSize: 13,
        fontWeight: '700',
        marginTop: spacing.md,
        textAlign: 'center',
    },
    bookInfoEyebrow: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.4,
        marginBottom: 6,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    bookInfoLoading: {
        marginTop: spacing.lg,
    },
    bookInfoMetadata: {
        alignItems: 'center',
        gap: 2,
        marginBottom: spacing.lg,
        marginTop: spacing.md,
    },
    bookInfoMetadataLine: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
        textAlign: 'center',
    },
    bookInfoScrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    bookInfoSectionTitle: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    bookInfoSheet: {
        backgroundColor: 'rgba(20, 20, 22, 0.985)',
        borderColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 22,
        borderWidth: 0.5,
        elevation: 22,
        maxHeight: '82%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { height: 18, width: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        width: '100%',
    },
    bookInfoTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0.1,
        lineHeight: 27,
        textAlign: 'center',
    },
    streamInfoLabel: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.4,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    streamInfoRow: {
        paddingVertical: spacing.xs,
    },
    streamInfoValue: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
    content: {
        // tabBar (~62) + miniPlayer (~78) + breathing room
        paddingBottom: 200,
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: spacing.lg,
    },
    albumHero: {
        alignItems: 'center',
        marginTop: spacing.lg,
        position: 'relative',
    },
    albumHeroBadgeRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 6,
    },
    artistBio: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
    },
    artistBioToggle: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
        marginTop: spacing.xs,
    },
    relatedArtistTile: {
        alignItems: 'center',
        marginRight: spacing.md,
        width: 112,
    },
    relatedArtistArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 999,
        height: 112,
        marginBottom: spacing.xs,
        width: 112,
    },
    relatedArtistArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    relatedArtistTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    albumHeroArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 4,
        width: Math.min(SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - 40, 360),
    },
    albumHeroArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    albumHeroArtworkWrap: {
        marginBottom: spacing.md,
        position: 'relative',
    },
    albumHeroTitle: {
        color: colors.text,
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 0,
        lineHeight: 30,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    albumHeroMetaRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xs,
        width: '100%',
    },
    albumHeroMetaText: {
        flex: 1,
        minWidth: 0,
    },
    albumHeroMeta: {
        alignItems: 'center',
        marginTop: spacing.xs,
        width: '100%',
    },
    albumHeroMetaLine: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        textAlign: 'center',
    },
    albumHeroEyebrow: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.4,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    albumHeroActionsBar: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        width: '100%',
    },
    albumHeroLeftActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    albumHeroActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    albumHeroGlyphButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    albumHeroPlayButton: {
        backgroundColor: colors.accent,
        height: 52,
        width: 52,
    },
    albumTrackNumber: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
    },
    albumTrackNumberText: {
        color: colors.muted,
        fontSize: 15,
        fontVariant: ['tabular-nums'],
        fontWeight: '700',
    },
    detailArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 8,
        width: 132,
    },
    detailArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 8,
        justifyContent: 'center',
        width: 132,
    },
    detailArtworkRound: {
        borderRadius: 999,
    },
    detailHero: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    detailHeroText: {
        flex: 1,
    },
    detailTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 28,
        marginBottom: spacing.xs,
    },
    detailType: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: spacing.xs,
        textTransform: 'capitalize',
    },
    disabledButton: {
        opacity: 0.45,
    },
    downCaretGlyph: {
        height: 20,
        position: 'relative',
        width: 24,
    },
    downCaretStroke: {
        borderRadius: 999,
        height: 2.4,
        position: 'absolute',
        top: 9,
        width: 13,
    },
    downCaretStrokeLeft: {
        left: 2,
        transform: [{ rotate: '42deg' }],
    },
    downCaretStrokeRight: {
        right: 2,
        transform: [{ rotate: '-42deg' }],
    },
    errorText: {
        color: '#ffb1a3',
        fontSize: 14,
        marginTop: spacing.sm,
    },
    fullPlayer: {
        elevation: 999,
        flex: 1,
        flexDirection: 'column',
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        zIndex: 9999,
    },
    fullPlayerBottom: {
        flexShrink: 0,
    },
    fullPlayerBottomBar: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    fullPlayerBottomBarButton: {
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    fullPlayerSleepLabel: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    modalBackdrop: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        flex: 1,
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: '#000000',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingBottom: 36,
        paddingTop: 8,
    },
    actionSheetHandle: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 999,
        height: 4,
        marginTop: 8,
        width: 38,
    },
    actionSheetTitle: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.6,
        paddingHorizontal: spacing.lg,
        paddingTop: 18,
        paddingBottom: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    actionSheetSongTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        paddingBottom: 4,
        paddingHorizontal: spacing.lg,
        paddingTop: 12,
        textAlign: 'center',
    },
    actionSheetSongSubtitle: {
        color: colors.muted,
        fontSize: 13,
        paddingBottom: 16,
        paddingHorizontal: spacing.lg,
        textAlign: 'center',
    },
    actionSheetSeparator: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: StyleSheet.hairlineWidth,
        marginHorizontal: spacing.lg,
    },
    actionSheetRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        minHeight: 56,
        paddingHorizontal: spacing.lg,
    },
    actionSheetRowIcon: {
        alignItems: 'center',
        height: 28,
        justifyContent: 'center',
        width: 28,
    },
    actionSheetRowText: {
        color: colors.text,
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    actionSheetCancelRow: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        marginTop: 12,
    },
    actionSheetCancelText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    sleepPillGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 12,
        paddingHorizontal: spacing.lg,
        paddingTop: 4,
    },
    sleepPill: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        flexBasis: '30%',
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    sleepPillWide: {
        flexBasis: '100%',
    },
    sleepPillActive: {
        backgroundColor: 'rgba(232, 213, 176, 0.18)',
        borderColor: colors.accent,
        borderWidth: 1,
    },
    sleepPillText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    sleepPillTextActive: {
        color: colors.accent,
    },
    queueRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
    },
    queueSheet: {
        backgroundColor: 'rgba(12, 10, 8, 0.96)',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        bottom: 0,
        height: QUEUE_SHEET_HEIGHT,
        left: 0,
        position: 'absolute',
        right: 0,
    },
    queueSheetBackdrop: {
        backgroundColor: '#000000',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    queueSheetContent: {
        paddingBottom: spacing.xl,
    },
    queueSheetEmpty: {
        color: colors.muted,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    queueSheetHandle: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.24)',
        borderRadius: 999,
        height: 4,
        marginBottom: 12,
        marginTop: 10,
        width: 38,
    },
    queueSheetScroll: {
        flex: 1,
    },
    queueChapterNumber: {
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    queueChapterNumberText: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: '700',
    },
    queueSheetTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    queueRowThumb: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        height: 44,
        width: 44,
    },
    queueRowThumbFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    queueRowThumbLetter: {
        color: colors.muted,
        fontSize: 18,
        fontWeight: '700',
    },
    queueRowBody: {
        flex: 1,
        minWidth: 0,
    },
    queueRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    queueRowSubtitle: {
        color: colors.muted,
        fontSize: 13,
        marginTop: 2,
    },
    queueRowPlayingBar: {
        backgroundColor: colors.accent,
        borderRadius: 1.5,
        height: 14,
        width: 3,
    },
    queueRowPlayingBarShort: {
        height: 9,
    },
    queueNowPlayingIndicator: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 2,
        height: 18,
        width: 18,
    },
    fullPlayerArtwork: {
        borderRadius: 4,
        height: '100%',
        width: '100%',
    },
    fullPlayerArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 4,
        borderWidth: 1,
        height: '100%',
        justifyContent: 'center',
        width: '100%',
    },
    fullPlayerArtworkLetter: {
        color: colors.accent,
        fontSize: 72,
        fontWeight: '900',
    },
    fullPlayerArtworkWrap: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    fullPlayerArtworkShadow: {
        aspectRatio: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: 4,
        elevation: 12,
        flexShrink: 1,
        height: FULL_PLAYER_ARTWORK_SIZE,
        shadowColor: '#000000',
        shadowOffset: { height: 14, width: 0 },
        shadowOpacity: 0.26,
        shadowRadius: 22,
        width: FULL_PLAYER_ARTWORK_SIZE,
    },
    fullPlayerBg: {
        backgroundColor: '#000000',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    fullPlayerCollapsedSurface: {
        backgroundColor: '#1c1c1e',
    },
    fullPlayerContent: {
        flex: 1,
    },
    fullPlayerControls: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
        marginTop: 22,
    },
    fullPlayerDragHandle: {
        alignItems: 'center',
        paddingBottom: 6,
        paddingTop: 4,
    },
    fullPlayerDragPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.32)',
        borderRadius: 999,
        height: 4,
        width: 40,
    },
    fullPlayerErrorText: {
        color: '#ffb1a3',
        fontSize: 12,
        lineHeight: 16,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    fullPlayerHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fullPlayerHeaderButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    fullPlayerHeaderSpacer: {
        flex: 1,
    },
    fullPlayerMetadata: {
        alignItems: 'stretch',
        marginTop: spacing.lg,
        paddingHorizontal: 0,
    },
    fullPlayerProgress: {
        marginTop: 22,
    },
    fullPlayerQualityRow: {
        marginTop: spacing.sm,
    },
    fullPlayerSubtitle: {
        color: 'rgba(245, 245, 245, 0.58)',
        fontSize: 18,
        fontWeight: '500',
        lineHeight: 23,
        marginTop: 4,
        textAlign: 'left',
    },
    fullPlayerTime: {
        color: 'rgba(245, 245, 245, 0.58)',
        fontSize: 13,
        fontWeight: '600',
    },
    fullPlayerTimeRight: {
        textAlign: 'right',
    },
    fullPlayerTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    fullPlayerTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 0,
        lineHeight: 30,
        textAlign: 'left',
    },
    fullPlayerTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        minWidth: 0,
    },
    fullPlayerTitleText: {
        flex: 1,
        minWidth: 0,
    },
    gearGlyphText: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 22,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
        minHeight: 44,
    },
    homeHeaderTitle: {
        color: colors.text,
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: 0,
        lineHeight: 36,
    },
    homeSection: {
        marginTop: 0,
    },
    homeFilterGrid: {
        columnGap: HOME_TILE_GAP,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.sm,
        rowGap: spacing.md,
    },
    homeFilterGridTile: {
        width: HOME_PRIMARY_TILE,
    },
    homeFilterGridArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        marginBottom: spacing.xs,
        width: HOME_PRIMARY_TILE,
    },
    homeFilterGridArtworkPodcast: {
        borderRadius: 26,
    },
    homeFilterGridArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        color: colors.text,
        fontSize: 16,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 13,
    },
    inlineSearchBar: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 50,
        paddingHorizontal: spacing.md,
    },
    inlineSearchBarElevated: {
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderColor: 'rgba(255,255,255,0.13)',
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
    },
    inlineSearchIconButton: {
        alignItems: 'center',
        borderRadius: 8,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    inlineSearchInput: {
        color: colors.text,
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        minWidth: 0,
        paddingVertical: 10,
    },
    inlineSearchInputDark: {
        color: '#111111',
        fontSize: 18,
        fontWeight: '900',
    },
    inlineSearchSubmit: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 8,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    keyboardView: {
        flex: 1,
    },
    alphabetSidebar: {
        alignItems: 'center',
        bottom: spacing.md,
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
        position: 'absolute',
        right: 2,
        top: spacing.md,
    },
    alphabetSidebarLetter: {
        color: 'rgba(255,255,255,0.18)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    alphabetSidebarLetterActive: {
        color: colors.accent,
    },
    alphabetSidebarLetterButton: {
        alignItems: 'center',
        height: 16,
        justifyContent: 'center',
        width: 18,
    },
    sectionHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: spacing.sm,
    },
    sectionViewAll: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 4,
    },
    sectionViewAllLabel: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
    },
    viewAllBackArrow: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '300',
        lineHeight: 28,
    },
    viewAllBackButton: {
        alignItems: 'center',
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    viewAllBody: {
        flex: 1,
        position: 'relative',
    },
    viewAllColumn: {
        gap: HOME_TILE_GAP,
        paddingHorizontal: HOME_EDGE_PADDING,
    },
    viewAllEmpty: {
        color: colors.muted,
        padding: spacing.lg,
    },
    viewAllHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    viewAllListContent: {
        gap: HOME_TILE_GAP,
        paddingBottom: spacing.xl,
        // Leave room on the right edge so tiles don't sit under the sidebar.
        paddingRight: 22,
    },
    viewAllScreen: {
        flex: 1,
    },
    viewAllTile: {
        flex: 1,
        position: 'relative',
    },
    viewAllTileArtwork: {
        aspectRatio: 1,
        borderRadius: 2,
        marginBottom: 6,
        width: '100%',
    },
    viewAllTileArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        justifyContent: 'center',
    },
    viewAllTileSubtitle: {
        color: colors.muted,
        fontSize: 12,
        lineHeight: 16,
        paddingHorizontal: 2,
    },
    viewAllTileTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
        paddingHorizontal: 2,
    },
    viewAllTitle: {
        color: colors.text,
        flex: 1,
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
    libraryArtworkRound: {
        borderRadius: 999,
    },
    libraryEmptyState: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        minHeight: 116,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    libraryEyebrow: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0,
        lineHeight: 27,
    },
    libraryFilterPill: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    libraryFilterPillActive: {
        backgroundColor: colors.text,
    },
    libraryFilterPillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    libraryFilterPillTextActive: {
        color: colors.background,
    },
    libraryFilterPills: {
        gap: spacing.xs,
        paddingBottom: spacing.sm,
        paddingTop: spacing.md,
    },
    libraryHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.lg,
    },
    libraryHeaderText: {
        flex: 1,
        minWidth: 0,
        paddingRight: spacing.md,
    },
    libraryList: {
        gap: 4,
        marginTop: spacing.md,
    },
    libraryRow: {
        alignItems: 'center',
        borderRadius: 8,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 62,
        padding: 6,
    },
    libraryRowAccessory: {
        alignItems: 'center',
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    libraryRowArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 7,
        height: 50,
        width: 50,
    },
    libraryRowArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 7,
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    libraryRowSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    libraryRowText: {
        flex: 1,
        minWidth: 0,
    },
    libraryRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 19,
        marginBottom: 2,
    },
    libraryScreen: {
        marginTop: spacing.sm,
    },
    librarySortBadge: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 6,
        minHeight: 32,
        paddingHorizontal: spacing.sm,
    },
    librarySortText: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '800',
    },
    librarySummary: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 17,
        marginTop: 2,
    },
    mediaArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        marginBottom: spacing.xs,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkAlbum: {
        borderRadius: 2,
    },
    mediaArtworkArtist: {
        borderRadius: 999,
        height: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
    },
    mediaArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        justifyContent: 'center',
        marginBottom: spacing.xs,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkLetter: {
        color: colors.accent,
        fontSize: 48,
        fontWeight: '900',
    },
    artworkImageFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        justifyContent: 'center',
    },
    mediaArtworkRadio: {
        backgroundColor: 'transparent',
        borderRadius: 32,
    },
    mediaArtworkCompact: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkBook: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkGrid: {
        borderRadius: 30,
        height: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaArtworkPlaylist: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkPodcast: {
        borderRadius: 26,
        height: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaArtworkWide: {
        borderRadius: 2,
        height: 112,
        marginBottom: 0,
        width: 112,
    },
    mediaSubtitle: {
        color: colors.muted,
        fontSize: 12,
        lineHeight: 16,
    },
    mediaSubtitleCentered: {
        textAlign: 'center',
    },
    mediaTile: {
        marginRight: HOME_TILE_GAP,
        position: 'relative',
        width: HOME_PRIMARY_TILE,
    },
    mediaTileAlbum: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTileArtist: {
        alignItems: 'center',
        width: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
    },
    mediaTileBook: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTileCompact: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTileContinue: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        width: 320,
    },
    mediaTileGrid: {
        alignItems: 'center',
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaTilePlaylist: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTilePodcast: {
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaTileWide: {
        backgroundColor: colors.panel,
        borderRadius: 4,
        flexDirection: 'row',
        gap: spacing.md,
        minHeight: 136,
        padding: 12,
        width: 320,
    },
    moreGlyph: {
        alignItems: 'center',
        height: 24,
        justifyContent: 'center',
        width: 24,
    },
    moreGlyphDot: {
        borderRadius: 999,
        height: 3.2,
        marginVertical: 1.5,
        width: 3.2,
    },
    mediaText: {
        minWidth: 0,
    },
    mediaTextCentered: {
        alignItems: 'center',
    },
    mediaTextWide: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    mediaTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 18,
        marginBottom: 2,
    },
    mediaTitleCentered: {
        textAlign: 'center',
    },
    mediaTitleWide: {
        fontSize: 15,
        lineHeight: 19,
    },
    mediaTypeBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.64)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 999,
        borderWidth: 1,
        left: 8,
        maxWidth: 110,
        paddingHorizontal: 7,
        paddingVertical: 3,
        position: 'absolute',
        top: HOME_PRIMARY_TILE - 32,
    },
    mediaTypeBadgeText: {
        color: 'rgba(245, 245, 245, 0.82)',
        fontSize: 9,
        fontWeight: '900',
        lineHeight: 11,
        textTransform: 'uppercase',
    },
    continueProgressFill: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: '100%',
    },
    continueProgressTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 999,
        height: 4,
        marginTop: spacing.sm,
        overflow: 'hidden',
        width: '100%',
    },
    miniPlayer: {
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: MINI_PLAYER_RADIUS,
        borderTopRightRadius: MINI_PLAYER_RADIUS,
        bottom: MINI_PLAYER_BOTTOM,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        // zIndex puts the MiniPlayer hit area above the ScrollView on every
        // page (the issue on artist/album/playlist detail). No elevation —
        // that draws an Android drop shadow which broke the visual seam with
        // the tab bar.
        zIndex: 10000,
    },
    miniPlayerTouchable: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 13,
        paddingHorizontal: 18,
        paddingVertical: MINI_PLAYER_VERTICAL_PADDING,
    },
    miniPlayerArtwork: {
        borderRadius: 10,
        height: MINI_PLAYER_ARTWORK_SIZE,
        width: MINI_PLAYER_ARTWORK_SIZE,
    },
    miniPlayerArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        height: MINI_PLAYER_ARTWORK_SIZE,
        justifyContent: 'center',
        width: MINI_PLAYER_ARTWORK_SIZE,
    },
    miniPlayerArtworkLetter: {
        color: colors.text,
        fontSize: 23,
        fontWeight: '800',
    },
    miniPlayerPlayButton: {
        alignItems: 'center',
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    miniPlayerQuality: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginRight: 4,
    },
    miniPlayerQualityLabel: {
        color: 'rgba(246, 239, 226, 0.52)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
        lineHeight: 13,
    },
    miniPlayerQualityLabelDirect: {
        color: colors.accent,
    },
    miniPlayerSubtitle: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 18,
    },
    miniPlayerText: {
        flex: 1,
    },
    miniPlayerTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    miniPlayerTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 7,
        minWidth: 0,
    },
    pauseGlyph: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
        justifyContent: 'center',
    },
    pauseGlyphBar: {
        borderRadius: 2,
        height: '100%',
        width: 5,
    },
    playGlyph: {
        borderBottomColor: 'transparent',
        borderTopColor: 'transparent',
        height: 0,
        marginLeft: 2,
        width: 0,
    },
    playCircleGlyph: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 999,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    playerControlButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    playerControlButtonPrimary: {
        height: 68,
        width: 68,
    },
    mutedText: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    primaryButtonText: {
        color: '#050505',
        fontSize: 16,
        fontWeight: '800',
    },
    playlistScreen: {
        marginTop: spacing.sm,
    },
    playlistStackIcon: {
        height: 52,
        position: 'relative',
        width: 52,
    },
    playlistStackLayer: {
        backgroundColor: colors.accentSoft,
        borderRadius: 8,
        height: 42,
        left: 2,
        position: 'absolute',
        top: 8,
        width: 42,
    },
    playlistStackLayerOffset: {
        backgroundColor: colors.surface,
        left: 8,
        top: 2,
    },
    playlistSummary: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
        marginTop: 2,
    },
    playlistTopPanel: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 86,
        padding: spacing.md,
    },
    radioCard: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 8,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.sm,
        width: '48.5%',
    },
    radioCardArtwork: {
        aspectRatio: 1,
        borderRadius: 18,
        marginBottom: spacing.sm,
        width: '100%',
    },
    radioCardArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: 'rgba(232, 213, 176, 0.12)',
        borderRadius: 18,
        justifyContent: 'center',
        marginBottom: spacing.sm,
        width: '100%',
    },
    radioCardTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '900',
        lineHeight: 18,
        marginBottom: 2,
        textAlign: 'center',
    },
    radioGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    radioGridHeader: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
    },
    radioHero: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
        minHeight: 154,
        padding: spacing.md,
    },
    radioHeroArtwork: {
        borderRadius: 22,
        height: 106,
        width: 106,
    },
    radioHeroArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(232, 213, 176, 0.12)',
        borderRadius: 22,
        height: 106,
        justifyContent: 'center',
        width: 106,
    },
    radioHeroArtworkWrap: {
        flexShrink: 0,
    },
    radioHeroPlay: {
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    radioHeroText: {
        flex: 1,
        minWidth: 0,
    },
    radioHeroTitle: {
        color: colors.text,
        fontSize: 23,
        fontWeight: '900',
        lineHeight: 28,
    },
    radioScreen: {
        marginTop: spacing.sm,
    },
    root: {
        backgroundColor: colors.background,
        flex: 1,
    },
    row: {
        borderColor: colors.border,
        borderTopWidth: 1,
        paddingVertical: spacing.md,
    },
    rowTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    rowTitleText: {
        flex: 1,
        minWidth: 0,
    },
    rowTitleWithBadge: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 7,
        minWidth: 0,
    },
    hiResBadge: {
        borderRadius: 4,
        height: 38,
        resizeMode: 'contain',
        width: 38,
    },
    hiResBadgeCompact: {
        borderRadius: 3,
        height: 22,
        width: 22,
    },
    hiResBadgeOverlay: {
        left: 6,
        position: 'absolute',
        top: 6,
    },
    hiResBadgePlayer: {
        height: 34,
        width: 34,
    },
    qualityBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 6,
        borderWidth: 1,
        maxWidth: 150,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    qualityBadgeDirect: {
        backgroundColor: 'rgba(202, 160, 79, 0.24)',
        borderColor: 'rgba(202, 160, 79, 0.58)',
    },
    qualityBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    qualityBadgeText: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '900',
        lineHeight: 14,
    },
    qualityBadgeTextDirect: {
        color: colors.accent,
    },
    qualityBadgeTextTranscoded: {
        color: '#e0a06d',
    },
    qualityBadgeTextUnknown: {
        color: colors.muted,
    },
    qualityBadgeTranscoded: {
        backgroundColor: 'rgba(220, 110, 40, 0.18)',
        borderColor: 'rgba(220, 110, 40, 0.34)',
    },
    qualityBadgeUnknown: {
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderColor: 'rgba(255, 255, 255, 0.14)',
    },
    detailHeroActions: {
        alignSelf: 'flex-end',
        flexDirection: 'row',
        gap: spacing.sm,
        justifyContent: 'flex-end',
        marginTop: spacing.md,
    },
    detailPlayPill: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 8,
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    detailPlayPillText: {
        color: colors.background,
        fontSize: 15,
        fontWeight: '900',
    },
    detailShufflePill: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    detailShufflePillText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
    },
    homeFilterPill: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    homeFilterPillActive: {
        backgroundColor: colors.text,
    },
    homeFilterPillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    homeFilterPillTextActive: {
        color: colors.background,
    },
    homeFilterPills: {
        gap: spacing.xs,
        paddingBottom: spacing.sm,
        paddingTop: spacing.md,
    },
    playlistHeaderActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    playlistPillButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 8,
        height: 40,
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    playlistPillButtonText: {
        color: colors.background,
        fontSize: 14,
        fontWeight: '900',
    },
    radioCardNowPlaying: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '800',
        marginTop: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    radioHeroEyebrow: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    radioHeroSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
        marginTop: 4,
    },
    errorBoundaryButton: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    errorBoundaryButtonText: {
        color: '#050505',
        fontSize: 15,
        fontWeight: '800',
    },
    errorBoundaryRoot: {
        alignItems: 'center',
        backgroundColor: colors.background,
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    errorBoundarySubtitle: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    errorBoundaryTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    gestureRoot: {
        backgroundColor: colors.background,
        flex: 1,
    },
    safeArea: {
        backgroundColor: colors.background,
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 24 : 0,
    },
    shuffleGlyph: {
        height: 18,
        position: 'relative',
        width: 20,
    },
    shuffleGlyphArrow: {
        borderLeftColor: 'transparent',
        borderLeftWidth: 4,
        borderRightColor: 'transparent',
        borderRightWidth: 4,
        borderTopWidth: 5,
        height: 0,
        position: 'absolute',
        right: 0,
        width: 0,
    },
    shuffleGlyphLine: {
        borderRadius: 999,
        height: 2,
        left: 0,
        position: 'absolute',
        top: 4,
        width: 14,
    },
    starGlyph: {
        alignItems: 'center',
        height: 24,
        justifyContent: 'center',
        width: 24,
    },
    starGlyphText: {
        fontSize: 18,
        lineHeight: 22,
    },
    searchGlyph: {
        height: 22,
        position: 'relative',
        width: 22,
    },
    searchGlyphCircle: {
        borderRadius: 7,
        borderWidth: 2,
        height: 14,
        left: 2,
        position: 'absolute',
        top: 2,
        width: 14,
    },
    searchGlyphHandle: {
        borderRadius: 999,
        bottom: 3,
        height: 2,
        position: 'absolute',
        right: 2,
        transform: [{ rotate: '45deg' }],
        width: 8,
    },
    searchBrowseSection: {
        marginTop: spacing.xl,
    },
    searchBrowseTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
        lineHeight: 30,
        marginBottom: spacing.md,
    },
    searchOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.72)',
        zIndex: 11000,
    },
    searchOverlayBar: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderColor: 'rgba(255,255,255,0.13)',
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
    },
    searchOverlayClear: {
        alignItems: 'center',
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    searchOverlayInput: {
        color: colors.text,
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        paddingVertical: 10,
    },
    searchOverlayPanel: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        bottom: 0,
        left: 0,
        paddingBottom: 30,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        position: 'absolute',
        right: 0,
        top: 80,
    },
    searchOverlayResults: {
        marginTop: spacing.md,
    },
    searchPanel: {
        marginTop: spacing.lg,
    },
    searchRecentSection: {
        marginTop: spacing.xl,
    },
    searchResultSection: {
        marginTop: spacing.xl,
    },
    searchScopePill: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    searchScopePillActive: {
        backgroundColor: colors.text,
        borderColor: colors.text,
    },
    searchScopePillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    searchScopePillTextActive: {
        color: colors.background,
    },
    searchScopePills: {
        gap: spacing.xs,
        paddingTop: spacing.md,
    },
    searchSourceAccent: {
        borderRadius: 999,
        height: 5,
        marginBottom: spacing.sm,
        width: 34,
    },
    searchSourceCard: {
        backgroundColor: colors.panel,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        borderWidth: 1,
        marginRight: spacing.sm,
        minHeight: 104,
        padding: spacing.md,
        width: 164,
    },
    searchSourceSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
        marginTop: 3,
    },
    searchSourceTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
        lineHeight: 20,
    },
    searchSurfaceSubtitle: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        marginTop: 4,
    },
    searchSurfaceTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '900',
        lineHeight: 28,
    },
    searchArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 52,
        width: 52,
    },
    searchArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 52,
        justifyContent: 'center',
        width: 52,
    },
    searchArtworkLetter: {
        color: colors.accent,
        fontSize: 20,
        fontWeight: '900',
    },
    searchArtworkRound: {
        borderRadius: 26,
    },
    searchRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    searchRowText: {
        flex: 1,
    },
    searchTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    secondaryButton: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 40,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    settingsRoot: {
        // No panel background — settings rows sit directly on the app black
        // so they read as separate "blobs" rather than as one slab.
        marginTop: spacing.lg,
    },
    settingsRootTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '900',
        marginBottom: spacing.md,
    },
    settingsRow: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 14,
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 14,
    },
    settingsRowText: {
        flex: 1,
    },
    settingsRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    settingsRowSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '600',
    },
    downloadsSummary: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: spacing.md,
        marginTop: spacing.xs,
    },
    downloadsStorageRow: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    downloadsStorageLabel: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    downloadsStorageValue: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
    downloadsStorageNote: {
        color: colors.muted,
        fontSize: 11,
        marginTop: 6,
    },
    downloadsStorageActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    downloadsStorageButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    downloadsStorageButtonLabel: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
    },
    downloadGroup: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        marginTop: spacing.sm,
        padding: spacing.sm,
    },
    downloadGroupHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6,
    },
    downloadGroupArtwork: {
        backgroundColor: '#2a2a2c',
        borderRadius: 6,
        height: 40,
        width: 40,
    },
    downloadGroupArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadGroupText: {
        flex: 1,
    },
    downloadGroupTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    downloadGroupSubtitle: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    downloadRow: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingVertical: 8,
    },
    downloadRowText: {
        flex: 1,
    },
    downloadRowTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
    },
    downloadRowStatus: {
        color: colors.muted,
        fontSize: 11,
        marginTop: 2,
    },
    downloadProgressTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        height: 3,
        marginTop: 4,
        overflow: 'hidden',
    },
    downloadProgressFill: {
        backgroundColor: colors.accent,
        height: 3,
    },
    downloadRowActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    downloadActionButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    downloadActionLabel: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '700',
    },
    downloadActionDestructive: {
        color: '#ff7a6e',
    },
    section: {
        backgroundColor: colors.panel,
        borderRadius: 8,
        marginTop: spacing.lg,
        padding: spacing.md,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0,
        marginBottom: 4,
        marginTop: 4,
    },
    segment: {
        alignItems: 'center',
        borderRadius: 7,
        flex: 1,
        justifyContent: 'center',
        minHeight: 38,
        paddingHorizontal: spacing.xs,
    },
    segmentActive: {
        backgroundColor: colors.accentSoft,
    },
    segmentedControl: {
        backgroundColor: colors.background,
        borderRadius: 8,
        flexDirection: 'row',
        gap: 4,
        padding: 4,
    },
    segmentLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    segmentLabelActive: {
        color: colors.accent,
    },
    segmentedSeekTrack: {
        alignItems: 'stretch',
        flexDirection: 'row',
        height: 14,
        paddingVertical: 4,
    },
    seekSegment: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 999,
        flexBasis: 0,
        height: 6,
        overflow: 'hidden',
    },
    seekSegmentFill: {
        borderRadius: 999,
        height: '100%',
    },
    seekSegmentLive: {
        flex: 1,
    },
    seekThumb: {
        borderRadius: 999,
        bottom: -3,
        position: 'absolute',
        top: -3,
        width: 5,
    },
    seekSegmentLiveFill: {
        height: '100%',
        opacity: 0.95,
        width: '100%',
    },
    skipGlyph: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    skipGlyphBar: {
        borderRadius: 2,
        height: 17,
        width: 3,
    },
    skipGlyphTriangle: {
        borderBottomColor: 'transparent',
        borderTopColor: 'transparent',
        height: 0,
        width: 0,
    },
    skipGlyphTriangles: {
        flexDirection: 'row',
        gap: 1,
    },
    sortGlyph: {
        alignItems: 'flex-start',
        gap: 3,
        width: 15,
    },
    sortGlyphLine: {
        borderRadius: 999,
        height: 2,
    },
    stepGlyphText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '900',
    },
    statusPanel: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
    },
    statusTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    tabBar: {
        backgroundColor: '#1c1c1e',
        bottom: 0,
        flexDirection: 'row',
        left: 0,
        paddingBottom: 12,
        paddingHorizontal: spacing.xs,
        paddingTop: 8,
        position: 'absolute',
        right: 0,
    },
    tabButton: {
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
        minHeight: 56,
        paddingHorizontal: 2,
    },
    tabButtonActive: {},
    tabHomeBody: {
        borderRadius: 2,
        borderWidth: 2,
        bottom: 2,
        height: 11,
        position: 'absolute',
        width: 15,
    },
    tabHomeRoofLeft: {
        borderRadius: 999,
        height: 2,
        left: 5,
        position: 'absolute',
        top: 6,
        transform: [{ rotate: '-42deg' }],
        width: 11,
    },
    tabHomeRoofRight: {
        borderRadius: 999,
        height: 2,
        position: 'absolute',
        right: 5,
        top: 6,
        transform: [{ rotate: '42deg' }],
        width: 11,
    },
    tabIcon: {
        alignItems: 'center',
        flexDirection: 'row',
        height: 24,
        justifyContent: 'center',
        position: 'relative',
        width: 24,
    },
    tabLibraryBook: {
        borderRadius: 2,
        borderWidth: 1.8,
        height: 18,
        marginHorizontal: 1,
        width: 5,
    },
    tabPlaylistLine: {
        borderRadius: 999,
        height: 2.2,
        left: 3,
        position: 'absolute',
        width: 18,
    },
    tabPlaylistPlay: {
        borderBottomColor: 'transparent',
        borderBottomWidth: 4,
        borderLeftWidth: 7,
        borderTopColor: 'transparent',
        borderTopWidth: 4,
        height: 0,
        position: 'absolute',
        right: 1,
        top: 8,
        width: 0,
    },
    tabRadioAntenna: {
        borderRadius: 999,
        height: 8,
        position: 'absolute',
        right: 6,
        top: 2,
        transform: [{ rotate: '34deg' }],
        width: 2,
    },
    tabRadioBody: {
        borderRadius: 4,
        borderWidth: 1.8,
        bottom: 3,
        height: 13,
        position: 'absolute',
        width: 19,
    },
    tabRadioDot: {
        borderRadius: 3,
        bottom: 7,
        height: 6,
        left: 5,
        position: 'absolute',
        width: 6,
    },
    tabRadioLine: {
        borderRadius: 999,
        bottom: 8,
        height: 2,
        position: 'absolute',
        right: 5,
        width: 6,
    },
    tabSearchCircle: {
        borderRadius: 8,
        borderWidth: 2,
        height: 15,
        left: 3,
        position: 'absolute',
        top: 3,
        width: 15,
    },
    tabSearchHandle: {
        borderRadius: 999,
        bottom: 3,
        height: 2.2,
        position: 'absolute',
        right: 3,
        transform: [{ rotate: '45deg' }],
        width: 8,
    },
    tabLabel: {
        color: colors.muted,
        fontSize: 10,
        fontWeight: '800',
        marginTop: 4,
    },
    tabLabelActive: {
        color: colors.text,
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: 0,
    },
    trackArtwork: {
        borderRadius: 6,
        height: 44,
        width: 44,
    },
    trackArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 6,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    trackArtworkLetter: {
        color: colors.muted,
        fontSize: 16,
        fontWeight: '700',
    },
    trackMenuButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    trackRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 58,
        paddingVertical: spacing.sm,
    },
    warningText: {
        color: colors.accent,
    },
});

import {
    buildAudioQualityBadgeItems,
    isHiResAudioQuality,
    isLosslessAudioQuality,
} from '@samo/core/audio-quality';
import {
    addMobileTracksToPlaylist,
    appendAudiobookshelfAuthToken,
    buildAudiobookshelfArtworkUrl,
    getDetailQualityProfile,
    getItemQualityProfile,
    getMobileContentSource,
    getPlaybackQualityProfile,
    loadMobileMediaDetail,
    loadSongRadioQueue,
    mimeFromAudiobookshelfExt,
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
    type MobileQualityProfile,
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
    memo,
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
import {
    FlatList as GestureFlatList,
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import ditherTexture from './assets/dither.png';
import samoLogo from './assets/samo-logo.png';
import {
    type AndroidAudioDeviceInfo,
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    type AndroidNativePlaybackEvent,
    type AndroidPlaybackTruth,
    getAndroidAudioDeviceInfo,
    getAndroidCastState,
    getAndroidOutputRoutes,
    isAndroidNativePlaybackAvailable,
    pauseAndroidAudio,
    playAndroidAudio,
    resumeAndroidAudio,
    seekAndroidAudio,
    getAndroidPlaybackStatus,
    selectAndroidOutputRoute,
    subscribeToAndroidAudioEvents,
    subscribeToAndroidCastEvents,
    subscribeToAndroidNavigationRequests,
    subscribeToAndroidOutputRouteEvents,
} from './src/services/audio-playback';
import {
    cancelDownload,
    type DownloadEntry,
    type DownloadStatus,
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
    getDownloadsRootUri,
    getLocalDownloadForTrack,
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
import { triggerImpact, triggerSelection } from './src/services/haptics';
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
import {
    formatQualityProfile,
    pickQualityBadgeAsset,
} from './src/services/quality-badge-assets';
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
import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    FULL_PLAYER_EXPANDED_TOP,
    FULL_PLAYER_PADDING_BOTTOM,
    FULL_PLAYER_PADDING_TOP,
    HOME_COMPACT_OFFSET,
    HOME_PRIMARY_TILE,
    HOME_ROUNDED_OFFSET,
    HOME_ROW_INITIAL_ITEMS,
    HOME_ROW_RENDER_BATCH,
    HOME_ROW_WINDOW_SIZE,
    HOME_TILE_GAP,
    MINI_PLAYER_COLLAPSED_TOP,
    MINI_PLAYER_HEIGHT,
    MINI_PLAYER_RADIUS,
    OPEN_SPRING,
    PLAYER_EXPANSION_DISTANCE,
    QUEUE_CLOSE_DISTANCE,
    QUEUE_CLOSE_VELOCITY,
    QUEUE_SHEET_HEIGHT,
    REDUCED_MOTION_SPRING,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
    VIEW_ALL_INITIAL_ITEMS,
    VIEW_ALL_RENDER_BATCH,
    VIEW_ALL_ROW_HEIGHT,
    VIEW_ALL_WINDOW_SIZE,
} from './src/theme/layout';
import {
    BookInfoGlyph,
    CastGlyph,
    ChaptersGlyph,
    CheckGlyph,
    CircularDownloadGlyph,
    ClearGlyph,
    DiscGlyph,
    DownCaretGlyph,
    DownloadGlyph,
    EllipsisVerticalGlyph,
    EyeGlyph,
    FullPlayerImageGlyph,
    GearGlyph,
    HeartGlyph,
    MoreGlyph,
    PersonGlyph,
    PlayCircleGlyph,
    PlayPauseGlyph,
    PlaylistAddGlyph,
    QueueAddGlyph,
    RadioWaveGlyph,
    SearchGlyph,
    ShuffleGlyph,
    SleepTimerGlyph,
    SortGlyph,
    TabIcon,
    TrackDownloadedGlyph,
    TrackSkipGlyph,
} from './src/components/Glyphs';
import { styles } from './src/theme/styles';
import { colors, spacing } from './src/theme/tokens';

const CAST_ICON_ACTIVE_TINT = 'rgba(202, 160, 79, 0.78)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';

const SERVER_TYPES = [ServerType.NAVIDROME, ServerType.SUBSONIC, ServerType.AUDIOBOOKSHELF].filter(
    supportsServerTypeOnAndroid,
);

const addDefaultHttpScheme = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `http://${trimmed.replace(/^\/+/, '')}`;
};

const getTabTitle = (activeTab: SamoMobileTabId) => {
    return SAMO_MOBILE_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Samo';
};

const getContentItemKey = (item: { id: string; source?: { id: string }; type: string }) => {
    return `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
};

const getDownloadedTrackKey = (sourceId: string | undefined, trackId: string) => {
    return `${sourceId ?? 'server'}:${trackId}`;
};

type DownloadedCollectionSummary = {
    collection: DownloadEntry['collection'];
    latestCompletedAt: number;
};

type DownloadedCollectionSnapshot = {
    collections: DownloadedCollectionSummary[];
    keys: Set<string>;
    signature: string;
    trackKeys: Set<string>;
};

const EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT: DownloadedCollectionSnapshot = {
    collections: [],
    keys: new Set(),
    signature: '',
    trackKeys: new Set(),
};

const buildDownloadedCollectionSnapshot = (
    entries: DownloadEntry[],
): DownloadedCollectionSnapshot => {
    const keys = new Set<string>();
    const trackKeys = new Set<string>();
    const collections = new Map<string, DownloadedCollectionSummary>();

    for (const entry of entries) {
        if (entry.status !== 'completed') continue;

        const key = `${entry.collection.sourceId}:${entry.collection.id}`;
        keys.add(key);
        trackKeys.add(getDownloadedTrackKey(entry.collection.sourceId, entry.trackId));
        const existing = collections.get(key);
        const latestCompletedAt = entry.completedAt ?? entry.enqueuedAt;
        if (!existing || latestCompletedAt > existing.latestCompletedAt) {
            collections.set(key, {
                collection: entry.collection,
                latestCompletedAt,
            });
        }
    }

    const summaries = [...collections.values()];
    const collectionSignature = summaries
        .map(
            ({ collection, latestCompletedAt }) =>
                [
                    collection.sourceId,
                    collection.id,
                    collection.type,
                    collection.title,
                    collection.artworkUrl ?? '',
                    latestCompletedAt,
                ].join(':'),
        )
        .sort()
        .join('|');
    const trackSignature = [...trackKeys].sort().join('|');
    const signature = `${collectionSignature}::${trackSignature}`;

    return { collections: summaries, keys, signature, trackKeys };
};

const getLastPlayedPersistenceKey = (item: MobilePlayableAudio): string =>
    `${item.contentSourceId ?? 'server'}:${item.id}`;

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
            // Chromecast can't read the phone's filesystem; preserve the
            // original streaming URL so a route hand-off still works.
            castUrl: entry.sourceUrl,
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
 *   - transition=120 fades cached / decoded bitmaps in over ~2 frames so the
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
            allowDownscaling
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={() => setErrored(true)}
            recyclingKey={uri}
            source={uri}
            style={style as StyleProp<ImageStyle>}
            transition={120}
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
    onServerUrlBlur: () => void;
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
type ActiveAndroidPlaybackState = Exclude<AndroidPlaybackState, { status: 'idle' }>;

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
    nowPlayingRadioId: null | string;
    onSelectItem: (item: MobileHomeItem) => void;
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

type LibrarySort = 'name' | 'recents';

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
    // True when the menu is opened from a playback surface where "queue this"
    // would be conceptually backwards, namely the fullscreen player.
    suppressQueueAction?: boolean;
}

type MediaContextMenuTarget =
    | {
          detail?: MobileMediaDetail;
          kind: 'song';
          source?: MobileContentSource;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          suppressQueueAction?: boolean;
          track: MobileMediaTrack;
      }
    | {
          item: AndroidRecentContentSourceItem;
          kind: Exclude<MediaContextMenuKind, 'song'>;
          suppressDownloadAction?: boolean;
          suppressOpenAction?: boolean;
          suppressQueueAction?: boolean;
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

const DownloadedTrackKeysContext = createContext<Set<string>>(new Set());

const useDownloadedTrackKeys = () => useContext(DownloadedTrackKeysContext);

const useStableCallback = <TArgs extends unknown[], TResult>(
    callback: (...args: TArgs) => TResult,
): ((...args: TArgs) => TResult) => {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback((...args: TArgs) => callbackRef.current(...args), []);
};

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
    authentication?: ServerAuthenticationResult,
): MobilePlayableAudio => {
    return {
        artworkUrl: detail.artworkUrl,
        // The cast leg points at ABS's `/api/items/.../file/:ino` URL which
        // has no file extension, so the native receiver can't infer mime
        // from the path — pass it explicitly from the downloaded file's
        // extension. Without this an M4B audiobook hits the cast as
        // audio/mpeg and silently fails to decode on most receivers.
        castMimeType: mimeFromCastUri(file.localUri),
        // Chromecast can't read local files; route casting through the ABS
        // server URL with `?token=…` so the receiver can self-authenticate.
        castUrl: authentication
            ? appendAudiobookshelfAuthToken(file.sourceUrl, authentication.credential)
            : undefined,
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
    sourceUrl?: string,
    authentication?: ServerAuthenticationResult,
): MobilePlayableAudio => {
    const itemId = track.itemId ?? detail.id;
    const episodeId = track.episodeId ?? track.id;
    return {
        artworkUrl: track.artworkUrl ?? detail.artworkUrl,
        // ABS file URLs have no extension — pass the downloaded file's mime
        // explicitly so the cast receiver doesn't fall back to audio/mpeg.
        castMimeType: mimeFromCastUri(localUri),
        // Same as offline audiobooks: cast routes through the ABS server URL.
        castUrl:
            sourceUrl && authentication
                ? appendAudiobookshelfAuthToken(sourceUrl, authentication.credential)
                : undefined,
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

/** Pull a `.ext` off the end of a local file URI and map it to the mime
 *  type the cast receiver should advertise for the corresponding ABS file
 *  URL (which the receiver can't sniff because the URL has no extension). */
const mimeFromCastUri = (localUri: string | undefined): string | undefined => {
    if (!localUri) return undefined;
    const match = localUri.match(/\.([a-z0-9]+)(?:$|[?#])/i);
    return mimeFromAudiobookshelfExt(match?.[1]) ?? undefined;
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

const LIBRARY_SORTS: Array<{ id: LibrarySort; label: string }> = [
    { id: 'recents', label: 'Recents' },
    { id: 'name', label: 'Name' },
];

const isHiFiPlayback = (playback?: MobilePlayableAudio): boolean =>
    Boolean(playback && isLosslessAudioQuality(playback.quality));

const isHiFiTrack = (track: MobileMediaTrack): boolean => isHiFiPlayback(track.playback);

const getHighResolutionArtworkUrl = (
    artworkUrl: string | null | undefined,
    size = 1200,
): string | undefined => {
    if (!artworkUrl) return undefined;

    try {
        const url = new URL(artworkUrl);
        const isSubsonicCoverArt = url.pathname.toLowerCase().includes('getcoverart');

        if (url.searchParams.has('size') || isSubsonicCoverArt) {
            url.searchParams.set('size', String(size));
        }

        return url.toString();
    } catch {
        return artworkUrl;
    }
};

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
    const [castState, setCastState] = useState<AndroidCastState>({
        isConnected: false,
        status: 'unavailable',
    });
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
    const [downloadedTrackKeys, setDownloadedTrackKeys] = useState<Set<string>>(new Set());
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
    const audiobookStartRequestId = useRef(0);
    const bookInfoRequestId = useRef(0);
    const downloadedCollectionSnapshotRef = useRef<DownloadedCollectionSnapshot>(
        EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT,
    );
    const homeLoadRequestId = useRef(0);
    const lastPlayedPersistenceKeyRef = useRef<string | null>(null);
    const mediaDetailRequestId = useRef(0);
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

    const closeMediaDetail = useCallback(() => {
        mediaDetailRequestId.current += 1;
        audiobookStartRequestId.current += 1;
        setMediaDetailState({ status: 'idle' });
    }, []);

    const closeBookInfo = useCallback(() => {
        bookInfoRequestId.current += 1;
        setBookInfoState({ status: 'idle' });
    }, []);

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
                closeMediaDetail();
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
    }, [
        activeUtilityScreen,
        closeMediaDetail,
        isFullPlayerOpen,
        isSearchOverlayOpen,
        mediaDetailState.status,
    ]);

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
        // Build a key→item index from the freshly-loaded home content so we
        // can swap recents up to date at render time. The home loader runs
        // annotateSubsonicAlbumsQuality on every album section, which means
        // the fresh copies carry qualityProfile — so backfilling here lets
        // recents inherit the badge without us having to rewrite the
        // persisted store. Same trick applies for artworkUrl, which used to
        // be the only field we patched here.
        const freshByKey = new Map<string, MobileHomeItem>();
        if (homeContentState.status === 'loaded') {
            for (const section of homeContentState.content.sections) {
                for (const item of section.items) {
                    const key = getRecentContentItemKey(item);
                    if (!freshByKey.has(key)) {
                        freshByKey.set(key, item);
                    }
                }
            }
        }
        return filtered.map((entry) => {
            const fresh = freshByKey.get(entry.key);
            // Merge keeps stored fields as the base — title/subtitle/source
            // — and layers any fresh signal (qualityProfile, artworkUrl,
            // isHiRes) on top. We don't fully replace because a recent item
            // can outlive its home-content reflection (eg you clicked
            // through to an album that isn't in your home-page slice).
            const merged: AndroidRecentContentSourceItem = fresh
                ? {
                      ...entry.item,
                      artworkUrl: entry.item.artworkUrl ?? fresh.artworkUrl,
                      isHiRes: entry.item.isHiRes ?? fresh.isHiRes,
                      qualityProfile:
                          'qualityProfile' in entry.item
                              ? entry.item.qualityProfile ?? fresh.qualityProfile
                              : fresh.qualityProfile,
                  }
                : entry.item;
            // Recents persisted before subsonicCoverArtUrl learned the
            // entity-id fallback were stored without artworkUrl. Backfill
            // at render time so they pick up real covers as soon as the
            // matching server is connected, without rewriting storage.
            if (!merged.artworkUrl) {
                const resolved = resolveItemArtworkUrl(merged, serverConnections);
                if (resolved) {
                    return { ...entry, item: { ...merged, artworkUrl: resolved } };
                }
            }
            return merged === entry.item ? entry : { ...entry, item: merged };
        });
    }, [
        recentContentItems,
        isOfflineMode,
        downloadedCollectionKeys,
        serverConnections,
        homeContentState,
    ]);

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
                const isCurrentPlaybackSession = () =>
                    playbackSnapshotRef.current?.sessionId === session.id;
                const deviceInfoPromise = getAndroidAudioDeviceInfo().catch(() => undefined);
                // Prefer a downloaded local file if we have one for this
                // track — that's the whole point of the offline downloader.
                // Falls through to the streaming URL if not downloaded.
                const playable = castState.isConnected ? item : await resolveLocalPlayback(item);
                if (!isCurrentPlaybackSession()) return;
                let event = await playAndroidAudio(playable, session.id, item);
                if (!isCurrentPlaybackSession()) return;

                if (initialPositionMs > 0) {
                    event = await seekAndroidAudio(initialPositionMs);
                    if (!isCurrentPlaybackSession()) return;
                }

                const deviceInfo = await deviceInfoPromise;
                if (!isCurrentPlaybackSession()) return;

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
                if (playbackSnapshotRef.current?.sessionId !== session.id) return;
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
        [castState.isConnected],
    );

    const recordRecentContentItem = useCallback((item: AndroidRecentContentSourceItem) => {
        setRecentContentItems((current) => {
            const nextItems = upsertRecentContentItem(current, item);

            void savePersistedRecentContentItems(nextItems);

            return nextItems;
        });
    }, []);

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
                    positionMs: getStablePlaybackPositionMs(event, current),
                    status: getActivePlaybackStatus(event.status, current.status),
                };
            });
        });

        return () => subscription.remove();
    }, [playQueuedItem]);

    useEffect(() => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        const subscription = subscribeToAndroidCastEvents((event) => {
            setCastState(event);
        });

        void getAndroidCastState()
            .then(setCastState)
            .catch(() =>
                setCastState({
                    isConnected: false,
                    status: 'unavailable',
                }),
            );

        return () => subscription.remove();
    }, []);

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

                        const nextPositionMs = getStablePlaybackPositionMs(event, current);
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
                lastPlayedPersistenceKeyRef.current = getLastPlayedPersistenceKey(item);
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
            const nextSnapshot = buildDownloadedCollectionSnapshot(entries);
            if (downloadedCollectionSnapshotRef.current.signature === nextSnapshot.signature) {
                return;
            }
            downloadedCollectionSnapshotRef.current = nextSnapshot;
            setDownloadedCollectionKeys(nextSnapshot.keys);
            setDownloadedTrackKeys(nextSnapshot.trackKeys);
            setDownloadedCollections(nextSnapshot.collections);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const activePlaybackItem =
        playbackState.status !== 'idle' ? playbackState.item : null;

    useEffect(() => {
        if (!activePlaybackItem) {
            return;
        }
        const item = activePlaybackItem;
        const persistenceKey = getLastPlayedPersistenceKey(item);
        if (lastPlayedPersistenceKeyRef.current === persistenceKey) {
            setLastPlayedItem((current) => current ?? item);
            return;
        }
        lastPlayedPersistenceKeyRef.current = persistenceKey;
        setLastPlayedItem(item);
        void savePersistedLastPlayedItem(item);
    }, [activePlaybackItem]);

    // Single canonical URL for the currently-playing track's artwork. The
    // MiniPlayer, FullScreenPlayer, and album-essence color extractor all
    // share this exact string so they share a single expo-image cache entry.
    // Previously the miniplayer used the raw (size=320) URL while fullscreen
    // derived its own (size=1200) variant — separate cache keys meant the
    // first open of fullscreen always had to download a different image, and
    // a fast open/close gesture could leave the player painting the wrong
    // variant ("stick on low-res"). One URL → one image → one load → never
    // a quality mismatch.
    const playbackArtworkSourceUrl = activePlaybackItem?.artworkUrl ?? lastPlayedItem?.artworkUrl;
    const currentHighResArtworkUrl = useMemo(
        () => getHighResolutionArtworkUrl(playbackArtworkSourceUrl),
        [playbackArtworkSourceUrl],
    );
    // Prefetch into both memory + disk so even fast taps after track start
    // hit cache. expo-image dedupes in-flight requests with the same URL,
    // so this races safely against the miniplayer's component-level load.
    useEffect(() => {
        if (!currentHighResArtworkUrl) return;
        void ExpoImage.prefetch(currentHighResArtworkUrl, 'memory-disk');
    }, [currentHighResArtworkUrl]);

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

    const enrichRecentAlbumFromDetail = useCallback(
        (item: AndroidRecentContentSourceItem, detail: MobileMediaDetail) => {
            if (detail.type !== MobileMediaDetailType.ALBUM) {
                return;
            }

            const detailProfile = getDetailQualityProfile(detail);
            if (!detailProfile && !detail.artworkUrl && !detail.subtitle) {
                return;
            }

            const key = getRecentContentItemKey(item);
            setRecentContentItems((current) => {
                let changed = false;
                const nextItems = current.map((entry) => {
                    if (entry.key !== key) {
                        return entry;
                    }

                    const currentProfile = getItemQualityProfile(entry.item);
                    const nextItem: AndroidRecentContentSourceItem = { ...entry.item };
                    let itemChanged = false;

                    if (
                        detailProfile &&
                        (!currentProfile ||
                            currentProfile.bitDepth !== detailProfile.bitDepth ||
                            currentProfile.sampleRate !== detailProfile.sampleRate)
                    ) {
                        nextItem.qualityProfile = detailProfile;
                        itemChanged = true;
                    }

                    if (detailHasHiRes(detail) && !nextItem.isHiRes) {
                        nextItem.isHiRes = true;
                        itemChanged = true;
                    }

                    if (!nextItem.artworkUrl && detail.artworkUrl) {
                        nextItem.artworkUrl = detail.artworkUrl;
                        itemChanged = true;
                    }

                    if (!nextItem.subtitle && detail.subtitle) {
                        nextItem.subtitle = detail.subtitle;
                        itemChanged = true;
                    }

                    if (!itemChanged) {
                        return entry;
                    }

                    changed = true;
                    return { ...entry, item: nextItem };
                });

                if (!changed) {
                    return current;
                }

                void savePersistedRecentContentItems(nextItems);
                return nextItems;
            });
        },
        [],
    );

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
            const persistedConnectionSignature = persistedAuths
                .map(getPersistedServerAuthKey)
                .join('|');
            void loadHomeForConnections(persistedAuths);

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
                const authorizedConnectionSignature = authorizedAuthentications
                    .map(getPersistedServerAuthKey)
                    .join('|');
                if (authorizedConnectionSignature !== persistedConnectionSignature) {
                    void loadHomeForConnections(authorizedAuthentications);
                }
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

        const normalizedServerUrl = addDefaultHttpScheme(serverUrl);
        setServerUrl(normalizedServerUrl);
        setAuthState({ message: 'Connecting to server', status: 'loading' });
        setHomeContentState({ status: 'idle' });

        const nextAuthState = await authenticateServer({
            password,
            type: serverType,
            url: normalizedServerUrl,
            username: username.trim(),
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
            closeMediaDetail();
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
        closeMediaDetail();
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
        audiobookStartRequestId.current += 1;
        const requestId = (mediaDetailRequestId.current += 1);
        const isCurrentRequest = () => mediaDetailRequestId.current === requestId;
        const cacheKey = getRecentContentItemKey(item);

        // Layer 1: in-memory cache — instant.
        let cached = mediaDetailCacheRef.current.get(cacheKey);

        // Layer 2: persistent fs cache — async, but still much faster than
        // the network and works in airplane mode.
        if (!cached) {
            const fromDisk = await loadCachedMediaDetail(cacheKey);
            if (!isCurrentRequest()) {
                return { cached: false };
            }
            if (fromDisk) {
                cached = fromDisk;
                mediaDetailCacheRef.current.set(cacheKey, fromDisk);
            }
        }

        if (!cached && isOfflineMode) {
            const downloadedDetail = await buildDownloadedMusicDetail(item);
            if (!isCurrentRequest()) {
                return { cached: false };
            }
            if (downloadedDetail) {
                cached = downloadedDetail;
                mediaDetailCacheRef.current.set(cacheKey, downloadedDetail);
            }
        }

        if (cached) {
            enrichRecentAlbumFromDetail(item, cached);
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
        if (!isCurrentRequest()) {
            return { cached: Boolean(cached) };
        }
        if (next.status === 'loaded') {
            mediaDetailCacheRef.current.set(cacheKey, next.detail);
            void saveCachedMediaDetail(cacheKey, next.detail);
            enrichRecentAlbumFromDetail(item, next.detail);
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
            closeMediaDetail();

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
        [closeMediaDetail, homeContentState, serverConnections],
    );

    const handleSelectMediaItem = async (item: MobileHomeItem | MobileSearchItem) => {
        recordRecentContentItem(item);

        if (item.playback) {
            mediaDetailRequestId.current += 1;
            audiobookStartRequestId.current += 1;
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
        mediaDetailRequestId.current += 1;
        const requestId = (audiobookStartRequestId.current += 1);
        const isCurrentRequest = () => audiobookStartRequestId.current === requestId;
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
        if (!isCurrentRequest()) return;
        let detail: MobileMediaDetail | undefined =
            networkResult.status === 'loaded' ? networkResult.detail : undefined;

        if (!detail) {
            detail =
                mediaDetailCacheRef.current.get(cacheKey) ??
                (await loadCachedMediaDetail(cacheKey)) ??
                undefined;
            if (!isCurrentRequest()) return;
        }

        if (!detail) {
            // Last resort: build a synthetic detail from the downloaded files.
            // Lets the user play an audiobook entirely offline even if the
            // server's never been reached since launch.
            const offlineFiles = await getOfflineAudiobookFiles(item.id, item.source?.id ?? '');
            if (!isCurrentRequest()) return;
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
        if (!isCurrentRequest()) return;
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

        if (!isCurrentRequest()) return;
        await handlePlayMediaTrack(detail, trackToPlay, chapterIndex, undefined, {
            isCurrentRequest,
        });
    };

    const handlePlayMediaTrack = async (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
        options?: { isCurrentRequest?: () => boolean },
    ) => {
        const isCurrentRequest = () => options?.isCurrentRequest?.() !== false;
        if (track.playback) {
            const queueItems = (queueTracks ?? detail.tracks).flatMap((candidate) =>
                candidate.playback ? [candidate.playback] : [],
            );
            const queueIndex = queueItems.findIndex(
                (candidate) => candidate.id === track.playback?.id,
            );

            if (!isCurrentRequest()) return;
            if (queueIndex >= 0) {
                await handlePlayItem(track.playback, queueItems, queueIndex);
            } else {
                await handlePlayItem(track.playback, [track.playback], 0);
            }
            return;
        }

        // Podcast offline path: the ABS /play endpoint that normally builds the
        // streaming URL fails offline, so synthesize a MobilePlayableAudio
        // directly from the downloaded file when one exists for this episode.
        if (detail.type === MobileMediaDetailType.PODCAST) {
            const lookupTrackId = track.episodeId ?? track.id;
            const localDownload = await getLocalDownloadForTrack(
                lookupTrackId,
                detail.source.id,
            );
            if (!isCurrentRequest()) return;
            if (localDownload) {
                const absAuth = serverConnections.find(
                    (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
                );
                const playable = buildOfflinePodcastEpisodePlayable(
                    detail,
                    track,
                    localDownload.localUri,
                    localDownload.sourceUrl,
                    absAuth,
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
                if (!isCurrentRequest()) return;
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
            if (!isCurrentRequest()) return;
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
                const absAuth = serverConnections.find(
                    (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
                );
                const queue = offlineFiles.map((file, idx) =>
                    buildOfflineAudiobookPlayable(
                        detail,
                        file,
                        idx === startIndex ? initialOffsetSeconds : 0,
                        absAuth,
                    ),
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
                if (!isCurrentRequest()) return;
                await handlePlayItem(queue[startIndex], queue, startIndex);
                return;
            }
        }

        try {
            const playable = await loadAndroidMediaTrackPlayback(serverConnections, detail, track);
            if (!isCurrentRequest()) return;
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

            if (!isCurrentRequest()) return;
            await handlePlayItem(playable, [playable], index);
        } catch (error) {
            if (!isCurrentRequest()) return;
            setMediaDetailState({
                itemTitle: detail.title,
                message: error instanceof Error ? error.message : 'Playback failed',
                status: 'error',
            });
        }
    };

    const handleShuffleDetailTracks = useCallback(
        async (detail: MobileMediaDetail, tracks: MobileMediaTrack[] = detail.tracks) => {
            const playableTracks = tracks.flatMap((track) =>
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

    const canAppendToPlaybackQueue =
        playbackState.status !== 'idle' && playbackState.item.source !== 'radio';

    const appendPlayableItemsToQueue = useCallback(
        (items: MobilePlayableAudio[]): number => {
            const queueableItems = items.filter((item) => item.source !== 'radio');

            if (queueableItems.length === 0) {
                setContextMenuFeedback('Nothing playable was found for the queue.');
                return 0;
            }

            if (playbackState.status === 'idle') {
                setContextMenuFeedback('Start playback before adding to the queue.');
                return 0;
            }

            if (playbackState.item.source === 'radio') {
                setContextMenuFeedback('Radio playback does not have an Up Next queue.');
                return 0;
            }

            const queue = playbackQueueRef.current;
            if (queue) {
                playbackQueueRef.current = {
                    index: queue.index,
                    items: [...queue.items, ...queueableItems],
                };
            } else {
                playbackQueueRef.current = {
                    index: 0,
                    items: [playbackState.item, ...queueableItems],
                };
            }

            return queueableItems.length;
        },
        [playbackState],
    );

    const loadDetailForContextAction = useCallback(
        async (item: AndroidRecentContentSourceItem): Promise<MobileMediaDetail | null> => {
            const cacheKey = getRecentContentItemKey(item);
            let detail = mediaDetailCacheRef.current.get(cacheKey);

            if (!detail) {
                const fromDisk = await loadCachedMediaDetail(cacheKey);
                if (fromDisk) {
                    detail = fromDisk;
                    mediaDetailCacheRef.current.set(cacheKey, fromDisk);
                }
            }

            if (!detail && isOfflineMode) {
                const downloadedDetail = await buildDownloadedMusicDetail(item);
                if (downloadedDetail) {
                    detail = downloadedDetail;
                    mediaDetailCacheRef.current.set(cacheKey, downloadedDetail);
                }
            }

            if (detail && isOfflineMode) {
                return detail;
            }

            const next = await loadAndroidMediaDetail(serverConnections, item);
            if (next.status === 'loaded') {
                mediaDetailCacheRef.current.set(cacheKey, next.detail);
                void saveCachedMediaDetail(cacheKey, next.detail);
                return next.detail;
            }

            return detail ?? null;
        },
        [isOfflineMode, serverConnections],
    );

    const handleAddTrackToQueue = useCallback(
        (track: MobileMediaTrack) => {
            const playback = track.playback;
            if (playback?.source !== 'music') {
                setContextMenuFeedback('Only music tracks can be added to the queue.');
                return;
            }

            const added = appendPlayableItemsToQueue([playback]);
            if (added > 0) {
                setContextMenuFeedback('Added to queue');
            }
        },
        [appendPlayableItemsToQueue],
    );

    const handleAddCollectionToQueue = useCallback(
        async (item: AndroidRecentContentSourceItem) => {
            if (
                item.type !== MobileHomeItemType.ALBUM &&
                item.type !== MobileHomeItemType.PLAYLIST
            ) {
                setContextMenuFeedback('Only music albums and playlists can be added to the queue.');
                return;
            }

            setContextMenuFeedback('Adding to queue...');
            const detail = await loadDetailForContextAction(item);
            if (!detail) {
                setContextMenuFeedback('Could not load tracks for this item.');
                return;
            }

            const playables = detail.tracks.flatMap((track) =>
                track.playback?.source === 'music' ? [track.playback] : [],
            );
            const added = appendPlayableItemsToQueue(playables);
            if (added > 0) {
                setContextMenuFeedback(
                    added === 1 ? 'Added 1 track to queue' : `Added ${added} tracks to queue`,
                );
            }
        },
        [appendPlayableItemsToQueue, loadDetailForContextAction],
    );

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
        const requestId = (bookInfoRequestId.current += 1);
        const isCurrentRequest = () => bookInfoRequestId.current === requestId;
        setContextMenuTarget(null);
        setBookInfoState({ item, status: 'loading', variant });
        const next = await loadAndroidMediaDetail(serverConnections, item);
        if (!isCurrentRequest()) return;

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
                        suppressQueueAction: options?.suppressQueueAction,
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
                    suppressQueueAction: options?.suppressQueueAction,
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
            const canQueueTrack =
                canAppendToPlaybackQueue &&
                !contextMenuTarget.suppressQueueAction &&
                track.playback?.source === 'music';
            actions.push({
                icon: <HeartGlyph color={isFavorited ? colors.accent : colors.text} filled={isFavorited} />,
                id: 'favorite',
                label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
                onPress: () => void handleToggleFavoriteForTrack(track, source?.id),
            });
            if (canQueueTrack) {
                actions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => handleAddTrackToQueue(track),
                });
            }
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
        const suppressQueue = contextMenuTarget.suppressQueueAction === true;

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
            if (canAppendToPlaybackQueue && !suppressQueue) {
                actions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => void handleAddCollectionToQueue(item),
                });
            }
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
        canAppendToPlaybackQueue,
        getFavoriteKeyForItem,
        getFavoriteKeyForTrack,
        handleAddCollectionToQueue,
        handleAddTrackToQueue,
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

    const handleOpenSettings = useCallback(() => {
        setActiveUtilityScreen('settings');
        closeMediaDetail();
    }, [closeMediaDetail]);
    const handleOpenManageServers = useCallback(() => {
        setActiveUtilityScreen('manage-servers');
    }, []);
    const handleOpenDownloads = useCallback(() => {
        setActiveUtilityScreen('downloads');
    }, []);
    const handleOpenAddServer = useCallback(() => {
        setActiveUtilityScreen('add-server');
    }, []);
    const handleServerUrlBlur = useCallback(() => {
        setServerUrl((current) => addDefaultHttpScheme(current));
    }, []);
    const handleOpenFullPlayer = useCallback(() => {
        setIsFullPlayerOpen(true);
    }, []);
    const handleCloseFullPlayer = useCallback(() => {
        setIsFullPlayerOpen(false);
    }, []);
    const handleViewAllBack = useCallback(() => {
        setActiveUtilityScreen(null);
        setViewAllRoute(null);
        viewAllFetchTokenRef.current += 1;
        setViewAllFullState({ status: 'idle' });
    }, []);
    const handleSelectMediaItemStable = useStableCallback(
        (item: MobileHomeItem | MobileSearchItem) => {
            void handleSelectMediaItem(item);
        },
    );
    const handleSelectViewAllItem = useCallback(
        (item: AndroidRecentContentSourceItem) => {
            handleViewAllBack();
            handleSelectMediaItemStable(item);
        },
        [handleSelectMediaItemStable, handleViewAllBack],
    );
    const handlePlayMediaTrackStable = useStableCallback(
        (
            detail: MobileMediaDetail,
            track: MobileMediaTrack,
            index: number,
            queueTracks?: MobileMediaTrack[],
        ) => {
            void handlePlayMediaTrack(detail, track, index, queueTracks);
        },
    );
    const handleAddMediaTrackToPlaylistStable = useStableCallback(
        (
            detail: MobileMediaDetail,
            track: MobileMediaTrack,
            playlist: MobileHomeItem,
        ) => handleAddMediaTrackToPlaylist(detail, track, playlist),
    );
    const handleToggleOfflineMode = useCallback((next: boolean) => {
        setIsOfflineMode(next);
        void saveOfflineModePreference(next);
    }, []);
    const rootPlaylistTargets = useMemo(
        () => getPlaylistTargetsForRoot(homeContentState, playlistMenuRoot?.sourceId),
        [homeContentState, playlistMenuRoot?.sourceId],
    );
    const rootPlaylistTrack = useMemo<MobileMediaTrack | null>(() => {
        if (!playlistMenuRoot) {
            return null;
        }

        if (playlistMenuRoot.kind === 'track') {
            return playlistMenuRoot.track;
        }

        return {
            id: playlistMenuRoot.collectionItem.id,
            title: playlistMenuRoot.collectionItem.title,
        } as MobileMediaTrack;
    }, [playlistMenuRoot]);
    const nowPlayingRadioId =
        activePlaybackItem?.source === 'radio' ? activePlaybackItem.id : null;

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
        <ErrorBoundary label="App">
        <MediaContextMenuContext.Provider value={mediaContextMenuApi}>
        <DownloadedTrackKeysContext.Provider value={downloadedTrackKeys}>
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
                                onBack={handleViewAllBack}
                                onSelectItem={handleSelectViewAllItem}
                                route={viewAllRoute}
                            />
                        </ErrorBoundary>
                    ) : activeUtilityScreen === null && mediaDetailState.status !== 'idle' ? (
                        <MediaDetailContent
                            homeContentState={homeContentState}
                            mediaDetailState={mediaDetailState}
                            onAddTrackToPlaylist={handleAddMediaTrackToPlaylistStable}
                            onBack={closeMediaDetail}
                            onSelectItem={handleSelectMediaItemStable}
                            onPlayTrack={handlePlayMediaTrackStable}
                            onShufflePlay={handleShuffleDetailTracks}
                            serverConnections={serverConnections}
                        />
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
                                    onPress={handleOpenSettings}
                                    style={styles.appIconButton}
                                >
                                    <Image source={samoLogo} style={styles.appIcon} />
                                </Pressable>
                            </View>
                        ) : null}
                        {activeUtilityScreen === 'settings' ? (
                            <SettingsScreen
                                isOfflineMode={isOfflineMode}
                                onOpenDownloads={handleOpenDownloads}
                                onOpenManageServers={handleOpenManageServers}
                                onSyncWithServer={handleSyncWithServer}
                                onToggleOfflineMode={handleToggleOfflineMode}
                                serverCount={serverConnections.length}
                            />
                        ) : activeUtilityScreen === 'manage-servers' ? (
                            <ManageServersScreen
                                authState={authState}
                                onAddServer={handleOpenAddServer}
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
                                onServerUrlBlur={handleServerUrlBlur}
                                onServerUrlChange={setServerUrl}
                                onUsernameChange={setUsername}
                                password={password}
                                serverType={serverType}
                                serverUrl={serverUrl}
                                username={username}
                            />
                        ) : mediaDetailState.status !== 'idle' ? null : activeTab === 'home' ? (
                            <HomeScreen
                                homeContentState={visibleHomeContentState}
                                onManageServers={handleOpenManageServers}
                                onSelectItem={handleSelectMediaItemStable}
                                onViewAll={handleOpenViewAll}
                                recentItems={visibleRecentItems}
                                serverConnections={serverConnections}
                            />
                        ) : activeTab === 'playlists' ? (
                            <PlaylistsScreen
                                homeContentState={visibleHomeContentState}
                                onSelectItem={handleSelectMediaItemStable}
                                onShufflePlay={handleShuffleHomeItems}
                                recentItems={visibleRecentItems}
                            />
                        ) : activeTab === 'library' ? (
                            <LibraryScreen
                                hasServerConnections={serverConnections.length > 0}
                                homeContentState={visibleHomeContentState}
                                onSelectItem={handleSelectMediaItemStable}
                                recentItems={visibleRecentItems}
                            />
                        ) : activeTab === 'search' ? (
                            <SearchScreen
                                hasServerConnections={serverConnections.length > 0}
                                homeContentState={visibleHomeContentState}
                                onSearch={handleSearch}
                                onSelectItem={handleSelectMediaItemStable}
                                onSelectRecentItem={handleSelectMediaItemStable}
                                recentItems={visibleRecentItems}
                                searchState={searchState}
                                serverConnections={serverConnections}
                            />
                        ) : activeTab === 'radio' ? (
                            <RadioScreen
                                homeContentState={visibleHomeContentState}
                                nowPlayingRadioId={nowPlayingRadioId}
                                onSelectItem={handleSelectMediaItemStable}
                                recentItems={visibleRecentItems}
                            />
                        ) : (
                            <EmptyServerBackedScreen tabTitle={title} />
                        )}
                    </ScrollView>
                    )}
                    <MiniPlayer
                        artworkUrl={currentHighResArtworkUrl}
                        lastPlayedItem={lastPlayedItem}
                        onOpenFullPlayer={handleOpenFullPlayer}
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
                            artworkUrl={currentHighResArtworkUrl}
                            castState={castState}
                            isShuffled={isShuffled}
                            lastPlayedItem={lastPlayedItem}
                            onClose={handleCloseFullPlayer}
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
                                handleSelectMediaItemStable(item);
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
                                        closeMediaDetail();
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
                onClose={closeBookInfo}
                state={bookInfoState}
            />
            <TrackPlaylistMenu
                actionState={playlistMenuRootState}
                onAddToPlaylist={(playlist) => void handleAddToPlaylistFromRoot(playlist)}
                onClose={() => {
                    setPlaylistMenuRoot(null);
                    setPlaylistMenuRootState({ status: 'idle' });
                }}
                playlists={rootPlaylistTargets}
                track={rootPlaylistTrack}
            />
        </View>
        </DownloadedTrackKeysContext.Provider>
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

const HomeScreen = memo(({
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
});

HomeScreen.displayName = 'HomeScreen';


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
    onServerUrlBlur,
    onServerUrlChange,
    onUsernameChange,
    password,
    serverType,
    serverUrl,
    username,
}: AddServerScreenProps) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
                autoCorrect={false}
                inputMode="url"
                onBlur={onServerUrlBlur}
                onChangeText={onServerUrlChange}
                placeholder="Server URL"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={serverUrl}
            />
            <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={onUsernameChange}
                placeholder="Username"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={username}
            />
            <View style={styles.inputWithAction}>
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onPasswordChange}
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!isPasswordVisible}
                    style={[styles.input, styles.inputWithActionField]}
                    value={password}
                />
                <Pressable
                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                    onPress={() => setIsPasswordVisible((current) => !current)}
                    style={styles.inputActionButton}
                >
                    <EyeGlyph closed={!isPasswordVisible} color={colors.muted} />
                </Pressable>
            </View>
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

const LibraryScreen = memo(({
    hasServerConnections,
    homeContentState,
    onSelectItem,
    recentItems,
}: LibraryScreenProps) => {
    const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const baseItems = useMemo(() => getBaseLibraryItems(homeContentState), [homeContentState]);
    const filters = useMemo(
        () => getAvailableLibraryFilters(baseItems, recentItems),
        [baseItems, recentItems],
    );
    const rows = useMemo(
        () => getLibraryRows(baseItems, recentItems, activeFilter, '', activeSort),
        [activeFilter, activeSort, baseItems, recentItems],
    );

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

    const activeLabel =
        LIBRARY_FILTERS.find((filter) => filter.id === activeFilter)?.label ?? 'All';
    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';

    return (
        <View style={styles.libraryScreen}>
            <View style={styles.libraryHeaderRow}>
                <View style={styles.libraryHeaderText}>
                    <Text style={styles.libraryEyebrow}>Your Library</Text>
                    <Text style={styles.librarySummary} numberOfLines={1}>
                        {rows.length} {rows.length === 1 ? 'item' : 'items'} - {activeLabel}
                    </Text>
                </View>
                <Pressable
                    accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                    onPress={() => {
                        triggerImpact('light');
                        setIsSortMenuOpen(true);
                    }}
                    style={styles.librarySortBadge}
                >
                    <SortGlyph color={colors.muted} />
                    <Text style={styles.librarySortText}>{activeSortLabel}</Text>
                </Pressable>
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
            <LibrarySortMenu
                activeSort={activeSort}
                onClose={() => setIsSortMenuOpen(false)}
                onSelect={(next) => {
                    setActiveSort(next);
                    setIsSortMenuOpen(false);
                }}
                visible={isSortMenuOpen}
            />
        </View>
    );
});

LibraryScreen.displayName = 'LibraryScreen';

const LibrarySortMenu = ({
    activeSort,
    onClose,
    onSelect,
    visible,
}: {
    activeSort: LibrarySort;
    onClose: () => void;
    onSelect: (sort: LibrarySort) => void;
    visible: boolean;
}) => {
    return (
        <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.mediaContextBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.mediaContextSheet}
                >
                    <View style={styles.librarySortMenuHeader}>
                        <Text style={styles.mediaContextEyebrow}>Sort By</Text>
                    </View>
                    <View style={styles.mediaContextDivider} />
                    <View style={styles.mediaContextActions}>
                        {LIBRARY_SORTS.map((sort, index) => {
                            const isActive = sort.id === activeSort;

                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    android_ripple={{
                                        borderless: false,
                                        color: 'rgba(255, 255, 255, 0.06)',
                                    }}
                                    key={sort.id}
                                    onPress={() => {
                                        triggerImpact('light');
                                        onSelect(sort.id);
                                    }}
                                    style={[
                                        styles.mediaContextActionRow,
                                        index === LIBRARY_SORTS.length - 1 &&
                                            styles.mediaContextActionRowLast,
                                    ]}
                                >
                                    <View style={styles.mediaContextActionIcon}>
                                        {isActive ? (
                                            <CheckGlyph color={colors.accent} />
                                        ) : null}
                                    </View>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.mediaContextActionLabel,
                                            isActive && styles.librarySortMenuLabelActive,
                                        ]}
                                    >
                                        {sort.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const PlaylistsScreen = memo(({
    homeContentState,
    onSelectItem,
    onShufflePlay,
    recentItems,
}: PlaylistsScreenProps) => {
    const [activeSort, setActiveSort] = useState<LibrarySort>('recents');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const basePlaylists = useMemo(() => {
        if (homeContentState.status !== 'loaded') {
            return [];
        }
        return getSectionsById(homeContentState, [MobileHomeSectionId.PLAYLISTS])[0]?.items ?? [];
    }, [homeContentState]);
    const playlists = useMemo(
        () =>
            activeSort === 'name'
                ? [...basePlaylists].sort((left, right) => left.title.localeCompare(right.title))
                : sortHomeItemsByRecents(basePlaylists, recentItems),
        [activeSort, basePlaylists, recentItems],
    );
    const allPlayableItems = useMemo(
        () => playlists.filter((playlist) => playlist.playback),
        [playlists],
    );

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

    const activeSortLabel =
        LIBRARY_SORTS.find((sort) => sort.id === activeSort)?.label ?? 'Recents';

    if (playlists.length === 0) {
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlists</Text>
                <Text style={styles.mutedText}>No server-backed playlists returned.</Text>
            </View>
        );
    }

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
                    <Pressable
                        accessibilityLabel={`Sort by ${activeSortLabel}. Tap to change.`}
                        accessibilityRole="button"
                        android_ripple={{ borderless: true, color: 'rgba(255, 255, 255, 0.08)' }}
                        onPress={() => {
                            triggerImpact('light');
                            setIsSortMenuOpen(true);
                        }}
                        style={styles.librarySortBadge}
                    >
                        <SortGlyph color={colors.muted} />
                        <Text style={styles.librarySortText}>{activeSortLabel}</Text>
                    </Pressable>
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
            <LibrarySortMenu
                activeSort={activeSort}
                onClose={() => setIsSortMenuOpen(false)}
                onSelect={(next) => {
                    setActiveSort(next);
                    setIsSortMenuOpen(false);
                }}
                visible={isSortMenuOpen}
            />
        </View>
    );
});

PlaylistsScreen.displayName = 'PlaylistsScreen';

const RadioScreen = memo(({
    homeContentState,
    nowPlayingRadioId,
    onSelectItem,
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
    const featuredIsPlaying =
        nowPlayingRadioId !== null && featuredStation.playback?.id === nowPlayingRadioId;

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
                            const isPlaying =
                                nowPlayingRadioId !== null &&
                                station.playback?.id === nowPlayingRadioId;

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
});

RadioScreen.displayName = 'RadioScreen';

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

const SearchScreen = memo(({
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
});

SearchScreen.displayName = 'SearchScreen';

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
    const downloadedTrackKeys = useDownloadedTrackKeys();
    const isDownloadedTrack =
        mediaType === 'songs' &&
        downloadedTrackKeys.has(getDownloadedTrackKey(item.source?.id, item.id));
    // Library rows and search results both render through LibraryListRow, so
    // adding the format badge here covers both surfaces in one move.
    // getItemQualityProfile returns undefined for anything without a
    // structured profile — playlists, artists, audiobooks, podcasts, radio
    // — so we can safely drop it in unconditionally and let the badge
    // component decide whether to render.
    const itemBadgeProfile = getItemQualityProfile(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => contextMenu.openForItem(item)}
            onPress={onPress}
            style={styles.libraryRow}
        >
            <View>
                <MediaArtwork
                    artworkUrl={item.artworkUrl}
                    mediaType={mediaType}
                    size="row"
                    title={item.title}
                />
                <QualityBadge thumb profile={itemBadgeProfile} />
            </View>
            <View style={styles.libraryRowText}>
                <Text numberOfLines={1} style={styles.libraryRowTitle}>
                    {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.libraryRowSubtitle}>
                    {getLibraryItemSubtitle(item, mediaType)}
                </Text>
            </View>
            {isDownloadedTrack ? (
                <View
                    style={[
                        styles.libraryRowDownloadIndicator,
                        rightAccessory
                            ? styles.libraryRowDownloadIndicatorWithAccessory
                            : null,
                    ]}
                >
                    <TrackDownloadedGlyph />
                </View>
            ) : null}
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
    const stableSelectItem = useStableCallback(onSelectItem);
    const stableViewAll = useStableCallback((section: HomeDisplaySection): void => {
        onViewAll?.(section);
    });
    const loadedContent = homeContentState.status === 'loaded' ? homeContentState.content : null;
    const allSections = useMemo(
        () =>
            loadedContent
                ? getHomeDisplaySections(
                      loadedContent.sections,
                      recentItems,
                      serverConnections,
                  )
                : [],
        [loadedContent, recentItems, serverConnections],
    );
    const availableFilters = useMemo(
        () => getAvailableHomeFilters(allSections),
        [allSections],
    );
    const filteredSections = useMemo(
        () => filterHomeDisplaySections(allSections, activeFilter),
        [activeFilter, allSections],
    );
    const filteredGridItems = useMemo(
        () => {
            if (activeFilter !== 'podcasts' && activeFilter !== 'audiobooks') {
                return [];
            }

            const mediaType = activeFilter === 'podcasts' ? 'podcasts' : 'audiobooks';
            return getUniqueHomeItems(
                filteredSections
                    .flatMap((section) => section.items)
                    .filter((item) => getLibraryMediaType(item) === mediaType),
            );
        },
        [activeFilter, filteredSections],
    );

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
                    items={filteredGridItems}
                    onSelectItem={stableSelectItem}
                    variant={activeFilter === 'podcasts' ? 'podcast' : 'book'}
                />
            ) : (
                <ContentSections
                    onSelectItem={stableSelectItem}
                    onViewAll={onViewAll ? stableViewAll : undefined}
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
    sort: LibrarySort = 'recents',
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
            if (sort === 'name') {
                return left.item.title.localeCompare(right.item.title);
            }

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

const pickRicherQualityProfile = (
    current: MobileQualityProfile | undefined,
    incoming: MobileQualityProfile | undefined,
) => {
    if (!current) return incoming;
    if (!incoming) return current;
    if (
        incoming.bitDepth > current.bitDepth ||
        (incoming.bitDepth === current.bitDepth && incoming.sampleRate > current.sampleRate)
    ) {
        return incoming;
    }
    return current;
};

const mergeContentItemSignals = (
    current: AndroidRecentContentSourceItem,
    incoming: AndroidRecentContentSourceItem,
): AndroidRecentContentSourceItem => {
    const qualityProfile = pickRicherQualityProfile(current.qualityProfile, incoming.qualityProfile);

    return {
        ...current,
        artworkUrl: current.artworkUrl ?? incoming.artworkUrl,
        isHiRes: current.isHiRes || incoming.isHiRes ? true : current.isHiRes,
        playback: current.playback ?? incoming.playback,
        qualityProfile,
        subtitle: current.subtitle ?? incoming.subtitle,
    };
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
        const existing = itemsByKey.get(key);

        if (existing) {
            itemsByKey.set(key, mergeContentItemSignals(existing, item));
        } else {
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
            const existing = freshItemsByKey.get(key);
            if (existing) {
                freshItemsByKey.set(key, mergeContentItemSignals(existing, item) as MobileHomeItem);
            } else {
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
            if (!fresh) {
                return [recentItem.item];
            }

            return [
                {
                    ...recentItem.item,
                    ...fresh,
                    artworkUrl: fresh.artworkUrl ?? recentItem.item.artworkUrl,
                    isHiRes: fresh.isHiRes ?? recentItem.item.isHiRes,
                    playback: fresh.playback ?? recentItem.item.playback,
                    qualityProfile: fresh.qualityProfile ?? recentItem.item.qualityProfile,
                },
            ];
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

const ContentBackedScreen = memo(({
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
});

ContentBackedScreen.displayName = 'ContentBackedScreen';

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

const HomeFilterGridTile = memo(({
    isPodcast,
    item,
    onSelectItem,
    variant,
}: {
    isPodcast: boolean;
    item: AndroidRecentContentSourceItem;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    variant: 'book' | 'podcast';
}) => {
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
});

HomeFilterGridTile.displayName = 'HomeFilterGridTile';

const HomeFilterGrid = memo(({
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
            {items.map((item) => (
                <HomeFilterGridTile
                    isPodcast={isPodcast}
                    item={item}
                    key={getContentItemKey(item)}
                    onSelectItem={onSelectItem}
                    variant={variant}
                />
            ))}
        </View>
    );
});

HomeFilterGrid.displayName = 'HomeFilterGrid';

const getHomeRowItemLength = (variant: HomeDisplaySection['variant']): number => {
    switch (variant) {
        case 'artist':
            return HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET + HOME_TILE_GAP;
        case 'podcast':
        case 'radio':
            return HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_TILE_GAP;
        case 'continue':
        case 'wide':
            return 320 + HOME_TILE_GAP;
        case 'album':
        case 'book':
        case 'playlist':
        case 'recents':
            return HOME_PRIMARY_TILE + HOME_TILE_GAP;
    }
};

interface HomeMediaTileProps {
    item: AndroidRecentContentSourceItem;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionVariant: HomeDisplaySection['variant'];
}

const HomeMediaTile = memo(({ item, onSelectItem, sectionVariant }: HomeMediaTileProps) => {
    const contextMenu = useMediaContextMenu();
    const downloadedTrackKeys = useDownloadedTrackKeys();

    const isAlbum = sectionVariant === 'album';
    const isArtist = sectionVariant === 'artist';
    const isBook = sectionVariant === 'book';
    const isContinue = sectionVariant === 'continue';
    const isPlaylist = sectionVariant === 'playlist';
    const isPodcast = sectionVariant === 'podcast';
    const isRadioSection = sectionVariant === 'radio';
    const isRecent = sectionVariant === 'recents';
    const isWide = sectionVariant === 'wide' || isContinue;
    const isRadio = item.type === MobileHomeItemType.RADIO;
    // An artist tile rendered inside a Recents/mixed row must still
    // be circular — never a square with a letter.
    const isArtistItem = item.type === MobileHomeItemType.ARTIST;
    const progress = getContentItemProgress(item);
    const subtitle = getHomeItemSubtitle(item, sectionVariant);
    const isDownloadedTrack =
        getLibraryMediaType(item) === 'songs' &&
        downloadedTrackKeys.has(getDownloadedTrackKey(item.source?.id, item.id));
    // Playlists are never a single quality, so per the UX rule we
    // suppress the format badge on playlist tiles even when the
    // item happens to carry an isHiRes flag from an older path.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);
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
            <QualityBadge overlay profile={tileBadgeProfile} />
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
                    numberOfLines={2}
                    style={[
                        styles.mediaTitle,
                        (isArtist || isRadioSection) && styles.mediaTitleCentered,
                        isWide && styles.mediaTitleWide,
                    ]}
                >
                    {item.title}
                </Text>
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
                {isDownloadedTrack ? (
                    <View style={styles.mediaDownloadIndicator}>
                        <TrackDownloadedGlyph size={11} />
                    </View>
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
});

HomeMediaTile.displayName = 'HomeMediaTile';

interface HomeDisplayRowProps {
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    section: HomeDisplaySection;
}

const HomeDisplayRow = memo(({ onSelectItem, onViewAll, section }: HomeDisplayRowProps) => {
    const viewAllVariant = getViewAllVariant(section.variant);
    const canViewAll = viewAllVariant !== null && Boolean(onViewAll);
    const itemLength = getHomeRowItemLength(section.variant);
    const getItemLayout = useCallback(
        (_: ArrayLike<AndroidRecentContentSourceItem> | null | undefined, index: number) => ({
            index,
            length: itemLength,
            offset: itemLength * index,
        }),
        [itemLength],
    );
    const renderItem = useCallback(
        ({ item }: { item: AndroidRecentContentSourceItem }) => (
            <HomeMediaTile
                item={item}
                onSelectItem={onSelectItem}
                sectionVariant={section.variant}
            />
        ),
        [onSelectItem, section.variant],
    );

    return (
        <View style={styles.homeSection}>
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
            <FlatList
                data={section.items}
                getItemLayout={getItemLayout}
                horizontal
                initialNumToRender={HOME_ROW_INITIAL_ITEMS}
                keyExtractor={getContentItemKey}
                maxToRenderPerBatch={HOME_ROW_RENDER_BATCH}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={renderItem}
                showsHorizontalScrollIndicator={false}
                updateCellsBatchingPeriod={32}
                windowSize={HOME_ROW_WINDOW_SIZE}
            />
        </View>
    );
});

HomeDisplayRow.displayName = 'HomeDisplayRow';

const ContentSections = memo(({
    onSelectItem,
    onViewAll,
    sections,
}: {
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll?: (section: HomeDisplaySection) => void;
    sections: HomeDisplaySection[];
}) => {
    return (
        <>
            {sections.map((section) => (
                <HomeDisplayRow
                    key={section.key}
                    onSelectItem={onSelectItem}
                    onViewAll={onViewAll}
                    section={section}
                />
            ))}
        </>
    );
});

ContentSections.displayName = 'ContentSections';

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

type PlaylistTrackFilter = 'all' | 'hifi';
type PlaylistTrackSort = 'artist' | 'order' | 'title';
const PLAYLIST_TRACK_INITIAL_ITEMS = 16;
const PLAYLIST_TRACK_RENDER_BATCH = 10;

const getPlaylistTrackSearchText = (track: MobileMediaTrack): string =>
    [
        track.title,
        track.artist,
        track.album,
        track.subtitle,
        track.playback?.title,
        track.playback?.artist,
        track.playback?.album,
    ]
        .filter((value): value is string => Boolean(value))
        .join('\n')
        .toLocaleLowerCase();

/**
 * Filter + sort chips for the playlist track list. Playlists are mixed by
 * design — so the user gets a Hi-Fi filter (any lossless 16-bit+ track) and
 * a sort axis (order added / title / artist) with an asc/desc arrow that
 * flips the direction. The same controls don't appear on album detail —
 * albums are authored in a specific order and shouldn't be reshufflable
 * from a passing screen.
 */
const PlaylistTrackControls = ({
    filter,
    onFilterChange,
    onSortChange,
    onToggleSortDirection,
    showHiFiFilter,
    sort,
    sortAsc,
}: {
    filter: PlaylistTrackFilter;
    onFilterChange: (next: PlaylistTrackFilter) => void;
    onSortChange: (next: PlaylistTrackSort) => void;
    onToggleSortDirection: () => void;
    showHiFiFilter: boolean;
    sort: PlaylistTrackSort;
    sortAsc: boolean;
}) => {
    const filters: Array<{ id: PlaylistTrackFilter; label: string }> = [
        { id: 'all', label: 'All' },
        ...(showHiFiFilter ? [{ id: 'hifi' as const, label: 'Hi-Fi' }] : []),
    ];
    const sorts: Array<{ id: PlaylistTrackSort; label: string }> = [
        { id: 'order', label: 'Order Added' },
        { id: 'title', label: 'Title' },
        { id: 'artist', label: 'Artist' },
    ];
    return (
        <View style={styles.playlistControlsBlock}>
            {filters.length > 1 ? (
                <View style={styles.playlistControlGroup}>
                    <Text style={styles.playlistControlLabel}>Filter</Text>
                    <View style={styles.playlistControlPillRow}>
                        {filters.map(({ id, label }) => {
                            const isActive = filter === id;
                            return (
                                <Pressable
                                    key={id}
                                    onPress={() => onFilterChange(id)}
                                    style={[
                                        styles.playlistControlPill,
                                        isActive && styles.playlistControlPillActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.playlistControlPillText,
                                            isActive && styles.playlistControlPillTextActive,
                                        ]}
                                    >
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ) : null}
            <View style={styles.playlistControlGroup}>
                <Text style={styles.playlistControlLabel}>Sort</Text>
                <View style={styles.playlistControlPillRow}>
                    {sorts.map(({ id, label }) => {
                        const isActive = sort === id;
                        return (
                            <Pressable
                                key={id}
                                onPress={() => onSortChange(id)}
                                style={[
                                    styles.playlistControlPill,
                                    isActive && styles.playlistControlPillActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.playlistControlPillText,
                                        isActive && styles.playlistControlPillTextActive,
                                    ]}
                                >
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                    <Pressable
                        accessibilityLabel={
                            sortAsc ? 'Sort ascending — tap to descend' : 'Sort descending — tap to ascend'
                        }
                        onPress={onToggleSortDirection}
                        style={[
                            styles.playlistControlPill,
                            styles.playlistControlDirectionPill,
                        ]}
                    >
                        <Text style={styles.playlistControlPillText}>{sortAsc ? '↑' : '↓'}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const MediaDetailContent = memo(({
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
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
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
                <View style={[styles.mediaDetailScreen, styles.content]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <ActivityIndicator color={colors.accent} />
                </View>
            ) : mediaDetailState.status === 'error' ? (
                <View style={[styles.mediaDetailScreen, styles.content]}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    <Text style={styles.errorText}>{mediaDetailState.message}</Text>
                </View>
            ) : mediaDetailState.status === 'loaded' ? (
                <MediaDetailLoaded
                    detail={mediaDetailState.detail}
                    onAddTrackToPlaylist={onAddTrackToPlaylist}
                    onBack={onBack}
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
});

MediaDetailContent.displayName = 'MediaDetailContent';

const MediaDetailLoaded = ({
    detail,
    onAddTrackToPlaylist,
    onBack,
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
    onBack: () => void;
    onPlayTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
    ) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onShufflePlay: (detail: MobileMediaDetail, tracks?: MobileMediaTrack[]) => void;
    playlistTargets: MobileHomeItem[];
    serverConnections: ServerAuthenticationResult[];
}) => {
    const [playlistMenuTrack, setPlaylistMenuTrack] = useState<MobileMediaTrack | null>(null);
    const [playlistActionState, setPlaylistActionState] = useState<
        | { status: 'error'; message: string }
        | { playlistId: string; status: 'loading' }
        | { message: string; status: 'success' }
        | { status: 'idle' }
    >({ status: 'idle' });
    const [isDetailDownloadRequested, setIsDetailDownloadRequested] = useState(false);
    // Playlist-only filter + sort. Playlists are mixed format and mixed
    // artists by definition, so being able to scope to Hi-Fi only or
    // re-sort by title/artist is the user-facing affordance the user
    // asked for. Album tracks keep their server order untouched.
    const [playlistFilter, setPlaylistFilter] = useState<'all' | 'hifi'>('all');
    const [playlistSort, setPlaylistSort] = useState<'artist' | 'order' | 'title'>('order');
    const [playlistSortAsc, setPlaylistSortAsc] = useState(true);
    const [playlistSearchVisible, setPlaylistSearchVisible] = useState(false);
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const playlistSearchInputRef = useRef<TextInput>(null);
    // Height/opacity track linearly so the track list below slides predictably;
    // scale springs out from the icon's anchor point for the "bubble" feel.
    const playlistSearchLayoutProgress = useSharedValue(0);
    const playlistSearchBubbleProgress = useSharedValue(0);
    const playlistSearchAnimatedStyle = useAnimatedStyle(() => ({
        height: interpolate(playlistSearchLayoutProgress.value, [0, 1], [0, 70]),
        opacity: interpolate(playlistSearchLayoutProgress.value, [0, 0.5, 1], [0, 1, 1]),
        transform: [
            {
                translateY: interpolate(
                    playlistSearchBubbleProgress.value,
                    [0, 1],
                    [-32, 0],
                ),
            },
            { scale: playlistSearchBubbleProgress.value },
        ],
        transformOrigin: ['65%', '0%', 0],
    }));
    const firstTrack = detail.tracks[0];
    const contextMenu = useMediaContextMenu();
    const downloadedTrackKeys = useDownloadedTrackKeys();
    const isMusic = detail.type === MobileMediaDetailType.ALBUM || detail.type === MobileMediaDetailType.PLAYLIST;
    const isPlaylistDetail = detail.type === MobileMediaDetailType.PLAYLIST;
    const hasHiFiTracks = isPlaylistDetail && detail.tracks.some(isHiFiTrack);

    useEffect(() => {
        if (playlistFilter === 'hifi' && !hasHiFiTracks) {
            setPlaylistFilter('all');
        }
    }, [hasHiFiTracks, playlistFilter]);
    useEffect(() => {
        setPlaylistSearchVisible(false);
        setPlaylistSearchQuery('');
    }, [detail.id, detail.source.id]);
    useEffect(() => {
        if (!playlistSearchVisible) return;
        const id = setTimeout(() => playlistSearchInputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, [playlistSearchVisible]);
    useEffect(() => {
        if (playlistSearchVisible) {
            playlistSearchLayoutProgress.value = withTiming(1, { duration: 200 });
            playlistSearchBubbleProgress.value = withSpring(1, {
                damping: 12,
                mass: 0.55,
                stiffness: 180,
            });
        } else {
            playlistSearchBubbleProgress.value = withTiming(0, { duration: 160 });
            playlistSearchLayoutProgress.value = withTiming(0, { duration: 200 });
        }
    }, [playlistSearchBubbleProgress, playlistSearchLayoutProgress, playlistSearchVisible]);

    /**
     * Track list after the playlist's filter + sort controls are applied.
     * For non-playlists we return the original tracks untouched — albums
     * already ship in their authored order and shouldn't be reshuffleable
     * from this surface.
     */
    const displayTracks = useMemo(() => {
        if (!isPlaylistDetail) return detail.tracks;
        const playlistSearchNeedle = playlistSearchQuery.trim().toLocaleLowerCase();
        let filtered =
            playlistFilter === 'hifi'
                ? detail.tracks.filter(isHiFiTrack)
                : detail.tracks;
        if (playlistSearchNeedle) {
            filtered = filtered.filter((track) =>
                getPlaylistTrackSearchText(track).includes(playlistSearchNeedle),
            );
        }
        if (playlistSort === 'order') {
            // "Order Added" descending = newest at top, which for Subsonic
            // playlists is whatever order the entries arrived in. Ascending
            // flips that — playlist start at the bottom.
            return playlistSortAsc ? filtered : [...filtered].reverse();
        }
        const sorted = [...filtered].sort((left, right) => {
            const leftKey =
                playlistSort === 'artist' ? left.artist ?? '' : left.title ?? '';
            const rightKey =
                playlistSort === 'artist' ? right.artist ?? '' : right.title ?? '';
            return leftKey.localeCompare(rightKey, undefined, { sensitivity: 'base' });
        });
        return playlistSortAsc ? sorted : sorted.reverse();
    }, [
        detail.tracks,
        isPlaylistDetail,
        playlistFilter,
        playlistSearchQuery,
        playlistSort,
        playlistSortAsc,
    ]);
    const playableDisplayTracks = useMemo(
        () => displayTracks.filter((track) => track.playback),
        [displayTracks],
    );
    const firstPlayableDisplayTrack = playableDisplayTracks[0];
    const firstPlayableDisplayIndex = firstPlayableDisplayTrack
        ? displayTracks.indexOf(firstPlayableDisplayTrack)
        : -1;
    const heroPlayTrack = isPlaylistDetail ? firstPlayableDisplayTrack : firstTrack;
    const heroPlayIndex = isPlaylistDetail ? firstPlayableDisplayIndex : 0;
    const heroPlayQueue = isPlaylistDetail ? displayTracks : undefined;
    const canPlayDetail = Boolean(heroPlayTrack);
    const showPlaylistShuffle = isPlaylistDetail && playableDisplayTracks.length > 0;
    const detailScrollY = useSharedValue(0);
    const detailScrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            detailScrollY.value = event.contentOffset.y;
        },
    });
    const [collapsedHeaderTriggerY, setCollapsedHeaderTriggerY] = useState(220);
    const [isCollapsedHeaderInteractive, setIsCollapsedHeaderInteractive] = useState(false);
    const collapsedHeaderRevealStartY = Math.max(0, collapsedHeaderTriggerY - 28);
    const collapsedHeaderRevealEndY = collapsedHeaderTriggerY + 12;
    const handleHeroActionsBarLayout = useCallback((event: LayoutChangeEvent) => {
        const nextTriggerY = Math.max(180, event.nativeEvent.layout.y + spacing.lg);

        setCollapsedHeaderTriggerY((current) =>
            Math.abs(current - nextTriggerY) < 1 ? current : nextTriggerY,
        );
    }, []);
    useAnimatedReaction(
        () => detailScrollY.value >= collapsedHeaderRevealStartY,
        (isVisible, wasVisible) => {
            if (isVisible !== wasVisible) {
                runOnJS(setIsCollapsedHeaderInteractive)(isVisible);
            }
        },
    );
    const collapsedHeaderBackdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            detailScrollY.value,
            [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
            [0, 1],
            'clamp',
        ),
    }));
    const collapsedHeaderContentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            detailScrollY.value,
            [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
            [0, 1],
            'clamp',
        ),
        transform: [
            {
                translateY: interpolate(
                    detailScrollY.value,
                    [collapsedHeaderRevealStartY, collapsedHeaderRevealEndY],
                    [8, 0],
                    'clamp',
                ),
            },
        ],
    }));

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
    // Playlists never get a collection-level format badge — they're mixed by
    // definition. Per-track badges on the track rows below still show.
    const heroBadgeProfile =
        detail.type === MobileMediaDetailType.PLAYLIST
            ? undefined
            : getDetailQualityProfile(detail);
    const heroFormatLabel =
        detail.type === MobileMediaDetailType.ALBUM
            ? formatQualityProfile(heroBadgeProfile)
            : null;
    // Download button shows for everything that has saveable media. Podcasts
    // here download every episode; long-press on a single episode row still
    // works to grab just that one.
    const canDownloadDetail = !isArtistDetail;

    // Subscribe to downloads for this specific collection so the hero can
    // switch to the completed state once every item in the collection is saved.
    const [collectionDownloads, setCollectionDownloads] = useState<DownloadEntry[]>([]);
    const collectionDownloadsSignatureRef = useRef('');
    useEffect(() => {
        setIsDetailDownloadRequested(false);
    }, [detail.id, detail.source.id]);
    useEffect(() => {
        const unsubscribe = subscribeDownloads((entries) => {
            const nextDownloads = entries.filter(
                (entry) =>
                    entry.collection.sourceId === detail.source.id &&
                    entry.collection.id === detail.id,
            );
            const nextSignature = nextDownloads
                .map((entry) =>
                    [
                        entry.id,
                        entry.status,
                        entry.progress ?? '',
                        entry.bytesDownloaded ?? '',
                        entry.totalBytes ?? '',
                        entry.localUri ?? '',
                        entry.errorMessage ?? '',
                    ].join(':'),
                )
                .join('|');
            if (collectionDownloadsSignatureRef.current === nextSignature) {
                return;
            }
            collectionDownloadsSignatureRef.current = nextSignature;
            setCollectionDownloads(nextDownloads);
        });
        return () => {
            unsubscribe();
        };
    }, [detail.id, detail.source.id]);

    const expectedDownloadTrackIds = useMemo(() => {
        if (detail.type === MobileMediaDetailType.PODCAST) {
            return detail.tracks.map((track) => track.id);
        }
        if (
            detail.type === MobileMediaDetailType.ALBUM ||
            detail.type === MobileMediaDetailType.PLAYLIST
        ) {
            return detail.tracks
                .filter((track) => Boolean(track.playback?.url))
                .map((track) => track.id);
        }
        return [];
    }, [detail.tracks, detail.type]);
    const downloadAggregate = useMemo(() => {
        const emptyAggregate = { completed: false, progress: 0 };
        const startingProgress = 0.06;
        if (collectionDownloads.length === 0) {
            return isDetailDownloadRequested
                ? { completed: false, progress: startingProgress }
                : emptyAggregate;
        }
        const latestByTrackId = new Map<string, DownloadEntry>();
        for (const entry of collectionDownloads) {
            const current = latestByTrackId.get(entry.trackId);
            if (!current || entry.enqueuedAt > current.enqueuedAt) {
                latestByTrackId.set(entry.trackId, entry);
            }
        }
        const getEntryProgress = (entry: DownloadEntry | undefined) => {
            if (!entry) return 0;
            if (entry.status === 'completed') return 1;
            if (entry.status === 'downloading') {
                return Math.max(entry.progress ?? 0, startingProgress);
            }
            if (entry.status === 'queued') return startingProgress;
            return 0;
        };
        if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
            const entries = [...latestByTrackId.values()];
            const completed =
                entries.length > 0 && entries.every((entry) => entry.status === 'completed');
            const hasActiveDownload = entries.some(
                (entry) => entry.status === 'queued' || entry.status === 'downloading',
            );
            const isActive = completed || hasActiveDownload || isDetailDownloadRequested;
            const rawProgress =
                entries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
                Math.max(entries.length, 1);
            return {
                completed,
                progress: isActive
                    ? Math.max(isDetailDownloadRequested ? startingProgress : 0, rawProgress)
                    : 0,
            };
        }
        if (expectedDownloadTrackIds.length === 0) {
            return emptyAggregate;
        }
        const expectedEntries = expectedDownloadTrackIds.map((trackId) =>
            latestByTrackId.get(trackId),
        );
        const completed = expectedEntries.every((entry) => entry?.status === 'completed');
        const hasFullCollectionSet = expectedEntries.every(
            (entry) =>
                entry?.status === 'queued' ||
                entry?.status === 'downloading' ||
                entry?.status === 'completed',
        );
        const isActive = completed || hasFullCollectionSet || isDetailDownloadRequested;
        if (!isActive) {
            return emptyAggregate;
        }
        const rawProgress =
            expectedEntries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) /
            expectedDownloadTrackIds.length;
        return {
            completed,
            progress: Math.max(isDetailDownloadRequested ? startingProgress : 0, rawProgress),
        };
    }, [
        collectionDownloads,
        detail.type,
        expectedDownloadTrackIds,
        isDetailDownloadRequested,
    ]);

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
        setIsDetailDownloadRequested(true);
        const result = await enqueueCollectionDownload(detail, serverConnections);
        if (result.reason) {
            setIsDetailDownloadRequested(false);
            Alert.alert('Download', result.reason);
        } else if (result.enqueued === 0 && result.skipped === 0) {
            setIsDetailDownloadRequested(false);
        }
    };

    const renderTrackRow = useCallback(
        (track: MobileMediaTrack, index: number) => {
            const qualityItems =
                isMusic && track.playback
                    ? buildAudioQualityBadgeItems({
                          ...track.playback.quality,
                          compact: true,
                          mode: 'playerbar',
                      })
                    : [];
            const meta = getTrackMetadataItems(
                detail,
                track,
                qualityItems.map((item) => item.label),
                isMusic,
            );
            const canAddToPlaylist =
                track.playback?.source === 'music' && playlistTargets.length > 0;
            const hasOverflowActions =
                canAddToPlaylist || track.playback?.source === 'music';
            const isAlbumDetail = detail.type === MobileMediaDetailType.ALBUM;
            const trackBadgeProfile =
                detail.type === MobileMediaDetailType.PLAYLIST
                    ? getPlaybackQualityProfile(track.playback)
                    : undefined;
            const isDownloadedTrack = downloadedTrackKeys.has(
                getDownloadedTrackKey(detail.source.id, track.id),
            );

            return (
                <Pressable
                    accessibilityRole="button"
                    onLongPress={() => contextMenu.openForTrack(track, detail)}
                    onPress={() => onPlayTrack(detail, track, index, displayTracks)}
                    style={styles.trackRow}
                >
                    {!isAlbumDetail ? (
                        <View>
                            {track.artworkUrl ?? detail.artworkUrl ? (
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
                            <QualityBadge thumb profile={trackBadgeProfile} />
                        </View>
                    ) : null}
                    <View style={styles.trackText}>
                        <Text numberOfLines={1} style={styles.trackTitle}>
                            {track.title}
                        </Text>
                        {meta.length > 0 || isDownloadedTrack ? (
                            <View style={styles.trackMetadataLine}>
                                {isDownloadedTrack ? <TrackDownloadedGlyph size={10} /> : null}
                                {meta.length > 0 ? (
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.mediaSubtitle,
                                            styles.trackMetadataText,
                                        ]}
                                    >
                                        {meta.join(' · ')}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                    {hasOverflowActions ? (
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
        },
        [
            contextMenu,
            detail,
            displayTracks,
            downloadedTrackKeys,
            isMusic,
            onPlayTrack,
            playlistTargets.length,
        ],
    );

    const playlistEmptyText =
        detail.tracks.length === 0
            ? emptyText
            : playlistSearchQuery.trim()
              ? 'No tracks match this search.'
              : 'No tracks match the current filter.';

    if (isPlaylistDetail) {
        return (
            <View style={styles.mediaDetailScreen}>
                <Reanimated.FlatList
                    contentContainerStyle={styles.mediaDetailContent}
                    data={displayTracks}
                    extraData={downloadedTrackKeys}
                    initialNumToRender={PLAYLIST_TRACK_INITIAL_ITEMS}
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={(track, index) => `${track.id}:${index}`}
                    ListEmptyComponent={
                        <Text style={styles.playlistListEmpty}>{playlistEmptyText}</Text>
                    }
                    ListHeaderComponent={
                        <>
                            <View style={styles.albumHero}>
                                <View style={styles.albumHeroArtworkWrap}>
                                    {detail.artworkUrl ? (
                                        <Image
                                            source={{ uri: detail.artworkUrl }}
                                            style={styles.albumHeroArtwork}
                                        />
                                    ) : (
                                        <View
                                            style={[
                                                styles.albumHeroArtwork,
                                                styles.albumHeroArtworkFallback,
                                            ]}
                                        >
                                            <Text style={styles.mediaArtworkLetter}>
                                                {detail.title.slice(0, 1)}
                                            </Text>
                                        </View>
                                    )}
                                    <QualityBadge overlay profile={heroBadgeProfile} />
                                </View>
                                <View style={styles.albumHeroBadgeRow}>
                                    <Text style={styles.albumHeroEyebrow}>
                                        {getDetailTypeLabel(detail.type)}
                                    </Text>
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
                                    {heroFormatLabel ? (
                                        <Text style={styles.formatBadgeMeta}>{heroFormatLabel}</Text>
                                    ) : null}
                                </View>
                                <View
                                    onLayout={handleHeroActionsBarLayout}
                                    style={styles.albumHeroActionsBar}
                                >
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
                                        {detail.tracks.length > 0 ? (
                                            <Pressable
                                                accessibilityLabel={
                                                    playlistSearchVisible
                                                        ? 'Close playlist search'
                                                        : 'Search playlist'
                                                }
                                                accessibilityRole="button"
                                                hitSlop={8}
                                                onPress={() => {
                                                    if (playlistSearchVisible) {
                                                        setPlaylistSearchQuery('');
                                                        setPlaylistSearchVisible(false);
                                                        return;
                                                    }
                                                    setPlaylistSearchVisible(true);
                                                }}
                                                style={styles.albumHeroGlyphButton}
                                            >
                                                <SearchGlyph color="rgba(245,245,245,0.55)" />
                                            </Pressable>
                                        ) : null}
                                        {showPlaylistShuffle ? (
                                            <Pressable
                                                accessibilityLabel="Shuffle"
                                                accessibilityRole="button"
                                                onPress={() => void onShufflePlay(detail, displayTracks)}
                                                style={styles.albumHeroGlyphButton}
                                            >
                                                <ShuffleGlyph color={colors.text} size={28} />
                                            </Pressable>
                                        ) : null}
                                        {heroPlayTrack ? (
                                            <Pressable
                                                accessibilityLabel="Play"
                                                accessibilityRole="button"
                                                onPress={() =>
                                                    onPlayTrack(
                                                        detail,
                                                        heroPlayTrack,
                                                        heroPlayIndex,
                                                        heroPlayQueue,
                                                    )
                                                }
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
                            <View style={styles.homeSection}>
                                <Reanimated.View
                                    pointerEvents={playlistSearchVisible ? 'auto' : 'none'}
                                    style={[
                                        styles.playlistSearchAnimatedWrapper,
                                        playlistSearchAnimatedStyle,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.inlineSearchBar,
                                            styles.playlistSearchBar,
                                        ]}
                                    >
                                        <SearchGlyph color={colors.muted} />
                                        <TextInput
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            onChangeText={setPlaylistSearchQuery}
                                            placeholder="Search this playlist"
                                            placeholderTextColor={colors.muted}
                                            ref={playlistSearchInputRef}
                                            returnKeyType="search"
                                            style={styles.inlineSearchInput}
                                            value={playlistSearchQuery}
                                        />
                                        {playlistSearchQuery.length > 0 ? (
                                            <Pressable
                                                accessibilityLabel="Clear playlist search"
                                                accessibilityRole="button"
                                                onPress={() => setPlaylistSearchQuery('')}
                                                style={styles.inlineSearchIconButton}
                                            >
                                                <ClearGlyph color={colors.muted} />
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </Reanimated.View>
                                {detail.tracks.length > 0 ? (
                                    <PlaylistTrackControls
                                        filter={playlistFilter}
                                        onFilterChange={setPlaylistFilter}
                                        onSortChange={setPlaylistSort}
                                        onToggleSortDirection={() =>
                                            setPlaylistSortAsc((value) => !value)
                                        }
                                        showHiFiFilter={hasHiFiTracks}
                                        sort={playlistSort}
                                        sortAsc={playlistSortAsc}
                                    />
                                ) : null}
                            </View>
                        </>
                    }
                    maxToRenderPerBatch={PLAYLIST_TRACK_RENDER_BATCH}
                    onScroll={detailScrollHandler}
                    removeClippedSubviews={Platform.OS === 'android'}
                    renderItem={({ item, index }) => renderTrackRow(item, index)}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    updateCellsBatchingPeriod={32}
                    windowSize={9}
                />
                <View pointerEvents="box-none" style={styles.detailCollapsedTopbar}>
                    <Reanimated.View
                        pointerEvents="none"
                        style={[
                            styles.detailCollapsedTopbarBackdrop,
                            collapsedHeaderBackdropStyle,
                        ]}
                    />
                    <Pressable
                        accessibilityLabel="Back"
                        accessibilityRole="button"
                        onPress={onBack}
                        style={styles.detailCollapsedBackButton}
                    >
                        <Text style={styles.detailCollapsedBackGlyph}>‹</Text>
                    </Pressable>
                    <Reanimated.View
                        pointerEvents="none"
                        style={[
                            styles.detailCollapsedTitleWrap,
                            collapsedHeaderContentStyle,
                        ]}
                    >
                        <Text numberOfLines={1} style={styles.detailCollapsedTitle}>
                            {detail.title}
                        </Text>
                    </Reanimated.View>
                    <Reanimated.View
                        pointerEvents={isCollapsedHeaderInteractive ? 'auto' : 'none'}
                        style={[styles.detailCollapsedActions, collapsedHeaderContentStyle]}
                    >
                        {showPlaylistShuffle ? (
                            <Pressable
                                accessibilityLabel="Shuffle"
                                accessibilityRole="button"
                                hitSlop={10}
                                onPress={() => void onShufflePlay(detail, displayTracks)}
                                style={styles.detailCollapsedIconButton}
                            >
                                <ShuffleGlyph color={colors.text} size={20} />
                            </Pressable>
                        ) : null}
                        {canPlayDetail && heroPlayTrack ? (
                            <Pressable
                                accessibilityLabel="Play"
                                accessibilityRole="button"
                                onPress={() =>
                                    onPlayTrack(
                                        detail,
                                        heroPlayTrack,
                                        heroPlayIndex,
                                        heroPlayQueue,
                                    )
                                }
                                style={styles.detailCollapsedPlayButton}
                            >
                                <PlayPauseGlyph
                                    color={colors.background}
                                    isPlaying={false}
                                    size={16}
                                />
                            </Pressable>
                        ) : null}
                    </Reanimated.View>
                </View>
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
            </View>
        );
    }

    return (
        <View style={styles.mediaDetailScreen}>
            <Reanimated.ScrollView
                contentContainerStyle={styles.mediaDetailContent}
                onScroll={detailScrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
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
                        <QualityBadge overlay profile={heroBadgeProfile} />
                    </View>
                    <View style={styles.albumHeroBadgeRow}>
                        {detail.type === MobileMediaDetailType.AUDIOBOOK ? null : (
                            <Text style={styles.albumHeroEyebrow}>
                                {getDetailTypeLabel(detail.type)}
                            </Text>
                        )}
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
                        {heroFormatLabel ? (
                            <Text style={styles.formatBadgeMeta}>{heroFormatLabel}</Text>
                        ) : null}
                    </View>
                    <View
                        onLayout={handleHeroActionsBarLayout}
                        style={styles.albumHeroActionsBar}
                    >
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
                            {showPlaylistShuffle ? (
                                <Pressable
                                    accessibilityLabel="Shuffle"
                                    accessibilityRole="button"
                                    onPress={() => void onShufflePlay(detail, displayTracks)}
                                    style={styles.albumHeroGlyphButton}
                                >
                                    <ShuffleGlyph color={colors.text} size={28} />
                                </Pressable>
                            ) : null}
                            {heroPlayTrack ? (
                                <Pressable
                                    accessibilityLabel="Play"
                                    accessibilityRole="button"
                                    onPress={() =>
                                        onPlayTrack(detail, heroPlayTrack, heroPlayIndex, heroPlayQueue)
                                    }
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
                    {!isMusic ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}
                    {isPlaylistDetail && detail.tracks.length > 0 ? (
                        <PlaylistTrackControls
                            filter={playlistFilter}
                            onFilterChange={setPlaylistFilter}
                            onSortChange={setPlaylistSort}
                            onToggleSortDirection={() => setPlaylistSortAsc((value) => !value)}
                            showHiFiFilter={hasHiFiTracks}
                            sort={playlistSort}
                            sortAsc={playlistSortAsc}
                        />
                    ) : null}
                    {displayTracks.length === 0 ? (
                        <Text style={styles.mutedText}>
                            {detail.tracks.length === 0
                                ? emptyText
                                : 'No tracks match the current filter.'}
                        </Text>
                    ) : (
                        displayTracks.map((track, index) => {
                            const qualityItems =
                                isMusic && track.playback
                                    ? buildAudioQualityBadgeItems({
                                          ...track.playback.quality,
                                          compact: true,
                                          mode: 'playerbar',
                                      })
                                    : [];
                            const meta = getTrackMetadataItems(
                                detail,
                                track,
                                qualityItems.map((item) => item.label),
                                isMusic,
                            );
                            const canAddToPlaylist =
                                track.playback?.source === 'music' && playlistTargets.length > 0;
                            const hasOverflowActions =
                                canAddToPlaylist || track.playback?.source === 'music';
                            const isAlbumDetail = detail.type === MobileMediaDetailType.ALBUM;
                            // Track-level format badge only meaningful inside playlists (the
                            // collection itself is mixed). Album track rows skip the badge
                            // because the album hero already carries one. Audiobook/podcast
                            // tracks are spoken-word — format badges aren't useful there.
                            const trackBadgeProfile =
                                detail.type === MobileMediaDetailType.PLAYLIST
                                    ? getPlaybackQualityProfile(track.playback)
                                    : undefined;
                            const isDownloadedTrack = downloadedTrackKeys.has(
                                getDownloadedTrackKey(detail.source.id, track.id),
                            );
                            return (
                                <Pressable
                                    accessibilityRole="button"
                                    key={`${track.id}:${index}`}
                                    onLongPress={() => contextMenu.openForTrack(track, detail)}
                                    onPress={() => onPlayTrack(detail, track, index, displayTracks)}
                                    style={styles.trackRow}
                                >
                                    {!isAlbumDetail ? (
                                        <View>
                                            {track.artworkUrl ?? detail.artworkUrl ? (
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
                                            <QualityBadge thumb profile={trackBadgeProfile} />
                                        </View>
                                    ) : null}
                                    <View style={styles.trackText}>
                                        <Text numberOfLines={1} style={styles.trackTitle}>
                                            {track.title}
                                        </Text>
                                        {meta.length > 0 || isDownloadedTrack ? (
                                            <View style={styles.trackMetadataLine}>
                                                {isDownloadedTrack ? (
                                                    <TrackDownloadedGlyph size={10} />
                                                ) : null}
                                                {meta.length > 0 ? (
                                                    <Text
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.mediaSubtitle,
                                                            styles.trackMetadataText,
                                                        ]}
                                                    >
                                                        {meta.join(' · ')}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        ) : null}
                                    </View>
                                    {hasOverflowActions ? (
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
            </Reanimated.ScrollView>
            <View pointerEvents="box-none" style={styles.detailCollapsedTopbar}>
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        styles.detailCollapsedTopbarBackdrop,
                        collapsedHeaderBackdropStyle,
                    ]}
                />
                <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    onPress={onBack}
                    style={styles.detailCollapsedBackButton}
                >
                    <Text style={styles.detailCollapsedBackGlyph}>‹</Text>
                </Pressable>
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        styles.detailCollapsedTitleWrap,
                        collapsedHeaderContentStyle,
                    ]}
                >
                    <Text numberOfLines={1} style={styles.detailCollapsedTitle}>
                        {detail.title}
                    </Text>
                </Reanimated.View>
                <Reanimated.View
                    pointerEvents={isCollapsedHeaderInteractive ? 'auto' : 'none'}
                    style={[styles.detailCollapsedActions, collapsedHeaderContentStyle]}
                >
                    {showPlaylistShuffle ? (
                        <Pressable
                            accessibilityLabel="Shuffle"
                            accessibilityRole="button"
                            hitSlop={10}
                            onPress={() => void onShufflePlay(detail, displayTracks)}
                            style={styles.detailCollapsedIconButton}
                        >
                            <ShuffleGlyph color={colors.text} size={20} />
                        </Pressable>
                    ) : null}
                    {canPlayDetail && heroPlayTrack ? (
                        <Pressable
                            accessibilityLabel="Play"
                            accessibilityRole="button"
                            onPress={() =>
                                onPlayTrack(detail, heroPlayTrack, heroPlayIndex, heroPlayQueue)
                            }
                            style={styles.detailCollapsedPlayButton}
                        >
                            <PlayPauseGlyph
                                color={colors.background}
                                isPlaying={false}
                                size={16}
                            />
                        </Pressable>
                    ) : null}
                </Reanimated.View>
            </View>
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
        </View>
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
                        const trackBadgeProfile = getPlaybackQualityProfile(track.playback);
                        return (
                            <Pressable
                                accessibilityRole="button"
                                key={`${track.id}:${index}`}
                                onLongPress={() => contextMenu.openForTrack(track, detail)}
                                onPress={() => onPlayTrack(detail, track, index)}
                                style={styles.trackRow}
                            >
                                <View>
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
                                    <QualityBadge thumb profile={trackBadgeProfile} />
                                </View>
                                <View style={styles.searchRowText}>
                                    <Text numberOfLines={1} style={styles.searchTitle}>
                                        {track.title}
                                    </Text>
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
    const tileBadgeProfile = getItemQualityProfile(item);
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
            <QualityBadge overlay profile={tileBadgeProfile} />
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
    const homepage = item.playback?.homepageUrl;

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

const normalizeTrackMetadataValue = (value: string | undefined) => {
    if (!value || looksLikeUrl(value)) {
        return undefined;
    }

    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 ? cleaned : undefined;
};

const splitCompoundTrackSubtitle = (value: string | undefined) => {
    const cleaned = normalizeTrackMetadataValue(value);
    if (!cleaned) {
        return [];
    }

    return cleaned
        .split(/\s+(?:-|–|—|·)\s+/)
        .map((part) => normalizeTrackMetadataValue(part))
        .filter((part): part is string => Boolean(part));
};

const pushUniqueTrackMetadata = (items: string[], value: string | undefined) => {
    const cleaned = normalizeTrackMetadataValue(value);
    if (!cleaned) {
        return;
    }

    const key = cleaned.toLocaleLowerCase();
    if (!items.some((item) => item.toLocaleLowerCase() === key)) {
        items.push(cleaned);
    }
};

const getTrackMetadataItems = (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    qualityLabels: string[],
    includeTimestamp: boolean,
) => {
    const items: string[] = [];
    const artist = normalizeTrackMetadataValue(track.artist);
    const album = normalizeTrackMetadataValue(track.album);
    const subtitle = normalizeTrackMetadataValue(track.subtitle);

    if (detail.type === MobileMediaDetailType.ALBUM) {
        pushUniqueTrackMetadata(items, artist);
        if (!artist && subtitle) {
            const albumTitleKey = normalizeTrackMetadataValue(detail.title)?.toLocaleLowerCase();
            const albumKey = album?.toLocaleLowerCase() ?? albumTitleKey;
            const scopedSubtitle = splitCompoundTrackSubtitle(subtitle).find((part) => {
                const key = part.toLocaleLowerCase();
                return key !== albumTitleKey && key !== albumKey;
            });
            pushUniqueTrackMetadata(items, scopedSubtitle ?? subtitle);
        }
    } else if (detail.type === MobileMediaDetailType.PLAYLIST) {
        pushUniqueTrackMetadata(items, artist);
        pushUniqueTrackMetadata(items, album);
        if (!artist && !album) {
            const subtitleParts = splitCompoundTrackSubtitle(subtitle);
            if (subtitleParts.length > 1) {
                subtitleParts.forEach((part) => pushUniqueTrackMetadata(items, part));
            } else {
                pushUniqueTrackMetadata(items, subtitle);
            }
        }
    } else {
        pushUniqueTrackMetadata(items, subtitle);
    }

    qualityLabels.forEach((label) => pushUniqueTrackMetadata(items, label));
    if (includeTimestamp) {
        pushUniqueTrackMetadata(items, formatTrackTimestamp(track.startSeconds));
    }
    pushUniqueTrackMetadata(items, formatTrackDuration(track.durationSeconds));

    return items;
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

const PLAYBACK_POSITION_BACKWARD_TOLERANCE_MS = 2500;
const PLAYBACK_POSITION_RESET_GUARD_MS = 5000;

const getStablePlaybackPositionMs = (
    event: AndroidNativePlaybackEvent,
    current: ActiveAndroidPlaybackState,
) => {
    const eventPositionMs = event.positionMs;
    const currentPositionMs = current.positionMs;

    if (eventPositionMs === undefined || !Number.isFinite(eventPositionMs)) {
        return currentPositionMs;
    }

    if (event.status === 'idle') {
        return currentPositionMs;
    }

    if (currentPositionMs === undefined || event.status === 'ended') {
        return eventPositionMs;
    }

    if (eventPositionMs <= 100 && currentPositionMs > PLAYBACK_POSITION_RESET_GUARD_MS) {
        return currentPositionMs;
    }

    if (eventPositionMs + PLAYBACK_POSITION_BACKWARD_TOLERANCE_MS < currentPositionMs) {
        return currentPositionMs;
    }

    return eventPositionMs;
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

const MIN_VISUAL_SEEK_SEGMENT_WIDTH = 3.6;
const SEEK_SEGMENT_MAX_GAP_WIDTH = 4;
const SEEK_SEGMENT_GAP_BUDGET = 0.24;

const getVisibleSeekSegments = (
    segments: MobilePlaybackSegment[],
    trackWidth: number,
): MobilePlaybackSegment[] => {
    if (segments.length <= 1 || trackWidth <= 0) {
        return segments;
    }

    const maxVisibleSegments = Math.max(
        1,
        Math.floor(trackWidth / MIN_VISUAL_SEEK_SEGMENT_WIDTH),
    );

    if (segments.length <= maxVisibleSegments) {
        return segments;
    }

    const totalDuration = segments.reduce(
        (sum, segment) => sum + Math.max(0, segment.durationSeconds ?? 0),
        0,
    );

    if (totalDuration <= 0) {
        return segments.slice(0, maxVisibleSegments);
    }

    const visibleSegments: MobilePlaybackSegment[] = [];

    for (let groupIndex = 0; groupIndex < maxVisibleSegments; groupIndex += 1) {
        const startIndex = Math.floor((groupIndex * segments.length) / maxVisibleSegments);
        const endIndex = Math.max(
            startIndex + 1,
            groupIndex === maxVisibleSegments - 1
                ? segments.length
                : Math.floor(((groupIndex + 1) * segments.length) / maxVisibleSegments),
        );
        const group = segments.slice(startIndex, endIndex);
        const groupStart = group[0];
        const groupEnd = group[group.length - 1];
        if (!groupStart || !groupEnd) continue;
        const groupDuration = group.reduce(
            (sum, segment) => sum + Math.max(0, segment.durationSeconds ?? 0),
            0,
        );

        visibleSegments.push({
            durationSeconds: Math.max(groupDuration, 1),
            id:
                group.length === 1
                    ? groupStart.id
                    : `${groupStart.id}-${groupEnd.id}-${groupIndex}`,
            startSeconds: groupStart.startSeconds,
            title: groupStart.title,
        });
    }

    return visibleSegments;
};

const getSeekSegmentGapWidth = (segmentCount: number, trackWidth: number) => {
    if (segmentCount <= 1 || trackWidth <= 0) {
        return 0;
    }

    return Math.min(
        SEEK_SEGMENT_MAX_GAP_WIDTH,
        (trackWidth * SEEK_SEGMENT_GAP_BUDGET) / (segmentCount - 1),
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
    artworkUrl,
    lastPlayedItem,
    onOpenFullPlayer,
    onTogglePlayback,
    playbackState,
    playerProgress,
    reducedMotion,
}: {
    // The canonical high-res artwork URL for the current playback. Same URL
    // the FullScreenPlayer uses, so opening fullscreen is a guaranteed cache
    // hit — no flicker, no "low-res first" state.
    artworkUrl: string | undefined;
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
    const miniBadgeProfile =
        displayItem?.source === 'music' ? getPlaybackQualityProfile(displayItem) : undefined;

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
                <View style={styles.miniPlayerArtworkContainer}>
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
                </View>
                <View style={styles.miniPlayerText}>
                    <Text numberOfLines={1} style={styles.miniPlayerTitle}>
                        {title || 'Nothing playing'}
                    </Text>
                    {subtitle ? (
                        <Text numberOfLines={1} style={styles.miniPlayerSubtitle}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                <QualityBadge player profile={miniBadgeProfile} />
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
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
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

/**
 * Format-specific quality badge. Picks the matching 16/24/32-bit asset for
 * the playback's bit-depth / sample-rate; renders nothing when there's no
 * exact match in the badge set (we'd rather omit the badge than mislabel
 * a 24/48 track as 24/96).
 *
 * Variant placement, kept strict to avoid double-badging:
 *  - `overlay`: corner-pinned on artwork (home / view-all album tiles,
 *               album-detail hero artwork). Implies a position-absolute
 *               container with `position: relative` on the parent.
 *  - `thumb`:   small overlay on a track-row thumb. The only badge a
 *               track row carries — never next to the title text.
 *  - `player`:  beneath the fullscreen player title (its own row, not
 *               inline with text).
 *  - default:   standalone (44x44), reserved for the inline "Format" chip
 *               on the album detail page.
 */
const QualityBadge = ({
    mini = false,
    overlay = false,
    player = false,
    profile,
    thumb = false,
}: {
    mini?: boolean;
    overlay?: boolean;
    player?: boolean;
    profile: MobileQualityProfile | undefined;
    thumb?: boolean;
}) => {
    const asset = pickQualityBadgeAsset(profile);
    if (!asset || !profile) return null;
    return (
        <Image
            accessibilityLabel={`${profile.bitDepth}-bit ${(profile.sampleRate / 1000).toFixed(1).replace(/\.0$/, '')} kHz`}
            source={asset}
            style={[
                styles.formatBadge,
                mini && styles.formatBadgeMini,
                overlay && styles.formatBadgeOverlay,
                player && styles.formatBadgePlayer,
                thumb && styles.formatBadgeThumb,
            ]}
        />
    );
};

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
    const seekTrackWidth = trackWidth > 0 ? trackWidth : Math.max(1, SCREEN_WIDTH - spacing.lg * 2);
    const seekSegments = useMemo(
        () => getSeekSegments(segments, durationMs),
        [durationMs, segments],
    );
    const visibleSeekSegments = useMemo(
        () => getVisibleSeekSegments(seekSegments, seekTrackWidth),
        [seekSegments, seekTrackWidth],
    );
    const seekSegmentGapWidth = getSeekSegmentGapWidth(
        visibleSeekSegments.length,
        seekTrackWidth,
    );
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
                visibleSeekSegments.map((segment, index) => {
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
                                    marginRight:
                                        index === visibleSeekSegments.length - 1
                                            ? 0
                                            : seekSegmentGapWidth,
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

// Pick the album's representative color.
//
// For most covers the "dominant" color (the most-frequent pixel value) reads
// as the album's mood. But for two-tone designed covers — say a yellow card
// with green typography — the dominant is the *background*, not the
// design choice. The character of the album lives in the accent: the green
// of the Mac Miller "Buttons" lettering, the red splash on a monochrome
// photo, the saturated burst against a neutral field.
//
// Strategy: identify the dominant candidate, then look for a second
// candidate that's chromatically distant from it AND saturated in its own
// right. If one qualifies, it's the accent and we use it — that's the
// color that gives the cover its intent. If nothing's distinct enough
// (single-hue covers, photo-y artwork, etc.) we fall back to the dominant
// so the gradient still feels keyed to the cover.
const pickAlbumEssenceColor = (result: ImageColorsResult): null | string => {
    const candidates: string[] = [];
    const push = (hex: null | string | undefined): void => {
        if (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex.trim())) {
            candidates.push(hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`);
        }
    };
    if (result.platform === 'android') {
        // Order matters: the *first* usable entry is treated as the
        // dominant. Vibrant/dark/light variants follow so an accent has
        // multiple chances to be picked up by the chromatic-distance scan.
        push(result.dominant);
        push(result.vibrant);
        push(result.darkVibrant);
        push(result.lightVibrant);
        push(result.muted);
        push(result.darkMuted);
        push(result.lightMuted);
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

    interface LabCandidate {
        L: number;
        a: number;
        b: number;
        chroma: number;
        hex: string;
    }

    const usable: LabCandidate[] = [];
    for (const hex of candidates) {
        const rgb = parseHex(hex);
        if (!rgb) continue;
        const [L, a, b] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
        const chroma = Math.sqrt(a * a + b * b);
        // Reject near-black/white/grey — same gate as before, just applied
        // before the accent search instead of as an early-return.
        if (L < 0.06 || L > 0.96) continue;
        if (chroma < 0.012) continue;
        usable.push({ L, a, b, chroma, hex });
    }

    if (usable.length === 0) {
        return candidates[0] ?? null;
    }

    const dominant = usable[0];

    // Search for a chromatic accent. We score each non-dominant candidate
    // on its OKLab distance from the dominant (must read as a different
    // hue family, not just a tonal shift) and its own chroma (the accent
    // has to be a deliberate saturated color, not a muted neighbor of
    // the dominant). The thresholds are tuned so two-tone designed covers
    // pick up the accent reliably while photo covers — where every bucket
    // is a slight tonal variation of the same hue — fall through to the
    // dominant.
    const MIN_DISTANCE = 0.14;
    const MIN_ACCENT_CHROMA = 0.06;
    let bestAccent: LabCandidate | null = null;
    let bestScore = 0;
    for (let i = 1; i < usable.length; i++) {
        const c = usable[i];
        const dL = c.L - dominant.L;
        const da = c.a - dominant.a;
        const db = c.b - dominant.b;
        const distance = Math.sqrt(dL * dL + da * da + db * db);
        if (distance < MIN_DISTANCE) continue;
        if (c.chroma < MIN_ACCENT_CHROMA) continue;
        // Weight: chroma matters more than raw distance (a saturated but
        // close accent beats a desaturated but distant one — we're picking
        // for visual intent, not opposition).
        const score = c.chroma * 1.4 + distance;
        if (score > bestScore) {
            bestScore = score;
            bestAccent = c;
        }
    }

    return (bestAccent ?? dominant).hex;
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
    // 64 stops keeps the per-stop OKLab delta to ~0.005 — small enough that
    // the GPU's sRGB-linear interpolation between adjacent stops produces no
    // perceptible step on its own. The remaining 8-bit quantization banding
    // is handled by the soft-light dither overlay on the player.
    const stopCount = 64;
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
    artworkUrl,
    castState,
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
    // Canonical high-res artwork URL — same string the MiniPlayer renders.
    // Derived once in the parent so the two players share one expo-image
    // cache entry and one in-flight load.
    artworkUrl: string | undefined;
    castState: AndroidCastState;
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
    const [outputPickerVisible, setOutputPickerVisible] = useState(false);
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
    const canSkipPlayback = Boolean(displayItem && displayItem.source !== 'radio');

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
            contextMenu.openForItem(songItem, { suppressQueueAction: true });
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
            contextMenu.openForItem(radioItem, { suppressQueueAction: true });
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
            contextMenu.openForItem(homeItem, { suppressQueueAction: true });
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
                .enabled(canSkipPlayback)
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
        [canSkipPlayback, onNext, onPrevious],
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
    const showShuffleControl =
        displayItem.source !== 'audiobook' && displayItem.source !== 'radio';
    const showSkipControls = displayItem.source !== 'radio';
    const castButton = (
        <Pressable
            accessibilityLabel={
                castState.isConnected
                    ? `Choose audio output. Casting to ${castState.deviceName ?? 'Chromecast'}`
                    : 'Choose audio output'
            }
            accessibilityRole="button"
            onPress={() => setOutputPickerVisible(true)}
            style={styles.fullPlayerBottomBarButton}
        >
            <CastGlyph
                color={
                    castState.isConnected
                        ? CAST_ICON_ACTIVE_TINT
                        : CAST_ICON_INACTIVE_TINT
                }
                size={22}
            />
        </Pressable>
    );
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
            {/* Dither overlay — breaks 8-bit gradient banding via soft-light
                blend. The PNG is zero-mean grey noise; soft-light at b≈0.5
                acts as a small bidirectional perturbation around the
                underlying brightness, so dark and mid tones both pick up
                ±2-3/255 of random scatter. Below the collapsed surface and
                content so the dither doesn't affect anything but the
                gradient itself. */}
            <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, styles.fullPlayerDither]}
            >
                <Image
                    resizeMode="repeat"
                    source={ditherTexture}
                    style={StyleSheet.absoluteFillObject}
                />
            </View>
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
                    {artworkUrl ? (
                        <ExpoImage
                            // expo-image's default is to decode bitmaps at the
                            // view's current size. The fullscreen player's
                            // artwork view is shrunk by flex while the player
                            // is collapsed, so the default would cache a tiny
                            // bitmap and then re-decode from disk at full size
                            // mid-open — the "low-res until it gets big"
                            // flash. Forcing a full-res decode up front means
                            // one bitmap, same pixels at every player state.
                            allowDownscaling={false}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            priority="high"
                            recyclingKey={artworkUrl}
                            source={{ uri: artworkUrl }}
                            style={styles.fullPlayerArtwork}
                            transition={90}
                        />
                    ) : (
                        <View style={styles.fullPlayerArtworkFallback}>
                            <Text style={styles.fullPlayerArtworkLetter}>
                                {display.title.slice(0, 1)}
                            </Text>
                        </View>
                    )}
                    {/* Format badge sits in the corner of the artwork — the same
                        artwork-overlay treatment used on home and view-all tiles,
                        scaled up for the hero. */}
                    <QualityBadge
                        overlay
                        profile={getPlaybackQualityProfile(displayItem)}
                    />
                </View>
            </View>

            {/* Bottom stack: each block owns its own row — no overlap. */}
            <View
                style={[
                    styles.fullPlayerBottom,
                    !isMusicSource && styles.fullPlayerBottomLifted,
                ]}
            >
                <View style={styles.fullPlayerMetadata}>
                    <Text
                        numberOfLines={2}
                        style={styles.fullPlayerTitle}
                    >
                        {display.title}
                    </Text>
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
                    <View style={styles.fullPlayerControlSide}>
                        {showShuffleControl ? (
                            <PlayerIconButton accessibilityLabel="Shuffle" onPress={onToggleShuffle}>
                                <ShuffleGlyph active={isShuffled} color={colors.text} />
                            </PlayerIconButton>
                        ) : (
                            castButton
                        )}
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Previous" onPress={onPrevious}>
                                <TrackSkipGlyph color={colors.text} direction={-1} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                    </View>
                    <PlayerIconButton
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                        onPress={onTogglePlayback}
                        primary
                    >
                        <PlayPauseGlyph color="#ffffff" isPlaying={isPlaying} size={44} />
                    </PlayerIconButton>
                    <View style={[styles.fullPlayerControlSide, styles.fullPlayerControlSideRight]}>
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Next" onPress={onNext}>
                                <TrackSkipGlyph color={colors.text} direction={1} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
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
                </View>

                {sleepSecondsLeft !== null && sleepSecondsLeft !== -1 && (
                    <Text style={styles.fullPlayerSleepLabel}>
                        Sleeping in {Math.floor(sleepSecondsLeft / 60)}:{String(sleepSecondsLeft % 60).padStart(2, '0')}
                    </Text>
                )}

                {/* Bottom row — cast on left when shuffle is visible. For radio
                    and audiobooks the cast button moves up into the (now empty)
                    shuffle slot, so the bar only carries the casting-status
                    label when connected. */}
                {(showShuffleControl || castState.isConnected) ? (
                    <View style={styles.fullPlayerBottomBar}>
                        {showShuffleControl ? castButton : null}
                        {castState.isConnected ? (
                            <Text numberOfLines={1} style={styles.fullPlayerCastStatus}>
                                Casting to {castState.deviceName ?? 'Chromecast'}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {activeItem && playbackState.status !== 'idle' && playbackState.message ? (
                    <Text numberOfLines={2} style={styles.fullPlayerErrorText}>
                        {playbackState.message}
                    </Text>
                ) : null}
            </View>
            </Reanimated.View>

        </Reanimated.View>
        </GestureDetector>

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

        <OutputPickerModal
            castState={castState}
            onClose={() => setOutputPickerVisible(false)}
            visible={outputPickerVisible}
        />

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

const EMPTY_OUTPUT_ROUTES: AndroidMediaOutputRoute[] = [];

const getOutputRouteGlyphLabel = (route: AndroidMediaOutputRoute): string => {
    const type = route.type ?? '';
    if (type.includes('bluetooth') || type.startsWith('ble') || type === 'hearing-aid') {
        return 'BT';
    }
    if (type.startsWith('usb')) {
        return 'USB';
    }
    if (type.startsWith('wired')) {
        return 'AUX';
    }
    return 'SP';
};

const getCastPickerEmptyMessage = (castState: AndroidCastState | undefined): string => {
    if (castState?.status === 'unavailable') {
        return 'Chromecast is unavailable on this device.';
    }
    if (castState?.status === 'connecting') {
        return 'Looking for Chromecast devices...';
    }
    return 'No Chromecast devices found.';
};

const OutputPickerModal = ({
    castState,
    onClose,
    visible,
}: {
    castState: AndroidCastState;
    onClose: () => void;
    visible: boolean;
}) => {
    const [outputState, setOutputState] = useState<AndroidMediaOutputState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectingRouteId, setSelectingRouteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }

        let cancelled = false;
        const loadRoutes = async (showLoading: boolean) => {
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);
            try {
                const next = await getAndroidOutputRoutes();
                if (!cancelled) {
                    setOutputState(next);
                }
            } catch (routeError) {
                if (!cancelled) {
                    setError(
                        routeError instanceof Error
                            ? routeError.message
                            : 'Could not load audio outputs.',
                    );
                }
            } finally {
                if (!cancelled && showLoading) {
                    setIsLoading(false);
                }
            }
        };

        void loadRoutes(true);
        const subscription = subscribeToAndroidOutputRouteEvents((next) => {
            if (cancelled) {
                return;
            }
            setOutputState(next);
            setIsLoading(false);
            setError(null);
        });
        const refreshTimers: Array<ReturnType<typeof setTimeout>> = [
            setTimeout(() => void loadRoutes(false), 850),
            setTimeout(() => void loadRoutes(false), 2200),
        ];

        return () => {
            cancelled = true;
            subscription.remove();
            refreshTimers.forEach(clearTimeout);
            setSelectingRouteId(null);
        };
    }, [visible]);

    const routes = outputState?.routes ?? EMPTY_OUTPUT_ROUTES;
    const localRoutes = routes.filter((route) => route.kind === 'local');
    const castRoutes = routes.filter((route) => route.kind === 'cast');
    const pickerCastState = outputState?.cast ?? castState;

    const handleSelectRoute = useCallback(
        async (route: AndroidMediaOutputRoute) => {
            if (selectingRouteId) {
                return;
            }
            if (route.isSelected) {
                onClose();
                return;
            }

            setSelectingRouteId(route.id);
            setError(null);
            try {
                const next = await selectAndroidOutputRoute(route);
                setOutputState(next);
                onClose();
            } catch (selectError) {
                setError(
                    selectError instanceof Error
                        ? selectError.message
                        : 'Could not switch audio output.',
                );
            } finally {
                setSelectingRouteId(null);
            }
        },
        [onClose, selectingRouteId],
    );

    const renderRoute = (route: AndroidMediaOutputRoute) => {
        const isSelecting = selectingRouteId === route.id;
        const isDisabled = Boolean(selectingRouteId) || route.isAvailable === false;
        const iconColor = route.isSelected ? colors.accent : colors.text;

        return (
            <Pressable
                accessibilityLabel={`${route.title}${route.subtitle ? `, ${route.subtitle}` : ''}`}
                accessibilityRole="button"
                disabled={isDisabled}
                key={route.id}
                onPress={(event) => {
                    event.stopPropagation();
                    void handleSelectRoute(route);
                }}
                style={({ pressed }) => [
                    styles.outputPickerRow,
                    pressed && styles.outputPickerRowPressed,
                    route.isSelected && styles.outputPickerRowSelected,
                    isDisabled && !isSelecting && styles.outputPickerRowDisabled,
                ]}
            >
                <View
                    style={[
                        styles.outputPickerIcon,
                        route.isSelected && styles.outputPickerIconSelected,
                    ]}
                >
                    {route.kind === 'cast' ? (
                        <CastGlyph color={iconColor} size={20} />
                    ) : (
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.outputPickerIconLabel,
                                route.isSelected && styles.outputPickerIconLabelSelected,
                            ]}
                        >
                            {getOutputRouteGlyphLabel(route)}
                        </Text>
                    )}
                </View>
                <View style={styles.outputPickerRowBody}>
                    <Text numberOfLines={1} style={styles.outputPickerTitle}>
                        {route.title}
                    </Text>
                    {route.subtitle ? (
                        <Text numberOfLines={1} style={styles.outputPickerSubtitle}>
                            {route.subtitle}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.outputPickerState}>
                    {isSelecting ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                    ) : route.isSelected ? (
                        <CheckGlyph color={colors.accent} size={16} />
                    ) : null}
                </View>
            </Pressable>
        );
    };

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.modalBackdrop}>
                <SwipeDismissSheet onDismiss={onClose} style={styles.actionSheet}>
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Audio Output</Text>
                    {isLoading && !outputState ? (
                        <View style={styles.outputPickerLoading}>
                            <ActivityIndicator color={colors.accent} size="small" />
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.outputPickerList}
                            keyboardShouldPersistTaps="handled"
                        >
                            {localRoutes.length > 0 ? (
                                <>
                                    <Text style={styles.outputPickerSectionLabel}>
                                        Phone and Bluetooth
                                    </Text>
                                    {localRoutes.map(renderRoute)}
                                </>
                            ) : null}
                            <Text style={styles.outputPickerSectionLabel}>Chromecast</Text>
                            {castRoutes.length > 0 ? (
                                castRoutes.map(renderRoute)
                            ) : (
                                <Text style={styles.outputPickerEmpty}>
                                    {getCastPickerEmptyMessage(pickerCastState)}
                                </Text>
                            )}
                            {error ? (
                                <Text style={styles.outputPickerError}>{error}</Text>
                            ) : null}
                        </ScrollView>
                    )}
                </SwipeDismissSheet>
            </Pressable>
        </Modal>
    );
};

/**
 * Inline queue sheet rendered as a child of the fullscreen player. translateY
 * is driven by the shared queueProgress that the outer pan gesture mutates, so
 * the sheet follows the user's finger end-to-end.
 */
type QueueSheetListItem =
    | { chapter: MobilePlaybackSegment; index: number; kind: 'chapter' }
    | { index: number; item: MobilePlayableAudio; kind: 'queue' };

const EMPTY_QUEUE_SHEET_ROWS: QueueSheetListItem[] = [];
const QUEUE_SHEET_INITIAL_ITEMS = 12;
const QUEUE_SHEET_RENDER_BATCH = 10;
const QUEUE_SHEET_ROW_HEIGHT = 60;
const QUEUE_SHEET_WINDOW_SIZE = 7;

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
    const queueSheetRows = useMemo<QueueSheetListItem[]>(
        () => {
            if (!interactive) {
                return EMPTY_QUEUE_SHEET_ROWS;
            }

            return showingChapters
                ? (chapters ?? []).map((chapter, index) => ({
                      chapter,
                      index,
                      kind: 'chapter' as const,
                  }))
                : items.map((item, index) => ({ index, item, kind: 'queue' as const }));
        },
        [chapters, interactive, items, showingChapters],
    );
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
    const keyExtractor = useCallback((row: QueueSheetListItem) => {
        if (row.kind === 'chapter') {
            return `${row.chapter.id}-${row.index}`;
        }

        return `${row.item.id}-${row.index}`;
    }, []);
    const getItemLayout = useCallback(
        (_data: ArrayLike<QueueSheetListItem> | null | undefined, index: number) => ({
            index,
            length: QUEUE_SHEET_ROW_HEIGHT,
            offset: QUEUE_SHEET_ROW_HEIGHT * index,
        }),
        [],
    );
    const renderItem = useCallback(
        ({ item: row }: { item: QueueSheetListItem }) => {
            if (row.kind === 'chapter') {
                const isActive = row.index === activeChapterIndex;
                const chapter = row.chapter;
                return (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => onChapterSeek?.(chapter.startSeconds * 1000)}
                        style={styles.queueRow}
                    >
                        <View style={styles.queueChapterNumber}>
                            <Text
                                style={[
                                    styles.queueChapterNumberText,
                                    isActive && { color: colors.accent },
                                ]}
                            >
                                {row.index + 1}
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
                                {chapter.title ?? `Chapter ${row.index + 1}`}
                            </Text>
                            <Text numberOfLines={1} style={styles.queueRowSubtitle}>
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
            }

            const isActive = queue?.index === row.index;
            const queueRowProfile = getPlaybackQualityProfile(row.item);
            return (
                <View style={styles.queueRow}>
                    <View>
                        <ArtworkImage
                            fallbackStyle={styles.queueRowThumbFallback}
                            letter={row.item.title.slice(0, 1).toUpperCase()}
                            style={styles.queueRowThumb}
                            uri={row.item.artworkUrl}
                        />
                        <QualityBadge thumb profile={queueRowProfile} />
                    </View>
                    <View style={styles.queueRowBody}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.queueRowTitle,
                                isActive && { color: colors.accent },
                            ]}
                        >
                            {row.item.title}
                        </Text>
                        {row.item.subtitle ? (
                            <Text numberOfLines={1} style={styles.queueRowSubtitle}>
                                {row.item.subtitle}
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
        },
        [activeChapterIndex, onChapterSeek, queue?.index],
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
            <Reanimated.View
                pointerEvents={interactive ? 'auto' : 'none'}
                style={[styles.queueSheet, sheetStyle]}
            >
                <GestureDetector gesture={dismissGesture}>
                    <View style={styles.queueSheetHeader}>
                        <View style={styles.queueSheetHandle} />
                        <View style={styles.queueSheetTitleRow}>
                            <Text style={styles.queueSheetTitle}>
                                {showingChapters ? 'Chapters' : 'Up Next'}
                            </Text>
                            <Pressable
                                accessibilityLabel="Close queue"
                                accessibilityRole="button"
                                hitSlop={8}
                                onPress={onClose}
                                style={styles.queueSheetCloseButton}
                            >
                                <DownCaretGlyph color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                </GestureDetector>
                <GestureFlatList
                    contentContainerStyle={styles.queueSheetContent}
                    data={queueSheetRows}
                    extraData={`${activeChapterIndex}:${queue?.index ?? -1}`}
                    getItemLayout={getItemLayout}
                    initialNumToRender={QUEUE_SHEET_INITIAL_ITEMS}
                    keyboardShouldPersistTaps="handled"
                    keyExtractor={keyExtractor}
                    ListEmptyComponent={
                        interactive && !showingChapters ? (
                            <Text style={styles.queueSheetEmpty}>The queue is empty.</Text>
                        ) : null
                    }
                    maxToRenderPerBatch={QUEUE_SHEET_RENDER_BATCH}
                    nestedScrollEnabled
                    removeClippedSubviews
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    style={styles.queueSheetScroll}
                    windowSize={QUEUE_SHEET_WINDOW_SIZE}
                />
            </Reanimated.View>
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

/**
 * Build a map of sidebar letter → row index for ViewAll's two-column layout.
 * The value is the *row* the letter falls into (not the flat item index), so
 * the sidebar can hand the FlatList a row index directly for scrollToIndex.
 */
const buildAlphabetLetterIndex = (
    items: MobileHomeItem[],
): Map<string, number> => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
        const first = item.title.charAt(0).toUpperCase();
        const letter = first >= 'A' && first <= 'Z' ? first : '#';
        if (!map.has(letter)) {
            map.set(letter, Math.floor(index / 2));
        }
    });
    return map;
};

type ViewAllRow = {
    key: string;
    left: MobileHomeItem;
    right: MobileHomeItem | undefined;
};

const chunkIntoViewAllRows = (items: MobileHomeItem[]): ViewAllRow[] => {
    const rows: ViewAllRow[] = [];
    for (let index = 0; index < items.length; index += 2) {
        const left = items[index];
        const right = items[index + 1];
        rows.push({
            // Row identity is its left item — stable as long as the same
            // item stays in the leftmost slot. Adding/removing items below
            // this row doesn't shift its key, so React keeps the row
            // mounted across data updates instead of unmounting/remounting.
            key: `row:${getContentItemKey(left)}`,
            left,
            right,
        });
    }
    return rows;
};

const getViewAllSortKey = (item: MobileHomeItem): string =>
    item.title.trim().toLocaleLowerCase();

const VIEW_ALL_SORT_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

type ViewAllTileProps = {
    item: MobileHomeItem;
    onOpenContextMenu: (item: MobileHomeItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
};

const ViewAllTile = memo(({ item, onOpenContextMenu, onSelectItem }: ViewAllTileProps) => {
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    // Playlists are mixed format — never collection-level badge.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => onOpenContextMenu(item)}
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
            <QualityBadge overlay profile={tileBadgeProfile} />
            <Text numberOfLines={1} style={styles.viewAllTileTitle}>
                {item.title}
            </Text>
            {item.subtitle ? (
                <Text numberOfLines={1} style={styles.viewAllTileSubtitle}>
                    {item.subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
});
ViewAllTile.displayName = 'ViewAllTile';

const ViewAllScreen = memo(({
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
    // FlatList is single-column over pre-chunked row records — see comment on
    // `rows` below. Going through numColumns={2} caused stacking bugs:
    // `removeClippedSubviews` + numColumns + getItemLayout don't agree about
    // which cell occupies which offset, so on fast scroll Android sometimes
    // painted the wrong tile at a given row and never recovered.
    const listRef = useRef<FlatList<ViewAllRow>>(null);
    const jumpFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [jumpFeedbackLetter, setJumpFeedbackLetter] = useState<string | null>(null);
    const isLoading = fullState.status === 'loading';
    const isError = fullState.status === 'error';
    const sortedItems = useMemo(() => {
        // Prefer the exhaustive list once it lands; until then show the
        // home-content slice the route was opened with so the grid isn't
        // empty during the fetch. Merge the cached items either way so a
        // brief stale state can't drop favorites that the full fetch missed.
        const fullItems = fullState.status === 'loaded' ? fullState.items : [];
        const sourceItems = fullState.status === 'loaded'
            ? [...fullItems, ...route.items]
            : route.items;
        const merged: MobileHomeItem[] = [];
        const seen = new Set<string>();
        for (const item of sourceItems) {
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
        return merged
            .map((item) => ({ item, sortKey: getViewAllSortKey(item) }))
            .sort((left, right) => VIEW_ALL_SORT_COLLATOR.compare(left.sortKey, right.sortKey))
            .map(({ item }) => item);
    }, [fullState, route.items]);
    // Pre-chunk the sorted items into two-up rows so the FlatList is a
    // simple, single-column virtualized list. Each FlatList item is now an
    // entire row of tiles, which keeps getItemLayout/scrollToIndex/removed-
    // subview logic all aligned — no row-vs-item offset arithmetic, no
    // numColumns recycling quirks.
    const rows = useMemo(() => chunkIntoViewAllRows(sortedItems), [sortedItems]);
    const letterIndex = useMemo(
        () => buildAlphabetLetterIndex(sortedItems),
        [sortedItems],
    );

    useEffect(() => {
        return () => {
            if (jumpFeedbackTimeoutRef.current) {
                clearTimeout(jumpFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const showJumpFeedback = useCallback((letter: string) => {
        if (jumpFeedbackTimeoutRef.current) {
            clearTimeout(jumpFeedbackTimeoutRef.current);
        }
        setJumpFeedbackLetter(letter);
        jumpFeedbackTimeoutRef.current = setTimeout(() => {
            setJumpFeedbackLetter(null);
            jumpFeedbackTimeoutRef.current = null;
        }, 420);
    }, []);

    const handleJumpToLetter = useCallback(
        (letter: string) => {
            const rowIndex = letterIndex.get(letter);
            if (typeof rowIndex !== 'number') return;
            showJumpFeedback(letter);
            try {
                listRef.current?.scrollToIndex({
                    animated: false,
                    index: rowIndex,
                });
            } catch (error) {
                console.warn('[ViewAllScreen] scrollToIndex threw', error);
            }
        },
        [letterIndex, showJumpFeedback],
    );
    const getItemLayout = useCallback(
        (_: ArrayLike<ViewAllRow> | null | undefined, index: number) => ({
            index,
            length: VIEW_ALL_ROW_HEIGHT,
            offset: index * VIEW_ALL_ROW_HEIGHT,
        }),
        [],
    );

    const handleOpenContextMenu = useCallback(
        (item: MobileHomeItem) => contextMenu.openForItem(item),
        [contextMenu],
    );

    const renderRow = useCallback(
        ({ item: row }: { item: ViewAllRow }) => (
            <View style={styles.viewAllRow}>
                <ViewAllTile
                    item={row.left}
                    onOpenContextMenu={handleOpenContextMenu}
                    onSelectItem={onSelectItem}
                />
                {row.right ? (
                    <ViewAllTile
                        item={row.right}
                        onOpenContextMenu={handleOpenContextMenu}
                        onSelectItem={onSelectItem}
                    />
                ) : (
                    // Phantom slot keeps the left tile flush-left when the
                    // grid has an odd item count, instead of letting flex
                    // stretch it across the full row.
                    <View style={styles.viewAllTilePlaceholder} />
                )}
            </View>
        ),
        [handleOpenContextMenu, onSelectItem],
    );

    const keyExtractor = useCallback((row: ViewAllRow) => row.key, []);

    // FlatList throws if scrollToIndex targets an unrealized window; in that
    // case it gives us the chance to fall back to a precise pixel offset
    // (which getItemLayout makes trivial).
    const handleScrollToIndexFailed = useCallback(
        (info: { averageItemLength: number; highestMeasuredFrameIndex: number; index: number }) => {
            listRef.current?.scrollToOffset({
                animated: false,
                offset: info.index * VIEW_ALL_ROW_HEIGHT,
            });
        },
        [],
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
                {rows.length === 0 ? (
                    isLoading ? (
                        <ActivityIndicator color={colors.accent} />
                    ) : (
                        <Text style={styles.viewAllEmpty}>
                            {isError ? 'Couldn’t load every item.' : 'Nothing to show here yet.'}
                        </Text>
                    )
                ) : (
                    <FlatList
                        contentContainerStyle={styles.viewAllListContent}
                        data={rows}
                        getItemLayout={getItemLayout}
                        initialNumToRender={Math.ceil(VIEW_ALL_INITIAL_ITEMS / 2)}
                        keyExtractor={keyExtractor}
                        maxToRenderPerBatch={Math.ceil(VIEW_ALL_RENDER_BATCH / 2)}
                        onScrollToIndexFailed={handleScrollToIndexFailed}
                        ref={listRef}
                        renderItem={renderRow}
                        showsVerticalScrollIndicator={false}
                        updateCellsBatchingPeriod={32}
                        windowSize={VIEW_ALL_WINDOW_SIZE}
                    />
                )}
                <AlphabetSidebar
                    activeLetters={letterIndex}
                    onJumpToLetter={handleJumpToLetter}
                />
                {jumpFeedbackLetter ? (
                    <View pointerEvents="none" style={styles.viewAllJumpOverlay}>
                        <Text style={styles.viewAllJumpOverlayText}>
                            {jumpFeedbackLetter}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
});

ViewAllScreen.displayName = 'ViewAllScreen';

const AlphabetSidebar = ({
    activeLetters,
    onJumpToLetter,
}: {
    activeLetters: Map<string, number>;
    onJumpToLetter: (letter: string) => void;
}) => {
    const letterRefs = useRef<Record<string, View | null>>({});
    const letterMetricsRef = useRef<Array<{ bottom: number; letter: string; top: number }>>([]);
    const lastSelectedLetterRef = useRef<string | null>(null);

    const measureLetterMetrics = useCallback((onMeasured?: () => void) => {
        const nextMetrics: Array<{ bottom: number; letter: string; top: number }> = [];
        let pending = ALPHABET_SIDEBAR_LETTERS.length;

        const finishOne = () => {
            pending -= 1;
            if (pending === 0) {
                letterMetricsRef.current = nextMetrics.sort((left, right) => left.top - right.top);
                onMeasured?.();
            }
        };

        ALPHABET_SIDEBAR_LETTERS.forEach((letter) => {
            const node = letterRefs.current[letter];
            if (!node) {
                finishOne();
                return;
            }

            node.measureInWindow((_x, y, _width, height) => {
                if (height > 0) {
                    nextMetrics.push({
                        bottom: y + height,
                        letter,
                        top: y,
                    });
                }
                finishOne();
            });
        });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => measureLetterMetrics(), 0);
        return () => clearTimeout(timer);
    }, [activeLetters, measureLetterMetrics]);

    const getLetterFromPageY = useCallback((pageY: number) => {
        const metrics = letterMetricsRef.current;
        if (metrics.length === 0) {
            return null;
        }

        const containing = metrics.find((metric) => pageY >= metric.top && pageY <= metric.bottom);
        if (containing) {
            return containing.letter;
        }

        let nearest = metrics[0];
        let nearestDistance = Math.abs(pageY - (nearest.top + nearest.bottom) / 2);
        for (let index = 1; index < metrics.length; index += 1) {
            const candidate = metrics[index];
            const distance = Math.abs(pageY - (candidate.top + candidate.bottom) / 2);
            if (distance < nearestDistance) {
                nearest = candidate;
                nearestDistance = distance;
            }
        }

        return nearest.letter;
    }, []);

    const jumpToLetter = useCallback(
        (letter: string) => {
            if (!activeLetters.has(letter)) return;
            if (lastSelectedLetterRef.current === letter) return;

            lastSelectedLetterRef.current = letter;
            triggerSelection();
            onJumpToLetter(letter);
        },
        [activeLetters, onJumpToLetter],
    );

    const jumpToPageY = useCallback(
        (pageY: number) => {
            const letter = getLetterFromPageY(pageY);
            if (letter) {
                jumpToLetter(letter);
            }
        },
        [getLetterFromPageY, jumpToLetter],
    );

    const resetDragLetter = useCallback(() => {
        lastSelectedLetterRef.current = null;
    }, []);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    Math.abs(gestureState.dy) > 2 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderGrant: (event) => {
                    const { pageY } = event.nativeEvent;
                    measureLetterMetrics(() => {
                        jumpToPageY(pageY);
                    });
                },
                onPanResponderMove: (event) => {
                    jumpToPageY(event.nativeEvent.pageY);
                },
                onPanResponderRelease: resetDragLetter,
                onPanResponderTerminate: resetDragLetter,
                onStartShouldSetPanResponder: () => false,
            }),
        [jumpToPageY, measureLetterMetrics, resetDragLetter],
    );

    return (
        <View pointerEvents="box-none" style={styles.alphabetSidebar}>
            <View
                {...panResponder.panHandlers}
                accessibilityLabel="Alphabet jump index"
                accessibilityRole="adjustable"
                onLayout={() => measureLetterMetrics()}
                style={styles.alphabetSidebarRail}
            >
                {ALPHABET_SIDEBAR_LETTERS.map((letter) => {
                    const isActive = activeLetters.has(letter);
                    return (
                        <Pressable
                            disabled={!isActive}
                            hitSlop={{ bottom: 0, left: 18, right: 4, top: 0 }}
                            key={letter}
                            onPress={() => {
                                lastSelectedLetterRef.current = null;
                                jumpToLetter(letter);
                                lastSelectedLetterRef.current = null;
                            }}
                            ref={(node) => {
                                letterRefs.current[letter] = node;
                            }}
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

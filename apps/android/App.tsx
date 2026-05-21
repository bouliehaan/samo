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
    upsertServerAuthentication,
} from '@samo/core/server';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { getColors as getImageColors } from 'react-native-image-colors';
import {
    Component,
    type ComponentProps,
    createContext,
    type ErrorInfo,
    Fragment,
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
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    BackHandler,
    type GestureResponderEvent,
    Image,
    type ImageSourcePropType,
    KeyboardAvoidingView,
    type LayoutChangeEvent,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    PanResponder,
    PermissionsAndroid,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {
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
import { ArtworkImage } from './src/components/ArtworkImage';
import { ArtworkZoomModal } from './src/components/ArtworkZoomModal';
import { QualityBadge, QualityBadgeRow } from './src/components/QualityBadge';
import { SegmentedSeekBar } from './src/components/SegmentedSeekBar';
import { SwipeDismissSheet } from './src/components/SwipeDismissSheet';
import {
    DownloadedCollectionKeysContext,
    DownloadedTrackKeysContext,
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from './src/contexts/downloaded-keys';
import { useReducedMotionPreference } from './src/hooks/use-reduced-motion-preference';
import { AddServerScreen } from './src/screens/AddServerScreen';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { ManageServersScreen } from './src/screens/ManageServersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { RadioScreen } from './src/screens/RadioScreen';
import { SearchOverlay, SearchScreen } from './src/screens/SearchScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { MediaDetailContent } from './src/screens/MediaDetailScreen';
import { ViewAllScreen } from './src/screens/ViewAllScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { EmptyServerBackedScreen } from './src/screens/EmptyServerBackedScreen';
import { BookInformationModal } from './src/components/BookInformationModal';
import {
    MediaContextMenu,
    type MediaContextMenuAction,
} from './src/components/MediaContextMenu';
import { StreamInfoModal } from './src/components/StreamInfoModal';
import { TrackPlaylistMenu } from './src/components/TrackPlaylistMenu';
import {
    ConnectedFullScreenPlayer,
    ConnectedMiniPlayer,
    NowPlayingMetadataSync,
} from './src/player/PlayerSurface';
import {
    MediaContextMenuContext,
    type MediaContextMenuApi,
    type MediaContextMenuKind,
    type MediaContextMenuTarget,
} from './src/contexts/media-context-menu';
import { type BookInfoState } from './src/types/book-info';
import { LibrarySortMenu } from './src/components/LibrarySortMenu';
import { useStableCallback } from './src/hooks/use-stable-callback';
import { type HomeDisplaySection } from './src/types/home';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    LIBRARY_FILTERS,
    LIBRARY_SORTS,
    type LibraryFilter,
    type LibraryFullCollectionsState,
    type LibrarySort,
} from './src/types/library-tab';
import { getContentItemKey } from './src/utils/content-item';
import {
    getSectionsById,
    getViewAllVariant,
    resolveItemArtworkUrl,
    sortHomeItemsByRecents,
} from './src/utils/home-display';
import { InlineSearchBar } from './src/components/InlineSearchBar';
import { LibraryListRow } from './src/components/LibraryListRow';
import { MediaArtwork } from './src/components/MediaArtwork';
import { WarningList } from './src/components/WarningList';
import { type LibraryDisplayItem } from './src/types/library-display';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from './src/utils/download-keys';
import {
    getLibraryMediaType,
    toLibraryDisplayItem,
} from './src/utils/library-display';
import {
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    type AndroidNativePlaybackEvent,
    cancelAndroidSleepTimer,
    getAndroidAudioDeviceInfo,
    getAndroidCastState,
    getAndroidOutputRoutes,
    isAndroidNativePlaybackAvailable,
    pauseAndroidAudio,
    playAndroidAudio,
    resumeAndroidAudio,
    seekAndroidAudio,
    setAndroidSleepTimer,
    getAndroidPlaybackStatus,
    selectAndroidOutputRoute,
    subscribeToAndroidAudioEvents,
    subscribeToAndroidCastEvents,
    subscribeToAndroidNavigationRequests,
    subscribeToAndroidOutputRouteEvents,
    updateAndroidNowPlayingMetadata,
} from './src/services/audio-playback';
import {
    getAndroidPlaybackState,
    selectActiveAndroidPlaybackItem,
    selectAndroidPlaybackStatus,
    setAndroidPlaybackState,
    useAndroidPlaybackState,
} from './src/state/playback-store';
import { type AndroidPlaybackState } from './src/types/playback';
import {
    findActiveChapterIndex,
    formatChapterRange,
    formatPlaybackTime,
    getActivePlaybackStatus,
    getAdjacentSegmentTargetMs,
    getDisplaySubtitle,
    getDurationLabel,
    getPlaybackDisplayMetadata,
    getPlaybackDurationMs,
    getPlaybackEventDurationMs,
    getPlaybackItemDurationMs,
    getStablePlaybackPositionMs,
    isLivePlayback,
    looksLikeUrl,
} from './src/utils/playback-time';
import {
    buildBackdropStops,
    darkenColor,
    pickAlbumEssenceColor,
} from './src/utils/color';
import { clamp } from './src/utils/math';
import { getPlaylistTargetsForRoot } from './src/utils/playlist-targets';
import { ANDROID_SERVER_TYPES } from './src/utils/server-types';
import {
    type DownloadEntry,
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
    getLocalDownloadForTrack,
    getLocalUriForTrack,
    getOfflineAudiobookFiles,
    listDownloads,
    type OfflineAudiobookFile,
    setDownloadsPlaybackActive,
    subscribeDownloads,
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
import { formatQualityProfile } from './src/services/quality-badge-assets';
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
    addAndroidRadioStation,
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from './src/services/radio-stations';
import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    FULL_PLAYER_EXPANDED_TOP,
    FULL_PLAYER_PADDING_TOP,
    HOME_COMPACT_OFFSET,
    HOME_PRIMARY_TILE,
    HOME_ROUNDED_OFFSET,
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
    VIEW_ALL_ROW_HEIGHT,
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
    FullPlayerImageGlyph,
    GearGlyph,
    HeartGlyph,
    MoreGlyph,
    PersonGlyph,
    PlusGlyph,
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

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

const CAST_ICON_ACTIVE_TINT = 'rgba(202, 160, 79, 0.78)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';
const HOME_ARTWORK_PREFETCH_LIMIT = 48;
const LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS = 500;
const MEDIA_DETAIL_MEMORY_CACHE_LIMIT = 24;
const MEDIA_DETAIL_MEMORY_TRACK_LIMIT = 300;
const DEFAULT_SERVER_URL = 'http://';

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

const hasServerUrlTarget = (value: string) => {
    const normalized = addDefaultHttpScheme(value);
    return normalized.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '').trim().length > 0;
};

const toPlaybackSource = (value?: string): MobilePlayableAudio['source'] | null => {
    if (value === 'audiobook' || value === 'music' || value === 'podcast' || value === 'radio') {
        return value;
    }

    return null;
};

const buildRecoveredPlaybackItem = (
    event: AndroidNativePlaybackEvent,
    lastPlayedItem: MobilePlayableAudio | null,
): MobilePlayableAudio | null => {
    const sourceSnapshot = event.source;
    if (
        lastPlayedItem &&
        (!sourceSnapshot?.id || sourceSnapshot.id === lastPlayedItem.id) &&
        (!sourceSnapshot?.source || sourceSnapshot.source === lastPlayedItem.source)
    ) {
        return {
            ...lastPlayedItem,
            artworkUrl: sourceSnapshot?.artworkUrl ?? lastPlayedItem.artworkUrl,
            durationSeconds:
                event.durationMs && event.durationMs > 0
                    ? event.durationMs / 1000
                    : lastPlayedItem.durationSeconds,
            subtitle: lastPlayedItem.subtitle ?? sourceSnapshot?.subtitle,
            title: lastPlayedItem.title,
        };
    }

    const source = toPlaybackSource(sourceSnapshot?.source);
    const id = sourceSnapshot?.id ?? event.sessionId;
    const title = sourceSnapshot?.title?.trim();
    if (!source || !id || !title) {
        return null;
    }

    return {
        artworkUrl: sourceSnapshot?.artworkUrl,
        durationSeconds:
            event.durationMs && event.durationMs > 0 ? event.durationMs / 1000 : undefined,
        id,
        quality: {
            deliveryKind: 'unknown',
            losslessRequired: false,
            serverTranscodeRequested: false,
        },
        source,
        subtitle: sourceSnapshot?.subtitle,
        title,
        url: '',
    };
};

const getTabTitle = (activeTab: SamoMobileTabId) => {
    return SAMO_MOBILE_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Samo';
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

        const key = getDownloadedCollectionKey(entry.collection.sourceId, entry.collection.id);
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

type LibraryMediaType = Exclude<LibraryFilter, 'all'>;

const rememberMediaDetail = (
    cache: Map<string, MobileMediaDetail>,
    key: string,
    detail: MobileMediaDetail,
) => {
    if (detail.tracks.length > MEDIA_DETAIL_MEMORY_TRACK_LIMIT) {
        cache.delete(key);
        return;
    }
    if (cache.has(key)) {
        cache.delete(key);
    }
    cache.set(key, detail);

    while (cache.size > MEDIA_DETAIL_MEMORY_CACHE_LIMIT) {
        const oldestKey = cache.keys().next().value;
        if (!oldestKey) break;
        cache.delete(oldestKey);
    }
};

const getAbsProgressSeconds = (
    context: AbsProgressContext,
    positionMs: number | undefined,
    item: MobilePlayableAudio | undefined,
): number => {
    const offsetSeconds = item?.progressOffsetSeconds ?? 0;
    const positionSeconds = Math.max(0, (positionMs ?? 0) / 1000);
    const absoluteSeconds = offsetSeconds + positionSeconds;

    return context.durationSeconds > 0
        ? clamp(absoluteSeconds, 0, context.durationSeconds)
        : absoluteSeconds;
};

const getPlayerPositionMsForAbsProgress = (
    absoluteSeconds: number,
    item: MobilePlayableAudio | undefined,
): number => Math.max(0, (absoluteSeconds - (item?.progressOffsetSeconds ?? 0)) * 1000);

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
        progressOffsetSeconds: file.startOffsetSeconds,
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
        initialPositionSeconds: track.startSeconds,
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
    const [libraryFullCollections, setLibraryFullCollections] =
        useState<LibraryFullCollectionsState>(EMPTY_LIBRARY_FULL_COLLECTIONS);
    const viewAllFetchTokenRef = useRef(0);
    const libraryFullCollectionFetchTokenRef = useRef(0);
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
    const playbackStatus = useAndroidPlaybackState(selectAndroidPlaybackStatus);
    const [castState, setCastState] = useState<AndroidCastState>({
        isConnected: false,
        status: 'unavailable',
    });
    const [lastPlayedItem, setLastPlayedItem] = useState<MobilePlayableAudio | null>(null);
    const [recentContentItems, setRecentContentItems] = useState<AndroidRecentContentItem[]>([]);
    const [serverConnections, setServerConnections] = useState<ServerAuthenticationResult[]>([]);
    const [serverHealthByKey, setServerHealthByKey] = useState<AndroidServerHealthMap>({});
    const [serverType, setServerType] = useState<ServerType>(ServerType.NAVIDROME);
    const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
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
    const [, forcePlaybackQueueRender] = useState(0);
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
        setMediaDetailState((current) => (current.status === 'idle' ? current : { status: 'idle' }));
    }, []);

    const closeBookInfo = useCallback(() => {
        bookInfoRequestId.current += 1;
        setBookInfoState({ status: 'idle' });
    }, []);

    const hydrateNativePlaybackState = useCallback(async () => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        try {
            const event = await getAndroidPlaybackStatus();
            if (event.status === 'idle') {
                return;
            }

            const currentPlaybackState = getAndroidPlaybackState();
            if (currentPlaybackState.status !== 'idle') {
                if (!event.sessionId || event.sessionId !== currentPlaybackState.sessionId) {
                    return;
                }
            }

            const item =
                currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.item
                    : buildRecoveredPlaybackItem(event, lastPlayedItem);
            if (!item) {
                return;
            }

            const sessionId =
                currentPlaybackState.status !== 'idle'
                    ? currentPlaybackState.sessionId
                    : (event.sessionId ?? `recovered:${item.id}`);
            playbackSnapshotRef.current = { item, sessionId };
            setAndroidPlaybackState((current) => {
                if (current.status !== 'idle' && current.sessionId !== sessionId) {
                    return current;
                }

                const activeItem =
                    current.status !== 'idle' && current.sessionId === sessionId
                        ? current.item
                        : item;

                return {
                    bitPerfect:
                        event.bitPerfect ??
                        (current.status === 'idle' ? undefined : current.bitPerfect),
                    durationMs: getPlaybackEventDurationMs(event, activeItem),
                    item: activeItem,
                    message: event.message ?? (current.status === 'idle' ? undefined : current.message),
                    positionMs:
                        current.status === 'idle'
                            ? event.positionMs
                            : getStablePlaybackPositionMs(event, current),
                    sessionId,
                    status: getActivePlaybackStatus(
                        event.status,
                        current.status === 'idle' ? 'paused' : current.status,
                    ),
                };
            });
        } catch {
            // Best-effort recovery. The regular native event subscription still owns live updates.
        }
    }, [lastPlayedItem]);

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
        hasServerUrlTarget(serverUrl) && username.trim().length > 0 && password.length > 0;
    const isHomeSurface =
        activeTab === 'home' && activeUtilityScreen === null && mediaDetailState.status === 'idle';

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
                    downloadedCollectionKeys.has(
                        getDownloadedCollectionKey(item.source?.id, item.id),
                    ),
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
                      getDownloadedCollectionKey(entry.item.source?.id, entry.item.id),
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

    useEffect(() => {
        if (
            isOfflineMode ||
            serverConnections.length === 0 ||
            homeContentState.status !== 'loaded'
        ) {
            libraryFullCollectionFetchTokenRef.current += 1;
            setLibraryFullCollections(EMPTY_LIBRARY_FULL_COLLECTIONS);
            return;
        }

        const requestId = (libraryFullCollectionFetchTokenRef.current += 1);
        setLibraryFullCollections({
            albums: { status: 'loading' },
            artists: { status: 'loading' },
        });

        // Let the launch/home render settle before pulling the exhaustive
        // library. The full lists are for Library + View All, not first paint.
        const timeout = setTimeout(() => {
            void (async () => {
                const [albums, artists] = await Promise.all([
                    loadAndroidFullCollection(serverConnections, 'album'),
                    loadAndroidFullCollection(serverConnections, 'artist'),
                ]);

                if (libraryFullCollectionFetchTokenRef.current !== requestId) {
                    return;
                }

                setLibraryFullCollections({ albums, artists });
            })();
        }, LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS);

        return () => {
            clearTimeout(timeout);
        };
    }, [homeContentState.status, isOfflineMode, serverConnections]);

    const playQueuedItem = useCallback(
        async (
            item: MobilePlayableAudio,
            queueItems: MobilePlayableAudio[] = [item],
            queueIndex?: number,
            options?: { shuffled?: boolean },
        ) => {
            if (!isAndroidNativePlaybackAvailable()) {
                setAndroidPlaybackState({
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
            forcePlaybackQueueRender((version) => version + 1);
            if (options?.shuffled !== undefined) {
                setIsShuffled(options.shuffled);
            }
            playbackSnapshotRef.current = { item, sessionId: session.id };
            setAndroidPlaybackState({
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

                setAndroidPlaybackState({
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
                setAndroidPlaybackState({
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
            options?: { shuffled?: boolean },
        ) => {
            await playQueuedItem(item, queueItems, queueIndex, options);
        },
        [playQueuedItem],
    );

    useEffect(() => {
        const subscription = subscribeToAndroidAudioEvents((event) => {
            const snapshot = playbackSnapshotRef.current;

            if (!snapshot || (event.sessionId && event.sessionId !== snapshot.sessionId)) {
                return;
            }

            setAndroidPlaybackState((current) => {
                if (current.status === 'idle') {
                    return current;
                }

                if (event.status === 'ended') {
                    const absCtx = absContextRef.current;
                    if (absCtx) {
                        void syncAbsProgressImmediate(
                            absCtx,
                            getAbsProgressSeconds(absCtx, event.positionMs, current.item),
                        );
                    }
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

    // Warm the first visible covers into memory + disk so round-tripping
    // through detail pages does not refetch art the home screen just showed.
    useEffect(() => {
        if (homeContentState.status !== 'loaded') return;
        const urls = new Set<string>();
        for (const section of homeContentState.content.sections) {
            for (const item of section.items) {
                if (item.artworkUrl) urls.add(item.artworkUrl);
            }
        }
        if (urls.size > 0) {
            void ExpoImage.prefetch(
                [...urls].slice(0, HOME_ARTWORK_PREFETCH_LIMIT),
                'memory-disk',
            );
        }
    }, [homeContentState]);

    useEffect(() => {
        if (playbackStatus === 'idle' || !isAndroidNativePlaybackAvailable()) {
            return;
        }
        // Polling now writes to the external playback store, not root App
        // state. That keeps route rendering insulated from progress ticks
        // while the player surfaces subscribe directly.
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
                        const activeItem =
                            playbackSnapshotRef.current?.item ??
                            selectActiveAndroidPlaybackItem(getAndroidPlaybackState());
                        if (!activeItem) {
                            return;
                        }
                        void syncAbsProgressThrottled(
                            absCtx,
                            getAbsProgressSeconds(absCtx, positionMs, activeItem),
                        );
                    }

                    setAndroidPlaybackState((current) => {
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
    }, [isFullPlayerOpen, playbackStatus]);

    useEffect(() => {
        setDownloadsPlaybackActive(playbackStatus !== 'idle');
    }, [playbackStatus]);

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

    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);

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

    useEffect(() => {
        void hydrateNativePlaybackState();
    }, [hydrateNativePlaybackState]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                void hydrateNativePlaybackState();
            }
        });

        return () => subscription.remove();
    }, [hydrateNativePlaybackState]);

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
            const connectedType = nextAuthState.result.type;
            const shouldOfferAudiobookshelfNext =
                connectedType === ServerType.NAVIDROME &&
                ANDROID_SERVER_TYPES.includes(ServerType.AUDIOBOOKSHELF);
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
            setServerUrl(DEFAULT_SERVER_URL);
            setUsername('');
            setSearchState({ status: 'idle' });
            setActiveUtilityScreen('manage-servers');
            await savePersistedServerAuths(nextConnections);
            await loadHomeForConnections(nextConnections);

            if (shouldOfferAudiobookshelfNext) {
                Alert.alert(
                    'Add Audiobookshelf?',
                    'Want to add an Audiobookshelf server too?',
                    [
                        { text: 'Not now', style: 'cancel' },
                        {
                            text: 'Add Audiobookshelf',
                            onPress: () => {
                                setAuthState({ status: 'idle' });
                                setPassword('');
                                setServerType(ServerType.AUDIOBOOKSHELF);
                                setServerUrl(DEFAULT_SERVER_URL);
                                setUsername('');
                                setActiveUtilityScreen('add-server');
                            },
                        },
                    ],
                );
            }
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
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromDisk);
            }
        }

        if (!cached && isOfflineMode) {
            const downloadedDetail = await buildDownloadedMusicDetail(item);
            if (!isCurrentRequest()) {
                return { cached: false };
            }
            if (downloadedDetail) {
                cached = downloadedDetail;
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, downloadedDetail);
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
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
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
            setViewAllRoute({
                items: [],
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
        [closeMediaDetail, serverConnections],
    );

    const handleSelectMediaItem = async (item: MobileHomeItem | MobileSearchItem) => {
        recordRecentContentItem(item);

        if (item.playback) {
            mediaDetailRequestId.current += 1;
            audiobookStartRequestId.current += 1;
            await handlePlayItem(item.playback, [item.playback], 0, { shuffled: false });
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
        setAndroidPlaybackState((current) =>
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
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, networkResult.detail);
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
                await handlePlayItem(track.playback, queueItems, queueIndex, { shuffled: false });
            } else {
                await handlePlayItem(track.playback, [track.playback], 0, { shuffled: false });
            }
            return;
        }

        let trackToPlay = track;
        const absAuth = serverConnections.find(
            (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
        );

        if (
            detail.type === MobileMediaDetailType.PODCAST &&
            absAuth?.type === ServerType.AUDIOBOOKSHELF &&
            track.itemId
        ) {
            const progress = await loadAbsCurrentProgress(
                absAuth,
                track.itemId,
                track.episodeId ?? track.id,
            );
            if (!isCurrentRequest()) return;
            if (progress?.currentTimeSeconds && progress.currentTimeSeconds > 0) {
                trackToPlay = { ...track, startSeconds: progress.currentTimeSeconds };
            }
        }

        // Podcast offline path: the ABS /play endpoint that normally builds the
        // streaming URL fails offline, so synthesize a MobilePlayableAudio
        // directly from the downloaded file when one exists for this episode.
        if (detail.type === MobileMediaDetailType.PODCAST) {
            const lookupTrackId = trackToPlay.episodeId ?? trackToPlay.id;
            const localDownload = await getLocalDownloadForTrack(
                lookupTrackId,
                detail.source.id,
            );
            if (!isCurrentRequest()) return;
            if (localDownload) {
                const playable = buildOfflinePodcastEpisodePlayable(
                    detail,
                    trackToPlay,
                    localDownload.localUri,
                    localDownload.sourceUrl,
                    absAuth,
                );
                if (absAuth && trackToPlay.itemId) {
                    absContextRef.current = {
                        authentication: absAuth,
                        durationSeconds: trackToPlay.durationSeconds ?? 0,
                        episodeId: trackToPlay.episodeId,
                        itemId: trackToPlay.itemId,
                    };
                } else {
                    absContextRef.current = null;
                }
                if (!isCurrentRequest()) return;
                await handlePlayItem(playable, [playable], 0, { shuffled: false });
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
                const targetBookSeconds = trackToPlay.startSeconds ?? 0;
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
                        absAuth,
                    ),
                );
                if (absAuth && trackToPlay.itemId) {
                    const totalDurationSeconds = offlineFiles.reduce(
                        (sum, file) => sum + (file.durationSeconds ?? 0),
                        0,
                    );
                    absContextRef.current = {
                        authentication: absAuth,
                        durationSeconds: totalDurationSeconds,
                        episodeId: undefined,
                        itemId: trackToPlay.itemId,
                    };
                } else {
                    absContextRef.current = null;
                }
                if (!isCurrentRequest()) return;
                await handlePlayItem(queue[startIndex], queue, startIndex, { shuffled: false });
                return;
            }
        }

        try {
            const playable = await loadAndroidMediaTrackPlayback(
                serverConnections,
                detail,
                trackToPlay,
            );
            if (!isCurrentRequest()) return;

            if (
                absAuth &&
                (playable.source === 'audiobook' || playable.source === 'podcast') &&
                trackToPlay.itemId
            ) {
                absContextRef.current = {
                    authentication: absAuth,
                    durationSeconds: playable.durationSeconds ?? 0,
                    episodeId: trackToPlay.episodeId,
                    itemId: trackToPlay.itemId,
                };
            } else {
                absContextRef.current = null;
            }

            if (!isCurrentRequest()) return;
            await handlePlayItem(playable, [playable], index, { shuffled: false });
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

            await handlePlayItem(shuffled[0], shuffled, 0, { shuffled: true });
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

            await handlePlayItem(shuffled[0], shuffled, 0, { shuffled: true });
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

    const handleAddRadioStation = useCallback(
        async (input: AddAndroidRadioStationInput): Promise<AddAndroidRadioStationResult> => {
            const result = await addAndroidRadioStation(input);
            await loadHomeForConnections(serverConnections);
            return result;
        },
        [loadHomeForConnections, serverConnections],
    );

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
            await handlePlayItem(queue[0], queue, 0, { shuffled: false });
        } catch (error) {
            setContextMenuFeedback(
                error instanceof Error ? error.message : 'Could not start Song Radio.',
            );
        }
    };

    const canAppendToPlaybackQueue =
        activePlaybackItem !== null && activePlaybackItem.source !== 'radio';

    const appendPlayableItemsToQueue = useCallback(
        (items: MobilePlayableAudio[]): number => {
            const queueableItems = items.filter((item) => item.source !== 'radio');
            const playbackState = getAndroidPlaybackState();

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
            forcePlaybackQueueRender((version) => version + 1);

            return queueableItems.length;
        },
        [],
    );

    const loadDetailForContextAction = useCallback(
        async (item: AndroidRecentContentSourceItem): Promise<MobileMediaDetail | null> => {
            const cacheKey = getRecentContentItemKey(item);
            let detail = mediaDetailCacheRef.current.get(cacheKey);

            if (!detail) {
                const fromDisk = await loadCachedMediaDetail(cacheKey);
                if (fromDisk) {
                    detail = fromDisk;
                    rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromDisk);
                }
            }

            if (!detail && isOfflineMode) {
                const downloadedDetail = await buildDownloadedMusicDetail(item);
                if (downloadedDetail) {
                    detail = downloadedDetail;
                    rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, downloadedDetail);
                }
            }

            if (detail && isOfflineMode) {
                return detail;
            }

            const next = await loadAndroidMediaDetail(serverConnections, item);
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
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
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromDisk);
            }
        }
        if (!detail) {
            const next = await loadAndroidMediaDetail(serverConnections, item);
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
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
        const playbackState = getAndroidPlaybackState();

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
                setAndroidPlaybackState({ ...playbackState, status: 'paused' });

                const absCtx = absContextRef.current;

                if (absCtx) {
                    void syncAbsProgressImmediate(
                        absCtx,
                        getAbsProgressSeconds(
                            absCtx,
                            playbackState.positionMs,
                            playbackState.item,
                        ),
                    );
                }

                return;
            }

            if (isLivePlayback(playbackState)) {
                await playQueuedItem(playbackState.item, [playbackState.item], 0, {
                    shuffled: false,
                });
                return;
            }

            await resumeAndroidAudio();
            setAndroidPlaybackState({ ...playbackState, status: 'playing' });
        } catch (error) {
            setAndroidPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Playback command failed',
                status: 'error',
            });
        }
    };

    const handleSeekPlayback = async (positionMs: number) => {
        const playbackState = getAndroidPlaybackState();

        if (playbackState.status === 'idle' || isLivePlayback(playbackState)) {
            return;
        }

        const durationMs = getPlaybackDurationMs(playbackState);
        const nextPositionMs = clamp(positionMs, 0, durationMs ?? Math.max(0, positionMs));

        setAndroidPlaybackState((current) =>
            current.status === 'idle' ? current : { ...current, positionMs: nextPositionMs },
        );

        try {
            const event = await seekAndroidAudio(nextPositionMs);
            const absCtx = absContextRef.current;

            if (absCtx) {
                void syncAbsProgressImmediate(
                    absCtx,
                    getAbsProgressSeconds(absCtx, nextPositionMs, playbackState.item),
                );
            }

            setAndroidPlaybackState((current) => {
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
            setAndroidPlaybackState({
                ...playbackState,
                message: error instanceof Error ? error.message : 'Seek failed',
                status: 'error',
            });
        }
    };

    const handleSkipPlayback = async (offsetSeconds: number) => {
        const playbackState = getAndroidPlaybackState();

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
                forcePlaybackQueueRender((version) => version + 1);
            }

            // Turning shuffle off does not restore the original order (matches Apple
            // Music behavior). Pick the album again to get sequential playback.
            return next;
        });
    }, []);

    const handleNavigatePlayback = async (direction: -1 | 1) => {
        const playbackState = getAndroidPlaybackState();

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
                const playbackState = getAndroidPlaybackState();
                const fresh = await loadAbsCurrentProgress(
                    absCtx.authentication,
                    absCtx.itemId,
                    absCtx.episodeId,
                );
                const currentPosMs =
                    playbackState.status !== 'idle'
                        ? getAbsProgressSeconds(
                              absCtx,
                              playbackState.positionMs,
                              playbackState.item,
                          ) * 1000
                        : 0;
                if (
                    fresh &&
                    fresh.currentTimeSeconds * 1000 > currentPosMs + 5_000
                ) {
                    // Only seek forward and only if the gap is meaningful; a
                    // 5-second buffer keeps us from interrupting playback when
                    // local and server values trivially differ.
                    await handleSeekPlayback(
                        getPlayerPositionMsForAbsProgress(
                            fresh.currentTimeSeconds,
                            playbackState.status !== 'idle' ? playbackState.item : undefined,
                        ),
                    );
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
    }, [loadHomeForConnections, serverConnections]);

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
        setServerUrl((current) =>
            current.trim().length === 0 ? DEFAULT_SERVER_URL : addDefaultHttpScheme(current),
        );
        setActiveUtilityScreen('add-server');
    }, []);
    const handleServerUrlBlur = useCallback(() => {
        setServerUrl((current) => addDefaultHttpScheme(current) || DEFAULT_SERVER_URL);
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

    const handleTabPress = useCallback(
        (tabId: SamoMobileTabId) => {
            setActiveUtilityScreen((current) => (current === null ? current : null));
            if (mediaDetailState.status !== 'idle') {
                closeMediaDetail();
            }
            setActiveTab((current) => (current === tabId ? current : tabId));
        },
        [closeMediaDetail, mediaDetailState.status],
    );

    const utilityScreenContent =
        activeUtilityScreen === 'settings' ? (
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
        ) : null;

    const renderTabSceneContent = (tabId: SamoMobileTabId) => (
        <Fragment>
            {tabId === 'home' && !isSearchOverlayOpen ? (
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
            {tabId === 'home' ? (
                <HomeScreen
                    homeContentState={visibleHomeContentState}
                    onManageServers={handleOpenManageServers}
                    onSelectItem={handleSelectMediaItemStable}
                    onViewAll={handleOpenViewAll}
                    recentItems={visibleRecentItems}
                    serverConnections={serverConnections}
                />
            ) : tabId === 'playlists' ? (
                <PlaylistsScreen
                    homeContentState={visibleHomeContentState}
                    onSelectItem={handleSelectMediaItemStable}
                    onShufflePlay={handleShuffleHomeItems}
                    recentItems={visibleRecentItems}
                />
            ) : tabId === 'library' ? (
                <LibraryScreen
                    fullCollections={libraryFullCollections}
                    fullCollectionsEnabled={!isOfflineMode}
                    hasServerConnections={serverConnections.length > 0}
                    homeContentState={visibleHomeContentState}
                    onSelectItem={handleSelectMediaItemStable}
                    recentItems={visibleRecentItems}
                />
            ) : tabId === 'search' ? (
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
            ) : tabId === 'radio' ? (
                <RadioScreen
                    homeContentState={visibleHomeContentState}
                    nowPlayingRadioId={nowPlayingRadioId}
                    onAddStation={handleAddRadioStation}
                    onSelectItem={handleSelectMediaItemStable}
                    recentItems={visibleRecentItems}
                    serverConnections={serverConnections}
                />
            ) : (
                <EmptyServerBackedScreen tabTitle={getTabTitle(tabId)} />
            )}
        </Fragment>
    );

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
        <ErrorBoundary label="App">
        <MediaContextMenuContext.Provider value={mediaContextMenuApi}>
        <DownloadedCollectionKeysContext.Provider value={downloadedCollectionKeys}>
        <DownloadedTrackKeysContext.Provider value={downloadedTrackKeys}>
        <View style={styles.safeArea}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <View style={styles.root}>
                    {activeUtilityScreen === 'view-all' && viewAllRoute ? (
                        // ViewAllScreen renders its own recycled list — keep it
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
                    ) : utilityScreenContent ? (
                        <ScrollView
                            contentContainerStyle={styles.content}
                            style={styles.tabUtilityScene}
                        >
                            {utilityScreenContent}
                        </ScrollView>
                    ) : (
                        <View style={styles.tabSceneHost}>
                            {SAMO_MOBILE_TABS.map((tab) => {
                                const isSceneActive = tab.id === activeTab;
                                const sceneStyle = [
                                    styles.tabScene,
                                    isSceneActive ? styles.tabSceneActive : styles.tabSceneHidden,
                                ];

                                if (tab.id === 'library') {
                                    return (
                                        <View
                                            key={tab.id}
                                            pointerEvents={isSceneActive ? 'auto' : 'none'}
                                            style={sceneStyle}
                                        >
                                            {renderTabSceneContent(tab.id)}
                                        </View>
                                    );
                                }

                                return (
                                    <ScrollView
                                        contentContainerStyle={styles.content}
                                        key={tab.id}
                                        pointerEvents={isSceneActive ? 'auto' : 'none'}
                                        style={sceneStyle}
                                    >
                                        {renderTabSceneContent(tab.id)}
                                    </ScrollView>
                                );
                            })}
                        </View>
                    )}
                    <NowPlayingMetadataSync />
                    <ConnectedMiniPlayer
                        artworkUrl={currentHighResArtworkUrl}
                        lastPlayedItem={lastPlayedItem}
                        onOpenFullPlayer={handleOpenFullPlayer}
                        onTogglePlayback={handleTogglePlayback}
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
                        <ConnectedFullScreenPlayer
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
                                    onPressIn={() => handleTabPress(tab.id)}
                                    onPress={() => handleTabPress(tab.id)}
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
        </DownloadedCollectionKeysContext.Provider>
        </MediaContextMenuContext.Provider>
        </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

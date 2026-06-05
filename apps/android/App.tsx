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
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    removeServerAuthentication,
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
    upsertServerAuthentication,
} from '@samo/core/server';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { getColors as getImageColors } from 'react-native-image-colors';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import ditherTexture from './assets/dither.png';
import samoLogo from './assets/samo-logo.png';
import { ArtworkImage } from './src/components/ArtworkImage';
import { ArtworkZoomModal } from './src/components/ArtworkZoomModal';
import { BookInformationModal } from './src/components/BookInformationModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import {
    CastGlyph,
    CheckGlyph,
    CircularDownloadGlyph,
    ClearGlyph,
    DownCaretGlyph,
    EllipsisVerticalGlyph,
    FullPlayerImageGlyph,
    GearGlyph,
    MoreGlyph,
    PlayCircleGlyph,
    PlayPauseGlyph,
    PlusGlyph,
    SearchGlyph,
    ShuffleGlyph,
    SleepTimerGlyph,
    SortGlyph,
    TabIcon,
    TrackDownloadedGlyph,
    TrackSkipGlyph,
} from './src/components/Glyphs';
import { InlineSearchBar } from './src/components/InlineSearchBar';
import { LibraryListRow } from './src/components/LibraryListRow';
import { LibrarySortMenu } from './src/components/LibrarySortMenu';
import { MediaArtwork } from './src/components/MediaArtwork';
import { MediaContextMenu } from './src/components/MediaContextMenu';
import { QualityBadge, QualityBadgeRow } from './src/components/QualityBadge';
import { SegmentedSeekBar } from './src/components/SegmentedSeekBar';
import { StreamInfoModal } from './src/components/StreamInfoModal';
import { SwipeDismissSheet } from './src/components/SwipeDismissSheet';
import { TrackPlaylistMenu } from './src/components/TrackPlaylistMenu';
import { WarningList } from './src/components/WarningList';
import {
    DownloadedCollectionKeysContext,
    DownloadedTrackKeysContext,
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from './src/contexts/downloaded-keys';
import { MediaContextMenuContext } from './src/contexts/media-context-menu';
import { ServerConnectionsContext } from './src/contexts/server-connections';
import { useAndroidCastSync } from './src/hooks/use-android-cast-sync';
import { useAndroidContextMenu } from './src/hooks/use-android-context-menu';
import {
    useAndroidMediaHandlerDeps,
    useAndroidMediaHandlers,
} from './src/hooks/use-android-media-handlers';
import { useAndroidNativePlayback } from './src/hooks/use-android-native-playback';
import { useAndroidRadioMetadataSync } from './src/hooks/use-android-radio-metadata-sync';
import { useAndroidPlaybackControls } from './src/hooks/use-android-playback-controls';
import { useAndroidServerAuth } from './src/hooks/use-android-server-auth';
import { useReducedMotionPreference } from './src/hooks/use-reduced-motion-preference';
import { useStableCallback } from './src/hooks/use-stable-callback';
import {
    PLAYER_CLOSE_SPRING,
    PLAYER_OPEN_SPRING,
    tabBarSinkTranslateY,
    worldDimOpacity,
} from './src/player/player-motion';
import {
    ConnectedFullScreenPlayer,
    ConnectedMiniPlayer,
    NowPlayingMetadataSync,
    OutputPickerModal,
} from './src/player/PlayerSurface';
import { AddServerScreen } from './src/screens/AddServerScreen';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { EmptyServerBackedScreen } from './src/screens/EmptyServerBackedScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ManageServersScreen } from './src/screens/ManageServersScreen';
import { MediaDetailContent } from './src/screens/MediaDetailScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { RadioScreen } from './src/screens/RadioScreen';
import { SearchOverlay, SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ViewAllScreen } from './src/screens/ViewAllScreen';
import { loadAbsCurrentProgress } from './src/services/abs-progress';
import {
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    type AndroidNativePlaybackEvent,
    cancelAndroidSleepTimer,
    selectAndroidOutputRoute,
    setAndroidSleepTimer,
    updateAndroidNowPlayingMetadata,
} from './src/services/audio-playback';
import { prefetchCatalogArtwork } from './src/services/artwork-prefetch';
import { loadCatalogHomeContentSync } from './src/services/catalog/catalog-reads';
import { syncSamoCatalog } from './src/services/catalog/catalog-sync';
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
    resumeDownloadsOnForeground,
    subscribeDownloads,
} from './src/services/download-manager';
import {
    type AndroidFullCollectionState,
    loadAndroidFullCollection,
    loadAndroidFullCollectionLocal,
    loadAndroidFullCollectionLocalSync,
} from './src/services/full-collection';
import { triggerSelection } from './src/services/haptics';
import {
    type AndroidHomeContentState,
    loadAndroidHomeContent,
    reconcileHomeContent,
} from './src/services/home-content';
import { loadCachedHomeContent, saveCachedHomeContent } from './src/services/home-content-cache';
import { buildHomeLoadKey, dedupeInFlight } from './src/services/in-flight-requests';
import {
    loadPersistedLastPlayedItem,
    savePersistedLastPlayedItem,
} from './src/services/last-played-item';
import {
    type AndroidLibraryRelevantState,
    loadAndroidLibraryRelevantContent,
} from './src/services/library-content';
import {
    type AndroidLocalFavoriteItem,
    getLocalFavoriteKey,
    loadLocalFavorites,
    saveLocalFavorites,
    toggleLocalFavorite,
} from './src/services/local-favorites';
import {
    addAndroidMediaTrackToPlaylist,
    type AndroidMediaDetailState,
    loadAndroidMediaDetail,
    loadAndroidMediaTrackPlayback,
} from './src/services/media-detail';
import { loadCachedMediaDetail, saveCachedMediaDetail } from './src/services/media-detail-cache';
import { loadOfflineModePreference, saveOfflineModePreference } from './src/services/offline-mode';
import {
    getPersistedServerAuthKey,
    loadPersistedServerAuthsWithMeta,
    savePersistedServerAuths,
} from './src/services/persisted-server';
import { formatQualityProfile } from './src/services/quality-badge-assets';
import {
    addAndroidRadioStation,
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from './src/services/radio-stations';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    isEligibleRecentlyPlayedSurfaceItem,
    loadPersistedRecentContentItems,
    savePersistedRecentContentItems,
    upsertRecentContentItem,
} from './src/services/recent-content';
import { mergeServerRecentlyPlayedIntoRecents } from './src/services/recent-content-sync';
import {
    collectFreshAlbumItems,
    reconcileRecentContentItemsIfChanged,
} from './src/utils/recent-content-dedupe';
import { type AndroidSearchState, loadAndroidSearchResults } from './src/services/search-content';
import { type AndroidAuthState, authenticateServer } from './src/services/server-auth';
import {
    type AndroidServerHealthMap,
    checkAndroidServerConnections,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from './src/services/server-health';
import {
    getAndroidPlaybackState,
    selectActiveAndroidPlaybackItem,
    setAndroidPlaybackState,
    useAndroidPlaybackState,
} from './src/state/playback-store';
import { getPlaybackQueue, usePlaybackQueue } from './src/state/playback-queue-store';
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
import { styles } from './src/theme/styles';
import { colors, spacing } from './src/theme/tokens';
import { type AndroidUtilityScreen } from './src/types/app-navigation';
import { type BookInfoState } from './src/types/book-info';
import { type HomeDisplaySection } from './src/types/home';
import { type LibraryDisplayItem } from './src/types/library-display';
import {
    EMPTY_LIBRARY_FULL_COLLECTIONS,
    EMPTY_LIBRARY_RELEVANT_STATE,
    LIBRARY_FILTERS,
    LIBRARY_SORTS,
    type LibraryFilter,
    type LibraryFullCollectionsState,
    type LibrarySort,
} from './src/types/library-tab';
import { type AndroidPlaybackState } from './src/types/playback';
import { type ViewAllRoute } from './src/types/view-all';
import {
    getAbsProgressSeconds,
    getPlayerPositionMsForAbsProgress,
} from './src/utils/abs-progress-math';
import {
    HOME_ARTWORK_PREFETCH_LIMIT,
    LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS,
} from './src/utils/app-constants';
import { getContentSourceFromPlaybackItem } from './src/utils/content-source';
import { addDefaultHttpScheme, DEFAULT_SERVER_URL, hasServerUrlTarget } from './src/utils/auth-url';
import { getContentItemKey } from './src/utils/content-item';
import { getDownloadedCollectionKey, getDownloadedTrackKey } from './src/utils/download-keys';
import {
    buildDownloadedCollectionSnapshot,
    type DownloadedCollectionSnapshot,
    type DownloadedCollectionSummary,
    EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT,
} from './src/utils/downloaded-collections';
import {
    getSectionsById,
    getViewAllVariant,
    resolveItemArtworkUrl,
    sortHomeItemsByRecents,
} from './src/utils/home-display';
import { getLastPlayedPersistenceKey } from './src/utils/last-played';
import { refreshPlayableResumeFromServer } from './src/utils/playback-resume';
import { getLibraryMediaType, toLibraryDisplayItem } from './src/utils/library-display';
import {
    artworkSourceUri,
    backfillItemArtworkFields,
    prefetchArtworkSource,
    preparePlaybackItemForNative,
    resolvePlaybackArtworkSourceForDisplay,
    resolveSamoItemArtworkSourceForDisplay,
} from './src/utils/samo-artwork-url';
import { detailHasHiRes } from './src/utils/media-quality';
import { buildOfflineHomeContentState } from './src/utils/offline-home';
import { buildDownloadedMusicDetail } from './src/utils/offline-music-detail';
import {
    buildOfflineAudiobookPlayable,
    buildOfflinePodcastEpisodePlayable,
    mimeFromCastUri,
    pickAudiobookFileIndexForTime,
} from './src/utils/offline-playback';
import {
    findActiveChapterIndex,
    formatChapterRange,
    formatPlaybackTime,
    getDisplaySubtitle,
    getDurationLabel,
    getPlaybackDisplayMetadata,
    getPlaybackItemDurationMs,
    looksLikeUrl,
} from './src/utils/playback-time';
import { getPlaylistTargetsForRoot } from './src/utils/playlist-targets';
import { ANDROID_SERVER_TYPES } from './src/utils/server-types';
import { getTabTitle } from './src/utils/tab-title';

export default function App() {
    const mediaHandlersRef = useRef<null | ReturnType<typeof useAndroidMediaHandlers>>(null);
    const libraryRelevantFetchTokenRef = useRef(0);
    const [libraryRelevantState, setLibraryRelevantState] = useState<AndroidLibraryRelevantState>(
        EMPTY_LIBRARY_RELEVANT_STATE,
    );
    const { auth, downloads, navigation, overlays, session } = useAndroidMediaHandlerDeps({
        navigation: {
            onCloseMediaDetailSideEffects: () => {
                mediaHandlersRef.current?.invalidateMediaDetailRequests();
            },
            onCloseViewAllSideEffects: () => {
                mediaHandlersRef.current?.bumpViewAllFetchToken();
            },
        },
        overlays: {
            onCloseBookInfoSideEffects: () => {
                mediaHandlersRef.current?.bumpBookInfoRequestId();
            },
        },
    });
    const {
        activeTab,
        activeUtilityScreen,
        closeMediaDetail,
        closeViewAll,
        homeContentState,
        homeLoadRequestId,
        isFullPlayerOpen,
        isSearchOverlayOpen,
        libraryFullCollectionFetchTokenRef,
        libraryFullCollections,
        mediaDetailState,
        searchOverlayQuery,
        searchState,
        setActiveTab,
        setActiveUtilityScreen,
        setHomeContentState,
        setIsFullPlayerOpen,
        setIsSearchOverlayOpen,
        setLibraryFullCollections,
        setMediaDetailState,
        setSearchOverlayQuery,
        setSearchState,
        setViewAllFullState,
        setViewAllRoute,
        viewAllFullState,
        viewAllRoute,
    } = navigation;
    const {
        authState,
        password,
        serverConnections,
        serverHealthByKey,
        serverType,
        serverUrl,
        setAuthState,
        setPassword,
        setServerConnections,
        setServerHealthByKey,
        setServerType,
        setServerUrl,
        setUsername,
        username,
    } = auth;
    const {
        artworkCacheLimitBytes,
        downloadedCollectionKeys,
        downloadedCollections,
        downloadedTrackKeys,
        isOfflineMode,
        setArtworkCacheLimit,
        setIsOfflineMode,
    } = downloads;
    const {
        bookInfoState,
        closeBookInfo,
        playlistMenuRoot,
        playlistMenuRootState,
        setBookInfoState,
        setPlaylistMenuRoot,
        setPlaylistMenuRootState,
        setStreamInfoItem,
        streamInfoItem,
    } = overlays;
    const {
        castState,
        isShuffled,
        lastPlayedItem,
        localFavorites,
        recentContentItems,
        setFavoritedKeys,
        setIsShuffled,
        setLastPlayedItem,
        setLocalFavorites,
        setRecentContentItems,
    } = session;
    // Unified animation source for the MiniPlayer ↔ FullScreenPlayer transition.
    // 0 = miniplayer visible, 1 = fullscreen visible. Both components derive
    // their frame, opacity, and touchability from this single shared value so
    // the motion reads as one physical object expanding or collapsing.
    const playerProgress = useSharedValue(0);
    const [outputPickerVisible, setOutputPickerVisible] = useState(false);
    const reducedMotion = useReducedMotionPreference();
    const tabBarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: tabBarSinkTranslateY(playerProgress.value) }],
    }));
    // World dim — the desk going darker under the card lifting off it. Lives
    // above the page content + tab bar, below the player shell.
    const worldDimStyle = useAnimatedStyle(() => ({
        opacity: worldDimOpacity(playerProgress.value),
    }));
    useEffect(() => {
        const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING;
        const closeSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING;
        if (isFullPlayerOpen) {
            playerProgress.value = withSpring(1, openSpring);
            return;
        }
        // Gesture dismiss already animates playerProgress to 0 and calls onClose
        // from the spring onFinish callback — avoid restarting the close motion.
        if (playerProgress.value > 0.001) {
            playerProgress.value = reducedMotion
                ? withTiming(0, { duration: 0 })
                : withSpring(0, closeSpring);
        }
    }, [isFullPlayerOpen, playerProgress, reducedMotion]);
    const {
        absContextRef,
        handlePlayItem,
        playbackSnapshotRef,
        playQueuedItem,
        registerNavigatePlayback,
    } = useAndroidNativePlayback({ isFullPlayerOpen, lastPlayedItem, serverConnections });
    const queue = usePlaybackQueue();
    useAndroidRadioMetadataSync(serverConnections);
    useAndroidCastSync();
    const lastPlayedPersistenceKeyRef = useRef<null | string>(null);
    const isHomeSurface =
        activeTab === 'home' && activeUtilityScreen === null && mediaDetailState.status === 'idle';
    const frozenDetailStateRef = useRef(mediaDetailState);
    if (mediaDetailState.status === 'loaded') {
        frozenDetailStateRef.current = mediaDetailState;
    }
    const detailOverlayOpen = activeUtilityScreen === null && mediaDetailState.status !== 'idle';
    const hasCachedDetailShell = frozenDetailStateRef.current.status === 'loaded';

    // Detail overlay entrance: a quick fade + small rise so opening a playlist /
    // album / artist reads as a card lifting in rather than a hard cut. Honors
    // the OS reduced-motion setting.
    const detailOverlayProgress = useSharedValue(0);
    useEffect(() => {
        // Ease-OUT (fast start) so the content is visibly there within a frame or
        // two — the tap is confirmed immediately instead of fading up from black.
        // Short durations keep open AND back-to-home feeling instant.
        detailOverlayProgress.value = withTiming(detailOverlayOpen ? 1 : 0, {
            duration: reducedMotion ? 0 : detailOverlayOpen ? 150 : 110,
            easing: Easing.out(Easing.cubic),
        });
    }, [detailOverlayOpen, detailOverlayProgress, reducedMotion]);
    const detailOverlayStyle = useAnimatedStyle(() => ({
        opacity: detailOverlayProgress.value,
        transform: [{ translateY: (1 - detailOverlayProgress.value) * 10 }],
    }));

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
        const withoutArtists = recentContentItems.filter((entry) =>
            isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong }),
        );
        const filtered = isOfflineMode
            ? withoutArtists.filter((entry) =>
                  downloadedCollectionKeys.has(
                      getDownloadedCollectionKey(entry.item.source?.id, entry.item.id),
                  ),
              )
            : withoutArtists;
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
                      artworkImageId: entry.item.artworkImageId ?? fresh.artworkImageId,
                      artworkUrl: entry.item.artworkUrl ?? fresh.artworkUrl,
                      isHiRes: entry.item.isHiRes ?? fresh.isHiRes,
                      qualityProfile:
                          'qualityProfile' in entry.item
                              ? (entry.item.qualityProfile ?? fresh.qualityProfile)
                              : fresh.qualityProfile,
                  }
                : entry.item;
            // Recents persisted before subsonicCoverArtUrl learned the
            // entity-id fallback were stored without artworkUrl. Backfill
            // at render time so they pick up real covers as soon as the
            // matching server is connected, without rewriting storage.
            if (!merged.artworkUrl && !merged.artworkImageId) {
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
        async (
            authentications: ServerAuthenticationResult[],
            options?: { force?: boolean },
        ) => {
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

            // Seed Home SYNCHRONOUSLY from the on-device catalog so a cold launch
            // renders on the first frame instead of a spinner. Never clobbers an
            // already-loaded state — the persisted cache and the network refresh
            // below both take precedence.
            const homeSeed = loadCatalogHomeContentSync(authentications);
            if (homeSeed) {
                setHomeContentState((current) =>
                    current.status === 'loaded'
                        ? current
                        : { content: homeSeed, status: 'loaded' },
                );
            }

            const nextHomeContentState = await dedupeInFlight(
                buildHomeLoadKey(authentications),
                () => loadAndroidHomeContent(authentications),
            );

            if (requestId === homeLoadRequestId.current) {
                // A network result may only REPLACE what's on screen when it
                // actually carries content. A transient failure (error) or an
                // empty payload must NEVER clobber the cache/seed already
                // showing — that was the "reopen → network request failed → no
                // server-backed Home content" regression, where a failed refetch
                // wiped perfectly good content off the screen and left the user
                // staring at an empty state.
                setHomeContentState((current) => {
                    if (
                        nextHomeContentState.status === 'loaded' &&
                        nextHomeContentState.content.sections.length > 0
                    ) {
                        // Only re-render Home with fresh network data when the
                        // user explicitly asked for it (pull-to-refresh / manual
                        // sync) or there's nothing on screen yet. Otherwise Home
                        // renders from the local cache/seed and STAYS PUT —
                        // nothing pops in late, no flash. The fresh result is
                        // still cached below, so the next open shows it instantly.
                        if (options?.force || current.status !== 'loaded') {
                            return current.status === 'loaded'
                                ? {
                                      content: reconcileHomeContent(
                                          current.content,
                                          nextHomeContentState.content,
                                      ),
                                      status: 'loaded',
                                  }
                                : nextHomeContentState;
                        }
                        return current;
                    }
                    // Keep good content visible; only surface an error/empty
                    // state when there is nothing else to show.
                    return current.status === 'loaded' ? current : nextHomeContentState;
                });
                if (
                    nextHomeContentState.status === 'loaded' &&
                    nextHomeContentState.content.sections.length > 0
                ) {
                    void saveCachedHomeContent(nextHomeContentState.content);
                    const mergedRecents = await mergeServerRecentlyPlayedIntoRecents(
                        await loadPersistedRecentContentItems(),
                        authentications,
                        nextHomeContentState.content,
                    );
                    setRecentContentItems((current) => {
                        const next = reconcileRecentContentItemsIfChanged(
                            mergedRecents,
                            collectFreshAlbumItems(nextHomeContentState.content.sections),
                        );
                        if (next !== current) {
                            void savePersistedRecentContentItems(next);
                        }
                        return next;
                    });
                }
            }
        },
        [],
    );

    // (Removed) The Discover / Podcast-feed live refresh used to re-fetch those
    // sections on every return to Home and patch them in AFTER the page was up —
    // that was the "podcast feed loads in late / flashes" complaint. Those
    // sections already come from the base Home load + cache, so Home now renders
    // everything at once and stays put; pull-to-refresh is the only thing that
    // pulls fresh content.

    // Warm the whole library's cover art from the existing catalog once on
    // launch (already-cached covers are skipped cheaply), so simply reopening the
    // app — not only a fresh sync — gets the all-local, no-per-tile-fetch feel.
    // Deferred so a cold-cache bulk download doesn't contend with the initial
    // home load + live refresh for the network (which was failing those requests
    // and hiding the podcast feed).
    const artworkWarmedRef = useRef(false);
    useEffect(() => {
        if (artworkWarmedRef.current || serverConnections.length === 0) {
            return;
        }
        artworkWarmedRef.current = true;
        const connections = serverConnections;
        const timer = setTimeout(() => {
            void prefetchCatalogArtwork(connections);
        }, 8000);
        return () => clearTimeout(timer);
    }, [serverConnections]);

    // Resume any stranded downloads when the app returns to the foreground —
    // re-queues transfers the OS suspended in the background and pumps the queue
    // so it doesn't sit on "queued" forever after a backgrounding.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                void resumeDownloadsOnForeground(serverConnections);
            }
        });
        return () => subscription.remove();
    }, [serverConnections]);

    const { canConnect, handleConnect, handleDisconnect } = useAndroidServerAuth({
        auth,
        closeMediaDetail,
        loadHomeForConnections,
        setActiveUtilityScreen,
        setHomeContentState,
        setSearchState,
    });

    const startLibraryFullCollectionLoad = useStableCallback(() => {
        if (
            isOfflineMode ||
            serverConnections.length === 0 ||
            homeContentState.status !== 'loaded'
        ) {
            return;
        }

        setLibraryFullCollections((current) => {
            if (
                current.albums.status === 'loading' ||
                current.artists.status === 'loading' ||
                (current.albums.status === 'loaded' && current.artists.status === 'loaded')
            ) {
                return current;
            }

            const requestId = (libraryFullCollectionFetchTokenRef.current += 1);
            void (async () => {
                // Local-first: paint the catalog instantly, then refresh from
                // the network so additions/edits self-heal.
                const [localAlbums, localArtists] = await Promise.all([
                    loadAndroidFullCollectionLocal(serverConnections, 'album'),
                    loadAndroidFullCollectionLocal(serverConnections, 'artist'),
                ]);
                if (libraryFullCollectionFetchTokenRef.current !== requestId) {
                    return;
                }
                if (localAlbums || localArtists) {
                    setLibraryFullCollections({
                        albums: localAlbums
                            ? { items: localAlbums, status: 'loaded' }
                            : { status: 'loading' },
                        artists: localArtists
                            ? { items: localArtists, status: 'loaded' }
                            : { status: 'loading' },
                    });
                }

                const [albums, artists] = await Promise.all([
                    loadAndroidFullCollection(serverConnections, 'album'),
                    loadAndroidFullCollection(serverConnections, 'artist'),
                ]);

                if (libraryFullCollectionFetchTokenRef.current !== requestId) {
                    return;
                }

                setLibraryFullCollections({ albums, artists });
            })();

            // Synchronous first paint from the catalog so the Library grids mount
            // with content immediately — no loading state. The async block above
            // then fills the complete lists and refreshes from the network.
            const syncAlbums = loadAndroidFullCollectionLocalSync(serverConnections, 'album');
            const syncArtists = loadAndroidFullCollectionLocalSync(serverConnections, 'artist');
            return {
                albums:
                    syncAlbums.length > 0
                        ? { items: syncAlbums, status: 'loaded' }
                        : { status: 'loading' },
                artists:
                    syncArtists.length > 0
                        ? { items: syncArtists, status: 'loaded' }
                        : { status: 'loading' },
            };
        });
    });

    const ensureLibraryFullCollections = startLibraryFullCollectionLoad;

    const startLibraryRelevantLoad = useStableCallback(() => {
        if (isOfflineMode || serverConnections.length === 0) {
            return;
        }

        setLibraryRelevantState((current) =>
            current.status === 'loaded' ? current : { status: 'loading' },
        );
        const requestId = (libraryRelevantFetchTokenRef.current += 1);
        void (async () => {
            const next = await loadAndroidLibraryRelevantContent(serverConnections);
            if (libraryRelevantFetchTokenRef.current !== requestId) {
                return;
            }
            setLibraryRelevantState(next);
        })();
    });

    useEffect(() => {
        if (isOfflineMode || serverConnections.length === 0) {
            libraryRelevantFetchTokenRef.current += 1;
            setLibraryRelevantState(EMPTY_LIBRARY_RELEVANT_STATE);
            libraryFullCollectionFetchTokenRef.current += 1;
            setLibraryFullCollections(EMPTY_LIBRARY_FULL_COLLECTIONS);
            return;
        }

        if (homeContentState.status !== 'loaded') {
            return;
        }

        const timeout = setTimeout(
            startLibraryRelevantLoad,
            LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS,
        );

        return () => {
            clearTimeout(timeout);
        };
    }, [homeContentState.status, isOfflineMode, serverConnections, startLibraryRelevantLoad]);

    useEffect(() => {
        if (serverConnections.length === 0) {
            return;
        }

        void Promise.all(
            serverConnections
                .filter((authentication) => authentication.type === ServerType.SAMO)
                .map((authentication) =>
                    ensureSamoStreamToken(authentication).catch(() => undefined),
                ),
        );
    }, [serverConnections]);

    // Warm the first visible covers into memory + disk so round-tripping
    // through detail pages does not refetch art the home screen just showed.
    useEffect(() => {
        if (homeContentState.status !== 'loaded') return;
        const sources: Array<string | { headers: Record<string, string>; uri: string }> = [];
        for (const section of homeContentState.content.sections) {
            for (const item of section.items.slice(0, HOME_ARTWORK_PREFETCH_LIMIT)) {
                const resolved = resolveSamoItemArtworkSourceForDisplay(
                    {
                        artworkImageId: item.artworkImageId,
                        artworkUrl: item.artworkUrl,
                        source: item.source,
                    },
                    serverConnections,
                );
                if (resolved) {
                    sources.push(resolved);
                }
            }
        }
        if (sources.length > 0) {
            for (const source of sources.slice(0, HOME_ARTWORK_PREFETCH_LIMIT)) {
                prefetchArtworkSource(source);
            }
        }
    }, [homeContentState, serverConnections]);

    useEffect(() => {
        if (serverConnections.length === 0) {
            return;
        }

        setRecentContentItems((current) => {
            let changed = false;
            const next = current.map((entry) => {
                const patched = backfillItemArtworkFields(entry.item, serverConnections);
                if (patched === entry.item) {
                    return entry;
                }
                changed = true;
                return { ...entry, item: patched };
            });
            return changed ? next : current;
        });
    }, [serverConnections, setRecentContentItems]);

    useEffect(() => {
        if (serverConnections.length === 0 || !lastPlayedItem) {
            return;
        }

        let cancelled = false;
        void preparePlaybackItemForNative(lastPlayedItem, serverConnections).then((patched) => {
            if (
                cancelled ||
                (patched.artworkUrl === lastPlayedItem.artworkUrl &&
                    patched.artworkImageId === lastPlayedItem.artworkImageId)
            ) {
                return;
            }
            setLastPlayedItem(patched);
        });

        return () => {
            cancelled = true;
        };
    }, [lastPlayedItem?.id, lastPlayedItem?.artworkImageId, serverConnections, setLastPlayedItem]);

    useEffect(() => {
        if (serverConnections.length === 0 || !lastPlayedItem) {
            return;
        }
        if (lastPlayedItem.source !== 'podcast' && lastPlayedItem.source !== 'audiobook') {
            return;
        }
        const streamResume =
            lastPlayedItem.progressOffsetSeconds ?? lastPlayedItem.initialPositionSeconds ?? 0;
        if (streamResume > 0) {
            return;
        }

        let cancelled = false;
        void refreshPlayableResumeFromServer(lastPlayedItem, serverConnections).then((refreshed) => {
            if (cancelled) {
                return;
            }
            const positionSeconds = Math.max(
                refreshed.progressOffsetSeconds ?? 0,
                refreshed.initialPositionSeconds ?? 0,
            );
            if (positionSeconds <= 0) {
                return;
            }
            setLastPlayedItem(refreshed);
            void savePersistedLastPlayedItem(refreshed);
        });

        return () => {
            cancelled = true;
        };
    }, [
        lastPlayedItem?.id,
        lastPlayedItem?.initialPositionSeconds,
        lastPlayedItem?.progressOffsetSeconds,
        lastPlayedItem?.source,
        serverConnections,
        setLastPlayedItem,
    ]);

    useEffect(() => {
        let isMounted = true;

        void loadPersistedRecentContentItems().then((items) => {
            if (isMounted) {
                setRecentContentItems(items);
            }
        });

        void loadPersistedLastPlayedItem().then(async (item) => {
            if (!isMounted || !item) {
                return;
            }
            const refreshed =
                item.source === 'podcast' || item.source === 'audiobook'
                    ? await refreshPlayableResumeFromServer(item, serverConnections)
                    : item;
            lastPlayedPersistenceKeyRef.current = getLastPlayedPersistenceKey(refreshed);
            setLastPlayedItem(refreshed);
            const resumeSeconds = Math.max(
                refreshed.progressOffsetSeconds ?? 0,
                refreshed.initialPositionSeconds ?? 0,
            );
            if (resumeSeconds > 0) {
                void savePersistedLastPlayedItem(refreshed);
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
            setRecentContentItems((current) => {
                const next = reconcileRecentContentItemsIfChanged(
                    current,
                    collectFreshAlbumItems(cached.content.sections),
                );
                if (next !== current) {
                    void savePersistedRecentContentItems(next);
                }
                return next;
            });
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

    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);

    const mediaHandlers = useAndroidMediaHandlers({
        absContextRef,
        activePlaybackItem,
        closeMediaDetail,
        deps: { auth, downloads, navigation, overlays, session },
        handlePlayItem,
        loadHomeForConnections,
        playQueuedItem,
    });
    mediaHandlersRef.current = mediaHandlers;
    const {
        bumpViewAllFetchToken,
        handleAddMediaTrackToPlaylist,
        handleAddRadioStation,
        handleAddToPlaylistFromRoot,
        handleCreatePlaylistFromRoot,
        handleOpenCreatePlaylistStandalone,
        handleOpenViewAll,
        handlePlayMediaTrack,
        handleSearch,
        handleSelectMediaItem,
        handleShuffleDetailTracks,
        handleShuffleHomeItems,
        prefetchMediaDetailCache,
    } = mediaHandlers;

    // The quick-search OVERLAY fires onChangeText per keystroke; without a
    // debounce that was a full music+audiobook+podcast search fan-out on EVERY
    // character, which saturated the JS thread and stuttered playback. The main
    // Search tab already debounces 280ms; mirror it here so a burst of typing
    // runs ONE search. The input itself stays instant (setSearchOverlayQuery
    // updates the value synchronously at the call site); only the heavy network
    // search is deferred.
    const overlaySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const runOverlaySearchDebounced = useStableCallback((rawQuery: string) => {
        if (overlaySearchTimerRef.current) {
            clearTimeout(overlaySearchTimerRef.current);
            overlaySearchTimerRef.current = null;
        }
        const trimmed = rawQuery.trim();
        if (!trimmed) {
            // Clearing must feel instant — no point deferring an empty query.
            void handleSearch('');
            return;
        }
        overlaySearchTimerRef.current = setTimeout(() => {
            overlaySearchTimerRef.current = null;
            void handleSearch(trimmed);
        }, 280);
    });

    const contextMenu = useAndroidContextMenu({
        deps: { overlays, session },
        handlers: mediaHandlers,
        serverConnections,
    });

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
    const playbackItem = activePlaybackItem ?? lastPlayedItem;
    const playbackArtworkSource = useMemo(
        () => resolvePlaybackArtworkSourceForDisplay(playbackItem, serverConnections),
        [playbackItem, serverConnections],
    );
    const currentHighResArtworkUrl = useMemo(
        () => artworkSourceUri(playbackArtworkSource),
        [playbackArtworkSource],
    );
    // Prefetch into both memory + disk so even fast taps after track start
    // hit cache. expo-image dedupes in-flight requests with the same URL,
    // so this races safely against the miniplayer's component-level load.
    useEffect(() => {
        prefetchArtworkSource(playbackArtworkSource);
    }, [playbackArtworkSource]);

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

    // Android 13+ requires runtime POST_NOTIFICATIONS consent before any
    // notification (including the MediaSession one that drives shade controls
    // and lock-screen artwork) can appear. Without this, the media notification
    // silently never shows up. Request once on boot; declined permissions
    // simply mean no notification.
    useEffect(() => {
        if (Platform.OS !== 'android' || Platform.Version < 33) return;
        void PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(
            () => undefined,
        );
    }, []);

    const {
        handleNavigatePlayback,
        handleSeekPlayback,
        handleSkipPlayback,
        handleTogglePlayback,
        handleToggleShuffle,
    } = useAndroidPlaybackControls({
        lastPlayedItem,
        playbackSnapshotRef,
        playQueuedItem,
        serverConnections,
    });

    useEffect(() => {
        registerNavigatePlayback(handleNavigatePlayback);
    });

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
            // re-mirroring the Samo catalog. Audiobook/podcast progress writes
            // are owned by the native Kotlin sync (SamoProgressSync), so JS no
            // longer pushes them here.
            //
            // Memory cache for artwork gets flushed too — disk cache stays
            // since covers don't change unless the user re-uploads them, but
            // the in-memory LRU might be holding decoded bitmaps for items
            // whose URL changed (server moved coverArt to a different id).
            // This is the only point in the app where we deliberately
            // invalidate; everything else trusts the cache.
            await ExpoImage.clearMemoryCache();
            // Explicit user sync — force Home to re-render with the fresh result.
            await loadHomeForConnections(serverConnections, { force: true });
            // Rebuild the on-device Samo library mirror in the background. This
            // is the user's explicit "re-mirror everything" trigger, but a full
            // crawl is heavy, so it's fire-and-forget: live progress shows in the
            // Settings "Local library" panel while the button returns as soon as
            // home content and pending playback are reconciled. No-ops for
            // non-Samo servers, and concurrent taps join the in-flight sync.
            void syncSamoCatalog(serverConnections).then(() =>
                prefetchCatalogArtwork(serverConnections),
            );
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
                if (fresh && fresh.currentTimeSeconds * 1000 > currentPosMs + 5_000) {
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
                message: error instanceof Error ? error.message : 'Sync failed',
                ok: false,
            };
        }
    }, [loadHomeForConnections, serverConnections]);

    const [isRefreshingHome, setIsRefreshingHome] = useState(false);

    const handleRefreshHome = useCallback(async (): Promise<void> => {
        if (serverConnections.length === 0) {
            return;
        }
        setIsRefreshingHome(true);
        // Keep the on-device library mirror fresh, but OFF the spinner's critical
        // path. The full-catalog delta sync is what made pull-to-refresh feel
        // slow — it has no business blocking the spinner. Fire it in the
        // background (it powers the Library screen and the cold-start seed); the
        // pull itself only needs the Home re-fetch below.
        void syncSamoCatalog(serverConnections).catch(() => undefined);
        try {
            // The spinner waits ONLY on the Home re-fetch — recently-added, the
            // podcast feed, and discover all come back here in one shot. force:true
            // so the fresh result actually replaces what's on screen (pull-to-
            // refresh is the one place the user asked for new content). Capped so
            // a slow network releases the spinner instead of hanging it.
            await Promise.race([
                loadHomeForConnections(serverConnections, { force: true }),
                new Promise<void>((resolve) => setTimeout(resolve, 10000)),
            ]);
        } catch {
            // swallow — pull-to-refresh never throws into the UI
        } finally {
            setIsRefreshingHome(false);
        }
        void prefetchCatalogArtwork(serverConnections);
    }, [loadHomeForConnections, serverConnections]);

    const handleOpenSettings = useCallback(() => {
        setActiveUtilityScreen('settings');
        closeMediaDetail();
    }, [closeMediaDetail, setActiveUtilityScreen]);
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
        setServerUrl((current) => {
            const trimmed = current.trim();
            if (!trimmed) {
                return DEFAULT_SERVER_URL;
            }
            return addDefaultHttpScheme(current);
        });
    }, [setServerUrl]);
    const handleOpenFullPlayer = useCallback(() => {
        // Kick the expand spring on the UI thread NOW so the card starts moving
        // on the next frame instead of waiting on this (very large) component's
        // re-render. That wait is what made tapping/flicking the mini player
        // "stall" before the player slid up. The open effect re-targets the
        // same spring once `isFullPlayerOpen` commits, which is a no-op.
        playerProgress.value = withSpring(
            1,
            reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING,
        );
        setIsFullPlayerOpen(true);
    }, [playerProgress, reducedMotion, setIsFullPlayerOpen]);
    const handleCloseFullPlayer = useCallback(() => {
        // Mirror of open: begin collapsing immediately rather than after the
        // re-render the state flip schedules.
        playerProgress.value = withSpring(
            0,
            reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING,
        );
        setIsFullPlayerOpen(false);
    }, [playerProgress, reducedMotion, setIsFullPlayerOpen]);
    const handleOpenOutputPicker = useCallback(() => {
        setOutputPickerVisible(true);
    }, []);
    const handleCloseOutputPicker = useCallback(() => {
        setOutputPickerVisible(false);
    }, []);
    const handleViewAllBack = useCallback(() => {
        setActiveUtilityScreen(null);
        setViewAllRoute(null);
        bumpViewAllFetchToken();
        setViewAllFullState({ status: 'idle' });
    }, [bumpViewAllFetchToken]);
    const handleSelectMediaItemStable = useStableCallback(
        (item: MobileHomeItem | MobileSearchItem) => {
            void handleSelectMediaItem(item);
        },
    );
    const handlePrefetchMediaItemStable = useStableCallback(
        (item: AndroidRecentContentSourceItem) => {
            prefetchMediaDetailCache(item);
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
        (detail: MobileMediaDetail, track: MobileMediaTrack, playlist: MobileHomeItem) =>
            handleAddMediaTrackToPlaylist(detail, track, playlist),
    );
    const handleReloadMediaDetailStable = useStableCallback(() =>
        mediaHandlers.reloadCurrentMediaDetail(),
    );
    const handleToggleOfflineMode = useCallback((next: boolean) => {
        setIsOfflineMode(next);
        void saveOfflineModePreference(next);
    }, []);
    const rootPlaylistTargets = useMemo(
        () => getPlaylistTargetsForRoot(homeContentState, playlistMenuRoot?.sourceId),
        [homeContentState, playlistMenuRoot?.sourceId],
    );
    const rootPlaylistCanCreate = useMemo(() => {
        if (!playlistMenuRoot?.sourceId) {
            return false;
        }

        const auth = findServerAuthenticationForSource(serverConnections, {
            id: playlistMenuRoot.sourceId,
        });

        return auth?.type === ServerType.SAMO;
    }, [playlistMenuRoot?.sourceId, serverConnections]);
    const rootPlaylistMenuMode = useMemo(() => {
        if (!playlistMenuRoot) {
            return 'add' as const;
        }

        if (playlistMenuRoot.kind === 'standalone') {
            return 'standalone' as const;
        }

        return playlistMenuRoot.mode ?? 'add';
    }, [playlistMenuRoot]);
    const canCreatePlaylistsOnDevice = useMemo(
        () =>
            serverConnections.some(
                (connection) => connection.type === ServerType.SAMO,
            ),
        [serverConnections],
    );
    const rootPlaylistTrack = useMemo<MobileMediaTrack | null>(() => {
        if (!playlistMenuRoot) {
            return null;
        }

        if (playlistMenuRoot.kind === 'standalone') {
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

    const handleTabPress = useCallback(
        (tabId: SamoMobileTabId) => {
            setActiveUtilityScreen((current) => (current === null ? current : null));
            if (mediaDetailState.status !== 'idle') {
                closeMediaDetail();
            }
            setActiveTab((current) => (current === tabId ? current : tabId));
        },
        [
            activeUtilityScreen,
            closeMediaDetail,
            mediaDetailState.status,
            setActiveTab,
            setActiveUtilityScreen,
        ],
    );

    const utilityScreenContent =
        activeUtilityScreen === 'settings' ? (
            <SettingsScreen
                artworkCacheLimitBytes={artworkCacheLimitBytes}
                catalogSources={serverConnections
                    .filter((connection) => connection.type === ServerType.SAMO)
                    .map((connection) => ({
                        id: getMobileContentSource(connection).id,
                        title: connection.title,
                    }))}
                isOfflineMode={isOfflineMode}
                onOpenDownloads={handleOpenDownloads}
                onOpenManageServers={handleOpenManageServers}
                onSetArtworkCacheLimit={setArtworkCacheLimit}
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
                    onPrefetchItem={handlePrefetchMediaItemStable}
                    onSelectItem={handleSelectMediaItemStable}
                    onViewAll={handleOpenViewAll}
                    recentItems={visibleRecentItems}
                    serverConnections={serverConnections}
                />
            ) : tabId === 'playlists' ? (
                <PlaylistsScreen
                    homeContentState={visibleHomeContentState}
                    onCreatePlaylist={handleOpenCreatePlaylistStandalone}
                    onSelectItem={handleSelectMediaItemStable}
                    onShufflePlay={handleShuffleHomeItems}
                    recentItems={visibleRecentItems}
                    showCreatePlaylist={canCreatePlaylistsOnDevice}
                />
            ) : tabId === 'library' ? (
                <LibraryScreen
                    fullCollections={libraryFullCollections}
                    fullCollectionsEnabled={!isOfflineMode}
                    hasServerConnections={serverConnections.length > 0}
                    homeContentState={visibleHomeContentState}
                    libraryRelevantState={libraryRelevantState}
                    onEnsureFullCollections={ensureLibraryFullCollections}
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
                <ServerConnectionsContext.Provider value={serverConnections}>
                <MediaContextMenuContext.Provider value={contextMenu.api}>
                    <DownloadedCollectionKeysContext.Provider value={downloadedCollectionKeys}>
                        <DownloadedTrackKeysContext.Provider value={downloadedTrackKeys}>
                            <View style={styles.safeArea}>
                                <StatusBar style="light" />
                                <KeyboardAvoidingView
                                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                    style={styles.keyboardView}
                                >
                                    <View style={styles.root}>
                                        <View style={styles.appContent}>
                                            <View
                                                pointerEvents={
                                                    utilityScreenContent ||
                                                    mediaDetailState.status !== 'idle' ||
                                                    (activeUtilityScreen === 'view-all' &&
                                                        viewAllRoute)
                                                        ? 'none'
                                                        : 'auto'
                                                }
                                                style={styles.tabSceneHost}
                                            >
                                                {SAMO_MOBILE_TABS.map((tab) => {
                                                    const isSceneActive = tab.id === activeTab;
                                                    const sceneStyle = [
                                                        styles.tabScene,
                                                        isSceneActive
                                                            ? styles.tabSceneActive
                                                            : styles.tabSceneHidden,
                                                    ];

                                                    if (tab.id === 'library') {
                                                        return (
                                                            <View
                                                                key={tab.id}
                                                                pointerEvents={
                                                                    isSceneActive ? 'auto' : 'none'
                                                                }
                                                                style={sceneStyle}
                                                            >
                                                                <ErrorBoundary label={`tab-${tab.id}`}>
                                                                    {renderTabSceneContent(tab.id)}
                                                                </ErrorBoundary>
                                                            </View>
                                                        );
                                                    }

                                                    return (
                                                        <ScrollView
                                                            contentContainerStyle={styles.tabContent}
                                                            key={tab.id}
                                                            pointerEvents={
                                                                isSceneActive ? 'auto' : 'none'
                                                            }
                                                            refreshControl={
                                                                tab.id === 'home' &&
                                                                serverConnections.length > 0 ? (
                                                                    <RefreshControl
                                                                        colors={[colors.accent]}
                                                                        onRefresh={handleRefreshHome}
                                                                        progressBackgroundColor={
                                                                            colors.surface
                                                                        }
                                                                        refreshing={isRefreshingHome}
                                                                        tintColor={colors.accent}
                                                                    />
                                                                ) : undefined
                                                            }
                                                            showsVerticalScrollIndicator={false}
                                                            style={sceneStyle}
                                                        >
                                                            <ErrorBoundary label={`tab-${tab.id}`}>
                                                                {renderTabSceneContent(tab.id)}
                                                            </ErrorBoundary>
                                                        </ScrollView>
                                                    );
                                                })}
                                            </View>
                                            {utilityScreenContent ? (
                                                <ScrollView
                                                    contentContainerStyle={[
                                                        styles.content,
                                                        styles.utilityScrollContent,
                                                    ]}
                                                    keyboardShouldPersistTaps="handled"
                                                    style={[
                                                        styles.navOverlay,
                                                        styles.tabUtilityScene,
                                                    ]}
                                                >
                                                    {utilityScreenContent}
                                                </ScrollView>
                                            ) : null}
                                            {activeUtilityScreen === null &&
                                            (detailOverlayOpen || hasCachedDetailShell) ? (
                                                <Reanimated.View
                                                    pointerEvents={
                                                        detailOverlayOpen ? 'auto' : 'none'
                                                    }
                                                    style={[styles.navOverlay, detailOverlayStyle]}
                                                >
                                                    <MediaDetailContent
                                                        homeContentState={homeContentState}
                                                        mediaDetailState={
                                                            detailOverlayOpen
                                                                ? mediaDetailState
                                                                : frozenDetailStateRef.current
                                                        }
                                                        onAddTrackToPlaylist={
                                                            handleAddMediaTrackToPlaylistStable
                                                        }
                                                        onBack={closeMediaDetail}
                                                        onPlayTrack={handlePlayMediaTrackStable}
                                                        onReloadDetail={handleReloadMediaDetailStable}
                                                        onSelectItem={handleSelectMediaItemStable}
                                                        onShufflePlay={handleShuffleDetailTracks}
                                                        serverConnections={serverConnections}
                                                    />
                                                </Reanimated.View>
                                            ) : null}
                                            {activeUtilityScreen === 'view-all' && viewAllRoute ? (
                                                <Reanimated.View
                                                    entering={
                                                        reducedMotion
                                                            ? undefined
                                                            : FadeIn.duration(180)
                                                    }
                                                    style={[
                                                        styles.navOverlay,
                                                        styles.navOverlayTop,
                                                    ]}
                                                >
                                                    <ErrorBoundary label="ViewAllScreen">
                                                        <ViewAllScreen
                                                            fullState={viewAllFullState}
                                                            onBack={handleViewAllBack}
                                                            onSelectItem={handleSelectViewAllItem}
                                                            route={viewAllRoute}
                                                        />
                                                    </ErrorBoundary>
                                                </Reanimated.View>
                                            ) : null}
                                            {isSearchOverlayOpen ? (
                                                <SearchOverlay
                                                    homeContentState={homeContentState}
                                                    onClose={() => {
                                                        setIsSearchOverlayOpen(false);
                                                        setSearchOverlayQuery('');
                                                    }}
                                                    onSearch={(q) => {
                                                        setSearchOverlayQuery(q);
                                                        runOverlaySearchDebounced(q);
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
                                        </View>
                                        <NowPlayingMetadataSync />
                                        {/* World dim — fades in over the page + tab bar as the
                        player rises. Below the player shells (zIndex 9000 vs
                        their 9999/10000). pointerEvents:none so the page
                        below stays interactive while the player is closed. */}
                                        <Reanimated.View
                                            pointerEvents="none"
                                            style={[styles.playerWorldDim, worldDimStyle]}
                                        />
                                        <ErrorBoundary label="MiniPlayer">
                                        <ConnectedMiniPlayer
                                            artworkImageId={playbackItem?.artworkImageId}
                                            artworkUrl={currentHighResArtworkUrl}
                                            contentSource={
                                                playbackItem
                                                    ? getContentSourceFromPlaybackItem(
                                                          playbackItem,
                                                          serverConnections,
                                                      )
                                                    : undefined
                                            }
                                            lastPlayedItem={lastPlayedItem}
                                            onOpenFullPlayer={handleOpenFullPlayer}
                                            onTogglePlayback={handleTogglePlayback}
                                            playerProgress={playerProgress}
                                            reducedMotion={reducedMotion}
                                            serverConnections={serverConnections}
                                        />
                                        </ErrorBoundary>
                                        <ErrorBoundary
                                            fallback={(error, retry) => (
                                                // If the fullscreen player throws, just dismiss it
                                                // rather than blocking the whole app. The user can
                                                // still see the miniplayer and tap to reopen.
                                                <View style={styles.errorBoundaryRoot}>
                                                    <Text style={styles.errorBoundaryTitle}>
                                                        Player error
                                                    </Text>
                                                    <Text style={styles.errorBoundarySubtitle}>
                                                        {error.message}
                                                    </Text>
                                                    <Pressable
                                                        accessibilityRole="button"
                                                        onPress={() => {
                                                            setIsFullPlayerOpen(false);
                                                            retry();
                                                        }}
                                                        style={styles.errorBoundaryButton}
                                                    >
                                                        <Text
                                                            style={styles.errorBoundaryButtonText}
                                                        >
                                                            Dismiss
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                            label="FullScreenPlayer"
                                        >
                                            <ConnectedFullScreenPlayer
                                                artworkImageId={playbackItem?.artworkImageId}
                                                artworkUrl={currentHighResArtworkUrl}
                                                contentSource={
                                                    playbackItem
                                                        ? getContentSourceFromPlaybackItem(
                                                              playbackItem,
                                                              serverConnections,
                                                          )
                                                        : undefined
                                                }
                                                castState={castState}
                                                isShuffled={isShuffled}
                                                lastPlayedItem={lastPlayedItem}
                                                onClose={handleCloseFullPlayer}
                                                onNext={() => void handleNavigatePlayback(1)}
                                                onOpenOutputPicker={handleOpenOutputPicker}
                                                onPlayQueueIndex={(index) => {
                                                    const currentQueue = getPlaybackQueue();
                                                    if (!currentQueue) {
                                                        return;
                                                    }
                                                    const item = currentQueue.items[index];
                                                    if (!item) {
                                                        return;
                                                    }
                                                    void playQueuedItem(
                                                        item,
                                                        currentQueue.items,
                                                        index,
                                                    );
                                                }}
                                                onPrevious={() => void handleNavigatePlayback(-1)}
                                                onSkipBySeconds={(offsetSeconds) =>
                                                    void handleSkipPlayback(offsetSeconds)
                                                }
                                                onSeek={(positionMs) =>
                                                    void handleSeekPlayback(positionMs)
                                                }
                                                onTogglePlayback={handleTogglePlayback}
                                                onToggleShuffle={handleToggleShuffle}
                                                playerProgress={playerProgress}
                                                queue={queue}
                                                reducedMotion={reducedMotion}
                                                serverConnections={serverConnections}
                                                visible={isFullPlayerOpen}
                                            />
                                        </ErrorBoundary>
                                        <OutputPickerModal
                                            castState={castState}
                                            onClose={handleCloseOutputPicker}
                                            visible={outputPickerVisible}
                                        />
                                        <Reanimated.View
                                            pointerEvents={isFullPlayerOpen ? 'none' : 'auto'}
                                            style={[styles.tabBar, tabBarAnimatedStyle]}
                                        >
                                            {SAMO_MOBILE_TABS.map((tab) => {
                                                const isActive = tab.id === activeTab;
                                                return (
                                                    <Pressable
                                                        accessibilityRole="button"
                                                        key={tab.id}
                                                        onPress={() => handleTabPress(tab.id)}
                                                        onPressIn={() => handleTabPress(tab.id)}
                                                        style={[
                                                            styles.tabButton,
                                                            isActive && styles.tabButtonActive,
                                                        ]}
                                                    >
                                                        <TabIcon active={isActive} id={tab.id} />
                                                        <Text
                                                            style={[
                                                                styles.tabLabel,
                                                                isActive && styles.tabLabelActive,
                                                            ]}
                                                        >
                                                            {tab.label}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </Reanimated.View>
                                    </View>
                                </KeyboardAvoidingView>
                                <MediaContextMenu
                                    actions={contextMenu.actions}
                                    artworkImageId={contextMenu.artworkImageId}
                                    artworkUrl={contextMenu.artworkUrl}
                                    contentSource={contextMenu.contentSource}
                                    eyebrow={contextMenu.eyebrow}
                                    feedback={contextMenu.feedback}
                                    isCircularArtwork={contextMenu.isCircularArtwork}
                                    onClose={contextMenu.onClose}
                                    subtitle={contextMenu.subtitle}
                                    target={contextMenu.target}
                                    title={contextMenu.title}
                                />
                                <StreamInfoModal
                                    item={streamInfoItem}
                                    onClose={() => setStreamInfoItem(null)}
                                />
                                <BookInformationModal
                                    onClose={closeBookInfo}
                                    state={bookInfoState}
                                />
                                <TrackPlaylistMenu
                                    actionState={playlistMenuRootState}
                                    canCreatePlaylist={rootPlaylistCanCreate}
                                    mode={rootPlaylistMenuMode}
                                    onAddToPlaylist={(playlist) =>
                                        void handleAddToPlaylistFromRoot(playlist)
                                    }
                                    onClose={() => {
                                        setPlaylistMenuRoot(null);
                                        setPlaylistMenuRootState({ status: 'idle' });
                                    }}
                                    onCreatePlaylist={(name) =>
                                        void handleCreatePlaylistFromRoot(name)
                                    }
                                    open={playlistMenuRoot !== null}
                                    playlists={rootPlaylistTargets}
                                    track={rootPlaylistTrack}
                                />
                            </View>
                        </DownloadedTrackKeysContext.Provider>
                    </DownloadedCollectionKeysContext.Provider>
                </MediaContextMenuContext.Provider>
                </ServerConnectionsContext.Provider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

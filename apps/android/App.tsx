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
import { useAndroidAbsProgressSync } from './src/hooks/use-android-abs-progress-sync';
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
import {
    type AbsProgressContext,
    flushPendingAbsProgress,
    loadAbsCurrentProgress,
    syncAbsProgressImmediate,
    syncAbsProgressThrottled,
} from './src/services/abs-progress';
import { flushPendingSamoPlayback } from './src/services/samo-playback-sync';
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
    subscribeDownloads,
} from './src/services/download-manager';
import {
    type AndroidFullCollectionState,
    loadAndroidFullCollection,
} from './src/services/full-collection';
import { triggerSelection } from './src/services/haptics';
import {
    type AndroidHomeContentState,
    loadAndroidHomeContent,
    refreshAndroidHomeLiveSections,
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
import {
    starSubsonicAlbum,
    starSubsonicArtist,
    starSubsonicTrack,
    unstarSubsonicAlbum,
    unstarSubsonicArtist,
    unstarSubsonicTrack,
} from './src/services/media-favorites';
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
import { buildBackdropStops, darkenColor, pickAlbumEssenceColor } from './src/utils/color';
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
        downloadedCollectionKeys,
        downloadedCollections,
        downloadedTrackKeys,
        isOfflineMode,
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
        playbackQueueRevision,
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
        playbackQueueRef,
        playbackSnapshotRef,
        playQueuedItem,
        registerNavigatePlayback,
    } = useAndroidNativePlayback({ isFullPlayerOpen, lastPlayedItem, serverConnections });
    useAndroidRadioMetadataSync(serverConnections);
    useAndroidCastSync();
    useAndroidAbsProgressSync();
    const lastPlayedPersistenceKeyRef = useRef<null | string>(null);
    const homeDiscoveryRefreshId = useRef(0);
    const isHomeSurface =
        activeTab === 'home' && activeUtilityScreen === null && mediaDetailState.status === 'idle';
    const frozenDetailStateRef = useRef(mediaDetailState);
    if (mediaDetailState.status === 'loaded') {
        frozenDetailStateRef.current = mediaDetailState;
    }
    const detailOverlayOpen = activeUtilityScreen === null && mediaDetailState.status !== 'idle';
    const hasCachedDetailShell = frozenDetailStateRef.current.status === 'loaded';
    const prevDetailOverlayOpenRef = useRef(false);
    useEffect(() => {
        const wasOpen = prevDetailOverlayOpenRef.current;
        if (detailOverlayOpen && !wasOpen) {
            const openedAt = Date.now();
            requestAnimationFrame(() => {
                // #region agent log
                const framePayload = {
                    data: {
                        detailStatus: mediaDetailState.status,
                        sinceOpenMs: Date.now() - openedAt,
                    },
                    hypothesisId: 'H10',
                    location: 'App.tsx:detailOverlayOpen',
                    message: 'detail overlay first frame',
                    runId: 'nav-perf',
                    sessionId: 'c0ca1a',
                    timestamp: Date.now(),
                };
                console.log('[nav-perf]', JSON.stringify(framePayload));
                fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
                    body: JSON.stringify(framePayload),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': 'c0ca1a',
                    },
                    method: 'POST',
                }).catch(() => {});
                // #endregion
            });
        }
        prevDetailOverlayOpenRef.current = detailOverlayOpen;
    }, [detailOverlayOpen, mediaDetailState.status]);

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
            const nextHomeContentState = await dedupeInFlight(
                buildHomeLoadKey(authentications),
                () => loadAndroidHomeContent(authentications),
            );

            if (requestId === homeLoadRequestId.current) {
                setHomeContentState(nextHomeContentState);
                if (nextHomeContentState.status === 'loaded') {
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

    useEffect(() => {
        if (
            !isHomeSurface ||
            homeContentState.status !== 'loaded' ||
            serverConnections.length === 0
        ) {
            return;
        }

        const content = homeContentState.content;
        const requestId = (homeDiscoveryRefreshId.current += 1);

        void refreshAndroidHomeLiveSections(serverConnections, content).then((nextContent) => {
            if (requestId !== homeDiscoveryRefreshId.current) {
                return;
            }
            setHomeContentState({ status: 'loaded', content: nextContent });
        });
    }, [homeContentState.status, isHomeSurface, serverConnections]);

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
                const [albums, artists] = await Promise.all([
                    loadAndroidFullCollection(serverConnections, 'album'),
                    loadAndroidFullCollection(serverConnections, 'artist'),
                ]);

                if (libraryFullCollectionFetchTokenRef.current !== requestId) {
                    return;
                }

                setLibraryFullCollections({ albums, artists });
            })();

            return {
                albums: { status: 'loading' },
                artists: { status: 'loading' },
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
        if ((lastPlayedItem.initialPositionSeconds ?? 0) > 0) {
            return;
        }

        let cancelled = false;
        void refreshPlayableResumeFromServer(lastPlayedItem, serverConnections).then((refreshed) => {
            if (cancelled) {
                return;
            }
            const positionSeconds = refreshed.initialPositionSeconds ?? 0;
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
            if (
                refreshed.initialPositionSeconds &&
                refreshed.initialPositionSeconds > 0
            ) {
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
        playbackQueueRef,
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
        absContextRef,
        lastPlayedItem,
        playbackQueueRef,
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
            await Promise.all([
                flushPendingAbsProgress(serverConnections),
                flushPendingSamoPlayback(serverConnections),
            ]);
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

    const handleOpenSettings = useCallback(() => {
        // #region agent log
        fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
            body: JSON.stringify({
                data: { detailStatus: mediaDetailState.status },
                hypothesisId: 'H1',
                location: 'App.tsx:handleOpenSettings',
                message: 'open settings utility',
                runId: 'nav-perf',
                sessionId: 'c0ca1a',
                timestamp: Date.now(),
            }),
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ca1a' },
            method: 'POST',
        }).catch(() => {});
        // #endregion
        setActiveUtilityScreen('settings');
        closeMediaDetail();
    }, [closeMediaDetail, mediaDetailState.status, setActiveUtilityScreen]);
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
        setIsFullPlayerOpen(true);
    }, [setIsFullPlayerOpen]);
    const handleCloseFullPlayer = useCallback(() => {
        setIsFullPlayerOpen(false);
    }, [setIsFullPlayerOpen]);
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

        return (
            auth?.type === ServerType.SAMO ||
            auth?.type === ServerType.NAVIDROME ||
            auth?.type === ServerType.SUBSONIC
        );
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
                (connection) =>
                    connection.type === ServerType.SAMO ||
                    connection.type === ServerType.NAVIDROME ||
                    connection.type === ServerType.SUBSONIC,
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
    const nowPlayingRadioId = activePlaybackItem?.source === 'radio' ? activePlaybackItem.id : null;

    const handleTabPress = useCallback(
        (tabId: SamoMobileTabId) => {
            // #region agent log
            const tabPressStartedAt = Date.now();
            fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
                body: JSON.stringify({
                    data: {
                        detailStatus: mediaDetailState.status,
                        tabId,
                        utilityScreen: activeUtilityScreen,
                    },
                    hypothesisId: 'H4',
                    location: 'App.tsx:handleTabPress',
                    message: 'tab press',
                    runId: 'nav-perf',
                    sessionId: 'c0ca1a',
                    timestamp: tabPressStartedAt,
                }),
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ca1a' },
                method: 'POST',
            }).catch(() => {});
            // #endregion
            setActiveUtilityScreen((current) => (current === null ? current : null));
            if (mediaDetailState.status !== 'idle') {
                closeMediaDetail();
            }
            setActiveTab((current) => (current === tabId ? current : tabId));
            // #region agent log
            fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
                body: JSON.stringify({
                    data: { elapsedMs: Date.now() - tabPressStartedAt, tabId },
                    hypothesisId: 'H4',
                    location: 'App.tsx:handleTabPress',
                    message: 'tab press handlers scheduled',
                    runId: 'nav-perf',
                    sessionId: 'c0ca1a',
                    timestamp: Date.now(),
                }),
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ca1a' },
                method: 'POST',
            }).catch(() => {});
            // #endregion
        },
        [
            activeUtilityScreen,
            closeMediaDetail,
            mediaDetailState.status,
            setActiveTab,
            setActiveUtilityScreen,
        ],
    );

    const navSurface =
        activeUtilityScreen === 'view-all'
            ? 'view-all'
            : activeUtilityScreen
              ? `utility:${activeUtilityScreen}`
              : mediaDetailState.status !== 'idle'
                ? `detail:${mediaDetailState.status}`
                : 'tabs';
    const prevNavSurfaceRef = useRef(navSurface);
    const navSurfaceChangedAtRef = useRef(Date.now());
    useEffect(() => {
        const previous = prevNavSurfaceRef.current;
        if (previous === navSurface) {
            return;
        }
        const changedAt = Date.now();
        const sinceLastMs = changedAt - navSurfaceChangedAtRef.current;
        navSurfaceChangedAtRef.current = changedAt;
        const unmountsTabHost =
            previous === 'tabs' &&
            (navSurface.startsWith('detail:') || navSurface.startsWith('utility:'));
        const remountsTabHost =
            navSurface === 'tabs' &&
            (previous.startsWith('detail:') || previous.startsWith('utility:'));
        const closedDetail = navSurface === 'tabs' && previous.startsWith('detail:');
        // #region agent log
        const navPayload = {
            data: {
                detailShellKeptMounted: hasCachedDetailShell,
                from: previous,
                remountsTabHost,
                sinceLastMs,
                tabHostKeptMounted: true,
                to: navSurface,
                unmountsTabHost,
            },
            hypothesisId: closedDetail ? 'H6' : 'H1',
            location: 'App.tsx:navSurface',
            message: 'navigation surface changed',
            runId: 'nav-perf',
            sessionId: 'c0ca1a',
            timestamp: changedAt,
        };
        console.log('[nav-perf]', JSON.stringify(navPayload));
        fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
            body: JSON.stringify(navPayload),
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Session-Id': 'c0ca1a',
            },
            method: 'POST',
        }).catch(() => {});
        if (closedDetail) {
            requestAnimationFrame(() => {
                const framePayload = {
                    data: { sinceNavSurfaceMs: Date.now() - changedAt },
                    hypothesisId: 'H8',
                    location: 'App.tsx:navSurface',
                    message: 'detail close first frame',
                    runId: 'nav-perf',
                    sessionId: 'c0ca1a',
                    timestamp: Date.now(),
                };
                console.log('[nav-perf]', JSON.stringify(framePayload));
                fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2', {
                    body: JSON.stringify(framePayload),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': 'c0ca1a',
                    },
                    method: 'POST',
                }).catch(() => {});
            });
        }
        // #endregion
        prevNavSurfaceRef.current = navSurface;
    }, [hasCachedDetailShell, navSurface]);

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
                                    <View
                                        onLayout={(event) => {
                                            const { height, width, y } = event.nativeEvent.layout;
                                            // #region agent log
                                            const rootPayload = {
                                                data: {
                                                    height,
                                                    isFullPlayerOpen,
                                                    screenHeight: SCREEN_HEIGHT,
                                                    width,
                                                    y,
                                                },
                                                hypothesisId: 'H2',
                                                location: 'App.tsx:root.onLayout',
                                                message: 'root layout',
                                                runId: 'player-layout-fix',
                                                sessionId: 'c0ca1a',
                                                timestamp: Date.now(),
                                            };
                                            console.log(
                                                '[player-layout]',
                                                JSON.stringify(rootPayload),
                                            );
                                            fetch(
                                                'http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',
                                                {
                                                    body: JSON.stringify(rootPayload),
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'X-Debug-Session-Id': 'c0ca1a',
                                                    },
                                                    method: 'POST',
                                                },
                                            ).catch(() => {});
                                            // #endregion
                                        }}
                                        style={styles.root}
                                    >
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
                                                                {renderTabSceneContent(tab.id)}
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
                                                            showsVerticalScrollIndicator={false}
                                                            style={sceneStyle}
                                                        >
                                                            {renderTabSceneContent(tab.id)}
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
                                                <View
                                                    pointerEvents={
                                                        detailOverlayOpen ? 'auto' : 'none'
                                                    }
                                                    style={[
                                                        styles.navOverlay,
                                                        !detailOverlayOpen &&
                                                            styles.navOverlayHidden,
                                                    ]}
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
                                                </View>
                                            ) : null}
                                            {activeUtilityScreen === 'view-all' && viewAllRoute ? (
                                                <View
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
                                                </View>
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
                                                    const currentQueue = playbackQueueRef.current;
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
                                                playbackQueueRevision={playbackQueueRevision}
                                                playerProgress={playerProgress}
                                                queue={playbackQueueRef.current}
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

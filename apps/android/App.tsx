import {
    buildAudioQualityBadgeItems,
    isHiResAudioQuality,
    isLosslessAudioQuality,
} from '@samo/core/audio-quality';
import {
    addMobileTracksToPlaylist,
    getDetailQualityProfile,
    getItemQualityProfile,
    getMobileContentSource,
    getPlaybackQualityProfile,
    loadMobileDiscoveryForServers,
    loadMobileMediaDetail,
    loadMobilePodcastFeedForServers,
    loadMobileRadioForServers,
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
    type ServerAuthenticationResult,
    ServerConnectionHealthStatus,
    ServerType,
} from '@samo/core/server';
import { File } from 'expo-file-system';
import { useFonts } from 'expo-font';
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
    InteractionManager,
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
import { useAndroidPlaybackControls } from './src/hooks/use-android-playback-controls';
import { useAndroidRadioMetadataSync } from './src/hooks/use-android-radio-metadata-sync';
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
import { InitialSyncScreen } from './src/screens/InitialSyncScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ManageServersScreen } from './src/screens/ManageServersScreen';
import { MediaDetailContent } from './src/screens/MediaDetailScreen';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { OnboardingSplash } from './src/screens/onboarding/OnboardingSplash';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { RadioScreen } from './src/screens/RadioScreen';
import { SearchOverlay, SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ViewAllScreen } from './src/screens/ViewAllScreen';
import { loadAbsCurrentProgress } from './src/services/abs-progress';
import { prefetchCatalogArtwork } from './src/services/artwork-prefetch';
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
    buildCatalogHomeContent,
    type HomeLiveSections,
} from './src/services/catalog/catalog-reads';
import { reindexCatalogSearch } from './src/services/catalog/catalog-search-index';
import {
    installCatalogSyncEventBridge,
    subscribeCatalogSyncCompleted,
} from './src/services/catalog/catalog-sync-events';
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
    loadAndroidFullCollectionLocalSync,
} from './src/services/full-collection';
import { triggerSelection } from './src/services/haptics';
import { triggerCatalogSyncNow } from './src/services/headless-catalog-sync';
import { type AndroidHomeContentState, reconcileHomeContent } from './src/services/home-content';
import { loadHomeLayoutHint, saveHomeLayoutHint } from './src/services/home-layout-hint';
import { buildHomeLoadKey, dedupeInFlight } from './src/services/in-flight-requests';
import { formatJankBreadcrumb } from './src/services/jank-trace';
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
import { type AndroidSearchState, loadAndroidSearchResults } from './src/services/search-content';
import { type AndroidAuthState, authenticateServer } from './src/services/server-auth';
import {
    type AndroidServerHealthMap,
    createCheckingServerHealthMap,
    createConnectedServerHealthStatus,
} from './src/services/server-health';
import { getPlaybackQueue, usePlaybackQueue } from './src/state/playback-queue-store';
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
import { addDefaultHttpScheme, DEFAULT_SERVER_URL, hasServerUrlTarget } from './src/utils/auth-url';
import { getContentItemKey } from './src/utils/content-item';
import { getContentSourceFromPlaybackItem } from './src/utils/content-source';
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
import { getLibraryMediaType, toLibraryDisplayItem } from './src/utils/library-display';
import { detailHasHiRes } from './src/utils/media-quality';
import { buildOfflineHomeContentState } from './src/utils/offline-home';
import { buildDownloadedMusicDetail } from './src/utils/offline-music-detail';
import {
    buildOfflineAudiobookPlayable,
    buildOfflinePodcastEpisodePlayable,
    mimeFromCastUri,
    pickAudiobookFileIndexForTime,
} from './src/utils/offline-playback';
import { refreshPlayableResumeFromServer } from './src/utils/playback-resume';
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
import {
    collectFreshAlbumItems,
    reconcileRecentContentItemsIfChanged,
} from './src/utils/recent-content-dedupe';
import {
    artworkSourceUri,
    backfillItemArtworkFields,
    prefetchArtworkSource,
    preparePlaybackItemForNative,
    resolvePlaybackArtworkSourceForDisplay,
    resolveSamoItemArtworkSourceForDisplay,
} from './src/utils/samo-artwork-url';
import { getTabTitle } from './src/utils/tab-title';

// @ts-ignore
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: 'Archivo' };
// @ts-ignore
TextInput.defaultProps = TextInput.defaultProps || {};
// @ts-ignore
TextInput.defaultProps.style = { fontFamily: 'Archivo' };

// One Kotlin sync round emits a 'synced' event per source; this trailing window
// coalesces that burst into a single mirror refresh instead of one per source.
const POST_SYNC_COALESCE_MS = 450;

export default function App() {
    const [fontsLoaded] = useFonts({
        Archivo: require('./assets/fonts/Archivo.ttf'),
        'OfficeCodePro-Bold': require('./assets/fonts/officecodepro-bold.otf'),
        'OfficeCodePro-Regular': require('./assets/fonts/officecodepro-regular.otf'),
        'YoungSerif-Bold': require('./assets/fonts/YoungSerif-Bold.ttf'),
        'YoungSerif-Regular': require('./assets/fonts/YoungSerif-Regular.ttf'),
    });
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
        mediaDetailKey,
        mediaDetailState,
        popMediaDetail,
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
        bootResolved,
        onboardingActive,
        password,
        serverConnection,
        serverHealthByKey,
        serverUrl,
        setAuthState,
        setOnboardingActive,
        setPassword,
        setServerConnection,
        setServerHealthByKey,
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
        playQueueIndexNatively,
        registerNavigatePlayback,
    } = useAndroidNativePlayback({ lastPlayedItem, serverConnection });
    const queue = usePlaybackQueue();
    useAndroidRadioMetadataSync(serverConnection);
    useAndroidCastSync();
    const lastPlayedPersistenceKeyRef = useRef<null | string>(null);
    const isHomeSurface =
        activeTab === 'home' && activeUtilityScreen === null && mediaDetailState.status === 'idle';
    const frozenDetailStateRef = useRef(mediaDetailState);
    const frozenDetailKeyRef = useRef(mediaDetailKey);
    if (mediaDetailState.status === 'loaded') {
        frozenDetailStateRef.current = mediaDetailState;
        frozenDetailKeyRef.current = mediaDetailKey;
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

    // Server-curated Home sections (Discover / Podcast Feed / Radio) are the
    // ONLY network-fetched Home data; every library section derives from the
    // on-device mirror. The last live fetch is kept so mirror re-derives
    // (sync completion, app foreground) don't drop those sections.
    const lastHomeLiveSectionsRef = useRef<HomeLiveSections | null>(null);

    /** Re-derive Home from the mirror + last-known live sections. Synchronous
     *  and cheap (bounded SQLite reads), so it runs on connect, after every
     *  sync, and whenever connections change. */
    const refreshHomeFromMirror = useStableCallback((options?: { authoritative?: boolean }) => {
        if (!serverConnection) {
            return;
        }
        const content = buildCatalogHomeContent(serverConnection, lastHomeLiveSectionsRef.current);

        console.log(
            '[home] derive',
            content
                ? content.sections.map((s) => `${s.id}:${s.items.length}`).join(' ')
                : 'EMPTY (no mirror rows visible)',
        );
        if (!content) {
            return;
        }
        // Only the post-sync refresh is authoritative enough to PRUNE a deleted
        // shelf; every other derive stays additive so a transient thin mirror
        // read can't blank the page (the cold-boot deload→reload).
        setHomeContentState((current) => ({
            content:
                current.status === 'loaded'
                    ? reconcileHomeContent(current.content, content, {
                          prune: options?.authoritative ?? false,
                      })
                    : content,
            status: 'loaded',
        }));
    });

    const loadHomeForConnection = useCallback(
        async (authentication: null | ServerAuthenticationResult) => {
            const requestId = (homeLoadRequestId.current += 1);

            if (!authentication) {
                setHomeContentState({ status: 'idle' });
                return;
            }

            // Mirror paint FIRST — instant and authoritative for the library
            // sections. A cold mirror (fresh install mid-first-sync) shows the
            // loading state until the sync-completed event re-derives.
            const mirrorContent = buildCatalogHomeContent(
                authentication,
                lastHomeLiveSectionsRef.current,
            );
            setHomeContentState((current) => {
                if (mirrorContent) {
                    return {
                        content:
                            current.status === 'loaded'
                                ? reconcileHomeContent(current.content, mirrorContent)
                                : mirrorContent,
                        status: 'loaded',
                    };
                }
                return current.status === 'loaded' ? current : { status: 'loading' };
            });

            // Live sections — the one network trip on the Home path. Failures
            // degrade to the last-known live sections (or none) instead of
            // touching the library sections at all.
            const live = await dedupeInFlight(
                buildHomeLoadKey(authentication ? [authentication] : []),
                async (): Promise<HomeLiveSections> => {
                    const [discover, podcastFeed] = await Promise.all([
                        loadMobileDiscoveryForServers({
                            authentication: authentication ?? null,
                        }).catch(() => []),
                        loadMobilePodcastFeedForServers({
                            authentication: authentication ?? null,
                        }).catch(() => []),
                    ]);
                    return {
                        discover,
                        podcastFeed,
                        radio: lastHomeLiveSectionsRef.current?.radio ?? [],
                    };
                },
            );

            void dedupeInFlight(
                buildHomeLoadKey(authentication ? [authentication] : []) + '-radio',
                async () => {
                    const radio = await loadMobileRadioForServers({
                        authentication: authentication ?? null,
                    }).catch(() => []);
                    if (requestId !== homeLoadRequestId.current || radio.length === 0) {
                        return;
                    }
                    lastHomeLiveSectionsRef.current = {
                        ...(lastHomeLiveSectionsRef.current ?? {
                            discover: [],
                            podcastFeed: [],
                            radio: [],
                        }),
                        radio,
                    };
                    const assembled = buildCatalogHomeContent(
                        authentication,
                        lastHomeLiveSectionsRef.current,
                    );
                    if (assembled) {
                        setHomeContentState((current) => ({
                            content:
                                current.status === 'loaded'
                                    ? reconcileHomeContent(current.content, assembled)
                                    : assembled,
                            status: 'loaded',
                        }));
                    }
                },
            );
            if (requestId !== homeLoadRequestId.current) {
                return;
            }
            // Record which live shelves had content so the NEXT cold boot can
            // reserve their slots before the fetch returns (a genuinely-empty
            // shelf writes 0, which clears any stale reservation). One
            // fire-and-forget call — no new state, no effect.
            saveHomeLayoutHint({
                podcastFeed: live.podcastFeed.length,
                rediscover: live.discover.length,
            });
            if (live.discover.length > 0 || live.podcastFeed.length > 0 || live.radio.length > 0) {
                lastHomeLiveSectionsRef.current = live;
            }
            const assembled = buildCatalogHomeContent(
                authentication,
                lastHomeLiveSectionsRef.current,
            );
            if (!assembled) {
                return;
            }
            setHomeContentState((current) => ({
                content:
                    current.status === 'loaded'
                        ? reconcileHomeContent(current.content, assembled)
                        : assembled,
                status: 'loaded',
            }));

            const mergedRecents = await mergeServerRecentlyPlayedIntoRecents(
                await loadPersistedRecentContentItems(),
                authentication,
                assembled,
            );
            if (requestId !== homeLoadRequestId.current) {
                return;
            }
            setRecentContentItems((current) => {
                const next = reconcileRecentContentItemsIfChanged(
                    mergedRecents,
                    collectFreshAlbumItems(assembled.sections),
                );
                if (next !== current) {
                    void savePersistedRecentContentItems(next);
                }
                return next;
            });
        },
        [],
    );

    // (Removed) The Discover / Podcast-feed live refresh used to re-fetch those
    // sections on every return to Home and patch them in AFTER the page was up —
    // that was the "podcast feed loads in late / flashes" complaint. Those
    // sections already come from the base Home load + cache, so Home now renders
    // everything at once and stays put; pull-to-refresh is the only thing that
    // pulls fresh content.

    // (Removed) The launch-time whole-library artwork walk is gone: a cold
    // cache only happens right after a connect or an explicit cache clear, and
    // the post-sync prefetch covers the former while per-tile remote loads
    // cover the latter lazily. Walking the entire catalog 8s into EVERY launch
    // contended with the boot network + JS thread for no steady-state benefit.

    // JS event-loop health probe: a 2s heartbeat that logs whenever it fires
    // late. "Tabs do nothing for 30 seconds while a song plays" is invisible
    // in logcat without this; with it, the freeze window and its duration are
    // named precisely, and the adjacent log lines name the culprit.
    useEffect(() => {
        let expected = Date.now() + 2000;
        const interval = setInterval(() => {
            const now = Date.now();
            const lagMs = now - expected;
            if (lagMs > 1500) {
                console.warn(
                    `[jank] JS thread blocked ~${Math.round(lagMs / 100) / 10}s${formatJankBreadcrumb()}`,
                );
            }
            expected = now + 2000;
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Kotlin → JS sync plumbing: progress events feed the Settings panel;
    // every completed sync re-derives the mirror-backed surfaces (Home,
    // Library) and warms the cover-art cache for whatever it pulled.
    const serverConnectionForSyncRef = useRef(serverConnection);
    serverConnectionForSyncRef.current = serverConnection;
    // Debounce token + dirty latch for the post-sync mirror refresh. The Kotlin
    // engine emits one SamoCatalogSyncState 'synced' event PER SOURCE, so a
    // single sync round can fan out several events in a burst — we coalesce them
    // into ONE refresh. The dirty latch defers the (expensive, JS-thread-bound)
    // Home/Library derive whenever the app is backgrounded, so a long listening
    // session with the screen off never burns seconds of JS thread re-deriving
    // surfaces the user can't see. The AppState→active handler flushes it.
    const postSyncDebounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    const mirrorDirtyRef = useRef(false);

    // The actual post-sync work, deferred past any in-flight gesture/animation so
    // it never lands in the middle of a tap or the player-open spring. Derives
    // Home + Library ONCE (the old code derived Home twice — redundantly, since a
    // search-index rebuild doesn't touch the catalog_item rows Home reads), then
    // rebuilds the FTS index and warms cover art. The reindex→prefetch ordering
    // is load-bearing: mixing the synchronous reader with async writer
    // transactions on the shared connection is what triggered the Scudo
    // invalid-chunk crashes, so they stay strictly sequential.
    const flushPostSyncRefresh = useStableCallback(() => {
        const auth = serverConnectionForSyncRef.current;
        if (!auth) {
            return;
        }
        mirrorDirtyRef.current = false;
        InteractionManager.runAfterInteractions(() => {
            try {
                refreshHomeFromMirror({ authoritative: true });
                refreshLibraryFromMirror();
            } catch (error) {
                console.error('[catalog] post-sync derive failed', error);
            }
            void (async () => {
                try {
                    await reindexCatalogSearch(auth);
                    await prefetchCatalogArtwork(auth);
                } catch (error) {
                    console.error('[catalog] post-sync index/prefetch failed', error);
                }
            })();
        });
    });

    useEffect(() => {
        const uninstall = installCatalogSyncEventBridge();
        const unsubscribe = subscribeCatalogSyncCompleted(() => {
            if (postSyncDebounceRef.current) {
                clearTimeout(postSyncDebounceRef.current);
            }
            postSyncDebounceRef.current = setTimeout(() => {
                postSyncDebounceRef.current = null;
                // Foreground: refresh now. Background: mark dirty and let the
                // next foreground flush it — the whole point of the gate.
                if (AppState.currentState === 'active') {
                    flushPostSyncRefresh();
                } else {
                    mirrorDirtyRef.current = true;
                }
            }, POST_SYNC_COALESCE_MS);
        });
        return () => {
            if (postSyncDebounceRef.current) {
                clearTimeout(postSyncDebounceRef.current);
                postSyncDebounceRef.current = null;
            }
            unsubscribe();
            uninstall();
        };
    }, [flushPostSyncRefresh]);

    // Flush a mirror refresh that was deferred while backgrounded. This is the
    // moment the user reopens the app after a long listening session — derive
    // once here instead of having frozen the UI repeatedly in the background.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active' && mirrorDirtyRef.current) {
                flushPostSyncRefresh();
            }
        });
        return () => subscription.remove();
    }, [flushPostSyncRefresh]);

    // Cover syncs that ran while the app was closed (background WorkManager
    // rounds emit no events into a dead JS world): one index top-up per boot.
    useEffect(() => {
        if (serverConnection) {
            void reindexCatalogSearch(serverConnection);
        }
         
    }, [!!serverConnection]);

    // Paint Home from the mirror the moment connections exist (cold launch,
    // restore, connect) — no network on this path.
    useEffect(() => {
        if (serverConnection) {
            refreshHomeFromMirror();
        }
    }, [serverConnection, refreshHomeFromMirror]);

    // Resume any stranded downloads when the app returns to the foreground —
    // re-queues transfers the OS suspended in the background and pumps the queue
    // so it doesn't sit on "queued" forever after a backgrounding.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                void resumeDownloadsOnForeground(serverConnection);
            }
        });
        return () => subscription.remove();
    }, [serverConnection]);

    const { canConnect, handleConnect, handleDisconnect } = useAndroidServerAuth({
        auth,
        closeMediaDetail,
        loadHomeForConnection,
        setActiveUtilityScreen,
        setHomeContentState,
        setSearchState,
    });

    const startLibraryFullCollectionLoad = useStableCallback(() => {
        if (isOfflineMode || !serverConnection || homeContentState.status !== 'loaded') {
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
                // The mirror IS the source of truth — one async read fills the
                // complete lists; freshness arrives via refreshLibraryFromMirror
                // when the sync engine reports completion.
                const [albums, artists] = await Promise.all([
                    loadAndroidFullCollection(serverConnection, 'album'),
                    loadAndroidFullCollection(serverConnection, 'artist'),
                ]);

                if (libraryFullCollectionFetchTokenRef.current !== requestId) {
                    return;
                }

                setLibraryFullCollections({ albums, artists });
            })();

            // Synchronous first paint from the catalog so the Library grids mount
            // with content immediately — no loading state. The async block above
            // then fills the complete lists.
            const syncAlbums = loadAndroidFullCollectionLocalSync(serverConnection, 'album');
            const syncArtists = loadAndroidFullCollectionLocalSync(serverConnection, 'artist');
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

    /** Re-derive the Library surfaces from the mirror after a sync — only the
     *  ones the user has already opened (state present), never a cold mount. */
    const refreshLibraryFromMirror = useStableCallback(() => {
        if (!serverConnection) {
            return;
        }
        setLibraryRelevantState((current) =>
            current.status === 'loaded' || current.status === 'loading' ? current : current,
        );
        startLibraryRelevantLoad();
        void (async () => {
            const [albums, artists] = await Promise.all([
                loadAndroidFullCollection(serverConnection, 'album'),
                loadAndroidFullCollection(serverConnection, 'artist'),
            ]);
            setLibraryFullCollections((current) => {
                if (current.albums.status !== 'loaded' && current.artists.status !== 'loaded') {
                    return current;
                }
                return { albums, artists };
            });
        })();
    });

    const ensureLibraryFullCollections = startLibraryFullCollectionLoad;

    const startLibraryRelevantLoad = useStableCallback(() => {
        if (isOfflineMode || !serverConnection) {
            return;
        }

        setLibraryRelevantState((current) =>
            current.status === 'loaded' ? current : { status: 'loading' },
        );
        const requestId = (libraryRelevantFetchTokenRef.current += 1);
        void (async () => {
            const next = await loadAndroidLibraryRelevantContent(serverConnection);
            if (libraryRelevantFetchTokenRef.current !== requestId) {
                return;
            }
            setLibraryRelevantState(next);
        })();
    });

    useEffect(() => {
        if (isOfflineMode || !serverConnection) {
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
    }, [homeContentState.status, isOfflineMode, serverConnection, startLibraryRelevantLoad]);

    useEffect(() => {
        if (!serverConnection) {
            return;
        }

        if (serverConnection.type === ServerType.SAMO) {
            void ensureSamoStreamToken(serverConnection).catch(() => undefined);
        }
    }, [serverConnection]);

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
                    serverConnection,
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
    }, [homeContentState, serverConnection]);

    useEffect(() => {
        if (!serverConnection) {
            return;
        }

        setRecentContentItems((current) => {
            let changed = false;
            const next = current.map((entry) => {
                const patched = backfillItemArtworkFields(entry.item, serverConnection);
                if (patched === entry.item) {
                    return entry;
                }
                changed = true;
                return { ...entry, item: patched };
            });
            return changed ? next : current;
        });
    }, [serverConnection, setRecentContentItems]);

    useEffect(() => {
        if (!serverConnection || !lastPlayedItem) {
            return;
        }

        let cancelled = false;
        void preparePlaybackItemForNative(lastPlayedItem, serverConnection).then((patched) => {
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
    }, [lastPlayedItem?.id, lastPlayedItem?.artworkImageId, serverConnection, setLastPlayedItem]);

    useEffect(() => {
        if (!serverConnection || !lastPlayedItem) {
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
        void refreshPlayableResumeFromServer(lastPlayedItem, serverConnection).then((refreshed) => {
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
        serverConnection,
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
                    ? await refreshPlayableResumeFromServer(item, serverConnection)
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

        // Warm the home-layout hint cache so the next render can reserve the
        // live shelves' slots synchronously (cold-boot no-shift).
        void loadHomeLayoutHint();

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

        // (Removed) The fs home-content JSON cache is gone — the SQLite mirror
        // IS the persistent home cache, painted synchronously by
        // refreshHomeFromMirror the moment connections restore.

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
        loadHomeForConnection,
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
    const overlaySearchTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
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
        serverConnection,
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
        () => resolvePlaybackArtworkSourceForDisplay(playbackItem, serverConnection),
        [playbackItem, serverConnection],
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
        playQueueIndexNatively,
        serverConnection,
    });

    // Stable props for the memoized MiniPlayer / FullScreenPlayer. These were
    // inline in the JSX (`contentSource={...computed...}`, `onNext={() => ...}`),
    // so every App re-render allocated fresh references and defeated the players'
    // memo — measured on-device as Mini + FullPlayer re-rendering in lockstep
    // with App (a ~20Hz burst during sync/boot, and along every Home refresh).
    // Hoisting them to stable identities lets both players bail out of any App
    // re-render that isn't actually about the playing track.
    const playbackContentSource = useMemo(
        () =>
            playbackItem
                ? getContentSourceFromPlaybackItem(playbackItem, serverConnection)
                : undefined,
        [playbackItem, serverConnection],
    );
    const handlePlayerNext = useCallback(
        () => void handleNavigatePlayback(1),
        [handleNavigatePlayback],
    );
    const handlePlayerPrevious = useCallback(
        () => void handleNavigatePlayback(-1),
        [handleNavigatePlayback],
    );
    const handlePlayerSeek = useCallback(
        (positionMs: number) => void handleSeekPlayback(positionMs),
        [handleSeekPlayback],
    );
    const handlePlayerSkipBySeconds = useCallback(
        (offsetSeconds: number) => void handleSkipPlayback(offsetSeconds),
        [handleSkipPlayback],
    );
    const handlePlayerPlayQueueIndex = useCallback(
        (index: number) => {
            const currentQueue = getPlaybackQueue();
            if (!currentQueue) {
                return;
            }
            const item = currentQueue.items[index];
            if (!item) {
                return;
            }
            void (async () => {
                // Same native queue step the lock screen uses; full JS restart
                // only as fallback.
                if (await playQueueIndexNatively(index)) {
                    return;
                }
                await playQueuedItem(item, currentQueue.items, index);
            })();
        },
        [playQueueIndexNatively, playQueuedItem],
    );

    useEffect(() => {
        registerNavigatePlayback(handleNavigatePlayback);
    }, [handleNavigatePlayback, registerNavigatePlayback]);

    const handleSyncWithServer = useCallback(async (): Promise<{
        message?: string;
        ok: boolean;
    }> => {
        if (!serverConnection) {
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
            await loadHomeForConnection(serverConnection);
            // Refresh the on-device mirror. The sync engine is Kotlin
            // (SamoCatalogSync via WorkManager) — this just enqueues a one-shot
            // run; live progress streams into the Settings "Local library"
            // panel via SamoCatalogSyncState events, and the post-sync artwork
            // prefetch fires from the sync-completed bridge.
            void triggerCatalogSyncNow();
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
    }, [loadHomeForConnection, serverConnection]);

    const [isRefreshingHome, setIsRefreshingHome] = useState(false);

    const handleRefreshHome = useCallback(async (): Promise<void> => {
        if (!serverConnection) {
            return;
        }
        setIsRefreshingHome(true);
        // Keep the on-device library mirror fresh, but OFF the spinner's critical
        // path — the Kotlin engine runs the delta in the background and the
        // sync-completed bridge handles the artwork prefetch afterwards.
        void triggerCatalogSyncNow();
        try {
            // The spinner waits ONLY on the live-section re-fetch (discover /
            // podcast feed / radio) — the library sections re-derive from the
            // mirror when the sync above completes. Capped so a slow network
            // releases the spinner instead of hanging it.
            await Promise.race([
                loadHomeForConnection(serverConnection),
                new Promise<void>((resolve) => setTimeout(resolve, 10000)),
            ]);
        } catch {
            // swallow — pull-to-refresh never throws into the UI
        } finally {
            setIsRefreshingHome(false);
        }
    }, [loadHomeForConnection, serverConnection]);

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

        const auth = findServerAuthenticationForSource(serverConnection, {
            id: playlistMenuRoot.sourceId,
        });

        return auth?.type === ServerType.SAMO;
    }, [playlistMenuRoot?.sourceId, serverConnection]);
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
        () => serverConnection?.type === ServerType.SAMO,
        [serverConnection],
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
            setVisitedTabs((current) => {
                if (current.has(tabId)) {
                    return current;
                }
                const next = new Set(current);
                next.add(tabId);
                return next;
            });
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

    // Lazy tab mounting: every tab used to render its full scene tree at boot
    // (5 screens of tiles + lists mounted before the first frame). A scene now
    // mounts on its first visit and STAYS mounted (the cheap opacity-toggle
    // switching is unchanged) — boot renders Home alone.
    const [visitedTabs, setVisitedTabs] = useState<Set<SamoMobileTabId>>(
        () => new Set<SamoMobileTabId>(['home']),
    );

    const utilityScreenContent =
        activeUtilityScreen === 'settings' ? (
            <SettingsScreen
                artworkCacheLimitBytes={artworkCacheLimitBytes}
                catalogSources={
                    serverConnection?.type === ServerType.SAMO
                        ? [
                              {
                                  id: getMobileContentSource(serverConnection).id,
                                  title: serverConnection.title,
                              },
                          ]
                        : []
                }
                isOfflineMode={isOfflineMode}
                onOpenDownloads={handleOpenDownloads}
                onOpenManageServers={handleOpenManageServers}
                onSetArtworkCacheLimit={setArtworkCacheLimit}
                onSyncWithServer={handleSyncWithServer}
                onToggleOfflineMode={handleToggleOfflineMode}
                serverCount={serverConnection ? 1 : 0}
            />
        ) : activeUtilityScreen === 'manage-servers' ? (
            <ManageServersScreen
                authState={authState}
                onAddServer={handleOpenAddServer}
                onDisconnect={handleDisconnect}
                serverConnection={serverConnection}
                serverHealthByKey={serverHealthByKey}
            />
        ) : activeUtilityScreen === 'downloads' ? (
            <DownloadsScreen serverConnection={serverConnection} />
        ) : activeUtilityScreen === 'add-server' ? (
            <AddServerScreen
                authState={authState}
                canConnect={canConnect}
                hasServerConnection={!!serverConnection}
                onBack={() => setActiveUtilityScreen('manage-servers')}
                onConnect={handleConnect}
                onPasswordChange={setPassword}
                onServerUrlBlur={handleServerUrlBlur}
                onServerUrlChange={setServerUrl}
                onUsernameChange={setUsername}
                password={password}
                serverUrl={serverUrl}
                username={username}
            />
        ) : activeUtilityScreen === 'initial-sync' ? (
            <InitialSyncScreen
                onComplete={() => setActiveUtilityScreen(null)}
                serverConnection={serverConnection}
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
                    isRefreshing={isRefreshingHome}
                    onManageServers={handleOpenManageServers}
                    onPrefetchItem={handlePrefetchMediaItemStable}
                    onRefresh={serverConnection ? handleRefreshHome : undefined}
                    onSelectItem={handleSelectMediaItemStable}
                    onViewAll={handleOpenViewAll}
                    serverConnection={serverConnection}
                />
            ) : tabId === 'playlists' ? (
                <PlaylistsScreen
                    onCreatePlaylist={handleOpenCreatePlaylistStandalone}
                    onSelectItem={handleSelectMediaItemStable}
                    onShufflePlay={handleShuffleHomeItems}
                    showCreatePlaylist={canCreatePlaylistsOnDevice}
                />
            ) : tabId === 'library' ? (
                <LibraryScreen
                    fullCollections={libraryFullCollections}
                    fullCollectionsEnabled={!isOfflineMode}
                    hasServerConnections={Boolean(serverConnection)}
                    libraryRelevantState={libraryRelevantState}
                    onEnsureFullCollections={ensureLibraryFullCollections}
                    onSelectItem={handleSelectMediaItemStable}
                />
            ) : tabId === 'search' ? (
                <SearchScreen
                    hasServerConnections={Boolean(serverConnection)}
                    onSearch={handleSearch}
                    onSelectItem={handleSelectMediaItemStable}
                    onSelectRecentItem={handleSelectMediaItemStable}
                    searchState={searchState}
                    serverConnection={serverConnection}
                />
            ) : tabId === 'radio' ? (
                <RadioScreen
                    onAddStation={handleAddRadioStation}
                    onSelectItem={handleSelectMediaItemStable}
                    serverConnection={serverConnection}
                />
            ) : (
                <EmptyServerBackedScreen tabTitle={getTabTitle(tabId)} />
            )}
        </Fragment>
    );

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <ErrorBoundary label="App">
                <ServerConnectionsContext.Provider value={serverConnection}>
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
                                                        const isSceneMounted = visitedTabs.has(
                                                            tab.id,
                                                        );
                                                        const sceneStyle = [
                                                            styles.tabScene,
                                                            isSceneActive
                                                                ? styles.tabSceneActive
                                                                : styles.tabSceneHidden,
                                                        ];

                                                        // Library and Home own their own scroll
                                                        // containers (a virtualized FlashList), so they
                                                        // render in a plain View rather than the shared
                                                        // tab ScrollView — nesting a same-orientation
                                                        // VirtualizedList inside a ScrollView disables
                                                        // virtualization. Home's pull-to-refresh moves
                                                        // onto its own list (see HomeScreen).
                                                        if (
                                                            tab.id === 'library' ||
                                                            tab.id === 'home'
                                                        ) {
                                                            return (
                                                                <View
                                                                    key={tab.id}
                                                                    pointerEvents={
                                                                        isSceneActive
                                                                            ? 'auto'
                                                                            : 'none'
                                                                    }
                                                                    style={sceneStyle}
                                                                >
                                                                    <ErrorBoundary
                                                                        label={`tab-${tab.id}`}
                                                                    >
                                                                        {isSceneMounted
                                                                            ? renderTabSceneContent(
                                                                                  tab.id,
                                                                              )
                                                                            : null}
                                                                    </ErrorBoundary>
                                                                </View>
                                                            );
                                                        }

                                                        // Home + Library use the View path above; the
                                                        // remaining tabs (playlists/radio/search) have no
                                                        // pull-to-refresh, so this scroll carries none.
                                                        return (
                                                            <ScrollView
                                                                contentContainerStyle={
                                                                    styles.tabContent
                                                                }
                                                                key={tab.id}
                                                                pointerEvents={
                                                                    isSceneActive ? 'auto' : 'none'
                                                                }
                                                                showsVerticalScrollIndicator={false}
                                                                style={sceneStyle}
                                                            >
                                                                <ErrorBoundary
                                                                    label={`tab-${tab.id}`}
                                                                >
                                                                    {isSceneMounted
                                                                        ? renderTabSceneContent(
                                                                              tab.id,
                                                                          )
                                                                        : null}
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
                                                        style={[
                                                            styles.navOverlay,
                                                            detailOverlayStyle,
                                                        ]}
                                                    >
                                                        <MediaDetailContent
                                                            homeContentState={homeContentState}
                                                            mediaDetailKey={
                                                                detailOverlayOpen
                                                                    ? mediaDetailKey
                                                                    : frozenDetailKeyRef.current
                                                            }
                                                            mediaDetailState={
                                                                detailOverlayOpen
                                                                    ? mediaDetailState
                                                                    : frozenDetailStateRef.current
                                                            }
                                                            onAddTrackToPlaylist={
                                                                handleAddMediaTrackToPlaylistStable
                                                            }
                                                            onBack={popMediaDetail}
                                                            onPlayTrack={handlePlayMediaTrackStable}
                                                            onReloadDetail={
                                                                handleReloadMediaDetailStable
                                                            }
                                                            onSelectItem={
                                                                handleSelectMediaItemStable
                                                            }
                                                            onShufflePlay={
                                                                handleShuffleDetailTracks
                                                            }
                                                            serverConnection={serverConnection}
                                                        />
                                                    </Reanimated.View>
                                                ) : null}
                                                {activeUtilityScreen === 'view-all' &&
                                                viewAllRoute ? (
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
                                                                onSelectItem={
                                                                    handleSelectViewAllItem
                                                                }
                                                                route={viewAllRoute}
                                                            />
                                                        </ErrorBoundary>
                                                    </Reanimated.View>
                                                ) : null}
                                                {isSearchOverlayOpen ? (
                                                    <SearchOverlay
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
                                                        searchState={searchState}
                                                        serverConnection={serverConnection}
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
                                                    contentSource={playbackContentSource}
                                                    lastPlayedItem={lastPlayedItem}
                                                    onOpenFullPlayer={handleOpenFullPlayer}
                                                    onTogglePlayback={handleTogglePlayback}
                                                    playerProgress={playerProgress}
                                                    reducedMotion={reducedMotion}
                                                    serverConnection={serverConnection}
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
                                                                style={
                                                                    styles.errorBoundaryButtonText
                                                                }
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
                                                    castState={castState}
                                                    contentSource={playbackContentSource}
                                                    isShuffled={isShuffled}
                                                    lastPlayedItem={lastPlayedItem}
                                                    onClose={handleCloseFullPlayer}
                                                    onNext={handlePlayerNext}
                                                    onOpenOutputPicker={handleOpenOutputPicker}
                                                    onPlayQueueIndex={handlePlayerPlayQueueIndex}
                                                    onPrevious={handlePlayerPrevious}
                                                    onSeek={handlePlayerSeek}
                                                    onSkipBySeconds={handlePlayerSkipBySeconds}
                                                    onTogglePlayback={handleTogglePlayback}
                                                    onToggleShuffle={handleToggleShuffle}
                                                    playerProgress={playerProgress}
                                                    queue={queue}
                                                    reducedMotion={reducedMotion}
                                                    serverConnection={serverConnection}
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
                                                            // onPressIn (touch-down) for the snappiest
                                                            // possible switch; onPress would dispatch the
                                                            // same navigation a second time on release.
                                                            onPressIn={() => handleTabPress(tab.id)}
                                                            style={[
                                                                styles.tabButton,
                                                                isActive && styles.tabButtonActive,
                                                            ]}
                                                        >
                                                            <TabIcon
                                                                active={isActive}
                                                                id={tab.id}
                                                            />
                                                            <Text
                                                                style={[
                                                                    styles.tabLabel,
                                                                    isActive &&
                                                                        styles.tabLabelActive,
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
                                    {/* First-run / no-server gate. Sits above every
                                    surface so the user can never reach Home
                                    without a live, authenticated connection. */}
                                    {!bootResolved ? (
                                        <View style={styles.onboardingOverlay}>
                                            <OnboardingSplash />
                                        </View>
                                    ) : onboardingActive || !serverConnection ? (
                                        <View style={styles.onboardingOverlay}>
                                            <OnboardingFlow
                                                authState={authState}
                                                canConnect={canConnect}
                                                onConnect={handleConnect}
                                                onFinish={() => {
                                                    setOnboardingActive(false);
                                                    setActiveUtilityScreen(null);
                                                }}
                                                password={password}
                                                serverConnection={serverConnection}
                                                serverUrl={serverUrl}
                                                setAuthState={setAuthState}
                                                setPassword={setPassword}
                                                setServerUrl={setServerUrl}
                                                setUsername={setUsername}
                                                username={username}
                                            />
                                        </View>
                                    ) : null}
                                </View>
                            </DownloadedTrackKeysContext.Provider>
                        </DownloadedCollectionKeysContext.Provider>
                    </MediaContextMenuContext.Provider>
                </ServerConnectionsContext.Provider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

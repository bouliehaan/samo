import {
    addMobileTracksToPlaylist,
    createMobilePlaylist,
    getDetailQualityProfile,
    getItemQualityProfile,
    getMobileContentSource,
    loadAudiobookshelfDownloadFiles,
    loadMobileMediaDetail,
    loadSongRadioQueue,
    type MobileContentSource,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
    type MobileSearchItem,
    MobileSearchItemType,
} from '@samo/core/mobile';
import {
    type ServerAuthenticationResult,
    findServerAuthenticationForSource,
    ServerType,
} from '@samo/core/server';
import { startTransition, useCallback, useRef, type MutableRefObject } from 'react';

import type { AndroidPlayItemOptions, AndroidPlaybackQueue } from './use-android-native-playback';
import { Alert } from 'react-native';

import type { AbsProgressContext } from '../services/abs-progress';
import { loadAbsCurrentProgress } from '../services/abs-progress';
import {
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
    getLocalDownloadForTrack,
    getOfflineAudiobookFiles,
} from '../services/download-manager';
import { loadAndroidFullCollection } from '../services/full-collection';
import {
    addAndroidMediaTrackToPlaylist,
    loadAndroidMediaDetail,
    loadAndroidMediaTrackPlayback,
    isValidTrackPlayback,
    playSamoPodcastEpisodeFromHome,
} from '../services/media-detail';
import {
    loadCachedMediaDetail,
    saveCachedMediaDetail,
} from '../services/media-detail-cache';
import {
    setSamoMusicFavorite,
    starSubsonicAlbum,
    starSubsonicArtist,
    starSubsonicTrack,
    unstarSubsonicAlbum,
    unstarSubsonicArtist,
    unstarSubsonicTrack,
} from '../services/media-favorites';
import {
    getPersistedServerAuthKey,
} from '../services/persisted-server';
import {
    type AndroidLocalFavoriteItem,
    getLocalFavoriteKey,
    saveLocalFavorites,
    toggleLocalFavorite,
} from '../services/local-favorites';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
    recentContentItemFromMediaDetail,
    type RecentContentRecordOptions,
    savePersistedRecentContentItems,
    upsertRecentContentItem,
} from '../services/recent-content';
import { dedupeRecentContentItemsByAlbumIdentity } from '../utils/recent-content-dedupe';
import { loadAndroidSearchResults } from '../services/search-content';
import {
    addAndroidRadioStation,
    type AddAndroidRadioStationInput,
    type AddAndroidRadioStationResult,
} from '../services/radio-stations';
import {
    useAppNavigationState,
    type UseAppNavigationOptions,
} from '../state/app-navigation';
import { useAppSessionState } from '../state/app-session';
import { useAuthSessionState } from '../state/auth-session';
import { useDownloadsState } from '../state/downloads-state';
import {
    useMediaOverlaysState,
    type UseMediaOverlaysOptions,
} from '../state/media-overlays';
import { syncAndroidNativePlaybackQueue } from '../services/audio-playback';
import {
    getAndroidPlaybackState,
    setAndroidPlaybackState,
} from '../state/playback-store';
import { type HomeDisplaySection } from '../types/home';
import { buildDownloadedMusicDetail } from '../utils/offline-music-detail';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import {
    buildAbsStreamFilePlayable,
    buildAudiobookFilePlaybackQueue,
    buildOfflineAudiobookPlayable,
    buildOfflinePodcastEpisodePlayable,
} from '../utils/offline-playback';
import { detailHasHiRes } from '../utils/media-quality';
import {
    buildMediaDetailLoadKey,
    dedupeInFlight,
} from '../services/in-flight-requests';
import {
    prefetchArtworkUrl,
    prefetchDetailArtworkUrls,
} from '../utils/prefetch-detail-artwork';
import { getViewAllVariant } from '../utils/home-display';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';

export type AndroidMediaHandlerDeps = {
    auth: ReturnType<typeof useAuthSessionState>;
    downloads: ReturnType<typeof useDownloadsState>;
    navigation: ReturnType<typeof useAppNavigationState>;
    overlays: ReturnType<typeof useMediaOverlaysState>;
    session: ReturnType<typeof useAppSessionState>;
};

export function useAndroidMediaHandlerDeps(options?: {
    navigation?: UseAppNavigationOptions;
    overlays?: UseMediaOverlaysOptions;
}): AndroidMediaHandlerDeps {
    const navigation = useAppNavigationState(options?.navigation);
    const auth = useAuthSessionState();
    const downloads = useDownloadsState();
    const overlays = useMediaOverlaysState(options?.overlays);
    const session = useAppSessionState();

    return { auth, downloads, navigation, overlays, session };
}

export interface UseAndroidMediaHandlersOptions {
    absContextRef: MutableRefObject<AbsProgressContext | null>;
    activePlaybackItem: MobilePlayableAudio | null;
    closeMediaDetail: () => void;
    deps: AndroidMediaHandlerDeps;
    handlePlayItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
    loadHomeForConnections: (authentications: ServerAuthenticationResult[]) => Promise<void>;
    playbackQueueRef: MutableRefObject<AndroidPlaybackQueue | null>;
    playQueuedItem: (
        item: MobilePlayableAudio,
        queueItems?: MobilePlayableAudio[],
        queueIndex?: number,
        options?: AndroidPlayItemOptions,
    ) => Promise<void>;
}

const playlistPlaybackOptions = (
    detail: MobileMediaDetail,
    shuffled: boolean,
): AndroidPlayItemOptions => ({
    omitTrackRecentlyPlayed: detail.type === MobileMediaDetailType.PLAYLIST,
    shuffled,
    ...(detail.type === MobileMediaDetailType.PLAYLIST ? { samoPlaylistId: detail.id } : {}),
});

export interface AndroidMediaHandlers {
    appendPlayableItemsToQueue: (items: MobilePlayableAudio[]) => number;
    bumpBookInfoRequestId: () => void;
    bumpViewAllFetchToken: () => void;
    canAppendToPlaybackQueue: boolean;
    findAuthForSource: (sourceId: string | undefined) => ServerAuthenticationResult | undefined;
    getFavoriteKeyForItem: (item: AndroidRecentContentSourceItem) => string;
    getFavoriteKeyForTrack: (track: MobileMediaTrack, sourceId: string | undefined) => string;
    handleAddCollectionToQueue: (item: AndroidRecentContentSourceItem) => Promise<void>;
    handleAddMediaTrackToPlaylist: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        playlist: MobileHomeItem,
    ) => Promise<void>;
    handleAddRadioStation: (
        input: AddAndroidRadioStationInput,
    ) => Promise<AddAndroidRadioStationResult>;
    handleAddToPlaylistFromRoot: (playlist: MobileHomeItem) => Promise<void>;
    handleCreatePlaylistFromRoot: (name: string) => Promise<void>;
    handleAddTrackToQueue: (track: MobileMediaTrack) => void;
    handleDownloadCollectionItem: (item: AndroidRecentContentSourceItem) => Promise<void>;
    handleDownloadSongTrack: (
        track: MobileMediaTrack,
        detail: MobileMediaDetail | undefined,
        source: MobileContentSource | undefined,
    ) => Promise<void>;
    handleGoToAlbumForTrack: (
        track: MobileMediaTrack,
        source?: MobileContentSource,
    ) => Promise<void>;
    handleGoToArtistForTrack: (
        track: MobileMediaTrack,
        source?: MobileContentSource,
    ) => Promise<void>;
    handleOpenAddToPlaylistForCollection: (
        collectionItem: AndroidRecentContentSourceItem,
    ) => void;
    handleOpenAddToPlaylistForSong: (track: MobileMediaTrack, sourceId: string | undefined) => void;
    handleOpenCreatePlaylistForCollection: (
        collectionItem: AndroidRecentContentSourceItem,
    ) => void;
    handleOpenCreatePlaylistForSong: (
        track: MobileMediaTrack,
        sourceId: string | undefined,
    ) => void;
    handleOpenCreatePlaylistStandalone: () => void;
    handleOpenBookInfo: (
        item: AndroidRecentContentSourceItem,
        variant: 'audiobook' | 'podcast',
    ) => Promise<void>;
    handleOpenStreamInfo: (item: AndroidRecentContentSourceItem) => void;
    handleOpenViewAll: (section: HomeDisplaySection) => void;
    handlePlayMediaTrack: (
        detail: MobileMediaDetail,
        track: MobileMediaTrack,
        index: number,
        queueTracks?: MobileMediaTrack[],
        options?: { isCurrentRequest?: () => boolean },
    ) => Promise<void>;
    handleSearch: (query: string) => Promise<void>;
    handleSelectMediaItem: (item: MobileHomeItem | MobileSearchItem) => Promise<void>;
    handleShuffleDetailTracks: (
        detail: MobileMediaDetail,
        tracks?: MobileMediaTrack[],
    ) => Promise<void>;
    handleShuffleHomeItems: (items: MobileHomeItem[]) => Promise<void>;
    handleStartAudiobook: (item: MobileHomeItem | MobileSearchItem) => Promise<void>;
    handleStartSongRadio: (
        track: MobileMediaTrack,
        source: MobileContentSource | undefined,
    ) => Promise<void>;
    handleToggleFavoriteForItem: (item: AndroidRecentContentSourceItem) => Promise<void>;
    handleToggleFavoriteForTrack: (
        track: MobileMediaTrack,
        sourceId: string | undefined,
    ) => Promise<void>;
    handleViewDetailForItem: (item: AndroidRecentContentSourceItem) => Promise<void>;
    invalidateMediaDetailRequests: () => void;
    loadDetailWithCache: (item: AndroidRecentContentSourceItem) => Promise<{ cached: boolean }>;
    prefetchMediaDetailCache: (item: AndroidRecentContentSourceItem) => void;
    reloadCurrentMediaDetail: () => Promise<void>;
}

export function useAndroidMediaHandlers(
    options: UseAndroidMediaHandlersOptions,
): AndroidMediaHandlers {
    const {
        absContextRef,
        activePlaybackItem,
        closeMediaDetail,
        deps,
        handlePlayItem,
        loadHomeForConnections,
        playbackQueueRef,
    } = options;

    const { auth, downloads, navigation, overlays, session } = deps;
    const {
        mediaDetailState,
        setActiveUtilityScreen,
        setMediaDetailState,
        setSearchState,
        setViewAllFullState,
        setViewAllRoute,
        setIsFullPlayerOpen,
    } = navigation;
    const { serverConnections } = auth;
    const { isOfflineMode } = downloads;
    const {
        playlistMenuRoot,
        setBookInfoState,
        setContextMenuFeedback,
        setContextMenuTarget,
        setPlaylistMenuRoot,
        setPlaylistMenuRootState,
        setStreamInfoItem,
    } = overlays;
    const {
        favoritedKeys,
        forcePlaybackQueueRender,
        localFavorites,
        recentContentItems,
        setFavoritedKeys,
        setLocalFavorites,
        setRecentContentItems,
    } = session;

    const mediaDetailCacheRef = useRef<Map<string, MobileMediaDetail>>(new Map());
    const mediaDetailRequestId = useRef(0);
    const audiobookStartRequestId = useRef(0);
    const viewAllFetchTokenRef = useRef(0);
    const searchRequestId = useRef(0);
    const bookInfoRequestId = useRef(0);

    const invalidateMediaDetailRequests = useCallback(() => {
        mediaDetailRequestId.current += 1;
        audiobookStartRequestId.current += 1;
    }, []);

    const bumpViewAllFetchToken = useCallback(() => {
        viewAllFetchTokenRef.current += 1;
    }, []);

    const bumpBookInfoRequestId = useCallback(() => {
        bookInfoRequestId.current += 1;
    }, []);

    const recordRecentContentItem = useCallback(
        (item: AndroidRecentContentSourceItem, options?: RecentContentRecordOptions) => {
            setRecentContentItems((current) => {
                const nextItems = dedupeRecentContentItemsByAlbumIdentity(
                    upsertRecentContentItem(current, item, Date.now(), options),
                );

                void savePersistedRecentContentItems(nextItems);

                return nextItems;
            });
        },
        [setRecentContentItems],
    );

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

                    if (!nextItem.artworkImageId && detail.artworkImageId) {
                        nextItem.artworkImageId = detail.artworkImageId;
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
        [setRecentContentItems],
    );

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

    const prefetchMediaDetailCache = useCallback((item: AndroidRecentContentSourceItem) => {
        if (item.playback || item.type === MobileHomeItemType.AUDIOBOOK) {
            return;
        }
        prefetchArtworkUrl(
            {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                source: item.source,
            },
            serverConnections,
        );
        const cacheKey = getRecentContentItemKey(item);
        const memoryCached = mediaDetailCacheRef.current.get(cacheKey);
        if (memoryCached) {
            prefetchDetailArtworkUrls(memoryCached, serverConnections, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
            return;
        }
        void loadCachedMediaDetail(cacheKey).then((fromDisk) => {
            if (!fromDisk) {
                return;
            }
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromDisk);
            prefetchDetailArtworkUrls(fromDisk, serverConnections, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
        });
    }, [serverConnections]);

    const beginOpenMediaDetail = useCallback(
        (item: AndroidRecentContentSourceItem) => {
            const cacheKey = getRecentContentItemKey(item);
            const memoryCached = mediaDetailCacheRef.current.get(cacheKey);
            const openStartedAt = Date.now();
            prefetchArtworkUrl(
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
                serverConnections,
            );
            if (memoryCached) {
                prefetchDetailArtworkUrls(memoryCached, serverConnections, [
                    {
                        artworkImageId: item.artworkImageId,
                        artworkUrl: item.artworkUrl,
                        source: item.source,
                    },
                ]);
                setMediaDetailState({ detail: memoryCached, status: 'loaded' });
            } else {
                setMediaDetailState({
                    itemArtworkImageId: item.artworkImageId,
                    itemArtworkUrl: item.artworkUrl,
                    itemSource: item.source,
                    itemTitle: item.title,
                    itemType: item.type,
                    status: 'loading',
                });
            }
            // #region agent log
            const openPayload = {
                sessionId: 'c0ca1a',
                runId: 'nav-perf',
                hypothesisId: 'H9',
                location: 'use-android-media-handlers.ts:beginOpenMediaDetail',
                message: 'detail overlay opened synchronously',
                data: {
                    itemId: item.id,
                    itemType: item.type,
                    memoryCacheHit: Boolean(memoryCached),
                },
                timestamp: openStartedAt,
            };
            console.log('[nav-perf]', JSON.stringify(openPayload));
            fetch(
                'http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': 'c0ca1a',
                    },
                    body: JSON.stringify(openPayload),
                },
            ).catch(() => {});
            // #endregion
        },
        [setMediaDetailState, serverConnections],
    );

    const loadDetailWithCache = async (
        item: AndroidRecentContentSourceItem,
    ): Promise<{ cached: boolean }> => {
        // #region agent log
        const detailLoadStartedAt = Date.now();
        fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c0ca1a'},body:JSON.stringify({sessionId:'c0ca1a',runId:'nav-perf',hypothesisId:'H2',location:'use-android-media-handlers.ts:loadDetailWithCache',message:'load detail start',data:{itemId:item.id,itemType:item.type},timestamp:detailLoadStartedAt})}).catch(()=>{});
        // #endregion
        audiobookStartRequestId.current += 1;
        const requestId = (mediaDetailRequestId.current += 1);
        const isCurrentRequest = () => mediaDetailRequestId.current === requestId;
        const cacheKey = getRecentContentItemKey(item);

        // Layer 1: in-memory cache — instant.
        let cached = mediaDetailCacheRef.current.get(cacheKey);
        const memoryCacheHit = Boolean(cached);

        // Layer 2: persistent fs cache — async, but still much faster than
        // the network and works in airplane mode.
        if (!cached) {
            const diskStartedAt = Date.now();
            const fromDisk = await loadCachedMediaDetail(cacheKey);
            // #region agent log
            fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c0ca1a'},body:JSON.stringify({sessionId:'c0ca1a',runId:'nav-perf',hypothesisId:'H11',location:'use-android-media-handlers.ts:loadDetailWithCache',message:'disk cache read finished',data:{itemId:item.id,hit:Boolean(fromDisk),diskMs:Date.now()-diskStartedAt,elapsedMs:Date.now()-detailLoadStartedAt},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
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
            prefetchDetailArtworkUrls(cached, serverConnections, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
            startTransition(() => {
                enrichRecentAlbumFromDetail(item, cached);
                const alreadyShowingLoaded =
                    mediaDetailState.status === 'loaded' &&
                    mediaDetailState.detail.id === cached.id;
                if (!alreadyShowingLoaded) {
                    setMediaDetailState({ detail: cached, status: 'loaded' });
                }
            });
        }
        // #region agent log
        fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c0ca1a'},body:JSON.stringify({sessionId:'c0ca1a',runId:'nav-perf',hypothesisId:'H2',location:'use-android-media-handlers.ts:loadDetailWithCache',message:'detail first paint scheduled',data:{memoryCacheHit,hasCached:Boolean(cached),elapsedMs:Date.now()-detailLoadStartedAt},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (isOfflineMode && cached) {
            return { cached: true };
        }

        // Refresh from network without blocking navigation transitions.
        void (async () => {
            const networkStartedAt = Date.now();
            const next = await dedupeInFlight(buildMediaDetailLoadKey(cacheKey), () =>
                loadAndroidMediaDetail(serverConnections, item),
            );
            if (!isCurrentRequest()) {
                return;
            }
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
                void saveCachedMediaDetail(cacheKey, next.detail);
                prefetchDetailArtworkUrls(next.detail, serverConnections, [
                    {
                        artworkImageId: item.artworkImageId,
                        artworkUrl: item.artworkUrl,
                        source: item.source,
                    },
                ]);
                startTransition(() => {
                    enrichRecentAlbumFromDetail(item, next.detail);
                });
                setMediaDetailState(next);
            } else if (!cached) {
                setMediaDetailState(next);
            }
            // #region agent log
            fetch('http://127.0.0.1:7498/ingest/65ba3320-fcf4-4bf2-82b0-f3ffc8d708c2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c0ca1a'},body:JSON.stringify({sessionId:'c0ca1a',runId:'nav-perf',hypothesisId:'H2',location:'use-android-media-handlers.ts:loadDetailWithCache',message:'load detail complete',data:{networkMs:Date.now()-networkStartedAt,totalMs:Date.now()-detailLoadStartedAt,networkStatus:next.status,memoryCacheHit},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        })();

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
        if (
            item.type === MobileHomeItemType.PODCAST_EPISODE &&
            item.containerId &&
            item.source
        ) {
            const auth = findServerAuthenticationForSource(serverConnections, item.source);
            if (auth?.type === ServerType.SAMO) {
                try {
                    const playable = await playSamoPodcastEpisodeFromHome(auth, {
                        artworkUrl: item.artworkUrl,
                        containerId: item.containerId,
                        durationSeconds: item.durationSeconds,
                        id: item.id,
                        subtitle: item.subtitle,
                        title: item.title,
                    });
                    absContextRef.current = {
                        authentication: auth,
                        durationSeconds: playable.durationSeconds ?? item.durationSeconds ?? 0,
                        episodeId: item.id,
                        itemId: item.containerId,
                    };
                    recordRecentContentItem(item);
                    await handlePlayItem(playable, [playable], 0, { shuffled: false });
                    return;
                } catch (error) {
                    setMediaDetailState({
                        message:
                            error instanceof Error ? error.message : 'Could not play this episode.',
                        status: 'error',
                    });
                    return;
                }
            }
        }

        if (item.playback) {
            mediaDetailRequestId.current += 1;
            audiobookStartRequestId.current += 1;
            if (
                item.type === MobileHomeItemType.RADIO ||
                item.type === MobileSearchItemType.RADIO
            ) {
                recordRecentContentItem(item);
            } else if (item.type === MobileSearchItemType.SONG) {
                recordRecentContentItem(item, { directSong: true });
            } else if (item.type === MobileHomeItemType.PODCAST_EPISODE) {
                recordRecentContentItem(item);
            }
            await handlePlayItem(item.playback, [item.playback], 0, { shuffled: false });
            return;
        }

        if (item.type === MobileHomeItemType.AUDIOBOOK) {
            await handleStartAudiobook(item);
            return;
        }

        beginOpenMediaDetail(item);
        requestAnimationFrame(() => {
            startTransition(() => {
                recordRecentContentItem(item);
            });
        });
        void loadDetailWithCache(item);
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

        if (
            !auth ||
            (auth.type !== ServerType.AUDIOBOOKSHELF && auth.type !== ServerType.SAMO) ||
            detail.tracks.length === 0 ||
            detail.type !== MobileMediaDetailType.AUDIOBOOK
        ) {
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
        const containerRecentItem = recentContentItemFromMediaDetail(detail);
        if (containerRecentItem) {
            recordRecentContentItem(containerRecentItem);
        }
        if (
            isValidTrackPlayback(track.playback) &&
            !(
                detail.type === MobileMediaDetailType.PODCAST &&
                serverConnections.some(
                    (auth) =>
                        getPersistedServerAuthKey(auth) === detail.source.id &&
                        auth.type === ServerType.SAMO,
                )
            )
        ) {
            const currentTrackPlayback = track.playback;
            const preparedTrack = await preparePlaybackItemForNative(
                await loadAndroidMediaTrackPlayback(serverConnections, detail, track),
                serverConnections,
            ).catch(() => currentTrackPlayback);
            if (!isCurrentRequest()) return;

            const playOptions = playlistPlaybackOptions(detail, false);

            if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
                const absAuth = serverConnections.find(
                    (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
                );
                const targetBookSeconds = track.startSeconds ?? 0;

                if (absAuth?.type === ServerType.AUDIOBOOKSHELF) {
                    const offlineFiles = await getOfflineAudiobookFiles(
                        detail.id,
                        detail.source.id,
                    );
                    if (!isCurrentRequest()) return;

                    if (offlineFiles.length > 1) {
                        const { index, items } = buildAudiobookFilePlaybackQueue(
                            detail,
                            offlineFiles,
                            targetBookSeconds,
                            (file, initialPositionSeconds) =>
                                buildOfflineAudiobookPlayable(
                                    detail,
                                    file,
                                    initialPositionSeconds,
                                    absAuth,
                                ),
                        );
                        if (track.itemId) {
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
                        await handlePlayItem(items[index]!, items, index, playOptions);
                        return;
                    }

                    const streamFiles = await loadAudiobookshelfDownloadFiles({
                        authentication: absAuth,
                        itemId: detail.id,
                    }).catch(() => []);
                    if (!isCurrentRequest()) return;

                    if (streamFiles.length > 1) {
                        const { index, items } = buildAudiobookFilePlaybackQueue(
                            detail,
                            streamFiles.map((file) => ({
                                durationSeconds: file.durationSeconds,
                                ino: file.ino,
                                startOffsetSeconds: file.startOffsetSeconds ?? 0,
                            })),
                            targetBookSeconds,
                            (file, initialPositionSeconds) => {
                                const streamFile = streamFiles.find(
                                    (candidate) => candidate.ino === file.ino,
                                );
                                if (!streamFile) {
                                    return preparedTrack;
                                }
                                return buildAbsStreamFilePlayable(
                                    detail,
                                    streamFile,
                                    initialPositionSeconds,
                                    absAuth,
                                );
                            },
                        );
                        if (track.itemId) {
                            const totalDurationSeconds = streamFiles.reduce(
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
                        await handlePlayItem(items[index]!, items, index, playOptions);
                        return;
                    }
                }

                await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
                return;
            }

            const rawQueueItems = (queueTracks ?? detail.tracks).flatMap((candidate) =>
                isValidTrackPlayback(candidate.playback) ? [candidate.playback] : [],
            );
            const queueItems = await Promise.all(
                rawQueueItems.map((candidate) =>
                    preparePlaybackItemForNative(candidate, serverConnections).catch(
                        () => candidate,
                    ),
                ),
            );
            if (!isCurrentRequest()) return;

            const queueIndex = queueItems.findIndex(
                (candidate) => candidate.id === preparedTrack.id,
            );

            if (!isCurrentRequest()) return;
            if (queueIndex >= 0) {
                await handlePlayItem(preparedTrack, queueItems, queueIndex, playOptions);
            } else {
                await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
            }
            return;
        }

        let trackToPlay = track;
        const absAuth = serverConnections.find(
            (auth) => getPersistedServerAuthKey(auth) === detail.source.id,
        );

        if (
            detail.type === MobileMediaDetailType.PODCAST &&
            absAuth &&
            (absAuth.type === ServerType.AUDIOBOOKSHELF || absAuth.type === ServerType.SAMO) &&
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
                const { index, items } = buildAudiobookFilePlaybackQueue(
                    detail,
                    offlineFiles,
                    targetBookSeconds,
                    (file, initialPositionSeconds) =>
                        buildOfflineAudiobookPlayable(
                            detail,
                            file,
                            initialPositionSeconds,
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
                await handlePlayItem(items[index]!, items, index, { shuffled: false });
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
                isValidTrackPlayback(track.playback) ? [track.playback] : [],
            );

            if (playableTracks.length === 0) {
                return;
            }

            const shuffled = [...playableTracks];

            for (let i = shuffled.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            await handlePlayItem(shuffled[0], shuffled, 0, playlistPlaybackOptions(detail, true));
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
        (sourceId: string | undefined, source?: MobileContentSource) =>
            findServerAuthenticationForSource(serverConnections, {
                id: sourceId ?? source?.id,
                type: source?.type,
                url: source?.url,
            }),
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
            if (auth.type === ServerType.SAMO) {
                await setSamoMusicFavorite(
                    auth,
                    'music-track',
                    track.id,
                    !isFavoritedNow,
                );
                upsertFavoriteKey(key, !isFavoritedNow);
                setContextMenuFeedback(
                    !isFavoritedNow ? 'Added to Favorites' : 'Removed from Favorites',
                );
                return;
            }

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
        const useSamoFavorite =
            auth?.type === ServerType.SAMO &&
            (item.type === MobileHomeItemType.ALBUM ||
                item.type === MobileHomeItemType.ARTIST);

        try {
            if (useSamoFavorite && auth) {
                const kind =
                    item.type === MobileHomeItemType.ALBUM ? 'music-album' : 'music-artist';
                await setSamoMusicFavorite(auth, kind, item.id, !isFavoritedNow);
                upsertFavoriteKey(key, !isFavoritedNow);
                setContextMenuFeedback(
                    !isFavoritedNow ? 'Added to Favorites' : 'Removed from Favorites',
                );
                return;
            }

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
                    ...queue,
                    items: [...queue.items, ...queueableItems],
                };
            } else {
                playbackQueueRef.current = {
                    index: 0,
                    items: [playbackState.item, ...queueableItems],
                };
            }
            forcePlaybackQueueRender();
            syncAndroidNativePlaybackQueue(playbackQueueRef.current, auth.serverConnections);

            return queueableItems.length;
        },
        [auth.serverConnections, playbackQueueRef],
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
        beginOpenMediaDetail(item);
        requestAnimationFrame(() => {
            startTransition(() => {
                recordRecentContentItem(item);
            });
        });
        void loadDetailWithCache(item);
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
        setPlaylistMenuRoot({ kind: 'track', mode: 'add', sourceId, track });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleOpenCreatePlaylistForSong = (
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
        setPlaylistMenuRoot({ kind: 'track', mode: 'create', sourceId, track });
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
            (auth.type !== ServerType.NAVIDROME &&
                auth.type !== ServerType.SUBSONIC &&
                auth.type !== ServerType.SAMO)
        ) {
            setContextMenuFeedback(
                'Adding to playlists is only available for music server items.',
            );
            return;
        }
        setContextMenuTarget(null);
        setPlaylistMenuRoot({ collectionItem, kind: 'collection', mode: 'add', sourceId });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleOpenCreatePlaylistForCollection = (
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
            (auth.type !== ServerType.NAVIDROME &&
                auth.type !== ServerType.SUBSONIC &&
                auth.type !== ServerType.SAMO)
        ) {
            setContextMenuFeedback(
                'Creating playlists is only available for music server items.',
            );
            return;
        }
        setContextMenuTarget(null);
        setPlaylistMenuRoot({ collectionItem, kind: 'collection', mode: 'create', sourceId });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleOpenCreatePlaylistStandalone = () => {
        const auth = serverConnections.find(
            (connection) =>
                connection.type === ServerType.SAMO ||
                connection.type === ServerType.NAVIDROME ||
                connection.type === ServerType.SUBSONIC,
        );

        if (!auth) {
            Alert.alert(
                'No music server',
                'Connect a Samo, Navidrome, or Subsonic server to create playlists.',
            );
            return;
        }

        setContextMenuTarget(null);
        setPlaylistMenuRoot({
            kind: 'standalone',
            sourceId: getMobileContentSource(auth).id,
        });
        setPlaylistMenuRootState({ status: 'idle' });
    };

    const handleCreatePlaylistFromRoot = async (name: string) => {
        if (!playlistMenuRoot) {
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

        if (
            auth.type !== ServerType.NAVIDROME &&
            auth.type !== ServerType.SUBSONIC &&
            auth.type !== ServerType.SAMO
        ) {
            setPlaylistMenuRootState({
                message: 'Creating playlists is only available for music servers.',
                status: 'error',
            });
            return;
        }

        setPlaylistMenuRootState({ playlistId: '__create__', status: 'loading' });

        try {
            const songIds =
                playlistMenuRoot.kind === 'track' ? [playlistMenuRoot.track.id] : undefined;
            const playlist = await createMobilePlaylist({
                authentication: auth,
                name,
                songIds,
            });

            if (playlistMenuRoot.kind === 'collection') {
                const sourceDetail = await loadMobileMediaDetail({
                    authentication: auth,
                    id: playlistMenuRoot.collectionItem.id,
                    type:
                        playlistMenuRoot.collectionItem.type === MobileHomeItemType.PLAYLIST
                            ? MobileMediaDetailType.PLAYLIST
                            : MobileMediaDetailType.ALBUM,
                });
                const collectionSongIds = sourceDetail.tracks
                    .filter((track) => track.playback?.source === 'music')
                    .map((track) => track.id);

                if (collectionSongIds.length > 0) {
                    await addMobileTracksToPlaylist({
                        authentication: auth,
                        playlistId: playlist.id,
                        songIds: collectionSongIds,
                    });
                }
            }

            await loadHomeForConnections(serverConnections);
            setPlaylistMenuRootState({
                message: `Created ${playlist.title}`,
                status: 'success',
            });
        } catch (error) {
            setPlaylistMenuRootState({
                message: error instanceof Error ? error.message : 'Failed to create playlist',
                status: 'error',
            });
        }
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

        if (playlistMenuRoot.kind === 'standalone') {
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

    const reloadCurrentMediaDetail = useCallback(async () => {
        if (mediaDetailState.status !== 'loaded') {
            return;
        }

        const detail = mediaDetailState.detail;
        const itemType =
            detail.type === MobileMediaDetailType.ALBUM
                ? MobileHomeItemType.ALBUM
                : detail.type === MobileMediaDetailType.PLAYLIST
                  ? MobileHomeItemType.PLAYLIST
                  : detail.type === MobileMediaDetailType.ARTIST
                    ? MobileHomeItemType.ARTIST
                    : detail.type === MobileMediaDetailType.PODCAST
                      ? MobileHomeItemType.PODCAST
                      : detail.type === MobileMediaDetailType.AUDIOBOOK
                        ? MobileHomeItemType.AUDIOBOOK
                        : null;

        if (!itemType) {
            return;
        }

        const item: AndroidRecentContentSourceItem = {
            artworkImageId: detail.artworkImageId,
            artworkUrl: detail.artworkUrl,
            id: detail.id,
            source: detail.source,
            title: detail.title,
            type: itemType,
        };
        const cacheKey = getRecentContentItemKey(item);
        mediaDetailCacheRef.current.delete(cacheKey);
        const next = await loadAndroidMediaDetail(serverConnections, item);
        if (next.status === 'loaded') {
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
            setMediaDetailState(next);
        }
    }, [mediaDetailState, serverConnections, setMediaDetailState]);

    return {
        appendPlayableItemsToQueue,
        bumpBookInfoRequestId,
        bumpViewAllFetchToken,
        canAppendToPlaybackQueue,
        findAuthForSource,
        getFavoriteKeyForItem,
        getFavoriteKeyForTrack,
        handleAddCollectionToQueue,
        handleAddMediaTrackToPlaylist,
        handleAddRadioStation,
        handleAddToPlaylistFromRoot,
        handleCreatePlaylistFromRoot,
        handleAddTrackToQueue,
        handleDownloadCollectionItem,
        handleDownloadSongTrack,
        handleGoToAlbumForTrack,
        handleGoToArtistForTrack,
        handleOpenAddToPlaylistForCollection,
        handleOpenAddToPlaylistForSong,
        handleOpenCreatePlaylistForCollection,
        handleOpenCreatePlaylistForSong,
        handleOpenCreatePlaylistStandalone,
        handleOpenBookInfo,
        handleOpenStreamInfo,
        handleOpenViewAll,
        handlePlayMediaTrack,
        handleSearch,
        handleSelectMediaItem,
        handleShuffleDetailTracks,
        handleShuffleHomeItems,
        handleStartAudiobook,
        handleStartSongRadio,
        handleToggleFavoriteForItem,
        handleToggleFavoriteForTrack,
        handleViewDetailForItem,
        invalidateMediaDetailRequests,
        loadDetailWithCache,
        prefetchMediaDetailCache,
        reloadCurrentMediaDetail,
    };
}

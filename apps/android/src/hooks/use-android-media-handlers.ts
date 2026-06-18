import {
    addMobileTracksToPlaylist,
    buildSamoAudiobookQueueFromFiles,
    createMobilePlaylist,
    getDetailQualityProfile,
    getItemQualityProfile,
    getMobileContentSource,
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
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    ServerType,
} from '@samo/core/server';
import { startTransition, useCallback, useRef, type MutableRefObject } from 'react';

import type { AndroidPlayItemOptions } from './use-android-native-playback';
import { Alert } from 'react-native';

import type { AbsProgressContext } from '../services/abs-progress';
import { loadAbsCurrentProgressBounded } from '../services/abs-progress';
import {
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
    getLocalDownloadForTrack,
    getOfflineAudiobookFiles,
} from '../services/download-manager';
import {
    loadCatalogMediaDetail,
    loadCatalogMediaDetailSync,
} from '../services/catalog/catalog-reads';
import {
    loadAndroidFullCollection,
    loadAndroidFullCollectionLocal,
    loadAndroidFullCollectionLocalSync,
} from '../services/full-collection';
import {
    addAndroidMediaTrackToPlaylist,
    getTrackTimelineSegments,
    loadAndroidMediaDetail,
    loadAndroidMediaTrackPlayback,
    isValidTrackPlayback,
} from '../services/media-detail';
import { setSamoMusicFavorite } from '../services/media-favorites';
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
import { runAndroidSearch } from '../services/search-content';
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
import { getPlaybackQueue, setPlaybackQueue } from '../state/playback-queue-store';
import { type HomeDisplaySection } from '../types/home';
import { buildDownloadedMusicDetail } from '../utils/offline-music-detail';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import {
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
    loadHomeForConnection: (authentication: ServerAuthenticationResult | null) => Promise<void>;
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
    handlePlayCollectionNext: (item: AndroidRecentContentSourceItem) => Promise<void>;
    handlePlayTrackNext: (track: MobileMediaTrack) => void;
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
        loadHomeForConnection,
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
    const { serverConnection } = auth;
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
            if (!serverConnection) {
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
            await runAndroidSearch(serverConnection, trimmedQuery, userRecents, (state) => {
                if (requestId === searchRequestId.current) {
                    setSearchState(state);
                }
            });
        },
        [recentContentItems, serverConnection],
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
            serverConnection,
        );
        const cacheKey = getRecentContentItemKey(item);
        const memoryCached = mediaDetailCacheRef.current.get(cacheKey);
        if (memoryCached) {
            prefetchDetailArtworkUrls(memoryCached, serverConnection, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
            return;
        }
        void loadCatalogMediaDetail(item, serverConnection).then((fromMirror) => {
            if (!fromMirror) {
                return;
            }
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromMirror);
            prefetchDetailArtworkUrls(fromMirror, serverConnection, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
        });
    }, [serverConnection]);

    const beginOpenMediaDetail = useCallback(
        (item: AndroidRecentContentSourceItem) => {
            const cacheKey = getRecentContentItemKey(item);
            const memoryCached = mediaDetailCacheRef.current.get(cacheKey);
            prefetchArtworkUrl(
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
                serverConnection,
            );
            const synchronousDetail = memoryCached;
            if (synchronousDetail) {
                prefetchDetailArtworkUrls(synchronousDetail, serverConnection, [
                    {
                        artworkImageId: item.artworkImageId,
                        artworkUrl: item.artworkUrl,
                        source: item.source,
                    },
                ]);
                setMediaDetailState({ detail: synchronousDetail, status: 'loaded' });
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
        },
        [setMediaDetailState, serverConnection],
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

        // Layer 1.5: local SQLite catalog — instant, authoritative for Samo, and
        // works offline. The entire library is mirrored on-device, so this makes
        // *every* Samo detail open instant, not just recently-viewed ones.
        if (!cached) {
            const fromCatalog = await loadCatalogMediaDetail(item, serverConnection);
            if (!isCurrentRequest()) {
                return { cached: false };
            }
            if (fromCatalog) {
                cached = fromCatalog;
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromCatalog);
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
            prefetchDetailArtworkUrls(cached, serverConnection, [
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

        if (cached) {
            // Mirror (or memory) hit — DONE. The mirror is the source of truth
            // for Samo details; freshness is the sync engine's job, not a
            // per-open network refresh. The old steady-state refetch here cost
            // a server round-trip on EVERY detail open just to re-confirm what
            // the mirror already knew.
            return { cached: true };
        }

        // Nothing local (fresh install mid-first-sync, or a non-mirrored
        // source): the network is the only option.
        void (async () => {
            const next = await dedupeInFlight(buildMediaDetailLoadKey(cacheKey), () =>
                loadAndroidMediaDetail(serverConnection, item),
            );
            if (!isCurrentRequest()) {
                return;
            }
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
                prefetchDetailArtworkUrls(next.detail, serverConnection, [
                    {
                        artworkImageId: item.artworkImageId,
                        artworkUrl: item.artworkUrl,
                        source: item.source,
                    },
                ]);
                startTransition(() => {
                    enrichRecentAlbumFromDetail(item, next.detail);
                });
            }
            setMediaDetailState(next);
        })();

        return { cached: false };
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
            const isFeed = variant === 'podcast-feed';
            const hasSync = isFeed && section.items.length > 0;
            setViewAllFullState(
                hasSync ? { items: section.items as MobileHomeItem[], status: 'loaded' } : { status: 'loading' },
            );
            void (async () => {
                // Fill the complete list off the UI thread. The mirror is the
                // source of truth — additions/edits arrive via the sync engine,
                // not a per-open re-enumeration of the whole library.
                const local = isFeed ? (section.items as MobileHomeItem[]) : await loadAndroidFullCollectionLocal(serverConnection, variant);
                if (viewAllFetchTokenRef.current !== myToken) return;
                if (local && local.length > 0) {
                    setViewAllFullState({ items: local, status: 'loaded' });
                } else if (!hasSync) {
                    setViewAllFullState({ items: [], status: 'loaded' }); // Also fix infinite loop for empty libraries
                }
            })();
        },
        [closeMediaDetail, serverConnection],
    );

    const handleSelectMediaItem = async (item: MobileHomeItem | MobileSearchItem) => {
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

        // LOCAL FIRST. The mirror holds every Samo audiobook's chapters + file
        // manifest, so a book tap should never wait on the network before
        // sound. Order: in-memory cache → synchronous SQLite mirror read → fs
        // cache → downloaded-files synthesis → network as the LAST resort
        // (fresh install mid-sync). The old order awaited a network detail
        // fetch FIRST — on a slow server that was up to 30s of dead tap.
        const cacheKey = getRecentContentItemKey(item);
        let detail: MobileMediaDetail | undefined = mediaDetailCacheRef.current.get(cacheKey);
        
        if (!detail) {
            detail = (await loadCatalogMediaDetail(item, serverConnection)) ?? undefined;
            if (detail) {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, detail);
            }
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
            // Nothing local at all (fresh install before the first sync
            // finished). The network is the only option left — fetch, cache,
            // and surface its error state if it fails.
            const networkResult = await loadAndroidMediaDetail(serverConnection, item);
            if (!isCurrentRequest()) return;
            if (networkResult.status !== 'loaded') {
                setMediaDetailState(networkResult);
                return;
            }
            detail = networkResult.detail;
        }

        rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, detail);
        const auth =
            serverConnection?.type === ServerType.SAMO
                ? serverConnection
                : undefined;

        if (
            !auth ||
            auth.type !== ServerType.SAMO ||
            detail.tracks.length === 0 ||
            detail.type !== MobileMediaDetailType.AUDIOBOOK
        ) {
            setMediaDetailState({ detail, status: 'loaded' });
            return;
        }

        // Bounded: a user is mid-tap. The unbounded read gave a sick server
        // 30s to answer before the book would start; 4s then falling back to
        // the item's own resume data matches playQueuedItem's budget.
        const progress = await loadAbsCurrentProgressBounded(auth, detail.id);
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
                serverConnection?.type === ServerType.SAMO &&
                getPersistedServerAuthKey(serverConnection) === detail.source.id
            )
        ) {
            const currentTrackPlayback = track.playback;
            const preparedTrack = await preparePlaybackItemForNative(
                await loadAndroidMediaTrackPlayback(serverConnection, detail, track),
                serverConnection,
            ).catch(() => currentTrackPlayback);
            if (!isCurrentRequest()) return;

            const playOptions = playlistPlaybackOptions(detail, false);

            if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
                const absAuth =
                    serverConnection?.type === ServerType.AUDIOBOOKSHELF
                        ? serverConnection
                        : undefined;
                const targetBookSeconds = track.startSeconds ?? 0;

                // Samo audiobooks: build a real multi-file ExoPlayer queue from
                // the per-file manifest. Each file streams WHOLE (the player
                // seeks locally), so -15s / Previous / chapter jumps are instant
                // local seeks and there is no stream-restart-to-go-back anymore.
                if (absAuth?.type === ServerType.AUDIOBOOKSHELF && detail.audiobookFiles?.length) {
                    const streamToken = await ensureSamoStreamToken(absAuth).catch(
                        () => undefined,
                    );
                    if (!isCurrentRequest()) return;
                    const queue = buildSamoAudiobookQueueFromFiles(absAuth, {
                        artworkUrl: detail.artworkUrl,
                        audiobookId: detail.id,
                        bookStartSeconds: targetBookSeconds,
                        files: detail.audiobookFiles,
                        streamToken,
                        subtitle: detail.authorsSummary ?? detail.subtitle,
                        timelineSegments: getTrackTimelineSegments(detail, track),
                        title: detail.title,
                    });
                    if (queue && queue.items.length > 0) {
                        // Prepare only the STARTING file; the others were just
                        // built with a fresh stream token and native refreshes
                        // each file's token again at advance time.
                        const startItem = await preparePlaybackItemForNative(
                            queue.items[queue.index]!,
                            serverConnection,
                        ).catch(() => queue.items[queue.index]!);
                        if (!isCurrentRequest()) return;
                        const sessionItems = queue.items.map((candidate, candidateIndex) =>
                            candidateIndex === queue.index ? startItem : candidate,
                        );
                        await handlePlayItem(
                            startItem,
                            sessionItems,
                            queue.index,
                            playOptions,
                        );
                        return;
                    }
                }

                await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
                return;
            }

            // Only the TAPPED item is prepared (token + artwork resolution) —
            // done above. The rest of the queue rides RAW: native re-mints each
            // track's stream token as ExoPlayer opens it (SamoResolvingDataSource
            // for music/podcast playlists, refreshQueueItemAsync for mirror
            // advance), so JS-rewriting every URL up front was O(queue) work per
            // tap that native immediately redid anyway. Cast advance also
            // prepares per-item at its own play time (advanceQueue →
            // playQueuedItem → preparePlaybackItemForNative).
            const queueItems = (queueTracks ?? detail.tracks).flatMap((candidate) =>
                isValidTrackPlayback(candidate.playback) ? [candidate.playback] : [],
            );

            // Locate the tapped track in the prepared queue. Match the freshly
            // resolved playable first, then fall back to the track's original
            // playback id — a re-resolve can shift the id (quality / stream-token
            // drift), and when it does we must NOT collapse the whole queue to a
            // single song. That collapse is the "filter a playlist to Hi-Fi →
            // only one track plays" bug: a 1-item queue never mirrors to the
            // native player, so there's nothing to auto-advance into. A missing
            // match instead splices the playable in at its intended position so
            // the rest of the queue — and native gapless advance — survives.
            let queueIndex = queueItems.findIndex(
                (candidate) => candidate.id === preparedTrack.id,
            );
            if (queueIndex < 0 && track.playback?.id) {
                queueIndex = queueItems.findIndex(
                    (candidate) => candidate.id === track.playback?.id,
                );
            }

            if (!isCurrentRequest()) return;
            if (queueIndex >= 0) {
                const sessionQueue = queueItems.map((candidate, candidateIndex) =>
                    candidateIndex === queueIndex ? preparedTrack : candidate,
                );
                await handlePlayItem(preparedTrack, sessionQueue, queueIndex, playOptions);
            } else if (queueItems.length > 0) {
                const insertAt = Math.min(Math.max(0, index), queueItems.length);
                const sessionQueue = [
                    ...queueItems.slice(0, insertAt),
                    preparedTrack,
                    ...queueItems.slice(insertAt),
                ];
                await handlePlayItem(preparedTrack, sessionQueue, insertAt, playOptions);
            } else {
                await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
            }
            return;
        }

        // NOTE: no pre-play progress GET here anymore. Podcast/audiobook resume
        // is owned by ONE place — playQueuedItem's bounded
        // refreshPlayableResumeFromServerBounded — which runs AFTER the tap has
        // painted. The serial server read this used to do in front of every
        // Samo podcast tap was the remaining "tap looks dead on a slow server"
        // path in this handler.
        const trackToPlay = track;
        const absAuth =
            serverConnection?.type === ServerType.AUDIOBOOKSHELF
                ? serverConnection
                : undefined;
        if (absAuth && getPersistedServerAuthKey(absAuth) === detail.source.id) {
            // ...
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
                serverConnection,
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
        await addAndroidMediaTrackToPlaylist(serverConnection, detail, track, playlist);
        await loadHomeForConnection(serverConnection);
    };

    const handleAddRadioStation = useCallback(
        async (input: AddAndroidRadioStationInput): Promise<AddAndroidRadioStationResult> => {
            const result = await addAndroidRadioStation(input);
            await loadHomeForConnection(serverConnection);
            return result;
        },
        [loadHomeForConnection, serverConnection],
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
            findServerAuthenticationForSource(serverConnection, {
                id: sourceId ?? source?.id,
                type: source?.type,
                url: source?.url,
            }),
        [serverConnection],
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
        } catch (error) {
            setContextMenuFeedback(error instanceof Error ? error.message : 'Favorite failed');
        }
    };

    const handleToggleFavoriteForItem = async (item: AndroidRecentContentSourceItem) => {
        const key = getFavoriteKeyForItem(item);
        const isFavoritedNow = favoritedKeys.has(key);
        const auth = findAuthForSource(item.source?.id);
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

    // Shared enqueue for the cross-media Up Next queue. `placement` chooses the
    // end (Add to Queue) or right after the current item (Play Next). Radio is
    // filtered out — it's a live stream with no place in a sequential queue.
    // Anything else (music, podcast episodes, audiobooks) can be intermixed; the
    // playback engine advances across types in JS so each gets its own resume +
    // progress context.
    const enqueuePlayableItems = useCallback(
        (items: MobilePlayableAudio[], placement: 'end' | 'next'): number => {
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

            const queue = getPlaybackQueue();
            if (queue) {
                const insertAt =
                    placement === 'next'
                        ? Math.min(queue.index + 1, queue.items.length)
                        : queue.items.length;
                setPlaybackQueue({
                    ...queue,
                    items: [
                        ...queue.items.slice(0, insertAt),
                        ...queueableItems,
                        ...queue.items.slice(insertAt),
                    ],
                });
            } else {
                setPlaybackQueue({
                    index: 0,
                    items: [playbackState.item, ...queueableItems],
                });
            }
            syncAndroidNativePlaybackQueue(getPlaybackQueue(), auth.serverConnection);

            return queueableItems.length;
        },
        [auth.serverConnection],
    );

    const appendPlayableItemsToQueue = useCallback(
        (items: MobilePlayableAudio[]): number => enqueuePlayableItems(items, 'end'),
        [enqueuePlayableItems],
    );

    const insertPlayableItemsNext = useCallback(
        (items: MobilePlayableAudio[]): number => enqueuePlayableItems(items, 'next'),
        [enqueuePlayableItems],
    );

    const loadDetailForContextAction = useCallback(
        async (item: AndroidRecentContentSourceItem): Promise<MobileMediaDetail | null> => {
            const cacheKey = getRecentContentItemKey(item);
            let detail = mediaDetailCacheRef.current.get(cacheKey);

            if (!detail) {
                const fromMirror = await loadCatalogMediaDetail(item, serverConnection);
                if (fromMirror) {
                    detail = fromMirror;
                    rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromMirror);
                }
            }

            if (!detail && isOfflineMode) {
                const downloadedDetail = await buildDownloadedMusicDetail(item);
                if (downloadedDetail) {
                    detail = downloadedDetail;
                    rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, downloadedDetail);
                }
            }

            if (detail) {
                return detail;
            }

            const next = await loadAndroidMediaDetail(serverConnection, item);
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
                return next.detail;
            }

            return null;
        },
        [isOfflineMode, serverConnection],
    );

    const handleAddTrackToQueue = useCallback(
        (track: MobileMediaTrack) => {
            const playback = track.playback;
            if (!playback || playback.source === 'radio') {
                setContextMenuFeedback('This can’t be added to the queue.');
                return;
            }

            const added = appendPlayableItemsToQueue([playback]);
            if (added > 0) {
                setContextMenuFeedback('Added to queue');
            }
        },
        [appendPlayableItemsToQueue],
    );

    const handlePlayTrackNext = useCallback(
        (track: MobileMediaTrack) => {
            const playback = track.playback;
            if (!playback || playback.source === 'radio') {
                setContextMenuFeedback('This can’t play next.');
                return;
            }

            const added = insertPlayableItemsNext([playback]);
            if (added > 0) {
                setContextMenuFeedback('Playing next');
            }
        },
        [insertPlayableItemsNext],
    );

    const enqueueCollection = useCallback(
        async (
            item: AndroidRecentContentSourceItem,
            placement: 'end' | 'next',
        ): Promise<void> => {
            if (
                item.type !== MobileHomeItemType.ALBUM &&
                item.type !== MobileHomeItemType.PLAYLIST
            ) {
                setContextMenuFeedback('Only music albums and playlists can be added to the queue.');
                return;
            }

            setContextMenuFeedback(placement === 'next' ? 'Adding to Up Next…' : 'Adding to queue…');
            const detail = await loadDetailForContextAction(item);
            if (!detail) {
                setContextMenuFeedback('Could not load tracks for this item.');
                return;
            }

            const playables = detail.tracks.flatMap((track) =>
                track.playback?.source === 'music' ? [track.playback] : [],
            );
            const added =
                placement === 'next'
                    ? insertPlayableItemsNext(playables)
                    : appendPlayableItemsToQueue(playables);
            if (added > 0) {
                if (placement === 'next') {
                    setContextMenuFeedback(
                        added === 1 ? 'Playing next' : `Playing ${added} tracks next`,
                    );
                } else {
                    setContextMenuFeedback(
                        added === 1 ? 'Added 1 track to queue' : `Added ${added} tracks to queue`,
                    );
                }
            }
        },
        [appendPlayableItemsToQueue, insertPlayableItemsNext, loadDetailForContextAction],
    );

    const handleAddCollectionToQueue = useCallback(
        (item: AndroidRecentContentSourceItem) => enqueueCollection(item, 'end'),
        [enqueueCollection],
    );

    const handlePlayCollectionNext = useCallback(
        (item: AndroidRecentContentSourceItem) => enqueueCollection(item, 'next'),
        [enqueueCollection],
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
        // Detail lookup: in-memory → mirror → network (fresh-install fallback).
        const cacheKey = getRecentContentItemKey(item);
        let detail: MobileMediaDetail | undefined =
            mediaDetailCacheRef.current.get(cacheKey);
        if (!detail) {
            const fromMirror = await loadCatalogMediaDetail(item, serverConnection);
            if (fromMirror) {
                detail = fromMirror;
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, fromMirror);
            }
        }
        if (!detail) {
            const next = await loadAndroidMediaDetail(serverConnection, item);
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
                detail = next.detail;
            } else {
                Alert.alert('Download', 'Could not load detail to start the download.');
                return;
            }
        }
        const result = await enqueueCollectionDownload(detail, serverConnection);
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
            const result = await enqueueCollectionDownload(detail, serverConnection);
            reportDownloadResult(result, 'audiobook file');
            return;
        }

        // Podcast episode long-press → download just that episode.
        if (detail?.type === MobileMediaDetailType.PODCAST) {
            const outcome = await enqueueSinglePodcastEpisodeDownload(
                detail,
                track,
                serverConnection,
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
            serverConnection,
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
        const next = await loadAndroidMediaDetail(serverConnection, item);
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
            auth.type !== ServerType.SAMO
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
            auth.type !== ServerType.SAMO
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
        const auth =
            serverConnection?.type === ServerType.SAMO
                ? serverConnection
                : undefined;

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

            await loadHomeForConnection(serverConnection);
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
            await loadHomeForConnection(serverConnection);
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
        const next = await loadAndroidMediaDetail(serverConnection, item);
        if (next.status === 'loaded') {
            rememberMediaDetail(mediaDetailCacheRef.current, cacheKey, next.detail);
            setMediaDetailState(next);
        }
    }, [mediaDetailState, serverConnection, setMediaDetailState]);

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
        handlePlayCollectionNext,
        handlePlayTrackNext,
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
